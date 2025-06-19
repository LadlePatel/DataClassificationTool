
import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchColumnDataLogic, insertColumnDataLogic, type ActionResult } from '@/app/actions/dbActions';
import type { ColumnData } from '@/lib/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ActionResult & { data?: ColumnData[] | ColumnData }>
) {
  if (req.method === 'GET') {
    const { dbUrl } = req.query;
    if (!dbUrl || typeof dbUrl !== 'string') {
      return res.status(400).json({ success: false, message: 'dbUrl query parameter is required.' });
    }
    try {
      const result = await fetchColumnDataLogic(dbUrl);
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      const e = error as Error;
      res.status(500).json({ success: false, message: 'Failed to fetch columns.', error: e.message });
    }
  } else if (req.method === 'POST') {
    const { dbUrl, column } = req.body;
     if (!dbUrl || typeof dbUrl !== 'string' || !column) {
      return res.status(400).json({ success: false, message: 'dbUrl and column data are required in the request body.' });
    }
    try {
      const result = await insertColumnDataLogic(dbUrl, column);
      if (result.success) {
        res.status(201).json(result);
      } else {
        // Check if the error is due to duplicate column name
        if (result.message?.includes("already exists")) {
            res.status(409).json(result); // 409 Conflict
        } else {
            res.status(500).json(result);
        }
      }
    } catch (error) {
      const e = error as Error;
      res.status(500).json({ success: false, message: 'Failed to insert column.', error: e.message });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
