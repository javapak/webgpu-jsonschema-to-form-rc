
import type FormErrors from "../types/FormErrors";
import type JsonSchema from "../types/JsonSchema";
import type ProcessedField from "../types/ProcessedField";
import type { ObjectDataSource } from "../types/ObjectDataSource";
import type NestedFormState from "../types/NestedFormState";
import type FormValues from "../types/FormValues";
import WebGPUSchemaProcessor from "../webgpu/WebGPUSchemaProcessor";
import FormField from "./FormField";
import NestedFormModal from "./NestedFormModal";
import { useState, useEffect, useCallback } from "react";
import { Button, Textarea} from "@mantine/core";



const WebGPUSchemaFormGenerator: React.FC<{maxDepth: number}> = ({maxDepth}: {maxDepth: number}) => {
  const [processor] = useState<WebGPUSchemaProcessor>(() => new WebGPUSchemaProcessor());
  const [schema, setSchema] = useState<string>('');
  const [formFields, setFormFields] = useState<ProcessedField[]>([]);
  const [formValues, setFormValues] = useState<FormValues>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [webGPUSupported, setWebGPUSupported] = useState<boolean>(false);
  const [currentPath] = useState<string>('root');
  // Object data source for dropdowns
  const [dataSource, setDataSource] = useState<ObjectDataSource>({});
  const [nestedForm, setNestedForm] = useState<NestedFormState | null>(null);
  // Available internal refs (e.g. keys from root `#/definitions/*` or special tokens)
  const [availableRefs, setAvailableRefs] = useState<string[]>(['root', 'parent', 'self']);
  const [rootSchemaName, setRootSchemaName] = useState<string>();

  useEffect(() => {
    setWebGPUSupported(!!navigator.gpu);
  }, []);

  const generateForm = async (): Promise<void> => {
    if (!schema.trim()) return;
    setLoading(true);
    setErrors({});


    try {
      const parsedSchema: JsonSchema = JSON.parse(schema);
      setRootSchemaName(firstToUpper(parsedSchema.title ? parsedSchema.title : ''));
      // Initialize WebGPU if supported
      if (webGPUSupported && !processor['initialized']) {
        try {
          await processor.initialize();
        } catch (error) {
          console.warn('WebGPU initialization failed, using CPU fallback:', error);
        }
      }
      
    const analysis = await processor.analyzeSchema(parsedSchema);
    // Build available refs list from discovered internal refs and a few special tokens
    const refs = analysis.internalRefs ? Object.keys(analysis.internalRefs) : [];
    setAvailableRefs([...refs, 'root', 'parent', 'self']);

    setFormFields(analysis.topLevelFields);
      
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
      const parsedRootSchema = JSON.parse(schema);
      setNestedForm({
        isOpen: true,
        parentPath: `${currentPath} → ${field.name}`,
        schema: field.schema,
        rootSchema: parsedRootSchema,  // Include root schema for definition lookups
        values: {},
        title: field.schema.title || field.name.split('.').pop() || 'Object'
      });
    }
  };

  const handleUpdateDataSource = useCallback((newDataSource: ObjectDataSource) => {
    console.log('new data source', newDataSource);
    setDataSource(newDataSource);
  }, []);

  

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

  const firstToUpper = (str: string): string => str.charAt(0).toUpperCase() + str.slice(1);


  return (
    <div id='main'>
                    {/* Nested Form Modal */}
              {nestedForm && (
                <NestedFormModal
                  nestedForm={nestedForm}
                  onClose={() => setNestedForm(null)}
                  closeAll={() => setNestedForm(null)}
                  availableRefs={availableRefs}
                  onSave={handleNestedFormSave}
                  dataSource={dataSource}
                  onUpdateDataSource={handleUpdateDataSource}
                  maxDepth={maxDepth}        />
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
                Internal Reference
              </Button>
            </div>
          </div>

          <Textarea
            value={schema}
            w={'50%'}
            pl={'20px'}
            pb={'20px'}
            resize="vertical"
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSchema(e.target.value)}
            placeholder="Paste your JSON schema here..."
          />
          {errors.schema && (
            <p>{errors.schema}</p>
          )}
          <div style={{paddingLeft: '20px'}}>
            <Button
              onClick={generateForm}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Generate Form'}
            </Button>
          </div>
        </div>

        {/* Generated Form */}
        <div>
          
          
          {formFields.length > 0 ? (
            <>
              <div className='FormField' style={{maxWidth: '40%'}}>
                <h3>{rootSchemaName + ' '} properties:</h3>

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
              <div style={{paddingLeft: '20px'}}>
              <Button
                onClick={handleSubmit}
              >
                Submit
              </Button>
              </div>


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

    </div>
    
  );
};

const sampleSchemas: Record<string, JsonSchema> = {
  basic: {
    title: 'account',
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Full name' },
      age: { type: 'integer', description: 'Age in years' },
      email: { type: 'string', description: 'Email address' },
      active: { type: 'boolean', description: 'Account active status' },
      membership: {type: 'string', enum: ['Basic', 'Plus', 'Ultimate']}

    },
    required: ['name', 'email']
  },
  nested: {
    title: 'User Persistant Settings',
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
    title: 'parent',
    description: 'i am the parent type but i am also the child type :O',
    definitions: {test: {description: 'wow, look at my description inside of my definition.', type: 'string', enum: ['yeah', 'please (._.)', 'work',]}},
    type: 'object',
    properties: {
      name: { type: 'string' },
      nestedObject: {
        type: 'object',
        properties: {
          testProp: { type: 'string' },
          a_fucking_miracle: { $ref: '#/definitions/test' }
        },


      },
      circularRefTest: { $ref: '#' },  // Creates an internal $ref link to the root ("#")


    }
  }
};


export default WebGPUSchemaFormGenerator;