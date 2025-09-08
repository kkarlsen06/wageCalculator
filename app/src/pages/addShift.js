// Add Shift Route
// Converted from addShiftModal to fullscreen route following settings pattern

function getAddShiftView() {
  return `
  <div id="addShiftPage" class="settings-page">
    <div class="settings-content">
      <div class="detail-title">
        <h1>Legg til vakt</h1>
        <p class="detail-subtitle">Opprett enkelvakter eller vaktserier</p>
      </div>
      
      <div class="settings-section">
        <form id="shiftForm">
          <div class="tab-nav" style="margin-bottom: var(--space-4);">
            <button type="button" class="tab-btn active" onclick="switchAddShiftTab('simple')">Enkel</button>
            <button type="button" class="tab-btn" onclick="switchAddShiftTab('recurring')">Serie</button>
          </div>

          <div id="simpleFields" class="tab-content active">
            <div class="form-group">
              <div class="date-grid" id="dateGrid"></div>
              <div class="selected-dates-info" id="selectedDatesInfo" style="display: none;">
                <span id="selectedDatesCount">0</span> datoer valgt
              </div>
            </div>

            <div class="form-group">
              <label for="employeeSelect">Ansatt</label>
              <select class="form-control" id="employeeSelect" aria-label="Velg ansatt for vakten">
                <option value="">Ikke tildelt</option>
              </select>
            </div>

            <div class="form-group">
              <label>Arbeidstid</label>
              <div class="form-row">
                <select class="form-control" id="startHour">
                  <option value="">Fra time</option>
                </select>
                <select class="form-control" id="startMinute">
                  <option value="">Fra minutt</option>
                </select>
              </div>
              <div class="form-row">
                <select class="form-control" id="endHour">
                  <option value="">Til time</option>
                </select>
                <select class="form-control" id="endMinute">
                  <option value="">Til minutt</option>
                </select>
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
              <label>Arbeidstid</label>
              <div class="form-row">
                <select class="form-control" id="recurringStartHour">
                  <option value="">Fra time</option>
                </select>
                <select class="form-control" id="recurringStartMinute">
                  <option value="">Fra minutt</option>
                </select>
              </div>
              <div class="form-row">
                <select class="form-control" id="recurringEndHour">
                  <option value="">Til time</option>
                </select>
                <select class="form-control" id="recurringEndMinute">
                  <option value="">Til minutt</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label>Slutt (år)</label>
              <input type="number" class="form-control" id="recurringDurationYears" step="0.5" min="0.5" max="3" value="1" />
            </div>
          </div>
        </form>
      </div>
    </div>
    
    <div class="settings-bottom-bar">
      <button type="button" class="btn btn-primary" onclick="addShiftFromRoute()">
        <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="16"></line>
          <line x1="8" y1="12" x2="16" y2="12"></line>
        </svg>
        Legg til vakt
      </button>
      <button type="button" class="btn btn-secondary" data-spa data-href="/">
        <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
        Avbryt
      </button>
    </div>
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

  // Reflect employee context in the form (pill vs selectors)
  if (window.app && window.app.updateEmployeeAssignmentUIInModal) {
    window.app.updateEmployeeAssignmentUIInModal();
  }
}

// Add shift functionality for the route
function addShiftFromRoute() {
  if (window.app && window.app.addShift) {
    // Call the existing addShift method with success callback to navigate back
    const originalAddShift = window.app.addShift.bind(window.app);
    
    // Override the close modal behavior to navigate back to main app
    const originalCloseAddShiftModal = window.app.closeAddShiftModal;
    window.app.closeAddShiftModal = function() {
      // Navigate back to main app
      if (window.navigateToRoute) {
        window.navigateToRoute('/');
      }
      // Restore original method
      window.app.closeAddShiftModal = originalCloseAddShiftModal;
    };
    
    // Call the existing addShift method
    originalAddShift();
  }
}

// After mount function for the route
export function afterMountAddShift() {
  // Initialize the add shift functionality
  if (window.app) {
    // Check for pre-selected date from session storage
    const preSelectedDate = sessionStorage.getItem('preSelectedShiftDate');
    let targetMonth = null;
    let targetYear = null;
    
    if (preSelectedDate) {
      const date = new Date(preSelectedDate);
      targetMonth = date.getMonth() + 1;
      targetYear = date.getFullYear();
      // Clear the session storage
      sessionStorage.removeItem('preSelectedShiftDate');
    }
    
    // Initialize the date grid and form elements
    window.app.populateDateGrid(targetMonth, targetYear);
    window.app.populateTimeSelectors();
    
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
        // Update selected dates info
        const selectedDatesInfo = document.getElementById('selectedDatesInfo');
        const selectedDatesCount = document.getElementById('selectedDatesCount');
        if (selectedDatesInfo && selectedDatesCount) {
          selectedDatesCount.textContent = '1';
          selectedDatesInfo.style.display = 'block';
        }
      }, 100);
    }
    
    // Update employee assignment UI
    if (window.app.updateEmployeeAssignmentUIInModal) {
      window.app.updateEmployeeAssignmentUIInModal();
    }
    
    // Set default tab to simple
    switchAddShiftTab('simple');
  }

  // Make functions globally available
  window.switchAddShiftTab = switchAddShiftTab;
  window.addShiftFromRoute = addShiftFromRoute;
}

// Export the render function
export function renderAddShift() {
  return getAddShiftView();
}

export default renderAddShift;