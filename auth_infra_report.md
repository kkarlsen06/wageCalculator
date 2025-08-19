# Authentication Infrastructure Report

## Overview
This report identifies all Supabase environment variables and JWT-related authentication code in the wage calculator repository.

## Environment Variables

### Client-Side Environment Variables
**File: `src/runtime-config.js`**
- Lines 5-6: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` configuration
- Lines 35-38: Security check to remove server-only keys from client config

**File: `netlify.toml`**
- Lines 10-12: Environment variable configuration comments (deployment config)

**File: `readme.md`**
- Lines 98-99: Client-side environment variables documentation
- Lines 103-104: Server-side environment variables documentation

### Server-Side Environment Variables
**File: `server/server.js`**
- Lines 76-79: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` initialization and validation

## Authentication Code Usage

### Core Authentication Files

#### `kalkulator/js/appLogic.js` (26 occurrences)
Authentication-heavy file with multiple `getUser()` and `getSession()` calls:
- Line 292: Session retrieval
- Line 1176, 1294: User authentication with error handling
- Line 1184, 1325: Session retrieval after user auth
- Lines 1863, 2151, 3304, 6622, 6684, 6868, 6968, 7010, 7529, 8652, 8691, 8730, 9322, 10431: User authentication checks
- Lines 6635, 6853, 6947, 6995, 9244, 9678, 11224: Session retrievals

#### `kalkulator/js/app.js` (8 occurrences)
Main app authentication logic:
- Line 470: Quick session check
- Line 484, 568, 1075, 1155: User authentication
- Lines 505, 700, 1602: Session management

#### `kalkulator/js/auth.js` (6 occurrences)
Dedicated authentication module:
- Lines 46, 68, 343, 561, 693: Session management
- Line 332: User data retrieval with error handling

#### `server/server.js` (2 occurrences)
Server-side authentication:
- Line 347: JWT token validation via `getUser()`
- Line 1923: Authorization header processing for user authentication

#### `kalkulator/js/employeeService.js` (1 occurrence)
- Line 21: Session retrieval for employee operations

#### `kalkulator/js/employeeModal.js` (1 occurrence)
- Line 1651: Session check in employee modal

## Summary

### Files to be Modified (7 files total):
1. **`src/runtime-config.js`** - Environment variable configuration
2. **`server/server.js`** - Server-side Supabase initialization and JWT validation
3. **`kalkulator/js/appLogic.js`** - Extensive authentication logic (26 auth calls)
4. **`kalkulator/js/app.js`** - Core app authentication (8 auth calls)
5. **`kalkulator/js/auth.js`** - Authentication module (6 auth calls)
6. **`kalkulator/js/employeeService.js`** - Employee service authentication (1 auth call)
7. **`kalkulator/js/employeeModal.js`** - Modal authentication (1 auth call)

### Configuration Files:
- **`netlify.toml`** - Deployment environment configuration
- **`readme.md`** - Documentation of environment variables

### Total Authentication Calls: 44
- `getUser()` calls: 18
- `getSession()` calls: 26

### Environment Variables in Use:
- `VITE_SUPABASE_URL` (client-side)
- `VITE_SUPABASE_PUBLISHABLE_KEY` (client-side)  
- `SUPABASE_URL` (server-side)
- `SUPABASE_SERVICE_ROLE_KEY` (server-side)

## Notes
- No `jsonwebtoken` or `jose` libraries found in the codebase
- No custom `getClaims()` functions detected
- Authentication is primarily handled through Supabase client methods
- Server-side authentication uses Supabase's built-in JWT validation
