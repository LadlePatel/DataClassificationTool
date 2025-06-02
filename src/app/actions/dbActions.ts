
'use server';

import { Pool } from 'pg';

interface ConnectionResult {
  success: boolean;
  message: string;
  error?: string;
}

export async function testPostgresConnection(dbUrl: string): Promise<ConnectionResult> {
  if (!dbUrl) {
    return { success: false, message: 'Database URL is required.' };
  }

  let pool: Pool | null = null;
  try {
    pool = new Pool({ connectionString: dbUrl });
    const client = await pool.connect();
    const res = await client.query('SELECT NOW()');
    client.release();
    
    const serverTime = res.rows[0].now;
    return { 
      success: true, 
      message: `Successfully connected to PostgreSQL. Server time: ${serverTime}` 
    };
  } catch (err) {
    const error = err as Error;
    console.error('PostgreSQL Connection Error:', error);
    return { 
      success: false, 
      message: 'Failed to connect to PostgreSQL.',
      error: error.message 
    };
  } finally {
    if (pool) {
      await pool.end().catch(console.error);
    }
  }
}
