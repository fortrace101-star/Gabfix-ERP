# Gabfix Store (Storekeeper)

Store management app: contract materials inventory, movements
(receive/issue/adjust/return), tool check-outs, purchase requests, utility
captures (meter readings → expenses), and suppliers. One of four Gabfix ERP
frontends, all backed by the same Express + PostgreSQL server (`../server`).

## Stack

- React 19 + Vite + TypeScript
- Tailwind CSS v4 (vendored design tokens; amber/gold accent; dark-mode parity)
- react-router-dom; data access via `src/lib/api.ts`
- vite-plugin-pwa (installable, offline app shell)

## Development

```sh
npm i
npm run dev        # http://localhost:5176
npm run typecheck
npm run build
```

Copy `.env.example` to `.env`:

```
VITE_API_BASE_URL=http://localhost:5000/api
VITE_APP_ID=store
```

The server must be running first (`cd ../server && npm run dev`). Every request
is tagged with the `X-App-Id: store` header and shows up in the server console
as `[store] GET /api/... 200 12ms`, in `GET /api/logs` (admin-only), and on the
SSE bus at `/api/events`.

## Data

All data lives in the database (migration `016_store_tables.sql` seeds suppliers,
contract inventory, movements, purchase requests, tool check-outs and utility
captures; `POST /api/reset` restores everything). The UI types in
`src/lib/store-data.ts` mirror the DB rows verbatim — Phase E swaps the fixture
import for `GET /api/data` reads and adds the write routes.

## Auth

Staff accounts are created in the Admin Console — there is no self sign-up.
Login goes to `POST /api/auth/login` (canonical contract: `{accessToken,
refreshToken, user: {id, name, role, app_scope}}`). An employee can only reach
this app if their account's `app_scope` includes `store`.

## Project map

```
src/
├── lib/api.ts           Server API client (X-App-Id, bearer, 401→refresh→retry)
├── lib/store-data.ts    Types mirroring DB rows (+ fixture rows until Phase E)
├── lib/pwa.ts           Service worker registration (prod only)
├── components/store/    AppShell, DataTable, KpiCard, StatusBadge
├── pages/               index, materials, tools, utilities, suppliers, reports
└── App.tsx              Routes + error boundaries
```
