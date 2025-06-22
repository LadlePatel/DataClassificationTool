
import { Pool } from 'pg';
import type { PoolClient } from 'pg';
import type { ColumnData } from '@/lib/types';

export interface ConnectionResult {
  success: boolean;
  message: string;
  error?: string;
}

export interface ActionResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}

async function getPool(dbUrl: string): Promise<Pool> {
  if (!dbUrl) {
    throw new Error('Database URL is required.');
  }
  // This can throw if connectionString is invalid
  return new Pool({ connectionString: dbUrl });
}

// Renamed to reflect it uses an existing client
export async function createColumnTableWithClientLogic(client: PoolClient): Promise<Omit<ActionResult, 'data'>> {
  try {
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
        pci BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add pci column if it doesn't exist for backward compatibility
    await client.query(`
      ALTER TABLE column_classifications ADD COLUMN IF NOT EXISTS pci BOOLEAN DEFAULT FALSE;
    `);
    
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
         NEW.updated_at = NOW();
         RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
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
    console.error('Table Creation Error (with client):', error);
    return { success: false, message: 'Failed to create table.', error: error.message };
  }
}

export async function testPostgresConnectionLogic(dbUrl: string): Promise<ConnectionResult> {
  if (!dbUrl) {
    return { success: false, message: 'Database URL is required.' };
  }

  let pool: Pool | undefined;
  let client: PoolClient | undefined;

  try {
    pool = await getPool(dbUrl);
    client = await pool.connect();
    
    const res = await client.query('SELECT NOW()');
    const serverTime = res.rows[0].now;
    
    const tableCreationResult = await createColumnTableWithClientLogic(client);
    if (!tableCreationResult.success) {
        return {
            success: false,
            message: `Successfully connected to PostgreSQL (Server time: ${serverTime}), but failed to ensure table 'column_classifications' exists: ${tableCreationResult.message}`,
            error: tableCreationResult.error
        };
    }

    return { 
      success: true, 
      message: `Successfully connected to PostgreSQL. Server time: ${serverTime}. Table 'column_classifications' is ready.` 
    };
  } catch (err) {
    const error = err as Error;
    console.error('PostgreSQL Connection or Setup Error in testPostgresConnectionLogic:', error);
    let detailedMessage = 'Failed to connect to PostgreSQL or set up the database.';
    if (error.message.includes('getaddrinfo ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
        detailedMessage = 'Failed to connect: Network error or host not found. Check the database host and port.';
    } else if (error.message.includes('password authentication failed')) {
        detailedMessage = 'Failed to connect: Password authentication failed. Check your credentials.';
    } else if (error.message.includes('database') && error.message.includes('does not exist')) {
        detailedMessage = 'Failed to connect: Database does not exist. Check the database name in your URL.';
    } else if (error.message.includes('invalid port')) {
        detailedMessage = 'Failed to connect: Invalid port number. Please check your connection URL.';
    } else {
        detailedMessage = `Connection error: ${error.message}`;
    }
    return { 
      success: false, 
      message: detailedMessage,
      error: error.message 
    };
  } finally {
    client?.release();
    if (pool) {
      await pool.end().catch(pgEndError => console.error('Error ending PG pool:', pgEndError));
    }
  }
}

export async function fetchColumnDataLogic(dbUrl: string): Promise<ActionResult & { data?: ColumnData[] }> {
  let pool: Pool | undefined;
  let client: PoolClient | undefined;
  try {
    pool = await getPool(dbUrl);
    client = await pool.connect();
    const res = await client.query('SELECT id, column_name, description, ndmo_classification, pii, phi, pfi, psi, pci FROM column_classifications ORDER BY column_name ASC');
    const columns: ColumnData[] = res.rows.map(row => ({
      id: row.id,
      columnName: row.column_name,
      description: row.description || "",
      ndmoClassification: row.ndmo_classification,
      pii: row.pii || false,
      phi: row.phi || false,
      pfi: row.pfi || false,
      psi: row.psi || false,
      pci: row.pci || false,
    }));
    return { success: true, data: columns };
  } catch (err) {
    const error = err as Error;
    console.error('Fetch Columns Error:', error);
    return { success: false, message: 'Failed to fetch columns.', error: error.message, data: [] };
  } finally {
    client?.release();
    if (pool) {
      await pool.end().catch(pgEndError => console.error('Error ending PG pool during fetch:', pgEndError));
    }
  }
}

export async function insertColumnDataLogic(dbUrl: string, column: Omit<ColumnData, 'id'> & { id?: string }): Promise<ActionResult & { data?: ColumnData }> {
  let pool: Pool | undefined;
  let client: PoolClient | undefined;
  const columnId = column.id || crypto.randomUUID();
  try {
    pool = await getPool(dbUrl);
    client = await pool.connect();
    const query = `
      INSERT INTO column_classifications (id, column_name, description, ndmo_classification, pii, phi, pfi, psi, pci)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
      column.pci,
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
        pci: insertedRow.pci,
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
    if (pool) {
      await pool.end().catch(pgEndError => console.error('Error ending PG pool during insert:', pgEndError));
    }
  }
}

export async function batchInsertColumnDataLogic(dbUrl: string, columns: ColumnData[]): Promise<ActionResult & { results?: { column: ColumnData, success: boolean, error?: string }[] }> {
    let pool: Pool | undefined;
    let client: PoolClient | undefined;
    const results: { column: ColumnData, success: boolean, error?: string }[] = [];
    
    try {
        pool = await getPool(dbUrl);
        client = await pool.connect();
        await client.query('BEGIN'); 

        // Using a single query with multiple VALUES clauses is more efficient
        const valuesClauses: string[] = [];
        const queryParams: any[] = [];
        let paramIndex = 1;

        for (const column of columns) {
            valuesClauses.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
            queryParams.push(
                column.id || crypto.randomUUID(),
                column.columnName,
                column.description,
                column.ndmoClassification,
                column.pii,
                column.phi,
                column.pfi,
                column.psi,
                column.pci
            );
        }

        const query = `
            INSERT INTO column_classifications (id, column_name, description, ndmo_classification, pii, phi, pfi, psi, pci)
            VALUES ${valuesClauses.join(', ')}
            ON CONFLICT (column_name) DO UPDATE SET
                description = EXCLUDED.description,
                ndmo_classification = EXCLUDED.ndmo_classification,
                pii = EXCLUDED.pii,
                phi = EXCLUDED.phi,
                pfi = EXCLUDED.pfi,
                psi = EXCLUDED.psi,
                pci = EXCLUDED.pci,
                updated_at = NOW();
        `;
        
        await client.query(query, queryParams);

        await client.query('COMMIT'); 
        return { success: true, message: 'Batch sync completed successfully.' };

    } catch (err) {
        const error = err as Error;
        console.error('Batch Insert/Update Transaction Error:', error);
        if (client) await client.query('ROLLBACK'); 
        return { success: false, message: 'Batch sync transaction failed and was rolled back.', error: error.message };
    } finally {
        client?.release();
        if (pool) {
          await pool.end().catch(pgEndError => console.error('Error ending PG pool during batch insert:', pgEndError));
        }
    }
}


export async function updateColumnDataLogic(dbUrl: string, column: ColumnData): Promise<ActionResult & { data?: ColumnData }> {
  let pool: Pool | undefined;
  let client: PoolClient | undefined;
  try {
    pool = await getPool(dbUrl);
    client = await pool.connect();
    const query = `
      UPDATE column_classifications
      SET description = $2, ndmo_classification = $3, pii = $4, phi = $5, pfi = $6, psi = $7, pci = $8, updated_at = NOW()
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
      column.pci,
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
        pci: updatedRow.pci,
    };
    return { success: true, message: 'Column updated successfully.', data: updatedColumnData };
  } catch (err) {
    const error = err as Error;
    console.error('Update Column Error:', error);
    return { success: false, message: 'Failed to update column.', error: error.message };
  } finally {
    client?.release();
    if (pool) {
      await pool.end().catch(pgEndError => console.error('Error ending PG pool during update:', pgEndError));
    }
  }
}

export async function deleteColumnDataLogic(dbUrl: string, id: string): Promise<ActionResult> {
  let pool: Pool | undefined;
  let client: PoolClient | undefined;
  try {
    pool = await getPool(dbUrl);
    client = await pool.connect();
    const query = 'DELETE FROM column_classifications WHERE id = $1';
    const res = await client.query(query, [id]);
    
    if (res.rowCount === 0) {
      return { success: false, message: 'Column not found for deletion.' };
    }

    return { success: true, message: 'Column deleted successfully.' };
  } catch (err) {
    const error = err as Error;
    console.error('Delete Column Error:', error);
    return { success: false, message: 'Failed to delete column.', error: error.message };
  } finally {
    client?.release();
    if (pool) {
      await pool.end().catch(pgEndError => console.error('Error ending PG pool during delete:', pgEndError));
    }
  }
}

export async function deleteAllColumnsLogic(dbUrl: string): Promise<ActionResult> {
  let pool: Pool | undefined;
  let client: PoolClient | undefined;
  try {
    pool = await getPool(dbUrl);
    client = await pool.connect();
    const query = 'TRUNCATE TABLE column_classifications;';
    await client.query(query);
    
    return { success: true, message: 'All columns deleted successfully.' };
  } catch (err) {
    const error = err as Error;
    console.error('Delete All Columns Error:', error);
    return { success: false, message: 'Failed to delete all columns.', error: error.message };
  } finally {
    client?.release();
    if (pool) {
      await pool.end().catch(pgEndError => console.error('Error ending PG pool during delete all:', pgEndError));
    }
  }
}
    
