/**
 * Thin wrapper around the Databricks SDK's SQL Statement Execution API.
 *
 * AppKit's analytics plugin handles the SELECT case for .sql files, but our
 * INSERT / UPDATE endpoints need direct statement execution. This module
 * provides a small executeSql() helper shared by all custom route handlers.
 */

import { WorkspaceClient } from '@databricks/sdk-experimental';
import { WAREHOUSE_ID } from './config';

/** Lazily-instantiated workspace client. */
let _ws: WorkspaceClient | null = null;

function getClient(): WorkspaceClient {
  if (_ws === null) {
    // Apps runtime injects OAuth credentials automatically (DATABRICKS_HOST,
    // DATABRICKS_CLIENT_ID, DATABRICKS_CLIENT_SECRET). The SDK picks them up.
    _ws = new WorkspaceClient({});
  }
  return _ws;
}

export interface SqlParam {
  name: string;
  value: string | null;
  type?: 'STRING';
}

export interface SqlRow {
  [column: string]: string | null;
}

/**
 * Execute a parameterized SQL statement on the configured warehouse.
 * Returns rows as an array of column-name → string maps.
 */
export async function executeSql(
  sql: string,
  parameters: SqlParam[] = [],
): Promise<SqlRow[]> {
  const ws = getClient();
  const resp = await ws.statementExecution.executeStatement({
    warehouse_id: WAREHOUSE_ID,
    statement: sql,
    parameters: parameters.map((p) => ({
      name: p.name,
      value: p.value ?? '',
      type: p.type ?? 'STRING',
    })),
    wait_timeout: '50s',
  });

  if (!resp.result?.data_array || !resp.manifest?.schema?.columns) {
    return [];
  }

  const columnNames = resp.manifest.schema.columns.map((c) => c.name ?? '');
  return resp.result.data_array.map((row) => {
    const obj: SqlRow = {};
    columnNames.forEach((col, i) => {
      obj[col] = (row[i] as string | null) ?? null;
    });
    return obj;
  });
}
