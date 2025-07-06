# Settings Modal Changes Summary

## Overview
The settings modal has been converted from using JavaScript-based dynamic height adjustment to a fixed viewport-based size that doesn't change with tabs.

## Changes Made

### 1. CSS Updates (`kalkulator/css/style.css`)

**Fixed viewport-based sizing:**
- Removed dynamic height adjustments
- Added fixed `height: 85vh` (90vh on mobile, 92vh on small screens)  
- Added `max-height: 700px` (650px on mobile, 600px on small screens)
- Added `min-height: 500px` (450px on mobile, 400px on small screens)
- Increased `max-width` to `520px` for better content visibility

**Flexbox layout:**
- Added `display: flex` and `flex-direction: column` to modal content
- Made modal header `flex-shrink: 0` (instead of sticky)
- Made tab navigation `flex-shrink: 0`
- Added `tab-content-wrapper` with `flex: 1` and `overflow-y: auto`

**Responsive design:**
- Desktop: `92vw` width, `85vh` height, max 700px height
- Tablet (≤600px): `95vw` width, `90vh` height, max 650px height  
- Mobile (≤480px): `98vw` width, `92vh` height, max 600px height

### 2. HTML Structure Updates (`kalkulator/app.html`)

**Added scrollable wrapper:**
- Wrapped all tab content in a new `<div class="tab-content-wrapper">`
- This container handles scrolling for all tabs uniformly

### 3. JavaScript Updates (`kalkulator/js/appLogic.js`)

**Removed dynamic height adjustment:**
- Completely removed the `adjustSettingsModalHeight()` method
- Removed all calls to `adjustSettingsModalHeight()` from:
  - `switchSettingsTab()` 
  - `togglePresetSections()`
  - `addBonusSlot()`
  - `removeBonusSlot()`
  - `openSettings()`
  - `setupNewSettingsListeners()`

**Fixed broken setTimeout blocks:**
- Cleaned up empty setTimeout blocks left from removing height adjustment calls

## Benefits

1. **Consistent size**: Modal no longer changes size when switching tabs
2. **Better performance**: No JavaScript calculations for height
3. **Predictable UX**: Users always see the same modal size
4. **Responsive**: Adapts to different screen sizes while maintaining consistency
5. **Scrollable content**: Long content scrolls within the modal instead of changing modal size

## Technical Details

The modal now uses a flexbox layout where:
- Modal header and tab navigation are fixed at the top
- Tab content wrapper takes remaining space and scrolls when needed
- Overall modal size is fixed based on viewport dimensions with responsive breakpoints

The viewport-based approach ensures the modal is as large as possible while maintaining good proportions and usability across all device sizes.