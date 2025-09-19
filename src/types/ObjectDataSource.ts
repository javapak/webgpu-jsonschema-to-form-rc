export interface ObjectDataSource {
  [typeName: string]: Array<{
    id: string;
    label: string;
    data: object;
  }>;
}