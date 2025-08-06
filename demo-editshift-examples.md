# Demo: Enhanced editShift Functionality

## Overview
The editShift tool has been enhanced to allow users to edit shifts without needing to know the shift ID. Users can now specify a shift by date and start time, making the interaction much more natural.

## Before vs After

### Before (Required ID)
```
User: "Kan du endre skiftet mitt den 12. august til å slutte 18:00?"
Bot: "Jeg trenger ID-en til skiftet for å kunne redigere det. Kan du oppgi shift_id?"
User: "Jeg vet ikke ID-en..."
Bot: "Du kan finne ID-en ved å liste skiftene dine først."
```

### After (Date + Time)
```
User: "den 12. slutter jeg 18 i stedet"
Bot: "Skiftet er oppdatert! Du slutter nå 18:00 den 12. august. 👍"
```

## Technical Implementation

### Schema Changes
```javascript
// OLD Schema
{
  name: 'editShift',
  parameters: {
    properties: {
      shift_id: { type: 'integer' },
      shift_date: { type: 'string', description: 'New date (optional)' },
      start_time: { type: 'string', description: 'New start time (optional)' },
      end_time: { type: 'string', description: 'New end time (optional)' }
    },
    required: ['shift_id']  // ❌ Always required ID
  }
}

// NEW Schema
{
  name: 'editShift',
  parameters: {
    properties: {
      shift_id: { type: 'integer', description: 'ID (optional if date+time provided)' },
      shift_date: { type: 'string', description: 'Date to find/edit YYYY-MM-DD' },
      start_time: { type: 'string', description: 'Start time to find HH:mm' },
      new_start_time: { type: 'string', description: 'New start time (optional)' },
      new_end_time: { type: 'string', description: 'New end time (optional)' },
      end_time: { type: 'string', description: 'Legacy new end time (optional)' }
    },
    required: []  // ✅ No required fields
  }
}
```

### Backend Logic
```javascript
if (args.shift_id) {
  // Find by ID (existing behavior)
  existingShift = await findShiftById(args.shift_id);
} else if (args.shift_date && args.start_time) {
  // Find by date+time (new behavior)
  const shifts = await findShiftsByDateAndTime(args.shift_date, args.start_time);
  
  if (shifts.length === 0) {
    return 'ERROR: Fant ikke skiftet for den datoen og tiden';
  } else if (shifts.length > 1) {
    return 'ERROR: Flere skift funnet. Vennligst presiser hvilken du vil redigere';
  } else {
    existingShift = shifts[0];
  }
}
```

## User Examples

### Example 1: Change End Time
```
User: "den 12. slutter jeg 18 i stedet"

GPT Call:
editShift({
  shift_date: "2025-08-12",
  start_time: "09:00",  // Inferred from existing shift
  new_end_time: "18:00"
})

Result: "Skiftet er oppdatert! Du slutter nå 18:00 den 12. august. 👍"
```

### Example 2: Change Start Time
```
User: "mandag starter jeg 10:00 i stedet for 09:00"

GPT Call:
editShift({
  shift_date: "2025-08-11",  // Monday
  start_time: "09:00",       // Original start time
  new_start_time: "10:00"
})

Result: "Skiftet er oppdatert! Du starter nå 10:00 på mandag. 👍"
```

### Example 3: Change Both Times
```
User: "endre skiftet 15. august fra 14:00 til å være 15:00-23:00"

GPT Call:
editShift({
  shift_date: "2025-08-15",
  start_time: "14:00",
  new_start_time: "15:00",
  new_end_time: "23:00"
})

Result: "Skiftet er oppdatert! Ny tid: 15:00-23:00 den 15. august. 👍"
```

## Error Handling

### Shift Not Found
```
User: "endre skiftet 20. august fra 10:00"
Result: "Fant ikke skiftet for den datoen og tiden."
```

### Multiple Shifts Found
```
User: "endre skiftet 18. august fra 09:00"  // If user has multiple 09:00 shifts
Result: "Flere skift funnet for samme dato og tid. Vennligst presiser hvilken du vil redigere."
```

### No Changes Specified
```
GPT Call: editShift({ shift_date: "2025-08-12", start_time: "09:00" })
Result: "Ingen endringer spesifisert."
```

## Benefits

1. **User-Friendly**: No need to remember or look up shift IDs
2. **Natural Language**: Users can speak naturally about their shifts
3. **Backward Compatible**: Existing ID-based editing still works
4. **Error Handling**: Clear messages for edge cases
5. **Flexible**: Supports partial updates (just start time, just end time, or both)

## System Prompt Update

The system prompt now includes:
> "Du kan redigere et skift ved å oppgi dato og starttid hvis du ikke har ID-en. Bruk editShift direkte med shift_date og start_time for å finne skiftet, og new_start_time/new_end_time for nye tider."

This informs GPT that it can use the new functionality directly without asking users for IDs.
