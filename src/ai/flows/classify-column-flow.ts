
'use server';
/**
 * @fileOverview An AI flow for classifying bank data columns.
 *
 * - classifyColumn - A function that handles the column classification process.
 * - ClassifyColumnOutput - The return type for the classifyColumn function.
 */

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';
import { type ColumnData, type NDMOClassification, ndmoClassificationOptions } from '@/lib/types';


const ClassifyColumnOutputSchema = z.object({
  category: z.string().describe("A short category for the data (e.g., Personal Identifier, Contact Info, Financial, Authentication)."),
  description: z.string().describe("A brief, one-line explanation of what the column likely holds."),
  ndmoClassification: z.enum(ndmoClassificationOptions).describe('The NDMO classification based on data sensitivity.'),
  pii: z.boolean().describe("Is this Personally Identifiable Information?"),
  phi: z.boolean().describe("Is this Personal Health Information?"),
  pfi: z.boolean().describe("Is this Payment Financial Information?"),
  psi: z.boolean().describe("Is this Payment System Information?"),
  pci: z.boolean().describe("Does this fall under PCI DSS (Payment Card Industry Data Security Standard)?"),
});

export type ClassifyColumnOutput = z.infer<typeof ClassifyColumnOutputSchema>;

export async function classifyColumn(columnName: string): Promise<ClassifyColumnOutput> {
  return classifyColumnFlow(columnName);
}

const classificationPrompt = ai.definePrompt({
  name: 'classifyColumnPrompt',
  input: { schema: z.string() },
  output: { schema: ClassifyColumnOutputSchema },
  model: googleAI('gemini-1.5-flash-latest'),
  prompt: `You are an expert data governance analyst for the banking sector. Your task is to classify a database column based on its name.
    Analyze the provided column name and determine its properties.

    **Column Name:** {{{input}}}

    **Instructions:**
    1.  **Category**: Determine the type/category of data (e.g., Personal Identifier, Contact Info, Payment Info, Geolocation, Transactional, Authentication).
    2.  **Description**: Provide a concise, one-line explanation of what the column likely contains.
    3.  **NDMO Classification**: Assign a classification from the following options based on sensitivity: ${ndmoClassificationOptions.join(', ')}. Use 'Top Secret' for highly sensitive data like credentials or full card numbers, 'Secret' for PII, 'Restricted' for internal-only data, and 'Public' for non-sensitive data.
    4.  **Flags (PII, PHI, PFI, PSI, PCI)**: Determine if the following flags are true or false.
        -   **PII (Personally Identifiable Information)**: Information that can be used on its own or with other information to identify, contact, or locate a single person.
        -   **PHI (Personal Health Information)**: Health information in any form. Less common in standard banking.
        -   **PFI (Payment Financial Information)**: Specific financial details like bank account numbers, credit card numbers, or transaction histories.
        -   **PSI (Payment System Information)**: Information about the payment system itself, like merchant IDs or terminal IDs.
        -   **PCI (Payment Card Industry)**: Specifically for data covered by PCI DSS, primarily the full Primary Account Number (PAN).

    Return ONLY a valid JSON object matching the requested output format.
  `,
});


const classifyColumnFlow = ai.defineFlow(
  {
    name: 'classifyColumnFlow',
    inputSchema: z.string(),
    outputSchema: ClassifyColumnOutputSchema,
  },
  async (columnName) => {
    const { output } = await classificationPrompt(columnName);
    if (!output) {
      throw new Error('AI failed to generate a classification.');
    }
    return output;
  }
);
