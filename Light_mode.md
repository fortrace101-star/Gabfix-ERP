# AutoTable — Unified Light Mode Guide

> **Consolidates:** the link list in `dark-mode-light-mode-guide.md`, together with the
> existing in-repo drafts `light-mode-theme.md`, `theme_file.md` and `THEME.md`.
> **Scope:** the WinUI 3 (Windows App SDK) desktop app `AutoTable`, theming in
> `Resources/DesignTokens.xaml` + `Services/ThemeService.cs`.
>
> **Status:** **Phases L0–L3 implemented; L4 outstanding.** See
> [§11 Implementation status](#11-implementation-status).
>
> **Companion docs:** [`Dark_mode.md`](Dark_mode.md) (the dark counterpart),
> [`erp_design.md`](erp_design.md) (typography/layout/density).

---

## 1. Sources and how they were used

| # | Source | What it contributed |
|---|--------|---------------------|
| S1 | [Muzli — Dark Mode Design Systems](https://muz.li/blog/dark-mode-design-systems-a-complete-guide-to-patterns-tokens-and-hierarchy/) | Surface-elevation ladder, semantic token naming, per-theme accent mapping, WCAG AA applies to **both** modes, off-white text (not `#FFFFFF`), no pure black backgrounds |
| S2 | [Accessibility First — Dark and Light Mode: A Simple Guide](https://www.accessibilityfirst.at/posts/dark-and-light-mode-a-simple-guide-for-web-design-and-development) | Use `#121212`/`#F5F5F5` rather than pure black/white, honour the OS preference, persist the user's choice, avoid brand-colour conflicts, adaptive media |
| S3 | [Vince Arizala — Dark Mode Design Patterns That Actually Work](https://www.vincearizala.com/articles/dark-mode-design-patterns) | Surface stack (`base → raised → overlay → inset → border`), inset inputs, visible focus rings, chart gridline/label overrides, don't half-build a toggle, light-first is a legitimate choice |
| S4 | [Orizon — Dark Mode vs Light Mode UX Best Practices](https://www.orizon.co/blog/dark-mode-vs-light-mode-ux-best-practices-tokens-toggles-and-accessibility) | Toggle placement, token-driven theming, accessibility as the primary reason for offering both modes; **visual/colour-layout reference for this redesign** (the article's light-mode hero image: cool near-white page, white cards, one saturated accent, generous whitespace) |
| S5 | [FourZeroThree — Scalable, Accessible Dark Mode](https://www.fourzerothree.in/p/scalable-accessible-dark-mode) | Scalable token architecture (source unavailable at fetch time — guidelines below are carried from the in-repo draft of this guide) |
| The rest of the link list | Altersquare, LinkedIn/Graf, Noqode, Sayhello, UX Collective, PPT Pasta | Branding/perception arguments referenced qualitatively only (several were unreachable at fetch time; see §10) |

> **Note on fidelity:** S1–S4 were read in full. S5 and the remaining list entries were
> unreachable (DNS/timeout) during this pass; their contributions are limited to points
> already corroborated by S1–S4, so no guideline in §2 rests on an unread source.

### 1.1 Consolidated principles (light mode)

**P1 — Light mode is a designed mode, not "the absence of dark."**
Light-first is a legitimate product decision (S3). AutoTable is currently *light-by-default
but dark-chromed*, which is the worst of both: neither mode is intentional.

**P2 — Both modes are first-class and share one semantic token contract.**
Components reference roles (`surface-raised`, `text-primary`), never hex values (S1, S3).
Switching modes must change *zero* component files.

**P3 — WCAG AA (4.5:1 normal text, 3:1 large text/UI) applies to light mode, always.**
Contrast is computed identically in both modes; there is no "light mode discount" (S1).
Muted/caption text is the usual offender.

**P4 — Never pure white on pure black, never pure black on pure white for sustained reading.**
Use off-white surfaces and off-black text; `#F5F5F5` page / `#FFFFFF` card / `#2D2D2D` text
is the recommended light ladder (S2, S1).

**P5 — Colour is functional, not decorative.**
Reserve saturated colour for status and primary actions; keep the base palette
low-saturation grays plus one brand accent (S3, S4, and `erp-design-system.md` §6).

**P6 — In light mode, separation comes from hairlines and soft elevation, not shadows.**
1px borders remain essential on white; shadows must be very low-alpha and never pure black,
or they read as dirty (S1, S3).

**P7 — System preference is an accessibility signal, and a manual toggle must be honest.**
Honour the OS by default, allow an override, persist it, and make sure the toggle reflects
the *actual* current state on launch (S2, S3, S4).

**P8 — Print/paper surfaces are not theme surfaces.**
Documents intended to be printed stay white-on-navy regardless of app theme (S3: media
needs its own treatment; corroborated by the in-repo decision D2 in `light-mode-theme.md`).

**P9 — Every interactive state is theme-aware.**
Normal, hover, pressed, focused, selected, disabled, validation, empty, loading, error (S3).

**P10 — No flash of the wrong theme, and no silent fallback.**
Every key consumed by a view must exist in *all* theme dictionaries, or WinUI silently
falls back and the mismatch only shows up in one mode (S1).

---

## 2. Product decisions for AutoTable

| ID | Decision | Rationale |
|----|----------|-----------|
| **LD1** | **The Light sidebar becomes light** (true light mode). Recommended: white rail `#FFFFFF` with `#E5E7EB` divider, hover `#F2F4F7`, active pill using the brand blue. | P1. Today `Default` and `Light` both hard-code a dark navy `#1E1E1E` sidebar, so "light mode" never actually appears. |
| **LD2** | **Option A escape hatch** — ship the token refactor for content areas first while the navy rail stays, then flip the rail (see §8 phases). | P7/P1: lets us de-risk the token work before the visible change. |
| **LD3** | **Print surfaces stay hard-coded light** (`ReportCardSheetView`, `MidTermSlipView`, `Reports/ReportCards/*`). | P8. Only the *hosting preview page* is themed. |
| **LD4** | **Auth/hero panels stay brand-navy in both modes**, via a new constant `LoginHeroColor` instead of the over-loaded `NavyDarkBrush`. | P10. `NavyDarkBrush` currently aliases `SidebarColor`; under LD1 that would turn the login hero white and its white text invisible. Five views are affected. |
| **LD5** | **Theme choice persists** across launches; OS-Default is honoured when no explicit choice was made. | P7. |
| **LD6** | **`Default` is treated as Light and kept byte-identical to `Light`**, generated by a build/script step rather than hand-copied. | P10. Today they are hand-maintained duplicates → drift. |

---

## 3. Target light token set

Baseline is the current `Light` dictionary (surfaces/accents are already reasonable);
the changes are the sidebar, the two low-contrast text tokens, and the new hero token.

### 3.1 Core surfaces & text

| Token | Current | **Target** | Why |
|-------|---------|-----------|-----|
| `BackgroundColor` | `#F5F5F5` | `#F5F5F5` ✓ | P4 |
| `SurfaceWhiteColor` | `#FFFFFF` | `#FFFFFF` ✓ | cards |
| `SurfaceGrayColor` | `#F5F5F5` | `#F5F5F5` ✓ | page |
| `SurfaceGray2Color` | `#EEEEEE` | `#EEEEEE` ✓ | table header band |
| `SurfaceElevatedColor` | `#FFFFFF` | `#FFFFFF` ✓ | flyouts |
| `SurfaceSunkenColor` | `#E9E9E9` | `#E9E9E9` ✓ | inset wells |
| `TextPrimaryColor` | `#2D2D2D` | `#2D2D2D` ✓ | ≈13:1 on white |
| `TextSecondaryColor` | `#666666` | **`#5A5A5A`** | ≈5.7:1 → comfortable AA margin for body/labels |
| `TextMutedColor` | `#9E9E9E` | **`#6B7280`** | `#9E9E9E` ≈ **2.7:1 → fails AA**; `#6B7280` ≈ 4.6:1 |
| `TextDisabledColor` | `#BDBDBD` | `#BDBDBD` ✓ | disabled text exempt from AA |
| `TextOnAccentColor` | `#FFFFFF` | `#FFFFFF` ✓ | on solid blue/green/red |
| `TextOnDarkColor` | `#FFFFFF` | `#FFFFFF` ✓ | hero + print only |
| `TextOnDarkMutedColor` | `#CCCCCC` | `#CCCCCC` ✓ | hero subtitle |
| **`LoginHeroColor`** *(new)* | — | **`#1E293B`** | P10 / LD4 — decouple hero from the sidebar token |

### 3.2 Sidebar tokens (the LD1 change)

| Token | Current (Light) | **Target (Light)** |
|-------|-----------------|--------------------|
| `SidebarColor` | `#1E1E1E` | **`#FFFFFF`** |
| `SidebarHoverColor` | `#2A2A2A` | **`#F2F4F7`** |
| `SidebarActiveColor` | `#383838` | **`#E3F2FD`** (soft pill) or `#2196F3` (solid) |
| `SidebarBorderColor` | `#2A2A2A` | **`#E5E7EB`** |
| **`SidebarTextColor`** *(new)* | — | **`#1F2933`** |
| **`SidebarTextMutedColor`** *(new)* | — | **`#6B7280`** |

New brushes in the `Light`/`Default` dictionaries: `SidebarTextBrush`, `SidebarTextMutedBrush`,
`LoginHeroBrush`. Keep `NavySidebarBrush` / `NavyDarkBrush` / `NavyActiveBrush` aliases
resolving (they currently alias `SidebarColor`/`SidebarHoverColor`) so nothing breaks — but
**re-point the five auth panels at `LoginHeroBrush`** (LD4).

> **Pick one active-pill convention and encode it once:**
> *soft* `#E3F2FD` pill → keep `SidebarTextBrush` foreground (recommended; reads calmer and
> matches the ERP accent-subtle palette), **or** *solid* `#2196F3` pill → foreground must be
> `TextOnAccentBrush`. Do not mix.

### 3.3 Accent used as *text* (P3 fix)

The shared accent palette stays, but calling out the one real failure:

| Use | Colour | On white | Verdict |
|-----|--------|----------|---------|
| `PrimaryBlueBrush` `#2196F3` as **text/icon** | `#2196F3` | ≈ **3.1:1** | ✗ fails AA for normal text |
| Primary blue as **fill** (button/badge bg) | `#2196F3` | — | ✓ fine (UI component contrast ≥3:1) |
| Recommended **accent-text** token | **`#1976D2`** | ≈ 4.6:1 | ✓ passes AA |

→ Add `LinkTextColor` / `LinkTextBrush` (= `BlueHoverColor` `#1976D2`) and use it wherever
blue is *text or an icon on a light surface* (e.g. `GhostButtonStyle` foreground today,
the "Take Tour" label, link cells).

---

## 4. Compliance audit — current app vs the principles

Evidence is from the current tree (branch `sql_rec`). `✔` = compliant, `▲` = partial, `✘` = gap.

| Principle | Status | Evidence |
|-----------|--------|----------|
| **P1** Light is a designed mode | ✘ | `Resources/DesignTokens.xaml`: `Default` and `Light` are near-identical clones; both set `SidebarColor` `#1E1E1E`. The app therefore reads dark-chromed even in "Light". Only the header `ToggleSwitch` (`Views/ShellView.xaml`, `ThemeToggle`) can switch — and it lands on the same dark rail. |
| **P2** One semantic token contract | ▲ | Strong overall: semantic brushes exist for most roles and views mostly use `{ThemeResource …}`. But there are **leaks**: `Views/ShellView.xaml.cs` `SetActiveButton` sets `new SolidColorBrush(Colors.White)` and reads `TextOnDarkBrush`; `SchoolSettingsView.xaml` hard-codes `#F8F8F8` (L107) and `#F0F9FF` (L204, L423); `Views/Controls/UserTourOverlay.xaml` hard-codes `#66000000` (L21) and `#4D2979FF` (L32); `Converters/FormatConverters.cs` `StatusColorConverter` hard-codes `#27AE60/#2980B9/#E74C3C/#F39C12/#9E9E9E`; `Resources/DesignTokens.xaml` `DangerHoverBrush` = `#2EF44336`. |
| **P3** WCAG AA in light mode | ✘ | `TextMutedColor` `#9E9E9E` on white ≈ **2.7:1** — fails AA for body text; `MutedTextStyle` is wired to `TextSecondaryBrush` `#666666` (≈5.7:1, passes) so the *style* is fine but the *token* `TextMutedBrush` is used by table meta and grade fallbacks (`GradeColorConverter` default) → fails there. `PrimaryBlueBrush` used as text ≈ 3.1:1 — fails. |
| **P4** Off-white / off-black, no extremes | ✔ | `#F5F5F5` page, `#FFFFFF` card, `#2D2D2D` text. Already aligned. |
| **P5** Colour is functional | ▲ | Status badges (`BadgeSuccessStyle`, `BadgeWarningStyle`, `BadgeDangerStyle`, `BadgeInfoStyle`, `BadgeNeutralStyle`) exist ✔, but `FeeCollectionView.xaml.cs` colours balance *text* (via `BalanceColorConverter`) instead of using a badge, and KPI accent colours are passed as raw strings from `ViewModels/DashboardViewModel.cs` (`#007BFF`, `#28A745`, `#FD7E14`, `#20C997`) rather than tokens. |
| **P6** Separation via borders on light | ✔ | `CardBorderStyle`, `TableCardStyle`, `FilterBarStyle` all use a 1px `BorderLightBrush`; `CardShadowColor` `#0A000000` is soft, not pure black. |
| **P7** Honest toggle + persistence | ✘ | `Services/ThemeService.cs` has **no persistence at all**; `App.xaml.cs` (~L235) calls only `ThemeService.Initialize(_window)`. There is no `ApplySavedTheme()`, and `Views/ShellView.xaml` `ThemeToggle` has no initial-state sync, so after a restart the switch can disagree with the rendered theme. The toggle also lives only in the shell — the auth views have none. |
| **P8** Print surfaces stay paper-white | ✔ | `Views/Controls/ReportCardSheetView.xaml` (`#1F3864`, `#E8EDF7`, `#C9D3E6`), `Views/Controls/MidTermSlipView.xaml` (`#2E86C1`, `#D4E6F1`) and `Reports/ReportCards/*` are deliberately theme-independent. Correct — only the hosting chrome should be themed. |
| **P9** All interactive states theme-aware | ▲ | Hover/pressed/selected/disabled tokens all exist in Light *and* Dark ✔. Focus is only partially covered (`FocusBorderColor` `#1976D2` exists but styles such as `PrimaryButtonStyle`/`SecondaryButtonStyle` don't declare a `Focused` visual state). |
| **P10** No silent fallback / no wrong-theme flash | ✘ | `Default` is a hand-copied duplicate of `Light` → guaranteed drift. `ShellView.GetThemeBrush` and `ThemeResourceHelper.GetCurrentThemeKey` both map "not Dark → Light", which is *correct* only while the clone stays in sync. New keys added to `Light` (e.g. `SidebarTextColor`) must also be added to `Default` or OS-Default sessions render wrong. |

### 4.1 Additional light-specific gaps

| # | Gap | Where |
|---|-----|-------|
| L1 | Five auth/hero panels are coupled to the sidebar token (`NavyDarkBrush`) and would go white under LD1, hiding white text on them. | `Views/LoginView.xaml` L18, `SignUpView.xaml` L17, `AdminRegistrationView.xaml` L18, `SchoolInfoEntryView.xaml` L16, `DataEntrantRegistrationView.xaml` L18 |
| L2 | Nav icon + label foreground is `TextOnDarkBrush` (`#FFFFFF`) — invisible on a light rail. | `Views/ShellView.xaml` (every `Nav*` button), `SidebarItemTextStyle` in `Resources/DesignTokens.xaml`, `SetActiveButton` in `ShellView.xaml.cs` |
| L3 | Section labels (`PERFORMANCE`, `ADMINISTRATION`, `FINANCIALS`) and the logo subtitle use `TextOnDarkMutedBrush`. | `Views/ShellView.xaml` |
| L4 | `SchoolSettingsView` uses a hard-coded `#F8F8F8` pill and `#F0F9FF` info panels → these do not move with the theme. | `Views/SchoolSettingsView.xaml` L107, L204, L423 |
| L5 | Code-behind-created UI (chips in `ClassesView`, toast/hints in `FeeCollectionView`, `ReportCardsView` L902) uses `Colors.White`/`Colors.Black` directly, so it won't follow a theme switch. | `Views/ClassesView.xaml.cs`, `FeeCollectionView.xaml.cs`, `ReportCardsView.xaml.cs` |
| L6 | Accent-as-text uses the fill blue (`#2196F3`), failing AA. | `DesignTokens.xaml` `GhostButtonStyle`; `ShellView.xaml` "Take Tour" label |

---

## 5. What "done" looks like (light)

`Light mode` renders as a genuinely light application:

```
┌──────────────────────────────────────────────────────────────┐
│ Sidebar  #FFFFFF rail, #E5E7EB divider                       │
│  • brand header on white, dark text                          │
│  • nav items #1F2933, hover #F2F4F7, active #E3F2FD pill     │
├──────────────────────────────────────────────────────────────┤
│ Header   #FFFFFF, 1px #DDDDDD bottom border                  │
│ Content  page #F5F5F5 · cards #FFFFFF · 1px #DDDDDD borders  │
│ Tables   header band #EEEEEE · zebra #FAFAFA · selected #E3F2FD │
└──────────────────────────────────────────────────────────────┘
     Auth/hero panels: constant #1E293B, white text (unchanged)
     Print sheets: unchanged paper-white documents
```

---

## 6. Accessibility acceptance criteria (light)

| Check | Requirement |
|-------|-------------|
| Body/secondary text | ≥ 4.5:1 on its actual surface |
| Captions/meta (`TextMutedBrush`) | ≥ 4.5:1 on white and on `#F5F5F5` |
| Accent text/links | ≥ 4.5:1 (→ use `#1976D2`, not `#2196F3`) |
| Large text / icons / borders of controls | ≥ 3:1 |
| Focus ring | Always visible, ≥ 3:1 against *both* the control and the page, never colour-only |
| Disabled | Distinguishable from enabled without relying on colour alone (opacity + cursor/state) |
| Status | Never colour-only — pair the badge with a label/icon |

---

## 7. Files in scope

| File | Change |
|------|--------|
| `Resources/DesignTokens.xaml` | Light/Default: sidebar → light, new `SidebarText*` + `LoginHeroColor` + `LoginHeroBrush` + link-text token, `TextSecondary`/`TextMuted` contrast fix, `SidebarItemTextStyle` foreground |
| `Services/ThemeService.cs` | Persistence (`ApplySavedTheme`, save inside `SetTheme`) |
| `App.xaml.cs` | Call `ApplySavedTheme()` after `Initialize` (~L235) |
| `Views/ShellView.xaml` | Nav icon/label → `SidebarTextBrush`; module labels + logo subtitle → `SidebarTextMutedBrush`; logotype colours |
| `Views/ShellView.xaml.cs` | `SetActiveButton` reset/active foreground → `SidebarTextBrush`; remove `Colors.White` border literal; sync `ThemeToggle.IsOn` on load |
| `Views/LoginView.xaml`, `SignUpView.xaml`, `AdminRegistrationView.xaml`, `SchoolInfoEntryView.xaml`, `DataEntrantRegistrationView.xaml` | Hero background `NavyDarkBrush` → `LoginHeroBrush` |
| `Views/SchoolSettingsView.xaml` | `#F8F8F8`/`#F0F9FF` → theme tokens |
| `Views/Controls/UserTourOverlay.xaml` | `#66000000` → `ScrimBrush`; `#4D2979FF` → accent token |
| `Views/ClassesView.xaml.cs`, `Views/FeeCollectionView.xaml.cs`, `Views/ReportCardsView.xaml.cs` | Replace `Colors.White/Black` in code-built UI with `ThemeResourceHelper.GetThemeBrush(...)` |
| `Converters/FormatConverters.cs` | `StatusColorConverter` → theme-resolved brushes |

---

## 8. Implementation plan

### Phase L0 — Token foundation (no visible change)
1. Refactor `Resources/DesignTokens.xaml` so `Light` is the single authored source and
   `Default` is generated from it (script) — kills the drift risk (P10/LD6).
2. Fix `TextSecondaryColor` → `#5A5A5A`, `TextMutedColor` → `#6B7280` in `Light`.
3. Add `LoginHeroColor`/`LoginHeroBrush`, `SidebarTextColor`/`SidebarTextMutedColor`
   (+ brushes), and a link-text token `#1976D2` to `Light` **and** `Default`.
4. Re-point the five auth/hero panels to `LoginHeroBrush` (still navy → no visual change).
5. **Verify:** build + walk every page in Light and OS-Default; nothing should look different yet.

### Phase L1 — The actual light sidebar
6. Flip the `Light`/`Default` `Sidebar*` tokens per §3.2 and pick the active-pill convention.
7. `SidebarItemTextStyle` → `SidebarTextBrush`; update `ShellView.xaml` nav icons/labels,
   the three module section labels, logo title/subtitle.
8. `ShellView.xaml.cs` `SetActiveButton`: reset + active foreground → `SidebarTextBrush`
   (or `TextOnAccentBrush` for a solid pill); drop the `Colors.White` border literal.
9. **Verify:** dashboard, every module, modals, and the three window widths from `Table.md §8`.

### Phase L2 — Honest toggle & persistence
10. `ThemeService`: add `ApplySavedTheme()` + save in `SetTheme` via
    `Windows.Storage.ApplicationData.Current.LocalSettings`.
11. `App.xaml.cs`: call `ApplySavedTheme()` right after `ThemeService.Initialize(_window)`.
12. `ShellView`: set `ThemeToggle.IsOn` from the live theme on load so the switch never lies.
13. **Verify:** choose Light → restart → still Light, toggle correct; delete the setting → OS wins.

### Phase L3 — Hardcoded-colour cleanup
14. Sweep the leaks in §4 (P2 row) and §4.1 L4–L6. Use `ThemeResourceHelper.GetThemeBrush`
    in code-behind rather than `Colors.*`.
15. **Verify:** grep the tree for `#`-literals outside `DesignTokens.xaml` and confirm every
    remaining one is either a print surface (P8) or a translucent scrim.

### Phase L4 — Contrast & polish
16. Add explicit `Focused` visual states to `PrimaryButtonStyle`, `SecondaryButtonStyle`,
    `GhostButtonStyle`, `IconButtonStyle`, `ComboBoxStyle`, `SearchBoxStyle`.
17. Switch blue-as-text to the `#1976D2` link token; keep `#2196F3` for fills.
18. Soften card elevation if any shadows were introduced (`#0F000000`–`#26000000`, never pure black).
19. **Verify:** run the §6 table against every page; run the automated contrast check.

### Regression gate (every phase)
- `dotnet build AutoTable.csproj -p:Platform=x64` → 0 errors/warnings introduced.
- Integration tests in `Tests/AutoTable.IntegrationTests` pass.
- Toggling Light → Dark → Light leaves **no** stale brush on any page (widgets, dialogs, tables).

---

## 9. Acceptance checklist

- [ ] Sidebar is white, content `#F5F5F5`/`#FFFFFF`, footer white — in Light **and** OS-Default.
- [ ] Nav icons/labels legible on the light rail; active item unmistakable.
- [ ] Header, search, term selector, notifications render correctly on white.
- [ ] KPI cards, tables, filters, charts, modals all readable at `#2D2D2D`/`#5A5A5A`.
- [ ] `TextMutedBrush` captions pass AA on `#FFFFFF` and `#F5F5F5`.
- [ ] Accent text uses `#1976D2`; accent fills keep `#2196F3`.
- [ ] Print sheets unchanged (report card, mid-term slip).
- [ ] Auth hero panels stay navy/legible; auth card white.
- [ ] Dark mode still toggles back perfectly (regression).
- [ ] Persisted theme survives restart; toggle reflects the true state.
- [ ] No `#1E1E1E`/`#121212`/`#FFFFFF` literal leaks into a light surface.
- [ ] `Light` and `Default` dictionaries are generated from one source (no drift).

---

## 10. Open items / risks

| # | Item | Note |
|---|------|------|
| R1 | Several source links in `dark-mode-light-mode-guide.md` were unreachable during this pass (Orizon, FourZeroThree, Sayhello, LinkedIn, Medium). | Guidelines in §2 do not depend on them. Re-fetch on request if we want their colour/layout details folded in. |
| R2 | `Default` cannot `BasedOn` a whole dictionary in XAML. | Hence the generate-`Default`-from-`Light` script rather than a runtime alias. |
| R3 | Accent tokens are currently *shared* between Light and Dark (single hex set). | `Dark_mode.md` §3 proposes per-mode accent variants; the two plans must land together to avoid double edits to `DesignTokens.xaml`. |
| R4 | Active-pill convention — **resolved: soft `#E3F2FD`** with `SidebarTextBrush` foreground. | Implemented in `SetActiveButton`. |

---

## 11. Implementation status

| Phase | Item | State |
|-------|------|-------|
| L0 | `Light`/`Default`: sidebar → light, `SidebarText*`, `LoginHeroColor`, link-text token, `TextSecondary`/`TextMuted` contrast fix | ✅ `Resources/DesignTokens.xaml` |
| L0 | `SidebarItemTextStyle` foreground → `SidebarTextBrush` | ✅ |
| L1 | `Views/ShellView.xaml`: nav icons/labels, module labels, logo title/subtitle → sidebar text tokens; logo glyph → `TextOnAccentBrush` | ✅ |
| L1 | `SetActiveButton`: sidebar tokens, soft `#E3F2FD` pill + accent underline; the `Colors.White` border literal is gone | ✅ |
| L1 | 5 auth/hero panels → `LoginHeroBrush`; `NavyDarkBrush` re-pointed to `LoginHeroColor` as a safety net | ✅ |
| L2 | `ThemeService` persistence (`ApplySavedTheme`, `SaveTheme` via the existing `LocalSettings` convention) | ✅ |
| L2 | `App.xaml.cs` calls `ApplySavedTheme()` immediately after `Initialize` | ✅ |
| L2 | Toggle initial-state sync from `ActualTheme`, with a re-entrancy guard so syncing does not persist a choice the user never made | ✅ |
| L3 | `SchoolSettingsView` `#F8F8F8` / `#F0F9FF` → theme tokens | ✅ |
| L3 | `UserTourOverlay` scrim `#66000000` + accent `#4D2979FF` → `ScrimBrush` / `PrimaryBlueBrush` | ✅ |
| L3 | `FormatConverters.StatusColorConverter` → theme-resolved brushes | ✅ |
| L3 | `FeeCollectionView` "Record Payment" dialog (was a hard-coded dark palette of white text on `#2A2A2A`) → theme tokens; ready-to-assign print slip left as paper-white per P8 | ✅ |
| — | `GhostButtonStyle` foreground → `LinkTextBrush` (the accent-as-text AA fix, §3.3) | ✅ |
| L4 | Focus-ring resource overrides in **all three** theme dictionaries: `FocusVisualPrimaryBrush` → `FocusBorderColor` (`#1976D2` light / `#6BB6F7` dark), `FocusVisualSecondaryBrush` → translucent halo, `FocusBorderBrush` | ✅ |
| L4 | Card-elevation softening | ✅ resolved — **no shadows were introduced.** `CardShadowBrush` (`#0A000000`) has no consumer; `KpiCardStyle` / `TableCardStyle` / `CardBorderStyle` all carry a 1px `BorderLightBrush`. Per P6 separation stays border-based, so there is nothing to soften and the token is already below the recommended `#0F000000`–`#26000000` band |
| LD6 | `Default` ↔ `Light` drift guard | ✅ `_check_theme_parity.ps1` (a **guard** rather than a generator: the two dictionaries are compared by key set and the check fails on drift). Verified **175 / 175 / 175** keys across Default, Light and Dark |
| — | Chart series/gridlines were resolved once and never re-read on theme switch | ✅ `AnalyticsView` / `DefaultersAnalyticsView` / `FinancialsDashboardView` now resolve every chart colour through `ThemeResourceHelper`, and gridlines use the previously-unused `ChartGridlineBrush` token (shared with `Dark_mode.md` Dk5) |
| — | `Views/ClassesView.xaml.cs` chips (`Colors.White` text on a background-less `Grid`) → `TextPrimaryBrush` on a neutral/hover chip background, resolved per theme | ✅ |

**Verification:** `dotnet build AutoTable.csproj --nologo` → **0 errors** (pre-existing CA1416 warnings unchanged).

**Third pass (22 Sep 2026):** `dotnet build AutoTable.csproj --nologo` → **0 errors**, 5,666 warnings (all
pre-existing `CA1416`). `dotnet test Tests/AutoTable.IntegrationTests` → **57 passed, 0 failed** — now run,
rather than deferred; it covers licence and DB logic, so it is a regression check on the shared layer
these theme tokens sit under, not on the theme work itself. No token or theme-dictionary change was made
in this pass, so the **175 / 175 / 175** parity result from `_check_theme_parity.ps1` still holds.

**Fourth pass (23 Sep 2026):** the register sweep completed — all 13 primary registers now render
through `DataTable`, and every colour this guide governs (subtle badge fills, accent-text labels,
numeric cell styles) is resolved from these dictionaries by the shared control rather than per view.
Three more light-mode AA hazards fell in the sweep: the Analytics rows coloured Average blue /
At-Risk red / Excellent green (§ 3.3 violations as *text*), the Financials amount was bold green
decoration, and the Edit Class modal's status text was hard-coded translucent white — invisible on
the dialog's white background — now `TextSecondaryBrush`. The Promotion status chip's
`NavySidebarBrush`-on-any-theme fill is now a `StatusBadge`. The status word → colour mapping was
extracted to `Converters/StatusVocabulary.cs` and locked by 46 tests. No token was added or changed,
so parity still reads **175 / 175 / 175**. `dotnet build` → **0 errors**; `dotnet test` → **103 passed,
0 failed** (46 new status-vocabulary tests, which lock the accent-text roles the badges depend on).

**Fifth pass (23 Sep 2026) — modal chrome, light-mode result:** every `ContentDialog` in the app
now renders on this guide's tokens: `ContentDialogBackground/SmokeFill/BorderBrush/Foreground/
SecondaryForeground/SeparatorBorderBrush` are overridden in the `Default` and `Light`
dictionaries to resolve `SurfaceElevatedColor`, `OverlayColor`, `BorderLightColor`,
`TextPrimaryColor`, `TextSecondaryColor`. Light-mode AA win: the old platform dialog smoke and
text defaults no longer leak into the app's dialogs — titles/secondaries read in
`TextPrimary`/`TextSecondary` on the elevated white surface. Six brushes per dictionary; parity
guard re-run after the change: **181 / 181 / 181, PASSED**. Rules in `erp_design.md` §12.

**Sixth pass (24 Sep 2026) — token-purity closure (see `AppThemes.md` §6 for the full record):**
the "Take Tour" label's `InfoBlueBrush` (≈3.1:1 on the light rail — the last § 3.3
accent-as-text violation) now uses `LinkTextBrush`; `GradeColorConverter` moved from accent
*fills* (green ≈2.4:1 on white — failed even large-text AA) to the per-mode accent-**text**
tokens, keeping grade letters as plain text; `DangerHoverBrush` lost its raw `#2EF44336`
literal; the enrollment photo frame's `#E0E0E0` became `BorderLightBrush`. The Dashboard KPI
cards stopped parsing raw hex strings (`#007BFF`, a palette this app never owned) and now
resolve semantic accent keys into per-mode fill + accent-text brush pairs. Parity guard PASSED,
build 0 errors, 103/103 tests, 15/15 smoke. Full audit + exemptions list: `AppThemes.md` §3. The automated
WCAG guard (`Tests/check_theme_contrast.ps1`, `AppThemes.md` §7) then found three real light-mode
failures and they are fixed: primary/danger buttons background their darker Hover tokens (white
on `#2196F3` was 3.1:1; on `#1976D2` it is 4.6:1), `TextMutedColor` → `#616876` (5.1:1 page /
4.6:1 table band) and `LinkTextColor` → `#1565C0` — guard final: **129/129**. Then **retinted
to the user's dashboard references** (`AppThemes.md` §8): the page canvas is now the genre's
distinct cool gray `#E8EAED` under pure-white cards (measured from the Pointsale/Skoryna pins),
with hairlines, inputs, hover, gridlines re-derived around it and `TextMuted` at `#59606C`.

**Second pass (22 Sep 2026) — shared with `Dark_mode.md` and `erp_design.md`:**

| Item | State |
|------|-------|
| KPI figures stopped spending the accent on decoration (`KpiMetricValueStyle` / `KpiMetricAttentionStyle`; bold reserved for attention) | ✅ `Resources/DesignTokens.xaml`, then applied in Fee Collection, Budget, Term Management, Promotion, Financials and Assessments |
| Tabular figures landed for every numeric role, incl. KPI values and chart annotations | ✅ `Typography.NumeralAlignment="Tabular"` |
| Registers migrated onto the shared `DataTable` (Teachers, Budget, Assessments) — no view rebuilds header geometry against this guide's colour roles by hand any more | ✅ `erp_design.md` § 11 |
| **Third pass:** Grade Book and Marks Entry migrated too (**6 of 13** registers), and the Grade Book's blue-on-blue grade badge became plain text — `InfoBlue` as *text* was exactly the § 3.3 light-mode AA failure, now removed from the register rather than re-tinted | ✅ `erp_design.md` § 11 |
| **Third pass:** `StatusBadge` no longer falls back to the level name, so the *word* shown is the domain word in the theme's colour role — a badge whose text reads “Overdue” when the record says “At Risk” was a labelling bug this guide's colour roles could not fix on their own | ✅ 4 views |

**Note on LD6's shape:** the recommendation was to *generate* `Default` from `Light`. A generated file would be overwritten by the XAML toolchain's expectations and is harder to review in a diff than the guard, so the drift risk (a token added to one dictionary but not the other) is now caught by a failing check instead. Run `powershell -File _check_theme_parity.ps1` before committing a token change.

**On the `ClassesView` chips:** they sit in a `ContentDialog` (white in Light mode), so the old
white label text was invisible there. They now use `TextPrimaryBrush` over a themed neutral chip
background; if a future chip sits on the accent or the dark hero panel it should use
`TextOnAccentBrush` instead.

**Consumed by the ERP pass:** `erp_design.md` § E2–E4 landed the shared `StatusBadge` and
`DataTable` components; both resolve every colour from these theme dictionaries through
`ThemeResourceHelper`, so the badge text-contrast and inset-surface fixes here are what make
them legible in Light mode.
