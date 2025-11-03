
/// <reference types="@webgpu/types" />

import type FlattenedField from "../types/FlattenedField";
import type JsonSchema from "../types/JsonSchema";
import type ProcessedField from "../types/ProcessedField";

export default class WebGPUSchemaProcessor {
  private device: GPUDevice | null = null;
  private adapter: GPUAdapter | null = null;
  private initialized: boolean = false;


  async initialize(): Promise<void> {
    if (!navigator.gpu) {
      throw new Error('WebGPU not supported');
    }

    this.adapter = await navigator.gpu.requestAdapter();
    if (!this.adapter) {
      throw new Error('No appropriate GPUs found');
    }

    this.device = await this.adapter.requestDevice();
    this.initialized = true;
  }

  async analyzeSchema(schema: JsonSchema): Promise<{
    topLevelFields: ProcessedField[];
    nestedObjects: Record<string, JsonSchema>;
    internalRefs: Record<string, string>;
  }> {
    console.log('Input schema has definitions?', schema.definitions ? 'yes' : 'no');
    if (schema.definitions) {
      console.log('Input definition keys:', Object.keys(schema.definitions));
    }
    
    const topLevelFields: ProcessedField[] = [];
    const nestedObjects: Record<string, JsonSchema> = {};
    const internalRefs: Record<string, string> = {};
    const visited = new Set<string>();
    // track the lowest depth where a schema id was first observed so we prefer shallow mappings
    const lowestDepths: Record<string, number> = {};

  // Clone schema to prevent mutations/loss of definitions
  // Deep clone schema to preserve definitions and nested structure
  const rootSchema = structuredClone(schema);
  this.analyzeSchemaRecursive(rootSchema, rootSchema, '', topLevelFields, nestedObjects, internalRefs, visited, lowestDepths, 0);
  
    // If WebGPU is available, use GPU compute shaders for optimization
    if (this.initialized && this.device && topLevelFields.length > 0) {
      try {
        await this.optimizeFieldsWithGPU(topLevelFields);
      } catch (error) {
        console.warn('GPU optimization failed, using CPU fallback:', error);
      }
    }
    console.log(internalRefs, topLevelFields);
    return { topLevelFields, nestedObjects, internalRefs };
  }

  /**
   * Calculate priority for a field to group related fields together
   */
  private getFieldPriority(depth: number, fieldType: 'object' | 'reference' | 'definition' | 'primitive', isRequired: boolean): number {
    // Base priority - higher depths = lower priority to group by level
    const basePriority = 1000 - (depth * 100);
    
    // Type-specific offset to group related fields
    const typeOffset = {
      object: 80,     // Objects first in their group
      reference: 60,  // References next
      definition: 40, // Definition references
      primitive: 20   // Primitive fields last
    }[fieldType];
    
    // Required fields get slight boost within their type
    const requiredBoost = isRequired ? 10 : 0;
    
    return basePriority + typeOffset + requiredBoost;
  }

  private analyzeSchemaRecursive(
    schema: JsonSchema,
    rootSchema: JsonSchema,
    path: string,
    topLevelFields: ProcessedField[],
    nestedObjects: Record<string, JsonSchema>,
    internalRefs: Record<string, string>,
    visited: Set<string>,
    lowestDepths: Record<string, number>,
    depth: number,
    executionStep = 1
  ): void {
    
    const schemaId = JSON.stringify(schema);
    console.log('Execution step: ', executionStep);
    console.log('Schema:', schema);
    console.log('Root schema has definitions?', rootSchema.definitions ? `yes, ${JSON.stringify(rootSchema.definitions, null, 2)})` : 'no');

    if (rootSchema.definitions) {
      console.log('Definition keys:', Object.keys(rootSchema.definitions));
    }

    if (visited.has(schemaId)) {
      internalRefs[path] = schemaId;
      topLevelFields.push({
        name: schemaId,
        type: 'object',
        required: false,
        depth,
        circularRefPath: path,
        schema: { title: path.split('.').pop() || 'root' },
        priority: this.getFieldPriority(depth, 'reference', false)
      });
      return;
    }

    if (schema.type === 'object' || schema.properties) {
      // Add to nestedObjects and topLevelFields if this is a nested object (depth > 0)
      if (depth > 0) {
        // For nested objects, just record them and stop - don't process their properties here
        // They will be processed when the nested form is opened
        const prevDepth = lowestDepths[schemaId];
        if (prevDepth === undefined || depth < prevDepth) {
          nestedObjects[path] = schema;
          lowestDepths[schemaId] = depth;
        }
        topLevelFields.push({
          name: path,
          type: 'object',
          required: false,
          depth,
          schema,
          priority: this.getFieldPriority(depth, 'object', false)
        });
        return; // Stop here - don't process nested object properties
      }

      visited.add(schemaId);

      // Use for...of to maintain proper scope for rootSchema
      for (const [key, propSchema] of Object.entries(schema.properties!)) {
        const fieldPath = path ? `${path}.${key}` : key;
        const isRequired = schema.required?.includes(key) || false;
        // Handle $ref cases per tooling rules:
        // '#' -> root circular reference
        // '#/definitions/X' -> resolve X from root schema definitions

        console.log('fieldPath: ', fieldPath, ' isRequired: ', isRequired)
        if (propSchema.$ref) {
          // Handle root circular reference
          if (propSchema.$ref === '#') {
            // Treat this property as referencing the root schema (object)
            internalRefs[fieldPath] = propSchema.$ref;
            const rootId = JSON.stringify(rootSchema);
            if (lowestDepths[rootId] === undefined || depth < lowestDepths[rootId]) {
              nestedObjects[fieldPath] = rootSchema;
              lowestDepths[rootId] = depth;
            }
            topLevelFields.push({
              name: key,
              type: 'object',
              required: isRequired,
              depth,
              schema: rootSchema,
              priority: this.getFieldPriority(depth, 'object', isRequired)
            });
            continue;
          }

          // Handle definition references
          const defsPrefix = '#/definitions/';
          if (propSchema.$ref.startsWith(defsPrefix)) {
            const key = propSchema.$ref.substring(defsPrefix.length);
            console.log('Looking up definition:', key, 'at depth:', depth);
            console.log('Root schema state:', JSON.stringify(rootSchema, null, 2));
            const definitions = rootSchema.definitions as Record<string, JsonSchema> | undefined;
            console.log('Definitions record:', definitions);
            const def = definitions?.[key];
            console.log('Found definition:', def);

            
            if (def) {
              console.log('EXIST PLEASE')
              // If def is an object, treat the property as that object schema (do not expand here)
              if (def.properties) {
                // Add as nested object for nested form editing
                const defId = JSON.stringify(def);
                if (lowestDepths[defId] === undefined || depth < lowestDepths[defId]) {
                  nestedObjects[fieldPath] = def;
                  lowestDepths[defId] = depth;
                }
                topLevelFields.push({
                  name: key,
                  type: 'object',
                  required: isRequired,
                  depth,
                  schema: def,
                  priority: this.getFieldPriority(depth, 'definition', isRequired)
                });
                continue;
              } else {
                // Primitive or non-object definition
                topLevelFields.push({
                  name: key,
                  type: (def.type ?? 'string') as FlattenedField['type'],
                  required: isRequired,
                  depth,
                  schema: def,
                  priority: this.getFieldPriority(depth, 'primitive', isRequired)
                });
                continue; // Skip to next property
              }
            } else {
              // Definition not found - create placeholder with definition key as title
              internalRefs[fieldPath] = propSchema.$ref;
              topLevelFields.push({
                name: key,
                type: 'object',
                required: isRequired,
                depth,
                circularRefPath: propSchema.$ref,
                schema: { title: key },
                priority: 1
              });
            }
            continue;
          }

          // Handle non-definition $refs (external references)
          internalRefs[fieldPath] = propSchema.$ref;
          topLevelFields.push({
            name: key,
            type: 'object',
            required: isRequired,
            depth,
            circularRefPath: propSchema.$ref,
            schema: propSchema,
            priority: 1
          });
          continue;
        }

        // Handle non-ref objects and primitives
          // At depth > 0, all properties should be handled as nested objects to keep them contained
          if (depth > 0) {
            nestedObjects[fieldPath] = propSchema;
            topLevelFields.push({
              name: fieldPath,
              type: 'object',
              required: isRequired,
              depth,
              schema: propSchema,
              priority: this.getFieldPriority(depth, 'object', isRequired)
            });
          } else if (propSchema.type === 'object' || propSchema.properties) {
            this.analyzeSchemaRecursive(propSchema, rootSchema, fieldPath, topLevelFields, nestedObjects, internalRefs, visited, lowestDepths, depth + 1, executionStep + 1);
          } else {
            // Only add primitive fields directly at depth 0
            topLevelFields.push({
              name: fieldPath,
              type: propSchema.type || 'string',
              required: isRequired,
              depth,
              schema: propSchema,
              priority: this.getFieldPriority(depth, 'primitive', isRequired)
            });
        }
      }

      visited.delete(schemaId);
    }
  }

  private async optimizeFieldsWithGPU(fields: ProcessedField[]): Promise<void> {
    if (!this.device) return;

    // Create GPU buffers for field data
    const fieldCount = fields.length;
    const priorities = new Uint32Array(fieldCount);
    const depths = new Uint32Array(fieldCount);
    const required = new Uint32Array(fieldCount);

    fields.forEach((field, index) => {
      priorities[index] = field.priority || 50;
      depths[index] = field.depth;
      required[index] = field.required ? 1 : 0;
    });

    // Create compute shader for field optimization
    const shaderCode = `
      @group(0) @binding(0) var<storage, read_write> priorities: array<u32>;
      @group(0) @binding(1) var<storage, read> depths: array<u32>;
      @group(0) @binding(2) var<storage, read> required: array<u32>;

      @compute @workgroup_size(64)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let index = global_id.x;
        if (index >= arrayLength(&priorities)) {
          return;
        }

        var priority = priorities[index];
        let depth = depths[index];
        let is_required = required[index];

        // GPU-based priority calculation
        if (is_required == 1u) {
          priority += 100u;
        }
        
        priority += max(10u, 100u - depth * 20u);
        
        priorities[index] = priority;
      }
    `;

    try {
      // Create buffers
      const prioritiesBuffer = this.device.createBuffer({
        size: priorities.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
      });

      const depthsBuffer = this.device.createBuffer({
        size: depths.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });

      const requiredBuffer = this.device.createBuffer({
        size: required.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });

      // Write data
      this.device.queue.writeBuffer(prioritiesBuffer, 0, priorities);
      this.device.queue.writeBuffer(depthsBuffer, 0, depths);
      this.device.queue.writeBuffer(requiredBuffer, 0, required);

      // Create compute pipeline
      const shaderModule = this.device.createShaderModule({ code: shaderCode });
      
      const bindGroupLayout = this.device.createBindGroupLayout({
        entries: [
          { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
          { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
          { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        ],
      });

      const computePipeline = this.device.createComputePipeline({
        layout: this.device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
        compute: { module: shaderModule, entryPoint: 'main' },
      });

      const bindGroup = this.device.createBindGroup({
        layout: bindGroupLayout,
        entries: [
          { binding: 0, resource: { buffer: prioritiesBuffer } },
          { binding: 1, resource: { buffer: depthsBuffer } },
          { binding: 2, resource: { buffer: requiredBuffer } },
        ],
      });

      // Execute compute shader
      const commandEncoder = this.device.createCommandEncoder();
      const passEncoder = commandEncoder.beginComputePass();
      passEncoder.setPipeline(computePipeline);
      passEncoder.setBindGroup(0, bindGroup);
      passEncoder.dispatchWorkgroups(Math.ceil(fieldCount / 64));
      passEncoder.end();

      // Read back results
      const resultBuffer = this.device.createBuffer({
        size: prioritiesBuffer.size,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
      });

      commandEncoder.copyBufferToBuffer(prioritiesBuffer, 0, resultBuffer, 0, prioritiesBuffer.size);
      this.device.queue.submit([commandEncoder.finish()]);

      await resultBuffer.mapAsync(GPUMapMode.READ);
      const resultArray = new Uint32Array(resultBuffer.getMappedRange());
      
      // Update field priorities
      fields.forEach((field, index) => {
        field.priority = resultArray[index];
      });

      resultBuffer.unmap();

      // Clean up
      prioritiesBuffer.destroy();
      depthsBuffer.destroy();
      requiredBuffer.destroy();
      resultBuffer.destroy();

      // Sort fields by GPU-computed priorities
      fields.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    } catch (error) {
      console.warn('GPU optimization failed:', error);
    }
  }
}
