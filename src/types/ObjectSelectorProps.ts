import type { ObjectDataSource } from "./ObjectDataSource";
import type ProcessedField from "./ProcessedField";

export default interface ObjectSelectorProps {
  field: ProcessedField;
  value: object | undefined;
  onChange: (fieldName: string, value: object | string) => void;
  dataSource: ObjectDataSource;
  onCreateNew: (field: ProcessedField) => void;
  error?: string | null;
}
