# Features

A complete list of what this app does today. Many of these are subtle — the
kind of thing users don't notice when it's working but complain about when
it's missing — so this doc calls them out explicitly.

---

## Data management

**Inline editing.** Click any editable cell, pick a value or type, press Enter
or click away. Saves to the backing Delta table immediately.

**Inline add.** A "+ Add Provider Group" row at the top of the grid expands
into a per-column input row. Tab across the fields, click the green check to
submit. No separate "Add" page.

**Comments in a modal editor.** The Comments column opens a large textarea
dialog for long-form free text, instead of cramming multi-line notes into a
grid cell.

**System-managed metadata.** Every row automatically tracks `created_by`
(from the Databricks Apps user email, via `X-Forwarded-Email`), `created_at`,
and `updated_at`. No user input required.

**Single source of truth is Unity Catalog.** The Delta table *is* the app's
database. No separate state, no sync concerns. Read or write it directly via
SQL while the app is running; the UI reflects the changes on next refresh.

---

## Grid UX

**Row numbers (1, 2, 3…) always in display order.** Sort by any column — the
data reorders, but the row-number column stays 1→N from top to bottom, like
a spreadsheet. Filter — the numbers renumber to match the filtered count.

**Sortable columns.** Click any header; ascending / descending / unsorted
cycles with visible arrow indicators.

**8 color-coded column groups** (RIPPO, Engagement, Meetings, RI Programs,
Data & Reporting, EMR, Provider Tools, Rating & Notes). Each group has its
own color that shows on the group toggle pills, in the column-header border,
and as a subtle background tint on the header cells.

**Collapsible column groups.** Click a group pill in the toolbar to show
/ hide all columns in that group. "Expand All" / "Collapse All" toggle.
Identity columns (Territory → Provider Name) and the row-number column are
always visible.

**Column search.** Type in the "Find column..." box; matches column headers,
tooltip definitions, and snake_case keys. Matched columns appear in
collapsed groups automatically.

**Global row search.** Free-text search across territory, market head,
state, provider account #, provider name, managed-by, EMR, POC solution, and
comments.

**Cascaded filters — each filter narrows the others.** Pick Territory =
"Northeast" → Market Head dropdown shrinks to only market heads present in
Northeast rows → pick one → State dropdown shrinks further. If a filter's
current value becomes invalid after another filter changes, it auto-resets
to "All".

**Dynamic filter options.** The four filter dropdowns (Territory, Market
Head, State, Managed By) compute their choices from whatever rows are
currently in the table. Add a row with `territory = "New Region"` → refresh
→ "New Region" is immediately a pickable filter value. No code change.

**Dynamic editor dropdowns.** Same idea on the editing side — cell pickers
show the union of (canonical static options) + (any novel values already
present in the data). A new territory value loaded via SQL becomes
selectable in the inline-edit UI automatically.

**Tooltips from Unity Catalog column comments.** Hover any column header to
see its description. The description is pulled from the UC column
`COMMENT` metadata first (via `DESCRIBE TABLE`), with a fallback to the
static definition in `shared/columns.ts`. Data teams can update tooltips
with just `ALTER TABLE ... ALTER COLUMN x COMMENT '...'` — no code, no
deploy.

**Stable row order across edits.** The list query is
`ORDER BY created_at DESC, id` — the `id` tiebreak ensures rows with
identical timestamps (e.g., bulk-seeded data) always come back in the same
order. Editing a cell doesn't cause the grid to reshuffle.

**Always-visible scrollbars** (12px wide, custom-styled for light + dark
modes). The grid is typically too wide to fit on screen — scrollbars appear
on both axes whether you're on macOS or not.

**Sticky toolbar + pagination.** The Columns/Rows control panel at the top
and the pagination (Page X of Y) stay pinned as you scroll the data area.
Both are outside the scrollable grid region.

**Pagination at 50 rows per page.** With navigation buttons only shown when
more than one page of data exists.

**CSV export.** Button in the header downloads the *filtered* data as a
timestamped `.csv` file with readable column names.

---

## Theming & accessibility

**Dark and light mode.** Sun/moon toggle in the header; persists via
localStorage. Every component — shadcn primitives, grid headers, dropdowns,
tooltips, dialogs, toasts — has first-class dark-mode styling.

**Responsive typography.** Tailwind `text-sm` and `text-base` sizing that
works on laptop screens without sacrificing density.

**Font: `tabular-nums`** on the row-number column so numbers align in a
clean vertical stack.

**Accessible headers.** Aria-labels on the theme toggle; cursor state +
hover background on sortable headers; keyboard-friendly forms (Enter saves,
Escape cancels in editable cells).

---

## Admin / data-team conveniences

**One-file column changes.** `shared/columns.ts` is the single source of
truth for the grid layout. Add, remove, or rename a column by editing one
entry. The server's SQL SELECT/INSERT/UPDATE, the client's types, the
tooltips, the filter dropdowns, the CSV headers, the inline-add form — all
of it regenerates automatically.

**One-file workspace targeting.** `app.yaml` is the only file a new
workspace needs to edit. Four env vars: warehouse id, catalog, schema,
table name. Every other file is business logic, not configuration.

**Loud failure on misconfig.** If any of the four env vars is missing or
still has the placeholder value, the server refuses to start with a clear
error message naming the missing variable. No silent misreads.

**UC-driven documentation.** Column comments set in Unity Catalog become
in-app tooltips. Central governance around data-field documentation maps
directly to UX.

**Service-principal auth.** The app authenticates to the SQL warehouse as
its own Databricks service principal (auto-created with the app). Grants
are managed via standard UC + warehouse permissions; no connection strings
or tokens in code.

**Per-user attribution.** The `X-Forwarded-Email` header (injected by the
Databricks Apps proxy) gets stamped into `created_by` on new rows
automatically. No separate auth integration.

---

## Developer experience

**Single-page app, no router.** React mounts `<GridPage />` directly;
there's no `<Router>`, no route tree, no dynamic imports. One file is the
entire UI.

**Strong typing end-to-end.** Strict-mode TypeScript on both server and
client, with shared column types via `@shared/columns`. Adding a column
updates TypeScript autocomplete everywhere.

**No build tooling on the developer's laptop.** The Databricks Apps
runtime handles `npm install` + tsdown + vite inside its container on each
deploy. The repo ships source only — clone, edit, deploy.

**Fast redeploys.** First deploy ≈ 30 seconds (install + build + start).
Subsequent deploys reuse the container's npm cache and drop to 2-5 seconds
of install + 3 seconds of build.

**Zero external network required at deploy time** if your Databricks
workspace has an internal npm mirror (Artifactory, JFrog, Nexus). Drop a
`.npmrc` at the repo root pointing at your mirror — every package
resolves through it. If you have no mirror, vendor `node_modules/` once
and the `test -d node_modules` guard in `app.yaml` skips the install step
entirely on subsequent deploys.

**Clean separation of concerns.** Backend (~350 LoC across 5 files),
client grid (~900 LoC in one file), column metadata (~260 LoC shared). No
framework plumbing to wade through.

---

## Architecture

**Stack:** React 19 + TypeScript + Vite + Tailwind 4 + shadcn/ui + TanStack
Query + TanStack Table on the client. Node.js 22 + Express (via AppKit's
server plugin) + `@databricks/sdk-experimental` on the server. Unity Catalog
Delta table on the storage layer, queried via a Databricks SQL Warehouse.

**Framework:** [AppKit 0.23.0](https://databricks.github.io/appkit/) — the
Databricks-blessed TypeScript full-stack framework for Databricks Apps.
Plugin-based architecture (`server()`, `analytics()`), first-party SDK
integration, idiomatic Express routing.

**Deployment:** standard Databricks App via `databricks apps deploy`. No
custom infrastructure. Same deploy mechanism used by every other React +
Node Databricks App.

**Data access pattern:** parameterized SQL statements through the
Databricks SDK's `statementExecution.executeStatement`. Every CRUD
operation is one bounded statement; no connection pooling or long-lived
connections.

**Runtime footprint:** ~500 KB client JavaScript bundle (148 KB gzipped),
46 KB CSS bundle (9 KB gzipped), ~16 KB server bundle. Runs on Databricks
Apps default compute (1 vCPU, 2 GiB).
