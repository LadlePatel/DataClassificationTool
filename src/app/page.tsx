
"use client";

import type * as React from 'react';
import { useState, useEffect, useRef } from "react";
import Papa from "papaparse";
import { DataClassifyForm, type DataClassifyFormValues } from "@/components/data-classify-form";
import { DataClassifyTable } from "@/components/data-classify-table";
import type { ColumnData, NDMOClassification } from "@/lib/types";
import { ndmoClassificationOptions } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";

export default function DataClassificationPage() {
  const [columns, setColumns] = useState<ColumnData[]>([]);
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleAddColumn = (values: DataClassifyFormValues) => {
    const newColumn: ColumnData = {
      id: isClient ? crypto.randomUUID() : String(Date.now()),
      ...values,
      ndmoClassification: values.ndmoClassification as NDMOClassification, 
    };
    setColumns((prevColumns) => [newColumn, ...prevColumns]);
    toast({
      title: "Column Added",
      description: `"${values.columnName}" has been successfully added.`,
    });
  };

  const handleUpdateColumn = (id: string, updatedData: Partial<Omit<ColumnData, 'id'>>) => {
    setColumns((prevColumns) =>
      prevColumns.map((col) =>
        col.id === id ? { ...col, ...updatedData } : col
      )
    );
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isClient) return;
    const file = event.target.files?.[0];
    if (!file) {
      toast({ title: "No file selected", variant: "destructive" });
      return;
    }

    if (file.type !== "text/csv") {
      toast({ title: "Invalid File Type", description: "Please upload a CSV file.", variant: "destructive" });
      return;
    }

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          toast({ title: "CSV Parsing Error", description: results.errors.map(e => e.message).join(", "), variant: "destructive" });
          return;
        }
        
        const header = results.meta.fields;
        const columnNameKey = header?.find(h => h.toLowerCase() === 'column name' || h.toLowerCase() === 'column_name');

        if (!columnNameKey) {
          toast({ title: "CSV Header Missing", description: "CSV must contain a 'column_name' or 'Column Name' header.", variant: "destructive" });
          return;
        }

        const newColumns: ColumnData[] = results.data.map((row) => {
          const columnName = row[columnNameKey]?.trim();
          if (!columnName) return null; 

          return {
            id: crypto.randomUUID(),
            columnName: columnName,
            description: row.description || row.Description || "",
            ndmoClassification: (row.ndmoClassification || row["NDMO Classification"] || undefined) as NDMOClassification | undefined,
            pii: ["true", "yes", "1"].includes((row.pii || row.PII || "false").toLowerCase()),
            phi: ["true", "yes", "1"].includes((row.phi || row.PHI || "false").toLowerCase()),
            pfi: ["true", "yes", "1"].includes((row.pfi || row.PFI || "false").toLowerCase()),
            psi: ["true", "yes", "1"].includes((row.psi || row.PSI || "false").toLowerCase()),
          };
        }).filter(Boolean) as ColumnData[];

        if (newColumns.length === 0 && results.data.length > 0) {
             toast({ title: "No Valid Columns Found", description: "No columns with valid names found in CSV.", variant: "destructive" });
             return;
        }
        
        setColumns((prevColumns) => [...prevColumns, ...newColumns].sort((a, b) => a.columnName.localeCompare(b.columnName)));
        toast({ title: "CSV Uploaded", description: `${newColumns.length} columns added from the CSV file.` });
      },
      error: (error)  => {
        toast({ title: "CSV Upload Failed", description: error.message, variant: "destructive" });
      }
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };


  const convertToCSV = (data: ColumnData[]) => {
    const header = ['Column Name', 'Description', 'NDMO Classification', 'PII', 'PHI', 'PFI', 'PSI'];
    const rows = data.map(row => [
      `"${(row.columnName || "").replace(/"/g, '""')}"`,
      `"${(row.description || "").replace(/"/g, '""')}"`,
      row.ndmoClassification || 'Public', 
      row.pii ? 'Yes' : 'No',
      row.phi ? 'Yes' : 'No',
      row.pfi ? 'Yes' : 'No',
      row.psi ? 'Yes' : 'No',
    ]);
    return [header.join(','), ...rows.map(row => row.join(','))].join('\r\n');
  };

  const handleDownloadCsv = () => {
    if (!isClient) return; 

    if (columns.length === 0) {
      toast({
        title: "No Data",
        description: "There is no data to download.",
        variant: "destructive",
      });
      return;
    }
    const csvData = convertToCSV(columns);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'data_classification.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({
        title: "CSV Downloaded",
        description: "The data has been exported as data_classification.csv.",
      });
    }
  };

  return (
    <main className="container mx-auto p-4 md:p-8 min-h-screen">
      <header className="mb-10">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-4xl font-headline font-bold text-center text-accent flex-grow">
            Data Classification Tool
          </h1>
          <ThemeToggle />
        </div>
        <p className="text-center text-muted-foreground mt-2">
          Manually input, upload, and classify your core banking data columns.
        </p>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-8">
          <Card className="shadow-xl rounded-lg">
            <CardHeader>
              <CardTitle className="font-headline text-2xl text-primary">Add New Column</CardTitle>
            </CardHeader>
            <CardContent>
              <DataClassifyForm onSubmit={handleAddColumn} ndmoOptions={ndmoClassificationOptions} />
            </CardContent>
          </Card>

          <Card className="shadow-xl rounded-lg">
            <CardHeader>
              <CardTitle className="font-headline text-2xl text-primary">Upload CSV</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="csv-upload-input" className="text-sm font-medium sr-only">Upload CSV File</Label>
                <Input
                  id="csv-upload-input"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  ref={fileInputRef}
                  className="hidden" 
                />
                 <Button 
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="w-full rounded-md"
                >
                  <Upload className="mr-2 h-4 w-4" /> Choose CSV File
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                CSV must contain 'column_name' or 'Column Name'. Optional: Description, NDMO Classification, PII, PHI, PFI, PSI.
              </p>
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-2">
          <Card className="shadow-xl rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-headline text-2xl text-primary">Classified Columns</CardTitle>
              <Button 
                onClick={handleDownloadCsv} 
                disabled={!isClient || columns.length === 0}
                variant="outline"
                className="rounded-md"
              >
                <Download className="mr-2 h-4 w-4" /> Download CSV
              </Button>
            </CardHeader>
            <CardContent>
              <DataClassifyTable 
                columns={columns} 
                onUpdateColumn={handleUpdateColumn}
                ndmoOptions={ndmoClassificationOptions} 
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
