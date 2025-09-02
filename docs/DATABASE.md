## Database Model (Supabase)

Tables referenced in code:

- `employees`
  - Manager-owned placeholder employees (not auth users)
  - Key fields: `id`, `manager_id`, `name`, `email`, `hourly_wage`, `tariff_level`, `birth_date`, `display_color`, `created_at`, `archived_at`
  - Unique per manager on `(manager_id, name)`

- `employee_shifts`
  - Authoritative shift history with immutable wage context
  - Snapshots: `employee_name_snapshot`, `tariff_level_snapshot`, `hourly_wage_snapshot`
  - Derived fields computed server-side for responses: `duration_hours`, `paid_hours`, `gross`
  - The server applies the active org break policy (`org-settings.break_policy`) when calculating `paid_hours`

- `user_shifts`
  - Personal planner shifts for the logged-in manager (used by `/shifts`)

- `user_settings`
  - Per-user preferences such as `custom_wage`, `profile_picture_url`, and UI options
  - Fields of note:
    - `custom_wage` (number): optional override of computed/preset wage
    - `profile_picture_url` (text, nullable): user avatar
    - `show_employee_tab` (boolean): Enterprise-only UI preference to show/hide the “Ansatte” tab; defaults to true

- `audit_log`
  - Recent audit events; includes redaction and payload truncation

- Storage bucket `profile-pictures`
  - Avatar uploads go via the backend to this bucket

### Payroll Calculation

Implemented in `server/payroll/calc.js`:

- `computeDurationHours(start, end)` → Handles cross-midnight and exact 24h shifts
- `applyBreakPolicy(hours, breakMinutes, policy)` → Supported policies:
  - `fixed_0_5_over_5_5h`
  - `none`
  - `proportional_across_periods`
  - `from_base_rate`
- `calcEmployeeShift(shift, org)` → Returns `{ durationHours, paidHours, gross, breakPolicyUsed }`

Edge cases covered:
- Cross-midnight shifts and 24h identical start/end are handled in duration
- Policy-based deductions are applied in addition to explicit `break_minutes`

### RLS

Row-Level Security policies should ensure:
- Users only see/modify their own `employees`, `employee_shifts`, `user_shifts`, and `user_settings`
- AI-agent users (if any) cannot perform writes

Refer to `docs/rls_policies.sql` for a starting point.


