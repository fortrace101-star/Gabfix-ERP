# Dashboard Guidelines

The design standard for the AutoSchool360 Admin Dashboard, synthesized from four sources:

1. [Tableau — Tips for Designing Mobile-Friendly Dashboards](https://www.tableau.com/blog/tips-designing-dashboards-mobile-devices)
2. [Toptal — Intuitive Mobile Dashboard UI: 4 Best Practices](https://www.toptal.com/designers/dashboard-design/mobile-dashboard-ui)
3. [Medium (Seoyeon Jun) — Mastering Dashboard Design: From Good to Unmissable Data Visualizations](https://medium.com/@tjdus92422/mastering-dashboard-design-from-good-to-unmissable-data-visualizations-e3a1b5ee108a)
4. [DataCamp — Effective Dashboard Design: Principles, Best Practices, and Examples](https://www.datacamp.com/tutorial/dashboard-design-tutorial)

---

## 1. Start with Purpose (Medium, DataCamp)

Before adding anything to a page, answer:

- **Who** opens this page (vendor admin vs. delegate)?
- **Why** — what decision do they make here?
- **What** few metrics support that decision?
- **How** — monitoring at a glance, or drill-down?
- **When** — checked daily? Real-time?

**Rule:** If a widget can't be mapped to a decision, it doesn't ship. A dashboard should
answer the user's top two questions in ten seconds; otherwise it is too complex.

Dashboard archetypes (DataCamp) and how this app maps to them:

| Type | Use in this app |
|---|---|
| Tactical (daily execution) | Schools list, Codes list — progress vs. targets, actions close to data |
| Operational (live monitoring) | Wallet & Gas — big status numbers, freshness stamp |
| Analytical (deep dive) | Generate / Renew — forms and drill-down detail |

## 2. Visual Hierarchy — the Inverted Pyramid (DataCamp, Medium)

Structure every page top-to-bottom by urgency:

1. **Top — Status/KPIs** ("are we good?"): KPI strip via `.kpi-card`, headline numbers
   first. KPIs live in the top-left hot zone (Z-scanning pattern).
2. **Middle — Trends/comparisons** ("why?"): tables and cards that explain movement.
3. **Bottom — Details & actions** ("what now?"): row-level detail, contextual buttons
   (e.g. "Regenerate code" only on expired schools, "Deactivate" only on valid codes).

**Layout rules:**
- Simple grid, even gutters, aligned cards (`grid gap-2`), no broken grids.
- Group related items; separate unrelated ones with space, not lines.
- Primary KPIs at the top; supporting stats below.
- Progressive disclosure: headline first, drill-down for detail; hide rarely-used
  controls behind a clear "More"/menu.
- **Filters sit above the content** they control, with short plain labels
  (DataCamp). The codes page uses a 3-tab segmented control (All / Unused /
  Consumed) that: shows each tab's result count before you tap, keeps the applied
  state visible (`aria-selected` + filled brand chip), uses 44px+ touch targets,
  and explains an empty result instead of rendering a blank region. Filtering
  logic lives in `src/lib/kpi.ts` (`applyCodeFilter`), so the same rules power
  mobile cards and the desktop table.
- **KPI cards are actions, not just numbers.** On the codes page each KPI card is
  a button that applies its matching filter and clears any active search — the
  headline connects directly to the workflow (Medium: "direct connection between
  data and potential actions"). The Total card also reports how many rows are
  currently shown.
- **Search narrows, never hides.** A single search input filters by code text or
  school display name (case-insensitive, via `searchCodes` / `searchSchools` in
  `kpi.ts`), composes with the state filter (filter first, then search), and its
  empty state names the query so users understand what happened. Both list pages
  (Codes and Schools) follow the same pattern; the Schools search covers name,
  email, and address.
- **Persist chosen filters** across page switches and reloads
  (`localStorage`, validated on read with `parseCodeFilter` so tampered or
  unknown values fall back to `All` — never trust storage round-trips).
  Persistence is best-effort: private-mode storage failures degrade silently to
  defaults. The search query persists the same way
  (`autoschool360.codesSearch`), so a reload keeps the narrowed view.
- **Offer an escape hatch.** Whenever the view is narrowed (non-default filter
  or active search), show a one-tap **"✕ Clear filter & search"** reset button
  (`hasActiveViewState` in `kpi.ts` gates its visibility — no dead controls on
  the pristine view). DataCamp: "five precise filters beat fifteen vague
  ones" — and every applied filter must be easy to undo.

## 3. Mobile-First Responsive Design (Tableau, Toptal)

Mobile is a first-class target, not an afterthought — build it together with desktop.

- **Portrait-first, vertical scroll** (Tableau): optimize for one-column portrait
  layouts; height may grow as long as scrolling stays vertical.
- **Range/flexible sizing** (Tableau): fluid widths, never fixed pixel layouts.
- **Single code set** (Toptal): one responsive codebase, not separate mobile builds.

### Tables → Stacked Cards (Toptal)
On screens below `md` (768px), table rows collapse into **stacked, standalone cards**
(`DataCard` + `DataCardRow` components) so nothing is squished and no horizontal
scrolling is required. On `md`+ the full table renders (`hidden md:block` /
`md:hidden` pairing). Choose per-table:
- **Stacked cards** — when users read one row at a time (schools, codes).
- **Keep table w/ horizontal scroll** — only when column comparison matters.

### Navigation (Toptal)
- **Bottom navigation bar on mobile** — thumb zone, always visible, 4 primary
  destinations (Wallet / Schools / Codes / Generate) with icons.
- **Hamburger drawer** for secondary info (account details) — don't collapse
  everything into it.
- **Top bar** keeps identity/search-level functions; breadcrumbs show position.

### Touch Targets (Toptal — Apple 44pt / Android 48dp)
- Every interactive element: minimum **44×44px** hit area (`.btn-*` all enforce
  `min-h-[44px]`; icon-only buttons also get `.tap-target`).
- Buttons too small to fit side-by-side → collapse into a menu, or stack vertically;
  never just shrink spacing.
- **Kebab/menu pattern** for secondary actions on list rows when space is tight.

### No Hover-Only Interactions (Toptal)
There is no cursor on mobile:
- Tooltips/hover reveals must also work on **tap** or be removed.
- Chart/data hints: use tap-to-reveal with a visible instruction ("Tap to see data").
- `title` attributes may exist for desktop but are never the only affordance.

## 4. Interactive States (Toptal)

Every action gives clear, predictable feedback:

- **Loading** — buttons show progress ("Requesting…", "Generating…", spinner) and are
  disabled while busy. Route-level loading uses a skeleton (`PageSkeleton` in
  `App.tsx`) that matches the KPI card rhythm — never a blank screen.
- **Disabled** — grayed-out with a reason (missing wallet, no selection).
- **Success** — explicit confirmation (`.alert-ok`, "Copied ✓", "Funds sent ✓").
- **Error** — recoverable message (`.alert-danger` / `.alert-warn`), not a dead end.
- **Enabled affordance** — hover/focus styles preserved on desktop
  (`:focus-visible` ring for keyboard users).

## 5. Data Hygiene & Freshness (DataCamp)

- **"Last updated" stamp** on every data view (`LastUpdated` component /
  "Updated hh:mm:ss"), plus a manual Refresh control.
- **Single source of truth** — all numbers read from the governed on-chain contracts;
  never compute the same metric two different ways.
- **Real-time updates** — WebSocket contract events trigger re-fetch so the stamp
  stays honest.
- **Units and precision** — always label units (ETH, days, hours); round to useful
  precision (`formatEth`, `formatDuration`).
- **Ratios for at-a-glance comparison** — KPI cards show a percentage hint
  (`pct()` helper: "{n}% of schools" / "{n}% of all codes") so scales are
  comparable without mental math (Medium: "converting metrics to ratios").

## 6. Color, Contrast & Accessibility (DataCamp)

Color is a **signal, not decoration**:

- One token system (see `tailwind.config.js` / `src/index.css`):
  - `brand` (indigo) — primary actions, active nav.
  - `ok` (green) / `warn` (amber) / `danger` (red) / `neutral` (slate) — reserved
    status meanings only.
  - `ink-*` text tokens, `surface-*` background tokens.
- **Status needs a second cue** — never color alone: StatusBadge always pairs the
  color with a text label ("Active", "Grace period", "Expired"); count KPIs use
  colored text + label, not just color.
- **Accessible contrast** — text tokens are pre-verified against surfaces; test
  dark theme (the only theme) early.
- **Focus visibility** — global `:focus-visible` ring on all interactive elements.

## 7. Consistency & Low Cognitive Load (DataCamp)

- **One component set** — all pages use shared classes: `.btn-brand`,
  `.btn-neutral`, `.btn-outline`, `.card`, `.kpi-card`, `.alert-*`, `.badge-*`,
  `.field-label`/`.field-input`, `.table-*`. Pages must not hard-code raw colors
  (slate/indigo Tailwind literals are legacy — use tokens).
- **Fixed roles for type**: page titles `text-lg/xl font-semibold/bold`;
  labels `text-xs` with `ink-secondary`; data `code-mono` for addresses/hashes.
- **Stable interaction patterns** — filters and refresh always in the same place;
  navigation never moves between tabs.
- **Trim non-data ink** — short labels, rounded numbers, no decorative gridlines.

## 8. Metrics That Drive Action (Medium)

Prioritize metrics by what they let the user *do*:

- **Actionable metrics** — leading indicators tied to actions (valid codes waiting
  for hand-off, expiring licenses).
- **Relative metrics** — change over time (remaining time vs. expiry).
- **Proportional metrics** — share of whole (active vs. grace vs. expired counts).
- **Ratios for comparison** — when scales differ, normalize (counts → percentages).

Every data section connects to its action: expired school → "Regenerate code";
valid code → "Share" / "Deactivate"; no gas → "Request gas".

## 9. Narrative Arc (DataCamp)

Each page reads like a short story — **What changed? → Why? → What do we do now?**

1. Headline numbers (KPI strip).
2. Detail rows explaining the headline (cards/table).
3. Contextual action per row (footer buttons).

## 10. Anti-Patterns to Avoid (DataCamp, Medium)

- ❌ Data dumps — more widgets than decisions.
- ❌ Many-slice pie charts (use sorted bars instead).
- ❌ Dual-axis charts (fake correlations; split vertically instead).
- ❌ Numbers without context (no units, no timestamp, no comparison).
- ❌ Hover-only tooltips on mobile.
- ❌ Tables squished onto small screens (horizontal scroll fatigue).
- ❌ Buried primary actions / tiny touch targets.
- ❌ Color as the only status cue.
- ❌ Duplicating the same metric in multiple widgets.
- ❌ Hiding everything behind a hamburger menu.

## 11. Review Loop (DataCamp)

- Task-test with real users: "show me the expired schools", "generate a code for
  school X".
- Fix decision-blockers first: unclear labels, missing comparisons, slow loads.
- Keep a changelog; schedule light monthly reviews (top 3 pain points, top 3 wins).

---

## Component Quick Reference

| Need | Use |
|---|---|
| Headline number | `.kpi-card` + `.kpi-label`/`.kpi-value` |
| Status pill | `StatusBadge` (or `.badge-ok/.badge-warn/.badge-danger/.badge-neutral`) |
| Mobile data row | `DataCard` + `DataCardRow` (pairs with `hidden md:block` table) |
| Freshness | `LastUpdated` (stamp + Refresh button) |
| Primary action | `.btn-brand` (min 44px tall, full-width on mobile) |
| Secondary action | `.btn-outline` / `.btn-neutral` |
| Form fields | `.field-label` + `.field-input` |
| Alerts/feedback | `.alert-ok` / `.alert-warn` / `.alert-danger` |
| Copy/share with feedback | `CopyButton` / `ShareButton` |
| Icon-only control | `.tap-target` (44×44 min) |

## Applied Changes in This Codebase

- `src/App.tsx` — added mobile bottom navigation (thumb zone) with icons and
  `aria-current`; 44px+ targets on hamburger/close; `pb-24` so content clears the
  fixed nav.
- `src/index.css` — `.btn-*` now enforce `min-h-[44px]`; added `.tap-target`,
  `.kpi-card/.kpi-label/.kpi-value/.kpi-hint`; global `:focus-visible` ring.
- `src/pages/SchoolsPage.tsx` — KPI strip (Total/Active/Grace/Expired), freshness
  stamp, mobile stacked cards + desktop table.
- `src/pages/CodesPage.tsx` — KPI strip (Total/Valid/Consumed), freshness stamp,
  9-column table becomes stacked cards below `md`, 44px deactivation flow.
- `src/pages/WalletPage.tsx` — token-based styling, KPI hierarchy, full-width mobile
  CTAs, freshness stamp.
- `src/pages/GenerateCodePage.tsx` — token-based styling, mobile stacked school
  cards, full-width generate button, `inputMode="numeric"`.
- `src/components/DataCard.tsx`, `src/components/LastUpdated.tsx` — new shared
  mobile-card and freshness components.
- `src/components/CopyShareButtons.tsx` — `ShareButton` accepts `style` for
  token-based theming.
- `vite.config.ts` — `manualChunks` splits viem, Privy, and React vendors into
  parallel-loading, independently cached chunks (was one 2.6 MB bundle).
- `src/App.tsx` — pages are `lazy()`-loaded behind `Suspense` with a KPI-rhythm
  `PageSkeleton` fallback, so the login screen paints before the web3 bundle
  arrives (perceived performance; interactive states guideline).
- `src/pages/SchoolsPage.tsx`, `src/pages/CodesPage.tsx` — KPI cards gained
  percentage-ratio hints (`pct()` helper) for at-a-glance comparison.
- `src/lib/kpi.ts` — shared, unit-tested metric helpers (`pct`,
  `schoolStatusCounts`, `codeStateCounts`, `applyCodeFilter`); single source of
  truth for KPI math and the codes filter.
- `src/lib/kpi.test.ts` + `npm test` — vitest suite covering the KPI helpers,
  every filter branch (`All` / `Unused` / `Consumed`), filter validation
  (`parseCodeFilter`), and search behavior (`searchCodes`: code text, school
  name, whitespace, composition with the filter).
- `src/pages/CodesPage.tsx` — KPI cards became clickable filter shortcuts (with
  `{shownCount} shown` on the Total card); added the code/school search input;
  filter choice persists via `localStorage`
  (`autoschool360.codesFilter`) with safe parsing on read; search query also
  persists (`autoschool360.codesSearch`); **"✕ Clear filter & search"** reset
  button appears only when the view is narrowed (`hasActiveViewState`).
- `src/pages/SchoolsPage.tsx` — added the same persistent search
  (`autoschool360.schoolsSearch`) over name/email/address with a
  **"✕ Clear search"** escape hatch on the empty state.
- `src/lib/faucet.ts` — **bug fix:** the signed gas-request message now uses the
  all-lowercase address. The faucet server lowercases `instanceAddress` and does
  a case-sensitive `message.includes(addr)` check, so the EIP-55 checksummed
  address Privy returns triggered "Message does not reference the supplied
  instanceAddress."
