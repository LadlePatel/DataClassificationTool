"use client";

import type * as React from 'react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ColumnData } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

interface DataClassifyTableProps {
  columns: ColumnData[];
}

const BooleanTextDisplay: React.FC<{ value: boolean }> = ({ value }) => {
  return <span className={value ? 'text-primary font-medium' : 'text-destructive'}>{value ? 'Yes' : 'No'}</span>;
};


export function DataClassifyTable({ columns }: DataClassifyTableProps) {
  if (columns.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No columns added yet. Use the form to add data.</p>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableCaption>A list of your classified data columns.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[150px]">Column Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>NDMO</TableHead>
            <TableHead className="text-center">PII</TableHead>
            <TableHead className="text-center">PHI</TableHead>
            <TableHead className="text-center">PFI</TableHead>
            <TableHead className="text-center">PSI</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {columns.map((column) => (
            <TableRow key={column.id}>
              <TableCell className="font-medium">{column.columnName}</TableCell>
              <TableCell>{column.description}</TableCell>
              <TableCell>
                <Badge variant={
                  column.ndmoClassification === 'Top Secret' ? "destructive" :
                  column.ndmoClassification === 'Secret' ? "secondary" : 
                  column.ndmoClassification === 'Restricted' ? "outline" : 
                  "default" 
                }>{column.ndmoClassification}</Badge>
              </TableCell>
              <TableCell className="text-center"><BooleanTextDisplay value={column.pii} /></TableCell>
              <TableCell className="text-center"><BooleanTextDisplay value={column.phi} /></TableCell>
              <TableCell className="text-center"><BooleanTextDisplay value={column.pfi} /></TableCell>
              <TableCell className="text-center"><BooleanTextDisplay value={column.psi} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
