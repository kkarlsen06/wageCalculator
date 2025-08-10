# AI Agent Fix Prompts

## P0 - Missing `/reports/wages` CSV Export API

### Prompt for AI Agent:

```
TASK: Implement a complete /reports/wages CSV export endpoint for the employee management system.

REQUIREMENTS:
1. Create GET /reports/wages endpoint in server.js
2. Use employee_shifts table with snapshot data (NOT live employee data)
3. Support query parameters: ?from=YYYY-MM-DD&to=YYYY-MM-DD&employee_id=uuid
4. Stream CSV to prevent memory issues with large datasets
5. Include columns: employee_name, shift_date, start_time, end_time, duration_hours, break_minutes, break_policy_used, paid_hours, tariff_level_snapshot, hourly_wage_snapshot, gross_wage
6. Use existing calcEmployeeShift() function from payroll/calc.js for calculations
7. Apply manager_id ownership validation (manager_id = auth.uid())
8. Block AI agent access with isAiAgent() check
9. Handle errors gracefully with proper HTTP status codes

EXAMPLE IMPLEMENTATION PATTERN:
- Query employee_shifts with manager ownership filter
- Stream response with proper CSV headers
- Use existing org settings for break policy calculations
- Format times as HH:mm, dates as YYYY-MM-DD
- Round currency to 2 decimal places

INTEGRATION POINTS:
- Use existing getOrgSettings() for break policy
- Use existing calcEmployeeShift() for wage calculations
- Follow existing authentication patterns with authenticateUser middleware
- Use existing error handling patterns

VALIDATION:
- Ensure CSV matches the sample in SAMPLE_WAGE_REPORT.csv
- Test with boundary case: 5.5h vs 5.51h shifts with break policy
- Verify manager can only access their own employee shifts
```

---

## P1.3 - Remove Avatar System Completely

### Prompt for AI Agent:

```
TASK: Completely remove all avatar-related functionality from the employee management system.

SCOPE: Remove avatar features while keeping all other employee functionality intact.

FILES TO MODIFY:
1. kalkulator/js/employeeModal.js - Remove avatar processing functions and UI
2. kalkulator/js/employeeService.js - Remove avatar upload/read methods  
3. kalkulator/js/employeeCarousel.js - Remove avatar display logic
4. kalkulator/css/style.css - Remove avatar-related styles
5. kalkulator/index.html - Remove avatar UI elements
6. docs/OPENAPI.yaml - Remove avatar endpoints from documentation

SPECIFIC ACTIONS:
1. Remove avatar file input from employee modal
2. Remove avatar processing functions (processAvatarFile, etc.)
3. Remove avatar display in employee carousel tiles
4. Replace avatar displays with initials-only circles
5. Remove commented-out avatar endpoints in server.js
6. Remove avatar-related error handling
7. Update employee form validation to not reference avatars
8. Remove avatar-related test code

KEEP INTACT:
- All other employee CRUD functionality
- Employee name, wage, tariff level, colors
- Initials-based display (first letter of name)
- All shift management features
- All existing styling except avatar-specific

VALIDATION:
- Employee modal should work without avatar options
- Employee carousel should show initials in colored circles
- No broken UI elements or JavaScript errors
- All employee tests should still pass
- Clean removal of avatar references in documentation
```

---

## P2.5 & P2.6 - Test Script Naming + Schema Documentation

### Combined Prompt for AI Agent:

```
TASK: Fix test script naming inconsistencies and update schema documentation to match reality.

PART 1 - TEST SCRIPT NAMING:
Fix inconsistent npm script names in package.json:

ISSUES TO FIX:
- Script name mismatch: "test:e2e:wages-policies" vs expected "test:e2e-wages-and-policies"
- Standardize naming convention across all test scripts
- Ensure all test files can be executed via npm run commands

ACTIONS:
1. Review package.json scripts section
2. Standardize test naming convention (use consistent separators)
3. Verify all test files in dev-tests/ have corresponding npm scripts
4. Update any documentation that references old script names

PART 2 - SCHEMA DOCUMENTATION:
Update schema documentation to reflect the actual working database schema:

FILES TO UPDATE:
1. manager_employee_feat/EMPLOYEE_IMPLEMENTATION.md
2. docs/OPENAPI.yaml  
3. README.md or main documentation files

CORRECTIONS NEEDED:
1. Document that employee_shifts table EXISTS and is functional
2. Add tariff_level column to employees table documentation
3. Correct any schema mismatches between docs and working implementation
4. Update API documentation to match actual endpoint responses
5. Add clear note about avatar functionality being disabled

EVIDENCE TO REFERENCE:
- employee_shifts working: server.js:2808-2820
- Snapshot fields: employee_name_snapshot, tariff_level_snapshot, hourly_wage_snapshot
- Existing RLS policies in docs/rls_policies.sql

VALIDATION:
- All npm test scripts should run without "script not found" errors
- Documentation should accurately reflect the working system
- No references to missing tables or non-existent features
- Clear separation between implemented and planned features
```
