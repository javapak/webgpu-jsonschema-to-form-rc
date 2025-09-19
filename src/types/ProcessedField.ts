import type FlattenedField from "./FlattenedField";

export default interface ProcessedField extends FlattenedField {
  name: string;
  priority?: number;
}