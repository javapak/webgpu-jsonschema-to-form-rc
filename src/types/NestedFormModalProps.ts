import { Stack } from "@mantine/core";
import type NestedFormState from "./NestedFormState";
import type { ObjectDataSource } from "./ObjectDataSource";

export default interface NestedFormModalProps {
  nestedForm: NestedFormState;
  onClose: () => void;
  onSave: (data: object) => void;
  dataSource: ObjectDataSource;
  onUpdateDataSource: (newDataSource: ObjectDataSource) => void;
  depth?: number;
}