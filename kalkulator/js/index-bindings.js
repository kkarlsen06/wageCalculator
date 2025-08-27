// Bind inline behaviors to external listeners to satisfy CSP

function on(el, evt, handler) {
  if (el) el.addEventListener(evt, handler);
}

document.addEventListener('DOMContentLoaded', () => {
  const app = window.app || window;

  // Profile menu
  on(document.getElementById('userProfileBtn'), 'click', () => app.toggleProfileDropdown && app.toggleProfileDropdown());
  on(document.getElementById('openProfileItem'), 'click', () => app.openProfile && app.openProfile());
  on(document.getElementById('openSettingsItem'), 'click', () => app.openSettings && app.openSettings());
  on(document.getElementById('openSubscriptionItem'), 'click', () => app.openSubscription && app.openSubscription());
  on(document.getElementById('logoutItem'), 'click', () => app.handleLogout ? app.handleLogout() : (window.logout && window.logout()));

  // Month navigation (top and bottom)
  on(document.getElementById('monthPrevTop'), 'click', () => app.navigateToPreviousMonth && app.navigateToPreviousMonth());
  on(document.getElementById('monthNextTop'), 'click', () => app.navigateToNextMonth && app.navigateToNextMonth());
  on(document.getElementById('monthPrevBottom'), 'click', () => app.navigateToPreviousMonth && app.navigateToPreviousMonth());
  on(document.getElementById('monthNextBottom'), 'click', () => app.navigateToNextMonth && app.navigateToNextMonth());

  // Calendar display toggles
  document.querySelectorAll('[data-action="cal-display"]').forEach(btn => {
    on(btn, 'click', () => app.switchCalendarDisplay && app.switchCalendarDisplay(btn.dataset.value));
  });

  // Shift view toggles
  document.querySelectorAll('[data-action="shift-view"]').forEach(btn => {
    on(btn, 'click', () => app.switchShiftView && app.switchShiftView(btn.dataset.value));
  });

  // Open add shift modal
  on(document.getElementById('openAddShiftBtn'), 'click', () => app.openAddShiftModal && app.openAddShiftModal());

  // Settings tabs
  document.querySelectorAll('[data-action="settings-tab"]').forEach(btn => {
    on(btn, 'click', () => app.switchSettingsTabSync && app.switchSettingsTabSync(btn.dataset.tab));
  });

  // Wage/preset controls
  on(document.getElementById('usePresetToggle'), 'change', () => app.togglePreset && app.togglePreset());
  on(document.getElementById('wageSelect'), 'change', (e) => app.updateWageLevel && app.updateWageLevel(e.target.value));
  on(document.getElementById('customWageInput'), 'change', (e) => app.updateCustomWage && app.updateCustomWage(e.target.value));

  // Bonus add buttons
  document.querySelectorAll('[data-action="add-bonus"]').forEach(btn => {
    on(btn, 'click', () => app.addBonusSlot && app.addBonusSlot(btn.dataset.type));
  });

  // Tax + payroll
  on(document.getElementById('taxDeductionToggle'), 'change', () => app.toggleTaxDeduction && app.toggleTaxDeduction());
  on(document.getElementById('taxPercentageInput'), 'change', (e) => app.updateTaxPercentage && app.updateTaxPercentage(e.target.value));
  on(document.getElementById('payrollDayInput'), 'change', (e) => app.updatePayrollDay && app.updatePayrollDay(e.target.value));

  // Monthly goal save
  on(document.getElementById('saveMonthlyGoalBtn'), 'click', () => app.saveMonthlyGoal && app.saveMonthlyGoal());

  // Export/import
  on(document.getElementById('openCsvExportBtn'), 'click', () => app.openCsvExportModal && app.openCsvExportModal());
  document.querySelectorAll('[data-action="export-with-period"]').forEach(btn => {
    on(btn, 'click', () => app.exportDataWithPeriod && app.exportDataWithPeriod(btn.dataset.type));
  });
  on(document.getElementById('importDataBtn'), 'click', () => app.importDataFromDataTab && app.importDataFromDataTab());
  on(document.getElementById('closeSettingsBtn'), 'click', () => app.closeSettings && app.closeSettings());

  // Account management
  on(document.getElementById('restartOnboardingBtn'), 'click', () => app.restartOnboarding && app.restartOnboarding());
  on(document.getElementById('clearAllShiftsBtn'), 'click', () => app.clearAllShifts && app.clearAllShifts());
  on(document.getElementById('logoutBtn'), 'click', () => (window.logout && window.logout()));
  on(document.getElementById('closeProfileBtn'), 'click', () => app.closeProfile && app.closeProfile());

  // Edit shift modal
  on(document.getElementById('updateShiftBtn'), 'click', () => app.updateShift && app.updateShift());
  on(document.getElementById('closeEditShiftBtn'), 'click', () => app.closeEditShift && app.closeEditShift());

  // Add shift modal
  document.querySelectorAll('[data-action="switch-add-tab"]').forEach(btn => {
    on(btn, 'click', () => app.switchAddShiftTab && app.switchAddShiftTab(btn.dataset.value));
  });
  on(document.getElementById('addShiftBtn'), 'click', () => app.addShift && app.addShift());
  on(document.getElementById('closeAddShiftModalBtn'), 'click', () => app.closeAddShiftModal && app.closeAddShiftModal());

  // CSV export modal
  on(document.getElementById('closeCsvExportModalBtn'), 'click', () => app.closeCsvExportModal && app.closeCsvExportModal());
  on(document.getElementById('closeCsvExportModalBtn2'), 'click', () => app.closeCsvExportModal && app.closeCsvExportModal());
  on(document.getElementById('exportCsvReportBtn'), 'click', () => app.exportCsvReport && app.exportCsvReport());

  // Employee carousel retry
  on(document.getElementById('retryEmployeesBtn'), 'click', () => app.loadEmployees && app.loadEmployees());
});
