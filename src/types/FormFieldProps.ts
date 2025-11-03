import type FormErrors from "./FormErrors";
import type { ObjectDataSource } from "./ObjectDataSource";
import type ProcessedField from "./ProcessedField";

export default interface FormFieldProps {
  field: ProcessedField;
  value: string | number | boolean | object | undefined;
  onChange: (fieldName: string, value: string | number | boolean | object) => void;
  errors: FormErrors;
  depth?: number;
  dataSource: ObjectDataSource;
  onCreateNew: (field: ProcessedField) => void;
  availableRefs?: string[]
}