import type { ObjectDataSource } from "./ObjectDataSource";
import type ProcessedField from "./ProcessedField";

export default interface FormInputProps {
  field: ProcessedField;
  value: string | number | boolean | object | undefined;
  onChange: (fieldName: string, value: string | number | boolean | object) => void;
  error?: string | null;
  nestedCall?: boolean
  dataSource: ObjectDataSource;
  onCreateNew: (field: ProcessedField) => void;
  availableRefs: string[];

}