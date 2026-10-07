# Gabfix cleaning operations â€” workflow & architecture plan

Status: **proposal for approval** (nothing here is implemented yet).
Companion to `docs/progress/portal-identity.md` (what the portal does today).

### Decisions already taken

* **The unconfirmed, salesperson-created order is `Proposed`.** âœ”
* **Assignment happens only after `Confirmed`.** A job cannot be crewed in any other
  stage. The manager may change the lead or the team later, at any stage (Â§2.2).
* **The assigned person is the *lead*.** Helpers working on the job are documented
  alongside; the lead may *request* a team change (Â§2.2). Tasks inside a job can be
  assigned to other technicians, and who executed a task is recorded (Â§2.2).
* **Confirmation is done by customer support *and* the manager.** Customer support's
  only order action is confirming the booking with the client; the manager may
  confirm too. Crew assignment stays with the manager.
* **Crew is technicians only.**
* **Salespeople are Portal-only** â€” no Admin Console access.
* **Commission = 2% of the cash received, per completed job**, for now (Â§7). Per-service
  tiers come later.
* **Cancellation:** manager only, and **never after `Completed`** â€” a completed job
  must go on to invoiced â†’ paid â†’ follow-up. The customer is **not** notified yet (a
  WhatsApp notification workflow comes later; until then it is deliberately a stop).
* **A job stays open until `Closed`.** Escalation to the manager is **5 days**
  without feedback, not 7.
* **The role `csr` is renamed `customer_support`** â€” in the database, the server, the
  Admin Console, the portal, seeds and tests.
* **Two different things are both called follow-up**, and they are deliberately
  separated in this plan â€” see Â§2.1. Nothing else in this document uses the word
  ambiguously:
  * **Customer-support follow-up** = post-job outreach on *executed* jobs whose
    feedback is not yet registered. Owned **only** by customer support, on a
    **2-day cadence**, and it is the closing stage of every job.
  * **Sales follow-up** = nurture of a *prospect* who has not ordered yet. Owned by
    the salesperson on their own prospect, and it is the **last stage of the prospect
    pipeline**.

This plan turns the operating model into an explicit contract: one lifecycle for a
cleaning order, one place where each transition is allowed, and one notification
fabric that carries an event from the Admin Console to the employee Portal.

---

## 1. Principles

1. **Customer first.** Everything hangs off a `customers` row. An order without a
   customer is not an order.
2. **Two intakes, one lifecycle.** Orders originate externally (website) or
   internally (a salesperson relaying a client's request). After intake they share
   exactly the same stages, checklists and notifications.
3. **One confirmation authority.** Only the **manager** or **customer support** may confirm
   manager) can move an order to *Confirmed*. Nobody else â€” not the salesperson who
   created it, not a technician â€” can confirm.
4. **Only technicians execute.** `job_assignments` is restricted to technicians.
   Sales and customer support may be named for context (the bringing-in salesperson) but never
   as crew.
5. **Every stage carries a checklist**, seeded on entry, editable per job, and a
   free-text activity log so work that was never recorded can still be captured.
6. **Three portal roles only**: `sales`, `technician`, `customer_support`. The manager works in
   the Admin Console. `laundry`, `storekeeper`, `accountant` are retired from the
   portal (their apps and data stay untouched).

---

## 2. The lifecycle (and the stage we needed to name)

The salesperson has relayed a real request â€” *"I want you guys to clean my house"* â€”
and registered the service, but **nobody has verified it with the client yet**.
That state needs a name, distinct from `Quoted` (which comes after inspection and
carries a priced quote).

**Recommended name: `Proposed`** â€” the order is a genuine statement of intent,
awaiting verification. Aliases considered: *Pending Confirmation* (clearer, longer),
*Draft* (wrong â€” a draft implies it may never be real).

```text
            â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ external â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
            â”‚ website booking â†’ manager enters it      â”‚
            â”‚ website info  â†’ customer only, no order  â”‚
            â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                â”‚
       portal: salesperson relays a client's request
                                â”‚
                                â–¼
   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   share link (WhatsApp group)   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
   â”‚   PROPOSED    â”‚ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¶ â”‚  manager picks up  â”‚
   â”‚  (portal/customer support) â”‚                                  â”‚  from the link     â”‚
   â””â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”˜                                  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
           â”‚                                                      â”‚ phone call: verify
           â”‚                                        â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
           â”‚  website order (entered by manager) â”€â”€â–¶ â”‚        CONFIRMED          â”‚
           â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–ºâ”‚  only manager/customer support may set â”‚
                                                    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                                                  â”‚
   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
   â”‚  field execution, each with its own checklist:                 â”‚
   â–¼                    â–¼                  â–¼                      â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”      â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”      â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”        â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ INSPECTIONâ”‚â”€â”€â”€â”€â”€â–¶â”‚  QUOTED  â”‚â”€â”€â”€â”€â”€â–¶â”‚  SCHEDULED  â”‚â”€â”€â”€â”€â”€â”€â”€â–¶â”‚ IN PROGRESSâ”‚
â”‚  (site)   â”‚      â”‚ (priced) â”‚      â”‚ (crew+date) â”‚        â”‚ (executing)â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜      â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜      â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜        â””â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”˜
                                                                  â”‚
   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
   â–¼                    â–¼                                          â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  COMPLETED â”‚â”€â”€â”€â–¶â”‚   INVOICED    â”‚â”€â”€â”€â–¶â”‚     PAID      â”‚â”€â”€â”€â–¶â”‚  FOLLOW-UP   â”‚â”€â”€â”€â–¶â”‚ CLOSED  â”‚
â”‚ commission  â”‚    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â”‚ (customer    â”‚    â”‚ job doneâ”‚
â”‚ calculated  â”‚                                                 â”‚  support)    â”‚    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜                                                 â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”˜
Any stage BEFORE Completed â”€â”€â–º CANCELLED (manager only, reason required,
                                        customer NOT notified yet)
```
Cancellation is impossible from `Completed` onwards: resources are already spent, so
the only path is invoiced â†’ paid â†’ follow-up â†’ closed.
```

Stage set changes: **add `Proposed`, `Confirmed`, `Inspection`, `Cancelled`**
(today: `Quoted, Scheduled, In Progress, Completed, Invoiced, Paid`).

Each stage carries a seeded checklist starting with **Inspection**: templates live as
DB rows in `job_checklist_templates` (phase P3) so an admin can edit them and a job can
add its own items to any stage. Per-job rows already exist in migration 025.

### 2.1 The two follow-ups (kept deliberately separate)

| | **customer support follow-up** | **Sales follow-up** |
| --- | --- | --- |
| Subject | an **executed job** with no feedback registered | a **prospect** who has not ordered |
| Owner | **customer support only** | the **salesperson** who registered the prospect |
| Trigger | job reaches `Completed` | the prospect reaches the last pipeline stage |
| Cadence | **every 2 days** until feedback is registered | per the salesperson's own next-follow-up date |
| Ends when | feedback is registered (call logged now, form later) | the prospect converts (`Won`) or is `Lost` |
| Lives in | job lifecycle: `â€¦ Paid â†’ Follow-up â†’ closed` | prospect pipeline: `â€¦ Negotiation â†’ Follow-up â†’ Won/Lost` |
| Pipeline stage value | `follow_ups.type = 'feedback_outreach'` | `leads.stage = 'Follow-up'` |

Mechanics for the customer support loop (most of it already exists in the server):

```text
job â†’ Completed â”€â”€â–º INSERT follow_ups (type='feedback_outreach', owner_role='customer_support',
                                       due_at = completed + 2 days,
                                       follow_up_after_days = 2)
                            â”‚
        every 2 days â”€â”€â”€â”€â”€â”€â”´â”€â–º customer support sees it in "My day" (bell + toast)
                                     â”‚
                    customer support calls the client and logs the outcome
                    (interactions row: channel='call', notes, rating when given)
                                     â”‚
                    feedback row exists? â”€â”€yesâ”€â”€â–º job â†’ Follow-up â†’ closed
                                     â””â”€â”€noâ”€â”€â”€â–º requeue +2 days (never duplicates)
```

* **A job is only "closed" once feedback is registered.** Until then the order sits
  in `Follow-up`, which makes unfinished outreach visible to the manager instead of
  silently disappearing.
* No salesperson may take, reassign or complete a `feedback_outreach` row â€” the
  server rejects it (403) even if it is shown to them.
* Overdue beyond N days (default **5**) escalates: toast + push to the manager, so
  outreach never rots. `follow_ups.due_at` is the single source of truth.
* **Later (phase P12), not now:** a feedback form/tab where customer support records the rating
  and comment from the call instead of free text. The `feedback` table and the
  `feedback_requests` token links already exist, so this is UI + a small API, not a
  new model.
* **Sales follow-up is pre-order.** It exists to convert a prospect into a customer
  with a `Proposed` order, and its stage name change (`leads.stage` gains
  `'Follow-up'`) is cosmetic to the job lifecycle.

### 2.2 Assignment: lead, team, and tasks

```text
                    manager (Console) â€” only after Confirmed
   Confirmed â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–º job_assignments
                                                    â”‚ role='lead'   â† the assigned person
                                                    â”‚ role='helper' â† teammates (technicians)
                                                    â–¼
   lead opens the job in the Portal
   â”œâ”€ sees: my team, their availability that day
   â”œâ”€ can REQUEST a team change â”€â”€â–º job_team_requests â”€â”€â–º manager sees it in the Console
   â””â”€ assigns specific checklist items/tasks to other technicians
        â””â”€ job_checklist_items.assigned_to  (who is responsible)
           job_checklist_items.done_by      (who actually executed it)  â† the record
```

Rules, as decided:

| Rule | Enforcement |
| --- | --- |
| No crew on a job that is not `Confirmed` | server rejects the assignment (409) |
| Exactly one **lead** per job | unique index on `(job_id) WHERE role='lead'` |
| Only **technicians** may be crew | `job_assignments.employee_id` must resolve to a `technician`; the role CHECK on `job_assignments.role` becomes `('lead','helper')` |
| The lead requests, the manager decides | a request is a row, not an auto-apply â€” the lead cannot self-assign a teammate |
| Manager may change lead or team **at any stage** | allowed, logged to `job_events` with who/when |
| Tasks are assignable to other technicians | `job_checklist_items.assigned_to`; whoever ticks it is stored in `done_by` |
| Availability is visible while assigning | per-day load for each technician (Â§6) |

### 2.3 Assignment concerns (lead â†’ manager)

A lead who disagrees with an assignment raises it from the Portal; it appears in the
manager's Console inbox. This is the escape valve for "you gave me the wrong job".

```text
job_queries (id, job_id, raised_by, kind, body, status open|resolved,
             resolution, resolved_by, created_at, resolved_at)
```
* Kinds: `wrong_job` (wrong scope), `schedule_conflict` (availability clash), `missing_kit`,
  `safety`, `other` (decision, Â§12).
* The lead sees their own open concerns; the manager sees every open one, filters by
  job/technician, and resolves with a note. The resolution lands in the job's activity
  log, and the lead is notified (bell + toast).

---

## 3. Who may do what, and where

| Transition | Actor | App | Notes |
| --- | --- | --- | --- |
| register prospect / lead | sales | **Portal** | own pipeline; `leads.salesperson_id = me` |
| log follow-up / interaction | sales, customer support | **Portal** | existing `follow_ups`, `interactions` |
| **create PROPOSED order** | sales | **Portal** | picks services, sets site + date, customer linked |
| share proposal link | sales | **Portal** | tokenised, read-only, safe to paste in WhatsApp |
| enter website booking | manager, customer support | **Admin Console** | intake queue (Â§4) |
| **CONFIRM** (phone verification) | **manager + customer support** | manager: Console Â· support: Console | stamps `confirmed_at` + `confirmed_by`; the only way into `Confirmed`. Customer support's only order action |
| **assign the lead** (first crew) | manager | **Admin Console** | only legal while `Confirmed`; technicians only |
| **add/change the team** | manager | Admin Console | allowed at any stage; logged |
| **request a team change** | the lead | **Portal** | becomes a request the manager approves/declines (Â§2.2) |
| **assign a task to another technician** | the lead | **Portal** | `assigned_to`; `done_by` records who executed it |
| **raise a concern about an assignment** | the lead / any crew member | **Portal** | lands in the manager's Console inbox (Â§2.3) |
| Inspection â†’ Quoted | manager | Admin Console | price set at Quoted; the assigned lead runs the inspection |
| Schedule + availability-aware crew changes | manager | **Admin Console** | availability-gated (Â§6) |
| Start / progress / complete | assigned lead (crew) | **Portal** | via their own stage checklist |
| log activity / complete checklist | assigned crew | **Portal** | |
| raise invoice / take payment | manager | Admin Console | commission becomes payable here |
| **customer-support follow-up on a completed job** | **customer support only** | **Portal** | seeded at completion, requeued every 2 days (Â§2.1) |
| register feedback from the call | customer support | **Portal** | `interactions` row today; feedback form lands in P10 |
| close a job (â†’ `Closed`) | customer support | Portal | only once feedback exists |
| **cancel a job** | **manager only**, before `Completed` | Admin Console | reason required; **no customer notification yet** |
| see commission earned | sales | **Portal** | read-only, own only |
| reassign crew across jobs | manager | Admin Console | supervisors cannot (Â§11) |

**Salespeople have no Admin Console access** â€” everything they do happens in the
Portal. (This is the one place your brief and the original spec disagreed; Â§12
lists it as a decision.)

---

## 4. Intake: nothing enters the ERP unrecorded

A website booking currently has no home â€” it lives in the manager's head or a
WhatsApp message. Proposed: an **intake queue** so the gap between "booked
externally" and "entered into the system" is visible and owned.

```text
booking_receipts
  id, external_ref, channel (website|phone|whatsapp|walk_in)
  received_at, customer_name, customer_phone, customer_email
  requested_services TEXT[], site_address, requested_date, notes
  status: unentered | entered | discarded
  entered_by, entered_job_id, entered_at
```

* The manager/customer support sees "3 bookings waiting" in the Admin Console.
* Entering a booking **creates the customer (if new) and the order in one action**,
  with `source = 'website'` and `salesperson_id = NULL`.
* Only an assigned **technician** may go on `job_assignments`; the bringing-in
  salesperson rides on `jobs.salesperson_id` and is never crew.
* Discarding requires a reason; the row is kept as history.

---

## 5. Data model (migrations 026+)

| Change | Why |
| --- | --- |
| `jobs.status` += `Proposed`, `Confirmed`, `Inspection`, **`Follow-up`**, **`Closed`**, `Cancelled` | the lifecycle above; `Follow-up` is the customer-support stage, `Closed` is the terminal state (Â§2.1) |
| `jobs.closed_at` | a job is "open" until Closed; the Console lists open vs closed |
| `job_assignments.role` â†’ `('lead','helper')`, technicians only, one lead per job | Â§2.2 |
| `job_checklist_items.assigned_to` (uuid â†’ employees) | task-level responsibility: the lead can hand an item to another technician; `done_by` already records who actually executed it (Â§2.2) |
| `job_team_requests` (id, job_id, requested_by, note, status open/approved/declined, decided_by, decided_at) | the lead requests a team change; the manager decides (Â§2.2) |
| `job_queries` (id, job_id, raised_by, kind, body, status, resolution, resolved_by, â€¦) | assignment concerns from the lead to the manager (Â§2.3) |
| **role rename `csr` â†’ `customer_support`** | updates the `employees_role_check`, `invitations_role_check` and `follow_ups_owner_role_check` constraints, existing `employees.role` / `follow_ups.owner_role` rows, `ROLES`/`CAPABILITY_ROLES`/`INVITE_ROLES`/`ASSIGNMENT_ROLES`, the seeds, both front ends and the tests |
| `leads.stage` += `'Follow-up'` | the sales pipeline's last stage, before `Won`/`Lost` (current CHECK: Lead, Contacted, Quoted, Negotiation, Won, Lost) |
| `jobs.source` (`website` / `salesperson` / `admin` / `other`), `proposed_by`, `confirmed_at`, `confirmed_by`, `cancel_reason` | provenance + an auditable confirmation |
| `jobs.share_token` (uuid, unique, nullable) + `share_sent_at` | the salesperson's shareable link |
| `job_checklist_templates` (stage, label, position, service_id nullable) | templates become admin-editable data instead of code constants; per-job rows already exist (migration 025) |
| `employee_availability` (employee_id, weekday, start_minute, end_minute, active) + `employee_time_off` (employee_id, from_date, to_date, reason) | Â§6 availability |
| `employees.commission_rate` (default `0.02`) | Â§7 commission â€” flat 2% of cash per job for now, per-service tiers later |
| `commissions` (id, job_id, employee_id, basis_amount, rate, amount, status `pending`/`payable`/`paid`, payable_at, paid_at) | the ledger behind "commission is picked from that to pay them" |
| `booking_receipts` | Â§4 intake queue |

Reused as-is (no migration needed): `customers.salesperson_id`, `jobs.salesperson_id`,
`jobs.manager_id`, `leads.salesperson_id`, `follow_ups`, `interactions`, `feedback`,
`job_assignments`, `job_activities`, `job_checklist_items`.

`follow_ups.due_at` is the single source of truth for the 2-day customer-support
cadence (Â§2.1), escalating to the manager after 5 days.

---

## 6. Checklists, availability and assignment

**Checklist engine (extend what migration 025 built).**
1. Entering a stage seeds that stage's template (idempotent, never overwrites).
2. A job may add its own items to the current stage â€” the "after talking to the
   client we now know what else to check" case â€” on **any** stage including a past
   one, which is also how forgotten work gets recorded.
3. Items are ticked by assigned crew; existing rows are never clobbered.
4. **Gating.** Two ways to handle a stage whose checklist
   is not finished:

   | | **Advisory** (recommended) | **Hard** |
   | --- | --- | --- |
   | What the person sees | "3 of 5 items still open â€” move to the next stage anyway?" | the list of open items, with no way past it |
   | Server | **accepts** the transition | **rejects** it (422) until every item is ticked or individually waived |
   | Record | the skip is written to `job_events` (`checklist.skipped`) with the open items and the reason | n/a â€” nothing moves |
   | Failure mode | someone skips silently (mitigated by the log + the manager's oversight board) | a job gets **stranded** because one tick is impossible (e.g. the customer is unreachable for sign-off) |

   The trade-off in one line: advisory keeps work moving and relies on visibility;
    hard guarantees the paperwork but can freeze a live job. **Decided (see §12-11):**
    **advisory on the field stages (`Inspection`, `Follow-up`)** — where the crew is
    still executing and a logged skip (`job_events`, `checklist.skipped`) is the
    safer escape hatch — and **hard only on the terminal `Closed` transition**, where
    the checklist is the sign-off the customer is owed. Enforcement:
    * every non-`Closed` stage accepts the transition and writes a `checklist.skipped`
      record with the open items + reason;
    * `Closed` is rejected (422) until every item of the current stage's checklist
      is ticked or individually waived.

**Technician availability (new).**
```text
availability = employee_availability windows
             âˆ’ employee_time_off
             âˆ’ jobs already scheduled that day (assignments joined to jobs.date)
```
* `GET /api/technicians/availability?from&to` â€” per technician per day: free hours,
  jobs assigned, load bar. Shown in the Admin Console assign screen.
* `GET /api/jobs/:id/assignable?date` â€” the same, filtered to the day.
* Assignment refuses (or warns) when the technician is off, outside working hours,
  or already at capacity for that date.

---

## 7. Commission

Attribution, exactly as described â€” **and now fixed at 2%**:

* A customer brought in by a salesperson has `customers.salesperson_id` set (they
  registered that customer in the Portal). Website customers have it `NULL` â€” nobody
  earns commission on them.
* **Rate: 2% of the cash received, per completed job** for now
  (`employees.commission_rate` defaults to `0.02`). Basis = amount actually paid
  toward the job, so a part-paid job earns proportionally.
* **Per-service tiers come later** â€” the ledger already stores `rate` and `basis_amount`
  per row, so moving to "deep clean 2.5% / deep clean + laundry 3%" is a data change
  (`job_commission_tiers`), not a rewrite.
* At **Completed** a `commissions` row is created per attributed job in `pending`;
  it becomes `payable` when the job is **Paid** in full, and `paid` when the manager
  settles it.
* The salesperson sees, in their own Portal dashboard: earned this month, pending,
  payable, and the per-job breakdown â€” read-only; only the manager marks paid.
* Precedence when several could claim: `jobs.salesperson_id` wins, else
  `customers.salesperson_id`.

---

## 8. Cross-app communication (bell + toast + push)

One event bus, three surfaces. Every state change emits a domain event; the server
resolves recipients; each app reacts in its own idiom.

```text
  state change (any app / intake / webhook)
            â”‚
            â–¼
   dispatchEvent()  â”€â”€ creates notifications rows (employee-scoped / app-scoped)
            â”‚                + publish({type:'notification'}) over SSE /api/events
            â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
            â–¼                       â–¼                            â–¼
     bell (durable)          toast (ephemeral)            push (web-push)
   unread list, survives    appears on the event,        OS notification when the
   reload, mark-read        auto-dismiss                 app is closed
```

| Event | Bell + toast in | Push | Also |
| --- | --- | --- | --- |
| `order.proposed` (salesperson created) | manager, customer support | manager | salesperson gets confirmation when it lands |
| `order.proposed.shared` | manager | manager | link appears in the manager's queue |

---

## 9. Portal features (three roles)

| | **Sales** | **Technician** | **Customer support** |
| --- | --- | --- | --- |
| Today | leads, follow-ups, commission | assigned jobs only | leads, follow-ups, feedback |
| My day | follow-ups due today, proposals awaiting confirmation, hot leads | today's jobs as lead, next job, jobs with an open checklist, team availability, concerns to raise | bookings to confirm, feedback to chase (every 2 days), follow-ups due |
| Pipeline | own leads by stage (`Lead â†’ Contacted â†’ Quoted â†’ Negotiation â†’ Follow-up â†’ Won/Lost`), value, next action | â€” | all unassigned leads (first responder) |
| Orders | **create Proposed order**, share link, see status of own proposals | **execute**: stage checklist, activity log, costs/timesheets, photos | create orders on a client's behalf, confirm for the manager |
| Follow-up | own prospects sitting in **Follow-up** (nurture to convert) | â€” | **completed jobs awaiting feedback**, every 2 days; log the call outcome |
| Commission | earned / pending / payable + per-job | â€” | â€” |
| Customers | own customers (contact, history, value) | customers on their jobs (read-only) | all customers |

Manager is not a Portal role â€” they work in the Admin Console.

## 10. Admin Console features (manager)

* **Intake queue** â€” unentered website bookings â†’ "enter as order" in one action.
* **Confirmations** â€” Proposed orders awaiting a call, with the salesperson's note
  and a "call confirmed / no answer / declined" action; declining cancels with a
  reason so the salesperson sees it.
* **Order board** â€” every stage, filtered by stage/date/technician, with the stage
  checklist visible (read-only) so the manager can see where a job is stuck.
* **Availability-aware assignment** â€” the Dispatch/assign modal shows each
  technician's day, load and conflicts before you assign.
* **Checklist templates** â€” edit the default items per stage, and per service type.
* **Commission ledger** â€” accrued, payable, mark paid; export for payroll.
* **Follow-up oversight** â€” every `feedback_outreach` row: due, overdue, done; the
  customer support who owns it; one click to reassign to another customer support. Escalations (>5 days) land
  here and as a toast/push.
* **Invoices & payments** â€” raise, record, and see the resulting commission.
* **People & access** â€” invite codes, app scopes (existing).

## 11. Retiring laundry / storekeeper / accountant

* Portal roles become exactly `sales`, `technician`, `customer support` (plus `owner`/`manager`
  who use the Admin Console). `ROLES` in `permission-matrix.ts` keeps `laundry`,
  `storekeeper`, `accountant` for their own apps, but the **Portal pane map**
  (`components/Portal.tsx`) drops to three panes and no longer routes those roles
  into a pane.
* `job_assignments.role` is restricted to `technician` (`ASSIGNMENT_ROLES`), which
  also enforces "only technicians execute".
* Laundry and Store apps are untouched; only their employees' Portal access is
  removed. Accountant: no Portal entry (the manager handles finance in the Console).
* Existing rows are preserved â€” this is a UI/scoping change plus a data backfill of
  `app_scope`, not a deletion.

## 12. Decisions

**Settled:**

1. Unconfirmed salesperson-created order â†’ **`Proposed`** âœ”
2. Sales Admin Console access â†’ **Portal-only** âœ”
3. Commission â†’ **2% of cash received per completed job**, per-service tiers later âœ”
4. Crew â†’ **technicians only**, and the first assignee is the **lead** âœ”
5. Confirmation â†’ **manager *and* customer support** âœ”
6. Inspection â†’ **the assigned lead runs it**; there is no separate inspector âœ”
7. Cancellation â†’ **manager only, never after `Completed`, customer not notified yet** âœ”
8. Feedback escalation â†’ **5 days** âœ”
9. Job lifecycle â†’ **stays open until `Closed`** âœ”
 10. Role name → **`customer_support`** (replacing `csr`) ✓

 11. **Checklist gating** → advisory on field stages (`Inspection`, `Follow-up`), hard only on `Closed` (§6).
 12. **Concern categories** (§2.3) → adopted as proposed: `wrong_job`, `schedule_conflict`, `missing_kit`, `safety`, `other`.

<!-- Decisions #11 (checklist gating) & #12 (concern categories) are Applied (code) — see file map below. -->
**Applied (code) — decisions 11 & 12**

- **#11 Checklist gating (Recommendation 1):** advisory on field stages, *hard* on the terminal `Closed` stage.
  - Policy: `src/lib/gating.ts` — `checklistGate`, `FIELD_STAGES`, `TERMINAL_STAGES`, `GateReport`, `GateMode`.
  - UI: `src/components/Portal.tsx` — the job drawer gates the "Complete job" button (hard-disabled on terminal stages until every checklist item is ticked/waived) and offers a "Skip remaining items" link for advisory stages (the skip is logged). Checklist progress flows in from `src/components/JobChecklistPanel.tsx` via the `onChecklistReady(done, total)` callback.
  - Staff follow-up: the hard terminal gate is also enforced server-side (`POST /api/job-status` → 422), ready for the API swap but not reachable from this workspace (AGENTS.md).
- **#12 Concern categories (Recommendation 2):** `wrong_job`, `schedule_conflict`, `missing_kit`, `safety`, `other` — the 5 §2.3 categories.
  - Categories + preview store + hook: `src/lib/concerns.ts` (`CONCERN_KINDS`, `CONCERN_LABELS`, `JobConcernStatus`, `JobConcern`, `RaiseConcernInput`, `useConcerns`, localStorage I/O).
  - Lead raises: `src/components/ConcernForm.tsx` (categorized form + sonner success toast).
  - Manager inbox: `src/components/ConcernsInbox.tsx` (open concerns, newest first; manager resolves with a resolution note).
  - Bell + toast on arrival: `src/lib/bell.ts` (`concern_raised` template) + `src/components/PortalBell.tsx` (arrival dedupe + sonner toast).
  - Nav: Supervisor "Concerns" tab in `src/components/Portal.tsx` (toggles `isConcernsView` → `<ConcernsInbox/>`).
  - Staff swap: preview `job_queries` rows mirror the server schema; replacing the localStorage I/O with `GET/POST /api/job-queries` (plus the SSE `concern_raised` event) is an I/O swap, not an API-shape change.

**Still open:**

 13. **Team-change requests** — should the manager be *pushed* (bell + toast) when a lead
     raises one, or only see it in a console inbox list?
## 13. Delivery plan

| Phase | Work | Done when |
| --- | --- | --- |
| **P1 Lifecycle** | migration 026 (statuses incl. `Proposed`/`Confirmed`/`Inspection`/`Follow-up`/`Closed`/`Cancelled`, source/provenance, share token, confirm stamps, cancel rules), `order.proposed`/`order.confirmed` events, share-link page that opens the Console, confirm + close actions | a salesperson can create a proposal, share it, the manager or support can confirm it, and a job closes only after feedback |
| **P2 Roles** | rename `csr` â†’ `customer_support` (DB constraints, rows, server constants, seeds, both front ends, tests); Portal panes = sales / technician / customer support; crew restricted to technicians | each role sees only its own work; nobody non-technician can be crew |
| **P3 Lead, team & tasks** | `lead`/`helper` roles, one lead per job, assign-only-when-confirmed, manager changes anytime, `job_team_requests`, `job_checklist_items.assigned_to` | a job is crewed only once confirmed; the lead sees the team and can request changes and hand out tasks |
| **P4 Checklists** | templates into the DB, per-service templates, per-job additions on any stage, gating per Â§6 | entering a stage seeds its checklist; crew can add/tick; manager sees progress |
| **P5 Availability** | `employee_availability` / `employee_time_off`, availability + assignable endpoints, Console assign screen | manager cannot unknowingly double-book a technician |
| **P6 Commission** | `commissions` ledger at 2% of cash, Portal sales view, Console ledger | a website customer earns nobody commission; a sales-registered customer does, and the salesperson sees it |
| **P7 Intake** | `booking_receipts` + Console intake queue â†’ customer + order in one action | a website booking never lives only in a WhatsApp thread |
| **P8 Follow-up loop** | cadence 2 days from completion, `Follow-up` stage, customer-support-only guard, **5-day** manager escalation, call logging | a completed job always has an owner chasing feedback, and the manager can see it |
| **P9 Assignment concerns** | `job_queries` + lead raises in the Portal, manager inbox + resolve | "you gave me the wrong job" has a channel and a resolution trail |
| **P10 Notifications** | shared `useEventToast`, Console bell, push re-enabled, the event matrix in Â§8 | every row in that table raises bell + toast (+ push where useful) in the right app |
| **P11 Field capture** | technician timesheets/costs/photos against their jobs | a technician can log a whole job without leaving the Portal |
| **P12 Feedback form** | customer support records rating/comment from the call instead of free text | replaces the "call notes" step in Â§2.1 |

Each phase ends with the repo's own gate: server `tsc` + `npm test`, app
`tsc`, a live probe of the new endpoints, and a short note in
`docs/progress/`.
| `order.confirmed` | salesperson + assigned technicians | technicians | "you're booked" |
| `order.scheduled` (crew + date set) | assigned technicians | technicians | shows in their My Jobs |
| `order.inspected` | manager | â€” | feeds the quote |
| `order.quoted` | manager, salesperson | â€” | |
| `order.started` | manager | â€” | |
| `order.completed` | manager, salesperson | â€” | commission row created |
| `order.cancelled` | salesperson + assigned crew | crew | reason shown |
| `payment.received` | manager, salesperson | â€” | commission â†’ payable |
| `followup.due` (customer support/sales) | sales, customer support | â€” | drives the portal's due-today work |
| `followup.due` (customer support, every 2 days) | customer support | customer support | drives the customer support's "My day" |
| `followup.overdue` (>5 days, auto) | manager | manager | escalation so outreach never rots |
| `feedback.received` | manager, customer support, salesperson of the customer | customer support | customer support reviews it; the job closes (Â§2.1) |

Implementation notes:
* SSE already exists (`/api/events`, per-app token auth) and the bell already
  works in the Portal; the Admin Console needs its bell wired to the same bus.
* **Toasts** need a shared client helper: a `useEventToast()` hook that subscribes
  to SSE, maps event â†’ human message, and raises a toast (sonner) with a deep link
  to the record. The Portal's bespoke `.toast-message` is replaced by this.
* **Push** reuses `lib/push.ts` + `/api/push/subscriptions` (already present, but
  dormant in the Portal build â€” see the `virtual:pwa-register` note).
* Every notification row is employee-scoped, so the same event fans out
  differently per role without either app knowing about the other.
`jobs.manager_id`, `leads.salesperson_id`, `employees.hourly_rate`, `follow_ups`,
`interactions`, `feedback`, `job_assignments`, `job_activities`, `job_checklist_items`.
