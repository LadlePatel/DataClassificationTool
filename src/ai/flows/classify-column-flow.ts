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
  const prompt = `You are a highly precise data governance analysis tool for the banking industry.

Your only function is to analyze a database column name and return its classification details in a specific JSON format.

⚠️ VERY IMPORTANT:
- ONLY respond with a single valid JSON object.
- Your JSON MUST be wrapped inside a fenced code block like \`\`\`json ... \`\`\`.
- DO NOT provide any explanation, reasoning, or commentary.

---

Analyze the following column name: \`${columnName}\`

Expected JSON Schema:
{
  "description": string,
  "ndmoClassification": one of [${ndmoClassificationOptions.join(", ")}],
  "pii": boolean,
  "phi": boolean,
  "pfi": boolean,
  "psi": boolean,
  "pci": boolean
}`;

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

  let jsonText: string | undefined;

  const match = content.match(/```(?:json)?\s*({[\s\S]*?})\s*```/);
  if (match?.[1]) {
    jsonText = match[1].trim();
  } else {
    const fallback = content.match(/{[\s\S]*}/);
    if (fallback?.[0]) {
      jsonText = fallback[0].trim();
    }
  }

  if (!jsonText) {
    throw new Error("Groq returned non-JSON output:\n" + content);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    throw new Error("Failed to parse JSON from Groq:\n" + jsonText);
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
