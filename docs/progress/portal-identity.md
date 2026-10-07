# Portal identity, scoping and assignment notifications

The employee portal now renders the **signed-in** employee and only **their own**
DB records, and job assignments reach their task list. This work also uncovered
and fixed three server-side breaks that meant assignment notifications could
never appear at all.

## Which tree is live

`vite.config.ts` runs `@lovable.dev/vite-tanstack-config` with `tanstackStart`, so
the served app is the TanStack Start tree: `src/routes/index.tsx` →
`src/components/Portal.tsx` (plus `/sign-up` → `SignUpPage`). `index.html` →
`src/main.tsx` → `App.tsx` → `src/pages/index.tsx` is the older SPA shape and is
not mounted by the current build. Verified against the running dev server
(`GET /` returns the Portal shell; `GET /sign-up` returns the invite form).

## Client (`gabfix-inhouse-erp`)

| Surface | Change | Source |
| --- | --- | --- |
| Role | **No role picker.** `toPortalRole(session.role)` is the single source of the pane (technician→Technician, sales→Sales, csr→Support, everything else→Supervisor), and it drives `navigation[role]`, `metrics[role]` and the view branches | same |
| Identity | `useSession()` resolves `GET /auth/me` (now also exposing `loading`); `displayName`/`displayFirst`/`initials` drive the greeting, sidebar profile, topbar profile and the Settings panel; the role shown is the employee's real server role (`roleTitle`) | `src/lib/session.ts` |
| Gate | The shell renders only once the session resolves: while `loading` it shows a neutral "Restoring your workspace…" screen, otherwise the sign-in form. There is no demo identity to fall back to — tokens live in localStorage, so SSR can't know the user | same |
| Jobs | `useEmployeeWorkspace()` (one `GET /data`) → `myJobs` = jobs whose `job_assignments` row names this employee. No demo fallback: the list is empty until they are actually assigned | `src/lib/workspace.ts` |
| Leads / follow-ups | A lead is theirs when `salesperson_id` is them or is unassigned; a follow-up via `owner_employee_id`, else unclaimed in their role | same |
| Supervisor | `crew` = active employees with assigned/open counts and revenue derived from the assignment rows (no hardcoded team) | same |
| Support (CSR) | Leads + follow-ups + real customer `feedback` (rating/comment/customer) instead of invented tickets | same |
| Nav | Only sections backed by live data: Technician = Overview/My jobs/Schedule; Sales = Overview/Leads/Follow-ups; Supervisor = Overview/Team/Leads; Support = Overview/Leads/Follow-ups/Feedback. The "My jobs" badge counts their assignments | `src/components/Portal.tsx` |
| Metrics / activity / attention | Computed from their own rows (jobs assigned, in progress, completed, next job, pipeline value, follow-ups due, team size, average rating) — no static numbers | same |
| Job drawer | Live facts only (customer, site address, day, value). Start/Complete call `PATCH /api/jobs/:id/status` and reload the feed; the fake checklist, notes field and photo upload are gone | same |
| Bell | The static bell popover is replaced by `PortalBell employeeId={session.id}` — SSE-refreshed, mark-read, push consent | `src/components/PortalBell.tsx` |

`useMyJobs` still exists for the older SPA tree (`src/pages/*`), and returns
`place` (from `jobs.site_address`) while clearing its feed to `null` whenever the
identity changes, so a second employee signing in can never briefly see the
previous employee's rows.

`styles.css` gains `.bell-wrap`/`.bell` chrome so `PortalBell` matches the
portal's existing `.bell-btn` look (visual roles stay centralised there, per
`AGENTS.md`).

## Server fixes (`server/services/notifications.ts`, `migrations/024`)

`POST /api/jobs/:id/assignments` dispatches `job.assigned` (plan F3: "→ portal
bell"), but three things meant the assignee's bell never rang:

1. **`job.assigned` had no assignee rule.** `assigneeAudience` existed but no
   rule referenced it — the only rule produced a `push` row addressed to
   `app:store`. Added an `inapp` rule with `audience: assigneeAudience` (pinned
   to `channels: ['inapp']`, since `dispatchEvent` uses the picked channel set
   rather than `rule.channel`), which writes one employee-scoped row per crew
   member — exactly what `GET /notifications/unread?scope=portal&employeeId=`
   filters on.
2. **`ON CONFLICT` did not match the dedupe index.** The main insert used
   `ON CONFLICT (template_key, channel, entity_type, entity_id)` against the
   five-column partial unique index `notifications_dedupe`, so **every**
   dispatch threw `42P10` ("no unique or exclusion constraint matching the ON
   CONFLICT specification") and the route's silent `catch {}` hid it. Aligned
   with the skip-path target.
3. **No `message_templates` row for `job_assigned`.** After (2) was fixed, rows
   were created but `processQueued` flipped them to `status='failed'`
   ("Template not found"), and the bell queries only surface
   queued/sent/delivered/read. Added `('job_assigned','inapp')` and
   `('job_assigned','push')` templates in migration
   `024_job_assigned_templates.sql` (idempotent) and in `seed-data.ts`.

Net effect: the in-app row lands `queued` → `inappAdapter` publishes the
`notification` SSE event → status `read` with `read_at` still NULL → it stays in
the bell until clicked.

## Data backfill on the dev DB

- One `job_assigned` in-app row per existing `job_assignments` row (payload
  identical to `jobAssignedPayload`), so the seeded crew sees their work.
  Reversible with `DELETE FROM notifications WHERE template_key='job_assigned'`.
- `UPDATE jobs SET scheduled_date = date WHERE scheduled_date IS NULL` — a job
  leaked by an earlier non-rolling-back CRM test run; this also failed the
  `009 backfills job dates` suite test (now 6/6).

## Verification

- `tsc --noEmit`: 0 errors in `gabfix-inhouse-erp` and `server`.
- `node --import tsx --test test/notifications.test.ts`: **12/12** (incl.
  `dispatchEvent + processQueued lifecycle`).
- `node --import tsx --test test/jobs-dates.test.ts`: **6/6** after the backfill.
- End-to-end probe (owner assigns John Kato → John signs in to the portal):
  assignment 201, `/auth/me` returns *John Kato / technician / [portal]*,
  `GET /notifications/unread?scope=portal&employeeId=…` returns his
  `job_assigned` row with the right payload, and `GET /api/data` carries his
  assignments. John's bell now lists all 7 of his jobs.
- Served page (`GET :8080/`) renders `PortalBell`'s button (SSR) and the
  live-count nav badge.

## Data state behind the views

The panes only render what a connected employee owns, so the dev DB has to carry
it. Two gaps surfaced while verifying:

- `job_assignments` had been wiped by a non-rolling-back CRM test run. The
  repo's `server/.reset.mjs` restores the crew (John Kato on `j1`/`j3`/`j5`) and
  clears `j1790%` probe jobs.
- `leads` and `follow_ups` had **no** seeder — migration 021 seeded them once at
  migration time, so any `/api/reset` or test cleanup left the Sales and CSR panes
  permanently empty. Added `seedCrmData()` in `server/seed-data.ts` (same pattern
  as `seedStoreData`, called from `seedData()`): 5 leads owned by Peter Ssali
  plus one unassigned, and 4 follow-ups (2 Peter, 1 unclaimed sales, 1 unclaimed
  `feedback_outreach` against completed job `j5`). Note `follow_ups.id` is a
  **uuid**, so those seeds use fixed uuids rather than text ids.

Resulting panes (verified against the live `GET /api/data`):

| Signed in | Pane | Shows |
| --- | --- | --- |
| John Kato (technician) | Technician | 7 assigned jobs — JOB-00138/40/42, GF-2841/46/52/33 |
| Peter Ssali (sales) | Sales | 5 leads (4 his + 1 unassigned), 3 follow-ups |
| CRM Test CSR (csr) | Support | 1 unassigned lead, 1 follow-up, 0 feedback |
| Grace Atim (manager) | Supervisor | team of 17 with assignment counts, 1 own assignment |

## Per-stage job checklists + activity log (migration 025)

Every job carries a checklist for each stage it passes through, starting with
**Inspection**, and nothing about it is locked down.

- `job_checklist_items` / `job_activities` (migration `025_job_checklists.sql`).
- `server/services/job-checklist.ts` holds the stage templates (`STAGE_CHECKLISTS`:
  Inspection, Quoted, Scheduled, In Progress, Completed, Invoiced, Paid) plus the
  seed/read/write helpers. `seedStageChecklist` is **idempotent per stage** — it
  skips a stage that already has rows, so crew edits are never overwritten.
- Seeding happens in two places: `GET /:id/checklist` calls
  `ensureInspectionChecklist`, so **every** job (including pre-025 ones) starts
  with Inspection the first time it is opened; and `routes/job-status.ts` seeds the
  new stage's template inside the same transaction as the status change, so the
  checklist appears together with the stage.
- `server/routes/job-checklist.ts`: `GET/POST /:id/checklist`,
  `PATCH/DELETE /:id/checklist/:itemId`, `GET/POST /:id/activities`. Writes are
  allowed for the assigned crew **or** any role holding `assign_crew`; anyone else
  gets 403. Every mutation publishes `job-updated` so other open sessions refresh.
- Portal: `src/components/JobChecklistPanel.tsx` renders the checklist grouped by
  stage (tick, remove, add an item against any stage) and the activity log with a
  free-text box for capturing work that was never recorded at the time. It sits in
  the job drawer in `components/Portal.tsx`, styled from the drawer's existing
  `.checklist` / `.drawer-section-head` rules.

Verified live as John Kato (assigned crew) on `GF-2841`: the checklist auto-seeds
Inspection, add → 201, tick → `done_at` stamped, delete → 200, activity captured
with its author, and a status change seeds the new stage's items. A sales employee
who is not crew is refused with 403; a manager may edit any job.

Known gaps left untouched (other apps' bells, pre-existing): `laundry_ready`,
`purchase_approved` and `feedback_received` dispatches also have no
`message_templates` rows, so those bells hit the same "Template not found"
failure; and the full `npm test` run intermittently cancels DB integration tests
in telemetry/laundry/assets on this Windows box (they pass when run per file).
