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
    const monthlyGoalInput = document.getElementById('monthlyGoalInput');
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
        document.addEventListener('DOMContentLoaded', setupMonthlyGoalInput);
    } else {
        setupMonthlyGoalInput();
    }
}

// Progressbar update function
function updateProgressBar(current, goal, shouldAnimate = false) {
    const fill = document.querySelector('.progress-fill');
    const label = document.querySelector('.progress-label');
    
    if (!fill || !label) return;

    const percent = Math.round((current / goal) * 100);
    
    if (shouldAnimate) {
        // Force clear any stuck animation state first
        fill.dataset.animating = 'false';
        
        // Remove loading class and enable transition
        fill.classList.remove('loading');
        fill.style.transition = 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
        
        // Mark as animating after clearing stuck state
        fill.dataset.animating = 'true';
        
        // Set the target width
        fill.style.width = Math.min(percent, 100) + '%';
        
        // If we're at 100%, handle animation cleanup
        if (percent >= 100) {
            const handleTransitionEnd = (event) => {
                if (event.target === fill && event.propertyName === 'width') {
                    fill.removeEventListener('transitionend', handleTransitionEnd);
                    fill.dataset.animating = 'false';
                    
                    // Set initial animation complete flag if this is the first animation
                    if (typeof window !== 'undefined' && window.app && !window.app.initialAnimationComplete) {
                        window.app.initialAnimationComplete = true;
                    }
                }
            };
            
            fill.addEventListener('transitionend', handleTransitionEnd);
            
            // Fallback timeout in case transitionend doesn't fire (e.g., when already at 100%)
            setTimeout(() => {
                fill.dataset.animating = 'false';
                
                // Set initial animation complete flag if this is the first animation
                if (typeof window !== 'undefined' && window.app && !window.app.initialAnimationComplete) {
                    window.app.initialAnimationComplete = true;
                }
                
                // Clean up event listener if it hasn't been called
                fill.removeEventListener('transitionend', handleTransitionEnd);
            }, 850); // Slightly longer than animation duration
        } else {
            // Animation without confetti - still need to clean up
            const handleTransitionEnd = (event) => {
                if (event.target === fill && event.propertyName === 'width') {
                    fill.removeEventListener('transitionend', handleTransitionEnd);
                    fill.dataset.animating = 'false';
                    
                    // Set initial animation complete flag if this is the first animation
                    if (typeof window !== 'undefined' && window.app && !window.app.initialAnimationComplete) {
                        window.app.initialAnimationComplete = true;
                    }
                }
            };
            
            fill.addEventListener('transitionend', handleTransitionEnd);
            
            // Fallback timeout
            setTimeout(() => {
                fill.dataset.animating = 'false';
                
                // Set initial animation complete flag if this is the first animation
                if (typeof window !== 'undefined' && window.app && !window.app.initialAnimationComplete) {
                    window.app.initialAnimationComplete = true;
                }
                
                // Clean up event listener if it hasn't been called
                fill.removeEventListener('transitionend', handleTransitionEnd);
            }, 850);
        }
    } else {
        // For immediate updates, force clear stuck animation state
        fill.dataset.animating = 'false';
        
        // Set width without transition
        fill.style.transition = 'none';
        fill.style.width = Math.min(percent, 100) + '%';
        // Force reflow
        fill.offsetHeight;
        // Re-enable transition for future animations
        fill.style.transition = 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
    }
    
    // Update classes based on progress
    if (percent >= 100) {
        fill.classList.add('full');
        // Add overachievement styling for values above 100%
        const progressCard = fill.closest('.progress-card');
        if (percent > 100) {
            if (progressCard) progressCard.classList.add('overachievement');
        } else {
            if (progressCard) progressCard.classList.remove('overachievement');
        }
    } else {
        fill.classList.remove('full');
        const progressCard = fill.closest('.progress-card');
        if (progressCard) progressCard.classList.remove('overachievement');
    }
    
    // Add active class when nearing goal completion (80% or higher)
    if (percent >= 80) {
        fill.classList.add('active');
    } else {
        fill.classList.remove('active');
    }
    
    // Update label text
    const currencySuffix = window.app && window.app.currencyFormat ? ' NOK' : ' kr';
    label.textContent = percent.toFixed(1) + '% av ' + goal.toLocaleString('no-NO') + currencySuffix;
    fill.title = `${current.toLocaleString('no-NO')}${currencySuffix} av ${goal.toLocaleString('no-NO')}${currencySuffix}`;
}

// Legg til i app-objektet for enkel tilgang fra innstillinger
if (typeof window !== 'undefined') {
    window.updateProgressBar = updateProgressBar;
    window.getMonthlyGoal = getMonthlyGoal;
    window.setMonthlyGoal = setMonthlyGoal;
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
    selectedDate: null,
    userShifts: [],
    formState: {}, // Store form state to preserve across page restarts
    emailHideTimeout: null, // Timeout for auto-hiding email
    initialAnimationComplete: false, // Track if initial progress bar animation is complete
    async init() {
        // Initialize selectedDates array for multiple date selection
        this.selectedDates = [];
        
        // Reset progress bar to initial state
        const fill = document.querySelector('.progress-fill');
        if (fill) {
            fill.classList.add('loading');
            fill.style.width = '0%';
            fill.style.transition = 'none';
        }
        
        // Show UI elements
        this.populateTimeSelects();
        this.populateMonthDropdown();
        this.populateYearDropdown();
        
        // Display user email
        await this.displayUserEmail();
        
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
        // Close month dropdown when clicking outside
        document.addEventListener('click', e => {
            const monthSelector = document.querySelector('.month-selector');
            if (!monthSelector.contains(e.target)) this.closeMonthDropdown();
        });
        
        // Reposition month dropdown on window resize/scroll
        window.addEventListener('resize', () => {
            const dd = document.getElementById('monthDropdown');
            if (dd.classList.contains('active')) {
                this.positionMonthDropdown();
            }
        });
        
        window.addEventListener('scroll', () => {
            const dd = document.getElementById('monthDropdown');
            if (dd.classList.contains('active')) {
                this.positionMonthDropdown();
            }
        });
        
        // Close breakdown on Escape key
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                this.closeBreakdown();
                // Also hide email if visible
                this.hideEmailDisplay();
            }
        });
        
        // Clean up any existing timeout
        if (this.emailHideTimeout) {
            clearTimeout(this.emailHideTimeout);
            this.emailHideTimeout = null;
        }
        
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

        // Setup monthly goal input after everything is loaded
        setupMonthlyGoalInput();
        
        // Check if we should show the recurring feature introduction
        this.checkAndShowRecurringIntro();
    },

    async displayUserEmail() {
        try {
            const { data: { user } } = await window.supa.auth.getUser();
            if (user && user.email) {
                const userEmailElement = document.getElementById('userEmail');
                const userEmailContainer = document.getElementById('userEmailContainer');
                const emailToggleBtn = document.getElementById('emailToggleBtn');
                
                if (userEmailElement && userEmailContainer) {
                    userEmailElement.textContent = user.email;
                    userEmailContainer.style.display = 'flex';
                    
                    // Add tooltip to email button showing full email
                    if (emailToggleBtn) {
                        emailToggleBtn.title = `Vis e-post: ${user.email}`;
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching user email:', error);
            // Skjul email-elementet hvis det oppstår en feil
            const userEmailContainer = document.getElementById('userEmailContainer');
            if (userEmailContainer) {
                userEmailContainer.style.display = 'none';
            }
        }
    },

    toggleEmailDisplay() {
        const userEmailDisplay = document.getElementById('userEmailDisplay');
        
        if (!userEmailDisplay) return;

        const isVisible = userEmailDisplay.style.display !== 'none';
        
        if (isVisible) {
            this.hideEmailDisplay();
        } else {
            this.showEmailDisplay();
        }
    },

    calculateSlideDistance(emailText) {
        // Very simple approach: fixed slide distances based on screen size and email length
        const isMobile = window.innerWidth <= 768;
        const isSmallMobile = window.innerWidth <= 480;
        
        // Get email length category
        const emailLength = emailText.length;
        
        let slideDistance = 0;
        
        if (isSmallMobile) {
            // Small mobile: very conservative sliding to prevent overflow
            if (emailLength > 20) slideDistance = 40;
            else if (emailLength > 15) slideDistance = 30;
            else if (emailLength > 10) slideDistance = 20;
            else slideDistance = 15;
        } else if (isMobile) {
            // Mobile: moderate sliding
            if (emailLength > 25) slideDistance = 70;
            else if (emailLength > 20) slideDistance = 60;
            else if (emailLength > 15) slideDistance = 50;
            else if (emailLength > 10) slideDistance = 35;
            else slideDistance = 25;
        } else {
            // Desktop: more generous sliding
            if (emailLength > 30) slideDistance = 150;
            else if (emailLength > 25) slideDistance = 120;
            else if (emailLength > 20) slideDistance = 100;
            else if (emailLength > 15) slideDistance = 80;
            else if (emailLength > 10) slideDistance = 60;
        }
        
        return -slideDistance; // Negative because we slide left
    },

    showEmailDisplay() {
        const userEmailDisplay = document.getElementById('userEmailDisplay');
        const userEmailContainer = document.getElementById('userEmailContainer');
        const userEmail = document.getElementById('userEmail');
        const monthSelector = document.querySelector('.month-selector');
        const wageDisplay = document.getElementById('currentWage');
        const emailToggleBtn = document.getElementById('emailToggleBtn');
        
        // Find the parent span elements using proper traversal
        const monthSelectorSpan = monthSelector ? monthSelector.parentElement : null;
        const wageSelectorSpan = wageDisplay ? wageDisplay.parentElement : null;
        
        // Calculate dynamic slide distance based on email length
        const emailText = userEmail ? userEmail.textContent : '';
        const slideDistance = this.calculateSlideDistance(emailText);
        
        // Set reasonable max-width based on screen size
        const isMobile = window.innerWidth <= 768;
        const isSmallMobile = window.innerWidth <= 480;
        
        let emailTextWidth;
        if (isSmallMobile) {
            emailTextWidth = Math.min(120, window.innerWidth * 0.35); // More conservative on small mobile
        } else if (isMobile) {
            emailTextWidth = Math.min(160, window.innerWidth * 0.45); // More conservative on mobile
        } else {
            emailTextWidth = 400; // Desktop default
        }
        
        // Set dynamic slide distance on container
        if (userEmailContainer) {
            userEmailContainer.style.setProperty('--slide-distance', `${slideDistance}px`);
        }
        
        // Set dynamic max-width for email text
        if (userEmailDisplay) {
            userEmailDisplay.style.setProperty('--email-max-width', `${emailTextWidth}px`);
        }
        
        // Set same distance for month/wage elements to move synchronously
        if (monthSelectorSpan) {
            monthSelectorSpan.style.setProperty('--slide-distance', `${slideDistance}px`);
        }
        if (wageSelectorSpan) {
            wageSelectorSpan.style.setProperty('--slide-distance', `${slideDistance}px`);
        }
        
        // Hide month selector and wage with smooth transition (including icons)
        if (monthSelectorSpan) {
            monthSelectorSpan.classList.add('hidden');
        }
        
        // Close month dropdown if open to avoid confusion during animation
        this.closeMonthDropdown();
        
        if (wageSelectorSpan) {
            wageSelectorSpan.classList.add('hidden');
        }
        
        // Mark button as active
        if (emailToggleBtn) {
            emailToggleBtn.classList.add('active');
        }
        
        // Start container slide-left animation
        if (userEmailContainer) {
            userEmailContainer.classList.add('slide-left');
        }
        
        // Show email with smooth transition after short delay
        setTimeout(() => {
            if (userEmailDisplay) {
                userEmailDisplay.style.display = 'inline-block';
                // Add show class for smooth appearance
                requestAnimationFrame(() => {
                    userEmailDisplay.classList.add('show');
                });
            }
        }, 100);
        
        // Auto-hide email after 2 seconds
        clearTimeout(this.emailHideTimeout);
        this.emailHideTimeout = setTimeout(() => {
            this.hideEmailDisplay();
        }, 2000);
    },

    hideEmailDisplay() {
        const userEmailDisplay = document.getElementById('userEmailDisplay');
        const userEmailContainer = document.getElementById('userEmailContainer');
        const monthSelector = document.querySelector('.month-selector');
        const wageDisplay = document.getElementById('currentWage');
        const emailToggleBtn = document.getElementById('emailToggleBtn');
        
        // Find the parent span elements using proper traversal
        const monthSelectorSpan = monthSelector ? monthSelector.parentElement : null;
        const wageSelectorSpan = wageDisplay ? wageDisplay.parentElement : null;
        
        // Remove active status from button
        if (emailToggleBtn) {
            emailToggleBtn.classList.remove('active');
        }
        
        // Hide email first
        if (userEmailDisplay) {
            userEmailDisplay.classList.remove('show');
        }
        
        // Slide container back after short delay
        setTimeout(() => {
            if (userEmailContainer) {
                userEmailContainer.classList.remove('slide-left');
            }
        }, 100);
        
        // Show month selector and wage back after container returns (including icons)
        setTimeout(() => {
            if (monthSelectorSpan) {
                monthSelectorSpan.classList.remove('hidden');
                monthSelectorSpan.style.removeProperty('--slide-distance');
            }
            
            if (wageSelectorSpan) {
                wageSelectorSpan.classList.remove('hidden');
                wageSelectorSpan.style.removeProperty('--slide-distance');
            }
            
            // Hide email element completely
            if (userEmailDisplay) {
                userEmailDisplay.style.display = 'none';
                userEmailDisplay.style.removeProperty('--email-max-width');
            }
            
            // Reset slide distance on container
            if (userEmailContainer) {
                userEmailContainer.style.removeProperty('--slide-distance');
            }
        }, 300);
        
        // Clear timeout
        clearTimeout(this.emailHideTimeout);
        this.emailHideTimeout = null;
    },

    // Removed setupMobileEmailSlideOut since we now use a simpler toggle function

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
            
            // Only allow shifts starting between 06 and 23
            // to match the validation rules below
            for (let h = 6; h <= 23; h++) {
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
                        // Validate hours (06-23)
                        const hour = parseInt(value);
                        if (value.length === 2 && (hour < 6 || hour > 23)) {
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
    
    openAddShiftModal() {
        // Populate form elements if they're empty
        const startHourElement = document.getElementById('startHour');
        if (startHourElement && startHourElement.tagName === 'SELECT' && !startHourElement.options.length) {
            this.populateTimeSelects();
        } else if (!startHourElement) {
            this.populateTimeSelects();
        }
        if (!document.getElementById('dateGrid').childElementCount) this.populateDateGrid();
        
        // Show the modal
        document.getElementById('addShiftModal').style.display = 'block';
        
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
        document.getElementById('addShiftModal').style.display = 'none';
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
                alert('Vennligst fyll ut alle felt for gjentakende vakt');
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
            
            if (!confirm(`Dette vil legge til ${dates.length} vakter fra ${startDateStr}. Fortsette?`)) return;
            
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
            alert(`La til ${dates.length} vakter`);
            return;
        }
        try {
            if (!this.selectedDates || this.selectedDates.length === 0) {
                alert('Vennligst velg en eller flere datoer');
                return;
            }
            
            const startHour = document.getElementById('startHour').value;
            const startMinute = document.getElementById('startMinute').value || '00';
            const endHour = document.getElementById('endHour').value;
            const endMinute = document.getElementById('endMinute').value || '00';
            
            if (!startHour || !endHour) {
                alert('Vennligst fyll ut arbeidstid');
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
                
                // Validate that the selected date is in the current UI month
                if (newShift.date.getMonth() + 1 !== this.currentMonth) {
                    // Correct the date to be in the current UI month
                    const correctedDate = new Date(this.currentYear, this.currentMonth - 1, selectedDate.getDate());
                    newShift.date = correctedDate;
                }
                
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
            
            // Show success message
            if (createdShifts.length > 0) {
                const message = createdShifts.length === 1 ? 
                    'Vakt lagt til' : 
                    `${createdShifts.length} vakter lagt til`;
                alert(message);
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
    
    populateDateGrid() {
        const dateGrid = document.getElementById('dateGrid');
        if (!dateGrid) {
            // dateGrid element doesn't exist (modal not open), so skip population
            return;
        }
        const year = this.currentYear;
        const monthIdx = this.currentMonth - 1;
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
    populateMonthDropdown() {
        const dd = document.getElementById('monthDropdown');
        dd.innerHTML = '';
        this.MONTHS.forEach((m,i)=>{
            const opt = document.createElement('div');
            opt.className='month-option';
            opt.textContent = `${m.charAt(0).toUpperCase() + m.slice(1)} ${this.currentYear}`;
            if(i+1===this.currentMonth) opt.classList.add('current');
            opt.addEventListener('click',()=>{
                this.changeMonth(i+1);
                this.closeMonthDropdown();
            });
            dd.appendChild(opt);
        });
    },

    populateYearDropdown() {
        const yearSelect = document.getElementById('yearSelect');
        if (!yearSelect) return;
        
        yearSelect.innerHTML = '';
        
        // Generate years from 2020 to current year + 5 years
        const currentYear = new Date().getFullYear();
        const startYear = 2020;
        const endYear = currentYear + 5;
        
        for (let year = endYear; year >= startYear; year--) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            
            if (year === this.currentYear) {
                option.selected = true;
            }
            
            yearSelect.appendChild(option);
        }
    },

    updateYear(year) {
        this.currentYear = parseInt(year);
        this.updateDisplay(true); // Enable animation when switching years
        this.saveSettingsToSupabase(); // Save the new year to database
    },
    
    toggleMonthDropdown() {
        const dd = document.getElementById('monthDropdown');
        const isActive = dd.classList.contains('active');
        
        // Close any other open modals first
        this.closeBreakdown();
        this.closeSettings();
        // Close email display if visible
        this.hideEmailDisplay();
        
        if (isActive) {
            dd.classList.remove('active');
        } else {
            dd.classList.add('active');
            this.populateMonthDropdown();
            
            // Position dropdown using fixed positioning relative to button
            this.positionMonthDropdown();
            
            // Ensure dropdown is visible with high z-index
            dd.style.zIndex = '9999';
        }
    },
    
    closeMonthDropdown() {
        const dd = document.getElementById('monthDropdown');
        dd.classList.remove('active');
        // Reset all positioning styles
        dd.style.zIndex = '';
        dd.style.top = '';
        dd.style.left = '';
    },
    
    positionMonthDropdown() {
        const dd = document.getElementById('monthDropdown');
        const monthButton = document.querySelector('.month-button');
        if (dd && monthButton && dd.classList.contains('active')) {
            const rect = monthButton.getBoundingClientRect();
            dd.style.top = `${rect.bottom + 2}px`; // 2px below button
            dd.style.left = `${rect.left}px`; // Align left edge with button
        }
    },
    
    changeMonth(month) {
        this.currentMonth = month;
        
        // Reset progress bar state to ensure clean animation
        const fill = document.querySelector('.progress-fill');
        if (fill) {
            fill.dataset.animating = 'false';
            fill.classList.remove('loading');
        }
        
        this.updateDisplay(true); // Enable animation when switching months
        // Note: Don't save currentMonth to settings - it should always default to current month on page load
    },
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
                
            } else {
                // No settings found, set defaults
                this.setDefaultSettings();
            }

            // Update UI elements to reflect loaded settings
            this.updateSettingsUI();
            // Update month dropdown to reflect potential reset of currentMonth
            this.populateMonthDropdown();
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
        this.currentMonth = new Date().getMonth() + 1; // Default to current month
        this.currentYear = new Date().getFullYear(); // Default to current year
        this.pauseDeduction = false;
        this.fullMinuteRange = false; // Default to 15-minute intervals
        this.directTimeInput = false; // Default to dropdown time selection
        this.monthlyGoal = 20000; // Default monthly goal
        this.hasSeenRecurringIntro = false; // Track if user has seen recurring feature intro
        this.currencyFormat = false; // Default to "kr" instead of "NOK"
        this.compactView = false; // Default to normal view
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

        // Apply compact view CSS class to body if setting is enabled
        if (this.compactView) {
            document.body.classList.add('compact-view');
        } else {
            document.body.classList.remove('compact-view');
        }

        // Populate year dropdown to reflect loaded year
        this.populateYearDropdown();

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
                if ('custom_bonuses' in existingSettings) {
                    settingsData.custom_bonuses = this.customBonuses || {};
                }
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
                settingsData.custom_bonuses = this.customBonuses || {};
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
             currentActiveTab.textContent === 'Konto' ? 'account' :
             currentActiveTab.textContent === 'Data' ? 'data' :
             'wage') : null;
        
        // If switching away from wage tab and in custom mode, auto-save bonuses
        if (currentTab === 'wage' && !this.usePreset && tab !== 'wage') {
            await this.saveCustomBonusesSilent();
        }
        
        const tabs = ['wage', 'interface', 'account', 'data'];
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
        
        // When switching to account tab, load profile data
        if (tab === 'account') {
            setTimeout(() => {
                this.loadProfileData();
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
        // Close any existing expanded views
        this.closeBreakdown();
        this.closeShiftDetails();
        
        const modal = document.getElementById('settingsModal');
        if (modal) {
            // Update UI to match current state
            this.updateSettingsUI();
            
            // Set active tab to wage (most important settings first)
            this.switchSettingsTabSync('wage');
            
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
        
        // Save settings when closing modal
        this.saveSettingsToSupabase();
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
                compactView: this.compactView
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
        this.updateShiftList();
        this.updateShiftCalendar();
        this.populateDateGrid();
    },
    updateHeader() {
        const monthName = this.MONTHS[this.currentMonth - 1].charAt(0).toUpperCase() + this.MONTHS[this.currentMonth - 1].slice(1);
        document.getElementById('currentMonth').textContent = `${monthName} ${this.currentYear}`;
        
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
        document.getElementById('totalAmount').textContent = this.formatCurrency(totalAmount);
        document.getElementById('totalHours').textContent = this.formatHours(totalHours);
        document.getElementById('baseAmount').textContent = this.formatCurrency(totalBase);
        document.getElementById('bonusAmount').textContent = this.formatCurrency(totalBonus);
        document.getElementById('shiftCount').textContent = monthShifts.length;
        
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
            const prevMonth = this.currentMonth === 1 ? 12 : this.currentMonth - 1;
            const prevYear = this.currentMonth === 1 ? this.currentYear - 1 : this.currentYear;
            const prevShifts = this.shifts.filter(s =>
                s.date.getMonth() === prevMonth - 1 &&
                s.date.getFullYear() === prevYear
            );
            let prevTotal = 0;
            prevShifts.forEach(s => { prevTotal += this.calculateShift(s).total; });
            let deltaPercent = 0;
            if (prevTotal > 0) {
                deltaPercent = ((totalAmount - prevTotal) / prevTotal) * 100;
            }
            const arrow = deltaPercent >= 0 ? '▲' : '▼';
            const prevMonthName = this.MONTHS[prevMonth - 1];
            deltaLabelEl.textContent = `${arrow} ${Math.abs(deltaPercent).toFixed(1)} % vs. ${prevMonthName}`;
        }
        // Oppdater fremdriftslinje for månedlig inntektsmål
        const monthlyGoal = getMonthlyGoal();
        updateProgressBar(totalAmount, monthlyGoal, shouldAnimate);

        const stats = this.calculateStatCards(monthShifts, {
            totalHours,
            totalBase,
            totalBonus,
            totalAmount
        });
        this.renderStatCards(stats);
    },

    calculateStatCards(monthShifts, totals) {
        const { totalHours, totalBase, totalBonus, totalAmount } = totals;
        let longest = 0;
        let bestDay = { date: null, total: 0 };

        monthShifts.forEach(shift => {
            const calc = this.calculateShift(shift);
            const duration = calc.totalHours;
            if (duration > longest) longest = duration;
            if (calc.total > bestDay.total) {
                bestDay = { date: shift.date, total: calc.total };
            }
        });

        const shiftCount = monthShifts.length;
        const avgHourly = totalHours > 0 ? totalAmount / totalHours : 0;
        const avgPerShift = shiftCount > 0 ? totalAmount / shiftCount : 0;

        const prevMonth = this.currentMonth === 1 ? 12 : this.currentMonth - 1;
        const prevYear = this.currentMonth === 1 ? this.currentYear - 1 : this.currentYear;
        const prevShifts = this.shifts.filter(s =>
            s.date.getMonth() === prevMonth - 1 &&
            s.date.getFullYear() === prevYear
        );
        let prevTotal = 0;
        prevShifts.forEach(s => { prevTotal += this.calculateShift(s).total; });
        const diff = totalAmount - prevTotal;

        const stats = [
            {
                id: 'avgHourly',
                relevanceScore: 10,
                label: 'Snittlønn/time',
                value: avgHourly ? this.formatCurrency(avgHourly) : this.formatCurrency(0)
            },
            {
                id: 'bestDay',
                relevanceScore: 9,
                label: 'Beste dag',
                value: bestDay.date
                    ? `${this.formatCurrency(bestDay.total)} • ${bestDay.date.getDate().toString().padStart(2, '0')}.${(bestDay.date.getMonth()+1).toString().padStart(2, '0')}`
                    : this.formatCurrency(bestDay.total)
            },
            {
                id: 'totalHours',
                relevanceScore: 8,
                label: 'Timer totalt',
                value: this.formatHours(totalHours)
            },
            {
                id: 'shiftCount',
                relevanceScore: 7,
                label: 'Antall vakter',
                value: shiftCount
            },
            {
                id: 'bonusTotal',
                relevanceScore: totalBonus > 0 ? 6 : 2,
                label: 'Tillegg/UB',
                value: this.formatCurrency(totalBonus)
            },
            {
                id: 'longestShift',
                relevanceScore: 6,
                label: 'Lengste vakt',
                value: this.formatHours(longest)
            },
            {
                id: 'avgPerShift',
                relevanceScore: 8,
                label: 'Snitt per vakt',
                value: this.formatCurrency(avgPerShift)
            },
            {
                id: 'monthCompare',
                relevanceScore: 5,
                label: 'Endring fra forrige mnd',
                value: (diff >= 0 ? '+' : '') + this.formatCurrency(diff)
            }
        ];

        return stats.sort((a, b) => b.relevanceScore - a.relevanceScore);
    },

    renderStatCards(stats) {
        const container = document.getElementById('statCards');
        if (!container) return;

        container.innerHTML = '';

        // Don't display stat cards if there are no shifts in the current month
        const monthShifts = this.shifts.filter(shift =>
            shift.date.getMonth() === this.currentMonth - 1 &&
            shift.date.getFullYear() === this.currentYear
        );
        
        if (monthShifts.length === 0) {
            return; // No shifts means no stat cards to display
        }

        const viewport = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        const shiftSection = document.querySelector('.shift-section');

        // Account for the next shift card height when it's visible
        const nextShiftCard = document.getElementById('nextShiftCard');
        let nextShiftCardHeight = 0;
        if (nextShiftCard && nextShiftCard.style.display !== 'none') {
            const nextShiftRect = nextShiftCard.getBoundingClientRect();
            nextShiftCardHeight = nextShiftRect.height;
        }

        // Calculate available space more simply and accurately
        const containerRect = container.getBoundingClientRect();
        const containerTop = containerRect.top;
        
        // Calculate bottom boundary - either viewport bottom or start of shift section
        let bottomBoundary = viewport;
        if (shiftSection) {
            const shiftSectionTop = shiftSection.getBoundingClientRect().top;
            bottomBoundary = Math.min(bottomBoundary, shiftSectionTop);
        }
        
        // Calculate available height: from container top to bottom boundary, minus next shift card height
        // Be maximally aggressive - use ALL available space
        const containerStyles = window.getComputedStyle(container);
        const availableHeight = bottomBoundary - containerTop - nextShiftCardHeight;
        
        // Create a temporary card to measure dimensions
        const tempCard = document.createElement('div');
        tempCard.className = 'stat-card';
        tempCard.innerHTML = `<div class="stat-value">0</div><div class="stat-label">test</div>`;
        tempCard.style.visibility = 'hidden';
        tempCard.style.position = 'absolute';
        tempCard.style.top = '-9999px';
        container.appendChild(tempCard); // Append to container for more accurate measurement
        
        // Force layout calculation
        const cardHeight = tempCard.getBoundingClientRect().height;
        container.removeChild(tempCard);
        
        // Get grid gap from computed styles
        const gridGap = parseInt(containerStyles.gap) || 15;
        
        // Calculate how many cards can fit horizontally
        const containerWidth = containerRect.width;
        const cardMinWidth = 160; // From CSS minmax(160px, 1fr)
        const cardsPerRow = Math.floor((containerWidth + gridGap) / (cardMinWidth + gridGap));
        
        // Calculate total height needed for all cards
        // Handle edge case where cardsPerRow is 0 (container too small)
        const totalRows = cardsPerRow > 0 ? Math.ceil(stats.length / cardsPerRow) : 0;
        const totalHeight = totalRows * cardHeight + Math.max(0, totalRows - 1) * gridGap;
        
        // Determine how many cards we can actually display - be more aggressive
        let maxCards = stats.length;
        if (cardsPerRow === 0) {
            // If container is too narrow to fit any cards horizontally, show no cards
            maxCards = 0;
        } else if (totalHeight > availableHeight) {
            // Be more aggressive - calculate exactly how many rows can fit
            const maxRows = Math.floor(availableHeight / (cardHeight + gridGap)) + 1; // +1 to be more aggressive
            maxCards = Math.max(0, maxRows * cardsPerRow);
            
            // But don't exceed the total number of stats available
            maxCards = Math.min(maxCards, stats.length);
        }

        // Add cards up to the limit
        for (let i = 0; i < Math.min(stats.length, maxCards); i++) {
            const s = stats[i];
            const card = document.createElement('div');
            card.className = 'stat-card';
            card.dataset.statId = s.id;
            card.innerHTML = `<div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div>`;
            card.addEventListener('click', () => this.showStatDetails(s.id));
            container.appendChild(card);
        }
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
                                    <span>${this.formatHours(calc.hours)}</span>
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
        this.renderShiftCalendar();
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
        // Hide the next shift card if we're not viewing the current month and year
        if (this.currentMonth !== currentMonth || this.currentYear !== currentYear) {
            nextShiftCard.style.display = 'none';
            return;
        }
        
        nextShiftCard.style.display = 'block';
        
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
            // No upcoming shifts
            nextShiftContent.style.display = 'none';
            nextShiftEmpty.style.display = 'flex';
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
            
            // Add "i dag" or "i morgen" to the date display
            let dateSuffix = '';
            if (shiftDate.toDateString() === today.toDateString()) {
                dateSuffix = ' (i dag)';
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
                            <span class="shift-date-weekday">${weekday}${dateSuffix}${seriesBadge}</span>
                        </div>
                        <div class="shift-details">
                            <div class="shift-time-with-hours">
                                <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                                <span>${nextShift.startTime} - ${nextShift.endTime}</span>
                                <span class="shift-time-arrow">→</span>
                                <span>${this.formatHours(calculation.hours)}</span>
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
            
            // Add click handler to show shift details
            const shiftItem = nextShiftContent.querySelector('.shift-item');
            if (shiftItem) {
                shiftItem.addEventListener('click', () => {
                    this.showShiftDetails(nextShift.id);
                });
            }
        }
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

        const weekHeader = document.createElement('div');
        weekHeader.className = 'calendar-week-number header';
        header.appendChild(weekHeader);
        ['M','T','O','T','F','L','S'].forEach(day => {
            const h = document.createElement('div');
            h.textContent = day;
            h.className = 'calendar-day-header';
            header.appendChild(h);
        });
        container.appendChild(header);

        const grid = document.createElement('div');
        grid.className = 'calendar-grid';

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
            // Add week number at the start of each row
            const weekDate = new Date(startDate);
            weekDate.setDate(startDate.getDate() + (week * 7));
            const weekNum = this.getISOWeekNumber(weekDate);
            const weekCell = document.createElement('div');
            weekCell.className = 'calendar-week-number';
            weekCell.textContent = weekNum;
            grid.appendChild(weekCell);

            // Add 7 days for this week
            for (let day = 0; day < 7; day++) {
                const cellDate = new Date(startDate);
                cellDate.setDate(startDate.getDate() + (week * 7) + day);

                const cell = document.createElement('div');
                cell.className = 'calendar-cell';
                if (cellDate.getMonth() !== monthIdx) {
                    cell.classList.add('other-month');
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
                shiftsForDay.forEach(shift => {
                    if (cellDate.getMonth() === monthIdx) {
                        const calc = this.calculateShift(shift);
                        base += calc.baseWage;
                        bonus += calc.bonus;
                    }
                });

                if (base + bonus > 0) {
                    // Create wrapper for shift data
                    const shiftData = document.createElement('div');
                    shiftData.className = 'calendar-shift-data';
                    
                    const breakdown = document.createElement('div');
                    breakdown.className = 'calendar-breakdown';
                    breakdown.innerHTML = `${this.formatCurrencyShort(base)}<br>+${this.formatCurrencyShort(bonus)}`;
                    
                    const totalDisplay = document.createElement('div');
                    totalDisplay.className = 'calendar-total';
                    totalDisplay.textContent = this.formatCurrencyCalendar(base + bonus);
                    
                    shiftData.appendChild(breakdown);
                    shiftData.appendChild(totalDisplay);
                    content.appendChild(shiftData);
                    
                    cell.classList.add('has-shifts');
                    cell.style.cursor = 'pointer';
                    cell.onclick = (e) => {
                        e.stopPropagation();
                        if (shiftsForDay.length > 0) {
                            this.showShiftDetails(shiftsForDay[0].id);
                        }
                    };
                }

                cell.appendChild(content);
                grid.appendChild(cell);
            }
        }

        container.appendChild(grid);
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
        if (!list || !cal) return;

        if (view === 'calendar') {
            list.style.display = 'none';
            cal.style.display = 'flex';
            this.renderShiftCalendar();
        } else {
            list.style.display = 'flex';
            cal.style.display = 'none';
        }
    },
        // Show breakdown modal
    showBreakdown(type) {
        this.closeBreakdown();
        this.closeStatDetails();
        this.closeSettings();

        const header = document.querySelector('.header');
        if (header) header.classList.add('hidden');

        const backdrop = document.createElement('div');
        backdrop.className = 'backdrop-blur';
        backdrop.onclick = () => this.closeBreakdown();
        document.body.appendChild(backdrop);
        backdrop.offsetHeight;
        backdrop.classList.add('active');

        this.breakdownKeydownHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeBreakdown();
            }
        };
        document.addEventListener('keydown', this.breakdownKeydownHandler);

        // Create modal container
        const modal = document.createElement('div');
        modal.className = 'breakdown-modal';
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0.8);
            width: min(95vw, 600px);
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

        // Create icon based on type
        const icon = document.createElement('div');
        icon.className = 'breakdown-title-icon';
        icon.innerHTML = type === 'base' ? 
            '<svg class="icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>' :
            '<svg class="icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>';
        icon.style.cssText = `
            color: var(--accent3);
            opacity: 0.8;
        `;

        // Create title
        const title = document.createElement('h3');
        title.className = 'breakdown-title';
        title.textContent = type === 'base' ? 'Grunnlønn' : 'Tillegg';
        title.style.cssText = `
            color: var(--accent3);
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        `;

        titleContainer.appendChild(icon);
        titleContainer.appendChild(title);
        modal.appendChild(titleContainer);

        // Create close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'close-btn';
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            position: absolute;
            top: 15px;
            right: 15px;
            background: rgba(255, 102, 153, 0.1);
            border: 1px solid rgba(255, 102, 153, 0.3);
            border-radius: 50%;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: var(--danger);
            transition: all 0.2s var(--ease-default);
            z-index: 21;
            opacity: 0;
            transform: scale(0.8);
            animation: scaleIn 0.4s var(--ease-default) 0.3s forwards;
            font-size: 18px;
            font-weight: bold;
        `;
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            this.closeBreakdown();
        };
        modal.appendChild(closeBtn);

        // Create calendar container
        const calendarContainer = document.createElement('div');
        calendarContainer.className = 'breakdown-calendar';
        calendarContainer.style.cssText = `
            opacity: 0;
            animation: slideInFromBottom 0.6s var(--ease-default) 0.3s forwards;
            flex: 1;
            display: flex;
            flex-direction: column;
            padding: 0 24px 24px 24px;
        `;
        modal.appendChild(calendarContainer);

        // Create the breakdown calendar
        this.createBreakdownCalendar(calendarContainer, type);

        document.body.appendChild(modal);
        requestAnimationFrame(() => {
            modal.style.opacity = '1';
            modal.style.transform = 'translate(-50%, -50%) scale(1)';
        });
    },

    // Create breakdown calendar view
    createBreakdownCalendar(container, type) {
        const year = this.currentYear;
        const monthIdx = this.currentMonth - 1;
        const firstDay = new Date(year, monthIdx, 1);
        const lastDay = new Date(year, monthIdx + 1, 0);
        const startDate = new Date(firstDay);
        const offset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
        startDate.setDate(startDate.getDate() - offset);

        container.innerHTML = '';

        // Add calendar header with day names (with animation)
        const header = document.createElement('div');
        header.className = 'calendar-header';
        header.style.cssText = `
            opacity: 0;
            animation: slideInFromTop 0.4s var(--ease-default) 0.2s forwards;
        `;
        
        // Add week number header
        const weekHeader = document.createElement('div');
        weekHeader.textContent = '';
        weekHeader.className = 'calendar-week-number header';
        header.appendChild(weekHeader);
        
        // Add day headers
        ['M', 'T', 'O', 'T', 'F', 'L', 'S'].forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.textContent = day;
            dayHeader.className = 'calendar-day-header';
            header.appendChild(dayHeader);
        });
        container.appendChild(header);

        // Create calendar grid
        const grid = document.createElement('div');
        grid.className = 'calendar-grid';

        // Get shifts for current month and create lookup by date
        const monthShifts = this.shifts.filter(s => 
            s.date.getMonth() === this.currentMonth - 1 && 
            s.date.getFullYear() === this.currentYear
        );
        
        const shiftsByDate = {};
        monthShifts.forEach(shift => {
            const dateKey = shift.date.getDate();
            if (!shiftsByDate[dateKey]) {
                shiftsByDate[dateKey] = [];
            }
            shiftsByDate[dateKey].push(shift);
        });

        // Calculate how many weeks we need to show
        // Start from the first day of the month and go to the last day
        const endDate = new Date(lastDay);
        const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const totalWeeks = Math.ceil(totalDays / 7);

        for (let week = 0; week < totalWeeks; week++) {
            // Add week number at the start of each row
            const weekDate = new Date(startDate);
            weekDate.setDate(startDate.getDate() + (week * 7));
            const weekNum = this.getISOWeekNumber(weekDate);
            const weekCell = document.createElement('div');
            weekCell.className = 'calendar-week-number';
            weekCell.textContent = weekNum;
            
            // Calculate animation delay for week number
            const weekAnimationDelay = 0.3 + (week * 7) * 0.035;
            weekCell.style.animationDelay = `${weekAnimationDelay}s`;
            
            grid.appendChild(weekCell);

            // Add 7 days for this week
            for (let day = 0; day < 7; day++) {
                const cellDate = new Date(startDate);
                cellDate.setDate(startDate.getDate() + (week * 7) + day);
                
                const cell = document.createElement('div');
                cell.className = 'calendar-cell';
                
                // Calculate animation delay based on row and column position
                // Row by row, left to right animation - start while modal is opening
                // Account for week number column by adding 1 to the base position
                const col = day;
                const animationDelay = 0.3 + (week * 8 + col + 1) * 0.035; // 8 columns now (week + 7 days), +1 for week number offset
                cell.style.animationDelay = `${animationDelay}s`;
                
                // Create content wrapper and day number
                const content = document.createElement('div');
                content.className = 'calendar-cell-content';
                
                const dayNumber = document.createElement('div');
                dayNumber.className = 'calendar-day-number';
                dayNumber.textContent = cellDate.getDate();
                content.appendChild(dayNumber);
                
                // Style for current month vs other months
                if (cellDate.getMonth() !== monthIdx) {
                    cell.classList.add('other-month');
                    // Set custom animation for other-month cells that ends with opacity 0.3
                    cell.style.setProperty('--final-opacity', '0.3');
                }

                const shiftsForDay = shiftsByDate[cellDate.getDate()] || [];
                let totalAmount = 0;
                
                // Calculate total amount for this day
                shiftsForDay.forEach(shift => {
                    if (cellDate.getMonth() === monthIdx) { // Only for current month
                        const calc = this.calculateShift(shift);
                        const amount = type === 'base' ? calc.baseWage : calc.bonus;
                        totalAmount += amount;
                    }
                });

                if (totalAmount > 0) {
                    // Create wrapper for shift data
                    const shiftData = document.createElement('div');
                    shiftData.className = 'calendar-shift-data';
                    
                    const amountDisplay = document.createElement('div');
                    amountDisplay.className = 'calendar-amount';
                    amountDisplay.textContent = this.formatCurrencyCalendar(totalAmount);
                    
                    shiftData.appendChild(amountDisplay);
                    content.appendChild(shiftData);
                    
                    cell.classList.add('has-shifts');
                    
                    // Make clickable if there are shifts
                    cell.style.cursor = 'pointer';
                    cell.onclick = (e) => {
                        e.stopPropagation();
                        // If multiple shifts, show first one (or we could show a summary)
                        if (shiftsForDay.length > 0) {
                            this.showShiftDetails(shiftsForDay[0].id);
                        }
                    };
                }

                cell.appendChild(content);
                grid.appendChild(cell);
            }
        }

        container.appendChild(grid);
    },
    
    // Close breakdown modal
    closeBreakdown() {
        const modal = document.querySelector('.breakdown-modal');
        const backdrop = document.querySelector('.backdrop-blur');
        const header = document.querySelector('.header');

        if (header) header.classList.remove('hidden');

        if (this.breakdownKeydownHandler) {
            document.removeEventListener('keydown', this.breakdownKeydownHandler);
            this.breakdownKeydownHandler = null;
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
    // Show detailed shift information in expanded view
    showShiftDetails(shiftId) {
        // Find the shift by ID
        const shift = this.shifts.find(s => s.id === shiftId);
        if (!shift) return;
        
        // Close any existing expanded views
        this.closeBreakdown();
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

        // Create close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'close-btn';
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            position: absolute;
            top: 15px;
            right: 15px;
            background: rgba(255, 102, 153, 0.1);
            border: 1px solid rgba(255, 102, 153, 0.3);
            border-radius: 50%;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: var(--danger);
            transition: all 0.2s var(--ease-default);
            z-index: 21;
            opacity: 0;
            transform: scale(0.8);
            animation: scaleIn 0.4s var(--ease-default) 0.3s forwards;
            font-size: 18px;
            font-weight: bold;
        `;
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            this.closeShiftDetails();
        };
        modal.appendChild(closeBtn);

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
            gap: 16px;
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

            <div class="shift-actions" style="display: flex; gap: 12px; margin-top: 8px;">
                <button class="btn btn-secondary edit-shift-btn" data-shift-id="${shift.id}" style="flex: 1; gap: 8px; padding: 12px;">
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Rediger
                </button>
                <button class="btn btn-danger delete-shift-btn" data-shift-index="${originalIndex}" style="flex: 1; gap: 8px; padding: 12px;">
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    Slett
                </button>
                ${shift.seriesId ? `<button class="btn btn-warning delete-series-btn" style="flex: 1; gap: 8px; padding: 12px;">Slett serie</button>` : ''}
            </div>
        `;

        modal.appendChild(contentContainer);

        document.body.appendChild(modal);
        requestAnimationFrame(() => {
            modal.style.opacity = '1';
            modal.style.transform = 'translate(-50%, -50%) scale(1)';
        });

        // Attach handler for delete-series button
        if (shift.seriesId) {
            const seriesBtn = contentContainer.querySelector('.delete-series-btn');
            if (seriesBtn) {
                seriesBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm('Vil du slette hele serien?')) {
                        this.deleteSeries(shift.seriesId);
                        this.closeShiftDetails();
                    }
                });
            }
        }
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

    // Show details for a statistic card
    showStatDetails(statId) {
        this.closeStatDetails();
        this.closeBreakdown();
        this.closeSettings();

        const header = document.querySelector('.header');
        if (header) header.classList.add('hidden');

        const backdrop = document.createElement('div');
        backdrop.className = 'backdrop-blur';
        backdrop.onclick = () => this.closeStatDetails();
        document.body.appendChild(backdrop);
        backdrop.offsetHeight;
        backdrop.classList.add('active');

        this.statDetailsKeydownHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeStatDetails();
            }
        };
        document.addEventListener('keydown', this.statDetailsKeydownHandler);

        // Create modal container
        const modal = document.createElement('div');
        modal.className = 'breakdown-modal stat-detail-modal';
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0.8);
            width: min(95vw, 600px);
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

        // Create icon based on stat type
        const icon = document.createElement('div');
        icon.className = 'breakdown-title-icon';
        icon.innerHTML = this.getStatIcon(statId);
        icon.style.cssText = `
            color: var(--accent3);
            opacity: 0.8;
        `;

        // Create title
        const title = document.createElement('h3');
        title.className = 'breakdown-title';
        title.textContent = this.getStatTitle(statId);
        title.style.cssText = `
            color: var(--accent3);
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        `;

        titleContainer.appendChild(icon);
        titleContainer.appendChild(title);
        modal.appendChild(titleContainer);

        // Create close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'close-btn';
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            position: absolute;
            top: 15px;
            right: 15px;
            background: rgba(255, 102, 153, 0.1);
            border: 1px solid rgba(255, 102, 153, 0.3);
            border-radius: 50%;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: var(--danger);
            transition: all 0.2s var(--ease-default);
            z-index: 21;
            opacity: 0;
            transform: scale(0.8);
            animation: scaleIn 0.4s var(--ease-default) 0.3s forwards;
            font-size: 18px;
            font-weight: bold;
        `;
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            this.closeStatDetails();
        };
        modal.appendChild(closeBtn);

        // Create calendar container
        const calendarContainer = document.createElement('div');
        calendarContainer.className = 'breakdown-calendar';
        calendarContainer.style.cssText = `
            opacity: 0;
            animation: slideInFromBottom 0.6s var(--ease-default) 0.3s forwards;
            flex: 1;
            display: flex;
            flex-direction: column;
            padding: 0 24px 24px 24px;
        `;
        modal.appendChild(calendarContainer);

        // Create the stat calendar
        this.createStatCalendar(calendarContainer, statId);

        document.body.appendChild(modal);
        requestAnimationFrame(() => {
            modal.style.opacity = '1';
            modal.style.transform = 'translate(-50%, -50%) scale(1)';
        });
    },

    // Get icon for stat type
    getStatIcon(statId) {
        const icons = {
            'avgHourly': '<svg class="icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>',
            'totalHours': '<svg class="icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>',
            'shiftCount': '<svg class="icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>',
            'bonusTotal': '<svg class="icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
            'longestShift': '<svg class="icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>',
            'avgPerShift': '<svg class="icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>',
            'bestDay': '<svg class="icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
            'monthCompare': '<svg class="icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>'
        };
        return icons[statId] || icons['avgHourly'];
    },

    // Get title for stat type
    getStatTitle(statId) {
        const titles = {
            'avgHourly': 'Snittlønn/time',
            'totalHours': 'Timer totalt',
            'shiftCount': 'Antall vakter',
            'bonusTotal': 'Tillegg/UB',
            'longestShift': 'Lengste vakt',
            'avgPerShift': 'Snitt per vakt',
            'bestDay': 'Beste dag',
            'monthCompare': 'Endring fra forrige mnd'
        };
        return titles[statId] || 'Statistikk';
    },

    // Create stat calendar view
    createStatCalendar(container, statId) {
        const year = this.currentYear;
        const monthIdx = this.currentMonth - 1;
        const firstDay = new Date(year, monthIdx, 1);
        const lastDay = new Date(year, monthIdx + 1, 0);
        const startDate = new Date(firstDay);
        const offset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
        startDate.setDate(startDate.getDate() - offset);

        container.innerHTML = '';

        // Add calendar header with day names
        const header = document.createElement('div');
        header.className = 'calendar-header';
        header.style.cssText = `
            opacity: 0;
            animation: slideInFromTop 0.4s var(--ease-default) 0.2s forwards;
        `;
        
        // Add week number header
        const weekHeader = document.createElement('div');
        weekHeader.textContent = '';
        weekHeader.className = 'calendar-week-number header';
        header.appendChild(weekHeader);
        
        // Add day headers
        ['M', 'T', 'O', 'T', 'F', 'L', 'S'].forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.textContent = day;
            dayHeader.className = 'calendar-day-header';
            header.appendChild(dayHeader);
        });
        container.appendChild(header);

        // Create calendar grid
        const grid = document.createElement('div');
        grid.className = 'calendar-grid';

        // Get shifts for current month and create lookup by date
        const monthShifts = this.shifts.filter(s => 
            s.date.getMonth() === this.currentMonth - 1 && 
            s.date.getFullYear() === this.currentYear
        );
        
        const shiftsByDate = {};
        monthShifts.forEach(shift => {
            const dateKey = shift.date.getDate();
            if (!shiftsByDate[dateKey]) {
                shiftsByDate[dateKey] = [];
            }
            shiftsByDate[dateKey].push(shift);
        });

        // Calculate how many weeks we need to show
        const endDate = new Date(lastDay);
        const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const totalWeeks = Math.ceil(totalDays / 7);

        for (let week = 0; week < totalWeeks; week++) {
            // Add week number at the start of each row
            const weekDate = new Date(startDate);
            weekDate.setDate(startDate.getDate() + (week * 7));
            const weekNum = this.getISOWeekNumber(weekDate);
            const weekCell = document.createElement('div');
            weekCell.className = 'calendar-week-number';
            weekCell.textContent = weekNum;
            
            // Calculate animation delay for week number
            const weekAnimationDelay = 0.3 + (week * 7) * 0.035;
            weekCell.style.animationDelay = `${weekAnimationDelay}s`;
            
            grid.appendChild(weekCell);

            // Add 7 days for this week
            for (let day = 0; day < 7; day++) {
                const cellDate = new Date(startDate);
                cellDate.setDate(startDate.getDate() + (week * 7) + day);
                
                const cell = document.createElement('div');
                cell.className = 'calendar-cell';
                
                // Calculate animation delay based on row and column position
                const col = day;
                const animationDelay = 0.3 + (week * 8 + col + 1) * 0.035;
                cell.style.animationDelay = `${animationDelay}s`;
                
                // Create content wrapper and day number
                const content = document.createElement('div');
                content.className = 'calendar-cell-content';
                
                const dayNumber = document.createElement('div');
                dayNumber.className = 'calendar-day-number';
                dayNumber.textContent = cellDate.getDate();
                content.appendChild(dayNumber);
                
                // Style for current month vs other months
                if (cellDate.getMonth() !== monthIdx) {
                    cell.classList.add('other-month');
                    cell.style.setProperty('--final-opacity', '0.3');
                }

                const shiftsForDay = shiftsByDate[cellDate.getDate()] || [];
                let displayValue = '';
                let hasData = false;
                
                // Calculate display value based on stat type
                if (cellDate.getMonth() === monthIdx && shiftsForDay.length > 0) {
                    hasData = true;
                    displayValue = this.calculateStatValue(statId, shiftsForDay);
                }

                if (hasData && displayValue !== '') {
                    // Create wrapper for stat data
                    const statData = document.createElement('div');
                    statData.className = 'calendar-shift-data';
                    
                    const valueDisplay = document.createElement('div');
                    valueDisplay.className = 'calendar-amount';
                    valueDisplay.textContent = displayValue;
                    
                    statData.appendChild(valueDisplay);
                    content.appendChild(statData);
                    
                    cell.classList.add('has-shifts');
                    
                    // Make clickable if there are shifts
                    cell.style.cursor = 'pointer';
                    cell.onclick = (e) => {
                        e.stopPropagation();
                        if (shiftsForDay.length > 0) {
                            this.showShiftDetails(shiftsForDay[0].id);
                        }
                    };
                }

                cell.appendChild(content);
                grid.appendChild(cell);
            }
        }

        container.appendChild(grid);
    },

    // Calculate display value for stat type
    calculateStatValue(statId, shiftsForDay) {
        switch (statId) {
            case 'avgHourly': {
                let total = 0;
                let hours = 0;
                shiftsForDay.forEach(shift => {
                    const calc = this.calculateShift(shift);
                    total += calc.total;
                    hours += calc.paidHours;
                });
                const avg = hours > 0 ? total / hours : 0;
                return this.formatCurrencyCalendar(avg);
            }
            case 'totalHours': {
                let hours = 0;
                shiftsForDay.forEach(shift => {
                    const calc = this.calculateShift(shift);
                    hours += calc.paidHours;
                });
                return hours > 0 ? `${hours.toFixed(1)}t` : '';
            }
            case 'shiftCount': {
                return shiftsForDay.length > 0 ? '●' : '';
            }
            case 'bonusTotal': {
                let bonus = 0;
                shiftsForDay.forEach(shift => {
                    const calc = this.calculateShift(shift);
                    bonus += calc.bonus;
                });
                return bonus > 0 ? this.formatCurrencyCalendar(bonus) : '';
            }
            case 'longestShift': {
                let longest = 0;
                shiftsForDay.forEach(shift => {
                    const calc = this.calculateShift(shift);
                    if (calc.totalHours > longest) longest = calc.totalHours;
                });
                return longest > 0 ? `${longest.toFixed(1)}t` : '';
            }
            case 'avgPerShift': {
                let total = 0;
                shiftsForDay.forEach(shift => {
                    const calc = this.calculateShift(shift);
                    total += calc.total;
                });
                const avg = shiftsForDay.length > 0 ? total / shiftsForDay.length : 0;
                return avg > 0 ? this.formatCurrencyCalendar(avg) : '';
            }
            case 'bestDay': {
                let total = 0;
                shiftsForDay.forEach(shift => {
                    const calc = this.calculateShift(shift);
                    total += calc.total;
                });
                return total > 0 ? this.formatCurrencyCalendar(total) : '';
            }
            case 'monthCompare': {
                // For month compare, show total for the day
                let total = 0;
                shiftsForDay.forEach(shift => {
                    const calc = this.calculateShift(shift);
                    total += calc.total;
                });
                return total > 0 ? this.formatCurrencyCalendar(total) : '';
            }
            default:
                return '';
        }
    },

    closeStatDetails() {
        const modal = document.querySelector('.stat-detail-modal');
        const backdrop = document.querySelector('.backdrop-blur');
        const header = document.querySelector('.header');

        if (header) header.classList.remove('hidden');

        if (this.statDetailsKeydownHandler) {
            document.removeEventListener('keydown', this.statDetailsKeydownHandler);
            this.statDetailsKeydownHandler = null;
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
                return;
            }
            // Remove from local arrays
            this.userShifts = this.userShifts.filter(s => s.seriesId !== seriesId);
            this.shifts = this.shifts.filter(s => s.seriesId !== seriesId);
            this.updateDisplay();
            alert('Serien er slettet');
        } catch (e) {
            console.error('deleteSeries error:', e);
            alert('En uventet feil oppstod');
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

        } catch (err) {
            console.error('Error updating profile:', err);
            const msgElement = document.getElementById('profile-update-msg');
            if (msgElement) {
                msgElement.style.color = 'var(--danger)';
                msgElement.textContent = 'Kunne ikke oppdatere profil';
            }
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
    formatHours(hours) {
        return hours.toFixed(2).replace('.', ',') + ' timer';
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
                await this.deleteSeries(shift.seriesId);
                return;
            }
        }
        try {
            
            const { data: { user } } = await window.supa.auth.getUser();
            if (!user) {
                alert("Du er ikke innlogget");
                return;
            }
            
            const shiftToDelete = this.shifts[index];
            if (!shiftToDelete || !shiftToDelete.id) return;
            
            if (!confirm('Er du sikker på at du vil slette denne vakten?')) return;
            
            const { error } = await window.supa
                .from('user_shifts')
                .delete()
                .eq('id', shiftToDelete.id);
                
            if (error) {
                console.error('Error deleting shift:', error);
                alert('Kunne ikke slette vakt fra databasen');
                return;
            }
            
            // Remove from local arrays
            this.shifts.splice(index, 1);
            const userIndex = this.userShifts.findIndex(s => s.id === shiftToDelete.id);
            if (userIndex !== -1) {
                this.userShifts.splice(userIndex, 1);
            }
            
            this.updateDisplay();
        } catch (e) {
            console.error('Error in deleteShift:', e);
            alert('En feil oppstod ved sletting av vakt');
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
            editModal.style.display = 'block';
            
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
        this.closeBreakdown();
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
    },

    // Setup export period options and event listeners
    setupExportPeriodOptions() {
        // Update current month label
        this.updateCurrentMonthLabel();
        
        // Setup event listeners for radio buttons
        const periodRadios = document.querySelectorAll('input[name="exportPeriod"]');
        const customSection = document.getElementById('customPeriodSection');
        const exportOptionsSection = document.getElementById('exportOptionsSection');
        
        periodRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                // Show export options when any period is selected
                if (exportOptionsSection) {
                    exportOptionsSection.style.display = 'block';
                }
                
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
            // Show export options if a period is already selected
            if (exportOptionsSection) {
                exportOptionsSection.style.display = 'block';
            }
            
            // Show custom section if custom period is selected
            if (checkedRadio.value === 'custom') {
                customSection.style.display = 'block';
            }
        } else {
            // Hide export options if no period is selected
            if (exportOptionsSection) {
                exportOptionsSection.style.display = 'none';
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
    }
};

