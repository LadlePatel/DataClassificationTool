
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { ColumnData, NDMOClassification } from "@/lib/types";

interface DataClassifyTableProps {
  columns: ColumnData[];
  onUpdateColumn: (id: string, updatedData: Partial<Omit<ColumnData, 'id'>>) => void;
  ndmoOptions: NDMOClassification[];
}

export function DataClassifyTable({ columns, onUpdateColumn, ndmoOptions }: DataClassifyTableProps) {
  if (columns.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No columns added yet. Use the form or upload a CSV to add data.</p>;
  }

  const handleInputChange = (id: string, field: keyof Omit<ColumnData, 'id'> , value: any) => {
    onUpdateColumn(id, { [field]: value });
  };


  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableCaption>A list of your classified data columns. Edit directly in the table.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[150px] min-w-[150px] sticky left-0 bg-card z-10">Column Name</TableHead>
            <TableHead className="min-w-[250px]">Description</TableHead>
            <TableHead className="min-w-[180px]">NDMO</TableHead>
            <TableHead className="text-center w-[70px] min-w-[70px]">PII</TableHead>
            <TableHead className="text-center w-[70px] min-w-[70px]">PHI</TableHead>
            <TableHead className="text-center w-[70px] min-w-[70px]">PFI</TableHead>
            <TableHead className="text-center w-[70px] min-w-[70px]">PSI</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {columns.map((column) => (
            <TableRow key={column.id}>
              <TableCell className="font-medium align-top pt-5 sticky left-0 bg-card z-10">{column.columnName}</TableCell>
              <TableCell className="align-top pt-2.5">
                <Textarea
                  value={column.description}
                  onChange={(e) => handleInputChange(column.id, 'description', e.target.value)}
                  placeholder="Enter description"
                  className="min-h-[40px] rounded-md text-sm"
                  rows={2}
                />
              </TableCell>
              <TableCell className="align-top pt-2.5">
                <Select
                  value={column.ndmoClassification || ""}
                  onValueChange={(value) => handleInputChange(column.id, 'ndmoClassification', value as NDMOClassification)}
                >
                  <SelectTrigger className="rounded-md text-sm h-10">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ndmoOptions.map((option) => (
                      <SelectItem key={option} value={option} className="text-sm">
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="text-center align-middle">
                <Switch
                  checked={column.pii}
                  onCheckedChange={(checked) => handleInputChange(column.id, 'pii', checked)}
                  className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted"
                  aria-label={`PII for ${column.columnName}`}
                />
              </TableCell>
              <TableCell className="text-center align-middle">
                <Switch
                  checked={column.phi}
                  onCheckedChange={(checked) => handleInputChange(column.id, 'phi', checked)}
                  className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted"
                  aria-label={`PHI for ${column.columnName}`}
                />
              </TableCell>
              <TableCell className="text-center align-middle">
                <Switch
                  checked={column.pfi}
                  onCheckedChange={(checked) => handleInputChange(column.id, 'pfi', checked)}
                  className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted"
                  aria-label={`PFI for ${column.columnName}`}
                />
              </TableCell>
              <TableCell className="text-center align-middle">
                <Switch
                  checked={column.psi}
                  onCheckedChange={(checked) => handleInputChange(column.id, 'psi', checked)}
                  className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted"
                  aria-label={`PSI for ${column.columnName}`}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
