
import type { NextApiRequest, NextApiResponse } from 'next';
import { testPostgresConnectionLogic, type ConnectionResult } from '@/app/actions/dbActions';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ConnectionResult>
) {
  if (req.method === 'POST') {
    const { dbUrl } = req.body;
    if (!dbUrl || typeof dbUrl !== 'string') {
      return res.status(400).json({ success: false, message: 'Database URL is required in the request body.' });
    }
    try {
      const result = await testPostgresConnectionLogic(dbUrl);
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
