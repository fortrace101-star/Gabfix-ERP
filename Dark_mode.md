# AutoTable — Unified Dark Mode Guide

> **Consolidates:** the link list in `dark-mode-light-mode-guide.md`, together with the
> existing in-repo drafts `theme_file.md` and `THEME.md` (the dark sections).
> **Scope:** `Resources/DesignTokens.xaml` (Dark dictionary) + `Services/ThemeService.cs`.
>
> **Status:** **Phases D0–D4 implemented; focus states outstanding.** See
> [§11 Implementation status](#11-implementation-status).
>
> **Companion docs:** [`Light_mode.md`](Light_mode.md), [`erp_design.md`](erp_design.md).

---

## 1. Sources

| # | Source | Contributed |
|---|--------|-------------|
| S1 | [Muzli — Dark Mode Design Systems](https://muz.li/blog/dark-mode-design-systems-a-complete-guide-to-patterns-tokens-and-hierarchy/) | The 4-level surface ladder; luminance (not shadow) is what signals elevation on dark; step surfaces **5–8% luminance** per level; semantic tokens; per-mode accent variants; off-white text `#E0E0E0–#F0F0F0`; WCAG AA applies to dark too; near-black `#0A0A0A–#161616`, not `#000000` |
| S2 | [Accessibility First](https://www.accessibilityfirst.at/posts/dark-and-light-mode-a-simple-guide-for-web-design-and-development) | Prefer `#121212` over pure black; adaptive media; test both modes; system preference + persisted override |
| S3 | [Vince Arizala — Dark Mode Design Patterns](https://www.vincearizala.com/articles/dark-mode-design-patterns) | Surface stack `base → raised → overlay → inset → border`; **inset inputs differ from their card**; hairline borders at low opacity; reserve full-brightness white for headings; visible focus rings; low-contrast chart gridlines; raise line-height for long copy; per-component dark thought |
| S4 | [Orizon](https://www.orizon.co/blog/dark-mode-vs-light-mode-ux-best-practices-tokens-toggles-and-accessibility) | Toggle/token UX; accessibility motivation; **visual colour-layout reference** (dark hero: deep near-black canvas, one lighter card plane, single vivid accent, plenty of negative space) |
| S5 | [FourZeroThree — Scalable, Accessible Dark Mode](https://www.fourzerothree.in/p/scalable-accessible-dark-mode) | Unreachable at fetch time; no unique guideline relies on it |

### 1.1 Consolidated principles (dark mode)

**D-P1 — Dark is a first-class context with its own visual logic, not an inverted light theme.**
Straight hex inversion is wrong (`#0070F3` inverts to orange). Dark needs its own
decisions for surfaces, accents and elevation (S1, S3).

**D-P2 — Four surface levels minimum, stepping up in luminance.**
`base → raised → overlay → inset`. Authored ~5–8% luminance apart. Shadows do not read on
dark; **elevation = lighter, not more shadowed** (S1, S3).

**D-P3 — Never pure black; never pure white text.**
Base in `#0A0A0A–#161616` (or a softened `#1E1E1E`), body text off-white `#E0E0E0–#F0F0F0`.
Pure `#000000`/`#FFFFFF` pairs cause halation and eye strain (S1, S2, S3).

**D-P4 — Desaturate large fields, elevate contrast on interactive elements.**
Large dark areas should sit at lower relative contrast; interactive elements and headings get
the higher contrast. Also: avoid ultra-thin weights at small sizes on dark (S3).

**D-P5 — Accents need per-mode variants.**
A blue saturated for white looks washed out on dark; increase lightness/saturation while
preserving hue and perceived weight. Test each accent in hover **and** active (S1, S3).

**D-P6 — Inputs are inset, surfaces are raised, borders are hairlines.**
An input must **not** share its background with the card it sits on. Borders are low-opacity
hairlines, not solid grey lines (S3).

**D-P7 — Charts, media and code need explicit dark treatment.**
Low-contrast gridlines, label colours bound to the typography tokens, and media dimmed or
bordered so it doesn't bleed into the canvas (S3).

**D-P8 — Focus indicators must survive dark surfaces.**
Thin dark-blue outlines vanish on dark grey. Focus needs ≥3:1 against the adjacent surface (S3).

**D-P9 — Offer both modes; respect the system preference; persist the override.**
Dark must be an option, never the only mode. Honour the OS signal by default and let users
override — then remember it (S1, S2).

**D-P10 — Half-built toggles erode trust.**
If a dark toggle exists, every surface must genuinely respond; a mode that leaves panels
light reads as a bug (S3).

---

## 2. Product decisions for AutoTable

| ID | Decision | Rationale |
|----|----------|-----------|
| **DD1** | Keep `#121212` as the **sidebar/frame** base and `#1E1E1E` as the **content base**, but **widen the gap** between the three elevation levels. | The current ladder is quantifiably too flat: `#1E1E1E → #2D2D2D` is only ≈1.21:1, and `#2D2D2D → #333333` (elevated) is ≈1.09:1 — effectively invisible elevation (D-P2). |
| **DD2** | Dark stays a **toggle + OS-Default** mode, with the same persisted preference store as light. | D-P9. One mechanism, two modes. |
| **DD3** | Introduce **per-mode accent variants** for the accent *used as text/icon*, keeping fills as-is. | D-P5. Blue-as-text currently fails AA on the dark card surface (see §3.3). |
| **DD4** | Print surfaces are excluded from theming (they are paper documents). | Consistency with `Light_mode.md` LD3/D2. |
| **DD5** | The auth/hero panels stay brand-navy in **both** modes via `LoginHeroColor`, so dark mode does not accidentally double-darken or light-flip them. | D-P10. Today they alias `SidebarColor`. |

---

## 3. Target dark token set

### 3.1 Surface ladder (the main change)

| Token | Current | **Target** | Luminance step |
|-------|---------|-----------|----------------|
| `SidebarColor` (frame) | `#121212` | `#121212` ✓ | darkest |
| `BackgroundColor` / `SurfaceGrayColor` (base) | `#1E1E1E` | `#1C1C1E` | base |
| `SurfaceWhiteColor` (raised: cards, header) | `#2D2D2D` | **`#2A2A2E`** | +≈5% vs base |
| `SurfaceGray2Color` (raised-2: table header, insets) | `#2D2D2D` | **`#34343A`** | +≈5% vs raised |
| `SurfaceElevatedColor` (overlay: modals, flyouts) | `#333333` | **`#3C3C43`** | +≈5% vs raised-2 |
| `SurfaceSunkenColor` (inset: inputs, wells) | `#171717` | **`#17171A`** | *below* base |
| `SurfaceDisabledColor` | `#3A3A3A` | `#2E2E33` | — |

> The exact hexes are a starting point; what matters is the **5–8% luminance step** between
> adjacent levels (D-P2). Verify with a contrast checker before freezing the values.
>
> **Note the inset rule (D-P6):** inputs (`SurfaceSunkenColor`) must be *darker* than the
> card (`SurfaceWhiteColor`) they sit on — currently inputs share the card colour wherever
> `TextBoxStyle`/`ComboBoxStyle` both resolve to `SurfaceWhiteBrush`.

### 3.2 Text

| Token | Current | **Target** | Note |
|-------|---------|-----------|------|
| `TextPrimaryColor` | `#E0E0E0` | `#E8E8EA` | off-white, **never `#FFFFFF`** (D-P3) — ≈12.6:1 at `#E0E0E0`, comfortable |
| `TextSecondaryColor` | `#A0A0A0` | `#A8A8B0` | ≈6.4:1 ✓ |
| `TextMutedColor` | `#757575` | **`#90909A`** | `#757575` on `#1E1E1E` ≈ **3.6:1 → fails AA**; target ≈ 5:1 |
| `TextDisabledColor` | `#555555` | `#5C5C66` | exempt from AA |
| `TextOnAccentColor` | `#FFFFFF` | `#FFFFFF` ✓ | on solid accent fills |
| `TextOnDarkColor` | `#E0E0E0` | `#E8E8EA` | hero/print panels only |
| `TextOnDarkMutedColor` | `#A0A0A0` | `#A8A8B0` | hero subtitle |

### 3.3 Accent variants (D-P5)

Fills can stay identical across modes (they're large, ≥3:1 UI contrast). **Accent used as
text or a small icon** needs a lighter variant on dark:

| Role | Fill (both modes) | Dark text/icon variant | On `#2A2A2E` |
|------|-------------------|------------------------|--------------|
| Primary blue | `#2196F3` | **`#6BB6F7`** | ≈ 6.5:1 ✓ |
| Success green | `#4CAF50` | **`#7BD17E`** | ✓ |
| Warning amber | `#FF9800` | **`#FFB74D`** | ✓ |
| Danger red | `#F44336` | **`#F47C72`** | ✓ |
| Accent purple | `#673AB7` | **`#A98BE0`** | ✓ |
| Finance teal | `#009688` | **`#4DB6AC`** | ✓ |

Expose as e.g. `BlueTextColor`/`BlueTextBrush` (Light = `#1976D2`, Dark = `#6BB6F7`) so views
have one token that is correct in both modes.

> Current state: `#2196F3` as text on the dark card `#2D2D2D` measures ≈ **4.4:1** — just under
> the 4.5:1 AA threshold for normal text. This is the concrete reason for per-mode variants.

### 3.4 Interactive states

| Token | Current | Target | Note |
|-------|---------|--------|------|
| `HoverColor` | `#3A3A3A` | `#33333A` | hover must be a *visible* step from raised |
| `PressedColor` | `#444444` | `#3E3E46` | |
| `SelectedColor` | `#1E3A5F` | `#24405F` | blue-tinted selection |
| `SelectedHoverColor` | `#24466E` | `#2B4E7A` | |
| `FocusBorderColor` | `#1976D2` | **`#6BB6F7`** | `#1976D2` on dark ≈ 3.0:1 — marginal; the lighter blue is unmistakable (D-P8) |
| `BorderLightColor` / `DividerColor` | `#333333` | `#3A3A42` (hairline, low opacity feel) | D-P6 |
| `BorderMediumColor` | `#444444` | `#4A4A52` | |
| `OverlayColor` / `ScrimColor` | `#66000000` | **`#B3000000`** | on dark, a 40% scrim reads as almost no dimming; overlays need more |
| `CardShadowColor` | `#0A000000` | `#3D000000` or *dropped* | shadows barely read on dark (D-P2) — prefer the lighter-surface signal |

### 3.5 Charts (D-P7)

| Token | Current | Target |
|-------|---------|--------|
| `ChartGridlineColor` | `#333333` | `#2F2F36` (stays a whisper — do **not** brighten into a lattice) |
| Axis/label colours | via text tokens | bind to `TextSecondaryBrush`/`TextMutedBrush` |
| Series | shared fills | keep `#4CAF50`/`#FF9800`/`#F44336`; add ~2px stroke so lines read on dark |

---

## 4. Compliance audit — current app vs the principles

| Principle | Status | Evidence |
|-----------|--------|----------|
| **D-P1** Dark is first-class | ▲ | The `Dark` dictionary in `Resources/DesignTokens.xaml` is a genuine, full dictionary (surfaces, text, states, accents, overlays) — good. But accents are a straight copy of the light hex set, and elevation is not designed (§3.1), so it behaves like "light palette re-skinned". |
| **D-P2** 4-level luminance ladder | ✘ | Measured with the WCAG relative-luminance formula: base `#1E1E1E` → raised `#2D2D2D` ≈ **1.21:1**; raised `#2D2D2D` → elevated `#333333` ≈ **1.09:1**. Target guidance is a ~5–8% step per level. Cards and modals are therefore nearly indistinguishable from the page. |
| **D-P3** No pure black / pure white | ✔ | Base is `#1E1E1E`/`#121212`; body text `#E0E0E0`. No `#000000` background, no `#FFFFFF` body text. |
| **D-P4** Muted large fields, strong interactive | ▲ | `TextPrimaryColor` `#E0E0E0` on `#2D2D2D` is comfortable (≈11:1) ✔, but `TextMutedColor` `#757575` ≈ **3.6:1** fails AA for the table meta/helper text it serves. |
| **D-P5** Per-mode accents | ✘ | `Dark` reuses `BlueColor #2196F3`, `GreenColor #4CAF50`, etc. uniformly, and `BlueSubtleColor`/`GreenSubtleColor`/… step to *dark* variants used as fills. `#2196F3` as small text ≈ 4.4:1 → marginal fail. |
| **D-P6** Inset inputs, hairline borders | ▲ | `SurfaceSunkenColor` `#171717` exists and is correctly darker than the base ✔. But `TextBoxStyle`, `ComboBoxStyle`, `SearchBoxStyle`, `CalendarStyle` all use `SurfaceWhiteBrush` (= the card colour) as their background, so inputs do **not** read as inset. Borders are solid `#333333`, acceptable but flat. |
| **D-P7** Charts/media/code dark treatment | ▲ | `ChartGridlineBrush` uses `ChartGridlineColor` `#333333` (low contrast) ✔, and chart series use `ThemeResource` accent colours ✔. Gaps: no line-chart stroke thickness for dark legibility; `-1`/imagery has no dimming or border treatment. |
| **D-P8** Visible focus | ✘ | `FocusBorderColor` `#1976D2` ≈ **3.0:1** against `#1E1E1E` — borderline; and `PrimaryButtonStyle`/`SecondaryButtonStyle`/`GhostButtonStyle`/`IconButtonStyle` declare no `Focused` visual state at all, so the default WinUI focus rectangle is whatever the platform paints. |
| **D-P9** Both modes + persist + honour OS | ✘ | `Services/ThemeService.cs` has **no persistence**; `App.xaml.cs` (~L235) never restores a saved choice. The toggle lives only in `Views/ShellView.xaml` (`ThemeToggle`) and has no initial-state sync — so on launch the switch can contradict the rendered mode. |
| **D-P10** No half-built toggle | ▲ | The Dark dictionary is complete enough that most surfaces respond ✔, but hard-coded colours leak in (`Views/SchoolSettingsView.xaml` L107 `#F8F8F8`, L204/L423 `#F0F9FF`; `Views/Controls/UserTourOverlay.xaml` L21 `#66000000`, L32 `#4D2979FF`; `Converters/FormatConverters.cs` `StatusColorConverter` uses fixed brushes `#27AE60`, `#2980B9`, `#E74C3C`, `#F39C12`, `#9E9E9E`) → those elements stay light-tuned in dark mode. |

### 4.1 Additional dark-specific gaps

| # | Gap | Where |
|---|-----|-------|
| Dk1 | Code-behind UI built with `Colors.White`/`Colors.Black` never adapts: white chips on dark, black text on dark surfaces. | `Views/ClassesView.xaml.cs` (L834, 844, 981, 1018), `Views/FeeCollectionView.xaml.cs` (L81, 84, 88, 194, 602, 618, 656), `Views/ReportCardsView.xaml.cs` (L902) |
| Dk2 | Overlay scrim at 40% black barely dims a dark page, so modals don't separate from the canvas. | `Resources/DesignTokens.xaml` `OverlayColor`/`ScrimColor` `#66000000` |
| Dk3 | `StatusColorConverter` hard-codes mid-tone brand colours, so status dots keep light-mode tones on dark. | `Converters/FormatConverters.cs` L127–131 |
| Dk4 | No elevation fallback for cards when the surface colours are too close — no border/signal change either. | `Resources/DesignTokens.xaml` `CardBorderStyle`, `KpiCardStyle` |
| Dk5 | Charts have no `StrokeThickness` and no per-mode series tuning; thin light-coloured lines can disappear. | chart rendering in `Views/AnalyticsView.xaml`, `Views/DashboardView.xaml.cs`, `Views/FinancialsDashboardView.xaml` |

---

## 5. What "done" looks like (dark)

```
┌──────────────────────────────────────────────────────────────┐
│ Sidebar  #121212 · frame divider #3A3A42                     │
│  • brand header dark, #E8E8EA text                           │
│  • nav items #A8A8B0 → #E8E8EA active, active bg #24405F     │
├──────────────────────────────────────────────────────────────┤
│ Header   #2A2A2E raised, hairline #3A3A42 bottom border      │
│ Content  page #1C1C1E · cards #2A2A2E · table band #34343A   │
│ Inputs   #17171A inset (darker than the card they sit on)    │
│ Modals   #3C3C43 overlay + stronger scrim                   │
└──────────────────────────────────────────────────────────────┘
     Auth/hero panels: constant #1E293B (unchanged across modes)
     Focus rings: #6BB6F7, ≥3:1 on every dark surface
```

---

## 6. Accessibility acceptance criteria (dark)

| Check | Requirement |
|-------|-------------|
| Body text | `#E8E8EA` on `#2A2A2E` ≥ 4.5:1 ✓ (target ≈11:1) |
| Secondary/muted | ≥ 4.5:1 — the `#757575` failure must be fixed |
| Accent as text/icon | ≥ 4.5:1 → use the per-mode variants (§3.3) |
| Accent as fill | ≥ 3:1 against adjacent surface |
| Focus ring | ≥ 3:1 against the control **and** the page; always visible |
| Elevation | Adjacent surfaces distinguishable without relying on a border alone |
| Status | Never colour-only |
| Long-form reading | line-height raised slightly vs light; no ultra-thin small text |

---

## 7. Files in scope

| File | Change |
|------|--------|
| `Resources/DesignTokens.xaml` | Dark: surface ladder widening, text contrast fix, per-mode accent variants, `FocusBorderColor`, scrim, chart gridline |
| `Services/ThemeService.cs` | Persistence (`ApplySavedTheme`, save in `SetTheme`) — shared with `Light_mode.md` |
| `App.xaml.cs` | `ApplySavedTheme()` after `Initialize` (~L235) |
| `Resources/DesignTokens.xaml` (`TextBoxStyle`/`ComboBoxStyle`/`SearchBoxStyle`/`CalendarStyle`) | Background → `SurfaceSunkenBrush` so inputs read as inset (D-P6) |
| `Resources/DesignTokens.xaml` (button styles) | Add `Focused` visual states |
| `Views/ShellView.xaml.cs` | `SetActiveButton` — remove `Colors.White`; sync toggle state |
| `Views/ClassesView.xaml.cs`, `FeeCollectionView.xaml.cs`, `ReportCardsView.xaml.cs` | Replace `Colors.*` with theme brushes (Dk1) |
| `Converters/FormatConverters.cs` | `StatusColorConverter` → theme-resolved brushes (Dk3) |
| `Views/AnalyticsView.xaml`, `Views/DashboardView.xaml.cs`, `Views/FinancialsDashboardView.xaml` | Chart stroke thickness + label tokens (Dk5) |
| `Views/Controls/UserTourOverlay.xaml` | Scrim + accent tokens |

---

## 8. Implementation plan

### Phase D0 — Surface ladder & text contrast (highest visual impact)
1. Widen the Dark surface ladder per §3.1 (base / raised / raised-2 / overlay / inset).
2. Fix `TextMutedColor` → `#90909A`; nudge `TextPrimary`/`TextSecondary`/`TextOnDark*` per §3.2.
3. Widen `BorderLightColor`/`BorderMediumColor` hairlines.
4. **Verify:** dashboard, tables, modals on a calibrated (non-OLED-boosted) display; cards must
   read as raised *without* any shadow.

### Phase D1 — Per-mode accents & focus
5. Add per-mode accent-text variants (§3.3) and a `FocusBorderColor` → `#6BB6F7` in Dark.
6. Add `Focused` visual states to the button/input styles.
7. **Verify:** focus ring visible on `#1C1C1E`, `#2A2A2E`, `#3C3C43`, and on accent fills.

### Phase D2 — Inset inputs, overlays, charts
8. Switch input surfaces to `SurfaceSunkenBrush` (D-P6).
9. Strengthen `OverlayColor`/`ScrimColor` on Dark (Dk2).
10. Chart pass: stroke thickness, label tokens, gridline value (Dk5).
11. **Verify:** a form field must be distinguishable from its card at a glance; a modal must
    visibly sit above the page.

### Phase D3 — Honest toggle & persistence (shared with Light)
12. `ThemeService` persistence + `ApplySavedTheme()` + toggle initial-state sync.
13. **Verify:** Dark → restart → still Dark; toggle correct; delete setting → OS wins.

### Phase D4 — Hardcoded-colour cleanup
14. Sweep Dk1/Dk3/`SchoolSettingsView`/`UserTourOverlay` leaks; use
    `ThemeResourceHelper.GetThemeBrush(...)` in code.
15. **Verify:** grep for `#`-literals outside `DesignTokens.xaml`; every remaining one is
    either a print surface or a scrim.

### Regression gate (every phase)
- `dotnet build AutoTable.csproj -p:Platform=x64` → 0 errors/warnings introduced.
- Integration tests in `Tests/AutoTable.IntegrationTests` pass.
- Warm→cold theme swap leaves no stale brush; screenshot-diff the main pages per phase.

---

## 9. Acceptance checklist

- [ ] Base / raised / raised-2 / overlay all visibly distinct; cards read as raised with no shadow.
- [ ] Inputs are darker than the cards they sit on.
- [ ] Body off-white (`#E8E8EA`), never `#FFFFFF`; muted text passes AA.
- [ ] Accents as text use per-mode variants; fills stay saturated.
- [ ] Focus ring clearly visible on every dark surface and on accent fills.
- [ ] Modals/overlays visibly separate from the page.
- [ ] Charts legible: low-contrast gridlines, matching labels, visible line strokes.
- [ ] No hard-coded light-tuned hex remains in feature views or code-behind.
- [ ] Dark survives a restart; toggle reflects the true state.
- [ ] Light mode still renders correctly after the refactor (regression).
- [ ] Print surfaces unchanged.

---

## 10. Open items / risks

| # | Item | Note |
|---|------|------|
| R1 | Exact target hexes are proposals. | The **relative** luminance steps (5–8%) are the requirement; freeze final values only after a display test. |
| R2 | OLED vs LCD rendering differs materially. | Test on both; if in doubt, keep the base slightly lighter rather than pushing to `#000000`. |
| R3 | Per-mode accents (`DD3`) and the Light plan's link-text token touch the same token list. | Land `Light_mode.md` §3.3 and this §3.3 in **one** `DesignTokens.xaml` edit to avoid conflicting rewrites. |
| R4 | Stronger scrims change modal feel app-wide. | Confirm with a look at the "Record Payment"/"Enroll Student" dialogs before freezing. |
| R5 | `FourZeroThree`, Orizon and Sayhello links were unreachable. | No guideline above depends on them; re-fetch if we want their specifics. |

---

## 11. Implementation status

| Phase | Item | State |
|-------|------|-------|
| D0 | Surface ladder widened (`#1C1C1E` base → `#2A2A2E` raised → `#34343A` raised-2 → `#3C3C43` overlay; inset `#17171A`) | ✅ `Resources/DesignTokens.xaml` |
| D0 | Text contrast: `TextMuted` `#757575`→`#90909A`, `TextPrimary`→`#E8E8EA`, `TextSecondary`/`TextOnDark*`→`#A8A8B0` | ✅ |
| D0 | Hairline borders and interactive states widened (`#3A3A42`, hover `#33333A`, selection `#24405F`) | ✅ |
| D1 | Per-mode accent-text palette (blue/green/orange/red/purple/teal) added to Light **and** Dark | ✅ tokens added; not yet consumed by feature views (see note) |
| D1 | `FocusBorderColor` → `#6BB6F7` on Dark (≈3.0:1 → clearly visible) | ✅ |
| D2 | Overlay scrim `#66000000` → `#B3000000`; card shadow `#3D000000` | ✅ |
| D2 | Chart gridline `#2F2F36` | ✅ |
| D2 | Inputs → `SurfaceSunkenBrush` so they read as inset (D-P6): `TextBoxStyle`, `SearchBoxStyle`, `ComboBoxStyle`, `CalendarStyle` | ✅ (`#17171A` on the `#1C1C1E` base) |
| D3 | Persistence + toggle sync | ✅ (shared with `Light_mode.md`) |
| D4 | `StatusColorConverter` → theme-resolved brushes | ✅ |
| D4 | `SchoolSettingsView` / `UserTourOverlay` hard-coded colours | ✅ |
| — | Focus visual states (§ D-P8): `FocusVisualPrimaryBrush` → `#6BB6F7`, translucent secondary halo, in all three theme dictionaries | ✅ |
| — | Chart line `StrokeThickness` tuning (Dk5) | ✅ new per-mode token `ChartLineStrokeThickness` (**2** on Light, **3** on Dark) added to all three theme dictionaries; `AnalyticsView` reads it instead of the hard-coded `3` |
| — | Chart gridlines were hard-coded to `BorderLightBrush` and never re-resolved on theme switch | ✅ gridlines now use the previously-unused `ChartGridlineBrush` token (`#DDDDDD` light / `#2F2F36` dark), and every chart brush in `AnalyticsView` / `DefaultersAnalyticsView` / `FinancialsDashboardView` resolves through `ThemeResourceHelper` so a theme flip re-colours the charts |
| D1 | Per-mode accent-**text** palette | ✅ now consumed by `StatusBadge` **and** by the KPI metric styles — no view assigns a badge fill and its label from separate branches any more |
| — | Badge text contrast on dark subtle fills (measured ≈2.8:1 for success) | ✅ `StatusBadge` + `Badge*TextStyle` now pair the subtle fill with the per-mode accent-**text** token; dark-on-dark is no longer possible because the two halves are chosen together |

**Verification:** `dotnet build AutoTable.csproj --nologo` → **0 errors** (second pass, 22 Sep 2026, same result: 0 errors / 5,637 pre-existing `CA1416` warnings).

**Third pass (22 Sep 2026):** **0 errors**, 5,666 warnings (all pre-existing `CA1416`; the +29 is generated-XAML
code lines from two more `DataTable` hosts, not new analyser findings).
`dotnet test Tests/AutoTable.IntegrationTests` → **57 passed, 0 failed**. No dark token changed in this
pass, so **175 / 175 / 175** parity still holds. The pass removed two remaining dark-mode hazards from the
registers: the Marks Entry “Record/Submit” flow used to show a stale roster after a failed load (now a
retryable error state), and `StatusBadge`'s level-name fallback meant a badge's *text* could disagree with
the record it described even when its colours were correct.

The token sets were verified **identical across all three theme dictionaries (175 / 175 / 175 keys)** by
`_check_theme_parity.ps1`, which now guards the `Default` ↔ `Light` lockstep described as LD6 in
`Light_mode.md`. Add any dark-only token to all three dictionaries or the check fails.

**Still outstanding:** the per-mode *fills* (chart series, progress bars) are intentionally shared; only
text/status usages moved to the per-mode tokens. Chart `-1`/imagery dimming (§ D-P7) remains open.

**Note on the per-mode accent palette:** the six `*TextBrush` tokens now exist per mode
(Light `#1976D2`/`#2E7D32`/`#B45309`/`#C62828`/`#512DA8`/`#00695C`,
Dark `#6BB6F7`/`#7BD17E`/`#FFB74D`/`#F47C72`/`#A98BE0`/`#4DB6AC`). They are consumed by
`LinkTextBrush` (via `GhostButtonStyle`), by `StatusBadge` (which picks the fill and the
label from the same status branch) and by the `KpiMetric*` styles — so status and KPI text
have one owner each rather than per-view colour branches. Remaining consumers to move:
chart annotations and any hand-built badge, which should be replaced by `StatusBadge`
rather than wired individually.

**Note on badge contrast (resolved):** dark badge fills (`GreenSubtleColor #1B5E20` etc.) with a
mid-tone badge text used to measure ≈2.8:1. `Views/Controls/StatusBadge.xaml.cs` now assigns the
fill (`*SubtleBrush`) and the label (`*TextBrush`) from the same status branch, so the pair is
`#1B5E20`+`#7BD17E` and similar — legible on dark, and equally legible on the light fills.
The `Badge*TextStyle` tokens exist for hand-built badges, which should stop being written.

**Consumed by the ERP pass:** `DataTable` (rows, skeleton, hover, totals) resolves every colour
through `ThemeResourceHelper` and reads its row padding from the density tokens, so no part of a
register carries a light-mode literal.

**Fourth pass (23 Sep 2026):** the register sweep completed — all 13 primary registers now render
through `DataTable`, so dark-mode correctness of the whole register surface is enforced in one
control. Dark-only literals found and removed in the sweep: the Promotion status chip was a
hard-coded `NavySidebarBrush` fill with `TextOnDarkBrush` text (it never responded to the theme),
and the Edit Class modal's status text was translucent white — both now resolve per-mode. The
Analytics rows' coloured Average/At-Risk/Excellent text and the Financials bold-green amount are
gone as § C3 violations; their information is carried by position, weight and `StatusBadge` fills
that pair `*SubtleBrush` with the dark-mode `*TextBrush` tokens. No token added or changed; parity
still **175 / 175 / 175**. `dotnet build` → **0 errors**; `dotnet test` → **103 passed, 0 failed**
(46 new status-vocabulary tests pin the dark-mode accent-text roles).

**Fifth pass (23 Sep 2026) — modal chrome, dark-mode result:** the same six `ContentDialog*`
theme-resource overrides added to the `Dark` dictionary resolve `SurfaceElevatedColor` (#3C3C43 —
the elevation ladder's raised step), `OverlayColor` (#B3000000 — the stronger dark-mode scrim),
`BorderLightColor` (#3A3A42) and the `E8E8EA`/`A8A8B0` text pair. Previously every dialog in dark
mode wore WinUI's default near-black chrome with its own smoke fill — outside the elevation ladder
entirely. Now dialogs sit on the same ladder as every other raised surface. The six new brush keys exist
identically in all three dictionaries; parity guard re-run after the change: **181 / 181 / 181,
PASSED** (175 + the 6 dialog brushes). Rules in `erp_design.md` §12.

**Sixth pass (24 Sep 2026) — token-purity closure (see `AppThemes.md` §6):** dark-mode side of
the closure: the KPI accent icons now resolve the per-mode `*TextBrush` tokens (lightened for
dark surfaces — the old hex strings were light-mode-tuned and froze at construction); grade
letters read `GreenText/BlueText/OrangeText/RedText` variants (≈6.5:1-class on `#2A2A2E`,
versus mid-tone fills before); `DangerHoverBrush` is a token; and the **dark sidebar border
went from invisible to a designed hairline** (`#1E1E1E` ≈1.16:1 → `#2E2E33` ≈1.5:1 against the
`#121212` rail — D-P6's "hairline, not invisible"). Parity guard PASSED, build 0 errors,
103/103 tests, 15/15 smoke. The WCAG guard (`Tests/check_theme_contrast.ps1`, `AppThemes.md` §7)
then caught three dark-mode failure classes, all fixed: the **badge subtle-fills were too vivid
for their labels** (orange label 2.19:1, purple 2.19:1, green 4.22:1) and became true deep tones
(`#113615`/`#4A2005`/`#4F1512`/`#2A1454`/`#0F3A34`/`#14304F`); dark `TextMuted` 3.91:1 on the
table band → `#A8ABB5` (5.06:1 on dialogs, still below `TextSecondary` in brightness); the
dark accent-text tokens (blue/red/purple/teal) sat at 4.15-4.48:1 on dialogs and were lightened
to 4.5:1+ (blue `#82C3F8`, red `#F58C84`, purple `#B49DE8`, teal `#5FC4BA`). Guard final:
**129/129**. Then **retinted to the user's dashboard references** (`AppThemes.md` §8): the
frame/rail is now the genre's near-black teal-cast `#0E1214`, page `#141619`, cards `#1D2024`,
dialogs `#30343A` — a deeper, cooler ladder with measurably stronger rail/page/card separation
than the old neutral-gray set, re-verified by the contrast guard on the new values.

Rules in `erp_design.md` §12.
