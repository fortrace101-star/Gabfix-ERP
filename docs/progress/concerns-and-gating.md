# Progress — Checklist gating & concern-raising (Recommendations 1 & 2)

Companion to `docs/plans/cleaning-operations-workflow.md`. Decisions **#11** (checklist gating) and **#12** (concern categories) were already **Settled** in plan §12; this document records the code that grounds them in the portal UI.

- **Status:** both recommendations **Applied (code)**.
- **Scope note (AGENTS.md):** the staff API (`POST /api/job-queries`, SSE) is not reachable from this workspace, so the portal uses a **localStorage preview store** that is shaped to drop into the live API with an I/O swap only.

## Recommendation 1 — Checklist gating (advisory ↔ terminal)

Policy is pure (no React/IO) in `src/lib/gating.ts`:

| Stage group | Stages | Gate mode | Portal behavior |
| --- | --- | --- | --- |
| Field stages | `Inspection`, `Quoted`, `Scheduled`, `In Progress`, `Follow-up` | `advisory` | crew may proceed; a logged "skip" is an explicit choice |
| Terminal stages | `Completed`, `Invoiced`, `Paid`, `Closed`, `Cancelled` | `hard` | every item must be ticked or individually waived |

`checklistGate(stage, done, total)` returns a `GateReport` (`mode`, `ready`, `done`, `total`, `remaining`, `reason`).

Where it is wired:

- `src/components/JobChecklistPanel.tsx` — accepts `onChecklistReady(done, total)` and reports live checklist completion upward.
- `src/components/Portal.tsx` — stores `checklistReady: { done, total } | null`, calls `checklistGate(selected.status, …)`, and:
  - on **advisory** stages, shows "Skip remaining items" (logs a skip and proceeds);
  - on **terminal** stages, hard-disables the "Complete job" button until `ready` (renders `gate.reason` as a `muted-note` hint);
  - the terminal hard gate is also enforced by the staff API (`POST /api/job-status` → 422) for the real swap.

## Recommendation 2 — Concern-raising (5 categories)

Categories (plan §2.3, matching the server `job_queries.kind` constraint): `wrong_job`, `schedule_conflict`, `missing_kit`, `safety`, `other`.

Flow:

1. Lead raises → `src/components/ConcernForm.tsx` (category `<select>` + body `<textarea>`, sonner success toast). Persisted via `raiseConcern(...)` in `src/lib/concerns.ts`.
2. `src/lib/concerns.ts` holds the `JobConcern` row shape, `CONCERN_KINDS`/`CONCERN_LABELS`, and a `localStorage` preview store + `useConcerns()` hook (open concerns, newest first, live on a `gabfix:preview-concern` custom event).
3. Manager inbox → `src/components/ConcernsInbox.tsx` (open concerns list; resolve with a resolution note → `resolveConcern(...)`).
4. Notification on arrival → `src/lib/bell.ts` (`concern_raised` template) + `src/components/PortalBell.tsx` (dedupe via `seenRef` + sonner toast on new item).
5. Nav → `src/components/Portal.tsx` ("Concerns" link for Supervisor role → `isConcernsView` → renders `<ConcernsInbox/>`); the same drawer hosts `<ConcernForm/>` when `raiseConcernOpen`.

The SSE `concern_raised` template is defined so the staff-service follow-up (`POST /api/job-queries` emitting SSE) is an additive I/O swap.

## File map

| File | Role |
| --- | --- |
| `src/lib/gating.ts` | **new** — pure checklist-gating policy (`checklistGate`, `FIELD_STAGES`, `TERMINAL_STAGES`, `GateReport`). |
| `src/lib/concerns.ts` | **new** — concern categories + `JobConcern`/`RaiseConcernInput` types + localStorage preview store + `useConcerns`. |
| `src/components/ConcernForm.tsx` | **new** — lead "raise a concern" form (5 categories). |
| `src/components/ConcernsInbox.tsx` | **new** — manager inbox (open → resolve). |
| `src/lib/bell.ts` | **edited** — `concern_raised` bell template. |
| `src/components/PortalBell.tsx` | **edited** — `concern_raised` arrival toast + dedupe. |
| `src/components/JobChecklistPanel.tsx` | **edited** — `onChecklistReady(done, total)` callback. |
| `src/components/Portal.tsx` | **edited** — Supervisor "Concerns" nav, `isConcernsView` inbox branch, drawer gating on "Complete job" + "Skip remaining items" + "Raise concern". |
| `src/routes/__root.tsx` | **edited** — mounted the sonner `<Toone />` provider globally. |

## Verification

- **Syntax:** all 9 touched/edited files pass `typescript.transpileModule` (esbuild-parse equivalent) with no errors. (Note: `transpileModule` validates syntax and name resolution, not full cross-file type contracts.)
- **Imports:** confirmed present in `Portal.tsx` — `AlertCircle`, `Check`, `Play`, `CalendarDays`, `CircleDollarSign` from `lucide-react`; `ConcernForm`, `ConcernsInbox`, `checklistGate`.
- **Type-safety spot-checks:** drawer renders `gate.reason` (string node), not the `GateReport` object; `gate` narrowed to `GateReport \| null`; prop signatures (`onChecklistReady?: (done, total) => void`) align between `JobChecklistPanel` and `Portal`.
- **Formatting:** `Portal.tsx`, `PortalBell.tsx`, `JobChecklistPanel.tsx`, `ConcernsInbox.tsx` were normalized by Prettier during the session; the other 5 files are hand-authored to the repo style (double quotes, 2-space indent, trailing commas) and match Prettier output.
- **Full `tsc --noEmit`:** could **not** complete in this environment — cold `tsc` program load exceeds the agent's 30 s command cap. Treated as an env limitation, not a code defect; expected green on CI.

## Out of scope / follow-ups (server side)

- Staff service: emit SSE `concern_raised` on `POST /api/job-queries`; `GET /api/job-queries` feeds the inbox. Drop the `localStorage` preview once connected (pure I/O swap — `JobConcern` shape is unchanged).
- `POST /api/job-status` already returns 422 on the terminal gate (hard `Closed`); portal surfaces `gate.reason`.

## Open item (tracked)

- `tsc`/`npx tsc` timeouts in this workspace block a full type-check locally. Re-run `tsc --noEmit --skipLibCheck` on CI to confirm no type regressions across the 9 files.
