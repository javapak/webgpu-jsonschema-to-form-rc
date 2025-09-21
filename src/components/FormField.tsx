import type FormFieldProps from "../types/FormFieldProps";
import FormInput from "./FormInput";
import React from 'react';

const FormField: React.FC<FormFieldProps> = ({ 
  field, 
  value, 
  onChange, 
  errors, 
  depth = 0, 
  dataSource, 
  onCreateNew,
  availableRefs 
}) => {
  const error: string | null = errors[field.name] || null;
  const indentClass: string = depth > 0 ? `ml-${Math.min(depth * 4, 16)}` : '';

  return (
    <div className={`mb-4 ${indentClass}`}>
      <label>
        
        {field.required && <span>*</span>}
        {field.type === 'object' && <span></span>}
        {field.type === 'circular_reference' && (
          <span >circular ref</span>
        )}
      </label>
      <div title={`${field.schema?.description}`} className="FormInput">
      <FormInput 
        field={field} 
        value={value} 
        onChange={onChange} 
        error={error}
        dataSource={dataSource}
        onCreateNew={onCreateNew}
        availableRefs={availableRefs}
      />
      </div>

      {error && <p className="Error">{error}.</p>}
    </div>
  );
};

export default FormField;