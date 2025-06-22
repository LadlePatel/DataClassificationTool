'use server';
/**
 * @fileOverview An AI flow for classifying bank data columns.
 *
 * - classifyColumn - A function that handles the column classification process.
 * - ClassifyColumnOutput - The return type for the classifyColumn function.
 */

import { ai } from '@/ai/genkit';
import openAI from 'genkitx-openai';
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

const classificationPrompt = ai.definePrompt({
  name: 'classifyColumnPrompt',
  input: { schema: z.string() },
  output: { schema: ClassifyColumnOutputSchema },
  model: 'openai/gpt-4o',
  prompt: `You are a highly precise data governance analysis tool for the banking industry. Your only function is to analyze a database column name and return its classification details in a specific JSON format. Adhere strictly to the following instructions.

    **Input Column Name:** \`{{{input}}}\`

    **Your Task:**
    Analyze the **Input Column Name** and generate a JSON object with the following fields:

    1.  **\`description\`**:
        *   This is your most critical task. You **MUST** provide a very literal, simple, one-line explanation of what the column name means.
        *   The description **MUST** be derived *only* from the words in the column name.
        *   **DO NOT** infer business context. **DO NOT** invent details.
        *   **Correct Example 1**: For \`card_number\`, the description is "The number of a payment card."
        *   **Correct Example 2**: For \`first_name\`, the description is "The first name of a person."
        *   **INCORRECT Example**: For \`card_number\`, a description like "The date of the last transaction" or "The customer's full name" is **WRONG**. Your description must be literal.

    2.  **\`ndmoClassification\`**:
        *   Assign a classification from these exact options: ${ndmoClassificationOptions.join(', ')}.
        *   Base the classification on data sensitivity. Use 'Top Secret' for credentials or full card numbers, 'Secret' for PII, 'Restricted' for internal data, and 'Public' for non-sensitive data.

    3.  **\`pii\`, \`phi\`, \`pfi\`, \`psi\`, \`pci\`**:
        *   Set these boolean flags to \`true\` or \`false\`.
        *   **PII (Personally Identifiable Information)**: Can it identify a person?
        *   **PHI (Personal Health Information)**: Is it health-related?
        *   **PFI (Payment Financial Information)**: Is it a specific financial detail like an account number? (\`card_number\` is PFI).
        *   **PSI (Payment System Information)**: Is it about the payment system itself (e.g., merchant ID)?
        *   **PCI (Payment Card Industry)**: Is it data covered by PCI DSS, like a full card number? (\`card_number\` is PCI).

    Your output **MUST BE** a single, valid JSON object and nothing else.
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
