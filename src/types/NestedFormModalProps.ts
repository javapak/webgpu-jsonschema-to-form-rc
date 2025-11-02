import { Stack } from "@mantine/core";
import type NestedFormState from "./NestedFormState";
import type { ObjectDataSource } from "./ObjectDataSource";

export default interface NestedFormModalProps {
  nestedForm: NestedFormState;
  onClose: () => void;
  onSave: (data: object) => void;
  dataSource: ObjectDataSource;
  onUpdateDataSource: (newDataSource: ObjectDataSource) => void;
  /** Optional callback to close the root/top-level nested modal (closes all nested modals)
   * When provided, child modals should call this to close the entire modal stack.
   */
  closeAll?: () => void;
  depth?: number;
  maxDepth: number;
}