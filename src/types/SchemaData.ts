export default interface SchemaData {
  fieldTypes: Uint32Array;
  fieldNames: string[];
  fieldRequired: Uint32Array;
  fieldDepths: Uint32Array;
  parentIndices: Int32Array;
  fieldCount: number;
}
