import type ProcessedField from "./ProcessedField";

export default interface CircularRefSelectorProps {
  field: ProcessedField;
  value: string | undefined;
  onChange: (fieldName: string, value: string) => void;
  availableRefs: string[];
  error?: string | null;
}