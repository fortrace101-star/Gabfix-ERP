import type { Pool, PoolClient } from 'pg';
import { pool } from '../db';
import { JSONB_COLUMNS, TABLE_COLUMNS, TABLE_ORDER, TRUNCATE_TABLES, insertSql, placeholderId, snake, toColumns } from '../lib/tables';

/** Either the shared pool or a transaction client. */
type Executor = Pool | PoolClient;

/** Insert one row for a known table and return its primary key. */
export async function insertRecord(table: string, body: Record<string, unknown>, id: string, executor: Executor = pool): Promise<string> {
  const { rows } = await executor.query(insertSql(table, toColumns(table, body), id));
  return rows[0].id as string;
}

/** Update one row; returns the number of rows changed (0 when the id is unknown). */
export async function updateRecord(table: string, id: string, body: Record<string, unknown>): Promise<number> {
  const entries = toColumns(table, body);
  const sets = entries.map(([column], index) => `"${column}" = $${index + 1}`).join(', ');
  const { rowCount } = await pool.query(
    `UPDATE ${table} SET ${sets} WHERE id = $${entries.length + 1}`,
    [...entries.map(([, value]) => value), id],
  );
  return rowCount ?? 0;
}

/**
 * Tables that a workspace wipe must never lose. `employees.branch_id` references
 * `branches`, so `TRUNCATE ... CASCADE` reaches identity rows (and `devices`
 * through `employees`) even though they are not in TRUNCATE_TABLES.
 */
const IDENTITY_TABLES = ['employees', 'devices'];

/** Re-insert rows deleted by a cascading truncate, keeping ids and timestamps. */
async function restoreRows(client: Executor, table: string, rows: Record<string, unknown>[]): Promise<void> {
  if (!rows.length) return;
  const columns = Object.keys(rows[0]);
  const columnList = columns.map((column) => `"${column}"`).join(', ');
  for (const row of rows) {
    const values = columns.map((column) => row[column]);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
    await client.query(
      `INSERT INTO ${table} (${columnList}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`,
      values,
    );
  }
}

/** Delete every managed row, leaving the schema and identity data intact. */
export async function truncateWorkspace(client: Executor): Promise<void> {
  const identity: [string, Record<string, unknown>[]][] = [];
  for (const table of IDENTITY_TABLES) {
    const { rows } = await client.query(`SELECT * FROM ${table}`);
    identity.push([table, rows]);
  }

  await client.query(`TRUNCATE ${TRUNCATE_TABLES.join(', ')} CASCADE`);

  // Restore staff logins and devices wiped by the cascade, parents first. This
  // runs inside the caller's transaction, so a failed import/reset rolls the
  // whole wipe back rather than leaving identity rows behind.
  for (const [table, rows] of identity) await restoreRows(client, table, rows);
}

/**
 * Replace the whole workspace from a backup payload (POST /api/import).
 * Caller owns the transaction.
 */
export async function replaceAll(client: PoolClient, payload: Record<string, unknown>): Promise<void> {
  for (const [table, dataKey] of TABLE_ORDER) {
    const rows = payload[dataKey];
    if (!Array.isArray(rows)) continue;
    const allowed = TABLE_COLUMNS[table];
    for (const row of rows as Record<string, unknown>[]) {
      const entries: [string, unknown][] = [];
      for (const [key, value] of Object.entries(row)) {
        const column = snake(key);
        if (!allowed.includes(column)) continue;
        entries.push([column, JSONB_COLUMNS.has(column) ? JSON.stringify(value ?? []) : value]);
      }
      const id = typeof row.id === 'string' && row.id ? row.id : placeholderId(table);
      await client.query(insertSql(table, entries, id));
    }
  }
}
