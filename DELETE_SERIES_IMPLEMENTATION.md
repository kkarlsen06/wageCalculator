# deleteSeries Implementation Complete

## ✅ Implementation Summary

The bulk deletion (deleteSeries) functionality has been successfully implemented according to the requirements:

### 1. ✅ Schema Added to Tools Array
- `deleteSeriesSchema` is already present in the `tools` array (line 150 in server.js)
- Updated schema description to support automatic "next week" deletion
- Made `week_number` and `year` optional parameters

### 2. ✅ Chat Route Logic Updated
- Modified `/chat` route to handle `criteria_type: "week"` without requiring specific week/year
- When no `week_number`/`year` provided, automatically calculates next week using `getNextWeeksDateRange(1)`
- Uses Europe/Oslo timezone for accurate week calculations
- Returns assistant message: "Slettet X vakter i neste uke."

### 3. ✅ System Prompt Enhanced
- Updated system prompt to guide GPT about deleteSeries usage
- Added instruction: "Når brukeren ber om å slette flere vakter (for eksempel 'slett vaktene mine neste uke'), bruk deleteSeries. Spør én gang om bekreftelse først."

### 4. ✅ Database Logic
- `supabase.from('user_shifts').delete()` with date range filtering
- Counts shifts before deletion to provide accurate feedback
- Handles error cases gracefully

## 🧪 Manual Test Scenarios

### Test Dialog 1: Next Week Deletion
```
User: "slett vaktene mine neste uke"
Expected GPT Response: "Er du sikker på at du vil slette alle vakter neste uke? [confirmation request]"

User: "ja"
Expected GPT Action: 
- Calls deleteSeries with criteria_type="week" (no week_number/year)
- Server calculates next week: 2025-08-11 to 2025-08-17
- Deletes shifts in that range
- Returns: "Slettet X vakter i neste uke."
```

### Test Dialog 2: Specific Week Deletion
```
User: "slett alle vakter i uke 42"
Expected GPT Action:
- Calls deleteSeries with criteria_type="week", week_number=42, year=2025
- Server uses getWeekDateRange(42, 2025)
- Returns: "Slettet X vakter i uke 42 i 2025."
```

## 🔧 Technical Details

### Date Range Calculation
- **Next Week**: Uses `getNextWeeksDateRange(1)` 
  - Finds start of current week (Monday)
  - Adds 7 days to get start of next week
  - Calculates end of next week (Sunday)
  - Returns ISO date strings (YYYY-MM-DD)

### Error Handling
- Validates criteria_type
- Counts shifts before deletion
- Returns appropriate error messages
- Handles database errors gracefully

### Security
- Requires user authentication
- Only deletes shifts belonging to authenticated user
- Confirmation required before bulk deletion

## 🚀 Deployment Ready

The implementation is complete and ready for testing. The bot will now:
1. Understand "slett vaktene mine neste uke" requests
2. Ask for confirmation before deletion
3. Automatically calculate next week dates
4. Provide clear feedback about deletion results
5. Stop saying "ikke finne vaktene" for bulk deletion requests

## 📝 Commit Message
```
feat(chat): enable deleteSeries for week / date-range

- Updated deleteSeries schema to support automatic next week deletion
- Modified handleTool to use getNextWeeksDateRange when week_number/year not provided  
- Enhanced system prompt to guide GPT to ask for confirmation before bulk deletion
- Added support for 'slett vaktene mine neste uke' without requiring specific week numbers
```
