
"use client";

import type * as React from 'react';
import { useState, useEffect, useRef } from "react";
import Papa from "papaparse";
// import { DataClassifyForm, type DataClassifyFormValues } from "@/components/data-classify-form";
import { DataClassifyTable } from "@/components/data-classify-table";
import type { ColumnData, NDMOClassification } from "@/lib/types";
import { ndmoClassificationOptions } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Download, Upload, DatabaseZap, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";

// type ApiActionResult<T = any> = { success: boolean; message?: string; error?: string; data?: T; results?: any };
// type ApiConnectionResult = { success: boolean; message: string; error?: string; };


export default function DataClassificationPage() {
  const [columns, setColumns] = useState<ColumnData[]>([]);
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // const [postgresUrl, setPostgresUrl] = useState("");
  // const [dbConnectionStatus, setDbConnectionStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  // const [dbConnectionMessage, setDbConnectionMessage] = useState<string | null>(null);
  // const [isDbPopoverOpen, setIsDbPopoverOpen] = useState(false);
  const [isFilePopoverOpen, setIsFilePopoverOpen] = useState(false);


  useEffect(() => {
    setIsClient(true);
    // const storedDbUrl = localStorage.getItem("postgresUrl");
    // if (storedDbUrl) {
    //   setPostgresUrl(storedDbUrl);
    // } else if (process.env.NEXT_PUBLIC_DATABASE_URL) {
    //   setPostgresUrl(process.env.NEXT_PUBLIC_DATABASE_URL);
    // }
  }, []);

  // const handleAddColumn = async (values: DataClassifyFormValues) => {
  //   const newColumnBase: Omit<ColumnData, 'id'> = {
  //     ...values,
  //     ndmoClassification: values.ndmoClassification as NDMOClassification,
  //   };
  //   const randomId = crypto.randomUUID();
  //   const newColumnWithPotentialId: ColumnData = { ...newColumnBase, id: randomId };

  //   // if (dbConnectionStatus === "connected" && postgresUrl) {
  //   //   try {
  //   //     const response = await fetch('/api/db/columns', {
  //   //       method: 'POST',
  //   //       headers: { 'Content-Type': 'application/json' },
  //   //       body: JSON.stringify({ dbUrl: postgresUrl, column: newColumnWithPotentialId }),
  //   //     });
        
  //   //     if (!response.ok) {
  //   //         const errorText = await response.text();
  //   //         let errorMessage = `Failed to save column to database. Status: ${response.status}.`;
  //   //         try {
  //   //             const errorJson = JSON.parse(errorText);
  //   //             errorMessage = errorJson.message || errorJson.error || errorMessage;
  //   //         } catch (e) {
  //   //              if (errorText.toLowerCase().includes("<!doctype html>")) {
  //   //                 errorMessage = `API request failed (Status ${response.status}) and returned HTML. Check server logs.`;
  //   //             } else {
  //   //                 errorMessage = `Failed to save column. Server returned: ${errorText.substring(0,100)}`;
  //   //             }
  //   //         }
  //   //         toast({ title: "Database Error", description: errorMessage, variant: "destructive" });
  //   //         return;
  //   //     }
        
  //   //     const result: ApiActionResult<ColumnData> = await response.json();

  //   //     if (result.success && result.data) {
  //   //       setColumns((prevColumns) => [result.data!, ...prevColumns].sort((a,b) => a.columnName.localeCompare(b.columnName)));
  //   //       toast({
  //   //         title: "Column Added",
  //   //         description: `"${values.columnName}" has been saved to the database.`,
  //   //       });
  //   //     } else {
  //   //       toast({
  //   //         title: "Database Error",
  //   //         description: result.message || `Failed to save column to database.`,
  //   //         variant: "destructive",
  //   //       });
  //   //     }
  //   //   } catch (error) {
  //   //     toast({
  //   //       title: "Network Error",
  //   //       description: "Could not connect to the server to save the column.",
  //   //       variant: "destructive",
  //   //     });
  //   //   }
  //   // } else {
  //     setColumns((prevColumns) => [newColumnWithPotentialId, ...prevColumns].sort((a,b) => a.columnName.localeCompare(b.columnName)));
  //     toast({
  //       title: "Column Added (Locally)",
  //       description: `"${values.columnName}" has been added locally.`, // Connect to a database to persist changes.
  //     });
  //   // }
  // };

  const handleUpdateColumn = async (id: string, updatedData: Partial<Omit<ColumnData, 'id'>>) => {
    const columnToUpdate = columns.find(col => col.id === id);
    if (!columnToUpdate) return;

    const newFullData: ColumnData = { ...columnToUpdate, ...updatedData };

    // if (dbConnectionStatus === "connected" && postgresUrl) {
    //   try {
    //     const response = await fetch('/api/db/update-column', {
    //         method: 'PUT',
    //         headers: { 'Content-Type': 'application/json' },
    //         body: JSON.stringify({ dbUrl: postgresUrl, column: newFullData }),
    //     });

    //     if (!response.ok) {
    //         const errorText = await response.text();
    //         let errorMessage = `Failed to update column in database. Status: ${response.status}.`;
    //         try {
    //             const errorJson = JSON.parse(errorText);
    //             errorMessage = errorJson.message || errorJson.error || errorMessage;
    //         } catch (e) {
    //             if (errorText.toLowerCase().includes("<!doctype html>")) {
    //                errorMessage = `API request failed (Status ${response.status}) and returned HTML. Check server logs.`;
    //             } else {
    //                errorMessage = `Failed to update column. Server returned: ${errorText.substring(0,100)}`;
    //             }
    //         }
    //         toast({ title: "Database Error", description: errorMessage, variant: "destructive" });
    //         return;
    //     }
        
    //     const result: ApiActionResult<ColumnData> = await response.json();
        
    //     if (result.success && result.data) {
    //         setColumns((prevColumns) =>
    //         prevColumns.map((col) => (col.id === id ? result.data! : col)).sort((a,b) => a.columnName.localeCompare(b.columnName))
    //         );
    //         toast({
    //         title: "Column Updated",
    //         description: `"${newFullData.columnName}" has been updated in the database.`,
    //         });
    //     } else {
    //         toast({
    //         title: "Database Error",
    //         description: result.message || "Failed to update column in database.",
    //         variant: "destructive",
    //         });
    //     }
    //   } catch (error) {
    //      toast({
    //         title: "Network Error",
    //         description: "Could not connect to the server to update the column.",
    //         variant: "destructive",
    //     });
    //   }
    // } else {
       setColumns((prevColumns) =>
        prevColumns.map((col) => (col.id === id ? { ...col, ...updatedData } : col)).sort((a,b) => a.columnName.localeCompare(b.columnName))
      );
      toast({
        title: "Column Updated (Locally)",
        description: `"${newFullData.columnName}" has been updated locally.`, // Changes will not persist without a database connection.
      });
    // }
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
      complete: async (results) => {
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

        const parsedColumns: ColumnData[] = results.data.map((row) => {
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

        if (parsedColumns.length === 0 && results.data.length > 0) {
             toast({ title: "No Valid Columns Found", description: "No columns with valid names found in CSV.", variant: "destructive" });
             return;
        }
        
        // if (dbConnectionStatus === "connected" && postgresUrl) {
        //     try {
        //         const response = await fetch('/api/db/columns-batch', {
        //             method: 'POST',
        //             headers: { 'Content-Type': 'application/json' },
        //             body: JSON.stringify({ dbUrl: postgresUrl, columns: parsedColumns }),
        //         });

        //         if (!response.ok) {
        //             const errorText = await response.text();
        //             let errorMessage = `Error during DB sync for CSV data. Status: ${response.status}.`;
        //              try {
        //                 const errorJson = JSON.parse(errorText);
        //                 errorMessage = errorJson.message || errorJson.error || errorMessage;
        //             } catch (e) {
        //                 if (errorText.toLowerCase().includes("<!doctype html>")) {
        //                    errorMessage = `API request failed (Status ${response.status}) and returned HTML. Check server logs.`;
        //                 } else {
        //                    errorMessage = `Error during DB sync. Server returned: ${errorText.substring(0,100)}`;
        //                 }
        //             }
        //             toast({ title: "CSV Processing Error", description: errorMessage, variant: "destructive" });
        //         } else {
        //             const batchResult: ApiActionResult = await response.json();
        //             let successCount = 0;
        //             let failCount = 0;
                
        //             batchResult.results?.forEach((res: { success: boolean; error?: string; }) => {
        //                 if (res.success && !res.error?.includes('Duplicate')) {
        //                     successCount++;
        //                 } else if (!res.success) {
        //                     failCount++;
        //                 }
        //             });
                    
        //             if (batchResult.success) {
        //                 toast({ title: "CSV Processed & Synced", description: `${successCount} new column${successCount === 1 ? '' : 's'} from CSV saved to DB. ${failCount > 0 ? `${failCount} failed.` : ''} ${batchResult.results?.filter((r: {error?:string}) => r.error?.includes('Duplicate')).length || 0} duplicates skipped.` });
        //             } else {
        //                 toast({ title: "CSV Processing Error", description: `Error during DB sync. ${successCount} columns processed, ${failCount} failed. ${batchResult.message}`, variant: "destructive" });
        //             }
        //         }

        //         toast({ title: "Refreshing Data", description: "Reloading all columns from the database..."});
        //         const fetchResponse = await fetch(`/api/db/columns?dbUrl=${encodeURIComponent(postgresUrl)}`);
        //         const fetchRes: ApiActionResult<ColumnData[]> = await fetchResponse.json();

        //         if (fetchResponse.ok && fetchRes.success && fetchRes.data) {
        //             setColumns(fetchRes.data.sort((a, b) => a.columnName.localeCompare(b.columnName)));
        //         } else {
        //             setColumns([]);
        //             toast({ title: "Refresh Error", description: fetchRes.message || "Could not reload data from database.", variant: "destructive" });
        //         }
        //     } catch (error) {
        //         toast({ title: "Network Error", description: "Could not connect to the server for CSV processing.", variant: "destructive" });
        //     }
        //     setIsFilePopoverOpen(false);

        // } else {
            setColumns((prevColumns) => [...prevColumns, ...parsedColumns].sort((a, b) => a.columnName.localeCompare(b.columnName)));
            toast({ title: "CSV Uploaded (Locally)", description: `${parsedColumns.length} columns added locally from the CSV file.` });
            setIsFilePopoverOpen(false);
        // }
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
    const header = ['id', 'column_name', 'description', 'ndmo_classification', 'pii', 'phi', 'pfi', 'psi'];
    const rows = data.map(row => [
      `"${row.id}"`,
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

  // const handleTestConnection = async (urlToTest?: string) => {
  //   const currentUrl = urlToTest || postgresUrl;
  //   if (!currentUrl) {
  //     setDbConnectionStatus("error");
  //     setDbConnectionMessage("PostgreSQL URL cannot be empty.");
  //     toast({ title: "Connection Error", description: "PostgreSQL URL cannot be empty.", variant: "destructive" });
  //     return;
  //   }
  //   setDbConnectionStatus("connecting");
  //   setDbConnectionMessage("Attempting to connect...");
  //   try {
  //     const response = await fetch('/api/db/test-connection', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ dbUrl: currentUrl }),
  //     });

  //     if (!response.ok) {
  //       const errorText = await response.text();
  //       let errorMessage = `API request failed with status ${response.status}.`;
  //       try {
  //         const errorJson = JSON.parse(errorText);
  //         errorMessage = errorJson.message || errorJson.error || errorMessage;
  //       } catch (e) {
  //          if (errorText.toLowerCase().includes("<!doctype html>")) {
  //            errorMessage = `Connection Error (Status ${response.status}). Server returned an HTML error page instead of JSON. Please check server logs and database URL format.`;
  //          } else {
  //            errorMessage = `Connection Error (Status ${response.status}): ${errorText.substring(0, 200)}`;
  //          }
  //       }
  //       setDbConnectionStatus("error");
  //       setDbConnectionMessage(errorMessage);
  //       toast({ title: "Connection Failed", description: errorMessage, variant: "destructive" });
  //       return;
  //     }
      
  //     const result: ApiConnectionResult = await response.json();

  //     if (result.success) {
  //       setDbConnectionStatus("connected");
  //       setDbConnectionMessage(result.message);
  //       toast({ title: "Connection Successful", description: result.message });
  //       localStorage.setItem("postgresUrl", currentUrl);

  //       if (columns.length > 0) {
  //         toast({ title: "Syncing Local Data", description: "Attempting to save local changes to the database..." });
  //         const syncResponse = await fetch('/api/db/columns-batch', {
  //           method: 'POST',
  //           headers: { 'Content-Type': 'application/json' },
  //           body: JSON.stringify({ dbUrl: currentUrl, columns }),
  //         });
          
  //         if (!syncResponse.ok) {
  //           const errorText = await syncResponse.text();
  //           toast({ title: "Local Data Sync Failed", description: `Server error during sync: ${errorText.substring(0,100)}`, variant: "destructive"});
  //         } else {
  //           const localSyncResult: ApiActionResult = await syncResponse.json();
  //           if (localSyncResult.success) {
  //             const trulyInsertedCount = localSyncResult.results?.filter((r: { success: boolean, error?:string}) => r.success && !r.error?.includes('Duplicate')).length || 0;
  //             const skippedAsDuplicateCount = localSyncResult.results?.filter((r: { success: boolean, error?:string}) => r.success && r.error?.includes('Duplicate')).length || 0;
              
  //             let messageParts = [];
  //             if (trulyInsertedCount > 0) messageParts.push(`${trulyInsertedCount} new local entr${trulyInsertedCount === 1 ? 'y was' : 'ies were'} saved to DB`);
  //             if (skippedAsDuplicateCount > 0) messageParts.push(`${skippedAsDuplicateCount} local entr${skippedAsDuplicateCount === 1 ? 'y' : 'ies'} already existed in DB (skipped)`);
              
  //             let finalMessage = messageParts.join('. ');
  //             if (finalMessage === "") finalMessage = "No new local data to sync or all local data already existed in DB.";

  //             toast({
  //               title: "Local Data Synced",
  //               description: finalMessage + ".",
  //             });
  //           } else {
  //             toast({
  //               title: "Local Data Sync Failed",
  //               description: localSyncResult.message || "Could not save local changes to the database. Data has been rolled back.",
  //               variant: "destructive",
  //             });
  //           }
  //         }
  //       }

  //       toast({ title: "Fetching Data", description: "Loading all data from the database..." });
  //       const fetchResponse = await fetch(`/api/db/columns?dbUrl=${encodeURIComponent(currentUrl)}`);
        
  //       if(!fetchResponse.ok){
  //           const errorText = await fetchResponse.text();
  //           toast({ title: "Data Load Error", description: `Server error fetching data: ${errorText.substring(0,100)}`, variant: "destructive" });
  //           setColumns([]);
  //       } else {
  //           const fetchRes: ApiActionResult<ColumnData[]> = await fetchResponse.json();
  //           if (fetchRes.success && fetchRes.data) {
  //           setColumns(fetchRes.data.sort((a,b) => a.columnName.localeCompare(b.columnName)));
  //           toast({ title: "Data Loaded", description: `${fetchRes.data.length} columns loaded from the database.`});
  //           } else {
  //           setColumns([]); 
  //           toast({ title: "Data Load Error", description: fetchRes.message || "Could not load data from database.", variant: "destructive" });
  //           }
  //       }
  //       setIsDbPopoverOpen(false); 
  //     } else {
  //       setDbConnectionStatus("error");
  //       setDbConnectionMessage(result.message || "Failed to connect to the database.");
  //       toast({ title: "Connection Failed", description: result.message || `Unknown error.`, variant: "destructive" });
  //     }
  //   } catch (error) {
  //     setDbConnectionStatus("error");
  //     const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred during connection.";
  //     setDbConnectionMessage(`Connection error: ${errorMessage}`);
  //     toast({ title: "Connection Error", description: errorMessage, variant: "destructive" });
  //   }
  // };


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
                    <Button variant="outline" size="icon" className="rounded-md">
                        <Upload className="h-5 w-5" />
                        <span className="sr-only">Upload CSV File</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 space-y-4 p-4 mr-2">
                    <div className="space-y-2">
                        <h4 className="font-medium leading-none text-primary">Upload CSV</h4>
                        <p className="text-sm text-muted-foreground">
                            Import column data from a CSV file.
                        </p>
                    </div>
                    <div>
                        <Label htmlFor="csv-upload-input-popover" className="text-sm font-medium sr-only">Upload CSV File</Label>
                        <Input
                          id="csv-upload-input-popover"
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
                         <p className="text-xs text-muted-foreground mt-1">
                          CSV must contain 'column_name' or 'Column Name'. Optional: Description, NDMO Classification, PII, PHI, PFI, PSI.
                        </p>
                      </div>
                </PopoverContent>
            </Popover>

            {/* <Popover open={isDbPopoverOpen} onOpenChange={setIsDbPopoverOpen}>
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
            </Popover> */}
            <ThemeToggle />
          </div>
        </div>
        <p className="text-center text-muted-foreground mt-2">
          Manually input, upload, and classify your core banking data columns.
        </p>
      </header>
      
      <div className="space-y-8">
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
    </main>
  );
}
