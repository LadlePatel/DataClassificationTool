"use server";
import { ndmoClassificationOptions } from "@/lib/types";
import { z } from "zod";

const GROQ_API_KEY = process.env.GROQ_API_KEY!;

const ClassifyColumnOutputSchema = z.object({
  description: z.string(),
  ndmoClassification: z.enum(ndmoClassificationOptions),
  pii: z.boolean(),
  phi: z.boolean(),
  pfi: z.boolean(),
  psi: z.boolean(),
  pci: z.boolean(),
});

export type ClassifyColumnOutput = z.infer<typeof ClassifyColumnOutputSchema>;

export async function classifyColumn(
  columnName: string
): Promise<ClassifyColumnOutput> {
  const prompt = `You are a highly precise data governance analysis tool for the banking industry. Your only function is to analyze a database column name and return its classification details in a specific JSON format.

**Instructions:**
1.  **\`description\`**: Provide a very literal, simple, one-line explanation of what the column name means. This description **MUST** be derived *only* from the words in the column name.
    *   **Correct Example**: For \`card_number\`, the description is "The number of a payment card."
    *   **INCORRECT Example**: For \`card_number\`, a description like "The customer's full name" is **WRONG**. Your description must be literal.
2.  **\`ndmoClassification\`**: Assign a classification from these exact options: ${ndmoClassificationOptions.join(
    ", "
  )}.
3.  **\`pii\`, \`phi\`, \`pfi\`, \`psi\`, \`pci\`**: Set these boolean flags to \`true\` or \`false\` based on standard definitions.

Your output **MUST BE** a single, valid JSON object that conforms to the requested schema.

Analyze the following column name: \`${columnName}\``;

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Groq API error: ${response.status} ${await response.text()}`
    );
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No content returned from Groq API");
  }

  // Strip triple backtick block
  let jsonText = content.trim();
  if (jsonText.startsWith("```json")) {
    jsonText = jsonText.slice(7, -3).trim();
  } else if (jsonText.startsWith("```")) {
    jsonText = jsonText.slice(3, -3).trim();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("Groq returned non-JSON output:\n" + content);
  }

  const result = ClassifyColumnOutputSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `Invalid response format from Groq:\n${JSON.stringify(
        result.error.format(),
        null,
        2
      )}`
    );
  }

  return result.data;
}
