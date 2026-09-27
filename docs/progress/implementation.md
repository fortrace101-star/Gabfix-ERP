# Gabfix ERP — Enhancement Implementation Progress

| Field | Value |
| --- | --- |
| Plan | [`docs/plans/enhance.md`](../plans/enhance.md) · [`docs/plans/multi-app-plan.md`](../plans/multi-app-plan.md) |
| Requirements | [`docs/requirements.md`](../requirements.md) |
| Baseline commit | `100d0aa` (Pre-refactor baseline snapshot before enhancement work) |
| Started | 2026-09-25 |
| Status | Phase 0a complete · Phase 0b complete · Phase 0c complete (identity scopes, sync tables, auth/CORS, branches removed, Kampala dates, client split, SSE, tests+CI) · **Phase 1 in progress** — 1a money spine done (payments, ledger, numbering) · 1b job dates/assignments done; costing, assets, laundry next |

Legend: `[ ]` not started · `[~]` in progress · `[x]` done · `[!]` blocked

---

## Overall Plan Progress

The enhancement plan (`enhance.md`) is sequenced in 8 phases. Phase 0 is the multi-app foundation that unlocks everything else. It is subdivided into:

| Sub-phase | Name | Scope | Status |
| --- | --- | --- | --- |
| Phase 0a | Multi-app scaffold | Rename `client/` → `gabfix-administrator`; scaffold 3 new Vite+React 18 apps; per-app configs; root dev scripts; ports 5173–5176 | ✅ done |
| **Phase 0b** | **Theme, components & PWA shells** | **Vendored theme tokens; `useTheme` hook; `StatusBadge` component; PWA manifests + sw; `.env` with `VITE_APP_ID`** | **✅ done** |
| Phase 0c | Backend multi-app wiring | `005_multiapp_identity` + `006_remove_branches` + `sync_tables` migrations; server identity/roles scoped to 4 apps; §0.9 dates, §0.10 client split, §0.11 SSE, §0.12 CI completion | ✅ done — 0c.1 + 0c.2a/b/c/d/e complete |
| Phase 1 | Data spine | Payments, methods, ledger, costing, job/laundry dates, assets | [~] — 1a payments+ledger, 1b job dates/assignments done |
| Phase 2 | PDF & documents | jsPDF + AutoTable, 14 document types, print/download/attach | — |
| Phase 3 | Notifications, feedback, real-time | WhatsApp/SMS, completion message, feedback form, SSE | — |
| Phase 4 | Field operations | Employees, devices, assignments, beacon, map, geofences | — |
| Phase 5 | Sales & manager dashboard | Attribution, pipeline, commissions, dashboards | — |
| Phase 6 | Real-time upgrade | Socket.IO chat, Inbox, presence, live map | — |
| Phase 7 | Depth | Payment gateway + reconciliation, scheduled reports, dunning | — |

> **Current state**: Phase 0a ✅ · Phase 0b ✅ · Phase 0c ✅ — all Phase 0 acceptance criteria met (branchless schema, scoped+validated+numbered APIs, Kampala dates, SSE sync, CI green, client split with router + query cache + deep links). Phases 0.1–0.8 complete from prior work. **Phase 1 is in progress**: 1a payments + double-entry ledger done and probed live (plan exit criterion "a payment moves invoice status, customer balance, journal and cash flow together" holds atomically); 1b job dates/priority/site/attribution + job_events/job_assignments done. Remaining: costing (1c), assets/depreciation (1d), laundry items/dates (1e).

---

## Phase 0 — Foundations (6–9 dev-days)

Goal: make change safe — migration runner, identity and roles, server route split,
validation, document numbering, Africa/Kampala dates, client split, scoped endpoints,
SSE, CI. **No later phase can be built safely before this.**

| Step | Work | Status | Notes |
| --- | --- | --- | --- |
| 0.1 | Freeze baseline: commit WIP, delete stale scratch file, remove circular `gabfix-erp: file:..` dependency, add `server/.env.example`, move requirements to `docs/requirements.md` | [x] | Baseline snapshot `100d0aa`; `.env.example` present; `scripts/reports-block.txt` already gone; requirements moved to `docs/requirements.md`; circular dependency removed from both manifests + lock files (verified: `npm install` keeps them clean, symlinks removed) |
| 0.2 | Migration runner with baseline + schema reconciliation (`server/migrations/001_baseline.sql`, `server/migrate.ts`, `bootstrap-db.ts`, `init-db.ts`) | [x] | Verified all three acceptance paths: fresh DB (`gabfix_migrate_test`) creates+migrates+seeds; existing DB reconciles baseline via `to_regclass` check and records it without re-executing; re-run prints "Schema up to date". `schema.sql` deleted (superseded); `npm run db:migrate` added; README updated |
| 0.3 | Audit columns + `updated_at` trigger on all tables (`002_audit_columns.sql`) | [x] | Verified: 9/9 tables have created_at/updated_at/created_by/deleted_at; trigger bumps `updated_at` on UPDATE; inserts populate `created_at`; `GET /api/data` keys unchanged (branches still id,name,location) |
| 0.4 | Identity tables and seed the owner (`003_identity.sql`, `seed-data.ts`) | [x] | `employees` + `devices` created with role CHECK and touch triggers; `ensureOwner()` runs on every bootstrap (works for pre-identity DBs too, since seedData is skipped there); verified: 1 owner "Gabriel N.", bcrypt hash verifies against OWNER_PASSWORD |
| 0.5 | Auth plumbing: login/refresh/me + `requireAuth`/`requireRole` (`routes/auth.ts`, `middleware/auth.ts`) | [x] | 13/13 probe checks passed with AUTH_ENFORCE=true (401 without token, 403 wrong role on owner-only /api/reset, 200 with token, refresh pair, token-type confusion rejected); default flag off keeps existing client working (verified /api/data open + login OK); JWT_SECRET absence degrades to ephemeral secret with warning; .env.example documents AUTH_ENFORCE/REFRESH_TTL |
| 0.6 | Split the 13 handlers out of `server/index.ts` into `routes/*` + `repositories/*` | [x] | `index.ts` down to 60 lines (wiring only). Routers: `routes/{workspace,customers,jobs,equipment,expenses,services,inventory,admin}.ts` + shared `routes/handlers.ts`; SQL in `repositories/{workspace,records}.ts`; shared helpers in `lib/{http,tables}.ts`. Verified: 43-check parity probe (all 13 endpoints, id prefixes, defaults, 400/404 messages, export→import round-trip, reset, 404 fallthrough) all pass, 14-check enforcement probe with `AUTH_ENFORCE=true` passes, 11-check identity probe passes, client production build green. **Bug found & fixed:** `TRUNCATE … CASCADE` reached `employees` (via `employees.branch_id`) and `devices`, so `/api/reset` and `/api/import` deleted staff logins; identity rows are now snapshotted and restored inside the same transaction |
| 0.7 | Per-route zod schemas replacing the generic column map (`server/validation/*`) | [x] | Unknown fields return 422 instead of silent drop. Replaced unsafe `z.coerce.number()` with `z.preprocess()` so null and empty string fail cleanly; validated backup import with array index paths; live 44-probe check verified. |
| 0.8 | Server-side document numbering (`services/numbering.ts`) | [x] | `004_numbering.sql` creates `document_sequences` with JOB/INV/LDY seeds (next values 145/99/217, above seed-data maxima); `nextNumber()` does `UPDATE ... RETURNING` inside the caller's transaction; `createHandler` now accepts a `sequenceKey` option that wraps the insert in BEGIN/COMMIT so concurrent creates can never collide; jobs route passes `sequenceKey: 'job'`; `number` made optional in `jobCreate` schema; client `JobForm` no longer sends a client-generated number. Verified: single create returns JOB-00145; 10 concurrent creates yield 10 unique numbers JOB-00147…JOB-00156; client-supplied numbers still accepted (backward compat); server typecheck green; client build clean |
| 0.9 | Africa/Kampala date handling (`client/src/lib/dates.ts`, `server/lib/dates.ts`) | [x] | `server/lib/dates.ts` (`kampalaToday`/`addDays`/`isMaintenanceDue`, injectable clock for tests) + admin mirror `src/lib/dates.ts` (`todayISO`/`addDays`/`isMaintenanceDue`/`periodStart`); expense/equipment routes default and compare on Kampala local days; App.tsx `getStartDate` delegates and an `isDue` helper drives maintenance flags, nav badges and dashboard alerts |
| 0.10 | Client split (app/features/components/lib) + router + query cache | [x] | `App.tsx` down from 641 to 92 lines; `src/app/` (store.tsx workspace context + react-query, realtime.ts SSE hook, layout/{Sidebar,Topbar}), `src/features/` ×9 views incl. modals, `src/lib/{money,csv,format,profile}.ts`, `src/components/ui.tsx`; react-router-dom 7.18.4 deep links (`/jobs`, `/reports`, …) + `@tanstack/react-query` 5.104.0 workspace cache driving the SSE invalidations |
| 0.11 | Scoped/paginated endpoints + SSE event bus (`routes/events.ts`, `services/realtime.ts`) | [x] | Realtime pub/sub (throwing subscribers isolated, 15s heartbeat) + `GET /api/events` (all four scopes, staged enforcement); `job-created`/`*-updated` published post-response, `workspace-reset` on import/reset; admin EventSource auto-reconnects with a 30s fallback refresh. Live probe: job POST streamed `event: job-created` (server issued JOB-00146) |
| 0.12 | Tests + CI (`server/test/*`, client tests, `.github/workflows/ci.yml`) | [x] | 17-test node:test suite 17/17 (dates rollover, validation 422s, app_scope JWTs + requireScope, realtime bus); CI: server job on postgres:16 (typecheck, tests, fresh-db migrate 001→007, branchless assertion, API smoke) + apps job (typecheck+build ×4, lint 3 scaffold apps). Numbering/ledger/depreciation coverage lands with Phase 1 |

Phase 0 definition of done: existing behaviour provably unchanged; schema can evolve;
identity and roles exist; APIs scoped/validated/numbered; two clients stay in sync;
server-side numbering; local-time dates correct; CI enforced.

---

## Phase 0a — Multi-App Scaffold

Reference: [`docs/plans/multi-app-plan.md`](../plans/multi-app-plan.md) §2 (App Registry), §15 (Proposed First Act Slice).
Goal: Establish the independent Vite+React 18 app structure for all four services (server + 3 new frontends) before Phase 0b (shared UI + API integration).

### Steps

| Step | Work (per plan §15) | Status | Notes |
| --- | --- | --- | --- |
| 0a.1 | `git mv client gabfix-administrator` (preserves git history) | [x] | Directory renamed; references updated in `package.json`, `scripts/dev.mjs`, and `docs/progress/implementation.md` |
| 0a.2 | Scaffold 3 new apps from Vite+React 18 template + `vite-plugin-pwa` + `manifest.webmanifest` | [x] | `gabfix-store`, `gabfix-laundry-front-office`, `gabfix-inhouse-erp` each have `vite.config.ts`, `package.json`, `src/App.tsx`, `src/main.tsx`, `src/theme/tokens.css` |
| 0a.3 | Root `package.json` dev scripts: `dev:admin`, `dev:laundry`, `dev:portal`, `dev:store` | [x] | Root `package.json` has `dev:admin`, `dev:laundry`, `dev:portal`, `dev:store`, `dev:server`; root `npm run dev` spawns all 5 via `scripts/dev.mjs` |
| 0a.4 | Per-app configs: `vite.config.ts` (proxy `/api` → `localhost:4000`, `@/` → `src/`), `tailwind.config.js`, `src/theme/tokens.css` | [x] | All 4 apps have API proxy + `@` alias; Tailwind + theme tokens present; ports assigned per App Registry below |
| 0a.5 | Baseline commit — all apps build green, no lint errors, ports assigned | [x] | All 4 apps compile with `vite build` (exit 0, 1568–1570 modules each); no `any` types in configs; all 5 ports confirmed available |

### App Registry (per plan §2)

| Folder (Vercel Root Directory) | Package name | VITE_APP_ID | Dev port | Mode |
| --- | --- | --- | --- | --- |
| `gabfix-administrator/` | `gabfix-administrator` | `admin` | 5173 | Online-first, control plane, full PWA |
| `gabfix-laundry-front-office/` | `gabfix-laundry-front-office` | `laundry` | 5174 | Offline-first PWA (Dexie + SW) |
| `gabfix-inhouse-erp/` | `gabfix-inhouse-erp`² | `portal` | 5175 | Online-first, PWA, tiny beacon outbox |
| `gabfix-store/` | `gabfix-store` | `store` | 5176 | Online-first, full PWA |

> ² Plan §2 names the folder `inhouse-employee-client/` and the package `inhouse-employee-client`; the scaffolded folder and package are `gabfix-inhouse-erp/` (consistent kebab-case `gabfix-*` prefix across all apps). `VITE_APP_ID` values from the plan are set as env vars in the apps — added in Phase 0b (see App Registry §0b above).

### Post-scaffold fixes

| Issue | Fix applied | Verification |
| --- | --- | --- |
| `@typescript-eslint/no-explicit-any` in 3 new apps' `vite.config.ts` | Replaced `let pwaPlugin: any = []` → `let pwaPlugin: Plugin[] = []` + `import { Plugin } from 'vite'` | No `any` types remain in any `vite.config.ts`; `Plugin` confirmed exported by Vite's TS definitions |
| No explicit ports in `vite.config.ts` (all default to 5173) | Added `port` + `strictPort: true` to each app's `server` config | admin 5173, laundry 5174, portal 5175, store 5176 — all ports confirmed available via `netstat` |
| `scripts/dev.mjs` only spawned server + admin | Added `laundry`, `portal`, `store` entries to `procs` array | Root `npm run dev` spawns all 5 processes concurrently |
| Orphaned node.exe processes kept ports 5173–5176 + 4000 occupied after a previous dev run, so the next `npm run dev` failed (e.g. "Port 5174 is already in use") — on Windows `child.kill()` only kills the `npm.cmd` wrapper, not the vite/tsx processes beneath it | `scripts/dev.mjs` now kills the full process tree on shutdown via `taskkill /PID <pid> /T /F` (Windows) / `SIGTERM` (POSIX); verified: all 4 apps bind 5173–5176, and after shutdown `netstat` shows zero listeners |
| Duplicated `export default export default` in admin's `vite.config.ts` | Fixed to single `export default defineConfig({` | Admin build verified |
| `vite-plugin-pwa` not installed in app dirs | Optional via `try/catch` `await import('vite-plugin-pwa')` | Apps build and run without it; `npm install` in app dir enables PWA features; expected console warning: "not installed — PWA features disabled" |

### Verification matrix

| Check | Result |
| --- | --- |
| `npm run build` (all 4 apps) | ✅ exit 0, 1568–1570 modules each |
| `npm run lint` (all 4 apps) | ✅ no `no-explicit-any` errors |
| `npm run typecheck` (all apps) | ✅ clean |
| Port availability (5173–5176 + 4000) | ✅ all available, no conflicts |
| `scripts/dev.mjs` spawns all 5 | ✅ server + 4 apps |
| Git tree | ✅ clean after commit `941dc50` |

---

## Phase 0b — Theme, Components & PWA Shells

Reference: [`docs/plans/multi-app-plan.md`](../plans/multi-app-plan.md) §2 (App Registry), §8 (Theme / Components — Process Parity), §9 (Delivery Order).
Goal: Vendored theme tokens, `useTheme` hook, `StatusBadge` component, and PWA shells in all four apps. Build order §8 starts with `StatusBadge`.

### Steps

| Step | Work (per plan §8–9) | Status | Notes |
| --- | --- | --- | --- |
| 0b.1 | Vend theme tokens (`src/theme/tokens.css` or `src/index.css`) with light/dark CSS variables per-app accent | [x] | Admin: `src/index.css` (green accent). Laundry: green `--brand`. Portal: blue `--brand`. Store: amber `--brand`. All use `var(--surface)`, `var(--ink)`, `var(--line)` for surfaces, text, borders per plan §17 |
| 0b.2 | `useTheme` hook (`src/hooks/useTheme.ts`) — dark/light toggle via `data-theme` attribute on `<html>`, localStorage persistence + `prefers-color-scheme` fallback, scoped per-app via `VITE_APP_ID` | [x] | Hook in all 4 apps; inline script in each `index.html` sets initial theme before JS mount (no FOUC) |
| 0b.3 | `StatusBadge` component (`src/components/StatusBadge.tsx`) — extracted from admin's inline `App.tsx` function; tone logic: success/danger/info/warning | [x] | Standalone component in all 4 apps (vendored per app). Admin: inline function replaced with `@/components/StatusBadge` import |
| 0b.4 | PWA shells: `public/manifest.webmanifest` + `<link rel="manifest">` in `index.html` + `vite-plugin-pwa` config in `vite.config.ts` | [x] | Admin got PWA plugin added with try/catch pattern (matching 3 new apps). All 4 have manifest + inline theme script in `<head>` |
| 0b.5 | `.status` CSS classes (`tokens.css`/`index.css`) + `[data-theme="dark"]` dark-mode variable overrides + dark-mode status badge colors | [x] | Matches admin's existing styles: `.status .status.success .status.info .status.warning .status.danger` with light + dark variants |

### App Registry (updated — per plan §2)

| Folder | Package name | VITE_APP_ID | Dev port | Mode |
| --- | --- | --- | --- | --- |
| `gabfix-administrator/` | `gabfix-administrator` | `admin` | 5173 | Online-first, control plane, full PWA |
| `gabfix-laundry-front-office/` | `gabfix-laundry-front-office` | `laundry` | 5174 | Offline-first PWA (Dexie + SW) |
| `gabfix-inhouse-erp/` | `gabfix-inhouse-erp` | `portal` | 5175 | Online-first, PWA, tiny beacon outbox |
| `gabfix-store/` | `gabfix-store` | `store` | 5176 | Online-first, full PWA |

> ¹ `VITE_APP_ID` env vars added in Phase 0b (`.env` per app); used by `useTheme` hook to namespace localStorage keys.

> ² Plan §2 names the folder `inhouse-employee-client/` and the package `inhouse-employee-client`; the scaffolded folder and package are `gabfix-inhouse-erp/` (consistent kebab-case `gabfix-*` prefix; `VITE_APP_ID=portal` matches plan §2).

### Verification matrix

| Check | Result |
| --- | --- |
| `npm run typecheck` (all 4 apps) | ✅ clean |
| `npm run lint` (3 new apps) | ✅ no errors |
| `npm run lint` (admin modified files) | ✅ no new errors (21 pre-existing in App.tsx) |
| `npm run build` (all 4 apps) | ✅ exit 0 |
| `.status` CSS classes present | ✅ all 4 apps |
| `[data-theme="dark"]` support | ✅ all 4 apps |
| `useTheme` hook initialized | ✅ all 4 apps (via `App.tsx` + `index.html` inline script) |
| `StatusBadge` component | ✅ all 4 apps (admin extracted from inline) |
| `manifest.webmanifest` | ✅ all 4 apps |
| `VITE_APP_ID` in `.env` | ✅ admin / laundry / portal / store |
| `vite-plugin-pwa` in vite.config.ts | ✅ all 4 apps (optional via try/catch) |

---

## Phase 0c — Backend Multi-App Wiring (in progress)

Reference: [`docs/plans/multi-app-plan.md`](../plans/multi-app-plan.md) §10 (Server Readjustments), §11 (Expense model lands in Phase 1), §9 (Delivery Order).
Goal: one server, four apps — identity carries `app_scope`, routes are scope-guarded, CORS covers the four Vercel origins + dev ports 5173–5179, offline sync tables exist.

### 0c.1 — Identity scopes, sync tables, requireScope, CORS ✅

| Step | Work (per plan §10.1–10.4) | Status | Notes |
| --- | --- | --- | --- |
| 0c.1a | Migration `005_multiapp_identity.sql`: `employees.app_scope TEXT[]` + CHECK (subset of admin/laundry/portal/store), role CHECK widened with `storekeeper`, scope backfill per role, owner = all 4 scopes, partial unique index enforces a single live owner | [x] | Constraint discovered by name from `pg_constraint` (003 created it inline); fresh and existing DBs both converge on the same scope backfill |
| 0c.1b | Migration `007_sync_outbox.sql` (plan's "011" slot, renumbered to the next free file in this repo): `sync_outbox` (idempotency_key UNIQUE, app_scope CHECK, status pending/applied/rejected) + `feedback_requests` (token UNIQUE, rating 1–5, channel, FK to customers/laundry_orders/jobs) | [x] | Dexie outbox on the laundry PWA references rows by idempotency_key; server rows stay permanent |
| 0c.1c | Auth: `AuthUser.app_scope: string[]`; `signTokens` puts `app_scope` in both tokens; `verifyToken` falls back to `['admin']` for pre-0c tokens (existing admin sessions keep working); new `requireScope(...scopes)` guard | [x] | `requireScope` is staged like `guard()`: pass-through until `AUTH_ENFORCE=true`, so the no-login dev posture is unchanged |
| 0c.1d | Auth routes read `app_scope` from the DB on login/refresh/me (fresh scope, no stale claim reuse) | [x] | `app_scope ?? []` tolerated for rows predating the column |
| 0c.1e | CORS allowlist (plan §10.3): 4 Vercel origins + localhost/127.0.0.1 × 5173–5176 (+ 5177–5179 buffer); unknown origins rejected with "Not allowed by CORS"; `CORS_ALLOW_ALL=true` escape hatch documented in `.env.example` | [x] | Dual-stack dev matters: Vite binds IPv6 `::1`, so 127.0.0.1 forms are listed separately |
| 0c.1f | Scoped mounts in `index.ts` (plan §10.4): `/api/data` + `/api/customers` all scopes; `/api/jobs` admin/portal/laundry; `/api/equipment` admin/laundry; `/api/expenses` + `/api/services` admin/laundry/store/portal; `/api/inventory` admin/laundry/store; import/reset stay owner-only | [x] | `/api/store`, `/api/laundry`, `/api/sync`, `/api/telemetry`, `/api/events` arrive with their phases (1–4) — mounts are added when the routers exist |

### 0c.1 Verification matrix

| Check | Result |
| --- | --- |
| `npm run db:migrate` applies 005 + 007 | ✅ applied cleanly on the existing dev DB |
| DB probe (8 checks: owner scopes, role CHECK, scope CHECK, storekeeper accepted, new tables, idempotency uniqueness) | ✅ 8/8 |
| API probe, staged mode (5 checks: health, /api/data open, 5174 + vercel origins echoed, unknown origin rejected) | ✅ 5/5 |
| API probe, enforced mode (8 checks: 401 no token, owner login, JWT carries 4 scopes, scoped access, 422-not-403 on allowed mount, 403 "App scope not permitted" on denied mount) | ✅ 8/8 |
| Root `npm run typecheck` (4 apps + server) | ✅ exit 0 |
| Temp probe harness removed after verification | ✅ `server/tmp-probe-0c*.ts`, `scripts/tmp-probe-0c.sh` deleted |

Probe methodology note: routers expose POST/PATCH only (reads via `/api/data`), so scope-allow assertions expect the request to pass the mount and reach validation (422 on empty body), not an HTTP 200 list.

### 0c.2a — Remove branches ✅ (single-shop conversion, plan decision #9)

| Step | Work | Status | Notes |
| --- | --- | --- | --- |
| 0c.2a-1 | Migration `006_remove_branches.sql`: discover + drop every FK targeting `branches` from the catalog, drop `branch_id` on jobs/expenses/equipment/inventory_items/employees, drop `branches` | [x] | Constraint names are discovered via `pg_constraint`, not guessed (001 created the FKs inline with auto names) |
| 0c.2a-2 | Seed data de-branched: branches insert removed; jobs/expenses/equipment/inventory seeds lose `branch_id` columns/values | [x] | Fresh databases are born branchless |
| 0c.2a-3 | Read layer `db.ts`: `branches` dropped from `AppData` type + `getData()`; jobs/expenses/equipment/inventory selects lose `branch_id AS "branchId"` | [x] | `/api/data` payload now starts at `customers` |
| 0c.2a-4 | Write layer: `branchesResource` deleted, `branchId` removed from job/expense/equipment/inventory create + column maps + patch schemas, removed from `RESOURCES` import order; `TRUNCATE_TABLES` loses `branches`; bootstrap empty-check now counts `customers` | [x] | Strict zod schemas now reject `branchId` with 422 instead of silently dropping it |
| 0c.2a-5 | Admin app strip: `Branch` type + `branchId` fields + `branches` in `AppData` removed from `types.ts`; `App.tsx` loses the branch switcher state, Dashboard/JobsView/LaundryView/EquipmentView branch filters, Branch table column, Branch-performance report card + rows, Branch selects in Job/Expense/Equipment/Inventory forms, dead `.branch-switch` CSS, unused `Building2` import | [x] | Lint returned to the 21-error pre-existing baseline; new props `data` on forms no longer needed after losing the branch select |

### 0c.2a Verification matrix

| Check | Result |
| --- | --- |
| `npm run db:migrate` applies 006 on the existing dev DB | ✅ applied cleanly; schema probe 8/8 (branches table absent, 5× `branch_id` columns gone, data survived, `getData()` works) |
| Fresh-DB bootstrap (`gabfix_006_test`, dropped afterwards) | ✅ 5/5 — migrations 001→007, branchless seed, owner ensured, sync tables present, zero `branch_id` columns |
| Write-path probes (against live server) | ✅ 7/7 — job create without branchId → 201 with server-issued JOB number; `branchId` now 422; expense + inventory create → 201; `/api/reset` → 200, reseeds and keeps identity |
| Server boot on migrated DB | ✅ no crash lines; `/api/data` returns the new shape (no `branches` key) |
| Root `npm run typecheck` (4 apps + server) | ✅ exit 0 |
| Admin lint / typecheck / build | ✅ 21 pre-existing lint errors (no new), tsc clean, `vite build` + PWA v0.21.2 green |
| Dev stack boot/shutdown | ✅ all 4 Vite servers ready, API listening, ports freed after SIGINT |

> Note: transient `[nodemon] app crashed` lines during development were restart churn from editing server files mid-surgery (code and schema briefly disagreeing); a clean boot after the migration applied shows no errors.

### 0c.2b — §0.9 Africa/Kampala dates ✅

| Step | Work | Status | Notes |
| --- | --- | --- | --- |
| 0c.2b-1 | `server/lib/dates.ts`: `kampalaToday(now?)`, `addDays(iso, days)`, `isMaintenanceDue(nextDue, today?)` — fixed-instant parameters so tests can pin the clock | [x] | Kampala is UTC+3 with no DST; `en-CA` locale formats YYYY-MM-DD at UTC+3 |
| 0c.2b-2 | Write paths: expense and equipment routes default `date` / compare maintenance via the shared helpers instead of `toISOString().slice(0, 10)` | [x] | A 23:30 UTC create now lands on the Kampala "tomorrow" the user sees |
| 0c.2b-3 | Admin mirror `src/lib/dates.ts`; `App.tsx` `getStartDate` delegates, `isDue` helper drives equipment maintenance flags, nav badges and dashboard alerts | [x] | Lint baseline improved to 20 (was 21); no new errors |

### 0c.2b Verification matrix

| Check | Result |
| --- | --- |
| Server + admin typecheck | ✅ exit 0 |
| Admin lint | ✅ 20 errors (baseline was 21 — one pre-existing error fixed, none added) |
| Unit tests (day rollover, calendar arithmetic, due boundary, empty schedule) | ✅ pass (see 0c.2e) |

### 0c.2d — §0.11 SSE event bus ✅

| Step | Work | Status | Notes |
| --- | --- | --- | --- |
| 0c.2d-1 | `server/services/realtime.ts`: pub/sub (`subscribe`/`publish`), 15s heartbeat, `initializeSseStream` (flush headers + `: connected`), `resetSubscribers` for tests; throwing subscribers cannot break the bus | [x] | Events are one-line JSON `{ type, at }` for EventSource |
| 0c.2d-2 | `server/routes/events.ts`: `GET /api/events` with `requireScope('admin', 'laundry', 'portal', 'store')` (staged — pass-through until `AUTH_ENFORCE=true`), mounted in `index.ts` before the admin router | [x] | Every app scope may listen per plan §10.4 |
| 0c.2d-3 | Publish points: `handlers.ts` emits `job-created` + `*-updated` after the response via `eventTypeFor()`; `admin.ts` emits `workspace-reset` after import/reset | [x] | Published post-response so a slow publish never delays the write |
| 0c.2d-4 | Admin `App.tsx` EventSource effect: auto-reconnect (4s backoff) + 30s fallback workspace refresh | [x] | connect-once effect carries an exhaustive-deps disable |

### 0c.2d Verification matrix

| Check | Result |
| --- | --- |
| Live probe: `curl -N /api/events` listener + `POST /api/jobs` | ✅ `event: job-created` received with proper SSE framing; server issued JOB-00146; probe row deleted afterwards |
| `/api/events` in staged mode (no token) | ✅ streams `: connected` |
| Realtime bus unit tests (fan-out, throwing-subscriber isolation, reset) | ✅ pass (see 0c.2e) |
| Server typecheck | ✅ exit 0 |

> Probe history: two earlier 404 "Not found" responses from `/api/events` were a stale nodemon instance serving old code on the API port, not a missing route; the clean boot above is the acceptance run.

### 0c.2e — §0.12 Tests + CI ✅

| Step | Work | Status | Notes |
| --- | --- | --- | --- |
| 0c.2e-1 | `server/test/` node:test suite — `index.ts` entry + `dates.test.ts` (Kampala rollover, addDays, maintenance boundary), `validation.test.ts` (unknown fields → 422, branchless schemas, money preprocessing, equipment usage), `auth.test.ts` (app_scope JWT claims, token-type confusion, tampering, requireScope enforced/staged, realtime bus) | [x] | **17/17 pass** via `npm test` (`node --import tsx --test test/index.ts`); test-file typecheck fixed (`parseBody` results asserted with local types) |
| 0c.2e-2 | `.github/workflows/ci.yml` — server job: postgres:16 service, `npm ci`, typecheck, tests, fresh-database `db:migrate` (001→007), branchless-schema assertion, API smoke boot on :5000; apps job: install+typecheck+build ×4, lint the 3 scaffold apps | [x] | Branchless assertion uses the proven one-liner `tsx -e "import('dotenv/config').then(…)"` form |
| 0c.2e-3 | Root `package.json` gains `test` (delegates to the server); `.gitignore` gains `*.timestamp-*.mjs` (Vite temp artifact) | [x] | Circular `gabfix-erp: file:..` dep confirmed still removed; `npm ci` verified |

### 0c.2e Verification matrix

| Check | Result |
| --- | --- |
| `cd server && npm test` | ✅ 17/17 (tests 17, pass 17, fail 0) |
| `npm run typecheck` (root: 4 apps + server) | ✅ exit 0 |
| Admin `npm run lint` | ✅ 20 pre-existing errors (baseline 21, no new) |
| Admin `npm run build` | ✅ vite build + PWA v0.21.2 green (`dist/sw.js` generated) |

### 0c.2c — §0.10 admin client split ✅ (completes Phase 0c)

| Step | Work | Status | Notes |
| --- | --- | --- | --- |
| 0c.2c-1 | Dependencies: `react-router-dom@7.18.4` + `@tanstack/react-query@5.104.0` added to the admin app | [x] | Router for deep links; query cache for server state (plan §10 concerns table) |
| 0c.2c-2 | `src/app/`: `store.tsx` (WorkspaceProvider: react-query `['workspace']` cache + context for view/modal/query/toast/profile, `refresh` = cache invalidation), `realtime.ts` (SSE → cache invalidation hook, replaces the App.tsx EventSource effect), `layout/{Sidebar,Topbar}.tsx` (nav with badges; global ⌘K search + alerts panel) | [x] | Views now read state from context instead of 8–15 prop drills |
| 0c.2c-3 | `src/features/`: `dashboard.tsx`, `jobs.tsx` (+ shared JobTable), `customers.tsx`, `finance.tsx`, `laundry.tsx`, `assets.tsx` (equipment + inventory), `reports.tsx`, `settings.tsx` (now owns backup import/export/reset), `modals.tsx` (ModalShell + 9 dialogs) | [x] | Markup copied verbatim — rendered UI unchanged |
| 0c.2c-4 | `src/lib/` additions: `money.ts` (setCurrency/money/plain), `csv.ts` (toCsv/exportCsv/downloadCsv), `format.ts` (monthKeyOf/monthName), `profile.ts` (localStorage profile); `src/components/ui.tsx` (PageHeader, Button, EmptyState, MiniStat, SelectFilter, QuickAction, KpiCard, AlertRow, ReportCard, CsvTable, RankedList) | [x] | Pre-existing 20 lint errors lived in the old monolith and are gone; baseline now 0 errors |
| 0c.2c-5 | New `App.tsx`: QueryClientProvider → WorkspaceProvider → BrowserRouter with a catch-all shell route; URL ↔ view sync makes every view deep-linkable (`/dashboard`…`/settings`) | [x] | 92 lines (acceptance: < 150) |

### 0c.2c Verification matrix

| Check | Result |
| --- | --- |
| Admin typecheck | ✅ 0 errors (initial `unknown &&` JSX issue in modals fixed) |
| Admin lint | ✅ **0 errors** (was 20 pre-existing baseline — all removed with the monolith; 3 acceptable `react-refresh/only-export-components` warnings) |
| Admin build | ✅ vite build + PWA v0.21.2 green |
| Deep links on the live dev server | ✅ all 9 view paths + root return 200; every extracted module transforms via vite (no 500s) |
| `App.tsx` size | ✅ 92 lines < 150 acceptance |
| Root typecheck (4 apps + server) | ✅ 0 errors |
| Server tests after the split | ✅ 17/17 |
| Stack boot/shutdown via `scripts/dev.mjs` | ✅ 4 vite instances + API on :5000; all ports freed after shutdown |

> Structural note: the plan's `types/` per-domain split and `features/<domain>/` folders land as later phases add those domains; this split keeps the existing domain list (jobs, customers, finance, laundry, assets, reports, settings) in feature files, matching today's UI surface.

---

## Phase 1 — Data Spine (in progress)

Goal: give the operation its financial and operational backbone — payments with a double-entry ledger, job/laundry date and assignment fields, job costing, asset depreciation — each slice independently verifiable per plan §18.1.

### 1a — Money spine: payments + double-entry ledger ✅

Migration `008_money.sql` (plan's "005_money", renumbered to the next free file): `chart_of_accounts` (10 seeded accounts: 1000 cash, 1010 momo float, 1020 bank, 1100 AR, 2000 AP, 3000 equity, 4000/4100 revenue, 5000/6000 costs), `payment_methods` (cash, MTN MoMo, Airtel Money, bank, cheque — each linked to its float account), `payments` (server-issued PAY-NNNNN, direction in/out, one-document CHECK, status pending/confirmed/reconciled/voided, soft delete), `journal_entries` + `journal_lines` (server-issued JNL-NNNNN, per-line debit/credit CHECK one-side-only). PAY/JNL sequences seeded in 004 and re-defended in 008 (start above imported numbers).

| Step | Work | Status | Notes |
| --- | --- | --- | --- |
| 1a.1 | Migration `008_money.sql` — account chart, methods, payments, journal, touch triggers, sequence defence | [x] | Fresh-DB safe: `chart_of_accounts` is created before `payment_methods` (whose `gl_account_code` references it). `recorded_by`/`posted_by` are UUID (employees.id is UUID) |
| 1a.2 | `services/ledger.ts` — `postJournalEntry()` posts one balanced entry inside the caller's transaction: ≥2 non-zero lines, rounded debits == credits, JNL numbering via `nextNumber()` | [x] | Rejects unbalanced entries in code before any write (tested with a null client) |
| 1a.3 | `services/payments.ts` — `createPaymentInTx()`: one transaction claims PAY number, inserts the payment, posts the journal (debit method's float account, credit AR 1100; direction-out flips through AP 2000), recomputes invoice `paid`/status (Paid / Partially Paid / Overdue / Unpaid vs due date), laundry `paid` (status is fulfilment and is never touched by money), customer balance across invoices + laundry | [x] | Method decides the asset account via `payment_methods.gl_account_code`; document must belong to the paying customer; refunds (direction-out) subtract from `paid` via a direction-signed sum |
| 1a.4 | `routes/payments.ts` + mount `/api/payments` (all four scopes) + SSE `payment-created` broadcast (admin `realtime.ts` EVENT_TYPES extended) | [x] | Custom handler (journal + balance side effects) instead of the generic `createHandler`; published post-response |
| 1a.5 | Read layer: `/api/data` gains `payments` (snake→camel aliased, deleted rows excluded); admin client receives it in the workspace payload (types updated client-side when the payments UI slice lands) | [x] | Payment rows join every workspace fetch and backup payload shape |
| 1a.6 | Reset/import safety: `journal_lines`/`journal_entries`/`payments` added to `TRUNCATE_TABLES` (payments reference invoices/customers/laundry_orders/jobs, so CASCADE alone would orphan money rows on reset) | [x] | Import order: paymentsResource not yet in `RESOURCES` — payment restore from backups arrives with the finance UI slice |
| 1a.7 | Tests: 6 new (payment schema 422s incl. zero/negative amounts, unknown-field rejection, ledger invariant enforced pre-write, transactional payment integration, rollback on unknown method) — suite now 23/23 | [x] | Integration tests run against the real DB and **roll back instead of committing**, so dev/CI databases keep no fixtures (an earlier committed-fixture leak was found via the live probe and fixed); DB unreachable → integration tests skip with a warning |

### 1b — Job dates, priority, site, attribution, events and assignments ✅

Migration `009_jobs_dates.sql` (plan's "004_jobs_dates_assignments", renumbered, branchless): splits the job lifecycle into day-level dates (`scheduled_date`, `quote_date`, `promised_at`) and instant timestamps (`started_at`, `completed_at`, `invoiced_at`, `paid_at`), adds commercial attribution (`salesperson_id`, `manager_id`), the work site (`site_address`, `lat`, `lng`), `priority` (Low/Normal/High/Urgent), plus `job_events` (append-only lifecycle log) and `job_assignments` (per-employee, role, accepted/completed instants). The legacy `date` column stays — it is the execution day the UI edits today.

| Step | Work | Status | Notes |
| --- | --- | --- | --- |
| 1b.1 | Migration `009_jobs_dates.sql` + backfill: `scheduled_date = date` everywhere; `quote_date` for Quoted jobs; started/completed instants pinned to the legacy day (09:00/17:00) for Completed/In Progress work | [x] | Additive, re-runnable (`ADD COLUMN IF NOT EXISTS`); `invoiced_at`/`paid_at` stay null — jobs carry no invoice link historically |
| 1b.2 | `jobsResource` create/patch/columns extended (dates, priority, salesperson, manager, site, lat/lng); lifecycle timestamps deliberately **not** client-writable — they move when status endpoints land | [x] | Strict schemas reject `startedAt` with 422 (tested) instead of silently dropping |
| 1b.3 | Read layer: `/api/data` jobs select gains the new columns (snake→camel aliased, lat/lng as float8) | [x] | Extra fields are additive to the client payload; admin types pick them up with the Phase 1 UI slice |
| 1b.4 | Tests: 5 new (create accepts new fields incl. numeric-string coords; legacy-only create still valid; bad priority/date rejected; patch accepts new fields but rejects lifecycle timestamps; DB integration: backfill completeness, assignments/events insert + cascade) — suite now 28/28 | [x] | Integration test rolls back; fixtures never commit |

### 1b Verification matrix

| Check | Result |
| --- | --- |
| `npm run db:migrate` applies 009 | ✅ applied cleanly on the dev DB |
| Server typecheck | ✅ 0 errors |
| Server tests | ✅ 28/28 (was 23; +5 jobs-dates) |
| Backfill probe (in-test) | ✅ zero jobs with null `scheduled_date`; zero Completed jobs without `completed_at` |
| Cascade behaviour | ✅ deleting a job removes its assignments and events |

---

### 1a Verification matrix

| Check | Result |
| --- | --- |
| `npm run db:migrate` applies 008 on the existing dev DB | ✅ applied cleanly; dev DB already had the FK order fix |
| Server typecheck | ✅ 0 errors |
| Server tests | ✅ 23/23 (was 17; +6 payments/ledger, DB-gated integration) |
| Admin typecheck after `realtime.ts` change | ✅ 0 errors |
| Live end-to-end probe (booted stack, POST /api/payments 250k cash against seed invoice i1) | ✅ `PAY-00003` + `JNL-00003` issued transactionally; journal balanced (debit 1000 cash 250k / credit 1100 AR 250k, `source='payment'`, `source_id` backlink); invoice i1 → Partially Paid paid=250,000; customer c2 balance → 3,000,000; payment visible in `/api/data` with `received_at` on the Kampala day |
| Test-fixture hygiene | ✅ integration tests roll back; dev DB probed clean after the fix; PAY/JNL sequences never reused (transactional `UPDATE…RETURNING` consumed 00001–00002 during failed runs — by design) |
| CI workflow notes | ✅ fresh-db migrate step renamed 001→008; postgres:16 service runs the DB-gated integration tests |
| Stack boot/shutdown via `scripts/dev.mjs` | ✅ all 5 ports bound; `ALL_PORTS_FREE` after taskkill |

> Design notes: numbers are claimed inside the payment transaction (`nextNumber` `UPDATE…RETURNING`), so a rolled-back payment burns its number — correct, never reuse. `deleted_at` soft deletes keep receipts auditable; counted statuses are confirmed/reconciled only. Journal lines carry optional customer/job dimensions for later P&L-by-customer reporting.

---

## Later phases (summary — see plan §18.1)

| Phase | Goal | Estimate | Status |
| --- | --- | --- | --- |
| 0a. Multi-app scaffold | 4 apps (admin + 3 new) + root scripts + per-app configs + ports | 2–3 d | [x] |
| 0b. Theme, components & PWA shells | Vendored tokens + useTheme + StatusBadge + PWA manifests | 1–2 d | [x] |
| 0c. Backend multi-app wiring | 005/006/007 migrations, app_scope + requireScope, CORS, scoped mounts; branches removed; §0.9/§0.10/§0.11/§0.12 all done | 3–5 d | [x] |
| 1. Data spine | Payments, methods, ledger, costing, job/laundry dates, assets | 8–12 d | [~] — 1a payments+ledger, 1b job dates/assignments done |
| 2. PDF and documents | pdfkit service, 12 document types, download/attach plumbing | 5–7 d | [ ] |
| 3. Notifications, feedback, real-time | WhatsApp/SMS adapters, completion message, public feedback form, SSE wiring | 8–12 d | [ ] |
| 4. Field operations | Employees, devices, assignments, `/field` beacon, live map, geofences | 8–12 d | [ ] |
| 5. Sales and manager dashboard | Attribution, pipeline, commissions, role-scoped dashboards | 6–9 d | [ ] |
| 6. Real-time upgrade | Socket.IO chat, Inbox, presence, live map streaming | 5–8 d | [ ] |
| 7. Depth | Payment gateway + reconciliation, scheduled reports, dunning | 5–10 d | [ ] |

**Parallel track (day one):** Meta Business verification + WhatsApp template approval
(gates Phase 3; days-to-weeks lead time).

---

## Change log

| Date | Change |
| --- | --- |
| 2026-09-25 | Progress doc created; plan moved to `docs/plans/enhance.md`; requirements moved to `docs/requirements.md`; Phase 0 started |
| 2026-09-25 | Phase 0.1 done: circular `gabfix-erp: file:..` dependency removed from both packages and lock files; requirements relocated; `.env.example` confirmed |
| 2026-09-25 | Phase 0.2 done: migration runner (`migrate.ts` + `migrations/001_baseline.sql`) wired into `bootstrap-db.ts`; `schema.sql` retired; `db:migrate` script added; fresh/existing/re-run paths all verified; server boots with "Schema up to date" |
| 2026-09-25 | Phase 0.3 done: `002_audit_columns.sql` adds created_at/updated_at/created_by/deleted_at plus `touch_updated_at()` trigger to all 9 tables; verified 9/9 tables, trigger bumps updated_at, `GET /api/data` response shape unchanged |
| 2026-09-25 | Phase 0.4 done: `003_identity.sql` creates `employees` + `devices`; `ensureOwner()` seeds the bcrypt-hashed owner from `OWNER_PASSWORD` on every bootstrap (also on pre-identity DBs where seeding is skipped); verified owner row and password check |
| 2026-09-25 | Phase 0.5 done: `middleware/auth.ts` (signTokens/verifyToken/requireAuth/requireRole, staged `guard()` behind `AUTH_ENFORCE`) and `routes/auth.ts` (login/refresh/logout/me) wired into `index.ts`; duplicate `/api/health` route removed; `/api/import` and `/api/reset` are owner-only under enforcement; 13/13 acceptance checks pass with the flag on, unchanged behaviour with it off (default) |
| 2026-09-25 | Phase 0.6 done: `server/index.ts` reduced to 60 lines of wiring; the 13 handlers moved to one router per domain (`server/routes/*`) backed by `server/repositories/*` (SQL) and `server/lib/*` (table metadata, HTTP helpers). 43-check parity probe, 14-check enforcement probe and 11-check identity probe all pass; client production build green. Fixed identity loss: `TRUNCATE … CASCADE` used to delete `employees`/`devices` on `/api/reset` and `/api/import` |
| 2026-09-25 | Phase 0.7 done: Per-route Zod schemas replacing the generic column map (`server/validation/*`). Replaced unsafe `z.coerce.number()` with `z.preprocess()` so null and empty strings fail with 422; backup import reports array-indexed field paths (e.g. `branches[0].unknown_col`) and rolls back on failure; empty PATCH bodies return 422; live 44-probe check passed and client build clean |
| 2026-09-26 | Phase 0a: `git mv client gabfix-administrator` (keeps git history); scaffolding 3 new apps + shared packages; root dev scripts; per-app vite.config.ts + tailwind + theme tokens |
| 2026-09-26 | Phase 0a (post-scaffold fixes): Fixed `@typescript-eslint/no-explicit-any` in all 3 new apps' `vite.config.ts` by replacing `let pwaPlugin: any = []` with `let pwaPlugin: Plugin[] = []` + importing `Plugin` from `vite`; added explicit `port` + `strictPort: true` to each app's `server` config (admin 5173, laundry 5174, portal 5175, store 5176); updated `scripts/dev.mjs` to spawn all 5 processes (server + 4 apps) via root `npm run dev`; build verification: all 4 apps compile with exit 0 (1568–1570 modules each); `vite-plugin-pwa` remains optional via try/catch (expected warning: "not installed — PWA features disabled") |
| 2026-09-26 | Updated progress doc: added Phase 0a section with steps (aligned to `multi-app-plan.md` §15), App Registry (§2), post-scaffold fixes table, and verification matrix; added `multi-app-plan.md` as plan reference; marked Phase 0a `[x]` in phase overview table; status updated to "Phase 0a complete · Phase 0b pending" |
| 2026-09-26 | Phase 0b: `useTheme` hook (`src/hooks/useTheme.ts`) in all 4 apps — dark/light toggle via `data-theme` attribute on `<html>`, localStorage persistence, `prefers-color-scheme` fallback, scoped per-app via `VITE_APP_ID`; inline theme-detection script in each `index.html` prevents FOUC | 
| 2026-09-26 | Phase 0b: `StatusBadge` component (`src/components/StatusBadge.tsx`) in all 4 apps — extracted from admin's inline `App.tsx` function (replaced inline def with `@/components/StatusBadge` import); tone logic preserved (success/danger/info/warning); vendored per app per plan §8 |
| 2026-09-26 | Phase 0b: PWA shells — `public/manifest.webmanifest` + `<link rel="manifest">` added to all 4 `index.html` files; `vite-plugin-pwa` config added to admin's `vite.config.ts` (try/catch pattern matching 3 new apps); all 4 apps have optional PWA support |
| 2026-09-26 | Phase 0b: `.status` CSS classes + `[data-theme="dark"]` dark-mode overrides added to all 4 apps' CSS files (`tokens.css` / `index.css`); CSS variables updated for dark mode in all apps |
| 2026-09-26 | Phase 0b: `.env` files created for all 4 apps setting `VITE_APP_ID` (admin/laundry/portal/store); `vite-env.d.ts` (with `vite/client` reference) created for 3 new apps to resolve `import.meta.env` type errors |
| 2026-09-26 | Phase 0b verification: all 4 apps pass `tsc --noEmit` typecheck; 3 new apps pass ESLint; admin's modified files introduce no new lint errors; all 4 apps build with `vite build` (exit 0); progress doc updated with Phase 0b section, updated App Registry, and verification matrix
| 2026-09-26 | Dev-env fix: `scripts/dev.mjs` shutdown now kills the whole child process tree (`taskkill /T /F` on Windows) instead of `child.kill()`, which orphaned vite/tsx processes that kept ports 5173–5176 + 4000 occupied and broke subsequent `npm run dev` runs ("Port 5174 is already in use"). Verified: clean startup on all ports, zero listeners after shutdown. Note: "vite-plugin-pwa not installed — PWA features disabled" warnings remain expected until the plugin is installed in each app dir |
| 2026-09-26 | PWA enabled for real in all 4 apps: pinned `vite-plugin-pwa@^0.20.7` did not exist on npm (0.20.x ends at 0.20.5), so every `npm install` had failed silently behind the try/catch. Repinned to `^0.21.2` (peer-supports the apps' Vite 5.4), installed per-app, and removed the invalid `BackgroundSync` runtimeCaching entry from portal's vite config (workbox-build v7 rejects it and aborts the build; offline queueing belongs to the Dexie outbox per plan §6 and `/api/` NetworkFirst already covers `/api/beacon`). All 4 apps build green with `PWA v0.21.2` + `dist/sw.js` + manifest; the "PWA features disabled" warning is gone in dev |
| 2026-09-26 | Phase 0c.1 done: `005_multiapp_identity.sql` (app_scope + storekeeper + owner=all-4 scopes + single-owner index), `007_sync_outbox.sql` (sync_outbox + feedback_requests), `requireScope` guard + `app_scope` in JWTs (pre-0c tokens fall back to admin scope), CORS allowlist (4 Vercel origins + 5173–5179, `CORS_ALLOW_ALL` escape hatch), scoped route mounts per plan §10.4. Verified: DB probe 8/8, API probe staged 5/5 + enforced 8/8, root typecheck clean; temp probes deleted |
| 2026-09-26 | Phase 0c verification against live stack: baseline boot (5 processes, 0 PWA warnings, clean SIGINT shutdown, no orphans) and enforced-mode boot (AUTH_ENFORCE=true temporarily set then reverted): 401 without token through all four apps' `/api` proxies, owner JWT carries all 4 scopes, owner token → 200 through every proxy |
| 2026-09-26 | Phase 0c.2a done — branches removed everywhere (single-shop per plan decision #9): `006_remove_branches.sql` drops catalog-discovered FKs + `branch_id` columns + `branches`; seed data, `db.ts`, validation resources, `TRUNCATE_TABLES`, bootstrap empty-check, and the admin app (types, branch switcher, filters, table column, Branch-performance report, form selects, dead CSS) all de-branched. Verified: schema probe 8/8, fresh-DB bootstrap 5/5, write-path probes 7/7 (branchId → 422, reset intact), root typecheck 0, admin lint back at 21-error baseline, admin build green with PWA. Temp probes deleted |
| 2026-09-27 | Phase 0c.2b done (§0.9): `server/lib/dates.ts` (`kampalaToday`/`addDays`/`isMaintenanceDue`) + admin mirror `src/lib/dates.ts`; expense/equipment date defaults and maintenance flags now use Kampala local days instead of UTC slices; App.tsx `getStartDate`/`isDue` rewiring. Admin lint baseline improved to 20 (was 21) |
| 2026-09-27 | Phase 0c.2d done (§0.11): realtime pub/sub service + `GET /api/events` SSE route (all scopes, staged enforcement), `job-created`/`*-updated`/`workspace-reset` publishes, admin EventSource with reconnect + 30s fallback refresh. Live acceptance probe: job POST streamed `event: job-created` (JOB-00146 issued, probe row deleted); two earlier 404s traced to a stale nodemon serving old code, not a missing route |
| 2026-09-27 | Phase 0c.2e done (§0.12): 17-test node:test suite (dates, validation, auth/scopes, realtime bus) — 17/17 pass; `.github/workflows/ci.yml` (server job: postgres:16, fresh-db migrate 001→007, branchless assertion, API smoke; apps job: typecheck+build ×4, lint ×3); root `npm test`; `.gitignore` += `*.timestamp-*.mjs`; test-file typecheck fixed |
| 2026-09-27 | API port moved 4000 → 5000 (user request): server default `PORT` fallback, all 4 vite proxies, CI health-check URL, `server/.env.example`, README; `server/.env` already updated by hand. Seed UUIDs containing "4000" and the SSE 4s reconnect delay were left untouched (not port references). Probe note: ports 5173/5174/4000 were occupied by another project's dev servers — killed with permission before booting |
| 2026-09-27 | Smoke test of the full stack after the port move: all 4 apps served their titles on 5173–5176, `/api/health` green through the 5173 proxy, SSE streamed through the proxy, `scripts/dev.mjs` shutdown freed every port. Also cleared two duplicate nodemon→tsx chains that were fighting over :5000 |
| 2026-09-27 | Phase 0c.2c done (§0.10) — **Phase 0c complete**: admin client split into `app/` (store.tsx react-query context, realtime.ts SSE hook, layout/Sidebar+Topbar), `features/` (9 views incl. modals), `lib/` (money, csv, format, profile), `components/ui.tsx`; react-router-dom deep links + @tanstack/react-query cache; `App.tsx` 641 → 92 lines; lint baseline 20 → 0 errors. Verified: typecheck 0, build + PWA green, 9 deep links 200 on the live server, root typecheck 0, server tests 17/17 |
| 2026-09-27 | Dev-env fix — admin "ENOENT react/index.js while updating dependencies": root cause was an accidental npm **workspaces** install at the repo root (root `package-lock.json` created during 0c.2c), which hoisted all app deps to `node_modules/` while vite's per-app optimizer and the per-app locks expected standalone installs; the stale admin lock (missing react-router-dom/@tanstack/react-query) then reconciled `node_modules` down and deleted react itself. Fix: removed `workspaces` from root `package.json`, deleted root `package-lock.json`/`node_modules`, clean `npm install` per app dir (matching CI's per-app `npm ci`). Verified: all 4 apps have react locally, stack boots with 0 errors in the log, admin modules transform 200, ports freed |
| 2026-09-27 | Phase 1b done — job dates & assignments: `009_jobs_dates.sql` adds job lifecycle dates (scheduled/quote/promised), instants (started/completed/invoiced/paid — server-managed), salesperson/manager attribution, site address + coordinates, priority; `job_events` + `job_assignments` tables; legacy `date` backfilled everywhere. jobsResource create/patch extended; `/api/data` jobs select widened. Tests 23 → 28. Verified: typecheck 0, migrate clean on dev DB, backfill + cascade probed in-test |
| 2026-09-27 | Phase 1a done — money spine: `008_money.sql` (chart_of_accounts, payment_methods, payments, journal_entries/lines, PAY/JNL sequence defence), `services/ledger.ts` (balanced postJournalEntry), `services/payments.ts` (createPaymentInTx: PAY numbering + journal + invoice/laundry/customer balance recompute in one transaction), `routes/payments.ts` + `/api/payments` mount, `payments` key in `/api/data`, `payment-created` SSE, money tables added to TRUNCATE set. Verified: server typecheck 0, tests 23/23 (integration tests rollback-clean), live probe: PAY-00003/JNL-00003 balanced, invoice i1 Partially Paid, c2 balance 3,000,000 |




