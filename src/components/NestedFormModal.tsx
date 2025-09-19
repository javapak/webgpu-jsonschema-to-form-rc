import { useState, useEffect } from "react";
import type FormErrors from "../types/FormErrors";
import type FormValues from "../types/FormValues";
import type NestedFormModalProps from "../types/NestedFormModalProps";
import type ProcessedField from "../types/ProcessedField";
import WebGPUSchemaProcessor from "../webgpu/WebGPUSchemaProcessor";
import FormField from "./FormField";
import type NestedFormState from "../types/NestedFormState";
import { Box, Button, ActionIcon, Center, Container, Modal } from "@mantine/core";
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
  depth = 0
}) => {
  const [processor] = useState(() => new WebGPUSchemaProcessor());
  const [formFields, setFormFields] = useState<ProcessedField[]>([]);
  const [formValues, setFormValues] = useState<FormValues>(nestedForm.values);
  const [errors, setErrors] = useState<FormErrors>({});
  const [childNestedForm, setChildNestedForm] = useState<NestedFormState | null>(null);
  const [opened, {open, close}] = useDisclosure(true);


  useEffect(() => {
    if (nestedForm.schema) {
      processor.analyzeSchema(nestedForm.schema).then(analysis => {
        setFormFields(analysis.topLevelFields);
      });
    }
  }, [nestedForm.schema, processor]);

  const handleInputChange = (fieldName: string, value: string | number | boolean | object): void => {
    setFormValues(prev => ({ ...prev, [fieldName]: value } as FormValues));
    if (errors[fieldName]) {
      setErrors(prev => ({ ...prev, [fieldName]: null }));
    }
  };

  const handleCreateNestedObject = (field: ProcessedField): void => {
    if (field.schema && depth < maxDepth) { // Prevent infinite nesting (max 5 levels)
      setChildNestedForm({
        isOpen: true,
        parentPath: field.name,
        schema: field.schema,
        values: {},
        title: field.schema.title || field.name.split('.').pop() || 'Object'
      });
    } else if (depth >= maxDepth) {
      alert(`Maximum nesting depth reached (${maxDepth} levels). Please create this object separately.`);
    }
  };

  const handleChildNestedFormSave = (data: object): void => {
    if (!childNestedForm) return;

    // Add to data source
    const objectType = childNestedForm.title;
    const id = `nested_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const label = `${Object.values(data)[0]} (Nested L${depth + 1})` || `Nested ${objectType} L${depth + 1}`;

    const newDataSource = {
      ...dataSource,
      [objectType]: [
        ...(dataSource[objectType] || []),
        { id, label, data }
      ]
    };

    // Update the parent's data source
    onUpdateDataSource(newDataSource);

    // Set the value in the current form
    handleInputChange(childNestedForm.parentPath, data);

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
        opened={opened}
        onClose={close}
        centered
        zIndex={modalZIndex}
      >
        <div 
          style={{ 
            transform: `scale(${1 - depth * 0.05})`,
            maxWidth: `${100 - depth * 5}%`,
            justifyContent: 'center'
          }}
        >
          
          <div>
            <div>
              <div>
                <h2>
                  Create New {nestedForm.title}
                </h2>
                <div className="ButtonGroup">
                              <ActionIcon
                variant="subtle"
                onClick={onClose}
                title="Close and return to parent"
                
                
              >
                <ArrowLeft width={'70%'}/> 
              </ActionIcon>
              </div>
                {depth > 0 && (
                  <p >
                    Nesting Level: {depth + 1} | Parent Path: {nestedForm.parentPath}
                  </p>
                )}
              </div>

            </div>
          </div>

          <div>
            {formFields.length === 0 ? (
              <div>
                <p>Loading form fields...</p>
              </div>
            ) : (
              formFields.map((field, index) => (
                <FormField
                  key={`${field.name}-${index}-depth-${depth}`}
                  field={field}
                  value={formValues[field.name]}
                  onChange={handleInputChange}
                  errors={errors}
                  depth={0} // Reset depth for display within modal
                  dataSource={dataSource}
                  onCreateNew={handleCreateNestedObject}
                  availableRefs={[]}
                />
              ))
            )}
          </div>

          <div>
            <div>
              {depth > 0 ? `Level ${depth + 1} of nested forms` : 'Root level form'}
            </div>
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
        />
      )}
      </Center>
    </ Container>
  );
};
export default NestedFormModal;