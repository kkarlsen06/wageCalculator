Centralized payroll calculation module

Exports two pure functions:

- applyBreakPolicy(hours, breakMinutes, policy): returns automatic deduction in hours according to organization break policy
- calcEmployeeShift(shift, org): computes { durationHours, paidHours, gross, breakPolicyUsed }

Notes
- Break policies supported: fixed_0_5_over_5_5h, none; others stubbed to behave like none for now
- Inputs are not mutated; time math is minute-accurate and midnight-safe
- This module is authoritative for employee_shifts reports/summaries

