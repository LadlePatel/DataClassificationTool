
"use client";

import type * as React from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { NDMOClassification } from "@/lib/types";
import { PlusCircle } from "lucide-react";

const formSchema = z.object({
  columnName: z.string().min(1, "Column Name is required."),
  description: z.string().min(1, "Description is required."),
  ndmoClassification: z.enum(['Top Secret', 'Secret', 'Restricted', 'Public'], {
    required_error: "NDMO Classification is required.",
  }),
  pii: z.boolean().default(false),
  phi: z.boolean().default(false),
  pfi: z.boolean().default(false),
  psi: z.boolean().default(false),
});

export type DataClassifyFormValues = z.infer<typeof formSchema>;

interface DataClassifyFormProps {
  onSubmit: (values: DataClassifyFormValues) => void;
  ndmoOptions: NDMOClassification[];
}

export function DataClassifyForm({ onSubmit, ndmoOptions }: DataClassifyFormProps) {
  const form = useForm<DataClassifyFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      columnName: "",
      description: "",
      ndmoClassification: undefined,
      pii: false,
      phi: false,
      pfi: false,
      psi: false,
    },
  });

  function handleSubmit(values: DataClassifyFormValues) {
    onSubmit(values);
    form.reset();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="columnName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Column Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., customer_email" {...field} className="rounded-md" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Enter a brief description of the column" {...field} className="rounded-md" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="ndmoClassification"
          render={({ field }) => (
            <FormItem>
              <FormLabel>NDMO Classification</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""} defaultValue={field.value || ""}>
                <FormControl>
                  <SelectTrigger className="rounded-md">
                    <SelectValue placeholder="Select a classification" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ndmoOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <FormField
            control={form.control}
            name="pii"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-card/80 dark:bg-card">
                <div className="space-y-0.5">
                  <FormLabel>PII</FormLabel>
                  <FormDescription className="text-xs">Personally Identifiable Information</FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phi"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-card/80 dark:bg-card">
                <div className="space-y-0.5">
                  <FormLabel>PHI</FormLabel>
                  <FormDescription className="text-xs">Personal Health Information</FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="pfi"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-card/80 dark:bg-card">
                <div className="space-y-0.5">
                  <FormLabel>PFI</FormLabel>
                  <FormDescription className="text-xs">Payment Financial Information</FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="psi"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-card/80 dark:bg-card">
                <div className="space-y-0.5">
                  <FormLabel>PSI</FormLabel>
                  <FormDescription className="text-xs">Payment System Information</FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        
        <Button type="submit" className="w-full rounded-md">
          <PlusCircle className="mr-2 h-4 w-4" /> Add Column
        </Button>
      </form>
    </Form>
  );
}
