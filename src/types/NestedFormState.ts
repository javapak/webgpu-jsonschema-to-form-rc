import type FormValues from "./FormValues";
import type JsonSchema from "./JsonSchema";

export default interface NestedFormState {
  isOpen: boolean;
  parentPath: string;
  schema: JsonSchema;
  values: FormValues;
  title: string;
}
