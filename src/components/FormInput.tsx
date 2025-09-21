import type FormInputProps from "../types/FormInputProps";
import React from 'react';
import {Checkbox, TextInput, Select, Input} from '@mantine/core'
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
    placeholder: field.schema?.description || `Enter ${field.name}`,
  };

  switch (field.type) {
    case 'number':
    case 'integer':
      return (
        <TextInput
          pb={20}
          label={field.name}
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
          label={field.name}
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
          <Select
            {...baseInputProps}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(field.name, !e)}
          >
            <option value="">Select an option...</option>
            {field.schema.enum.map((option) => (
              <option key={String(option)} value={String(option)}>
                {String(option)}
              </option>
            ))}
          </Select>
        );
      }
      return (
        <TextInput
          pb={20}
          label={field.name}
          type="text" 
          {...baseInputProps}
          value={typeof value === 'string' ? value : ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(field.name, e.target.value)}
        />
      );
  }
};

export default FormInput;
