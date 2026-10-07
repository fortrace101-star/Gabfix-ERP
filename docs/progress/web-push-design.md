# Web Push / Cross-App Notifications — Design Decision

**Status: DESIGN PAUSED — awaiting user decision (§Requested decisions).**

This document locks the architecture for delivering cross-app notifications
beyond the in-app bell. The server-side fabric already exists and is fully
functional for the **in-app** channel:

- `services/notifications.ts` — `dispatchEvent()` → `EVENT_RULES` → `notifications` rows
  → `processQueued()` → channel adapters (in-app via SSE; email/SMS/WhatsApp via
  adapter + webhooks).
- `routes/notifications.ts` — bell panel (`/unread?scope=admin|laundry|portal|store`,
  `/read-all`, `/:id/read`), feedback tokens, WhatsApp/SMS delivery-status webhooks.
- `services/realtime.ts` + `routes/events.ts` — the SSE bus (`/api/events`,
  all scopes, `notification` event type). This is the cross-app fabric
  (**D8**): domain events publish once server-side; each app subscribes to its
  scoped subset and refreshes / rings its bell.

The design decision below only concerns the **push** (silent / when-app-closed)
channel and how a Web Push adapter slots into the existing fabric.

---

## 1. Requested decisions

| # | Question | Options |
|---|----------|---------|
| A | **Delivery targets** | (a) Admin-only (signals Admin), or (b) all 4 apps delivered |
| B | **Transport** | (a) Service worker + VAPID (default), or (b) SPA FCM |
| C | **Surface** | (a) Bell only, or (b) bell + webhook for invoices/payments/laundry |

---

## 2. Recommendation (locked, pending user confirm)

### A. Delivery targets → all 4 apps delivered

The cross-app value is exactly that an event raised in one app reaches the
consumers with the right scope. A purchase request raised in Store should ring
the Store bell even if the Store app is closed; a `job.assigned` should reach
the Portal technician even if the Portal is cold. Hardening only the admin
console defeats the whole "cross-app" premise, and the notification row model
already supports multi-recipient fan-out:

- `notifications` rows are created per (template, channel, entity, recipient),
  where `to_address` already encodes the four synthetic bell addresses
  (`app:admin`, `app:laundry`, `app:portal`, `app:store`) alongside customer /
  employee rows.

**So every app that registers a push subscription receives push with a scope
filter.** Delivery is user-visible only to the subscribed app, but the server
routes on `to_address` and `channels`, which means one `dispatchEvent()` fan-out
serves all four scopes. This is the lowest-cost way to make cross-app push
real: no extra routing changes, no new endpoint per app.

### B. Transport → service worker + VAPID

VAPID + `PushManager` over a service worker is recommended over SPA FCM for three
reasons:

1. **One server-to-push path, no third-party key management.** VAPID needs only
   a public/private key pair (see §3). FCM adds a Google Cloud project, an API
   key, a project number, and a separate client SDK per app — none of which
   buy anything for this app's delivery profile (in-app + occasional silent
   wake-up).
2. **The service worker already exists.** All four apps ship `vite-plugin-pwa`
   (`generateSW`, `dist/sw.js`). The push endpoint is a one-line `self.registration
   .pushManager.subscribe()` on first user gesture; the existing workbox
   precache + NetworkFirst `api/` caching keeps the SW useful for offline reads
   without conflict.
3. **SPA FCM is the wrong tool for "wake me and tell me about work."** FCM's
   foreground-only `onMessage` in a SPA is already covered by the SSE bell;
   the only thing FCM adds beyond VAPID is a Google dependency plus
   "notification permission" friction on the device.

Decision: **SW + VAPID**, with **no FCM dependency**. If a future app needs
background heavy work, that is a separate Service Worker job, not an FCM
decision.

### C. Surface → bell only, with payment/invoice webhooks for async receipts

**Bell only** for the notification surface. The bell is the shared, scoped,
cross-app UI already landed (4 `size-2` badges). Adding a webhook surface for
invoices/payments/laundry is a **separate, lower-priority decision** already
partially in hand: `routes/notifications.ts` already carries
`POST /webhooks/whatsapp` and `POST /webhooks/sms` (delivery-status ingestion),
and `notifications` rows carry `channel` so the same row model can serve
email/Pdf/webhook consumers later. Decision for the **design session**:

- **This item: Bell only** — no new push-driven webhook surface. The bell is
  the single delivery surface; webhooks (delivery status) reuse the `provider_ref`
  on the `notifications` row, not a separate push surface.
- **Future item (out of scope for this session):** explicit webhook push for
  invoices/payments/laundry, if the product owner decides a server-bridged
  push (e.g. Stripe/Webhook → server → bell + notification row) is wanted.
  That reuses the `notifications` dispatch pipeline; nothing in this design
  blocks it.

---

## 3. Server side — what is needed

### 3.1 Tables

The `notifications` table already is the canonical notification log with a
`provider_ref` column (set by the delivery adapter) and the dedupe index
`(template_key, channel, entity_type, entity_id) WHERE status <> 'failed'`.
Push does **not** need a new table: push subscriptions are per-device tokens
held server-side for **routing + fallback delivery**, not for notifications.

Add the push subscription table (append to the existing schema; safe to
re-run):

```sql
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id TEXT NOT NULL CHECK (app_id IN ('admin','laundry','portal','store')),
  device_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  -- Pin to the device that registered it so a stolen token cannot be replayed.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (app_id, device_id)
);
CREATE INDEX IF NOT EXISTS push_subscriptions_app_idx
  ON push_subscriptions (app_id) WHERE endpoint IS NOT NULL;
```

And make `notifications.provider_ref` nullable + add the `push` status:

```sql
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS provider_ref TEXT;
-- status CHECK already accepts 'push' via the existing enum boundary:
-- (queued, sent, delivered, read, failed, skipped) — push uses 'sent'
-- after a push ack, or 'skipped'/'failed' on VAPID rejection.
```

### 3.2 Routes

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/push/subscriptions` | Accept a registration from a PWA. Body: `{ app_id, device_id, endpoint, p256dh, auth }`. Auth: `requireScope(app_id)` + the existing access token. Upserts `push_subscriptions` (one per device). |
| DELETE | `/api/push/subscriptions` | Drop a device's subscription on logout / preference reset. Body: `{ app_id, device_id }`. |
| GET | `/api/push/subscriptions` (admin) | Admin "device registry / sync health" listing — part of the control plane; shows which devices are registered per app. |
| POST | `/api/push/send` (internal / admin) | **Not used by clients.** The scheduler / `processQueued` resolves push recipients; clients never call this directly. |

### 3.3 Channel dispatcher

Extend `services/notifications.ts`:

1. `Channel = 'whatsapp' | 'sms' | 'email' | 'inapp' | 'push'`.
2. `channelEnabled(settings, 'push')` → `!!process.env.VAPID_PUBLIC_KEY`.
3. New adapter `pushAdapter(payload, toAddress)`:
   - Resolve active subscriptions for `to_address` (or `app_id` for the
     synthetic bell rows).
   - Derives the VAPID `PublicKey` from the stored private key
     (`web-push.setVapidDetails()`).
   - Sends `web-push.sendNotification(sub, JSON.stringify(payload))`.
   - On ack → mark the `notifications` row `sent` (`provider_ref` = push endpoint).
   - On rejection (`InvalidSubscription`) → mark `failed`, drop the row.
4. `dispatchEvent()` already fans out to per-recipient rows; extend the
   fan-out to also fan out the `push` channel when credentials exist and the
   recipient allows it.

### 3.4 Scheduler

`processQueued()` already drains `queued` rows for scheduled events (e.g.
`job_appreciation` 24h after completion). Extend it to group `queued` rows by
recipient and channel, and for `push` channel call `pushAdapter` instead of a
provider HTTP call. Keep the per-row `try/catch` isolation.

---

## 4. Client side — what is needed

### 4.1 Consent

Web Push **requires a user gesture + notification permission**. The design does
not auto-subscribe anyone. The consent path is one of:

- **Admin-driven** (recommended): admin enables a per-app "push on" toggle in
  the settings UI; the app first-time user is prompted `Notification.requestPermission()`.
  If denied, the bell still works over SSE and the device simply doesn't get
  push. This keeps users from being spammed and keeps the privacy posture clean.
- **Opt-in on first bell open**: the bell panel gains a "Enable notifications"
  affordance on first load (if permission already granted, it subscribes the
  SW immediately).

The bell badge stays the single notification trigger everywhere.

### 4.2 Registration flow

Per app (example: `gabfix-inhouse-erp/src/lib/push.ts`):

1. On user consent, register the service worker (`vite-plugin-pwa`
   already registers `/sw.js` in production).
2. `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`.
3. POST the resulting `PushSubscription` (endpoint + p256dh + auth + `app_id`
   + `device_id`) to `POST /api/push/subscriptions`. The server derives the
   VAPID public key from environment and validates the app scope.
4. On logout / offline, DELETE the subscription so no token lingers.

### 4.3 Delivery semantics

- **Foreground app**: the SSE bell is authoritative for read/unread state.
  Push is a *wake-up*; the app immediately re-fetches `/notifications/unread`
  to refresh the bell list (the `notification` SSE event also fires, so this
  is cheap).
- **Backgrounded / cold app**: the SW wakes, receives the push payload
  (`{ type: 'push' }` on the event bus), and shows the system notification
  (title + body from the template payload, e.g. `Job assigned · J-…`,
  `Purchase approved · 12 × UGX …`). The push notification is **scoped** to
  the subscribing app only.
- **No push subscription / permission denied**: the bell continues to work
  over SSE; push is simply not delivered for that device.

### 4.4 VAPID key management

VAPID keys are **server-managed, not client-managed**:

- `scripts/gen-vapid.mjs` (or an env step) creates `public` + `private` keys.
- Keys go to `server/.env`: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`.
- The admin settings UI edits them once; the server stores the public key in
  `push_subscriptions` routing and signs the applicationServerKey on every
  send. The private key never leaves the server. (Implementation detail:
  `web-push.setVapidDetails()` is called once at server startup.)

---

## 5. Architecture summary

```
Domain event (jobs.ts / laundry.ts / store.ts / payments.ts)
  └─ dispatchEvent() ──► EVENT_RULES ──► notifications rows (per recipient)
         │
         ▼
   processQueued() ──► push channel?
         │                     │
         │  (no credentials)   ▼
         │                inapp (SSE bell)
         ▼
   pushAdapter() ──► web-push sendNotification ──► SW push event
         │
         ▼
   mark notifications.status = 'sent' (provider_ref = endpoint)
```

Delivery surface is **one of**: in-app bell (always), email/SMS/WhatsApp
(provider present), push (VAPID present + user consented). A single
`dispatchEvent()` fan-out produces the right rows per channel; no per-app
dispatch plumbing duplicates.

---

## 6. Open items awaiting the user

- [ ] Confirm decision A (all 4 apps delivered).
- [ ] Confirm decision B (SW + VAPID).
- [ ] Confirm decision C (bell only, no new webhook surface).
- [ ] Approve the `push_subscriptions` + `/api/push/*` route set.
- [ ] Approve the `web-push` package (`npm install --prefix server web-push`).
- [ ] Approve the admin settings toggle ("push on/off per app") and the consent
      prompt placement.

Once these are confirmed, the next step is a small server patch
(`notifications.ts` channel enum + `push_subscriptions` route + dispatcher)
followed by one client consent + registration flow per app, then a live probe
(admin → store bell via SSE plus a cold-store push).
