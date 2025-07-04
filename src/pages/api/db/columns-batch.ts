
import type { NextApiRequest, NextApiResponse } from 'next';
import { batchInsertColumnDataLogic, type ActionResult } from '@/app/actions/dbActions';
import type { ColumnData } from '@/lib/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ActionResult & { results?: { column: ColumnData, success: boolean, error?: string }[] }>
) {
  if (req.method === 'POST') {
    const { dbUrl, columns } = req.body;
    if (!dbUrl || typeof dbUrl !== 'string' || !Array.isArray(columns)) {
      return res.status(400).json({ success: false, message: 'dbUrl and columns array are required in the request body.' });
    }
    try {
      const result = await batchInsertColumnDataLogic(dbUrl, columns);
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      const e = error as Error;
      res.status(500).json({ success: false, message: 'Failed to batch insert columns.', error: e.message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
