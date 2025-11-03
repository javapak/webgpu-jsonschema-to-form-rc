import { useState, useEffect } from "react";
import type FormErrors from "../types/FormErrors";
import type FormValues from "../types/FormValues";
import type NestedFormModalProps from "../types/NestedFormModalProps";
import type ProcessedField from "../types/ProcessedField";
import WebGPUSchemaProcessor from "../webgpu/WebGPUSchemaProcessor";
import FormField from "./FormField";
import type NestedFormState from "../types/NestedFormState";
import { Button, ActionIcon, Center, Container, Modal, LoadingOverlay } from "@mantine/core";
import { useDisclosure } from '@mantine/hooks';
import {ArrowLeft} from '@ricons/tabler';
import '@mantine/core/styles/ModalBase.css';





const NestedFormModal: React.FC<NestedFormModalProps> = ({
  nestedForm,
  onClose,
  onSave,
  dataSource,
  onUpdateDataSource,
  maxDepth,
  depth = 0,
  closeAll
  ,
  availableRefs
}) => {
  const [processor] = useState(() => new WebGPUSchemaProcessor());
  const [formFields, setFormFields] = useState<ProcessedField[]>([]);
  const [formValues, setFormValues] = useState<FormValues>(nestedForm.values);
  const [errors, setErrors] = useState<FormErrors>({});
  const [childNestedForm, setChildNestedForm] = useState<NestedFormState | null>(null);
  const [opened, { close }] = useDisclosure(true);



  useEffect(() => {
    if (nestedForm.schema && nestedForm.rootSchema) {
      // Create a schema that has the nested object's structure but preserves root definitions
      const schemaWithDefs = {
        ...structuredClone(nestedForm.schema),
        definitions: structuredClone(nestedForm.rootSchema.definitions)
      };
      processor.analyzeSchema(schemaWithDefs).then(analysis => {
        setFormFields(analysis.topLevelFields);
      });
    }
  }, [nestedForm.schema, nestedForm.rootSchema, processor]);

  const handleInputChange = (fieldName: string, value: string | number | boolean | object): void => {
    setFormValues(prev => ({ ...prev, [fieldName]: value } as FormValues));
    if (errors[fieldName]) {
      setErrors(prev => ({ ...prev, [fieldName]: null }));
    }
  };

  const handleCreateNestedObject = (field: ProcessedField): void => {
    if (field.schema && depth < maxDepth) { // Prevent infinite nesting 
      setChildNestedForm({
        isOpen: true,
        parentPath: nestedForm.parentPath ? `${nestedForm.parentPath} → ${field.name}`: field.name,
        schema: field.schema,
        rootSchema: nestedForm.rootSchema,
        values: {},
        title: field.schema.title || field.name.split('.').pop() || 'Object'
      });
    } else if (depth >= maxDepth) {
      alert(`Maximum nesting depth reached (${maxDepth} levels). Please create this object separately.`);
    }
  };

  const callOnClose = () => {
    // If a top-level closeAll handler was provided, use it to close the entire stack.
    if (closeAll) {
      closeAll();
      return;
    }

    // Fallback: close only this modal and call the provided onClose to let the parent handle its state.
    close();
    onClose();
  }

  const handleChildNestedFormSave = (data: object): void => {
    if (!childNestedForm) return;

    // Add to data source
    const objectType = childNestedForm.title;
    const id = `nested_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const label = `${Object.values(data)[0]} (Nested L${depth + 1})` || `Nested ${objectType} L${depth + 1}`;

    // Create a reference to the new object that will be added to the data source
    const newObjectRef = { id, label, data };

    // Update both local state and parent's data source
    const newDataSource = {
      ...dataSource,
      [objectType]: [
        ...(dataSource[objectType] || []),
        newObjectRef
      ],
    };

    // Update the data source at this level and propagate upward
    onUpdateDataSource(newDataSource);

    // Set the value in the current form to the reference object
    handleInputChange(childNestedForm.parentPath, newObjectRef);

    // Close child nested form
    setChildNestedForm(null);
  };

  const handleSave = (): void => {
    // Basic validation
    const newErrors: FormErrors = {};
    formFields.forEach(field => {
      if (field.required && !formValues[field.name]) {
        newErrors[field.name] = 'This field is required';
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave(formValues);
  };

  const modalZIndex = 50 + depth * 10; // Ensure proper stacking of nested modals

  return (
    <Container>
      <Modal
        title={`Create new ${nestedForm.title}`}
        opened={opened}
        onClose={callOnClose}
        centered
        zIndex={modalZIndex}
      >
        <div 
          style={{ 
            justifyContent: 'center'
          }}
        >
          
          <div>
            <div>
              <div>
                <div className="ButtonGroup">

              </div>
                {depth > 0 && (
                <>
                <ActionIcon
                  variant="subtle"
                  onClick={() => onClose()}
                
                  title="Close and return to parent"
                  
                >
                  <ArrowLeft width={'70%'}/> 
                </ActionIcon>

                  </>
                )}
              </div>

            </div>
          </div>

          <div className="FormField">
            {formFields.length === 0 ? (
              <Center>
                <p>Loading form fields...</p>
                <LoadingOverlay/>
              </Center>
            ) : (
              formFields.map((field, index) => (
                <div>
                <FormField
                  key={`${field.name}-${index}-depth-${depth}`}
                  field={field}
                  value={formValues[field.name]}
                  onChange={handleInputChange}
                  errors={errors}
                  depth={0} // Reset depth for display within modal
                  dataSource={dataSource}
                  onCreateNew={handleCreateNestedObject}
                  availableRefs={availableRefs}
                />
                </div>
              ))
            )}
          </div>

          <div>
            <div className="ButtonGroup">


              <Button
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
              
              >
                Save & Use
              </Button>
            </div>
          </div>
        </div>
        <p>
         {nestedForm.parentPath} | {depth + 1}
        </p>
      </Modal>

      {/* Recursive Child Nested Form */}
      <Center>
      {childNestedForm && (
        <NestedFormModal
          nestedForm={childNestedForm}
          onClose={() => setChildNestedForm(null)}
          onSave={handleChildNestedFormSave}
          dataSource={dataSource}
          onUpdateDataSource={onUpdateDataSource}
          maxDepth={maxDepth}
          depth={depth + 1}
          closeAll={closeAll}
        />
      )}

      </Center>
    </ Container>
  );
};
export default NestedFormModal;