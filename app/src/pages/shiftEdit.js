// Shift Edit Route
// Handles editing of existing shifts

import { mountAll } from '../js/icons.js';

function getShiftEditView(shiftData = null) {
  const pageTitle = 'Rediger vakt';
  const actionButtonText = 'Oppdater vakt';
  
  return `
  <div id="shiftEditPage" class="settings-page">
    <div class="page-header" style="margin-bottom: var(--space-4);">
      <h2>${pageTitle}</h2>
    </div>
    
    <div id="shiftNotFoundError" class="error-message" style="display: none;">
      <div class="error-box">
        Dette skiftet eksisterer ikke for din bruker!
      </div>
    </div>
    
    <form id="shiftForm">

      <div id="simpleFields" class="tab-content active">
        <div class="form-group">
          <div class="date-grid" id="dateGrid" style="pointer-events: none; opacity: 0.6;">
            <div class="date-grid-skeleton">
              <div class="skeleton skeleton-date-cell"></div>
              <div class="skeleton skeleton-date-cell"></div>
              <div class="skeleton skeleton-date-cell"></div>
              <div class="skeleton skeleton-date-cell"></div>
              <div class="skeleton skeleton-date-cell"></div>
              <div class="skeleton skeleton-date-cell"></div>
              <div class="skeleton skeleton-date-cell"></div>
              <div class="skeleton skeleton-date-cell"></div>
              <div class="skeleton skeleton-date-cell"></div>
              <div class="skeleton skeleton-date-cell"></div>
              <div class="skeleton skeleton-date-cell"></div>
              <div class="skeleton skeleton-date-cell"></div>
              <div class="skeleton skeleton-date-cell"></div>
              <div class="skeleton skeleton-date-cell"></div>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label for="editEmployeeSelect">Ansatt</label>
          <select class="form-control" id="editEmployeeSelect" aria-label="Velg ansatt for vakten">
            <option value="">Ikke tildelt</option>
          </select>
        </div>

        <div class="form-group">
          <div class="time-section">
            <div class="form-row">
              <select class="form-control" id="editStartHour">
                <option value="">Fra time</option>
              </select>
              <span class="time-colon">:</span>
              <select class="form-control" id="editStartMinute">
                <option value="">Fra minutt</option>
              </select>
            </div>
            <div class="time-separator"></div>
            <div class="form-row">
              <select class="form-control" id="editEndHour">
                <option value="">Til time</option>
              </select>
              <span class="time-colon">:</span>
              <select class="form-control" id="editEndMinute">
                <option value="">Til minutt</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </form>
    
    
    <div class="shift-add-floating-nav">
      <button type="button" class="floating-nav-btn back-btn" onclick="saveShiftFromRoute()">
        <span class="icon icon-sm" data-icon="plus-circle"></span>
        ${actionButtonText}
      </button>
      <button type="button" class="floating-nav-btn btn btn-secondary" data-spa data-href="/">
        <span class="icon icon-sm" data-icon="x"></span>
        Lukk
      </button>
    </div>
  </div>`;
}


// Handle employee dropdown visibility based on user permissions
async function handleEmployeeDropdownVisibility() {
  if (!window.hasEnterpriseSubscription) {
    console.warn('hasEnterpriseSubscription function not available');
    hideEmployeeDropdowns();
    return;
  }

  const hasEnterprise = await window.hasEnterpriseSubscription();
  const onAnsatteRoute = typeof location !== 'undefined' && location.pathname === '/ansatte';

  // Hide employee dropdowns for normal users or when not on ansatte route
  if (!hasEnterprise || !onAnsatteRoute) {
    hideEmployeeDropdowns();
  } else {
    showEmployeeDropdowns();
  }

  // Update employee assignment UI if available
  if (window.app && window.app.updateEmployeeAssignmentUIInModal) {
    window.app.updateEmployeeAssignmentUIInModal();
  }
}

function hideEmployeeDropdowns() {
  const select = document.getElementById('editEmployeeSelect');
  if (select) {
    const group = select.closest('.form-group') || select.parentElement;
    if (group) {
      group.style.display = 'none';
    }
  }
}

function showEmployeeDropdowns() {
  const select = document.getElementById('editEmployeeSelect');
  if (select) {
    const group = select.closest('.form-group') || select.parentElement;
    if (group) {
      group.style.display = 'block';
    }
  }
}

// Save/update shift functionality for the edit route
function saveShiftFromRoute() {
  if (!window.app) {
    console.error('App not available');
    return;
  }
  
  try {
    // Store original method for safe restoration
    const originalCloseMethod = window.app.closeEditShift;
    
    // Create a route-aware version that navigates back instead of hiding modal
    const tempCloseMethod = function() {
      try {
        if (window.navigateToRoute) {
          window.navigateToRoute('/');
        } else {
          console.warn('Route navigation not available, using fallback');
          if (originalCloseMethod) {
            originalCloseMethod.call(window.app);
          }
        }
      } catch (error) {
        console.error('Error during route navigation:', error);
        // Fallback to original behavior
        if (originalCloseMethod) {
          originalCloseMethod.call(window.app);
        }
      } finally {
        // Always restore the original method
        window.app.closeEditShift = originalCloseMethod;
      }
    };
    
    // Temporarily replace the close method and call updateShift
    window.app.closeEditShift = tempCloseMethod;
    window.app.updateShift();
  } catch (error) {
    console.error('Error in saveShiftFromRoute:', error);
    // Show user-friendly error
    if (window.ErrorHelper) {
      window.ErrorHelper.showError('Det oppstod en feil ved lagring av vakten. Prøv igjen.');
    }
  }
}

// Get shift ID from URL parameters
function getShiftId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('shiftId');
}

// Populate form with shift data for edit mode
function populateEditForm(shift) {
  if (!shift) return;

  // Set selected date
  if (window.app) {
    const shiftDate = new Date(shift.date);
    window.app.selectedDates = [shiftDate];
    window.app.editSelectedDate = shiftDate;
    
    // Highlight the selected date in the grid (read-only display)
    setTimeout(() => {
      const dateString = shiftDate.toISOString().split('T')[0];
      const dateCell = document.querySelector(`[data-date="${dateString}"]`);
      if (dateCell) {
        dateCell.classList.add('selected');
      }
    }, 100);
  }

  // Set time values
  const [startHour, startMinute] = shift.startTime.split(':');
  const [endHour, endMinute] = shift.endTime.split(':');
  
  const startHourSelect = document.getElementById('editStartHour');
  const startMinuteSelect = document.getElementById('editStartMinute');
  const endHourSelect = document.getElementById('editEndHour');
  const endMinuteSelect = document.getElementById('editEndMinute');
  
  if (startHourSelect) startHourSelect.value = startHour;
  if (startMinuteSelect) startMinuteSelect.value = startMinute;
  if (endHourSelect) endHourSelect.value = endHour;
  if (endMinuteSelect) endMinuteSelect.value = endMinute;

  // Set employee if present
  const employeeSelect = document.getElementById('editEmployeeSelect');
  if (employeeSelect && shift.employee_id) {
    employeeSelect.value = shift.employee_id;
  }
}

// After mount function for the edit route
function showShiftNotFoundError() {
  console.log('Showing shift not found error');
  const errorDiv = document.getElementById('shiftNotFoundError');
  const form = document.getElementById('shiftForm');
  const floatingNav = document.querySelector('.shift-add-floating-nav');
  
  console.log('Elements found:', { errorDiv, form, floatingNav });
  
  if (errorDiv) {
    errorDiv.style.display = 'block';
    console.log('Error div shown');
  } else {
    console.log('Error div not found');
  }
  if (form) {
    form.style.display = 'none';
    console.log('Form hidden');
  } else {
    console.log('Form not found');
  }
  if (floatingNav) {
    floatingNav.style.display = 'none';
    console.log('Floating nav hidden');
  } else {
    console.log('Floating nav not found');
  }
}

export async function afterMountShiftEdit() {
  mountAll();

  const shiftId = getShiftId();
  
  if (!shiftId) {
    console.error('No shift ID provided for editing');
    showShiftNotFoundError();
    return;
  }
  
  // Initialize the shift functionality
  if (!window.app) {
    console.error('App not available');
    showShiftNotFoundError();
    return;
  }
  
  // Check if shifts data is available
  if (!window.app.shifts || !Array.isArray(window.app.shifts)) {
    console.error('Shifts data not available');
    showShiftNotFoundError();
    return;
  }
  
  // Find the shift to edit
  const shiftToEdit = window.app.shifts.find(s => s.id === shiftId);
  if (!shiftToEdit) {
    console.error('Shift not found for editing:', shiftId);
    showShiftNotFoundError();
    return;
  }
  
  window.app.editingShift = shiftToEdit;
  const shiftDate = new Date(shiftToEdit.date);
  const targetMonth = shiftDate.getMonth() + 1;
  const targetYear = shiftDate.getFullYear();
  
  // Initialize the date grid and form elements with small delay to ensure DOM is ready
  setTimeout(() => {
    // Clear skeleton and populate the actual calendar
    const dateGrid = document.getElementById('dateGrid');
    if (dateGrid) {
      const skeleton = dateGrid.querySelector('.date-grid-skeleton');
      if (skeleton) {
        skeleton.remove();
      }
    }
    
    window.app.populateDateGrid(targetMonth, targetYear);
    window.app.populateEditTimeSelects();
    
    // Populate edit form
    populateEditForm(shiftToEdit);
  }, 10);
  
  // Update employee dropdowns
  if (window.app.updateEmployeeDropdowns) {
    window.app.updateEmployeeDropdowns();
  }
  
  // Handle employee dropdown visibility
  await handleEmployeeDropdownVisibility();

  // Make functions globally available with cleanup tracking
  if (!window._shiftEditRouteCleanup) {
    window._shiftEditRouteCleanup = [];
  }
  
  // Store original values for cleanup
  const originalSaveShiftRoute = window.saveShiftFromRoute;
  
  window.saveShiftFromRoute = saveShiftFromRoute;
  
  // Track cleanup functions
  window._shiftEditRouteCleanup.push(() => {
    if (originalSaveShiftRoute) {
      window.saveShiftFromRoute = originalSaveShiftRoute;
    } else {
      delete window.saveShiftFromRoute;
    }
  });
}

// Export the render function
export function renderShiftEdit() {
  const shiftId = getShiftId();
  let shiftData = null;
  
  if (shiftId && window.app && window.app.shifts && Array.isArray(window.app.shifts)) {
    shiftData = window.app.shifts.find(s => s.id === shiftId);
  }
  
  return getShiftEditView(shiftData);
}

export default renderShiftEdit;