// Dedicated shifts page
// This is the standalone route for viewing and managing shifts

import { mountAll } from '../js/icons.js';

export function renderShifts() {
  return /* html */`
    <div class="settings-detail">
      <div class="app-container">
          <!-- Month Navigation with arrow buttons -->
          <div class="month-navigation-container">
            <div class="month-navigation">
              <button class="month-nav-btn" onclick="app.navigateToPreviousMonth()" aria-label="Forrige måned">
                <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
              <span class="month-display" id="currentMonth">Mai 2025</span>
              <button class="month-nav-btn" onclick="app.navigateToNextMonth()" aria-label="Neste måned">
                <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polyline points="9 6 15 12 9 18"></polyline>
                </svg>
              </button>
            </div>
          </div>

          <!-- Employee Filter Bar -->
          <div class="employee-filter-bar" id="employeeFilterBar" style="display: none;">
            <div class="filter-scroll-container">
              <button class="filter-chip active" data-employee-id="" aria-label="Vis alle vakter">
                <span>Alle</span>
              </button>
            </div>
          </div>


          <!-- Shift List -->
          <div class="shift-list" id="shiftList">
            <div class="empty-state">
              <div class="empty-icon">
                <svg class="icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </div>
              <p>Ingen vakter registrert ennå</p>
            </div>
          </div>

          <!-- Shift Calendar -->
          <div id="shiftCalendar" class="shift-calendar" style="display:none;"></div>

          <!-- Calendar display toggle -->
          <div class="calendar-display-toggle" style="display:none;">
            <div class="calendar-toggle-nav">
              <button class="calendar-toggle-btn active" onclick="app.switchCalendarDisplay('hours')">Varighet</button>
              <button class="calendar-toggle-btn" onclick="app.switchCalendarDisplay('money')">Lønn</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;
}

export function afterMountShifts() {
  // Initialize icons first
  mountAll();

  // Make navbar contextual for shifts route
  updateNavbarForShifts();

  // Wait for app to be ready then initialize shifts functionality
  const initShifts = () => {
    if (window.app) {
      // Update header with current month
      if (window.app.updateHeader) {
        window.app.updateHeader();
      }

      // Refresh shifts data when the page loads
      if (window.app.refreshShifts) {
        window.app.refreshShifts();
      }

      // Update shift display
      if (window.app.updateDisplay) {
        window.app.updateDisplay();
      }

      // Set up any shifts-specific event listeners or initialization
      if (window.app.initializeShiftsView) {
        window.app.initializeShiftsView();
      }
    } else {
      // If app isn't ready yet, wait a bit and try again
      setTimeout(initShifts, 100);
    }
  };

  // Start initialization
  initShifts();
}

function updateNavbarForShifts() {
  const bottomNav = document.querySelector('.bottom-nav');
  if (!bottomNav) return;

  // Store original navbar HTML for restoration later
  if (!window._originalNavbarHTML) {
    window._originalNavbarHTML = bottomNav.innerHTML;
  }

  // Create contextual navbar for shifts
  bottomNav.innerHTML = `
    <button class="nav-item" onclick="window.navigateToRoute('/')">
      <div class="nav-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </div>
      <span class="nav-label">Tilbake</span>
    </button>

    <button class="nav-item nav-add" data-spa data-href="/shift-add">
      <div class="nav-icon-add">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="16"></line>
          <line x1="8" y1="12" x2="16" y2="12"></line>
        </svg>
      </div>
    </button>

    <button class="nav-item nav-toggle active" onclick="app.switchShiftView('list')">
      <div class="nav-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <line x1="8" y1="6" x2="21" y2="6"></line>
          <line x1="8" y1="12" x2="21" y2="12"></line>
          <line x1="8" y1="18" x2="21" y2="18"></line>
          <line x1="3" y1="6" x2="3.01" y2="6"></line>
          <line x1="3" y1="12" x2="3.01" y2="12"></line>
          <line x1="3" y1="18" x2="3.01" y2="18"></line>
        </svg>
      </div>
      <span class="nav-label">Liste</span>
    </button>

    <button class="nav-item nav-toggle" onclick="app.switchShiftView('calendar')">
      <div class="nav-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      </div>
      <span class="nav-label">Kalender</span>
    </button>
  `;
}