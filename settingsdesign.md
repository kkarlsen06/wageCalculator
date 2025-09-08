# Settings Design System

This file defines the visual and interaction design for all settings pages under `app/src/pages/settings.js`. It establishes consistent layout, components, naming, and behaviors so we can implement one detailed view at a time with confidence. Mobile-first, accessible, and low cognitive load are the priorities.

## Goals
- Reduce cognitive load with clear grouping and consistent patterns
- Make each “main section” a distinct box; each individual setting is its own rectangle inside
- Prefer progressive disclosure and short scrolls; avoid deep nesting
- Ensure strong keyboard/accessibility support and predictable auto-save
- Reuse existing tokens/styles where sensible (`var(--*)`, `.settings-level-*`, switches)

## Page Structure
- `#settingsPage.settings-page`
  - `.settings-content`
    - Page title: `.detail-title`
    - `.detail-body`
      - One or more Section Boxes (see below)
  - Global floating nav: existing `.floating-settings-bar` with `Lukk` and `Tilbake`

## Section Box (the “box” per main section)
- Container class: `.settings-section`
- Recommended styles (we will add minimal CSS to match):
  - Background: `var(--bg-secondary)`; Border: `1px solid var(--border)`; Radius: `12px`; Padding: `16px` (mobile), `20px` (>=600px)
  - Vertical gap between boxes: `16px` (mobile), `20px` (>=600px)
- Header (reuse existing header style):
  - `.settings-section-header`
    - Title: `h3` (20px, semibold); optional description: `.section-description`
- Content area: `.settings-section-body`
  - Contains Setting Cards stacked vertically with consistent gaps

## Setting Card (the “rectangle” per setting)
- Container class: `.setting-card`
- Modifier sizes:
  - `.is-compact` for toggles/single-line actions (narrow height)
  - `.is-standard` for common inputs/selects (default)
  - `.is-long` for compound settings (e.g., “Tillegg”/supplements list)
- Recommended base styles:
  - Background: `var(--bg-primary)`; Border: `1px solid var(--border)`; Radius: `10px`
  - Padding: `12px` (compact), `16px` (standard), `16–20px` (long)
  - Internal vertical gap: `8–12px` depending on size
- Internal structure (consistent across sizes):
  - `.setting-header` — label/title and optional hint/status
  - `.setting-body` — control(s), description(s), lists
  - `.setting-actions` — optional buttons like “Lagre”, “Legg til”, “Fjern”
- Labels and hints:
  - Label element precedes control; use `<label for="…">`
  - Hints use `.form-hint` and sit directly under their related control
- Toggles:
  - Use existing `.switch-group` or `.toggle-*` styles; prefer `.switch-group` for compact on/off with label+hint on left and the switch on right
  - Entire card is clickable only if it doesn’t break a11y; keep actual input focusable

## Long Cards (example: “Tillegg” / supplements)
- Shape: `.setting-card.is-long` with a top title and stacked list rows
- Header: Title at the top (no inline switch). Optional short help text in `.form-hint`
- Body: `.supplement-list` containing rows
  - Row structure: `.supplement-row` with fields (e.g., day scope, time range, rate/percent) and actions (Edit/Remove)
  - Add button anchored in `.setting-actions` as “Legg til tillegg”
- Validation and inline errors per row; preserve scroll position on add/remove

## Interaction Patterns
- Save model (confirmed):
  - Auto-save on blur/change for simple inputs and toggles across all views
  - Explicit “Lagre” only where batch confirmation is important (rare)
- Feedback:
  - Show optimistic state with a subtle saving indicator; revert on error and show inline message
  - Disable controls while an operation is in-flight if it prevents inconsistent states
- Collapsibles:
  - Use `.settings-collapse-toggle` and `.settings-collapsible-content` for optional advanced areas
  - Default collapsed unless the content is essential to understand the current selection
- Destructive actions:
  - Always inside a dedicated “Farlige handlinger” section box, collapsed by default, with confirm dialogs

## Accessibility
- All interactive elements reachable by keyboard; maintain logical tab order
- Labels bound to inputs via `for`/`id`; toggles have visible text labels
- Use `aria-expanded` on collapsibles and ensure icon rotation matches state
- Color contrast meets WCAG AA using existing theme tokens

## Responsive Rules
- Mobile-first single-column layout
- Breakpoint ≥ 768px: allow two columns for Setting Cards within a Section Box only if cards are independent; keep long cards full-width
- Prevent horizontal scroll; respect system font scaling

## Theming
- Reuse existing CSS variables: `--bg-primary`, `--bg-secondary`, `--border`, `--text-primary`, `--text-secondary`, `--accent`, etc.
- Cards and boxes adapt to light/dark automatically via tokens

## Naming and IDs
- Route-specific IDs follow `#account*`, `#wage*`, `#advanced*`, `#interface*`, `#data*`
- Keep IDs from `settings.md` (renames included) to align with logic in `app/src/js/appLogic.js`
- Prefer kebab-case for classes; camelCase only for IDs already defined in logic

## Konto (Account) — Detailed View Blueprint

Order and composition for the Account page, matching `settings.md` while using the box/rectangle visual system.

1) Section Box: Konto
- Header: Title “Konto”; Description: “Profil, sikkerhet og tilgang”
- Body: the following Setting Cards

  a) Setting Card — Profilinformasjon (.is-standard)
  - Header: “Profil”
  - Body:
    - Fornavn input: `#accountName` (text, autocomplete="given-name")
    - E‑post input (disabled): `#accountEmail`
    - Auto-save name on blur/Enter via `app.updateAccount()`

  b) Setting Card — Profilbilde (.is-standard)
  - Header: “Profilbilde”
  - Body:
    - Preview area: `#accountAvatarPreview` containing `#accountAvatarImage` and fallback `#accountAvatarPlaceholder`
    - File input (hidden): `#accountAvatarInput`
    - Progress: `#accountPictureProgress` with `#accountPictureProgressFill` and `#accountPictureProgressText`
  - Actions:
    - “Velg bilde” (`#accountAvatarChooseBtn`)
    - “Fjern” (`#accountAvatarRemoveBtn`)
  - Crop modal IDs preserved: `#cropModal`, `#cropImage`, `#cropZoomSlider`, `#zoomOutBtn`, `#zoomInBtn`, `#cancelCropBtn`, `#confirmCropBtn`

  c) Setting Card — Tilkoblinger (Google) (.is-compact for each row)
  - Header: “Tilkoblinger”
  - Body: one row with the Google integration
    - Primary button `#btn-link-google` (visible when unlinked)
    - Secondary button `#btn-unlink-google` + warning `#google-unlink-warning` (visible when linked)
  - Initialization: `app.initGoogleLinkButton()`

  d) Setting Card — Handlinger (.is-compact)
  - Header: “Handlinger”
  - Body:
    - Button: “Start onboarding på nytt” (`onclick="app.restartOnboarding()"`)
    - Style secondary; place here (not in Danger)

2) Section Box: Farlige handlinger (collapsed)
- Header: “Farlige handlinger” with warning tone
- Collapsible content: `data-toggle-section="dangerousActions"`, container `#dangerousActions`
- Body:
  - Button: “Slett alle vakter” (`onclick="app.clearAllShifts()"`, `btn btn-danger`)
  - Include confirmation dialog in logic

## Icons and Density (confirmed)
- Subtle leading icons are allowed in Setting Cards. Use 16px line icons with low emphasis color in `.setting-header`.
- Compact density preferred throughout: use `.is-compact` where possible; padding targets 12px for compact, 16px for standard.

## Danger Styling (confirmed)
- Use a standard Section Box with a warning-accent header (e.g., tinted background or border-left). Buttons remain `btn btn-danger`.

## Language (confirmed)
- All labels/microcopy remain Norwegian.

## Lønn (Wage) — Detailed View Blueprint

1) Section Box: Lønnsmodell
- Header: “Lønnsmodell”; Description: “Virke-tariff eller egendefinert”
- Body:
  a) Setting Card — Bruk Virke-tariff (.is-compact)
  - Toggle: `#usePresetToggle` → `app.togglePreset()`; controls visibility of preset vs custom sections

  b) Setting Card — Virke-tariff (.is-standard) [shown when preset enabled]
  - Select: `#wageSelect` → `app.updateWageLevel(this.value)` with options listed in settings.md

  c) Setting Card — Egendefinert lønn (.is-standard) [shown when preset disabled]
  - Number input: `#customWageInput` → `app.updateCustomWage(this.value)` (step 0.01)

2) Section Box: Mål og utbetaling
- Body:
  a) Setting Card — Månedsmål (.is-standard)
  - Input: `#monthlyGoalInput`; Button: `#saveMonthlyGoalBtn` (prominent placement)

  b) Setting Card — Lønnsdato (.is-compact)
  - Number input: `#payrollDayInput` → `app.updatePayrollDay(this.value)` (1–31)

Note: Auto-save applies to toggles/inputs; “Lagre” only for the goal button as per existing flow.

## Avansert lønn (Advanced Wage) — Detailed View Blueprint

1) Section Box: Tillegg
- Long Setting Card — Tillegg (.is-long)
  - Header: “Tillegg” with brief `.form-hint` about ikke-overlappende tidsrom
  - Body: Three vertically stacked groups (confirmed layout)
    - Ukedag: container `#weekdayBonusSlots`, Add button → `app.addBonusSlot('weekday')`
    - Lørdag: container `#saturdayBonusSlots`, Add button → `app.addBonusSlot('saturday')`
    - Søndag: container `#sundayBonusSlots`, Add button → `app.addBonusSlot('sunday')`
  - Rules: Several supplements per period allowed; time-of-day ranges must not overlap (validated in logic)
  - Rows: time range + sats/prosent + Edit/Fjern
  - Save: Auto-save on row changes; confirm on remove

2) Section Box: Pausetrekk
- Setting Card — Pausetrekk aktivert (.is-compact)
  - Toggle: `#pauseDeductionEnabledToggle` controlling `#breakDeductionSubsection`

- Setting Card — Metode (.is-standard)
  - Basic method select: `#pauseDeductionMethodSelect` with options proportional/base_only/end_of_shift
  - Method info (always visible): `#proportionalInfo`, `#baseOnlyInfo`, `#endOfShiftInfo`, `#noneInfo`
  - Enterprise replacement: `#breakPolicySelect` shown instead of basic select when subscription active; same card, different control

- Setting Card — Grenser (.is-standard)
  - Pausegrense: `#pauseThresholdInput` (0–24, step 0.5)
  - Trekk minutter: `#pauseDeductionMinutesInput` (0–120, step 15)

3) Section Box: Skatt
- Setting Card — Skattetrekk (.is-compact)
  - Toggle: `#taxDeductionToggle` → `app.toggleTaxDeduction(this.checked)` controlling visibility of percentage card

- Setting Card — Skatteprosent (.is-standard)
  - Number input: `#taxPercentageInput` → `app.updateTaxPercentage(this.value)` (0–100, step 0.5)

## Utseende (Interface) — Detailed View Blueprint

1) Section Box: Tema
- Setting Card — Tema (.is-compact)
  - Radios: `light` (`#themeLight`), `dark` (`#themeDark`), `system` (`#themeSystem`)

2) Section Box: Visning av vakter
- Setting Card — Standardvisning (.is-compact)
  - Toggle: `#defaultShiftsViewToggle` (liste vs kalender)

3) Section Box: Bedriftsfunksjoner
- Setting Card — Vis bedriftsfanen (.is-compact)
  - Toggle: `#showEmployeeTabToggle`; enabled only with enterprise subscription
  - Logic: Saves to `app.showEmployeeTab`, calls `app.saveSettingsToSupabase()` and `app.updateTabBarVisibility()`
- Setting Card — Oppgrader (.is-compact, shown when no subscription)
  - Button: `onclick="app.openSubscription()"` (btn-primary) with copy “Oppgrader til Enterprise”

4) Section Box: Tidsregistrering og format
- Setting Card — Direkte tidsinput (.is-compact)
  - Toggle: `#directTimeInputToggle`
- Setting Card — Minuttintervall (.is-compact)
  - Toggle: `#fullMinuteRangeToggle`
- Setting Card — Valutavisning (.is-compact)
  - Toggle: `#currencyFormatToggle` (NOK vs kr)

## Data — Detailed View Blueprint

1) Section Box: Eksport
- Setting Card — Periode (.is-standard)
  - Radios: `name="exportPeriod"` with options current/year/all/custom; label for current is `#currentMonthLabel`
  - Conditional area: `#customPeriodSection` with `#exportStartDate` and `#exportEndDate`
- Setting Card — Eksporter (.is-compact)
  - Buttons: CSV → `app.exportDataWithPeriod('csv')`, PDF → `app.exportDataWithPeriod('pdf')`

2) Section Box: Lønnsrapport (Enterprise)
- Setting Card — Eksporter lønnsrapport (.is-compact, subscription only)
  - Button: `app.openCsvExportModal()`

3) Section Box: Import
- Setting Card — Importer data (.is-standard)
  - File input: `#importFileData` (accept .csv, .json)
  - Button: `app.importDataFromDataTab()`

## Error/Empty States
- Empty list: show a neutral placeholder within the card (icon + “Ingen tillegg lagt til”)
- Inline errors under the associated control using `.form-hint` with error color
- Keep error messages concise and actionable

## Implementation Notes
- We will extend `app/src/css/style.css` minimally to add `.settings-section`, `.settings-section-body`, `.setting-card`, `.setting-header`, `.setting-body`, `.setting-actions`, `.supplement-list`, `.supplement-row` while reusing existing tokens and switch styles
- Keep DOM lightweight and resilient to mobile viewport changes; avoid nested scroll regions inside cards
- Ensure all IDs/events listed in `settings.md` are preserved for logic wiring

## Done vs. Next
- This design file establishes the visual/layout contract for all detailed views (Konto, Lønn, Avansert lønn, Utseende, Data)
- Decisions locked: auto-save, three vertical Tillegg-grupper, subtle icons, compact density, standard danger section header, Norwegian copy
- First implementation target: Konto detailed view following the blueprint above

