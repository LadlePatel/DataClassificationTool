export type NDMOClassification = 'Top Secret' | 'Secret' | 'Restricted' | 'Public';

export const ndmoClassificationOptions: NDMOClassification[] = ['Top Secret', 'Secret', 'Restricted', 'Public'];

export interface ColumnData {
  id: string;
  columnName: string;
  description: string;
  ndmoClassification?: NDMOClassification; // Made optional for CSV import if not present
  reason_ndmo?:string,
  pii: boolean;
  phi: boolean;
  pfi: boolean;
  psi: boolean;
  pci: boolean;
}

export type DatabaseType = 'postgres' | 'oracle' | 'hive' | 'unknown';
