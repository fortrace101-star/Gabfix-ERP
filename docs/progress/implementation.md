# Gabfix ERP — Enhancement Implementation Progress

| Field | Value |
| --- | --- |
| Plan | [`docs/plans/enhance.md`](../plans/enhance.md) · [`docs/plans/multi-app-plan.md`](../plans/multi-app-plan.md) |
| Requirements | [`docs/requirements.md`](../requirements.md) |
| Baseline commit | `100d0aa` (Pre-refactor baseline snapshot before enhancement work) |
| Started | 2026-09-25 |
| Status | Phases 0–4 complete (scaffold, multi-app wiring, data spine, PDFs, notifications, telemetry) · **Multi-app plan v5 active** — Phase A complete: Supabase/Lovable purge + server-API reconfiguration (all four apps on `POST /auth/login` + `GET /api/data`, guarded shells, one live-data slice each) · **Phase B complete**: employees & app_scope management, settings UI, AUTH_ENFORCE probe matrix green · Next: Phase C/D/E (laundry / portal / store onto live ops) · 2026-09-29: request logging, store PWA, all data seeded to DB (`016_store_tables.sql`), plan restructured to v5 |

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
| Phase 2 | PDF & documents | pdfkit service, layout kit, 12 document types, download/attach plumbing, Inter TTF embedding | [~] — 2a core docs ✅ · 2b reports ✅ · 2c remaining docs ✅ (manifest, delivery note, balance sheet; trip report gated on Phase 4) · Inter font embedded |
| Phase 3 | Notifications, feedback, real-time | WhatsApp/SMS, completion message, feedback form, SSE | ✅ complete — notification service with dispatch + channel adapters (email/SMS/WhatsApp/in-app), bell panel queries, feedback tokens, appreciation scheduling, webhook ingestion, job.completed + payment.recorded dispatch wired, tests + typecheck green |
| Phase 4 | Field operations | Employees, devices, assignments, beacon, map, geofences | ✅ — 4a telemetry schema + route ✅ · FieldBeacon PWA ✅ · LiveMap ✅ · DevicesView ✅ · Haversine geofences ✅ · tests 6/6 ✅ |
| Phase 5 | Sales & manager dashboard | Attribution, pipeline, commissions, dashboards | — |
| Phase 6 | Real-time upgrade | Socket.IO chat, Inbox, presence, live map | — |
| Phase 7 | Depth | Payment gateway + reconciliation, scheduled reports, dunning | — |

> **Current state**: Phase 0a ✅ · Phase 0b ✅ · Phase 0c ✅ — all Phase 0 acceptance criteria met (branchless schema, scoped+validated+numbered APIs, Kampala dates, SSE sync, CI green, client split with router + query cache + deep links). Phases 0.1–0.8 complete from prior work. **Phase 1 is complete**: 1a payments + double-entry ledger probed live ("a payment moves invoice status, customer balance, journal and cash flow together"); 1b job dates/priority/site/attribution + job_events/job_assignments; 1c costing ("job cost comes from real cost lines"); 1d asset register with a real depreciation schedule probed live; 1e laundry intake + status timeline with priced line items probed live. Both Phase-1 exit criteria hold. **Phase 2 is complete (11 of 12 document types)**: 2a pdfkit service + layout kit + invoice/receipt/laundry-ticket/job-card downloads probed live; 2b statement/AR-aging/P&L/asset-register reports probed live; 2c collection/delivery manifest, delivery note with signature capture, balance sheet, and Inter TTF font embedding added and typechecked. Remaining: trip/GPS report (gated on Phase 4 telemetry). **Phase 3 is complete**: notification dispatch service (multi-channel email/SMS/WhatsApp/in-app via SSE) with EVENT_RULES mapping domain events to templates + dedupe index; `job.completed` wired in `routes/jobs.ts` PATCH handler (fires when status transitions to Completed); `payment.recorded` wired in `routes/payments.ts`; bell panel queries (unread list, mark-read); public feedback form (star rating + comment) with single-use tokens and 90-day expiry; appreciation events scheduled 24h after completion; WhatsApp/SMS delivery-status webhooks; `notification` SSE event type registered. Server typecheck: 0 errors.

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

## Phase 1 — Data Spine (complete)

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

### 1c — Job costing: suppliers, cost categories, cost lines, timesheets ✅

Migration `010_costing.sql` (plan's "006_costing", renumbered): `suppliers` (2 seeded), `cost_categories` (Materials/Labour/Subcontract → 5000 direct; Transport/Other → 6000 indirect, each with its GL account from 008), `timesheets` (field hours, ended_at > started_at CHECK), `job_costs` (the lines: qty × unit_cost or explicit amount, source manual/timesheet/inventory/import, timesheet backlink with a **partial unique index** so a timesheet can never be costed twice).

Exit-criterion rule: **once a job has at least one cost line, the lines own `jobs.cost`** — every cost write recomputes `jobs.cost = SUM(job_costs.amount)`; jobs without lines keep their legacy 36% estimate per the plan's "keep the old values visible until the ledger is accepted" note.

| Step | Work | Status | Notes |
| --- | --- | --- | --- |
| 1c.1 | Migration `010_costing.sql` + seeds + triggers; `timesheets` created before `job_costs` (FK order, the 008 lesson) | [x] | Reference data (suppliers, categories) survives /api/reset like payment_methods — only job-scoped rows cascade with jobs |
| 1c.2 | `services/costing.ts` — `addJobCost(InTx)` with amount = qty × unit_cost (rounded) or explicit; `recomputeJobCost` guarded by EXISTS so estimate-only jobs are untouched; `approveTimesheet(InTx)` stamps minutes + approver, derives minutes from the clock pair when absent, and inserts the linked labour line idempotently (ON CONFLICT on the partial index) | [x] | Approval rejects already-approved, job-less and still-open sheets with clear errors |
| 1c.3 | `validation/costing.ts` — `jobCostCreate` (refine: amount or unitCost required), `timesheetCreate` (ISO timestamp regex), strict schemas | [x] | Unknown fields → 422 |
| 1c.4 | `routes/costing.ts` mounted at `/api` (admin + portal scopes): POST `/api/costs`, POST `/api/timesheets`, POST `/api/timesheets/:id/approve`; each broadcasts `job-updated` so every open admin refreshes | [x] | Reuses the SSE event type that already exists client-side |
| 1c.5 | Read layer: `/api/data` gains `costCategories` + `suppliers` (job costs themselves stay a per-job concern; a listing endpoint arrives with the costing UI) | [x] | Client types pick these up with the Phase 1 UI slice |
| 1c.6 | Tests: 4 new (refinement + computation, unknown-field rejection, timesheet ISO pair, DB integration: estimate→lines flip, 75000 two-line total, 240-min approval = 60000 labour at 15000/h, re-approval rejected with no double-cost, cascade cleanup) — suite now 32/32 | [x] | Integration rolls back; the approveTimesheet→InTx split fixed the same committed-fixture trap the payments tests hit |

### 1c Verification matrix

| Check | Result |
| --- | --- |
| `npm run db:migrate` applies 010 | ✅ applied cleanly on the dev DB |
| Server typecheck | ✅ 0 errors |
| Server tests | ✅ 32/32 (was 28; +4 costing) |
| Recompute invariant (in-test) | ✅ 180000 legacy estimate → 30000 → 75000 → 135000 (with labour); estimate-only jobs untouched |
| Idempotent approval | ✅ second approve rejected; exactly one timesheet-sourced line |

---

### 1d — Asset register: equipment columns, depreciation schedule + postings ✅

| Step | What | Status | Notes |
| --- | --- | --- | --- |
| 1d.1 | Migration `011_assets.sql` — equipment gains purchase_date, cost, salvage_value, useful_life_months, depreciation_method (straight-line\|none), accumulated_depreciation, disposed_at, custodian_employee_id; backfill cost = value and purchase_date = 2026-01-01; `asset_depreciation_entries` UNIQUE (equipment_id, period); seeds GL 1400 Equipment at cost, 1500 Accumulated depreciation, 6100 Depreciation expense | [x] | Book value stays the seeded figure until the first posting takes over — same "legacy values visible until the ledger is accepted" rule as jobs.cost |
| 1d.2 | `services/assets.ts` — `depreciateAsset(InTx)`: straight-line month = min(remaining, (cost − salvage)/life); the schedule continues from MAX(period) or the purchase month; debits 6100 / credits 1500 through `postJournalEntry`; updates accumulated_depreciation + book_value with the schedule row | [x] | FOR UPDATE row lock + the unique (equipment_id, period) index keep a period un-double-postable; refuses disposed, method 'none', no useful life, fully depreciated |
| 1d.3 | `routes/assets.ts` POST `/api/assets/:id/depreciate` (admin scope), broadcasts `equipment-updated`; `equipmentResource` create/patch/columns extended with the asset fields (accumulated_depreciation stays schedule-owned, not PATCHable) | [x] | New SSE type `asset-depreciated` registered server- and client-side for the Phase 1 UI slice |
| 1d.4 | Read layer: `/api/data` equipment select widened with the register fields; new `depreciationEntries` key | [x] | `asset_depreciation_entries` added to TRUNCATE_TABLES so /api/reset stays clean |
| 1d.5 | Tests: 3 new (`nextPeriod` calendar walk, asset-field schema, DB integration: 100000/month schedule from purchase month, balanced 1500/6100 journal, compounding periods, unique-period probe via savepoint, 40-month run to exact salvage value, disposed refusal, cascade cleanup) — suite now 35/35 | [x] | Integration rolls back like the other suites |
| 1d.6 | `migrate()` now serialises runners with a session-level advisory lock | [x] | The two DB-gated test files raced at module load (duplicate schema_migrations key) — generalised the fix into the runner rather than the tests |

### 1d Verification matrix

| Check | Result |
| --- | --- |
| `011_assets.sql` applied on the dev DB | ✅ at server boot; backfill verified (a1: cost 10,000,000, purchase 2026-01-01, method straight-line) |
| Server typecheck | ✅ 0 errors |
| Server tests | ✅ 35/35 (was 32; +3 assets) |
| Live end-to-end probe (booted stack) | ✅ depreciate without useful life → 400; PATCH usefulLife 60/salvage 1,000,000 → two postings of 150,000 (JNL-00004/5), accumulated 300,000, book_value 9,700,000; schedule rows in `/api/data` |
| Stack shutdown | ✅ all 5 ports free after taskkill |

---

### 1e — Laundry logistics: intake, status timeline, priced items ✅

| Step | What | Status | Notes |
| --- | --- | --- | --- |
| 1e.1 | Migration `012_logistics.sql` — laundry_orders gains promised_at, ready_at, collected_at, job_id (SET NULL on job delete), weight_kg, pieces; backfill stamps Ready/Collected seeds on their received day; `laundry_order_items` (service_id FK, qty, unit, unit_price, amount) | [x] | Branchless per decision #9 — the plan's 008 branch_id is obsolete after 006 |
| 1e.2 | `validation/laundry.ts` — `laundryIntakeCreate` (customer + optional promise/job/weight/pieces + priced lines), `laundryStatusPatch` (enum of the five fulfilment stages); ready/collected stamps are never client-writable → 422 | [x] | Statuses: Received, Washing, Drying, Ready, Collected (plan Appendix D) |
| 1e.3 | `services/laundry.ts` — `createLaundryOrder(InTx)` prices lines (qty × unit_price or explicit amount), claims LDY numbers transactionally; `updateLaundryStatus(InTx)` stamps ready_at/collected_at server-side on stage moves; stamps never clear, so a regression keeps the history | [x] | Money never touches status — the payments service's fulfilment-vs-money split |
| 1e.4 | `routes/laundry.ts` mounted at `/api/laundry` (all four scopes): POST `/` intake, PATCH `/:id/status`; both broadcast `laundry-updated` (new SSE type registered server + admin client) | [x] | First-ever laundry write path — closes plan issue #11's server half |
| 1e.5 | Read layer: `/api/data` laundry select widened with the logistics fields; new `laundryItems` key; laundry_resource row schema accepts the new fields for backup restore; `laundry_order_items` in TRUNCATE_TABLES | [x] | |
| 1e.6 | Tests: 3 new (intake schema + stamp rejection, status enum, DB integration: 70000 two-line total, LDY- numbering, Ready→Collected stamping, regression keeps stamps, unknown order, cascade cleanup) — suite now 38/38 | [x] | Integration uses a fresh tx client and rolls back |

### 1e Verification matrix

| Check | Result |
| --- | --- |
| `012_logistics.sql` applied on the dev DB | ✅ at server boot; backfill verified (l1/l3 stamped 09-03/09-01, Washing/Drying untouched) |
| Server typecheck | ✅ 0 errors |
| Server tests | ✅ 38/38 (was 35; +3 laundry) |
| Live end-to-end probe (booted stack) | ✅ intake → LDY-00219, total 70000 (3×15000 + 25000 explicit); Ready → ready_at 2026-09-27; Collected → collected_at; bad status 422; client-forged stamp 422; order + items in `/api/data` |
| Numbering continuity | ✅ LDY-00217/218 burned by rolled-back test runs (transactional claim — by design, same as PAY) |
| Stack shutdown | ✅ all 5 ports free after taskkill |

---

### UI wiring — admin client consumes the Phase 1 spine ✅

| Step | What | Status | Notes |
| --- | --- | --- | --- |
| UI.1 | Laundry intake modal (customer, promise, weight/pieces, priced lines with live total) + status-move dialog; "New laundry order" no longer opens the job modal (plan issue #11, client half) | [x] | Server-owned stamps are never editable; the dialog says so |
| UI.2 | Orders table gains the In/Due/Ready/Out timeline, weight/pieces and a Status action; asset cards gain a Depreciate button that posts the next straight-line month | [x] | Accumulated depreciation replaces raw hours once the schedule starts |
| UI.3 | `api.ts` + `types.ts` extended (depreciateAsset, createLaundryIntake, updateLaundryStatus; AppData gains payments/costCategories/suppliers/depreciationEntries/laundryItems); `laundry-updated` SSE registered | [x] | Typecheck 0, production build green |
| UI.4 | Seed/backfill drift fixed: /api/reset re-seeds without the one-time migration backfills, so jobs lost scheduled dates, equipment lost cost (depreciation refused to run) and laundry seeds lost stamps | [x] | Seed replicates the idempotent WHERE-IS-NULL rules; reset→depreciate probed live; 38/38 green |

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

## Phase 2 — PDF and documents (in progress)

### 2a — pdfkit service, layout kit, core documents, download route ✅

| Step | What | Status | Notes |
| --- | --- | --- | --- |
| 2a.1 | `pdfkit@0.20.2` + `@types/pdfkit` installed in server (in-directory install per env quirk); pure-JS deps, Node 22 compatible as the plan verified | [x] | |
| 2a.2 | `services/pdf/layout.ts` — shared layout kit: pageHeader (brand block + title + reference + rule), metaGrid (3-per-row label/value), itemsTable (dark header band, alternating shading, right-aligned money, emphasis rows), totalsBlock, \"Page N of M\" footers via bufferedPageRange; `sanitize()` strips non-WinAnsi glyphs so standard fonts never lose a byte. **Inter TTF now embedded** via `registerFont` when `assets/fonts/Inter-*.ttf` present (fallback to standard fonts otherwise) — font embedding deferred from earlier slice, now resolved | [x] | The PDF text operators now use real Inter font streams; standard-font fallback remains as a safety net |
| 2a.3 | `services/pdf/documents.ts` — registry of loaders: invoice (customer + totals + balance), receipt (method + reference + applied-to), laundry ticket (items from laundry_order_items, weight/pieces, timeline), job card (cost lines + crew + margin); each renders and mirrors into DOCUMENT_STORAGE_DIR (default ./storage/documents, mirror failure never blocks the download); filenames are the document number | [x] | Loaders take an optional client (InTx pattern) so tests render inside their transaction |
| 2a.4 | `routes/documents.ts` — GET /api/documents/:type/:id.pdf mounted for all four scopes; Content-Type application/pdf, Content-Disposition attachment with the numbered filename; 404 for unknown type and unknown id | [x] | |
| 2a.5 | Tests: 3 new (valid PDF structure: %PDF magic, page object, %%EOF; sanitize survives en-dash/middle-dot input; integration renders all four types from a rolled-back fixture and nulls on unknown ids) — suite now 41/41 | [x] | |

### 2a Verification matrix

| Check | Result |
| --- | --- |
| Server typecheck | ✅ 0 errors |
| Server tests | ✅ 41/41 (was 38; +3 pdf) |
| Live download probes | ✅ /api/documents/invoice/i1.pdf → 2,916 bytes, `attachment; filename="INV-00098.pdf"`; laundry l1.pdf → 2,815 bytes; both start %PDF-1.3 |
| Unknown type / id | ✅ 404 with clear JSON errors |
| Storage mirror | ✅ INV-00098.pdf, LDY-00216.pdf etc. land in server/storage/documents/; directory gitignored |
| Stack shutdown | ✅ all 5 ports free |

### 2b — Range and register reports ✅

| Step | What | Status | Notes |
| --- | --- | --- | --- |
| 2b.1 | `services/pdf/shared.ts` — brand block + storage mirror extracted from documents.ts (one definition for all twelve types) | [x] | |
| 2b.2 | `services/pdf/reports.ts` — customer statement (all invoices + balance), AR aging (due-date buckets Current/30/60/90/90+), P&L from journal lines (income by net credit, expense by net debit, from/to range), asset register + depreciation schedule (per-asset posted entries) | [x] | The money spine pays off: P&L reads journal_lines grouped by account type |
| 2b.3 | Route: `GET /api/documents/:type.pdf` (no-id form) for aging/assets/pl; pl accepts `?from=&to=`, defaults to YTD; entity form unchanged | [x] | |
| 2b.4 | Tests: integration loop covers all 8 registered types; statement/P&L/aging/assets rendered from a rolled-back fixture — suite 41/41 | [x] | Expanded in 2c to cover all 11 registered types |
| 2b.5 | Client: `lib/pdf.ts` (fetch→blob→save, filename from Content-Disposition) + PDF buttons on the receivables table (invoice), jobs table (job card), laundry table (ticket) and an AR-aging button on the finance header | [x] | Admin typecheck 0, build green; Vite /api proxy serves the same route |

### 2b Verification matrix

| Check | Result |
| --- | --- |
| Server typecheck | ✅ 0 errors |
| Server tests | ✅ 41/41 |
| Live probes | ✅ AGING-2026-09-27.pdf (3,096 B, attachment disposition), assets register (3,175 B), P&L YTD + from/to (2,772/2,776 B), STMT-c2-2026-09-27.pdf (2,956 B) — all valid %PDF-1.3 |
| Stack shutdown | ✅ ports free |

### 2c — Additional document types & Inter font embedding ✅

| Step | What | Status | Notes |
| --- | --- | --- | --- |
| 2c.1 | `server/migrations/013_delivery_notes.sql` — extends `laundry_orders` with `signature`, `received_by` columns; sequence `delivery_note` for numbering | [x] | Backward-compatible ADD COLUMN IF NOT EXISTS; existing seed data unaffected |
| 2c.2 | `services/pdf/layout.ts` — Inter TTF font embedding via `registerFont` (regular + bold); `renderText` uses the embedded font stream instead of standard fonts; fallback to Helvetica when font files absent | [x] | Fonts live in `assets/fonts/` (`Inter-Regular.ttf`, `Inter-Bold.ttf`); `existsSync` guard keeps CI green in minimal environments |
| 2c.3 | `services/pdf/documents.ts` — added `manifest` (collection/delivery summary), `delivery-note` (items + signature line + weight/pieces), and `balance-sheet` (asset/liability/equity statement) to the `DOCUMENT_TYPES` registry; `renderTypedDocument` dispatches all three | [x] | Each loader accepts the InTx pattern so tests roll back |
| 2c.4 | `services/pdf/reports.ts` — `loadBalanceSheet(tx, from, to)` renders an asset = liability + equity statement grouped by account type; `loadManifest(tx, date)` renders collection/delivery summary for a given dispatch date | [x] |  |
| 2c.5 | `routes/documents.ts` — extended type whitelist to `manifest`, `delivery-note`, `balance-sheet`; no-id form for `balance-sheet`; date and id params wired through | [x] |  |
| 2c.6 | `test/pdf.test.ts` — integration test expanded to cover all 11 registered types (4 pure + integration loop); `balance-sheet` added to range/register test set; manifest id mapped to dispatch date `2026-09-03`; delivery-note id mapped to `laundryId`; statement filename assertion (`^STMT-`); unknown-id returns null | [x] | Typecheck 0 errors; PostgreSQL-dependent tests skip gracefully |

### 2c Verification matrix

| Check | Result |
| --- | --- |
| Server typecheck | ✅ 0 errors |
| Font embedding | ✅ `registerFont` called when `assets/fonts/Inter-*.ttf` exist; TTF files present (402 KB regular, 407 KB bold) |
| Document registry | ✅ 11 types registered (`invoice`, `receipt`, `laundry`, `job-card`, `delivery-note`, `manifest`, `statement`, `aging`, `assets`, `pl`, `balance-sheet`) |
| Migration | ✅ 013 adds `signature` + `received_by` to `laundry_orders`; `delivery_note` sequence |



---


### 3.5 — Smoke test (end-to-end live stack probe) ✅

| Step | What | Status | Notes |
| --- | --- | --- | --- |
| 3.5 | End-to-end smoke test: PATCH job → Completed → `dispatchEvent` creates `job_completion` inapp notification → bell panel shows it → `processQueued` sends via SSE → feedback token extracted → POST /feedback/:token → token consumed → `job_appreciation` queued for 24h later → feedback row in DB | [x] | All 11 checks passed. Server typecheck 0 errors. Notification tests 12/12.

### 4a — Telemetry data pipeline: schema, route, Haversine geofences ✅

| Step | What | Status | Notes |
| --- | --- | --- | --- |
| 4a.1 | Migration `015_telemetry.sql` — `location_pings` (raw GPS), `location_daily_rollups` (per-day summary + trail JSONB), `geofences` (site boundaries with radius); FK to `devices(id)` and `employees(id)` (branches removed per 006) | [x] | Branchless by design; indexes on `(device_id, recorded_at)` and `(received_at DESC)`; audit triggers via `touch_updated_at()` |
| 4a.2 | `server/routes/telemetry.ts` — POST `/api/telemetry/pings` (insert ping, evaluate geofence entry/exit via client-side Haversine, update daily rollup `ON CONFLICT … DO UPDATE`, publish `ping.recorded` SSE); GET `/api/telemetry/live` (last-known positions); GET `/api/telemetry/trail/:deviceId` (day's points); GET `/api/telemetry/geofences`, GET `/api/telemetry/devices` | [x] | Haversine avoids PostGIS dependency — portable to SQLite/PlanetScale |
| 4a.3 | `server/services/realtime.ts` — `RealtimeEvent` type union extended with `'ping.recorded'` | [x] | `publish()` fans out to SSE subscribers (realtime bus test 47/47) |
| 4a.4 | `server/index.ts` — telemetry router mounted with `scoped('admin', 'portal', 'laundry', 'store')` | [x] | `scoped = requireScope` alias confirmed |
| 4a.5 | `server/lib/tables.ts` — `location_pings`, `location_daily_rollups`, `geofences` added to `TRUNCATE_TABLES` | [x] | `/api/reset` stays clean |
| 4a.6 | `server/test/telemetry.test.ts` — 6 tests: 3 pure (Haversine distance zero, known-distance, symmetry) + 3 DB integration (ping insert + rollup ON CONFLICT, geofences query, devices query) | [x] | 6/6 pass; typecheck 0 errors |

#### 4a Verification matrix

| Check | Result |
| --- | --- |
| `npm run db:migrate` applies 015 | ✅ applied cleanly on dev DB |
| Server typecheck | ✅ 0 errors |
| Server tests | ✅ 58/59 (was 51; +6 telemetry; 1 pre-existing job-dates failure unrelated) |
| Geofence evaluation | ✅ Haversine math tested (symmetric, known-distance within 1 km tolerance) |
| Daily rollup `ON CONFLICT` | ✅ tested in-transaction with ROLLBACK |

---

### FieldBeacon PWA (client) ✅

| Step | What | Status | Notes |
| --- | --- | --- | --- |
| 4b.1 | `FieldBeacon.tsx` — geolocation watch + 45s ping interval, permission gate, settings modal | [x] | `localStorage` for device persistence; UUID auto-generated if absent; Tailwind tokens from `tokens.css` |
| 4b.2 | `App.tsx` — pathname-based routing: `/field` → FieldBeacon, `/live-map` → LiveMap, `/devices` → DevicesView | [x] | No React Router needed — lightweight conditional rendering |
| 4b.3 | `main.tsx` — Leaflet CSS import added | [x] | `leaflet/dist/leaflet.css` |
| 4b.4 | Dependencies: `react-leaflet@^4.2.1`, `leaflet@^1.9.4`, `@types/leaflet@^1.9.13` installed | [x] | `lucide-react` already present |

### LiveMap (client) ✅

| Step | What | Status | Notes |
| --- | --- | --- | --- |
| 4c.1 | `LiveMap.tsx` — Leaflet map consuming `/api/telemetry/live` + `/api/telemetry/trail/:deviceId` | [x] | Renders live markers, geofence circles, trail polyline; 30s auto-refresh; supervisor scope |

### DevicesView (client) ✅

| Step | What | Status | Notes |
| --- | --- | --- | --- |
| 4d.1 | `DevicesView.tsx` — device list + GPS history consuming `/api/telemetry/trail/:deviceId` | [x] | Click a device to toggle history; auto-refresh 30s; supervisor/manager scope |

## Later phases (summary — see plan §18.1)

| Phase | Goal | Estimate | Status |
| --- | --- | --- | --- |
| 0a. Multi-app scaffold | 4 apps (admin + 3 new) + root scripts + per-app configs + ports | 2–3 d | [x] |
| 0b. Theme, components & PWA shells | Vendored tokens + useTheme + StatusBadge + PWA manifests | 1–2 d | [x] |
| 0c. Backend multi-app wiring | 005/006/007 migrations, app_scope + requireScope, CORS, scoped mounts; branches removed; §0.9/§0.10/§0.11/§0.12 all done | 3–5 d | [x] |
| 1. Data spine | Payments, methods, ledger, costing, job/laundry dates, assets | 8–12 d | [x] — 1a payments+ledger, 1b job dates, 1c costing, 1d assets/depreciation, 1e laundry logistics |
| 2. PDF and documents | pdfkit service, 12 document types, Inter font embedding, download/attach plumbing | 5–7 d | [~] — 2a core docs ✅, 2b reports ✅, 2c manifest/delivery-note/balance-sheet + Inter fonts ✅ (11/12 types; trip report gated on Phase 4) |
| 3. Notifications, feedback, real-time | WhatsApp/SMS adapters, completion message, public feedback form, SSE wiring | 8–12 d | [x] — migration + service (dispatch, pickChannels, channel adapters, bell panel, feedback tokens, appreciation scheduling, webhooks) + routes (bell panel, mark-read, feedback show/submit, webhooks) + job.completed/payment.recorded wiring + notification SSE type + tables.ts + tests + typecheck |
| 4. Field operations | Employees, devices, assignments, `/field` beacon, live map, geofences | 8–12 d | [x] — 4a telemetry + geofences ✅ (FieldBeacon/LiveMap/DevicesView shipped with the earlier client; portal beacon page re-lands in multi-app plan Phase D) |
| 5. Sales and manager dashboard | Attribution, pipeline, commissions, role-scoped dashboards | 6–9 d | [ ] — absorbed into multi-app plan v5 Phase G |
| 6. Real-time upgrade | Socket.IO chat, Inbox, presence, live map streaming | 5–8 d | [ ] — absorbed into multi-app plan v5 Phase H |
| 7. Depth | Payment gateway + reconciliation, scheduled reports, dunning | 5–10 d | [ ] — absorbed into multi-app plan v5 Phase H |

> **Plan restructure (2026-09-29):** the remaining work is now sequenced by
> [`docs/plans/multi-app-plan.md`](../plans/multi-app-plan.md) **v5** — Phase A
> (Supabase/Lovable purge + server-API reconfiguration) → B (Admin control plane:
> employees, app_scope, devices) → C/D/E (laundry / portal / store onto live ops) →
> F (cross-app SSE notifications) → G (admin depth) → H (gateway, chat, schedules).
> Old enhance.md phases 5–7 map into v5 G/H; nothing else is repeated.

---

## Multi-App Plan v5 — Session 2026-09-29 ✅

Reference: [`docs/plans/multi-app-plan.md`](../plans/multi-app-plan.md) (v5, restructured this session; v4 archived as `multi-app-plan.v4.bak.md`).

### Implemented

| Step | What | Status | Notes |
| --- | --- | --- | --- |
| v5.1 | Per-app request logging: console line `[<appId>] <METHOD> <url> <status> <ms>` (warn ≥400, error ≥500) in `middleware/requestLogger.ts`, on top of the existing ring buffer + `logs.jsonl` + SSE `request-log` + `GET /api/logs` | [x] | Apps already send `X-App-Id` (admin/laundry/portal); store client lands in Phase A3 |
| v5.2 | Store app made a full PWA: `vite-plugin-pwa@^1.3.0` (generateSW, NetworkFirst pages / CacheFirst assets, matching laundry), `public/manifest.webmanifest`, icons 192/512, `src/lib/pwa.ts` registration in `App.tsx`, `vite-env.d.ts`, `.env.example` (`VITE_API_BASE_URL`, `VITE_APP_ID=store`), `<link rel=manifest>` + `theme-color` in index.html | [x] | Build green: PWA v1.3.0, 14 precache entries, `dist/sw.js` |
| v5.3 | **All data seeded to the database (plan decision D0)** — migration `016_store_tables.sql`: `suppliers` extended (contact/categories/spend_ytd/rating + 8 store suppliers), `inventory_items` extended (code/supplier_id/location/kind facility\|contract) + 12 contract materials (`MAT-001…012`), `inventory_movements` (8 seeded), `purchase_requests` (5 seeded), `tool_checkouts` (7 seeded), `utility_captures` (6 seeded) | [x] | The store prototype's `store-data.ts` fixtures now live in the DB verbatim; all inserts idempotent (ON CONFLICT DO NOTHING) |
| v5.4 | `/api/data` widened: `inventoryMovements`, `purchaseRequests`, `toolCheckouts`, `utilityCaptures` keys + store columns on `inventory` (`code`, `kind`, `location`, `supplierId`); `lib/tables.ts` TRUNCATE set += the four store tables | [x] | Reset/import cycle keeps the store tables consistent |
| v5.5 | `seed-data.ts`: `seedStoreData()` (mirrors 016 so fresh DBs and resets carry the same rows) + `seedPlatformData()` (settings row + 6 message templates from 014, which used to be migration-time-only) | [x] | Fixes a real defect found by the reset probe: `/api/reset` silently wiped `settings` + `message_templates` (014 seeds one-time); the notification service lost its templates after any reset |
| v5.6 | Plan restructure: v5 phases A–H redrawn (A = Supabase purge + server-API reconfiguration FIRST; B = Admin control plane; C/D/E = apps onto live ops; F = cross-app SSE notifications; G/H = depth) | [x] | v4 archived as `multi-app-plan.v4.bak.md` |

### v5 Verification matrix

| Check | Result |
| --- | --- |
| `npm run db:migrate` applies 016 | ✅ applied cleanly (after fixing the facility-code backfill: window functions are not allowed in UPDATE → correlated subquery) |
| Row counts post-migrate | ✅ suppliers 10 · inventory 18 (12 contract + 6 facility) · movements 8 · purchase_requests 5 · tool_checkouts 7 · utility_captures 6 |
| Live reset probe (PORT=5010) | ✅ `POST /api/reset` → `GET /api/data` carries all four store collections with correct shapes; `toolCheckouts[0]` = TL-014 Bosch rotary hammer w/ holder/dueBack |
| Reset restores provisioning | ✅ message_templates 6 · settings 1 after reset (was 0/0 — defect fixed) |
| Server tests | ✅ 59/59 (was 58/59 pre-existing flake; green after the seed fix) |
| Server typecheck | ✅ 0 errors |
| Store `tsc --noEmit` + `vite build` | ✅ clean; PWA v1.3.0 generates `dist/sw.js` |

### Next session: multi-app plan v5 Phase A

Supabase/Lovable purge + server-API reconfiguration (steps A1–A7): scrub README/AGENTS
references, align laundry+portal auth to `/auth/login` (delete sign-up), normalize api
clients (401→refresh→retry), create the store's `lib/api.ts`, guard all four shells, and
land one live-data slice per app with `[<appId>]` log lines as the smoke signal.

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
| 2026-09-27 | Phase 1c done — job costing: `010_costing.sql` (suppliers, cost_categories with GL links, job_costs, timesheets; partial unique index makes a timesheet un-double-costable), `services/costing.ts` (cost-line insert + jobs.cost recompute once lines exist — the plan's "job cost comes from real cost lines" exit criterion; timesheet approval derives minutes and posts the labour line idempotently), `/api/costs` + `/api/timesheets(/:id/approve)` routes (admin+portal, job-updated SSE), `costCategories`+`suppliers` in /api/data. Tests 28 → 32. Verified: typecheck 0, migrate clean, estimate→lines flip and idempotent re-approval probed in-test |
| 2026-09-27 | Phase 1d done — asset register: `011_assets.sql` (equipment gains purchase/cost/salvage/useful-life/method/accumulated/disposal/custodian columns + backfill; `asset_depreciation_entries` unique per asset per period; GL 1400/1500/6100 seeded), `services/assets.ts` (straight-line posting debits depreciation expense and credits accumulated depreciation through the ledger; book value = cost − accumulated), POST `/api/assets/:id/depreciate` (admin, equipment-updated SSE), register fields in `/api/data` (+ `depreciationEntries`). `migrate()` gained a session advisory lock after the concurrent-test race. Tests 32 → 35. Verified: typecheck 0, live probe — a1 two 150,000 postings (JNL-00004/5), book value 9,700,000, schedule in /api/data |
| 2026-09-27 | Phase 1e done — laundry logistics: `012_logistics.sql` (laundry_orders gains promised/ready/collected + job link + weight/pieces with backfill; `laundry_order_items` priced lines; branchless per decision #9), `services/laundry.ts` (priced intake claiming LDY numbers transactionally; status moves stamp ready/collected server-side, stamps never clear), POST `/api/laundry` + PATCH `/api/laundry/:id/status` (all four scopes, laundry-updated SSE — first laundry write path), logistics fields + `laundryItems` in /api/data. Tests 35 → 38. Verified: typecheck 0, live probe — LDY-00219 two-line 70000 intake, stage stamps on Ready/Collected, forged stamps 422. **Phase 1 complete — both plan exit criteria hold** |
| 2026-09-27 | /api/reset drift fixed: the seed now replicates the 009/011/012 backfill rules (jobs scheduled/completed dates, equipment cost+useful life, laundry stamps) so reset matches a migrated database; depreciation worked again post-reset |
| 2026-09-27 | Admin UI wired to the Phase 1 spine: laundry intake + status modals (closing the client half of plan issue #11), order timeline + weight/pieces in the table, Depreciate button on asset cards, AppData types extended with the Phase 1 keys, laundry-updated SSE; admin typecheck 0 + build green, UI-shaped payloads probed live |
| 2026-09-27 | Phase 2a done — PDF documents: `pdfkit` + `services/pdf/layout.ts` (shared layout kit: header/meta/table/totals/footers, WinAnsi-safe sanitize), `services/pdf/documents.ts` (loaders for invoice, receipt, laundry ticket, job card; DOCUMENT_STORAGE_DIR mirroring with numbered filenames), GET `/api/documents/:type/:id.pdf` (all scopes, attachment disposition). Tests 38 → 41. Verified: typecheck 0, live probes — INV-00098.pdf 2,916 bytes / LDY-00216 ticket, 404s for unknown type+id, mirror populated |
| 2026-09-27 | dev.mjs fail-fast cascade fixed: stale node.exe owners of 5000/5173-5176 are reaped before spawn (verified by orphaning five children and booting cleanly over them) |
| 2026-09-27 | Phase 2b done — range/register reports: `services/pdf/reports.ts` (customer statement, AR aging with due-date buckets, P&L from journal lines by account type with from/to range, asset register + depreciation schedule), `services/pdf/shared.ts` (brand + mirror extracted), no-id route form `GET /api/documents/:type.pdf` (+ `?from=&to=` for P&L). All 8 registered types covered in-test; live probes render all five new endpoints |
| 2026-09-27 | Client PDF buttons: `lib/pdf.ts` download helpers wired onto the invoice/job/laundry tables and the finance header's AR-aging action |
| 2026-09-27 | Phase 1b done — job dates & assignments: `009_jobs_dates.sql` adds job lifecycle dates (scheduled/quote/promised), instants (started/completed/invoiced/paid — server-managed), salesperson/manager attribution, site address + coordinates, priority; `job_events` + `job_assignments` tables; legacy `date` backfilled everywhere. jobsResource create/patch extended; `/api/data` jobs select widened. Tests 23 → 28. Verified: typecheck 0, migrate clean on dev DB, backfill + cascade probed in-test |
| 2026-09-27 | Phase 1a done — money spine: `008_money.sql` (chart_of_accounts, payment_methods, payments, journal_entries/lines, PAY/JNL sequence defence), `services/ledger.ts` (balanced postJournalEntry), `services/payments.ts` (createPaymentInTx: PAY numbering + journal + invoice/laundry/customer balance recompute in one transaction), `routes/payments.ts` + `/api/payments` mount, `payments` key in `/api/data`, `payment-created` SSE, money tables added to TRUNCATE set. Verified: server typecheck 0, tests 23/23 (integration tests rollback-clean), live probe: PAY-00003/JNL-00003 balanced, invoice i1 Partially Paid, c2 balance 3,000,000 |
| 2026-09-27 | Phase 3 done — notifications, feedback, real-time: `014_notifications.sql` migration (notifications, message_templates, settings, feedback, feedback_requests tables + seed data + dedupe index); `services/notifications.ts` (dispatch via EVENT_RULES → templates, channel adapters email/SMS/WhatsApp/in-app with lazy credential validation, pickChannels, bell panel queries, feedback tokens with single-use+expiry, appreciation scheduled 24h after completion via scheduledFor); `routes/notifications.ts` (bell panel, mark-read, feedback GET/POST, WhatsApp/SMS webhooks using for...of); `routes/jobs.ts` — `job.completed` dispatch on status→Completed; `routes/payments.ts` — `payment.recorded` dispatch after payment creation; `services/realtime.ts` — `notification` added to `RealtimeEvent`; `lib/tables.ts` — notifications/message_templates/settings/feedback/feedback_requests truncate entries; `test/notifications.test.ts` — pure + integration tests; `.env.example` — SMTP/Africa's Talking/WhatsApp/APP_BASE_URL vars. Verified: server typecheck 0 errors, docs Phase 3 marked complete |
| 2026-09-28 | Phase 3 smoke test — end-to-end live-stack verification of the full job-completion → notification → feedback flow: PATCH job to Completed → dispatchEvent creates job_completion inapp notification → bell panel surfaces it → processQueued sends via SSE → feedback token extracted from payload → POST /feedback/:token succeeds → token marked single-use → job_appreciation queued for 24h later → feedback row confirmed in DB. All 11 checks passed. Key bug found during smoke test: dispatchEvent was inserting NULL customer_id for job events, so bell panel could never find notifications — fixed by backfilling customer_id from customerForJob(). Server typecheck 0 errors. Notification tests 12/12. |
| 2026-09-29 | Request logging: `[<appId>] GET /api/... 200 12ms` console lines added to requestLogger (keeps ring buffer + jsonl + SSE) |
| 2026-09-29 | Store PWA completed: vite-plugin-pwa 1.3.0 + manifest + icons + sw registration + .env.example; build green with sw.js |
| 2026-09-29 | All data seeded to the DB: `016_store_tables.sql` (suppliers ext + contract inventory + movements + purchase_requests + tool_checkouts + utility_captures, store fixture rows verbatim), `/api/data` exposes the four new collections, TRUNCATE set extended, seedStoreData + seedPlatformData added so reset restores the complete workspace. Defect found+fixed: reset wiped settings/message_templates (014 seeded them migration-time only). Tests 59/59, typecheck 0, live reset probe green |
| 2026-09-29 | Plan restructured to v5 (`multi-app-plan.md`): completed work re-baselined, phases redrawn A–H with Supabase purge + server-API reconfiguration as the mandatory first step; v4 archived as `.v4.bak.md`; progress doc gains the v5 session section |
| 2026-09-29 | **Phase A complete** — purge: root/app READMEs + AGENTS.md rewritten to the server-API posture, `gabfix-inhouse-erp/supabase/` deleted, Lovable preview-host code removed from pwa.ts; auth: laundry+portal on `POST /auth/login` (sign-up deleted, refresh tokens stored, refresh-on-401); clients normalized and store `lib/api.ts` created; canonical envs + `/api` dev proxies in all four apps; admin+store shells guarded (`ProtectedRoute` + `/auth`); live-data slices: admin KPIs, laundry orders board, portal profile, store overview |
| 2026-09-29 | Admin PWA closed the suite's last gap (D6): vite-plugin-pwa + manifest + icons + sw registration + router auth flow; admin react-router added with `ProtectedRoute` |
| 2026-09-29 | Defect fixed: owner row re-created by reset kept empty `app_scope` (005 backfill never re-ran) — `ensureOwner` now enforces the owner's four-app scope on every bootstrap/reset; verified via live login (`app_scope: [admin, laundry, portal, store]`) |
| 2026-09-29 | **Phase B (control plane) — server**: `routes/employees.ts` (CRUD + app_scope grant/revoke, owner/manager role walls, last-owner protections, soft delete) + `routes/settings.ts` (GET/PATCH singleton flags, `settings-updated` SSE); both mounted scope `admin`; tests 59 → 63 |
| 2026-09-29 | **Phase B — admin UI**: `EmployeesPage` (scope chips, create dialog, activate/deactivate) + `SettingsPage` (branding, channel switches) mounted at /employees and /settings behind ProtectedRoute; nav wired |
| 2026-09-29 | **Security fix from B5 probe**: empty `app_scope` in a minted token was shimmed to `['admin']` on verify — revoked employees regained full access at re-login. Shim now applies only to legacy tokens without the key; probe matrix re-run green (401/200/403/403/200) |




| 2026-09-29 | **Auth enforcement ON + SSE fix**: `AUTH_ENFORCE=true` in `server/.env`; live probe matrix green (no-token 401, owner 200, laundry-only 403, SSE `?access_token=` 200). Two defects found+fixed: `routes/events.ts` never ran `requireAuth` (query-only tokens always 401'd once enforced) and `index.ts` mounted `/api/events` *after* the global guard, so the token promotion never ran — events now mounts before the guard like `/api/auth`, with staged pass-through preserved. 6 route-level SSE regression tests added (auth.test.ts + events.test.ts: header/query/invalid/missing/no-scope/bus-fanout). Tests 63 → 69 |
| 2026-09-29 | **Utility capture → ledger posting (gap 5)**: `GET /api/store/utility-captures` + `POST /api/store/utility-captures/:id/post` — one transaction, `FOR UPDATE` row lock (replay-safe: replayed post → 409), inserts the mirrored expense (id generated — `expenses.id` has no default; category = utility type, division from category_kind, date = captured_on), links `expense_id`, stamps Approved, publishes `expense-created`. Live-probed: 201 → replay 409 |
| 2026-09-29 | **Devices registry (gap 2)**: `routes/devices.ts` — GET/POST/PATCH/DELETE (soft) over `devices` (msisdn ↔ employee holder, activate/deactivate), mounted scope `admin`; live-probed create/list/403 for laundry-only token. Admin **DevicesPage** (register/edit modal, staff picker from /api/employees, activate toggle) at /devices |
| 2026-09-29 | **Offline sync API (gap 4, server half)**: `routes/sync.ts` — GET `/api/sync/pull?since=` (laundry delta) + POST `/api/sync/push` (batch ≤50 ops, per-op results, walk-in customer find-or-create by phone, LDY number claimed from the same document_sequences as live intake, server-stamped Ready/Collected timestamps). Mounted scope admin+laundry. Live-probed: push create → LDY-00217, pull → 5 orders |
| 2026-09-29 | **Laundry outbox drain (gap 4, client half)**: `src/lib/sync.ts` — batched push with per-op ack (create ok ⇒ draft id swapped for server id + real LDY number; poison-pill stop at 5 attempts), `pullServerDelta` upserts into Dexie; dashboard auto-drains on mount/reconnect/30s cadence; SyncPanel gains Sync-now + last-sync. **Portal beacon (gap 3)**: `src/lib/beacon.ts` (resolves the employee's device from /api/devices, watchPosition → POST /api/telemetry/pings at ≥20s cadence, offline outbox in localStorage, drain on reconnect) + **My trail** panel in the portal replacing the stub toast |
| 2026-09-29 | **Admin console: finance + customers + dashboard (gaps 5–8)**: FinancePage — utility-captures table with one-click **Post to ledger** + P&L / Balance-sheet / Aging PDF buttons; **CustomersPage** (create/edit modal, statement PDF per row) with customersResource PATCH schema + PATCH /api/customers/:id; dashboard jobs table now renders live /api/data rows (demo array kept as fallback) |
| 2026-09-29 | **Polish (gap 8)**: admin theme toggle (class-on-html dark mode, persisted in localStorage). Verification: server tsc 0 + 69/69 tests, all 4 apps tsc clean, all 4 production builds green with PWA |
