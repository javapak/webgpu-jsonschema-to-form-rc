import type FormValues from "./FormValues";
import type JsonSchema from "./JsonSchema";

export default interface NestedFormState {
  isOpen: boolean;
  parentPath: string;
  schema: JsonSchema;
  rootSchema: JsonSchema;  // Preserves root schema context for definition lookups
  values: FormValues;
  title: string;
}
