# Gabfix Laundry Front Office

Counter-facing app for the Gabfix laundry desk: order intake, status board
(Received → Washing → Drying → Ready → Collected), ready/overdue lists, and
printing of intake tickets. One of four Gabfix ERP frontends, all backed by the
same Express + PostgreSQL server (`../server`).

## Stack

- React 19 + Vite + TypeScript
- Tailwind CSS v4 (vendored design tokens; dark-mode parity)
- react-router-dom; TanStack-style data access via `src/lib/api.ts`
- Dexie (offline-first cache + outbox — Phase C wires it to `/api/sync/push`)
- vite-plugin-pwa (installable, offline app shell)

## Development

```sh
npm i
npm run dev        # http://localhost:5174
npm run typecheck
npm run build
```

Copy `.env.example` to `.env`:

```
VITE_API_BASE_URL=http://localhost:5000/api
VITE_APP_ID=laundry
```

The server must be running first (`cd ../server && npm run dev`). Every request
is tagged with the `X-App-Id: laundry` header and shows up in the server console
as `[laundry] GET /api/... 200 12ms`, in `GET /api/logs` (admin-only), and on the
SSE bus at `/api/events`.

## Auth

Staff accounts are created in the Admin Console — there is no self sign-up.
Login goes to `POST /api/auth/login` (canonical contract: `{accessToken,
refreshToken, user: {id, name, role, app_scope}}`); tokens are held in
`localStorage` under `gabfix-laundry:auth-token` / `gabfix-laundry:refresh-token`.

## Project map

```
src/
├── lib/api.ts        Server API client (X-App-Id, bearer, 401→refresh→retry)
├── lib/offline-db.ts Dexie cache + outbox stub
├── lib/pwa.ts        Service worker registration (prod only)
├── pages/            /auth, / (dashboard shell)
└── components/       Vendored UI kit
```
