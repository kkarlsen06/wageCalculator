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
    nextShiftTimer: null, // Timer for updating next shift countdown
    lastRenderedMonth: null,
    lastRenderedYear: null,
    lastRenderedShiftsKey: '',
    // Performance optimization for month navigation
    monthNavigationTimeout: null, // Debounce timer for month navigation
    async init() {
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
        
        // Show UI elements
        this.populateTimeSelects();
        

        
        // Load backend or fallback
        try {
            await this.loadFromSupabase();
        } catch (err) {
            console.error('loadFromSupabase failed:', err);
            this.loadFromLocalStorage();
        }
        // Set initial shifts
        this.shifts = [...this.userShifts];
        // Bind pause toggle
        document.getElementById('pauseDeductionToggle').addEventListener('change', e => {
            this.pauseDeduction = e.target.checked;
            this.updateDisplay();
            this.saveSettingsToSupabase();
        });
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
            this.updateStats(false);
        });
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => {
                this.updateStats(false);
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

        // Initialize profile picture functionality (profile data already loaded earlier)
        this.initProfilePictureListeners();

        // Add cleanup listener for page unload
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
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
    
    openAddShiftModal(targetMonth = null, targetYear = null) {
        // Close any existing expanded views, dropdowns, and modals first
        this.closeShiftDetails();
        this.closeSettings();
        this.closeProfile();
        this.closeProfileDropdown();
        
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
    },
    
    closeAddShiftModal() {
        const modal = document.getElementById('addShiftModal');
        modal.style.display = 'none';
        modal.classList.remove('active');
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
            
            if (!startDateStr || !freq || !duration || !startHour || !endHour) {
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
            
            this.shifts = [...this.userShifts];
            this.updateDisplay();
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
            
            if (!startHour || !endHour) {
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
                
                // Add to userShifts array
                this.userShifts.push(newShift);
                createdShifts.push(newShift);
            }
            
            // Update this.shifts
            this.shifts = [...this.userShifts];
            
            this.updateDisplay();
            
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

    // Get all shifts for a specific week
    getShiftsForWeek(weekNumber) {
        const monthShifts = this.shifts.filter(shift =>
            shift.date.getMonth() === this.currentMonth - 1 &&
            shift.date.getFullYear() === this.currentYear
        );

        return monthShifts.filter(shift => {
            return this.getISOWeekNumber(shift.date) === weekNumber;
        });
    },

    // Get daily data for a specific week
    getDailyDataForWeek(weekNumber) {
        const weekShifts = this.getShiftsForWeek(weekNumber);
        const dailyData = {};
        let totalWeekHours = 0;
        let totalWeekEarnings = 0;

        // Group shifts by day of week (0 = Sunday, 1 = Monday, etc.)
        weekShifts.forEach(shift => {
            const dayOfWeek = shift.date.getDay();
            if (!dailyData[dayOfWeek]) {
                dailyData[dayOfWeek] = {
                    hours: 0,
                    earnings: 0,
                    shifts: [],
                    date: new Date(shift.date) // Store the actual date for this day
                };
            }
            const calc = this.calculateShift(shift);
            dailyData[dayOfWeek].hours += calc.hours;
            dailyData[dayOfWeek].earnings += calc.total;
            dailyData[dayOfWeek].shifts.push(shift);
            totalWeekHours += calc.hours;
            totalWeekEarnings += calc.total;
        });

        return {
            dailyData,
            totalWeekHours,
            totalWeekEarnings,
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
            // Fetch shifts
            const { data: shifts, error: shiftsError } = await window.supa
                .from('user_shifts')
                .select('*')
                .eq('user_id', user.id);

            if (shiftsError) {
                console.error('Error fetching shifts from Supabase:', shiftsError);
            } else {
                // Map shifts to app format
                this.userShifts = (shifts || []).map(s => {
                    const mappedShift = {
                        id: s.id,
                        date: new Date(s.shift_date + 'T00:00:00.000Z'),
                        startTime: s.start_time,
                        endTime: s.end_time,
                        type: s.shift_type,
                        seriesId: s.series_id || null
                    };
                    return mappedShift;
                });
                
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
                    
                this.pauseDeduction = settings.pause_deduction || false;
                this.fullMinuteRange = settings.full_minute_range || false;
                            this.directTimeInput = settings.direct_time_input || false;
            this.monthlyGoal = settings.monthly_goal || 20000;
                            this.hasSeenRecurringIntro = settings.has_seen_recurring_intro || false;
                this.currencyFormat = settings.currency_format || false;
                this.compactView = settings.compact_view || false;
                this.defaultShiftsView = settings.default_shifts_view || 'list';
                this.taxDeductionEnabled = settings.tax_deduction_enabled === true;
                this.taxPercentage = parseFloat(settings.tax_percentage) || 0.0;

                // Debug logging for tax deduction settings
                console.log('Loaded tax deduction settings:', {
                    tax_deduction_enabled: settings.tax_deduction_enabled,
                    tax_percentage: settings.tax_percentage,
                    parsed_enabled: this.taxDeductionEnabled,
                    parsed_percentage: this.taxPercentage
                });

            } else {
                // No settings found, set defaults
                this.setDefaultSettings();
            }

            // Update UI elements to reflect loaded settings
            this.updateSettingsUI();
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
        this.currentMonth = new Date().getMonth() + 1; // Default to current month
        this.currentYear = new Date().getFullYear(); // Default to current year
        this.pauseDeduction = false;
        this.fullMinuteRange = false; // Default to 15-minute intervals
        this.directTimeInput = false; // Default to dropdown time selection
        this.monthlyGoal = 20000; // Default monthly goal
        this.hasSeenRecurringIntro = false; // Track if user has seen recurring feature intro
        this.currencyFormat = false; // Default to "kr" instead of "NOK"
        this.compactView = false; // Default to normal view
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

        const pauseDeductionToggle = document.getElementById('pauseDeductionToggle');
        if (pauseDeductionToggle) {
            pauseDeductionToggle.checked = this.pauseDeduction;
        }

        const taxDeductionToggle = document.getElementById('taxDeductionToggle');
        if (taxDeductionToggle) {
            taxDeductionToggle.checked = this.taxDeductionEnabled;
        }

        const taxPercentageInput = document.getElementById('taxPercentageInput');
        if (taxPercentageInput) {
            taxPercentageInput.value = this.taxPercentage;
        }

        // Show/hide tax percentage section based on toggle state
        this.toggleTaxPercentageSection();

        // Debug logging for UI update
        console.log('Updated tax deduction UI:', {
            toggle_element: !!taxDeductionToggle,
            toggle_checked: taxDeductionToggle?.checked,
            input_element: !!taxPercentageInput,
            input_value: taxPercentageInput?.value,
            app_state_enabled: this.taxDeductionEnabled,
            app_state_percentage: this.taxPercentage
        });

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

        const compactViewToggle = document.getElementById('compactViewToggle');
        if (compactViewToggle) {
            compactViewToggle.checked = this.compactView;
        }

        const defaultShiftsViewToggle = document.getElementById('defaultShiftsViewToggle');
        if (defaultShiftsViewToggle) {
            defaultShiftsViewToggle.checked = this.defaultShiftsView === 'calendar';
        }

        // Apply compact view CSS class to body if setting is enabled
        if (this.compactView) {
            document.body.classList.add('compact-view');
        } else {
            document.body.classList.remove('compact-view');
        }



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
                if ('compact_view' in existingSettings) settingsData.compact_view = this.compactView;
                if ('default_shifts_view' in existingSettings) settingsData.default_shifts_view = this.defaultShiftsView;
                if ('custom_bonuses' in existingSettings) {
                    settingsData.custom_bonuses = this.customBonuses || {};
                }
                if ('tax_deduction_enabled' in existingSettings) settingsData.tax_deduction_enabled = this.taxDeductionEnabled;
                if ('tax_percentage' in existingSettings) settingsData.tax_percentage = this.taxPercentage;

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
                settingsData.pause_deduction = this.pauseDeduction;
                settingsData.full_minute_range = this.fullMinuteRange;
                settingsData.direct_time_input = this.directTimeInput;
                settingsData.monthly_goal = this.monthlyGoal;
                settingsData.has_seen_recurring_intro = this.hasSeenRecurringIntro;
                settingsData.currency_format = this.currencyFormat;
                settingsData.compact_view = this.compactView;
                settingsData.default_shifts_view = this.defaultShiftsView;
                settingsData.custom_bonuses = this.customBonuses || {};
                settingsData.tax_deduction_enabled = this.taxDeductionEnabled;
                settingsData.tax_percentage = this.taxPercentage;
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
                this.pauseDeduction = data.pauseDeduction !== false;
                this.fullMinuteRange = data.fullMinuteRange || false;
                this.directTimeInput = data.directTimeInput || false;
                this.monthlyGoal = data.monthlyGoal || 20000;
                this.hasSeenRecurringIntro = data.hasSeenRecurringIntro || false;
                this.currencyFormat = data.currencyFormat || false;
                this.compactView = data.compactView || false;
                this.defaultShiftsView = data.defaultShiftsView || 'list';
                this.taxDeductionEnabled = data.taxDeductionEnabled || false;
                this.taxPercentage = data.taxPercentage || 0.0;
                
                this.updateSettingsUI();
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
        // Get current active tab before switching (within settings modal only)
        const settingsModal = document.getElementById('settingsModal');
        const currentActiveTab = settingsModal?.querySelector('.tab-btn.active');
        const currentTab = currentActiveTab ?
            (currentActiveTab.textContent === 'Lønn' ? 'wage' :
             currentActiveTab.textContent === 'UI' ? 'interface' :
             currentActiveTab.textContent === 'Data' ? 'data' :
             'wage') : null;
        
        // If switching away from wage tab and in custom mode, auto-save bonuses
        if (currentTab === 'wage' && !this.usePreset && tab !== 'wage') {
            await this.saveCustomBonusesSilent();
        }
        
        const tabs = ['wage', 'interface', 'data'];
        const btns = settingsModal?.querySelectorAll('.tab-nav .tab-btn') || [];
        tabs.forEach((t, i) => {
            const btn = btns[i];
            if (btn) {
                btn.classList.toggle('active', t === tab);
            }
            const content = document.getElementById(`${t}Tab`);
            if (content) {
                content.classList.toggle('active', t === tab);
            }
        });
        
        // When switching to wage tab and custom mode is active, populate bonus slots
        if (tab === 'wage' && !this.usePreset) {
            setTimeout(() => {
                this.populateCustomBonusSlots();
            }, 100);
        }
        

        
        // When switching to data tab, setup export period options
        if (tab === 'data') {
            setTimeout(() => {
                this.setupExportPeriodOptions();
            }, 100);
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
        console.log('Tax deduction toggled:', {
            toggle_checked: toggle.checked,
            new_state: this.taxDeductionEnabled
        });
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
        console.log('Updating tax deduction UI specifically');

        const taxDeductionToggle = document.getElementById('taxDeductionToggle');
        const taxPercentageInput = document.getElementById('taxPercentageInput');
        const taxPercentageSection = document.getElementById('taxPercentageSection');

        console.log('Tax deduction UI elements found:', {
            toggle: !!taxDeductionToggle,
            input: !!taxPercentageInput,
            section: !!taxPercentageSection
        });

        if (taxDeductionToggle) {
            taxDeductionToggle.checked = this.taxDeductionEnabled;
            console.log('Set toggle to:', this.taxDeductionEnabled);
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
    async closeSettings() {
        // If in custom mode, automatically save custom bonuses before closing
        if (!this.usePreset) {
            await this.saveCustomBonusesSilent();
        }

        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.style.display = 'none';
        }

        // Close profile dropdown if open
        this.closeProfileDropdown();

        // Save settings when closing modal
        this.saveSettingsToSupabase();
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
        this.closeSettings();
        this.closeShiftDetails();

        const modal = document.getElementById('profileModal');
        if (modal) {
            // Load profile data
            this.loadProfileData();

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

        // Call the global logout function
        if (typeof window.logout === 'function') {
            window.logout();
        }
    },

    // Load user nickname and profile picture for header display
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

            // Also load the profile picture for the top bar
            try {
                const { data: settings } = await window.supa
                    .from('user_settings')
                    .select('profile_picture_url')
                    .eq('user_id', user.id)
                    .single();

                const profilePictureUrl = settings?.profile_picture_url;
                this.updateTopBarProfilePicture(profilePictureUrl);
            } catch (profileErr) {
                // If there's an error loading profile picture, just show placeholder
                console.log('No profile picture found or error loading:', profileErr);
                this.updateTopBarProfilePicture(null);
            }

        } catch (err) {
            console.error('Error loading user nickname:', err);
            // Fallback to default
            const nicknameElement = document.getElementById('userNickname');
            if (nicknameElement) {
                nicknameElement.textContent = 'Bruker';
            }
            // Show placeholder profile picture
            this.updateTopBarProfilePicture(null);
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
                pauseDeduction: this.pauseDeduction,
                fullMinuteRange: this.fullMinuteRange,
                directTimeInput: this.directTimeInput,
                hasSeenRecurringIntro: this.hasSeenRecurringIntro,
                currencyFormat: this.currencyFormat,
                compactView: this.compactView,
                defaultShiftsView: this.defaultShiftsView,
                taxDeductionEnabled: this.taxDeductionEnabled,
                taxPercentage: this.taxPercentage
            };
            localStorage.setItem('lønnsberegnerSettings', JSON.stringify(data));
        } catch (e) {
            console.error('Error saving to localStorage', e);
        }
    },
    getCurrentWageRate() {
        return this.usePreset ? this.PRESET_WAGE_RATES[this.currentWageLevel] : this.customWage;
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
    updateDisplay(shouldAnimate = false) {
        this.updateHeader();
        this.updateNextShiftCard(); // Move before updateStats to ensure correct viewport calculations
        this.updateStats(shouldAnimate);
        this.updateWeeklyHoursChart(); // Update the weekly hours chart
        this.updateShiftList();
        this.updateShiftCalendar();
        this.populateDateGrid();
        this.startNextShiftTimer(); // Start the countdown timer
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

        document.getElementById('totalAmount').textContent = this.formatCurrency(displayAmount);
        document.getElementById('totalHours').textContent = totalHours.toFixed(1);
        document.getElementById('shiftCount').textContent = monthShifts.length;

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
        const { totalWeekHours, totalWeekEarnings } = this.getDailyDataForWeek(this.selectedWeek);

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

        // Update hours card to show week total with two decimal places
        document.getElementById('totalHours').textContent = totalWeekHours.toFixed(2);

        // Transform shifts card to show total wage for the week
        const shiftCountElement = document.getElementById('shiftCount');
        const shiftCountLabel = document.querySelector('.shifts-count-label');
        if (shiftCountElement && shiftCountLabel) {
            shiftCountElement.textContent = this.formatCurrency(totalWeekEarnings).replace(' kr', '');
            shiftCountLabel.textContent = 'kroner';
        }

        // Update progress bar to show week percentage of monthly hours
        const weekPercentage = totalMonthlyHours > 0 ? (totalWeekHours / totalMonthlyHours) * 100 : 0;
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

        // Get current date for highlighting
        const today = new Date();
        const isCurrentMonth = this.currentMonth === (today.getMonth() + 1) && this.currentYear === today.getFullYear();

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

            // Check if this day is today for highlighting
            const isToday = isCurrentMonth &&
                           dayData.date.getDate() === today.getDate() &&
                           dayData.date.getMonth() === today.getMonth() &&
                           dayData.date.getFullYear() === today.getFullYear();

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
                        <span class="chart-tooltip-line">${hours.toFixed(2).replace('.', ',')} timer</span>
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

            // Click event for tooltip
            bar.addEventListener('click', (e) => {
                e.stopPropagation();

                if (bar.classList.contains('tooltip-active')) {
                    hideTooltip();
                    return;
                }

                if (activeTooltipBar && activeTooltipBar !== bar) {
                    activeTooltipBar.classList.remove('tooltip-active');
                }

                showTooltip(e);
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
        
        // Sort shifts by date (newest first)
        const sortedShifts = monthShifts.sort((a, b) => b.date - a.date);
        
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
        const weekNumbers = Object.keys(weekGroups).sort((a, b) => b - a); // Sort weeks descending (newest first)
        
        weekNumbers.forEach((weekNumber, weekIndex) => {
            const weekShifts = weekGroups[weekNumber];
            
            // Add week separator BEFORE each week's shifts as a header
            shiftsHtml.push(`
                <div class="week-separator">
                    <div class="week-separator-line"></div>
                    <div class="week-separator-content">
                        <svg class="week-separator-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                        <span class="week-separator-week">Uke ${weekNumber}</span>
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
                
                shiftsHtml.push(`
                    <div class="shift-item ${typeClass}" data-shift-id="${shift.id}" style="cursor: pointer;">
                        <div class="shift-info">
                            <div class="shift-date">
                                <span class="shift-date-number">${day}. ${this.MONTHS[shift.date.getMonth()]}</span>
                                <span class="shift-date-separator"></span>
                                <span class="shift-date-weekday">${weekday}${seriesBadge}</span>
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

        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        // Always show the card, but handle different months differently
        nextShiftCard.style.display = 'block';

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

                // Create the shift item using the exact same structure as in the shift list
                const typeClass = lastShift.type === 0 ? 'weekday' : (lastShift.type === 1 ? 'saturday' : 'sunday');
                const seriesBadge = lastShift.seriesId ? '<span class="series-badge">Serie</span>' : '';

                // No highlighting for last shift (remove active class)
                nextShiftContent.innerHTML = `
                    <div class="shift-item ${typeClass}" data-shift-id="${lastShift.id}" style="cursor: pointer; position: relative;">
                        <div class="next-shift-badge">Siste</div>
                        <div class="shift-info">
                            <div class="shift-date">
                                <span class="shift-date-number">${day}. ${month}</span>
                                <span class="shift-date-separator"></span>
                                <span class="shift-date-weekday">${weekday}${seriesBadge}</span>
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
            
            // Add time remaining for today's shifts or "i morgen" for tomorrow's shifts
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
            } else if (shiftDate.toDateString() === tomorrow.toDateString()) {
                dateSuffix = ' (i morgen)';
            }
            
            // Determine if the shift should be highlighted (active)
            const isToday = shiftDate.toDateString() === today.toDateString();
            const isTomorrow = shiftDate.toDateString() === tomorrow.toDateString();
            const activeClass = (isToday || isTomorrow) ? ' active' : '';
            
            nextShiftContent.innerHTML = `
                <div class="shift-item ${typeClass}${activeClass}" data-shift-id="${nextShift.id}" style="cursor: pointer; position: relative;">
                    <div class="next-shift-badge">Neste</div>
                    <div class="shift-info">
                        <div class="shift-date">
                            <span class="shift-date-number">${day}. ${month}</span>
                            <span class="shift-date-separator"></span>
                            <span class="shift-date-weekday">${weekday}${seriesBadge}</span>
                            <span class="shift-countdown-timer">${dateSuffix}</span>
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
        
        // Calculate time worked so far
        const [startHour, startMinute] = currentShift.startTime.split(':').map(Number);
        const shiftStartTime = new Date(shiftDate);
        shiftStartTime.setHours(startHour, startMinute, 0, 0);
        
        const timeWorked = now - shiftStartTime;
        const hoursWorked = Math.floor(timeWorked / (1000 * 60 * 60));
        const minutesWorked = Math.floor((timeWorked % (1000 * 60 * 60)) / (1000 * 60));
        const secondsWorked = Math.floor((timeWorked % (1000 * 60)) / 1000);
        
        let timeWorkedText = '';
        if (hoursWorked > 0) {
            timeWorkedText = `<span class="countdown-wrapper">(<span class="countdown-hours">${hoursWorked}t</span> <span class="countdown-minutes">${minutesWorked}m</span> <span class="countdown-seconds">${secondsWorked}s</span>)</span><span class="countdown-dot-separator"> • </span><span class="countdown-no-parens"><span class="countdown-hours">${hoursWorked}t</span> <span class="countdown-minutes">${minutesWorked}m</span> <span class="countdown-seconds">${secondsWorked}s</span></span>`;
        } else if (minutesWorked > 0) {
            timeWorkedText = `<span class="countdown-wrapper">(<span class="countdown-minutes">${minutesWorked}m</span> <span class="countdown-seconds">${secondsWorked}s</span>)</span><span class="countdown-dot-separator"> • </span><span class="countdown-no-parens"><span class="countdown-minutes">${minutesWorked}m</span> <span class="countdown-seconds">${secondsWorked}s</span></span>`;
        } else {
            timeWorkedText = `<span class="countdown-wrapper">(<span class="countdown-seconds">${secondsWorked}s</span>)</span><span class="countdown-dot-separator"> • </span><span class="countdown-no-parens"><span class="countdown-seconds">${secondsWorked}s</span></span>`;
        }
        
        const typeClass = currentShift.type === 0 ? 'weekday' : (currentShift.type === 1 ? 'saturday' : 'sunday');
        const seriesBadge = currentShift.seriesId ? '<span class="series-badge">Serie</span>' : '';
        
        nextShiftContent.innerHTML = `
            <div class="shift-item ${typeClass} active" data-shift-id="${currentShift.id}" style="cursor: pointer; position: relative;">
                <div class="next-shift-badge">NÅ</div>
                <div class="shift-info">
                    <div class="shift-date">
                        <span class="shift-date-number">${day}. ${month}</span>
                        <span class="shift-date-separator"></span>
                        <span class="shift-date-weekday">${weekday}${seriesBadge}</span>
                        <span class="shift-countdown-timer"> ${timeWorkedText}</span>
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
        const wageRate = this.getCurrentWageRate();
        const bonuses = this.getCurrentBonuses();
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

        // Create the shift item using the exact same structure as other shift cards
        const typeClass = bestShift.type === 0 ? 'weekday' : (bestShift.type === 1 ? 'saturday' : 'sunday');
        const seriesBadge = bestShift.seriesId ? '<span class="series-badge">Serie</span>' : '';

        // No highlighting for best shift (remove active class)
        nextShiftContent.innerHTML = `
            <div class="shift-item ${typeClass}" data-shift-id="${bestShift.id}" style="cursor: pointer; position: relative;">
                <div class="next-shift-badge">Beste</div>
                <div class="shift-info">
                    <div class="shift-date">
                        <span class="shift-date-number">${day}. ${month}</span>
                        <span class="shift-date-separator"></span>
                        <span class="shift-date-weekday">${weekday}${seriesBadge}</span>
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
                    
                    content.appendChild(shiftData);
                    
                    cell.classList.add('has-shifts');
                    cell.style.cursor = 'pointer';
                    cell.onclick = (e) => {
                        e.stopPropagation();
                        if (shiftsForDay.length > 0) {
                            this.showShiftDetails(shiftsForDay[0].id);
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

                // Set up click handler for cells with shifts
                cell.onclick = (e) => {
                    e.stopPropagation();
                    if (shiftsToDisplay.length > 0) {
                        this.showShiftDetails(shiftsToDisplay[0].id);
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
        this.closeSettings();
        
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
        contentContainer.style.cssText = `
            opacity: 0;
            animation: slideInFromBottom 0.6s var(--ease-default) 0.3s forwards;
            flex: 1;
            display: flex;
            flex-direction: column;
            padding: 0 24px 24px 24px;
            padding-bottom: 80px; 
            gap: 16px;
            overflow-y: auto;
        `;

        // Calculate shift details
        const calc = this.calculateShift(shift);
        const dayName = this.WEEKDAYS[shift.date.getDay()];
        const monthName = this.MONTHS[shift.date.getMonth()];
        const formattedDate = `${dayName} ${shift.date.getDate()}. ${monthName}`;
        const originalIndex = this.shifts.indexOf(shift);

        // Create compact content
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

            // Load profile picture
            await this.loadProfilePicture();

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

    // Profile Picture Management Methods
    async loadProfilePicture() {
        try {
            const { data: { user } } = await window.supa.auth.getUser();
            if (!user) return;

            // Get profile picture URL from user settings
            const { data: settings } = await window.supa
                .from('user_settings')
                .select('profile_picture_url')
                .eq('user_id', user.id)
                .single();

            const profilePictureUrl = settings?.profile_picture_url;

            // Update the profile modal preview
            this.updateProfilePicturePreview(profilePictureUrl);

            // Update the top bar profile picture
            this.updateTopBarProfilePicture(profilePictureUrl);

        } catch (err) {
            console.error('Error loading profile picture:', err);
            // Show placeholder if error
            this.updateProfilePicturePreview(null);
            this.updateTopBarProfilePicture(null);
        }
    },

    updateProfilePicturePreview(imageUrl) {
        const currentElement = document.getElementById('profilePictureCurrent');
        const statusElement = document.getElementById('profilePictureStatus');
        const sizeElement = document.getElementById('profilePictureSize');
        const removeBtn = document.getElementById('removeProfilePictureBtn');

        if (!currentElement) return;

        if (imageUrl) {
            // Show the uploaded image
            currentElement.innerHTML = `<img src="${imageUrl}" alt="Profilbilde" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <svg class="profile-placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: none;">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                </svg>`;

            if (statusElement) statusElement.textContent = 'Profilbilde lastet';
            if (sizeElement) sizeElement.textContent = '';
            if (removeBtn) removeBtn.style.display = 'inline-flex';
        } else {
            // Show placeholder
            currentElement.innerHTML = `<svg class="profile-placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
            </svg>`;

            if (statusElement) statusElement.textContent = 'Ingen profilbilde';
            if (sizeElement) sizeElement.textContent = '';
            if (removeBtn) removeBtn.style.display = 'none';
        }
    },

    updateTopBarProfilePicture(imageUrl) {
        const profileIcon = document.querySelector('.profile-icon');
        if (!profileIcon) return;

        const profileBtn = profileIcon.closest('.user-profile-btn');
        if (!profileBtn) return;

        if (imageUrl) {
            // Replace SVG with image
            const img = document.createElement('img');
            img.src = imageUrl;
            img.alt = 'Profilbilde';
            img.className = 'profile-picture-img';
            img.style.cssText = `
                transition: all var(--speed-normal) var(--ease-default);
                opacity: 0;
            `;

            // Handle image load success
            img.onload = () => {
                img.style.opacity = '1';
            };

            // Handle image load error
            img.onerror = () => {
                console.log('Profile picture failed to load, showing placeholder');
                this.updateTopBarProfilePicture(null);
            };

            profileIcon.replaceWith(img);
        } else {
            // Show placeholder SVG
            if (profileIcon.tagName === 'IMG') {
                const svg = document.createElement('svg');
                svg.className = 'icon-sm profile-icon';
                svg.setAttribute('viewBox', '0 0 24 24');
                svg.setAttribute('fill', 'none');
                svg.setAttribute('stroke', 'currentColor');
                svg.setAttribute('stroke-width', '2');
                svg.setAttribute('stroke-linecap', 'round');
                svg.setAttribute('stroke-linejoin', 'round');
                svg.setAttribute('aria-hidden', 'true');
                svg.innerHTML = `
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                `;
                profileIcon.replaceWith(svg);
            }
        }
    },

    selectProfilePicture() {
        const input = document.getElementById('profilePictureInput');
        if (input) {
            input.click();
        }
    },

    async handleProfilePictureChange(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            // Check if cropping is available (Cropper library loaded)
            if (typeof Cropper === 'undefined') {
                console.warn('Cropper library not available, falling back to direct upload');
                await this.fallbackDirectUpload(file);
                return;
            }

            // Show cropping modal
            await this.showCroppingModal(file);
        } catch (error) {
            console.error('Error handling profile picture:', error);

            // Fallback to direct upload if cropping fails
            console.log('Falling back to direct upload due to error');
            try {
                await this.fallbackDirectUpload(file);
            } catch (fallbackError) {
                console.error('Fallback upload also failed:', fallbackError);
                this.showUploadError('Kunne ikke laste opp bildet: ' + fallbackError.message);
            }
        }

        // Clear the input
        event.target.value = '';
    },

    async fallbackDirectUpload(file) {
        // Show progress
        this.showProfilePictureProgress(true);
        this.updateProfilePictureProgress(0, 'Validerer bilde...');

        // Validate and compress the image
        const compressedBlob = await window.imageUtils.compressImage(file, (progress) => {
            this.updateProfilePictureProgress(progress * 0.5, 'Komprimerer bilde...');
        });

        this.updateProfilePictureProgress(50, 'Laster opp...');

        // Upload to Supabase Storage
        const imageUrl = await this.uploadProfilePictureToStorage(compressedBlob);

        this.updateProfilePictureProgress(90, 'Oppdaterer profil...');

        // Update user settings with the new image URL
        await this.saveProfilePictureUrl(imageUrl);

        this.updateProfilePictureProgress(100, 'Fullført!');

        // Update UI
        this.updateProfilePicturePreview(imageUrl);
        this.updateTopBarProfilePicture(imageUrl);

        // Hide progress after a short delay
        setTimeout(() => {
            this.showProfilePictureProgress(false);
        }, 1000);
    },

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

    async uploadProfilePictureToStorage(blob) {
        const { data: { user } } = await window.supa.auth.getUser();
        if (!user) throw new Error('Ikke innlogget');

        // Generate unique filename
        const filename = window.imageUtils.generateProfilePictureFilename(user.id, 'jpg');

        // Upload to Supabase Storage
        const { data, error } = await window.supa.storage
            .from('profile-pictures')
            .upload(filename, blob, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            throw new Error('Kunne ikke laste opp bilde: ' + error.message);
        }

        // Get public URL
        const { data: { publicUrl } } = window.supa.storage
            .from('profile-pictures')
            .getPublicUrl(filename);

        return publicUrl;
    },

    async saveProfilePictureUrl(imageUrl) {
        const { data: { user } } = await window.supa.auth.getUser();
        if (!user) throw new Error('Ikke innlogget');

        const { error } = await window.supa
            .from('user_settings')
            .upsert({
                user_id: user.id,
                profile_picture_url: imageUrl,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

        if (error) {
            throw new Error('Kunne ikke lagre profilbilde-URL: ' + error.message);
        }
    },

    async removeProfilePicture() {
        try {
            const { data: { user } } = await window.supa.auth.getUser();
            if (!user) return;

            // Get current profile picture URL
            const { data: settings } = await window.supa
                .from('user_settings')
                .select('profile_picture_url')
                .eq('user_id', user.id)
                .single();

            const currentUrl = settings?.profile_picture_url;

            // Remove from storage if exists
            if (currentUrl && currentUrl.includes('profile-pictures')) {
                const filename = currentUrl.split('/').pop();
                await window.supa.storage
                    .from('profile-pictures')
                    .remove([`${user.id}/${filename}`]);
            }

            // Update user settings to remove URL
            await window.supa
                .from('user_settings')
                .upsert({
                    user_id: user.id,
                    profile_picture_url: null,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

            // Update UI
            this.updateProfilePicturePreview(null);
            this.updateTopBarProfilePicture(null);

            // Show success message
            const msgElement = document.getElementById('profile-update-msg');
            if (msgElement) {
                msgElement.style.color = 'var(--success)';
                msgElement.textContent = 'Profilbilde fjernet';
                setTimeout(() => {
                    msgElement.textContent = '';
                }, 3000);
            }

        } catch (error) {
            console.error('Error removing profile picture:', error);

            const msgElement = document.getElementById('profile-update-msg');
            if (msgElement) {
                msgElement.style.color = 'var(--danger)';
                msgElement.textContent = 'Kunne ikke fjerne profilbilde';
                setTimeout(() => {
                    msgElement.textContent = '';
                }, 5000);
            }
        }
    },

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
    initProfilePictureListeners() {
        const input = document.getElementById('profilePictureInput');
        if (input) {
            input.addEventListener('change', (event) => {
                this.handleProfilePictureChange(event);
            });
        }
    },

    // Image Cropping Methods
    async showCroppingModal(file) {
        try {
            // Validate file first
            const validation = window.imageUtils.validateFile(file);
            if (!validation.valid) {
                throw new Error(validation.error);
            }

            // Store the file for later use
            this.currentCropFile = file;

            // Create blob URL for cropping modal (will be cleaned up in cancelCrop)
            this.currentCropBlobUrl = URL.createObjectURL(file);

            // Set up the cropping modal
            const cropModal = document.getElementById('cropModal');
            const cropImage = document.getElementById('cropImage');

            if (!cropModal || !cropImage) {
                throw new Error('Cropping modal elements not found');
            }

            // Set up event handlers before setting src
            cropImage.onload = () => {
                cropImage.classList.add('loaded');
                this.initializeCropper(cropImage);
            };

            // Handle image load error - no infinite loop
            cropImage.onerror = (event) => {
                console.error('Failed to load image for cropping:', event);
                this.handleCropImageError('Kunne ikke laste bildet for beskjæring');
            };

            // Set the image source using the blob URL
            cropImage.src = this.currentCropBlobUrl;

            // Show the modal
            cropModal.classList.add('active');

        } catch (error) {
            console.error('Error showing cropping modal:', error);
            // Clean up on error
            this.cleanupCropResources();
            // Show user-friendly error message instead of throwing
            this.showCropError(error.message);
        }
    },

    initializeCropper(imageElement) {
        try {
            // Destroy existing cropper if any
            if (this.cropper) {
                this.cropper.destroy();
            }

            // Detect if mobile for touch-optimized settings
            const isMobile = window.innerWidth <= 768;

            // Initialize Cropper.js with mobile-optimized settings
            this.cropper = new Cropper(imageElement, {
                aspectRatio: 1, // Square crop by default
                viewMode: 1,
                dragMode: 'move',
                autoCropArea: isMobile ? 0.9 : 0.8, // Larger crop area on mobile
                restore: false,
                guides: !isMobile, // Hide guides on mobile for cleaner interface
                center: true,
                highlight: false,
                cropBoxMovable: true,
                cropBoxResizable: true,
                toggleDragModeOnDblclick: false,
                responsive: true,
                checkOrientation: false,
                modal: true,
                background: true,
                // Mobile-optimized touch settings
                wheelZoomRatio: isMobile ? 0.05 : 0.1, // Slower zoom on mobile
                minContainerWidth: isMobile ? 200 : 300,
                minContainerHeight: isMobile ? 200 : 300,
                crop: (event) => {
                    this.updateCropPreview(event.detail);
                },
                cropend: (event) => {
                    // Force preview update when crop ends (mobile sync fix)
                    if (window.innerWidth <= 768) {
                        setTimeout(() => {
                            this.updateCropPreview(event.detail);
                        }, 50);
                    }
                },
                ready: () => {
                    // Add mobile touch enhancements after cropper is ready
                    if (isMobile) {
                        this.addMobileTouchEnhancements();
                    }

                    // Test cropper methods to ensure they work
                    this.testCropperMethods();
                },
                error: (event) => {
                    console.error('Cropper initialization error:', event);
                    this.handleCropImageError('Feil ved initialisering av beskjæring');
                }
            });

            // Cropper initialized successfully

        } catch (error) {
            console.error('Error initializing cropper:', error);
            this.handleCropImageError('Kunne ikke initialisere beskjæring');
        }
    },

    testCropperMethods() {
        if (!this.cropper) return;

        try {
            // Test essential methods
            const imageData = this.cropper.getImageData();
            const cropData = this.cropper.getData();
            const testCanvas = this.cropper.getCroppedCanvas({
                width: 100,
                height: 100
            });

            console.log('Cropper methods test passed:', {
                imageData: !!imageData,
                cropData: !!cropData,
                canvas: !!testCanvas
            });

        } catch (error) {
            console.error('Cropper methods test failed:', error);
            this.handleCropImageError('Beskjæringsfunksjonalitet ikke tilgjengelig');
        }
    },

    updateCropPreview(cropData) {
        if (!this.cropper) return;

        const previewContainer = document.getElementById('cropPreview');
        if (!previewContainer) return;

        // Throttle preview updates on mobile for better performance
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            if (this.previewUpdateTimeout) {
                clearTimeout(this.previewUpdateTimeout);
            }

            this.previewUpdateTimeout = setTimeout(() => {
                this.performCropPreviewUpdate(isMobile);
            }, 100); // 100ms throttle on mobile
        } else {
            // Update immediately on desktop
            this.performCropPreviewUpdate(false);
        }
    },

    performCropPreviewUpdate(isMobile = false) {
        if (!this.cropper) return;

        const previewContainer = document.getElementById('cropPreview');
        if (!previewContainer) return;

        try {
            // Mobile-optimized preview settings
            const previewSize = isMobile ? 80 : 120;
            const quality = isMobile ? 'medium' : 'high';

            // Get the cropped canvas directly from Cropper.js
            const croppedCanvas = this.cropper.getCroppedCanvas({
                width: previewSize,
                height: previewSize,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: quality,
                // Mobile optimization: reduce fill color processing
                fillColor: isMobile ? undefined : '#fff'
            });

            if (!croppedCanvas) {
                console.warn('Could not get cropped canvas for preview');
                return;
            }

            // Clear previous preview
            previewContainer.innerHTML = '';

            // Add new preview with mobile-specific styling
            if (isMobile) {
                croppedCanvas.style.width = '100%';
                croppedCanvas.style.height = '100%';
                croppedCanvas.style.objectFit = 'cover';
            }

            previewContainer.appendChild(croppedCanvas);

            // Force a repaint on mobile to ensure sync
            if (isMobile) {
                previewContainer.style.transform = 'translateZ(0)';
                requestAnimationFrame(() => {
                    previewContainer.style.transform = '';
                });
            }

        } catch (error) {
            console.error('Error updating crop preview:', error);

            // Fallback: show a placeholder on mobile if preview fails
            if (isMobile) {
                previewContainer.innerHTML = '<div style="width: 100%; height: 100%; background: var(--bg-tertiary); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); font-size: 12px;">Forhåndsvisning</div>';
            }
        }
    },



    setCropZoom(value) {
        if (this.cropper) {
            this.cropper.zoomTo(parseFloat(value));
        }
    },

    adjustCropZoom(delta) {
        if (this.cropper) {
            const currentZoom = this.cropper.getImageData().ratio;
            const newZoom = Math.max(0.1, Math.min(3, currentZoom + delta));
            this.cropper.zoomTo(newZoom);

            // Update slider
            const slider = document.getElementById('cropZoomSlider');
            if (slider) {
                slider.value = newZoom;
            }
        }
    },

    async confirmCrop() {
        if (!this.cropper || !this.currentCropFile) {
            console.error('No cropper or file available');
            this.showCropError('Ingen beskjæring tilgjengelig');
            return;
        }

        try {
            // Get cropped canvas directly from Cropper.js
            const croppedCanvas = this.cropper.getCroppedCanvas({
                width: 400,
                height: 400,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high'
            });

            if (!croppedCanvas) {
                throw new Error('Kunne ikke lage beskjært bilde');
            }

            // Close cropping modal
            this.cancelCrop();

            // Show progress
            this.showProfilePictureProgress(true);
            this.updateProfilePictureProgress(0, 'Beskjærer bilde...');

            // Compress the cropped canvas
            const compressedBlob = await window.imageUtils.compressImage(croppedCanvas, (progress) => {
                this.updateProfilePictureProgress(progress * 0.5, 'Komprimerer bilde...');
            });

            this.updateProfilePictureProgress(50, 'Laster opp...');

            // Upload to Supabase Storage
            const imageUrl = await this.uploadProfilePictureToStorage(compressedBlob);

            this.updateProfilePictureProgress(90, 'Oppdaterer profil...');

            // Update user settings with the new image URL
            await this.saveProfilePictureUrl(imageUrl);

            this.updateProfilePictureProgress(100, 'Fullført!');

            // Update UI
            this.updateProfilePicturePreview(imageUrl);
            this.updateTopBarProfilePicture(imageUrl);

            // Hide progress after a short delay
            setTimeout(() => {
                this.showProfilePictureProgress(false);
            }, 1000);

        } catch (error) {
            console.error('Error confirming crop:', error);
            this.showProfilePictureProgress(false);

            // Show error message
            const msgElement = document.getElementById('profile-update-msg');
            if (msgElement) {
                msgElement.style.color = 'var(--danger)';
                msgElement.textContent = 'Feil ved opplasting: ' + error.message;
                setTimeout(() => {
                    msgElement.textContent = '';
                }, 5000);
            }
        }
    },

    cancelCrop() {
        // Clean up resources
        this.cleanupCropResources();

        // Hide modal
        const cropModal = document.getElementById('cropModal');
        if (cropModal) {
            cropModal.classList.remove('active');
        }

        // Clear image source and classes
        const cropImage = document.getElementById('cropImage');
        if (cropImage) {
            cropImage.src = '';
            cropImage.classList.remove('loaded');
            cropImage.onload = null;
            cropImage.onerror = null;
        }

        // Clear preview
        const previewContainer = document.getElementById('cropPreview');
        if (previewContainer) {
            previewContainer.innerHTML = '';
        }

        // Reset zoom slider
        const slider = document.getElementById('cropZoomSlider');
        if (slider) {
            slider.value = 1;
        }
    },

    cleanupCropResources() {
        // Clean up mobile touch enhancements
        this.removeMobileTouchEnhancements();

        // Clean up preview update timeout
        if (this.previewUpdateTimeout) {
            clearTimeout(this.previewUpdateTimeout);
            this.previewUpdateTimeout = null;
        }

        // Destroy cropper
        if (this.cropper) {
            this.cropper.destroy();
            this.cropper = null;
        }

        // Clean up blob URL to prevent memory leaks
        if (this.currentCropBlobUrl) {
            URL.revokeObjectURL(this.currentCropBlobUrl);
            this.currentCropBlobUrl = null;
        }

        // Clear stored file
        this.currentCropFile = null;
    },

    handleCropImageError(message) {
        console.error('Crop image error:', message);
        this.cleanupCropResources();
        this.showCropError(message);
    },

    showCropError(message) {
        // Hide cropping modal
        const cropModal = document.getElementById('cropModal');
        if (cropModal) {
            cropModal.classList.remove('active');
        }

        // Show error in profile modal
        const msgElement = document.getElementById('profile-update-msg');
        if (msgElement) {
            msgElement.style.color = 'var(--danger)';
            msgElement.textContent = 'Feil ved bildebeskjæring: ' + message;
            setTimeout(() => {
                msgElement.textContent = '';
            }, 5000);
        }
    },

    addMobileTouchEnhancements() {
        if (!this.cropper) return;

        const cropperContainer = this.cropper.getContainerElement();
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
                    const currentZoom = this.cropper.getImageData().ratio;
                    const newZoom = Math.max(0.1, Math.min(3, currentZoom * ratio));
                    this.cropper.zoomTo(newZoom);

                    // Update zoom slider
                    const slider = document.getElementById('cropZoomSlider');
                    if (slider) {
                        slider.value = newZoom;
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
                total: 0
            };
        }
        
        let paidHours = durationHours;
        let adjustedEndMinutes = endMinutes;
        
        // Apply pause deduction if enabled
        if (this.pauseDeduction && durationHours > this.PAUSE_THRESHOLD) {
            paidHours -= this.PAUSE_DEDUCTION;
            adjustedEndMinutes -= this.PAUSE_DEDUCTION * 60;
        }
        
        const wageRate = this.getCurrentWageRate();
        const baseWage = paidHours * wageRate;
        const bonuses = this.getCurrentBonuses();
        const bonusType = shift.type === 0 ? 'weekday' : (shift.type === 1 ? 'saturday' : 'sunday');
        const bonusSegments = bonuses[bonusType] || [];
        
        // Recreate the end time after any pause deduction or midnight handling
        // so we can reuse the same format when calculating bonuses
        const endHour = Math.floor(adjustedEndMinutes / 60) % 24;
        const endTimeStr = `${String(endHour).padStart(2,'0')}:${(adjustedEndMinutes % 60).toString().padStart(2,'0')}`;

        const bonus = this.calculateBonus(
            shift.startTime,
            endTimeStr,
            bonusSegments
        );
        
        return {
            hours: parseFloat(paidHours.toFixed(2)),
            totalHours: parseFloat(durationHours.toFixed(2)),
            paidHours: parseFloat(paidHours.toFixed(2)),
            pauseDeducted: this.pauseDeduction && durationHours > this.PAUSE_THRESHOLD,
            baseWage: baseWage,
            bonus: bonus,
            total: baseWage + bonus
        };
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
    formatHours(hours) {
        return hours.toFixed(2).replace('.', ',') + ' timer';
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
            
            this.updateDisplay();
            return true;
        } catch (e) {
            console.error('Error in deleteShift:', e);
            alert('En feil oppstod ved sletting av vakt');
            return false;
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

            // Hide header
            const header = document.querySelector('.header');
            if (header) {
                header.classList.add('hidden');
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
        
        // Highlight the selected date in the grid
        setTimeout(() => {
            const dateDay = shift.date.getDate();
            const dateCell = document.querySelector(`#editDateGrid .date-cell[data-day="${dateDay}"]`);
            if (dateCell) {
                dateCell.classList.add('selected');
            }
        }, 100);
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
            
            // Automatically determine shift type from selected date
            const dayOfWeek = this.editSelectedDate.getDay();
            const type = dayOfWeek === 0 ? 2 : (dayOfWeek === 6 ? 1 : 0);
            
            if (!startHour || !endHour) {
                alert('Vennligst fyll ut arbeidstid');
                return;
            }
            
            
            // Get authenticated user
            const { data: { user }, error: authError } = await window.supa.auth.getUser();
            if (authError) {
                console.error('updateShift: Authentication error:', authError);
                alert('Feil ved autentisering');
                return;
            }
            if (!user) {
                alert('Du er ikke innlogget');
                return;
            }
            
            // Create updated shift data
            const updatedShiftData = {
                shift_date: `${this.editSelectedDate.getFullYear()}-${(this.editSelectedDate.getMonth() + 1).toString().padStart(2, '0')}-${this.editSelectedDate.getDate().toString().padStart(2, '0')}`,
                start_time: `${startHour}:${startMinute}`,
                end_time: `${endHour}:${endMinute}`,
                shift_type: type,
                series_id: null // Remove series ID when editing a shift
            };
            
            // Update in database
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
            originalShift.startTime = `${startHour}:${startMinute}`;
            originalShift.endTime = `${endHour}:${endMinute}`;
            originalShift.type = type;
            originalShift.seriesId = null; // Remove series ID from local object
            
            // Update both userShifts and shifts arrays
            const userShiftIndex = this.userShifts.findIndex(s => s.id === originalShift.id);
            if (userShiftIndex !== -1) {
                this.userShifts[userShiftIndex] = { ...originalShift };
            }
            
            this.shifts = [...this.userShifts];
            
            // Update display
            this.updateDisplay();
            
            // Close edit modal
            this.closeEditShift();

            
            // Show success message
            alert('Vakt oppdatert!');
            
        } catch (e) {
            console.error('updateShift: Critical error:', e);
            alert(`En uventet feil oppstod: ${e.message}`);
        }
    },
    
    // Feature introduction for recurring shifts
    showRecurringIntroduction() {
        // Close any open modals first
        this.closeSettings();
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
                    compactView: this.compactView
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

        // Compact view toggle
        const compactViewToggle = document.getElementById('compactViewToggle');
        if (compactViewToggle) {
            compactViewToggle.addEventListener('change', () => {
                this.compactView = compactViewToggle.checked;
                this.saveSettingsToSupabase();
                this.updateDisplay(); // Refresh display with new view

                // Add/remove compact class to body
                if (this.compactView) {
                    document.body.classList.add('compact-view');
                } else {
                    document.body.classList.remove('compact-view');
                }
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
                    compactView: this.compactView
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
    }
};

