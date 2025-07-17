"use server";

import { Pool } from "pg";
import type { PoolClient } from "pg";
import oracledb from "oracledb";
import type { Connection, Binds, ExecuteManyOptions, Result } from "oracledb";
import type { ColumnData, DatabaseType } from "@/lib/types";

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

export function detectDbType(url: string): DatabaseType {
  if (!url) return "unknown";
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.startsWith("postgres")) return "postgres";
  if (
    lowerUrl.startsWith("oracle:") ||
    (lowerUrl.includes("@") &&
      (lowerUrl.includes("SID") || lowerUrl.includes("SERVICE_NAME")))
  )
    return "oracle";
  if (lowerUrl.startsWith("jdbc:hive2")) return "hive";
  return "unknown";
}

// =================================================================
// Main Logic Router Functions
// =================================================================

export async function testConnectionLogic(
  dbUrl: string,
  dbType: DatabaseType
): Promise<ConnectionResult> {
  if (!dbUrl) {
    return { success: false, message: "Database URL is required." };
  }

  switch (dbType) {
    case "postgres":
      return testPostgresConnection(dbUrl);
    case "oracle":
      return testOracleConnection(dbUrl);
    case "hive":
      return {
        success: false,
        message:
          "Connection to Hive is not fully implemented. Hive is detected, but live data operations are not supported in this version due to Hive's architecture not supporting transactional row-level updates.",
      };
    default:
      return {
        success: false,
        message: `Unknown or unsupported database type: ${dbType}`,
      };
  }
}

export async function fetchColumnDataLogic(
  dbUrl: string
): Promise<ActionResult & { data?: ColumnData[] }> {
  const dbType = detectDbType(dbUrl);
  switch (dbType) {
    case "postgres":
      return fetchPostgresColumns(dbUrl);
    case "oracle":
      return fetchOracleColumns(dbUrl);
    default:
      return {
        success: false,
        message: `Fetching data is not supported for database type: ${dbType}.`,
        data: [],
      };
  }
}

export async function insertColumnDataLogic(
  dbUrl: string,
  column: Omit<ColumnData, "id"> & { id?: string }
): Promise<ActionResult & { data?: ColumnData }> {
  const dbType = detectDbType(dbUrl);
  switch (dbType) {
    case "postgres":
      return insertPostgresColumn(dbUrl, column);
    case "oracle":
      return insertOracleColumn(dbUrl, column);
    default:
      return {
        success: false,
        message: `Inserting data is not supported for database type: ${dbType}.`,
      };
  }
}

export async function batchInsertColumnDataLogic(
  dbUrl: string,
  columns: ColumnData[]
): Promise<
  ActionResult & {
    results?: { column: ColumnData; success: boolean; error?: string }[];
  }
> {
  const dbType = detectDbType(dbUrl);
  switch (dbType) {
    case "postgres":
      return batchInsertPostgresColumns(dbUrl, columns);
    case "oracle":
      return batchInsertOracleColumns(dbUrl, columns);
    default:
      return {
        success: false,
        message: `Batch operations are not supported for database type: ${dbType}.`,
      };
  }
}

export async function updateColumnDataLogic(
  dbUrl: string,
  column: ColumnData
): Promise<ActionResult & { data?: ColumnData }> {
  const dbType = detectDbType(dbUrl);
  switch (dbType) {
    case "postgres":
      return updatePostgresColumn(dbUrl, column);
    case "oracle":
      return updateOracleColumn(dbUrl, column);
    default:
      return {
        success: false,
        message: `Updating data is not supported for database type: ${dbType}.`,
      };
  }
}

export async function deleteColumnDataLogic(
  dbUrl: string,
  id: string
): Promise<ActionResult> {
  const dbType = detectDbType(dbUrl);
  switch (dbType) {
    case "postgres":
      return deletePostgresColumn(dbUrl, id);
    case "oracle":
      return deleteOracleColumn(dbUrl, id);
    default:
      return {
        success: false,
        message: `Deleting data is not supported for database type: ${dbType}.`,
      };
  }
}

export async function deleteAllColumnsLogic(
  dbUrl: string
): Promise<ActionResult> {
  const dbType = detectDbType(dbUrl);
  switch (dbType) {
    case "postgres":
      return deleteAllPostgresColumns(dbUrl);
    case "oracle":
      return deleteAllOracleColumns(dbUrl);
    default:
      return {
        success: false,
        message: `Deleting all data is not supported for database type: ${dbType}.`,
      };
  }
}

// =================================================================
// PostgreSQL Implementation
// =================================================================

async function getPostgresPool(dbUrl: string): Promise<Pool> {
  return new Pool({ connectionString: dbUrl });
}

async function testPostgresConnection(
  dbUrl: string
): Promise<ConnectionResult> {
  let pool: Pool | undefined;
  let client: PoolClient | undefined;
  try {
    pool = await getPostgresPool(dbUrl);
    client = await pool.connect();
    const tableCreationResult = await createColumnTableForPostgres(client);
    if (!tableCreationResult.success) {
      return {
        success: false,
        message: `PostgreSQL connected, but failed to create table: ${tableCreationResult.message}`,
        error: tableCreationResult.error,
      };
    }
    return {
      success: true,
      message:
        "Successfully connected to PostgreSQL. Table 'column_classifications' is ready.",
    };
  } catch (err) {
    const error = err as Error;
    return {
      success: false,
      message: `PostgreSQL connection failed: ${error.message}`,
      error: error.message,
    };
  } finally {
    client?.release();
    if (pool)
      await pool.end().catch((e) => console.error("Error ending PG pool", e));
  }
}

async function createColumnTableForPostgres(
  client: PoolClient
): Promise<Omit<ActionResult, "data">> {
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS column_classifications (
        id TEXT PRIMARY KEY, column_name TEXT NOT NULL, description TEXT, ndmo_classification TEXT, reason_ndmo TEXT,
        pii BOOLEAN DEFAULT FALSE, phi BOOLEAN DEFAULT FALSE, pfi BOOLEAN DEFAULT FALSE,
        psi BOOLEAN DEFAULT FALSE, pci BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    // Attempt to remove UNIQUE constraint if it exists from older versions
    try {
      await client.query(
        `ALTER TABLE column_classifications DROP CONSTRAINT IF EXISTS column_classifications_column_name_key;`
      );
    } catch (e) {
      // It's okay if this fails, it means the constraint didn't exist.
      console.log(
        "Could not drop unique constraint (it may not have existed)."
      );
    }

    await client.query(
      `ALTER TABLE column_classifications ADD COLUMN IF NOT EXISTS pci BOOLEAN DEFAULT FALSE;`
    );
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
      BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
      $$ language 'plpgsql';
    `);
    await client.query(`
      DROP TRIGGER IF EXISTS update_column_classifications_updated_at ON column_classifications;
      CREATE TRIGGER update_column_classifications_updated_at BEFORE UPDATE ON column_classifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    return {
      success: true,
      message: "PostgreSQL table checked/created successfully.",
    };
  } catch (err) {
    const error = err as Error;
    return {
      success: false,
      message: "Failed to create PostgreSQL table.",
      error: error.message,
    };
  }
}

async function fetchPostgresColumns(
  dbUrl: string
): Promise<ActionResult & { data?: ColumnData[] }> {
  let pool: Pool | undefined;
  try {
    pool = await getPostgresPool(dbUrl);
    const res = await pool.query(
      "SELECT id, column_name, description, ndmo_classification,reason_ndmo, pii, phi, pfi, psi, pci FROM column_classifications ORDER BY column_name ASC"
    );
    const columns: ColumnData[] = res.rows.map((row) => ({
      id: row.id,
      columnName: row.column_name,
      description: row.description || "",
      ndmoClassification: row.ndmo_classification,
      reason_ndmo: row.reason_ndmo,
      pii: row.pii,
      phi: row.phi,
      pfi: row.pfi,
      psi: row.psi,
      pci: row.pci,
    }));
    return { success: true, data: columns };
  } catch (err) {
    const error = err as Error;
    return {
      success: false,
      message: "Failed to fetch columns from PostgreSQL.",
      error: error.message,
      data: [],
    };
  } finally {
    if (pool)
      await pool.end().catch((e) => console.error("Error ending PG pool", e));
  }
}

async function insertPostgresColumn(
  dbUrl: string,
  column: Omit<ColumnData, "id"> & { id?: string }
): Promise<ActionResult & { data?: ColumnData }> {
  let pool: Pool | undefined;
  const columnId = column.id || crypto.randomUUID();
  try {
    pool = await getPostgresPool(dbUrl);
    const query = `
      INSERT INTO column_classifications (id, column_name, description, ndmo_classification,reason_ndmo, pii, phi, pfi, psi, pci)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *;
    `;
    const values = [
      columnId,
      column.columnName,
      column.description,
      column.ndmoClassification,
      column.reason_ndmo,
      column.pii,
      column.phi,
      column.pfi,
      column.psi,
      column.pci,
    ];
    const res = await pool.query(query, values);
    const newColumn: ColumnData = {
      ...res.rows[0],
      columnName: res.rows[0].column_name,
    };
    return {
      success: true,
      message: "Column inserted successfully.",
      data: newColumn,
    };
  } catch (err) {
    const error = err as Error;
    let userMessage = error.message.includes("duplicate key")
      ? `Column "${column.columnName}" already exists.`
      : "Failed to insert column.";
    return { success: false, message: userMessage, error: error.message };
  } finally {
    if (pool)
      await pool.end().catch((e) => console.error("Error ending PG pool", e));
  }
}

async function batchInsertPostgresColumns(
  dbUrl: string,
  columns: ColumnData[]
): Promise<ActionResult> {
  let pool: Pool | undefined;
  let client: PoolClient | undefined;
  try {
    pool = await getPostgresPool(dbUrl);
    client = await pool.connect();
    await client.query("BEGIN");
    const query = `
            INSERT INTO column_classifications (id, column_name, description, ndmo_classification,reason_ndmo, pii, phi, pfi, psi, pci)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,$10);
        `;
    for (const column of columns) {
      await client.query(query, [
        column.id || crypto.randomUUID(),
        column.columnName,
        column.description,
        column.ndmoClassification,
        column.reason_ndmo,
        column.pii,
        column.phi,
        column.pfi,
        column.psi,
        column.pci,
      ]);
    }
    await client.query("COMMIT");
    return { success: true, message: "Batch insert completed successfully." };
  } catch (err) {
    const error = err as Error;
    if (client) await client.query("ROLLBACK");
    return {
      success: false,
      message: "Batch insert transaction failed and was rolled back.",
      error: error.message,
    };
  } finally {
    client?.release();
    if (pool)
      await pool.end().catch((e) => console.error("Error ending PG pool", e));
  }
}

async function updatePostgresColumn(
  dbUrl: string,
  column: ColumnData
): Promise<ActionResult & { data?: ColumnData }> {
  let pool: Pool | undefined;
  try {
    pool = await getPostgresPool(dbUrl);
    const query = `UPDATE column_classifications SET description = $2, ndmo_classification = $3, reason_ndmo=$4, pii = $5, phi = $6, pfi = $7, psi = $8, pci = $9, updated_at = NOW() WHERE id = $1 RETURNING *;`;
    const values = [
      column.id,
      column.description,
      column.ndmoClassification,
      column.reason_ndmo,
      column.pii,
      column.phi,
      column.pfi,
      column.psi,
      column.pci,
    ];
    const res = await pool.query(query, values);
    if (res.rows.length === 0)
      return { success: false, message: "Column not found for update." };
    const updatedColumn: ColumnData = {
      ...res.rows[0],
      columnName: res.rows[0].column_name,
    };
    return { success: true, message: "Column updated.", data: updatedColumn };
  } catch (err) {
    const error = err as Error;
    return {
      success: false,
      message: "Failed to update column.",
      error: error.message,
    };
  } finally {
    if (pool)
      await pool.end().catch((e) => console.error("Error ending PG pool", e));
  }
}

async function deletePostgresColumn(
  dbUrl: string,
  id: string
): Promise<ActionResult> {
  let pool: Pool | undefined;
  try {
    pool = await getPostgresPool(dbUrl);
    const res = await pool.query(
      "DELETE FROM column_classifications WHERE id = $1",
      [id]
    );
    if (res.rowCount === 0)
      return { success: false, message: "Column not found for deletion." };
    return { success: true, message: "Column deleted." };
  } catch (err) {
    const error = err as Error;
    return {
      success: false,
      message: "Failed to delete column.",
      error: error.message,
    };
  } finally {
    if (pool)
      await pool.end().catch((e) => console.error("Error ending PG pool", e));
  }
}

async function deleteAllPostgresColumns(dbUrl: string): Promise<ActionResult> {
  let pool: Pool | undefined;
  try {
    pool = await getPostgresPool(dbUrl);
    await pool.query("TRUNCATE TABLE column_classifications;");
    return { success: true, message: "All columns deleted." };
  } catch (err) {
    const error = err as Error;
    return {
      success: false,
      message: "Failed to delete all columns.",
      error: error.message,
    };
  } finally {
    if (pool)
      await pool.end().catch((e) => console.error("Error ending PG pool", e));
  }
}

// =================================================================
// Oracle Implementation
// =================================================================

function parseOracleUrl(dbUrl: string): oracledb.ConnectionAttributes {
  try {
    // Standard URL format: oracle://user:pass@host:port/service_name
    if (dbUrl.startsWith("oracle://")) {
      const url = new URL(dbUrl.replace(/^oracle:\/\//, "http://"));
      return {
        user: url.username,
        password: url.password,
        connectString: `${url.hostname}:${url.port || 1521}${url.pathname}`,
      };
    }
    // Easy Connect format: user/pass@host:port/service
    if (dbUrl.includes("@") && dbUrl.includes("/")) {
      const parts = dbUrl.split("@");
      const [user, password] = parts[0].split("/");
      return { user, password, connectString: parts[1] };
    }
    throw new Error("Invalid format");
  } catch (e) {
    throw new Error(
      "Invalid Oracle URL format. Use `oracle://user:pass@host:port/service_name` or `user/pass@host:port/service_name`."
    );
  }
}

async function getOracleConnection(dbUrl: string): Promise<Connection> {
  const connectionAttrs = parseOracleUrl(dbUrl);
  oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT; // Get results as objects
  oracledb.fetchAsString = [oracledb.CLOB]; // Fetch CLOBs as strings
  return oracledb.getConnection(connectionAttrs);
}

const mapOracleRowToColumnData = (row: any): ColumnData => ({
  id: row.ID,
  columnName: row.COLUMN_NAME,
  description: row.DESCRIPTION || "",
  ndmoClassification: row.NDMO_CLASSIFICATION,
  reason_ndmo: row.REASON_NDMO,
  pii: row.PII === 1,
  phi: row.PHI === 1,
  pfi: row.PFI === 1,
  psi: row.PSI === 1,
  pci: row.PCI === 1,
});

async function testOracleConnection(dbUrl: string): Promise<ConnectionResult> {
  let connection: Connection | undefined;
  try {
    connection = await getOracleConnection(dbUrl);
    const tableCreationResult = await createColumnTableForOracle(connection);
    if (!tableCreationResult.success) {
      return {
        success: false,
        message: `Oracle connected, but failed to create table: ${tableCreationResult.message}`,
        error: tableCreationResult.error,
      };
    }
    return {
      success: true,
      message:
        "Successfully connected to Oracle. Table 'COLUMN_CLASSIFICATIONS' is ready.",
    };
  } catch (err) {
    const error = err as Error;
    return {
      success: false,
      message: `Oracle connection failed: ${error.message}`,
      error: error.message,
    };
  } finally {
    if (connection) await connection.close();
  }
}

async function createColumnTableForOracle(
  connection: Connection
): Promise<Omit<ActionResult, "data">> {
  try {
    const checkTable = await connection.execute(
      `SELECT table_name FROM user_tables WHERE table_name = 'COLUMN_CLASSIFICATIONS'`
    );
    if (checkTable.rows && checkTable.rows.length === 0) {
      await connection.execute(`
          CREATE TABLE COLUMN_CLASSIFICATIONS (
            id VARCHAR2(36) PRIMARY KEY, column_name VARCHAR2(255) NOT NULL, description NVARCHAR2(4000),
            ndmo_classification VARCHAR2(50),reason_ndmo VARCHAR2(50), pii NUMBER(1) DEFAULT 0, phi NUMBER(1) DEFAULT 0,
            pfi NUMBER(1) DEFAULT 0, psi NUMBER(1) DEFAULT 0, pci NUMBER(1) DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          )`);
      await connection.execute(`
          CREATE OR REPLACE TRIGGER update_col_class_updated_at BEFORE UPDATE ON COLUMN_CLASSIFICATIONS FOR EACH ROW
          BEGIN :NEW.updated_at := CURRENT_TIMESTAMP; END;`);
    } else {
      // Table exists, check for unique constraint on column_name and drop if it exists
      try {
        await connection.execute(`
                DECLARE
                   v_constraint_name VARCHAR2(100);
                BEGIN
                   SELECT constraint_name INTO v_constraint_name
                   FROM user_cons_columns
                   WHERE table_name = 'COLUMN_CLASSIFICATIONS'
                     AND column_name = 'COLUMN_NAME'
                     AND position = 1
                     AND constraint_name IN (SELECT constraint_name FROM user_constraints WHERE constraint_type = 'U');
                   
                   IF v_constraint_name IS NOT NULL THEN
                      EXECUTE IMMEDIATE 'ALTER TABLE COLUMN_CLASSIFICATIONS DROP CONSTRAINT ' || v_constraint_name;
                   END IF;
                EXCEPTION
                   WHEN NO_DATA_FOUND THEN
                      NULL; -- Constraint doesn't exist, do nothing
                END;
            `);
      } catch (e) {
        console.log(
          "Could not drop Oracle unique constraint (it may not have existed)."
        );
      }

      const checkPci = await connection.execute(
        `SELECT count(*) as COUNT from user_tab_columns where table_name = 'COLUMN_CLASSIFICATIONS' and column_name = 'PCI'`
      );
      // @ts-ignore
      if (checkPci.rows[0].COUNT === 0) {
        await connection.execute(
          `ALTER TABLE COLUMN_CLASSIFICATIONS ADD (pci NUMBER(1) DEFAULT 0)`
        );
      }
    }
    await connection.commit();
    return {
      success: true,
      message: "Oracle table checked/created successfully.",
    };
  } catch (err) {
    const error = err as Error;
    return {
      success: false,
      message: "Failed to create Oracle table.",
      error: error.message,
    };
  }
}

async function fetchOracleColumns(
  dbUrl: string
): Promise<ActionResult & { data?: ColumnData[] }> {
  let connection: Connection | undefined;
  try {
    connection = await getOracleConnection(dbUrl);
    const result = await connection.execute(
      "SELECT * FROM COLUMN_CLASSIFICATIONS ORDER BY COLUMN_NAME ASC"
    );
    const columns: ColumnData[] = result.rows
      ? (result.rows as any[]).map(mapOracleRowToColumnData)
      : [];
    return { success: true, data: columns };
  } catch (err) {
    const error = err as Error;
    return {
      success: false,
      message: "Failed to fetch columns from Oracle.",
      error: error.message,
      data: [],
    };
  } finally {
    if (connection) await connection.close();
  }
}

async function insertOracleColumn(
  dbUrl: string,
  column: Omit<ColumnData, "id"> & { id?: string }
): Promise<ActionResult & { data?: ColumnData }> {
  let connection: Connection | undefined;
  const columnId = column.id || crypto.randomUUID();
  try {
    connection = await getOracleConnection(dbUrl);
    const sql = `
        INSERT INTO COLUMN_CLASSIFICATIONS (id, column_name, description, ndmo_classification,reason_ndmo, pii, phi, pfi, psi, pci)
        VALUES (:id, :columnName, :description, :ndmoClassification,:reason_ndmo, :pii, :phi, :pfi, :psi, :pci)
    `;
    const binds = {
      id: columnId,
      ...column,
      pii: column.pii ? 1 : 0,
      phi: column.phi ? 1 : 0,
      pfi: column.pfi ? 1 : 0,
      psi: column.psi ? 1 : 0,
      pci: column.pci ? 1 : 0,
    };
    await connection.execute(sql, binds, { autoCommit: true });
    const newColumn: ColumnData = { ...column, id: columnId };
    return {
      success: true,
      message: "Column inserted into Oracle.",
      data: newColumn,
    };
  } catch (err) {
    const error = err as Error;
    let userMessage =
      (error as any).errorNum === 1
        ? `Column "${column.columnName}" already exists.`
        : "Failed to insert column into Oracle.";
    return { success: false, message: userMessage, error: error.message };
  } finally {
    if (connection) await connection.close();
  }
}

async function batchInsertOracleColumns(
  dbUrl: string,
  columns: ColumnData[]
): Promise<ActionResult> {
  let connection: Connection | undefined;
  try {
    connection = await getOracleConnection(dbUrl);
    const sql = `
            INSERT INTO COLUMN_CLASSIFICATIONS (id, column_name, description, ndmo_classification,reason_ndmo, pii, phi, pfi, psi, pci)
            VALUES (:id, :columnName, :description, :ndmoClassification, :reason_ndmo, :pii, :phi, :pfi, :psi, :pci)
        `;
    const binds = columns.map((c) => ({
      id: c.id || crypto.randomUUID(),
      columnName: c.columnName,
      description: c.description,
      ndmoClassification: c.ndmoClassification,
      reason_ndmo: c.reason_ndmo,
      pii: c.pii ? 1 : 0,
      phi: c.phi ? 1 : 0,
      pfi: c.pfi ? 1 : 0,
      psi: c.psi ? 1 : 0,
      pci: c.pci ? 1 : 0,
    }));
    await connection.executeMany(sql, binds, {
      autoCommit: true,
      bindDefs: {
        id: { type: oracledb.STRING, maxSize: 36 },
        columnName: { type: oracledb.STRING, maxSize: 255 },
        description: { type: oracledb.STRING, maxSize: 4000 },
        ndmoClassification: { type: oracledb.STRING, maxSize: 50 },
        reason_ndmo: { type: oracledb.STRING, maxSize: 50 },
        pii: { type: oracledb.NUMBER },
        phi: { type: oracledb.NUMBER },
        pfi: { type: oracledb.NUMBER },
        psi: { type: oracledb.NUMBER },
        pci: { type: oracledb.NUMBER },
      },
    });
    return { success: true, message: "Oracle batch insert completed." };
  } catch (err) {
    const error = err as Error;
    return {
      success: false,
      message: "Oracle batch insert failed.",
      error: error.message,
    };
  } finally {
    if (connection) await connection.close();
  }
}

async function updateOracleColumn(
  dbUrl: string,
  column: ColumnData
): Promise<ActionResult & { data?: ColumnData }> {
  let connection: Connection | undefined;
  try {
    connection = await getOracleConnection(dbUrl);
    const sql = `
        UPDATE COLUMN_CLASSIFICATIONS SET description = :description, ndmo_classification = :ndmoClassification,reason_ndmo:reason_ndmo,
        pii = :pii, phi = :phi, pfi = :pfi, psi = :psi, pci = :pci WHERE id = :id`;
    const binds = {
      ...column,
      pii: column.pii ? 1 : 0,
      phi: column.phi ? 1 : 0,
      pfi: column.pfi ? 1 : 0,
      psi: column.psi ? 1 : 0,
      pci: column.pci ? 1 : 0,
    };
    const result = await connection.execute(sql, binds, { autoCommit: true });
    if (result.rowsAffected === 0)
      return {
        success: false,
        message: "Column not found in Oracle for update.",
      };
    return {
      success: true,
      message: "Column updated in Oracle.",
      data: column,
    };
  } catch (err) {
    const error = err as Error;
    return {
      success: false,
      message: "Failed to update column in Oracle.",
      error: error.message,
    };
  } finally {
    if (connection) await connection.close();
  }
}

async function deleteOracleColumn(
  dbUrl: string,
  id: string
): Promise<ActionResult> {
  let connection: Connection | undefined;
  try {
    connection = await getOracleConnection(dbUrl);
    const result = await connection.execute(
      "DELETE FROM COLUMN_CLASSIFICATIONS WHERE id = :id",
      { id },
      { autoCommit: true }
    );
    if (result.rowsAffected === 0)
      return {
        success: false,
        message: "Column not found in Oracle for deletion.",
      };
    return { success: true, message: "Column deleted from Oracle." };
  } catch (err) {
    const error = err as Error;
    return {
      success: false,
      message: "Failed to delete column from Oracle.",
      error: error.message,
    };
  } finally {
    if (connection) await connection.close();
  }
}

async function deleteAllOracleColumns(dbUrl: string): Promise<ActionResult> {
  let connection: Connection | undefined;
  try {
    connection = await getOracleConnection(dbUrl);
    await connection.execute(
      "TRUNCATE TABLE COLUMN_CLASSIFICATIONS",
      {},
      { autoCommit: true }
    );
    return { success: true, message: "All columns deleted from Oracle." };
  } catch (err) {
    const error = err as Error;
    return {
      success: false,
      message: "Failed to delete all columns from Oracle.",
      error: error.message,
    };
  } finally {
    if (connection) await connection.close();
  }
}
