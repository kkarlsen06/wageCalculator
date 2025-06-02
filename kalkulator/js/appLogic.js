export const app = {
    // Constants
    YEAR: 2025,
    PAUSE_THRESHOLD: 5.5,
    PAUSE_DEDUCTION: 0.5,
    MONTHS: ['januar', 'februar', 'mars', 'april', 'mai', 'juni',
             'juli', 'august', 'september', 'oktober', 'november', 'desember'],
    WEEKDAYS: ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'],
    PRESET_WAGE_RATES: {
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
    selectedDate: null,
    demoMode: false,
    userShifts: [],
    formState: {}, // Store form state to preserve across page restarts
    DEMO_SHIFTS: [
        { id: 'demo-1', date: "2025-06-03T00:00:00.000Z", startTime: "15:00", endTime: "23:15", type: 1 },
        { id: 'demo-2', date: "2025-06-10T00:00:00.000Z", startTime: "15:00", endTime: "23:15", type: 1 },
        { id: 'demo-3', date: "2025-06-12T00:00:00.000Z", startTime: "17:00", endTime: "23:15", type: 0 },
        { id: 'demo-4', date: "2025-06-15T00:00:00.000Z", startTime: "17:00", endTime: "22:00", type: 0 },
        { id: 'demo-5', date: "2025-06-19T00:00:00.000Z", startTime: "17:00", endTime: "21:00", type: 0 },
        { id: 'demo-6', date: "2025-06-21T00:00:00.000Z", startTime: "16:00", endTime: "23:15", type: 1 },
        { id: 'demo-7', date: "2025-06-22T00:00:00.000Z", startTime: "13:00", endTime: "18:00", type: 1 },
        { id: 'demo-8', date: "2025-06-23T00:00:00.000Z", startTime: "16:00", endTime: "23:15", type: 0 },
        { id: 'demo-9', date: "2025-06-24T00:00:00.000Z", startTime: "17:00", endTime: "23:15", type: 0 },
        { id: 'demo-10', date: "2025-06-26T00:00:00.000Z", startTime: "17:00", endTime: "23:15", type: 0 },
        { id: 'demo-11', date: "2025-06-30T00:00:00.000Z", startTime: "15:45", endTime: "23:15", type: 0 }
    ].map(shift => ({
        ...shift,
        date: new Date(shift.date)
    })),
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
        // Update demo toggle to match loaded state
        const demoToggle = document.getElementById('demoDataToggle');
        if (demoToggle) {
            demoToggle.checked = this.demoMode;
        }
        // Set initial shifts based on demo mode
        this.shifts = this.demoMode ? this.DEMO_SHIFTS : this.userShifts;
        // Bind demo and pause toggles
        document.getElementById('demoDataToggle').addEventListener('change', e => this.toggleDemoMode(e.target.checked));
        document.getElementById('pauseDeductionToggle').addEventListener('change', e => {
            this.pauseDeduction = e.target.checked;
            this.updateDisplay();
            this.saveSettingsToSupabase();
        });
        // Close month dropdown when clicking outside
        document.addEventListener('click', e => {
            const monthSelector = document.querySelector('.month-selector');
            if (!monthSelector.contains(e.target)) this.closeMonthDropdown();
        });
        
        // Close breakdown on Escape key
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                this.closeBreakdown();
            }
        });
        
        // Setup mobile email slide-out functionality
        this.setupMobileEmailSlideOut();
        
        // Add event listeners for form inputs to save state automatically
        this.setupFormStateListeners();
        
        // Restore form state after initialization
        this.restoreFormState();
        
        this.updateDisplay();
    },

    async displayUserEmail() {
        try {
            const { data: { user } } = await window.supa.auth.getUser();
            if (user && user.email) {
                const userEmailElement = document.getElementById('userEmail');
                const userEmailDisplay = document.getElementById('userEmailDisplay');
                
                if (userEmailElement && userEmailDisplay) {
                    userEmailElement.textContent = user.email;
                    userEmailDisplay.style.display = 'flex';
                }
            }
        } catch (error) {
            console.error('Error fetching user email:', error);
            // Skjul email-elementet hvis det oppstår en feil
            const userEmailDisplay = document.getElementById('userEmailDisplay');
            if (userEmailDisplay) {
                userEmailDisplay.style.display = 'none';
            }
        }
    },

    setupMobileEmailSlideOut() {
        const userEmailDisplay = document.getElementById('userEmailDisplay');
        const headerInfo = document.querySelector('.header-info');
        
        if (!userEmailDisplay || !headerInfo) return;
        
        // Create mobile email overlay if it doesn't exist
        let mobileEmailOverlay = headerInfo.querySelector('.mobile-email-overlay');
        if (!mobileEmailOverlay) {
            mobileEmailOverlay = document.createElement('div');
            mobileEmailOverlay.className = 'mobile-email-overlay';
            headerInfo.appendChild(mobileEmailOverlay);
        }
        
        let isShowing = false;
        let hideTimeout;
        
        userEmailDisplay.addEventListener('click', (e) => {
            // Only trigger on mobile screens
            if (window.innerWidth > 480) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            if (isShowing) return;
            
            // Get user email
            const userEmail = document.getElementById('userEmail');
            if (!userEmail || !userEmail.textContent) return;
            
            // Set email text in overlay
            mobileEmailOverlay.textContent = userEmail.textContent;
            
            // Show animation
            isShowing = true;
            headerInfo.classList.add('email-showing');
            
            // Use requestAnimationFrame for smooth animation
            requestAnimationFrame(() => {
                mobileEmailOverlay.classList.add('show');
            });
            
            // Hide after 2 seconds with smooth transition
            clearTimeout(hideTimeout);
            hideTimeout = setTimeout(() => {
                mobileEmailOverlay.classList.remove('show');
                
                // Wait for animation to complete before hiding container
                setTimeout(() => {
                    headerInfo.classList.remove('email-showing');
                    isShowing = false;
                }, 300); // Match CSS transition duration
            }, 2000);
        });
        
        // Reset on window resize
        window.addEventListener('resize', () => {
            if (window.innerWidth > 480 && isShowing) {
                clearTimeout(hideTimeout);
                mobileEmailOverlay.classList.remove('show');
                headerInfo.classList.remove('email-showing');
                isShowing = false;
            }
        });
    },

    populateTimeSelects() {
        const startHour = document.getElementById('startHour');
        const endHour = document.getElementById('endHour');
        const startMinute = document.getElementById('startMinute');
        const endMinute = document.getElementById('endMinute');
        startHour.innerHTML = '<option value="">Fra time</option>';
        endHour.innerHTML = '<option value="">Til time</option>';
        startMinute.innerHTML = '<option value="">Fra minutt</option>';
        endMinute.innerHTML = '<option value="">Til minutt</option>';
        for (let h = 6; h <= 24; h++) {
            const hh = String(h).padStart(2,'0');
            startHour.innerHTML += `<option value="${hh}">${hh}</option>`;
            endHour.innerHTML += `<option value="${hh}">${hh}</option>`;
        }
        ['00','15','30','45'].forEach((m, idx) => {
            const sel = idx===0? ' selected':'';
            startMinute.innerHTML += `<option value="${m}"${sel}>${m}</option>`;
            endMinute.innerHTML += `<option value="${m}"${sel}>${m}</option>`;
        });
    },
    toggleAddShift() {
        const card = document.querySelector('.add-shift-card');
        const toggle = document.querySelector('.add-shift-toggle');
        const icon = document.getElementById('toggleIcon');
        if (!document.getElementById('startHour').options.length) this.populateTimeSelects();
        if (!document.getElementById('dateGrid').childElementCount) this.populateDateGrid();
        card.classList.toggle('active');
        toggle.classList.toggle('active');
        icon.style.transform = card.classList.contains('active') ? 'rotate(180deg)' : 'rotate(0)';
    },
    async addShift() {
        console.log('addShift: Starting shift addition process');
        try {
            if (!this.selectedDate) {
                console.log('addShift: No date selected');
                alert('Vennligst velg en dato');
                return;
            }
            
            const startHour = document.getElementById('startHour').value;
            const startMinute = document.getElementById('startMinute').value || '00';
            const endHour = document.getElementById('endHour').value;
            const endMinute = document.getElementById('endMinute').value || '00';
            
            if (!startHour || !endHour) {
                console.log('addShift: Missing time values');
                alert('Vennligst fyll ut arbeidstid');
                return;
            }
            
            if (this.demoMode) {
                console.log('addShift: In demo mode, asking user to switch');
                if (confirm('Du er i demo-modus. Vil du bytte til dine egne vakter for å legge til denne vakten?')) {
                    this.toggleDemoMode(false);
                    document.getElementById('demoDataToggle').checked = false;
                } else {
                    console.log('addShift: User cancelled switch from demo mode');
                    return;
                }
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
                console.log('addShift: No authenticated user found');
                alert("Du er ikke innlogget");
                return;
            }
            
            const dateStr = `${newShift.date.getFullYear()}-${(newShift.date.getMonth() + 1).toString().padStart(2, '0')}-${newShift.date.getDate().toString().padStart(2, '0')}`;
            
            console.log('addShift: Date debugging:');
            console.log('  - Current UI month:', this.currentMonth);
            console.log('  - Selected date object:', this.selectedDate);
            console.log('  - New shift date object:', newShift.date);
            console.log('  - New shift date month (1-based):', newShift.date.getMonth() + 1);
            console.log('  - Date string for database:', dateStr);
            
            // Validate that the selected date is in the current UI month
            if (newShift.date.getMonth() + 1 !== this.currentMonth) {
                console.warn('addShift: Date mismatch detected!');
                console.warn(`  - UI shows month ${this.currentMonth}, but selected date is in month ${newShift.date.getMonth() + 1}`);
                console.warn('  - Correcting date to match UI month...');
                
                // Correct the date to be in the current UI month
                const correctedDate = new Date(this.YEAR, this.currentMonth - 1, this.selectedDate.getDate());
                newShift.date = correctedDate;
                
                console.warn('  - Corrected date:', correctedDate);
                console.warn('  - Corrected date month:', correctedDate.getMonth() + 1);
            }
            
            // Recalculate dateStr after potential correction
            const finalDateStr = `${newShift.date.getFullYear()}-${(newShift.date.getMonth() + 1).toString().padStart(2, '0')}-${newShift.date.getDate().toString().padStart(2, '0')}`;
            console.log('  - Final date string for database:', finalDateStr);
            
            const insertData = {
                user_id: user.id,
                shift_date: finalDateStr,
                start_time: newShift.startTime,
                end_time: newShift.endTime,
                shift_type: newShift.type
            };
            
            console.log('addShift: Saving shift for date:', finalDateStr, 'in month:', newShift.date.getMonth() + 1, 'current filter month:', this.currentMonth);
            
            const { data: saved, error } = await window.supa.from("user_shifts")
                .insert(insertData)
                .select()
                .single();
                
            if (error) {
                console.error('addShift: Database error when saving shift:', error);
                alert(`Kunne ikke lagre vakt i databasen: ${error.message}`);
                return;
            }
            
            console.log('addShift: Database insert successful, ID:', saved.id);
            
            // Update last active timestamp since user added a shift
            await this.updateLastActiveTimestamp(user.id);
            
            newShift.id = saved.id;
            
            // Add to userShifts array
            this.userShifts.push(newShift);
            
            // Update this.shifts based on current mode
            if (!this.demoMode) {
                // In normal mode, this.shifts should reflect userShifts
                this.shifts = [...this.userShifts];
            }
            // In demo mode, this.shifts stays as DEMO_SHIFTS, so new shift won't show until demo mode is turned off
            
            this.updateDisplay();
            
            document.getElementById('shiftForm').reset();
            this.selectedDate = null;
            document.querySelectorAll('.date-cell').forEach(cell => {
                cell.classList.remove('selected');
            });
            
            this.clearFormState();
            
            console.log('addShift: Completed successfully. Total shifts:', this.shifts.length);
            
        } catch (e) {
            console.error('addShift: Critical error:', e);
            alert(`En uventet feil oppstod: ${e.message}`);
        }
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
        ['M','T','O','T','F','L','S'].forEach(day => {
            const hdr = document.createElement('div');
            hdr.textContent = day;
            hdr.style.cssText = 'font-weight:600;font-size:12px;color:var(--text-secondary);text-align:center;padding:8px;';
            dateGrid.appendChild(hdr);
        });
        for (let i=0;i<42;i++){
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
                console.log('Date selected:', {
                    cellDate: cellDate,
                    selectedDate: this.selectedDate,
                    currentUIMonth: this.currentMonth,
                    selectedDateMonth: this.selectedDate.getMonth() + 1
                });
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
        
        if (isActive) {
            dd.classList.remove('active');
        } else {
            dd.classList.add('active');
            this.populateMonthDropdown();
            
            // Ensure dropdown is visible by fixing any z-index issues
            dd.style.zIndex = '2000';
        }
    },
    
    closeMonthDropdown() {
        const dd = document.getElementById('monthDropdown');
        dd.classList.remove('active');
        dd.style.zIndex = ''; // Reset z-index
    },
    
    changeMonth(month) {
        this.currentMonth = month;
        this.saveFormState(); // Save when month changes
        this.updateDisplay();
        this.populateDateGrid();
        this.saveSettingsToSupabase(); // This will also update last_active via saveSettingsToSupabase
    },
    toggleDemoMode(enabled) {
        this.demoMode = enabled;
        this.shifts = enabled ? this.DEMO_SHIFTS : this.userShifts;
        this.updateDisplay();
        // Note: Demo mode is not saved to database, only local state
    },
    async loadFromSupabase() {
        const { data: { user } } = await window.supa.auth.getUser();
        if (!user) {
            console.log('No authenticated user, using default settings');
            this.setDefaultSettings();
            this.updateDisplay();
            return;
        }

        try {
            // First, update user's last active timestamp
            await this.updateLastActiveTimestamp(user.id);

            // Fetch shifts
            console.log('=== LOADING SHIFTS FROM DATABASE ===');
            console.log('User ID:', user.id);
            
            const { data: shifts, error: shiftsError } = await window.supa
                .from('user_shifts')
                .select('*')
                .eq('user_id', user.id);

            console.log('Raw shifts from database:', shifts);
            console.log('Shifts error:', shiftsError);

            if (shiftsError) {
                console.error('Error fetching shifts from Supabase:', shiftsError);
            } else {
                console.log(`Found ${shifts?.length || 0} shifts in database`);
                
                // Map shifts to app format
                this.userShifts = (shifts || []).map(s => {
                    const mappedShift = {
                        id: s.id,
                        date: new Date(s.shift_date + 'T00:00:00.000Z'),
                        startTime: s.start_time,
                        endTime: s.end_time,
                        type: s.shift_type
                    };
                    console.log('Mapped shift:', s, '→', mappedShift);
                    return mappedShift;
                });
                
                console.log('Total userShifts after mapping:', this.userShifts.length);
                console.log('Demo mode status:', this.demoMode);
                
                // Set current shifts based on demo mode
                if (!this.demoMode) {
                    this.shifts = [...this.userShifts];
                    console.log('Set shifts to userShifts, total shifts now:', this.shifts.length);
                } else {
                    console.log('In demo mode, keeping demo shifts');
                }
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
                
                // Try different possible column names for wage level
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
                
                if (shouldResetToCurrentMonth && settings.current_month && settings.current_month !== new Date().getMonth() + 1) {
                    console.log(`User was inactive for >5 hours. Resetting from month ${settings.current_month} to current month ${new Date().getMonth() + 1}`);
                }
                
                // Note: demo_mode is kept as local-only state, not stored in database
                
                console.log('Loaded settings from database:', settings);
                console.log('Custom bonuses loaded:', this.customBonuses);
            } else {
                // No settings found, set defaults
                this.setDefaultSettings();
            }

            // Update UI elements to reflect loaded settings
            this.updateSettingsUI();
            this.updateDisplay();
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
                console.log('last_active column does not exist in user_settings table, skipping timestamp update');
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
                    console.log('last_active column does not exist, skipping timestamp update');
                } else {
                    console.error('Error updating last active timestamp:', error);
                }
            } else {
                console.log('Updated last active timestamp:', now);
            }
        } catch (e) {
            console.error('Error in updateLastActiveTimestamp:', e);
        }
    },

    // Check if user should be reset to current month based on inactivity
    shouldResetToCurrentMonth(lastActiveString) {
        if (!lastActiveString) {
            console.log('No last_active timestamp found, keeping user\'s selected month');
            return false; // If no timestamp, don't reset - keep user's preference
        }

        try {
            const lastActive = new Date(lastActiveString);
            const now = new Date();
            const hoursSinceLastActive = (now - lastActive) / (1000 * 60 * 60); // Convert to hours
            
            const shouldReset = hoursSinceLastActive > 5;
            console.log(`Last active: ${lastActive.toLocaleString()}`);
            console.log(`Hours since last active: ${hoursSinceLastActive.toFixed(1)}`);
            console.log(`Should reset to current month: ${shouldReset}`);
            
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
        this.demoMode = false;
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
        console.log('Set test custom bonuses:', this.customBonuses);
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
                    console.log('Switching to custom mode - populating bonus slots');
                    console.log('Current custom bonuses:', this.customBonuses);
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
                settingsData.custom_bonuses = this.customBonuses || {};
                // For new settings, we'll try to include last_active and let it fail gracefully if column doesn't exist
            }

            console.log('Attempting to save settings data:', settingsData);
            console.log('Custom bonuses being saved to DB:', this.customBonuses);
            console.log('CustomBonuses object keys:', Object.keys(this.customBonuses));
            console.log('CustomBonuses weekday length:', this.customBonuses.weekday ? this.customBonuses.weekday.length : 'undefined');
            console.log('CustomBonuses saturday length:', this.customBonuses.saturday ? this.customBonuses.saturday.length : 'undefined');
            console.log('CustomBonuses sunday length:', this.customBonuses.sunday ? this.customBonuses.sunday.length : 'undefined');

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
                
                console.log('Trying minimal settings save...');
                const { error: minError } = await window.supa
                    .from('user_settings')
                    .upsert(minimalData, { onConflict: 'user_id' });
                    
                if (minError) {
                    console.error('Even minimal save failed:', minError);
                } else {
                    console.log('Minimal settings saved - some columns may not exist in schema');
                }
            } else {
                console.log('Settings saved successfully');
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
                this.demoMode = data.demoMode || false;
                
                console.log('Loaded from localStorage:', data);
                console.log('Custom bonuses from localStorage:', this.customBonuses);
                
                this.updateSettingsUI();
            } else {
                this.setDefaultSettings();
            }
        } catch (e) {
            console.error('Error loading from localStorage:', e);
            this.setDefaultSettings();
        }
        this.updateDisplay();
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
        console.log('Form state saved:', formState);
    },
    
    // Restore form state after page restart
    restoreFormState() {
        try {
            const saved = localStorage.getItem('vaktberegnerFormState');
            if (saved) {
                const formState = JSON.parse(saved);
                console.log('Restoring form state:', formState);
                
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
        console.log('Form state cleared');
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
        
        console.log('Form state event listeners set up');
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
            console.log('Switching away from wage tab - auto-saving custom bonuses');
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
                console.log('Switching to wage tab - populating custom bonus slots');
                this.populateCustomBonusSlots();
            }, 100);
        }
        
        // When switching to profile tab, load profile data
        if (tab === 'profile') {
            setTimeout(() => {
                console.log('Switching to profile tab - loading profile data');
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
            console.log('Modal height adjustment skipped: missing elements');
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
                
                console.log(`Modal height adjusted (wage tab): ${finalHeight}px (dynamic)`);
            } else {
                // For all other tabs, use a constant height
                const constantHeight = 400; // Fixed height for non-wage tabs
                finalHeight = constantHeight;
                
                // Always set overflow to auto for constant height tabs
                modalContent.style.overflowY = 'auto';
                activeTabContent.style.overflowY = 'visible';
                
                console.log(`Modal height adjusted (non-wage tab): ${finalHeight}px (constant)`);
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
            console.log('Switching from custom to preset - auto-saving custom bonuses');
            await this.saveCustomBonusesSilent();
        }
        
        this.togglePresetSections();
        this.saveSettingsToSupabase();
        this.updateDisplay();
    },
    populateCustomBonusSlots() {
        const types = ['weekday', 'saturday', 'sunday'];
        console.log('populateCustomBonusSlots called with bonuses:', this.customBonuses);
        
        types.forEach(type => {
            const container = document.getElementById(`${type}BonusSlots`);
            if (!container) {
                console.error(`Container ${type}BonusSlots not found`);
                return;
            }
            
            container.innerHTML = '';
            const bonuses = (this.customBonuses && this.customBonuses[type]) || [];
            console.log(`Populating ${type} with ${bonuses.length} bonuses:`, bonuses);
            
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
                        console.log('Bonus input changed - triggering auto-save');
                        this.autoSaveCustomBonuses();
                    });
                    // Removed blur event to reduce frequent saving
                });
                
                container.appendChild(slot);
                console.log(`Added slot for ${type} with auto-save listeners:`, bonus);
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
                console.log('Bonus input changed - triggering auto-save');
                this.autoSaveCustomBonuses();
            });
            // Removed blur event to reduce frequent saving
        });
        
        container.appendChild(slot);
        console.log(`Added bonus slot for ${type} with auto-save listeners`);
        
        // Adjust modal height after adding content
        setTimeout(() => {
            this.adjustSettingsModalHeight();
        }, 50);
    },
    removeBonusSlot(button) {
        button.closest('.bonus-slot').remove();
        // Auto-save when removing bonus slots if in custom mode (silently)
        if (!this.usePreset) {
            console.log('Auto-saving after removing bonus slot');
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
                console.log('Auto-saving custom bonuses after input change');
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
                    console.log('Populating custom bonus slots in openSettings');
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
            console.log('Auto-saving custom bonuses before closing settings');
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
                currentMonth: this.currentMonth,
                pauseDeduction: this.pauseDeduction,
                demoMode: this.demoMode
            };
            localStorage.setItem('lønnsberegnerSettings', JSON.stringify(data));
            console.log('Saved to localStorage:', data);
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
    updateDisplay() {
        console.log('updateDisplay: Month', this.currentMonth, 'Shifts:', this.shifts.length, 'Demo mode:', this.demoMode);
        this.updateHeader();
        this.updateStats();
        this.updateShiftList();
    },
    updateHeader() {
        let wage = this.getCurrentWageRate();
        if (typeof wage !== 'number' || isNaN(wage)) {
            wage = 0;
        }
        document.getElementById('currentMonth').textContent = `${this.MONTHS[this.currentMonth - 1].charAt(0).toUpperCase() + this.MONTHS[this.currentMonth - 1].slice(1)} ${this.YEAR}`;
        document.getElementById('currentWage').textContent = `${wage.toFixed(2).replace('.', ',')} kr/t`;
    },
    updateStats() {
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
        document.getElementById('totalAmount').textContent = this.formatCurrency(totalBase + totalBonus);
        document.getElementById('totalHours').textContent = this.formatHours(totalHours);
        document.getElementById('baseAmount').textContent = this.formatCurrencyShort(totalBase);
        document.getElementById('bonusAmount').textContent = this.formatCurrencyShort(totalBonus);
        document.getElementById('shiftCount').textContent = monthShifts.length;
    },
    updateShiftList() {
        console.log('=== UPDATE SHIFT LIST DEBUG ===');
        console.log('Current month (1-based):', this.currentMonth);
        console.log('Filter month index (0-based):', this.currentMonth - 1);
        console.log('Filter year:', this.YEAR);
        console.log('Total shifts in this.shifts:', this.shifts.length);
        
        this.shifts.forEach((shift, index) => {
            console.log(`Shift ${index}:`, {
                id: shift.id,
                date: shift.date,
                month: shift.date.getMonth(),
                year: shift.date.getFullYear(),
                startTime: shift.startTime,
                endTime: shift.endTime,
                matchesFilter: shift.date.getMonth() === this.currentMonth - 1 && shift.date.getFullYear() === this.YEAR
            });
        });
        
        const shiftList = document.getElementById('shiftList');
        const monthShifts = this.shifts.filter(shift =>
            shift.date.getMonth() === this.currentMonth - 1 &&
            shift.date.getFullYear() === this.YEAR
        );
        
        console.log('updateShiftList: Found', monthShifts.length, 'shifts for month', this.currentMonth);
        
        let demoBannerHtml = '';
        if (this.demoMode) {
            demoBannerHtml = `
                <div style="background: linear-gradient(135deg, var(--warning), var(--accent4)); color: var(--bg-primary); padding: 12px; border-radius: 8px; margin-bottom: 16px; border: 1px solid var(--warning); text-align: center; font-weight: 500;">
                    <svg style="width: 16px; height: 16px; margin-right: 8px; vertical-align: text-top;" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    Du viser demo-data for ${this.MONTHS[this.currentMonth - 1].charAt(0).toUpperCase() + this.MONTHS[this.currentMonth - 1].slice(1)} ${this.YEAR}
                </div>
            `;
        }
        if (monthShifts.length === 0) {
            shiftList.innerHTML = `
                ${demoBannerHtml}
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
            
            return `
                <div class="shift-item ${typeClass}" data-shift-id="${shift.id}" style="cursor: pointer;">
                    <div class="shift-info">
                        <div class="shift-date">
                            <span class="shift-date-number">${day}. ${this.MONTHS[shift.date.getMonth()]}</span>
                            <span class="shift-date-separator"></span>
                            <span class="shift-date-weekday">${weekday}</span>
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
        shiftList.innerHTML = demoBannerHtml + shiftsHtml;
    },
        // Toggle breakdown card expansion and show details
    showBreakdown(type) {
        // Check if the same card is already expanded
        const existingExpanded = document.querySelector('.breakdown-card.expanded');
        const card = document.querySelector(`.breakdown-card[data-type="${type}"]`);
        
        if (existingExpanded && existingExpanded === card) {
            // If clicking the same expanded card, collapse it
            this.closeBreakdown();
            return;
        }
        
        // Close any existing breakdown first
        this.closeBreakdown();
        
        if (!card) return;
        
        // Hide header with smooth animation
        const header = document.querySelector('.header');
        if (header) {
            header.classList.add('hidden');
        }
        
        // Get original position and size before transformation
        const originalRect = card.getBoundingClientRect();
        
        // Store original styles and DOM position info more reliably
        const originalParent = card.parentElement;
        const originalNextSibling = card.nextElementSibling;
        
        card.dataset.originalPosition = JSON.stringify({
            position: card.style.position || 'static',
            top: card.style.top || 'auto',
            left: card.style.left || 'auto',
            width: card.style.width || 'auto',
            height: card.style.height || 'auto',
            transform: card.style.transform || 'none',
            parentClass: originalParent ? originalParent.className : null,
            nextSiblingDataType: originalNextSibling ? originalNextSibling.getAttribute('data-type') : null,
            cardDataType: card.getAttribute('data-type')
        });
        
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
        
        // Calculate target position (center of viewport with better mobile handling)
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Responsive sizing - more space on mobile
        const targetWidth = viewportWidth <= 480 ? 
            Math.min(viewportWidth * 0.95, 400) : 
            Math.min(viewportWidth * 0.9, 500);
            
        const targetHeight = viewportHeight <= 768 ? 
            Math.min(viewportHeight * 0.85, 600) : 
            Math.min(viewportHeight * 0.8, 600);
            
        const targetLeft = (viewportWidth - targetWidth) / 2;
        const targetTop = Math.max(20, (viewportHeight - targetHeight) / 2); // Ensure top padding
        
        // Create a placeholder element to maintain grid layout
        const placeholder = document.createElement('div');
        placeholder.className = 'breakdown-card-placeholder';
        placeholder.style.cssText = `
            width: ${originalRect.width}px;
            height: ${originalRect.height}px;
            opacity: 0;
            pointer-events: none;
        `;
        placeholder.dataset.originalCard = type;
        
        // Insert placeholder before removing the card
        originalParent.insertBefore(placeholder, card);
        
        // Move card to document.body to escape any stacking context issues
        document.body.appendChild(card);
        
        // Set card position to fixed at exact current location
        card.style.position = 'fixed';
        card.style.top = `${originalRect.top}px`;
        card.style.left = `${originalRect.left}px`;
        card.style.width = `${originalRect.width}px`;
        card.style.height = `${originalRect.height}px`;
        card.style.margin = '0';
        card.style.zIndex = '1500'; // Ensure it's above backdrop (999)
        
        // Add expanding class for initial scale effect
        card.classList.add('expanding');
        
        // After a small delay, animate to final position
        setTimeout(() => {
            card.classList.remove('expanding');
            card.classList.add('expanded');
            
            // Animate to target position and size with smoother timing
            card.style.transition = 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            card.style.top = `${targetTop}px`;
            card.style.left = `${targetLeft}px`;
            card.style.width = `${targetWidth}px`;
            card.style.height = `${targetHeight}px`;
            card.style.borderRadius = '20px';
            card.style.zIndex = '1500'; // Maintain high z-index
            
        }, 80);
        
        // Create title header (animate in immediately after modal opens)
        setTimeout(() => {
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
                animation: slideInFromBottom 0.5s var(--ease-default) 0.1s forwards;
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
                    <svg class="icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="12" y1="8" x2="12" y2="16"></line>
                        <line x1="8" y1="12" x2="16" y2="12"></line>
                    </svg>
                `;
            } else {
                icon.innerHTML = `
                    <svg class="icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
            
            // Insert title container as first child
            card.insertBefore(titleContainer, card.firstChild);
            
            // Create close button with animation
            const closeBtn = document.createElement('button');
            closeBtn.className = 'close-btn';
            closeBtn.innerHTML = '×';
            closeBtn.style.cssText = `
                opacity: 0;
                animation: scaleInDelayed 0.4s var(--ease-default) 0.2s forwards;
            `;
            closeBtn.onclick = (e) => {
                e.stopPropagation();
                this.closeBreakdown();
            };
            card.appendChild(closeBtn);
        
        // Build calendar view with animation
        const calendarContainer = document.createElement('div');
        calendarContainer.className = 'breakdown-calendar';
        calendarContainer.style.cssText = `
            opacity: 0;
            animation: slideInFromBottom 0.6s var(--ease-default) 0.3s forwards;
        `;
        card.appendChild(calendarContainer);
        
        // Create calendar for current month - start immediately
        this.createBreakdownCalendar(calendarContainer, type);
        
        }, 100); // Minimal delay to let modal start morphing
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
            const cellDate = new Date(startDate);
            cellDate.setDate(startDate.getDate() + i);
            
            const cell = document.createElement('div');
            cell.className = 'calendar-cell';
            
            // Calculate animation delay based on row and column position
            // Row by row, left to right animation - start while modal is opening
            const row = Math.floor(i / 7);
            const col = i % 7;
            const animationDelay = 0.3 + (row * 7 + col) * 0.035; // Start early while modal morphs, 35ms between each cell
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
    
    // Close breakdown card
    closeBreakdown() {
        const backdrop = document.querySelector('.backdrop-blur');
        const expandedCard = document.querySelector('.breakdown-card.expanded');
        const header = document.querySelector('.header');
        
        // Show header again
        if (header) {
            header.classList.remove('hidden');
        }
        
        // Clean up any existing placeholders
        const placeholders = document.querySelectorAll('.breakdown-card-placeholder');
        placeholders.forEach(placeholder => placeholder.remove());
        
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
        
        if (expandedCard) {
            // Remove expanded class first to stop animations
            expandedCard.classList.remove('expanded', 'expanding');
            
            // Restore original styles
            const originalData = expandedCard.dataset.originalPosition;
            if (originalData) {
                const original = JSON.parse(originalData);
                
                // Reset all positioning styles with smooth transition
                expandedCard.style.transition = 'all 0.4s var(--ease-default)';
                expandedCard.style.position = original.position;
                expandedCard.style.top = original.top;
                expandedCard.style.left = original.left;
                expandedCard.style.width = original.width;
                expandedCard.style.height = original.height;
                expandedCard.style.transform = original.transform;
                expandedCard.style.margin = '';
                expandedCard.style.zIndex = '';
                expandedCard.style.borderRadius = '';
                
                // Move card back to its original parent and remove placeholder
                const originalParent = document.querySelector('.breakdown-cards');
                const placeholder = document.querySelector(`.breakdown-card-placeholder[data-original-card="${original.cardDataType}"]`);
                
                if (originalParent) {
                    if (placeholder) {
                        // Replace placeholder with the original card
                        originalParent.insertBefore(expandedCard, placeholder);
                        placeholder.remove();
                    } else {
                        // Fallback to original positioning logic
                        const cardType = original.cardDataType;
                        if (cardType === 'base') {
                            // Base card should be first
                            originalParent.insertBefore(expandedCard, originalParent.firstChild);
                        } else if (cardType === 'bonus') {
                            // Bonus card should be second (after base)
                            const baseCard = originalParent.querySelector('[data-type="base"]');
                            if (baseCard && baseCard.nextSibling) {
                                originalParent.insertBefore(expandedCard, baseCard.nextSibling);
                            } else {
                                originalParent.appendChild(expandedCard);
                            }
                        } else {
                            // Any other cards go at the end
                            originalParent.appendChild(expandedCard);
                        }
                    }
                }
                
                // Clear transition after restoration
                setTimeout(() => {
                    expandedCard.style.transition = '';
                }, 400);
                
                delete expandedCard.dataset.originalPosition;
            }
            
            // Remove all added elements
            const closeBtn = expandedCard.querySelector('.close-btn');
            const calendar = expandedCard.querySelector('.breakdown-calendar');
            const titleContainer = expandedCard.querySelector('.breakdown-title-container');
            const title = expandedCard.querySelector('.breakdown-title'); // fallback for old structure
            if (closeBtn) closeBtn.remove();
            if (calendar) calendar.remove();
            if (titleContainer) titleContainer.remove();
            if (title) title.remove(); // fallback cleanup
            
            // Restore original content visibility
            const icon = expandedCard.querySelector('.breakdown-icon');
            const value = expandedCard.querySelector('.breakdown-value');
            const label = expandedCard.querySelector('.breakdown-label');
            if (icon) {
                icon.style.display = '';
                icon.style.opacity = '1';
            }
            if (value) {
                value.style.display = '';
                value.style.opacity = '1';
            }
            if (label) {
                label.style.display = '';
                label.style.opacity = '1';
            }
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
        
        // Add keyboard support
        const keydownHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeShiftDetails();
            }
        };
        document.addEventListener('keydown', keydownHandler);
        backdrop.dataset.keydownHandler = 'attached';
        
        // Force reflow then activate backdrop
        backdrop.offsetHeight;
        backdrop.classList.add('active');
        
        // Create shift detail card
        const detailCard = document.createElement('div');
        detailCard.className = 'shift-detail-card';
        detailCard.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0.9);
            width: min(90vw, 500px);
            max-height: 80vh;
            background: var(--bg-secondary);
            border-radius: 20px;
            padding: 24px;
            z-index: 1200;
            opacity: 0;
            box-shadow: 
                0 32px 64px var(--shadow-accent),
                0 16px 32px rgba(0, 0, 0, 0.3);
            border: 1px solid var(--shadow-accent);
            overflow-y: auto;
            transition: all 0.4s var(--ease-default);
        `;
        
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
                
                ${!this.demoMode ? `
                <div class="detail-section delete-section">
                    <button class="btn btn-danger delete-shift-btn" data-shift-index="${originalIndex}" style="gap: 8px;">
                        <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        Slett vakt
                    </button>
                </div>
                ` : ''}
            </div>
            
            <button class="close-btn close-shift-details">×</button>
        `;
        
        document.body.appendChild(detailCard);
        
        // Trigger animation after DOM insertion
        setTimeout(() => {
            detailCard.style.opacity = '1';
            detailCard.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 10);
    },
    
    // Close shift details view
    closeShiftDetails() {
        const backdrop = document.querySelector('.backdrop-blur');
        const detailCard = document.querySelector('.shift-detail-card');
        const header = document.querySelector('.header');
        
        // Show header again
        if (header) {
            header.classList.remove('hidden');
        }
        
        if (backdrop) {
            backdrop.classList.remove('active');
            setTimeout(() => backdrop.remove(), 300);
        }
        
        if (detailCard) {
            detailCard.style.animation = 'shiftDetailExit 0.3s var(--ease-default) forwards';
            setTimeout(() => detailCard.remove(), 300);
        }
        
        // Remove keyboard listener - fix: remove the actual function reference
        document.removeEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeShiftDetails();
            }
        });
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
        
        // Debug logging for bonus calculation
        console.log(`Calculating shift for ${bonusType}:`, {
            usePreset: this.usePreset,
            bonusSegments: bonusSegments,
            bonusesObject: bonuses,
            customBonuses: this.customBonuses
        });
        
        const bonus = this.calculateBonus(
            shift.startTime,
            `${Math.floor(endMinutes/60).toString().padStart(2,'0')}:${(endMinutes%60).toString().padStart(2,'0')}`,
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
        const endMinutes = this.timeToMinutes(endTime);
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
        return hours.toFixed(2).replace('.', ',') + ' t';
    },
    
    // Settings management methods
    updateWageLevel(level) {
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
        console.log('=== captureCustomBonusesFromUI called ===');
        const capturedBonuses = {};
        const types = ['weekday', 'saturday', 'sunday'];
        
        types.forEach(type => {
            capturedBonuses[type] = [];
            const container = document.getElementById(`${type}BonusSlots`);
            
            if (container) {
                const slots = container.querySelectorAll('.bonus-slot');
                console.log(`Processing ${slots.length} slots for ${type}`);
                
                slots.forEach((slot, index) => {
                    const inputs = slot.querySelectorAll('input');
                    if (inputs.length >= 3) {
                        const from = inputs[0].value;
                        const to = inputs[1].value;
                        const rate = inputs[2].value;
                        
                        console.log(`${type} slot ${index}: from=${from}, to=${to}, rate=${rate}`);
                        
                        // Capture all slots, even if partially filled (validation happens later)
                        capturedBonuses[type].push({
                            from: from,
                            to: to,
                            rate: parseFloat(rate) || 0
                        });
                    }
                });
            } else {
                console.log(`Container ${type}BonusSlots not found`);
            }
        });
        
        console.log('Captured bonuses from UI:', capturedBonuses);
        return capturedBonuses;
    },
    
    async saveCustomBonuses() {
        console.log('=== NEW saveCustomBonuses called ===');
        console.log('Current bonuses before save:', this.customBonuses);
        
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
                        console.log(`Validated bonus for ${type}:`, bonus);
                    } else {
                        console.log(`Rejected invalid bonus for ${type}:`, bonus);
                    }
                });
            }
        });
        
        // Update with validated bonuses
        this.customBonuses = validatedBonuses;
        
        console.log('Final validated bonuses to save:', this.customBonuses);
        
        // Show save status to user
        this.showSaveStatus('Lagrer tillegg...');
        
        try {
            // Save immediately to ensure we capture the latest data
            this.updateDisplay();
            await this.saveSettingsToSupabase();
            this.saveToLocalStorage(); // Also save to localStorage as backup
            
            this.showSaveStatus('Tillegg lagret ✓');
            console.log('Custom bonuses saved successfully');
            
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
            console.log('=== saveCustomBonusesSilent called ===');
            
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
            
            console.log('Silent save - custom bonuses:', this.customBonuses);
            
            // Save to both Supabase and localStorage without user feedback
            this.updateDisplay();
            await this.saveSettingsToSupabase();
            this.saveToLocalStorage();
            
            console.log('Custom bonuses saved silently');
            
        } catch (error) {
            console.error('Error in saveCustomBonusesSilent:', error);
        }
    },
    
    async deleteShift(index) {
        if (this.demoMode) return;
        
        const shift = this.shifts[index];
        if (!shift || !shift.id) return;
        
        if (!confirm('Er du sikker på at du vil slette denne vakten?')) return;
        
        try {
            const { error } = await window.supa
                .from('user_shifts')
                .delete()
                .eq('id', shift.id);
                
            if (error) {
                console.error('Error deleting shift:', error);
                alert('Kunne ikke slette vakt fra databasen');
                return;
            }
            
            // Remove from local arrays
            this.shifts.splice(index, 1);
            const userIndex = this.userShifts.findIndex(s => s.id === shift.id);
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
    
    // Debug/test function for custom bonuses
    testCustomBonuses() {
        console.log('=== Testing Custom Bonuses ===');
        console.log('Current customBonuses:', this.customBonuses);
        console.log('Current usePreset:', this.usePreset);
        
        // Test populating slots
        console.log('Testing populateCustomBonusSlots...');
        this.populateCustomBonusSlots();
        
        // Check if containers exist and have slots
        ['weekday', 'saturday', 'sunday'].forEach(type => {
            const container = document.getElementById(`${type}BonusSlots`);
            if (container) {
                const slots = container.querySelectorAll('.bonus-slot');
                console.log(`${type}: ${slots.length} slots found`);
                slots.forEach((slot, index) => {
                    const inputs = slot.querySelectorAll('input');
                    console.log(`  Slot ${index}:`, {
                        from: inputs[0].value,
                        to: inputs[1].value,
                        rate: inputs[2].value
                    });
                });
            } else {
                console.log(`${type}: container not found`);
            }
        });
        
        // Test saving
        console.log('Testing saveCustomBonuses...');
        this.saveCustomBonuses();
    },
    // Debug function to inspect current bonus slots in DOM
    debugBonusSlots() {
        console.log('=== CURRENT DOM BONUS SLOTS STATE ===');
        const types = ['weekday', 'saturday', 'sunday'];
        
        types.forEach(type => {
            const container = document.getElementById(`${type}BonusSlots`);
            if (!container) {
                console.log(`${type}: container not found`);
                return;
            }
            
            const slots = container.querySelectorAll('.bonus-slot');
            console.log(`${type}: ${slots.length} slots found`);
            
            slots.forEach((slot, index) => {
                const inputs = slot.querySelectorAll('input');
                if (inputs.length >= 3) {
                    console.log(`  ${type} slot ${index}:`, {
                        from: inputs[0].value,
                        to: inputs[1].value,
                        rate: inputs[2].value
                    });
                }
            });
        });
        
        console.log('Current app.customBonuses:', this.customBonuses);
    },

    // Test the complete save workflow
    async testCompleteSaveWorkflow() {
        console.log('=== TESTING COMPLETE SAVE WORKFLOW ===');
        
        // Step 1: Add some test data to DOM
        console.log('Step 1: Adding test data to DOM slots');
        const weekdayContainer = document.getElementById('weekdayBonusSlots');
        if (weekdayContainer) {
            // Clear and add test slot
            weekdayContainer.innerHTML = '';
            const slot = document.createElement('div');
            slot.className = 'bonus-slot';
            slot.innerHTML = `
                <input type="time" class="form-control" value="18:00">
                <input type="time" class="form-control" value="22:00">
                <input type="number" class="form-control" placeholder="kr/t" value="25">
                <button class="btn btn-icon btn-danger remove-bonus">×</button>
            `;
            weekdayContainer.appendChild(slot);
            console.log('Added test slot to weekday container');
        }
        
        // Step 2: Debug current DOM state
        console.log('Step 2: Current DOM state');
        this.debugBonusSlots();
        
        // Step 3: Call saveCustomBonuses and see what it captures
        console.log('Step 3: Calling saveCustomBonuses');
        await this.saveCustomBonuses();
        
        // Step 4: Check what's in app.customBonuses after save
        console.log('Step 4: app.customBonuses after save:', this.customBonuses);
        
        // Step 5: Try to save to database
        console.log('Step 5: Saving to database');
        await this.saveSettingsToSupabase();
        
        // Step 6: Simulate page reload
        console.log('Step 6: Simulating page reload');
        this.customBonuses = {}; // Clear current bonuses
        await this.loadFromSupabase();
        
        // Step 7: Check if data is reloaded correctly
        console.log('Step 7: Data after reload:', this.customBonuses);
    },

    // Test individual save function
    async testSaveCustomBonusesOnly() {
        console.log('=== TESTING saveCustomBonuses FUNCTION ONLY ===');
        
        // First add a test slot manually
        const weekdayContainer = document.getElementById('weekdayBonusSlots');
        if (weekdayContainer) {
            weekdayContainer.innerHTML = '';
            const slot = document.createElement('div');
            slot.className = 'bonus-slot';
            slot.innerHTML = `
                <input type="time" class="form-control" value="19:00">
                <input type="time" class="form-control" value="23:00">
                <input type="number" class="form-control" placeholder="kr/t" value="30">
                <button class="btn btn-icon btn-danger remove-bonus">×</button>
            `;
            weekdayContainer.appendChild(slot);
        }
        
        console.log('Before saveCustomBonuses - DOM state:');
        this.debugBonusSlots();
        
        console.log('Before saveCustomBonuses - app.customBonuses:', this.customBonuses);
        
        await this.saveCustomBonuses();
        
        console.log('After saveCustomBonuses - app.customBonuses:', this.customBonuses);
    },

    async testDatabaseSave() {
        console.log('=== TESTING DATABASE SAVE ===');
        
        // Set some test data
        this.customBonuses = {
            weekday: [{ from: "18:00", to: "22:00", rate: 25 }],
            saturday: [{ from: "08:00", to: "16:00", rate: 30 }],
            sunday: []
        };
        
        console.log('Setting test custom bonuses:', this.customBonuses);
        
        // Try to save
        await this.saveSettingsToSupabase();
        
        // Then try to load back
        setTimeout(async () => {
            console.log('Loading back from database...');
            await this.loadFromSupabase();
            console.log('Loaded custom bonuses:', this.customBonuses);
        }, 1000);
    },

    // Test the entire workflow step by step
    async debugSaveWorkflow() {
        console.log('=== DEBUGGING SAVE WORKFLOW STEP BY STEP ===');
        
        // Step 1: Clear and set up test data in DOM
        console.log('Step 1: Setting up test data in DOM');
        const weekdayContainer = document.getElementById('weekdayBonusSlots');
        if (weekdayContainer) {
            weekdayContainer.innerHTML = '';
            const slot = document.createElement('div');
            slot.className = 'bonus-slot';
            slot.innerHTML = `
                <input type="time" class="form-control" value="18:00">
                <input type="time" class="form-control" value="22:00">  
                <input type="number" class="form-control" placeholder="kr/t" value="25">
                <button class="btn btn-icon btn-danger remove-bonus">×</button>
            `;
            weekdayContainer.appendChild(slot);
            console.log('Added test slot to weekday container');
        }
        
        // Step 2: Check DOM state
        console.log('Step 2: Current DOM state');
        this.debugBonusSlots();
        
        // Step 3: Process DOM with saveCustomBonuses 
        console.log('Step 3: Processing DOM with saveCustomBonuses');
        // Call only the parsing part, not the save part
        const types = ['weekday', 'saturday', 'sunday'];
        const testBonuses = {};
        
        types.forEach(type => {
            const container = document.getElementById(`${type}BonusSlots`);
            if (container) {
                const slots = container.querySelectorAll('.bonus-slot');
                testBonuses[type] = [];
                console.log(`Processing ${slots.length} slots for ${type}`);
                
                slots.forEach((slot, index) => {
                    const inputs = slot.querySelectorAll('input');
                    if (inputs.length >= 3) {
                        const from = inputs[0].value;
                        const to = inputs[1].value;
                        const rate = parseFloat(inputs[2].value);
                        
                        if (from && to && rate && !isNaN(rate)) {
                            testBonuses[type].push({ from, to, rate });
                            console.log(`Captured bonus for ${type}:`, { from, to, rate });
                        }
                    }
                });
            } else {
                testBonuses[type] = [];
            }
        });
        
        console.log('Step 4: Parsed bonuses from DOM:', testBonuses);
        
        // Step 5: Save to app state
        this.customBonuses = testBonuses;
        console.log('Step 5: Updated app.customBonuses:', this.customBonuses);
        
        // Step 6: Save to database manually
        console.log('Step 6: Saving to database');
        await this.saveSettingsToSupabase();
        
        // Step 7: Wait and reload
        console.log('Step 7: Waiting 2 seconds then reloading from database');
        setTimeout(async () => {
            await this.loadFromSupabase();
            console.log('Step 8: Reloaded from database:', this.customBonuses);
        }, 2000);
    },

    async simpleDbTest() {
        console.log('=== SIMPLE DATABASE TEST ===');
        
        // Set a very simple test bonus
        const testBonuses = {
            weekday: [{ from: "18:00", to: "22:00", rate: 25 }],
            saturday: [],
            sunday: []
        };
        
        console.log('1. Setting test bonuses:', testBonuses);
        this.customBonuses = testBonuses;
        
        console.log('2. Calling saveSettingsToSupabase...');
        await this.saveSettingsToSupabase();
        
        console.log('3. Clearing local bonuses...');
        this.customBonuses = {};
        
        console.log('4. Loading from database...');
        await this.loadFromSupabase();
        
        console.log('5. Final result from database:', this.customBonuses);
        
        if (this.customBonuses.weekday && this.customBonuses.weekday.length > 0) {
            console.log('✅ SUCCESS: Database save/load working!');
        } else {
            console.log('❌ FAILED: Custom bonuses not working');
        }
    },

    // Quick test for the fix
    async quickDbTest() {
        console.log('=== QUICK DATABASE TEST ===');
        console.log('Before test - current customBonuses:', this.customBonuses);
        
        // Test 1: Empty object
        console.log('Test 1: Saving empty object {}');
        this.customBonuses = {};
        await this.saveSettingsToSupabase();
        
        // Test 2: Object with empty arrays
        console.log('Test 2: Saving object with empty arrays');
        this.customBonuses = { weekday: [], saturday: [], sunday: [] };
        await this.saveSettingsToSupabase();
        
        // Test 3: Object with actual data
        console.log('Test 3: Saving object with real data');
        this.customBonuses = {
            weekday: [{ from: "18:00", to: "22:00", rate: 25 }],
            saturday: [],
            sunday: []
        };
        await this.saveSettingsToSupabase();
        
        // Now try to load back
        console.log('Loading back from database...');
        setTimeout(async () => {
            this.customBonuses = {}; // Clear first
            await this.loadFromSupabase();
            console.log('Final loaded result:', this.customBonuses);
            
            if (this.customBonuses.weekday && this.customBonuses.weekday.length > 0) {
                console.log('✅ SUCCESS: Custom bonuses are being saved and loaded!');
            } else {
                console.log('❌ FAILED: Custom bonuses still not working');
                console.log('Expected: weekday array with 1 item');
                console.log('Actual:', this.customBonuses);
            }
        }, 1500);
    },

    setCustomMode() {
        console.log('Switching to custom mode for testing');
        this.usePreset = false;
        document.getElementById('usePresetToggle').checked = false;
        this.togglePresetSections();
    },

    // Test the actual user workflow
    async testUserWorkflow() {
        console.log('=== TESTING ACTUAL USER WORKFLOW ===');
        
        // Step 1: Switch to custom mode
        console.log('Step 1: Switching to custom mode');
        this.usePreset = false;
        document.getElementById('usePresetToggle').checked = false;
        this.togglePresetSections();
        
        // Wait for DOM to be ready
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Step 2: Add some bonuses via DOM (simulate user input)
        console.log('Step 2: Adding bonuses via DOM (simulating user input)');
        
        // Add weekday bonus
        const weekdayContainer = document.getElementById('weekdayBonusSlots');
        if (weekdayContainer) {
            // Clear first
            weekdayContainer.innerHTML = '';
            
            // Add two weekday bonuses
            this.addBonusSlot('weekday');
            this.addBonusSlot('weekday');
            
            // Fill in the values
            const slots = weekdayContainer.querySelectorAll('.bonus-slot');
            if (slots.length >= 2) {
                // First bonus: 18:00-22:00, 25kr
                slots[0].querySelectorAll('input')[0].value = '18:00';
                slots[0].querySelectorAll('input')[1].value = '22:00';
                slots[0].querySelectorAll('input')[2].value = '25';
                
                // Second bonus: 22:00-24:00, 40kr
                slots[1].querySelectorAll('input')[0].value = '22:00';
                slots[1].querySelectorAll('input')[1].value = '23:59';
                slots[1].querySelectorAll('input')[2].value = '40';
                
                console.log('Added 2 weekday bonuses to DOM');
            }
        }
        
        // Add saturday bonus
        this.addBonusSlot('saturday');
        const saturdayContainer = document.getElementById('saturdayBonusSlots');
        if (saturdayContainer) {
            const slots = saturdayContainer.querySelectorAll('.bonus-slot');
            if (slots.length >= 1) {
                slots[0].querySelectorAll('input')[0].value = '08:00';
                slots[0].querySelectorAll('input')[1].value = '16:00';
                slots[0].querySelectorAll('input')[2].value = '50';
                console.log('Added 1 saturday bonus to DOM');
            }
        }
        
        // Step 3: Check DOM state
        console.log('Step 3: Checking DOM state after adding bonuses');
        this.debugBonusSlots();
        
        // Step 4: Call saveCustomBonuses (this is what "Lagre tillegg" button does)
        console.log('Step 4: Calling saveCustomBonuses (simulating "Lagre tillegg" button click)');
        await this.saveCustomBonuses();
        
        // Step 5: Check what was saved
        console.log('Step 5: Checking what was saved to app.customBonuses:', this.customBonuses);
        
        // Step 6: Simulate page refresh by clearing and reloading
        console.log('Step 6: Simulating page refresh - clearing and reloading from database');
        this.customBonuses = {}; // Clear
        await this.loadFromSupabase();
        
        console.log('Step 7: Final result after "page refresh":', this.customBonuses);
        
        // Check results
        const weekdayCount = this.customBonuses.weekday ? this.customBonuses.weekday.length : 0;
        const saturdayCount = this.customBonuses.saturday ? this.customBonuses.saturday.length : 0;
        
        if (weekdayCount === 2 && saturdayCount === 1) {
            console.log('✅ SUCCESS: User workflow is working correctly!');
        } else {
            console.log('❌ FAILED: User workflow not working');
            console.log(`Expected: weekday=2, saturday=1`);
            console.log(`Actual: weekday=${weekdayCount}, saturday=${saturdayCount}`);
        }
    },

    // Test function to verify auto-save functionality
    async testAutoSave() {
        console.log('=== TESTING AUTO-SAVE FUNCTIONALITY ===');
        
        // Step 1: Switch to custom mode
        console.log('Step 1: Switching to custom mode');
        document.getElementById('usePresetToggle').checked = false;
        await this.togglePreset();
        
        // Step 2: Add a bonus slot
        console.log('Step 2: Adding bonus slot');
        this.addBonusSlot('weekday');
        
        // Step 3: Fill in the bonus data
        console.log('Step 3: Filling bonus data');
        const container = document.getElementById('weekdayBonusSlots');
        const slots = container.querySelectorAll('.bonus-slot');
        const lastSlot = slots[slots.length - 1];
        const inputs = lastSlot.querySelectorAll('input');
        
        inputs[0].value = '16:00';
        inputs[1].value = '20:00';
        inputs[2].value = '30';
        
        // Trigger change events
        inputs.forEach(input => {
            input.dispatchEvent(new Event('change'));
        });
        
        console.log('Auto-save should trigger in 2 seconds...');
        
        // Wait for auto-save to complete
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('Step 4: Checking saved bonuses');
        console.log('Current custom bonuses:', this.customBonuses);
        
        // Step 5: Test closing modal auto-save
        console.log('Step 5: Testing modal close auto-save');
        await this.closeSettings();
        
        console.log('Auto-save test completed!');
    },

    // Test function to verify simplified settings modal works correctly
    testSettingsModal() {
        console.log('=== TESTING SIMPLIFIED SETTINGS MODAL ===');
        
        console.log('Step 1: Opening settings modal');
        this.openSettings();
        
        setTimeout(() => {
            const modal = document.getElementById('settingsModal');
            const isVisible = modal && modal.style.display === 'flex';
            
            if (isVisible) {
                console.log('✅ Modal opened successfully');
                
                console.log('Step 2: Testing tab switching');
                this.switchSettingsTabSync('bonuses');
                
                setTimeout(() => {
                    console.log('Step 3: Closing settings modal');
                    this.closeSettings();
                    
                    setTimeout(() => {
                        const isClosed = modal && modal.style.display === 'none';
                        if (isClosed) {
                            console.log('✅ Modal closed successfully');
                            console.log('✅ Settings modal test completed successfully!');
                        } else {
                            console.log('❌ Modal did not close properly');
                        }
                    }, 100);
                }, 100);
            } else {
                console.log('❌ Modal did not open properly');
            }
        }, 100);
    },
    // === DEBUG FUNCTIONS FOR TROUBLESHOOTING ===
    
    // Test basic database connectivity
    async testDatabaseConnection() {
        console.log('=== TESTING DATABASE CONNECTION ===');
        
        try {
            const { data: { user } } = await window.supa.auth.getUser();
            console.log('Current user:', user?.email);
            
            if (!user) {
                console.error('❌ No user found');
                return false;
            }
            
            // Test basic select operation
            console.log('Testing basic select operation...');
            const { data: shifts, error: selectError } = await window.supa
                .from('user_shifts')
                .select('*')
                .eq('user_id', user.id)
                .limit(1);
                
            console.log('Select result:', { shifts, selectError });
            
            if (selectError) {
                console.error('❌ Select operation failed:', selectError);
                return false;
            }
            
            console.log('✅ Database connection working');
            return true;
            
        } catch (e) {
            console.error('❌ Database connection test failed:', e);
            return false;
        }
    },
    
    // Test database access and permissions
    async testDatabaseAccess() {
        console.log('=== TESTING DATABASE ACCESS AND PERMISSIONS ===');
        
        const { data: { user } } = await window.supa.auth.getUser();
        console.log('Current user:', user?.email);
        
        if (!user) {
            console.error('❌ No user found');
            return;
        }
        
        // Test 1: Select existing shifts
        console.log('Test 1: Selecting existing shifts...');
        const { data: existingShifts, error: selectError } = await window.supa
            .from('user_shifts')
            .select('*')
            .eq('user_id', user.id);
            
        console.log('Existing shifts:', { existingShifts, selectError });
        
        // Test 2: Try inserting a test shift
        console.log('Test 2: Attempting test insert...');
        const testShift = {
            user_id: user.id,
            shift_date: '2025-01-20',
            start_time: '10:00',
            end_time: '18:00',
            shift_type: 0
        };
        
        const { data: insertData, error: insertError } = await window.supa
            .from('user_shifts')
            .insert(testShift)
            .select()
            .single();
            
        console.log('Insert test result:', { insertData, insertError });
        
        if (insertError) {
            console.error('❌ Insert failed. Error details:', {
                code: insertError.code,
                message: insertError.message,
                details: insertError.details,
                hint: insertError.hint
            });
            
            // Check if it's a permissions issue
            if (insertError.code === '42501' || insertError.message?.includes('permission') || insertError.message?.includes('policy')) {
                console.error('🚫 This appears to be a Row Level Security (RLS) permissions issue');
                console.error('The user may not have permission to insert data');
            }
        } else {
            console.log('✅ Insert successful, cleaning up test data...');
            // Clean up test data
            if (insertData?.id) {
                await window.supa
                    .from('user_shifts')
                    .delete()
                    .eq('id', insertData.id);
                console.log('✅ Test data cleaned up');
            }
        }
        
        // Test 3: Check user session validity
        console.log('Test 3: Checking session validity...');
        const { data: session, error: sessionError } = await window.supa.auth.getSession();
        console.log('Session check:', { 
            hasSession: !!session.session, 
            sessionError,
            accessToken: session.session?.access_token ? 'Present' : 'Missing',
            refreshToken: session.session?.refresh_token ? 'Present' : 'Missing'
        });
    },
    
    // Test network connectivity to Supabase
    async testNetworkConnection() {
        console.log('=== TESTING NETWORK CONNECTION ===');
        
        try {
            // Test if we can reach Supabase at all
            const response = await fetch(window.supa.supabaseUrl + '/rest/v1/', {
                method: 'HEAD',
                headers: {
                    'apikey': window.supa.supabaseKey
                }
            });
            
            console.log('Network test response:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok
            });
            
            if (response.ok) {
                console.log('✅ Network connection to Supabase is working');
                return true;
            } else {
                console.error('❌ Network connection issue. Status:', response.status);
                return false;
            }
            
        } catch (e) {
            console.error('❌ Network connection failed:', e);
            return false;
        }
    },
    
    // Comprehensive diagnostic function
    async runCompleteDiagnostic() {
        console.log('🔍 RUNNING COMPLETE DIAGNOSTIC FOR SHIFT ADDITION PROBLEMS');
        console.log('================================================');
        
        // Step 1: Test network
        console.log('Step 1: Testing network connection...');
        const networkOk = await this.testNetworkConnection();
        
        // Step 2: Test database connection
        console.log('Step 2: Testing database connection...');
        const dbConnectionOk = await this.testDatabaseConnection();
        
        // Step 3: Test database access and permissions
        console.log('Step 3: Testing database access and permissions...');
        await this.testDatabaseAccess();
        
        // Step 4: Check form state
        console.log('Step 4: Checking form state...');
        const startHour = document.getElementById('startHour')?.value;
        const endHour = document.getElementById('endHour')?.value;
        const selectedDate = this.selectedDate;
        
        console.log('Form state:', {
            selectedDate,
            startHour,
            endHour,
            demoMode: this.demoMode
        });
        
        // Step 5: Summary
        console.log('================================================');
        console.log('DIAGNOSTIC SUMMARY:');
        console.log('Network:', networkOk ? '✅ OK' : '❌ FAILED');
        console.log('Database Connection:', dbConnectionOk ? '✅ OK' : '❌ FAILED');
        console.log('Form has required data:', (selectedDate && startHour && endHour) ? '✅ OK' : '❌ MISSING');
        console.log('Demo mode:', this.demoMode ? '⚠️ ACTIVE (may prevent saves)' : '✅ DISABLED');
        
        if (!networkOk) {
            console.log('🔧 RECOMMENDATION: Check internet connection and Supabase service status');
        }
        if (!dbConnectionOk) {
            console.log('🔧 RECOMMENDATION: Check Supabase configuration and API keys');
        }
    },

    // === END DEBUG FUNCTIONS ===
}
