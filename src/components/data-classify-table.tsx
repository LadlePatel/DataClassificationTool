
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
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';


interface DataClassifyTableProps {
  columns: ColumnData[];
  onUpdateColumn: (id: string, updatedData: Partial<Omit<ColumnData, 'id'>>) => void;
  onDeleteColumn: (id: string) => void;
  ndmoOptions: NDMOClassification[];
  duplicateColumnNames: Set<string>;
}

export function DataClassifyTable({ columns, onUpdateColumn, onDeleteColumn, ndmoOptions, duplicateColumnNames }: DataClassifyTableProps) {
  if (columns.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No columns added yet. Use the AI classification tools to add columns.</p>;
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
            <TableHead className="text-center w-[70px] min-w-[70px]">PCI</TableHead>
            <TableHead className="text-center w-[90px] min-w-[90px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {columns.map((column) => {
            const isDuplicate = duplicateColumnNames.has(column.columnName);
            return (
            <TableRow
              key={column.id}
              className={cn(
                isDuplicate && "bg-destructive/10 hover:bg-destructive/20"
              )}
            >
              <TableCell
                className={cn(
                  "font-medium align-top pt-5 sticky left-0 z-10",
                  isDuplicate
                    ? "bg-destructive/10 group-hover:bg-destructive/20"
                    : "bg-card group-hover:bg-muted/50"
                )}
              >
                {column.columnName}
              </TableCell>
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
                  aria-label={`PII for ${column.columnName}`}
                />
              </TableCell>
              <TableCell className="text-center align-middle">
                <Switch
                  checked={column.phi}
                  onCheckedChange={(checked) => handleInputChange(column.id, 'phi', checked)}
                  aria-label={`PHI for ${column.columnName}`}
                />
              </TableCell>
              <TableCell className="text-center align-middle">
                <Switch
                  checked={column.pfi}
                  onCheckedChange={(checked) => handleInputChange(column.id, 'pfi', checked)}
                  aria-label={`PFI for ${column.columnName}`}
                />
              </TableCell>
              <TableCell className="text-center align-middle">
                <Switch
                  checked={column.psi}
                  onCheckedChange={(checked) => handleInputChange(column.id, 'psi', checked)}
                  aria-label={`PSI for ${column.columnName}`}
                />
              </TableCell>
              <TableCell className="text-center align-middle">
                <Switch
                  checked={column.pci}
                  onCheckedChange={(checked) => handleInputChange(column.id, 'pci', checked)}
                  aria-label={`PCI for ${column.columnName}`}
                />
              </TableCell>
              <TableCell className="text-center align-middle">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete column</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the
                        <span className="font-bold"> "{column.columnName}" </span> 
                        column and its data from your local data and the database.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDeleteColumn(column.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          )})}
        </TableBody>
      </Table>
    </div>
  );
}
