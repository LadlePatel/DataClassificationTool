export type NDMOClassification = 'Top Secret' | 'Secret' | 'Restricted' | 'Public';

export interface ColumnData {
  id: string;
  columnName: string;
  description: string;
  ndmoClassification: NDMOClassification;
  pii: boolean;
  phi: boolean;
  pfi: boolean;
  psi: boolean;
}
