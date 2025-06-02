
'use server';

import { Pool } from 'pg';
import type { ColumnData } from '@/lib/types';

interface ConnectionResult {
  success: boolean;
  message: string;
  error?: string;
}

interface ActionResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}

async function getPool(dbUrl: string): Promise<Pool> {
  if (!dbUrl) {
    throw new Error('Database URL is required.');
  }
  return new Pool({ connectionString: dbUrl });
}

export async function createColumnTable(dbUrl: string): Promise<ActionResult> {
  const pool = await getPool(dbUrl);
  let client;
  try {
    client = await pool.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS column_classifications (
        id TEXT PRIMARY KEY,
        column_name TEXT UNIQUE NOT NULL,
        description TEXT,
        ndmo_classification TEXT,
        pii BOOLEAN DEFAULT FALSE,
        phi BOOLEAN DEFAULT FALSE,
        pfi BOOLEAN DEFAULT FALSE,
        psi BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    // Function to update updated_at column
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
         NEW.updated_at = NOW();
         RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    // Trigger to update updated_at on row update
    await client.query(`
      DROP TRIGGER IF EXISTS update_column_classifications_updated_at ON column_classifications;
      CREATE TRIGGER update_column_classifications_updated_at
      BEFORE UPDATE ON column_classifications
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);
    return { success: true, message: 'Table "column_classifications" checked/created successfully.' };
  } catch (err) {
    const error = err as Error;
    console.error('Table Creation Error:', error);
    return { success: false, message: 'Failed to create table.', error: error.message };
  } finally {
    client?.release();
    await pool.end().catch(console.error);
  }
}

export async function testPostgresConnection(dbUrl: string): Promise<ConnectionResult> {
  if (!dbUrl) {
    return { success: false, message: 'Database URL is required.' };
  }

  const pool = await getPool(dbUrl);
  let client;
  try {
    client = await pool.connect();
    const res = await client.query('SELECT NOW()');
    const serverTime = res.rows[0].now;
    
    // Attempt to create table
    const tableCreationResult = await createColumnTable(dbUrl); // Pass dbUrl again, it will manage its own pool
    if (!tableCreationResult.success) {
        return {
            success: false,
            message: `Successfully connected, but failed to ensure table exists: ${tableCreationResult.message}`,
            error: tableCreationResult.error
        };
    }

    return { 
      success: true, 
      message: `Successfully connected to PostgreSQL. Server time: ${serverTime}. Table 'column_classifications' is ready.` 
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
    client?.release();
    await pool.end().catch(console.error);
  }
}

export async function fetchColumnData(dbUrl: string): Promise<ActionResult & { data?: ColumnData[] }> {
  const pool = await getPool(dbUrl);
  let client;
  try {
    client = await pool.connect();
    const res = await client.query('SELECT id, column_name, description, ndmo_classification, pii, phi, pfi, psi FROM column_classifications ORDER BY column_name ASC');
    const columns: ColumnData[] = res.rows.map(row => ({
      id: row.id,
      columnName: row.column_name,
      description: row.description || "",
      ndmoClassification: row.ndmo_classification,
      pii: row.pii || false,
      phi: row.phi || false,
      pfi: row.pfi || false,
      psi: row.psi || false,
    }));
    return { success: true, data: columns };
  } catch (err) {
    const error = err as Error;
    console.error('Fetch Columns Error:', error);
    return { success: false, message: 'Failed to fetch columns.', error: error.message, data: [] };
  } finally {
    client?.release();
    await pool.end().catch(console.error);
  }
}

export async function insertColumnData(dbUrl: string, column: Omit<ColumnData, 'id'> & { id?: string }): Promise<ActionResult & { data?: ColumnData }> {
  const pool = await getPool(dbUrl);
  let client;
  const columnId = column.id || crypto.randomUUID();
  try {
    client = await pool.connect();
    const query = `
      INSERT INTO column_classifications (id, column_name, description, ndmo_classification, pii, phi, pfi, psi)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;
    const values = [
      columnId,
      column.columnName,
      column.description,
      column.ndmoClassification,
      column.pii,
      column.phi,
      column.pfi,
      column.psi,
    ];
    const res = await client.query(query, values);
    const insertedRow = res.rows[0];
    const newColumnData: ColumnData = {
        id: insertedRow.id,
        columnName: insertedRow.column_name,
        description: insertedRow.description,
        ndmoClassification: insertedRow.ndmo_classification,
        pii: insertedRow.pii,
        phi: insertedRow.phi,
        pfi: insertedRow.pfi,
        psi: insertedRow.psi,
    };
    return { success: true, message: 'Column inserted successfully.', data: newColumnData };
  } catch (err) {
    const error = err as Error;
    console.error('Insert Column Error:', error);
    let userMessage = 'Failed to insert column.';
    if (error.message.includes('duplicate key value violates unique constraint "column_classifications_column_name_key"')) {
      userMessage = `Column with name "${column.columnName}" already exists.`;
    }
    return { success: false, message: userMessage, error: error.message };
  } finally {
    client?.release();
    await pool.end().catch(console.error);
  }
}

export async function batchInsertColumnData(dbUrl: string, columns: ColumnData[]): Promise<ActionResult & { results?: { column: ColumnData, success: boolean, error?: string }[] }> {
    const pool = await getPool(dbUrl);
    const client = await pool.connect();
    const results: { column: ColumnData, success: boolean, error?: string }[] = [];
    let allSuccessful = true;

    try {
        await client.query('BEGIN'); // Start transaction

        for (const column of columns) {
            try {
                const query = `
                    INSERT INTO column_classifications (id, column_name, description, ndmo_classification, pii, phi, pfi, psi)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (column_name) DO NOTHING; 
                `; // ON CONFLICT DO NOTHING to skip duplicates by column_name
                const values = [
                    column.id,
                    column.columnName,
                    column.description,
                    column.ndmoClassification,
                    column.pii,
                    column.phi,
                    column.pfi,
                    column.psi,
                ];
                const res = await client.query(query, values);
                if (res.rowCount > 0) {
                    results.push({ column, success: true });
                } else {
                    // This means it was a duplicate and was skipped by ON CONFLICT DO NOTHING
                    results.push({ column, success: true, error: 'Duplicate column_name, skipped.' }); 
                }
            } catch (err) {
                const error = err as Error;
                console.error(`Batch Insert Error for column ${column.columnName}:`, error);
                results.push({ column, success: false, error: error.message });
                allSuccessful = false;
            }
        }

        if (allSuccessful) {
            await client.query('COMMIT'); // Commit transaction
            return { success: true, message: 'Batch insert completed.', results };
        } else {
            await client.query('ROLLBACK'); // Rollback transaction if any error
            return { success: false, message: 'Batch insert failed for some columns, transaction rolled back.', results };
        }
    } catch (err) {
        const error = err as Error;
        console.error('Batch Insert Transaction Error:', error);
        await client.query('ROLLBACK'); // Ensure rollback on outer error
        return { success: false, message: 'Batch insert transaction failed.', error: error.message, results };
    } finally {
        client.release();
        await pool.end().catch(console.error);
    }
}


export async function updateColumnData(dbUrl: string, column: ColumnData): Promise<ActionResult & { data?: ColumnData }> {
  const pool = await getPool(dbUrl);
  let client;
  try {
    client = await pool.connect();
    const query = `
      UPDATE column_classifications
      SET description = $2, ndmo_classification = $3, pii = $4, phi = $5, pfi = $6, psi = $7, updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;
    const values = [
      column.id,
      column.description,
      column.ndmoClassification,
      column.pii,
      column.phi,
      column.pfi,
      column.psi,
    ];
    const res = await client.query(query, values);
    if (res.rows.length === 0) {
      return { success: false, message: 'Column not found for update.' };
    }
    const updatedRow = res.rows[0];
    const updatedColumnData: ColumnData = {
        id: updatedRow.id,
        columnName: updatedRow.column_name,
        description: updatedRow.description,
        ndmoClassification: updatedRow.ndmo_classification,
        pii: updatedRow.pii,
        phi: updatedRow.phi,
        pfi: updatedRow.pfi,
        psi: updatedRow.psi,
    };
    return { success: true, message: 'Column updated successfully.', data: updatedColumnData };
  } catch (err) {
    const error = err as Error;
    console.error('Update Column Error:', error);
    return { success: false, message: 'Failed to update column.', error: error.message };
  } finally {
    client?.release();
    await pool.end().catch(console.error);
  }
}
