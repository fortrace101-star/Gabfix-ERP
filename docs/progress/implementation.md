# Gabfix ERP — Enhancement Implementation Progress

| Field | Value |
| --- | --- |
| Plan | [`docs/plans/enhance.md`](../plans/enhance.md) |
| Requirements | [`docs/requirements.md`](../requirements.md) |
| Baseline commit | `100d0aa` (Pre-refactor baseline snapshot before enhancement work) |
| Started | 2026-09-25 |
| Status | Phase 0 in progress |

Legend: `[ ]` not started · `[~]` in progress · `[x]` done · `[!]` blocked

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
| 0.7 | Per-route zod schemas replacing the generic column map (`server/validation/*`) | [ ] | Unknown fields return 422 instead of silent drop |
| 0.8 | Server-side document numbering (`services/numbering.ts`) | [ ] | 10 concurrent job creates → 10 unique numbers |
| 0.9 | Africa/Kampala date handling (`client/src/lib/dates.ts`, `server/lib/dates.ts`) | [ ] | 01:00 local → today's local date; maintenance flags match local day |
| 0.10 | Client split (app/features/components/lib) + router + query cache | [ ] | UI identical, deep links work, `App.tsx` under 150 lines, build/lint/typecheck pass |
| 0.11 | Scoped/paginated endpoints + SSE event bus (`routes/events.ts`, `services/realtime.ts`) | [ ] | Job created in browser A appears in browser B without refresh |
| 0.12 | Tests + CI (`server/test/*`, client tests, `.github/workflows/ci.yml`) | [ ] | CI green covering numbering, ledger, depreciation, dates |

Phase 0 definition of done: existing behaviour provably unchanged; schema can evolve;
identity and roles exist; APIs scoped/validated/numbered; two clients stay in sync;
server-side numbering; local-time dates correct; CI enforced.

---

## Later phases (summary — see plan §18.1)

| Phase | Goal | Estimate | Status |
| --- | --- | --- | --- |
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
