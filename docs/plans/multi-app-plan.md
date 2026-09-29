# Gabfix Multi-App Plan (v5 — Restructured)

> **Restructured 2026-09-29.** Supersedes v4 (kept as `multi-app-plan.v4.bak.md`).
> This version re-baselines the plan against what is **already implemented** (see
> [`docs/progress/implementation.md`](../progress/implementation.md)), removes duplicated
> phase work, and redraws the remaining phases around five facts:
>
> 1. All four frontends are **scaffolded and prototyped** (Lovable-origin UI shells).
> 2. The server already owns the data spine: money, ledger, costing, assets, laundry
>    logistics, documents (11 PDF types), notifications, telemetry, SSE, identity scopes.
> 3. **All application data is seeded in the database** — including the store's prototype
>    dataset (migration 016) — so clients hold no fixtures and every app reads the same
>    numbers through `GET /api/data`.
> 4. The next implementation starts with **purging Supabase/Lovable remnants and
>    reconfiguring every app onto the server API** — not with new features.
> 5. The **Admin Console is the apex**: it controls which employees can access which app
>    (`app_scope`), and every other app is an execution lens over the same server.

---

## 0. Where We Are (progress reference)

| Area | State | Evidence |
| --- | --- | --- |
| Server data spine (Phases 0–2 of enhance.md) | ✅ done | Migrations 001→016; payments + double-entry ledger; job dates/assignments; costing; assets/depreciation; laundry logistics; 11 PDF document types |
| Notifications + feedback (Phase 3) | ✅ done | `services/notifications.ts`, EVENT_RULES, bell queries, feedback tokens, webhooks; `job.completed`/`payment.recorded` wired |
| Field telemetry (Phase 4) | ✅ done | `015_telemetry.sql`, `/api/telemetry/*`, Haversine geofences, ping SSE |
| Multi-app identity | ✅ done (server side) | `005_multiapp_identity.sql`: `employees.app_scope TEXT[]`, `storekeeper` role, owner = all 4 scopes; `requireScope()` staged behind `AUTH_ENFORCE` |
| CORS + scoped mounts | ✅ done | 4 Vercel origins + 5173–5179; every mount scoped (see `server/index.ts`) |
| SSE event bus | ✅ done | `/api/events` (all scopes), domain publishes (`job-created`, `payment-created`, `laundry-updated`, `notification`, `ping.recorded`, `request-log`) |
| Per-app request logging | ✅ done | `middleware/requestLogger.ts`: ring buffer + `logs.jsonl` persistence + SSE `request-log` + **console line `[store] GET /api/inventory 200 12ms`** + admin-only `GET /api/logs` |
| Admin log viewer | ✅ done | Admin `RequestLogsPage` + `LogFeed`/`LogFilters`/`LogHistory` over `/api/logs` |
| **Seeded store dataset** | ✅ done | Migration `016_store_tables.sql` + `seedData`: suppliers (10) w/ contacts+ratings+spend, contract inventory (12 `MAT-…` items, `kind='contract'`, code/supplier/location), movements (8), purchase requests (5), tool checkouts (7), utility captures (6); `/api/reset` restores everything incl. settings + message templates; `/api/data` exposes `inventoryMovements`, `purchaseRequests`, `toolCheckouts`, `utilityCaptures` |
| Admin app | 🔶 control plane landing | Login + ProtectedRoute + employees/app_scope management UI (B3) + settings UI (B4) + log viewer shipped; dashboard still prototype-shaped pending the B1 split and G1–G4 depth |
| Laundry FO app | ⚠️ prototype | Router + ProtectedRoute + Dexie `offline-db.ts` + dashboard shell; auth points at `/auth/sign-in` (server contract mismatch, see §4.2) |
| Portal app | ⚠️ prototype | Auth page + empty shell; `portalApi` targets `/auth/sign-in` (mismatch) |
| Store app | ⚠️ prototype | 6 pages on client fixtures (`store-data.ts`); **no API client yet**; PWA ✅ (added 2026-09-29). Phase E swaps fixtures for `/api/data` — the DB now carries the identical rows |
| PWA shells | ✅ done (all four) | manifest + SW (generateSW) + icons; laundry/portal earlier, **store 2026-09-29** |
| Supabase / Lovable purge | ✅ done (Phase A, 2026-09-29) | READMEs/AGENTS.md rewritten to the server-API posture; `gabfix-inhouse-erp/supabase/` deleted; preview-host code removed; all four apps authenticate against `POST /auth/login` and render a live slice from `GET /api/data`; only the retained `react.md` histories mention them |

**What this means:** the old v4 phases 0a/0b/0c and 1–4 are *done or absorbed*. The
remaining work is app-side integration and the control plane. The phases below are redrawn
accordingly — nothing here repeats completed server work.

---

## 1. Locked Decisions (v5 additions and changes)

| # | Decision | Rationale |
| --- | --- | --- |
| D0 | **All data is seeded in the database.** No client fixtures: the store dataset moved into the DB (016 + `seedData`), and `/api/reset` restores the *complete* workspace (core demo data + store data + settings + message templates). Apps render from `GET /api/data`. | User directive: "let all the data be seeded to the database"; one source of truth for all four apps |
| D1 | **Server API is the single source of truth.** No app talks to a database, cloud, or BaaS directly. Every read/write goes through `VITE_API_BASE_URL` → Express + PostgreSQL. | Kills schema drift; one ledger, one identity |
| D2 | **All Supabase / Lovable Cloud references and configurations are removed first** (Phase A), including auth contract mismatches left over from the Lovable scaffolds. | User directive: "first step of the next implementation" |
| D3 | **No self sign-up.** Staff accounts are created by the Admin Console only. The apps' `/auth/sign-up` calls are deleted; the server's `/auth/login` + `/auth/refresh` + `/auth/me` contract is canonical and apps adopt it. | Admin Console is the access-control apex; self-registration would bypass it |
| D4 | **Access control model:** employee record carries `role` + `app_scope[]`; JWT carries both; `requireScope()` on every mount; the Admin Console manages who gets which scopes. Turning `AUTH_ENFORCE=true` is the go-live switch (Phase B exit criterion). | User directive: "Admin Console … controls accessibility of all the other apps" |
| D5 | **Every request is app-tagged and logged.** Apps send `X-App-Id` (`admin`/`laundry`/`portal`/`store`); server logs `[<appId>] <METHOD> <url> <status> <ms>` to console, ring buffer, `logs.jsonl`, and SSE; Admin Console has the live/history log viewer. | User directive; already implemented 2026-09-29 |
| D6 | **All four apps are installable PWAs** (manifest + service worker + icons). Store was the last gap — closed 2026-09-29. | User directive |
| D7 | **UI design implementation is its own workstream per app**, built from the reference boards in `docs/refs/` and the vendored design tokens. Prototyped shells are re-shaped board-by-board onto live data (not replaced). | User directive: "include the apps UI design implementation" |
| D8 | **Cross-app notifications ride the existing SSE bus.** Domain events publish once server-side; each app subscribes to its scoped subset and refreshes/bells accordingly. No Socket.IO until chat/presence actually ship (Phase H). | SSE is live and proven; Socket.IO is a later upgrade, not a prerequisite |
| D9 | v4 decisions still holding: one server, four independent Vite apps (no shared source imports), no branches, server-side document numbering, Africa/Kampala dates, PDF server-side only (pdfkit) — the v4 jsPDF-in-browser decision is dropped because `GET /api/documents/...` already serves every document type. | Proven by implementation |

---

## 2. App Registry (actual, post-scaffold)

| Folder (Vercel Root Directory) | Package | VITE_APP_ID | Dev port | Mode | Maturity |
| --- | --- | --- | --- | --- | --- |
| `gabfix-administrator/` | `gabfix-admin` | `admin` | 5173 | Online-first, control plane, PWA | Prototype; has log viewer |
| `gabfix-laundry-front-office/` | `gabfix-laundry-front-office` | `laundry` | 5174 | Offline-first PWA (Dexie + SW) | Prototype; offline DB stub |
| `gabfix-inhouse-erp/` | `gabfix-inhouse-erp` | `portal` | 5175 | Online-first PWA, beacon outbox | Prototype; auth page only |
| `gabfix-store/` | `gabfix-store` | `store` | 5176 | Online-first, full PWA | Prototype; PWA ✅; DB-seeded data ready |

Env contract per app (`.env`, committed as `.env.example`):

```
VITE_API_BASE_URL=http://localhost:5000/api
VITE_APP_ID=admin|laundry|portal|store
```

---

## 3. Server Contract Snapshot (what apps may call today)

Exists and scoped (from `server/index.ts` + `routes/`):

| Endpoint(s) | Scopes | Notes |
| --- | --- | --- |
| `POST /api/auth/login` · `/refresh` · `GET /me` · `/logout` | public (guard exempts) | Returns access/refresh JWT with `{role, app_scope}` |
| `GET /api/data` | all | Whole-workspace read — now **including** `inventoryMovements`, `purchaseRequests`, `toolCheckouts`, `utilityCaptures`, and store columns on `inventory` (`code`, `kind`, `location`, `supplierId`) |
| `POST/PATCH /api/customers` | all | |
| `POST/PATCH /api/jobs` | admin, portal, laundry | Lifecycle stamps server-owned |
| `POST /api/payments` | all | Journal + balances in one tx |
| `/api/costs` · `/api/timesheets(/:id/approve)` | admin, portal | |
| `PATCH /api/equipment/:id` · `POST /api/equipment` | admin, laundry | |
| `POST /api/assets/:id/depreciate` | admin | |
| `POST /api/laundry` · `PATCH /api/laundry/:id/status` | all | Intake + stage stamps |
| `GET /api/documents/:type(/:id).pdf` | all | 11 registered types |
| `POST /api/expenses` · `/api/services` · `/api/inventory(/:id)` | all / admin,laundry,store | |
| `GET /api/events` (SSE) | all | `job-created`, `*-updated`, `payment-created`, `notification`, `ping.recorded`, `request-log`, `workspace-reset` |
| `GET /api/logs` | admin | Filtered request-log history |
| `/api/notifications/*` · `/feedback/:token` · webhooks | scoped / public | Bell panel, mark-read, feedback, WhatsApp/SMS webhooks |
| `/api/telemetry/pings` · `/live` · `/trail/:deviceId` · `/geofences` · `/devices` | admin, portal | Beacon ingest + reads |
| `POST /api/import` · `/api/reset` | owner | Reset restores the full seeded workspace (D0) |

Gaps to close in later phases (new routes, each small): `/api/employees` CRUD + scope
management (Phase B), `/api/sync/push|pull` for the laundry outbox (Phase C), store write
routes for movements/purchase-requests/tools/utility-captures (Phase E), job status
transition endpoint `PATCH /api/jobs/:id/status` with side effects (Phase D), purchase
approval endpoint (Phase E).

---

## 4. App-by-App Current-State Audit

### 4.1 gabfix-administrator

- **Has:** vite+react scaffold, full shadcn-style UI kit (46 components), `lib/api.ts`
  (`apiClient` with `X-App-Id`, `fetchLogs`), request-log pages (`RequestLogsPage`,
  `LogFeed`, `LogFilters`, `LogHistory`), `AdminDashboard` prototype (its demo arrays are
  shapes over already-seeded data), dark/light styling.
- **Missing:** login screen; employees/roles/app_scope/devices management; wiring of the
  dashboard/jobs/finance/laundry views to live `/api/data`; dispatch board; ledger views;
  sync-health; SSE client (currently none — log viewer polls).
- **Architecture note:** the earlier 0c.2c `app/ + features/` split predates the current
  prototype rebuild; the rebuild collapsed to `components/admin-dashboard.tsx`. Phase B
  re-applies the split (a proven pattern with a 0-lint baseline) while porting the
  prototype's UI kit.

### 4.2 gabfix-laundry-front-office

- **Has:** router + `ProtectedRoute`, login page, `laundryApi` (`X-App-Id`, token in
  `localStorage`), Dexie `offline-db.ts` stub, dashboard shell, offline PWA config,
  sign-in/sign-up calls to `/auth/sign-in`, `/auth/sign-up`.
- **Contract mismatches (Supabase-era residue):** server has no `/auth/sign-in` or
  `/auth/sign-up`; session shape differs (server returns `{accessToken, refreshToken, user}`
  with `role`/`app_scope`, app expects `{token, staff:{roles[]}}`).
- **Missing:** intake/status wired to `/api/laundry`, DRAFT ticket flow, Dexie outbox →
  `/api/sync/push` (route must be built), scoped bell, connectivity pill, facility
  consumables view (facility inventory rows are already seeded, `kind='facility'`).

### 4.3 gabfix-inhouse-erp (Portal)

- **Has:** auth page, `portalApi` (same pattern), `ProtectedRoute`, empty index page.
- **Contract mismatches:** same `/auth/sign-in` mismatch as laundry.
- **Missing:** My Jobs (assignments from `/api/jobs`), Accept/Start/Complete, timesheets,
  cost capture, beacon page (`/api/telemetry/pings` — server ready), scoped bell, SSE.

### 4.4 gabfix-store

- **Has:** 6 polished pages (overview, materials, tools, utilities, suppliers, reports) on
  `store-data.ts` client fixtures, `AppShell` + `DataTable`/`KpiCard`/`StatusBadge`, full
  routing, error boundaries, **PWA (2026-09-29)**, `.env.example`.
- **Data state:** the fixture rows now live in the DB **verbatim** (016 + seedData) —
  same statuses, same amounts, same supplier links. Phase E swaps the import for
  `/api/data` reads and adds write routes; the UI types stay.
- **Missing:** API client; movements/purchase-request/tool/expense write paths; SSE for
  stock updates; purchase approval loop with Admin.

---

## 5. Redrawn Phase Plan

Sequence and dependency logic: **A (purge + reconfigure) → B (admin control plane) →
C/D/E (laundry / portal / store onto live ops, parallelisable after B) → F (cross-app
notification fabric) → G (admin depth + boards) → H (depth: gateway, chat, schedules)**.
A and B are strictly ordered; C, D, E can run in parallel once B lands; F stitches them
together; G/H are polish under the same fabric.

```
A  Supabase/Lovable purge + server-API reconfiguration (all 4 apps)   [FIRST, 4–6 d]
B  Admin Console as control plane: auth, employees, app_scope, devices [5–8 d]
C  Laundry FO operational + offline outbox + UI boards                [6–9 d]
D  Portal operational: my jobs, timesheets, beacon + UI boards        [5–8 d]
E  Store operational: live reads + write routes + UI boards           [5–8 d]
F  Cross-app notifications & realtime fabric (SSE clients, bells)     [4–6 d]
G  Admin depth: dispatch board, ledger views, sync-health, dashboards [6–9 d]
H  Depth: payments gateway, Socket.IO chat/presence, scheduled reports[5–10 d]
```

Old v4 phases 0a/0b/0c are **closed** (scaffold, theme/PWA, backend wiring — all done).
Old enhance.md phases 5–7 are absorbed into G and H. Estimates are single-dev.

---

### Phase A — Supabase/Lovable purge + server-API reconfiguration  **(first step — do before anything else)**

Exit criterion: `grep -ri "supabase\|lovable"` returns only historical notes in
`react.md` docs (explicitly retained as migration records), zero packages, zero code
paths, zero config keys — and every app performs a real login against
`POST /api/auth/login` and renders data from `GET /api/data`.

| Step | Work | Apps | Notes |
| --- | --- | --- | --- |
| A1 | Scrub references: README "built with Lovable" sections rewritten as plain project READMEs; AGENTS.md notes updated to describe the server-API posture; `.env` templates cleaned of any legacy keys | all | `react.md` migration records stay as history |
| A2 | Align auth contract to the server: replace `/auth/sign-in` + `/auth/sign-up` with `POST /auth/login`; delete sign-up UI and client code (staff accounts are admin-created, D3); store access **and refresh** tokens; add refresh-on-401 to each api client; session shape `{user:{id,name,role,app_scope}}` | laundry, portal | Server unchanged — it is canonical |
| A3 | Normalize api clients: one vendored pattern per app (`baseUrl`, `X-App-Id`, bearer, 401→refresh→retry, error copy from server body); **create `gabfix-store/src/lib/api.ts`** (store has none) | all | Pattern already proven in admin/laundry/portal |
| A4 | Env + dev wiring: `.env`/`.env.example` with `VITE_API_BASE_URL` + `VITE_APP_ID` in all four apps; vite dev proxies `/api` → `localhost:5000` where not already present | all | Store `.env.example` done 2026-09-29 |
| A5 | Auth-guard the shells: `ProtectedRoute` in all four apps redirects to a real login route; logout clears tokens + query caches | all | Portal/laundry have the component; admin/store need it |
| A6 | First live-data slice per app: render one real collection (admin: workspace KPIs from `/api/data`; laundry: orders list; portal: profile + jobs stub; store: materials list — the DB carries the exact fixture rows) to prove the pipeline end-to-end | all | Smoke: each app's requests appear as `[<appId>] …` in the server console/log feed |
| A7 | Verification matrix: zero supabase/lovable hits outside history docs; all 4 apps login + fetch live data; log lines tagged per app; root typecheck + builds green | all | |

---

### Phase B — Admin Console: control plane & access management

Exit criterion: with `AUTH_ENFORCE=true`, only owner/admin logins work; the admin UI can
grant/revoke an employee's `app_scope` and the change is live on that employee's next
login; all other apps show a clean 403 screen for out-of-scope users.

| Step | Work | Notes |
| --- | --- | --- |
| B1 | Re-apply the `app/ + features/ + lib/` split to the admin app (proven 0-lint pattern), porting the prototype's UI kit into `components/ui/` | Keeps deep links + react-query |
| B2 | Login screen (owner seed from `OWNER_PASSWORD`), token storage, refresh loop, role-aware shell | |
| B3 | **Employees & access UI**: staff list, create/edit (role, phone, hourly rate), `app_scope` checkboxes (admin/laundry/portal/store), activate/deactivate; devices registry (msisdn ↔ employee) | Needs new `routes/employees.ts` (+ validation schemas, tests) — owner/admin only; scope changes take effect at the employee's next `/auth/login` (fresh read from DB) |
| B4 | Server settings & feature flags UI over the `settings` table (whatsapp_enabled, sms_enabled, gps_enabled) | Table exists (014); reset-safe since 2026-09-29 |
| B5 | Flip `AUTH_ENFORCE=true` in dev; probe 401/403 paths through all four app proxies | Mirrors the 0c verification harness |
| B6 | Verification: scope grant → portal login sees new scope; revoke → 403; request-log lines show `[store] … 403`-style denials feeding the log viewer | |

---

### Phase C — Laundry Front Office: operational + UI boards

Exit criterion: an order taken at the counter syncs to the server, prints a DRAFT ticket
offline, and appears on the Admin Console board in real time.

| Step | Work | Notes |
| --- | --- | --- |
| C1 | Wire intake + status moves to `POST /api/laundry` + `PATCH /api/laundry/:id/status` (server stamps ready/collected) | Endpoints exist |
| C2 | Offline-first: Dexie cache (orders/customers/items) + generic outbox with `idempotency_key`; `POST /api/sync/push` + `/api/sync/pull` routes server-side (uses `sync_outbox` from 007) | Server route is new but the table exists |
| C3 | DRAFT tickets: offline printable `local-<uuid>`; ACK maps to authoritative `LDY-NNNNN` (numbering server-side) | pdfkit ticket exists; printing = browser print of the PDF download |
| C4 | UI boards from `docs/refs/laundry-1..4.webp`: status board (Received→Washing→Drying→Ready→Collected), ready/overdue lists, KPI strip, connectivity pill ("Last synced · N waiting") | Re-shape the existing dashboard shell |
| C5 | Facility consumables view — read `inventory` rows with `kind='facility'`; facility expense capture (`/api/expenses`, categories direct/operations) | Facility rows seeded (inv1–inv6) |
| C6 | Verification: offline create → online push dedup via idempotency key; log feed shows `[laundry]` entries; admin sees laundry-updated SSE | |

---

### Phase D — Portal (gabfix-inhouse-erp): operational + UI boards

Exit criterion: a technician sees only their jobs, moves them through the lifecycle, and
files hours/costs; the beacon streams positions to the admin map.

| Step | Work | Notes |
| --- | --- | --- |
| D1 | My Jobs: `job_assignments` for the logged-in employee; stepper Quote→Scheduled→Started→Completed→Invoiced→Paid | Reads `/api/jobs` (+ `/api/data`) |
| D2 | Lifecycle actions: Accept/Start/Complete via a new `PATCH /api/jobs/:id/status` (server-side stamps + `job_events` + notifications dispatch) | New endpoint; reuses 1b tables |
| D3 | Timesheets + cost capture against `/api/timesheets` + `/api/costs` (categories direct/sales per role) | Endpoints exist |
| D4 | Beacon page: geolocation watch → `POST /api/telemetry/pings` (45 s), permission gate, battery/accuracy fields | Server + FieldBeacon pattern exist from Phase 4 |
| D5 | UI boards from `docs/refs/portal-1.webp`: compact sidebar, "my day" KPI strip, task list, detail drawer; mobile-first 44 px targets | |
| D6 | Verification: technician cannot see other crews' jobs; `[portal]` log lines; ping lands in admin LiveMap | |

---

### Phase E — Store: operational + UI boards

Exit criterion: store pages run on the seeded database rows; a purchase request raised in
the Store arrives at the Admin Console for approval; utility captures flow to expenses →
journal.

| Step | Work | Notes |
| --- | --- | --- |
| E1 | Swap `store-data.ts` for `/api/data` reads — materials → `inventory` (`kind='contract'`), suppliers → `suppliers` (contacts/ratings/spend seeded), utilities → `utilityCaptures`; keep the existing UI types | DB rows are the same numbers the fixtures held (D0) |
| E2 | Write routes + UI: movements (receive/issue/adjust/return → `POST /api/store/movements`, which also updates `inventory_items.quantity`), low-stock badges from `minimum` | New routes; TRUNCATE list already includes the store tables |
| E3 | Tools: check-out/in (`PATCH /api/store/tools/:id`), due-back + condition notes; `holder_employee_id`/`job_id` links make tools assignable to staff and jobs | Table + seeded rows exist (016) |
| E4 | Purchase requests: raise in Store (`POST /api/store/purchase-requests`) → admin approval (`PATCH …/:id` status) → SSE `purchase.approved` bell in Store | Table + seeded rows exist (016) |
| E5 | Utilities: meter readings + slips (`POST /api/store/utility-captures`) → `/api/expenses` on approval (category direct/operations); PDF slip via `/api/documents` | Seeded rows carry the status ladder |
| E6 | UI boards from `docs/refs/store-1..2.webp`: keep the existing page structure, re-skin onto live data + SSE refresh | |
| E7 | Verification: issue-to-job decrements stock and shows in admin valuation; `[store]` log lines throughout; admin sees purchase approvals | |

---

### Phase F — Cross-app notifications & realtime fabric

Exit criterion: a status change in any app surfaces as a bell item or auto-refresh in
every app that cares — without polling.

| Step | Work | Notes |
| --- | --- | --- |
| F1 | SSE client module per app (EventSource, auto-reconnect, react-query invalidation map per event type) | Admin pattern exists (0c.2d); vendored to laundry/portal/store |
| F2 | Scoped bells: each app renders only notifications addressed to its scope (server already filters by customer/employee; add app-scope filter to bell queries) | |
| F3 | Notification rules activation: `laundry.ready` (→ customer WhatsApp + admin bell), `job.assigned` (→ portal bell), `purchase.approved` (→ store bell), `payment.recorded` (exists), `feedback.received` (→ admin) | EVENT_RULES table exists (reset-safe); extend + wire publishes |
| F4 | Delivery: processQueued scheduler pass for WhatsApp/SMS/email when credentials land; in-app always works | Meta verification lead time — start now if not started |
| F5 | Verification matrix: end-to-end event per app pair (laundry→admin, admin→portal, store→admin, admin→store) observed via SSE + bell + log feed | |

---

### Phase G — Admin depth: boards, ledger, health

| Step | Work | Notes |
| --- | --- | --- |
| G1 | Dispatch board: all jobs + staff, reassign (writes `job_assignments`), SLA risk flags, LiveMap integration (telemetry exists) | Board refs `admin-0..6.webp` |
| G2 | Finance suite: payments list/record, invoice viewer + PDF buttons (documents API exists), P&L/balance-sheet/aging views from `/api/data` + PDF reports | Server done in Phase 2 — this is UI only |
| G3 | Sync-health board: read `sync_outbox` (pending/failed/rejected per device) | Table exists |
| G4 | Manager/sales dashboards: pipeline (quote→won), commissions, attribution (salesperson/manager fields exist from 009) | Old enhance Phase 5 absorbed |
| G5 | Verification: every admin view loads < 1 s on seed data; PDFs download; log viewer shows cross-app traffic during the probe | |

---

### Phase H — Depth (later)

| Step | Work | Notes |
| --- | --- | --- |
| H1 | Payment gateway (Pesapal/Flutterwave) behind the existing payments provider seam + reconciliation webhooks | Old Phase 7 |
| H2 | Socket.IO upgrade: chat, presence, live-position streaming; SSE stays as fallback | Old Phase 6 |
| H3 | Scheduled reports + dunning (node-cron): nightly depreciation (exists), overdue follow-ups, weekly summaries | |
| H4 | Laundry offline pruning + Background Sync hardening; retention jobs for telemetry | |

---

## 6. UI Design Implementation (per-app workstream, folded into B–E)

Each app has a two-track UI effort: **(1) board conformance** — implement the reference
boards from `docs/refs/` using the vendored tokens (Inter, 8 px grid, per-app accent:
admin green, laundry green-dark, portal blue, store amber/gold); **(2) data conformance** —
every board region binds to live server data with loading/empty/error states, status
badges from the shared `.status` tone system, and dark-mode parity.

| App | Boards | Track-1 owner phase | Track-2 (live data) |
| --- | --- | --- | --- |
| Admin | `admin-0..6` (7 boards) | B (shell, access, logs) + G (dispatch, ledger, dashboards) | B1, G1–G4 |
| Laundry | `laundry-1..4` | C | C1–C5 |
| Portal | `portal-1` | D | D1–D5 |
| Store | `store-1..2` | E (pages already close; re-skin + wire) | E1–E6 |

Rules (unchanged from v4 §8): no hex literals in views, AA contrast, tokens via CSS
variables, `StatusBadge`/`KpiCard`/`DataTable` vendored per app, no shared source imports.

---

## 7. Reference Boards

`docs/refs/` already contains: `admin-0..6.webp`, `laundry-1..4.webp`, `portal-1.webp`,
`store-1..2.webp`. These are the acceptance targets for the §6 UI workstream.

---

## 8. Risks & Sequencing Notes

| Risk | Mitigation |
| --- | --- |
| Auth contract churn breaking app shells mid-refactor | Phase A lands the client→server alignment in one sweep per app; server contract is frozen (D2) |
| `AUTH_ENFORCE=true` locking people out | Flip only after B2 login + B5 probe matrix pass; staged `guard()`/`requireScope()` means dev stays open until then |
| Meta WhatsApp verification lead time | Parallel track from day one (gates F4 only; in-app + SSE work without it) |
| Store UI regressions while swapping fixtures for API data | DB rows mirror the fixture numbers exactly (016); swap the data source, keep the types |
| Dexie outbox vs server conflicts | Server wins on push; conflicts surface in admin sync-health (G3); idempotency keys dedupe retries |
| Reset wiping provisioning rows | Fixed 2026-09-29: `seedData` now restores settings + message templates + store data on every reset (D0) |
