export default interface JsonSchema {
  type?: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  definitions?: Record<string, JsonSchema>;
  required?: string[];
  description?: string;
  title?: string;
  $ref?: string;
  enum?: (string | number)[];
}