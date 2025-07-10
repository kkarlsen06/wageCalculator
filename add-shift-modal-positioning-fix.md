# Add Shift Modal Positioning Fix

## Issue
The add shift modal's bottom bar was extending beyond the viewport when the navigation bar was taken into consideration. The modal content was not properly centered with the navigation header in mind.

## Root Cause
The modal was positioned using full viewport height without accounting for the navigation bar (`.header`) which has a minimum height of 80px. This caused:
- Modal content to extend below the visible area
- Poor centering that didn't consider the header space
- Bottom buttons/footer becoming inaccessible on smaller screens

## Solution Applied

### 1. Desktop Modal Positioning
- **File**: `/workspace/kalkulator/css/style.css`
- **Changes**:
  - Added `max-height: calc(100vh - 100px)` to account for header (80px) + padding
  - Added `margin-top: 50px` to center modal below header
  - Updated modal body with `max-height: calc(100vh - 180px)` to prevent overflow
  - Added specific modal active positioning with `align-items: flex-start` and `padding-top: 50px`

### 2. Mobile Modal Positioning  
- **Changes**:
  - Updated mobile modal height to `calc(100vh - 80px)` to account for navigation header
  - Added `margin-top: 80px` to position modal below navigation header
  - Updated modal body height to `calc(100vh - 200px)` (nav header 80px + form actions 120px)
  - Reset desktop padding on mobile with `padding-top: 0`

### 3. Desktop Specific Sizing
- **Changes**:
  - Updated desktop modal max-height to `calc(90vh - 80px)` 
  - Added `margin-top: 10vh` for proper centering in available space

## Technical Details

### Key CSS Changes:

```css
/* Desktop positioning */
#addShiftModal .modal-content {
  max-height: calc(100vh - 100px);
  margin-top: 50px;
}

#addShiftModal .modal-body {
  max-height: calc(100vh - 180px);
}

#addShiftModal.active {
  align-items: flex-start;
  padding-top: 50px;
}

/* Mobile positioning */
@media (max-width: 768px) {
  #addShiftModal .modal-content {
    height: calc(100vh - 80px);
    margin-top: 80px;
  }
  
  #addShiftModal .modal-body {
    height: calc(100vh - 200px);
  }
  
  #addShiftModal.active {
    padding-top: 0;
  }
}
```

## Result
- Modal bottom bar now stays within viewport bounds
- Content is properly centered with navigation bar considered
- Consistent positioning across different screen sizes
- Better user experience with all buttons remaining accessible

## Files Modified
- `/workspace/kalkulator/css/style.css` - Modal positioning and sizing updates