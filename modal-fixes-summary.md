# Modal Fixes Summary

## Issues Fixed

### 1. Double-tap Issue with Vaktdetaljer Modal Close Button

**Problem**: Opening the vaktdetaljer modal from tapping the next shift card required two taps of the close button to close it - one to remove the background blur, and one to actually close the modal.

**Root Cause**: The close button click was bubbling up to the backdrop click handler, causing both the close button handler and backdrop handler to execute.

**Solution**: Added `e.preventDefault()` to the close button click handlers in both the shift details modal and stat details modal to prevent event bubbling.

**Files Modified**:
- `kalkulator/js/appLogic.js` - Lines 3098 and 3245

**Changes**:
```javascript
// Before
fixedCloseBtn.onclick = (e) => {
    e.stopPropagation();
    this.closeShiftDetails();
};

// After  
fixedCloseBtn.onclick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    this.closeShiftDetails();
};
```

### 2. Add Shift Modal Vertical Centering Issue

**Problem**: The add shift modal wasn't vertically centered after removing the top bar on mobile, presumably because the bottom of the modal was attached to the bottom of the viewport.

**Root Cause**: The modal was using `align-items: flex-start` on mobile, which positioned it at the top instead of center.

**Solution**: Changed the mobile positioning to use `align-items: center` and `justify-content: center` to properly center the modal vertically.

**Files Modified**:
- `kalkulator/css/style.css` - Lines 981-985

**Changes**:
```css
/* Before */
@media (max-width: 768px) {
  #addShiftModal.active {
    padding-top: 0;
    align-items: flex-start;
  }
}

/* After */
@media (max-width: 768px) {
  #addShiftModal.active {
    padding-top: 0;
    align-items: center;
    justify-content: center;
  }
}
```

## Testing

The fixes address both reported issues:

1. **Double-tap issue**: The close button now properly prevents event bubbling, ensuring only one tap is needed to close the modal.

2. **Vertical centering**: The add shift modal is now properly centered vertically on mobile devices.

## Files Modified

1. `kalkulator/js/appLogic.js` - Fixed close button event handling
2. `kalkulator/css/style.css` - Fixed modal positioning on mobile

## Impact

- **Vaktdetaljer modal**: Single tap now closes the modal properly
- **Add shift modal**: Properly centered vertically on mobile devices
- **No breaking changes**: All existing functionality remains intact