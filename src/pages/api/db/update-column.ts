
import type { NextApiRequest, NextApiResponse } from 'next';
import { updateColumnDataLogic, type ActionResult } from '@/app/actions/dbActions';
import type { ColumnData } from '@/lib/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ActionResult & { data?: ColumnData }>
) {
  if (req.method === 'PUT') {
    const { dbUrl, column } = req.body;
     if (!dbUrl || typeof dbUrl !== 'string' || !column || !column.id) {
      return res.status(400).json({ success: false, message: 'dbUrl and column data (including id) are required in the request body.' });
    }
    try {
      const result = await updateColumnDataLogic(dbUrl, column);
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      const e = error as Error;
      res.status(500).json({ success: false, message: 'Failed to update column.', error: e.message });
    }
  } else {
    res.setHeader('Allow', ['PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
