
/// <reference types="@webgpu/types" />

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
    circularRefs: Record<string, string>;
  }> {
    const topLevelFields: ProcessedField[] = [];
    const nestedObjects: Record<string, JsonSchema> = {};
    const circularRefs: Record<string, string> = {};
    const visited = new Set<string>();

    this.analyzeSchemaRecursive(schema, '', topLevelFields, nestedObjects, circularRefs, visited, 0);

    // If WebGPU is available, use GPU compute shaders for optimization
    if (this.initialized && this.device && topLevelFields.length > 0) {
      try {
        await this.optimizeFieldsWithGPU(topLevelFields);
      } catch (error) {
        console.warn('GPU optimization failed, using CPU fallback:', error);
      }
    }

    return { topLevelFields, nestedObjects, circularRefs };
  }

  private analyzeSchemaRecursive(
    schema: JsonSchema,
    path: string,
    topLevelFields: ProcessedField[],
    nestedObjects: Record<string, JsonSchema>,
    circularRefs: Record<string, string>,
    visited: Set<string>,
    depth: number
  ): void {
    const schemaId = JSON.stringify(schema);

    if (visited.has(schemaId)) {
      circularRefs[path] = schemaId;
      topLevelFields.push({
        name: path + '_circular',
        type: 'circular_reference',
        required: false,
        depth,
        parentIndex: -1,
        circularRefPath: path,
        priority: 1
      });
      return;
    }

    if (schema.type === 'object' && schema.properties) {
      if (depth > 0) {
        nestedObjects[path] = schema;
        topLevelFields.push({
          name: path,
          type: 'object',
          required: false,
          depth,
          parentIndex: -1,
          schema,
          priority: 100 - depth * 10
        });
        return;
      }

      visited.add(schemaId);

      Object.entries(schema.properties).forEach(([key, propSchema]: [string, JsonSchema]) => {
        const fieldPath = path ? `${path}.${key}` : key;
        const isRequired = schema.required?.includes(key) || false;

        if (propSchema.type === 'object' || propSchema.properties) {
          this.analyzeSchemaRecursive(propSchema, fieldPath, topLevelFields, nestedObjects, circularRefs, visited, depth + 1);
        } else {
          topLevelFields.push({
            name: fieldPath,
            type: propSchema.type || 'string',
            required: isRequired,
            depth,
            parentIndex: -1,
            schema: propSchema,
            priority: isRequired ? 150 : 100
          });
        }
      });

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
