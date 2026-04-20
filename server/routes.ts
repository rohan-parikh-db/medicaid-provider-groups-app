/**
 * Custom Express routes for the provider_groups CRUD API.
 *
 * Registered against AppKit's server plugin via appkit.server.extend().
 * All SQL goes through server/sql.ts, which uses @databricks/sdk-experimental.
 */

import type { Application } from 'express';
import { randomUUID } from 'node:crypto';
import { TABLE } from './config';
import { executeSql, SqlParam, SqlRow } from './sql';
import {
  ALL_DATA_FIELDS,
  EDITABLE_FIELDS,
  IDENTITY_FIELDS,
  ProviderGroupOut,
} from './models';

// ---------------------------------------------------------------------------
// Row parsing
// ---------------------------------------------------------------------------

function parseRow(row: SqlRow): ProviderGroupOut {
  const out: ProviderGroupOut = {
    id: row.id ?? "",
    created_by: row.created_by ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
  // Copy every data field from the SQL row — identity + editable — using the
  // column list from shared/columns.ts. Adding a column there = it flows
  // through here automatically.
  for (const f of ALL_DATA_FIELDS) {
    out[f] = row[f] ?? null;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Route registration
// ---------------------------------------------------------------------------

export function registerRoutes(app: Application): void {
  app.get('/api/version', (_req, res) => {
    res.json({ version: '1.0.0' });
  });

  app.get('/api/me', (req, res) => {
    const email = (req.headers['x-forwarded-email'] as string) || 'anonymous';
    res.json({ email: email.trim() });
  });

  // Column tooltips sourced from Unity Catalog column comments.
  // Returns a map of { column_key: comment_text } for columns that have a
  // comment set in UC. The client merges these over the `definition` fallback
  // in shared/columns.ts — so the data team can maintain tooltips entirely
  // through `ALTER TABLE ... ALTER COLUMN ... COMMENT '...'` without touching code.
  //
  // Cached in-process for 5 minutes (the DESCRIBE query is cheap but pointless
  // to hammer — table schema rarely changes).
  let schemaCache: { expires: number; data: Record<string, string> } | null = null;
  app.get('/api/schema', async (_req, res) => {
    try {
      const now = Date.now();
      if (schemaCache && schemaCache.expires > now) {
        res.json({ column_comments: schemaCache.data });
        return;
      }
      const rows = await executeSql(`DESCRIBE TABLE ${TABLE}`);
      const comments: Record<string, string> = {};
      for (const r of rows) {
        const name = (r.col_name ?? '').trim();
        const comment = (r.comment ?? '').trim();
        // Skip non-column rows DESCRIBE can return (empty lines, "# Partition
        // Information" header, etc.)
        if (!name || name.startsWith('#') || !comment) continue;
        comments[name] = comment;
      }
      schemaCache = { expires: now + 5 * 60_000, data: comments };
      res.json({ column_comments: comments });
    } catch (err) {
      console.error('getSchema failed:', err);
      // Don't fail the app just because UC comments aren't readable — return
      // an empty map and let the client fall back to hardcoded definitions.
      res.json({ column_comments: {} });
    }
  });

  // List all providers. Client does sort/filter in-browser.
  app.get('/api/providers', async (_req, res) => {
    try {
      // Stable order: primary by created_at (newest first), tiebreak on id.
      // The tiebreak is important because bulk-seeded rows can share a
      // timestamp — without it, Spark may return same-timestamp rows in
      // non-deterministic order across queries, making the grid appear to
      // "reshuffle" after every edit.
      const rows = await executeSql(`SELECT * FROM ${TABLE} ORDER BY created_at DESC, id`);
      const items = rows.map(parseRow);
      res.json({ items, total: items.length });
    } catch (err) {
      console.error('listProviders failed:', err);
      res.status(500).json({ detail: (err as Error).message });
    }
  });

  // Get one provider by id.
  app.get('/api/providers/:id', async (req, res) => {
    try {
      const rows = await executeSql(
        `SELECT * FROM ${TABLE} WHERE id = :id LIMIT 1`,
        [{ name: 'id', value: req.params.id }],
      );
      if (rows.length === 0) {
        res.status(404).json({ detail: `Provider ${req.params.id} not found` });
        return;
      }
      res.json(parseRow(rows[0]));
    } catch (err) {
      console.error('getProvider failed:', err);
      res.status(500).json({ detail: (err as Error).message });
    }
  });

  // Create a new provider. Body: { territory, market_head, state, pbg_number,
  // pbg_name, ...optional editable fields }.
  app.post('/api/providers', async (req, res) => {
    try {
      const body = (req.body ?? {}) as Record<string, string | undefined>;
      for (const f of IDENTITY_FIELDS) {
        if (!body[f]) {
          res.status(400).json({ detail: `Missing required field: ${f}` });
          return;
        }
      }

      const email = (req.headers['x-forwarded-email'] as string) || 'anonymous';
      const id = randomUUID();

      const params: SqlParam[] = [
        { name: 'id', value: id },
        { name: 'created_by', value: email.trim() },
      ];
      for (const f of ALL_DATA_FIELDS) {
        params.push({ name: f, value: body[f] ?? '' });
      }

      const cols = ['id', ...ALL_DATA_FIELDS, 'created_by', 'created_at', 'updated_at'];
      const valueExprs = [
        ':id',
        ...ALL_DATA_FIELDS.map((f) => `NULLIF(:${f}, '')`),
        ':created_by',
        'CURRENT_TIMESTAMP()',
        'CURRENT_TIMESTAMP()',
      ];

      await executeSql(
        `INSERT INTO ${TABLE} (${cols.join(', ')}) VALUES (${valueExprs.join(', ')})`,
        params,
      );

      const rows = await executeSql(
        `SELECT * FROM ${TABLE} WHERE id = :id LIMIT 1`,
        [{ name: 'id', value: id }],
      );
      if (rows.length === 0) {
        res.status(500).json({ detail: 'Failed to fetch created provider' });
        return;
      }
      res.status(201).json(parseRow(rows[0]));
    } catch (err) {
      console.error('createProvider failed:', err);
      res.status(500).json({ detail: (err as Error).message });
    }
  });

  // Update editable fields on an existing provider. Body: partial record —
  // only included fields get written.
  app.patch('/api/providers/:id', async (req, res) => {
    try {
      const body = (req.body ?? {}) as Record<string, string | undefined>;
      const updates: { field: string; value: string }[] = [];
      for (const f of EDITABLE_FIELDS) {
        if (body[f] !== undefined) {
          updates.push({ field: f, value: String(body[f] ?? '') });
        }
      }
      if (updates.length === 0) {
        res.status(400).json({ detail: 'No fields to update' });
        return;
      }

      const setClauses = updates.map((u) => `${u.field} = :${u.field}`);
      setClauses.push('updated_at = CURRENT_TIMESTAMP()');

      const params: SqlParam[] = [
        { name: 'id', value: req.params.id },
        ...updates.map((u) => ({ name: u.field, value: u.value })),
      ];

      await executeSql(
        `UPDATE ${TABLE} SET ${setClauses.join(', ')} WHERE id = :id`,
        params,
      );

      const rows = await executeSql(
        `SELECT * FROM ${TABLE} WHERE id = :id LIMIT 1`,
        [{ name: 'id', value: req.params.id }],
      );
      if (rows.length === 0) {
        res.status(404).json({ detail: `Provider ${req.params.id} not found` });
        return;
      }
      res.json(parseRow(rows[0]));
    } catch (err) {
      console.error('updateProvider failed:', err);
      res.status(500).json({ detail: (err as Error).message });
    }
  });

  // NOTE: DELETE endpoint intentionally omitted. The app is read/create/update
  // only. Re-add here if the business ever needs row removal.
}
