import type JsonSchema from "./JsonSchema";

export default interface FlattenedField {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
  required: boolean;
  depth: number;
  schema?: JsonSchema;
  originalPath?: string;
  circularRefPath?: string;
}