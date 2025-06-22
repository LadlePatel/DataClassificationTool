
"use client";

import type * as React from 'react';
import { useState, useEffect, useRef } from "react";
import { DataClassifyTable } from "@/components/data-classify-table";
import type { ColumnData, NDMOClassification } from "@/lib/types";
import { ndmoClassificationOptions } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Download, Upload, DatabaseZap, AlertCircle, CheckCircle2, Sparkles, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";


type ApiActionResult<T = any> = { success: boolean; message?: string; error?: string; data?: T; results?: any };
type ApiConnectionResult = { success: boolean; message: string; error?: string; };


export default function DataClassificationPage() {
  const [columns, setColumns] = useState<ColumnData[]>([]);
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [postgresUrl, setPostgresUrl] = useState("");
  const [dbConnectionStatus, setDbConnectionStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [dbConnectionMessage, setDbConnectionMessage] = useState<string | null>(null);
  const [isDbPopoverOpen, setIsDbPopoverOpen] = useState(false);
  const [isFilePopoverOpen, setIsFilePopoverOpen] = useState(false);
  
  const [isClassifying, setIsClassifying] = useState(false);
  const [classificationProgress, setClassificationProgress] = useState(0);
  const [manualColumnName, setManualColumnName] = useState("");


  useEffect(() => {
    setIsClient(true);
    const storedDbUrl = localStorage.getItem("postgresUrl");
    if (storedDbUrl) {
      setPostgresUrl(storedDbUrl);
      handleTestConnection(storedDbUrl);
    } else if (process.env.NEXT_PUBLIC_DATABASE_URL) {
      setPostgresUrl(process.env.NEXT_PUBLIC_DATABASE_URL);
    }
  }, []);

  const handleUpdateColumn = async (id: string, updatedData: Partial<Omit<ColumnData, 'id'>>) => {
    const columnToUpdate = columns.find(col => col.id === id);
    if (!columnToUpdate) return;

    const newFullData: ColumnData = { ...columnToUpdate, ...updatedData };

    if (dbConnectionStatus === "connected" && postgresUrl) {
      try {
        const response = await fetch('/api/db/update-column', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dbUrl: postgresUrl, column: newFullData }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `Failed to update column in database. Status: ${response.status}.`;
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.message || errorJson.error || errorMessage;
            } catch (e) {
                if (errorText.toLowerCase().includes("<!doctype html>")) {
                   errorMessage = `API request failed (Status ${response.status}) and returned HTML. Check server logs.`;
                } else {
                   errorMessage = `Failed to update column. Server returned: ${errorText.substring(0,100)}`;
                }
            }
            toast({ title: "Database Error", description: errorMessage, variant: "destructive" });
            return;
        }
        
        const result: ApiActionResult<ColumnData> = await response.json();
        
        if (result.success && result.data) {
            setColumns((prevColumns) =>
            prevColumns.map((col) => (col.id === id ? result.data! : col)).sort((a,b) => a.columnName.localeCompare(b.columnName))
            );
            toast({
            title: "Column Updated",
            description: `"${newFullData.columnName}" has been updated in the database.`,
            });
        } else {
            toast({
            title: "Database Error",
            description: result.message || "Failed to update column in database.",
            variant: "destructive",
            });
        }
      } catch (error) {
         toast({
            title: "Network Error",
            description: "Could not connect to the server to update the column.",
            variant: "destructive",
        });
      }
    } else {
       setColumns((prevColumns) =>
        prevColumns.map((col) => (col.id === id ? { ...col, ...updatedData } : col)).sort((a,b) => a.columnName.localeCompare(b.columnName))
      );
      toast({
        title: "Column Updated (Locally)",
        description: `"${newFullData.columnName}" has been updated locally. Changes will not persist without a database connection.`,
      });
    }
  };

  const classifyAndAddColumns = async (columnNames: string[]) => {
      if (columnNames.length === 0 || (columnNames.length === 1 && !columnNames[0])) {
        toast({ title: "No Input", description: "Please provide at least one column name.", variant: "destructive" });
        return;
      }
      
      setIsClassifying(true);
      setClassificationProgress(0);
      setIsFilePopoverOpen(false);

      const classifiedColumns: ColumnData[] = [];
      let successfulClassifications = 0;

      for (let i = 0; i < columnNames.length; i++) {
        const name = columnNames[i];
        try {
          const response = await fetch('/api/ai/classify-column', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ columnName: name }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to classify "${name}". Server responded with: ${errorText}`);
          }
          
          const result: ApiActionResult<{classification: Omit<ColumnData, 'id' | 'columnName'>}> = await response.json();
          
          if (result.success && result.data) {
            classifiedColumns.push({
              id: crypto.randomUUID(),
              columnName: name,
              ...result.data.classification,
            });
            successfulClassifications++;
          } else {
             throw new Error(result.message || `The AI failed to classify "${name}".`);
          }

        } catch (error) {
           const err = error as Error;
           console.error(err);
           toast({
            title: "Classification Error",
            description: err.message,
            variant: "destructive"
           });
        } finally {
            setClassificationProgress(((i + 1) / columnNames.length) * 100);
        }
      }
      
      toast({
        title: "Classification Complete",
        description: `Successfully classified ${successfulClassifications} out of ${columnNames.length} columns.`
      });


      if (dbConnectionStatus === "connected" && postgresUrl) {
          try {
              toast({ title: "Syncing to DB...", description: "Saving classified columns to the database." });
              const response = await fetch('/api/db/columns-batch', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ dbUrl: postgresUrl, columns: classifiedColumns }),
              });

              if (!response.ok) {
                  const errorText = await response.text();
                  throw new Error(`DB sync failed. Server responded with: ${errorText}`);
              }
              const batchResult: ApiActionResult = await response.json();
              if (batchResult.success) {
                  toast({ title: "Sync Complete", description: "Successfully saved new columns to the database. Fetching latest data..." });
                  await fetchAndSetColumns(postgresUrl);
              } else {
                  throw new Error(batchResult.message || "An unknown error occurred during database sync.");
              }

          } catch (error) {
              const err = error as Error;
              toast({ title: "Database Sync Error", description: err.message, variant: "destructive" });
              // Still add columns locally if DB sync fails
              setColumns(prev => [...prev, ...classifiedColumns].sort((a, b) => a.columnName.localeCompare(b.columnName)));
          }
      } else {
        setColumns(prev => [...prev, ...classifiedColumns].sort((a, b) => a.columnName.localeCompare(b.columnName)));
      }

      setIsClassifying(false);
      setClassificationProgress(0);
      setManualColumnName(""); // Clear manual input
  }


  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isClient) return;
    const file = event.target.files?.[0];
    if (!file) {
      toast({ title: "No file selected", variant: "destructive" });
      return;
    }

    if (!file.type.startsWith("text/")) {
      toast({ title: "Invalid File Type", description: "Please upload a text file (.txt, .csv, etc.).", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) {
        toast({ title: "File is empty", variant: "destructive" });
        return;
      }
      
      const columnNames = text.split('\\n').map(name => name.trim()).filter(name => name.length > 0);
      await classifyAndAddColumns(columnNames);
    };

    reader.onerror = () => {
       toast({ title: "File Read Error", description: "Could not read the selected file.", variant: "destructive" });
    };

    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleManualClassify = async () => {
    await classifyAndAddColumns([manualColumnName]);
  }


  const convertToCSV = (data: ColumnData[]) => {
    const header = ['id', 'column_name', 'description', 'ndmo_classification', 'pii', 'phi', 'pfi', 'psi', 'pci'];
    const rows = data.map(row => [
      `"${row.id}"`,
      `"${(row.columnName || "").replace(/"/g, '""')}"`,
      `"${(row.description || "").replace(/"/g, '""')}"`,
      row.ndmoClassification || 'Public', 
      row.pii ? 'Yes' : 'No',
      row.phi ? 'Yes' : 'No',
      row.pfi ? 'Yes' : 'No',
      row.psi ? 'Yes' : 'No',
      row.pci ? 'Yes' : 'No',
    ]);
    return [header.join(','), ...rows.map(row => row.join(','))].join('\\r\\n');
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

  const fetchAndSetColumns = async (url: string) => {
    const fetchResponse = await fetch(`/api/db/columns?dbUrl=${encodeURIComponent(url)}`);
        
    if(!fetchResponse.ok){
        const errorText = await fetchResponse.text();
        toast({ title: "Data Load Error", description: `Server error fetching data: ${errorText.substring(0,100)}`, variant: "destructive" });
        setColumns([]);
    } else {
        const fetchRes: ApiActionResult<ColumnData[]> = await fetchResponse.json();
        if (fetchRes.success && fetchRes.data) {
          setColumns(fetchRes.data.sort((a,b) => a.columnName.localeCompare(b.columnName)));
          toast({ title: "Data Loaded", description: `${fetchRes.data.length} columns loaded from the database.`});
        } else {
          setColumns([]); 
          toast({ title: "Data Load Error", description: fetchRes.message || "Could not load data from database.", variant: "destructive" });
        }
    }
  }

  const handleTestConnection = async (urlToTest?: string) => {
    const currentUrl = urlToTest || postgresUrl;
    if (!currentUrl) {
      setDbConnectionStatus("error");
      setDbConnectionMessage("PostgreSQL URL cannot be empty.");
      toast({ title: "Connection Error", description: "PostgreSQL URL cannot be empty.", variant: "destructive" });
      return;
    }
    setDbConnectionStatus("connecting");
    setDbConnectionMessage("Attempting to connect...");
    try {
      const response = await fetch('/api/db/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dbUrl: currentUrl }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `API request failed with status ${response.status}.`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || errorMessage;
        } catch (e) {
           if (errorText.toLowerCase().includes("<!doctype html>")) {
             errorMessage = `Connection Error (Status ${response.status}). Server returned an HTML error page instead of JSON. Please check server logs and database URL format.`;
           } else {
             errorMessage = `Connection Error (Status ${response.status}): ${errorText.substring(0, 200)}`;
           }
        }
        setDbConnectionStatus("error");
        setDbConnectionMessage(errorMessage);
        toast({ title: "Connection Failed", description: errorMessage, variant: "destructive" });
        return;
      }
      
      const result: ApiConnectionResult = await response.json();

      if (result.success) {
        setDbConnectionStatus("connected");
        setDbConnectionMessage(result.message);
        toast({ title: "Connection Successful", description: result.message });
        localStorage.setItem("postgresUrl", currentUrl);

        if (columns.length > 0) {
          toast({ title: "Syncing Local Data", description: "Attempting to save local changes to the database..." });
          const syncResponse = await fetch('/api/db/columns-batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dbUrl: currentUrl, columns }),
          });
          
          if (!syncResponse.ok) {
            const errorText = await syncResponse.text();
            toast({ title: "Local Data Sync Failed", description: `Server error during sync: ${errorText.substring(0,100)}`, variant: "destructive"});
          } else {
            const localSyncResult: ApiActionResult = await syncResponse.json();
            if (localSyncResult.success) {
              const trulyInsertedCount = localSyncResult.results?.filter((r: { success: boolean, error?:string}) => r.success && !r.error?.includes('Duplicate')).length || 0;
              const skippedAsDuplicateCount = localSyncResult.results?.filter((r: { success: boolean, error?:string}) => r.success && r.error?.includes('Duplicate')).length || 0;
              
              let messageParts = [];
              if (trulyInsertedCount > 0) messageParts.push(`${trulyInsertedCount} new local entr${trulyInsertedCount === 1 ? 'y was' : 'ies were'} saved to DB`);
              if (skippedAsDuplicateCount > 0) messageParts.push(`${skippedAsDuplicateCount} local entr${skippedAsDuplicateCount === 1 ? 'y' : 'ies'} already existed in DB (skipped)`);
              
              let finalMessage = messageParts.join('. ');
              if (finalMessage === "") finalMessage = "No new local data to sync or all local data already existed in DB.";

              toast({
                title: "Local Data Synced",
                description: finalMessage + ".",
              });
            } else {
              toast({
                title: "Local Data Sync Failed",
                description: localSyncResult.message || "Could not save local changes to the database. Data has been rolled back.",
                variant: "destructive",
              });
            }
          }
        }

        toast({ title: "Fetching Data", description: "Loading all data from the database..." });
        await fetchAndSetColumns(currentUrl);
        setIsDbPopoverOpen(false); 
      } else {
        setDbConnectionStatus("error");
        setDbConnectionMessage(result.message || "Failed to connect to the database.");
        toast({ title: "Connection Failed", description: result.message || `Unknown error.`, variant: "destructive" });
      }
    } catch (error) {
      setDbConnectionStatus("error");
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred during connection.";
      setDbConnectionMessage(`Connection error: ${errorMessage}`);
      toast({ title: "Connection Error", description: errorMessage, variant: "destructive" });
    }
  };

  const handleDeleteColumn = async (id: string) => {
    const columnToDelete = columns.find(col => col.id === id);
    if (!columnToDelete) return;

    if (dbConnectionStatus === "connected" && postgresUrl) {
        try {
            const response = await fetch('/api/db/delete-column', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dbUrl: postgresUrl, id }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                toast({ title: "Database Error", description: `Failed to delete column. Server returned: ${errorText.substring(0, 100)}`, variant: "destructive" });
                return;
            }

            const result: ApiActionResult = await response.json();
            if (result.success) {
                setColumns(prevColumns => prevColumns.filter(col => col.id !== id));
                toast({ title: "Column Deleted", description: `"${columnToDelete.columnName}" has been deleted from the database.` });
            } else {
                toast({ title: "Database Error", description: result.message || "Failed to delete column from database.", variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Network Error", description: "Could not connect to the server to delete the column.", variant: "destructive" });
        }
    } else {
        setColumns(prevColumns => prevColumns.filter(col => col.id !== id));
        toast({ title: "Column Deleted (Locally)", description: `"${columnToDelete.columnName}" has been deleted locally.` });
    }
  };


  return (
    <main className="container mx-auto p-4 md:p-8 min-h-screen">
      <header className="mb-10">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-4xl font-headline font-bold text-accent flex-grow">
            ANB Data Classification Tool
          </h1>
          <div className="flex items-center space-x-2">
             <Popover open={isFilePopoverOpen} onOpenChange={setIsFilePopoverOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-md" disabled={isClassifying}>
                        <Sparkles className="h-5 w-5" />
                        <span className="sr-only">AI Classification</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 space-y-4 p-4 mr-2">
                    <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Upload className="h-5 w-5 text-primary" />
                          <h4 className="font-medium leading-none text-primary">Upload for Batch Classification</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Upload a .txt file with one column name per line.
                        </p>
                    </div>
                    <div>
                        <Label htmlFor="file-upload-input-popover" className="text-sm font-medium sr-only">Upload File</Label>
                        <Input
                          id="file-upload-input-popover"
                          type="file"
                          accept=".txt"
                          onChange={handleFileUpload}
                          ref={fileInputRef}
                          className="hidden"
                          disabled={isClassifying}
                        />
                         <Button
                          onClick={() => fileInputRef.current?.click()}
                          variant="outline"
                          className="w-full rounded-md"
                          disabled={isClassifying}
                        >
                          <Upload className="mr-2 h-4 w-4" /> Choose .txt File
                        </Button>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                       <div className="flex items-center space-x-2">
                          <Wand2 className="h-5 w-5 text-primary" />
                          <h4 className="font-medium leading-none text-primary">Classify Single Column</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">
                           Enter one column name and classify it instantly.
                        </p>
                    </div>
                    <div className="flex w-full max-w-sm items-center space-x-2">
                        <Input
                            type="text"
                            placeholder="e.g., customer_email"
                            value={manualColumnName}
                            onChange={(e) => setManualColumnName(e.target.value)}
                            disabled={isClassifying}
                            onKeyDown={(e) => e.key === 'Enter' && handleManualClassify()}
                        />
                        <Button type="button" onClick={handleManualClassify} disabled={isClassifying || !manualColumnName}>
                           Classify
                        </Button>
                    </div>

                </PopoverContent>
            </Popover>

            <Popover open={isDbPopoverOpen} onOpenChange={setIsDbPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-md">
                  <DatabaseZap className={`h-5 w-5 ${dbConnectionStatus === 'connected' ? 'text-green-500' : dbConnectionStatus === 'error' ? 'text-red-500' : '' }`} />
                  <span className="sr-only">Database Connection Settings</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 space-y-4 p-4 mr-2">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none text-primary">Database Connection</h4>
                  <p className="text-sm text-muted-foreground">
                    Connect to your PostgreSQL database.
                  </p>
                </div>
                <div>
                  <Label htmlFor="postgres-url-input" className="text-sm font-medium">PostgreSQL URL</Label>
                  <Input
                    id="postgres-url-input"
                    type="text"
                    placeholder="postgresql://user:pass@host:port/db"
                    value={postgresUrl}
                    onChange={(e) => {
                      setPostgresUrl(e.target.value);
                      if (dbConnectionStatus !== 'idle' && dbConnectionStatus !== 'connecting') {
                          setDbConnectionStatus("idle");
                          setDbConnectionMessage(null);
                      }
                    }}
                    className="rounded-md mt-1"
                  />
                </div>
                <Button
                  onClick={() => handleTestConnection()}
                  disabled={dbConnectionStatus === "connecting"}
                  className="w-full rounded-md"
                >
                  {dbConnectionStatus === "connecting" ? "Connecting..." : "Connect & Fetch"}
                </Button>
                {dbConnectionMessage && (
                  <div className={`mt-2 text-sm p-2 rounded-md flex items-center ${dbConnectionStatus === 'connected' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' : dbConnectionStatus === 'error' ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'}`}>
                    {dbConnectionStatus === 'connected' && <CheckCircle2 className="h-4 w-4 mr-2 shrink-0" />}
                    {dbConnectionStatus === 'error' && <AlertCircle className="h-4 w-4 mr-2 shrink-0" />}
                    <span className="text-xs">{dbConnectionMessage}</span>
                  </div>
                )}
              </PopoverContent>
            </Popover>
            <ThemeToggle />
          </div>
        </div>
        <p className="text-center text-muted-foreground mt-2">
          Use the AI tools to classify new columns or connect to a database to manage existing data.
        </p>
      </header>
      
      <div className="space-y-8">
        {isClassifying && (
            <div className="w-full space-y-2">
                <p className="text-sm text-center text-muted-foreground">AI classification in progress...</p>
                <Progress value={classificationProgress} className="w-full" />
            </div>
        )}
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
              onDeleteColumn={handleDeleteColumn}
              ndmoOptions={ndmoClassificationOptions} 
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
