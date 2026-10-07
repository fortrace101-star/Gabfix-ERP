# Invite codes (single-use sign-up)

Admin Console and every app shell share one sign-up primitive: **invite codes**.
An invite code is a short, single-use token issued by an Admin that grants the
new hire exactly the **role** and **app scopes** chosen at creation time.

## Why invite codes?

- **Zero open registration.** Nobody creates an account unless an Admin issues a
  code, so the surface for rogue accounts is closed by default.
- **No privilege escalation.** The app scopes granted at the Admin Console are
  the ceiling. The public sign-up flow never asks "which apps do you want?" — it
  reads the scopes off the code and enforces them server-side on first login.
- **Auditability.** Every code records `createdBy`, `createdAt`, `usedBy`,
  `usedAt`, and a `revokedAt` when an Admin revokes it before it is consumed.

## Admin side (`StaffAccessModal` + `InviteCodeList`)

`EmployeesPage → "Staff & access"` exposes:

1. **Generate account creation code** — opens a Dialog (`StaffAccessModal`) where the Admin
   picks:
   - **Role** (`manager`, `sales`, `technician`, `laundry`, `accountant`,
     `storekeeper`, `csr`).
   - **App scopes** (`admin`, `laundry`, `portal`, `store`). Only the workspace
     owner may grant `admin`; the front-office apps self-describe their own
     scopes.
   - **Expiry** in hours (1–168).
2. Pressing **Create account code** calls `POST /api/invites`
   (`apiClient.invites.create`). The resulting code is displayed once with a
   **Copy** button.
3. Below the button, `InviteCodeList` renders the **Codes** table:

   | Column    | Source (invite code row)        | Notes                                  |
   | --------- | ------------------------------- | -------------------------------------- |
   | Code      | `code`                          | `font-mono`, single-use token          |
   | Role      | `role`                          | granted role                           |
   | Apps      | `appScope` (CSV)                | granted app scopes                     |
   | Status    | derived                         | active / expired / used / revoked badge  |
   | Created   | `createdAt`                     | localised timestamp                    |
   | Used by   | `usedBy` + `usedAt`             | `—` until consumed                     |
   | Actions   | revoke / delete                 | only while unused + unrevoked          |

   Status badge tone mapping: `active → default`, `expired → outline`,
   `used → secondary`, `revoked → destructive`.

### API surface added to the admin client (`@api/invites`)

```ts
// list every code (recent first)
apiClient.invites.list(): Promise<InviteCode[]>
// issue a new code
apiClient.invites.create(payload: { role; app_scope; expiresInHours }): Promise<{ code }>
// revoke before use
apiClient.invites.revoke(code: string): Promise<void>
// delete permanently (used/revoked only)
apiClient.invites.remove(code: string): Promise<void>
```

## Consumer side (sign-up flow)

Each app shell exposes the **public sign-up** page — the Store at
`/auth/sign-up`, the Portal at `/sign-up` (TanStack file route):

1. **Validate code** — `GET /auth/invites/:code/validate` returns
   `{ valid, role, app_scope, expires_at }`. The page shows the **granted access**
   block (role + apps, read-only) and notes that the scope is fixed.
2. **Submit** — `POST /auth/sign-up` with `{ inviteCode, name, email, password }`.
   The server:
   - re-validates the code (defence in depth),
   - creates the user with _exactly_ `role` + `app_scope` from the code,
   - marks the code consumed (`usedAt`, `usedBy`),
   - returns a signed `StaffSession` (the auth token is stored the same way as
     `login`).
3. On success the user is redirected to the `from` location or `/`.

### UI contract

- The sign-up form never lets the user pick a role or app scope — those come from
  the code. The page only collects **name**, **email**, and **password**.
- Typing is forced to **uppercase** for the invite code and `autoComplete` is set
  to `one-time-code` (codes are short enough to type; not SMS-delivered).
- If the user is already authenticated, the page redirects away immediately.

## Error cases

- **Invalid / expired / already-used code** → inline error; the user can re-enter.
- **Create on the Admin side fails (e.g. scope mismatch)** → inline error in the
  Dialog, code is not consumed.
- **Server-side mismatch (code valid on validate but revoked before sign-up)** →
  sign-up rejects at `POST /auth/sign-up` with an explicit message.
