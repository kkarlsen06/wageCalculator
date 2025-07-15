# Shift Details Modal Double-Tap Fix

## Problem
The shift details modal opened from pressing the next shift card required two presses of the close button to close:
1. First press removed the background blur
2. Second press actually closed the modal

## Root Cause
The issue was caused by **duplicate event handlers** when clicking the next shift card:

1. **Direct event listener** in `updateNextShiftCard()` (line 2392) and `displayCurrentShiftCard()` (line 2474)
2. **Global event delegation** in `app.js` (lines 280-290)

Both handlers called `showShiftDetails()`, creating **two backdrop elements** with click handlers. When closing, the first click removed one backdrop, but the second remained active.

## Solution
Removed the redundant direct event listeners from:
- `updateNextShiftCard()` function (line 2392)
- `displayCurrentShiftCard()` function (line 2474)

The global event delegation in `app.js` already handles all shift item clicks properly.

## Files Modified
- `/workspace/kalkulator/js/appLogic.js` - Removed duplicate event listeners

## Result
- Modal now closes with a single tap of the close button
- No more backdrop layering issues
- Consistent behavior across all shift cards