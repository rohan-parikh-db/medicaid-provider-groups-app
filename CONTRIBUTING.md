# Contributing

Thanks for considering a contribution! This is a small, focused project —
keep PRs scoped accordingly.

## What's in scope

- Bug fixes in the grid UX, backend routes, or SQL handling.
- Documentation improvements (README, FEATURES, inline comments).
- Example data seed scripts, alternative seed scenarios.
- Minor feature additions that preserve the "single-page CRUD grid" shape.
- CI / tooling improvements.

## What's out of scope (please don't PR these)

- Changes that break the "zero workspace-specific config outside
  `app.yaml`" guarantee.
- Major framework swaps (React → something else, AppKit → Next.js, etc).
  This project is an AppKit reference implementation.
- Additional pages / routes — the app is intentionally single-page.
- Data-model changes that alter the 20-column Medicaid Subset shape for
  everyone. If you need a different schema, fork the repo and edit
  `shared/columns.ts` and `examples/create_table.sql` to match.

## Development workflow

1. Fork + clone.
2. Install: `npm ci`
3. Local dev: `npm run dev` — runs tsx-watch on the server + vite on the client. You'll need `DATABRICKS_HOST`, `DATABRICKS_CLIENT_ID`, `DATABRICKS_CLIENT_SECRET`, and the four `APP_*` env vars in a `.env` at the repo root.
4. Type-check: `npx tsc -b --noEmit` (or `npm run typecheck` if defined).
5. Build: `npm run build` — produces `dist/` (server) + `client/dist/` (client).
6. Commit: small, focused commits. Conventional-commit prefixes welcomed but not required.
7. PR: describe what you changed and why. Screenshots help for UI changes.

## CI

A GitHub Actions workflow runs on every push and PR: installs deps and
builds both server and client. Keep this green.

## License

Contributions are licensed under the project's [Apache 2.0 license](./LICENSE).
