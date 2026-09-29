# Gabfix Multi-App Plan (v4 — Final)

> Plan-mode proposal synthesizing `docs/plans/enhance.md`, `docs/requirements.md`, `docs/reclaimed_miltiapp_idea_evolution..txt`, and all reference images in `docs/refs/`.
> **No files changed.** This document locks decisions for the Act-mode scaffold.

---

## 1. Locked Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | Rename `client/` → `gabfix-administrator/` via `git mv` (history preserved) | User requested; kebab-case consistent with other apps; Vercel URLs clean |
| 2 | Three new sibling Vite+React 18 apps: `gabfix-laundry-front-office/`, `inhouse-employee-client/`, `gabfix-store/` | Same stack as current client (React 18 keeps react-leaflet@4 valid per enhance.md §4.1) |
| 3 | **One server**, three+ frontends. No per-app backend. All endpoints serve all apps; separation by JWT claims (`role` + `app_scope`) + `requireScope()` | Avoids 3× schema drift; keeps journal/ledger single-writer; matches enhance.md §17 compatibility |
| 4 | Four fully independent Vite+React 18 apps. No `file:../` deps, no workspaces, no shared source imports. Consistency via process parity checklist + server contract tests | User's Vercel constraint: repo = shared storage only; each `npm run build` per folder deploys independently |
| 5 | Admin Console owns access control (roles, app_scope, devices, provider keys, feature flags) | User requirement: "access control features controlled by this admin dashboard" |
| 6 | Theme contract from Light/Dark guides → CSS variables + Tailwind, vendored per app | Light §3 + Dark §3 token tables → `:root` / `[data-theme=dark]` variable sets |
| 7 | **All four apps are PWAs** (manifest, service worker, install prompt) | User directive: Gabfix Store must be PWA; all apps get installable app experience |
| 8 | **All four apps use jsPDF + jsPDF-AutoTable** (vendored copies, one pinned version) | Offline DRAFT tickets need client-side PDF; jsPDF runs in browser; same version in server + each app |
| 9 | **No branches** — single shop, `branch_id` removed everywhere | User confirmation: "we don't have branches, remove that" |
| 10 | enhance.md 8-phase order preserved; multi-app scaffold is Phase 0a/0b injected before feature work | Phase 0 is the "make change safe" gate (enhance.md §18.2) |
| 11 | CORS allowlist covers 4 Vercel domains + localhost ports **5173–5179** | User directive: "allow list should accommodate up to 5179" |
| 12 | **Expense model: 6 categories, single `cost_categories` table, enforced by FK** | All apps write to `job_costs` / `expense_entries` with `category_id → cost_categories`; see §11 |

---

## 2. Final App Registry

| Folder (Vercel Root Directory) | Package name | Display title | VITE_APP_ID | Dev port | Mode |
|---|---|---|---|---|---|
| `gabfix-administrator/` | `gabfix-administrator` | **Gabfix Admin Console** | `admin` | 5173 | Online-first, control plane, full PWA |
| `gabfix-laundry-front-office/` | `gabfix-laundry-front-office` | **Gabfix Laundry Front Office** | `laundry` | 5174 | Offline-first PWA (Dexie + SW) |
| `inhouse-employee-client/` | `inhouse-employee-client` | **Gabfix Portal** | `portal` | 5175 | Online-first, PWA, tiny beacon outbox |
| `gabfix-store/` | `gabfix-store` | **Gabfix Store** | `store` | 5176 | Online-first, full PWA |

> Folder names are kebab-case (no spaces). Display titles carry spaces/capitals via `index.html` + `manifest.webmanifest`. Reserved range: 5173–5179 covers all four apps + dev buffer.

Each app is fully independent: own `package.json`, `node_modules`, `vite.config.ts`, `tailwind.config.js`, `src/theme/tokens.css`, `src/components/*`, `src/lib/api.ts`, `manifest.webmanifest`, service-worker via `vite-plugin-pwa`.

**Vercel env per project:**
```
VITE_API_BASE_URL=https://<server-host>/api
VITE_APP_ID=admin|laundry|portal|store
```

---

## 3. What Each App Is

### 3.1 Gabfix Admin Console — the only control plane

**Who:** Super user (owner) + assigned admins (manager, accountant).

**Exclusively owns:**
- Roles / app_scope assignment / devices / sessions
- Provider keys, feature flags
- Dispatch board (all jobs, all staff, reassign, SLA risk, live map/trails/geofences/trips)
- Ledger (CoA / journal / P&L / balance sheet / cash flow / aging)
- Payments config + reconcile
- Assets + depreciation
- Commissions / targets / manager dashboard
- Templates + Inbox + CSAT + notification log
- Sync-health (per-device pending/failed/conflict)
- Stock valuation + purchase approval

**Answers:** *"Are we healthy? Who can do what? What needs escalation?"*

**Does NOT do:** Any operational execution (Accept/Start/Complete a job, collect laundry, capture expense). All coordination happens here only.

### 3.2 Gabfix Laundry Front Office — counter kiosk + facility storekeeper (offline-first PWA)

**Who:** Laundry role. Single shop, no branch filter.

**A. Laundry ops:** Intake, status board (Received → Washing → Drying → Ready → Collected), collect + receipt, ready/overdue lists, scoped bell, connectivity pill ("Last synced · N waiting").

**B. Facility running (NEW in v4):** On-hand consumables / supplies / packaging / spares (facility subset of `inventory_items`), receive / issue / adjust movements, low-stock badges, restock requests, facility-expense capture (rent, utilities, maintenance, fuel + receipt photo) → queued offline → Admin approves → journal.

**KPI strip:** Inventory value / Low stock (n) / Pending requests.

**Key features:** Prints **DRAFT** `local-<uuid>` tickets instantly offline → auto-upgrades to authoritative `LND-NNNNN` / `RCPT-NNNNN` on sync ACK. Numbers never assigned offline (server `document_sequences` at push). Payments/expenses quarantined — Admin reconciles. Dexie outbox with `idempotency_key`. Pruning: evict synced + collected/approved + >30 days; server is permanent.

### 3.3 Gabfix Portal — execution lens for all inhouse employees

**Who:** All employees with `app_scope=portal`; role (from Admin JWT) decides the view:

| Role | Portal shows |
|---|---|
| technician | My Jobs (`job_assignments.employee_id = me`), stepper (Quote→Scheduled→Started→Completed→Invoiced→Paid), Accept/Start/Complete, timesheets, cost capture, own trail, job cards |
| sales | Own pipeline + quotes + commission snapshot only |
| supervisor (crew-scoped) | Crew day view, accept/escalate-to-Admin. No cross-crew reassign |
| accountant-field | Submit-only: expenses/costs capture; no ledger read |

**Beacon:** Minimal `/field` shift ping (`POST /api/telemetry/pings`), own-trail only. Full map stays Admin-only.

**Does NOT get:** Dispatch of others, cross-crew reassign, ledger/CoA/journal, P&L, templates editing, user/device management, full staff map.

**Board mapping** (ref: `docs/refs/portal-1.webp`): Compact sidebar + personal header + "my day" KPI strip + task list + detail drawer. Mobile-first: stacked cards below `md`, 44px touch targets.

### 3.4 Gabfix Store — contract-business store + utilities (online-first PWA)

**Who:** `storekeeper` (new role) + manager/accountant (Admin-scoped).

| Concern | Store gets | Admin Console gets | Portal / Laundry get |
|---|---|---|---|
| Contract materials | On-hand, issue-to-job, adjust, low-stock, restock/purchase requests, supplier list | Approve PO, valuation, supplier master, journal posting | Portal: request materials, view availability |
| Tools & equipment | Check-out/in to employee + job, due-back, condition note | Asset register + depreciation | Portal: my checked-out tools |
| Utilities + running costs | Capture + meter readings + slips (power, water, fuel, transport, maintenance) | Approve → journal → P&L | — |
| Reports | Stock list, movement ledger, low-stock, request status | Valuation, cost-per-job, supplier spend | — |

**Fence:** Store = contract division; Laundry FO = facility consumables. No auto-transfer in v1. Online-first (stable store PC, live quantities + valuation).

---

## 4. Concern Matrix (Compact)

| Concern | Admin | Laundry FO | Portal | Store |
|---|---|---|---|---|
| Dispatch | Full board (all staff, all jobs, reassign) | — | My jobs + accept | — |
| GPS/location | Full map/trails/geofences | — | Own trail only | — |
| Stock | Full catalogue + valuation + PO | Facility consumables | Request only | Contract materials |
| Payments | Config + reconcile + reports | Collect + receipt | View balance | — |
| P&L/expenses | Full ledger | Capture facility exp | Submit-only | Capture utilities |
| Notifications | Bell + Inbox (SSE→Socket.IO Ph.6) | Scoped bell + sync state | Scoped bell + SSE | — |
| PDFs | All 14 types | Ticket/receipt/stock-list/expense-slip | Job card/delivery/trip | Goods-received/issued slips |

---

## 5. jsPDF (Locked)

**jspdf + jspdf-autotable**, one pinned version in `server/` and vendored copies per app. Server `services/pdf/` + per-app `src/lib/pdfLayout.ts` mirror (header, meta grid, autotable items, totals, footer + page numbers). 14 docs: 12 from enhance.md §12 + stock-list + facility/store-expense-slip. Laundry DRAFT pattern: `local-<uuid>` → ACK maps to `LND-NNNNN`/`RCPT-NNNNN`.

---

## 6. Laundry Offline-First + Dexie + Pruning

Dexie first → instant confirm → `POST /api/sync/push` with `idempotency_key` → ACK maps `local-<uuid>` → serverId. Offline: pending rows, header shows “✗ Offline — N waiting”. Numbers assigned server-side at push. Dexie stores: orders_cache, customers_cache, stock_items_cache, generic outbox (stock_move, restock_request, facility_expense). Never stores: ledger, P&L, provider keys. Pruning: evict synced + >30 days; server permanent. PWA: manifest + vite-plugin-pwa SW + Background Sync.

---

## 7. Integrations (all in server/)

| Integration | Server owner |
|---|---|
| Auth JWT `{role, app_scope[]}` + `requireScope(appId)` | §6.6 + §8.2 + 003/005 |
| Jobs / assignment / events | `004`, `job_assignments`, `job_events` |
| Timesheets / costs / expenses | `006`, `timesheets`, `job_costs` |
| Store link (inventory, tools, checkout) | `inventory_*`, `tool_checkouts` |
| Telemetry | `010`, `POST /api/telemetry/pings` |
| Messaging | `009`, scheduler |
| Realtime | `GET /api/events` SSE → Socket.IO Ph.6 |
| jsPDF (14 docs) | `services/pdf/` |
| Sync (Laundry offline) | `/api/sync/push`, `/api/sync/pull` |
| CORS (4 Vercel + 5173–5179) | `server/index.ts` cors config |

---

## 8. Theme / Components — Process Parity

Vendored per app (no shared imports). Source = Light/Dark §3. Build order: StatusBadge → DataTable → KpiCard → Modal → Timeline → MapView → AuthGuard → Toast. Rules: no hex in views, AA contrast, Inter + 8px grid. Server contract tests enforce parity.

---

## 9. Delivery Order

```
0a  git mv client gabfix-administrator + 3 scaffolds + root scripts + baseline
0b  per-app: vendor tokens + useTheme + StatusBadge + PWA shells
0c  backend: 005_multiapp_identity + 006_remove_branches + sync_tables migrations
           + auth (app_scope, requireScope, CORS 5173-5179) + route scope guards + SSE
1   data spine: payments + ledger + costs + job dates + assets
2   jsPDF 14 docs + DRAFT→authoritative
3   messaging/feedback/scoped bells
4   field ops
5–7 sales/manager, chat, gateway
```

**~84–131 dev-days single-dev.**

---

## 10. Server Readjustments Required

Current server was single-client. Changes for four-app architecture:

### 10.1 New Migrations

| File | Purpose |
|---|---|
| `005_multiapp_identity.sql` | `app_scope TEXT[]` on employees; add `storekeeper` role; seed owner with all 4 scopes |
| `006_remove_branches.sql` | Drop branches; remove all `branch_id` FKs |
| `007_job_lifecycle.sql` | `job_events`, `job_assignments`, `timesheets`, `job_costs`, `cost_categories` (6 fixed categories, see §12) |
| `008_inventory_full.sql` | `inventory_items` ext + `inventory_movements`, `tool_checkouts` |
| `009_money.sql` | `payment_methods`, `payments` (PAY-#####), `chart_of_accounts`, journal |
| `010_telemetry.sql` | `location_pings`, `location_daily_rollups`, `geofences` |
| `011_sync_outbox.sql` | `sync_outbox` (idempotency_key, app_scope, op_type), `feedback_requests` |
| `012_store_tables.sql` | `utility_readings`, `supplier_proposals`, `purchase_orders` |

> `document_sequences` (Phase 0.8) already committed. Store adds `sto`/`utl`/`pay`/`rcpt` prefixes.

### 10.2 Auth Middleware

```typescript
// auth.ts — add app_scope to AuthUser + requireScope guard
export type AuthUser = { id: string; name: string; role: string; app_scope: string[] };

export function requireScope(...scopes: string[]) {
  return (req, res, next) => {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }
    if (!scopes.some(s => req.user!.app_scope.includes(s))) {
      res.status(403).json({ error: 'App scope not permitted' }); return;
    }
    next();
  };
}
```

### 10.3 CORS

```typescript
const ALLOWED_ORIGINS = [
  'https://gabfix-administrator.vercel.app',
  'https://gabfix-laundry-front-office.vercel.app',  // 5173–5179 local dev
];
app.use(cors({ origin: (origin, cb) => {
  if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
  cb(new Error('Not allowed by CORS'));
}, credentials: true }));
```

### 10.4 Route Scoping

```typescript
app.use('/api/jobs',      requireScope('admin','portal','laundry'), jobsRouter);
app.use('/api/laundry',   requireScope('admin','laundry'),          laundryRouter);
app.use('/api/store',     requireScope('admin','store'),            storeRouter);
app.use('/api/sync',      requireScope('laundry'),                  syncRouter);
app.use('/api/telemetry', requireScope('admin','portal'),         telemetryRouter);
app.use('/api/events',    requireScope('admin','laundry','portal','store'), eventsRouter);
```

### 10.5 Unchanged

- Document numbering (Phase 0.8) — app-agnostic ✓
- Migration runner — just new .sql files ✓
- Single PostgreSQL — all 4 apps share ✓

---

## 11. Expense Model — 6 Fixed Categories

**Locked:** A single `cost_categories` lookup table enforces the 6 top-level expense buckets. Every cost entry across **all four apps** references one of these via `category_id → cost_categories`.

| # | Category | Apps that write here | Sub-items (user-supplied) |
|---|---|---|---|
| 1 | Direct job cost | **Laundry FO**, **Portal**, **Store** | Labour, Materials, Transport, Fuel, Technician costs |
| 2 | Sales & marketing | **Admin**, **Portal** (sales role only) | Advertising, Agency, Promotions, Sales commissions |
| 3 | Staff | **Admin** | Salaries, Training, Allowances |
| 4 | Operations | **Laundry FO**, **Store**, **Admin** | Rent, Utilities, Repairs, Equipment, Communication |
| 5 | Administration | **Admin** | Accounting, Legal, Software, Office |
| 6 | Owner / strategic | **Admin** | Strategy, Consulting, Founder-related expenditure |

### Migration (`007_job_lifecycle.sql`)

The `cost_categories` table is created in **migration 007** (already referenced above as part of job_lifecycle). See §11.

```sql
CREATE TABLE cost_categories (
  id          SMALLSERIAL PRIMARY KEY,
  code        TEXT     UNIQUE NOT NULL,   -- 'direct', 'sales', 'staff', 'operations', 'admin', 'owner'
  label       TEXT     NOT NULL           -- human-readable name
);
INSERT INTO cost_categories (code, label) VALUES
  ('direct',     'Direct job cost'),
  ('sales',      'Sales & marketing'),
  ('staff',      'Staff'),
  ('operations', 'Operations'),
  ('admin',      'Administration'),
  ('owner',      'Owner / strategic');
```

### App-level enforcement

- **Laundry FO** writes to `expense_entries` only with categories 1 (job/transport/fuel) + 4 (facility rent/utilities/maintenance) — server `requireScope('laundry')` + category FK
- **Store** writes with categories 1 (materials/transport/fuel) + 4 (utilities) — `requireScope('store','admin')`
- **Portal** writes with category 1 (labour/materials/transport) for technician job costs, category 2 (sales) for sales role — `requireScope('portal','admin')`
- **Admin** writes all categories + approves all

All write paths go through a shared POST endpoint guarded by category allowlists derived from the user's `role`+`app_scope`. Admin overrides always permitted.

---

## 13. Remaining Questions Before Act Mode

| # | Question | Recommendation |
|---|---|---|
| 1 | Store↔Laundry stock transfers in v1? | Future (keeps v1 scope bounded) |
| 2 | `storekeeper` — also add to Portal for requesting materials? | Yes (read-only request) |
| 3 | Store utilities breadth? | power, water, fuel, transport, maintenance |
| 4 | Portal chart library (recharts) or SVG-only? | SVG-only for v1 |
| 5 | Sync conflict resolution? | Server wins on push; Admin reviews via sync-health |
| 6 | Doc target — standalone `multi-app-plan.md` or into `enhance.md`? | Standalone (recommended) |

---

## 14. Reference Boards

`docs/refs/` already contains reference images:
- `admin-0.webp` … `admin-6.webp` (7 boards) — Gabfix Admin Console
- `laundry-1.webp` … `laundry-4.webp` (4 boards) — Gabfix Laundry Front Office
- `portal-1.webp` (1 board) — Gabfix Portal
- `store-1.webp`, `store-2.webp` (2 boards) — Gabfix Store

---

## 15. Proposed First Act Slice (Phase 0a)

1. `git mv client gabfix-administrator` (preserves history)
2. Scaffold 3 new apps from Vite+React 18 template + `vite-plugin-pwa` + `manifest.webmanifest`
3. Root `package.json` scripts: `dev:admin`, `dev:laundry`, `dev:portal`, `dev:store`
4. Per-app configs: `vite.config.ts` (proxy `/api` → `localhost:4000`, `@/` → `src/`), `tailwind.config.js`, `src/theme/tokens.css`
5. Baseline commit shown before 0b/0c proceed

**Toggle to Act Mode (⌘A) when ready.**