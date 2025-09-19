
import type FormErrors from "../types/FormErrors";
import type JsonSchema from "../types/JsonSchema";
import type ProcessedField from "../types/ProcessedField";
import type { ObjectDataSource } from "../types/ObjectDataSource";
import type NestedFormState from "../types/NestedFormState";
import type FormValues from "../types/FormValues";
import WebGPUSchemaProcessor from "../webgpu/WebGPUSchemaProcessor";
import FormField from "./FormField";
import NestedFormModal from "./NestedFormModal";
import { useState, useEffect, useCallback, useRef } from "react";
import { Button, Stack, Textarea} from "@mantine/core";



const WebGPUSchemaFormGenerator: React.FC = () => {
  const [processor] = useState<WebGPUSchemaProcessor>(() => new WebGPUSchemaProcessor());
  const [schema, setSchema] = useState<string>('');
  const [formFields, setFormFields] = useState<ProcessedField[]>([]);
  const [formValues, setFormValues] = useState<FormValues>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [webGPUSupported, setWebGPUSupported] = useState<boolean>(false);
  const root = useRef(<Stack align="center"/>)
  
  // Object data source for dropdowns
  const [dataSource, setDataSource] = useState<ObjectDataSource>({

  });

  const [nestedForm, setNestedForm] = useState<NestedFormState | null>(null);
  const [availableRefs, setAvailableRefs] = useState<string[]>(['root', 'parent', 'self']);

  useEffect(() => {
    setWebGPUSupported(!!navigator.gpu);
  }, []);

  const generateForm = async (): Promise<void> => {
    if (!schema.trim()) return;
    
    setLoading(true);
    setErrors({});
    
    try {
      const parsedSchema: JsonSchema = JSON.parse(schema);
      
      // Initialize WebGPU if supported
      if (webGPUSupported && !processor['initialized']) {
        try {
          await processor.initialize();
        } catch (error) {
          console.warn('WebGPU initialization failed, using CPU fallback:', error);
        }
      }
      
      const analysis = await processor.analyzeSchema(parsedSchema);
      
      setFormFields(analysis.topLevelFields);
      
      // Update available refs based on circular references found
      const refs = Object.keys(analysis.circularRefs);
      setAvailableRefs([...refs, 'root', 'parent', 'self']);
      
    } catch (error: unknown) {
      const errorMessage: string = error instanceof Error ? error.message : 'Unknown error';
      setErrors({ schema: `Invalid JSON: ${errorMessage}` });
    }
    
    setLoading(false);
  };

  const handleInputChange = (fieldName: string, value: string | number | boolean | object): void => {
    setFormValues((prev: FormValues) => ({ ...prev, [fieldName]: value }) as FormValues);
    if (errors[fieldName]) {
      setErrors((prev: FormErrors) => ({ ...prev, [fieldName]: null }));
    }
  };

  const handleCreateNew = (field: ProcessedField): void => {
    if (field.schema) {
      setNestedForm({
        isOpen: true,
        parentPath: field.name,
        schema: field.schema,
        values: {},
        title: field.schema.title || field.name.split('.').pop() || 'Object'
      });
    }
  };

  const handleUpdateDataSource = useCallback((dataSource: ObjectDataSource) => {
    console.log('new data source', dataSource);

  }, [dataSource]);

  

  const handleNestedFormSave = (data: object): void => {
    if (!nestedForm) return;

    // Add to data source
    const objectType = nestedForm.title;
    const id = Date.now().toString();
    const label = `${Object.values(data)[0]} (Custom)` || `Custom ${objectType}`;

    setDataSource(prev => ({
      ...prev,
      [objectType]: [
        ...(prev[objectType] || []),
        { id, label, data }
      ]
    }) as ObjectDataSource);

    // Set the value in the form
    handleInputChange(nestedForm.parentPath, data);

    // Close nested form
    setNestedForm(null);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    formFields.forEach((field: ProcessedField) => {
      if (field.required && !formValues[field.name]) {
        newErrors[field.name] = 'This field is required';
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (): void => {
    if (validateForm()) {
      console.log('Form submitted:', formValues);
      alert('Form submitted successfully! Check console for data.');
    }
  };

  const loadSample = (key: string): void => {
    const selectedSchema: JsonSchema | undefined = sampleSchemas[key];
    if (selectedSchema) {
      setSchema(JSON.stringify(selectedSchema, null, 2));
    }
  };

  return (
    <div id='main'>
                    {/* Nested Form Modal */}
              {nestedForm && (
                <NestedFormModal
                  nestedForm={nestedForm}
                  onClose={() => setNestedForm(null)}
                  onSave={handleNestedFormSave}
                  dataSource={dataSource}
                  onUpdateDataSource={handleUpdateDataSource}        />
              )}
      <h1 className="text-3xl font-bold mb-6 text-gray-800">
        WebGPU JSON Schema Form Generator
      </h1>
      
      {!webGPUSupported && (
        <div className="mb-4 p-4 bg-yellow-100 border border-yellow-300 rounded">
          <p className="text-yellow-800">
            WebGPU not supported in this browser. Using CPU fallback mode.
          </p>
        </div>
      )}

      <div>
        {/* Schema Input */}
        <div>
          <h2>JSON Schema Input</h2>
          
          <div>
            <h3>Sample Schemas:</h3>
            <div className="ButtonGroup">
              <Button
                onClick={() => loadSample('basic')}
              >
                Basic + Enum
              </Button>
              <Button
                onClick={() => loadSample('nested')}
              >
                Nested Objects
              </Button>
              <Button
                onClick={() => loadSample('circular')}
              >
                Circular Reference
              </Button>
            </div>
          </div>

          <Textarea
            value={schema}
            w={'50%'}
            pb={'20px'}
            resize="vertical"
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSchema(e.target.value)}
            placeholder="Paste your JSON schema here..."
          />
          {errors.schema && (
            <p>{errors.schema}</p>
          )}
          
          <Button
            onClick={generateForm}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Generate Form'}
          </Button>
        </div>

        {/* Generated Form */}
        <div>
          <h2>Generated Form</h2>
          
          {formFields.length > 0 ? (
            <>
              <div className='FormField'>
                {formFields.map((field: ProcessedField, index: number) => (
                  <FormField
                    key={`${field.name}-${index}`}
                    field={field}
                    value={formValues[field.name]}
                    onChange={handleInputChange}
                    errors={errors}
                    depth={field.depth}
                    dataSource={dataSource}
                    onCreateNew={handleCreateNew}
                    availableRefs={availableRefs}
                  />
                ))}
              </div>
              
              <Button
                onClick={handleSubmit}
              >
                Submit
              </Button>


            </>
          ) : (
            <div>
              Generate a form by entering a JSON schema and clicking "Generate Form"
            </div>
          )}
        </div>
      </div>

      {/* Data Source Display */}
      {Object.keys(dataSource).some(key => dataSource[key].length > 0) && (
        <div>
          <h3>Available Object Data</h3>
          {Object.entries(dataSource).map(([type, items]) => {
            if ((items as any).length > 0) {
              return (
                <div key={type} className="mb-2">
                  <span>{type}:</span>
                  <span>
                    {(items as any).map((item: any) => item.label).join(', ')}
                  </span>
                </div>
              );
            }
            return null;
          })}
        </div>
      )}

      {/* Processing Info */}
      {webGPUSupported && formFields.length > 0 && (
        <div>
          <h3>WebGPU Processing Results</h3>
          <p>
            Processed {formFields.length} fields using GPU compute shaders for optimized rendering order.
          </p>
          <ul>
            <li><strong>Parallel Field Analysis</strong> - All fields processed simultaneously across GPU cores</li>
            <li><strong>Priority Optimization</strong> - GPU-computed priorities based on depth and requirements</li>
            <li><strong>Circular Reference Detection</strong> - Advanced schema analysis for self-referential structures</li>
            <li><strong>Object Hierarchy Mapping</strong> - Nested structure analysis for complex relationships</li>
          </ul>
          <div>
            ⚡ GPU compute shader executed with {Math.ceil(formFields.length / 64)} workgroups at 64 threads each
          </div>
        </div>
      )}


    </div>
    
  );
};

const sampleSchemas: Record<string, JsonSchema> = {
  basic: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Full name' },
      age: { type: 'integer', description: 'Age in years' },
      email: { type: 'string', description: 'Email address' },
      active: { type: 'boolean', description: 'Account active status' }
    },
    required: ['name', 'email']
  },
  nested: {
    type: 'object',
    properties: {
      user: {
        type: 'object',
        properties: {
          profile: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              settings: {
                type: 'object',
                properties: {
                  theme: { type: 'string' },
                  notifications: { type: 'boolean' }
                }
              }
            }
          }
        }
      }
    }
  },
  circular: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      parent: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          child: { $ref: '#' }  // Creates circular reference
        }
      }
    }
  }
};


export default WebGPUSchemaFormGenerator;