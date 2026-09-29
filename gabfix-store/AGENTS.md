## Theme Haven (Gabfix Store) architecture
- Gabfix Store is a plain **Vite + React + TypeScript** SPA. `index.html` loads `src/main.tsx`, which mounts `src/App.tsx` (the root component).
- Routing is `react-router-dom` (`BrowserRouter`) inside `src/App.tsx`; page components live in `src/pages/` (`index`, `materials`, `tools`, `utilities`, `suppliers`, `reports`). There is no TanStack Router/Start/Query and no BaaS client.
- `src/components/store/AppShell.tsx` is the app frame (sidebar `NavLink` navigation + topbar); pages render inside it as routes. Data comes from `GET /api/data` (DB-seeded store collections, migration 016) via `src/lib/api.ts`; `src/lib/store-data.ts` keeps the types mirroring the DB rows. Copy `.env.example` to `.env` and set `VITE_API_BASE_URL` + `VITE_APP_ID=store`.
- Per-page browser titles are set with the `useDocumentTitle` hook (`src/lib/use-document-title.ts`) — there is no route-level head() system.
- PWA: vite-plugin-pwa (generateSW) + `public/manifest.webmanifest` + icons; `src/lib/pwa.ts` registers the worker in production only.
- Auth: canonical `POST /api/auth/login` contract (`{accessToken, refreshToken, user: {id, name, role, app_scope}}`), access + refresh tokens in localStorage, `X-App-Id: store` on every request. Accounts are admin-created — no self sign-up.
