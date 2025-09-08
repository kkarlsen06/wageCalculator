# Settings Implementation Prompts

These are copy‑paste friendly, self‑contained prompts to implement each detailed settings view one at a time. Follow both `settings.md` and `settingsdesign.md` exactly. Keep IDs stable so logic in `app/src/js/appLogic.js` works without regressions. Ensure full wiring from UI → client logic → backend → DB.

General rules
- Follow `settings.md` and `settingsdesign.md` for structure, IDs, and UX.
- Use `window.CONFIG.apiBase` for API calls; include `Authorization: Bearer <token>` via Supabase session.
- Never expose server-only secrets. Use only the publishable Supabase client on the frontend.
- Preserve Supabase RLS assumptions (manager/user filters) and existing ownership checks.
- Keep changes focused; reuse tokens/classes from `app/src/css/style.css` and add only minimal CSS for new components from `settingsdesign.md`.
- Auto-save on blur/change; show clear errors; avoid deep nesting; keep density compact.

Repo anchors
- UI route: `app/src/pages/settings.js`
- Client logic: `app/src/js/appLogic.js`
- Styles: `app/src/css/style.css`
- Backend: `server/server.js`, `server/middleware/auth.js`, `server/lib/auth/verifySupabaseJwt.js`
- Docs: `settings.md`, `settingsdesign.md`

---

Prompt: Konto (Account) — Part 1/3: Layout, Profil, Navigasjon

Context to load (read now)
- settings.md
- settingsdesign.md
- app/src/pages/settings.js
- app/src/js/appLogic.js
- app/src/css/style.css
- server/server.js

You are implementing the Konto detailed view UI using the “section box + setting cards” design.

Do this
- Build `getAccountDetail()` markup in `app/src/pages/settings.js` using:
  - One `.settings-section` (“Konto”) with description and stacked `.setting-card`s.
  - Cards: Profilinformasjon (name/email), Profilbilde, Tilkoblinger, Handlinger.
  - Collapsible Section Box “Farlige handlinger” (collapsed) with delete‑all.
- Use the exact element IDs from `settings.md` (account* IDs) for inputs, avatar, buttons, crop modal, progress.
- Wire navigation buttons: `Lukk` and `Tilbake` as in other detail views.
- Call initializers in `afterMountSettings()` when section === `account`:
  - `app.loadAccountData()`; `app.initAccountAvatarControls()`; `app.initGoogleLinkButton()`; `app.setupCollapsibleEventListeners()`.
- Ensure name auto-saves on blur/Enter via `app.updateAccount()`; email is disabled.
- If missing, add minimal CSS for `.settings-section`, `.settings-section-body`, `.setting-card`, `.setting-header`, `.setting-body`, `.setting-actions` with compact density from `settingsdesign.md`.

Wiring
- Keep IDs/handlers exactly as specified in `settings.md`.
- Ensure Google buttons exist (`#btn-link-google`, `#btn-unlink-google`, `#google-unlink-warning`).

Acceptance
- Visiting `/settings/account` renders the boxed layout with all cards present.
- Tab/keyboard order is logical; labels bound with `for`.
- Auto-save fires for name; no console errors.

---

Prompt: Konto (Account) — Part 2/3: Avatar opplasting og beskjæring

Context to load (read now)
- settings.md
- settingsdesign.md
- app/src/pages/settings.js
- app/src/js/appLogic.js
- app/src/css/style.css
- server/server.js

You are implementing the full avatar upload/crop flow for Konto.

Do this
- Ensure DOM elements/IDs from `settings.md` exist in `getAccountDetail()`:
  - Preview: `#accountAvatarPreview`, `#accountAvatarImage`, `#accountAvatarPlaceholder`
  - Controls: `#accountAvatarChooseBtn`, `#accountAvatarRemoveBtn`, hidden `#accountAvatarInput`
  - Progress: `#accountPictureProgress`, `#accountPictureProgressFill`, `#accountPictureProgressText`
  - Crop modal: `#cropModal`, `#cropImage`, `#cropZoomSlider`, `#zoomOutBtn`, `#zoomInBtn`, `#cancelCropBtn`, `#confirmCropBtn`
- Update/implement `app.initAccountAvatarControls()` to:
  - Handle file pick → preview → open crop modal → zoom controls → confirm/cancel.
  - On confirm, upload via backend `POST /user/avatar` (no client secrets), show progress using `app.updateAccountPictureProgress(percentage, text)`.
  - Persist `profile_picture_url` via server; update preview on success; handle errors gracefully.
- Ensure accessibility (focus trap inside modal; ESC closes; buttons have labels).

Wiring
- Backend: use `POST /user/avatar` in `server/server.js`; include bearer token.
- Client: reuse existing Supabase client for auth; never include service role keys.

Acceptance
- Choosing a file opens crop modal; zoom works; confirm uploads and updates preview; remove resets to placeholder.
- Progress bar reflects state; handles errors with user‑friendly messages.

---

Prompt: Konto (Account) — Part 3/3: Google-tilkobling, handlinger og farlige handlinger

Context to load (read now)
- settings.md
- settingsdesign.md
- app/src/pages/settings.js
- app/src/js/appLogic.js
- app/src/css/style.css
- server/server.js

You are wiring the remaining Konto features.

Do this
- Google: Initialize `app.initGoogleLinkButton()`; toggle visibility between `#btn-link-google` and `#btn-unlink-google`; show `#google-unlink-warning` when linked; implement unlink flow with confirmation.
- Handlinger: Implement “Start onboarding på nytt” → `app.restartOnboarding()`.
- Farlige handlinger: Collapsible with `data-toggle-section="dangerousActions"` and container `#dangerousActions`; button “Slett alle vakter” calls `app.clearAllShifts()` with confirmation.
- Ensure events are debounced where necessary and all operations show status/errors.

Wiring
- Use `GET/PUT /settings` for any flags you persist; use Supabase RLS‑compatible filters.
- Keep copy in Norwegian; keep compact density.

Acceptance
- Link/unlink Google works and persists state; onboarding restart and delete‑all prompt and act correctly; no console errors.

---

Prompt: Lønn (Wage) — Part 1/2: Lønnsmodell og lønnsvalg

Context to load (read now)
- settings.md
- settingsdesign.md
- app/src/pages/settings.js
- app/src/js/appLogic.js
- app/src/css/style.css
- server/server.js

You are implementing the Lønn detailed view UI and core wage model selection.

Do this
- Build two Section Boxes per `settingsdesign.md`:
  - “Lønnsmodell”: cards for `#usePresetToggle`, `#wageSelect`, `#customWageInput`.
  - “Mål og utbetaling”: will host goal/date (next prompt).
- Implement preset toggle `#usePresetToggle` → `app.togglePreset()` to show/hide preset vs custom.
- Implement wage level select `#wageSelect` → `app.updateWageLevel(this.value)` with options from `settings.md`.
- Implement custom wage input `#customWageInput` → `app.updateCustomWage(this.value)` (step `0.01`).

Wiring
- Auto-save on change; persist via `app.saveSettingsToSupabase()` if used downstream.
- Validate numeric inputs; display inline errors with `.form-hint` if invalid.

Acceptance
- Toggling preset switches the visible card; changing either value persists; reload shows same state.

---

Prompt: Lønn (Wage) — Part 2/2: Månedsmål og lønnsdato

Context to load (read now)
- settings.md
- settingsdesign.md
- app/src/pages/settings.js
- app/src/js/appLogic.js
- app/src/css/style.css
- server/server.js

You are finishing the Lønn view.

Do this
- Add cards in Section Box “Mål og utbetaling”:
  - Månedsmål: `#monthlyGoalInput` + `#saveMonthlyGoalBtn` (button save allowed as per flow).
  - Lønnsdato: `#payrollDayInput` (1–31) → `app.updatePayrollDay(this.value)`.
- Validate 1–31; default 15; show inline error if needed; auto-save on change (except goal button which triggers explicit save).

Wiring
- Persist settings via existing logic and/or `PUT /settings`; include Authorization header.

Acceptance
- Monthly goal saves and persists; payroll day validates and persists; reload restores values.

---

Prompt: Avansert lønn (Advanced Wage) — Part 1/3: Tillegg (Ukedag/Lørdag/Søndag)

Context to load (read now)
- settings.md
- settingsdesign.md
- app/src/pages/settings.js
- app/src/js/appLogic.js
- app/src/css/style.css
- server/server.js

You are implementing the long card for supplements with three vertical groups.

Do this
- Create Section Box “Tillegg” with one `.setting-card.is-long` as in `settingsdesign.md`.
- Add groups:
  - Ukedag: container `#weekdayBonusSlots` and “Legg til” → `app.addBonusSlot('weekday')`
  - Lørdag: container `#saturdayBonusSlots` and “Legg til” → `app.addBonusSlot('saturday')`
  - Søndag: container `#sundayBonusSlots` and “Legg til” → `app.addBonusSlot('sunday')`
- Render existing slots and new ones as `.supplement-row` with time range + sats/prosent + Edit/Fjern.
- Enforce: multiple supplements allowed per period; time‑of‑day ranges must not overlap (validate on create/update; error inline).
- Auto-save each change; confirm on remove; preserve scroll position.

Wiring
- Persist in settings via `PUT /settings` or the established data structure used by `app.addBonusSlot()`.
- Ensure RLS compatibility and stable shapes.

Acceptance
- Add/edit/remove works in all three groups; overlap validation prevents conflicts; state persists across reloads.

---

Prompt: Avansert lønn (Advanced Wage) — Part 2/3: Pausetrekk

Context to load (read now)
- settings.md
- settingsdesign.md
- app/src/pages/settings.js
- app/src/js/appLogic.js
- app/src/css/style.css
- server/server.js

You are implementing pause deduction controls, basic and enterprise variants.

Do this
- Add Section Box “Pausetrekk” with cards:
  - Toggle: `#pauseDeductionEnabledToggle` controlling visibility of `#breakDeductionSubsection`.
  - Metode (basic): `#pauseDeductionMethodSelect` with options proportional/base_only/end_of_shift and always‑visible method info blocks `#proportionalInfo`, `#baseOnlyInfo`, `#endOfShiftInfo`, `#noneInfo`.
  - Enterprise policy: `#breakPolicySelect` replaces the basic select when subscription is active; same card, different control.
  - Grenser: `#pauseThresholdInput` and `#pauseDeductionMinutesInput` with ranges from `settings.md`.
- Auto-save on change; inline validation and messaging.

Wiring
- Detect subscription via existing helpers; persist via `PUT /settings` using the appropriate keys.

Acceptance
- Toggle shows/hides subsection; method/policy persists; thresholds validate and persist; reload restores state.

---

Prompt: Avansert lønn (Advanced Wage) — Part 3/3: Skatt

Context to load (read now)
- settings.md
- settingsdesign.md
- app/src/pages/settings.js
- app/src/js/appLogic.js
- app/src/css/style.css
- server/server.js

You are wiring tax deduction controls.

Do this
- Add Section Box “Skatt” with cards:
  - Skattetrekk: toggle `#taxDeductionToggle` → `app.toggleTaxDeduction(this.checked)` controlling visibility of percentage.
  - Skatteprosent: `#taxPercentageInput` → `app.updateTaxPercentage(this.value)` (0–100, step 0.5).
- Auto-save on change; show inline errors if out of range.

Wiring
- Persist via existing settings mechanism; ensure consistent keys and DB schema.

Acceptance
- Toggle and percentage persist; reload restores; invalid values are prevented.

---

Prompt: Utseende (Interface) — Part 1/2: Tema og standardvisning

Context to load (read now)
- settings.md
- settingsdesign.md
- app/src/pages/settings.js
- app/src/js/appLogic.js
- app/src/css/style.css
- server/server.js

You are implementing theme and default view toggles.

Do this
- Section Box “Tema”: radios `#themeLight`, `#themeDark`, `#themeSystem` (name="theme").
- Section Box “Visning av vakter”: toggle `#defaultShiftsViewToggle` (list vs calendar default).
- Use compact `.setting-card` with subtle leading icons.

Wiring
- Persist via settings; when theme changes, apply immediately using existing theme system.

Acceptance
- Theme changes apply and persist; default view toggle persists and affects next app open.

---

Prompt: Utseende (Interface) — Part 2/2: Bedriftsfunksjoner, tidsregistrering og valuta

Context to load (read now)
- settings.md
- settingsdesign.md
- app/src/pages/settings.js
- app/src/js/appLogic.js
- app/src/css/style.css
- server/server.js

You are adding business features and input format toggles.

Do this
- Section Box “Bedriftsfunksjoner”:
  - Toggle `#showEmployeeTabToggle` (enabled only if enterprise). Save to `app.showEmployeeTab`, call `app.saveSettingsToSupabase()` and `app.updateTabBarVisibility()`.
  - When not subscribed, show upsell button `onclick="app.openSubscription()"` (btn-primary), copy “Oppgrader til Enterprise”.
- Section Box “Tidsregistrering og format”:
  - Toggles: `#directTimeInputToggle`, `#fullMinuteRangeToggle`, `#currencyFormatToggle`.

Wiring
- Respect enterprise gating; persist toggles via existing logic.

Acceptance
- Employee tab visibility reflects toggle + subscription; other toggles persist and affect UI behavior.

---

Prompt: Data — Part 1/2: Eksport

Context to load (read now)
- settings.md
- settingsdesign.md
- app/src/pages/settings.js
- app/src/js/appLogic.js
- app/src/css/style.css
- server/server.js

You are implementing export period and export actions.

Do this
- Section Box “Eksport”:
  - Radios `name="exportPeriod"` with options current/year/all/custom (use `#currentMonthLabel` for label where specified).
  - Conditional `.setting-card` with `#customPeriodSection` showing `#exportStartDate` and `#exportEndDate` when custom is selected.
  - Buttons: CSV `onclick="app.exportDataWithPeriod('csv')"`, PDF `onclick="app.exportDataWithPeriod('pdf')"`.
- Show inline validation for date ranges.

Wiring
- Ensure export calls backend `GET /reports/wages` or existing endpoints with the correct query range and auth.

Acceptance
- Period selection toggles custom date fields; exports initiate download/stream; invalid ranges are blocked with helpful messages.

---

Prompt: Data — Part 2/2: Lønnsrapport (Enterprise) og import

Context to load (read now)
- settings.md
- settingsdesign.md
- app/src/pages/settings.js
- app/src/js/appLogic.js
- app/src/css/style.css
- server/server.js

You are wiring payroll report export (enterprise) and file import.

Do this
- Section Box “Lønnsrapport” (enterprise only): button calling `app.openCsvExportModal()`.
- Section Box “Import”:
  - File input `#importFileData` (accept .csv, .json); button `app.importDataFromDataTab()`.
- Validate file type/size; show progress and results/errors.

Wiring
- Use existing server routes for report generation; honor subscription checks.
- For import, parse on client or server as per existing code; persist shifts/settings accordingly.

Acceptance
- Enterprise report opens modal/flows correctly; import handles valid files, errors are surfaced, and imported data appears in the app.

---

Backend/API wiring notes
- Settings persistence: `GET/PUT /settings` must include the authenticated user and respect RLS. Keep response shapes stable and backward‑compatible.
- Avatar upload: `POST /user/avatar` proxies to Supabase Storage server‑side; never use service keys on client.
- Reports export: `GET /reports/wages` produces CSV; PDF if implemented.
- Feature flags/config: `GET /config` if needed for gating.

Testing checklist (per view)
- UI renders with section boxes and compact setting cards
- All IDs match `settings.md`; event handlers trigger updates
- Values persist and reload correctly (round‑trip to DB)
- Collapsibles toggle and are accessible (`aria-expanded` etc.)
- Destructive actions gated with confirmation; no secrets/log leaks
- No console errors; mobile viewport behaves; keyboard navigation works
