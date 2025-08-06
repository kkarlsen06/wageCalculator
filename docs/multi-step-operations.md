# Multi-Step Operations in Wage Calculator Chat

## Overview

The wage calculator chat system now supports efficient multi-step operations, allowing users to perform complex requests in a single message without requiring multiple back-and-forth interactions.

## How It Works

### Backend Architecture

1. **Enhanced System Prompt**: The GPT model receives explicit instructions to perform multiple tool calls when appropriate
2. **Multiple Tool Call Support**: The `/chat` endpoint processes multiple tool calls in sequence within a single request
3. **Comprehensive Response**: GPT generates a unified response based on all tool results

### Frontend Enhancements

1. **Multi-Step Detection**: Automatically detects when a user message likely requires multiple operations
2. **Visual Indicators**: Shows appropriate loading states for complex operations
3. **Seamless UI Updates**: All changes are reflected in the interface after completion

## Supported Multi-Step Scenarios

### 1. Show and Modify Operations
```
"Vis meg alle vaktene denne uken og endre fredagens vakt til å starte 15:00"
```
- **Tool Calls**: `getShifts` → `editShift`
- **Result**: Shows current week shifts and updates Friday's start time

### 2. Multiple Additions
```
"Legg til vakt på mandag 09:00-17:00 og tirsdag 10:00-18:00"
```
- **Tool Calls**: `addShift` → `addShift`
- **Result**: Adds both shifts in one operation

### 3. Delete and Replace
```
"Slett alle vakter neste uke og legg til en ny serie mandag-fredag 08:00-16:00"
```
- **Tool Calls**: `deleteSeries` → `addSeries`
- **Result**: Clears next week and adds new shift series

### 4. Copy to Multiple Targets
```
"Kopier mandagens vakt til onsdag og fredag"
```
- **Tool Calls**: `copyShift` (with multiple targets)
- **Result**: Copies Monday shift to both days

### 5. Show and Delete
```
"Vis meg vaktene mine denne uka og slett den på fredag"
```
- **Tool Calls**: `getShifts` → `deleteShift`
- **Result**: Shows shifts and removes Friday shift

## Technical Implementation

### System Prompt Enhancement

The GPT model receives explicit instructions:
- Must perform multiple tool calls when requests require multiple operations
- Never ask users to wait or split operations across messages
- Provide comprehensive responses covering all operations

### Detection Patterns

The frontend detects multi-step operations using patterns like:
- `vis.*og.*endre` - "show and edit"
- `legg til.*og.*legg til` - "add and add"
- `slett.*og.*legg til` - "delete and add"
- Multiple "og" (and) conjunctions
- Sequential indicators like "først...så", "deretter"

### Visual Feedback

- **Single Operations**: Standard dots animation
- **Multi-Step Operations**: "Utfører flere operasjoner..." with enhanced indicator
- **Completion**: Comprehensive summary of all changes

## Benefits

1. **Improved User Experience**: No more waiting between operations
2. **Natural Language Support**: Users can express complex intentions naturally
3. **Efficient Workflow**: Multiple related changes in one interaction
4. **Consistent State**: All operations complete before UI updates

## Error Handling

- Individual tool failures don't stop other operations
- Comprehensive error reporting for failed operations
- Graceful fallbacks when GPT calls fail
- Clear user feedback for partial successes

## Examples in Practice

### Before (Multiple Messages Required)
```
User: "Vis meg vaktene mine denne uka"
Bot: "Her er vaktene dine: [list]"
User: "Endre fredagens vakt til å starte 15:00"
Bot: "Fredagens vakt er oppdatert"
```

### After (Single Message)
```
User: "Vis meg vaktene mine denne uka og endre fredagens vakt til å starte 15:00"
Bot: "Her er vaktene dine denne uka: [list]. Jeg har også endret fredagens vakt til å starte 15:00 som ønsket."
```

## Future Enhancements

- Progress indicators for very long operations
- Undo functionality for multi-step changes
- Batch operation confirmations
- Advanced natural language parsing for complex scenarios

## Testing

Run the test suite to verify multi-step functionality:
```bash
node dev-tests/test-multi-step-operations.js
```

This ensures all detection patterns work correctly and expected tool call sequences are triggered.
