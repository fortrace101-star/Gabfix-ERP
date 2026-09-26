# Gabfix ERP — Enhancement Implementation Progress

| Field | Value |
| --- | --- |
| Plan | [`docs/plans/enhance.md`](../plans/enhance.md) · [`docs/plans/multi-app-plan.md`](../plans/multi-app-plan.md) |
| Requirements | [`docs/requirements.md`](../requirements.md) |
| Baseline commit | `100d0aa` (Pre-refactor baseline snapshot before enhancement work) |
| Started | 2026-09-25 |
| Status | Phase 0a complete · Phase 0b complete · Phase 0c in progress (0c.1 done: identity scopes + sync tables + auth/CORS; 006 remove-branches and §0.9–0.12 remaining) |

Legend: `[ ]` not started · `[~]` in progress · `[x]` done · `[!]` blocked

---

## Overall Plan Progress

The enhancement plan (`enhance.md`) is sequenced in 8 phases. Phase 0 is the multi-app foundation that unlocks everything else. It is subdivided into:

| Sub-phase | Name | Scope | Status |
| --- | --- | --- | --- |
| Phase 0a | Multi-app scaffold | Rename `client/` → `gabfix-administrator`; scaffold 3 new Vite+React 18 apps; per-app configs; root dev scripts; ports 5173–5176 | ✅ done |
| **Phase 0b** | **Theme, components & PWA shells** | **Vendored theme tokens; `useTheme` hook; `StatusBadge` component; PWA manifests + sw; `.env` with `VITE_APP_ID`** | **✅ done** |
| Phase 0c | Backend multi-app wiring | `005_multiapp_identity` + `006_remove_branches` + `sync_tables` migrations; server identity/roles scoped to 4 apps; §0.9 dates, §0.10 client split, §0.11 SSE, §0.12 CI completion | 🔄 0c.1 done (005+sync tables, requireScope, CORS) · 006 + §0.9–0.12 remaining |
| Phase 1 | Data spine | Payments, methods, ledger, costing, job/laundry dates, assets | — |
| Phase 2 | PDF & documents | jsPDF + AutoTable, 14 document types, print/download/attach | — |
| Phase 3 | Notifications, feedback, real-time | WhatsApp/SMS, completion message, feedback form, SSE | — |
| Phase 4 | Field operations | Employees, devices, assignments, beacon, map, geofences | — |
| Phase 5 | Sales & manager dashboard | Attribution, pipeline, commissions, dashboards | — |
| Phase 6 | Real-time upgrade | Socket.IO chat, Inbox, presence, live map | — |
| Phase 7 | Depth | Payment gateway + reconciliation, scheduled reports, dunning | — |

> **Current state**: Phase 0a ✅ · Phase 0b ✅ · Phase 0c 🔄 (0c.1 done — see Phase 0c section; `006_remove_branches` + admin branch-strip and §0.9–§0.12 remain). Phases 0.1–0.8 (baseline, migrations, identity, auth, handler split, zod, numbering) are also complete from prior work.

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
| 0.9 | Africa/Kampala date handling (`client/src/lib/dates.ts`, `server/lib/dates.ts`) | [ ] | 01:00 local → today's local date; maintenance flags match local day |
| 0.10 | Client split (app/features/components/lib) + router + query cache | [ ] | UI identical, deep links work, `App.tsx` under 150 lines, build/lint/typecheck pass |
| 0.11 | Scoped/paginated endpoints + SSE event bus (`routes/events.ts`, `services/realtime.ts`) | [ ] | Job created in browser A appears in browser B without refresh |
| 0.12 | Tests + CI (`server/test/*`, client tests, `.github/workflows/ci.yml`) | [ ] | CI green covering numbering, ledger, depreciation, dates |

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

### 0c.2 — Remove branches + §0.9–§0.12 (next)

| Step | Work | Status |
| --- | --- | --- |
| 0c.2a | Migration `006_remove_branches.sql`: drop `branch_id` from jobs/expenses/equipment/inventory_items/employees, drop `branches`, drop branch filters from validation + `db.ts` + `TRUNCATE_TABLES`, strip branch UI from admin (`App.tsx` switcher, table column, report, forms, laundry/equipment/inventory filters, seed data) | [ ] |
| 0c.2b | §0.9 Africa/Kampala date handling (`server/lib/dates.ts`, admin `lib/dates.ts`) | [ ] |
| 0c.2c | §0.10 admin client split (app/features/components/lib) | [ ] |
| 0c.2d | §0.11 SSE event bus (`routes/events.ts`, `services/realtime.ts`) | [ ] |
| 0c.2e | §0.12 tests + CI (`server/test/*`, `.github/workflows/ci.yml`) | [ ] |

---

## Later phases (summary — see plan §18.1)

| Phase | Goal | Estimate | Status |
| --- | --- | --- | --- |
| 0a. Multi-app scaffold | 4 apps (admin + 3 new) + root scripts + per-app configs + ports | 2–3 d | [x] |
| 0b. Theme, components & PWA shells | Vendored tokens + useTheme + StatusBadge + PWA manifests | 1–2 d | [x] |
| 0c. Backend multi-app wiring | 005/006/007 migrations, app_scope + requireScope, CORS, scoped mounts; §0.9–0.12 | 3–5 d | [~] 0c.1 done |
| 1. Data spine | Payments, methods, ledger, costing, job/laundry dates, assets | 8–12 d | [ ] |
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




