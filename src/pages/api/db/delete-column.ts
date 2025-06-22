
import type { NextApiRequest, NextApiResponse } from 'next';
import { deleteColumnDataLogic, type ActionResult } from '@/app/actions/dbActions';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ActionResult>
) {
  if (req.method === 'DELETE') {
    const { dbUrl, id } = req.body;
    if (!dbUrl || typeof dbUrl !== 'string' || !id || typeof id !== 'string') {
      return res.status(400).json({ success: false, message: 'dbUrl and id are required in the request body.' });
    }
    try {
      const result = await deleteColumnDataLogic(dbUrl, id);
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(result.message?.includes('not found') ? 404 : 500).json(result);
      }
    } catch (error) {
      const e = error as Error;
      res.status(500).json({ success: false, message: 'Failed to delete column.', error: e.message });
    }
  } else {
    res.setHeader('Allow', ['DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
