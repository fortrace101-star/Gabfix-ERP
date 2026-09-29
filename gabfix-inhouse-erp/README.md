# Gabfix Portal (In-House ERP)

Technician/staff portal: my jobs (quote → scheduled → started → completed →
invoiced → paid), timesheets, cost capture, and the field beacon (GPS pings to
the admin live map). One of four Gabfix ERP frontends, all backed by the same
Express + PostgreSQL server (`../server`).

## Stack

- React 19 + Vite + TypeScript
- Tailwind CSS v4 (vendored design tokens; dark-mode parity)
- react-router-dom; data access via `src/lib/api.ts` (`portalApi`)
- vite-plugin-pwa (installable, beacon-friendly)

## Development

```sh
npm i
npm run dev        # http://localhost:5175
npm run typecheck
npm run build
```

Copy `.env.example` to `.env`:

```
VITE_API_BASE_URL=http://localhost:5000/api
VITE_APP_ID=portal
```

The server must be running first (`cd ../server && npm run dev`). Every request
is tagged with the `X-App-Id: portal` header and shows up in the server console
as `[portal] GET /api/... 200 12ms`, in `GET /api/logs` (admin-only), and on the
SSE bus at `/api/events`.

## Auth

Staff accounts are created in the Admin Console — there is no self sign-up.
Login goes to `POST /api/auth/login` (canonical contract: `{accessToken,
refreshToken, user: {id, name, role, app_scope}}`); tokens are held in
`localStorage` under `gabfix:auth-token` / `gabfix:refresh-token`. An employee
can only reach this app if their account's `app_scope` includes `portal`.

## Project map

```
src/
├── lib/api.ts    Server API client (X-App-Id, bearer, 401→refresh→retry)
├── lib/pwa.ts    Service worker registration (prod only)
├── pages/        /auth, / (empty shell — Phase D fills it)
└── components/   Vendored UI kit
```
