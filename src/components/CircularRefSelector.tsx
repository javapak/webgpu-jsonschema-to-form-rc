import { NativeSelect, Select } from "@mantine/core";
import type CircularRefSelectorProps from "../types/CircularRefSelecterProps";

const CircularRefSelector: React.FC<CircularRefSelectorProps> = ({
  field,
  value,
  onChange,
  availableRefs,
  error
}) => {
  return (
    <>
      {<NativeSelect
        w={'30vw'}
        maw={'30vw'}
        miw={'10vw'}
        label={field.name}
        value={value || ''}
        onChange={(e) => onChange(field.name, e.currentTarget.value)}
        data={availableRefs}
      />}

      <p className="Warning">
        Circular reference detected. Select an existing object to reference.
      </p>
    </>
  );
};

export default CircularRefSelector;