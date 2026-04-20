/**
 * Runtime configuration read from environment variables set in app.yaml.
 *
 * Throws loudly at server startup if any required env var is missing or still
 * has the placeholder value — so a misconfigured deploy fails fast rather
 * than silently hitting the wrong table.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.startsWith('REPLACE_WITH_')) {
    throw new Error(
      `Missing or placeholder env var '${name}'. ` +
      `Set it in app.yaml under env: before deploying. See README.`
    );
  }
  return value;
}

export const WAREHOUSE_ID = required('DATABRICKS_WAREHOUSE_ID');
export const CATALOG = required('APP_CATALOG');
export const SCHEMA = required('APP_SCHEMA');
export const TABLE_NAME = required('APP_TABLE');

/** Fully-qualified Unity Catalog table name. */
export const TABLE = `${CATALOG}.${SCHEMA}.${TABLE_NAME}`;
