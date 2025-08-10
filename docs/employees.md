# Employee Management System

This document describes the complete employee management system implementation, including CRUD operations, feature flags, and health monitoring. Avatars are disabled; only initials are used.

## Overview

The employee management system provides complete CRUD operations for managing employees and controlled rollout via feature flags. The system follows the PLACEHOLDER_EMPLOYEES_V1 ruleset where employees are manager-owned placeholders, not real user accounts.

## API Endpoints

### Employee CRUD Operations

#### GET /employees
List all employees for the authenticated manager.

**Query Parameters:**
- `include_archived=1` - Include archived employees in the response (default: exclude)

**Response:**
```json
{
  "employees": [
    {
      "id": "uuid",
      "name": "Employee Name",
      "email": "email@example.com",
      "hourly_wage": 250.50,
      "birth_date": "1990-05-15",
  "display_color": "#3498db",
      "created_at": "2025-01-08T10:00:00Z",
      "archived_at": null
    }
  ]
}
```

#### POST /employees
Create a new employee.

**Request Body:**
```json
{
  "name": "Employee Name",           // Required
  "email": "email@example.com",     // Optional, must be valid email format
  "hourly_wage": 250.50,            // Optional, must be >= 0
  "birth_date": "1990-05-15",       // Optional, must be YYYY-MM-DD format
  "display_color": "#3498db"        // Optional
}
```

**Validation Rules:**
- `name`: Required, non-empty string
- `email`: Optional, valid email format if provided
- `hourly_wage`: Optional, number >= 0 if provided
- `birth_date`: Optional, YYYY-MM-DD format if provided
- `(manager_id, name)`: Must be unique among non-archived employees

**Response:** `201 Created`
```json
{
  "employee": {
    "id": "uuid",
    "name": "Employee Name",
    "email": "email@example.com",
    "hourly_wage": 250.50,
    "birth_date": "1990-05-15",
    "display_color": "#3498db",
    "created_at": "2025-01-08T10:00:00Z",
    "archived_at": null
  }
}
```

#### PUT /employees/:id
Update an existing employee.

**Request Body:** Same as POST, all fields optional
**Validation:** Same rules as POST
**Authorization:** Employee must belong to authenticated manager

**Response:** `200 OK` with updated employee object

#### DELETE /employees/:id
Soft delete (archive) an employee.

**Authorization:** Employee must belong to authenticated manager
**Effect:** Sets `archived_at` timestamp, preserves history
**FK Behavior:** Related `user_shifts.employee_id` set to NULL automatically

**Response:** `200 OK`
```json
{
  "employee": {
    "id": "uuid",
    "archived_at": "2025-01-08T10:30:00Z",
    // ... other fields
  },
  "message": "Employee archived successfully"
}
```

<!-- Avatars removed: no avatar endpoints -->

### Error Responses

**400 Bad Request** - Validation errors
```json
{
  "error": "Name is required"
}
```

**401 Unauthorized** - Missing or invalid auth token
```json
{
  "error": "Missing or invalid Authorization header"
}
```

**403 Forbidden** - Cross-tenant access attempt
```json
{
  "error": "Forbidden"
}
```

**409 Conflict** - Duplicate name or already archived
```json
{
  "error": "An employee with this name already exists"
}
```

**500 Internal Server Error** - Server errors
```json
{
  "error": "Failed to create employee"
}
```

## Architecture

### Server-Side Components

1. **Feature Flag Endpoint** (`/config`)
   - Returns feature flags configuration
   - Default: `{ features: { employees: true } }`
   - Controlled via `FEATURE_EMPLOYEES` environment variable

2. **Health Check Endpoint** (`/health/employees`)
   - Verifies RLS policies on `employees` and `user_shifts` tables
   - Validates FK constraint `user_shifts.employee_id -> employees.id ON DELETE SET NULL`
   - Probes `employee-avatars` bucket existence

### Client-Side Components

1. **Feature Flags Hook** (`kalkulator/js/featureFlags.js`)
   - Provides `useFeatureFlags()` and `useFeature()` functions
   - Implements caching (5-minute default)
   - Fallback: `employees: true`

## Enabling/Disabling the Feature

### Enable (Default State)
```bash
# Remove or set environment variable
unset FEATURE_EMPLOYEES
# OR
export FEATURE_EMPLOYEES=true
```

### Disable
```bash
# Set environment variable to false
export FEATURE_EMPLOYEES=false
```

### Verification
```bash
# Check feature flag status
curl https://your-domain.com/config

# Expected response when enabled:
# {"features":{"employees":true}}

# Expected response when disabled:
# {"features":{"employees":false}}
```

## Health Monitoring

### Health Check Endpoint

```bash
curl https://your-domain.com/health/employees
```

### Response Format

```json
{
  "timestamp": "2025-01-08T10:30:00.000Z",
  "status": "healthy|degraded|unhealthy",
  "checks": {
    "employees_rls": {
      "status": "ok|error",
      "enabled": true,
      "error": null
    },
    "user_shifts_rls": {
      "status": "ok|error", 
      "enabled": true,
      "error": null
    },
    "employee_id_fk": {
      "status": "ok|error",
      "exists": true,
      "on_delete_action": "SET NULL",
      "error": null
    },
    "employee_avatars_bucket": {
      "status": "ok|missing|error",
      "exists": true,
      "bucket_name": "employee-avatars",
      "error": null
    }
  }
}
```

### Status Meanings

- **healthy**: All checks pass
- **degraded**: Some non-critical components missing (e.g., avatar bucket)
- **unhealthy**: Critical errors (e.g., RLS not enabled, FK constraint missing)

## Database Requirements

### Required Tables

1. **employees** table with RLS enabled
   ```sql
   -- Verify RLS is enabled
   SELECT schemaname, tablename, rowsecurity 
   FROM pg_tables 
   WHERE tablename = 'employees';
   ```

2. **user_shifts** table with RLS enabled and FK constraint
   ```sql
   -- Verify FK constraint
   SELECT conname, confdeltype 
   FROM pg_constraint 
   WHERE conrelid = 'user_shifts'::regclass 
   AND confrelid = 'employees'::regclass;
   ```

### Required Storage

1. **employee-avatars** bucket (private)
   - Used for employee profile pictures
   - Access via server-signed URLs only

## Rollback Procedures

### Emergency Rollback (Immediate)

1. **Disable feature flag**
   ```bash
   export FEATURE_EMPLOYEES=false
   # Restart application
   ```

2. **Verify rollback**
   ```bash
   curl https://your-domain.com/config
   # Should return: {"features":{"employees":false}}
   ```

### Graceful Rollback

1. **Monitor health endpoint** for issues
2. **Disable feature flag** during low-traffic period
3. **Verify client-side fallback** behavior
4. **Monitor error logs** for any issues

### Data Rollback (if needed)

```sql
-- Hide employees without deleting (preserves history)
UPDATE employees SET archived = true WHERE archived = false;

-- Remove employee associations from shifts (FK handles this automatically)
-- user_shifts.employee_id will be set to NULL due to ON DELETE SET NULL
```

## Risk Assessment

### Low Risk
- Feature flag toggle (immediate effect)
- Client-side fallback behavior
- Health monitoring

### Medium Risk  
- Database schema changes
- RLS policy modifications
- Storage bucket operations

### High Risk
- Data migration procedures
- FK constraint modifications
- Production rollbacks during peak hours

### Mitigation Strategies

1. **Gradual Rollout**
   - Enable for internal users first
   - Monitor health metrics
   - Gradual user base expansion

2. **Monitoring**
   - Health endpoint alerts
   - Error rate monitoring
   - Performance metrics

3. **Fallback Mechanisms**
   - Client-side fallbacks
   - Backwards compatibility
   - Graceful degradation

## Testing

### Unit Tests
```bash
# Run feature flag tests
npm run test:feature-flags

# Run health endpoint tests
npm run test:health

# Run employee CRUD tests
npm run test:employees

# Run comprehensive employee tests
npm run test:employees-complete

# Run all tests
npm run test:all
```

### Integration Tests

#### Employee CRUD Tests (`test-employees-crud.js`)
- Employee creation with validation
- Employee listing (with/without archived)
- Employee updates
- Employee archiving (soft delete)
- Cross-tenant security

#### Comprehensive Tests (`test-employees-complete.js`)
- Complete CRUD workflow
- Input validation for all fields
- Avatar signed URL generation
- Security and access control
- Duplicate name validation
- Archive/unarchive behavior

#### Health Tests (`test-health-employees.js`)
- RLS policy verification
- FK constraint validation
- Storage bucket checks

### Manual Testing Checklist

#### Core Functionality
- [ ] Employee CRUD operations work correctly
- [ ] Input validation prevents invalid data
- [ ] Unique name constraint enforced per manager
- [ ] Soft delete preserves history
- [ ] Avatar upload/download via signed URLs
- [ ] Cross-tenant access properly blocked

#### Feature Flags
- [ ] Feature flag toggle works
- [ ] Client-side fallback behavior
- [ ] Health endpoint returns correct status

#### Database Integrity
- [ ] RLS policies enforced
- [ ] FK constraints working (ON DELETE SET NULL)
- [ ] Backwards compatibility maintained

#### Security
- [ ] Authentication required for all endpoints
- [ ] Manager ownership validated on all operations
- [ ] No access to other managers' employees
- [ ] Signed URLs properly scoped to manager/employee

## Troubleshooting

### Common Issues

1. **Health check fails with RLS errors**
   ```sql
   -- Enable RLS on tables
   ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
   ALTER TABLE user_shifts ENABLE ROW LEVEL SECURITY;
   ```

2. **FK constraint missing**
   ```sql
   -- Add FK constraint with ON DELETE SET NULL
   ALTER TABLE user_shifts 
   ADD CONSTRAINT fk_employee_id 
   FOREIGN KEY (employee_id) 
   REFERENCES employees(id) 
   ON DELETE SET NULL;
   ```

3. **Avatar bucket missing**
   - Create bucket via Supabase dashboard
   - Set bucket to private
   - Configure appropriate policies

4. **Client-side feature flag not updating**
   ```javascript
   // Clear cache and refetch
   window.featureFlags.clearCache();
   const flags = await window.useFeatureFlags();
   ```

## Monitoring and Alerts

### Recommended Alerts

1. **Health endpoint returning unhealthy status**
2. **Feature flag fetch failures > 5% error rate**
3. **RLS policy violations**
4. **FK constraint violations**

### Metrics to Track

- Feature flag fetch success rate
- Health check response times
- Employee-related error rates
- Avatar upload/download success rates

## Support Contacts

- **Development Team**: For feature flag issues
- **DevOps Team**: For infrastructure and deployment
- **Database Team**: For RLS and FK constraint issues
