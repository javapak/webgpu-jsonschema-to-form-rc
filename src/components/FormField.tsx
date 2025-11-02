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
  console.log(depth);

  return (
    <>
      <FormInput 
        field={field} 
        value={value} 
        onChange={onChange} 
        error={error}
        dataSource={dataSource}
        onCreateNew={onCreateNew}
        availableRefs={availableRefs}
      />


      {error && <p className="Error">{error}.</p>}
    </>
  );
};

export default FormField;