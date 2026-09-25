# Gabfix ERP

Monorepo with two projects:

- `client/` — React + Vite frontend
- `server/` — Node (Express) API backed by a local PostgreSQL database

## Getting started

1. Make sure PostgreSQL is running locally, then adjust `server/.env` if your credentials differ:
   - Defaults: `localhost:5432`, user `postgres`, database `gabfix`
2. Install dependencies (both projects at once):
   ```
   npm run setup
   ```
3. Run the API and the web app together:
   ```
   npm run dev
   ```
   - API: http://localhost:4000 (also proxied under `/api` for the web app)
   - Web: http://localhost:5173

   On startup the server bootstraps the database automatically: it creates the
   `gabfix` database if it does not exist, applies pending files from
   `server/migrations/` (tracked in the `schema_migrations` table), and seeds
   demo data when the database is empty. `npm run db:init` runs the same steps
   manually; `npm run db:migrate` applies migrations only.

## Scripts

| Root script          | What it does                                    |
| -------------------- | ----------------------------------------------- |
| `npm run setup`      | Installs deps for `client/` and `server/`       |
| `npm run dev`        | Runs client + server concurrently               |
| `npm run dev:client` | Client (Vite) only                              |
| `npm run dev:server` | Server (Express) only                           |
| `npm run db:init`    | Creates the database, applies migrations, seeds (also runs automatically on server start) |
| `npm run db:migrate` | Applies pending `server/migrations/*.sql` files only |
| `npm run build`      | Production build of the client                  |
| `npm run typecheck`  | TypeScript checks for both projects             |

Each project also has its own `package.json`, so you can work inside `client/` or `server/` directly (e.g. `cd server && npm run dev`).

## How data works

- All records live in PostgreSQL — the browser no longer stores anything in localStorage.
- `GET /api/data` returns the full workspace snapshot the UI renders.
- Creating/updating records goes through the REST endpoints in `server/index.ts`.
- Settings → Backup & restore exports/imports the same JSON via `/api/import`, and "Reset demo data" reseeds the database through `/api/reset`.

## Structure

```
├── client/            React app (Vite, Tailwind); src/api.ts is the gateway to the backend
├── server/            Express API, PostgreSQL pool (db.ts), migrations (migrations/ + migrate.ts), seed data (seed-data.ts), auto-bootstrap (bootstrap-db.ts)
└── scripts/dev.mjs    Concurrent dev runner used by `npm run dev`
```
