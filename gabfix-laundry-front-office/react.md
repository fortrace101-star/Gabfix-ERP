# React + Vite Conversion — appreciation-hub (gabfix-laundry-front-office)

This document records the changes made to convert the **Appreciation Hub**
(Gabfix Laundry Front Office) from **TanStack Start** (SSR, nitro, bun,
Lovable Cloud) into a plain **React + Vite + TypeScript** project with
`App.tsx` as the entry point. It follows the procedure in
`gabfix-inhouse-erp/react.md` (including its "Full TanStack Start App"
addendum) — this app additionally required **Supabase/Lovable Cloud removal
with server-API auth** and kept **Dexie offline storage and PWA support**.

## Summary of Changes

| # | Type        | File / Scope                              | Description                                                        |
|---|-------------|-------------------------------------------|--------------------------------------------------------------------|
| 1 | **Created** | `index.html`                              | Vite HTML entry; head ported from `__root.tsx` (manifest, apple-touch-icon kept). |
| 2 | **Created** | `src/main.tsx`                            | React DOM entry (`ReactDOM.createRoot` + StrictMode).              |
| 3 | **Created** | `src/App.tsx`                             | Root: `BrowserRouter`, `/` + protected `/dashboard/:section`, error boundary, 404, SW registration. |
| 4 | **Deleted** | `src/start.ts`, `src/server.ts`           | TanStack Start server entries removed.                             |
| 5 | **Deleted** | `src/router.tsx`, `src/routeTree.gen.ts`  | TanStack Router + QueryClient + generated tree removed.            |
| 6 | **Deleted** | `src/routes/` (directory)                 | `__root`, `index` (sign-in), `_authenticated/route`, `_authenticated/dashboard.$section` removed. |
| 7 | **Deleted** | `src/lib/error-capture.ts`, `error-page.ts`, `lovable-error-reporting.ts` | SSR/Lovable error helpers removed. |
| 8 | **Deleted** | `src/integrations/` (whole tree)          | Supabase client/middleware/types + Lovable OAuth wrapper removed.  |
| 9 | **Deleted** | `drizzle.config.ts`, `drizzle/`           | Lovable Cloud DB tooling removed (server owns the database).       |
| 10| **Deleted** | `bunfig.toml`, `bun.lock`, `.lovable/`    | Bun + Lovable tooling removed.                                     |
| 11| **Deleted** | `.env` (tracked; held Supabase secrets)   | Removed; `.env`/`.env.*` added to `.gitignore`; `.env.example` created. |
| 12| **Deleted** | `src/assets/gabfix-logo.png.asset.json`   | Lovable asset indirection removed.                                 |
| 13| **Created** | `public/gabfix-logo.png`                  | Real logo binary downloaded from the Lovable asset URL (24,509 bytes). |
| 14| **Created** | `src/lib/api.ts`                          | Typed server-API boundary `laundryApi` (+ bearer token in `localStorage`); `auth` namespace: `signIn` / `signUp` / `signOut` / `isAuthenticated`. |
| 15| **Created** | `src/components/ProtectedRoute.tsx`       | Client gate for `/dashboard/:section`, preserving `state.from` for post-login redirect (replaces `_authenticated` `beforeLoad`). |
| 16| **Created** | `src/lib/use-document-title.ts`           | Replaces TanStack per-route `head()`; creates the meta description if missing. |
| 17| **Created** | `src/pages/index.tsx`                     | Sign-in page (sign-in/sign-up modes, OAuth placeholder) wired to `laundryApi.auth`. |
| 18| **Created** | `src/pages/dashboard.tsx`                 | Maps the react-router `:section` param to `LaundryDashboard` + per-section document title. |
| 19| **Modified**| `src/components/gabfix/laundry-dashboard.tsx` | TanStack `Link`/`useRouterState` → react-router `Link` + `active` prop; `supabase.auth.signOut()` → `laundryApi.auth.signOut()`; logo → `/gabfix-logo.png`. |
| 20| **Kept**    | `src/lib/offline-db.ts` (Dexie), `src/lib/pwa.ts` | Offline cache/outbox and SW registration logic unchanged.   |
| 21| **Modified**| `package.json`                            | Removed `@tanstack/*` ×4, `@supabase/supabase-js`, `@lovable.dev/cloud-auth-js`, `@lovable.dev/vite-tanstack-config`, `vite-tsconfig-paths`, `nitro`, `drizzle-*`, `postgres`; added `react-router-dom`, `vite-plugin-pwa@^1.3.0`, `typecheck` script. |
| 22| **Modified**| `vite.config.ts`                          | Standard `defineConfig` (react + tailwind + native tsconfigPaths) with the same workbox PWA settings. |
| 23| **Modified**| `eslint.config.js`, `.prettierignore`, `AGENTS.md` | TanStack rule/ignores removed; architecture notes rewritten. |

## Routing map

| TanStack route                          | New page/component              | URL                     |
|-----------------------------------------|---------------------------------|-------------------------|
| `routes/index.tsx` (sign-in)            | `pages/index.tsx`               | `/`                     |
| `routes/_authenticated/route.tsx`       | `components/ProtectedRoute.tsx` | layout guard            |
| `routes/_authenticated/dashboard.$section.tsx` | `pages/dashboard.tsx`    | `/dashboard/:section`   |
| —                                       | `App.tsx` `NotFoundPage`        | `*` (404)               |

## Verification

| Check                          | Result |
|--------------------------------|--------|
| `npx tsc --noEmit`             | ✅ Passes |
| `npx vite build`               | ✅ Succeeds (`dist/sw.js`, precache 10 entries) |
| `npx eslint .`                 | ✅ 0 errors (7 pre-existing shadcn warnings) |
| Headless Chrome E2E            | ✅ 8/8: sign-in form renders · `/dashboard/overview` redirects to `/` unauthenticated · mock-API sign-in succeeds · token stored · dashboard mounts with KPIs · sidebar section navigation (`/dashboard/inventory` + "Facility stock") · per-section title ("Inventory — Gabfix Laundry") · sign-out clears token and returns to `/` |
| No `@tanstack` references      | ✅ Zero (only intentional "lovable" string left is the preview-host list in `pwa.ts`) |

---

# Addendum — Per-route code splitting

`src/App.tsx` uses `React.lazy` + `Suspense` so each page loads on demand:

| Check                          | Result |
|--------------------------------|--------|
| Initial chunk                  | ✅ 461.9 kB → **263.9 kB** (−43%); 500 kB warning gone |
| Async chunks                   | `dashboard` 157.8 kB (incl. Dexie), `jspdf.es.min` 398.9 kB + `html2canvas` 199.5 kB (ticket PDFs), `index.es` 151.4 kB (jspdf core) |
| All routes still render        | ✅ Headless Chrome pass: auth page mounts, protected gate still redirects |

## Notes for future maintenance

- **Auth contract:** `laundryApi.auth` expects `POST /auth/sign-in` →
  `{ token, staff }` and `POST /auth/sign-up` → `{ token?, staff? }` (no token
  = "check your email"). Adjust `src/lib/api.ts` to the real server contract
  when it ships; the UI surfaces thrown messages verbatim.
- **Session validity:** the route guard reads `localStorage` synchronously, so
  an expired token passes until the first API call fails — add a server-side
  session check on mount if stricter behaviour is needed.
- **Dexie remains the offline cache/outbox only**; the server API is the
  source of record, matching the original architecture rule.
