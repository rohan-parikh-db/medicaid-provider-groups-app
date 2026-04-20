# Provider Groups (Medicaid Subset) — Databricks App

A single-page spreadsheet-style UI for managing a Unity Catalog Delta table
of provider groups. Editable columns across color-coded groups, inline
editing, cascaded filters, CSV export, light/dark theme, per-row numbers.


---

## TL;DR — what to change to deploy in your workspace

Three workspace-specific things:

1. **`app.yaml`** — replace the four `REPLACE_WITH_*` env-var values (warehouse id, catalog, schema, table). One file.
2. **Create the backing Delta table** in your Unity Catalog (DDL at the bottom).
3. **Grant the app's service principal** access to your SQL warehouse + that table (three `GRANT` statements + one UI toggle).

Then `databricks apps deploy …`. The Databricks Apps runtime does `npm install` + build inside its own container. You only need the Databricks CLI on your laptop.

---

## TL;DR — how to add / drop / rename a column

**One file edit + one SQL command.**

1. Edit **`shared/columns.ts`** — add, remove, or rename an entry in the `COLUMNS` array (label, tooltip, group, input type, options).
2. Run **`ALTER TABLE`** against your Delta table to match.
3. Redeploy.

No changes needed in `grid.tsx`, `server/routes.ts`, `server/models.ts`, or `api.ts` — every one of those files derives its column list from `shared/columns.ts` automatically.

---

## Technology stack

```
┌─── Client (compiled at deploy time) ───────────────────────────┐
│  React 19 + TypeScript                                         │
│  Vite 7 · Tailwind 4 · shadcn/ui components                    │
│  TanStack Query + TanStack Table                               │
│  Radix UI · Sonner (toasts)                                    │
└────────────────────────────────────────────────────────────────┘
                        │  HTTPS + OAuth (handled by Databricks Apps)
                        ▼
┌─── Server (Node.js 22) ────────────────────────────────────────┐
│  @databricks/appkit 0.23.0 (createApp + plugin system)         │
│  Express 5 (via appkit's server() plugin)                      │
│  @databricks/sdk-experimental (SQL statement execution)        │
│  tsdown (server bundler)                                        │
└────────────────────────────────────────────────────────────────┘
                        │  databricks-sdk OAuth M2M (as app SP)
                        ▼
┌─── Storage ────────────────────────────────────────────────────┐
│  Databricks SQL Warehouse  (DATABRICKS_WAREHOUSE_ID)           │
│         │                                                      │
│         ▼                                                      │
│  Unity Catalog Delta table  (APP_CATALOG.APP_SCHEMA.APP_TABLE) │
└────────────────────────────────────────────────────────────────┘
```

---

## Folder / file tour

### Top-level configuration

| File | Purpose | Will you edit? |
|---|---|---|
| `README.md` | This file. | No |
| `app.yaml` | Runtime startup manifest + 4 env-var values. | ✅ **Yes** (4 `REPLACE_WITH_*` values per workspace) |
| `package.json` | Node.js deps + build scripts. | Rarely (only to add/remove an npm dep) |
| `package-lock.json` | Auto-generated on `npm install`. Pins exact versions. | No |
| `tsconfig.json` + `tsconfig.{shared,server,client}.json` | TypeScript configs. Strict mode; `@/*` and `@shared/*` path aliases. | No |
| `tsdown.server.config.ts` | How `tsdown` bundles the server. | No |
| `.gitignore` | Standard ignores. | No |

### `shared/` — single source of truth for data columns

| File | Purpose | Will you edit? |
|---|---|---|
| `shared/columns.ts` | **THE column definition file.** One `ColumnDef` entry per column: key, label, tooltip definition, group, input type, dropdown options, width. Also defines `COLUMN_GROUPS` (colored pills in the toolbar). Both server and client import from here — nothing else needs editing when you change the column set. | ✅ **Yes** — when adding / removing / renaming a column |

### `server/` — Node.js backend (5 files, ~350 LoC)

| File | Purpose | Will you edit? |
|---|---|---|
| `server/server.ts` | AppKit entry point — `createApp({ plugins: [server(), analytics()] })`, then registers the custom Express routes. | Only to add a new AppKit plugin |
| `server/config.ts` | Reads 4 env vars from `app.yaml`. Fails loudly at startup if any is missing or still has the `REPLACE_WITH_*` placeholder. | Only to add a new required env var |
| `server/models.ts` | Re-exports `IDENTITY_FIELDS`, `EDITABLE_FIELDS`, `ALL_DATA_FIELDS` from `shared/columns.ts` so the server side doesn't duplicate the column list. | **No** — just imports from shared |
| `server/routes.ts` | The REST endpoints: `GET /api/version`, `GET /api/me`, `GET /api/providers` (list), `GET /api/providers/:id`, `POST /api/providers`, `PATCH /api/providers/:id`. All SQL inline and parameterized. Iterates `ALL_DATA_FIELDS` for inserts/updates → adding a column in `shared/columns.ts` propagates through automatically. | Only to add an endpoint or change SQL behavior |
| `server/sql.ts` | `executeSql()` — wraps `statementExecution.executeStatement` in the Databricks SDK. | Rarely |

### `client/` — React frontend

| Path | Purpose | Will you edit? |
|---|---|---|
| `client/index.html` | HTML shell. | Only for favicon/title |
| `client/vite.config.ts` | Vite config — React + Tailwind plugins, `@/` and `@shared/` aliases. | No |
| `client/public/logo.svg` | App icon. | Yes if rebranding |
| `client/src/main.tsx` | React root — wires up React Query, ThemeProvider, TooltipProvider. | Rarely |
| `client/src/vite-env.d.ts` | Vite + `__APP_NAME__` type declarations. | No |
| `client/src/routes/grid.tsx` | **The entire grid UI** (~900 LoC). Now iterates `COLUMNS` from `shared/columns.ts` to build the column definitions, tooltips, filter options, CSV headers, and the inline-add form — all dynamically. | Only for UI behavior changes (column widths come from `shared/columns.ts`; change there) |
| `client/src/lib/api.ts` | React Query hooks (`useListProviders` / `useCreateProvider` / `useUpdateProvider`). Types use an index signature so any column in `shared/columns.ts` is accepted implicitly. | No (index signature auto-accepts new columns) |
| `client/src/lib/utils.ts` | `cn()` helper (standard shadcn). | No |
| `client/src/lib/selector.ts` | React Query selector — unwraps `{ data: T }` → `T`. | No |
| `client/src/hooks/use-mobile.ts` | Responsive-breakpoint hook. | No |
| `client/src/styles/globals.css` | Tailwind imports + CSS variables + scrollbar styling. | Yes for theming |
| `client/src/components/theme/theme-provider.tsx` | Dark/light theme context. | No |
| `client/src/components/theme-toggle.tsx` | The sun/moon button. | Rarely |
| `client/src/components/ui/*.tsx` | shadcn/ui primitives — `button`, `select`, `dialog`, `tooltip`, etc. **Treat as stdlib — don't edit.** | No |

### `config/queries/` — empty, reserved

AppKit's `analytics()` plugin supports type-safe `.sql` files here. This app doesn't use them (all SQL is in `server/routes.ts`), but the directory is kept so you can add read-only dashboard queries later.

### `dist/`, `client/dist/`, `node_modules/`

All generated by `npm run build` / `npm ci` — in `.gitignore`, not committed. The Databricks Apps container creates them at deploy time.

---

## Config — everything workspace-specific is in `app.yaml`

```yaml
command:
  - "sh"
  - "-c"
  - "set -e; (test -d node_modules || npm ci --no-audit --no-fund) && (test -d dist || npm run build) && npm run start"

env:
  - name: DATABRICKS_WAREHOUSE_ID      # SQL warehouse ID in your workspace
    value: "REPLACE_WITH_YOUR_WAREHOUSE_ID"
  - name: APP_CATALOG                  # Unity Catalog catalog name
    value: "REPLACE_WITH_YOUR_CATALOG"
  - name: APP_SCHEMA                   # Schema inside that catalog
    value: "REPLACE_WITH_YOUR_SCHEMA"
  - name: APP_TABLE                    # Table name (no dots)
    value: "provider_groups"
```

| Env var | How to find the value | Example |
|---|---|---|
| `DATABRICKS_WAREHOUSE_ID` | Workspace UI → SQL Warehouses → (your warehouse) → ID from URL `…/sql/warehouses/<id>` | `9d1f2e495a296e76` |
| `APP_CATALOG` | UC catalog name | `main` |
| `APP_SCHEMA` | Schema in that catalog | `provider_mgmt` |
| `APP_TABLE` | Table name | `provider_groups` |

Full table path the server constructs: `${APP_CATALOG}.${APP_SCHEMA}.${APP_TABLE}`.

---

## Deploy guide (5 steps)

### 1. Create the backing Delta table

Run once in the SQL editor — substitute your catalog/schema. The column list below matches what's in `shared/columns.ts`. If you plan to customize the schema (add/drop columns), do that in `shared/columns.ts` FIRST, then reflect it in this DDL.

```sql
CREATE TABLE IF NOT EXISTS <your_catalog>.<your_schema>.provider_groups (
  id STRING NOT NULL,
  territory STRING, market_head STRING, state STRING,
  pbg_number STRING, pbg_name STRING,
  previously_managed_by STRING, currently_managed_by STRING,
  current_engaged STRING, latest_meeting STRING, meeting_frequency STRING,
  ioa_participation STRING,
  additional_reporting_requested STRING, member_level_reporting STRING, gap_level_reporting STRING,
  emr STRING, epic_epp STRING, epp_transition_status STRING,
  poc_solution STRING, ma_risk_proficiency STRING, comments STRING,
  created_by STRING, created_at TIMESTAMP, updated_at TIMESTAMP
) USING DELTA;
```

### 2. Create the Databricks App

```bash
databricks apps create medicaid-provider-groups-app
```

Run `databricks apps get medicaid-provider-groups-app` — note the **`service_principal_client_id`** field for step 3.

### 3. Grant the service principal access

Substitute your values in the SQL editor:

```sql
GRANT USE CATALOG ON CATALOG  <your_catalog>                               TO `<sp-client-id>`;
GRANT USE SCHEMA  ON SCHEMA  <your_catalog>.<your_schema>                  TO `<sp-client-id>`;
GRANT SELECT, MODIFY ON TABLE <your_catalog>.<your_schema>.provider_groups TO `<sp-client-id>`;
```

Grant `CAN_USE` on the SQL warehouse: Workspace UI → SQL Warehouses → Permissions → Add → Service Principal → `<sp-client-id>` → CAN_USE.

### 4. Edit `app.yaml`

Replace the four `REPLACE_WITH_*` values.

### 5. Deploy

```bash
databricks workspace import-dir --overwrite . \
  /Workspace/Users/<you>/apps/medicaid-provider-groups-app

databricks apps deploy medicaid-provider-groups-app \
  --source-code-path /Workspace/Users/<you>/apps/medicaid-provider-groups-app \
  --mode SNAPSHOT
```

The Apps container runs:
1. `npm ci --no-audit --no-fund` (~2 s — pulls ~530 packages, cache-hot)
2. `npm run build` (~20 s — tsdown + vite)
3. `npm run start` (~1 s — `node ./dist/server.js`)

First deploy: ~30 s total. Get the app URL from `databricks apps get medicaid-provider-groups-app` → `url` field.

---

## How to customize

### Add / remove / rename a data column

The entire column system is driven by one file. Steps:

1. **`shared/columns.ts`** — edit the `COLUMNS` array:
   - To **add**, insert a new `ColumnDef` entry:
     ```ts
     {
       key: "my_new_field",
       label: "My New Field",
       definition: "Tooltip text shown on hover over the header",
       group: "rating",              // or any existing group id, or null for identity-style locked
       locked: false,                // true = always-visible, required on create, read-only after
       type: "select",               // "text" | "date" | "select" | "comments"
       options: ["Yes", "No"],       // only for type:"select"
       width: 150, minWidth: 130,
     }
     ```
   - To **remove**, delete the entry.
   - To **rename**, change `key` + run `ALTER TABLE ... RENAME COLUMN old TO new`.
2. **`ALTER TABLE`** in your Delta table to match:
   ```sql
   ALTER TABLE <catalog>.<schema>.provider_groups ADD COLUMNS (my_new_field STRING);
   -- or: ALTER TABLE ... DROP COLUMN ...;
   -- or: ALTER TABLE ... RENAME COLUMN ... TO ...;
   ```
3. Re-sync + redeploy.

That's it. The grid, the API types, the CSV export, the filter dropdowns, the inline-add form, the server INSERT/UPDATE SQL — every one of those reflects the new column automatically because they all iterate `COLUMNS` from `shared/columns.ts`.

### Add / rename / recolor a column group

Edit the `COLUMN_GROUPS` array in `shared/columns.ts`. Change the Tailwind `color`, `borderColor`, `bgTint` classes. Reference the new group id in individual column entries.

### Change a dropdown option list

Edit the named constants in `shared/columns.ts` (e.g. `EMR_OPTIONS`, `IOA_OPTIONS`). Every column referencing that constant updates.

### Change column widths

Edit the `width` / `minWidth` fields on the column in `shared/columns.ts`.

### Change page size (rows per page)

`client/src/routes/grid.tsx` — search for `pageSize: 50` in the `useReactTable({ initialState: ... })` block.

### Change filter behavior (cascaded filters, global search, etc.)

`client/src/routes/grid.tsx` — the `applyFilters()` helper and the `territoryOptions` / `marketHeadOptions` / etc. `useMemo` blocks drive the cascading-filter logic.

---

## Network requirements at deploy time

**Deploy-time:** the Databricks Apps container runs `npm ci`, which pulls ~530 packages. It needs access to an npm registry — either public `registry.npmjs.org` or your internal mirror (JFrog / Artifactory / Nexus). Drop a `.npmrc` at the repo root if you want to force a specific registry:

```
# .npmrc at repo root
registry=https://<your-internal-npm-mirror>/repository/npm-proxy/
```

Most enterprise mirrors proxy public npm transparently, so every package in `package.json` resolves the same way — just through your mirror.

After the first successful deploy in a workspace, the container's npm cache speeds up subsequent installs to a few seconds.

**Runtime:** once running, the app only talks to your workspace's SQL warehouse and Unity Catalog. No external calls.

### If your container can't reach any npm registry

Fallback: run `npm ci` once on a machine with network access (developer laptop, a Databricks notebook cluster, CI runner), then upload the repo **including `node_modules/`** to the workspace. The `test -d node_modules || npm ci` guard in `app.yaml` will skip the install and use your vendored packages. Adds ~150 MB to the upload.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Deploy fails with `error TS2307: Cannot find module …` | Import references a package not in `package.json` | `npm install <pkg>` locally, commit, redeploy |
| `/api/providers` returns 500 | SP missing warehouse `CAN_USE` or UC `SELECT` grants | Re-run the `GRANT` statements |
| `Missing or placeholder env var '…'` on startup | A `REPLACE_WITH_*` value in `app.yaml` wasn't changed | Edit `app.yaml`, redeploy |
| Grid shows empty | Table is empty | Use the inline "+" row or `INSERT INTO …` |
| Changes not showing up | Browser cached `index.html` | Cmd/Ctrl + Shift + R |
| `npm ci` fails with network errors | Apps container can't reach any npm registry | Configure `.npmrc` pointing at internal mirror, OR ship `node_modules/` pre-populated |

---

## File quick-reference (printable cheatsheet)

```
app.yaml                                 ← EDIT (4 env-var values)
package.json                             npm deps + build scripts
tsconfig.*.json                          typescript configs (don't touch)
tsdown.server.config.ts                  server bundler (don't touch)

shared/
└── columns.ts                           ← EDIT HERE to add/drop/rename columns

server/
├── server.ts                            appkit entry (don't touch)
├── config.ts                            env-var reader
├── models.ts                            re-exports column lists from shared
├── routes.ts                            REST endpoints + SQL
└── sql.ts                               SDK wrapper

client/
├── index.html
├── vite.config.ts
├── public/logo.svg                      ← rebrand here
└── src/
    ├── main.tsx                         React root
    ├── routes/grid.tsx                  the UI (iterates over COLUMNS)
    ├── lib/api.ts                       React Query hooks + types
    ├── lib/utils.ts, selector.ts        helpers
    ├── hooks/use-mobile.ts
    ├── styles/globals.css               ← EDIT for visual theme
    └── components/
        ├── theme/theme-provider.tsx     dark/light context
        ├── theme-toggle.tsx
        └── ui/*.tsx                     shadcn primitives (don't touch)

config/queries/                          (empty; reserved for future SQL files)
```
