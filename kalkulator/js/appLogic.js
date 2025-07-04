// --- Månedlig mål UI-håndtering ---
function setupMonthlyGoalInput() {
    const input = document.getElementById('monthlyGoalInput');
    const btn = document.getElementById('saveMonthlyGoalBtn');
    if (!input || !btn) return;
    // Sett nåværende mål i inputfeltet
    input.value = getMonthlyGoal();
    btn.onclick = function() {
        const val = parseInt(input.value, 10);
        if (!isNaN(val) && val > 0) {
            setMonthlyGoal(val);
            input.value = val;
            btn.textContent = 'Lagret!';
            setTimeout(()=>{btn.textContent='Lagre';}, 1200);
        } else {
            btn.textContent = 'Ugyldig';
            setTimeout(()=>{btn.textContent='Lagre';}, 1200);
        }
    };
}

// Kjør når innstillinger-modal åpnes
const origOpenSettings = window.app && window.app.openSettings;
if (origOpenSettings) {
    window.app.openSettings = async function() {
        if (typeof origOpenSettings === 'function') await origOpenSettings.apply(this, arguments);
        setupMonthlyGoalInput();
    };
}

// Initialize pending confetti flag
window.pendingConfetti = false;
// Oppdater fremdriftslinje for månedlig inntektsmål
function updateProgressBar(current, goal, shouldAnimate = false) {
    const percent = Math.min((current / goal) * 100, 100).toFixed(1);
    const fill = document.querySelector('.progress-fill');
    const label = document.querySelector('.progress-label');
    if (!fill || !label) return;
    
    // Set initial width to 0 if animating
    if (shouldAnimate) {
        fill.style.width = '0%';
        fill.style.transition = 'none';
        // Force reflow
        fill.offsetHeight;
        // Re-enable transition to match CSS animation duration
        fill.style.transition = 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0.3s';
    } else {
        // Remove animation for immediate updates
        fill.style.transition = 'none';
    }
    
    // Use setTimeout to ensure animation starts after initial render
    setTimeout(() => {
        fill.style.width = percent + '%';
    }, shouldAnimate ? 50 : 0);
    
    label.textContent = percent + '% av ' + goal.toLocaleString('no-NO') + ' kr';
    fill.title = `${current.toLocaleString('no-NO')} kr av ${goal.toLocaleString('no-NO')} kr`;
    
    if (percent >= 100) {
        fill.classList.add('full');
        // Only trigger confetti when appropriate
        if (shouldAnimate) {
            // Wait for progress animation to complete before showing confetti
            setTimeout(() => {
                triggerConfettiIfVisible();
            }, 1200); // Wait for progress animation (0.8s) + delay (0.3s) + small buffer
        } else {
            // For immediate updates (like adding shifts), check if we should show confetti
            setTimeout(() => {
                triggerConfettiIfVisible();
            }, 100); // Small delay to ensure modal state is updated
        }
    } else {
        fill.classList.remove('full');
    }
}

// Konfetti-animasjon for når målet nås - kun når ingen modaler er åpne
function triggerConfettiIfVisible() {
    // Check if any modals are open
    const modals = ['addShiftModal', 'editShiftModal', 'settingsModal', 'breakdownModal'];
    const isAnyModalOpen = modals.some(modalId => {
        const modal = document.getElementById(modalId);
        return modal && modal.style.display === 'block';
    });
    
    // Only show confetti if no modals are open
    if (!isAnyModalOpen) {
        triggerConfetti();
    } else {
        // Set a flag to trigger confetti when modal is closed
        window.pendingConfetti = true;
    }
}

// Check and trigger pending confetti when modals are closed
function checkPendingConfetti() {
    if (window.pendingConfetti) {
        const fill = document.querySelector('.progress-fill');
        if (fill && fill.classList.contains('full')) {
            triggerConfetti();
        }
        window.pendingConfetti = false;
    }
}

// Konfetti-animasjon for når målet nås
function triggerConfetti() {
    const colors = ['#00d4aa', '#7c3aed', '#0891b2', '#f59e0b', '#ef4444', '#10b981', '#ec4899', '#8b5cf6'];
    const confettiCount = 60;
    
    // Create confetti in multiple bursts for more effect
    for (let burst = 0; burst < 3; burst++) {
        setTimeout(() => {
            for (let i = 0; i < confettiCount / 3; i++) {
                createConfettiPiece(colors[Math.floor(Math.random() * colors.length)]);
            }
        }, burst * 200);
    }
}

function createConfettiPiece(color) {
    const confetti = document.createElement('div');
    const size = Math.random() * 6 + 4; // 4-10px
    const shape = Math.random() > 0.5 ? '50%' : '20%'; // Mix of circles and rounded squares
    
    confetti.style.cssText = `
        position: fixed;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        z-index: 10000;
        pointer-events: none;
        border-radius: ${shape};
        animation: confetti-fall ${2.5 + Math.random() * 1.5}s linear forwards;
    `;
    
    // Random starting position from the progress bar area
    const progressCard = document.querySelector('.progress-card');
    const rect = progressCard ? progressCard.getBoundingClientRect() : { left: 0, top: 100, width: window.innerWidth };
    
    const startX = rect.left + Math.random() * rect.width;
    const startY = rect.top - 20;
    const endX = startX + (Math.random() - 0.5) * 300; // More horizontal spread
    const rotation = Math.random() * 720; // Multiple rotations
    
    confetti.style.left = startX + 'px';
    confetti.style.top = startY + 'px';
    confetti.style.setProperty('--end-x', endX + 'px');
    confetti.style.setProperty('--rotation', rotation + 'deg');
    
    document.body.appendChild(confetti);
    
    // Remove after animation
    setTimeout(() => {
        if (confetti.parentNode) {
            confetti.parentNode.removeChild(confetti);
        }
    }, 4000);
}

// Hent og lagre månedlig mål fra localStorage eller default
function getMonthlyGoal() {
    // First try to get from app object (loaded from Supabase)
    if (typeof app !== 'undefined' && app.monthlyGoal) {
        return app.monthlyGoal;
    }
    // Fallback to localStorage
    const stored = localStorage.getItem('monthlyGoal');
    return stored ? parseInt(stored, 10) : 20000;
}

async function setMonthlyGoal(goal) {
    // Save to app object
    if (typeof app !== 'undefined') {
        app.monthlyGoal = goal;
        // Save to Supabase
        await app.saveSettingsToSupabase();
    }
    // Also save to localStorage as backup
    localStorage.setItem('monthlyGoal', goal);
    // Update the progress bar immediately
    if (typeof app !== 'undefined' && app.updateStats) app.updateStats();
}

// Legg til i app-objektet for enkel tilgang fra innstillinger
if (typeof window !== 'undefined') {
    window.updateProgressBar = updateProgressBar;
    window.getMonthlyGoal = getMonthlyGoal;
    window.setMonthlyGoal = setMonthlyGoal;
    window.triggerConfettiIfVisible = triggerConfettiIfVisible;
    window.checkPendingConfetti = checkPendingConfetti;
    window.triggerConfetti = triggerConfetti;
}
export const app = {
    // Constants
    YEAR: 2025,
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
            { from: "00:00", to: "23:59", rate: 100 }
        ]
    },
    // State
    shifts: [],
    currentMonth: new Date().getMonth() + 1, // Start in current month (June 2025)
    currentWageLevel: 1,
    usePreset: true,
    customWage: 200,
    customBonuses: {}, // Reset to empty - will be loaded from database
    pauseDeduction: true,
    fullMinuteRange: false, // Setting for using 0-59 minutes instead of 00,15,30,45
    directTimeInput: false, // Setting for using direct time input instead of dropdowns
    monthlyGoal: 20000, // Monthly income goal
    selectedDate: null,
    userShifts: [],
    formState: {}, // Store form state to preserve across page restarts
    emailHideTimeout: null, // Timeout for auto-hiding email
    async init() {
        // Show UI elements
        this.populateTimeSelects();
        this.populateDateGrid();
        this.populateMonthDropdown();
        
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
        
        // Restore form state after initialization
        this.restoreFormState();

        this.updateDisplay(true); // Animate progress bar on initial load

        window.addEventListener('resize', () => {
            this.updateStats();
        });
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => {
                this.updateStats();
            });
        }

        // Recalculate stat cards once all assets are loaded
        window.addEventListener('load', () => {
            this.updateStats();
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
        
        // Clear any previously selected date
        this.selectedDate = null;
        const dateButtons = document.querySelectorAll('#dateGrid .date-btn');
        dateButtons.forEach(btn => btn.classList.remove('selected'));
        
        // Reset form
        document.getElementById('shiftForm').reset();
        // Default to simple tab
        this.switchAddShiftTab('simple');
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
        // Check for pending confetti after modal is closed
        setTimeout(() => {
            checkPendingConfetti();
        }, 100);
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
            if (!this.selectedDate) {
                alert('Vennligst velg en dato');
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
            
            
            const dayOfWeek = this.selectedDate.getDay();
            const type = dayOfWeek === 0 ? 2 : (dayOfWeek === 6 ? 1 : 0);
            const newShift = {
                date: new Date(this.selectedDate),
                startTime: `${startHour}:${startMinute}`,
                endTime: `${endHour}:${endMinute}`,
                type
            };
            
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
            
            const dateStr = `${newShift.date.getFullYear()}-${(newShift.date.getMonth() + 1).toString().padStart(2, '0')}-${newShift.date.getDate().toString().padStart(2, '0')}`;
            
            // Validate that the selected date is in the current UI month
            if (newShift.date.getMonth() + 1 !== this.currentMonth) {
                // Correct the date to be in the current UI month
                const correctedDate = new Date(this.YEAR, this.currentMonth - 1, this.selectedDate.getDate());
                newShift.date = correctedDate;
            }
            
            // Recalculate dateStr after potential correction
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
                alert(`Kunne ikke lagre vakt i databasen: ${error.message}`);
                return;
            }
            
            // Update last active timestamp since user added a shift
            await this.updateLastActiveTimestamp(user.id);
            
            newShift.id = saved.id;
            
            // Add to userShifts array
            this.userShifts.push(newShift);
            
            // Update this.shifts
            this.shifts = [...this.userShifts];
            
            this.updateDisplay();
            
            document.getElementById('shiftForm').reset();
            this.selectedDate = null;
            document.querySelectorAll('.date-cell').forEach(cell => {
                cell.classList.remove('selected');
            });
            
            this.clearFormState();
            
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
        const year = this.YEAR;
        const monthIdx = this.currentMonth - 1;
        const firstDay = new Date(year, monthIdx, 1);
        const lastDay = new Date(year, monthIdx+1, 0);
        const startDate = new Date(firstDay);
        const offset = firstDay.getDay()===0 ? 6 : firstDay.getDay()-1;
        startDate.setDate(startDate.getDate() - offset);
        dateGrid.innerHTML = '';
        
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
            cell.textContent = cellDate.getDate();
            if (cellDate.getMonth()!==monthIdx) cell.classList.add('disabled');
            else cell.addEventListener('click',()=>{
                document.querySelectorAll('.date-cell').forEach(c=>c.classList.remove('selected'));
                cell.classList.add('selected');
                this.selectedDate = new Date(cellDate);
                this.saveFormState(); // Save form state when date is selected
            });
            dateGrid.appendChild(cell);
        }
    },
    populateMonthDropdown() {
        const dd = document.getElementById('monthDropdown');
        dd.innerHTML = '';
        this.MONTHS.forEach((m,i)=>{
            const opt = document.createElement('div');
            opt.className='month-option';
            opt.textContent = `${m.charAt(0).toUpperCase() + m.slice(1)} ${this.YEAR}`;
            if(i+1===this.currentMonth) opt.classList.add('current');
            opt.addEventListener('click',()=>{
                this.changeMonth(i+1);
                this.closeMonthDropdown();
            });
            dd.appendChild(opt);
        });
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
        this.saveFormState(); // Save when month changes
        this.updateDisplay();
        this.populateDateGrid();
        this.saveSettingsToSupabase(); // This will also update last_active via saveSettingsToSupabase
    },
    async loadFromSupabase() {
        const { data: { user } } = await window.supa.auth.getUser();
        if (!user) {
            this.setDefaultSettings();
            this.updateDisplay();
            return;
        }

        try {
            // First, update user's last active timestamp
            await this.updateLastActiveTimestamp(user.id);

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
                // Check if user has been inactive for more than 5 hours
                const shouldResetToCurrentMonth = this.shouldResetToCurrentMonth(settings.last_active);
                
                this.currentMonth = shouldResetToCurrentMonth 
                    ? new Date().getMonth() + 1 
                    : (settings.current_month || new Date().getMonth() + 1);
                    
                this.pauseDeduction = settings.pause_deduction || false;
                this.fullMinuteRange = settings.full_minute_range || false;
                this.directTimeInput = settings.direct_time_input || false;
                this.monthlyGoal = settings.monthly_goal || 20000;
                this.hasSeenRecurringIntro = settings.has_seen_recurring_intro || false;
                
                if (shouldResetToCurrentMonth && settings.current_month && settings.current_month !== new Date().getMonth() + 1) {
                    // User was inactive for >5 hours, resetting to current month
                }
                
            } else {
                // No settings found, set defaults
                this.setDefaultSettings();
            }

            // Update UI elements to reflect loaded settings
            this.updateSettingsUI();
            // Update month dropdown and date grid to reflect potential reset of currentMonth
            this.populateMonthDropdown();
            this.populateDateGrid();
            // Don't call updateDisplay here - it will be called with animation in init()
        } catch (e) {
            console.error('Error in loadFromSupabase:', e);
            this.setDefaultSettings();
        }
    },

    // Update user's last active timestamp
    async updateLastActiveTimestamp(userId) {
        try {
            const now = new Date().toISOString();
            
            // First check if last_active column exists by trying to fetch it
            const { data: existingSettings, error: fetchError } = await window.supa
                .from('user_settings')
                .select('last_active')
                .eq('user_id', userId)
                .limit(1);
                
            if (fetchError && fetchError.code === 'PGRST204') {
                // Column doesn't exist, skip updating last_active
                return;
            }
            
            const { error } = await window.supa
                .from('user_settings')
                .upsert({
                    user_id: userId,
                    last_active: now
                }, {
                    onConflict: 'user_id'
                });
                
            if (error) {
                if (error.code === 'PGRST204') {
                    // last_active column does not exist, skipping timestamp update
                } else {
                    console.error('Error updating last active timestamp:', error);
                }
            }
        } catch (e) {
            console.error('Error in updateLastActiveTimestamp:', e);
        }
    },

    // Check if user should be reset to current month based on inactivity
    shouldResetToCurrentMonth(lastActiveString) {
        if (!lastActiveString) {
            return false; // If no timestamp, don't reset - keep user's preference
        }

        try {
            const lastActive = new Date(lastActiveString);
            const now = new Date();
            const hoursSinceLastActive = (now - lastActive) / (1000 * 60 * 60); // Convert to hours
            
            const shouldReset = hoursSinceLastActive > 5;
            
            return shouldReset;
        } catch (e) {
            console.error('Error parsing last_active timestamp:', e);
            return false; // If error parsing, don't reset - keep user's preference
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
        this.pauseDeduction = false;
        this.fullMinuteRange = false; // Default to 15-minute intervals
        this.directTimeInput = false; // Default to dropdown time selection
        this.monthlyGoal = 20000; // Default monthly goal
        this.hasSeenRecurringIntro = false; // Track if user has seen recurring feature intro
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
            
            // Adjust modal height after switching preset/custom sections
            setTimeout(() => {
                this.adjustSettingsModalHeight();
            }, 150);
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
                if ('current_month' in existingSettings) settingsData.current_month = this.currentMonth;
                if ('pause_deduction' in existingSettings) settingsData.pause_deduction = this.pauseDeduction;
                if ('full_minute_range' in existingSettings) settingsData.full_minute_range = this.fullMinuteRange;
                if ('direct_time_input' in existingSettings) settingsData.direct_time_input = this.directTimeInput;
                if ('monthly_goal' in existingSettings) settingsData.monthly_goal = this.monthlyGoal;
                if ('has_seen_recurring_intro' in existingSettings) settingsData.has_seen_recurring_intro = this.hasSeenRecurringIntro;
                if ('custom_bonuses' in existingSettings) {
                    settingsData.custom_bonuses = this.customBonuses || {};
                }
                // Only include last_active if the column exists
                if ('last_active' in existingSettings) {
                    settingsData.last_active = new Date().toISOString();
                }
            } else {
                // No existing settings - try to save with common field names
                settingsData.use_preset = this.usePreset;
                settingsData.wage_level = this.currentWageLevel;
                settingsData.custom_wage = this.customWage;
                settingsData.current_month = this.currentMonth;
                settingsData.pause_deduction = this.pauseDeduction;
                settingsData.full_minute_range = this.fullMinuteRange;
                settingsData.direct_time_input = this.directTimeInput;
                settingsData.monthly_goal = this.monthlyGoal;
                settingsData.has_seen_recurring_intro = this.hasSeenRecurringIntro;
                settingsData.custom_bonuses = this.customBonuses || {};
                // For new settings, we'll try to include last_active and let it fail gracefully if column doesn't exist
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
                this.currentMonth = data.currentMonth || new Date().getMonth() + 1; // Default to current month
                this.pauseDeduction = data.pauseDeduction !== false;
                this.fullMinuteRange = data.fullMinuteRange || false;
                this.directTimeInput = data.directTimeInput || false;
                this.monthlyGoal = data.monthlyGoal || 20000;
                this.hasSeenRecurringIntro = data.hasSeenRecurringIntro || false;
                
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
            selectedDate: this.selectedDate ? this.selectedDate.toISOString() : null,
            startHour: document.getElementById('startHour')?.value || '',
            startMinute: document.getElementById('startMinute')?.value || '',
            endHour: document.getElementById('endHour')?.value || '',
            endMinute: document.getElementById('endMinute')?.value || '',
            currentMonth: this.currentMonth
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
                
                // Restore selected date
                if (formState.selectedDate) {
                    this.selectedDate = new Date(formState.selectedDate);
                    // Find and select the corresponding date cell
                    const dateDay = this.selectedDate.getDate();
                    const dateCells = document.querySelectorAll('.date-cell');
                    dateCells.forEach(cell => {
                        if (cell.textContent == dateDay && !cell.classList.contains('disabled')) {
                            cell.classList.add('selected');
                        }
                    });
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
                
                // Restore current month if it was changed from default
                if (formState.currentMonth && formState.currentMonth !== new Date().getMonth() + 1) { // Compare to current month default
                    this.currentMonth = formState.currentMonth;
                    // Update the date grid for the restored month
                    this.populateDateGrid();
                    // Re-select the date cell after date grid update
                    if (formState.selectedDate) {
                        setTimeout(() => {
                            const dateDay = this.selectedDate.getDate();
                            const dateCells = document.querySelectorAll('.date-cell');
                            dateCells.forEach(cell => {
                                if (cell.textContent == dateDay && !cell.classList.contains('disabled')) {
                                    cell.classList.add('selected');
                                }
                            });
                        }, 50);
                    }
                }
                
                this.formState = formState;
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
        // Get current active tab before switching
        const currentActiveTab = document.querySelector('.tab-btn.active');
        const currentTab = currentActiveTab ? 
            (currentActiveTab.textContent === 'Generelt' ? 'general' : 
             currentActiveTab.textContent === 'Lønn' ? 'wage' : 
             currentActiveTab.textContent === 'Profil' ? 'profile' :
             'data') : null;
        
        // If switching away from wage tab and in custom mode, auto-save bonuses
        if (currentTab === 'wage' && !this.usePreset && tab !== 'wage') {
            await this.saveCustomBonusesSilent();
        }
        
        const tabs = ['general','wage','profile','data'];
        tabs.forEach((t,i) => {
            const btn = document.querySelectorAll('.tab-nav .tab-btn')[i];
            btn.classList.toggle('active', t === tab);
            const content = document.getElementById(`${t}Tab`);
            content.classList.toggle('active', t === tab);
        });
        
        // When switching to wage tab and custom mode is active, populate bonus slots
        if (tab === 'wage' && !this.usePreset) {
            setTimeout(() => {
                this.populateCustomBonusSlots();
            }, 100);
        }
        
        // When switching to profile tab, load profile data
        if (tab === 'profile') {
            setTimeout(() => {
                this.loadProfileData();
            }, 100);
        }
        
        // Adjust modal height based on content after tab switch
        setTimeout(() => {
            this.adjustSettingsModalHeight();
        }, 150);
    },
    
    // Adjust settings modal height based on active tab content
    adjustSettingsModalHeight() {
        const modal = document.getElementById('settingsModal');
        const modalContent = modal?.querySelector('.modal-content');
        const activeTabContent = modal?.querySelector('.tab-content.active');
        
        if (!modalContent || !activeTabContent) {
            return;
        }
        
        // Check if current tab is the wage tab
        const currentActiveTab = document.querySelector('.tab-btn.active');
        const isWageTab = currentActiveTab && currentActiveTab.textContent === 'Lønn';
        
        // Temporarily reset height to auto to get accurate measurements
        modalContent.style.height = 'auto';
        modalContent.style.maxHeight = '80vh';
        
        // Small delay to ensure DOM has updated
        requestAnimationFrame(() => {
            // Get the modal header height
            const modalHeader = modal.querySelector('.modal-header');
            const tabNav = modal.querySelector('.tab-nav');
            const headerHeight = (modalHeader?.offsetHeight || 0) + (tabNav?.offsetHeight || 0);
            
            let finalHeight;
            
            if (isWageTab) {
                // For wage tab, use dynamic height as before
                const contentHeight = activeTabContent.scrollHeight;
                const totalNeededHeight = headerHeight + contentHeight + 40; // Add padding
                
                // Set reasonable limits
                const minHeight = 250;
                const maxHeight = Math.floor(window.innerHeight * 0.8); // 80vh
                
                finalHeight = Math.min(Math.max(totalNeededHeight, minHeight), maxHeight);
                
                // Manage overflow based on whether content fits
                if (totalNeededHeight > maxHeight) {
                    modalContent.style.overflowY = 'auto';
                    activeTabContent.style.overflowY = 'visible';
                } else {
                    modalContent.style.overflowY = 'hidden';
                    activeTabContent.style.overflowY = 'visible';
                }
            } else {
                // For all other tabs, use a constant height
                const constantHeight = 400; // Fixed height for non-wage tabs
                finalHeight = constantHeight;
                
                // Always set overflow to auto for constant height tabs
                modalContent.style.overflowY = 'auto';
                activeTabContent.style.overflowY = 'visible';
            }
            
            // Apply the calculated height
            modalContent.style.height = `${finalHeight}px`;
        });
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
                    <button class="btn btn-icon btn-danger remove-bonus">×</button>
                `;
                
                // Add auto-save event listeners to the inputs (only on change, not blur)
                const inputs = slot.querySelectorAll('input');
                inputs.forEach(input => {
                    input.addEventListener('change', () => {
                        this.autoSaveCustomBonuses();
                    });
                    // Removed blur event to reduce frequent saving
                });
                
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
        
        container.appendChild(slot);
        
        // Adjust modal height after adding content
        setTimeout(() => {
            this.adjustSettingsModalHeight();
        }, 50);
    },
    removeBonusSlot(button) {
        button.closest('.bonus-slot').remove();
        // Auto-save when removing bonus slots if in custom mode (silently)
        if (!this.usePreset) {
            this.saveCustomBonusesSilent().catch(console.error);
        }
        
        // Adjust modal height after removing content
        setTimeout(() => {
            this.adjustSettingsModalHeight();
        }, 50);
    },
    
    // Auto-save custom bonuses with debouncing to avoid too many saves
    autoSaveCustomBonuses() {
        if (!this.usePreset) {
            // Clear existing timeout
            if (this.autoSaveTimeout) {
                clearTimeout(this.autoSaveTimeout);
            }
            
            // Set new timeout to save after 5 seconds of inactivity (longer delay)
            this.autoSaveTimeout = setTimeout(() => {
                // Save silently without status messages
                this.saveCustomBonusesSilent().catch(console.error);
            }, 5000);
        }
    },
    
    async openSettings() {
        // Close any existing expanded views
        this.closeBreakdown();
        this.closeShiftDetails();
        
        const modal = document.getElementById('settingsModal');
        if (modal) {
            // Update UI to match current state
            this.updateSettingsUI();
            
            // Set active tab to general
            this.switchSettingsTabSync('general');
            
            // Show the modal
            modal.style.display = 'flex';
            
            // Ensure custom bonus slots are populated if custom mode is active
            if (!this.usePreset) {
                setTimeout(() => {
                    this.populateCustomBonusSlots();
                }, 100);
            }
            
            // Adjust modal height after everything is loaded
            setTimeout(() => {
                this.adjustSettingsModalHeight();
            }, 200);
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
        
        // Check for pending confetti after modal is closed
        setTimeout(() => {
            checkPendingConfetti();
        }, 100);
        
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
                currentMonth: this.currentMonth,
                pauseDeduction: this.pauseDeduction,
                fullMinuteRange: this.fullMinuteRange,
                directTimeInput: this.directTimeInput,
                hasSeenRecurringIntro: this.hasSeenRecurringIntro
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
        this.updateStats(shouldAnimate);
        this.updateShiftList();
    },
    updateHeader() {
        let wage = this.getCurrentWageRate();
        if (typeof wage !== 'number' || isNaN(wage)) {
            wage = 0;
        }
        const monthName = this.MONTHS[this.currentMonth - 1].charAt(0).toUpperCase() + this.MONTHS[this.currentMonth - 1].slice(1);
        document.getElementById('currentMonth').textContent = `${monthName} ${this.YEAR}`;
        document.getElementById('currentWage').textContent = `${wage.toFixed(2).replace('.', ',')} kr/t`;
        
        // Update the total card label to match selected month
        const totalLabel = document.querySelector('.total-label');
        if (totalLabel) {
            // Check if current month is the actual current month
            const now = new Date();
            const isCurrentMonth = this.currentMonth === (now.getMonth() + 1) && this.YEAR === now.getFullYear();
            
            if (isCurrentMonth) {
                totalLabel.textContent = 'Brutto';
            } else {
                totalLabel.textContent = `Brutto (${monthName.toLowerCase()})`;
            }
        }
    },
    updateStats(shouldAnimate = false) {
        let totalHours = 0;
        let totalBase = 0;
        let totalBonus = 0;
        const monthShifts = this.shifts.filter(shift =>
            shift.date.getMonth() === this.currentMonth - 1 &&
            shift.date.getFullYear() === this.YEAR
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
        const prevYear = this.currentMonth === 1 ? this.YEAR - 1 : this.YEAR;
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
                value: avgHourly ? this.formatCurrency(avgHourly) : '0 kr'
            },
            {
                id: 'bestDay',
                relevanceScore: 9,
                label: bestDay.date
                    ? `Beste dag ${bestDay.date.getDate()}.${bestDay.date.getMonth()+1}`
                    : 'Beste dag',
                value: this.formatCurrency(bestDay.total)
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

        const viewport = window.visualViewport ? window.visualViewport.height : window.innerHeight;

        for (const s of stats) {
            const card = document.createElement('div');
            card.className = 'stat-card';
            card.innerHTML = `<div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div>`;
            container.appendChild(card);

            if (container.getBoundingClientRect().bottom > viewport) {
                container.removeChild(card);
                break;
            }
        }
    },
    updateShiftList() {
        
        this.shifts.forEach((shift, index) => {
        });
        
        const shiftList = document.getElementById('shiftList');
        const monthShifts = this.shifts.filter(shift =>
            shift.date.getMonth() === this.currentMonth - 1 &&
            shift.date.getFullYear() === this.YEAR
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
        const sortedShifts = monthShifts.sort((a, b) => b.date - a.date);
        const shiftsHtml = sortedShifts.map(shift => {
            const calc = this.calculateShift(shift);
            const day = shift.date.getDate();
            const weekday = this.WEEKDAYS[shift.date.getDay()];
            const typeClass = shift.type === 0 ? 'weekday' : (shift.type === 1 ? 'saturday' : 'sunday');
            const seriesBadge = shift.seriesId ? '<span class="series-badge">Serie</span>' : '';
            
            return `
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
            `;
        }).join('');
        shiftList.innerHTML = shiftsHtml;
    },
        // Show breakdown modal
    showBreakdown(type) {
        // Close any existing breakdown first
        this.closeBreakdown();
        
        // Hide header with smooth animation
        const header = document.querySelector('.header');
        if (header) {
            header.classList.add('hidden');
        }
        
        // Create backdrop
        const backdrop = document.createElement('div');
        backdrop.className = 'backdrop-blur';
        backdrop.onclick = () => this.closeBreakdown();
        document.body.appendChild(backdrop);
        
        // Add keyboard support for closing
        const keydownHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeBreakdown();
            }
        };
        document.addEventListener('keydown', keydownHandler);
        backdrop.dataset.keydownHandler = 'attached';
        
        // Force reflow then activate backdrop
        backdrop.offsetHeight;
        backdrop.classList.add('active');
        
        // Create modal element without any class to avoid CSS conflicts
        const modal = document.createElement('div');
        modal.className = 'breakdown-modal-custom';
        
        // Use translate3d for hardware acceleration and better positioning
        modal.style.position = 'fixed';
        modal.style.left = '50%';
        modal.style.top = '50%';
        modal.style.transform = 'translate3d(-50%, -50%, 0)';
        modal.style.width = 'min(90vw, 500px)';
        modal.style.maxHeight = '80vh';
        modal.style.background = 'linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary))';
        modal.style.borderRadius = '20px';
        modal.style.padding = '24px';
        modal.style.zIndex = '1500';
        modal.style.boxShadow = '0 32px 64px var(--shadow-accent), 0 16px 32px rgba(0, 0, 0, 0.3)';
        modal.style.border = '1px solid var(--accent3-alpha)';
        modal.style.overflowY = 'auto';
        modal.style.scrollbarWidth = 'none'; // Firefox
        modal.style.msOverflowStyle = 'none'; // Internet Explorer 10+
        modal.style.display = 'flex';
        modal.style.flexDirection = 'column';
        modal.style.opacity = '0';
        modal.style.willChange = 'transform, opacity';
        modal.style.transition = 'opacity 0.4s var(--ease-default)';
        
        // Store reference for cleanup
        this.currentModal = modal;
        
        // Create title with icon
        const titleContainer = document.createElement('div');
        titleContainer.className = 'breakdown-title-container';
        titleContainer.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            margin-bottom: 20px;
            opacity: 0;
            animation: slideInFromBottom 0.5s var(--ease-default) 0.2s forwards;
            flex-shrink: 0;
        `;
        
        const icon = document.createElement('div');
        icon.className = 'breakdown-title-icon';
        icon.style.cssText = `
            color: var(--accent3);
            opacity: 0.8;
        `;
        
        // Add appropriate icon based on type
        if (type === 'base') {
            icon.innerHTML = `
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="12" y1="8" x2="12" y2="16"></line>
                    <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
            `;
        } else {
            icon.innerHTML = `
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="12 2 15.09 6.26 22 7.27 17 12.14 18.18 19.02 12 15.77 5.82 19.02 7 12.14 2 7.27 8.91 6.26 12 2"></polygon>
                </svg>
            `;
        }
        
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
        `;
        modal.appendChild(calendarContainer);
        
        // Add modal to body first
        document.body.appendChild(modal);
        
        // Use setTimeout instead of requestAnimationFrame for more reliable timing
        setTimeout(() => {
            modal.style.opacity = '1';
        }, 50);
        
        // Create calendar for current month
        setTimeout(() => {
            this.createBreakdownCalendar(calendarContainer, type);
        }, 100);
    },

    // Create breakdown calendar view
    createBreakdownCalendar(container, type) {
        const year = this.YEAR;
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
            s.date.getFullYear() === this.YEAR
        );
        
        const shiftsByDate = {};
        monthShifts.forEach(shift => {
            const dateKey = shift.date.getDate();
            if (!shiftsByDate[dateKey]) {
                shiftsByDate[dateKey] = [];
            }
            shiftsByDate[dateKey].push(shift);
        });

        // Create calendar cells (42 cells for 6 weeks)
        for (let i = 0; i < 42; i++) {
            // Add week number at the start of each row (every 7 cells)
            if (i % 7 === 0) {
                const weekDate = new Date(startDate);
                weekDate.setDate(startDate.getDate() + i);
                const weekNum = this.getISOWeekNumber(weekDate);
                const weekCell = document.createElement('div');
                weekCell.className = 'calendar-week-number';
                weekCell.textContent = weekNum;
                
                // Calculate animation delay for week number
                const row = Math.floor(i / 7);
                const weekAnimationDelay = 0.3 + (row * 7) * 0.035;
                weekCell.style.animationDelay = `${weekAnimationDelay}s`;
                
                grid.appendChild(weekCell);
            }
            
            const cellDate = new Date(startDate);
            cellDate.setDate(startDate.getDate() + i);
            
            const cell = document.createElement('div');
            cell.className = 'calendar-cell';
            
            // Calculate animation delay based on row and column position
            // Row by row, left to right animation - start while modal is opening
            // Account for week number column by adding 1 to the base position
            const row = Math.floor(i / 7);
            const col = i % 7;
            const animationDelay = 0.3 + (row * 8 + col + 1) * 0.035; // 8 columns now (week + 7 days), +1 for week number offset
            cell.style.animationDelay = `${animationDelay}s`;
            
            const dayNumber = document.createElement('div');
            dayNumber.className = 'calendar-day-number';
            dayNumber.textContent = cellDate.getDate();
            
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

            // Add amount display
            const amountDisplay = document.createElement('div');
            amountDisplay.className = 'calendar-amount';
            
            if (totalAmount > 0) {
                amountDisplay.textContent = this.formatCurrencyCalendar(totalAmount);
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

            cell.appendChild(dayNumber);
            cell.appendChild(amountDisplay);
            grid.appendChild(cell);
        }

        container.appendChild(grid);
    },
    
    // Close breakdown modal
    closeBreakdown() {
        const backdrop = document.querySelector('.backdrop-blur');
        const modal = this.currentModal;
        const header = document.querySelector('.header');
        
        // Show header again
        if (header) {
            header.classList.remove('hidden');
        }
        
        if (backdrop) {
            backdrop.classList.remove('active');
            
            // Remove keyboard event listener
            if (backdrop.dataset.keydownHandler) {
                document.removeEventListener('keydown', (e) => {
                    if (e.key === 'Escape') {
                        this.closeBreakdown();
                    }
                });
            }
            
            setTimeout(() => backdrop.remove(), 300);
        }
        
        if (modal) {
            // Animate out
            modal.style.opacity = '0';
            setTimeout(() => {
                modal.remove();
                this.currentModal = null;
                // Check for pending confetti after modal is closed
                setTimeout(() => {
                    checkPendingConfetti();
                }, 100);
            }, 400);
        }
    },
    // Show detailed shift information in expanded view
    showShiftDetails(shiftId) {
        // Find the shift by ID
        const shift = this.shifts.find(s => s.id === shiftId);
        if (!shift) return;
        
        // Close any existing expanded views
        this.closeBreakdown();
        this.closeSettings();
        
        // Hide header
        const header = document.querySelector('.header');
        if (header) {
            header.classList.add('hidden');
        }
        
        // Create backdrop
        const backdrop = document.createElement('div');
        backdrop.className = 'backdrop-blur';
        backdrop.onclick = () => this.closeShiftDetails();
        document.body.appendChild(backdrop);
        
        // Store keyboard handler reference for proper cleanup
        this.shiftDetailsKeydownHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeShiftDetails();
            }
        };
        document.addEventListener('keydown', this.shiftDetailsKeydownHandler);
        
        // Force reflow then activate backdrop
        backdrop.offsetHeight;
        backdrop.classList.add('active');
        
        // Create shift detail card
        const detailCard = document.createElement('div');
        detailCard.className = 'shift-detail-card';
        
        // Set initial styles that position it correctly from the start
        detailCard.style.position = 'fixed';
        detailCard.style.top = '50%';
        detailCard.style.left = '50%';
        detailCard.style.transform = 'translate(-50%, -50%) scale(0.8)';
        detailCard.style.width = 'min(90vw, 500px)';
        detailCard.style.maxHeight = '80vh';
        detailCard.style.padding = '24px';
        detailCard.style.zIndex = '1200';
        detailCard.style.opacity = '0';
        detailCard.style.overflowY = 'auto';
        detailCard.style.transition = 'all 0.4s var(--ease-default)';
        
        // Calculate shift details
        const calc = this.calculateShift(shift);
        const dayName = this.WEEKDAYS[shift.date.getDay()];
        const monthName = this.MONTHS[shift.date.getMonth()];
        const formattedDate = `${dayName} ${shift.date.getDate()}. ${monthName} ${shift.date.getFullYear()}`;
        const originalIndex = this.shifts.indexOf(shift);
        
        // Create content
        detailCard.innerHTML = `
            <div class="shift-detail-header">
                <div class="shift-detail-icon">
                    <svg class="icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 6v6l4 2"></path>
                    </svg>
                </div>
                <h3 class="shift-detail-title">Vaktdetaljer</h3>
            </div>
            
            <div class="shift-detail-content">
                <div class="detail-section">
                    <div class="detail-label">Dato</div>
                    <div class="detail-value">${formattedDate}</div>
                </div>
                
                <div class="detail-section">
                    <div class="detail-label">Arbeidstid</div>
                    <div class="detail-value">${shift.startTime} - ${shift.endTime}</div>
                </div>
                
                <div class="detail-section">
                    <div class="detail-label">Total varighet</div>
                    <div class="detail-value">${calc.totalHours.toFixed(2)} timer</div>
                </div>
                
                <div class="detail-section">
                    <div class="detail-label">Betalt tid</div>
                    <div class="detail-value">${calc.paidHours.toFixed(2)} timer</div>
                </div>
                
                ${calc.pauseDeducted ? `
                <div class="detail-section">
                    <div class="detail-label">Pausetrekk</div>
                    <div class="detail-value">30 minutter</div>
                </div>
                ` : ''}
                
                <div class="detail-section">
                    <div class="detail-label">Grunnlønn</div>
                    <div class="detail-value accent">${this.formatCurrency(calc.baseWage)}</div>
                </div>
                
                ${calc.bonus > 0 ? `
                <div class="detail-section bonus-section">
                    <div class="detail-label">Tillegg</div>
                    <div class="detail-value accent">${this.formatCurrency(calc.bonus)}</div>
                </div>
                ` : ''}
                
                <div class="detail-section total">
                    <div class="detail-label">Total lønn</div>
                    <div class="detail-value accent large">${this.formatCurrency(calc.total)}</div>
                </div>

                <div class="detail-section actions-section">
                    <div class="shift-actions">
                        <button class="btn btn-secondary edit-shift-btn" data-shift-id="${shift.id}" style="gap: 8px;">
                            <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            Rediger vakt
                        </button>
                        <button class="btn btn-danger delete-shift-btn" data-shift-index="${originalIndex}" style="gap: 8px;">
                            <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            Slett vakt
                        </button>
                        ${shift.seriesId ? `<button class="btn btn-warning delete-series-btn" style="gap: 8px;">Slett serie</button>` : ``}
                    </div>
                </div>
            </div>

            <button class="close-btn close-shift-details">×</button>
        `;
        
        document.body.appendChild(detailCard);
        
        // Trigger animation immediately
        requestAnimationFrame(() => {
            detailCard.style.opacity = '1';
            detailCard.style.transform = 'translate(-50%, -50%) scale(1)';
        });
        
        // Attach handler for delete-series button
        if (shift.seriesId) {
            const seriesBtn = detailCard.querySelector('.delete-series-btn');
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
        
        // Find and close any existing shift detail card
        const detailCard = document.querySelector('.shift-detail-card');
        const backdrop = document.querySelector('.backdrop-blur');
        const header = document.querySelector('.header');
        
        // Show header again
        if (header) {
            header.classList.remove('hidden');
        }
        
        // Remove keyboard event listener
        if (this.shiftDetailsKeydownHandler) {
            document.removeEventListener('keydown', this.shiftDetailsKeydownHandler);
            this.shiftDetailsKeydownHandler = null;
        }
        
        // Remove detail card first
        if (detailCard) {
            detailCard.style.opacity = '0';
            detailCard.style.transform = 'translate(-50%, -50%) scale(0.8)';
            
            // Remove card after animation
            setTimeout(() => {
                if (detailCard.parentNode) {
                    detailCard.remove();
                }
            }, 300);
        }
        
        // Remove backdrop after detail card animation starts
        if (backdrop) {
            // Start backdrop fade-out animation after a short delay
            setTimeout(() => {
                backdrop.classList.remove('active');
                
                // Remove backdrop after its animation completes
                setTimeout(() => {
                    if (backdrop.parentNode) {
                        backdrop.remove();
                    }
                }, 350); // Extra 50ms to ensure animation completes
            }, 100); // 100ms delay to let modal start closing first
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
        // If the end time is earlier than the start time, the shift continues
        // after midnight. Add 24 hours so the duration is calculated correctly.
        if (endMinutes <= startMinutes) {
            endMinutes += 24 * 60;
        }
        const durationHours = (endMinutes - startMinutes) / 60;
        let paidHours = durationHours;
        if (this.pauseDeduction && durationHours > this.PAUSE_THRESHOLD) {
            paidHours -= this.PAUSE_DEDUCTION;
            endMinutes -= this.PAUSE_DEDUCTION * 60;
        }
        const wageRate = this.getCurrentWageRate();
        const baseWage = paidHours * wageRate;
        const bonuses = this.getCurrentBonuses();
        const bonusType = shift.type === 0 ? 'weekday' : (shift.type === 1 ? 'saturday' : 'sunday');
        const bonusSegments = bonuses[bonusType] || [];
        
        
        // Recreate the end time after any pause deduction or midnight handling
        // so we can reuse the same format when calculating bonuses
        const endHour = Math.floor(endMinutes / 60) % 24;
        const endTimeStr = `${String(endHour).padStart(2,'0')}:${(endMinutes % 60).toString().padStart(2,'0')}`;

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
        return Math.round(amount).toLocaleString('nb-NO') + ' kr';
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
            
            // Check for pending confetti after modal is closed
            setTimeout(() => {
                checkPendingConfetti();
            }, 100);
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
        
        const year = this.YEAR;
        const month = this.currentMonth - 1; // Convert to 0-based
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        const offset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
        startDate.setDate(startDate.getDate() - offset);
        
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
            cell.textContent = cellDate.getDate();
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
            
            // Update last active timestamp
            await this.updateLastActiveTimestamp(user.id);
            
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
    }
};

