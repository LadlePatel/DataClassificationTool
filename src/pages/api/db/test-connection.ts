
import type { NextApiRequest, NextApiResponse } from 'next';
import { testConnectionLogic, type ConnectionResult } from '@/app/actions/dbActions';
import type { DatabaseType } from '@/lib/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ConnectionResult>
) {
  if (req.method === 'POST') {
    const { dbUrl, dbType } = req.body;
    if (!dbUrl || typeof dbUrl !== 'string' || !dbType) {
      return res.status(400).json({ success: false, message: 'Database URL and database type are required in the request body.' });
    }
    try {
      const result = await testConnectionLogic(dbUrl, dbType as DatabaseType);
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      const e = error as Error;
      console.error('API Test Connection Error:', e);
      res.status(500).json({ success: false, message: 'Failed to test connection.', error: e.message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
