"use client";

import type * as React from "react";
import { useState, useEffect, useRef, useMemo } from "react";
import Papa from "papaparse";
import { DataClassifyTable } from "@/components/data-classify-table";
import type { ColumnData, DatabaseType } from "@/lib/types";
import { ndmoClassificationOptions } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Download,
  Upload,
  DatabaseZap,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Wand2,
  Trash,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
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
import { Badge } from "@/components/ui/badge";

type ApiActionResult<T = any> = {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
  results?: any;
};
type ApiConnectionResult = {
  success: boolean;
  message: string;
  error?: string;
};

const detectDbType = (url: string): DatabaseType => {
  if (!url) return "unknown";
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.startsWith("postgres")) return "postgres";
  if (
    lowerUrl.startsWith("oracle:") ||
    (lowerUrl.includes("@") &&
      (lowerUrl.includes("sid") || lowerUrl.includes("service_name")))
  )
    return "oracle";
  if (lowerUrl.startsWith("jdbc:hive2")) return "hive";
  return "unknown";
};

export default function DataClassificationPage() {
  const [columns, setColumns] = useState<ColumnData[]>([]);
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  const [dbUrl, setDbUrl] = useState("");
  const [dbConnectionStatus, setDbConnectionStatus] = useState<
    "idle" | "connecting" | "connected" | "error"
  >("idle");
  const [dbConnectionMessage, setDbConnectionMessage] = useState<string | null>(
    null
  );
  const [isDbPopoverOpen, setIsDbPopoverOpen] = useState(false);
  const [isFilePopoverOpen, setIsFilePopoverOpen] = useState(false);
  const [isCsvUploadPopoverOpen, setIsCsvUploadPopoverOpen] = useState(false);

  const [isClassifying, setIsClassifying] = useState(false);
  const [classificationProgress, setClassificationProgress] = useState(0);
  const [manualColumnName, setManualColumnName] = useState("");

  const detectedDbType = useMemo(() => detectDbType(dbUrl), [dbUrl]);

  const duplicateColumnNames = useMemo(() => {
    const nameCounts = columns.reduce((acc, col) => {
      acc[col.columnName] = (acc[col.columnName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return new Set(
      Object.entries(nameCounts)
        .filter(([, count]) => count > 1)
        .map(([name]) => name)
    );
  }, [columns]);

  useEffect(() => {
    setIsClient(true);
    const storedDbUrl = localStorage.getItem("dbUrl");
    if (storedDbUrl) {
      setDbUrl(storedDbUrl);
      const dbType = detectDbType(storedDbUrl);
      handleTestConnection(storedDbUrl, dbType);
    } else if (process.env.NEXT_PUBLIC_DATABASE_URL) {
      setDbUrl(process.env.NEXT_PUBLIC_DATABASE_URL);
    }
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isClient) return;
    const file = event.target.files?.[0];
    if (!file) {
      toast({ title: "No file selected", variant: "destructive" });
      return;
    }

    if (file.type !== "text/plain") {
      toast({
        title: "Invalid File Type",
        description: "Please upload a .txt file.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) {
        toast({ title: "File is empty", variant: "destructive" });
        return;
      }

      const columnNames = text
        .split("\n")
        .map((name) => name.trim())
        .filter((name) => name.length > 0);

      if (columnNames.length === 0) {
        toast({
          title: "No column names found",
          description: "The .txt file seems to be empty.",
          variant: "destructive",
        });
        return;
      }

      await classifyAndAddColumns(columnNames);
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleManualClassify = () => {
    const columnName = manualColumnName.trim();
    if (columnName) {
      classifyAndAddColumns([columnName]);
    }
  };

  const handleUpdateColumn = async (
    id: string,
    updatedData: Partial<Omit<ColumnData, "id">>
  ) => {
    const columnToUpdate = columns.find((col) => col.id === id);
    if (!columnToUpdate) return;

    const newFullData: ColumnData = { ...columnToUpdate, ...updatedData };

    if (dbConnectionStatus === "connected" && dbUrl) {
      try {
        const response = await fetch("/api/db/update-column", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dbUrl: dbUrl, column: newFullData }),
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
              errorMessage = `Failed to update column. Server returned: ${errorText.substring(
                0,
                100
              )}`;
            }
          }
          toast({
            title: "Database Error",
            description: errorMessage,
            variant: "destructive",
          });
          return;
        }

        const result: ApiActionResult<ColumnData> = await response.json();

        if (result.success && result.data) {
          setColumns((prevColumns) =>
            prevColumns
              .map((col) => (col.id === id ? result.data! : col))
              .sort((a, b) => a.columnName.localeCompare(b.columnName))
          );
          toast({
            title: "Column Updated",
            description: `"${newFullData.columnName}" has been updated in the database.`,
          });
        } else {
          toast({
            title: "Database Error",
            description:
              result.message || "Failed to update column in database.",
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
        prevColumns
          .map((col) => (col.id === id ? { ...col, ...updatedData } : col))
          .sort((a, b) => a.columnName.localeCompare(b.columnName))
      );
      toast({
        title: "Column Updated (Locally)",
        description: `"${newFullData.columnName}" has been updated locally. Changes will not persist without a database connection.`,
      });
    }
  };

  const classifyAndAddColumns = async (columnNames: string[]) => {
    if (
      columnNames.length === 0 ||
      (columnNames.length === 1 && !columnNames[0])
    ) {
      toast({
        title: "No Input",
        description: "Please provide at least one column name.",
        variant: "destructive",
      });
      return;
    }

    setIsClassifying(true);
    setClassificationProgress(0);
    setIsFilePopoverOpen(false);

    const promises = columnNames.map((name) => {
      let progressTimeout: NodeJS.Timeout;

      const promise = fetch("/api/ai/classify-column", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnName: name }),
      })
        .then(async (response) => {
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
              `Failed to classify "${name}". Server responded with: ${errorText}`
            );
          }
          const result: ApiActionResult<{
            classification: Omit<ColumnData, "id" | "columnName">;
          }> = await response.json();
          if (result.success && result.data) {
            return {
              id: crypto.randomUUID(),
              columnName: name,
              ...result.data.classification,
            };
          } else {
            throw new Error(
              result.message || `The AI failed to classify "${name}".`
            );
          }
        })
        .catch((error) => {
          const err = error as Error;
          console.error(err);
          toast({
            title: "Classification Error",
            description: err.message,
            variant: "destructive",
          });
          return null;
        })
        .finally(() => {
          setClassificationProgress(
            (prev) => prev + (1 / columnNames.length) * 100
          );
          clearTimeout(progressTimeout);
        });

      return promise;
    });

    const results = await Promise.all(promises);
    const classifiedColumns = results.filter(
      (col): col is ColumnData => col !== null
    );
    const successfulClassifications = classifiedColumns.length;

    toast({
      title: "Classification Complete",
      description: `Successfully classified ${successfulClassifications} out of ${columnNames.length} columns.`,
    });

    if (
      classifiedColumns.length > 0 &&
      dbConnectionStatus === "connected" &&
      dbUrl
    ) {
      try {
        toast({
          title: "Syncing to DB...",
          description: "Saving classified columns to the database.",
        });
        const response = await fetch("/api/db/columns-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dbUrl: dbUrl, columns: classifiedColumns }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `DB sync failed. Server responded with: ${errorText}`
          );
        }
        const batchResult: ApiActionResult = await response.json();
        if (batchResult.success) {
          toast({
            title: "Sync Complete",
            description:
              "Successfully saved new columns to the database. Fetching latest data...",
          });
          await fetchAndSetColumns(dbUrl);
        } else {
          throw new Error(
            batchResult.message ||
              "An unknown error occurred during database sync."
          );
        }
      } catch (error) {
        const err = error as Error;
        toast({
          title: "Database Sync Error",
          description: err.message,
          variant: "destructive",
        });
        setColumns((prev) =>
          [...prev, ...classifiedColumns].sort((a, b) =>
            a.columnName.localeCompare(b.columnName)
          )
        );
      }
    } else if (classifiedColumns.length > 0) {
      setColumns((prev) =>
        [...prev, ...classifiedColumns].sort((a, b) =>
          a.columnName.localeCompare(b.columnName)
        )
      );
    }

    setIsClassifying(false);
    setClassificationProgress(0);
    setManualColumnName("");
  };

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isClient) return;
    const file = event.target.files?.[0];
    if (!file) {
      toast({ title: "No file selected", variant: "destructive" });
      return;
    }

    if (file.type !== "text/csv") {
      toast({
        title: "Invalid File Type",
        description: "Please upload a CSV file.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) {
        toast({ title: "File is empty", variant: "destructive" });
        return;
      }

      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const toBoolean = (value: any) => {
            const str = String(value).trim().toLowerCase();
            return ["true", "yes", "1"].includes(str);
          };

          const parsedColumns = (results.data as any[])
            .map((row) => {
              const columnName =
                row["Column Name"] || row.column_name || row.columnName;
              if (!columnName) return null;

              return {
                id: row.ID || row.id || crypto.randomUUID(),
                columnName: columnName.trim(),
                description: row.Description || row.description || "",
                ndmoClassification:
                  row["NDMO Classification"] ||
                  row.ndmo_classification ||
                  "Public",
                reason_ndmo: row.reason_ndmo,
                pii: toBoolean(row.PII || row.pii),
                phi: toBoolean(row.PHI || row.phi),
                pfi: toBoolean(row.PFI || row.pfi),
                psi: toBoolean(row.PSI || row.psi),
                pci: toBoolean(row.PCI || row.pci),
              } as ColumnData;
            })
            .filter((col): col is ColumnData => col !== null);

          if (parsedColumns.length === 0) {
            toast({
              title: "No Data Found",
              description:
                "The CSV file seems to be empty or missing 'column_name' or 'Column Name' headers.",
              variant: "destructive",
            });
            return;
          }

          setIsCsvUploadPopoverOpen(false);
          toast({
            title: "CSV Parsed",
            description: `Found ${parsedColumns.length} columns. Syncing...`,
          });

          if (dbConnectionStatus === "connected" && dbUrl) {
            try {
              const response = await fetch("/api/db/columns-batch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ dbUrl: dbUrl, columns: parsedColumns }),
              });

              if (!response.ok)
                throw new Error(`Server responded with ${response.status}`);

              const batchResult: ApiActionResult = await response.json();
              if (batchResult.success) {
                toast({
                  title: "Sync Complete",
                  description:
                    "Data from CSV has been synced to the database. Fetching latest...",
                });
                await fetchAndSetColumns(dbUrl);
              } else {
                throw new Error(
                  batchResult.message ||
                    "An unknown error occurred during database sync."
                );
              }
            } catch (error) {
              const err = error as Error;
              toast({
                title: "Database Sync Error",
                description: err.message,
                variant: "destructive",
              });
            }
          } else {
            // Handle local update by appending new columns, allowing duplicates
            setColumns((prev) => {
              const newColumns = [...prev, ...parsedColumns];
              return newColumns.sort((a, b) =>
                a.columnName.localeCompare(b.columnName)
              );
            });
            toast({
              title: "Data Loaded Locally",
              description:
                "CSV data has been loaded. Connect to a database to persist changes.",
            });
          }
        },
        error: (error: any) => {
          toast({
            title: "CSV Parse Error",
            description: error.message,
            variant: "destructive",
          });
        },
      });
    };
    reader.readAsText(file);

    if (csvFileInputRef.current) {
      csvFileInputRef.current.value = "";
    }
  };

  const convertToCSV = (data: ColumnData[]) => {
    const csvData = data.map((row) => ({
      ID: row.id,
      "Column Name": row.columnName,
      Description: row.description,
      "NDMO Classification": row.ndmoClassification || "Public",
      reason_ndmo: row.reason_ndmo,
      PII: row.pii,
      PHI: row.phi,
      PFI: row.pfi,
      PSI: row.psi,
      PCI: row.pci,
    }));
    return Papa.unparse(csvData);
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
    const csvString = convertToCSV(columns);
    console.log("COLUMEN: CSV:",columns.toString())
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "data_classification.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({
      title: "CSV Downloaded",
      description: "The data has been exported as data_classification.csv.",
    });
  };

  const fetchAndSetColumns = async (url: string) => {
    const fetchResponse = await fetch(
      `/api/db/columns?dbUrl=${encodeURIComponent(url)}`
    );

    if (!fetchResponse.ok) {
      const errorText = await fetchResponse.text();
      toast({
        title: "Data Load Error",
        description: `Server error fetching data: ${errorText.substring(
          0,
          100
        )}`,
        variant: "destructive",
      });
      setColumns([]);
    } else {
      const fetchRes: ApiActionResult<ColumnData[]> =
        await fetchResponse.json();
      if (fetchRes.success && fetchRes.data) {
        setColumns(
          fetchRes.data.sort((a, b) => a.columnName.localeCompare(b.columnName))
        );
        toast({
          title: "Data Loaded",
          description: `${fetchRes.data.length} columns loaded from the database.`,
        });
      } else {
        setColumns([]);
        toast({
          title: "Data Load Error",
          description: fetchRes.message || "Could not load data from database.",
          variant: "destructive",
        });
      }
    }
  };

  const handleTestConnection = async (
    urlToTest?: string,
    dbTypeToTest?: DatabaseType
  ) => {
    const currentUrl = urlToTest || dbUrl;
    const currentDbType = dbTypeToTest || detectedDbType;

    if (!currentUrl) {
      setDbConnectionStatus("error");
      setDbConnectionMessage("Database URL cannot be empty.");
      toast({
        title: "Connection Error",
        description: "Database URL cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    setDbConnectionStatus("connecting");
    setDbConnectionMessage(`Attempting to connect to ${currentDbType}...`);
    try {
      const response = await fetch("/api/db/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dbUrl: currentUrl, dbType: currentDbType }),
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
            errorMessage = `Connection Error (Status ${
              response.status
            }): ${errorText.substring(0, 200)}`;
          }
        }
        setDbConnectionStatus("error");
        setDbConnectionMessage(errorMessage);
        toast({
          title: "Connection Failed",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      const result: ApiConnectionResult = await response.json();

      if (result.success) {
        setDbConnectionStatus("connected");
        setDbConnectionMessage(result.message);
        toast({ title: "Connection Successful", description: result.message });
        localStorage.setItem("dbUrl", currentUrl);

        if (currentDbType === "postgres" || currentDbType === "oracle") {
          if (columns.length > 0) {
            toast({
              title: "Syncing Local Data",
              description:
                "Attempting to save local changes to the database...",
            });
            const syncResponse = await fetch("/api/db/columns-batch", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ dbUrl: currentUrl, columns }),
            });

            if (!syncResponse.ok) {
              const errorText = await syncResponse.text();
              toast({
                title: "Local Data Sync Failed",
                description: `Server error during sync: ${errorText.substring(
                  0,
                  100
                )}`,
                variant: "destructive",
              });
            } else {
              const localSyncResult: ApiActionResult =
                await syncResponse.json();
              if (localSyncResult.success) {
                toast({
                  title: "Local Data Synced",
                  description: "Local data synced with the database.",
                });
              } else {
                toast({
                  title: "Local Data Sync Failed",
                  description:
                    localSyncResult.message ||
                    "Could not save local changes to the database. Data has been rolled back.",
                  variant: "destructive",
                });
              }
            }
          }

          toast({
            title: "Fetching Data",
            description: "Loading all data from the database...",
          });
          await fetchAndSetColumns(currentUrl);
        } else {
          // For non-postgres/oracle dbs, we don't fetch/sync columns yet. Clear the table.
          setColumns([]);
        }
        setIsDbPopoverOpen(false);
      } else {
        setDbConnectionStatus("error");
        setDbConnectionMessage(
          result.message || "Failed to connect to the database."
        );
        toast({
          title: "Connection Failed",
          description: result.message || `Unknown error.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      setDbConnectionStatus("error");
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred during connection.";
      setDbConnectionMessage(`Connection error: ${errorMessage}`);
      toast({
        title: "Connection Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleDeleteColumn = async (id: string) => {
    const columnToDelete = columns.find((col) => col.id === id);
    if (!columnToDelete) return;

    if (dbConnectionStatus === "connected" && dbUrl) {
      try {
        const response = await fetch("/api/db/delete-column", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dbUrl: dbUrl, id }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          toast({
            title: "Database Error",
            description: `Failed to delete column. Server returned: ${errorText.substring(
              0,
              100
            )}`,
            variant: "destructive",
          });
          return;
        }

        const result: ApiActionResult = await response.json();
        if (result.success) {
          setColumns((prevColumns) =>
            prevColumns.filter((col) => col.id !== id)
          );
          toast({
            title: "Column Deleted",
            description: `"${columnToDelete.columnName}" has been deleted from the database.`,
          });
        } else {
          toast({
            title: "Database Error",
            description:
              result.message || "Failed to delete column from database.",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Network Error",
          description: "Could not connect to the server to delete the column.",
          variant: "destructive",
        });
      }
    } else {
      setColumns((prevColumns) => prevColumns.filter((col) => col.id !== id));
      toast({
        title: "Column Deleted (Locally)",
        description: `"${columnToDelete.columnName}" has been deleted locally.`,
      });
    }
  };

  const handleDeleteAll = async () => {
    if (dbConnectionStatus === "connected" && dbUrl) {
      try {
        const response = await fetch("/api/db/delete-all-columns", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dbUrl: dbUrl }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          toast({
            title: "Database Error",
            description: `Failed to delete all data. Server returned: ${errorText.substring(
              0,
              100
            )}`,
            variant: "destructive",
          });
          return;
        }

        const result: ApiActionResult = await response.json();
        if (result.success) {
          setColumns([]);
          toast({
            title: "All Data Deleted",
            description: "All columns have been deleted from the database.",
          });
        } else {
          toast({
            title: "Database Error",
            description:
              result.message || "Failed to delete all data from the database.",
            variant: "destructive",
          });
        }
      } catch (error) {
        const err = error as Error;
        toast({
          title: "Network Error",
          description: `Could not connect to the server to delete data: ${err.message}`,
          variant: "destructive",
        });
      }
    } else {
      setColumns([]);
      toast({
        title: "All Data Deleted (Locally)",
        description: "All columns have been deleted locally.",
      });
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
            <Popover
              open={isFilePopoverOpen}
              onOpenChange={setIsFilePopoverOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-md"
                  disabled={isClassifying}
                >
                  <Sparkles className="h-5 w-5" />
                  <span className="sr-only">AI Classification</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 space-y-4 p-4 mr-2">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Upload className="h-5 w-5 text-primary" />
                    <h4 className="font-medium leading-none text-primary">
                      Upload for Batch Classification
                    </h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Upload a .txt file with one column name per line.
                  </p>
                </div>
                <div>
                  <Label
                    htmlFor="file-upload-input-popover"
                    className="text-sm font-medium sr-only"
                  >
                    Upload File
                  </Label>
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
                    <h4 className="font-medium leading-none text-primary">
                      Classify Single Column
                    </h4>
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
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleManualClassify()
                    }
                  />
                  <Button
                    type="button"
                    onClick={handleManualClassify}
                    disabled={isClassifying || !manualColumnName}
                  >
                    Classify
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <Popover
              open={isCsvUploadPopoverOpen}
              onOpenChange={setIsCsvUploadPopoverOpen}
            >
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-md">
                  <Upload className="h-5 w-5" />
                  <span className="sr-only">Upload CSV Data</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 space-y-4 p-4 mr-2">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Upload className="h-5 w-5 text-primary" />
                    <h4 className="font-medium leading-none text-primary">
                      Upload CSV Data
                    </h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Upload a .csv file with full column details to populate or
                    update the table.
                  </p>
                </div>
                <div>
                  <Label
                    htmlFor="csv-upload-input-popover"
                    className="text-sm font-medium sr-only"
                  >
                    Upload CSV File
                  </Label>
                  <Input
                    id="csv-upload-input-popover"
                    type="file"
                    accept=".csv"
                    onChange={handleCsvUpload}
                    ref={csvFileInputRef}
                    className="hidden"
                  />
                  <Button
                    onClick={() => csvFileInputRef.current?.click()}
                    variant="outline"
                    className="w-full rounded-md"
                  >
                    <Upload className="mr-2 h-4 w-4" /> Choose .csv File
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <Popover open={isDbPopoverOpen} onOpenChange={setIsDbPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-md">
                  <DatabaseZap
                    className={`h-5 w-5 ${
                      dbConnectionStatus === "connected"
                        ? "text-blue-600"
                        : dbConnectionStatus === "error"
                        ? "text-red-500"
                        : ""
                    }`}
                  />
                  <span className="sr-only">Database Connection Settings</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 space-y-4 p-4 mr-2">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none text-primary">
                    Database Connection
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Supported: PostgreSQL, Oracle, Hive. <br />
                    (Full features on PostgreSQL & Oracle)
                  </p>
                </div>
                <div className="relative">
                  <Label htmlFor="db-url-input" className="text-sm font-medium">
                    Connection URL
                  </Label>
                  {detectedDbType !== "unknown" && (
                    <Badge
                      variant="outline"
                      className="absolute right-0 top-0.5 text-xs capitalize"
                    >
                      {detectedDbType}
                    </Badge>
                  )}
                  <Input
                    id="db-url-input"
                    type="text"
                    placeholder="db_type://user:pass@host:port/db"
                    value={dbUrl}
                    onChange={(e) => {
                      setDbUrl(e.target.value);
                      if (
                        dbConnectionStatus !== "idle" &&
                        dbConnectionStatus !== "connecting"
                      ) {
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
                  {dbConnectionStatus === "connecting"
                    ? "Connecting..."
                    : "Connect & Fetch"}
                </Button>
                {dbConnectionMessage && (
                  <div
                    className={`mt-2 text-sm p-2 rounded-md flex items-center ${
                      dbConnectionStatus === "connected"
                        ? "bg-blue-100 text-blue-700"
                        : dbConnectionStatus === "error"
                        ? "bg-red-100 text-red-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {dbConnectionStatus === "connected" && (
                      <CheckCircle2 className="h-4 w-4 mr-2 shrink-0" />
                    )}
                    {dbConnectionStatus === "error" && (
                      <AlertCircle className="h-4 w-4 mr-2 shrink-0" />
                    )}
                    <span className="text-xs">{dbConnectionMessage}</span>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <p className="text-center text-muted-foreground mt-2">
          Use the AI tools to classify new columns or connect to a database to
          manage existing data.
        </p>
      </header>

      <div className="space-y-8">
        {isClassifying && (
          <div className="w-full space-y-2">
            <p className="text-sm text-center text-muted-foreground">
              AI classification in progress...
            </p>
            <Progress value={classificationProgress} className="w-full" />
          </div>
        )}
        <Card className="shadow-xl rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-headline text-2xl text-primary">
              Classified Columns
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                onClick={handleDownloadCsv}
                disabled={!isClient || columns.length === 0}
                variant="outline"
                className="rounded-md"
              >
                <Download className="mr-2 h-4 w-4" /> Download CSV
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="rounded-md"
                    disabled={!isClient || columns.length === 0}
                  >
                    <Trash className="mr-2 h-4 w-4" /> Delete All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete
                      ALL
                      <span className="font-bold"> {columns.length} </span>
                      columns from your local data and the database.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAll}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Yes, Delete Everything
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardHeader>
          <CardContent>
            <DataClassifyTable
              columns={columns}
              onUpdateColumn={handleUpdateColumn}
              onDeleteColumn={handleDeleteColumn}
              ndmoOptions={ndmoClassificationOptions}
              duplicateColumnNames={duplicateColumnNames}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
