"use client";

import type * as React from 'react';
import { useState, useEffect } from "react";
import { DataClassifyForm, type DataClassifyFormValues } from "@/components/data-classify-form";
import { DataClassifyTable } from "@/components/data-classify-table";
import type { ColumnData } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";

export default function DataClassificationPage() {
  const [columns, setColumns] = useState<ColumnData[]>([]);
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);


  const handleAddColumn = (values: DataClassifyFormValues) => {
    const newColumn: ColumnData = {
      id: isClient ? crypto.randomUUID() : String(Date.now()), // Simple unique ID for client-side
      ...values,
    };
    setColumns((prevColumns) => [newColumn, ...prevColumns]);
    toast({
      title: "Column Added",
      description: `"${values.columnName}" has been successfully added.`,
    });
  };

  const convertToCSV = (data: ColumnData[]) => {
    const header = ['Column Name', 'Description', 'NDMO Classification', 'PII', 'PHI', 'PFI', 'PSI'];
    const rows = data.map(row => [
      `"${row.columnName.replace(/"/g, '""')}"`,
      `"${row.description.replace(/"/g, '""')}"`,
      row.ndmoClassification,
      row.pii ? 'Yes' : 'No',
      row.phi ? 'Yes' : 'No',
      row.pfi ? 'Yes' : 'No',
      row.psi ? 'Yes' : 'No',
    ]);
    // Use \r\n for Windows compatibility in CSV newlines
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
          <div></div> {/* Empty div for spacing, keeps title centered */}
          <h1 className="text-4xl font-headline font-bold text-center text-accent">
            Data Classification Tool
          </h1>
          <ThemeToggle />
        </div>
        <p className="text-center text-muted-foreground mt-2">
          Manually input and classify your core banking data columns.
        </p>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card className="shadow-xl rounded-lg">
            <CardHeader>
              <CardTitle className="font-headline text-2xl text-primary">Add New Column</CardTitle>
            </CardHeader>
            <CardContent>
              <DataClassifyForm onSubmit={handleAddColumn} />
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
              <DataClassifyTable columns={columns} />
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
