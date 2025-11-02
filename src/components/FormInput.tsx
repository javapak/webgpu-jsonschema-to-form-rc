import type FormInputProps from "../types/FormInputProps";
import React from 'react';
import {Checkbox, TextInput, NativeSelect} from '@mantine/core'
import ObjectSelector from "./ObjectSelector";
import CircularRefSelector from "./CircularRefSelector";

const FormInput: React.FC<FormInputProps> = ({ 
  field, 
  value, 
  onChange, 
  error, 
  dataSource, 
  onCreateNew,
  availableRefs 
}) => {
  const baseInputProps = {
    placeholder: `Enter ${field.name}`,
  };

  switch (field.type) {
    case 'number':
    case 'integer':
      return (
        <TextInput
          maw='250px'
          title={field.schema?.title}
          description={field.schema?.description}
          label={field.name}
          withAsterisk={field.required}
          pb={20}
          type="number" 
          {...baseInputProps}
          value={typeof value === 'number' ? value : ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const numValue = parseFloat(e.target.value);
            onChange(field.name, isNaN(numValue) ? 0 : numValue);
          }}
        />
      );
    case 'boolean':
      return (

        <Checkbox
          pb={20}
          title={field.schema?.title}
          label={field.required ? `${field.name} *` : field.name}
          type="checkbox"
          checked={typeof value === 'boolean' ? value : false}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(field.name, e.target.checked)}
        />
      );
    case 'object':
      return (
        <ObjectSelector
          field={field}
          value={typeof value === 'object' ? value : undefined}
          onChange={onChange}
          dataSource={dataSource}
          onCreateNew={onCreateNew}
          error={error}
        />
      );
    case 'circular_reference':
      return (
        <CircularRefSelector
          field={field}
          value={typeof value === 'string' ? value : undefined}
          onChange={(fieldName: string, val: string) => onChange(fieldName, val)}
          availableRefs={availableRefs}
          error={error}
        />
      );
    default:
      if (field.schema?.enum) {
        return (
          <NativeSelect
            maw='250px'
            title={field.schema.title}
            description={field.schema?.description}
            label={field.name}
            withAsterisk={field.required}
            {...baseInputProps}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(field.name, e.currentTarget.value)}
            data={field.schema.enum.map(String)}
          />
        );
      }
      return (
        <TextInput
          maw='250px'
          title={field.schema?.title}
          description={field.schema?.description}
          withAsterisk={field.required}
          label={field.name}
          pb={20}
          type="text" 
          {...baseInputProps}
          value={typeof value === 'string' ? value : ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(field.name, e.target.value)}
        />
      );
  }
};

export default FormInput;
