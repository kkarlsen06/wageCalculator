// Add Shift Route
// Converted from addShiftModal to fullscreen route following settings pattern

import { mountAll } from '../js/icons.js';

function getAddShiftView() {
  return `
  <div id="shiftAddPage" class="settings-page">
    <div class="page-header" style="margin-bottom: var(--space-4);">
      <h2>Legg til vakt</h2>
    </div>
    
    <form id="shiftForm">
      <div class="tab-nav" style="margin-bottom: var(--space-4);">
        <button type="button" class="tab-btn active" onclick="switchAddShiftTab('simple')">Enkel</button>
        <button type="button" class="tab-btn" onclick="switchAddShiftTab('recurring')">Serie</button>
      </div>

      <div id="simpleFields" class="tab-content active">
        <div class="form-group">
          <div class="date-grid" id="dateGrid">
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
          <label for="employeeSelect">Ansatt</label>
          <select class="form-control" id="employeeSelect" aria-label="Velg ansatt for vakten">
            <option value="">Ikke tildelt</option>
          </select>
        </div>

        <div class="form-group">
          <div class="time-section">
            <div class="form-row">
              <select class="form-control" id="startHour">
                <option value="">Fra time</option>
              </select>
              <span class="time-colon">:</span>
              <select class="form-control" id="startMinute">
                <option value="">Fra minutt</option>
              </select>
            </div>
            <div class="time-separator"></div>
            <div class="form-row">
              <select class="form-control" id="endHour">
                <option value="">Til time</option>
              </select>
              <span class="time-colon">:</span>
              <select class="form-control" id="endMinute">
                <option value="">Til minutt</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      
      <div id="recurringFields" class="tab-content">
        <div class="form-group" style="margin-bottom: var(--space-4);">
          <label>Hyppighet</label>
          <select class="form-control" id="recurringFrequency">
            <option value="1">Hver uke</option>
            <option value="2">Hver 2. uke</option>
            <option value="3">Hver 3. uke</option>
            <option value="4">Hver 4. uke</option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom: var(--space-4);">
          <label>Første vakt</label>
          <input type="date" class="form-control" id="recurringStartDate" />
        </div>
        <div class="form-group" style="margin-bottom: var(--space-4);">
          <label for="recurringEmployeeSelect">Ansatt</label>
          <select class="form-control" id="recurringEmployeeSelect" aria-label="Velg ansatt for vaktserien">
            <option value="">Ikke tildelt</option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom: var(--space-4);">
          <div class="time-section">
            <div class="form-row">
              <select class="form-control" id="recurringStartHour">
                <option value="">Fra time</option>
              </select>
              <span class="time-colon">:</span>
              <select class="form-control" id="recurringStartMinute">
                <option value="">Fra minutt</option>
              </select>
            </div>
            <div class="time-separator"></div>
            <div class="form-row">
              <select class="form-control" id="recurringEndHour">
                <option value="">Til time</option>
              </select>
              <span class="time-colon">:</span>
              <select class="form-control" id="recurringEndMinute">
                <option value="">Til minutt</option>
              </select>
            </div>
          </div>
        </div>
        <div class="form-group">
          <label>Slutt (år)</label>
          <input type="number" class="form-control" id="recurringDurationYears" step="0.5" min="0.5" max="3" value="1" />
        </div>
      </div>
    </form>
    
    <div class="shift-add-floating-nav">
      <button type="button" class="floating-nav-btn back-btn btn-disabled" onclick="addShiftFromRoute()" disabled>
        Ingen datoer valgt
      </button>
      <button type="button" class="floating-nav-btn btn btn-secondary" data-spa onclick="history.back()" aria-label="Lukk" title="Lukk">
        <svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>

    <!-- Conflict details panel (hidden by default). Rendered below actions and below the fold. -->
    <div id="conflictDetails" class="conflict-details" style="display: none;"></div>
  </div>`;
}

// Tab switching functionality for the route
function switchAddShiftTab(tab) {
  const btns = document.querySelectorAll('.tab-btn');
  const simpleFields = document.getElementById('simpleFields');
  const recurringFields = document.getElementById('recurringFields');

  // Update button active states
  btns.forEach((btn, index) => {
    const isSimpleTab = index === 0; // First button is "Enkel"
    const isActive = (tab === 'simple' && isSimpleTab) || (tab === 'recurring' && !isSimpleTab);
    btn.classList.toggle('active', isActive);
  });

  // Update tab content visibility
  if (simpleFields && recurringFields) {
    if (tab === 'simple') {
      simpleFields.classList.add('active');
      recurringFields.classList.remove('active');
    } else {
      simpleFields.classList.remove('active');
      recurringFields.classList.add('active');
    }
  }

  // Directly hide employee dropdowns and use employee pills instead
  ['employeeSelect', 'recurringEmployeeSelect'].forEach(id => {
    const select = document.getElementById(id);
    if (select) {
      const group = select.closest('.form-group') || select.parentElement;
      if (group) {
        group.style.display = 'none';
        console.log('Hidden employee dropdown in tab switch:', id);
      }
    }
  });
  
  // Check if we're on the ansatte route to ensure proper UI behavior
  const onAnsatteRoute = typeof location !== 'undefined' && location.pathname === '/ansatte';
  const originalView = window.app && window.app.currentView;
  if (window.app && onAnsatteRoute) window.app.currentView = 'employees';
  
  // Reflect employee context in the form (pill vs selectors)
  if (window.app && window.app.updateEmployeeAssignmentUIInModal) {
    window.app.updateEmployeeAssignmentUIInModal();
  }
  
  // Restore original view
  if (window.app) window.app.currentView = originalView;
}

// Add shift functionality for the route
function addShiftFromRoute() {
  if (!window.app || !window.app.addShift) {
    console.error('App or addShift method not available');
    return;
  }
  
  try {
    // Store original method for safe restoration
    const originalCloseAddShiftModal = window.app.closeAddShiftModal;
    
    // Create a route-aware version that navigates back instead of hiding modal
    window.app.closeAddShiftModal = function() {
      try {
        if (window.navigateToRoute) {
          window.navigateToRoute('/');
        } else {
          console.warn('Route navigation not available, using fallback');
          if (originalCloseAddShiftModal) {
            originalCloseAddShiftModal.call(window.app);
          }
        }
      } catch (error) {
        console.error('Error during route navigation:', error);
        // Fallback to original behavior
        if (originalCloseAddShiftModal) {
          originalCloseAddShiftModal.call(window.app);
        }
      } finally {
        // Always restore the original method
        window.app.closeAddShiftModal = originalCloseAddShiftModal;
      }
    };
    
    // Call the existing addShift method
    window.app.addShift();
  } catch (error) {
    console.error('Error in addShiftFromRoute:', error);
    // Show user-friendly error
    if (window.ErrorHelper) {
      window.ErrorHelper.showError('Det oppstod en feil ved lagring av vakten. Prøv igjen.');
    }
  }
}

// After mount function for the route
export function afterMountAddShift() {
  mountAll();

  // Initialize the add shift functionality
  if (window.app) {
    // Check for pre-selected date from session storage with expiry
    let preSelectedDate = null;
    let targetMonth = null;
    let targetYear = null;
    
    const storedDate = sessionStorage.getItem('preSelectedShiftDate');
    const storedExpiry = sessionStorage.getItem('preSelectedShiftDate_expiry');
    
    if (storedDate && storedExpiry) {
      const expiry = parseInt(storedExpiry, 10);
      if (Date.now() < expiry) {
        preSelectedDate = storedDate;
        const date = new Date(preSelectedDate);
        if (!isNaN(date.getTime())) {
          targetMonth = date.getMonth() + 1;
          targetYear = date.getFullYear();
        }
      }
      // Clean up session storage (whether expired or used)
      sessionStorage.removeItem('preSelectedShiftDate');
      sessionStorage.removeItem('preSelectedShiftDate_expiry');
    }
    
    if (window.app.updateAddButtonState) {
      const initialText = preSelectedDate ? 'Velg start- og sluttid' : 'Ingen datoer valgt';
      window.app.updateAddButtonState(false, initialText);
    }

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
      window.app.populateTimeSelects();
    }, 10);
    
    // Update employee dropdowns
    if (window.app.updateEmployeeDropdowns) {
      window.app.updateEmployeeDropdowns();
    }
    
    // Clear any previously selected dates
    window.app.selectedDates = [];
    
    // Pre-select the date if it was provided
    if (preSelectedDate) {
      const date = new Date(preSelectedDate);
      window.app.selectedDates = [date];
      
      // Select the date in the UI after a small delay
      setTimeout(() => {
        const dateString = date.toISOString().split('T')[0];
        const dateCell = document.querySelector(`[data-date="${dateString}"]`);
        if (dateCell) {
          dateCell.classList.add('selected');
        }
      }, 100);
    }
    
    // Directly hide employee dropdowns and use employee pills instead
    // This matches the behavior in the original modal
    ['employeeSelect', 'recurringEmployeeSelect'].forEach(id => {
      const select = document.getElementById(id);
      if (select) {
        const group = select.closest('.form-group') || select.parentElement;
        if (group) {
          group.style.display = 'none';
          console.log('Hidden employee dropdown:', id);
        }
      } else {
        console.log('Employee dropdown not found:', id);
      }
    });
    
    // Check if we're on the ansatte route to ensure proper UI behavior
    const onAnsatteRoute = typeof location !== 'undefined' && location.pathname === '/ansatte';
    const originalView = window.app.currentView;
    if (onAnsatteRoute) window.app.currentView = 'employees';
    
    // Update employee assignment UI to show pills instead of dropdowns
    if (window.app.updateEmployeeAssignmentUIInModal) {
      window.app.updateEmployeeAssignmentUIInModal();
    }
    
    // Restore original view (though it will be set back when navigating away)
    window.app.currentView = originalView;
    
    // Set default tab to simple
    switchAddShiftTab('simple');

    // Initialize conflict checking
    setTimeout(() => {
      if (window.app && window.app.checkShiftConflicts) {
        window.app.checkShiftConflicts();
      }
    }, 100);
  }

  // Make functions globally available with cleanup tracking
  if (!window._shiftAddRouteCleanup) {
    window._shiftAddRouteCleanup = [];
  }
  
  // Store original values for cleanup
  const originalSwitchTab = window.switchAddShiftTab;
  const originalAddShiftRoute = window.addShiftFromRoute;
  
  window.switchAddShiftTab = switchAddShiftTab;
  window.addShiftFromRoute = addShiftFromRoute;
  
  // Track cleanup functions
  window._shiftAddRouteCleanup.push(() => {
    if (originalSwitchTab) {
      window.switchAddShiftTab = originalSwitchTab;
    } else {
      delete window.switchAddShiftTab;
    }
    
    if (originalAddShiftRoute) {
      window.addShiftFromRoute = originalAddShiftRoute;
    } else {
      delete window.addShiftFromRoute;
    }
  });
}

// Export the render function
export function renderAddShift() {
  return getAddShiftView();
}

export default renderAddShift;
