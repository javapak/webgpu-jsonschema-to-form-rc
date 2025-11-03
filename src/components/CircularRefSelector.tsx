import { NativeSelect } from "@mantine/core";
import type CircularRefSelectorProps from "../types/CircularRefSelecterProps";

const CircularRefSelector: React.FC<CircularRefSelectorProps> = ({
  field,
  value,
  onChange,
  availableRefs
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
        Internal reference detected ("#" link). Select an existing object to reference.
      </p>
    </>
  );
};

export default CircularRefSelector;