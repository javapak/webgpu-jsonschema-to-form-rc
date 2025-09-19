import { Select } from "@mantine/core";
import type CircularRefSelectorProps from "../types/CircularRefSelecterProps";

const CircularRefSelector: React.FC<CircularRefSelectorProps> = ({
  field,
  value,
  onChange,
  availableRefs,
  error
}) => {
  return (
    <div>
      <Select
        value={value || ''}
        onChange={(e) => onChange(field.name, e!)}
        className={`w-full p-2 border rounded ${error ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
      >
        <option value="">Select reference...</option>
        {availableRefs.map((ref: any) => (
          <option key={ref} value={ref}>
            Reference to: {ref}
          </option>
        ))}
      </Select>
      <p className="Warning">
        Circular reference detected. Select an existing object to reference.
      </p>
    </div>
  );
};

export default CircularRefSelector;