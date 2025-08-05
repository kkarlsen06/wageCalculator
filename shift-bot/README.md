# Shift Bot - Supabase Integration

This project has been updated to use Supabase as the backend database instead of an in-memory store.

## Changes Made

### 1. Dependencies
- Added `@supabase/supabase-js` for database operations
- Updated `package.json` to include ES module type

### 2. Environment Variables
Added to `.env`:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for server-side operations

### 3. Database Schema
The application expects these Supabase tables:

#### `shifts` table
```sql
CREATE TABLE shifts (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  date DATE NOT NULL,
  start TIME NOT NULL,
  end TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `settings` table
```sql
CREATE TABLE settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  hourly_rate NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. API Endpoints

#### `GET /settings`
- **Authentication**: Required (JWT Bearer token)
- **Response**: `{ "hourly_rate": number }`
- **Default**: Returns `{ "hourly_rate": 0 }` if no settings found

#### `POST /chat`
- **Authentication**: Required (JWT Bearer token)
- **Request**: `{ "messages": Array<{role: string, content: string}> }`
- **Response**: 
  - If GPT calls `addShift`: `{ "system": string, "shifts": Array }`
  - Otherwise: `{ "assistant": string, "shifts": Array }`

### 5. Authentication
- Uses JWT Bearer tokens in `Authorization` header
- Validates tokens with Supabase auth
- Extracts `user_id` for database operations
- Returns 401 for missing/invalid tokens

### 6. Error Handling
- Comprehensive error handling for database operations
- Proper HTTP status codes
- Detailed error logging

## Usage

1. Set up your Supabase project and create the required tables
2. Update `.env` with your Supabase credentials
3. Start the server: `npm start`
4. Send requests with proper JWT authentication

## Testing

Run the test script to verify endpoints:
```bash
node test-endpoints.js
```

Note: You'll need valid JWT tokens from your Supabase auth for successful testing.
