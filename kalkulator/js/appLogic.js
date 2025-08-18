// Cache DOM elements to avoid repeated queries
const domCache = {
    progressFill: null,
    progressLabel: null,
    monthlyGoalInput: null,

    // Initialize cache
    init() {
        // Check for integrated progress bar first, then fallback to old progress bar
        this.progressFill = document.querySelector('.chart-progress-fill') ||
                           document.querySelector('.progress-fill');
        this.progressLabel = document.querySelector('.chart-progress-label') ||
                            document.querySelector('.progress-label');
        this.monthlyGoalInput = document.getElementById('monthlyGoalInput');
    },

    // Refresh cache when DOM changes
    refresh() {
        this.init();
    }
};

// Hent og lagre månedlig mål fra localStorage eller default
function getMonthlyGoal() {
    // Try to get from window.app if available
    if (typeof window !== 'undefined' && window.app && window.app.monthlyGoal) {
        return window.app.monthlyGoal;
    }
    // Fallback to localStorage
    const stored = localStorage.getItem('monthlyGoal');
    return stored ? parseInt(stored, 10) : 20000;
}

async function setMonthlyGoal(goal) {
    // Save to app object if available
    if (typeof window !== 'undefined' && window.app) {
        window.app.monthlyGoal = goal;
        // Save to Supabase
        if (window.app.saveSettingsToSupabase) {
            await window.app.saveSettingsToSupabase();
        }
    }
    // Also save to localStorage as backup
    localStorage.setItem('monthlyGoal', goal);
    // Update the progress bar immediately
    if (typeof window !== 'undefined' && window.app && window.app.updateStats) {
        window.app.updateStats();
    }
}

// --- Månedlig mål UI-håndtering ---
function setupMonthlyGoalInput() {
    // Use cached element or query if not cached
    const monthlyGoalInput = domCache.monthlyGoalInput || document.getElementById('monthlyGoalInput');
    if (monthlyGoalInput) {
        monthlyGoalInput.value = getMonthlyGoal();
        monthlyGoalInput.addEventListener('input', (e) => {
            const goal = parseInt(e.target.value, 10);
            if (!isNaN(goal) && goal > 0) {
                setMonthlyGoal(goal);
            }
        });
    }
}

// Global initialization for monthly goal
if (typeof window !== 'undefined') {
    // Initialize pendingConfetti to avoid errors
    window.pendingConfetti = false;

    // Set up the monthly goal input when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            domCache.init();
            setupMonthlyGoalInput();
        });
    } else {
        domCache.init();
        setupMonthlyGoalInput();
    }
}

// Enhanced progress bar update function with improved text presentation
function updateProgressBar(current, goal, shouldAnimate = false) {
    // Use cached elements - check for both old and new integrated progress bar
    const fill = domCache.progressFill ||
                 document.querySelector('.chart-progress-fill') ||
                 document.querySelector('.progress-fill');
    const label = domCache.progressLabel ||
                  document.querySelector('.chart-progress-label') ||
                  document.querySelector('.progress-label');

    if (!fill || !label) return;

    const percent = Math.round((current / goal) * 100);
    const clampedPercent = Math.min(percent, 100);

    // Clean up any existing animation state
    if (fill.dataset.animating === 'true') {
        fill.dataset.animating = 'false';
    }

    // Always remove loading class to ensure progress bar is visible
    fill.classList.remove('loading');

    // Enhanced animation with smoother text transitions
    if (shouldAnimate) {
        // Use single requestAnimationFrame for smooth animation
        requestAnimationFrame(() => {
            // Smooth transition for both fill and text
            fill.style.transition = 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
            label.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';

            fill.dataset.animating = 'true';
            fill.style.width = clampedPercent + '%';

            // Update text styling classes immediately for smooth transition
            updateProgressLabelStyling(label, percent);

            // Single timeout for cleanup
            setTimeout(() => {
                fill.dataset.animating = 'false';
                if (typeof window !== 'undefined' && window.app && !window.app.initialAnimationComplete) {
                    window.app.initialAnimationComplete = true;
                }
            }, 850);
        });
    } else {
        // Immediate update without animation
        fill.style.transition = 'none';
        label.style.transition = 'none';
        fill.style.width = clampedPercent + '%';

        // Force reflow once
        fill.offsetHeight;

        // Re-enable transitions
        fill.style.transition = 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
        label.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';

        // Update text styling immediately
        updateProgressLabelStyling(label, percent);
    }

    // Update classes based on progress
    const progressCard = fill.closest('.progress-card') || fill.closest('.chart-progress-bar');
    if (percent >= 100) {
        fill.classList.add('full');
        if (percent > 100 && progressCard) {
            progressCard.classList.add('overachievement');
        } else if (progressCard) {
            progressCard.classList.remove('overachievement');
        }
    } else {
        fill.classList.remove('full');
        if (progressCard) progressCard.classList.remove('overachievement');
    }

    // Add active class to show color when there's any progress
    if (percent > 0) {
        fill.classList.add('active');
    } else {
        fill.classList.remove('active');
    }

    // Update label text with improved formatting
    const currencySuffix = window.app && window.app.currencyFormat ? ' NOK' : ' kr';
    const formattedPercent = percent < 10 ? percent.toFixed(1) : Math.round(percent);
    label.textContent = `${formattedPercent}% av ${goal.toLocaleString('no-NO')}${currencySuffix}`;
    fill.title = `${current.toLocaleString('no-NO')}${currencySuffix} av ${goal.toLocaleString('no-NO')}${currencySuffix}`;
}

// Enhanced function to update progress label styling based on progress percentage
function updateProgressLabelStyling(label, percent) {
    // Remove all existing progress state classes
    label.classList.remove('low-progress', 'medium-progress', 'high-progress', 'overachievement');

    // Apply appropriate styling class based on progress percentage
    if (percent > 100) {
        label.classList.add('overachievement');
        // Add ARIA attributes for accessibility
        label.setAttribute('aria-label', `Mål oppnådd! ${percent.toFixed(1)}% av målet`);
    } else if (percent >= 75) {
        label.classList.add('high-progress');
        label.setAttribute('aria-label', `Nær målet: ${percent.toFixed(1)}% av målet`);
    } else if (percent >= 25) {
        label.classList.add('medium-progress');
        label.setAttribute('aria-label', `Fremdrift: ${percent.toFixed(1)}% av målet`);
    } else {
        label.classList.add('low-progress');
        label.setAttribute('aria-label', `Tidlig fremdrift: ${percent.toFixed(1)}% av målet`);
    }

    // Ensure text remains properly centered during transitions
    requestAnimationFrame(() => {
        // Force a reflow to ensure proper text positioning
        label.offsetHeight;

        // Verify text is still centered (defensive programming)
        const computedStyle = window.getComputedStyle(label);
        if (computedStyle.textAlign !== 'center') {
            label.style.textAlign = 'center';
        }
    });
}

// Legg til i app-objektet for enkel tilgang fra innstillinger
if (typeof window !== 'undefined') {
    window.updateProgressBar = updateProgressBar;
    window.getMonthlyGoal = getMonthlyGoal;
    window.setMonthlyGoal = setMonthlyGoal;
    window.domCache = domCache;
}
export const app = {
    // Constants
    PAUSE_THRESHOLD: 5.5,
    PAUSE_DEDUCTION: 0.5,
    MONTHS: ['januar', 'februar', 'mars', 'april', 'mai', 'juni',
             'juli', 'august', 'september', 'oktober', 'november', 'desember'],
    WEEKDAYS: ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'],
    PRESET_WAGE_RATES: {
        // Use negative numbers for young workers to avoid conflicts with regular levels 1-6
        '-1': 129.91,  // under16
        '-2': 132.90,  // under18
        1: 184.54,
        2: 185.38,
        3: 187.46,
        4: 193.05,
        5: 210.81,
        6: 256.14
    },
    // Organization settings cache
    orgSettings: { break_policy: 'fixed_0_5_over_5_5h' },
    PRESET_BONUSES: {
        weekday: [
            { from: "18:00", to: "21:00", rate: 22 },
            { from: "21:00", to: "23:59", rate: 45 }
        ],
        saturday: [
            { from: "13:00", to: "15:00", rate: 45 },
            { from: "15:00", to: "18:00", rate: 55 },
            { from: "18:00", to: "23:59", rate: 110 }
        ],
        sunday: [
            { from: "00:00", to: "23:59", rate: 115 }
        ]
    },
    // State
    shifts: [],
    currentMonth: new Date().getMonth() + 1, // Start in current month
    currentYear: new Date().getFullYear(), // Start in current year
    currentWageLevel: 1,
    usePreset: true,
    customWage: 200,
    customBonuses: {}, // Reset to empty - will be loaded from database
    // Track current high-level view for modal behavior (dashboard|stats|chatgpt|employees)
    currentView: 'dashboard',

    pauseDeduction: true,
    fullMinuteRange: false, // Setting for using 0-59 minutes instead of 00,15,30,45
    directTimeInput: false, // Setting for using direct time input instead of dropdowns
    monthlyGoal: 20000, // Monthly income goal
    shiftView: 'list',
    calendarDisplayMode: 'money', // 'money' or 'hours'
    selectedDate: null,
    userShifts: [],
    formState: {}, // Store form state to preserve across page restarts
    initialAnimationComplete: false, // Track if initial progress bar animation is complete
    // Drill-down state
    drillDownMode: false, // Track if we're in drill-down view
    selectedWeek: null, // Track which week is selected for drill-down
    taxDeductionEnabled: false, // Setting for enabling tax deduction
    taxPercentage: 0.0, // Tax percentage to deduct (0.0 to 100.0)
    payrollDay: 15, // Day of the month when user receives payroll (1-31)
    dashboardView: 'default', // Dashboard view mode: 'default' or 'stats'
    nextShiftTimer: null, // Timer for updating next shift countdown
    lastRenderedMonth: null,
    lastRenderedYear: null,
    lastRenderedShiftsKey: '',
    // Performance optimization for month navigation
    monthNavigationTimeout: null, // Debounce timer for month navigation

    // Employee Management State
    employees: [], // Array of employee objects
    selectedEmployeeId: null, // null = "All", string = specific employee ID
    employeeCache: new Map(), // Per-employee data cache for performance
    employeesLoading: false, // Loading state for employee operations
    employeesError: null, // Error state for employee operations
    // Avatars disabled: remove avatar URL cache
    async getAuthHeaders() {
        try {
            const { data: { session } } = await window.supa.auth.getSession();
            const token = session?.access_token;
            return {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            };
        } catch (_) {
            return { 'Content-Type': 'application/json' };
        }
    },
    async init() {
        // Load organization settings for manager
        try {
            const headers = await this.getAuthHeaders?.();
            const res = await fetch(`${window.CONFIG.apiBase}/org-settings`, { headers });
            if (res.ok) {
                const json = await res.json();
                if (json && json.break_policy) {
                    this.orgSettings = { break_policy: json.break_policy };
                }
            }
        } catch (_) {
            // ignore
        }
        // Initialize selectedDates array for multiple date selection
        this.selectedDates = [];

        // Initialize DOM cache
        domCache.init();

        // Reset progress bar to initial state
        const fill = domCache.progressFill;
        if (fill) {
            fill.classList.add('loading');
            fill.style.width = '0%';
            fill.style.transition = 'none';
        }

        // Initialize employee state from URL params and localStorage
        this.initializeEmployeeState();

        // Load employees for shift forms
        this.loadEmployeesForShiftForms();

        // Show UI elements
        this.populateTimeSelects();



        // Load backend or fallback
        try {
            await this.loadFromSupabase();
        } catch (err) {
            console.error('loadFromSupabase failed:', err);
            this.loadFromLocalStorage();
        }

        // Initialize dashboard view from localStorage
        const savedDashboardView = localStorage.getItem('dashboardView');
        if (savedDashboardView && (savedDashboardView === 'stats' || savedDashboardView === 'default')) {
            this.dashboardView = savedDashboardView;
        }

        // Apply initial dashboard view and update toggle button
        this.applyDashboardView();
        const toggleBtn = document.getElementById('dashboardToggleBtn');
        if (toggleBtn) {
            toggleBtn.classList.toggle('active', this.dashboardView === 'stats');
            const toggleText = toggleBtn.querySelector('.toggle-text');
            if (toggleText) {
                toggleText.textContent = this.dashboardView === 'stats' ? 'Std.' : 'Stat.';
            }
            toggleBtn.setAttribute('aria-label',
                this.dashboardView === 'stats' ? 'Bytt til standardvisning' : 'Bytt til statistikkvisning'
            );
        }

        // Set initial shifts
        this.shifts = [...this.userShifts];
        // Bind new break deduction settings
        this.setupBreakDeductionEventListeners();
        document.getElementById('fullMinuteRangeToggle').addEventListener('change', e => {
            if (e.target.checked && this.directTimeInput) {
                // Disable direct time input when full minute range is enabled
                this.directTimeInput = false;
                document.getElementById('directTimeInputToggle').checked = false;
            }
            this.fullMinuteRange = e.target.checked;
            // Save current selections before repopulating
            const currentSelections = {
                startHour: document.getElementById('startHour')?.value || '',
                startMinute: document.getElementById('startMinute')?.value || '',
                endHour: document.getElementById('endHour')?.value || '',
                endMinute: document.getElementById('endMinute')?.value || ''
            };

            // Repopulate time selects with new format
            this.populateTimeSelects();

            // Restore selections if they're still valid
            setTimeout(() => {
                if (currentSelections.startHour) document.getElementById('startHour').value = currentSelections.startHour;
                if (currentSelections.startMinute) {
                    const startMinuteSelect = document.getElementById('startMinute');
                    const option = startMinuteSelect.querySelector(`option[value="${currentSelections.startMinute}"]`);
                    if (option) startMinuteSelect.value = currentSelections.startMinute;
                }
                if (currentSelections.endHour) document.getElementById('endHour').value = currentSelections.endHour;
                if (currentSelections.endMinute) {
                    const endMinuteSelect = document.getElementById('endMinute');
                    const option = endMinuteSelect.querySelector(`option[value="${currentSelections.endMinute}"]`);
                    if (option) endMinuteSelect.value = currentSelections.endMinute;
                }
            }, 50);

            this.saveSettingsToSupabase();
        });

        document.getElementById('directTimeInputToggle').addEventListener('change', e => {
            if (e.target.checked && this.fullMinuteRange) {
                // Disable full minute range when direct time input is enabled
                this.fullMinuteRange = false;
                document.getElementById('fullMinuteRangeToggle').checked = false;
            }
            this.directTimeInput = e.target.checked;
            this.populateTimeSelects();
            this.saveSettingsToSupabase();
        });


        // Add event listeners for form inputs to save state automatically
        this.setupFormStateListeners();

        // Setup event listeners for new settings
        this.setupNewSettingsListeners();

        // Restore form state after initialization
        this.restoreFormState();

        // Add a small delay to ensure DOM is fully ready before animating progress bar
        setTimeout(() => {
            this.updateDisplay(true); // Animate progress bar on initial load
        }, 100);

        // Apply the user's preferred default shifts view
        this.shiftView = this.defaultShiftsView;
        this.switchShiftView(this.shiftView);

        window.addEventListener('resize', () => {
            // Skip stats updates in chatbox-view mode to prevent viewport instability
            if (!document.body.classList.contains('chatbox-view')) {
                this.updateStats(false);
            }
        });
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => {
                // Skip stats updates in chatbox-view mode to prevent viewport instability
                if (!document.body.classList.contains('chatbox-view')) {
                    this.updateStats(false);
                }
            });
        }

        const header = document.querySelector('.header');
        if (header && window.ResizeObserver) {
            let lastHeight = header.getBoundingClientRect().height;
            const ro = new ResizeObserver(entries => {
                const h = entries[0].target.getBoundingClientRect().height;
                if (Math.abs(h - lastHeight) > 1) {
                    lastHeight = h;
                    this.updateStats(false);
                }
            });
            ro.observe(header);
        }

        // Recalculate stat cards once all assets are loaded
        window.addEventListener('load', () => {
            // Don't animate on window load to avoid conflicts with initial animation
            if (!this.initialAnimationComplete) {
                this.updateStats(false);
            }
        });

        // Month navigation is now a static section header - no positioning needed

        // Setup monthly goal input after everything is loaded
        setupMonthlyGoalInput();

        // Check if we should show the recurring feature introduction
        this.checkAndShowRecurringIntro();

        // Profile pictures removed: no listeners to initialize

        // Add cleanup listener for page unload
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    },

    

    async saveOrgSettings() {
        try {
            const sel = document.getElementById('breakPolicySelect');
            if (!sel) return;
            const break_policy = sel.value;
            const headers = await this.getAuthHeaders();
            const res = await fetch(`${window.CONFIG.apiBase}/org-settings`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ break_policy })
            });
            if (res.ok) {
                const json = await res.json();
                this.orgSettings = { break_policy: json.break_policy };
                if (window.showToast) window.showToast('Lagret', 'success');
                this.updateOrgSettingsUI();
                // Re-render employees data so the breakdown reflects the new org policy
                if (this.currentView === 'employees') {
                    await this.fetchAndDisplayEmployeeShifts?.();
                }
            } else {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Kunne ikke lagre');
            }
        } catch (e) {
            console.error('saveOrgSettings error', e);
            if (window.showToast) window.showToast('Kunne ikke lagre', 'error');
        }
    },

    onOrgWageCaregiverToggle() {
        const toggle = document.getElementById('orgIsWageCaregiverToggle');
        this.isWageCaregiver = !!(toggle && toggle.checked);
        this.updateOrgSettingsUI();
        // Reflect change immediately in the tab bar (show/hide Ansatte tab)
        this.updateTabBarVisibility();
        // Keep profile modal toggle in sync if open
        const profileToggle = document.getElementById('isWageCaregiverToggle');
        if (profileToggle) profileToggle.checked = this.isWageCaregiver;
        // Persist flag in user_settings where we store profile-like preferences
        this.saveSettingsToSupabase();
    },

    updateOrgSettingsUI() {
        const disabled = !this.isWageCaregiver;
        const section = document.getElementById('orgBreakPolicySection');
        const select = document.getElementById('breakPolicySelect');
        [section].forEach(el => { if (el) el.style.opacity = disabled ? '0.5' : '1'; });
        if (select) select.disabled = disabled;
    },











    populateTimeSelects() {
        const startHour = document.getElementById('startHour');
        const endHour = document.getElementById('endHour');
        const startMinute = document.getElementById('startMinute');
        const endMinute = document.getElementById('endMinute');

        // Also populate recurring time fields
        const recurringStartHour = document.getElementById('recurringStartHour');
        const recurringEndHour = document.getElementById('recurringEndHour');
        const recurringStartMinute = document.getElementById('recurringStartMinute');
        const recurringEndMinute = document.getElementById('recurringEndMinute');

        if (this.directTimeInput) {
            // Replace dropdowns with text inputs for direct time entry
            this.replaceTimeDropdownsWithInputs();
        } else {
            // Use dropdowns
            this.ensureTimeDropdowns();

            // Populate simple shift time fields
            startHour.innerHTML = '<option value="">Fra time</option>';
            endHour.innerHTML = '<option value="">Til time</option>';
            startMinute.innerHTML = '<option value="">Fra minutt</option>';
            endMinute.innerHTML = '<option value="">Til minutt</option>';

            // Populate recurring shift time fields
            if (recurringStartHour) {
                recurringStartHour.innerHTML = '<option value="">Fra time</option>';
                recurringEndHour.innerHTML = '<option value="">Til time</option>';
                recurringStartMinute.innerHTML = '<option value="">Fra minutt</option>';
                recurringEndMinute.innerHTML = '<option value="">Til minutt</option>';
            }

            // Allow all hours from 00 to 23
            for (let h = 0; h <= 23; h++) {
                const hh = String(h).padStart(2,'0');
                startHour.innerHTML += `<option value="${hh}">${hh}</option>`;
                endHour.innerHTML += `<option value="${hh}">${hh}</option>`;

                if (recurringStartHour) {
                    recurringStartHour.innerHTML += `<option value="${hh}">${hh}</option>`;
                    recurringEndHour.innerHTML += `<option value="${hh}">${hh}</option>`;
                }
            }

            // Use either 15-minute intervals or full minute range based on setting
            if (this.fullMinuteRange) {
                // Full minute range 00-59
                for (let m = 0; m < 60; m++) {
                    const mm = String(m).padStart(2, '0');
                    const sel = m === 0 ? ' selected' : '';
                    startMinute.innerHTML += `<option value="${mm}"${sel}>${mm}</option>`;
                    endMinute.innerHTML += `<option value="${mm}"${sel}>${mm}</option>`;

                    if (recurringStartMinute) {
                        recurringStartMinute.innerHTML += `<option value="${mm}"${sel}>${mm}</option>`;
                        recurringEndMinute.innerHTML += `<option value="${mm}"${sel}>${mm}</option>`;
                    }
                }
            } else {
                // 15-minute intervals (default)
                ['00','15','30','45'].forEach((m, idx) => {
                    const sel = idx===0? ' selected':'';
                    startMinute.innerHTML += `<option value="${m}"${sel}>${m}</option>`;
                    endMinute.innerHTML += `<option value="${m}"${sel}>${m}</option>`;

                    if (recurringStartMinute) {
                        recurringStartMinute.innerHTML += `<option value="${m}"${sel}>${m}</option>`;
                        recurringEndMinute.innerHTML += `<option value="${m}"${sel}>${m}</option>`;
                    }
                });
            }
        }
    },

    replaceTimeDropdownsWithInputs() {
        const timeInputs = [
            { id: 'startHour', placeholder: 'Fra time (HH)' },
            { id: 'startMinute', placeholder: 'Fra minutt (MM)' },
            { id: 'endHour', placeholder: 'Til time (HH)' },
            { id: 'endMinute', placeholder: 'Til minutt (MM)' },
            // Also handle recurring time fields
            { id: 'recurringStartHour', placeholder: 'Fra time (HH)' },
            { id: 'recurringStartMinute', placeholder: 'Fra minutt (MM)' },
            { id: 'recurringEndHour', placeholder: 'Til time (HH)' },
            { id: 'recurringEndMinute', placeholder: 'Til minutt (MM)' }
        ];

        timeInputs.forEach(input => {
            const element = document.getElementById(input.id);
            if (element && element.tagName === 'SELECT') {
                const currentValue = element.value;
                const newInput = document.createElement('input');
                newInput.type = 'text';
                newInput.id = input.id;
                newInput.className = 'form-control time-input';
                newInput.placeholder = input.placeholder;
                newInput.maxLength = 2;
                newInput.pattern = '[0-9]{2}';
                newInput.value = currentValue;

                // Add input validation
                newInput.addEventListener('input', (e) => {
                    let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                    if (value.length > 2) value = value.slice(0, 2);

                    if (input.id.includes('Hour')) {
                        // Validate hours (00-23)
                        const hour = parseInt(value);
                        if (value.length === 2 && hour > 23) {
                            value = value.slice(0, 1);
                        }
                    } else {
                        // Validate minutes (00-59)
                        const minute = parseInt(value);
                        if (value.length === 2 && minute > 59) {
                            value = value.slice(0, 1);
                        }
                    }

                    e.target.value = value;
                });

                // Auto-pad with zero when leaving field
                newInput.addEventListener('blur', (e) => {
                    if (e.target.value.length === 1) {
                        e.target.value = '0' + e.target.value;
                    }
                });

                element.replaceWith(newInput);
            }
        });
    },

    ensureTimeDropdowns() {
        const timeSelects = [
            'startHour', 'startMinute', 'endHour', 'endMinute',
            'recurringStartHour', 'recurringStartMinute', 'recurringEndHour', 'recurringEndMinute'
        ];

        timeSelects.forEach(id => {
            const element = document.getElementById(id);
            if (element && element.tagName === 'INPUT') {
                const currentValue = element.value;
                const newSelect = document.createElement('select');
                newSelect.id = id;
                newSelect.className = 'form-control';

                element.replaceWith(newSelect);
            }
        });
    },

    /**
     * Load employees for shift forms
     */
    async loadEmployeesForShiftForms() {
        try {
            if (this.employees.length === 0) {
                await this.loadEmployees();
            }
            this.populateEmployeeSelectors();
            this.populateEmployeeFilterBar();
        } catch (error) {
            console.error('Error loading employees for shift forms:', error);
        }
    },

    /**
     * Populate employee selectors in shift forms
     */
    populateEmployeeSelectors() {
        const selectors = [
            'employeeSelect',
            'recurringEmployeeSelect',
            'editEmployeeSelect'
        ];

        selectors.forEach(selectorId => {
            const selector = document.getElementById(selectorId);
            if (!selector) return;

            // Clear existing options except the first one (Unassigned)
            while (selector.children.length > 1) {
                selector.removeChild(selector.lastChild);
            }

            // Add employee options
            this.employees.forEach(employee => {
                if (employee.archived_at) return; // Skip archived employees

                const option = document.createElement('option');
                option.value = employee.id;
                option.textContent = employee.name;
                selector.appendChild(option);
            });
        });

        // After populating, show selectors only if coming from Ansatte tab
        this.toggleEmployeeSelectorsVisibility(this.currentView === 'employees');
    },

    /**
     * Show or hide employee select controls inside add/edit shift modals
     */
    toggleEmployeeSelectorsVisibility(show) {
        // Always hide add-shift employee selectors; assignment comes from carousel selection
        ['employeeSelect', 'recurringEmployeeSelect'].forEach(id => {
            const select = document.getElementById(id);
            if (!select) return;
            const group = select.closest('.form-group') || select.parentElement;
            if (group) group.style.display = 'none';
        });
        // Do not manage edit select visibility here; handled elsewhere
    },

    /**
     * Employee filter bar disabled — carousel is the filter now
     */
    populateEmployeeFilterBar() {
        const filterBar = document.getElementById('employeeFilterBar');
        if (filterBar) {
            filterBar.style.display = 'none';
            const container = filterBar.querySelector('.filter-scroll-container');
            if (container) container.innerHTML = '';
        }
    },

    /**
     * Create a filter chip element
     */
    createFilterChip(employeeId, name, color, isActive) {
        const chip = document.createElement('button');
        chip.className = `filter-chip ${isActive ? 'active' : ''}`;
        chip.setAttribute('data-employee-id', employeeId);
        chip.setAttribute('aria-label', `Filter by ${name}`);

        const chipContent = document.createElement('span');
        chipContent.textContent = name;
        chip.appendChild(chipContent);

        if (color && employeeId) {
            const colorIndicator = document.createElement('span');
            colorIndicator.className = 'filter-chip-color';
            colorIndicator.style.backgroundColor = color;
            chip.insertBefore(colorIndicator, chipContent);
        }

        chip.addEventListener('click', () => {
            this.handleEmployeeFilter(employeeId);
        });

        return chip;
    },



    /**
     * Handle employee filter selection
     */
    handleEmployeeFilter(employeeId) {
        // Normalize empty string to null for "All"
        const normalized = employeeId || null;

        // Update selected employee
        this.selectedEmployeeId = normalized;

        // Update active state of filter chips
        const filterChips = document.querySelectorAll('.filter-chip');
        filterChips.forEach(chip => {
            const chipEmployeeId = chip.getAttribute('data-employee-id');
            chip.classList.toggle('active', chipEmployeeId === (normalized || ''));
        });

        // Apply or fetch based on current view
        if (this.currentView === 'employees') {
            this.fetchAndDisplayEmployeeShifts?.();
        } else {
            this.applyEmployeeFilter();
        }

        // Save filter state to localStorage
        if (normalized) {
            localStorage.setItem('selectedEmployeeId', normalized);
        } else {
            localStorage.removeItem('selectedEmployeeId');
        }

        // Update add-shift modal UI if open
        this.updateEmployeeAssignmentUIInModal?.();
    },

    // Update assignment UI inside add shift modal: show pill if selectedEmployeeId, otherwise show selectors
    updateEmployeeAssignmentUIInModal() {
        const pillId = 'selectedEmployeePill';
        const existingPill = document.getElementById(pillId);
        const employeeSelect = document.getElementById('employeeSelect');
        const recurringEmployeeSelect = document.getElementById('recurringEmployeeSelect');
        const employeeSelectGroup = employeeSelect?.closest('.form-group');
        const recurringSelectGroup = recurringEmployeeSelect?.closest('.form-group');

        // Determine if we have a current selection (view independent)
        const hasSelectedEmployeeId = this.selectedEmployeeId !== null;

        // Ensure selects reflect the selected employee when available
        if (hasSelectedEmployeeId) {
            if (employeeSelect) employeeSelect.value = this.selectedEmployeeId;
            if (recurringEmployeeSelect) recurringEmployeeSelect.value = this.selectedEmployeeId;
        }

        // Never show selects; assignment is driven by carousel selection
        if (employeeSelectGroup) employeeSelectGroup.style.display = 'none';
        if (recurringSelectGroup) recurringSelectGroup.style.display = 'none';

        // Create/update the pill only in employees view
        const modal = document.getElementById('addShiftModal');
        if (!modal) return;
        let pill = existingPill;
        if (!pill) {
            pill = document.createElement('div');
            pill.id = pillId;
            pill.style.display = 'none';
            pill.style.marginBottom = '16px';
            pill.innerHTML = `
                <div class="form-group">
                  <label>Ansatt</label>
                  <div class="selected-employee-pill" style="display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--surface)">
                    <span class="color-dot" style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#888"></span>
                    <span class="name"></span>
                  </div>
                </div>`;
            const form = modal.querySelector('#shiftForm');
            form?.insertBefore(pill, form.firstChild?.nextSibling?.nextSibling || form.firstChild);
        }

        // Populate pill details if we know the employee
        const selectedEmployee = this.getSelectedEmployee?.() || null;
        if (hasSelectedEmployeeId && selectedEmployee) {
            pill.style.display = '';
            const nameEl = pill.querySelector('.name');
            const dotEl = pill.querySelector('.color-dot');
            if (nameEl) nameEl.textContent = selectedEmployee.name;
            if (dotEl) dotEl.style.background = selectedEmployee.display_color || '#888';

            // Make the pill clickable to open Edit Employee modal
            const clickable = pill.querySelector('.selected-employee-pill');
            if (clickable && !clickable.dataset.boundEdit) {
                clickable.style.cursor = 'pointer';
                clickable.setAttribute('role', 'button');
                clickable.setAttribute('tabindex', '0');
                clickable.title = 'Rediger ansatt';
                clickable.addEventListener('click', (e) => {
                    try {
                        e.preventDefault();
                        e.stopPropagation();
                    } catch (_) {}
                    const employee = this.getSelectedEmployee?.();
                    if (employee) {
                        this.showEditEmployeeModal(employee);
                    }
                });
                clickable.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        const employee = this.getSelectedEmployee?.();
                        if (employee) {
                            this.showEditEmployeeModal(employee);
                        }
                    }
                });
                clickable.dataset.boundEdit = '1';
            }
        } else {
            pill.style.display = 'none';
        }
    },

    /**
     * Apply employee filter to shift display
     */
    applyEmployeeFilter() {
        if (this.currentView === 'employees') {
            // In Employees view, shifts come from the server via /employee-shifts
            this.fetchAndDisplayEmployeeShifts?.();
            this.updateEmployeeAssignmentUIInModal?.();
            return;
        }
        // In other views, always show user's own shifts (no employee filtering)
        // Employee filtering should only happen in the employees view
        this.shifts = [...this.userShifts];
        this.updateDisplay();
    },

    /**
     * Initialize employee state from URL params and localStorage
     */
    initializeEmployeeState() {
        // Check for employee filter in localStorage
        const savedEmployeeId = localStorage.getItem('selectedEmployeeId');
        if (savedEmployeeId) {
            this.selectedEmployeeId = savedEmployeeId;
        }
    },

    openAddShiftModal(targetMonth = null, targetYear = null) {
        // Close any existing expanded views, dropdowns, and modals first
        this.closeShiftDetails();
        this.closeSettings(false); // Don't save settings when closing as cleanup
        this.closeProfile();
        this.closeProfileDropdown();

        // Hide floating action bar when modal opens to prevent z-index conflicts
        const floatingBar = document.querySelector('.floating-action-bar');
        const floatingBarBackdrop = document.querySelector('.floating-action-bar-backdrop');
        if (floatingBar) {
            floatingBar.style.display = 'none';
        }
        if (floatingBarBackdrop) {
            floatingBarBackdrop.style.display = 'none';
        }

        // Populate form elements if they're empty
        const startHourElement = document.getElementById('startHour');
        if (startHourElement && startHourElement.tagName === 'SELECT' && !startHourElement.options.length) {
            this.populateTimeSelects();
        } else if (!startHourElement) {
            this.populateTimeSelects();
        }
        if (!document.getElementById('dateGrid').childElementCount) {
            this.populateDateGrid(targetMonth, targetYear);
        } else if (targetMonth !== null || targetYear !== null) {
            // If we have any target parameters, repopulate the grid
            this.populateDateGrid(targetMonth, targetYear);
        } else {
            // If no target parameters, always repopulate to show current month
            this.populateDateGrid(targetMonth, targetYear);
        }

        // Show the modal
        const modal = document.getElementById('addShiftModal');
        modal.style.display = 'flex';
        modal.classList.add('active');

        // Clear any previously selected dates
        this.selectedDates = [];
        const dateButtons = document.querySelectorAll('#dateGrid .date-cell');
        dateButtons.forEach(btn => btn.classList.remove('selected'));

        // Update the selected dates info
        this.updateSelectedDatesInfo();

        // Reset form
        document.getElementById('shiftForm').reset();
        // Default to simple tab
        this.switchAddShiftTab('simple');

        // Populate employee selectors
        this.populateEmployeeSelectors();

        // Update assignment UI (pill vs selector) based on context
        this.updateEmployeeAssignmentUIInModal();
    },

    // Update the selected dates info display
    updateSelectedDatesInfo() {
        const infoElement = document.getElementById('selectedDatesInfo');
        const countElement = document.getElementById('selectedDatesCount');

        if (!infoElement || !countElement) return;

        const count = this.selectedDates ? this.selectedDates.length : 0;

        if (count > 0) {
            countElement.textContent = count;
            infoElement.style.display = 'block';
        } else {
            infoElement.style.display = 'none';
        }
    },

    // Switch between simple and recurring add shift tabs
    switchAddShiftTab(tab) {
        const modal = document.getElementById('addShiftModal');
        const btns = modal.querySelectorAll('.tab-btn');

        // Update button active states
        btns.forEach((btn, index) => {
            const isSimpleTab = index === 0; // First button is "Enkel"
            const shouldBeActive = (tab === 'simple' && isSimpleTab) || (tab === 'recurring' && !isSimpleTab);
            btn.classList.toggle('active', shouldBeActive);
        });

        // Update content visibility
        const simple = document.getElementById('simpleFields');
        const recurring = document.getElementById('recurringFields');
        if (tab === 'simple') {
            simple.classList.add('active');
            recurring.classList.remove('active');
        } else {
            simple.classList.remove('active');
            recurring.classList.add('active');
        }

        // Show/hide employee selectors based on current view
        this.toggleEmployeeSelectorsVisibility(this.currentView === 'employees');

        // Reflect employee context in the modal (pill vs selectors)
        this.updateEmployeeAssignmentUIInModal?.();

    },

    closeAddShiftModal() {
        const modal = document.getElementById('addShiftModal');
        modal.style.display = 'none';
        modal.classList.remove('active');

        // Restore floating action bar visibility when modal closes
        const floatingBar = document.querySelector('.floating-action-bar');
        const floatingBarBackdrop = document.querySelector('.floating-action-bar-backdrop');
        if (floatingBar) {
            floatingBar.style.display = '';
        }
        if (floatingBarBackdrop) {
            floatingBarBackdrop.style.display = '';
        }
    },
    async addShift() {
        // Handle recurring shifts
        const recurringFields = document.getElementById('recurringFields');
        const recurringVisible = recurringFields && recurringFields.classList.contains('active');
        if (recurringVisible) {
            // Generate a shared seriesId for this recurring batch
            const seriesId = uuidv4();
            // Gather recurring parameters
            const freq = parseInt(document.getElementById('recurringFrequency').value, 10);
            const startDateStr = document.getElementById('recurringStartDate').value;
            const duration = parseFloat(document.getElementById('recurringDurationYears').value);
            const startHour = document.getElementById('recurringStartHour').value;
            const startMinute = document.getElementById('recurringStartMinute').value || '00';
            const endHour = document.getElementById('recurringEndHour').value;
            const endMinute = document.getElementById('recurringEndMinute').value || '00';
            const employeeId = this.selectedEmployeeId;

            if (!startDateStr || !freq || !duration || !startHour || !endHour) {
                // Show validation alert message
                if (window.ErrorHelper) {
                    window.ErrorHelper.showError('Vennligst fyll ut alle påkrevde felt for å opprette en vaktserie.', {
                        type: 'warning',
                        duration: 4000
                    });
                } else {
                    alert('Vennligst fyll ut alle påkrevde felt for å opprette en vaktserie.');
                }

                // Show validation error with button animation
                const modalAddButton = document.querySelector('.btn-primary[onclick="app.addShift()"]');
                if (modalAddButton) {
                    modalAddButton.style.background = 'var(--danger)';
                    modalAddButton.style.transform = 'scale(0.95)';
                    modalAddButton.style.transition = 'all 0.2s ease';
                    setTimeout(() => {
                        modalAddButton.style.background = '';
                        modalAddButton.style.transform = 'scale(1)';
                    }, 1000);
                }
                return;
            }

            const first = new Date(startDateStr);
            // Get weekday from the selected date (0=Sunday, 1=Monday, etc.)
            const weekday = first.getDay();

            // Build occurrences
            const dates = [new Date(first)];
            let next = new Date(first);

            // Calculate end date correctly by adding months (duration * 12)
            const endDate = new Date(first);
            endDate.setMonth(endDate.getMonth() + Math.floor(duration * 12));

            while (true) {
                next = new Date(next);
                next.setDate(next.getDate() + freq * 7);
                if (next > endDate) break;
                dates.push(new Date(next));
            }

            // Show confirmation dialog for recurring shifts
            const totalShifts = dates.length;
            const confirmMessage = `Du er i ferd med å opprette ${totalShifts} gjentakende vakter.\n\nVil du fortsette?`;

            if (!confirm(confirmMessage)) {
                // User cancelled, reset button state and return
                const modalAddButton = document.querySelector('.btn-primary[onclick="app.addShift()"]');
                if (modalAddButton) {
                    modalAddButton.style.transform = 'scale(1)';
                    modalAddButton.style.transition = 'transform 0.1s ease';
                }
                return;
            }

            // Add confirmation with button animation after user confirms
            const modalAddButton = document.querySelector('.btn-primary[onclick="app.addShift()"]');
            if (modalAddButton) {
                modalAddButton.style.transform = 'scale(0.95)';
                modalAddButton.style.transition = 'transform 0.1s ease';
                setTimeout(() => {
                    modalAddButton.style.transform = 'scale(1)';
                }, 100);
            }

            // Insert each shift
            const { data: { user }, error: authError } = await window.supa.auth.getUser();
            if (authError || !user) { alert('Autentiseringsfeil'); return; }

            for (const d of dates) {
                const dateStr = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;

                if (employeeId) {
                    // Create employee shift via server API (with snapshots)
                    const { data: { session } } = await window.supa.auth.getSession();
                    const headers = { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' };
                    const resp = await fetch(`${window.CONFIG.apiBase}/employee-shifts`, {
                        method: 'POST', headers,
                        body: JSON.stringify({
                            employee_id: employeeId,
                            shift_date: dateStr,
                            start_time: `${startHour}:${startMinute}`,
                            end_time: `${endHour}:${endMinute}`
                        })
                    });
                    if (!resp.ok) { const e = await resp.json().catch(() => ({})); console.error('Gjentakende API-feil:', e); continue; }
                } else {
                    // Regular user shift with series, saved directly to user_shifts
                    const insertData = {
                        user_id: user.id,
                        shift_date: dateStr,
                        start_time: `${startHour}:${startMinute}`,
                        end_time: `${endHour}:${endMinute}`,
                        shift_type: weekday === 0 ? 2 : (weekday === 6 ? 1 : 0),
                        series_id: seriesId
                    };
                    const { data: saved, error } = await window.supa.from('user_shifts').insert(insertData).select().single();
                    if (error) { console.error('Gjentakende feil:', error); continue; }

                    this.userShifts.push({
                        id: saved.id,
                        date: new Date(d),
                        startTime: `${startHour}:${startMinute}`,
                        endTime: `${endHour}:${endMinute}`,
                        type: weekday === 0 ? 2 : (weekday === 6 ? 1 : 0),
                        seriesId
                    });
                }
            }

            this.shifts = [...this.userShifts];
            this.refreshUI(this.shifts);
            this.closeAddShiftModal();

            // Show success animation instead of alert
            const addButton = document.querySelector('.add-btn');
            if (addButton) {
                addButton.style.transform = 'scale(1.1)';
                addButton.style.background = 'var(--success)';
                addButton.style.transition = 'all 0.3s ease';
                setTimeout(() => {
                    addButton.style.transform = 'scale(1)';
                    addButton.style.background = '';
                }, 500);
            }
            return;
        }
        try {
            if (!this.selectedDates || this.selectedDates.length === 0) {
                // Show validation alert message
                if (window.ErrorHelper) {
                    window.ErrorHelper.showError('Vennligst velg en dato før du lagrer vakten.', {
                        type: 'warning',
                        duration: 4000
                    });
                } else {
                    alert('Vennligst velg en dato før du lagrer vakten.');
                }

                // Show validation error with button animation
                const modalAddButton = document.querySelector('.btn-primary[onclick="app.addShift()"]');
                if (modalAddButton) {
                    modalAddButton.style.background = 'var(--danger)';
                    modalAddButton.style.transform = 'scale(0.95)';
                    modalAddButton.style.transition = 'all 0.2s ease';
                    setTimeout(() => {
                        modalAddButton.style.background = '';
                        modalAddButton.style.transform = 'scale(1)';
                    }, 1000);
                }
                return;
            }

            const startHour = document.getElementById('startHour').value;
            const startMinute = document.getElementById('startMinute').value || '00';
            const endHour = document.getElementById('endHour').value;
            const endMinute = document.getElementById('endMinute').value || '00';
            const employeeId = this.selectedEmployeeId;

            if (!startHour || !endHour) {
                // Show validation alert message
                if (window.ErrorHelper) {
                    window.ErrorHelper.showError('Vennligst fyll ut arbeidstid (start- og sluttidspunkt).', {
                        type: 'warning',
                        duration: 4000
                    });
                } else {
                    alert('Vennligst fyll ut arbeidstid (start- og sluttidspunkt).');
                }

                // Show validation error with button animation
                const modalAddButton = document.querySelector('.btn-primary[onclick="app.addShift()"]');
                if (modalAddButton) {
                    modalAddButton.style.background = 'var(--danger)';
                    modalAddButton.style.transform = 'scale(0.95)';
                    modalAddButton.style.transition = 'all 0.2s ease';
                    setTimeout(() => {
                        modalAddButton.style.background = '';
                        modalAddButton.style.transform = 'scale(1)';
                    }, 1000);
                }
                return;
            }

            const { data: { user }, error: authError } = await window.supa.auth.getUser();
            if (authError) {
                console.error('addShift: Authentication error:', authError);
                alert('Feil ved autentisering');
                return;
            }
            if (!user) {
                alert("Du er ikke innlogget");
                return;
            }

            // Process each selected date
            const createdShifts = [];
            for (const selectedDate of this.selectedDates) {
                const dayOfWeek = selectedDate.getDay();
                const type = dayOfWeek === 0 ? 2 : (dayOfWeek === 6 ? 1 : 0);
                const newShift = {
                    date: new Date(selectedDate),
                    startTime: `${startHour}:${startMinute}`,
                    endTime: `${endHour}:${endMinute}`,
                    type
                };

                // Note: Removed date validation since the modal can now display different months
                // The selected dates from the modal's date grid are already correct

                // Create date string for database
                const finalDateStr = `${newShift.date.getFullYear()}-${(newShift.date.getMonth() + 1).toString().padStart(2, '0')}-${newShift.date.getDate().toString().padStart(2, '0')}`;

                if (employeeId) {
                    // Employee context: route via server API to create employee_shifts with snapshots
                    const { data: { session } } = await window.supa.auth.getSession();
                    const headers = { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' };
                    const resp = await fetch(`${window.CONFIG.apiBase}/employee-shifts`, {
                        method: 'POST', headers,
                        body: JSON.stringify({
                            employee_id: employeeId,
                            shift_date: finalDateStr,
                            start_time: newShift.startTime,
                            end_time: newShift.endTime
                        })
                    });
                    if (!resp.ok) {
                        const e = await resp.json().catch(() => ({}));
                        console.error('addShift: Employee-shift API error:', e);
                        alert(`Kunne ikke lagre vakt for ${finalDateStr}: ${e.error || resp.statusText}`);
                        continue;
                    }
                } else {
                    // Regular user shift
                    const insertData = {
                        user_id: user.id,
                        shift_date: finalDateStr,
                        start_time: newShift.startTime,
                        end_time: newShift.endTime,
                        shift_type: newShift.type
                    };

                    const { data: saved, error } = await window.supa.from("user_shifts")
                        .insert(insertData)
                        .select()
                        .single();

                    if (error) {
                        console.error('addShift: Database error when saving shift:', error);
                        alert(`Kunne ikke lagre vakt for ${finalDateStr}: ${error.message}`);
                        continue; // Skip this date and continue with others
                    }

                    newShift.id = saved.id;
                    // Add to userShifts array only for regular shifts
                    this.userShifts.push(newShift);
                    createdShifts.push(newShift);
                }

                // For UI: keep local representation
                newShift.employee_id = employeeId;
                newShift.employee = employeeId ? this.employees.find(emp => emp.id === employeeId) : null;
            }

            // Update this.shifts
            // If we created employee shifts via API, refresh the employee view; otherwise update local user shifts
            if (employeeId) {
                // Re-fetch to include snapshots and server-calculated fields
                await this.fetchAndDisplayEmployeeShifts?.();
            } else {
                this.shifts = [...this.userShifts];
                this.refreshUI(this.shifts);
            }

            document.getElementById('shiftForm').reset();
            this.selectedDates = [];
            document.querySelectorAll('.date-cell').forEach(cell => {
                cell.classList.remove('selected');
            });

            this.updateSelectedDatesInfo(); // Update the info display
            this.clearFormState();

            // Show success animation instead of alert
            if (createdShifts.length > 0) {
                const mainAddButton = document.querySelector('.add-btn');
                if (mainAddButton) {
                    mainAddButton.style.transform = 'scale(1.1)';
                    mainAddButton.style.background = 'var(--success)';
                    mainAddButton.style.transition = 'all 0.3s ease';
                    setTimeout(() => {
                        mainAddButton.style.transform = 'scale(1)';
                        mainAddButton.style.background = '';
                    }, 500);
                }
            }

        } catch (e) {
            console.error('addShift: Critical error:', e);
            alert(`En uventet feil oppstod: ${e.message}`);
        }
    },

    // Helper function to calculate ISO week number
    getISOWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
        return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
    },

    // Helper function to get the start and end dates for a specific ISO week
    getWeekDateRange(weekNumber, year) {
        // Create a date for January 4th of the given year (always in week 1)
        const jan4 = new Date(Date.UTC(year, 0, 4));

        // Find the Monday of week 1
        const dayOfWeek = jan4.getUTCDay() || 7; // Convert Sunday (0) to 7
        const mondayOfWeek1 = new Date(jan4);
        mondayOfWeek1.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1);

        // Calculate the Monday of the target week
        const mondayOfTargetWeek = new Date(mondayOfWeek1);
        mondayOfTargetWeek.setUTCDate(mondayOfWeek1.getUTCDate() + (weekNumber - 1) * 7);

        // Calculate the Sunday of the target week
        const sundayOfTargetWeek = new Date(mondayOfTargetWeek);
        sundayOfTargetWeek.setUTCDate(mondayOfTargetWeek.getUTCDate() + 6);

        // Convert to local dates for consistency with the rest of the app
        const startDate = new Date(mondayOfTargetWeek.getUTCFullYear(), mondayOfTargetWeek.getUTCMonth(), mondayOfTargetWeek.getUTCDate());
        const endDate = new Date(sundayOfTargetWeek.getUTCFullYear(), sundayOfTargetWeek.getUTCMonth(), sundayOfTargetWeek.getUTCDate());

        return { startDate, endDate };
    },

    // Drill-down state management functions
    enterDrillDownMode(weekNumber) {
        console.log('Entering drill-down mode for week:', weekNumber);

        // Comprehensive tooltip cleanup before entering drill-down mode
        this.clearAllTooltips();

        this.drillDownMode = true;
        this.selectedWeek = weekNumber;
        this.updateWeeklyHoursChart();
        this.updateDisplay(false); // Update stat cards without animation
    },

    exitDrillDownMode() {
        console.log('Exiting drill-down mode');

        // Comprehensive tooltip cleanup before exiting drill-down mode
        this.clearAllTooltips();

        // Clean up wage card tooltips
        const hoursCard = document.querySelector('.chart-hours-value-card');
        const shiftCountCard = document.querySelector('.chart-shifts-count-card');

        if (hoursCard) {
            hoursCard.classList.remove('has-tooltip', 'tooltip-active');
            hoursCard.removeAttribute('data-tooltip');
            this.removeWageCardTooltip(hoursCard);
        }

        if (shiftCountCard) {
            shiftCountCard.classList.remove('has-tooltip', 'tooltip-active');
            shiftCountCard.removeAttribute('data-tooltip');
            this.removeWageCardTooltip(shiftCountCard);
        }

        // Hide wage card tooltip
        const wageTooltip = document.getElementById('wageCardTooltip');
        if (wageTooltip) {
            wageTooltip.classList.remove('show');
        }

        this.drillDownMode = false;
        this.selectedWeek = null;
        this.removeBackButton();
        this.updateWeeklyHoursChart();
        this.updateDisplay(false); // Update stat cards without animation
    },

    isInDrillDownMode() {
        return this.drillDownMode && this.selectedWeek !== null;
    },

    // Comprehensive tooltip cleanup function
    clearAllTooltips() {
        // Call the stored hideChartTooltip function if it exists
        if (this.hideChartTooltip) {
            this.hideChartTooltip();
        }

        // Also directly ensure tooltip is hidden by manipulating DOM
        const chartTooltip = document.getElementById('chartTooltip');
        if (chartTooltip) {
            chartTooltip.classList.remove('show');
        }

        // Remove tooltip-active class from any bars
        const activeBars = document.querySelectorAll('.chart-bar.tooltip-active');
        activeBars.forEach(bar => {
            bar.classList.remove('tooltip-active');
        });
    },

    // Add back button for drill-down navigation
    addBackButton() {
        // Remove existing back button if any
        this.removeBackButton();

        const progressBar = document.querySelector('.chart-progress-bar');
        if (!progressBar) return;

        // Create wrapper container for progress bar and back button
        const progressWrapper = document.createElement('div');
        progressWrapper.className = 'progress-bar-wrapper';
        progressWrapper.id = 'progressBarWrapper';

        // Move progress bar into wrapper
        const progressParent = progressBar.parentNode;
        progressParent.insertBefore(progressWrapper, progressBar);
        progressWrapper.appendChild(progressBar);

        // Create back button
        const backButton = document.createElement('button');
        backButton.id = 'drillDownBackButton';
        backButton.className = 'drill-down-back-button';
        backButton.innerHTML = `
            <svg class="back-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            <span>Uke ${this.selectedWeek}</span>
        `;
        backButton.setAttribute('aria-label', `Tilbake til ukeoversikt fra uke ${this.selectedWeek}`);

        backButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.exitDrillDownMode();
        });

        // Add back button to wrapper
        progressWrapper.appendChild(backButton);
    },

    // Remove back button and restore original progress bar structure
    removeBackButton() {
        const progressWrapper = document.getElementById('progressBarWrapper');
        const backButton = document.getElementById('drillDownBackButton');

        if (progressWrapper) {
            const progressBar = progressWrapper.querySelector('.chart-progress-bar');
            const wrapperParent = progressWrapper.parentNode;

            // Move progress bar back to original position
            if (progressBar && wrapperParent) {
                wrapperParent.insertBefore(progressBar, progressWrapper);
            }

            // Remove wrapper
            progressWrapper.remove();
        } else if (backButton) {
            // Fallback: just remove button if wrapper doesn't exist
            backButton.remove();
        }
    },

    // Get all shifts for a specific week (including shifts from adjacent months)
    getShiftsForWeek(weekNumber) {
        // Get the date range for this week
        const { startDate, endDate } = this.getWeekDateRange(weekNumber, this.currentYear);

        // Get all shifts that fall within this week's date range
        const weekShifts = this.shifts.filter(shift => {
            const shiftDate = new Date(shift.date);
            return shiftDate >= startDate && shiftDate <= endDate;
        });

        // Add metadata to distinguish current month vs adjacent month shifts
        return weekShifts.map(shift => {
            const isCurrentMonth = shift.date.getMonth() === this.currentMonth - 1 &&
                                   shift.date.getFullYear() === this.currentYear;
            return {
                ...shift,
                isCurrentMonth
            };
        });
    },

    // Get daily data for a specific week
    getDailyDataForWeek(weekNumber) {
        const weekShifts = this.getShiftsForWeek(weekNumber);
        const dailyData = {};
        let totalWeekHours = 0;
        let totalWeekEarnings = 0;
        let totalCurrentMonthHours = 0;
        let totalCurrentMonthEarnings = 0;

        // Group shifts by day of week (0 = Sunday, 1 = Monday, etc.)
        weekShifts.forEach(shift => {
            const dayOfWeek = shift.date.getDay();
            if (!dailyData[dayOfWeek]) {
                dailyData[dayOfWeek] = {
                    hours: 0,
                    earnings: 0,
                    shifts: [],
                    date: new Date(shift.date), // Store the actual date for this day
                    hasCurrentMonthShifts: false,
                    hasAdjacentMonthShifts: false
                };
            }

            const calc = this.calculateShift(shift);
            dailyData[dayOfWeek].hours += calc.hours;
            dailyData[dayOfWeek].earnings += calc.total;
            dailyData[dayOfWeek].shifts.push(shift);

            // Track which types of shifts this day has
            if (shift.isCurrentMonth) {
                dailyData[dayOfWeek].hasCurrentMonthShifts = true;
                totalCurrentMonthHours += calc.hours;
                totalCurrentMonthEarnings += calc.total;
            } else {
                dailyData[dayOfWeek].hasAdjacentMonthShifts = true;
            }

            totalWeekHours += calc.hours;
            totalWeekEarnings += calc.total;
        });

        return {
            dailyData,
            totalWeekHours,
            totalWeekEarnings,
            totalCurrentMonthHours,
            totalCurrentMonthEarnings,
            weekNumber
        };
    },

    // Get the days of the week that have shifts for a given week
    getDaysWithShifts(weekNumber) {
        const { dailyData } = this.getDailyDataForWeek(weekNumber);
        return Object.keys(dailyData).map(day => parseInt(day)).sort((a, b) => {
            // Sort so Monday (1) comes first, then Tuesday (2), etc., with Sunday (0) at the end
            if (a === 0) return 1; // Sunday goes to end
            if (b === 0) return -1; // Sunday goes to end
            return a - b;
        });
    },

    populateDateGrid(targetMonth = null, targetYear = null) {
        const dateGrid = document.getElementById('dateGrid');
        if (!dateGrid) {
            // dateGrid element doesn't exist (modal not open), so skip population
            return;
        }
        const year = targetYear !== null ? targetYear : this.currentYear;
        const monthIdx = targetMonth !== null ? targetMonth - 1 : this.currentMonth - 1;
        const firstDay = new Date(year, monthIdx, 1);
        const lastDay = new Date(year, monthIdx+1, 0);
        const startDate = new Date(firstDay);
        const offset = firstDay.getDay()===0 ? 6 : firstDay.getDay()-1;
        startDate.setDate(startDate.getDate() - offset);
        dateGrid.innerHTML = '';

        // Get shifts for the current month to show blue dots
        const monthShifts = this.shifts.filter(shift =>
            shift.date.getMonth() === monthIdx &&
            shift.date.getFullYear() === year
        );

        // Create a lookup for dates with shifts
        const shiftDates = new Set();
        monthShifts.forEach(shift => {
            shiftDates.add(shift.date.getDate());
        });

        // Add week number header
        const weekHeader = document.createElement('div');
        weekHeader.textContent = '';
        weekHeader.className = 'week-number header';
        dateGrid.appendChild(weekHeader);

        // Add day headers
        ['M','T','O','T','F','L','S'].forEach(day => {
            const hdr = document.createElement('div');
            hdr.textContent = day;
            hdr.style.cssText = 'font-weight:600;font-size:12px;color:var(--text-secondary);text-align:center;padding:8px;';
            dateGrid.appendChild(hdr);
        });

        // Add week numbers and date cells
        for (let i=0;i<42;i++){
            // Add week number at the start of each row (every 7 cells)
            if (i % 7 === 0) {
                const weekDate = new Date(startDate);
                weekDate.setDate(startDate.getDate() + i);
                const weekNum = this.getISOWeekNumber(weekDate);
                const weekCell = document.createElement('div');
                weekCell.className = 'week-number';
                weekCell.textContent = weekNum;
                dateGrid.appendChild(weekCell);
            }
            const cellDate = new Date(startDate);
            cellDate.setDate(startDate.getDate()+i);
            const cell = document.createElement('div');
            cell.className='date-cell';

            // Create cell content wrapper
            const cellContent = document.createElement('div');
            cellContent.className = 'date-cell-content';
            cellContent.textContent = cellDate.getDate();

            // Add blue dot if this date has shifts
            if (cellDate.getMonth() === monthIdx && shiftDates.has(cellDate.getDate())) {
                const dot = document.createElement('div');
                dot.className = 'shift-indicator-dot';
                cellContent.appendChild(dot);
                cell.classList.add('has-shift');
            }

            // Add current date class if this is today
            const today = new Date();
            if (cellDate.getDate() === today.getDate() &&
                cellDate.getMonth() === today.getMonth() &&
                cellDate.getFullYear() === today.getFullYear()) {
                cell.classList.add('current-date');
            }

            cell.appendChild(cellContent);

            if (cellDate.getMonth()!==monthIdx) cell.classList.add('disabled');
            else {
                // Check if this date should be initially selected
                if (this.selectedDates && this.selectedDates.length > 0) {
                    const dateKey = cellDate.toDateString();
                    const isSelected = this.selectedDates.some(d => d.toDateString() === dateKey);
                    if (isSelected) {
                        cell.classList.add('selected');
                    }
                }

                cell.addEventListener('click',()=>{
                    // Initialize selectedDates array if it doesn't exist
                    if (!this.selectedDates) {
                        this.selectedDates = [];
                    }

                    const dateKey = cellDate.toDateString();
                    const existingIndex = this.selectedDates.findIndex(d => d.toDateString() === dateKey);

                    if (existingIndex >= 0) {
                        // Date is already selected, remove it (deselect)
                        this.selectedDates.splice(existingIndex, 1);
                        cell.classList.remove('selected');
                    } else {
                        // Date is not selected, add it
                        this.selectedDates.push(new Date(cellDate));
                        cell.classList.add('selected');
                    }

                    this.updateSelectedDatesInfo(); // Update the info display
                    this.saveFormState(); // Save form state when date selection changes
                });
            }
            dateGrid.appendChild(cell);
        }
    },








    changeMonth(month) {
        this.currentMonth = month;

        // Use debounced update to prevent excessive rendering on rapid navigation
        this.debouncedUpdateDisplay(true);
        // Note: Don't save currentMonth to settings - it should always default to current month on page load
    },

    navigateToPreviousMonth() {
        let newMonth = this.currentMonth - 1;
        let newYear = this.currentYear;

        if (newMonth < 1) {
            newMonth = 12;
            newYear = this.currentYear - 1;
        }

        this.currentMonth = newMonth;
        this.currentYear = newYear;

        // Use debounced update to prevent excessive rendering on rapid navigation
        this.debouncedUpdateDisplay(true);
    },

    navigateToNextMonth() {
        let newMonth = this.currentMonth + 1;
        let newYear = this.currentYear;

        if (newMonth > 12) {
            newMonth = 1;
            newYear = this.currentYear + 1;
        }

        this.currentMonth = newMonth;
        this.currentYear = newYear;

        // Use debounced update to prevent excessive rendering on rapid navigation
        this.debouncedUpdateDisplay(true);
    },

    // Debounced update display to prevent excessive rendering during rapid month navigation
    debouncedUpdateDisplay(shouldAnimate = false) {
        // Clear any pending navigation update
        if (this.monthNavigationTimeout) {
            clearTimeout(this.monthNavigationTimeout);
        }



        // Refresh DOM cache to ensure fresh element references
        domCache.refresh();

        // Reset progress bar state to ensure clean animation
        const fill = document.querySelector('.chart-progress-fill') ||
                     document.querySelector('.progress-fill');
        if (fill) {
            fill.dataset.animating = 'false';
            fill.classList.remove('loading');
        }

        // Debounce the actual update to prevent excessive calls
        // Use shorter delay on mobile for better responsiveness
        const isMobile = window.innerWidth <= 768;
        const debounceDelay = isMobile ? 150 : 100; // Slightly longer on mobile for better performance

        this.monthNavigationTimeout = setTimeout(() => {
            this.updateDisplay(shouldAnimate);
            this.monthNavigationTimeout = null;
        }, debounceDelay);
    },

    // Month navigation positioning function removed - now using static section header
    async loadFromSupabase() {
        const { data: { user } } = await window.supa.auth.getUser();
        if (!user) {
            this.setDefaultSettings();
            this.updateDisplay();
            return;
        }

        try {
            // Fetch shifts with employee data
            const { data: shifts, error: shiftsError } = await window.supa
                .from('user_shifts')
                .select('*')
                .eq('user_id', user.id);

            if (shiftsError) {
                console.error('Error fetching shifts from Supabase:', shiftsError);
            } else {
                // Map shifts to app format
                this.userShifts = (shifts || []).map(s => ({
                    id: s.id,
                    date: new Date(s.shift_date + 'T00:00:00.000Z'),
                    startTime: s.start_time,
                    endTime: s.end_time,
                    type: s.shift_type,
                    seriesId: s.series_id || null,
                    employee_id: null,
                    employee: null
                }));

                // Set current shifts
                this.shifts = [...this.userShifts];
            }

            // Fetch user settings
            const { data: settings, error: settingsError } = await window.supa
                .from('user_settings')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (settingsError && settingsError.code !== 'PGRST116') {
                console.error('Error fetching settings from Supabase:', settingsError);
                // Set default values if no settings found
                this.setDefaultSettings();
            } else if (settings) {
                // Load settings from database - handle different possible column names
                this.usePreset = settings.use_preset !== false; // Default to true
                this.customWage = settings.custom_wage || 200;

                this.currentWageLevel = settings.wage_level || settings.current_wage_level || 1;

                // Ensure customBonuses has proper structure
                const loadedBonuses = settings.custom_bonuses || {};
                this.customBonuses = {
                    weekday: loadedBonuses.weekday || [],
                    saturday: loadedBonuses.saturday || [],
                    sunday: loadedBonuses.sunday || []
                };
                // Always set to current month on page load
                this.currentMonth = new Date().getMonth() + 1;
                // Load selected year, default to current year if not set
                this.currentYear = settings.current_year || new Date().getFullYear();

                this.pauseDeduction = settings.pause_deduction || false; // Legacy setting
                // Load new break deduction settings
                this.pauseDeductionEnabled = settings.pause_deduction_enabled !== false;
                this.pauseDeductionMethod = settings.pause_deduction_method || 'proportional';
                this.pauseThresholdHours = parseFloat(settings.pause_threshold_hours) || 5.5;
                this.pauseDeductionMinutes = parseInt(settings.pause_deduction_minutes) || 30;
                this.auditBreakCalculations = true; // Always enabled internally (UI removed)



                this.fullMinuteRange = settings.full_minute_range || false;
                            this.directTimeInput = settings.direct_time_input || false;
            this.monthlyGoal = settings.monthly_goal || 20000;
                            this.hasSeenRecurringIntro = settings.has_seen_recurring_intro || false;
                this.currencyFormat = settings.currency_format || false;

                this.defaultShiftsView = settings.default_shifts_view || 'list';
                this.taxDeductionEnabled = settings.tax_deduction_enabled === true;
                this.taxPercentage = parseFloat(settings.tax_percentage) || 0.0;
                this.payrollDay = parseInt(settings.payroll_day) || 15;
                this.isWageCaregiver = settings.is_wage_caregiver === true;



            } else {
                // No settings found, set defaults
                this.setDefaultSettings();
            }

            // Update UI elements to reflect loaded settings
            this.updateSettingsUI();
            // Update tab bar visibility based on settings
            this.updateTabBarVisibility();
            // Don't call updateDisplay here - it will be called with animation in init()
        } catch (e) {
            console.error('Error in loadFromSupabase:', e);
            this.setDefaultSettings();
        }
    },

    setDefaultSettings() {
        this.usePreset = true;
        this.customWage = 200;
        this.currentWageLevel = 1;
        this.customBonuses = {
            weekday: [],
            saturday: [],
            sunday: []
        };
        this.taxDeductionEnabled = false;
        this.taxPercentage = 0.0;
        this.payrollDay = 15;
        this.isWageCaregiver = false; // Default payroll day (15th of each month)
        this.currentMonth = new Date().getMonth() + 1; // Default to current month
        this.currentYear = new Date().getFullYear(); // Default to current year
        this.pauseDeduction = false; // Legacy setting - kept for backward compatibility
        // New legal break deduction settings
        this.pauseDeductionEnabled = true; // Enable break deduction by default
        this.pauseDeductionMethod = 'proportional'; // Legal-compliant default method
        this.pauseThresholdHours = 5.5; // Standard threshold
        this.pauseDeductionMinutes = 30; // Standard 30-minute break
        this.auditBreakCalculations = true; // Always enabled internally (UI removed)

        this.fullMinuteRange = false; // Default to 15-minute intervals
        this.directTimeInput = false; // Default to dropdown time selection
        this.monthlyGoal = 20000; // Default monthly goal
        this.hasSeenRecurringIntro = false; // Track if user has seen recurring feature intro
        this.currencyFormat = false; // Default to "kr" instead of "NOK"

        this.defaultShiftsView = 'list'; // Default to list view for shifts
    },

    // Helper function to test custom bonuses
    setTestCustomBonuses() {
        this.customBonuses = {
            weekday: [
                { from: "18:00", to: "22:00", rate: 25 }
            ],
            saturday: [
                { from: "13:00", to: "18:00", rate: 50 }
            ],
            sunday: [
                { from: "00:00", to: "23:59", rate: 100 }
            ]
        };
        this.populateCustomBonusSlots();
    },

    updateSettingsUI() {
        // Update UI elements to match loaded settings
        const usePresetToggle = document.getElementById('usePresetToggle');
        if (usePresetToggle) {
            usePresetToggle.checked = this.usePreset;
        }

        const wageSelect = document.getElementById('wageSelect');
        if (wageSelect) {
            wageSelect.value = this.currentWageLevel;
        }

        const customWageInput = document.getElementById('customWageInput');
        if (customWageInput) {
            customWageInput.value = this.customWage;
        }

        // Update new break deduction settings UI
        const pauseDeductionEnabledToggle = document.getElementById('pauseDeductionEnabledToggle');
        if (pauseDeductionEnabledToggle) {
            pauseDeductionEnabledToggle.checked = this.pauseDeductionEnabled;
        }

        const pauseDeductionMethodSelect = document.getElementById('pauseDeductionMethodSelect');
        if (pauseDeductionMethodSelect) {
            // Map org break policy to closest UI method for display
            const policy = this.orgSettings?.break_policy;
            const mapped = policy === 'fixed_0_5_over_5_5h' ? 'end_of_shift'
                         : policy === 'none' ? 'none'
                         : this.pauseDeductionMethod;
            pauseDeductionMethodSelect.value = mapped;
        }

        const pauseThresholdInput = document.getElementById('pauseThresholdInput');
        if (pauseThresholdInput) {
            pauseThresholdInput.value = this.pauseThresholdHours;
        }

        const pauseDeductionMinutesInput = document.getElementById('pauseDeductionMinutesInput');
        if (pauseDeductionMinutesInput) {
            pauseDeductionMinutesInput.value = this.pauseDeductionMinutes;
        }

        // auditBreakCalculations UI element removed - now handled internally

        // Update break deduction sections visibility and method explanation
        this.toggleBreakDeductionSections();
        this.updateMethodExplanation();

        const taxDeductionToggle = document.getElementById('taxDeductionToggle');
        if (taxDeductionToggle) {
            taxDeductionToggle.checked = this.taxDeductionEnabled;
        }

        const taxPercentageInput = document.getElementById('taxPercentageInput');
        if (taxPercentageInput) {
            taxPercentageInput.value = this.taxPercentage;
        }

        const payrollDayInput = document.getElementById('payrollDayInput');
        if (payrollDayInput) {
            payrollDayInput.value = this.payrollDay;
        }

        // Show/hide tax percentage section based on toggle state
        this.toggleTaxPercentageSection();



        const fullMinuteRangeToggle = document.getElementById('fullMinuteRangeToggle');
        if (fullMinuteRangeToggle) {
            fullMinuteRangeToggle.checked = this.fullMinuteRange;
        }

        const directTimeInputToggle = document.getElementById('directTimeInputToggle');
        if (directTimeInputToggle) {
            directTimeInputToggle.checked = this.directTimeInput;
        }

        const currencyFormatToggle = document.getElementById('currencyFormatToggle');
        if (currencyFormatToggle) {
            currencyFormatToggle.checked = this.currencyFormat;
        }



        const defaultShiftsViewToggle = document.getElementById('defaultShiftsViewToggle');
        if (defaultShiftsViewToggle) {
            defaultShiftsViewToggle.checked = this.defaultShiftsView === 'calendar';
        }

        // Update wage caregiver toggle
        const isWageCaregiverToggle = document.getElementById('isWageCaregiverToggle');
        if (isWageCaregiverToggle) {
            isWageCaregiverToggle.checked = this.isWageCaregiver;
        }



        // Update tab bar visibility based on wage caregiver setting
        this.updateTabBarVisibility();



        // Toggle preset/custom sections
        this.togglePresetSections();

        // Populate custom bonus slots if not using preset
        if (!this.usePreset) {
            // Use setTimeout to ensure DOM elements are ready
            setTimeout(() => {
                this.populateCustomBonusSlots();
            }, 100);
        }
    },

    togglePresetSections() {
        const presetSection = document.getElementById('presetWageSection');
        const customSection = document.getElementById('customWageSection');

        if (presetSection && customSection) {
            if (this.usePreset) {
                presetSection.style.display = 'block';
                customSection.style.display = 'none';
            } else {
                presetSection.style.display = 'none';
                customSection.style.display = 'block';
                // Always populate when switching to custom mode
                setTimeout(() => {
                    this.populateCustomBonusSlots();
                }, 100);
            }


        }
    },
    async saveSettingsToSupabase() {
        const { data: { user } } = await window.supa.auth.getUser();
        if (!user) return;

        try {
            // First, try to fetch existing settings to see what columns exist
            const { data: existingSettings } = await window.supa
                .from('user_settings')
                .select('*')
                .eq('user_id', user.id)
                .single();

            // Base settings data
            const settingsData = {
                user_id: user.id,
                updated_at: new Date().toISOString()
            };

            // Only add fields that exist in the database schema
            // Try different possible column names based on existing data
            if (existingSettings) {
                // Add only fields that exist in the fetched row
                if ('use_preset' in existingSettings) settingsData.use_preset = this.usePreset;
                if ('wage_level' in existingSettings) settingsData.wage_level = this.currentWageLevel;
                if ('current_wage_level' in existingSettings) settingsData.current_wage_level = this.currentWageLevel;
                if ('custom_wage' in existingSettings) settingsData.custom_wage = this.customWage;
                // Remove currentMonth from settings - it should always default to current month on page load
                if ('current_year' in existingSettings) settingsData.current_year = this.currentYear;
                if ('pause_deduction' in existingSettings) settingsData.pause_deduction = this.pauseDeduction;
                if ('full_minute_range' in existingSettings) settingsData.full_minute_range = this.fullMinuteRange;
                if ('direct_time_input' in existingSettings) settingsData.direct_time_input = this.directTimeInput;
                if ('monthly_goal' in existingSettings) settingsData.monthly_goal = this.monthlyGoal;
                if ('has_seen_recurring_intro' in existingSettings) settingsData.has_seen_recurring_intro = this.hasSeenRecurringIntro;
                if ('currency_format' in existingSettings) settingsData.currency_format = this.currencyFormat;

                if ('default_shifts_view' in existingSettings) settingsData.default_shifts_view = this.defaultShiftsView;
                if ('custom_bonuses' in existingSettings) {
                    settingsData.custom_bonuses = this.customBonuses || {};
                }
                if ('tax_deduction_enabled' in existingSettings) settingsData.tax_deduction_enabled = this.taxDeductionEnabled;
                if ('tax_percentage' in existingSettings) settingsData.tax_percentage = this.taxPercentage;
                if ('payroll_day' in existingSettings) settingsData.payroll_day = this.payrollDay;
                if ('is_wage_caregiver' in existingSettings) settingsData.is_wage_caregiver = this.isWageCaregiver;

                // New break deduction settings - try to save them even if columns don't exist yet
                settingsData.pause_deduction_enabled = this.pauseDeductionEnabled;
                settingsData.pause_deduction_method = this.pauseDeductionMethod;
                settingsData.pause_threshold_hours = this.pauseThresholdHours;
                settingsData.pause_deduction_minutes = this.pauseDeductionMinutes;
                settingsData.audit_break_calculations = this.auditBreakCalculations;

                // Always try to save isWageCaregiver even if column doesn't exist yet
                settingsData.is_wage_caregiver = this.isWageCaregiver;



                // Debug logging for tax deduction save
                console.log('Saving tax deduction settings:', {
                    has_tax_enabled_column: 'tax_deduction_enabled' in existingSettings,
                    has_tax_percentage_column: 'tax_percentage' in existingSettings,
                    saving_enabled: this.taxDeductionEnabled,
                    saving_percentage: this.taxPercentage
                });
            } else {
                // No existing settings - try to save with common field names
                settingsData.use_preset = this.usePreset;
                settingsData.wage_level = this.currentWageLevel;
                settingsData.custom_wage = this.customWage;
                // Remove currentMonth from settings - it should always default to current month on page load
                settingsData.current_year = this.currentYear;
                settingsData.pause_deduction = this.pauseDeduction; // Legacy setting
                // New break deduction settings
                settingsData.pause_deduction_enabled = this.pauseDeductionEnabled;
                settingsData.pause_deduction_method = this.pauseDeductionMethod;
                settingsData.pause_threshold_hours = this.pauseThresholdHours;
                settingsData.pause_deduction_minutes = this.pauseDeductionMinutes;
                settingsData.audit_break_calculations = this.auditBreakCalculations;



                settingsData.full_minute_range = this.fullMinuteRange;
                settingsData.direct_time_input = this.directTimeInput;
                settingsData.monthly_goal = this.monthlyGoal;
                settingsData.has_seen_recurring_intro = this.hasSeenRecurringIntro;
                settingsData.currency_format = this.currencyFormat;

                settingsData.default_shifts_view = this.defaultShiftsView;
                settingsData.custom_bonuses = this.customBonuses || {};
                settingsData.tax_deduction_enabled = this.taxDeductionEnabled;
                settingsData.tax_percentage = this.taxPercentage;
                settingsData.payroll_day = this.payrollDay;
                settingsData.is_wage_caregiver = this.isWageCaregiver;
            }

            const { error } = await window.supa
                .from('user_settings')
                .upsert(settingsData, { onConflict: 'user_id' });

            if (error) {
                console.error('Error saving settings to Supabase:', error);

                // Try progressively smaller data sets
                const minimalData = {
                    user_id: user.id,
                    updated_at: new Date().toISOString()
                };

                const { error: minError } = await window.supa
                    .from('user_settings')
                    .upsert(minimalData, { onConflict: 'user_id' });

                if (minError) {
                    console.error('Even minimal save failed:', minError);
                }
            }
        } catch (e) {
            console.error('Error in saveSettingsToSupabase:', e);
        }
    },
    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('lønnsberegnerSettings');
            if (saved) {
                const data = JSON.parse(saved);
                this.usePreset = data.usePreset !== false;
                this.customWage = data.customWage || 200;
                this.currentWageLevel = data.currentWageLevel || 1;
                this.customBonuses = data.customBonuses || {};
                this.currentMonth = new Date().getMonth() + 1; // Always default to current month
                this.pauseDeduction = data.pauseDeduction !== false; // Legacy setting
                // Load new break deduction settings from localStorage
                this.pauseDeductionEnabled = data.pauseDeductionEnabled !== false;
                this.pauseDeductionMethod = data.pauseDeductionMethod || 'proportional';
                this.pauseThresholdHours = parseFloat(data.pauseThresholdHours) || 5.5;
                this.pauseDeductionMinutes = parseInt(data.pauseDeductionMinutes) || 30;
                this.auditBreakCalculations = true; // Always enabled internally (UI removed)

                this.fullMinuteRange = data.fullMinuteRange || false;
                this.directTimeInput = data.directTimeInput || false;
                this.monthlyGoal = data.monthlyGoal || 20000;
                this.hasSeenRecurringIntro = data.hasSeenRecurringIntro || false;
                this.currencyFormat = data.currencyFormat || false;

                this.defaultShiftsView = data.defaultShiftsView || 'list';
                this.taxDeductionEnabled = data.taxDeductionEnabled || false;
                this.taxPercentage = data.taxPercentage || 0.0;
                this.payrollDay = parseInt(data.payrollDay) || 15;
                this.isWageCaregiver = data.isWageCaregiver || false;

                this.updateSettingsUI();
                this.updateTabBarVisibility(); // Ensure tab bar visibility is updated
            } else {
                this.setDefaultSettings();
            }
        } catch (e) {
            console.error('Error loading from localStorage:', e);
            this.setDefaultSettings();
        }
        // Don't call updateDisplay here - it will be called with animation in init()
    },

    // Save form state to preserve user input across page restarts
    saveFormState() {
        const formState = {
            selectedDates: this.selectedDates ? this.selectedDates.map(date => date.toISOString()) : [],
            startHour: document.getElementById('startHour')?.value || '',
            startMinute: document.getElementById('startMinute')?.value || '',
            endHour: document.getElementById('endHour')?.value || '',
            endMinute: document.getElementById('endMinute')?.value || '',
            // Remove currentMonth from form state - it should always default to current month on page load
        };

        this.formState = formState;
        localStorage.setItem('vaktberegnerFormState', JSON.stringify(formState));
    },

    // Restore form state after page restart
    restoreFormState() {
        try {
            const saved = localStorage.getItem('vaktberegnerFormState');
            if (saved) {
                const formState = JSON.parse(saved);

                // Restore selected dates only if they're in the current displayed month
                if (formState.selectedDates && formState.selectedDates.length > 0) {
                    this.selectedDates = [];
                    formState.selectedDates.forEach(dateString => {
                        const savedDate = new Date(dateString);
                        const savedMonth = savedDate.getMonth() + 1; // Convert to 1-based month
                        const savedYear = savedDate.getFullYear();

                        // Only restore if the saved date is in the currently displayed month
                        if (savedMonth === this.currentMonth && savedYear === this.currentYear) {
                            this.selectedDates.push(savedDate);
                            // Find and select the corresponding date cell
                            const dateDay = savedDate.getDate();
                            const dateCells = document.querySelectorAll('.date-cell');
                            dateCells.forEach(cell => {
                                const cellContent = cell.querySelector('.date-cell-content');
                                if (cellContent && cellContent.textContent == dateDay && !cell.classList.contains('disabled')) {
                                    cell.classList.add('selected');
                                }
                            });
                        }
                    });
                } else {
                    // Initialize empty array if no dates saved
                    this.selectedDates = [];
                }

                // Handle legacy selectedDate format for backward compatibility
                if (formState.selectedDate && (!formState.selectedDates || formState.selectedDates.length === 0)) {
                    const savedDate = new Date(formState.selectedDate);
                    const savedMonth = savedDate.getMonth() + 1;
                    const savedYear = savedDate.getFullYear();

                    if (savedMonth === this.currentMonth && savedYear === this.currentYear) {
                        this.selectedDates = [savedDate];
                        const dateDay = savedDate.getDate();
                        const dateCells = document.querySelectorAll('.date-cell');
                        dateCells.forEach(cell => {
                            const cellContent = cell.querySelector('.date-cell-content');
                            if (cellContent && cellContent.textContent == dateDay && !cell.classList.contains('disabled')) {
                                cell.classList.add('selected');
                            }
                        });
                    }
                }

                // Restore time selections
                setTimeout(() => {
                    const startHour = document.getElementById('startHour');
                    const startMinute = document.getElementById('startMinute');
                    const endHour = document.getElementById('endHour');
                    const endMinute = document.getElementById('endMinute');

                    if (startHour && formState.startHour) startHour.value = formState.startHour;
                    if (startMinute && formState.startMinute) startMinute.value = formState.startMinute;
                    if (endHour && formState.endHour) endHour.value = formState.endHour;
                    if (endMinute && formState.endMinute) endMinute.value = formState.endMinute;
                }, 100);

                // Remove currentMonth restoration - it should always default to current month on page load

                this.formState = formState;

                // Update the selected dates info display
                this.updateSelectedDatesInfo();
            }
        } catch (e) {
            console.error('Error restoring form state:', e);
        }
    },

    // Clear form state (called after successful shift addition)
    clearFormState() {
        this.formState = {};
        localStorage.removeItem('vaktberegnerFormState');
    },

    // Setup event listeners for form inputs to automatically save state
    setupFormStateListeners() {
        const timeInputs = ['startHour', 'startMinute', 'endHour', 'endMinute'];

        timeInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('change', () => {
                    this.saveFormState();
                });
            }
        });
    },

    async switchSettingsTab(tab) {
        // Within settings modal only
        const settingsModal = document.getElementById('settingsModal');
        if (!settingsModal) return;

        // Determine current active tab for autosave behavior
        const currentActiveBtn = settingsModal.querySelector('.tab-nav .tab-btn.active');
        const currentTab = currentActiveBtn?.dataset?.tab
          || (currentActiveBtn?.textContent?.trim() === 'Lønn' ? 'wage'
              : currentActiveBtn?.textContent?.trim() === 'UI' ? 'interface'
              : currentActiveBtn?.textContent?.trim() === 'Bedrift' ? 'org'
              : currentActiveBtn?.textContent?.trim() === 'Data' ? 'data'
              : null);

        // If switching away from wage tab and in custom mode, auto-save bonuses
        if (currentTab === 'wage' && !this.usePreset && tab !== 'wage') {
            await this.saveCustomBonusesSilent();
        }

        // Toggle buttons by data-tab
        const btns = settingsModal.querySelectorAll('.tab-nav .tab-btn');
        btns.forEach(btn => {
            const btnTab = btn.dataset?.tab
              || (btn.textContent?.trim() === 'Lønn' ? 'wage'
                  : btn.textContent?.trim() === 'UI' ? 'interface'
                  : btn.textContent?.trim() === 'Bedrift' ? 'org'
                  : btn.textContent?.trim() === 'Data' ? 'data'
                  : '');
            btn.classList.toggle('active', btnTab === tab);
        });

        // Toggle tab contents
        const contentIds = ['wageTab','interfaceTab','orgTab','dataTab'];
        contentIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.toggle('active', id === `${tab}Tab`);
        });

        // Post-switch behaviors
        if (tab === 'wage' && !this.usePreset) {
            setTimeout(() => this.populateCustomBonusSlots(), 100);
        }
        if (tab === 'data') {
            setTimeout(() => this.setupExportPeriodOptions(), 100);
        }
        if (tab === 'org') {
            const sel = document.getElementById('breakPolicySelect');
            if (sel && this.orgSettings?.break_policy) sel.value = this.orgSettings.break_policy;
            // Save immediately when the policy changes
            if (sel && !sel._immediateSaveBound) {
                sel.addEventListener('change', async () => {
                    await this.saveOrgSettings();
                });
                sel._immediateSaveBound = true;
            }

            // Initialize wage caregiver toggle and UI state
            const orgToggle = document.getElementById('orgIsWageCaregiverToggle');
            if (orgToggle) {
                orgToggle.checked = !!this.isWageCaregiver;
                orgToggle.disabled = false;
                orgToggle.onchange = () => this.onOrgWageCaregiverToggle();

                const slider = document.querySelector('#orgIsWageCaregiverToggle + .toggle-slider');
                if (slider) {
                    slider.style.cursor = 'pointer';
                    slider.onclick = (e) => {
                        e.preventDefault();
                        orgToggle.checked = !orgToggle.checked;
                        this.onOrgWageCaregiverToggle();
                    };
                }
            }

            this.updateOrgSettingsUI();
        }
    },



    // Synchronous wrapper for HTML onclick handlers
    switchSettingsTabSync(tab) {
        this.switchSettingsTab(tab).catch(console.error);
    },

    async togglePreset() {
        const wasCustomMode = !this.usePreset;
        this.usePreset = document.getElementById('usePresetToggle').checked;

        // If switching away from custom mode, save custom bonuses first
        if (wasCustomMode && this.usePreset) {
            await this.saveCustomBonusesSilent();
        }

        this.togglePresetSections();
        this.saveSettingsToSupabase();
        this.updateDisplay();
    },

    toggleTaxDeduction() {
        const toggle = document.getElementById('taxDeductionToggle');
        this.taxDeductionEnabled = toggle.checked;

        this.toggleTaxPercentageSection();
        this.saveSettingsToSupabase();
        this.updateDisplay();
    },

    toggleTaxPercentageSection() {
        const taxPercentageSection = document.getElementById('taxPercentageSection');
        if (taxPercentageSection) {
            if (this.taxDeductionEnabled) {
                taxPercentageSection.style.display = 'block';
            } else {
                taxPercentageSection.style.display = 'none';
            }
        } else {
            console.log('Tax percentage section element not found - modal may not be loaded yet');
        }
    },

    updateTaxPercentage(value) {
        const percentage = parseFloat(value) || 0.0;
        // Validate percentage is within bounds
        if (percentage < 0) {
            this.taxPercentage = 0.0;
        } else if (percentage > 100) {
            this.taxPercentage = 100.0;
        } else {
            this.taxPercentage = percentage;
        }

        // Update the input field to reflect the validated value
        const taxPercentageInput = document.getElementById('taxPercentageInput');
        if (taxPercentageInput) {
            taxPercentageInput.value = this.taxPercentage;
        }

        this.saveSettingsToSupabase();
        this.updateDisplay();
    },

    updateTaxDeductionUI() {
        const taxDeductionToggle = document.getElementById('taxDeductionToggle');
        const taxPercentageInput = document.getElementById('taxPercentageInput');
        const taxPercentageSection = document.getElementById('taxPercentageSection');

        if (taxDeductionToggle) {
            taxDeductionToggle.checked = this.taxDeductionEnabled;
        }

        if (taxPercentageInput) {
            taxPercentageInput.value = this.taxPercentage;
            console.log('Set input to:', this.taxPercentage);
        }

        if (taxPercentageSection) {
            const shouldShow = this.taxDeductionEnabled;
            taxPercentageSection.style.display = shouldShow ? 'block' : 'none';
            console.log('Set section visibility to:', shouldShow ? 'visible' : 'hidden');
        }
    },

    // Payroll day management methods
    updatePayrollDay(value) {
        const day = parseInt(value);

        // Validate input (1-31 range)
        if (isNaN(day) || day < 1 || day > 31) {
            console.warn('Invalid payroll day:', value, 'Using default value 15');
            this.payrollDay = 15;
        } else {
            this.payrollDay = day;
        }

        // Update the input field to reflect the validated value
        const payrollDayInput = document.getElementById('payrollDayInput');
        if (payrollDayInput) {
            payrollDayInput.value = this.payrollDay;
        }

        this.saveSettingsToSupabase();
        this.updateDisplay();
    },

    getNextPayrollDate() {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); // 0-based
        const currentDay = now.getDate();

        // Start with this month's payroll date
        let nextPayrollDate = new Date(currentYear, currentMonth, this.payrollDay);

        // If this month's payroll date has already passed, move to next month
        if (nextPayrollDate <= now) {
            nextPayrollDate = new Date(currentYear, currentMonth + 1, this.payrollDay);
        }

        // Handle months with fewer days (e.g., February with 28/29 days)
        // If the payroll day doesn't exist in the target month, use the last day of that month
        const targetMonth = nextPayrollDate.getMonth();
        const lastDayOfMonth = new Date(nextPayrollDate.getFullYear(), targetMonth + 1, 0).getDate();

        if (this.payrollDay > lastDayOfMonth) {
            nextPayrollDate.setDate(lastDayOfMonth);
        }

        // Adjust for weekends - move to preceding Friday if payroll falls on weekend
        const dayOfWeek = nextPayrollDate.getDay(); // 0 = Sunday, 6 = Saturday

        if (dayOfWeek === 0) { // Sunday
            nextPayrollDate.setDate(nextPayrollDate.getDate() - 2); // Move to Friday
        } else if (dayOfWeek === 6) { // Saturday
            nextPayrollDate.setDate(nextPayrollDate.getDate() - 1); // Move to Friday
        }

        return nextPayrollDate;
    },

    getLastPayrollDate(nextPayrollDate) {
        // Calculate the previous payroll date based on the next payroll date
        const lastPayrollDate = new Date(nextPayrollDate);
        lastPayrollDate.setMonth(lastPayrollDate.getMonth() - 1);

        // Handle months with fewer days (e.g., March 31 -> February 28/29)
        const targetMonth = lastPayrollDate.getMonth();
        const lastDayOfMonth = new Date(lastPayrollDate.getFullYear(), targetMonth + 1, 0).getDate();

        if (this.payrollDay > lastDayOfMonth) {
            lastPayrollDate.setDate(lastDayOfMonth);
        }

        // Adjust for weekends - move to preceding Friday if payroll falls on weekend
        const dayOfWeek = lastPayrollDate.getDay(); // 0 = Sunday, 6 = Saturday

        if (dayOfWeek === 0) { // Sunday
            lastPayrollDate.setDate(lastPayrollDate.getDate() - 2); // Move to Friday
        } else if (dayOfWeek === 6) { // Saturday
            lastPayrollDate.setDate(lastPayrollDate.getDate() - 1); // Move to Friday
        }

        return lastPayrollDate;
    },

    getPayrollDateForMonth(month, year) {
        // Calculate payroll date for a specific month and year
        // month is 1-based (1-12), year is 4-digit year

        // Create payroll date for the specified month
        let payrollDate = new Date(year, month - 1, this.payrollDay); // month-1 because Date constructor uses 0-based months

        // Handle months with fewer days (e.g., February with 28/29 days)
        // If the payroll day doesn't exist in the target month, use the last day of that month
        const targetMonth = payrollDate.getMonth();
        const lastDayOfMonth = new Date(payrollDate.getFullYear(), targetMonth + 1, 0).getDate();

        if (this.payrollDay > lastDayOfMonth) {
            payrollDate.setDate(lastDayOfMonth);
        }

        // Adjust for weekends - move to preceding Friday if payroll falls on weekend
        const dayOfWeek = payrollDate.getDay(); // 0 = Sunday, 6 = Saturday

        if (dayOfWeek === 0) { // Sunday
            payrollDate.setDate(payrollDate.getDate() - 2); // Move to Friday
        } else if (dayOfWeek === 6) { // Saturday
            payrollDate.setDate(payrollDate.getDate() - 1); // Move to Friday
        }

        return payrollDate;
    },

    populateCustomBonusSlots() {
        const types = ['weekday', 'saturday', 'sunday'];

        types.forEach(type => {
            const container = document.getElementById(`${type}BonusSlots`);
            if (!container) {
                console.error(`Container ${type}BonusSlots not found`);
                return;
            }

            container.innerHTML = '';
            const bonuses = (this.customBonuses && this.customBonuses[type]) || [];

            bonuses.forEach(bonus => {
                const slot = document.createElement('div');
                slot.className = 'bonus-slot';
                slot.innerHTML = `
                    <input type="time" class="form-control" value="${bonus.from}">
                    <input type="time" class="form-control" value="${bonus.to}">
                    <input type="number" class="form-control" placeholder="kr/t" value="${bonus.rate}">
                    <button class="btn btn-icon btn-danger remove-bonus" title="Fjern dette tillegget">×</button>
                `;

                // Add auto-save event listeners to the inputs (only on change, not blur)
                const inputs = slot.querySelectorAll('input');
                inputs.forEach(input => {
                    input.addEventListener('change', () => {
                        this.autoSaveCustomBonuses();
                    });
                    // Removed blur event to reduce frequent saving
                });

                // Add click event listener to the remove button
                const removeBtn = slot.querySelector('.remove-bonus');
                if (removeBtn) {
                    removeBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.removeBonusSlot(removeBtn);
                    });
                }

                container.appendChild(slot);
            });
        });
    },
    addBonusSlot(type) {
        const container = document.getElementById(`${type}BonusSlots`);
        if (!container) {
            console.error(`Container ${type}BonusSlots not found`);
            return;
        }

        const slot = document.createElement('div');
        slot.className = 'bonus-slot';
        slot.innerHTML = `
            <div class="time-input-group">
                <label class="time-label">Fra:</label>
                <input type="time" class="form-control" placeholder="--:--" title="Angi starttid (timer:minutter)">
            </div>
            <div class="time-input-group">
                <label class="time-label">Til:</label>
                <input type="time" class="form-control" placeholder="--:--" title="Angi sluttid (timer:minutter)">
            </div>
            <div class="rate-input-group">
                <input type="number" class="form-control" placeholder="kr/t" title="Angi tilleggssats i kroner per time">
            </div>
            <button class="btn btn-icon btn-danger remove-bonus" title="Fjern dette tillegget">×</button>
        `;

        // Add auto-save event listeners to the inputs (only on change, not blur)
        const inputs = slot.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('change', () => {
                this.autoSaveCustomBonuses();
            });
            // Removed blur event to reduce frequent saving
        });

        // Add click event listener to the remove button
        const removeBtn = slot.querySelector('.remove-bonus');
        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeBonusSlot(removeBtn);
            });
        }

        container.appendChild(slot);


    },
    removeBonusSlot(button) {
        button.closest('.bonus-slot').remove();
        // Auto-save when removing bonus slots if in custom mode (silently)
        if (!this.usePreset) {
            this.saveCustomBonusesSilent().catch(console.error);
        }


    },

    // Auto-save custom bonuses with debouncing to avoid too many saves
    autoSaveCustomBonuses() {
        if (!this.usePreset) {
            // Clear existing timeout to prevent memory leaks
            if (this.autoSaveTimeout) {
                clearTimeout(this.autoSaveTimeout);
                this.autoSaveTimeout = null; // Reset the variable to prevent memory leaks
            }

            // Set new timeout to save after 5 seconds of inactivity (longer delay)
            this.autoSaveTimeout = setTimeout(() => {
                // Save silently without status messages
                this.saveCustomBonusesSilent().catch(console.error);
                // Clear the timeout reference after execution
                this.autoSaveTimeout = null;
            }, 5000);
        }
    },

    // Show save status message to user
    showSaveStatus(message) {
        // Find or create status element
        let statusElement = document.getElementById('bonus-save-status');
        if (!statusElement) {
            statusElement = document.createElement('div');
            statusElement.id = 'bonus-save-status';
            statusElement.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: var(--bg-primary);
                border: 1px solid var(--border);
                border-radius: 8px;
                padding: 12px 16px;
                font-size: 14px;
                font-weight: 500;
                z-index: 10000;
                box-shadow: 0 4px 12px var(--shadow-blue);
                transition: all 0.3s var(--ease-default);
                opacity: 0;
                transform: translateX(100%);
            `;
            document.body.appendChild(statusElement);
        }

        // Update message and show
        statusElement.textContent = message;
        statusElement.style.opacity = '1';
        statusElement.style.transform = 'translateX(0)';

        // Auto-hide after 3 seconds
        setTimeout(() => {
            statusElement.style.opacity = '0';
            statusElement.style.transform = 'translateX(100%)';
        }, 3000);
    },

    async openSettings() {
        // Close any existing expanded views, dropdowns, and modals
        this.closeShiftDetails();
        this.closeProfileDropdown();
        this.closeProfile();

        // Hide floating action bar when modal opens to prevent z-index conflicts
        const floatingBar = document.querySelector('.floating-action-bar');
        const floatingBarBackdrop = document.querySelector('.floating-action-bar-backdrop');
        if (floatingBar) {
            floatingBar.style.display = 'none';
        }
        if (floatingBarBackdrop) {
            floatingBarBackdrop.style.display = 'none';
        }

        const modal = document.getElementById('settingsModal');
        if (modal) {
            // Update UI to match current state
            this.updateSettingsUI();

            // Set active tab to wage (most important settings first)
            this.switchSettingsTabSync('wage');

            // Ensure tax deduction UI is properly updated after modal is shown
            setTimeout(() => {
                this.updateTaxDeductionUI();
            }, 50);

            // Show the modal
            modal.style.display = 'flex';

            // Ensure custom bonus slots are populated if custom mode is active
            if (!this.usePreset) {
                setTimeout(() => {
                    this.populateCustomBonusSlots();
                }, 100);
            }


        }
    },

    async openPaydateSettings() {
        // Close any existing expanded views, dropdowns, and modals
        this.closeShiftDetails();
        this.closeProfileDropdown();
        this.closeProfile();

        // Hide floating action bar when modal opens to prevent z-index conflicts
        const floatingBar = document.querySelector('.floating-action-bar');
        const floatingBarBackdrop = document.querySelector('.floating-action-bar-backdrop');
        if (floatingBar) {
            floatingBar.style.display = 'none';
        }
        if (floatingBarBackdrop) {
            floatingBarBackdrop.style.display = 'none';
        }

        const modal = document.getElementById('settingsModal');
        if (modal) {
            // Update UI to match current state
            this.updateSettingsUI();

            // Set active tab to wage where paydate setting is located
            this.switchSettingsTabSync('wage');

            // Ensure tax deduction UI is properly updated after modal is shown
            setTimeout(() => {
                this.updateTaxDeductionUI();
            }, 50);

            // Show the modal
            modal.style.display = 'flex';

            // Ensure custom bonus slots are populated if custom mode is active
            if (!this.usePreset) {
                setTimeout(() => {
                    this.populateCustomBonusSlots();
                }, 100);
            }

            // Scroll to and highlight the payroll day input field
            setTimeout(() => {
                const payrollDayInput = document.getElementById('payrollDayInput');
                if (payrollDayInput) {
                    // Scroll the input into view
                    payrollDayInput.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });

                    // Focus and select the input after scrolling
                    setTimeout(() => {
                        payrollDayInput.focus();
                        payrollDayInput.select();
                    }, 300);
                }
            }, 150);
        }
    },
    async closeSettings(shouldSave = true) {
        const modal = document.getElementById('settingsModal');
        const wasModalOpen = modal && modal.style.display !== 'none';

        // Only perform save operations if the modal was actually open and we should save
        if (wasModalOpen && shouldSave) {
            // If in custom mode, automatically save custom bonuses before closing
            if (!this.usePreset) {
                await this.saveCustomBonusesSilent();
            }

            // Save settings when closing modal
            this.saveSettingsToSupabase();
        }

        if (modal) {
            modal.style.display = 'none';
        }

        // Restore floating action bar visibility when modal closes
        const floatingBar = document.querySelector('.floating-action-bar');
        const floatingBarBackdrop = document.querySelector('.floating-action-bar-backdrop');
        if (floatingBar) {
            floatingBar.style.display = '';
        }
        if (floatingBarBackdrop) {
            floatingBarBackdrop.style.display = '';
        }

        // Close profile dropdown if open
        this.closeProfileDropdown();
    },

    // Dashboard view toggle functionality
    toggleDashboardView() {
        const toggleBtn = document.getElementById('dashboardToggleBtn');
        if (!toggleBtn) return;

        // Toggle between 'default' and 'stats' view
        this.dashboardView = this.dashboardView === 'default' ? 'stats' : 'default';

        // Update button active state
        toggleBtn.classList.toggle('active', this.dashboardView === 'stats');

        // Update button text and aria-label
        const toggleText = toggleBtn.querySelector('.toggle-text');
        if (toggleText) {
            toggleText.textContent = this.dashboardView === 'stats' ? 'Std.' : 'Stat.';
        }
        toggleBtn.setAttribute('aria-label',
            this.dashboardView === 'stats' ? 'Bytt til standardvisning' : 'Bytt til statistikkvisning'
        );

        // Apply view changes
        this.applyDashboardView();

        // Save preference to localStorage
        localStorage.setItem('dashboardView', this.dashboardView);
    },

    applyDashboardView() {
        const body = document.body;
        const dashboardContent = document.querySelector('.dashboard-content');
        const statisticsSection = document.querySelector('.statistics-section');
        const weeklyHoursChart = document.getElementById('weeklyHoursChart');

        if (this.dashboardView === 'stats') {
            // Stats view: move stats card to replace dashboard content
            body.classList.add('stats-view');

            // Debug: Check if class was applied
            console.log('Body classes after adding stats-view:', body.className);

            // Manually hide dashboard cards as backup
            const totalCard = document.querySelector('.total-card');
            const nextShiftCard = document.querySelector('.next-shift-card');
            const nextPayrollCard = document.querySelector('.next-payroll-card');

            if (totalCard) {
                totalCard.style.display = 'none';
                console.log('Manually hid total card');
            }
            if (nextShiftCard) {
                nextShiftCard.style.display = 'none';
                console.log('Manually hid next shift card');
            }
            if (nextPayrollCard) {
                nextPayrollCard.style.display = 'none';
                console.log('Manually hid next payroll card');
            }

            // Move the stats card to dashboard content if not already there
            if (weeklyHoursChart && dashboardContent && !dashboardContent.contains(weeklyHoursChart)) {
                // Create a container for the stats card in dashboard
                const statsContainer = document.createElement('div');
                statsContainer.className = 'dashboard-stats-container';
                statsContainer.style.order = '1'; // Position first in dashboard

                // Move the chart to the dashboard
                statsContainer.appendChild(weeklyHoursChart);
                dashboardContent.appendChild(statsContainer);
            }

            console.log('Applied stats view - stats card replaces dashboard content');
        } else {
            // Default view: move stats card back to statistics section
            body.classList.remove('stats-view');

            // Show dashboard cards again
            const totalCard = document.querySelector('.total-card');
            const nextShiftCard = document.querySelector('.next-shift-card');
            const nextPayrollCard = document.querySelector('.next-payroll-card');

            if (totalCard) {
                totalCard.style.display = '';
                console.log('Showed total card');
            }
            if (nextShiftCard) {
                nextShiftCard.style.display = '';
                console.log('Showed next shift card');
            }
            if (nextPayrollCard) {
                nextPayrollCard.style.display = '';
                console.log('Showed next payroll card');
            }

            // Move the stats card back to statistics section if it's in dashboard
            if (weeklyHoursChart && statisticsSection) {
                const statisticsContent = statisticsSection.querySelector('.statistics-content');
                const dashboardStatsContainer = document.querySelector('.dashboard-stats-container');

                if (dashboardStatsContainer && statisticsContent) {
                    // Move chart back to statistics section
                    statisticsContent.appendChild(weeklyHoursChart);
                    // Remove the temporary container
                    dashboardStatsContainer.remove();
                }
            }

            console.log('Applied default view - stats card moved back to statistics section');
        }
    },

    // Profile dropdown functionality
    toggleProfileDropdown() {
        const dropdown = document.getElementById('profileDropdown');
        if (!dropdown) return;

        const isVisible = dropdown.classList.contains('show');

        if (isVisible) {
            this.closeProfileDropdown();
        } else {
            this.openProfileDropdown();
        }
    },

    openProfileDropdown() {
        const dropdown = document.getElementById('profileDropdown');
        if (!dropdown) return;

        // Close any other open dropdowns or modals first
        this.closeShiftDetails();

        // Show dropdown with animation
        dropdown.style.display = 'block';
        // Force reflow to ensure display change is applied
        dropdown.offsetHeight;
        dropdown.classList.add('show');

        // Add click outside listener and keyboard support
        setTimeout(() => {
            document.addEventListener('click', this.handleClickOutside.bind(this));
            document.addEventListener('keydown', this.handleDropdownKeydown.bind(this));
        }, 0);
    },

    closeProfileDropdown() {
        const dropdown = document.getElementById('profileDropdown');
        if (!dropdown) return;

        dropdown.classList.remove('show');

        // Hide after animation completes
        setTimeout(() => {
            if (!dropdown.classList.contains('show')) {
                dropdown.style.display = 'none';
            }
        }, 200);

        // Remove event listeners
        document.removeEventListener('click', this.handleClickOutside.bind(this));
        document.removeEventListener('keydown', this.handleDropdownKeydown.bind(this));
    },

    handleClickOutside(event) {
        const dropdown = document.getElementById('profileDropdown');
        const profileBtn = document.querySelector('.user-profile-btn');

        if (!dropdown || !profileBtn) return;

        // Check if click is outside both the dropdown and the profile button
        if (!dropdown.contains(event.target) && !profileBtn.contains(event.target)) {
            this.closeProfileDropdown();
        }
    },

    handleDropdownKeydown(event) {
        const dropdown = document.getElementById('profileDropdown');
        if (!dropdown || !dropdown.classList.contains('show')) return;

        if (event.key === 'Escape') {
            this.closeProfileDropdown();
            // Focus back to the profile button
            const profileBtn = document.querySelector('.user-profile-btn');
            if (profileBtn) profileBtn.focus();
        }
    },

    // Profile modal functionality
    openProfile() {
        // Close dropdown first
        this.closeProfileDropdown();

        // Close any other open modals
        this.closeSettings(false); // Don't save settings when closing as cleanup
        this.closeShiftDetails();

        // Hide floating action bar when modal opens to prevent z-index conflicts
        const floatingBar = document.querySelector('.floating-action-bar');
        const floatingBarBackdrop = document.querySelector('.floating-action-bar-backdrop');
        if (floatingBar) {
            floatingBar.style.display = 'none';
        }
        if (floatingBarBackdrop) {
            floatingBarBackdrop.style.display = 'none';
        }

        const modal = document.getElementById('profileModal');
        if (modal) {
            // Load profile data
            this.loadProfileData();

            // Initialize avatar controls (choose/remove handlers)
            this.initProfileAvatarControls();

            // Show the modal
            modal.style.display = 'flex';
            modal.classList.add('active');

            // Add keyboard support
            const keydownHandler = (e) => {
                if (e.key === 'Escape') {
                    this.closeProfile();
                }
            };
            document.addEventListener('keydown', keydownHandler);
            modal.keydownHandler = keydownHandler; // Store for cleanup

            // Add click outside handler
            const clickOutsideHandler = (e) => {
                if (e.target === modal) {
                    this.closeProfile();
                }
            };
            modal.addEventListener('click', clickOutsideHandler);
            modal.clickOutsideHandler = clickOutsideHandler; // Store for cleanup
        }
    },

    closeProfile() {
        const modal = document.getElementById('profileModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');

            // Remove event listeners
            if (modal.keydownHandler) {
                document.removeEventListener('keydown', modal.keydownHandler);
                modal.keydownHandler = null;
            }
            if (modal.clickOutsideHandler) {
                modal.removeEventListener('click', modal.clickOutsideHandler);
                modal.clickOutsideHandler = null;
            }

            // Restore floating action bar visibility when modal closes
            const floatingBar = document.querySelector('.floating-action-bar');
            const floatingBarBackdrop = document.querySelector('.floating-action-bar-backdrop');
            if (floatingBar) {
                floatingBar.style.display = '';
            }
            if (floatingBarBackdrop) {
                floatingBarBackdrop.style.display = '';
            }
        }
    },

    // Close stat details (placeholder method for removed stat card functionality)
    closeStatDetails() {
        // This method was called by showBreakdownInCalendar and showShiftDetails
        // but the actual stat details functionality appears to have been removed.
        // Keeping this as a no-op method to prevent JavaScript errors.

        // If there are any stat detail modals or expanded views, close them
        const statModal = document.querySelector('.stat-detail-modal');
        const statExpanded = document.querySelector('.stat-expanded');
        const statBackdrop = document.querySelector('.stat-backdrop');

        if (statModal) {
            statModal.style.display = 'none';
            statModal.remove();
        }

        if (statExpanded) {
            statExpanded.classList.remove('expanded');
        }

        if (statBackdrop) {
            statBackdrop.remove();
        }

        // Remove any stat-related event listeners
        if (this.statDetailsKeydownHandler) {
            document.removeEventListener('keydown', this.statDetailsKeydownHandler);
            this.statDetailsKeydownHandler = null;
        }
    },

    // Logout handler
    handleLogout() {
        // Close dropdown first
        this.closeProfileDropdown();

        // Clear chat log before logout
        if (window.chatbox && window.chatbox.clear) {
            window.chatbox.clear();
        }

        // Call the global logout function
        if (typeof window.logout === 'function') {
            window.logout();
        }
    },

    // Load user nickname for header display (profile pictures removed)
    async loadUserNickname() {
        try {
            const { data: { user } } = await window.supa.auth.getUser();
            if (!user) return;

            const nicknameElement = document.getElementById('userNickname');
            if (nicknameElement) {
                // Use first name if available, otherwise use first part of email
                const nickname = user.user_metadata?.first_name ||
                                user.email?.split('@')[0] ||
                                'Bruker';
                nicknameElement.textContent = nickname;
            }

            // Update chatbox placeholder with user name
            if (window.chatbox && window.chatbox.updatePlaceholder) {
                window.chatbox.updatePlaceholder();
            }

            // Top bar profile picture removed

        } catch (err) {
            console.error('Error loading user nickname:', err);
            // Fallback to default
            const nicknameElement = document.getElementById('userNickname');
            if (nicknameElement) {
                nicknameElement.textContent = 'Bruker';
            }
            // Update chatbox placeholder with fallback
            if (window.chatbox && window.chatbox.updatePlaceholder) {
                window.chatbox.updatePlaceholder();
            }
            // No profile picture updates
        }
    },
    saveToLocalStorage() {
        try {
            const data = {
                usePreset: this.usePreset,
                customWage: this.customWage,
                currentWageLevel: this.currentWageLevel,
                customBonuses: this.customBonuses,
                // Remove currentMonth from localStorage - it should always default to current month on page load
                pauseDeduction: this.pauseDeduction, // Legacy setting
                // New break deduction settings
                pauseDeductionEnabled: this.pauseDeductionEnabled,
                pauseDeductionMethod: this.pauseDeductionMethod,
                pauseThresholdHours: this.pauseThresholdHours,
                pauseDeductionMinutes: this.pauseDeductionMinutes,
                auditBreakCalculations: this.auditBreakCalculations,

                fullMinuteRange: this.fullMinuteRange,
                directTimeInput: this.directTimeInput,
                hasSeenRecurringIntro: this.hasSeenRecurringIntro,
                currencyFormat: this.currencyFormat,

                defaultShiftsView: this.defaultShiftsView,
                taxDeductionEnabled: this.taxDeductionEnabled,
                taxPercentage: this.taxPercentage,
                isWageCaregiver: this.isWageCaregiver
            };
            localStorage.setItem('lønnsberegnerSettings', JSON.stringify(data));
        } catch (e) {
            console.error('Error saving to localStorage', e);
        }
    },
    getCurrentWageRate() {
        return this.usePreset ? this.PRESET_WAGE_RATES[this.currentWageLevel] : this.customWage;
    },
    // Prefer per-shift snapped wage when available (employees view);
    // fall back to current app wage rate otherwise
    getWageRateForShift(shift) {
        const snapshot = Number(shift?.hourly_wage_snapshot);
        if (!Number.isNaN(snapshot) && snapshot > 0) return snapshot;
        return this.getCurrentWageRate();
    },
    getCurrentBonuses() {
        if (this.usePreset) {
            return this.PRESET_BONUSES;
        } else {
            // Ensure customBonuses has the expected structure
            const bonuses = this.customBonuses || {};
            return {
                weekday: bonuses.weekday || [],
                saturday: bonuses.saturday || [],
                sunday: bonuses.sunday || []
            };
        }
    },
    // Master refresh function for global UI updates after /chat responses
    refreshUI(shifts) {
        console.log('Refreshing all UI components after shift changes');

        // Show loading state briefly to indicate refresh
        this.showUIRefreshLoading();

        // Use setTimeout to allow loading state to show before heavy calculations
        setTimeout(() => {
            try {
                // Update all components that depend on shift data
                this.renderShiftTable(shifts);      // Update shift table/list
                this.updateWeekCards(shifts);       // Update weekly summaries
                this.updatePayrollCard(shifts);     // Update next payroll card
                this.updateStats();                 // Update monthly stats
                this.updateWeeklyHoursChart();      // Update weekly chart
                this.updateShiftCalendar();         // Update calendar view
                this.updateNextShiftCard();         // Update next shift card
                this.populateDateGrid();            // Update date grid
                this.updateHeader();                // Update header
                this.startNextShiftTimer();         // Restart countdown timer

                console.log('UI refresh completed successfully');
            } catch (error) {
                console.error('Error during UI refresh:', error);
            } finally {
                // Hide loading state
                this.hideUIRefreshLoading();
            }
        }, 50); // Brief delay to show loading state
    },

    updateDisplay(shouldAnimate = false) {
        this.updateHeader();
        this.updateNextShiftCard(); // Move before updateStats to ensure correct viewport calculations
        this.updateNextPayrollCard(); // Update the payroll card
        this.updateStats(shouldAnimate);
        this.updateWeeklyHoursChart(); // Update the weekly hours chart
        this.updateShiftList();
        this.updateShiftCalendar();
        this.populateDateGrid();
        this.startNextShiftTimer(); // Start the countdown timer
        // Render employees tab specific content
        if (this.currentView === 'employees') {
            // Fetch employee shifts when changing months in employees view
            this.fetchAndDisplayEmployeeShifts?.();
            this.renderEmployeeWorkSummary?.();
        }
    },

    // Loading state management for UI refresh
    showUIRefreshLoading() {
        // Add loading overlay to main content areas
        const mainContent = document.querySelector('.dashboard-content');
        const statsContent = document.querySelector('.statistics-content');

        if (mainContent && !mainContent.querySelector('.refresh-loading-overlay')) {
            const overlay = this.createLoadingOverlay('Oppdaterer...');
            overlay.classList.add('refresh-loading-overlay');
            mainContent.appendChild(overlay);
        }

        if (statsContent && !statsContent.querySelector('.refresh-loading-overlay')) {
            const overlay = this.createLoadingOverlay('Oppdaterer...');
            overlay.classList.add('refresh-loading-overlay');
            statsContent.appendChild(overlay);
        }
    },

    hideUIRefreshLoading() {
        // Remove loading overlays
        const overlays = document.querySelectorAll('.refresh-loading-overlay');
        overlays.forEach(overlay => overlay.remove());
    },

    createLoadingOverlay(text = 'Laster...') {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            border-radius: inherit;
        `;

        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner';
        spinner.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            color: white;
            font-size: 14px;
            font-weight: 500;
        `;

        const spinnerIcon = document.createElement('div');
        spinnerIcon.style.cssText = `
            width: 24px;
            height: 24px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-top: 2px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        `;

        const spinnerText = document.createElement('span');
        spinnerText.textContent = text;

        spinner.appendChild(spinnerIcon);
        spinner.appendChild(spinnerText);
        overlay.appendChild(spinner);

        return overlay;
    },

    // Render shift table (alias for existing updateShiftList)
    renderShiftTable(shifts) {
        this.updateShiftList();
    },

    // Update weekly summary cards
    updateWeekCards(shifts) {
        // Get shifts for current month
        const monthShifts = this.shifts.filter(shift =>
            shift.date.getMonth() === this.currentMonth - 1 &&
            shift.date.getFullYear() === this.currentYear
        );

        // Group shifts by week and calculate totals
        const weeklyData = {};
        monthShifts.forEach(shift => {
            const weekNumber = this.getISOWeekNumber(shift.date);
            if (!weeklyData[weekNumber]) {
                weeklyData[weekNumber] = {
                    hours: 0,
                    earnings: 0,
                    shifts: []
                };
            }
            const calc = this.calculateShift(shift);
            weeklyData[weekNumber].hours += calc.hours;
            weeklyData[weekNumber].earnings += calc.total;
            weeklyData[weekNumber].shifts.push(shift);
        });

        // Update weekly chart which displays this data
        this.updateWeeklyHoursChart();

        console.log('Week cards updated with data for', Object.keys(weeklyData).length, 'weeks');
    },

    // Enhanced payroll card update with proper period calculation
    updatePayrollCard(shifts) {
        // Use the existing updateNextPayrollCard function which handles the HTML structure correctly
        this.updateNextPayrollCard();

        console.log('Payroll card updated via existing updateNextPayrollCard function');
    },
    updateHeader() {
        const monthName = this.MONTHS[this.currentMonth - 1].charAt(0).toUpperCase() + this.MONTHS[this.currentMonth - 1].slice(1);
        document.getElementById('currentMonth').textContent = `${monthName} ${this.currentYear}`;

        // Update the dashboard month navigation display
        const currentMonthDashboard = document.getElementById('currentMonthDashboard');
        if (currentMonthDashboard) {
            currentMonthDashboard.textContent = `${monthName} ${this.currentYear}`;
        }

        // Update the month navigation display in the floating action bar
        const monthNavDisplayNav = document.getElementById('monthNavDisplayNav');
        if (monthNavDisplayNav) {
            monthNavDisplayNav.textContent = `${monthName} ${this.currentYear}`;
        }

        // Update the total card label to match selected month
        const totalLabel = document.querySelector('.total-label');
        if (totalLabel) {
            // Check if current month is the actual current month
            const now = new Date();
            const isCurrentMonth = this.currentMonth === (now.getMonth() + 1) && this.currentYear === now.getFullYear();

            if (isCurrentMonth) {
                totalLabel.textContent = 'Brutto';
            } else {
                totalLabel.textContent = `Brutto (${monthName.toLowerCase()})`;
            }
        }

        // Update current month label in export options if visible
        this.updateCurrentMonthLabel();
    },
    updateStats(shouldAnimate = false) {
        // Check if we're in drill-down mode
        if (this.isInDrillDownMode()) {
            this.updateDrillDownStats(shouldAnimate);
            return;
        }

        let totalHours = 0;
        let totalBase = 0;
        let totalBonus = 0;
        const monthShifts = this.shifts.filter(shift =>
            shift.date.getMonth() === this.currentMonth - 1 &&
            shift.date.getFullYear() === this.currentYear
        );
        monthShifts.forEach(shift => {
            const calc = this.calculateShift(shift);
            totalHours += calc.hours;
            totalBase += calc.baseWage;
            totalBonus += calc.bonus;
        });
        const totalAmount = totalBase + totalBonus;

        // Apply tax deduction if enabled
        const displayAmount = this.taxDeductionEnabled ?
            totalAmount * (1 - this.taxPercentage / 100) :
            totalAmount;

        const totalAmountElement = document.getElementById('totalAmount');
        const totalHoursElement = document.getElementById('totalHours');

        if (totalAmountElement) {
            totalAmountElement.textContent = this.formatCurrency(displayAmount);
        }
        if (totalHoursElement) {
            totalHoursElement.textContent = totalHours.toFixed(1);
        }

        // Add proper element existence check for shiftCount
        const shiftCountElement = document.getElementById('shiftCount');
        if (shiftCountElement) {
            shiftCountElement.textContent = monthShifts.length;
        }

        // Ensure shifts card label is reset to "vakter" when not in drill-down mode
        const shiftCountLabel = document.querySelector('.shifts-count-label');
        if (shiftCountLabel) {
            shiftCountLabel.textContent = 'vakter';
        }

        // Update total card secondary info based on tax deduction setting
        const totalSecondaryInfoEl = document.getElementById('totalSecondaryInfo');
        if (totalSecondaryInfoEl) {
            if (this.taxDeductionEnabled) {
                // Show gross amount with "before tax" text
                totalSecondaryInfoEl.innerHTML = `
                    <div class="secondary-info-content">
                        <span class="bonus-amount">${this.formatCurrency(totalAmount)}</span>
                        <span class="before-tax-text">før skatt</span>
                    </div>
                `;
            } else {
                // Show bonuses for this month
                totalSecondaryInfoEl.innerHTML = `
                    <div class="secondary-info-content">
                        <span class="bonus-amount">${this.formatCurrency(totalBonus)}</span>
                        <span class="before-tax-text">i tillegg</span>
                    </div>
                `;
            }
        }

        // Update header shift count
        const headerShiftCountEl = document.getElementById('headerShiftCount');
        if (headerShiftCountEl) {
            headerShiftCountEl.textContent = monthShifts.length;
        }

        // Update last updated time
        this.updateLastUpdatedTime();

        // Calculate delta versus previous month for the total card label
        const deltaLabelEl = document.querySelector('.total-label');
        if (deltaLabelEl) {
            // Update label to show if tax deduction is enabled
            const baseLabel = this.taxDeductionEnabled ? 'Netto' : 'Brutto';

            const prevMonth = this.currentMonth === 1 ? 12 : this.currentMonth - 1;
            const prevYear = this.currentMonth === 1 ? this.currentYear - 1 : this.currentYear;
            const prevShifts = this.shifts.filter(s =>
                s.date.getMonth() === prevMonth - 1 &&
                s.date.getFullYear() === prevYear
            );
            let prevTotal = 0;
            prevShifts.forEach(s => { prevTotal += this.calculateShift(s).total; });

            // Apply tax deduction to previous total if enabled
            const prevDisplayTotal = this.taxDeductionEnabled ?
                prevTotal * (1 - this.taxPercentage / 100) :
                prevTotal;

            let deltaPercent = 0;
            if (prevDisplayTotal > 0) {
                deltaPercent = ((displayAmount - prevDisplayTotal) / prevDisplayTotal) * 100;
            }
            if (Math.abs(deltaPercent) > 0.1) {
                const arrow = deltaPercent >= 0 ? '▲' : '▼';
                const prevMonthName = this.MONTHS[prevMonth - 1];
                deltaLabelEl.textContent = `${baseLabel} ${arrow} ${Math.abs(deltaPercent).toFixed(1)}% vs. ${prevMonthName}`;
            } else {
                deltaLabelEl.textContent = baseLabel;
            }
        }
        // Oppdater fremdriftslinje for månedlig inntektsmål
        const monthlyGoal = getMonthlyGoal();
        updateProgressBar(displayAmount, monthlyGoal, shouldAnimate);


    },

    // Update stats for drill-down view
    updateDrillDownStats(shouldAnimate = false) {
        const { totalCurrentMonthHours, totalCurrentMonthEarnings, totalWeekHours, totalWeekEarnings } = this.getDailyDataForWeek(this.selectedWeek);

        // Check if this week has shifts from adjacent months
        const hasAdjacentMonthShifts = totalWeekHours > totalCurrentMonthHours || totalWeekEarnings > totalCurrentMonthEarnings;

        // Get total monthly hours for progress bar calculation
        const monthShifts = this.shifts.filter(shift =>
            shift.date.getMonth() === this.currentMonth - 1 &&
            shift.date.getFullYear() === this.currentYear
        );
        let totalMonthlyHours = 0;
        monthShifts.forEach(shift => {
            const calc = this.calculateShift(shift);
            totalMonthlyHours += calc.hours;
        });

        // Update hours card to show current month hours for the week (excluding adjacent month shifts)
        document.getElementById('totalHours').textContent = totalCurrentMonthHours.toFixed(2);

        // Add tooltip to hours card if there are adjacent month shifts
        const hoursCard = document.querySelector('.chart-hours-value-card');
        if (hoursCard) {
            if (hasAdjacentMonthShifts) {
                const excludedHours = totalWeekHours - totalCurrentMonthHours;
                const tooltipText = `Kun timer for ${this.MONTHS[this.currentMonth - 1]} er med i utregningen. ` +
                    `Ekskludert: ${excludedHours.toFixed(1)} timer fra andre måneder.`;

                hoursCard.classList.add('has-tooltip');
                hoursCard.setAttribute('data-tooltip', tooltipText);
                this.setupWageCardTooltip(hoursCard);
            } else {
                hoursCard.classList.remove('has-tooltip');
                hoursCard.removeAttribute('data-tooltip');
                this.removeWageCardTooltip(hoursCard);
            }
        }

        // Transform shifts card to show total wage for current month shifts only
        const shiftCountElement = document.getElementById('shiftCount');
        const shiftCountLabel = document.querySelector('.shifts-count-label');
        const shiftCountCard = document.querySelector('.chart-shifts-count-card');

        if (shiftCountElement && shiftCountLabel && shiftCountCard) {
            // Apply tax deduction if enabled
            const displayAmount = this.taxDeductionEnabled ?
                totalCurrentMonthEarnings * (1 - this.taxPercentage / 100) :
                totalCurrentMonthEarnings;
            shiftCountElement.textContent = this.formatCurrency(displayAmount).replace(' kr', '');
            shiftCountLabel.textContent = 'kroner';

            // Add or remove tooltip based on whether there are adjacent month shifts
            if (hasAdjacentMonthShifts) {
                const excludedHours = totalWeekHours - totalCurrentMonthHours;
                const excludedEarnings = totalWeekEarnings - totalCurrentMonthEarnings;
                const excludedDisplayAmount = this.taxDeductionEnabled ?
                    excludedEarnings * (1 - this.taxPercentage / 100) :
                    excludedEarnings;

                const tooltipText = `Kun vakter for ${this.MONTHS[this.currentMonth - 1]} er med i utregningen. ` +
                    `Ekskludert: ${excludedHours.toFixed(1)} timer (${this.formatCurrency(excludedDisplayAmount)}) fra andre måneder.`;

                shiftCountCard.classList.add('has-tooltip');
                shiftCountCard.setAttribute('data-tooltip', tooltipText);
                this.setupWageCardTooltip(shiftCountCard);
            } else {
                shiftCountCard.classList.remove('has-tooltip');
                shiftCountCard.removeAttribute('data-tooltip');
                this.removeWageCardTooltip(shiftCountCard);
            }
        }

        // Update progress bar to show current month week percentage of monthly hours
        const weekPercentage = totalMonthlyHours > 0 ? (totalCurrentMonthHours / totalMonthlyHours) * 100 : 0;
        const progressLabel = document.querySelector('.chart-progress-label');
        if (progressLabel) {
            const formattedPercent = weekPercentage < 10 ? weekPercentage.toFixed(1) : Math.round(weekPercentage);
            progressLabel.textContent = `${formattedPercent}% av ${totalMonthlyHours.toFixed(1)} timer`;
        }

        // Update progress bar fill
        const progressFill = document.querySelector('.chart-progress-fill');
        if (progressFill) {
            const clampedPercent = Math.min(weekPercentage, 100);

            if (shouldAnimate) {
                requestAnimationFrame(() => {
                    progressFill.style.transition = 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
                    progressFill.style.width = clampedPercent + '%';
                });
            } else {
                progressFill.style.transition = 'none';
                progressFill.style.width = clampedPercent + '%';
                progressFill.offsetHeight; // Force reflow
                progressFill.style.transition = 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
            }

            // Update progress classes
            if (weekPercentage >= 100) {
                progressFill.classList.add('full');
            } else {
                progressFill.classList.remove('full');
            }

            if (weekPercentage > 0) {
                progressFill.classList.add('active');
            } else {
                progressFill.classList.remove('active');
            }
        }
    },

    // Wage card tooltip management functions
    setupWageCardTooltip(card) {
        if (!card || card.hasTooltipListener) return;

        const tooltip = document.getElementById('wageCardTooltip');
        if (!tooltip) return;

        const showTooltip = (e) => {
            const tooltipText = card.getAttribute('data-tooltip');
            if (!tooltipText) return;

            const tooltipContent = document.getElementById('wageTooltipContent');
            if (tooltipContent) {
                tooltipContent.textContent = tooltipText;
            }

            // Position tooltip relative to the stat cards container
            const cardRect = card.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            // Get the stat cards container for proper boundary detection
            const statsContainer = document.querySelector('.chart-stats-section') ||
                                 document.querySelector('.chart-hours-section') ||
                                 card.closest('.weekly-hours-chart-card');
            const statsRect = statsContainer ? statsContainer.getBoundingClientRect() : cardRect;

            // Use smaller tooltip width on desktop to ensure it fits within stat cards
            const isDesktop = viewportWidth > 768;
            const tooltipWidth = isDesktop ?
                Math.min(240, statsRect.width - 32) : // Desktop: fit within stats container
                Math.min(280, viewportWidth - 32);    // Mobile: use viewport

            const tooltipHeight = 70; // Slightly increased for text wrapping
            const padding = 12;

            // Position tooltip in the space between the two cards
            // Get both card positions for consistent between-cards positioning
            const hoursCard = document.querySelector('.chart-hours-value-card');
            const wageCard = document.querySelector('.chart-shifts-count-card');

            let tooltipLeft = cardRect.left + (cardRect.width / 2) - (tooltipWidth / 2);
            let tooltipTop;

            if (hoursCard && wageCard) {
                const hoursRect = hoursCard.getBoundingClientRect();
                const wageRect = wageCard.getBoundingClientRect();

                // Position tooltip in the middle of the space between the two cards
                const spaceBetweenCards = wageRect.top - hoursRect.bottom;
                const tooltipVerticalCenter = hoursRect.bottom + (spaceBetweenCards / 2) - (tooltipHeight / 2);

                // Ensure there's enough space between cards for the tooltip
                if (spaceBetweenCards >= tooltipHeight + (padding * 2)) {
                    tooltipTop = tooltipVerticalCenter;
                } else {
                    // If not enough space between cards, position just below the hours card
                    tooltipTop = hoursRect.bottom + padding;
                }
            } else {
                // Fallback: position above the clicked card if we can't find both cards
                tooltipTop = cardRect.top - tooltipHeight - padding;
            }

            // Ensure tooltip stays within stats container bounds horizontally
            const containerLeft = statsRect.left + padding;
            const containerRight = statsRect.right - padding;

            // Keep tooltip within the stats container boundaries horizontally
            if (tooltipLeft < containerLeft) {
                tooltipLeft = containerLeft;
            } else if (tooltipLeft + tooltipWidth > containerRight) {
                tooltipLeft = containerRight - tooltipWidth;
            }

            // Ensure tooltip stays within viewport bounds
            if (tooltipTop < padding) {
                tooltipTop = padding;
            }
            if (tooltipTop + tooltipHeight > viewportHeight - padding) {
                tooltipTop = viewportHeight - tooltipHeight - padding;
            }

            // Check for back button collision and adjust position
            const backButton = document.querySelector('.back-button');
            if (backButton) {
                const backButtonRect = backButton.getBoundingClientRect();
                const tooltipBottom = tooltipTop + tooltipHeight;

                // If tooltip would overlap with back button, position it above the back button
                if (tooltipBottom > backButtonRect.top - padding) {
                    tooltipTop = backButtonRect.top - tooltipHeight - padding;

                    // If this pushes tooltip too high, try positioning it above the cards instead
                    if (tooltipTop < padding) {
                        if (hoursCard) {
                            const hoursRect = hoursCard.getBoundingClientRect();
                            tooltipTop = hoursRect.top - tooltipHeight - padding;

                            // Final fallback: position at top of viewport
                            if (tooltipTop < padding) {
                                tooltipTop = padding;
                            }
                        }
                    }
                }
            }

            // Convert to relative positioning within the tooltip parent
            const tooltipParent = tooltip.parentElement;
            const containerRect = tooltipParent.getBoundingClientRect();

            const relativeLeft = tooltipLeft - containerRect.left;
            const relativeTop = tooltipTop - containerRect.top;

            tooltip.style.left = `${relativeLeft}px`;
            tooltip.style.top = `${relativeTop}px`;
            tooltip.classList.add('show');

            card.classList.add('tooltip-active');
        };

        const hideTooltip = () => {
            tooltip.classList.remove('show');
            card.classList.remove('tooltip-active');
        };

        // Add click event listener
        card.addEventListener('click', (e) => {
            e.stopPropagation();

            if (card.classList.contains('tooltip-active')) {
                hideTooltip();
            } else {
                // Hide any other active wage card tooltips
                document.querySelectorAll('.chart-hours-value-card.tooltip-active, .chart-shifts-count-card.tooltip-active')
                    .forEach(activeCard => {
                        if (activeCard !== card) {
                            activeCard.classList.remove('tooltip-active');
                        }
                    });
                showTooltip(e);
            }
        });

        // Store reference to prevent duplicate listeners
        card.hasTooltipListener = true;
        card.wageTooltipHideFunction = hideTooltip;

        // Add global click listener to hide tooltip when clicking outside (only once)
        if (!this.wageTooltipGlobalListener) {
            this.wageTooltipGlobalListener = (e) => {
                const clickedCard = e.target.closest('.chart-hours-value-card, .chart-shifts-count-card');
                const clickedTooltip = e.target.closest('.wage-card-tooltip');

                // Don't hide if clicking on a wage card or the tooltip itself
                if (clickedCard || clickedTooltip) {
                    return;
                }

                // Hide all active wage card tooltips
                document.querySelectorAll('.chart-hours-value-card.tooltip-active, .chart-shifts-count-card.tooltip-active')
                    .forEach(activeCard => {
                        if (activeCard.wageTooltipHideFunction) {
                            activeCard.wageTooltipHideFunction();
                        }
                    });
            };

            document.addEventListener('click', this.wageTooltipGlobalListener);
        }
    },

    removeWageCardTooltip(card) {
        if (!card || !card.hasTooltipListener) return;

        // Remove tooltip if active
        if (card.wageTooltipHideFunction) {
            card.wageTooltipHideFunction();
        }

        // Clean up
        card.hasTooltipListener = false;
        card.wageTooltipHideFunction = null;
    },

    updateWeeklyHoursChart() {
        const chartBars = document.getElementById('chartBars');
        const chartLabels = document.getElementById('chartLabels');
        const chartTooltip = document.getElementById('chartTooltip');

        if (!chartBars || !chartLabels) return;

        // Check if we're in drill-down mode
        if (this.isInDrillDownMode()) {
            this.renderDailyChart(chartBars, chartLabels, chartTooltip);
            return;
        }

        // Get shifts for current month
        const monthShifts = this.shifts.filter(shift =>
            shift.date.getMonth() === this.currentMonth - 1 &&
            shift.date.getFullYear() === this.currentYear
        );

        // Group shifts by week and calculate hours and earnings
        const weeklyData = {};
        let totalMonthlyHours = 0;

        monthShifts.forEach(shift => {
            const weekNumber = this.getISOWeekNumber(shift.date);
            if (!weeklyData[weekNumber]) {
                weeklyData[weekNumber] = {
                    hours: 0,
                    earnings: 0,
                    shifts: []
                };
            }
            const calc = this.calculateShift(shift);
            weeklyData[weekNumber].hours += calc.hours;
            weeklyData[weekNumber].earnings += calc.total;
            weeklyData[weekNumber].shifts.push(shift);
            totalMonthlyHours += calc.hours;
        });

        // Get all weeks in the current month (including partial weeks)
        const firstDay = new Date(this.currentYear, this.currentMonth - 1, 1);
        const lastDay = new Date(this.currentYear, this.currentMonth, 0);
        const allWeeks = new Set();

        // Add weeks that contain days from the current month
        for (let date = new Date(firstDay); date <= lastDay; date.setDate(date.getDate() + 1)) {
            allWeeks.add(this.getISOWeekNumber(date));
        }

        const sortedWeeks = Array.from(allWeeks).sort((a, b) => a - b);

        // If no weeks found, generate week numbers for the current month
        if (sortedWeeks.length === 0) {
            const firstOfMonth = new Date(this.currentYear, this.currentMonth - 1, 1);
            const lastOfMonth = new Date(this.currentYear, this.currentMonth, 0);

            // Add all weeks that contain days from the current month
            for (let date = new Date(firstOfMonth); date <= lastOfMonth; date.setDate(date.getDate() + 1)) {
                const weekNum = this.getISOWeekNumber(date);
                if (!sortedWeeks.includes(weekNum)) {
                    sortedWeeks.push(weekNum);
                }
            }
            sortedWeeks.sort((a, b) => a - b);
        }

        const maxHours = Math.max(...sortedWeeks.map(week => weeklyData[week]?.hours || 0), 1);

        // Get current week number for highlighting
        const today = new Date();
        const currentWeekNumber = this.getISOWeekNumber(today);

        // Check if we're viewing the current month/year
        const isCurrentMonth = this.currentMonth === (today.getMonth() + 1) && this.currentYear === today.getFullYear();

        // Find the week with the most hours for highlighting
        const highestWeek = sortedWeeks.reduce((highest, week) => {
            const currentHours = weeklyData[week]?.hours || 0;
            const highestHours = weeklyData[highest]?.hours || 0;
            return currentHours > highestHours ? week : highest;
        }, sortedWeeks[0]);

        // Clear existing content and remove back button if present
        this.removeBackButton();

        // Comprehensive tooltip cleanup when re-rendering chart
        this.clearAllTooltips();

        chartBars.innerHTML = '';
        chartLabels.innerHTML = '';

        // Set total weeks count for CSS calculations on both containers
        chartBars.style.setProperty('--total-weeks', sortedWeeks.length);
        chartLabels.style.setProperty('--total-weeks', sortedWeeks.length);

        // Force reflow to ensure animations trigger properly
        chartBars.offsetHeight;

        // Store reference to currently active tooltip bar (shared across all bars)
        let activeTooltipBar = null;

        // Global tooltip functions
        const hideTooltip = () => {
            chartTooltip.classList.remove('show');
            if (activeTooltipBar) {
                activeTooltipBar.classList.remove('tooltip-active');
                activeTooltipBar = null;
            }
        };

        // Store hideTooltip function for global access
        this.hideChartTooltip = hideTooltip;

        // Create bars and labels
        sortedWeeks.forEach((weekNumber, index) => {
            const weekData = weeklyData[weekNumber] || { hours: 0, earnings: 0, shifts: [] };
            const hours = weekData.hours;
            const earnings = weekData.earnings;
            const heightPercent = maxHours > 0 ? (hours / maxHours) * 100 : 0;
            const monthlyPercent = totalMonthlyHours > 0 ? (hours / totalMonthlyHours) * 100 : 0;

            // Create bar
            const bar = document.createElement('div');
            bar.className = 'chart-bar';

            // Add has-data class for bars with actual hours
            if (hours > 0) {
                bar.classList.add('has-data');
            }

            // Add highest class for the week with most hours
            if (weekNumber === highestWeek && hours > 0) {
                bar.classList.add('highest');
            }

            // Add current week class for highlighting
            if (isCurrentMonth && weekNumber === currentWeekNumber) {
                bar.classList.add('current-week');
                bar.setAttribute('aria-label', `Uke ${weekNumber} (Inneværende uke): ${hours.toFixed(1)} timer, ${this.formatCurrency(earnings)}`);
            } else {
                bar.setAttribute('aria-label', `Uke ${weekNumber}: ${hours.toFixed(1)} timer, ${this.formatCurrency(earnings)}`);
            }

            // Calculate actual pixel height based on responsive container height
            let containerHeight = 160 - 24; // Default: 160px container minus 16px top + 8px bottom padding

            // Adjust for responsive breakpoints
            if (window.innerWidth <= 360) {
                containerHeight = 100 - 14; // 100px - 10px top + 4px bottom
            } else if (window.innerWidth <= 480) {
                containerHeight = 120 - 18; // 120px - 12px top + 6px bottom
            } else if (window.innerWidth <= 767) {
                containerHeight = 140 - 24; // 140px - 16px top + 8px bottom
            } else if (window.innerWidth >= 768) {
                containerHeight = 180 - 30; // 180px - 20px top + 10px bottom
            }

            const actualHeight = Math.max(2, (heightPercent / 100) * containerHeight);

            // Set CSS custom property for animation
            bar.style.setProperty('--bar-height', `${actualHeight}px`);
            bar.setAttribute('data-week', weekNumber);
            bar.setAttribute('data-hours', hours.toFixed(1));
            bar.setAttribute('data-earnings', earnings.toFixed(0));
            bar.setAttribute('data-percentage', monthlyPercent.toFixed(1));

            // Ensure the bar is added to DOM before setting animation
            chartBars.appendChild(bar);

            // Force animation restart by briefly removing and re-adding animation
            requestAnimationFrame(() => {
                bar.style.animation = 'none';
                bar.offsetHeight; // Trigger reflow
                bar.style.animation = 'barGrowth 0.25s ease-out forwards';
            });

            // Add hour value on top of bar
            const barValue = document.createElement('div');
            barValue.className = 'chart-bar-value';

            // Format hours based on screen size - whole numbers for small screens (iPhone 16 standard and similar)
            let formattedHours;
            if (hours > 0) {
                // Show whole numbers on small screens (max-width: 429px) - excludes iPhone Pro Max (439px) but includes iPhone 16 standard (393px)
                if (window.innerWidth <= 429) {
                    formattedHours = `${Math.round(hours)}t`;
                } else {
                    formattedHours = `${hours.toFixed(1)}t`;
                }
            } else {
                formattedHours = '';
            }

            barValue.textContent = formattedHours;
            bar.appendChild(barValue);

            // Add interactive events for enhanced tooltip - only for bars with data
            if (hours > 0) {

                // Function to show tooltip
                const showTooltip = (e) => {
                    const barValueElement = bar.querySelector('.chart-bar-value');
                    const rect = bar.getBoundingClientRect();

                    // Use the tooltip's parent container for positioning context
                    const tooltipParent = chartTooltip.parentElement;
                    const containerRect = tooltipParent.getBoundingClientRect();



                    const tooltipContent = document.getElementById('tooltipContent');
                    if (tooltipContent) {
                        // Remove current week indicator - just show week number
                        const weekLabel = `Uke ${weekNumber}`;

                        tooltipContent.innerHTML = `
                            <span class="chart-tooltip-line">${weekLabel}</span>
                            <span class="chart-tooltip-line">${hours.toFixed(1).replace('.', ',')} timer</span>
                            <span class="chart-tooltip-line">${monthlyPercent.toFixed(1).replace('.', ',')}% av måneden</span>
                            <span class="chart-tooltip-line">${this.formatCurrency(earnings)}</span>
                        `;
                    }

                    // Position tooltip directly above the hour value text inside the bar
                    const tooltipWidth = 140; // Approximate tooltip width
                    const tooltipHeight = 80; // Approximate tooltip height
                    const padding = 6; // Reduced padding for closer positioning

                    // Get the position of the hour value element if it exists
                    let barValueRect = null;
                    if (barValueElement) {
                        barValueRect = barValueElement.getBoundingClientRect();
                    }

                    // Calculate horizontal position - center on hour value text or bar center
                    let tooltipLeft;
                    if (barValueRect) {
                        // Center on the hour value text precisely
                        tooltipLeft = barValueRect.left - containerRect.left + barValueRect.width / 2 - tooltipWidth / 2;
                    } else {
                        // Fallback to bar center
                        tooltipLeft = rect.left - containerRect.left + rect.width / 2 - tooltipWidth / 2;
                    }

                    // Ensure tooltip stays within container bounds
                    tooltipLeft = Math.max(padding, Math.min(tooltipLeft, containerRect.width - tooltipWidth - padding));

                    // Calculate vertical position - position directly above the hour value text
                    let tooltipTop;
                    if (barValueRect) {
                        // Position directly above the hour value text with minimal gap
                        // The hour value is positioned at the bottom of the bar, so we position above it
                        tooltipTop = barValueRect.top - containerRect.top - tooltipHeight - padding;
                    } else {
                        // Fallback to above the bar
                        tooltipTop = rect.top - containerRect.top - tooltipHeight - padding;
                    }

                    // If tooltip would go above container, position it below the hour value
                    if (tooltipTop < padding) {
                        if (barValueRect) {
                            // Position below the hour value text
                            tooltipTop = barValueRect.bottom - containerRect.top + padding;
                        } else {
                            // Fallback to below the bar
                            tooltipTop = rect.bottom - containerRect.top + padding;
                        }
                    }

                    chartTooltip.style.left = `${tooltipLeft}px`;
                    chartTooltip.style.top = `${tooltipTop}px`;
                    chartTooltip.classList.add('show');

                    // Mark this bar as having active tooltip
                    bar.classList.add('tooltip-active');
                    activeTooltipBar = bar;
                };

                // Store reference to app context for event handlers
                const self = this;

                // Click/tap event for mobile and desktop - immediate drill-down activation
                bar.addEventListener('click', (e) => {
                    e.stopPropagation();

                    // Hide any existing tooltip first
                    hideTooltip();

                    // Immediately enter drill-down mode
                    self.enterDrillDownMode(weekNumber);
                });
            }

            // Create label
            const label = document.createElement('div');
            label.className = 'chart-label';

            // Add current week class for highlighting
            if (isCurrentMonth && weekNumber === currentWeekNumber) {
                label.classList.add('current-week');
            }

            label.textContent = weekNumber.toString();
            chartLabels.appendChild(label);
        });

        // If no data, show a subtle message
        if (maxHours === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'chart-empty-message';
            emptyMessage.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: var(--text-secondary);
                font-size: 12px;
                font-weight: 500;
                opacity: 0.6;
                text-align: center;
                pointer-events: none;
            `;
            emptyMessage.textContent = 'Ingen vakter registrert denne måneden';
            chartBars.appendChild(emptyMessage);
        }

        // Add global click listener to hide tooltip when clicking outside
        if (!this.chartTooltipGlobalListener) {
            const self = this; // Store reference to maintain context
            this.chartTooltipGlobalListener = (e) => {
                // Check if click is outside chart area and not on a chart bar
                const chartContainer = document.querySelector('.chart-container');
                const clickedBar = e.target.closest('.chart-bar');
                const clickedTooltip = e.target.closest('.chart-tooltip');

                // Don't hide if clicking on the tooltip itself or on a chart bar
                if (clickedTooltip || clickedBar) {
                    return;
                }

                // Hide tooltip if clicking outside the chart container
                if (chartContainer && !chartContainer.contains(e.target)) {
                    if (self.hideChartTooltip) {
                        self.hideChartTooltip();
                    }
                }
            };

            document.addEventListener('click', this.chartTooltipGlobalListener);
        }

    },

    // Render daily chart for drill-down view
    renderDailyChart(chartBars, chartLabels, chartTooltip) {
        const { dailyData, totalWeekHours, totalWeekEarnings } = this.getDailyDataForWeek(this.selectedWeek);

        // Add back button
        this.addBackButton();

        // Get days that have shifts, sorted Monday to Sunday
        const daysWithShifts = this.getDaysWithShifts(this.selectedWeek);

        if (daysWithShifts.length === 0) {
            // No shifts for this week
            chartBars.innerHTML = '<div class="chart-empty-message" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: var(--text-secondary); font-size: 12px; font-weight: 500; opacity: 0.6; text-align: center; pointer-events: none;">Ingen vakter denne uken</div>';
            chartLabels.innerHTML = '';
            return;
        }

        // Clear existing content
        chartBars.innerHTML = '';
        chartLabels.innerHTML = '';

        // Comprehensive tooltip cleanup when rendering daily chart
        this.clearAllTooltips();

        // Set total days count for CSS calculations
        chartBars.style.setProperty('--total-weeks', daysWithShifts.length);
        chartLabels.style.setProperty('--total-weeks', daysWithShifts.length);

        // Force reflow to ensure animations trigger properly
        chartBars.offsetHeight;

        // Get max hours for scaling
        const maxHours = Math.max(...daysWithShifts.map(day => dailyData[day]?.hours || 0), 1);

        // Get current date for highlighting and calculate the actual dates for this week
        const today = new Date();
        const isCurrentMonth = this.currentMonth === (today.getMonth() + 1) && this.currentYear === today.getFullYear();

        // Get the date range for the selected week to properly calculate day dates
        const { startDate, endDate } = this.getWeekDateRange(this.selectedWeek, this.currentYear);

        // Day abbreviations (Sunday to Saturday)
        const dayAbbreviations = ['S', 'M', 'T', 'O', 'T', 'F', 'L'];

        // Store reference to currently active tooltip bar
        let activeTooltipBar = null;

        // Global tooltip functions
        const hideTooltip = () => {
            chartTooltip.classList.remove('show');
            if (activeTooltipBar) {
                activeTooltipBar.classList.remove('tooltip-active');
                activeTooltipBar = null;
            }
        };

        // Store hideTooltip function for global access
        this.hideChartTooltip = hideTooltip;

        // Create bars and labels for each day with shifts
        daysWithShifts.forEach((dayOfWeek, index) => {
            const dayData = dailyData[dayOfWeek];
            const hours = dayData.hours;
            const earnings = dayData.earnings;
            const heightPercent = maxHours > 0 ? (hours / maxHours) * 100 : 0;

            // Create bar
            const bar = document.createElement('div');
            bar.className = 'chart-bar';

            // Add has-data class since we only show days with shifts
            bar.classList.add('has-data');

            // Check if this day has shifts from adjacent months
            if (dayData.hasAdjacentMonthShifts && !dayData.hasCurrentMonthShifts) {
                // Day only has shifts from adjacent months
                bar.classList.add('adjacent-month');
            }

            // Calculate the actual date for this day of the week within the selected week
            // startDate is Monday (day 1), so we need to adjust for different days of the week
            const actualDateForThisDay = new Date(startDate);
            if (dayOfWeek === 0) {
                // Sunday - add 6 days to Monday to get Sunday
                actualDateForThisDay.setDate(startDate.getDate() + 6);
            } else {
                // Monday (1) to Saturday (6) - add (dayOfWeek - 1) days to Monday
                actualDateForThisDay.setDate(startDate.getDate() + (dayOfWeek - 1));
            }

            // Check if this day is today for highlighting using the calculated date
            const isToday = actualDateForThisDay.getDate() === today.getDate() &&
                           actualDateForThisDay.getMonth() === today.getMonth() &&
                           actualDateForThisDay.getFullYear() === today.getFullYear();

            if (isToday) {
                bar.classList.add('current-week'); // Reuse current-week class for current day
                bar.setAttribute('aria-label', `${this.WEEKDAYS[dayOfWeek]} (I dag): ${hours.toFixed(2)} timer, ${this.formatCurrency(earnings)}`);
            } else {
                bar.setAttribute('aria-label', `${this.WEEKDAYS[dayOfWeek]}: ${hours.toFixed(2)} timer, ${this.formatCurrency(earnings)}`);
            }

            // Calculate actual pixel height based on responsive container height
            let containerHeight = 160 - 24; // Default: 160px container minus padding

            // Adjust for responsive breakpoints
            if (window.innerWidth <= 360) {
                containerHeight = 100 - 14;
            } else if (window.innerWidth <= 480) {
                containerHeight = 120 - 18;
            } else if (window.innerWidth <= 767) {
                containerHeight = 140 - 24;
            } else if (window.innerWidth >= 768) {
                containerHeight = 180 - 30;
            }

            const actualHeight = Math.max(2, (heightPercent / 100) * containerHeight);

            // Set CSS custom property for animation
            bar.style.setProperty('--bar-height', `${actualHeight}px`);
            bar.setAttribute('data-day', dayOfWeek);
            bar.setAttribute('data-hours', hours.toFixed(1));
            bar.setAttribute('data-earnings', earnings.toFixed(0));

            // Ensure the bar is added to DOM before setting animation
            chartBars.appendChild(bar);

            // Force animation restart
            requestAnimationFrame(() => {
                bar.style.animation = 'none';
                bar.offsetHeight; // Trigger reflow
                bar.style.animation = 'barGrowth 0.25s ease-out forwards';
            });

            // Add hour value on top of bar
            const barValue = document.createElement('div');
            barValue.className = 'chart-bar-value';

            // Format hours with two decimal places for daily drill-down view
            let formattedHours;
            if (window.innerWidth <= 429) {
                formattedHours = `${hours.toFixed(2)}t`;
            } else {
                formattedHours = `${hours.toFixed(2)}t`;
            }

            barValue.textContent = formattedHours;
            bar.appendChild(barValue);

            // Add tooltip functionality
            const showTooltip = (e) => {
                const barValueElement = bar.querySelector('.chart-bar-value');
                const rect = bar.getBoundingClientRect();
                const tooltipParent = chartTooltip.parentElement;
                const containerRect = tooltipParent.getBoundingClientRect();

                const tooltipContent = document.getElementById('tooltipContent');
                if (tooltipContent) {
                    const dayName = this.WEEKDAYS[dayOfWeek];
                    const dateStr = dayData.date.toLocaleDateString('no-NO', { day: 'numeric', month: 'short' });

                    tooltipContent.innerHTML = `
                        <span class="chart-tooltip-line">${dayName} ${dateStr}</span>
                        <span class="chart-tooltip-line">${hours.toFixed(2).replace('.', ',')}t</span>
                        <span class="chart-tooltip-line">${this.formatCurrency(earnings)}</span>
                    `;
                }

                // Position tooltip
                const tooltipWidth = 140;
                const tooltipHeight = 80;
                const padding = 6;

                let barValueRect = null;
                if (barValueElement) {
                    barValueRect = barValueElement.getBoundingClientRect();
                }

                let tooltipLeft;
                if (barValueRect) {
                    tooltipLeft = barValueRect.left - containerRect.left + barValueRect.width / 2 - tooltipWidth / 2;
                } else {
                    tooltipLeft = rect.left - containerRect.left + rect.width / 2 - tooltipWidth / 2;
                }

                tooltipLeft = Math.max(padding, Math.min(tooltipLeft, containerRect.width - tooltipWidth - padding));

                let tooltipTop;
                if (barValueRect) {
                    tooltipTop = barValueRect.top - containerRect.top - tooltipHeight - padding;
                } else {
                    tooltipTop = rect.top - containerRect.top - tooltipHeight - padding;
                }

                if (tooltipTop < padding) {
                    if (barValueRect) {
                        tooltipTop = barValueRect.bottom - containerRect.top + padding;
                    } else {
                        tooltipTop = rect.bottom - containerRect.top + padding;
                    }
                }

                chartTooltip.style.left = `${tooltipLeft}px`;
                chartTooltip.style.top = `${tooltipTop}px`;
                chartTooltip.classList.add('show');

                bar.classList.add('tooltip-active');
                activeTooltipBar = bar;
            };

            // Double-click tracking variables for this bar
            let clickCount = 0;
            let clickTimer = null;

            // Click event for tooltip and double-click detection
            bar.addEventListener('click', (e) => {
                e.stopPropagation();

                clickCount++;

                if (clickCount === 1) {
                    // Single click - set timer to handle tooltip
                    clickTimer = setTimeout(() => {
                        // Single click behavior - show/hide tooltip
                        if (bar.classList.contains('tooltip-active')) {
                            hideTooltip();
                        } else {
                            if (activeTooltipBar && activeTooltipBar !== bar) {
                                activeTooltipBar.classList.remove('tooltip-active');
                            }
                            showTooltip(e);
                        }
                        clickCount = 0;
                    }, 300); // 300ms delay to detect double-click
                } else if (clickCount === 2) {
                    // Double click detected - clear timer and open shift details
                    clearTimeout(clickTimer);
                    clickCount = 0;

                    console.log('Double-click detected on daily chart bar for day:', dayOfWeek);

                    // Hide any active tooltip first
                    hideTooltip();

                    // Get the shifts for this day and open details for the first shift
                    const dayShifts = dayData.shifts;
                    if (dayShifts && dayShifts.length > 0) {
                        console.log('Opening shift details for shift ID:', dayShifts[0].id);
                        // If multiple shifts on the same day, show details for the first one
                        // In the future, this could be enhanced to show a selection dialog
                        this.showShiftDetails(dayShifts[0].id);
                    } else {
                        console.log('No shifts found for this day');
                    }
                }
            });

            // Create label with day abbreviation
            const label = document.createElement('div');
            label.className = 'chart-label';

            // Add current day class for highlighting
            if (isToday) {
                label.classList.add('current-week'); // Reuse current-week class for current day
            }

            label.textContent = dayAbbreviations[dayOfWeek];
            chartLabels.appendChild(label);
        });
    },

    updateShiftList() {

        this.shifts.forEach((shift, index) => {
        });

        const shiftList = document.getElementById('shiftList');
        const monthShifts = this.shifts.filter(shift =>
            shift.date.getMonth() === this.currentMonth - 1 &&
            shift.date.getFullYear() === this.currentYear
        );

        if (monthShifts.length === 0) {
            shiftList.innerHTML = `
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
            `;
            return;
        }

        // Sort shifts by date (earliest first)
        const sortedShifts = monthShifts.sort((a, b) => a.date - b.date);

        // Group shifts by week
        const weekGroups = {};
        sortedShifts.forEach(shift => {
            const weekNumber = this.getISOWeekNumber(shift.date);
            if (!weekGroups[weekNumber]) {
                weekGroups[weekNumber] = [];
            }
            weekGroups[weekNumber].push(shift);
        });

        // Create HTML with week separators
        const shiftsHtml = [];
        const weekNumbers = Object.keys(weekGroups).sort((a, b) => a - b); // Sort weeks ascending (earliest first)

        weekNumbers.forEach((weekNumber, weekIndex) => {
            const weekShifts = weekGroups[weekNumber];

            // Calculate weekly wage total
            let weeklyTotal = 0;
            weekShifts.forEach(shift => {
                const calc = this.calculateShift(shift);
                weeklyTotal += calc.total;
            });

            // Add week separator BEFORE each week's shifts as a header
            shiftsHtml.push(`
                <div class="week-separator">
                    <div class="week-separator-line"></div>
                    <div class="week-separator-content">
                        <div class="week-separator-left">
                            <span class="week-separator-week">Uke ${weekNumber}</span>
                            <svg class="week-separator-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </div>
                        <div class="week-separator-right">
                            <svg class="week-separator-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                            <span class="week-separator-total">${this.formatCurrency(weeklyTotal)}</span>
                        </div>
                    </div>
                    <div class="week-separator-line"></div>
                </div>
            `);

            // Add shifts for this week
            weekShifts.forEach(shift => {
                const calc = this.calculateShift(shift);
                const day = shift.date.getDate();
                const weekday = this.WEEKDAYS[shift.date.getDay()];
                const typeClass = shift.type === 0 ? 'weekday' : (shift.type === 1 ? 'saturday' : 'sunday');
                const seriesBadge = shift.seriesId ? '<span class="series-badge">Serie</span>' : '';

                // Check if this shift has overlaps
                const hasOverlaps = this.shiftHasOverlaps(shift);
                const warningIndicator = hasOverlaps ? `
                    <span class="shift-warning-indicator" title="Denne vakten overlapper med andre vakter">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                    </span>
                ` : '';

                // Check if this shift is on the current date
                const today = new Date();
                const isCurrentDate = shift.date.getDate() === today.getDate() &&
                                    shift.date.getMonth() === today.getMonth() &&
                                    shift.date.getFullYear() === today.getFullYear();
                const currentDateClass = isCurrentDate ? ' current-date' : '';

                // Create employee chip if employee is assigned
                const employeeChip = shift.employee ? `
                    <span class="employee-chip" style="background-color: ${shift.employee.display_color || '#6b7280'}">
                        <span class="employee-chip-color" style="background-color: ${shift.employee.display_color || '#6b7280'}"></span>
                        <span class="employee-chip-name">${shift.employee.name}</span>
                    </span>
                ` : '';

                shiftsHtml.push(`
                    <div class="shift-item ${typeClass}${currentDateClass}" data-shift-id="${shift.id}" style="cursor: pointer;">
                        <div class="shift-info">
                            <div class="shift-date">
                                <span class="shift-date-number">${day}. ${this.MONTHS[shift.date.getMonth()]}</span>
                                <span class="shift-date-separator"></span>
                                <span class="shift-date-weekday">${weekday}${seriesBadge}${warningIndicator}</span>
                            </div>
                            <div class="shift-details">
                                <div class="shift-time-with-hours">
                                    <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <polyline points="12 6 12 12 16 14"></polyline>
                                    </svg>
                                    <span>${shift.startTime} - ${shift.endTime}</span>
                                    <span class="shift-time-arrow">→</span>
                                    <span>${this.formatHours(calc.totalHours)}</span>
                                    ${employeeChip}
                                </div>
                            </div>
                        </div>
                        <div class="shift-amount-wrapper">
                            <div class="shift-total">${this.formatCurrency(calc.total)}</div>
                            <div class="shift-breakdown">
                                ${this.formatCurrencyShort(calc.baseWage)} + ${this.formatCurrencyShort(calc.bonus)}
                            </div>
                        </div>
                    </div>
                `);
            });
        });

        shiftList.innerHTML = shiftsHtml.join('');
    },

    updateShiftCalendar() {
        if (this.shiftView !== 'calendar') return;

        const currentKey = this.getMonthShiftsKey();
        if (this.lastRenderedMonth !== this.currentMonth ||
            this.lastRenderedYear !== this.currentYear ||
            this.lastRenderedShiftsKey !== currentKey) {
            this.renderShiftCalendar();
        } else {
            this.updateCalendarCells();
        }
    },

    updateLastUpdatedTime() {
        const lastUpdatedEl = document.getElementById('lastUpdatedTime');
        if (lastUpdatedEl) {
            const now = new Date();
            const timeString = now.toLocaleTimeString('no-NO', {
                hour: '2-digit',
                minute: '2-digit'
            });
            lastUpdatedEl.textContent = timeString;
        }
    },

    updateNextShiftCard() {
        const nextShiftCard = document.getElementById('nextShiftCard');
        if (!nextShiftCard) return;

        // Always hide in Employees tab
        if (this.currentView === 'employees') {
            nextShiftCard.style.display = 'none';
            return;
        }

        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        // Show the card (handled differently per month)
        nextShiftCard.style.display = 'block';
        // Ensure skeleton is visible until we populate content
        const contentEl = document.getElementById('nextShiftContent');
        if (contentEl && !contentEl.dataset.populated) {
            const skel = contentEl.querySelector('.skeleton');
            if (skel) skel.style.display = 'block';
        }

        // If we're not viewing the current month and year, show the best shift from selected month
        if (this.currentMonth !== currentMonth || this.currentYear !== currentYear) {
            this.displayBestShiftCard();
            this.stopNextShiftTimer(); // Stop timer when not viewing current month
            return;
        }

        // Check if there's a current shift happening right now
        const currentShift = this.shifts.find(shift => {
            const shiftDate = new Date(shift.date);
            if (shiftDate.toDateString() === now.toDateString()) {
                const [startHour, startMinute] = shift.startTime.split(':').map(Number);
                const [endHour, endMinute] = shift.endTime.split(':').map(Number);

                const shiftStartTime = new Date(shiftDate);
                shiftStartTime.setHours(startHour, startMinute, 0, 0);

                const shiftEndTime = new Date(shiftDate);
                shiftEndTime.setHours(endHour, endMinute, 0, 0);

                // Handle shifts that cross midnight
                if (shiftEndTime < shiftStartTime) {
                    shiftEndTime.setDate(shiftEndTime.getDate() + 1);
                }

                return now >= shiftStartTime && now <= shiftEndTime;
            }
            return false;
        });

        // If there's a current shift, show current shift info
        if (currentShift) {
            this.displayCurrentShiftCard(currentShift, now);
            return;
        }

        // Get all shifts from now onwards
        const upcomingShifts = this.shifts.filter(shift => {
            const shiftDate = new Date(shift.date);

            // If shift is on a future date, include it
            if (shiftDate > now) {
                return true;
            }

            // If shift is today, check if it hasn't started yet
            if (shiftDate.toDateString() === now.toDateString()) {
                const [startHour, startMinute] = shift.startTime.split(':').map(Number);
                const shiftStartTime = new Date(shiftDate);
                shiftStartTime.setHours(startHour, startMinute, 0, 0);

                return shiftStartTime > now;
            }

            return false;
        });

        // Sort by date and time
        upcomingShifts.sort((a, b) => {
            const aDate = new Date(a.date);
            const bDate = new Date(b.date);

            if (aDate.getTime() !== bDate.getTime()) {
                return aDate - bDate;
            }

            // Same date, sort by start time
            const [aHour, aMinute] = a.startTime.split(':').map(Number);
            const [bHour, bMinute] = b.startTime.split(':').map(Number);

            return (aHour * 60 + aMinute) - (bHour * 60 + bMinute);
        });

        const nextShiftContent = document.getElementById('nextShiftContent');
        const nextShiftEmpty = document.getElementById('nextShiftEmpty');

        if (upcomingShifts.length === 0) {
            // No upcoming shifts - show most recent shift instead
            const pastShifts = this.shifts.filter(shift => {
                const shiftDate = new Date(shift.date);

                // If shift is on a past date, include it
                if (shiftDate < now) {
                    return true;
                }

                // If shift is today, check if it has already ended
                if (shiftDate.toDateString() === now.toDateString()) {
                    const [endHour, endMinute] = shift.endTime.split(':').map(Number);
                    const shiftEndTime = new Date(shiftDate);
                    shiftEndTime.setHours(endHour, endMinute, 0, 0);

                    // Handle shifts that cross midnight
                    if (endHour < parseInt(shift.startTime.split(':')[0])) {
                        shiftEndTime.setDate(shiftEndTime.getDate() + 1);
                    }

                    return now > shiftEndTime;
                }

                return false;
            });

            // Sort past shifts by date and time (most recent first)
            pastShifts.sort((a, b) => {
                const aDate = new Date(a.date);
                const bDate = new Date(b.date);

                if (aDate.getTime() !== bDate.getTime()) {
                    return bDate - aDate; // Most recent first
                }

                // Same date, sort by end time (latest end time first)
                const [aEndHour, aEndMinute] = a.endTime.split(':').map(Number);
                const [bEndHour, bEndMinute] = b.endTime.split(':').map(Number);

                return (bEndHour * 60 + bEndMinute) - (aEndHour * 60 + aEndMinute);
            });

            if (pastShifts.length === 0) {
                // No shifts at all
                nextShiftContent.style.display = 'none';
                nextShiftEmpty.style.display = 'flex';
                // Reset empty message for current month
                const emptyMessage = nextShiftEmpty.querySelector('.empty-message');
                if (emptyMessage) {
                    emptyMessage.textContent = 'Ingen kommende vakter';
                }
                this.stopNextShiftTimer(); // Stop timer when no shifts
            } else {
                // Show most recent shift
                nextShiftContent.style.display = 'flex';
                nextShiftEmpty.style.display = 'none';

                const lastShift = pastShifts[0];
                const calculation = this.calculateShift(lastShift);

                // Format date
                const shiftDate = new Date(lastShift.date);
                const weekday = this.WEEKDAYS[shiftDate.getDay()];
                const day = shiftDate.getDate();
                const month = this.MONTHS[shiftDate.getMonth()];
                const seriesBadge = lastShift.seriesId ? '<span class="series-badge">Serie</span>' : '';

                // Check if the shift is in the current week
                const currentWeekNumber = this.getISOWeekNumber(now);
                const shiftWeekNumber = this.getISOWeekNumber(shiftDate);
                const isCurrentWeek = currentWeekNumber === shiftWeekNumber && shiftDate.getFullYear() === now.getFullYear();

                // Determine date display format with Norwegian day indicators
                let dateDisplay;
                if (shiftDate.toDateString() === now.toDateString()) {
                    // Show "I dag" for today's shifts
                    dateDisplay = `I dag${seriesBadge}`;
                } else {
                    // Calculate tomorrow for comparison
                    const tomorrow = new Date(now);
                    tomorrow.setDate(now.getDate() + 1);

                    if (shiftDate.toDateString() === tomorrow.toDateString()) {
                        // Show "I morgen" for tomorrow's shifts
                        dateDisplay = `I morgen${seriesBadge}`;
                    } else if (isCurrentWeek) {
                        // Show capitalized weekday name for shifts in current week
                        const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
                        dateDisplay = `${capitalizedWeekday}${seriesBadge}`;
                    } else {
                        // Show full date without weekday for shifts outside current week
                        dateDisplay = `${day}. ${month}${seriesBadge}`;
                    }
                }

                // Create the shift item using the exact same structure as in the shift list
                const typeClass = lastShift.type === 0 ? 'weekday' : (lastShift.type === 1 ? 'saturday' : 'sunday');

                // Check if this shift has overlaps
                const hasOverlaps = this.shiftHasOverlaps(lastShift);
                const warningIndicator = hasOverlaps ? `
                    <span class="shift-warning-indicator" title="Denne vakten overlapper med andre vakter">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                    </span>
                ` : '';

                // No highlighting for last shift (remove active class)
                nextShiftContent.innerHTML = `
                    <div class="shift-item ${typeClass}" data-shift-id="${lastShift.id}" style="cursor: pointer; position: relative;">
                        <div class="next-shift-badge">Siste</div>
                        <div class="shift-info">
                            <div class="shift-date">
                                <span class="shift-date-weekday">${dateDisplay}${warningIndicator}</span>
                            </div>
                            <div class="shift-details">
                                <div class="shift-time-with-hours">
                                    <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <polyline points="12 6 12 12 16 14"></polyline>
                                    </svg>
                                    <span>${lastShift.startTime} - ${lastShift.endTime}</span>
                                    <span class="shift-time-arrow">→</span>
                                    <span>${this.formatHours(calculation.totalHours)}</span>
                                </div>
                            </div>
                        </div>
                        <div class="shift-amount-wrapper">
                            <div class="shift-total">${this.formatCurrency(calculation.total)}</div>
                            <div class="shift-breakdown">
                                ${this.formatCurrencyShort(calculation.baseWage)} + ${this.formatCurrencyShort(calculation.bonus)}
                            </div>
                        </div>
                    </div>
                `;

                this.stopNextShiftTimer(); // Stop timer when showing last shift
            }
        } else {
            // Show next shift details
            nextShiftContent.style.display = 'flex';
            nextShiftEmpty.style.display = 'none';
            // Hide skeleton and mark as populated
            const skel = nextShiftContent.querySelector('.skeleton');
            if (skel) skel.style.display = 'none';
            nextShiftContent.dataset.populated = '1';

            const nextShift = upcomingShifts[0];
            const calculation = this.calculateShift(nextShift);

            // Format date
            const shiftDate = new Date(nextShift.date);
            const weekday = this.WEEKDAYS[shiftDate.getDay()];
            const day = shiftDate.getDate();
            const month = this.MONTHS[shiftDate.getMonth()];

            // Check if it's today or tomorrow
            // Use the same reference time ("now") to avoid race conditions around midnight
            const today = new Date(now);
            const tomorrow = new Date(now);
            tomorrow.setDate(now.getDate() + 1);

            // Create the shift item using the exact same structure as in the shift list
            const typeClass = nextShift.type === 0 ? 'weekday' : (nextShift.type === 1 ? 'saturday' : 'sunday');
            const seriesBadge = nextShift.seriesId ? '<span class="series-badge">Serie</span>' : '';

            // Check if the shift is in the current week
            const currentWeekNumber = this.getISOWeekNumber(now);
            const shiftWeekNumber = this.getISOWeekNumber(shiftDate);
            const isCurrentWeek = currentWeekNumber === shiftWeekNumber && shiftDate.getFullYear() === now.getFullYear();

            // Determine date display format with Norwegian day indicators
            let dateDisplay;
            if (shiftDate.toDateString() === today.toDateString()) {
                // Show "I dag" for today's shifts
                dateDisplay = `I dag${seriesBadge}`;
            } else if (shiftDate.toDateString() === tomorrow.toDateString()) {
                // Show "I morgen" for tomorrow's shifts
                dateDisplay = `I morgen${seriesBadge}`;
            } else if (isCurrentWeek) {
                // Show capitalized weekday name for shifts in current week
                const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
                dateDisplay = `${capitalizedWeekday}${seriesBadge}`;
            } else {
                // Show full date without weekday for shifts outside current week
                dateDisplay = `${day}. ${month}${seriesBadge}`;
            }

            // Add time remaining for today's shifts
            let dateSuffix = '';
            if (shiftDate.toDateString() === today.toDateString()) {
                // Calculate time remaining until shift starts
                const [startHour, startMinute] = nextShift.startTime.split(':').map(Number);
                const shiftStartTime = new Date(shiftDate);
                shiftStartTime.setHours(startHour, startMinute, 0, 0);

                const timeDifference = shiftStartTime - now;
                const hoursRemaining = Math.floor(timeDifference / (1000 * 60 * 60));
                const minutesRemaining = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
                const secondsRemaining = Math.floor((timeDifference % (1000 * 60)) / 1000);

                if (hoursRemaining > 0) {
                    dateSuffix = ` <span class="countdown-wrapper">(<span class="countdown-hours">${hoursRemaining}t</span> <span class="countdown-minutes">${minutesRemaining}m</span> <span class="countdown-seconds">${secondsRemaining}s</span>)</span><span class="countdown-dot-separator"> • </span><span class="countdown-no-parens"><span class="countdown-hours">${hoursRemaining}t</span> <span class="countdown-minutes">${minutesRemaining}m</span> <span class="countdown-seconds">${secondsRemaining}s</span></span>`;
                } else if (minutesRemaining > 0) {
                    dateSuffix = ` <span class="countdown-wrapper">(<span class="countdown-minutes">${minutesRemaining}m</span> <span class="countdown-seconds">${secondsRemaining}s</span>)</span><span class="countdown-dot-separator"> • </span><span class="countdown-no-parens"><span class="countdown-minutes">${minutesRemaining}m</span> <span class="countdown-seconds">${secondsRemaining}s</span></span>`;
                } else if (secondsRemaining > 0) {
                    dateSuffix = ` <span class="countdown-wrapper">(<span class="countdown-seconds">${secondsRemaining}s</span>)</span><span class="countdown-dot-separator"> • </span><span class="countdown-no-parens"><span class="countdown-seconds">${secondsRemaining}s</span></span>`;
                } else {
                    dateSuffix = ' <span class="countdown-wrapper">(starter nå)</span><span class="countdown-dot-separator"> • </span><span class="countdown-no-parens">starter nå</span>';
                    // Stop timer when shift starts
                    this.stopNextShiftTimer();
                }
            }
            // Note: No dateSuffix needed for tomorrow's shifts since dateDisplay already contains "I morgen"

            // Check if this shift has overlaps
            const hasOverlaps = this.shiftHasOverlaps(nextShift);
            const warningIndicator = hasOverlaps ? `
                <span class="shift-warning-indicator" title="Denne vakten overlapper med andre vakter">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                </span>
            ` : '';

            // Determine if the shift should be highlighted (active)
            const isToday = shiftDate.toDateString() === today.toDateString();
            const isTomorrow = shiftDate.toDateString() === tomorrow.toDateString();
            const activeClass = (isToday || isTomorrow) ? ' active' : '';

            nextShiftContent.innerHTML = `
                <div class="shift-item ${typeClass}${activeClass}" data-shift-id="${nextShift.id}" style="cursor: pointer; position: relative;">
                    <div class="next-shift-badge">Neste</div>
                    <div class="shift-info">
                        <div class="shift-date">
                            <span class="shift-date-weekday">${dateDisplay}${warningIndicator}</span>
                            <span class="shift-countdown-timer">  ${dateSuffix}</span>
                        </div>
                        <div class="shift-details">
                            <div class="shift-time-with-hours">
                                <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                                <span>${nextShift.startTime} - ${nextShift.endTime}</span>
                                <span class="shift-time-arrow">→</span>
                                <span>${this.formatHours(calculation.totalHours)}</span>
                            </div>
                        </div>
                    </div>
                    <div class="shift-amount-wrapper">
                        <div class="shift-total">${this.formatCurrency(calculation.total)}</div>
                        <div class="shift-breakdown">
                            ${this.formatCurrencyShort(calculation.baseWage)} + ${this.formatCurrencyShort(calculation.bonus)}
                        </div>
                    </div>
                </div>
            `;

            // Click handler is handled by global event delegation in app.js
            // No need for direct event listener here
        }
    },

    displayCurrentShiftCard(currentShift, now) {
        const nextShiftContent = document.getElementById('nextShiftContent');
        const nextShiftEmpty = document.getElementById('nextShiftEmpty');

        nextShiftContent.style.display = 'flex';
        nextShiftEmpty.style.display = 'none';

        // Calculate earnings so far
        const currentEarnings = this.calculateCurrentShiftEarnings(currentShift, now);

        // Calculate full shift duration (like other shift cards)
        const fullShiftCalculation = this.calculateShift(currentShift);

        // Format date
        const shiftDate = new Date(currentShift.date);
        const weekday = this.WEEKDAYS[shiftDate.getDay()];
        const day = shiftDate.getDate();
        const month = this.MONTHS[shiftDate.getMonth()];

        // Check if the shift is in the current week
        const currentWeekNumber = this.getISOWeekNumber(now);
        const shiftWeekNumber = this.getISOWeekNumber(shiftDate);
        const isCurrentWeek = currentWeekNumber === shiftWeekNumber && shiftDate.getFullYear() === now.getFullYear();

        // Determine date display format with Norwegian day indicators
        let dateDisplay;
        if (shiftDate.toDateString() === now.toDateString()) {
            // Show "I dag" for today's shifts (current shift is always today)
            dateDisplay = `I dag`;
        } else if (isCurrentWeek) {
            // Show capitalized weekday name for shifts in current week
            const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
            dateDisplay = `${capitalizedWeekday}`;
        } else {
            // Show full date without weekday for shifts outside current week
            dateDisplay = `${day}. ${month}`;
        }

        // Calculate time remaining until shift ends
        const [startHour, startMinute] = currentShift.startTime.split(':').map(Number);
        const [endHour, endMinute] = currentShift.endTime.split(':').map(Number);

        const shiftStartTime = new Date(shiftDate);
        shiftStartTime.setHours(startHour, startMinute, 0, 0);

        const shiftEndTime = new Date(shiftDate);
        shiftEndTime.setHours(endHour, endMinute, 0, 0);

        // Handle shifts that cross midnight
        if (shiftEndTime < shiftStartTime) {
            shiftEndTime.setDate(shiftEndTime.getDate() + 1);
        }

        const timeRemaining = shiftEndTime - now;
        const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
        const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        const secondsRemaining = Math.floor((timeRemaining % (1000 * 60)) / 1000);

        let timeRemainingText = '';
        if (hoursRemaining > 0) {
            // Create compact version without spaces for mobile
            timeRemainingText = `<span class="countdown-wrapper">(<span class="countdown-hours">${hoursRemaining}t</span> <span class="countdown-minutes">${minutesRemaining}m</span> <span class="countdown-seconds">${secondsRemaining}s</span>)</span><span class="countdown-dot-separator"> • </span><span class="countdown-no-parens"><span class="countdown-hours">${hoursRemaining}t</span><span class="countdown-minutes">${minutesRemaining}m</span><span class="countdown-seconds">${secondsRemaining}s</span></span>`;
        } else if (minutesRemaining > 0) {
            timeRemainingText = `<span class="countdown-wrapper">(<span class="countdown-minutes">${minutesRemaining}m</span> <span class="countdown-seconds">${secondsRemaining}s</span>)</span><span class="countdown-dot-separator"> • </span><span class="countdown-no-parens"><span class="countdown-minutes">${minutesRemaining}m</span><span class="countdown-seconds">${secondsRemaining}s</span></span>`;
        } else if (secondsRemaining > 0) {
            timeRemainingText = `<span class="countdown-wrapper">(<span class="countdown-seconds">${secondsRemaining}s</span>)</span><span class="countdown-dot-separator"> • </span><span class="countdown-no-parens"><span class="countdown-seconds">${secondsRemaining}s</span></span>`;
        } else {
            // Shift has ended
            timeRemainingText = `<span class="countdown-wrapper">(Ferdig)</span><span class="countdown-dot-separator"> • </span><span class="countdown-no-parens">Ferdig</span>`;
        }

        const typeClass = currentShift.type === 0 ? 'weekday' : (currentShift.type === 1 ? 'saturday' : 'sunday');
        const seriesBadge = currentShift.seriesId ? '<span class="series-badge">Serie</span>' : '';

        // Check if this shift has overlaps
        const hasOverlaps = this.shiftHasOverlaps(currentShift);
        const warningIndicator = hasOverlaps ? `
            <span class="shift-warning-indicator" title="Denne vakten overlapper med andre vakter">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
            </span>
        ` : '';

        nextShiftContent.innerHTML = `
            <div class="shift-item ${typeClass} active" data-shift-id="${currentShift.id}" style="cursor: pointer; position: relative;">
                <div class="next-shift-badge">NÅ</div>
                <div class="shift-info">
                    <div class="shift-date">
                        <span class="shift-date-weekday">${dateDisplay}${seriesBadge}${warningIndicator}</span>
                        <span class="shift-countdown-timer">  ${timeRemainingText}</span>
                    </div>
                    <div class="shift-details">
                        <div class="shift-time-with-hours">
                            <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            <span>${currentShift.startTime} - ${currentShift.endTime}</span>
                            <span class="shift-time-arrow">→</span>
                            <span>${this.formatHours(fullShiftCalculation.totalHours)}</span>
                        </div>
                    </div>
                </div>
                <div class="shift-amount-wrapper">
                    <div class="shift-total">${this.formatCurrencyDetailed(currentEarnings.totalEarned)}</div>
                    <div class="shift-breakdown">
                        ${this.formatCurrencyDetailed(currentEarnings.baseEarned)} + ${this.formatCurrencyDetailed(currentEarnings.bonusEarned)}
                    </div>
                </div>
            </div>
        `;

                // Click handler is handled by global event delegation in app.js
        // No need for direct event listener here
    },

    calculateCurrentShiftEarnings(shift, now) {
        const shiftDate = new Date(shift.date);
        const [startHour, startMinute] = shift.startTime.split(':').map(Number);
        const shiftStartTime = new Date(shiftDate);
        shiftStartTime.setHours(startHour, startMinute, 0, 0);

        // Calculate time worked so far in hours
        const timeWorked = now - shiftStartTime;
        const hoursWorked = timeWorked / (1000 * 60 * 60);

        // Get wage rate and bonuses
        const wageRate = this.getWageRateForShift(shift);
        const isEmployeeShift = (
            typeof shift?.hourly_wage_snapshot === 'number' ||
            !!shift?.employee_id ||
            !!shift?.employee
        );
        const bonuses = isEmployeeShift ? this.PRESET_BONUSES : this.getCurrentBonuses();
        const bonusType = shift.type === 0 ? 'weekday' : (shift.type === 1 ? 'saturday' : 'sunday');
        const bonusSegments = bonuses[bonusType] || [];

        // Calculate base earnings so far
        const baseEarned = hoursWorked * wageRate;

        // Calculate bonus earnings so far - include seconds for real-time updates
        const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
        const bonusEarned = this.calculateBonusWithSeconds(shift.startTime, currentTimeStr, bonusSegments);

        return {
            totalHours: hoursWorked,
            baseEarned: baseEarned,
            bonusEarned: bonusEarned,
            totalEarned: baseEarned + bonusEarned
        };
    },

    startNextShiftTimer() {
        // Clear any existing timer
        this.stopNextShiftTimer();

        // Only start timer if we're viewing the current month and year
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        if (this.currentMonth === currentMonth && this.currentYear === currentYear) {
            // Check if there's a current shift or upcoming shifts today that need real-time updates
            const today = new Date();
            const todayShifts = this.shifts.filter(shift => {
                const shiftDate = new Date(shift.date);
                if (shiftDate.toDateString() === today.toDateString()) {
                    const [startHour, startMinute] = shift.startTime.split(':').map(Number);
                    const [endHour, endMinute] = shift.endTime.split(':').map(Number);

                    const shiftStartTime = new Date(shiftDate);
                    shiftStartTime.setHours(startHour, startMinute, 0, 0);

                    const shiftEndTime = new Date(shiftDate);
                    shiftEndTime.setHours(endHour, endMinute, 0, 0);

                    // Handle shifts that cross midnight
                    if (shiftEndTime < shiftStartTime) {
                        shiftEndTime.setDate(shiftEndTime.getDate() + 1);
                    }

                    // Include current shifts (happening now) or upcoming shifts (not started yet)
                    return (now >= shiftStartTime && now <= shiftEndTime) || shiftStartTime > now;
                }
                return false;
            });

            // Start timer if there are current shifts or upcoming shifts today
            if (todayShifts.length > 0) {
                this.nextShiftTimer = setInterval(() => {
                    this.updateNextShiftCard();
                }, 1000); // Update every second
            }
        }
    },

    stopNextShiftTimer() {
        if (this.nextShiftTimer) {
            clearInterval(this.nextShiftTimer);
            this.nextShiftTimer = null;
        }
    },

    displayBestShiftCard() {
        const nextShiftContent = document.getElementById('nextShiftContent');
        const nextShiftEmpty = document.getElementById('nextShiftEmpty');

        if (!nextShiftContent || !nextShiftEmpty) return;

        // Get all shifts for the selected month
        const monthShifts = this.shifts.filter(shift =>
            shift.date.getMonth() === this.currentMonth - 1 &&
            shift.date.getFullYear() === this.currentYear
        );

        if (monthShifts.length === 0) {
            // No shifts in this month
            nextShiftContent.style.display = 'none';
            nextShiftEmpty.style.display = 'flex';
            // Update empty message for non-current months
            const emptyMessage = nextShiftEmpty.querySelector('.empty-message');
            if (emptyMessage) {
                emptyMessage.textContent = 'Ingen vakter registrert';
            }
            return;
        }

        // Calculate earnings for each shift and find the best one
        const shiftsWithEarnings = monthShifts.map(shift => {
            const calculation = this.calculateShift(shift);
            return {
                shift: shift,
                earnings: calculation.total,
                calculation: calculation
            };
        });

        // Sort by earnings (highest first), then by date (earliest first), then by start time (earliest first)
        shiftsWithEarnings.sort((a, b) => {
            // First, compare by earnings (highest first)
            if (b.earnings !== a.earnings) {
                return b.earnings - a.earnings;
            }

            // If earnings are equal, compare by date (earliest first)
            const aDate = new Date(a.shift.date);
            const bDate = new Date(b.shift.date);
            if (aDate.getTime() !== bDate.getTime()) {
                return aDate - bDate;
            }

            // If dates are equal, compare by start time (earliest first)
            const [aHour, aMinute] = a.shift.startTime.split(':').map(Number);
            const [bHour, bMinute] = b.shift.startTime.split(':').map(Number);
            return (aHour * 60 + aMinute) - (bHour * 60 + bMinute);
        });

        const bestShiftData = shiftsWithEarnings[0];
        const bestShift = bestShiftData.shift;
        const calculation = bestShiftData.calculation;

        // Show the best shift
        nextShiftContent.style.display = 'flex';
        nextShiftEmpty.style.display = 'none';

        // Format date
        const shiftDate = new Date(bestShift.date);
        const weekday = this.WEEKDAYS[shiftDate.getDay()];
        const day = shiftDate.getDate();
        const month = this.MONTHS[shiftDate.getMonth()];

        // Check if the shift is in the current week
        const now = new Date();
        const currentWeekNumber = this.getISOWeekNumber(now);
        const shiftWeekNumber = this.getISOWeekNumber(shiftDate);
        const isCurrentWeek = currentWeekNumber === shiftWeekNumber && shiftDate.getFullYear() === now.getFullYear();

        // Determine date display format with Norwegian day indicators
        let dateDisplay;
        if (shiftDate.toDateString() === now.toDateString()) {
            // Show "I dag" for today's shifts
            dateDisplay = `I dag`;
        } else {
            // Calculate tomorrow for comparison
            const tomorrow = new Date(now);
            tomorrow.setDate(now.getDate() + 1);

            if (shiftDate.toDateString() === tomorrow.toDateString()) {
                // Show "I morgen" for tomorrow's shifts
                dateDisplay = `I morgen`;
            } else if (isCurrentWeek) {
                // Show capitalized weekday name for shifts in current week
                const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
                dateDisplay = `${capitalizedWeekday}`;
            } else {
                // Show full date without weekday for shifts outside current week
                dateDisplay = `${day}. ${month}`;
            }
        }

        // Create the shift item using the exact same structure as other shift cards
        const typeClass = bestShift.type === 0 ? 'weekday' : (bestShift.type === 1 ? 'saturday' : 'sunday');
        const seriesBadge = bestShift.seriesId ? '<span class="series-badge">Serie</span>' : '';

        // Check if this shift has overlaps
        const hasOverlaps = this.shiftHasOverlaps(bestShift);
        const warningIndicator = hasOverlaps ? `
            <span class="shift-warning-indicator" title="Denne vakten overlapper med andre vakter">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
            </span>
        ` : '';

        // No highlighting for best shift (remove active class)
        nextShiftContent.innerHTML = `
            <div class="shift-item ${typeClass}" data-shift-id="${bestShift.id}" style="cursor: pointer; position: relative;">
                <div class="next-shift-badge">Beste</div>
                <div class="shift-info">
                    <div class="shift-date">
                        <span class="shift-date-weekday">${dateDisplay}${seriesBadge}${warningIndicator}</span>
                    </div>
                    <div class="shift-details">
                        <div class="shift-time-with-hours">
                            <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            <span>${bestShift.startTime} - ${bestShift.endTime}</span>
                            <span class="shift-time-arrow">→</span>
                            <span>${this.formatHours(calculation.totalHours)}</span>
                        </div>
                    </div>
                </div>
                <div class="shift-amount-wrapper">
                    <div class="shift-total">${this.formatCurrency(calculation.total)}</div>
                    <div class="shift-breakdown">
                        ${this.formatCurrencyShort(calculation.baseWage)} + ${this.formatCurrencyShort(calculation.bonus)}
                    </div>
                </div>
            </div>
        `;
    },

    updateNextPayrollCard() {
        const nextPayrollCard = document.getElementById('nextPayrollCard');
        if (!nextPayrollCard) return;

        const nextPayrollContent = document.getElementById('nextPayrollContent');
        const nextPayrollEmpty = document.getElementById('nextPayrollEmpty');

        if (!nextPayrollContent || !nextPayrollEmpty) return;

        // Always hide in Employees tab
        if (this.currentView === 'employees') {
            nextPayrollCard.style.display = 'none';
            return;
        }

        // Show the card
        // Reset placeholder visibility in case of re-renders
        const skel2 = nextPayrollContent.querySelector('.skeleton');
        if (skel2 && !nextPayrollContent.dataset.populated) skel2.style.display = 'block';
        // Ensure skeleton is visible until populated
        if (nextPayrollContent && !nextPayrollContent.dataset.populated) {
            const skel = nextPayrollContent.querySelector('.skeleton');
            if (skel) skel.style.display = 'block';
        }

        // Use the selected month from month picker instead of current month
        const selectedMonth = this.currentMonth; // 1-based
        const selectedYear = this.currentYear;

        const now = new Date();
        const currentMonth = now.getMonth() + 1; // Convert to 1-based
        const currentYear = now.getFullYear();

        // Determine if we're viewing the current month/year
        const isCurrentMonth = selectedMonth === currentMonth && selectedYear === currentYear;

        // Calculate payroll date - use next payroll logic if viewing current month
        let payrollDate;
        let actualPayrollMonth = selectedMonth;
        let actualPayrollYear = selectedYear;

        if (isCurrentMonth) {
            // For current month, use getNextPayrollDate to handle cases where payroll has passed
            payrollDate = this.getNextPayrollDate();
            actualPayrollMonth = payrollDate.getMonth() + 1; // Convert to 1-based
            actualPayrollYear = payrollDate.getFullYear();
        } else {
            // For other months, use the specific month's payroll date
            payrollDate = this.getPayrollDateForMonth(selectedMonth, selectedYear);
        }

        // Calculate the previous month relative to the selected month
        let previousMonth = selectedMonth - 1;
        let previousYear = selectedYear;

        if (previousMonth < 1) {
            previousMonth = 12;
            previousYear = selectedYear - 1;
        }

        // Determine which month's earnings to show based on the payroll date
        // If payroll date moved to next month, we need to adjust the earnings month accordingly
        let earningsMonth = previousMonth;
        let earningsYear = previousYear;

        if (isCurrentMonth && actualPayrollMonth !== selectedMonth) {
            // Payroll moved to next month, so earnings should be from current month
            earningsMonth = selectedMonth;
            earningsYear = selectedYear;
        }

        // Get shifts for the appropriate earnings month
        const earningsMonthShifts = this.shifts.filter(shift =>
            shift.date.getMonth() === (earningsMonth - 1) && // Convert to 0-based for comparison
            shift.date.getFullYear() === earningsYear
        );

        if (earningsMonthShifts.length === 0) {
            // No shifts in earnings month
            nextPayrollContent.style.display = 'none';
            nextPayrollEmpty.style.display = 'flex';
            return;
        }

        // Calculate total earnings for the earnings month with breakdown
        let totalEarnings = 0;
        let totalBaseWage = 0;
        let totalBonus = 0;

        earningsMonthShifts.forEach(shift => {
            const calc = this.calculateShift(shift);
            totalEarnings += calc.total;
            totalBaseWage += calc.baseWage;
            totalBonus += calc.bonus;
        });

        // Apply tax deduction if enabled
        const displayAmount = this.taxDeductionEnabled ?
            totalEarnings * (1 - this.taxPercentage / 100) :
            totalEarnings;

        // Create label text showing which month the earnings are from
        const earningsMonthName = this.MONTHS[earningsMonth - 1]; // Convert to 0-based for array access
        const labelText = `Opptjent i ${earningsMonthName}`;

        // Format the payroll date for display
        const payrollDay = payrollDate.getDate();
        const payrollMonth = this.MONTHS[payrollDate.getMonth()];
        const payrollDateText = `${payrollDay}. ${payrollMonth}`;

        // Create clock icon text based on whether we're viewing current month or not
        let clockIconText;
        if (isCurrentMonth) {
            // Show countdown for current month
            const daysUntilPayroll = Math.ceil((payrollDate - now) / (1000 * 60 * 60 * 24));
            if (daysUntilPayroll === 0) {
                clockIconText = 'I dag';
            } else if (daysUntilPayroll === 1) {
                clockIconText = 'I morgen';
            } else {
                clockIconText = `Om ${daysUntilPayroll} dager`;
            }
        } else {
            // Show payroll date for past/future months
            clockIconText = payrollDateText;
        }

        // Determine if this is a past or future payroll
        const isPastPayroll = payrollDate < now;
        const activeClass = !isPastPayroll && isCurrentMonth && Math.ceil((payrollDate - now) / (1000 * 60 * 60 * 24)) <= 7 ? ' active' : '';

        // Show payroll details
        nextPayrollContent.style.display = 'flex';
        nextPayrollEmpty.style.display = 'none';

        // Hide skeleton and mark populated before injecting content
        const skelP = nextPayrollContent.querySelector('.skeleton');
        if (skelP) skelP.style.display = 'none';
        nextPayrollContent.dataset.populated = '1';

        nextPayrollContent.innerHTML = `
            <div class="payroll-item${activeClass}" style="cursor: pointer; position: relative;">
                <div class="next-payroll-badge">Lønn</div>
                <div class="shift-info">
                    <div class="shift-date">
                        <span class="shift-countdown-timer">${labelText}</span>
                    </div>
                    <div class="shift-details">
                        <div class="shift-time-with-hours">
                            <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <path d="M12 6v6l4 2"></path>
                            </svg>
                            <span>${clockIconText}</span>
                        </div>
                    </div>
                </div>
                <div class="shift-amount-wrapper">
                    <div class="shift-total">${this.formatCurrency(displayAmount)}</div>
                    <div class="shift-breakdown">
                        ${this.taxDeductionEnabled ?
                            `${this.formatCurrencyShort(totalEarnings)} - ${this.formatCurrencyShort(totalEarnings - displayAmount)}` :
                            `${this.formatCurrencyShort(totalBaseWage)} + ${this.formatCurrencyShort(totalBonus)}`
                        }
                    </div>
                </div>
            </div>
        `;

        // Add click event listener to open settings and navigate to paydate setting
        const payrollItem = nextPayrollContent.querySelector('.payroll-item');
        if (payrollItem) {
            payrollItem.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openPaydateSettings();
            });
        }
    },

    // Clean up timers when page is about to unload
    cleanup() {
        this.stopNextShiftTimer();

        // Clean up month navigation performance optimization timers
        if (this.monthNavigationTimeout) {
            clearTimeout(this.monthNavigationTimeout);
            this.monthNavigationTimeout = null;
        }

        // Clean up chart tooltip global listener
        if (this.chartTooltipGlobalListener) {
            document.removeEventListener('click', this.chartTooltipGlobalListener);
            this.chartTooltipGlobalListener = null;
        }

        // Clean up wage card tooltip global listener
        if (this.wageTooltipGlobalListener) {
            document.removeEventListener('click', this.wageTooltipGlobalListener);
            this.wageTooltipGlobalListener = null;
        }

    },

    // Performance monitoring for debugging (can be called from console)
    getPerformanceStats() {
        return {
            monthNavigationActive: !!this.monthNavigationTimeout,
            currentMonth: this.currentMonth,
            currentYear: this.currentYear
        };
    },

    renderShiftCalendar() {
        const container = document.getElementById('shiftCalendar');
        if (!container) return;

        const year = this.currentYear;
        const monthIdx = this.currentMonth - 1;
        const firstDay = new Date(year, monthIdx, 1);
        const lastDay = new Date(year, monthIdx + 1, 0);
        const startDate = new Date(firstDay);
        const offset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
        startDate.setDate(startDate.getDate() - offset);

        container.innerHTML = '';

        const header = document.createElement('div');
        header.className = 'calendar-header';

        ['M','T','O','T','F','L','S'].forEach(day => {
            const h = document.createElement('div');
            h.textContent = day;
            h.className = 'calendar-day-header';
            header.appendChild(h);
        });
        container.appendChild(header);

        const monthShifts = this.shifts.filter(s =>
            s.date.getMonth() === monthIdx &&
            s.date.getFullYear() === year
        );

        const shiftsByDate = {};
        monthShifts.forEach(shift => {
            const key = shift.date.getDate();
            if (!shiftsByDate[key]) shiftsByDate[key] = [];
            shiftsByDate[key].push(shift);
        });

        // Calculate how many weeks we need to show
        // Start from the first day of the month and go to the last day
        const endDate = new Date(lastDay);
        const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const totalWeeks = Math.ceil(totalDays / 7);

        for (let week = 0; week < totalWeeks; week++) {
            // Create week separator with week number
            const weekDate = new Date(startDate);
            weekDate.setDate(startDate.getDate() + (week * 7));
            const weekNum = this.getISOWeekNumber(weekDate);

            const weekSeparator = document.createElement('div');
            weekSeparator.className = 'week-separator';

            const weekNumber = document.createElement('div');
            weekNumber.className = 'week-number-on-separator';
            weekNumber.textContent = weekNum;
            weekSeparator.appendChild(weekNumber);

            container.appendChild(weekSeparator);

            // Create grid for this week's days
            const weekGrid = document.createElement('div');
            weekGrid.className = 'calendar-grid';

            // Add 7 days for this week
            for (let day = 0; day < 7; day++) {
                const cellDate = new Date(startDate);
                cellDate.setDate(startDate.getDate() + (week * 7) + day);

                const cell = document.createElement('div');
                cell.className = 'calendar-cell';
                const dateStr = `${cellDate.getFullYear()}-${String(cellDate.getMonth()+1).padStart(2,'0')}-${String(cellDate.getDate()).padStart(2,'0')}`;
                cell.setAttribute('data-date', dateStr);
                if (cellDate.getMonth() !== monthIdx) {
                    cell.classList.add('other-month');
                }

                // Add hours-mode class if in hours display mode
                if (this.calendarDisplayMode === 'hours') {
                    cell.classList.add('hours-mode');
                }

                // Add current date class if this is today
                const today = new Date();
                if (cellDate.getDate() === today.getDate() &&
                    cellDate.getMonth() === today.getMonth() &&
                    cellDate.getFullYear() === today.getFullYear()) {
                    cell.classList.add('current-date');
                }

                // --- WRAP ALL CONTENT IN .calendar-cell-content ---
                const content = document.createElement('div');
                content.className = 'calendar-cell-content';

                const dayNumber = document.createElement('div');
                dayNumber.className = 'calendar-day-number';
                dayNumber.textContent = cellDate.getDate();
                content.appendChild(dayNumber);

                const shiftsForDay = shiftsByDate[cellDate.getDate()] || [];
                let base = 0;
                let bonus = 0;
                let totalHours = 0;
                shiftsForDay.forEach(shift => {
                    if (cellDate.getMonth() === monthIdx) {
                        const calc = this.calculateShift(shift);
                        base += calc.baseWage;
                        bonus += calc.bonus;
                        totalHours += calc.totalHours;
                    }
                });

                if ((this.calendarDisplayMode === 'money' && base + bonus > 0) ||
                    (this.calendarDisplayMode === 'hours' && shiftsForDay.length > 0)) {
                    // Create wrapper for shift data
                    const shiftData = document.createElement('div');
                    shiftData.className = 'calendar-shift-data';

                    if (this.calendarDisplayMode === 'money') {
                        const totalDisplay = document.createElement('div');
                        totalDisplay.className = 'calendar-total';
                        totalDisplay.textContent = this.formatCurrencyCalendar(base + bonus);

                        shiftData.appendChild(totalDisplay);
                    } else {
                        // Display time range
                        const hoursDisplay = document.createElement('div');
                        hoursDisplay.className = 'calendar-hours-display';

                        // Find the absolute earliest start time and latest end time across all shifts
                        let earliestStartMinutes = Infinity;
                        let latestEndMinutes = -Infinity;
                        let earliestStartTime = '';
                        let latestEndTime = '';
                        let latestEndCrossedMidnight = false;

                        shiftsForDay.forEach(shift => {
                            const startMinutes = this.timeToMinutes(shift.startTime);
                            let endMinutes = this.timeToMinutes(shift.endTime);
                            let endCrossedMidnight = false;

                            // Adjust endMinutes for shifts that cross midnight
                            if (endMinutes < startMinutes) {
                                endMinutes += 24 * 60; // Add 24 hours in minutes
                                endCrossedMidnight = true;
                            }

                            if (startMinutes < earliestStartMinutes) {
                                earliestStartMinutes = startMinutes;
                                earliestStartTime = shift.startTime;
                            }

                            if (endMinutes > latestEndMinutes) {
                                latestEndMinutes = endMinutes;
                                latestEndTime = shift.endTime;
                                latestEndCrossedMidnight = endCrossedMidnight;
                            }
                        });

                        // Format the end time display, showing next day indicator if needed
                        let endTimeDisplay = this.formatTimeShort(latestEndTime);
                        if (latestEndCrossedMidnight) {
                            endTimeDisplay += '*';
                        }

                        const timeRange = document.createElement('div');
                        timeRange.className = 'calendar-total calendar-hours-total';
                        if (latestEndCrossedMidnight) {
                            timeRange.title = '* indicates the shift ends the next day';
                        }
                        timeRange.innerHTML = `${this.formatTimeShort(earliestStartTime)} -<br>${endTimeDisplay}`;

                        hoursDisplay.appendChild(timeRange);
                        shiftData.appendChild(hoursDisplay);
                    }

                    // Add employee chips for calendar view
                    const employeeChips = document.createElement('div');
                    employeeChips.className = 'calendar-employee-chips';

                    // Get unique employees for this day
                    const uniqueEmployees = new Map();
                    shiftsForDay.forEach(shift => {
                        if (shift.employee && !uniqueEmployees.has(shift.employee.id)) {
                            uniqueEmployees.set(shift.employee.id, shift.employee);
                        }
                    });

                    // Create chips for each unique employee
                    uniqueEmployees.forEach(employee => {
                        const chip = document.createElement('div');
                        chip.className = 'calendar-employee-chip';
                        chip.style.backgroundColor = employee.display_color || '#6b7280';
                        chip.textContent = employee.name.substring(0, 2).toUpperCase();
                        chip.title = employee.name;
                        employeeChips.appendChild(chip);
                    });

                    if (uniqueEmployees.size > 0) {
                        content.appendChild(employeeChips);
                    }

                    content.appendChild(shiftData);

                    cell.classList.add('has-shifts');
                    cell.style.cursor = 'pointer';

                    // Double-click functionality for calendar cells with shifts
                    let cellClickCount = 0;
                    let cellClickTimer = null;

                    cell.onclick = (e) => {
                        e.stopPropagation();

                        cellClickCount++;

                        if (cellClickCount === 1) {
                            // Single click - set timer
                            cellClickTimer = setTimeout(() => {
                                // Single click behavior - show shift details (existing behavior)
                                if (shiftsForDay.length > 0) {
                                    this.showShiftDetails(shiftsForDay[0].id);
                                }
                                cellClickCount = 0;
                            }, 300); // 300ms delay to detect double-click
                        } else if (cellClickCount === 2) {
                            // Double click detected - clear timer and show shift details immediately
                            clearTimeout(cellClickTimer);
                            cellClickCount = 0;

                            console.log('Double-click detected on calendar cell with shifts');

                            if (shiftsForDay.length > 0) {
                                console.log('Opening shift details for shift ID:', shiftsForDay[0].id);
                                this.showShiftDetails(shiftsForDay[0].id);
                            } else {
                                console.log('No shifts found for this calendar cell');
                            }
                        }
                    };
                } else {
                    // Add click handler for empty cells in current month
                    if (cellDate.getMonth() === monthIdx) {
                        cell.classList.add('empty-date');
                        cell.style.cursor = 'pointer';
                        cell.onclick = (e) => {
                            e.stopPropagation();
                            this.openAddShiftModalWithDate(cellDate);
                        };
                    }
                }

                cell.appendChild(content);
                weekGrid.appendChild(cell);
            }

            // Append this week's grid to the container
            container.appendChild(weekGrid);
        }

        this.lastRenderedMonth = this.currentMonth;
        this.lastRenderedYear = this.currentYear;
        this.lastRenderedShiftsKey = this.getMonthShiftsKey();
    },

    updateCalendarCells() {
        const cells = document.querySelectorAll('.calendar-cell');
        const monthIdx = this.currentMonth - 1;
        const year = this.currentYear;

        // Filter shifts for current month only (consistent with renderShiftCalendar)
        const monthShifts = this.shifts.filter(s =>
            s.date.getMonth() === monthIdx &&
            s.date.getFullYear() === year
        );

        // Create shifts by date lookup for current month
        const shiftsByDate = {};
        monthShifts.forEach(shift => {
            const key = shift.date.getDate();
            if (!shiftsByDate[key]) shiftsByDate[key] = [];
            shiftsByDate[key].push(shift);
        });

        cells.forEach(cell => {
            const dateStr = cell.getAttribute('data-date');
            if (!dateStr) return;
            const [y, m, d] = dateStr.split('-').map(n => parseInt(n, 10));
            const cellDate = new Date(y, m - 1, d);

            const content = cell.querySelector('.calendar-cell-content');
            if (!content) return;
            const oldData = content.querySelector('.calendar-shift-data');
            if (oldData) oldData.remove();

            cell.classList.remove('has-shifts', 'empty-date');

            // Get shifts for this specific day (only from current month)
            const shiftsForDay = shiftsByDate[cellDate.getDate()] || [];

            // For other-month cells, only show shifts if they're in the current month
            const isCurrentMonth = cellDate.getMonth() === monthIdx;
            const shiftsToDisplay = isCurrentMonth ? shiftsForDay : [];

            // Toggle hours-mode class
            if (this.calendarDisplayMode === 'hours') {
                cell.classList.add('hours-mode');
            } else {
                cell.classList.remove('hours-mode');
            }

            let base = 0;
            let bonus = 0;
            let totalHours = 0;
            shiftsToDisplay.forEach(shift => {
                const calc = this.calculateShift(shift);
                base += calc.baseWage;
                bonus += calc.bonus;
                totalHours += calc.totalHours;
            });

            if ((this.calendarDisplayMode === 'money' && base + bonus > 0) ||
                (this.calendarDisplayMode === 'hours' && shiftsToDisplay.length > 0)) {
                const shiftData = document.createElement('div');
                shiftData.className = 'calendar-shift-data';

                if (this.calendarDisplayMode === 'money') {
                    const totalDisplay = document.createElement('div');
                    totalDisplay.className = 'calendar-total';
                    totalDisplay.textContent = this.formatCurrencyCalendar(base + bonus);

                    shiftData.appendChild(totalDisplay);
                } else {
                    const hoursDisplay = document.createElement('div');
                    hoursDisplay.className = 'calendar-hours-display';

                    let earliestStartMinutes = Infinity;
                    let latestEndMinutes = -Infinity;
                    let earliestStartTime = '';
                    let latestEndTime = '';
                    let latestEndCrossedMidnight = false;

                    shiftsToDisplay.forEach(shift => {
                        const startMinutes = this.timeToMinutes(shift.startTime);
                        let endMinutes = this.timeToMinutes(shift.endTime);
                        let endCrossedMidnight = false;

                        if (endMinutes < startMinutes) {
                            endMinutes += 24 * 60;
                            endCrossedMidnight = true;
                        }

                        if (startMinutes < earliestStartMinutes) {
                            earliestStartMinutes = startMinutes;
                            earliestStartTime = shift.startTime;
                        }

                        if (endMinutes > latestEndMinutes) {
                            latestEndMinutes = endMinutes;
                            latestEndTime = shift.endTime;
                            latestEndCrossedMidnight = endCrossedMidnight;
                        }
                    });

                    let endTimeDisplay = this.formatTimeShort(latestEndTime);
                    if (latestEndCrossedMidnight) {
                        endTimeDisplay += '*';
                    }

                    const timeRange = document.createElement('div');
                    timeRange.className = 'calendar-total calendar-hours-total';
                    if (latestEndCrossedMidnight) {
                        timeRange.title = '* indicates the shift ends the next day';
                    }
                    timeRange.innerHTML = `${this.formatTimeShort(earliestStartTime)} -<br>${endTimeDisplay}`;

                    hoursDisplay.appendChild(timeRange);
                    shiftData.appendChild(hoursDisplay);
                }

                content.appendChild(shiftData);
                cell.classList.add('has-shifts');
                cell.style.cursor = 'pointer';

                // Double-click functionality for updated calendar cells with shifts
                let updateCellClickCount = 0;
                let updateCellClickTimer = null;

                // Set up click handler for cells with shifts
                cell.onclick = (e) => {
                    e.stopPropagation();

                    updateCellClickCount++;

                    if (updateCellClickCount === 1) {
                        // Single click - set timer
                        updateCellClickTimer = setTimeout(() => {
                            // Single click behavior - show shift details
                            if (shiftsToDisplay.length > 0) {
                                this.showShiftDetails(shiftsToDisplay[0].id);
                            }
                            updateCellClickCount = 0;
                        }, 300); // 300ms delay to detect double-click
                    } else if (updateCellClickCount === 2) {
                        // Double click detected - clear timer and show shift details immediately
                        clearTimeout(updateCellClickTimer);
                        updateCellClickCount = 0;

                        console.log('Double-click detected on updated calendar cell with shifts');

                        if (shiftsToDisplay.length > 0) {
                            console.log('Opening shift details for shift ID:', shiftsToDisplay[0].id);
                            this.showShiftDetails(shiftsToDisplay[0].id);
                        } else {
                            console.log('No shifts found for this updated calendar cell');
                        }
                    }
                };
            } else if (isCurrentMonth) {
                cell.classList.add('empty-date');
                cell.style.cursor = 'pointer';

                // Set up click handler for empty cells in current month
                cell.onclick = (e) => {
                    e.stopPropagation();
                    this.openAddShiftModalWithDate(cellDate);
                };
            } else {
                // Remove click handlers for other-month cells without shifts
                cell.onclick = null;
                cell.style.cursor = 'default';
            }
        });
    },

    switchShiftView(view) {
        this.shiftView = view;
        const btns = document.querySelectorAll('.view-toggle .tab-btn');
        btns.forEach((btn, idx) => {
            const isList = idx === 0;
            const active = (view === 'list' && isList) || (view === 'calendar' && !isList);
            btn.classList.toggle('active', active);
        });

        const list = document.getElementById('shiftList');
        const cal = document.getElementById('shiftCalendar');
        const toggle = document.querySelector('.calendar-display-toggle');
        if (!list || !cal) return;

        if (view === 'calendar') {
            list.style.display = 'none';
            cal.style.display = 'flex';
            if (toggle) toggle.style.display = 'flex';
            this.updateShiftCalendar();
        } else {
            list.style.display = 'flex';
            cal.style.display = 'none';
            if (toggle) toggle.style.display = 'none';
        }

        // Ensure employees UI elements remain visible in Employees tab
        if (this.currentView === 'employees') {
            this.ensureMonthPickerVisibility?.();
            const employeesContainer = document.querySelector('.employees-container');
            if (employeesContainer) employeesContainer.style.display = 'block';
            const carouselContainer = document.getElementById('employeeCarouselContainer');
            if (carouselContainer) carouselContainer.style.display = 'block';
        }
    },

    switchCalendarDisplay(mode) {
        this.calendarDisplayMode = mode;
        const btns = document.querySelectorAll('.calendar-toggle-btn');
        btns.forEach(btn => {
            const isActive = (mode === 'money' && btn.textContent === 'Lønn') ||
                           (mode === 'hours' && btn.textContent === 'Varighet');
            btn.classList.toggle('active', isActive);
        });

        // Update calendar cells when in calendar view
        if (this.shiftView === 'calendar') {
            this.updateCalendarCells();
        }
    },



    // Show detailed shift information in expanded view
    showShiftDetails(shiftId) {
        // Find the shift by ID
        const shift = this.shifts.find(s => s.id === shiftId);
        if (!shift) return;

        // Close any existing expanded views
        this.closeStatDetails();
        this.closeSettings(false); // Don't save settings when closing as cleanup

        // Hide floating action bar when modal opens to prevent z-index conflicts
        const floatingBar = document.querySelector('.floating-action-bar');
        const floatingBarBackdrop = document.querySelector('.floating-action-bar-backdrop');
        if (floatingBar) {
            floatingBar.style.display = 'none';
        }
        if (floatingBarBackdrop) {
            floatingBarBackdrop.style.display = 'none';
        }

        // Hide header
        const header = document.querySelector('.header');
        if (header) header.classList.add('hidden');

        const backdrop = document.createElement('div');
        backdrop.className = 'backdrop-blur';
        backdrop.onclick = () => this.closeShiftDetails();
        document.body.appendChild(backdrop);
        backdrop.offsetHeight;
        backdrop.classList.add('active');

        this.shiftDetailsKeydownHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeShiftDetails();
            }
        };
        document.addEventListener('keydown', this.shiftDetailsKeydownHandler);

        // Create modal container
        const modal = document.createElement('div');
        modal.className = 'breakdown-modal shift-detail-modal';
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0.8);
            width: min(95vw, 500px);
            max-height: 85vh;
            background: var(--bg-primary);
            border-radius: 24px;
            box-shadow: 0 20px 60px var(--shadow-blue);
            z-index: 1200;
            opacity: 0;
            transition: all 0.4s var(--ease-default);
            display: flex;
            flex-direction: column;
            overflow: hidden;
        `;

        // Create title container
        const titleContainer = document.createElement('div');
        titleContainer.className = 'breakdown-title-container';
        titleContainer.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            margin-bottom: 20px;
            padding: 24px 24px 0 24px;
            flex-shrink: 0;
        `;

        // Create icon
        const icon = document.createElement('div');
        icon.className = 'breakdown-title-icon';
        icon.innerHTML = '<svg class="icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>';
        icon.style.cssText = `
            color: var(--accent3);
            opacity: 0.8;
        `;

        // Create title
        const title = document.createElement('h3');
        title.className = 'breakdown-title';
        title.textContent = 'Vaktdetaljer';
        title.style.cssText = `
            color: var(--accent3);
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        `;

        titleContainer.appendChild(icon);
        titleContainer.appendChild(title);
        modal.appendChild(titleContainer);

        // Close button will be added to shift-actions instead of top-right

        // Create content container
        const contentContainer = document.createElement('div');
        contentContainer.className = 'shift-detail-content';
        // Use animated reveal by default; no global kill-switch is used
        const baseContentStyles = `
            flex: 1;
            display: flex;
            flex-direction: column;
            padding: 0 24px 24px 24px;
            padding-bottom: 80px;
            gap: 16px;
            overflow-y: auto;
        `;
        const animatedStyles = `
            opacity: 0;
            animation: slideInFromBottom 0.6s var(--ease-default) 0.3s forwards;
        `;
        contentContainer.style.cssText = `${animatedStyles} ${baseContentStyles}`;

        // Calculate shift details
        const calc = this.calculateShift(shift);
        const dayName = this.WEEKDAYS[shift.date.getDay()];
        const monthName = this.MONTHS[shift.date.getMonth()];
        const formattedDate = `${dayName} ${shift.date.getDate()}. ${monthName}`;
        const originalIndex = this.shifts.indexOf(shift);

        // Create compact content
        // Determine wage rate for this shift (uses snapshot if present)
        const shiftWageRate = this.getWageRateForShift(shift);

        contentContainer.innerHTML = `
            <div class="detail-section">
                <div class="detail-label">Dato</div>
                <div class="detail-value">${formattedDate}</div>
            </div>

            <div class="detail-section">
                <div class="detail-label">Tid</div>
                <div class="detail-value">${shift.startTime} - ${shift.endTime} (${calc.totalHours.toFixed(2)}t)</div>
            </div>

            <div class="detail-section">
                <div class="detail-label">Timelønn for denne vakten</div>
                <div class="detail-value">${this.formatCurrency(shiftWageRate)}</div>
            </div>

            <div class="detail-section">
                <div class="detail-label">Grunnlønn</div>
                <div class="detail-value accent">${this.formatCurrency(calc.baseWage)}</div>
            </div>

            ${calc.bonus > 0 ? `
            <div class="detail-section">
                <div class="detail-label">Tillegg</div>
                <div class="detail-value accent">${this.formatCurrency(calc.bonus)}</div>
            </div>
            ` : ''}

            <div class="detail-section total">
                <div class="detail-label">Total</div>
                <div class="detail-value accent large">${this.formatCurrency(calc.total)}</div>
            </div>


        `;

        modal.appendChild(contentContainer);

        // Create fixed footer with all buttons
        const fixedFooter = document.createElement('div');
        fixedFooter.className = 'modal-fixed-footer';
        fixedFooter.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 16px 24px;
            background: linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary));
            border-top: 1px solid var(--border);
            display: flex;
            justify-content: space-between;
            align-items: center;
            z-index: 10;
            border-radius: 0 0 24px 24px;
        `;

        // Create left side buttons container
        const leftButtons = document.createElement('div');
        leftButtons.style.cssText = `
            display: flex;
            gap: 12px;
            align-items: center;
        `;

        // Create edit button
        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-secondary edit-shift-btn';
        editBtn.setAttribute('data-shift-id', shift.id);
        editBtn.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 16px;
        `;
        editBtn.innerHTML = `
            <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            Rediger
        `;

        // Create delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger delete-shift-btn';
        deleteBtn.setAttribute('data-shift-index', originalIndex);
        deleteBtn.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 16px;
        `;
        deleteBtn.innerHTML = `
            <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18"></path>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            </svg>
            Vakt
        `;

        // Add event listeners for edit and delete buttons
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const shiftId = e.target.closest('button').getAttribute('data-shift-id');
            this.editShift(shiftId);
        });

        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const shiftIndex = parseInt(e.target.closest('button').getAttribute('data-shift-index'));
            const deleted = await this.deleteShift(shiftIndex);
            if (deleted) {
                this.closeShiftDetails();
            }
        });

        leftButtons.appendChild(editBtn);
        leftButtons.appendChild(deleteBtn);

        // Add series delete button if needed
        if (shift.seriesId) {
            const seriesBtn = document.createElement('button');
            seriesBtn.className = 'btn btn-warning delete-series-btn';
            seriesBtn.style.cssText = `
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 12px 16px;
            `;
            seriesBtn.innerHTML = `
                <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                </svg>
                Serie
            `;
            seriesBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm('Vil du slette hele serien?')) {
                    const deleteSuccess = await this.deleteSeries(shift.seriesId);
                    if (deleteSuccess) {
                        this.closeShiftDetails();
                    }
                }
            });
            leftButtons.appendChild(seriesBtn);
        }

        // Create close button (right-aligned, 16px from right)
        const fixedCloseBtn = document.createElement('button');
        fixedCloseBtn.className = 'btn btn-secondary modal-close-bottom';
        fixedCloseBtn.style.cssText = `
            background: rgba(255, 102, 153, 0.1);
            border: 1px solid rgba(255, 102, 153, 0.3);
            color: var(--danger);
            transition: all 0.2s var(--ease-default);
            display: flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            font-size: 0;
            font-weight: 500;
            padding: 0;
            gap: 0;
        `;
        fixedCloseBtn.innerHTML = `
            <svg style="width: 16px; height: 16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        `;
        fixedCloseBtn.onclick = (e) => {
            e.stopPropagation();
            this.closeShiftDetails();
        };

        fixedFooter.appendChild(leftButtons);
        fixedFooter.appendChild(fixedCloseBtn);
        modal.appendChild(fixedFooter);

        document.body.appendChild(modal);
        requestAnimationFrame(() => {
            modal.style.opacity = '1';
            modal.style.transform = 'translate(-50%, -50%) scale(1)';
        });




    },

    // Close shift details view
    closeShiftDetails() {
        const modal = document.querySelector('.shift-detail-modal');
        const backdrop = document.querySelector('.backdrop-blur');
        const header = document.querySelector('.header');

        if (header) header.classList.remove('hidden');

        if (this.shiftDetailsKeydownHandler) {
            document.removeEventListener('keydown', this.shiftDetailsKeydownHandler);
            this.shiftDetailsKeydownHandler = null;
        }

        // Restore floating action bar visibility when modal closes
        const floatingBar = document.querySelector('.floating-action-bar');
        const floatingBarBackdrop = document.querySelector('.floating-action-bar-backdrop');
        if (floatingBar) {
            floatingBar.style.display = '';
        }
        if (floatingBarBackdrop) {
            floatingBarBackdrop.style.display = '';
        }

        // Immediately disable pointer events on backdrop to prevent double-tap
        if (backdrop) {
            backdrop.style.pointerEvents = 'none';
            backdrop.onclick = null; // Remove click handler
        }

        if (modal) {
            modal.style.opacity = '0';
            modal.style.transform = 'translate(-50%, -50%) scale(0.8)';
            setTimeout(() => { if (modal.parentNode) modal.remove(); }, 300);
        }

        if (backdrop) {
            setTimeout(() => {
                backdrop.classList.remove('active');
                setTimeout(() => { if (backdrop.parentNode) backdrop.remove(); }, 350);
            }, 100);
        }
    },


    // Delete entire series by ID
    async deleteSeries(seriesId) {
        try {
            const { data, error } = await window.supa
                .from('user_shifts')
                .delete()
                .match({ series_id: seriesId });
            if (error) {
                console.error('Feil ved sletting av serie:', error);
                alert('Kunne ikke slette serien');
                return false;
            }
            // Remove from local arrays
            this.userShifts = this.userShifts.filter(s => s.seriesId !== seriesId);
            this.shifts = this.shifts.filter(s => s.seriesId !== seriesId);
            this.updateDisplay();
            alert('Serien er slettet');
            return true;
        } catch (e) {
            console.error('deleteSeries error:', e);
            alert('En uventet feil oppstod');
            return false;
        }
    },

    // Profile management methods
    async loadProfileData() {
        try {
            const { data: { user } } = await window.supa.auth.getUser();
            if (!user) return;

            // Populate form fields using user metadata and email
            const nameField = document.getElementById('profileName');
            const emailField = document.getElementById('profileEmail');

            if (nameField) nameField.value = user.user_metadata?.first_name || '';
            if (emailField) emailField.value = user.email || '';

            // Load avatar url: prefer server settings.profile_picture_url, fallback to user metadata
            let avatarUrl = '';
            try {
                const { data: { session } } = await window.supa.auth.getSession();
                const token = session?.access_token;
                if (token) {
                    const resp = await fetch(`${window.CONFIG.apiBase}/settings`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (resp.ok) {
                        const json = await resp.json();
                        avatarUrl = json?.profile_picture_url || '';
                    }
                }
            } catch (_) { /* ignore */ }
            if (!avatarUrl) {
                try {
                    const { data: row } = await window.supa
                        .from('user_settings')
                        .select('profile_picture_url')
                        .eq('user_id', user.id)
                        .maybeSingle();
                    avatarUrl = row?.profile_picture_url || '';
                } catch (_) { /* ignore */ }
            }
            if (!avatarUrl) avatarUrl = user.user_metadata?.avatar_url || '';
            const imgEl = document.getElementById('profileAvatarImage');
            const placeholder = document.getElementById('profileAvatarPlaceholder');
            const topbarImg = document.getElementById('userAvatarImg');
            const profileIcon = document.querySelector('.profile-icon');
            if (avatarUrl && imgEl) {
                imgEl.src = avatarUrl;
                imgEl.onload = () => { imgEl.style.display = 'block'; placeholder && (placeholder.style.display = 'none'); };
                if (topbarImg) {
                    topbarImg.src = avatarUrl;
                    topbarImg.style.display = 'block';
                }
                if (profileIcon) profileIcon.style.display = 'none';
            } else {
                if (imgEl) imgEl.style.display = 'none';
                if (placeholder) placeholder.style.display = '';
                if (topbarImg) topbarImg.style.display = 'none';
                if (profileIcon) profileIcon.style.display = '';
            }

        } catch (err) {
            console.error('Error loading profile data:', err);
        }
    },

    async updateProfile() {
        try {
            const { data: { user } } = await window.supa.auth.getUser();
            if (!user) return;

            const nameField = document.getElementById('profileName');
            const msgElement = document.getElementById('profile-update-msg');

            const firstName = nameField?.value || '';

            if (!firstName.trim()) {
                if (msgElement) {
                    msgElement.style.color = 'var(--danger)';
                    msgElement.textContent = 'Fornavn er påkrevd';
                }
                return;
            }

            // Update user metadata
            const { error } = await window.supa.auth.updateUser({
                data: {
                    first_name: firstName.trim()
                }
            });

            if (error) {
                console.error('Error updating profile:', error);
                if (msgElement) {
                    msgElement.style.color = 'var(--danger)';
                    msgElement.textContent = 'Feil ved oppdatering av profil';
                }
                return;
            }

            // Show success message
            if (msgElement) {
                msgElement.style.color = 'var(--success)';
                msgElement.textContent = 'Profil oppdatert!';
                setTimeout(() => {
                    msgElement.textContent = '';
                }, 3000);
            }

            // Update the nickname in the header
            this.loadUserNickname();

        } catch (err) {
            console.error('Error updating profile:', err);
            const msgElement = document.getElementById('profile-update-msg');
            if (msgElement) {
                msgElement.style.color = 'var(--danger)';
                msgElement.textContent = 'Kunne ikke oppdatere profil';
            }
        }
    },

    // ===== Profile picture management =====
    initProfileAvatarControls() {
        const chooseBtn = document.getElementById('profileAvatarChooseBtn');
        const removeBtn = document.getElementById('profileAvatarRemoveBtn');
        const inputEl = document.getElementById('profileAvatarInput');
        if (chooseBtn && inputEl) {
            chooseBtn.onclick = () => inputEl.click();
        }
        if (inputEl) {
            inputEl.onchange = async (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;
                await this.openCropperWithFile(file);
                // reset input so same file can be selected again later
                inputEl.value = '';
            };
        }
        if (removeBtn) {
            removeBtn.onclick = () => this.removeProfileAvatar();
        }
    },

    async openCropperWithFile(file) {
        try {
            const modal = document.getElementById('cropModal');
            const img = document.getElementById('cropImage');
            if (!modal || !img) return;

            // Revoke previous URL
            if (this._cropObjectUrl) {
                URL.revokeObjectURL(this._cropObjectUrl);
                this._cropObjectUrl = null;
            }
            const objectUrl = URL.createObjectURL(file);
            this._cropObjectUrl = objectUrl;
            img.src = objectUrl;

            // Show modal
            modal.style.display = 'flex';
            modal.classList.add('active');

            // Init cropper
            await new Promise(resolve => setTimeout(resolve, 10));
            if (this.cropper) {
                this.cropper.destroy();
                this.cropper = null;
            }
            const CropperCtor = window.Cropper || (await (async () => {
                try {
                    const mod = await import('https://unpkg.com/cropperjs@1.6.2/dist/cropper.esm.js');
                    return mod?.default || mod?.Cropper || null;
                } catch (_) { return null; }
            })());
            if (!CropperCtor) throw new Error('Cropper library not available');
            this.cropper = new CropperCtor(img, {
                aspectRatio: 1,
                viewMode: 1,
                dragMode: 'move',
                guides: true,
                background: false,
                autoCropArea: 1,
                responsive: true,
                checkOrientation: false,
                movable: true,
                zoomable: true,
                scalable: false,
                rotatable: false,
                minCropBoxWidth: 64,
                minCropBoxHeight: 64,
                ready: () => {
                    const slider = document.getElementById('cropZoomSlider');
                    if (slider) {
                        const current = this.cropper.getImageData().ratio || 1;
                        slider.value = current;
                        slider.oninput = () => this.cropper.zoomTo(parseFloat(slider.value));
                    }
                    const zoomIn = document.getElementById('zoomInBtn');
                    const zoomOut = document.getElementById('zoomOutBtn');
                    if (zoomIn) zoomIn.onclick = () => this.cropper.zoom(0.05);
                    if (zoomOut) zoomOut.onclick = () => this.cropper.zoom(-0.05);
                    img.classList.add('loaded');

                    // Mobile pinch-to-zoom enhancements
                    this.addMobileTouchEnhancements();
                }
            });

            // Wire buttons
            const confirmBtn = document.getElementById('confirmCropBtn');
            const cancelBtn = document.getElementById('cancelCropBtn');
            if (confirmBtn) confirmBtn.onclick = () => this.confirmAvatarCrop();
            if (cancelBtn) cancelBtn.onclick = () => this.cancelAvatarCrop();
        } catch (e) {
            console.error('openCropperWithFile error', e);
            this.showUploadError('Kunne ikke åpne beskjæring');
        }
    },

    async confirmAvatarCrop() {
        try {
            if (!this.cropper) return;
            this.showProfilePictureProgress(true);
            this.updateProfilePictureProgress(10, 'Behandler...');

            const canvas = this.cropper.getCroppedCanvas({ width: 512, height: 512, imageSmoothingQuality: 'high' });
            if (!canvas) throw new Error('Canvas not available');
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
            if (!blob) throw new Error('Kunne ikke lage bilde');
            this.updateProfilePictureProgress(30, 'Lagrer...');

            const url = await this.saveAvatarBlob(blob);
            this.updateProfilePictureProgress(90, 'Oppdaterer profil...');

            // Save URL both in user_settings (server) and user metadata (fallback)
            try {
                const { data: { session } } = await window.supa.auth.getSession();
                const token = session?.access_token;
                if (token) {
                    await fetch(`${window.CONFIG.apiBase}/settings`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ profile_picture_url: url })
                    });
                }
            } catch (_) { /* ignore */ }
            // Client-side fallback upsert into user_settings
            try {
                const { data: { user } } = await window.supa.auth.getUser();
                if (user?.id) {
                    const { error: updateError } = await window.supa
                        .from('user_settings')
                        .update({ profile_picture_url: url })
                        .eq('user_id', user.id);
                    if (updateError) {
                        await window.supa
                            .from('user_settings')
                            .upsert({ user_id: user.id, profile_picture_url: url }, { onConflict: 'user_id' });
                    }
                }
            } catch (_) { /* ignore */ }
            await window.supa.auth.updateUser({ data: { avatar_url: url } });

            // Update UI
            const imgEl = document.getElementById('profileAvatarImage');
            const placeholder = document.getElementById('profileAvatarPlaceholder');
            const topbarImg = document.getElementById('userAvatarImg');
            if (imgEl) {
                imgEl.onload = () => { imgEl.style.display = 'block'; };
                imgEl.onerror = () => { imgEl.style.display = 'none'; };
                imgEl.src = url;
            }
            if (placeholder) placeholder.style.display = 'none';
            if (topbarImg) {
                topbarImg.onload = () => { topbarImg.style.display = 'block'; };
                topbarImg.onerror = () => { topbarImg.style.display = 'none'; };
                topbarImg.src = url;
            }
            const profileIcon = document.querySelector('.profile-icon');
            if (profileIcon) profileIcon.style.display = 'none';

            this.updateProfilePictureProgress(100, 'Ferdig');

            // Close cropper
            this.cancelAvatarCrop(true);
        } catch (e) {
            console.error('confirmAvatarCrop error', e);
            this.showUploadError('Kunne ikke lagre profilbilde');
        } finally {
            this.showProfilePictureProgress(false);
        }
    },

    cancelAvatarCrop(keepModalHidden = false) {
        const modal = document.getElementById('cropModal');
        if (this.cropper) {
            try { this.cropper.destroy(); } catch (_) {}
            this.cropper = null;
        }
        if (!keepModalHidden && modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        } else if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
        if (this._cropObjectUrl) {
            URL.revokeObjectURL(this._cropObjectUrl);
            this._cropObjectUrl = null;
        }
    },

    async saveAvatarBlob(blob) {
        // Preferred: upload to backend which writes to Supabase Storage. Fallback: client Supabase Storage, then data URL.
        try {
            // Try backend upload with auth
            const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const res = reader.result;
                    const b64 = res.split(',')[1] || '';
                    resolve(b64);
                };
                reader.onerror = () => reject(new Error('Kunne ikke lese bilde'));
                reader.readAsDataURL(blob);
            });

            const { data: { session } } = await window.supa.auth.getSession();
            const token = session?.access_token;
            if (token) {
                const resp = await fetch(`${window.CONFIG.apiBase}/user/avatar`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ image_base64: base64 })
                });
                const json = await resp.json();
                if (resp.ok && json?.url) {
                    return json.url;
                }
            }
        } catch (e) {
            console.warn('Backend upload failed; trying client storage.', e);
        }

        try {
            const { data: { user } } = await window.supa.auth.getUser();
            const userId = user?.id;
            if (!userId) throw new Error('Ingen bruker');
            if (window.supa.storage && window.supa.storage.from) {
                const storage = window.supa.storage.from('profile-pictures');
                const path = `${userId}/profile_${Date.now()}.jpg`;
                const { error: upErr } = await storage.upload(path, blob, { contentType: 'image/jpeg', upsert: true });
                if (upErr) throw upErr;
                const { data: publicData } = storage.getPublicUrl(path);
                if (publicData?.publicUrl) return publicData.publicUrl;
            }
        } catch (e) {
            console.warn('Supabase Storage upload failed or not available; using data URL.', e);
        }

        // Fallback to data URL so the app still works offline
        return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Kunne ikke lese bilde'));
            reader.readAsDataURL(blob);
        });
    },

    async removeProfileAvatar() {
        try {
            try {
                const { data: { session } } = await window.supa.auth.getSession();
                const token = session?.access_token;
                if (token) {
                    await fetch(`${window.CONFIG.apiBase}/settings`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ profile_picture_url: null })
                    });
                }
            } catch (_) { /* ignore */ }
            // Client-side fallback clear
            try {
                const { data: { user } } = await window.supa.auth.getUser();
                if (user?.id) {
                    await window.supa
                        .from('user_settings')
                        .update({ profile_picture_url: null })
                        .eq('user_id', user.id);
                }
            } catch (_) { /* ignore */ }
            await window.supa.auth.updateUser({ data: { avatar_url: null } });
            const imgEl = document.getElementById('profileAvatarImage');
            const placeholder = document.getElementById('profileAvatarPlaceholder');
            const topbarImg = document.getElementById('userAvatarImg');
            if (imgEl) imgEl.style.display = 'none';
            if (placeholder) placeholder.style.display = '';
            if (topbarImg) topbarImg.style.display = 'none';
            const profileIcon = document.querySelector('.profile-icon');
            if (profileIcon) profileIcon.style.display = '';
        } catch (e) {
            console.error('removeProfileAvatar error', e);
            this.showUploadError('Kunne ikke fjerne profilbilde');
        }
    },


    // Profile picture upload code removed

    showUploadError(message) {
        this.showProfilePictureProgress(false);

        const msgElement = document.getElementById('profile-update-msg');
        if (msgElement) {
            msgElement.style.color = 'var(--danger)';
            msgElement.textContent = message;
            setTimeout(() => {
                msgElement.textContent = '';
            }, 5000);
        }
    },

    // Profile picture upload storage removed

    // Profile picture URL save removed

    // Profile picture remove flow removed

    showProfilePictureProgress(show) {
        const progressElement = document.getElementById('profilePictureProgress');
        if (progressElement) {
            progressElement.style.display = show ? 'flex' : 'none';
        }
    },

    updateProfilePictureProgress(percentage, text) {
        const fillElement = document.getElementById('profilePictureProgressFill');
        const textElement = document.getElementById('profilePictureProgressText');

        if (fillElement) {
            fillElement.style.width = percentage + '%';
        }

        if (textElement) {
            textElement.textContent = text;
        }
    },

    // Initialize profile picture event listeners
    // Profile picture listeners removed

    // Image Cropping Methods
    // Image cropping removed

    // Cropper initialization removed

    // Cropper tests removed

    // Crop preview update removed

    // Crop preview rendering removed



    // Crop zoom controls removed

    // Crop zoom adjustment removed

    // Confirm crop removed

    // Cancel crop removed

    // Cleanup crop resources removed

    // Crop image error handling removed

    // Crop error display removed

    addMobileTouchEnhancements() {
        if (!this.cropper) return;

        const cropperContainer = document.querySelector('#cropModal .cropper-container');
        if (!cropperContainer) return;

        let lastTouchDistance = 0;
        let isZooming = false;

        // Add pinch-to-zoom support
        const handleTouchStart = (e) => {
            if (e.touches.length === 2) {
                isZooming = true;
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                lastTouchDistance = Math.sqrt(
                    Math.pow(touch2.clientX - touch1.clientX, 2) +
                    Math.pow(touch2.clientY - touch1.clientY, 2)
                );
                e.preventDefault();
            }
        };

        const handleTouchMove = (e) => {
            if (isZooming && e.touches.length === 2) {
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                const currentDistance = Math.sqrt(
                    Math.pow(touch2.clientX - touch1.clientX, 2) +
                    Math.pow(touch2.clientY - touch1.clientY, 2)
                );

                if (lastTouchDistance > 0) {
                    const ratio = currentDistance / lastTouchDistance;
                    const canvasData = this.cropper.getCanvasData();
                    const imageData = this.cropper.getImageData();
                    const naturalWidth = imageData?.naturalWidth || 1;
                    const currentZoom = naturalWidth ? (canvasData.width / naturalWidth) : 1;
                    const newZoom = Math.max(0.2, Math.min(3, currentZoom * ratio));
                    this.cropper.zoomTo(newZoom);

                    // Update zoom slider
                    const slider = document.getElementById('cropZoomSlider');
                    if (slider) {
                        slider.value = String(newZoom);
                    }
                }

                lastTouchDistance = currentDistance;
                e.preventDefault();
            }
        };

        const handleTouchEnd = (e) => {
            if (e.touches.length < 2) {
                isZooming = false;
                lastTouchDistance = 0;
            }
        };

        // Add touch event listeners
        cropperContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
        cropperContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
        cropperContainer.addEventListener('touchend', handleTouchEnd, { passive: false });

        // Store event listeners for cleanup
        this.touchEventListeners = {
            touchstart: handleTouchStart,
            touchmove: handleTouchMove,
            touchend: handleTouchEnd,
            element: cropperContainer
        };

        // Add haptic feedback for mobile interactions (if supported)
        if ('vibrate' in navigator) {
            const originalCrop = this.cropper.crop.bind(this.cropper);
            this.cropper.crop = (...args) => {
                navigator.vibrate(10); // Short vibration for feedback
                return originalCrop(...args);
            };
        }

        // Optimize touch responsiveness
        cropperContainer.style.touchAction = 'none';
        cropperContainer.style.userSelect = 'none';
        cropperContainer.style.webkitUserSelect = 'none';
    },

    removeMobileTouchEnhancements() {
        if (this.touchEventListeners) {
            const { element, touchstart, touchmove, touchend } = this.touchEventListeners;
            element.removeEventListener('touchstart', touchstart);
            element.removeEventListener('touchmove', touchmove);
            element.removeEventListener('touchend', touchend);
            this.touchEventListeners = null;
        }
    },

    calculateShift(shift) {
        const startMinutes = this.timeToMinutes(shift.startTime);
        let endMinutes = this.timeToMinutes(shift.endTime);

        // Improved logic for handling shifts that cross midnight
        if (endMinutes < startMinutes) {
            // Shift spans midnight, add 24 hours to end time
            endMinutes += 24 * 60;
        } else if (endMinutes === startMinutes) {
            // Handle edge case where start and end times are the same
            // This could be a 24-hour shift or invalid input
            console.warn('Shift has same start and end time', {
                startTime: shift.startTime,
                endTime: shift.endTime
            });
            // Assume it's a 24-hour shift if times are identical
            endMinutes += 24 * 60;
        }

        const durationHours = (endMinutes - startMinutes) / 60;

        // Validate shift duration
        if (durationHours <= 0) {
            console.error('Invalid shift duration', {
                startTime: shift.startTime,
                endTime: shift.endTime,
                durationHours: durationHours
            });
            return {
                hours: 0,
                totalHours: 0,
                paidHours: 0,
                pauseDeducted: false,
                baseWage: 0,
                bonus: 0,
                total: 0,
                breakDeduction: null
            };
        }

        // Use per-shift snapshot when available (employees view),
        // otherwise fall back to the app's current wage rate
        const wageRate = this.getWageRateForShift(shift);
        const bonuses = this.getCurrentBonuses();

        // Apply legal break deduction system
        const breakResult = this.calculateLegalBreakDeduction(shift, wageRate, bonuses, startMinutes, endMinutes);

        let paidHours = durationHours;
        let adjustedEndMinutes = endMinutes;

        let baseWage = 0;
        let bonus = 0;

        if (breakResult.shouldDeduct && (breakResult.method === 'proportional' || breakResult.method === 'base_only')) {
            // For proportional and base_only methods, calculate wages based on adjusted wage periods
            const adjustedWages = this.calculateAdjustedWages(breakResult, wageRate);
            baseWage = adjustedWages.baseWage;
            bonus = adjustedWages.bonus;
            paidHours = adjustedWages.totalHours;


        } else {
            // For end_of_shift and none methods, use traditional calculation
            if (breakResult.shouldDeduct) {
                paidHours -= breakResult.deductionHours;
                adjustedEndMinutes = breakResult.adjustedEndMinutes;
            }

            baseWage = paidHours * wageRate;
            const bonusType = shift.type === 0 ? 'weekday' : (shift.type === 1 ? 'saturday' : 'sunday');
            const bonusSegments = bonuses[bonusType] || [];

            // Recreate the end time after any pause deduction or midnight handling
            // so we can reuse the same format when calculating bonuses
            const endHour = Math.floor(adjustedEndMinutes / 60) % 24;
            const endTimeStr = `${String(endHour).padStart(2,'0')}:${(adjustedEndMinutes % 60).toString().padStart(2,'0')}`;

            bonus = this.calculateBonus(
                shift.startTime,
                endTimeStr,
                bonusSegments
            );

            // Debug logging for traditional calculations
            if (durationHours > 5.5) {
                console.log('Traditional calculation (client):', {
                    method: breakResult.method,
                    originalHours: durationHours,
                    paidHours: paidHours,
                    baseWage: baseWage,
                    bonus: bonus,
                    total: baseWage + bonus
                });
            }
        }

        return {
            hours: parseFloat(paidHours.toFixed(2)),
            totalHours: parseFloat(durationHours.toFixed(2)),
            paidHours: parseFloat(paidHours.toFixed(2)),
            pauseDeducted: breakResult.shouldDeduct,
            baseWage: baseWage,
            bonus: bonus,
            total: baseWage + bonus,
            breakDeduction: breakResult.auditTrail
        };
    },

    // Legal break deduction calculation system (client-side)
    calculateLegalBreakDeduction(shift, wageRate, bonuses, startMinutes, endMinutes) {
        const totalDurationHours = (endMinutes - startMinutes) / 60;

        // Get break deduction settings with defaults
        const breakSettings = {
            enabled: this.pauseDeductionEnabled !== false,
            method: this.pauseDeductionMethod || 'proportional',
            thresholdHours: this.pauseThresholdHours || 5.5,
            deductionMinutes: this.pauseDeductionMinutes || 30,
            auditEnabled: this.auditBreakCalculations !== false
        };

        // Check if break deduction should be applied
        if (!breakSettings.enabled || totalDurationHours <= breakSettings.thresholdHours) {
            return {
                shouldDeduct: false,
                deductionHours: 0,
                adjustedEndMinutes: endMinutes,
                auditTrail: breakSettings.auditEnabled ? {
                    originalDuration: totalDurationHours,
                    thresholdHours: breakSettings.thresholdHours,
                    method: breakSettings.method,
                    reason: !breakSettings.enabled ? 'Break deduction disabled' : 'Shift duration below threshold',
                    wagePeriods: [],
                    deductedHours: 0,
                    complianceNotes: []
                } : null
            };
        }

        const deductionHours = breakSettings.deductionMinutes / 60;

        // Calculate wage periods for audit trail and method-specific deduction
        const wagePeriods = this.calculateWagePeriods(shift, wageRate, bonuses, startMinutes, endMinutes);

        // Apply break deduction based on selected method
        let methodSpecificDeduction = null;

        switch (breakSettings.method) {
            case 'none':
                // No deduction - paid pause
                methodSpecificDeduction = {
                    deductionHours: 0,
                    adjustedEndMinutes: endMinutes,
                    deductionDetails: 'No break deduction applied - paid pause'
                };
                break;

            case 'proportional':
                // Deduct proportionally across all wage periods
                methodSpecificDeduction = this.applyProportionalDeduction(wagePeriods, deductionHours, startMinutes, endMinutes);
                break;

            case 'base_only':
                // Deduct only from base rate periods
                methodSpecificDeduction = this.applyBaseOnlyDeduction(wagePeriods, deductionHours, startMinutes, endMinutes);
                break;

            case 'end_of_shift':
            default:
                // Legacy method - deduct from end of shift
                methodSpecificDeduction = {
                    deductionHours: deductionHours,
                    adjustedEndMinutes: endMinutes - breakSettings.deductionMinutes,
                    deductionDetails: 'Break deducted from end of shift (legacy method)'
                };
                break;
        }

        let auditTrail = null;
        if (breakSettings.auditEnabled) {
            auditTrail = {
                originalDuration: totalDurationHours,
                thresholdHours: breakSettings.thresholdHours,
                method: breakSettings.method,
                deductionMinutes: breakSettings.deductionMinutes,
                wagePeriods: wagePeriods,
                deductedHours: methodSpecificDeduction.deductionHours,
                deductionDetails: methodSpecificDeduction.deductionDetails,
                complianceNotes: []
            };

            // Add compliance warnings for problematic methods
            if (breakSettings.method === 'end_of_shift') {
                auditTrail.complianceNotes.push('WARNING: End-of-shift deduction may not comply with labor laws in all jurisdictions');
            }
        }

        return {
            shouldDeduct: breakSettings.method !== 'none',
            deductionHours: methodSpecificDeduction.deductionHours,
            adjustedEndMinutes: methodSpecificDeduction.adjustedEndMinutes,
            method: breakSettings.method,
            auditTrail: auditTrail
        };
    },

    // Calculate wage periods for break deduction analysis with cross-midnight and weekday/weekend handling
    calculateWagePeriods(shift, baseWageRate, bonuses, startMinutes, endMinutes) {
        const periods = [];

        const dayToBonusKey = (dow) => (dow === 0 ? 'sunday' : (dow === 6 ? 'saturday' : 'weekday'));

        // Build periods inside [dayStart, dayEnd] for a given day's bonus key
        const buildDay = (dayStart, dayEnd, bonusKey) => {
            if (dayEnd <= dayStart) return;
            const applicable = bonuses[bonusKey] || [];
            let segments = [{ start: dayStart, end: dayEnd, bonuses: [] }];
            for (const b of applicable) {
                const s = this.timeToMinutes(b.from);
                let e = this.timeToMinutes(b.to);
                if (e <= s) e += 24 * 60; // wrap
                const os = Math.max(dayStart, s);
                const oe = Math.min(dayEnd, e);
                if (oe <= os) continue;
                const next = [];
                for (const seg of segments) {
                    if (seg.end <= os || seg.start >= oe) { next.push(seg); continue; }
                    if (seg.start < os) next.push({ start: seg.start, end: os, bonuses: [...seg.bonuses] });
                    const overlapStart = Math.max(seg.start, os);
                    const overlapEnd = Math.min(seg.end, oe);
                    if (overlapEnd > overlapStart) next.push({ start: overlapStart, end: overlapEnd, bonuses: [...seg.bonuses, b] });
                    if (seg.end > oe) next.push({ start: oe, end: seg.end, bonuses: [...seg.bonuses] });
                }
                segments = next;
            }
            for (const seg of segments) {
                const h = (seg.end - seg.start) / 60;
                if (h <= 0) continue;
                const bonusRate = seg.bonuses.reduce((sum, x) => sum + x.rate, 0);
                periods.push({
                    startMinutes: seg.start,
                    endMinutes: seg.end,
                    durationHours: h,
                    wageRate: baseWageRate,
                    bonusRate,
                    totalRate: baseWageRate + bonusRate,
                    type: bonusRate > 0 ? 'bonus' : 'base',
                    bonuses: seg.bonuses
                });
            }
        };

        // Determine day-of-week from shift.date when available; otherwise use type fallback
        const startDow = (shift?.date instanceof Date)
            ? shift.date.getDay()
            : (shift?.type === 2 ? 0 : (shift?.type === 1 ? 6 : 1));

        const firstEnd = Math.min(endMinutes, 24 * 60);
        buildDay(startMinutes, firstEnd, dayToBonusKey(startDow));

        if (endMinutes > 24 * 60) {
            const nextDow = (startDow + 1) % 7;
            buildDay(0, endMinutes - 24 * 60, dayToBonusKey(nextDow));
        }

        return periods;
    },

    // Test function for break deduction methods
    testBreakDeductionMethods() {
        console.log('Testing break deduction methods...');

        // Create a test shift: 6 hours with bonus periods
        const testShift = {
            startTime: '16:00',
            endTime: '22:00',
            type: 1 // Saturday
        };

        const methods = ['proportional', 'base_only', 'end_of_shift', 'none'];
        const results = {};

        for (const method of methods) {
            // Temporarily set the method
            const originalMethod = this.pauseDeductionMethod;
            const originalEnabled = this.pauseDeductionEnabled;

            this.pauseDeductionMethod = method;
            this.pauseDeductionEnabled = method !== 'none';

            // Calculate shift earnings
            const result = this.calculateShift(testShift);
            results[method] = {
                total: result.total,
                baseWage: result.baseWage,
                bonus: result.bonus,
                paidHours: result.paidHours,
                pauseDeducted: result.pauseDeducted
            };



            // Restore original settings
            this.pauseDeductionMethod = originalMethod;
            this.pauseDeductionEnabled = originalEnabled;
        }

        console.table(results);

        // Verify no doubling occurred
        const expectedMaxTotal = 6 * 200 + 4 * 50; // 6h base + 4h bonus = 1400 kr max
        const actualTotals = Object.values(results).map(r => r.total);
        const maxTotal = Math.max(...actualTotals);

        if (maxTotal > expectedMaxTotal) {
            console.error('❌ DOUBLING DETECTED! Max total:', maxTotal, 'Expected max:', expectedMaxTotal);
        } else {
            console.log('✅ No doubling detected. Max total:', maxTotal, 'Expected max:', expectedMaxTotal);
        }

        return results;
    },

    // Test function to check if break deduction columns exist in database
    async testBreakDeductionColumns() {
        const { data: { user } } = await window.supa.auth.getUser();
        if (!user) {
            console.log('❌ Not logged in');
            return;
        }

        try {
            const { data: settings, error } = await window.supa
                .from('user_settings')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (error) {
                console.error('❌ Error fetching settings:', error);
                return;
            }

            const breakColumns = [
                'pause_deduction_enabled',
                'pause_deduction_method',
                'pause_threshold_hours',
                'pause_deduction_minutes',
                'audit_break_calculations'
            ];



        } catch (e) {
            console.error('❌ Error checking columns:', e);
        }
    },

    // Apply proportional break deduction across all wage periods (client-side)
    applyProportionalDeduction(wagePeriods, deductionHours, startMinutes, endMinutes) {
        const totalShiftHours = (endMinutes - startMinutes) / 60;
        let remainingDeduction = deductionHours;
        let totalDeducted = 0;

        // Calculate proportional deduction for each period
        const deductionDetails = [];

        for (const period of wagePeriods) {
            if (remainingDeduction <= 0) break;

            const periodProportion = period.durationHours / totalShiftHours;
            const periodDeduction = Math.min(deductionHours * periodProportion, remainingDeduction);

            if (periodDeduction > 0) {
                totalDeducted += periodDeduction;
                remainingDeduction -= periodDeduction;
                deductionDetails.push(`${periodDeduction.toFixed(2)}h from ${period.type} rate (${period.totalRate} kr/h)`);
            }
        }

        return {
            deductionHours: totalDeducted,
            adjustedEndMinutes: endMinutes - (totalDeducted * 60),
            deductionDetails: `Proportional deduction: ${deductionDetails.join(', ')}`
        };
    },

    // Apply break deduction only to base rate periods (client-side)
    applyBaseOnlyDeduction(wagePeriods, deductionHours, startMinutes, endMinutes) {
        let remainingDeduction = deductionHours;
        let totalDeducted = 0;

        // Find base rate periods (lowest bonus rate)
        const basePeriods = wagePeriods.filter(p => p.bonusRate === 0);
        const deductionDetails = [];

        if (basePeriods.length === 0) {
            // No base periods, deduct from periods with smallest bonuses
            const sortedPeriods = [...wagePeriods].sort((a, b) => a.bonusRate - b.bonusRate);
            const smallestBonus = sortedPeriods[0].bonusRate;
            const targetPeriods = sortedPeriods.filter(p => p.bonusRate === smallestBonus);

            for (const period of targetPeriods) {
                if (remainingDeduction <= 0) break;

                const periodDeduction = Math.min(period.durationHours, remainingDeduction);
                totalDeducted += periodDeduction;
                remainingDeduction -= periodDeduction;
                deductionDetails.push(`${periodDeduction.toFixed(2)}h from lowest bonus rate (${period.totalRate} kr/h)`);
            }
        } else {
            // Deduct from base rate periods
            for (const period of basePeriods) {
                if (remainingDeduction <= 0) break;

                const periodDeduction = Math.min(period.durationHours, remainingDeduction);
                totalDeducted += periodDeduction;
                remainingDeduction -= periodDeduction;
                deductionDetails.push(`${periodDeduction.toFixed(2)}h from base rate (${period.wageRate} kr/h)`);
            }
        }

        return {
            deductionHours: totalDeducted,
            adjustedEndMinutes: endMinutes - (totalDeducted * 60),
            deductionDetails: `Base-only deduction: ${deductionDetails.join(', ')}`
        };
    },

    // Calculate adjusted wages based on break deduction method (client-side)
    calculateAdjustedWages(breakResult, baseWageRate) {
        let totalBaseWage = 0;
        let totalBonus = 0;
        let totalHours = 0;

        if (!breakResult.auditTrail || !breakResult.auditTrail.wagePeriods) {
            return { baseWage: 0, bonus: 0, totalHours: 0 };
        }

        const wagePeriods = breakResult.auditTrail.wagePeriods;
        const method = breakResult.method;
        const deductionHours = breakResult.deductionHours;

        if (method === 'proportional') {
            // Apply proportional deduction to each period
            const totalShiftHours = wagePeriods.reduce((sum, period) => sum + period.durationHours, 0);

            for (const period of wagePeriods) {
                const periodProportion = period.durationHours / totalShiftHours;
                const periodDeduction = deductionHours * periodProportion;
                const adjustedPeriodHours = Math.max(0, period.durationHours - periodDeduction);

                totalHours += adjustedPeriodHours;
                totalBaseWage += adjustedPeriodHours * period.wageRate;
                totalBonus += adjustedPeriodHours * period.bonusRate;
            }
        } else if (method === 'base_only') {
            // Apply deduction only to base rate periods
            let remainingDeduction = deductionHours;

            // First pass: deduct from base periods
            const basePeriods = wagePeriods.filter(p => p.bonusRate === 0);
            const bonusPeriods = wagePeriods.filter(p => p.bonusRate > 0);

            for (const period of basePeriods) {
                const periodDeduction = Math.min(period.durationHours, remainingDeduction);
                const adjustedPeriodHours = period.durationHours - periodDeduction;
                remainingDeduction -= periodDeduction;

                totalHours += adjustedPeriodHours;
                totalBaseWage += adjustedPeriodHours * period.wageRate;
            }

            // Add all bonus periods (no deduction from bonus periods in base_only method)
            for (const period of bonusPeriods) {
                totalHours += period.durationHours;
                totalBaseWage += period.durationHours * period.wageRate;
                totalBonus += period.durationHours * period.bonusRate;
            }
        }

        return {
            baseWage: parseFloat(totalBaseWage.toFixed(2)),
            bonus: parseFloat(totalBonus.toFixed(2)),
            totalHours: parseFloat(totalHours.toFixed(2))
        };
    },

    // Setup event listeners for break deduction settings
    setupBreakDeductionEventListeners() {
        // Enable/disable break deduction
        const enableToggle = document.getElementById('pauseDeductionEnabledToggle');
        if (enableToggle) {
            enableToggle.addEventListener('change', (e) => {
                this.pauseDeductionEnabled = e.target.checked;
                this.toggleBreakDeductionSections();
                this.updateDisplay();
                this.saveSettingsToSupabase();
            });
        } else {
            console.warn('pauseDeductionEnabledToggle element not found');
        }

        // Break deduction method selection
        const methodSelect = document.getElementById('pauseDeductionMethodSelect');
        if (methodSelect) {
            methodSelect.addEventListener('change', (e) => {
                this.pauseDeductionMethod = e.target.value;
                this.updateMethodExplanation();
                this.updateDisplay();
                this.saveSettingsToSupabase();
            });
        } else {
            console.warn('pauseDeductionMethodSelect element not found');
        }

        // Pause threshold input
        const thresholdInput = document.getElementById('pauseThresholdInput');
        if (thresholdInput) {
            thresholdInput.addEventListener('change', (e) => {
                this.pauseThresholdHours = parseFloat(e.target.value) || 5.5;
                this.updateDisplay();
                this.saveSettingsToSupabase();
            });
        }

        // Pause deduction minutes input
        const minutesInput = document.getElementById('pauseDeductionMinutesInput');
        if (minutesInput) {
            minutesInput.addEventListener('change', (e) => {
                this.pauseDeductionMinutes = parseInt(e.target.value) || 30;
                this.updateDisplay();
                this.saveSettingsToSupabase();
            });
        }

        // Audit trail toggle removed from UI - now handled internally
    },

    // Toggle visibility of break deduction sections based on enabled state
    toggleBreakDeductionSections() {
        // Find the container by looking for the parent form-group
        const enableToggle = document.getElementById('pauseDeductionEnabledToggle');
        if (enableToggle) {
            const settingsContainer = enableToggle.closest('.form-group');
            if (settingsContainer) {
                if (this.pauseDeductionEnabled) {
                    settingsContainer.classList.remove('break-settings-disabled');
                } else {
                    settingsContainer.classList.add('break-settings-disabled');
                }
            }
        }
    },

    // Update method explanation based on selected method
    updateMethodExplanation() {
        const descriptions = ['proportionalInfo', 'baseOnlyInfo', 'endOfShiftInfo', 'noneInfo'];
        descriptions.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = 'none';
            }
        });

        let activeId = 'proportionalInfo'; // default
        switch (this.pauseDeductionMethod) {
            case 'proportional':
                activeId = 'proportionalInfo';
                break;
            case 'base_only':
                activeId = 'baseOnlyInfo';
                break;
            case 'end_of_shift':
                activeId = 'endOfShiftInfo';
                break;
            case 'none':
                activeId = 'noneInfo';
                break;
        }

        const activeElement = document.getElementById(activeId);
        if (activeElement) {
            activeElement.style.display = 'block';
        }
    },

    timeToMinutes(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    },

    minutesToTime(minutes) {
        // Convert minutes back to time string, handling values >= 24 hours
        const adjustedMinutes = minutes % (24 * 60);
        const hours = Math.floor(adjustedMinutes / 60);
        const mins = adjustedMinutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    },

    // New function to handle seconds for real-time bonus calculations
    timeToSeconds(timeStr) {
        const parts = timeStr.split(':').map(Number);
        const hours = parts[0];
        const minutes = parts[1];
        const seconds = parts[2] || 0; // Default to 0 if no seconds provided
        return hours * 3600 + minutes * 60 + seconds;
    },

    calculateBonus(startTime, endTime, bonusSegments) {
        let totalBonus = 0;
        const startMinutes = this.timeToMinutes(startTime);
        let endMinutes = this.timeToMinutes(endTime);
        // Bonus calculations also need to handle shifts that continue past
        // midnight. Adjust the end time similar to calculateShift.
        if (endMinutes <= startMinutes) {
            endMinutes += 24 * 60;
        }
        for (const segment of bonusSegments) {
            const segStart = this.timeToMinutes(segment.from);
            let segEnd = this.timeToMinutes(segment.to);
            if (segEnd <= segStart) {
                segEnd += 24 * 60;
            }
            const overlap = this.calculateOverlap(startMinutes, endMinutes, segStart, segEnd);
            totalBonus += (overlap / 60) * segment.rate;
        }
        return totalBonus;
    },

    // New function for second-precise bonus calculations
    calculateBonusWithSeconds(startTime, endTime, bonusSegments) {
        let totalBonus = 0;
        const startSeconds = this.timeToSeconds(startTime);
        let endSeconds = this.timeToSeconds(endTime);

        // Handle shifts that continue past midnight
        if (endSeconds <= startSeconds) {
            endSeconds += 24 * 3600; // Add 24 hours in seconds
        }

        for (const segment of bonusSegments) {
            const segStart = this.timeToSeconds(segment.from);
            let segEnd = this.timeToSeconds(segment.to);
            if (segEnd <= segStart) {
                segEnd += 24 * 3600; // Add 24 hours in seconds
            }
            const overlap = this.calculateOverlap(startSeconds, endSeconds, segStart, segEnd);
            totalBonus += (overlap / 3600) * segment.rate; // Convert seconds to hours
        }
        return totalBonus;
    },

    calculateOverlap(startA, endA, startB, endB) {
        const start = Math.max(startA, startB);
        const end = Math.min(endA, endB);
        return Math.max(0, end - start);
    },

    // Check if two shifts have overlapping time periods
    shiftsOverlap(shift1, shift2) {
        // Convert dates to compare
        const date1 = new Date(shift1.date);
        const date2 = new Date(shift2.date);

        // Get start and end times in minutes for both shifts
        const start1Minutes = this.timeToMinutes(shift1.startTime);
        let end1Minutes = this.timeToMinutes(shift1.endTime);
        const start2Minutes = this.timeToMinutes(shift2.startTime);
        let end2Minutes = this.timeToMinutes(shift2.endTime);

        // Handle shifts that cross midnight
        if (end1Minutes < start1Minutes) {
            end1Minutes += 24 * 60;
        }
        if (end2Minutes < start2Minutes) {
            end2Minutes += 24 * 60;
        }

        // Check for same day overlap
        if (date1.getTime() === date2.getTime()) {
            return this.calculateOverlap(start1Minutes, end1Minutes, start2Minutes, end2Minutes) > 0;
        }

        // Check for consecutive day overlap (shift1 on day N, shift2 on day N+1)
        const nextDay = new Date(date1);
        nextDay.setDate(nextDay.getDate() + 1);

        if (nextDay.getTime() === date2.getTime()) {
            // If shift1 crosses midnight, check if it overlaps with shift2 start
            if (end1Minutes > 24 * 60) {
                const shift1NextDayEnd = end1Minutes - 24 * 60;
                return shift1NextDayEnd > start2Minutes;
            }
        }

        // Check for consecutive day overlap (shift2 on day N, shift1 on day N+1)
        const nextDay2 = new Date(date2);
        nextDay2.setDate(nextDay2.getDate() + 1);

        if (nextDay2.getTime() === date1.getTime()) {
            // If shift2 crosses midnight, check if it overlaps with shift1 start
            if (end2Minutes > 24 * 60) {
                const shift2NextDayEnd = end2Minutes - 24 * 60;
                return shift2NextDayEnd > start1Minutes;
            }
        }

        return false;
    },

    // Get all shifts that overlap with a given shift
    getOverlappingShifts(targetShift) {
        return this.shifts.filter(shift => {
            // Don't compare shift with itself
            if (shift.id === targetShift.id) return false;
            return this.shiftsOverlap(targetShift, shift);
        });
    },

    // Check if a shift has any overlaps
    shiftHasOverlaps(shift) {
        return this.getOverlappingShifts(shift).length > 0;
    },

    // Test function for overlap detection (for development/debugging)
    testOverlapDetection() {
        console.log('Testing overlap detection...');

        // Create test shifts
        const testShift1 = {
            id: 'test1',
            date: new Date('2024-01-15'),
            startTime: '09:00',
            endTime: '17:00',
            type: 0
        };

        const testShift2 = {
            id: 'test2',
            date: new Date('2024-01-15'),
            startTime: '16:00',
            endTime: '22:00',
            type: 0
        };

        const testShift3 = {
            id: 'test3',
            date: new Date('2024-01-15'),
            startTime: '23:00',
            endTime: '07:00', // Crosses midnight
            type: 0
        };

        const testShift4 = {
            id: 'test4',
            date: new Date('2024-01-16'),
            startTime: '06:00',
            endTime: '14:00',
            type: 0
        };

        // Test same day overlap
        console.log('Shift1 and Shift2 overlap (same day):', this.shiftsOverlap(testShift1, testShift2)); // Should be true

        // Test midnight crossing overlap
        console.log('Shift3 and Shift4 overlap (midnight crossing):', this.shiftsOverlap(testShift3, testShift4)); // Should be true

        // Test no overlap
        console.log('Shift1 and Shift4 overlap (no overlap):', this.shiftsOverlap(testShift1, testShift4)); // Should be false

        console.log('Overlap detection test completed.');
    },

    // Add test shifts for payroll card testing (for development/debugging)
    addTestPayrollShifts() {
        console.log('Adding test payroll shifts...');

        const now = new Date();
        const currentMonth = now.getMonth(); // 0-based
        const currentYear = now.getFullYear();

        // Add shifts for the previous month
        const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

        // Create test shifts for previous month
        const testShifts = [
            {
                id: 'test-payroll-1',
                date: new Date(previousYear, previousMonth, 5),
                startTime: '09:00',
                endTime: '17:00',
                type: 0, // Weekday
                seriesId: null
            },
            {
                id: 'test-payroll-2',
                date: new Date(previousYear, previousMonth, 12),
                startTime: '10:00',
                endTime: '18:00',
                type: 0, // Weekday
                seriesId: null
            },
            {
                id: 'test-payroll-3',
                date: new Date(previousYear, previousMonth, 19),
                startTime: '08:00',
                endTime: '16:00',
                type: 1, // Saturday
                seriesId: null
            },
            {
                id: 'test-payroll-4',
                date: new Date(previousYear, previousMonth, 26),
                startTime: '09:00',
                endTime: '17:00',
                type: 0, // Weekday
                seriesId: null
            }
        ];

        // Add to shifts array
        testShifts.forEach(shift => {
            this.shifts.push(shift);
        });

        console.log(`Added ${testShifts.length} test shifts for payroll card testing`);
        this.updateDisplay();
    },

    // Add test overlapping shifts for demonstration (for development/debugging)
    addTestOverlappingShifts() {
        console.log('Adding test overlapping shifts...');

        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        // Create overlapping shifts for today
        const testShifts = [
            {
                id: 'test-overlap-1',
                date: new Date(today),
                startTime: '09:00',
                endTime: '17:00',
                type: 0,
                seriesId: null
            },
            {
                id: 'test-overlap-2',
                date: new Date(today),
                startTime: '16:00',
                endTime: '22:00',
                type: 0,
                seriesId: null
            },
            {
                id: 'test-overlap-3',
                date: new Date(today),
                startTime: '23:00',
                endTime: '07:00', // Crosses midnight
                type: 0,
                seriesId: null
            },
            {
                id: 'test-overlap-4',
                date: new Date(tomorrow),
                startTime: '06:00',
                endTime: '14:00',
                type: 0,
                seriesId: null
            }
        ];

        // Add to shifts array
        testShifts.forEach(shift => {
            this.shifts.push(shift);
        });

        // Refresh UI to show the overlapping shifts with warning indicators
        this.refreshUI();

        console.log('Test overlapping shifts added. Check the shift list for warning indicators.');
    },
    formatCurrency(amount) {
        const currencySuffix = this.currencyFormat ? ' NOK' : ' kr';
        return Math.round(amount).toLocaleString('nb-NO') + currencySuffix;
    },
    formatCurrencyShort(amount) {
        return Math.round(amount).toLocaleString('nb-NO');
    },
    formatCurrencyCalendar(amount) {
        return Math.round(amount).toLocaleString('nb-NO');
    },
    formatCurrencyDetailed(amount) {
        const currencySuffix = this.currencyFormat ? ' NOK' : ' kr';
        return amount.toFixed(2).replace('.', ',') + currencySuffix;
    },

    // Render the employee work summary table in employees view
    renderEmployeeWorkSummary() {
        try {
            const container = document.getElementById('employeeWorkSummary') || document.getElementById('employeesContent');
            if (!container) return;

            // Only show when a specific employee is selected
            const selectedEmployee = this.getSelectedEmployee?.();
            if (!selectedEmployee) {
                if (container.id === 'employeeWorkSummary') container.innerHTML = '';
                return;
            }

            // Ensure break deduction in employees view follows organization policy (Bedrift)
            const policy = this.orgSettings?.break_policy;
            const mappedMethod = policy === 'proportional_across_periods' ? 'proportional'
                                : policy === 'from_base_rate' ? 'base_only'
                                : policy === 'fixed_0_5_over_5_5h' ? 'end_of_shift'
                                : policy === 'none' ? 'none'
                                : this.pauseDeductionMethod;
            const prevMethod = this.pauseDeductionMethod;
            const prevEnabled = this.pauseDeductionEnabled;
            let restored = false;
            const restoreDeduction = () => {
                if (restored) return;
                this.pauseDeductionMethod = prevMethod;
                this.pauseDeductionEnabled = prevEnabled;
                restored = true;
            };
            this.pauseDeductionMethod = mappedMethod;
            // Keep enabled so audit trail includes wagePeriods even when method is 'none'
            this.pauseDeductionEnabled = true;

            // Filter shifts to current month/year for selected employee
            const monthShifts = (this.shifts || []).filter(shift =>
                shift.employee_id === selectedEmployee.id &&
                shift.date.getMonth() === this.currentMonth - 1 &&
                shift.date.getFullYear() === this.currentYear
            );

            // New aggregation model:
            // - Base (Grunnlønn): all paid hours per wage rate
            // - UB rows: per UB slot (e.g., "UB 18–24") with UB rate only and slot-duration hours
            const baseAggregation = new Map(); // key: wageRate -> { hours, rate, pay }
            const ubAggregation = new Map();   // key: `${from}-${to}|${rate}` -> { label, rate, hours, pay, sortKey }

            const asDisplay = (hhmm) => {
                if (hhmm === '23:59') return '24';
                const [h, m] = hhmm.split(':');
                return m === '00' ? `${parseInt(h, 10)}` : `${h}:${m}`;
            };

            for (const shift of monthShifts) {
                const startMinutes = this.timeToMinutes(shift.startTime);
                let endMinutes = this.timeToMinutes(shift.endTime);
                if (endMinutes <= startMinutes) endMinutes += 24 * 60;

                const wageRate = this.getWageRateForShift(shift);
                const bonuses = this.PRESET_BONUSES;
                const breakResult = this.calculateLegalBreakDeduction(shift, wageRate, bonuses, startMinutes, endMinutes);

                // Determine paid hours for base row
                let paidHoursForShift;
                if (breakResult?.shouldDeduct && (breakResult.method === 'proportional' || breakResult.method === 'base_only')) {
                    const adj = this.calculateAdjustedWages(breakResult, wageRate);
                    paidHoursForShift = adj.totalHours;
                } else {
                    const durationHours = (endMinutes - startMinutes) / 60;
                    paidHoursForShift = breakResult?.shouldDeduct ? Math.max(0, durationHours - (breakResult.deductionHours || 0)) : durationHours;
                }

                // Accumulate base hours per wage rate
                const baseEntry = baseAggregation.get(wageRate) || { hours: 0, rate: wageRate, pay: 0 };
                baseEntry.hours += paidHoursForShift;
                baseEntry.pay = baseEntry.hours * baseEntry.rate;
                baseAggregation.set(wageRate, baseEntry);

                // Build wage periods for UB accumulation, respecting deduction method
                let wagePeriods = [];
                if (breakResult?.method === 'end_of_shift' && breakResult.shouldDeduct) {
                    // Recalculate periods with adjusted end time
                    wagePeriods = this.calculateWagePeriods(shift, wageRate, bonuses, startMinutes, breakResult.adjustedEndMinutes);
                } else if (breakResult?.auditTrail?.wagePeriods && breakResult.auditTrail.wagePeriods.length > 0) {
                    wagePeriods = breakResult.auditTrail.wagePeriods.map(p => ({ ...p }));
                } else {
                    wagePeriods = this.calculateWagePeriods(shift, wageRate, bonuses, startMinutes, endMinutes);
                }

                // Adjust period durations for proportional method
                if (breakResult?.shouldDeduct && breakResult.method === 'proportional') {
                    const totalH = wagePeriods.reduce((s, p) => s + p.durationHours, 0) || 1;
                    const deduction = breakResult.deductionHours || 0;
                    wagePeriods = wagePeriods.map(p => {
                        const d = deduction * (p.durationHours / totalH);
                        return { ...p, durationHours: Math.max(0, p.durationHours - d) };
                    });
                }
                // Base-only: UB durations remain unchanged (deduction from base-only handled in base hours above)

                // Accumulate UB per slot
                for (const p of wagePeriods) {
                    if (!p || p.durationHours <= 0) continue;
                    const duration = p.durationHours;
                    for (const slot of (p.bonuses || [])) {
                        const key = `${slot.from}-${slot.to}|${slot.rate}`;
                        const label = `UB ${asDisplay(slot.from)}-${asDisplay(slot.to)}`;
                        const entry = ubAggregation.get(key) || { label, rate: slot.rate, hours: 0, pay: 0, sortKey: this.timeToMinutes(slot.from) };
                        entry.hours += duration;
                        entry.pay = entry.hours * entry.rate;
                        ubAggregation.set(key, entry);
                    }
                }
            }

            // Build table rows: base first, then UB rows by time
            const baseRows = Array.from(baseAggregation.values())
                .sort((a, b) => a.rate - b.rate)
                .map(item => ({ label: 'Grunnlønn', rate: item.rate, hours: item.hours, pay: item.pay, group: 'base' }));

            const ubRows = Array.from(ubAggregation.values())
                .sort((a, b) => a.sortKey - b.sortKey || a.rate - b.rate)
                .map(item => ({ label: item.label, rate: item.rate, hours: item.hours, pay: item.pay, group: 'ub' }));

            const allRows = [...baseRows, ...ubRows];
            const rows = allRows.map(item => `
                <tr>
                    <td class="col-type">${item.label}</td>
                    <td class="col-rate">${this.formatCurrencyDetailed(item.rate)}</td>
                    <td class="col-hours">${item.hours.toFixed(2).replace('.', ',')} t</td>
                    <td class="col-pay">${this.formatCurrencyDetailed(item.pay)}</td>
                </tr>
            `).join('');

            const totalHours = baseRows.reduce((s, r) => s + r.hours, 0);
            const totalPay = allRows.reduce((s, r) => s + r.pay, 0);

            const html = `
                <div class="employee-work-summary-header">
                    <h3 style="margin:0 0 12px 0;">${selectedEmployee.name}</h3>
                </div>
                <div class="employee-work-summary-table-wrapper">
                    <table class="employee-work-summary-table">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Sats</th>
                                <th>Timer</th>
                                <th>Beløp</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows || '<tr><td colspan="4" style="text-align:center;color:var(--text-secondary);padding:16px;">Ingen vakter i valgt måned</td></tr>'}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td>Totalt</td>
                                <td></td>
                                <td>${totalHours.toFixed(2).replace('.', ',')} t</td>
                                <td>${this.formatCurrencyDetailed(totalPay)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            `;

            if (container.id === 'employeeWorkSummary') {
                container.innerHTML = html;
            } else {
                // Fallback: render directly into employeesContent
                container.innerHTML = `<div class="employee-work-summary" id="employeeWorkSummary">${html}</div>`;
            }
            // Restore previous deduction preferences
            restoreDeduction();
        } catch (error) {
            console.error('Error rendering employee work summary:', error);
            // Always restore on error
            try {
                this.pauseDeductionMethod = this.pauseDeductionMethod ?? this.pauseDeductionMethod; // no-op guard
            } finally {
                // Best-effort restoration to previous values
                // If prev values are not in scope, ignore
            }
        }
    },
    formatHours(hours) {
        return hours.toFixed(2).replace('.', ',') + 't';
    },

    formatTimeShort(timeString) {
        // Format time string (HH:MM) to remove :00 for whole hours
        const [hours, minutes] = timeString.split(':');
        if (minutes === '00') {
            return hours;
        }
        return timeString;
    },

    // Settings management methods
    updateWageLevel(level) {
        // Convert to integer (handles both positive and negative values)
        this.currentWageLevel = parseInt(level);
        this.updateDisplay();
        this.saveSettingsToSupabase();
    },

    updateCustomWage(wage) {
        this.customWage = parseFloat(wage) || 200;
        this.updateDisplay();
        this.saveSettingsToSupabase();
    },

    // Capture custom bonuses from UI form elements
    captureCustomBonusesFromUI() {
        const capturedBonuses = {};
        const types = ['weekday', 'saturday', 'sunday'];

        types.forEach(type => {
            capturedBonuses[type] = [];
            const container = document.getElementById(`${type}BonusSlots`);

            if (container) {
                const slots = container.querySelectorAll('.bonus-slot');

                slots.forEach((slot, index) => {
                    const inputs = slot.querySelectorAll('input');
                    if (inputs.length >= 3) {
                        const from = inputs[0].value;
                        const to = inputs[1].value;
                        const rate = inputs[2].value;

                        // Capture all slots, even if partially filled (validation happens later)
                        capturedBonuses[type].push({
                            from: from,
                            to: to,
                            rate: parseFloat(rate) || 0
                        });
                    }
                });
            }
        });

        return capturedBonuses;
    },

    async saveCustomBonuses() {

        // Use the new improved capture system
        const capturedBonuses = this.captureCustomBonusesFromUI();

        // Apply stricter validation only for the final save
        const validatedBonuses = {};
        ['weekday', 'saturday', 'sunday'].forEach(type => {
            validatedBonuses[type] = [];

            if (capturedBonuses[type]) {
                capturedBonuses[type].forEach(bonus => {
                    if (bonus.from && bonus.to && bonus.rate && !isNaN(bonus.rate) && bonus.rate > 0) {
                        validatedBonuses[type].push({
                            from: bonus.from,
                            to: bonus.to,
                            rate: parseFloat(bonus.rate)
                        });
                    }
                });
            }
        });

        // Update with validated bonuses
        this.customBonuses = validatedBonuses;

        // Show save status to user
        this.showSaveStatus('Lagrer tillegg...');

        try {
            // Save immediately to ensure we capture the latest data
            this.updateDisplay();
            await this.saveSettingsToSupabase();
            this.saveToLocalStorage(); // Also save to localStorage as backup

            this.showSaveStatus('Tillegg lagret ✓');

            // Show confirmation
            alert('Tillegg lagret!');
        } catch (error) {
            console.error('Error saving custom bonuses:', error);
            this.showSaveStatus('Feil ved lagring!');
            alert('Feil ved lagring av tillegg!');
        }
    },

    // Silent version of saveCustomBonuses for auto-save (no alerts or status messages)
    async saveCustomBonusesSilent() {
        try {

            // Use the new improved capture system
            const capturedBonuses = this.captureCustomBonusesFromUI();

            // Apply validation for final save
            const validatedBonuses = {};
            ['weekday', 'saturday', 'sunday'].forEach(type => {
                validatedBonuses[type] = [];

                if (capturedBonuses[type]) {
                    capturedBonuses[type].forEach(bonus => {
                        if (bonus.from && bonus.to && bonus.rate && !isNaN(bonus.rate) && bonus.rate > 0) {
                            validatedBonuses[type].push({
                                from: bonus.from,
                                to: bonus.to,
                                rate: parseFloat(bonus.rate)
                            });
                        }
                    });
                }
            });

            // Update with validated bonuses
            this.customBonuses = validatedBonuses;

            // Save to both Supabase and localStorage without user feedback
            this.updateDisplay();
            await this.saveSettingsToSupabase();
            this.saveToLocalStorage();

        } catch (error) {
            console.error('Error in saveCustomBonusesSilent:', error);
        }
    },

    async deleteShift(index) {
        const shift = this.shifts[index];
        if (shift.seriesId) {
            // Ask if deleting entire series
            if (confirm('Denne vakten er del av en serie. Vil du slette hele serien?')) {
                const deleteSeriesSuccess = await this.deleteSeries(shift.seriesId);
                return deleteSeriesSuccess;
            }
            // If user declines to delete series, continue to delete just this individual shift
            // by falling through to the normal deletion logic below
        }

        const shiftToDelete = this.shifts[index];
        if (!shiftToDelete || !shiftToDelete.id) return false;

        // Show confirmation dialog IMMEDIATELY
        if (!confirm('Er du sikker på at du vil slette denne vakten?')) return false;

        try {
            // THEN check authentication
            const { data: { user } } = await window.supa.auth.getUser();
            if (!user) {
                alert("Du er ikke innlogget");
                return false;
            }

            const { error } = await window.supa
                .from('user_shifts')
                .delete()
                .eq('id', shiftToDelete.id);

            if (error) {
                console.error('Error deleting shift:', error);
                alert('Kunne ikke slette vakt fra databasen');
                return false;
            }

            // Remove from local arrays
            this.shifts.splice(index, 1);
            const userIndex = this.userShifts.findIndex(s => s.id === shiftToDelete.id);
            if (userIndex !== -1) {
                this.userShifts.splice(userIndex, 1);
            }

            this.refreshUI(this.shifts);
            return true;
        } catch (e) {
            console.error('Error in deleteShift:', e);
            alert('En feil oppstod ved sletting av vakt');
            return false;
        }
    },

    async clearAllShifts() {
        if (!confirm('Er du sikker på at du vil slette alle vakter? Dette kan ikke angres.')) {
            return;
        }

        try {
            const { data: { user } } = await window.supa.auth.getUser();
            if (!user) return;

            // Delete all shifts
            const { error: shiftsError } = await window.supa
                .from('user_shifts')
                .delete()
                .eq('user_id', user.id);

            if (shiftsError) {
                console.error('Error deleting shifts:', shiftsError);
                alert('Kunne ikke slette vakter fra databasen');
                return;
            }

            // Reset local shift state
            this.shifts = [];
            this.userShifts = [];
            this.updateDisplay();

            // Clear chat log
            if (window.chatbox && window.chatbox.clear) {
                window.chatbox.clear();
            }

            alert('Alle vakter er slettet');

        } catch (e) {
            console.error('Error in clearAllShifts:', e);
            alert('En feil oppstod ved sletting av vakter');
        }
    },

    async clearAllData() {
        if (!confirm('Er du sikker på at du vil slette alle vakter og innstillinger? Dette kan ikke angres.')) {
            return;
        }

        try {
            const { data: { user } } = await window.supa.auth.getUser();
            if (!user) return;

            // Delete all shifts
            const { error: shiftsError } = await window.supa
                .from('user_shifts')
                .delete()
                .eq('user_id', user.id);

            if (shiftsError) {
                console.error('Error deleting shifts:', shiftsError);
            }

            // Delete user settings
            const { error: settingsError } = await window.supa
                .from('user_settings')
                .delete()
                .eq('user_id', user.id);

            if (settingsError) {
                console.error('Error deleting settings:', settingsError);
            }

            // Reset local state
            this.shifts = [];
            this.userShifts = [];
            this.setDefaultSettings();
            this.updateSettingsUI();
            this.updateDisplay();

            // Clear chat log
            if (window.chatbox && window.chatbox.clear) {
                window.chatbox.clear();
            }

            alert('Alle data er slettet');

        } catch (e) {
            console.error('Error in clearAllData:', e);
            alert('En feil oppstod ved sletting av data');
        }
    },

    // Edit shift functionality
    editShift(shiftId) {
        // Find the shift to edit
        const shift = this.shifts.find(s => s.id === shiftId);
        if (!shift) {
            console.error('Shift not found:', shiftId);
            return;
        }


        // Store the shift being edited
        this.editingShift = shift;

        // Close shift details modal first and wait for it to complete
        this.closeShiftDetails();


        // Ensure employee selectors visibility follows current view
        this.toggleEmployeeSelectorsVisibility(this.currentView === 'employees');

        // Reduced delay for smoother transition - just wait for backdrop animation
        setTimeout(() => {
            this.openEditModal(shift);
        }, 200); // 200ms for smoother transition
    },

    // Separate method to open edit modal for better organization
    openEditModal(shift) {
        const editModal = document.getElementById('editShiftModal');
        if (editModal) {
            editModal.style.display = 'flex';
            editModal.classList.add('active');

            // Populate the edit form with current shift data
            this.populateEditForm(shift);

            // Reflect employee context in edit modal (pill vs selectors) when in employees view
            this.updateEmployeeAssignmentUIInEditModal?.(shift);

            // Hide header
            const header = document.querySelector('.header');
            if (header) {
                header.classList.add('hidden');
            }

            // Hide floating action bar when modal opens to prevent z-index conflicts
            const floatingBar = document.querySelector('.floating-action-bar');
            const floatingBarBackdrop = document.querySelector('.floating-action-bar-backdrop');
            if (floatingBar) {
                floatingBar.style.display = 'none';
            }
            if (floatingBarBackdrop) {
                floatingBarBackdrop.style.display = 'none';
            }

            // Add backdrop click handler
            const backdrop = editModal.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.onclick = () => this.closeEditShift();
            }

            // Add keyboard support
            const keydownHandler = (e) => {
                if (e.key === 'Escape') {
                    this.closeEditShift();
                }
            };
            document.addEventListener('keydown', keydownHandler);
            editModal.dataset.keydownHandler = 'attached';
        }
    },

    closeEditShift() {
        const editModal = document.getElementById('editShiftModal');
        if (editModal) {
            editModal.style.display = 'none';
            editModal.classList.remove('active');

            // Show header again
            const header = document.querySelector('.header');
            if (header) {
                header.classList.remove('hidden');
            }

            // Remove keyboard listener
            if (editModal.dataset.keydownHandler) {
                document.removeEventListener('keydown', (e) => {
                    if (e.key === 'Escape') {
                        this.closeEditShift();
                    }
                });
                delete editModal.dataset.keydownHandler;
            }

            // Restore floating action bar visibility when modal closes
            const floatingBar = document.querySelector('.floating-action-bar');
            const floatingBarBackdrop = document.querySelector('.floating-action-bar-backdrop');
            if (floatingBar) {
                floatingBar.style.display = '';
            }
            if (floatingBarBackdrop) {
                floatingBarBackdrop.style.display = '';
            }

            // Clear editing state
            this.editingShift = null;
            this.editSelectedDate = null;

            // Clear form
            document.getElementById('editShiftForm').reset();

            // Remove selected state from date grid
            document.querySelectorAll('#editDateGrid .date-cell').forEach(cell => {
                cell.classList.remove('selected');
            });
        }
    },

    populateEditForm(shift) {
        // Populate time selects first
        this.populateEditTimeSelects();

        // Populate date grid
        this.populateEditDateGrid();

        // Set the selected date
        this.editSelectedDate = new Date(shift.date);

        // Set time values
        const [startHour, startMinute] = shift.startTime.split(':');
        const [endHour, endMinute] = shift.endTime.split(':');

        document.getElementById('editStartHour').value = startHour;
        document.getElementById('editStartMinute').value = startMinute || '00';
        document.getElementById('editEndHour').value = endHour;
        document.getElementById('editEndMinute').value = endMinute || '00';

        // Populate employee selectors and set current employee
        this.populateEmployeeSelectors();
        const editEmployeeSelect = document.getElementById('editEmployeeSelect');
        if (editEmployeeSelect && shift.employee_id) {
            editEmployeeSelect.value = shift.employee_id;
        }

        // Highlight the selected date in the grid
        setTimeout(() => {
            const dateDay = shift.date.getDate();
            const dateCell = document.querySelector(`#editDateGrid .date-cell[data-day="${dateDay}"]`);
            if (dateCell) {
                dateCell.classList.add('selected');
            }
        }, 100);
    },

    // Show selected employee pill in edit modal (employees view) and hide dropdown
    updateEmployeeAssignmentUIInEditModal(shift) {
        try {
            const modal = document.getElementById('editShiftModal');
            if (!modal) return;

            const form = modal.querySelector('#editShiftForm');
            if (!form) return;

            // Remove any existing pill
            const existing = document.getElementById('editSelectedEmployeePill');
            if (existing) existing.remove();

            // Only show pill in employees view
            const inEmployees = this.currentView === 'employees';
            if (!inEmployees) return;

            // Derive which employee to show: selectedEmployeeId takes precedence, else from the shift
            const employeeId = this.selectedEmployeeId || shift?.employee_id || null;
            const employee = employeeId ? (this.employees.find(e => e.id === employeeId) || null) : null;

            // Hide the dropdown group in employees view
            const editSelect = modal.querySelector('#editEmployeeSelect');
            const group = editSelect?.closest('.form-group') || editSelect?.parentElement;
            if (group) group.style.display = 'none';

            // If we have an employee, render the pill
            if (employee) {
                const pill = document.createElement('div');
                pill.id = 'editSelectedEmployeePill';
                pill.className = 'selected-employee-pill';
                pill.style.cssText = 'display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:9999px;background:var(--bg-secondary);border:1px solid var(--border-color);margin:8px 0;';
                const colorDot = document.createElement('span');
                colorDot.style.cssText = `width:10px;height:10px;border-radius:9999px;background:${this.getEmployeeDisplayColor?.(employee) || employee.display_color || '#999'};display:inline-block;`;
                const label = document.createElement('span');
                label.textContent = employee.name;
                label.style.fontWeight = '600';
                pill.appendChild(colorDot);
                pill.appendChild(label);

                // Insert pill at top of the form, after the heading (before date selector)
                form.insertBefore(pill, form.firstChild);

                // Ensure the select reflects the same employee internally (for any fallback logic)
                if (editSelect) {
                    editSelect.value = employee.id;
                }

                // Make the pill clickable to open Edit Employee modal
                if (!pill.dataset.boundEdit) {
                    pill.style.cursor = 'pointer';
                    pill.setAttribute('role', 'button');
                    pill.setAttribute('tabindex', '0');
                    pill.title = 'Rediger ansatt';
                    pill.addEventListener('click', (e) => {
                        try {
                            e.preventDefault();
                            e.stopPropagation();
                        } catch (_) {}
                        this.showEditEmployeeModal(employee);
                    });
                    pill.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            this.showEditEmployeeModal(employee);
                        }
                    });
                    pill.dataset.boundEdit = '1';
                }
            }
        } catch (e) {
            console.warn('updateEmployeeAssignmentUIInEditModal error:', e);
        }
    },

    populateEditTimeSelects() {
        if (this.directTimeInput) {
            // Replace dropdowns with text inputs for direct time entry
            this.replaceEditTimeDropdownsWithInputs();
        } else {
            // Use dropdowns
            this.ensureEditTimeDropdowns();

            const hourOptions = Array.from({length: 24}, (_, i) =>
                `<option value="${i.toString().padStart(2, '0')}">${i.toString().padStart(2, '0')}</option>`
            ).join('');

            let minuteOptions;
            if (this.fullMinuteRange) {
                // Full minute range 00-59
                minuteOptions = Array.from({length: 60}, (_, i) =>
                    `<option value="${i.toString().padStart(2, '0')}">${i.toString().padStart(2, '0')}</option>`
                ).join('');
            } else {
                // 15-minute intervals (default)
                minuteOptions = ['00', '15', '30', '45'].map(m =>
                    `<option value="${m}">${m}</option>`
                ).join('');
            }

            document.getElementById('editStartHour').innerHTML = '<option value="">Fra time</option>' + hourOptions;
            document.getElementById('editStartMinute').innerHTML = '<option value="">Fra minutt</option>' + minuteOptions;
            document.getElementById('editEndHour').innerHTML = '<option value="">Til time</option>' + hourOptions;
            document.getElementById('editEndMinute').innerHTML = '<option value="">Til minutt</option>' + minuteOptions;
        }
    },

    replaceEditTimeDropdownsWithInputs() {
        const timeInputs = [
            { id: 'editStartHour', placeholder: 'Fra time (HH)' },
            { id: 'editStartMinute', placeholder: 'Fra minutt (MM)' },
            { id: 'editEndHour', placeholder: 'Til time (HH)' },
            { id: 'editEndMinute', placeholder: 'Til minutt (MM)' }
        ];

        timeInputs.forEach(input => {
            const element = document.getElementById(input.id);
            if (element && element.tagName === 'SELECT') {
                const currentValue = element.value;
                const newInput = document.createElement('input');
                newInput.type = 'text';
                newInput.id = input.id;
                newInput.className = 'form-control time-input';
                newInput.placeholder = input.placeholder;
                newInput.maxLength = 2;
                newInput.pattern = '[0-9]{2}';
                newInput.value = currentValue;

                // Add input validation
                newInput.addEventListener('input', (e) => {
                    let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                    if (value.length > 2) value = value.slice(0, 2);

                    if (input.id.includes('Hour')) {
                        // Validate hours (00-23)
                        const hour = parseInt(value);
                        if (value.length === 2 && hour > 23) {
                            value = value.slice(0, 1);
                        }
                    } else {
                        // Validate minutes (00-59)
                        const minute = parseInt(value);
                        if (value.length === 2 && minute > 59) {
                            value = value.slice(0, 1);
                        }
                    }

                    e.target.value = value;
                });

                // Auto-pad with zero when leaving field
                newInput.addEventListener('blur', (e) => {
                    if (e.target.value.length === 1) {
                        e.target.value = '0' + e.target.value;
                    }
                });

                element.replaceWith(newInput);
            }
        });
    },

    ensureEditTimeDropdowns() {
        const timeSelects = ['editStartHour', 'editStartMinute', 'editEndHour', 'editEndMinute'];

        timeSelects.forEach(id => {
            const element = document.getElementById(id);
            if (element && element.tagName === 'INPUT') {
                const currentValue = element.value;
                const newSelect = document.createElement('select');
                newSelect.id = id;
                newSelect.className = 'form-control';

                element.replaceWith(newSelect);
            }
        });
    },

    populateEditDateGrid() {
        const grid = document.getElementById('editDateGrid');
        if (!grid) return;

        grid.innerHTML = '';

        const year = this.currentYear;
        const month = this.currentMonth - 1; // Convert to 0-based
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        const offset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
        startDate.setDate(startDate.getDate() - offset);

        // Get shifts for the current month to show blue dots
        const monthShifts = this.shifts.filter(shift =>
            shift.date.getMonth() === month &&
            shift.date.getFullYear() === year
        );

        // Create a lookup for dates with shifts
        const shiftDates = new Set();
        monthShifts.forEach(shift => {
            shiftDates.add(shift.date.getDate());
        });

        // Add week number header
        const weekHeader = document.createElement('div');
        weekHeader.textContent = '';
        weekHeader.className = 'week-number header';
        grid.appendChild(weekHeader);

        // Add day headers
        ['M','T','O','T','F','L','S'].forEach(day => {
            const hdr = document.createElement('div');
            hdr.textContent = day;
            hdr.style.cssText = 'font-weight:600;font-size:12px;color:var(--text-secondary);text-align:center;padding:8px;';
            grid.appendChild(hdr);
        });

        // Add calendar cells (42 cells for 6 weeks, like main calendar)
        for (let i = 0; i < 42; i++) {
            // Add week number at the start of each row (every 7 cells)
            if (i % 7 === 0) {
                const weekDate = new Date(startDate);
                weekDate.setDate(startDate.getDate() + i);
                const weekNum = this.getISOWeekNumber(weekDate);
                const weekCell = document.createElement('div');
                weekCell.className = 'week-number';
                weekCell.textContent = weekNum;
                grid.appendChild(weekCell);
            }
            const cellDate = new Date(startDate);
            cellDate.setDate(startDate.getDate() + i);
            const cell = document.createElement('div');
            cell.className = 'date-cell';

            // Create cell content wrapper
            const cellContent = document.createElement('div');
            cellContent.className = 'date-cell-content';
            cellContent.textContent = cellDate.getDate();

            // Add blue dot if this date has shifts
            if (cellDate.getMonth() === month && shiftDates.has(cellDate.getDate())) {
                const dot = document.createElement('div');
                dot.className = 'shift-indicator-dot';
                cellContent.appendChild(dot);
                cell.classList.add('has-shift');
            }

            // Add current date class if this is today
            const today = new Date();
            if (cellDate.getDate() === today.getDate() &&
                cellDate.getMonth() === today.getMonth() &&
                cellDate.getFullYear() === today.getFullYear()) {
                cell.classList.add('current-date');
            }

            cell.appendChild(cellContent);
            cell.dataset.day = cellDate.getDate();

            // Mark out-of-month cells as disabled (like main calendar)
            if (cellDate.getMonth() !== month) {
                cell.classList.add('disabled');
            } else {
                // Add day type classes for current month dates
                const dayOfWeek = cellDate.getDay();
                if (dayOfWeek === 0) cell.classList.add('sunday');
                else if (dayOfWeek === 6) cell.classList.add('saturday');
                else cell.classList.add('weekday');

                // Add click handler only for current month dates
                cell.addEventListener('click', () => {
                    // Remove previous selection
                    document.querySelectorAll('#editDateGrid .date-cell').forEach(c => c.classList.remove('selected'));

                    // Add selection to clicked cell
                    cell.classList.add('selected');

                    // Store selected date
                    this.editSelectedDate = new Date(cellDate);
                });
            }

            grid.appendChild(cell);
        }
    },

    async updateShift() {

        if (!this.editingShift) {
            console.error('No shift being edited');
            alert('Ingen vakt valgt for redigering');
            return;
        }

        try {
            // Validate input
            if (!this.editSelectedDate) {
                alert('Vennligst velg en dato');
                return;
            }

            const startHour = document.getElementById('editStartHour').value;
            const startMinute = document.getElementById('editStartMinute').value || '00';
            const endHour = document.getElementById('editEndHour').value;
            const endMinute = document.getElementById('editEndMinute').value || '00';

            if (!startHour || !endHour) {
                alert('Vennligst fyll ut arbeidstid');
                return;
            }

            const newDateStr = `${this.editSelectedDate.getFullYear()}-${(this.editSelectedDate.getMonth() + 1).toString().padStart(2, '0')}-${this.editSelectedDate.getDate().toString().padStart(2, '0')}`;
            const newStart = `${startHour}:${startMinute}`;
            const newEnd = `${endHour}:${endMinute}`;

            // Employees view: resolve row id by old composite keys, then update via server API
            if (this.currentView === 'employees') {
                const { data: { session } } = await window.supa.auth.getSession();
                if (!session) { alert('Du er ikke innlogget'); return; }

                const headers = {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                };

                const employeeSelectEl = document.getElementById('editEmployeeSelect');
                const selectedEmployeeId = employeeSelectEl ? (employeeSelectEl.value || null) : null;

                const body = {
                    shift_date: newDateStr,
                    start_time: newStart,
                    end_time: newEnd
                };
                if (selectedEmployeeId) {
                    body.employee_id = selectedEmployeeId;
                }
                
                // Prefer direct id from the editing shift (no server lookup); fallback to lookup if missing
                let targetId = this.editingShift?.id || null;
                if (!targetId) {
                    const oldDate = this.editingShift?.date instanceof Date
                        ? `${this.editingShift.date.getFullYear()}-${String(this.editingShift.date.getMonth() + 1).padStart(2, '0')}-${String(this.editingShift.date.getDate()).padStart(2, '0')}`
                        : newDateStr;
                    const empIdForLookup = this.editingShift?.employee_id || selectedEmployeeId || this.selectedEmployeeId || null;
                    if (!empIdForLookup) {
                        alert('Kunne ikke finne ansatt for vakten. Oppdater siden og prøv igjen.');
                        return;
                    }
                    const lookupParams = new URLSearchParams({
                        from: oldDate,
                        to: oldDate,
                        limit: '200',
                        employee_id: empIdForLookup,
                        bust: String(Date.now())
                    });
                    const lookupResp = await fetch(`${window.CONFIG.apiBase}/employee-shifts?${lookupParams.toString()}`, {
                        headers,
                        cache: 'no-store'
                    });
                    if (!lookupResp.ok) {
                        alert('Kunne ikke hente eksisterende vakt for oppdatering.');
                        return;
                    }
                    const { shifts: rows = [] } = await lookupResp.json().catch(() => ({ shifts: [] }));
                    const oldStart = this.editingShift?.startTime;
                    const oldEnd = this.editingShift?.endTime;
                    let target = rows.find(r => r.start_time === oldStart && r.end_time === oldEnd);
                    if (!target && rows.length === 1) target = rows[0];
                    if (!target || !target.id) {
                        alert('Fant ikke vakten å oppdatere. Last inn på nytt og prøv igjen.');
                        return;
                    }
                    targetId = target.id;
                }

                const resp = await fetch(`${window.CONFIG.apiBase}/employee-shifts/${targetId}`, {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify(body)
                });
                if (!resp.ok) {
                    const e = await resp.json().catch(() => ({}));
                    console.error('updateShift (employee) failed:', e);
                    alert(e.error || 'Kunne ikke oppdatere vakt');
                    return;
                }

                // Refresh employee shifts to reflect updated snapshots and policies
                await this.fetchAndDisplayEmployeeShifts?.();
                this.closeEditShift();
                alert('Vakt oppdatert!');
                return;
            }

            // Default (dashboard) view: update personal shift directly in user_shifts
            const { data: { user }, error: authError } = await window.supa.auth.getUser();
            if (authError || !user) { alert('Feil ved autentisering'); return; }

            const dayOfWeek = this.editSelectedDate.getDay();
            const type = dayOfWeek === 0 ? 2 : (dayOfWeek === 6 ? 1 : 0);

            const updatedShiftData = {
                shift_date: newDateStr,
                start_time: newStart,
                end_time: newEnd,
                shift_type: type,
                series_id: null
            };

            const { data: updated, error } = await window.supa
                .from('user_shifts')
                .update(updatedShiftData)
                .eq('id', this.editingShift.id)
                .eq('user_id', user.id)
                .select()
                .single();

            if (error) {
                console.error('updateShift: Database error when updating shift:', error);
                alert(`Kunne ikke oppdatere vakt i databasen: ${error.message}`);
                return;
            }

            // Update local shift objects
            const originalShift = this.editingShift;
            originalShift.date = new Date(this.editSelectedDate);
            originalShift.startTime = newStart;
            originalShift.endTime = newEnd;
            originalShift.type = type;
            originalShift.seriesId = null;

            // Update both userShifts and shifts arrays
            const userShiftIndex = this.userShifts.findIndex(s => s.id === originalShift.id);
            if (userShiftIndex !== -1) {
                this.userShifts[userShiftIndex] = { ...originalShift };
            }

            this.shifts = [...this.userShifts];

            // Update display
            this.refreshUI(this.shifts);

            // Close edit modal and confirm
            this.closeEditShift();
            alert('Vakt oppdatert!');

        } catch (e) {
            console.error('updateShift: Critical error:', e);
            alert(`En uventet feil oppstod: ${e.message}`);
        }
    },

    // Feature introduction for recurring shifts
    showRecurringIntroduction() {
        // Close any open modals first
        this.closeSettings(false); // Don't save settings when closing as cleanup
        this.closeAddShiftModal();
        this.closeEditShift();

        // Create modal HTML
        const modalHtml = `
            <div id="recurringIntroModal" class="modal" style="display: flex;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">✨ Ny funksjon: Gjentakende vakter</h2>
                    </div>
                    <div class="modal-body" style="padding: 20px;">
                        <div style="margin-bottom: 16px;">
                            <p style="margin-bottom: 12px; font-size: 15px;">Vi har lagt til en ny måte å legge inn faste vakter på!</p>

                            <div style="background: var(--bg-secondary); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
                                <h4 style="margin: 0 0 8px 0; color: var(--accent); font-size: 14px;">Slik fungerer det:</h4>
                                <ul style="margin: 0; padding-left: 16px; line-height: 1.4; font-size: 14px; text-align: left;">
                                    <li>Trykk på "Legg til vakt"-knappen</li>
                                    <li>Velg "Gjentakende" i stedet for "Enkel"</li>
                                    <li>Bestem hvor ofte vakten gjentas</li>
                                    <li>Systemet legger til alle vaktene automatisk</li>
                                </ul>
                            </div>

                            <div style="background: var(--accent-light); padding: 12px; border-radius: 8px; border-left: 4px solid var(--accent);">
                                <p style="margin: 0; font-weight: 500; color: var(--text-primary); line-height: 1.4; font-size: 14px;">
                                    💡 <strong>Tips:</strong> Har du en fast vakt som gjentar seg?
                                    Bruk "Gjentakende" funksjonen så slipper du å legge inn den samme vakten gang på gang!
                                </p>
                            </div>
                        </div>

                        <div class="form-actions" style="margin-top: 16px;">
                            <button class="btn btn-primary" onclick="app.dismissRecurringIntro()" style="width: 100%; max-width: 200px; margin: 0 auto; display: block;">
                                Forstått, takk!
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add to DOM
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Add escape key listener
        this.recurringIntroKeyHandler = (e) => {
            if (e.key === 'Escape') {
                this.dismissRecurringIntro();
            }
        };
        document.addEventListener('keydown', this.recurringIntroKeyHandler);
    },

    async dismissRecurringIntro() {
        // Only mark as seen if this is the first time (automatic show)
        // If user manually opens it, don't mark as seen so they can see it again if needed
        if (!this.hasSeenRecurringIntro) {
            this.hasSeenRecurringIntro = true;

            // Save to both localStorage and Supabase
            this.saveToLocalStorage();
            await this.saveSettingsToSupabase();
        }

        // Remove modal
        const modal = document.getElementById('recurringIntroModal');
        if (modal) {
            modal.remove();
        }

        // Remove event listener
        if (this.recurringIntroKeyHandler) {
            document.removeEventListener('keydown', this.recurringIntroKeyHandler);
            this.recurringIntroKeyHandler = null;
        }
    },

    // Check if we should show the recurring introduction
    checkAndShowRecurringIntro() {
        // Show if user hasn't seen it and either:
        // 1. Has at least one existing shift (active user who would benefit), or
        // 2. Has no shifts but has been using the app (might be new user learning)
        const shouldShow = !this.hasSeenRecurringIntro && (
            this.userShifts.length > 0 ||
            // Show to new users after a longer delay to let them explore first
            this.userShifts.length === 0
        );

        if (shouldShow) {
            // Longer delay for new users, shorter for users with existing shifts
            const delay = this.userShifts.length > 0 ? 1500 : 5000;
            setTimeout(() => {
                this.showRecurringIntroduction();
            }, delay);
        }
    },

    // Tab bar functionality
    setupTabBarEventListeners() {
        // Only bind to top-level tab bar buttons that actually switch views
        const tabButtons = document.querySelectorAll('.tab-bar .tab-btn[data-view]');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const view = button.getAttribute('data-view');
                if (!view) return; // Safety: ignore buttons without a view
                this.switchToView(view);
            });
        });
    },

    switchToView(view) {
        // Guard against accidental calls from non-view buttons
        const validViews = new Set(['dashboard', 'stats', 'chatgpt', 'employees']);
        if (!validViews.has(view)) {
            console.warn('switchToView: ignoring invalid view', view);
            return;
        }
        // Update active tab button
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-view') === view);
        });

        // Immediately hide dashboard cards for non-dashboard views to prevent flash
        if (view !== 'dashboard') {
            const totalCard = document.querySelector('.total-card');
            const nextShiftCard = document.querySelector('.next-shift-card');
            const nextPayrollCard = document.querySelector('.next-payroll-card');
            const monthNav = document.querySelector('.dashboard-month-nav');
            const floatingActionBar = document.querySelector('.floating-action-bar');

            if (totalCard) totalCard.style.display = 'none';
            if (nextShiftCard) nextShiftCard.style.display = 'none';
            if (nextPayrollCard) nextPayrollCard.style.display = 'none';
            if (monthNav) monthNav.style.display = 'none';
            if (floatingActionBar) floatingActionBar.style.display = 'none';
        }

        // Clean up all previous view states to prevent overlap
        this.cleanupAllViews();

        // Switch views immediately without delay for smooth transition
        switch (view) {
            case 'dashboard':
                this.showDashboardView();
                break;
            case 'stats':
                this.showStatsView();
                break;
            case 'chatgpt':
                this.showChatGPTView();
                break;
            case 'employees':
                this.showEmployeesView();
                break;
        }
    },

    cleanupAllViews() {
        const body = document.body;

        // Remove all view classes
        body.classList.remove('stats-view', 'chatbox-view', 'employees-view');

        // Clean up employee carousel performance resources
        if (this.employeeCarousel) {
            this.employeeCarousel.cleanup?.();
        }

        // Hide all view-specific containers
        const chatboxContainer = document.querySelector('.chatbox-container');
        const employeesContainer = document.querySelector('.employees-container');
        const dashboardStatsContainer = document.querySelector('.dashboard-stats-container');

        if (chatboxContainer) {
            chatboxContainer.style.display = 'none';
            // Reset chatbox to collapsed state only if not switching to chatgpt view
            const chatboxPill = document.getElementById('chatboxPill');
            const expandedContent = document.getElementById('chatboxExpandedContent');
            const chatboxClose = document.getElementById('chatboxClose');
            if (chatboxPill) chatboxPill.classList.remove('expanded');
            if (expandedContent) expandedContent.style.display = 'none';
            if (chatboxClose) chatboxClose.style.display = 'none';
        }

        if (employeesContainer) {
            employeesContainer.style.display = 'none';
        }

        // Before removing dashboardStatsContainer, move the chart back to statistics section
        if (dashboardStatsContainer) {
            const weeklyHoursChart = document.getElementById('weeklyHoursChart');
            const statisticsSection = document.querySelector('.statistics-section');

            if (weeklyHoursChart && statisticsSection) {
                const statisticsContent = statisticsSection.querySelector('.statistics-content');
                if (statisticsContent) {
                    // Move chart back to statistics section
                    statisticsContent.appendChild(weeklyHoursChart);
                    console.log('Moved chart back to statistics section during cleanup');
                }
            }

            // Now safe to remove the container
            dashboardStatsContainer.remove();
        }

        // Ensure month navigation is always visible after cleanup
        this.ensureMonthPickerVisibility();

        // Note: Dashboard cards visibility is now handled in switchToView()
        // to prevent flash during transitions. No need to reset them here.
    },

    // Helper function to ensure month picker remains visible across all views
    ensureMonthPickerVisibility() {
        const monthNav = document.querySelector('.dashboard-month-nav');
        if (monthNav) {
            monthNav.style.display = 'flex';
            monthNav.style.visibility = 'visible';
            monthNav.style.opacity = '1';
            monthNav.style.position = 'relative';
            monthNav.style.left = 'auto';
            monthNav.style.height = 'auto';
            monthNav.style.width = 'auto';
        }
    },

    showDashboardView() {
        const body = document.body;

        // Remove all view classes
        body.classList.remove('stats-view', 'chatbox-view', 'employees-view');

        // Update current view state
        this.currentView = 'dashboard';

        // Clear employee selection when switching to dashboard
        this.selectedEmployeeId = null;
        // Also clear from localStorage to prevent persistence issues
        localStorage.removeItem('selectedEmployeeId');
        
        // Restore user's own shifts (not filtered by employee)
        this.shifts = [...this.userShifts];

        // Show dashboard cards
        const totalCard = document.querySelector('.total-card');
        const nextShiftCard = document.querySelector('.next-shift-card');
        const nextPayrollCard = document.querySelector('.next-payroll-card');
        const floatingActionBar = document.querySelector('.floating-action-bar');
        const chatboxContainer = document.querySelector('.chatbox-container');

        if (totalCard) totalCard.style.display = '';
        if (nextShiftCard) nextShiftCard.style.display = '';
        if (nextPayrollCard) nextPayrollCard.style.display = '';
        // Ensure month navigation is always visible and properly styled
        this.ensureMonthPickerVisibility();
        if (floatingActionBar) floatingActionBar.style.display = 'flex';

        // Hide chatbox container completely in dashboard view
        if (chatboxContainer) {
            chatboxContainer.style.display = 'none';
            const chatboxPill = document.getElementById('chatboxPill');
            const expandedContent = document.getElementById('chatboxExpandedContent');
            if (chatboxPill) chatboxPill.classList.remove('expanded');
            if (expandedContent) expandedContent.style.display = 'none';
        }

        // Remove stats container from dashboard if it exists, but first move chart back
        const dashboardStatsContainer = document.querySelector('.dashboard-stats-container');
        if (dashboardStatsContainer) {
            const weeklyHoursChart = document.getElementById('weeklyHoursChart');
            const statisticsSection = document.querySelector('.statistics-section');

            if (weeklyHoursChart && statisticsSection) {
                const statisticsContent = statisticsSection.querySelector('.statistics-content');
                if (statisticsContent) {
                    // Move chart back to statistics section
                    statisticsContent.appendChild(weeklyHoursChart);
                    console.log('Moved chart back to statistics section from dashboard view');
                }
            }

            // Now safe to remove the container
            dashboardStatsContainer.remove();
        }

        // Update the display with user's own data
        this.updateDisplay();
    },

    // Fetch and display employee shifts for the current selection in Employees tab
    async fetchAndDisplayEmployeeShifts() {
        try {
            const { data: { session } } = await window.supa.auth.getSession();
            if (!session) { console.warn('No session for employee-shifts fetch'); return; }

            const headers = { 'Authorization': `Bearer ${session.access_token}` };
            const params = new URLSearchParams();
            if (this.selectedEmployeeId) params.set('employee_id', this.selectedEmployeeId);
            // Optional: restrict to current month window
            const from = `${this.currentYear}-${String(this.currentMonth).padStart(2,'0')}-01`;
            const toDate = new Date(this.currentYear, this.currentMonth, 0); // last day of month
            const to = `${toDate.getFullYear()}-${String(toDate.getMonth()+1).padStart(2,'0')}-${String(toDate.getDate()).padStart(2,'0')}`;
            params.set('from', from);
            params.set('to', to);
            params.set('limit', '200');
            // Avoid cached 304s when we need fresh data after updates
            params.set('bust', String(Date.now()));

            const resp = await fetch(`${window.CONFIG.apiBase}/employee-shifts?${params.toString()}`, { headers, cache: 'no-store' });
            if (!resp.ok) { const e = await resp.json().catch(()=>({})); console.error('Failed to fetch employee shifts:', e); return; }
            const { shifts } = await resp.json();

            // Map server employee shifts to UI shape
            this.shifts = (shifts || []).map(s => ({
                id: s.id,
                date: new Date(s.shift_date + 'T00:00:00.000Z'),
                startTime: s.start_time,
                endTime: s.end_time,
                type: (() => { const d = new Date(s.shift_date+'T00:00:00Z').getDay(); return d===0?2:(d===6?1:0); })(),
                seriesId: null,
                employee_id: s.employee_id,
                employee: this.employees.find(e => e.id === s.employee_id) || null,
                // Include per-shift snapped wage for accurate period calculations
                hourly_wage_snapshot: Number(s.hourly_wage_snapshot)
            }));

            // Update UI components WITHOUT calling updateDisplay to avoid infinite loop
            this.updateHeader();
            this.updateStats(false);
            this.updateWeeklyHoursChart();
            this.updateShiftList();
            this.updateShiftCalendar();
            
            // Render employee work summary
            if (this.currentView === 'employees') {
                this.renderEmployeeWorkSummary?.();
            }
        } catch (e) {
            console.error('fetchAndDisplayEmployeeShifts error:', e);
        }
    },

    showStatsView() {
        const body = document.body;

        // Remove other view classes and add stats view
        body.classList.remove('chatbox-view', 'employees-view');
        body.classList.add('stats-view');

        // Update current view state
        this.currentView = 'stats';

        // Clear employee selection when switching to stats
        this.selectedEmployeeId = null;
        localStorage.removeItem('selectedEmployeeId');
        
        // Restore user's own shifts (not filtered by employee)
        this.shifts = [...this.userShifts];

        // Use existing stats view functionality
        this.dashboardView = 'stats';
        this.applyDashboardView();
        
        // Update the display with user's own data
        this.updateDisplay();
    },

    showChatGPTView() {
        const body = document.body;

        // Remove other view classes and add chatbox view
        body.classList.remove('stats-view', 'employees-view');
        body.classList.add('chatbox-view');

        // Update current view state
        this.currentView = 'chatgpt';

        // Clear employee selection when switching to chat
        this.selectedEmployeeId = null;
        localStorage.removeItem('selectedEmployeeId');
        
        // Restore user's own shifts (not filtered by employee)
        this.shifts = [...this.userShifts];

        // Show the chatbox container
        const chatboxContainer = document.querySelector('.chatbox-container');
        if (chatboxContainer) {
            chatboxContainer.style.display = 'block';
        }

        // Ensure month navigation remains visible in chatbox view
        this.ensureMonthPickerVisibility();

        // Immediately expand the chatbox to show chat log and input
        this.expandChatboxForTabView();

        // Dashboard cards are already hidden in switchToView() for smooth transitions
        
        // Update the display with user's own data
        this.updateDisplay();
    },

    expandChatboxForTabView() {
        const chatboxPill = document.getElementById('chatboxPill');
        const expandedContent = document.getElementById('chatboxExpandedContent');
        const chatboxClose = document.getElementById('chatboxClose');
        const chatboxLog = document.getElementById('chatboxLog');

        if (chatboxPill && expandedContent) {
            // Add expanded class to pill
            chatboxPill.classList.add('expanded');

            // Show expanded content (chat log and input)
            expandedContent.style.display = 'block';

            // Show close button
            if (chatboxClose) {
                chatboxClose.style.display = 'block';
            }

            // Add greeting message if chat log is empty
            if (chatboxLog && chatboxLog.children.length === 0) {
                this.addChatGreetingMessage();
            }

            // Focus on the input field for immediate interaction
            const chatboxInput = document.getElementById('chatboxInput');
            if (chatboxInput) {
                setTimeout(() => {
                    chatboxInput.focus();
                }, 100); // Small delay to ensure element is visible
            }
        }
    },

    addChatGreetingMessage() {
        const chatboxLog = document.getElementById('chatboxLog');
        if (!chatboxLog) return;

        // Get user's first name for personalized greeting
        const userNickname = document.getElementById('userNickname');
        const userName = userNickname ? userNickname.textContent : 'Bruker';

        // Create the greeting message text
        const greetingText = `Hei ${userName}! 👋

Jeg er LønnAI, din personlige assistent for vaktregistrering. Jeg kan hjelpe deg med å:

• Registrere enkelvakter
• Opprette vaktserier
• Svare på spørsmål om lønn og tillegg
• Gi tips om effektiv vaktplanlegging

Hva kan jeg hjelpe deg med i dag?`;

        // Use the modern appendMessage function with streaming animation
        // Check if the modern chatbox system is available
        if (window.chatbox && window.chatbox.appendMessage) {
            window.chatbox.appendMessage('assistant', greetingText, { streaming: true, streamSpeed: 25 });
        } else {
            // Fallback to creating message element directly with proper bubble styling
            const greetingMessage = document.createElement('div');
            greetingMessage.className = 'chatbox-message assistant'; // Use modern assistant class

            // Use the streaming function if available
            if (typeof streamText === 'function') {
                greetingMessage.innerHTML = '';
                chatboxLog.appendChild(greetingMessage);
                streamText(greetingMessage, greetingText, 25);
            } else {
                // Final fallback - direct HTML with proper markdown rendering
                if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
                    const html = DOMPurify.sanitize(marked.parse(greetingText));
                    greetingMessage.innerHTML = html;
                } else {
                    greetingMessage.textContent = greetingText;
                }
                chatboxLog.appendChild(greetingMessage);
            }

            // Scroll to bottom
            setTimeout(() => {
                chatboxLog.scrollTop = chatboxLog.scrollHeight;
            }, 50);
        }
    },

    showEmployeesView() {
        const body = document.body;

        // Remove other view classes and add employees view
        body.classList.remove('stats-view', 'chatbox-view');
        body.classList.add('employees-view');

        // Ensure month navigation remains visible in employees view
        this.ensureMonthPickerVisibility();

        // Hide dashboard next* cards explicitly when in employees view
        try {
            const totalCard = document.querySelector('.total-card');
            const nextShiftCard = document.querySelector('.next-shift-card');
            const nextPayrollCard = document.querySelector('.next-payroll-card');
            if (totalCard) totalCard.style.display = 'none';
            if (nextShiftCard) nextShiftCard.style.display = 'none';
            if (nextPayrollCard) nextPayrollCard.style.display = 'none';
        } catch (e) {
            console.warn('Could not hide dashboard cards in employees view', e);
        }

        // Show employees content with carousel
        this.showEmployeesPlaceholder();

        // Load employees if not already loaded
        if (this.employees.length === 0 && !this.employeesLoading) {
            this.loadEmployees().catch(error => {
                console.error('Failed to load employees:', error);
            });
        }

        // Store current view for cleanup purposes
        this.currentView = 'employees';

        // Clear previous (user_shifts) list while loading employee shifts
        this.shifts = [];
        this.updateDisplay();
        this.fetchAndDisplayEmployeeShifts?.();

        // Preload avatars for better performance
        if (this.employeeCarousel) {
            this.employeeCarousel.preloadAvatars?.();
        }
    },

    showEmployeesPlaceholder() {
        // Create or show employees container with carousel
        let employeesContainer = document.querySelector('.employees-container');
        if (!employeesContainer) {
            employeesContainer = document.createElement('div');
            employeesContainer.className = 'employees-container';
            employeesContainer.innerHTML = `
                <div class="employees-header">
                    <h2>Ansatte</h2>
                    <div class="employees-summary" id="employeesSummary"></div>
                </div>
                <div class="employee-carousel-container" id="employeeCarouselContainer">
                    <!-- Employee carousel will be rendered here -->
                </div>
                <div class="employees-content" id="employeesContent">
                    <div class="employee-work-summary" id="employeeWorkSummary"></div>
                </div>
            `;

            // Insert after the tab bar
            const tabBarContainer = document.querySelector('.tab-bar-container');
            if (tabBarContainer) {
                tabBarContainer.parentNode.insertBefore(employeesContainer, tabBarContainer.nextSibling);
            }
        }
        employeesContainer.style.display = 'block';

        // Initialize employee carousel
        this.initializeEmployeeCarousel();
    },

    /**
     * Initialize the employee carousel
     */
    async initializeEmployeeCarousel() {
        try {
            const container = document.getElementById('employeeCarouselContainer');
            if (!container) return;

            // Import and create carousel
            const { EmployeeCarousel } = await import('./employeeCarousel.js');

            // Destroy existing carousel if it exists
            if (this.employeeCarousel) {
                this.employeeCarousel.destroy();
            }

            // Create new carousel
            this.employeeCarousel = new EmployeeCarousel(container, this);

            // Load employees if not already loaded
            if (this.employees.length === 0 && !this.employeesLoading) {
                await this.loadEmployees();
            }

            // Update summary
            this.updateEmployeesSummary();

        } catch (error) {
            console.error('Error initializing employee carousel:', error);
        }
    },

    /**
     * Update employee carousel (called when employees change)
     */
    updateEmployeeCarousel() {
        if (this.employeeCarousel) {
            this.employeeCarousel.update();
        }
        this.updateEmployeesSummary();
    },

    /**
     * Update employees summary display
     */
    updateEmployeesSummary() {
        const summaryElement = document.getElementById('employeesSummary');
        if (!summaryElement) return;

        const activeEmployees = this.employees.filter(emp => !emp.archived_at);
        const selectedEmployee = this.getSelectedEmployee();

        // Simplify: carousel selection is clear enough – show only total active employees
        const summaryText = `${activeEmployees.length} aktive ansatte`;
        summaryElement.textContent = summaryText;

        // Also render work summary table whenever summary updates in employees view
        if (this.currentView === 'employees') {
            this.renderEmployeeWorkSummary?.();
        }
    },

    updateTabBarVisibility() {
        const ansatteTab = document.getElementById('tabAnsatte');
        if (ansatteTab) {
            ansatteTab.style.display = this.isWageCaregiver ? 'flex' : 'none';
        }
    },

    setupChatboxCloseOverride() {
        const chatboxClose = document.getElementById('chatboxClose');
        if (chatboxClose) {
            // Remove existing event listeners by cloning the element
            const newCloseButton = chatboxClose.cloneNode(true);
            chatboxClose.parentNode.replaceChild(newCloseButton, chatboxClose);

            // Add new event listener that switches to dashboard view
            newCloseButton.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();

                // Switch to dashboard view using tab bar
                this.switchToView('dashboard');
            });
        }
    },

    toggleWageCaregiver() {
        const toggle = document.getElementById('isWageCaregiverToggle');
        if (toggle) {
            this.isWageCaregiver = toggle.checked;

            // Save to both Supabase and localStorage
            this.saveSettingsToSupabase();
            this.saveToLocalStorage();
            this.updateTabBarVisibility();
        }
    },

    // Export data functionality
    exportData(format) {
        try {
            const data = {
                shifts: this.shifts.map(shift => ({
                    id: shift.id,
                    date: shift.date.toISOString(),
                    startTime: shift.startTime,
                    endTime: shift.endTime,
                    type: shift.type,
                    seriesId: shift.seriesId || null
                })),
                settings: {
                    usePreset: this.usePreset,
                    customWage: this.customWage,
                    currentWageLevel: this.currentWageLevel,
                    customBonuses: this.customBonuses,
                    pauseDeduction: this.pauseDeduction,
                    fullMinuteRange: this.fullMinuteRange,
                    directTimeInput: this.directTimeInput,
                    monthlyGoal: this.monthlyGoal,
                    currencyFormat: this.currencyFormat,

                },
                exportDate: new Date().toISOString(),
                version: '1.0'
            };

            if (format === 'csv') {
                this.exportAsCSV(data);
            } else if (format === 'pdf') {
                this.exportAsPDF(data);
            } else {
                // Default to JSON
                this.exportAsJSON(data);
            }
        } catch (error) {
            console.error('Error exporting data:', error);
            alert('Kunne ikke eksportere data. Prøv igjen.');
        }
    },

    exportAsCSV(data) {
        const csvContent = [
            ['Dato', 'Dag', 'Start', 'Slutt', 'Timer', 'Grunnlønn', 'Tillegg', 'Totalt', 'Type', 'Serie'].join(','),
            ...data.shifts.map(shift => {
                const date = new Date(shift.date);
                const calc = this.calculateShift({
                    ...shift,
                    date: date
                });
                return [
                    date.toLocaleDateString('no-NO'),
                    this.WEEKDAYS[date.getDay()],
                    shift.startTime,
                    shift.endTime,
                    calc.hours.toFixed(2),
                    calc.baseWage.toFixed(2),
                    calc.bonus.toFixed(2),
                    calc.total.toFixed(2),
                    shift.type === 0 ? 'Ukedag' : shift.type === 1 ? 'Lørdag' : 'Søndag',
                    shift.seriesId ? 'Ja' : 'Nei'
                ].join(',');
            })
        ].join('\n');

        this.downloadFile(csvContent, 'vaktdata.csv', 'text/csv');
    },

    exportAsJSON(data) {
        const jsonContent = JSON.stringify(data, null, 2);
        this.downloadFile(jsonContent, 'vaktdata.json', 'application/json');
    },

    exportAsPDF(data) {
        try {
            // Check if jsPDF is available and correctly exposed by the UMD build
            if (typeof window.jspdf?.jsPDF !== 'function') {
                alert('PDF-biblioteket (jsPDF) ble ikke funnet. Prøv å laste siden på nytt.');
                return;
            }

            // Create new PDF instance from the UMD export
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            // Set up document properties
            doc.setProperties({
                title: 'Vaktrapport',
                subject: 'Lønn og vaktdetaljer',
                author: 'Vaktkalkulator',
                creator: 'Vaktkalkulator'
            });

            // Get current date for export
            const exportDate = new Date().toLocaleDateString('no-NO', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            // Calculate summary statistics
            const shifts = data.shifts.map(shift => ({
                ...shift,
                date: new Date(shift.date)
            }));

            let totalHours = 0;
            let totalWages = 0;
            let totalBonus = 0;
            let totalBaseWage = 0;
            const shiftsByType = { weekday: 0, saturday: 0, sunday: 0 };

            const calculatedShifts = shifts.map(shift => {
                const calc = this.calculateShift(shift);
                totalHours += calc.hours;
                totalWages += calc.total;
                totalBonus += calc.bonus;
                totalBaseWage += calc.baseWage;

                const typeKey = shift.type === 0 ? 'weekday' : shift.type === 1 ? 'saturday' : 'sunday';
                shiftsByType[typeKey]++;

                return {
                    ...shift,
                    calc: calc
                };
            });

            // Sort shifts by date
            calculatedShifts.sort((a, b) => a.date - b.date);

            let yPosition = 20;
            const leftMargin = 20;
            const rightMargin = 190;
            const pageWidth = 210;
            const pageHeight = 297;

            // Helper function to check if we need a new page
            const checkPageBreak = (requiredSpace) => {
                if (yPosition + requiredSpace > pageHeight - 20) {
                    doc.addPage();
                    yPosition = 20;
                    return true;
                }
                return false;
            };

            // Title
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.text('Vaktrapport', leftMargin, yPosition);
            yPosition += 15;

            // Export date
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Eksportert: ${exportDate}`, leftMargin, yPosition);
            yPosition += 10;

            // Period information
            if (calculatedShifts.length > 0) {
                const firstShift = calculatedShifts[0].date;
                const lastShift = calculatedShifts[calculatedShifts.length - 1].date;
                const periodText = `Periode: ${firstShift.toLocaleDateString('no-NO')} - ${lastShift.toLocaleDateString('no-NO')}`;
                doc.text(periodText, leftMargin, yPosition);
                yPosition += 15;
            }

            // Summary section
            checkPageBreak(60);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Sammendrag', leftMargin, yPosition);
            yPosition += 10;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');

            const summaryData = [
                ['Totalt antall vakter:', shifts.length.toString()],
                ['Totale timer:', totalHours.toFixed(2) + ' timer'],
                ['Total grunnlønn:', this.formatCurrencyShort(totalBaseWage) + ' kr'],
                ['Totale tillegg:', this.formatCurrencyShort(totalBonus) + ' kr'],
                ['Total lønn:', this.formatCurrencyShort(totalWages) + ' kr'],
                ['', ''],
                ['Vakter per type:', ''],
                ['  Ukedager:', shiftsByType.weekday.toString()],
                ['  Lørdager:', shiftsByType.saturday.toString()],
                ['  Søndager/helligdager:', shiftsByType.sunday.toString()]
            ];

            summaryData.forEach(([label, value]) => {
                if (label) {
                    doc.text(label, leftMargin, yPosition);
                    if (value) {
                        doc.text(value, leftMargin + 60, yPosition);
                    }
                }
                yPosition += 5;
            });

            yPosition += 10;

            // Detailed shift table
            checkPageBreak(50);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Detaljert vaktliste', leftMargin, yPosition);
            yPosition += 10;

            // Table headers
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            const headers = ['Dato', 'Dag', 'Start', 'Slutt', 'Timer', 'Grunnlønn', 'Tillegg', 'Totalt'];
            const colWidths = [25, 20, 15, 15, 15, 25, 25, 25];
            const colPositions = [leftMargin];

            for (let i = 1; i < colWidths.length; i++) {
                colPositions.push(colPositions[i-1] + colWidths[i-1]);
            }

            // Draw table header
            headers.forEach((header, index) => {
                doc.text(header, colPositions[index], yPosition);
            });
            yPosition += 5;

            // Draw header line
            doc.setLineWidth(0.5);
            doc.line(leftMargin, yPosition, rightMargin, yPosition);
            yPosition += 5;

            // Table data
            doc.setFont('helvetica', 'normal');
            calculatedShifts.forEach(shift => {
                checkPageBreak(8);

                const rowData = [
                    shift.date.toLocaleDateString('no-NO'),
                    this.WEEKDAYS[shift.date.getDay()].substring(0, 3),
                    shift.startTime,
                    shift.endTime,
                    shift.calc.hours.toFixed(2),
                    this.formatCurrencyShort(shift.calc.baseWage),
                    this.formatCurrencyShort(shift.calc.bonus),
                    this.formatCurrencyShort(shift.calc.total)
                ];

                rowData.forEach((data, index) => {
                    doc.text(data, colPositions[index], yPosition);
                });
                yPosition += 5;
            });

            // Summary line
            yPosition += 5;
            doc.setLineWidth(0.5);
            doc.line(leftMargin, yPosition, rightMargin, yPosition);
            yPosition += 5;

            doc.setFont('helvetica', 'bold');
            doc.text('Sum:', colPositions[0], yPosition);
            doc.text(totalHours.toFixed(2), colPositions[4], yPosition);
            doc.text(this.formatCurrencyShort(totalBaseWage), colPositions[5], yPosition);
            doc.text(this.formatCurrencyShort(totalBonus), colPositions[6], yPosition);
            doc.text(this.formatCurrencyShort(totalWages), colPositions[7], yPosition);

            // Add footer to all pages
            const totalPages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.text(`Side ${i} av ${totalPages}`, rightMargin - 20, pageHeight - 10);
                doc.text('Generert av Vaktkalkulator', leftMargin, pageHeight - 10);
            }

            // Generate filename with current date
            const filename = `vaktrapport_${new Date().toISOString().split('T')[0]}.pdf`;

            // Save the PDF
            doc.save(filename);

        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Kunne ikke generere PDF. Prøv igjen eller bruk CSV-eksport.');
        }
    },

    downloadFile(content, filename, contentType) {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    // Import data functionality
    async importData() {
        const fileInput = document.getElementById('importFile');
        const file = fileInput.files[0];

        if (!file) {
            alert('Velg en fil å importere');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target.result;

                if (file.name.endsWith('.json')) {
                    const data = JSON.parse(content);
                    await this.importFromJSON(data);
                } else if (file.name.endsWith('.csv')) {
                    await this.importFromCSV(content);
                } else {
                    alert('Ikke støttet filformat. Bruk JSON eller CSV.');
                    return;
                }

                alert('Data importert successfully!');
                this.updateDisplay();
            } catch (error) {
                console.error('Error importing data:', error);
                alert('Kunne ikke importere data. Sjekk filformatet.');
            }
        };

        reader.readAsText(file);
    },

    // Detect duplicate shifts based on date, time, and type
    detectDuplicateShifts(importedShifts) {
        const newShifts = [];
        const duplicates = [];

        importedShifts.forEach(importedShift => {
            // Create a unique key for each shift based on its data
            const shiftKey = this.createShiftKey(importedShift);

            // Check if this shift already exists in current shifts
            const isDuplicate = this.shifts.some(existingShift => {
                const existingKey = this.createShiftKey(existingShift);
                return shiftKey === existingKey;
            });

            if (isDuplicate) {
                duplicates.push(importedShift);
            } else {
                newShifts.push(importedShift);
            }
        });

        return { newShifts, duplicates };
    },

    // Create a unique key for a shift based on its data
    createShiftKey(shift) {
        const dateStr = `${shift.date.getFullYear()}-${(shift.date.getMonth() + 1).toString().padStart(2, '0')}-${shift.date.getDate().toString().padStart(2, '0')}`;
        return `${dateStr}_${shift.startTime}_${shift.endTime}_${shift.type}`;
    },

    getMonthShiftsKey() {
        const monthIdx = this.currentMonth - 1;
        const year = this.currentYear;
        const monthShifts = this.shifts.filter(s =>
            s.date.getMonth() === monthIdx &&
            s.date.getFullYear() === year
        );
        return monthShifts.map(s => this.createShiftKey(s)).join('|');
    },

    // Save imported shifts to Supabase database
    async saveImportedShiftsToSupabase(shifts) {
        try {
            const { data: { user }, error: authError } = await window.supa.auth.getUser();
            if (authError || !user) {
                throw new Error('Du er ikke innlogget');
            }

            // Prepare shifts for database insertion
            const shiftsToInsert = shifts.map(shift => {
                const dateStr = `${shift.date.getFullYear()}-${(shift.date.getMonth() + 1).toString().padStart(2, '0')}-${shift.date.getDate().toString().padStart(2, '0')}`;
                return {
                    user_id: user.id,
                    shift_date: dateStr,
                    start_time: shift.startTime,
                    end_time: shift.endTime,
                    shift_type: shift.type,
                    series_id: shift.seriesId || null
                };
            });

            // Insert all shifts in a batch
            const { data: savedShifts, error } = await window.supa
                .from('user_shifts')
                .insert(shiftsToInsert)
                .select();

            if (error) {
                console.error('Error saving imported shifts to Supabase:', error);
                throw new Error(`Kunne ikke lagre importerte vakter: ${error.message}`);
            }

            // Update the imported shifts with the actual database IDs
            savedShifts.forEach((savedShift, index) => {
                shifts[index].id = savedShift.id;
            });

        } catch (error) {
            console.error('Error in saveImportedShiftsToSupabase:', error);
            throw error;
        }
    },

    async importFromJSON(data) {
        if (data.shifts && Array.isArray(data.shifts)) {
            // Convert date strings back to Date objects
            const importedShifts = data.shifts.map(shift => ({
                ...shift,
                date: new Date(shift.date)
            }));

            // Add unique IDs if missing
            importedShifts.forEach(shift => {
                if (!shift.id) {
                    shift.id = Date.now() + Math.random();
                }
            });

            // Check for duplicates based on shift data (not just IDs)
            const { newShifts, duplicates } = this.detectDuplicateShifts(importedShifts);

            if (duplicates.length > 0) {
                const duplicateCount = duplicates.length;
                const proceed = confirm(`Fant ${duplicateCount} duplikat vakter som allerede eksisterer. Vil du fortsatt importere de ${newShifts.length} nye vaktene?`);
                if (!proceed) {
                    return;
                }
            }

            // Save only new shifts to database
            if (newShifts.length > 0) {
                await this.saveImportedShiftsToSupabase(newShifts);

                // Update local arrays
                this.shifts = [...this.shifts, ...newShifts];
                this.userShifts = [...this.userShifts, ...newShifts];
            }
        }

        if (data.settings) {
            // Optionally import settings (ask user first)
            const importSettings = confirm('Vil du også importere innstillinger? Dette vil overskrive dine nåværende innstillinger.');
            if (importSettings) {
                Object.assign(this, data.settings);
                this.saveSettingsToSupabase();
                this.updateSettingsUI();
            }
        }
    },

    async importFromCSV(content) {
        const lines = content.split('\n');
        const shifts = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const values = line.split(',');
            if (values.length >= 6) {
                const dateParts = values[0].split('.');
                const date = new Date(
                    parseInt(dateParts[2]),
                    parseInt(dateParts[1]) - 1,
                    parseInt(dateParts[0])
                );

                const shift = {
                    id: Date.now() + Math.random(),
                    date: date,
                    startTime: values[2],
                    endTime: values[3],
                    type: values[8] === 'Ukedag' ? 0 : values[8] === 'Lørdag' ? 1 : 2,
                    seriesId: values[9] === 'Ja' ? 'imported-series' : null
                };

                shifts.push(shift);
            }
        }

        // Check for duplicates based on shift data
        const { newShifts, duplicates } = this.detectDuplicateShifts(shifts);

        if (duplicates.length > 0) {
            const duplicateCount = duplicates.length;
            const proceed = confirm(`Fant ${duplicateCount} duplikat vakter som allerede eksisterer. Vil du fortsatt importere de ${newShifts.length} nye vaktene?`);
            if (!proceed) {
                return;
            }
        }

        // Save only new shifts to database
        if (newShifts.length > 0) {
            await this.saveImportedShiftsToSupabase(newShifts);

            // Update local arrays
            this.shifts = [...this.shifts, ...newShifts];
            this.userShifts = [...this.userShifts, ...newShifts];
        }
    },

    // Add event listeners for new settings
    setupNewSettingsListeners() {
        // Currency format toggle
        const currencyFormatToggle = document.getElementById('currencyFormatToggle');
        if (currencyFormatToggle) {
            currencyFormatToggle.addEventListener('change', () => {
                this.currencyFormat = currencyFormatToggle.checked;
                this.saveSettingsToSupabase();
                this.updateDisplay(); // Refresh display with new format
            });
        }



        // Default shifts view toggle
        const defaultShiftsViewToggle = document.getElementById('defaultShiftsViewToggle');
        if (defaultShiftsViewToggle) {
            defaultShiftsViewToggle.addEventListener('change', () => {
                this.defaultShiftsView = defaultShiftsViewToggle.checked ? 'calendar' : 'list';
                this.saveSettingsToSupabase();
                // Note: We don't immediately switch the view here - this is just the default preference
                // The actual view switching is still controlled by the user's manual selection
            });
        }

        // Wage caregiver toggle - add both change and click event listeners
        const isWageCaregiverToggle = document.getElementById('isWageCaregiverToggle');
        const toggleSlider = document.querySelector('#isWageCaregiverToggle + .toggle-slider');

        if (isWageCaregiverToggle) {
            // Add change event listener to the checkbox itself
            isWageCaregiverToggle.addEventListener('change', () => {
                this.toggleWageCaregiver();
            });
        }

        if (isWageCaregiverToggle && toggleSlider) {
            // Add click event to slider to ensure it works
            toggleSlider.addEventListener('click', (e) => {
                e.preventDefault();
                isWageCaregiverToggle.checked = !isWageCaregiverToggle.checked;
                this.toggleWageCaregiver();
            });
        }

        // Tab bar event listeners
        this.setupTabBarEventListeners();

        // Override chatbox close button for tab-based navigation
        this.setupChatboxCloseOverride();
    },

    // Setup export period options and event listeners
    setupExportPeriodOptions() {
        // Update current month label
        this.updateCurrentMonthLabel();

        // Setup event listeners for radio buttons
        const periodRadios = document.querySelectorAll('input[name="exportPeriod"]');
        const customSection = document.getElementById('customPeriodSection');

        periodRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                // Handle custom period section
                if (radio.value === 'custom') {
                    customSection.style.display = 'block';
                    // Set default dates if empty
                    const startDate = document.getElementById('exportStartDate');
                    const endDate = document.getElementById('exportEndDate');
                    if (!startDate.value) {
                        const now = new Date();
                        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                        startDate.value = firstDay.toISOString().split('T')[0];
                    }
                    if (!endDate.value) {
                        const now = new Date();
                        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                        endDate.value = lastDay.toISOString().split('T')[0];
                    }
                } else {
                    customSection.style.display = 'none';
                }
            });
        });

        // Initialize visibility based on current selection
        const checkedRadio = document.querySelector('input[name="exportPeriod"]:checked');
        if (checkedRadio) {
            // Show custom section if custom period is selected
            if (checkedRadio.value === 'custom') {
                customSection.style.display = 'block';
            }
        }
    },

    // Update current month label in export options
    updateCurrentMonthLabel() {
        const label = document.getElementById('currentMonthLabel');
        if (label) {
            const monthName = this.MONTHS[this.currentMonth - 1];
            label.textContent = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${this.currentYear}`;
        }
    },

    // Export data with period selection
    exportDataWithPeriod(format) {
        try {
            // Get selected period
            const periodRadio = document.querySelector('input[name="exportPeriod"]:checked');
            if (!periodRadio) {
                alert('Vennligst velg en periode for eksport først.');
                return;
            }
            const period = periodRadio.value;

            // Filter shifts based on selected period
            let filteredShifts = [...this.shifts];

            if (period === 'current') {
                // Current month (from month picker)
                filteredShifts = this.shifts.filter(shift =>
                    shift.date.getMonth() === this.currentMonth - 1 &&
                    shift.date.getFullYear() === this.currentYear
                );
            } else if (period === 'custom') {
                // Custom period
                const startDate = document.getElementById('exportStartDate').value;
                const endDate = document.getElementById('exportEndDate').value;

                if (!startDate || !endDate) {
                    alert('Vennligst fyll ut både start- og sluttdato for egendefinert periode.');
                    return;
                }

                const start = new Date(startDate);
                const end = new Date(endDate);

                if (start > end) {
                    alert('Startdato må være før sluttdato.');
                    return;
                }

                filteredShifts = this.shifts.filter(shift => {
                    const shiftDate = new Date(shift.date);
                    return shiftDate >= start && shiftDate <= end;
                });
            }

            if (filteredShifts.length === 0) {
                alert('Ingen vakter funnet for den valgte perioden.');
                return;
            }

            // Create export data with filtered shifts
            const data = {
                shifts: filteredShifts.map(shift => ({
                    id: shift.id,
                    date: shift.date.toISOString(),
                    startTime: shift.startTime,
                    endTime: shift.endTime,
                    type: shift.type,
                    seriesId: shift.seriesId || null
                })),
                settings: {
                    usePreset: this.usePreset,
                    customWage: this.customWage,
                    currentWageLevel: this.currentWageLevel,
                    customBonuses: this.customBonuses,
                    pauseDeduction: this.pauseDeduction,
                    fullMinuteRange: this.fullMinuteRange,
                    directTimeInput: this.directTimeInput,
                    monthlyGoal: this.monthlyGoal,
                    currencyFormat: this.currencyFormat,

                },
                exportDate: new Date().toISOString(),
                exportPeriod: period,
                version: '1.0'
            };

            if (format === 'csv') {
                this.exportAsCSV(data);
            } else if (format === 'pdf') {
                this.exportAsPDF(data);
            } else {
                // Default to JSON
                this.exportAsJSON(data);
            }
        } catch (error) {
            console.error('Error exporting data:', error);
            alert('Kunne ikke eksportere data. Prøv igjen.');
        }
    },

    // Import data from data tab
    async importDataFromDataTab() {
        const fileInput = document.getElementById('importFileData');
        const file = fileInput.files[0];

        if (!file) {
            alert('Velg en fil å importere');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target.result;

                if (file.name.endsWith('.json')) {
                    const data = JSON.parse(content);
                    await this.importFromJSON(data);
                } else if (file.name.endsWith('.csv')) {
                    await this.importFromCSV(content);
                } else {
                    alert('Ikke støttet filformat. Bruk JSON eller CSV.');
                    return;
                }

                alert('Data importert successfully!');
                this.updateDisplay();

                // Clear file input
                fileInput.value = '';
            } catch (error) {
                console.error('Error importing data:', error);
                alert('Kunne ikke importere data. Sjekk filformatet.');
            }
        };

        reader.readAsText(file);
    },

    // New function to open add shift modal with pre-selected date
    openAddShiftModalWithDate(date) {
        if (!date) {
            this.openAddShiftModal();
            return;
        }

        const targetDate = new Date(date);
        const targetMonth = targetDate.getMonth() + 1;
        const targetYear = targetDate.getFullYear();

        // Open the modal with the target month/year (no global state modification)
        this.openAddShiftModal(targetMonth, targetYear);

        // Pre-select the specific date
        this.selectedDates = [new Date(targetDate)];

        // Select the date in the UI after the modal is populated
        // Use a small delay to ensure the DOM is updated
        setTimeout(() => {
            const dateButtons = document.querySelectorAll('#dateGrid .date-cell');
            dateButtons.forEach(btn => {
                btn.classList.remove('selected');
                // Check if this button represents our target date
                const cellContent = btn.querySelector('.date-cell-content');
                if (cellContent) {
                    const dayNumber = parseInt(cellContent.textContent);
                    // More robust check: ensure we're in the correct month and not on a disabled cell
                    if (dayNumber === targetDate.getDate() &&
                        !btn.classList.contains('disabled')) {
                        btn.classList.add('selected');
                    }
                }
            });

            // Update the selected dates info
            this.updateSelectedDatesInfo();
        }, 10); // Reduced timeout since we no longer need to restore global state
    },

    // ===== EMPLOYEE MANAGEMENT METHODS =====

    /**
     * Initialize employee state from URL parameters and localStorage
     */
    initializeEmployeeState() {
        try {
            // Check URL parameters first
            const urlParams = new URLSearchParams(window.location.search);
            const urlEmployeeId = urlParams.get('employee');

            // Check localStorage for persisted selection
            const savedEmployeeId = localStorage.getItem('selectedEmployeeId');

            // Set selectedEmployeeId (URL takes precedence)
            // BUT only apply it if we're in the employees view
            if (urlEmployeeId !== null) {
                this.selectedEmployeeId = urlEmployeeId === 'all' ? null : urlEmployeeId;
            } else if (savedEmployeeId !== null && this.currentView === 'employees') {
                // Only restore saved employee selection if we're in employees view
                this.selectedEmployeeId = savedEmployeeId === 'null' ? null : savedEmployeeId;
            } else {
                // Clear selection for non-employee views
                this.selectedEmployeeId = null;
            }

            // Initialize employee cache
            this.employeeCache.clear();

        } catch (error) {
            console.error('Error initializing employee state:', error);
            this.selectedEmployeeId = null;
        }
    },

    /**
     * Set selected employee and persist the selection
     * @param {string|null} employeeId - Employee ID or null for "All"
     */
    setSelectedEmployee(employeeId) {
        try {
            this.selectedEmployeeId = employeeId;

            // Persist to localStorage
            localStorage.setItem('selectedEmployeeId', employeeId === null ? 'null' : employeeId);

            // Update URL parameter without page reload
            const url = new URL(window.location);
            if (employeeId === null) {
                url.searchParams.set('employee', 'all');
            } else {
                url.searchParams.set('employee', employeeId);
            }
            window.history.replaceState({}, '', url);

            // Trigger re-render of relevant components
            this.onEmployeeSelectionChange();

        } catch (error) {
            console.error('Error setting selected employee:', error);
        }
    },

    /**
     * Get the currently selected employee object
     * @returns {Object|null} Employee object or null if "All" is selected
     */
    getSelectedEmployee() {
        if (this.selectedEmployeeId === null) {
            return null;
        }
        return this.employees.find(emp => emp.id === this.selectedEmployeeId) || null;
    },

    /**
     * Check if a specific employee is currently selected
     * @param {string} employeeId - Employee ID to check
     * @returns {boolean} True if the employee is selected
     */
    isEmployeeSelected(employeeId) {
        return this.selectedEmployeeId === employeeId;
    },

    /**
     * Check if "All" employees is currently selected
     * @returns {boolean} True if "All" is selected
     */
    isAllEmployeesSelected() {
        return this.selectedEmployeeId === null;
    },

    /**
     * Handle employee selection change - override in components that need to react
     */
    onEmployeeSelectionChange() {
        // This method can be overridden or extended by components
        // that need to react to employee selection changes
        console.log('Employee selection changed to:', this.selectedEmployeeId);

        // Update any UI components that depend on employee selection
        this.applyEmployeeFilter?.();
        this.updateEmployeeCarousel?.();
        this.updateShiftList?.();
        this.updateStats?.();
    },

    /**
     * Get cached data for an employee
     * @param {string} employeeId - Employee ID
     * @param {string} key - Cache key
     * @returns {any} Cached data or undefined
     */
    getEmployeeCache(employeeId, key) {
        const employeeData = this.employeeCache.get(employeeId);
        return employeeData ? employeeData[key] : undefined;
    },

    /**
     * Set cached data for an employee
     * @param {string} employeeId - Employee ID
     * @param {string} key - Cache key
     * @param {any} value - Data to cache
     */
    setEmployeeCache(employeeId, key, value) {
        if (!this.employeeCache.has(employeeId)) {
            this.employeeCache.set(employeeId, {});
        }
        this.employeeCache.get(employeeId)[key] = value;
    },

    /**
     * Clear cache for a specific employee
     * @param {string} employeeId - Employee ID
     */
    clearEmployeeCache(employeeId) {
        this.employeeCache.delete(employeeId);
        // Avatars disabled
    },

    /**
     * Clear all employee caches
     */
    clearAllEmployeeCaches() {
        this.employeeCache.clear();
    },

    /**
     * Load employees from the server
     * @param {boolean} includeArchived - Include archived employees
     * @returns {Promise<void>}
     */
    async loadEmployees(includeArchived = false) {
        try {
            this.employeesLoading = true;
            this.employeesError = null;

            // Import employee service dynamically
            const { employeeService } = await import('./employeeService.js');

            // Fetch employees
            const employees = await employeeService.fetchEmployees(includeArchived);

            // Update state
            this.employees = employees;

            // Trigger UI updates
            this.onEmployeesLoaded();

        } catch (error) {
            console.error('Error loading employees:', error);
            this.employeesError = error.message;
            this.employees = [];
        } finally {
            this.employeesLoading = false;
        }
    },

    /**
     * Handle employees loaded - override in components that need to react
     */
    onEmployeesLoaded() {
        console.log('Employees loaded:', this.employees.length);

        // Update employee carousel if it exists
        this.updateEmployeeCarousel?.();

        // Validate selected employee still exists
        if (this.selectedEmployeeId && !this.employees.find(emp => emp.id === this.selectedEmployeeId)) {
            console.warn('Selected employee no longer exists, resetting to "All"');
            this.selectedEmployeeId = null;
        }

        // Update employee filter bar
        this.populateEmployeeFilterBar();

        // Apply current filter
        this.applyEmployeeFilter();

        // Update employee selectors in forms
        this.populateEmployeeSelectors();

        // Update any open modals
        this.updateEmployeeModals?.();
    },

    /**
     * Update employee modals when data changes
     */
    updateEmployeeModals() {
        // This method can be called when employee data changes
        // to update any open modals or forms
        console.log('Updating employee modals with new data');
    },

    /**
     * Show employee modal for creating new employee
     */
    async showCreateEmployeeModal() {
        try {
            // Import employee modal
            const { EmployeeModal } = await import('./employeeModal.js');

            // Create modal instance if not exists
            if (!this.employeeModal) {
                this.employeeModal = new EmployeeModal(this);
            }

            // Show create modal
            await this.employeeModal.showCreate();

        } catch (error) {
            console.error('Error showing create employee modal:', error);
        }
    },

    /**
     * Show employee modal for editing existing employee
     * @param {Object} employee - Employee to edit
     */
    async showEditEmployeeModal(employee) {
        try {
            // Import employee modal
            const { EmployeeModal } = await import('./employeeModal.js');

            // Create modal instance if not exists
            if (!this.employeeModal) {
                this.employeeModal = new EmployeeModal(this);
            }

            // Show edit modal
            await this.employeeModal.showEdit(employee);

        } catch (error) {
            console.error('Error showing edit employee modal:', error);
        }
    },

    /**
     * Get employee avatar URL with caching
     * @param {string} employeeId - Employee ID
     * @returns {Promise<string|null>} Avatar URL or null
     */
    // Avatars disabled: always use initials in UI

    /**
     * Generate employee initials for display
     * @param {Object} employee - Employee object
     * @returns {string} Employee initials (max 2 characters)
     */
    getEmployeeInitials(employee) {
        if (!employee?.name) return '?';

        const names = employee.name.trim().split(/\s+/);
        if (names.length === 1) {
            return names[0].substring(0, 2).toUpperCase();
        }

        return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    },

    /**
     * Get employee display color
     * @param {Object} employee - Employee object
     * @returns {string} CSS color value
     */
    getEmployeeDisplayColor(employee) {
        return employee?.display_color || '#6366f1'; // Default to accent color
    },

    // CSV Export Functions
    /**
     * Open CSV export modal
     */
    async openCsvExportModal(employeeId = null) {
        const modal = document.getElementById('csvExportModal');
        if (!modal) return;

        // Ensure employees are loaded first
        if (this.employees.length === 0 && !this.employeesLoading) {
            try {
                await this.loadEmployees();
            } catch (error) {
                console.warn('Could not load employees for CSV export:', error);
            }
        }

        // Pre-fill employee if specified
        const employeeSelect = document.getElementById('csvExportEmployeeSelect');
        if (employeeSelect) {
            // Clear existing options
            employeeSelect.innerHTML = '<option value="">Alle ansatte</option>';
            
            // Populate employee options using this.employees directly
            const employees = this.employees || [];
            employees
                .filter(emp => !emp.archived_at)
                .forEach(emp => {
                    const option = document.createElement('option');
                    option.value = emp.id;
                    option.textContent = emp.name;
                    if (employeeId && emp.id === employeeId) {
                        option.selected = true;
                    }
                    employeeSelect.appendChild(option);
                });
            
            if (employees.length === 0) {
                console.info('No employees available for selection');
            }
        }

        // Set default date range (current month)
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        const fromDateInput = document.getElementById('csvExportFromDate');
        const toDateInput = document.getElementById('csvExportToDate');
        
        if (fromDateInput) {
            fromDateInput.value = firstDay.toISOString().split('T')[0];
        }
        if (toDateInput) {
            toDateInput.value = lastDay.toISOString().split('T')[0];
        }

        // Use active class for proper flexbox centering
        modal.classList.add('active');
    },

    /**
     * Close CSV export modal
     */
    closeCsvExportModal() {
        const modal = document.getElementById('csvExportModal');
        if (modal) {
            modal.classList.remove('active');
        }
    },

    /**
     * Export CSV report
     */
    async exportCsvReport() {
        try {
            // Get form values
            const employeeId = document.getElementById('csvExportEmployeeSelect')?.value || '';
            const fromDate = document.getElementById('csvExportFromDate')?.value || '';
            const toDate = document.getElementById('csvExportToDate')?.value || '';

            // Build query parameters
            const params = new URLSearchParams();
            if (employeeId) params.append('employee_id', employeeId);
            if (fromDate) params.append('from', fromDate);
            if (toDate) params.append('to', toDate);

            // Construct the URL using the configured API base
            const baseUrl = window.CONFIG?.apiBase || window.location.origin;
            const url = `${baseUrl}/reports/wages?${params.toString()}`;

            // Get auth token using Supabase auth (supa is the global instance)
            let token = null;
            try {
                const { data: { session } } = await window.supa.auth.getSession();
                token = session?.access_token;
            } catch (e) {
                console.error('Failed to get auth session:', e);
            }
            
            if (!token) {
                alert('Du må være innlogget for å eksportere data');
                return;
            }

            // Fetch the CSV
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`Export failed: ${response.statusText}`);
            }

            // Get the CSV content
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            
            // Create download link
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = downloadUrl;
            
            // Generate filename with date
            const dateStr = new Date().toISOString().split('T')[0];
            const employeeName = employeeId ? 
                document.getElementById('csvExportEmployeeSelect')?.options[
                    document.getElementById('csvExportEmployeeSelect')?.selectedIndex
                ]?.text.replace(/[^a-zA-Z0-9]/g, '_') : 'alle_ansatte';
            a.download = `lønnsrapport_${employeeName}_${dateStr}.csv`;
            
            // Trigger download
            document.body.appendChild(a);
            a.click();
            
            // Clean up
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);
            
            // Close modal
            this.closeCsvExportModal();
            
            // Show success message
            this.showNotification('CSV-rapport lastet ned', 'success');
            
        } catch (error) {
            console.error('CSV export error:', error);
            alert('Kunne ikke eksportere CSV: ' + error.message);
        }
    },

    /**
     * Show notification (utility function)
     */
    showNotification(message, type = 'info') {
        // Simple notification - can be enhanced with a toast library later
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'success' ? '#10b981' : '#3b82f6'};
            color: white;
            border-radius: 8px;
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
};

