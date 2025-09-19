// Dedicated shifts page
// This is the standalone route for viewing and managing shifts

import { mountAll } from '../js/icons.js';

export function renderShifts() {
  return /* html */`
    <div class="shifts-page">
      <div class="app-container">
        <!-- Tab Bar with Month Navigation -->
        <div class="tab-bar-container">
          <div class="tab-bar-with-month">
            <div class="tab-bar">
              <button class="tab-btn active" onclick="app.switchShiftView('list')" aria-label="Bytt til listevisning">
                <div class="tab-icon-badge">
                  <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="8" y1="6" x2="21" y2="6"></line>
                    <line x1="8" y1="12" x2="21" y2="12"></line>
                    <line x1="8" y1="18" x2="21" y2="18"></line>
                    <line x1="3" y1="6" x2="3.01" y2="6"></line>
                    <line x1="3" y1="12" x2="3.01" y2="12"></line>
                    <line x1="3" y1="18" x2="3.01" y2="18"></line>
                  </svg>
                </div>
                <span class="tab-text">Liste</span>
              </button>
              <button class="tab-btn" onclick="app.switchShiftView('calendar')" aria-label="Bytt til kalendervisning">
                <div class="tab-icon-badge">
                  <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                </div>
                <span class="tab-text">Kalender</span>
              </button>
            </div>

            <!-- Month Navigation - positioned alongside tab bar -->
            <div class="month-navigation dashboard-month-nav-inline">
              <button class="month-nav-btn" onclick="app.navigateToPreviousMonth()" aria-label="Forrige måned">
                <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
              <span class="month-display" id="currentMonthShifts">Mai 2025</span>
              <button class="month-nav-btn" onclick="app.navigateToNextMonth()" aria-label="Neste måned">
                <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polyline points="9 6 15 12 9 18"></polyline>
                </svg>
              </button>
            </div>
          </div>
          <!-- Skeleton placeholder for tab bar while loading -->
          <div class="tab-bar-skeleton" aria-hidden="true">
            <div class="skeleton-block"></div>
            <div class="skeleton-block"></div>
            <div class="skeleton-block"></div>
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
  `;
}

export function afterMountShifts() {
  // Initialize icons first
  mountAll();

  // Wait for app to be ready then initialize shifts functionality
  const initShifts = () => {
    if (window.app) {
      // Update month displays across shift views
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

      // Apply the user's preferred default shifts view and update tab/navbar state
      const defaultView = window.app.defaultShiftsView || 'list';
      window.app.switchShiftView(defaultView);

      // Update tab button active states
      updateShiftTabActiveState(defaultView);

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

function updateShiftTabActiveState(activeView) {
  const tabButtons = document.querySelectorAll('.shifts-page .tab-btn');
  tabButtons.forEach(btn => {
    const isListView = btn.onclick && btn.onclick.toString().includes("'list'");
    const isCalendarView = btn.onclick && btn.onclick.toString().includes("'calendar'");

    const shouldBeActive = (activeView === 'list' && isListView) ||
                          (activeView === 'calendar' && isCalendarView);

    btn.classList.toggle('active', shouldBeActive);
  });
}
