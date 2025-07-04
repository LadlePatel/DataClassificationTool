
import type { NextApiRequest, NextApiResponse } from 'next';
import { classifyColumn, type ClassifyColumnOutput } from '@/ai/flows/classify-column-flow';

type ApiActionResult<T = any> = { success: boolean; message?: string; error?: string; data?: T; };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiActionResult<{ classification: ClassifyColumnOutput }>>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { columnName } = req.body;

  if (!columnName || typeof columnName !== 'string') {
    return res.status(400).json({ success: false, message: 'columnName (string) is required in the request body.' });
  }

  try {
    const classification = await classifyColumn(columnName);
    res.status(200).json({ success: true, data: { classification } });
  } catch (error) {
    const e = error as Error;
    console.error(`Error classifying column "${columnName}":`, e);
    res.status(500).json({ success: false, message: `Failed to classify column: ${e.message}`, error: e.stack });
  }
}
