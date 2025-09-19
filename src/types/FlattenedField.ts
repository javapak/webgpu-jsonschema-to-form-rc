import type JsonSchema from "./JsonSchema";

export default interface FlattenedField {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'circular_reference';
  required: boolean;
  depth: number;
  parentIndex: number;
  schema?: JsonSchema;
  originalPath?: string;
  circularRefPath?: string;
}