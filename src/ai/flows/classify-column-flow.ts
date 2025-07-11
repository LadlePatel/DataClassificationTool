'use server';
/**
 * @fileOverview An AI flow for classifying bank data columns.
 *
 * - classifyColumn - A function that handles the column classification process.
 * - ClassifyColumnOutput - The return type for the classifyColumn function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { type NDMOClassification, ndmoClassificationOptions } from '@/lib/types';

const ClassifyColumnOutputSchema = z.object({
  description: z.string().describe("A very literal, one-line explanation of the column's contents, derived *only* from the column name."),
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

const classifyColumnFlow = ai.defineFlow(
  {
    name: 'classifyColumnFlow',
    inputSchema: z.string(),
    outputSchema: ClassifyColumnOutputSchema,
  },
  async (columnName) => {
    const { output } = await ai.generate({
      output: { schema: ClassifyColumnOutputSchema },
      prompt: `You are a highly precise data governance analysis tool for the banking industry. Your only function is to analyze a database column name and return its classification details in a specific JSON format.

      **Instructions:**
      1.  **\`description\`**: Provide a very literal, simple, one-line explanation of what the column name means. This description **MUST** be derived *only* from the words in the column name.
          *   **Correct Example**: For \`card_number\`, the description is "The number of a payment card."
          *   **INCORRECT Example**: For \`card_number\`, a description like "The customer's full name" is **WRONG**. Your description must be literal.
      2.  **\`ndmoClassification\`**: Assign a classification from these exact options: ${ndmoClassificationOptions.join(', ')}.
      3.  **\`pii\`, \`phi\`, \`pfi\`, \`psi\`, \`pci\`**: Set these boolean flags to \`true\` or \`false\` based on standard definitions.
      
      Your output **MUST BE** a single, valid JSON object that conforms to the requested schema.

      Analyze the following column name: \`${columnName}\``,
    });

    if (!output) {
      throw new Error('AI failed to generate a classification. The model returned a null response.');
    }
    return output;
  }
);