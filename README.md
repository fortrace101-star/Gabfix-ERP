# Gabfix ERP

Monorepo: one Express + PostgreSQL server, four React (Vite) PWAs.

| Folder | App | Dev port | Purpose |
| --- | --- | --- | --- |
| `server/` | Gabfix API | 5000 | Express + PostgreSQL: data spine, auth, documents, SSE, request logging |
| `gabfix-administrator/` | Admin Console (`admin`) | 5173 | Control-plane apex: staff + app access management, dashboards, log viewer |
| `gabfix-laundry-front-office/` | Laundry Front Office (`laundry`) | 5174 | Counter ops: intake, status board, offline-first (Dexie) |
| `gabfix-inhouse-erp/` | Portal (`portal`) | 5175 | Technician portal: my jobs, timesheets, field beacon |
| `gabfix-store/` | Store (`store`) | 5176 | Storekeeper: materials, tools, purchase requests, utilities |

## Getting started

1. PostgreSQL running locally; adjust `server/.env` if needed (defaults:
   `localhost:5432`, user `postgres`, database `gabfix`).
2. Install and run the API:
   ```sh
   cd server
   npm i
   npm run dev        # http://localhost:5000
   ```
   On startup the server bootstraps the database automatically: creates the
   `gabfix` database if missing, applies pending files from `server/migrations/`
   (tracked in `schema_migrations`), and seeds the full workspace (core demo
   data, store dataset, settings, message templates) when the database is
   empty. `POST /api/reset` restores the same complete workspace at any time.
3. Run any frontend (each is an independent Vite app):
   ```sh
   cd gabfix-administrator   # or any other app folder
   npm i
   npm run dev
   ```

## Environment (per app)

Copy `.env.example` to `.env` in each app folder:

```
VITE_API_BASE_URL=http://localhost:5000/api
VITE_APP_ID=admin|laundry|portal|store
```

Every request carries the `X-App-Id` header; the server logs it as
`[<appId>] GET /api/... 200 12ms` (console, ring buffer, `logs.jsonl`, SSE,
and the admin-only `GET /api/logs` history).

## Auth model

- Staff accounts are created in the Admin Console — no self sign-up anywhere.
- Canonical contract: `POST /api/auth/login|refresh`, `GET /api/auth/me`,
  `/logout` → `{accessToken, refreshToken, user: {id, name, role, app_scope}}`.
- An employee's `app_scope[]` (admin/laundry/portal/store) decides which apps
  they can use; the server enforces it per mount (`AUTH_ENFORCE=true` is the
  go-live switch).

## How data works

- All records live in PostgreSQL — no client-side database, no BaaS.
- `GET /api/data` returns the whole workspace snapshot (including the store's
  inventory/movements/purchase-requests/tools/utility captures) and is what
  every app renders from.
- Writes go through the REST endpoints in `server/routes/` (one router per
  domain). Cross-app updates arrive via SSE at `/api/events`.
- Documents (11 PDF types) are generated server-side at
  `/api/documents/:type(/:id).pdf`.

## Structure

```
├── server/                      Express API
│   ├── index.ts                 Wiring: middleware, scoped routers, SSE, listen
│   ├── routes/                  One router per domain (auth, workspace, …)
│   ├── repositories/            SQL + data access
│   ├── middleware/              auth (guard/requireScope), request logger
│   ├── migrations/              Additive SQL applied by migrate.ts (001→016)
│   └── seed-data.ts             Full workspace seed (core + store + settings)
├── gabfix-administrator/        Admin Console (PWA)
├── gabfix-laundry-front-office/ Laundry Front Office (offline-first PWA)
├── gabfix-inhouse-erp/          Portal (PWA)
├── gabfix-store/                Store (PWA)
└── docs/                        Plans, progress log, UI reference boards
```
