// Ansatte route - enterprise employee management

export function renderAnsatte() {
  return `
  <div id="ansattePage" class="ansatte-page app-container">
    <div class="ansatte-content">
      <h1 class="ansatte-title">Ansatte</h1>
      <p class="ansatte-subtitle">Administrer ansatte og se lønnssammendrag</p>

      <!-- Tab bar container placeholder for existing employee logic compatibility -->
      <div class="tab-bar-container ansatte-tab-placeholder" style="display: none;"></div>

      <!-- Month Navigation for employees view -->
      <div class="month-navigation dashboard-month-nav-inline">
        <button class="month-nav-btn" onclick="app.navigateToPreviousMonth()" aria-label="Forrige måned">
          <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <span class="month-display" id="currentMonthDashboard">Mai 2025</span>
        <button class="month-nav-btn" onclick="app.navigateToNextMonth()" aria-label="Neste måned">
          <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="9 6 15 12 9 18"></polyline>
          </svg>
        </button>
      </div>

      <!-- Loading placeholder -->
      <div class="employees-placeholder" id="ansatteLoadingPlaceholder">
        <div class="skeleton-container">
          <div class="skeleton-block" style="height: 60px; margin-bottom: 16px;"></div>
          <div class="skeleton-block" style="height: 200px; margin-bottom: 16px;"></div>
          <div class="skeleton-block" style="height: 120px;"></div>
        </div>
      </div>
    </div>
  </div>`;
}

export function afterMountAnsatte() {
  // Prevent horizontal scrolling
  document.body.style.overflowX = 'hidden';
  document.body.style.maxWidth = '100vw';
  document.documentElement.style.overflowX = 'hidden';
  document.documentElement.style.maxWidth = '100vw';

  // Initialize the employees view using existing appLogic functionality
  try {
    // Ensure the app is available and has enterprise subscription
    if (!window.app) {
      console.error('[ansatte-route] app not available');
      return;
    }

    // Check if user has enterprise subscription
    import('/src/js/subscriptionUtils.js').then(({ hasEnterpriseSubscription }) => {
      hasEnterpriseSubscription().then((hasEnterprise) => {
        if (!hasEnterprise) {
          // Redirect to abonnement page if no enterprise subscription
          if (window.__navigate) {
            window.__navigate('/abonnement');
          } else {
            window.location.href = '/abonnement';
          }
          return;
        }

        // Initialize employees view content
        initializeEmployeesRoute();
      }).catch((error) => {
        console.error('[ansatte-route] failed to check enterprise subscription:', error);
        // Fallback to abonnement page
        if (window.__navigate) {
          window.__navigate('/abonnement');
        } else {
          window.location.href = '/abonnement';
        }
      });
    }).catch((error) => {
      console.error('[ansatte-route] failed to load subscription utils:', error);
    });
  } catch (error) {
    console.error('[ansatte-route] initialization failed:', error);
  }
}

async function initializeEmployeesRoute() {
  try {
    // Set the current view to employees so appLogic functions work correctly
    if (window.app) {
      window.app.currentView = 'employees';

      // Initialize the employees view using existing appLogic
      await window.app.showEmployeesView();

      // Wait a moment for employees to load, then auto-select first employee if none selected
      setTimeout(async () => {
        try {
          if (window.app.employees && window.app.employees.length > 0) {
            // If no employee is currently selected, select the first one
            if (!window.app.selectedEmployeeId) {
              const firstEmployee = window.app.employees[0];
              if (firstEmployee && firstEmployee.id) {
                console.log('[ansatte-route] Auto-selecting first employee:', firstEmployee.name);

                // Use the app's employee selection method if available
                if (window.app.selectEmployee) {
                  await window.app.selectEmployee(firstEmployee.id);
                } else {
                  // Fallback: manually set selected employee
                  window.app.selectedEmployeeId = firstEmployee.id;
                  localStorage.setItem('selectedEmployeeId', firstEmployee.id);

                  // Trigger display updates
                  if (window.app.updateDisplay) {
                    window.app.updateDisplay();
                  }
                  if (window.app.renderEmployeeWorkSummary) {
                    window.app.renderEmployeeWorkSummary();
                  }
                }
              }
            }
          }

          // Hide the loading placeholder once employees view is fully loaded
          const placeholder = document.getElementById('ansatteLoadingPlaceholder');
          if (placeholder) {
            placeholder.style.display = 'none';
          }
        } catch (autoSelectError) {
          console.warn('[ansatte-route] Failed to auto-select employee:', autoSelectError);
          // Still hide placeholder even if auto-select fails
          const placeholder = document.getElementById('ansatteLoadingPlaceholder');
          if (placeholder) {
            placeholder.style.display = 'none';
          }
        }
      }, 500); // Give employees time to load

      // Ensure body has the correct class for styling
      document.body.classList.add('employees-view');

      // Update month display
      if (window.app.updateDisplay) {
        window.app.updateDisplay();
      }
    }
  } catch (error) {
    console.error('[ansatte-route] failed to initialize employees content:', error);

    // Show error message in place of loading placeholder
    const placeholder = document.getElementById('ansatteLoadingPlaceholder');
    if (placeholder) {
      placeholder.innerHTML = `
        <div class="error-container">
          <p>Det oppstod en feil ved lasting av ansattdata.</p>
          <button class="btn btn-primary" onclick="location.reload()">Prøv på nytt</button>
        </div>
      `;
    }
  }
}