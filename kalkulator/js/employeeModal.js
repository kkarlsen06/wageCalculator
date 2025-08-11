/**
 * Employee Settings Modal Component
 * Modal for creating and editing employees
 * Following PLACEHOLDER_EMPLOYEES_V1 ruleset
 */

export class EmployeeModal {
    constructor(app) {
        this.app = app;
        this.isVisible = false;
        this.mode = 'create'; // 'create' or 'edit'
        this.currentEmployee = null;
        this.originalData = null;
        this.isSubmitting = false;
        this.validationErrors = {};

        // Form state
        this.formData = {
            name: '',
            email: '',
            hourly_wage: '',
            tariff_level: 0,
            birth_date: '',
            display_color: '#6366f1'
        };

        // Bind methods
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handleCancel = this.handleCancel.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleClickOutside = this.handleClickOutside.bind(this);
        this.handleFieldChange = this.handleFieldChange.bind(this);
    }

    /**
     * Get initial form defaults used by resetForm
     */
    getInitialFormDefaults() {
        return {
            name: '',
            email: '',
            hourly_wage: '',
            tariff_level: 0,
            birth_date: '',
            display_color: '#6366f1'
        };
    }

    /**
     * Normalize employee name so each word is capitalized.
     * Handles spaces, hyphens and apostrophes (e.g., "anne-marie o'neill" -> "Anne-Marie O'Neill").
     */
    normalizeEmployeeName(rawName) {
        const input = (rawName ?? '').toString().trim().replace(/\s+/g, ' ');
        if (!input) return '';
        const cap = (s) => (s && s.length > 0)
            ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
            : '';
        return input
            .split(' ')
            .map(word => word
                .split('-')
                .map(part => part
                    .split("'")
                    .map(cap)
                    .join("'"))
                .join('-'))
            .join(' ');
    }

    /**
     * Dynamically load employeeService, with test-friendly fallback
     */
    async loadEmployeeService() {
        try {
            // Allow dev-tests to inject a mock via global.import
            if (typeof global !== 'undefined' && typeof global.import === 'function') {
                return await global.import('./employeeService.js');
            }
        } catch (_) { /* fall through to native import */ }
        return await import('./employeeService.js');
    }

    /**
     * Show modal for creating a new employee
     */
    async showCreate() {
        this.mode = 'create';
        this.currentEmployee = null;
        this.resetForm();
        await this.show();
    }

    /**
     * Show modal for editing an existing employee
     * @param {Object} employee - Employee object to edit
     */
    async showEdit(employee) {
        this.mode = 'edit';
        this.currentEmployee = employee;
        this.originalData = { ...employee };
        await this.populateForm(employee);
        await this.show();
    }

    /**
     * Show the modal
     */
    async show() {
        try {
            this.createModal();
            this.attachEventListeners();
            this.isVisible = true;

            // Focus first input
            setTimeout(() => {
                const firstInput = this.modal.querySelector('input[name="name"]');
                if (firstInput) {
                    firstInput.focus();
                }
            }, 100);

        } catch (error) {
            console.error('Error showing employee modal:', error);
        }
    }

    /**
     * Hide the modal
     */
    hide() {
        if (!this.isVisible) return;

        this.removeEventListeners();

        if (this.modal) {
            this.modal.classList.remove('active');
            setTimeout(() => {
                if (this.modal && this.modal.parentNode) {
                    this.modal.remove();
                }
                this.modal = null;
            }, 300);
        }

        this.isVisible = false;
        this.resetForm();
    }

    /**
     * Create the modal DOM structure
     */
    createModal() {
        // Remove existing modal if any
        const existingModal = document.getElementById('employeeModal');
        if (existingModal) {
            existingModal.remove();
        }

        this.modal = document.createElement('div');
        this.modal.id = 'employeeModal';
        this.modal.className = 'modal';
        this.modal.innerHTML = this.getModalHTML();

        document.body.appendChild(this.modal);

        // Trigger animation
        setTimeout(() => {
            this.modal.classList.add('active');
        }, 10);
    }

    /**
     * Get the modal HTML structure
     */
    getModalHTML() {
        const title = this.mode === 'create' ? 'Legg til ansatt' : 'Rediger ansatt';
        const submitText = this.mode === 'create' ? 'Legg til ansatt' : 'Lagre endringer';
        const rates = this.app?.PRESET_WAGE_RATES || {};
        const fmt = (n) => typeof n === 'number' ? n.toFixed(2).replace('.', ',') : '';

        // Avatars disabled: we only show initials for employees
        const showAvatarSection = false;

        return `
            <div class="modal-content employee-modal-content">
                <div class="modal-header">
                    <div class="modal-header-content">
                        <h2>${title}</h2>
                        <p class="modal-subtitle">Fyll inn informasjonen under for å ${this.mode === 'create' ? 'legge til en ny ansatt' : 'oppdatere ansattinformasjonen'}</p>
                    </div>
                    <button type="button" class="modal-close-btn" aria-label="Lukk">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <form class="employee-form" id="employeeForm" novalidate>
                    <div class="form-sections">
                        <!-- Step indicators -->
                        <div class="form-progress">
                            <div class="progress-step active" data-step="1">
                                <div class="step-number">1</div>
                                <div class="step-label">Informasjon</div>
                            </div>
                            <div class="progress-line"></div>
                            <div class="progress-step" data-step="2">
                                <div class="step-number">2</div>
                                <div class="step-label">Lønn</div>
                            </div>
                            <div class="progress-line"></div>
                            <div class="progress-step" data-step="3">
                                <div class="step-number">3</div>
                                <div class="step-label">Tilpasning</div>
                            </div>
                        </div>

                        <!-- Basic Information Section -->
                        <div class="form-section active" data-section="1">
                            <div class="section-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                            </div>
                            
                            <div class="form-fields">
                                <div class="form-group">
                                    <label for="employeeName" class="form-label">
                                        <span class="label-text">Fullt navn</span>
                                        <span class="required-badge">Påkrevd</span>
                                    </label>
                                    <div class="input-wrapper">
                                        <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                            <circle cx="12" cy="7" r="4"></circle>
                                        </svg>
                                        <input
                                            type="text"
                                            id="employeeName"
                                            name="name"
                                            class="form-input with-icon"
                                            required
                                            autocomplete="name"
                                            placeholder="F.eks. Ola Nordmann"
                                            aria-describedby="nameError">
                                    </div>
                                    <div class="form-error" id="nameError" role="alert"></div>
                                </div>

                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="employeeEmail" class="form-label">
                                            <span class="label-text">E-postadresse</span>
                                            <span class="optional-badge">Valgfritt</span>
                                        </label>
                                        <div class="input-wrapper">
                                            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                                                <path d="m22 7-10 5L2 7"></path>
                                            </svg>
                                            <input
                                                type="email"
                                                id="employeeEmail"
                                                name="email"
                                                class="form-input with-icon"
                                                autocomplete="email"
                                                placeholder="ola@bedrift.no"
                                                aria-describedby="emailError">
                                        </div>
                                        <div class="form-error" id="emailError" role="alert"></div>
                                    </div>

                                    <div class="form-group">
                                        <label for="employeeBirthDate" class="form-label">
                                            <span class="label-text">Fødselsdato</span>
                                            <span class="optional-badge">Valgfritt</span>
                                        </label>
                                        <div class="date-selector-group">
                                            <select id="birthDaySelect" class="form-input date-select" aria-label="Dag">
                                                <option value="">Dag</option>
                                            </select>
                                            <select id="birthMonthSelect" class="form-input date-select" aria-label="Måned">
                                                <option value="">Måned</option>
                                                <option value="01">Januar</option>
                                                <option value="02">Februar</option>
                                                <option value="03">Mars</option>
                                                <option value="04">April</option>
                                                <option value="05">Mai</option>
                                                <option value="06">Juni</option>
                                                <option value="07">Juli</option>
                                                <option value="08">August</option>
                                                <option value="09">September</option>
                                                <option value="10">Oktober</option>
                                                <option value="11">November</option>
                                                <option value="12">Desember</option>
                                            </select>
                                            <select id="birthYearSelect" class="form-input date-select" aria-label="År">
                                                <option value="">År</option>
                                            </select>
                                        </div>
                                        <input
                                            type="hidden"
                                            id="employeeBirthDate"
                                            name="birth_date"
                                            aria-describedby="birthDateError">
                                        <div class="form-error" id="birthDateError" role="alert"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Wage Information Section -->
                        <div class="form-section" data-section="2" style="display: none;">
                            <div class="section-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="12" y1="1" x2="12" y2="23"></line>
                                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                                </svg>
                            </div>

                            <div class="form-fields">
                                <div class="form-group">
                                    <label for="employeeTariff" class="form-label">
                                        <span class="label-text">Velg lønnstrinn</span>
                                        <span class="required-badge">Påkrevd</span>
                                    </label>
                                    <div class="tariff-grid">
                                        <label class="tariff-option">
                                            <input type="radio" name="tariff_radio" value="0" ${this.formData.tariff_level == 0 ? 'checked' : ''}>
                                            <div class="tariff-card">
                                                <span class="tariff-name">Egendefinert</span>
                                                <span class="tariff-rate">Angi selv</span>
                                            </div>
                                        </label>
                                        <label class="tariff-option">
                                            <input type="radio" name="tariff_radio" value="-2" ${this.formData.tariff_level == -2 ? 'checked' : ''}>
                                            <div class="tariff-card">
                                                <span class="tariff-name">Under 18 år</span>
                                                <span class="tariff-rate">${fmt(rates['-2'])} kr/t</span>
                                            </div>
                                        </label>
                                        <label class="tariff-option">
                                            <input type="radio" name="tariff_radio" value="-1" ${this.formData.tariff_level == -1 ? 'checked' : ''}>
                                            <div class="tariff-card">
                                                <span class="tariff-name">Under 16 år</span>
                                                <span class="tariff-rate">${fmt(rates['-1'])} kr/t</span>
                                            </div>
                                        </label>
                                        <label class="tariff-option">
                                            <input type="radio" name="tariff_radio" value="1" ${this.formData.tariff_level == 1 ? 'checked' : ''}>
                                            <div class="tariff-card">
                                                <span class="tariff-name">Trinn 1</span>
                                                <span class="tariff-rate">${fmt(rates[1])} kr/t</span>
                                            </div>
                                        </label>
                                        <label class="tariff-option">
                                            <input type="radio" name="tariff_radio" value="2" ${this.formData.tariff_level == 2 ? 'checked' : ''}>
                                            <div class="tariff-card">
                                                <span class="tariff-name">Trinn 2</span>
                                                <span class="tariff-rate">${fmt(rates[2])} kr/t</span>
                                            </div>
                                        </label>
                                        <label class="tariff-option">
                                            <input type="radio" name="tariff_radio" value="3" ${this.formData.tariff_level == 3 ? 'checked' : ''}>
                                            <div class="tariff-card">
                                                <span class="tariff-name">Trinn 3</span>
                                                <span class="tariff-rate">${fmt(rates[3])} kr/t</span>
                                            </div>
                                        </label>
                                        <label class="tariff-option">
                                            <input type="radio" name="tariff_radio" value="4" ${this.formData.tariff_level == 4 ? 'checked' : ''}>
                                            <div class="tariff-card">
                                                <span class="tariff-name">Trinn 4</span>
                                                <span class="tariff-rate">${fmt(rates[4])} kr/t</span>
                                            </div>
                                        </label>
                                        <label class="tariff-option">
                                            <input type="radio" name="tariff_radio" value="5" ${this.formData.tariff_level == 5 ? 'checked' : ''}>
                                            <div class="tariff-card">
                                                <span class="tariff-name">Trinn 5</span>
                                                <span class="tariff-rate">${fmt(rates[5])} kr/t</span>
                                            </div>
                                        </label>
                                        <label class="tariff-option">
                                            <input type="radio" name="tariff_radio" value="6" ${this.formData.tariff_level == 6 ? 'checked' : ''}>
                                            <div class="tariff-card">
                                                <span class="tariff-name">Trinn 6</span>
                                                <span class="tariff-rate">${fmt(rates[6])} kr/t</span>
                                            </div>
                                        </label>
                                    </div>
                                    <!-- Hidden select for form submission -->
                                    <select id="employeeTariff" name="tariff_level" class="form-input" style="display: none;" aria-describedby="tariffError">
                                        <option value="0">Egendefinert</option>
                                        <option value="-2">Under 18 år</option>
                                        <option value="-1">Under 16 år</option>
                                        <option value="1">Trinn 1</option>
                                        <option value="2">Trinn 2</option>
                                        <option value="3">Trinn 3</option>
                                        <option value="4">Trinn 4</option>
                                        <option value="5">Trinn 5</option>
                                        <option value="6">Trinn 6</option>
                                    </select>
                                    <div class="form-error" id="tariffError" role="alert"></div>
                                </div>

                                <div class="form-group custom-wage-group" id="customWageSection" style="display: none;">
                                    <label for="employeeWage" class="form-label">
                                        <span class="label-text">Angi timelønn</span>
                                    </label>
                                    <div class="input-wrapper">
                                        <span class="input-prefix">kr</span>
                                        <input
                                            type="number"
                                            id="employeeWage"
                                            name="hourly_wage"
                                            class="form-input with-prefix"
                                            min="0"
                                            step="0.01"
                                            placeholder="250.00"
                                            aria-describedby="wageError">
                                        <span class="input-suffix">/time</span>
                                    </div>
                                    <div class="form-error" id="wageError" role="alert"></div>
                                </div>

                                <div class="wage-info-card">
                                    <div class="wage-info-icon">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <line x1="12" y1="16" x2="12" y2="12"></line>
                                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                        </svg>
                                    </div>
                                    <div class="wage-info-content">
                                        <p>Kveld- og helgetillegg beregnes automatisk basert på tariff, selv med egendefinert timelønn.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Appearance Section -->
                        <div class="form-section" data-section="3" style="display: none;">
                            <div class="section-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="3"></circle>
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="2" x2="12" y2="4"></line>
                                    <line x1="12" y1="20" x2="12" y2="22"></line>
                                    <line x1="2" y1="12" x2="4" y2="12"></line>
                                    <line x1="20" y1="12" x2="22" y2="12"></line>
                                </svg>
                            </div>

                            <div class="form-fields">
                                <div class="form-group">
                                    <label class="form-label">
                                        <span class="label-text">Velg en farge for den ansatte</span>
                                    </label>
                                    <input
                                        type="color"
                                        id="employeeColor"
                                        name="display_color"
                                        class="color-input-hidden"
                                        value="#6366f1"
                                        aria-describedby="colorHint">
                                    <div class="color-grid" id="colorPresets">
                                        <!-- Color presets will be populated here -->
                                    </div>
                                    <p class="form-hint centered" id="colorHint">Denne fargen brukes til å identifisere den ansatte i kalenderen</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="modal-footer">
                        <div class="footer-left">
                            <button type="button" class="btn btn-ghost nav-btn prev-btn" style="display: none;">
                                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="15 18 9 12 15 6"></polyline>
                                </svg>
                                Forrige
                            </button>
                        </div>
                        <div class="footer-right">
                            <button type="button" class="btn btn-secondary cancel-btn">
                                Avbryt
                            </button>
                            <button type="button" class="btn btn-primary nav-btn next-btn">
                                Neste
                                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="9 18 15 12 9 6"></polyline>
                                </svg>
                            </button>
                            <button type="submit" class="btn btn-primary submit-btn" style="display: none;">
                                <span class="btn-text">
                                    ${submitText}
                                </span>
                                <span class="btn-loading" style="display: none;">
                                    <svg class="loading-spinner" viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="31.416" stroke-dashoffset="31.416">
                                            <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                                            <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
                                        </circle>
                                    </svg>
                                    Lagrer...
                                </span>
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        `;
    }

    /**
     * Reset form to initial state
     */
    resetForm() {
        this.formData = {
            name: '',
            email: '',
            hourly_wage: '',
            tariff_level: 0,
            birth_date: '',
            display_color: '#6366f1'
        };

        this.validationErrors = {};
        this.isSubmitting = false;
    }

    /**
     * Populate form with employee data
     * @param {Object} employee - Employee data
     */
    async populateForm(employee) {
        this.formData = {
            name: employee.name || '',
            email: employee.email || '',
            hourly_wage: employee.hourly_wage || '',
            tariff_level: (employee.tariff_level !== undefined && employee.tariff_level !== null) ? employee.tariff_level : 0,
            birth_date: employee.birth_date || '',
            display_color: employee.display_color || '#6366f1'
        };
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        if (!this.modal) return;

        // Initialize current step
        this.currentStep = 1;
        this.totalSteps = 3;

        // Form submission
        const form = this.modal.querySelector('#employeeForm');
        if (form) {
            form.addEventListener('submit', this.handleSubmit);
        }

        // Navigation buttons
        const nextBtn = this.modal.querySelector('.next-btn');
        const prevBtn = this.modal.querySelector('.prev-btn');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.navigateStep('next'));
        }
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.navigateStep('prev'));
        }

        // Cancel button
        const cancelBtn = this.modal.querySelector('.cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', this.handleCancel);
        }

        // Close button
        const closeBtn = this.modal.querySelector('.modal-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', this.handleCancel);
        }

        // Tariff radio buttons
        const tariffRadios = this.modal.querySelectorAll('input[name="tariff_radio"]');
        tariffRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                const value = e.target.value;
                const selectElement = this.modal.querySelector('#employeeTariff');
                if (selectElement) {
                    selectElement.value = value;
                    this.formData.tariff_level = value;
                    this.updateCustomWageVisibility();
                    this.updateEffectiveRatePreview();
                }
            });
        });

        // Form field changes
        const inputs = this.modal.querySelectorAll('input[type="text"], input[type="email"], input[type="date"], input[type="number"], select, textarea');
        inputs.forEach(input => {
            input.addEventListener('input', this.handleFieldChange);
            input.addEventListener('blur', this.handleFieldBlur.bind(this));
        });

        // Color presets
        this.setupColorPresets();
        
        // Birth date selectors
        this.setupBirthDateSelectors();

        // Global event listeners
        document.addEventListener('keydown', this.handleKeyDown);
        this.modal.addEventListener('click', this.handleClickOutside);

        // Populate form fields
        this.updateFormFields();
        // Ensure correct initial visibility
        this.updateCustomWageVisibility();
    }

    /**
     * Navigate between form steps
     */
    navigateStep(direction) {
        if (!this.modal) return;

        // Validate current step before moving forward
        if (direction === 'next' && !this.validateCurrentStep()) {
            return;
        }

        // Update step
        if (direction === 'next' && this.currentStep < this.totalSteps) {
            this.currentStep++;
        } else if (direction === 'prev' && this.currentStep > 1) {
            this.currentStep--;
        }

        // Update UI
        this.updateStepUI();
    }

    /**
     * Validate current step fields
     */
    validateCurrentStep() {
        let isValid = true;

        if (this.currentStep === 1) {
            // Validate name (required)
            const nameInput = this.modal.querySelector('[name="name"]');
            if (nameInput && !this.validateField('name', nameInput.value)) {
                isValid = false;
            }
            // Validate email if provided
            const emailInput = this.modal.querySelector('[name="email"]');
            if (emailInput && emailInput.value && !this.validateField('email', emailInput.value)) {
                isValid = false;
            }
            // Validate birth date if provided
            const birthDateInput = this.modal.querySelector('[name="birth_date"]');
            if (birthDateInput && birthDateInput.value && !this.validateField('birth_date', birthDateInput.value)) {
                isValid = false;
            }
        } else if (this.currentStep === 2) {
            // Validate tariff selection
            const tariffRadios = this.modal.querySelectorAll('input[name="tariff_radio"]:checked');
            if (tariffRadios.length === 0) {
                this.validationErrors.tariff_level = 'Velg et lønnstrinn';
                this.updateFieldValidationUI('tariff_level');
                isValid = false;
            }
            // If custom wage, require and validate hourly_wage
            if (this.formData.tariff_level == 0) {
                const hasValue = this.formData.hourly_wage != null && String(this.formData.hourly_wage).trim().length > 0;
                if (!hasValue || !this.validateField('hourly_wage', this.formData.hourly_wage)) {
                    this.validationErrors.hourly_wage = hasValue ? this.validationErrors.hourly_wage : 'Timelønn er påkrevd for Egendefinert';
                    this.updateFieldValidationUI('hourly_wage');
                    isValid = false;
                }
            }
        }

        // Update validation UI
        this.updateValidationUI();

        return isValid;
    }

    /**
     * Update UI for current step
     */
    updateStepUI() {
        if (!this.modal) return;

        // Update step indicators
        const steps = this.modal.querySelectorAll('.progress-step');
        steps.forEach((step, index) => {
            const stepNum = index + 1;
            step.classList.toggle('active', stepNum === this.currentStep);
            step.classList.toggle('completed', stepNum < this.currentStep);
        });

        // Update sections visibility
        const sections = this.modal.querySelectorAll('.form-section[data-section]');
        sections.forEach(section => {
            const sectionNum = parseInt(section.dataset.section);
            section.style.display = sectionNum === this.currentStep ? 'block' : 'none';
        });

        // Update navigation buttons
        const prevBtn = this.modal.querySelector('.prev-btn');
        const nextBtn = this.modal.querySelector('.next-btn');
        const submitBtn = this.modal.querySelector('.submit-btn');

        if (prevBtn) {
            prevBtn.style.display = this.currentStep > 1 ? 'flex' : 'none';
        }

        if (nextBtn) {
            nextBtn.style.display = this.currentStep < this.totalSteps ? 'flex' : 'none';
        }

        if (submitBtn) {
            submitBtn.style.display = this.currentStep === this.totalSteps ? 'flex' : 'none';
        }

        // Focus first input in current section
        const currentSection = this.modal.querySelector(`.form-section[data-section="${this.currentStep}"]`);
        if (currentSection) {
            const firstInput = currentSection.querySelector('input:not([type="hidden"]):not([type="radio"]), select');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
    }

    /**
     * Remove event listeners
     */
    removeEventListeners() {
        document.removeEventListener('keydown', this.handleKeyDown);

        if (this.modal) {
            this.modal.removeEventListener('click', this.handleClickOutside);
        }
    }

    /**
     * Update form fields with current data
     */
    updateFormFields() {
        if (!this.modal) return;

        // Update input values
        Object.keys(this.formData).forEach(key => {
            const input = this.modal.querySelector(`[name="${key}"]`);
            if (input && this.formData[key] !== null && this.formData[key] !== undefined) {
                input.value = this.formData[key];
            }
        });

        // Update effective rate preview
        this.updateEffectiveRatePreview();

        // Avatars removed: no avatar preview

        // Accessibility: ensure submit button is type=submit and cancel is type=button
        const submitBtn = this.modal.querySelector('.submit-btn');
        if (submitBtn && submitBtn.getAttribute('type') !== 'submit') {
            submitBtn.setAttribute('type', 'submit');
        }
        const cancelBtn = this.modal.querySelector('.cancel-btn');
        if (cancelBtn && cancelBtn.getAttribute('type') !== 'button') {
            cancelBtn.setAttribute('type', 'button');
        }
    }
    /**
     * Update effective rate preview
     */
    updateEffectiveRatePreview() {
        if (!this.modal) return;
        const level = parseInt(this.formData.tariff_level || 0);
        const rates = this.app?.PRESET_WAGE_RATES || {};
        let rate = null;
        if (level === 0) {
            const hw = this.formData.hourly_wage;
            rate = hw !== '' && hw !== null && hw !== undefined ? parseFloat(hw) : null;
        } else {
            rate = rates[level] ?? null;
        }
        const el = this.modal.querySelector('#effectiveRatePreview');
        if (el) {
            el.textContent = (rate != null && !Number.isNaN(rate)) ? `${rate.toFixed(2).replace('.', ',')} kr/t` : '-';
        }
        // Disable hourly_wage input when using tariff level (not custom)
        const wageInput = this.modal.querySelector('#employeeWage');
        if (wageInput) {
            wageInput.disabled = level !== 0;
        }
    }


    // Avatars disabled: remove preview logic

    /**
     * Show/hide custom wage field depending on tariff selection
     */
    updateCustomWageVisibility() {
        if (!this.modal) return;
        const section = this.modal.querySelector('#customWageSection');
        if (!section) return;
        const level = parseInt(this.formData.tariff_level || 0);
        const show = level === 0; // 0 = Egendefinert
        section.style.display = show ? 'block' : 'none';
    }



    /**
     * Setup color presets
     */
    setupColorPresets() {
        const colorGrid = this.modal?.querySelector('#colorPresets');
        if (!colorGrid) return;

        const presetColors = [
            { color: '#6366f1', name: 'Indigo' },
            { color: '#8b5cf6', name: 'Lilla' },
            { color: '#ec4899', name: 'Rosa' },
            { color: '#ef4444', name: 'Rød' },
            { color: '#f97316', name: 'Oransje' },
            { color: '#f59e0b', name: 'Gul' },
            { color: '#84cc16', name: 'Lime' },
            { color: '#22c55e', name: 'Grønn' },
            { color: '#10b981', name: 'Smaragd' },
            { color: '#06b6d4', name: 'Cyan' },
            { color: '#0ea5e9', name: 'Himmelblå' },
            { color: '#3b82f6', name: 'Blå' }
        ];

        colorGrid.innerHTML = presetColors.map(({ color, name }) => `
            <button type="button" class="color-option" data-color="${color}" aria-label="${name}">
                <span class="color-swatch" style="background-color: ${color}"></span>
                <span class="color-check">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </span>
            </button>
        `).join('');

        // Add click handlers for presets
        colorGrid.addEventListener('click', (e) => {
            const option = e.target.closest('.color-option');
            if (option) {
                const color = option.dataset.color;
                this.formData.display_color = color;

                const colorInput = this.modal.querySelector('[name="display_color"]');
                if (colorInput) {
                    colorInput.value = color;
                }

                this.updateColorPresetSelection();
            }
        });

        this.updateColorPresetSelection();
    }

    /**
     * Setup birth date selectors
     */
    setupBirthDateSelectors() {
        if (!this.modal) return;
        const yearSel = this.modal.querySelector('#birthYearSelect');
        const monthSel = this.modal.querySelector('#birthMonthSelect');
        const daySel = this.modal.querySelector('#birthDaySelect');
        const dateInput = this.modal.querySelector('#employeeBirthDate');
        if (!yearSel || !monthSel || !daySel || !dateInput) return;

        const today = new Date();
        const minYear = today.getFullYear() - 75;
        const maxYear = today.getFullYear() - 13;

        // Populate years (only if not already populated)
        if (yearSel.options.length <= 1) {
            yearSel.innerHTML = '<option value="">År</option>';
            for (let y = maxYear; y >= minYear; y--) {
                const opt = document.createElement('option');
                opt.value = String(y);
                opt.textContent = String(y);
                yearSel.appendChild(opt);
            }
        }

        const updateDays = () => {
            const currentDay = daySel.value;
            const y = parseInt(yearSel.value, 10);
            const m = parseInt(monthSel.value, 10);
            
            if (!y || !m) {
                daySel.innerHTML = '<option value="">Dag</option>';
                return;
            }
            
            const daysInMonth = new Date(y, m, 0).getDate();
            daySel.innerHTML = '<option value="">Dag</option>';
            for (let d = 1; d <= daysInMonth; d++) {
                const opt = document.createElement('option');
                opt.value = String(d).padStart(2, '0');
                opt.textContent = String(d);
                daySel.appendChild(opt);
            }
            
            // Restore previous selection if valid
            if (currentDay && parseInt(currentDay) <= daysInMonth) {
                daySel.value = currentDay;
            }
        };

        const syncDate = () => {
            const y = yearSel.value;
            const m = monthSel.value;
            const d = daySel.value;
            if (y && m && d) {
                const iso = `${y}-${m}-${d}`;
                dateInput.value = iso;
                this.formData.birth_date = iso;
                this.clearFieldError('birth_date');
            } else {
                dateInput.value = '';
                this.formData.birth_date = '';
            }
        };

        // Initialize from existing value if present
        const current = (this.formData.birth_date || '').trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(current)) {
            const [yy, mm, dd] = current.split('-');
            yearSel.value = yy;
            monthSel.value = mm;
            updateDays();
            daySel.value = dd;
        }

        yearSel.addEventListener('change', () => { updateDays(); syncDate(); });
        monthSel.addEventListener('change', () => { updateDays(); syncDate(); });
        daySel.addEventListener('change', () => { syncDate(); });
    }

    /**
     * Update color preset selection
     */
    updateColorPresetSelection() {
        const options = this.modal?.querySelectorAll('.color-option');
        if (!options) return;

        options.forEach(option => {
            option.classList.toggle('selected', option.dataset.color === this.formData.display_color);
        });
    }

    /**
     * Handle form field changes
     */
    handleFieldChange(e) {
        const { name, value } = e.target;

        if (name in this.formData) {
            this.formData[name] = value;

            // Clear validation error for this field
            this.clearFieldError(name);

            // Update color preset selection if color changed
            if (name === 'display_color') {
                this.updateColorPresetSelection();
            }

            // Update effective rate preview when tariff_level or hourly_wage changes
            if (name === 'tariff_level' || name === 'hourly_wage') {
                this.updateEffectiveRatePreview();
            }
            if (name === 'tariff_level') {
                this.updateCustomWageVisibility();
            }
        }
    }

    /**
     * Handle field blur for validation
     */
    handleFieldBlur(e) {
        const { name, value } = e.target;
        if (name === 'name') {
            const normalized = this.normalizeEmployeeName(value);
            // Persist normalized value to form state and input
            if (normalized !== this.formData.name) {
                this.formData.name = normalized;
                const input = this.modal?.querySelector('[name="name"]');
                if (input) input.value = normalized;
            }
            this.validateField(name, normalized);
            return;
        }
        this.validateField(name, value);
    }

    // Avatars removed: file selection and removal handlers deleted

    /**
     * Handle form submission
     */
    async handleSubmit(e) {
        e.preventDefault();

        if (this.isSubmitting) return;

        try {
            console.debug('[employees] submit-click', { mode: this.mode });
            // Validate form
            if (!this.validateForm()) {
                console.debug('[employees] validation failed', this.validationErrors);
                return;
            }

            this.setSubmitting(true);

            if (this.mode === 'create') {
                await this.createEmployee();
            } else {
                await this.updateEmployee();
            }

            this.hide();

        } catch (error) {
            console.error('Error submitting form:', error);
            this.showError(error.message || 'En feil oppstod ved lagring');
        } finally {
            this.setSubmitting(false);
        }
    }

    /**
     * Handle cancel action
     */
    handleCancel() {
        if (this.isSubmitting) return;

        // Check if form has changes
        if (this.hasUnsavedChanges()) {
            if (!confirm('Du har ulagrede endringer. Er du sikker på at du vil lukke?')) {
                return;
            }
        }

        this.hide();
    }

    /**
     * Handle keyboard events
     */
    handleKeyDown(e) {
        if (!this.isVisible) return;

        if (e.key === 'Escape') {
            e.preventDefault();
            this.handleCancel();
        }
    }

    /**
     * Handle click outside modal
     */
    handleClickOutside(e) {
        if (e.target === this.modal) {
            this.handleCancel();
        }
    }

    /**
     * Set submitting state
     */
    setSubmitting(submitting) {
        this.isSubmitting = submitting;

        const submitBtn = this.modal?.querySelector('.submit-btn');
        const btnText = this.modal?.querySelector('.btn-text');
        const btnLoading = this.modal?.querySelector('.btn-loading');

        if (submitBtn) {
            submitBtn.disabled = submitting;
            submitBtn.classList.toggle('loading', submitting);
        }

        if (btnText) {
            btnText.style.display = submitting ? 'none' : 'inline';
        }

        if (btnLoading) {
            btnLoading.style.display = submitting ? 'inline-flex' : 'none';
        }

        // Disable form inputs
        const inputs = this.modal?.querySelectorAll('input, button, select, textarea');
        inputs?.forEach(input => {
            if (!input.classList.contains('submit-btn') && !input.classList.contains('cancel-btn')) {
                input.disabled = submitting;
            }
        });
    }

    /**
     * Check if form has unsaved changes
     */
    hasUnsavedChanges() {
        if (this.mode === 'create') {
            return Object.values(this.formData).some(value =>
                value !== '' && value !== null && value !== '#6366f1'
            );
        }

        if (!this.originalData) return false;

        const normalize = (v) => (v === undefined || v === null ? '' : v);

        // Check for changes in form data
        const hasDataChanges = Object.keys(this.formData).some(key => {
            const defaultOriginal = this.getInitialFormDefaults()[key];
            const originalValue = (this.originalData[key] !== undefined)
                ? this.originalData[key]
                : defaultOriginal;
            return normalize(this.formData[key]) !== normalize(originalValue);
        });

        return hasDataChanges;
    }

    /**
     * Show error message
     */
    showError(message) {
        // This could be enhanced with a toast notification system
        alert(message);
    }

    // ===== VALIDATION METHODS =====

    /**
     * Validate entire form
     * @returns {boolean} True if form is valid
     */
    validateForm() {
        this.validationErrors = {};
        let isValid = true;

        // Validate required fields
        if (!this.validateField('name', this.formData.name)) {
            isValid = false;
        }

        // Validate optional fields if they have values
        if (this.formData.email && !this.validateField('email', this.formData.email)) {
            isValid = false;
        }

        if (this.formData.hourly_wage && !this.validateField('hourly_wage', this.formData.hourly_wage)) {
            isValid = false;
        }

        if (this.formData.birth_date && !this.validateField('birth_date', this.formData.birth_date)) {
            isValid = false;
        }

        if (!this.validateField('display_color', this.formData.display_color)) {
            isValid = false;
        }
        if (!this.validateField('tariff_level', this.formData.tariff_level)) {
            isValid = false;
        }

        // Update UI with validation errors
        this.updateValidationUI();

        return isValid;
    }

    /**
     * Validate individual field
     * @param {string} fieldName - Name of the field
     * @param {any} value - Value to validate
     * @returns {boolean} True if field is valid
     */
    validateField(fieldName, value) {
        let isValid = true;
        let errorMessage = '';

        switch (fieldName) {
            case 'name':
                if (!value || value.trim().length === 0) {
                    errorMessage = 'Navn er påkrevd';
                    isValid = false;
                } else if (value.trim().length < 2) {
                    errorMessage = 'Navn må være minst 2 tegn';
                    isValid = false;
                } else if (value.trim().length > 100) {
                    errorMessage = 'Navn kan ikke være lengre enn 100 tegn';
                    isValid = false;
                } else if (!/^[a-zA-ZæøåÆØÅ\s\-'\.]+$/.test(value.trim())) {
                    errorMessage = 'Navn kan kun inneholde bokstaver, mellomrom, bindestrek og apostrof';
                    isValid = false;
                }
                break;

            case 'email':
                if (value && value.trim().length > 0) {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(value.trim())) {
                        errorMessage = 'Ugyldig e-postadresse';
                        isValid = false;
                    } else if (value.trim().length > 254) {
                        errorMessage = 'E-postadresse kan ikke være lengre enn 254 tegn';
                        isValid = false;
                    }
                }
                break;

            case 'hourly_wage':
                if (value && value.toString().trim().length > 0) {
                    const wage = parseFloat(value);
                    if (isNaN(wage)) {
                        errorMessage = 'Timelønn må være et gyldig tall';
                        isValid = false;
                    } else if (wage < 0) {
                        errorMessage = 'Timelønn kan ikke være negativ';
                        isValid = false;
                    } else if (wage > 10000) {
                        errorMessage = 'Timelønn kan ikke være høyere enn 10 000 kr';
                        isValid = false;
                    }
                }
                break;

            case 'birth_date':
                if (value && value.trim().length > 0) {
                    const date = new Date(value);
                    const today = new Date();
                    const minDate = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
                    const maxDate = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());

                    if (isNaN(date.getTime())) {
                        errorMessage = 'Ugyldig dato';
                        isValid = false;
                    } else if (date < minDate) {
                        errorMessage = 'Fødselsdato kan ikke være mer enn 100 år tilbake';
                        isValid = false;
                    } else if (date > maxDate) {
                        errorMessage = 'Ansatt må være minst 13 år gammel';
                        isValid = false;
                    }
                }
                break;

            case 'display_color':
                if (!value || value.trim().length === 0) {
                    errorMessage = 'Visningsfarge er påkrevd';
                    isValid = false;
                } else if (!/^#[0-9A-Fa-f]{6}$/.test(value.trim())) {
                    errorMessage = 'Ugyldig fargeformat (må være hex-format som #FF0000)';
                    isValid = false;
                }
                break;

            case 'tariff_level':
                if (value === undefined || value === null || value === '') {
                    errorMessage = 'Velg lønnstrinn eller Egendefinert';
                    isValid = false;
                } else {
                    const intVal = parseInt(value);
                    const allowed = [0, -2, -1, 1, 2, 3, 4, 5, 6];
                    if (!allowed.includes(intVal)) {
                        errorMessage = 'Ugyldig lønnstrinn';
                        isValid = false;
                    }
                }
                break;
                break;
        }

        if (!isValid) {
            this.validationErrors[fieldName] = errorMessage;
        } else {
            delete this.validationErrors[fieldName];
        }

        // Update field UI immediately
        this.updateFieldValidationUI(fieldName);

        return isValid;
    }

    // Avatars removed: validation for avatar files deleted

    /**
     * Clear validation error for a field
     * @param {string} fieldName - Name of the field
     */
    clearFieldError(fieldName) {
        delete this.validationErrors[fieldName];
        this.updateFieldValidationUI(fieldName);
    }

    /**
     * Update validation UI for all fields
     */
    updateValidationUI() {
        Object.keys(this.validationErrors).forEach(fieldName => {
            this.updateFieldValidationUI(fieldName);
        });
    }

    /**
     * Update validation UI for a specific field
     * @param {string} fieldName - Name of the field
     */
    updateFieldValidationUI(fieldName) {
        if (!this.modal) return;

        const input = this.modal.querySelector(`[name="${fieldName}"]`);
        const errorElement = this.modal.querySelector(`#${fieldName}Error`);
        const formGroup = input?.closest('.form-group');

        if (!input || !errorElement) return;

        const hasError = fieldName in this.validationErrors;
        const errorMessage = this.validationErrors[fieldName] || '';

        // Update input classes
        input.classList.toggle('error', hasError);
        input.classList.toggle('valid', !hasError && input.value.trim().length > 0);

        // Update form group classes
        if (formGroup) {
            formGroup.classList.toggle('has-error', hasError);
            formGroup.classList.toggle('has-success', !hasError && input.value.trim().length > 0);
        }

        // Update error message
        errorElement.textContent = errorMessage;
        errorElement.style.display = hasError ? 'block' : 'none';

        // Update ARIA attributes
        input.setAttribute('aria-invalid', hasError.toString());
        if (hasError) {
            input.setAttribute('aria-describedby', `${fieldName}Error`);
        } else {
            input.removeAttribute('aria-describedby');
        }
    }

    // ===== CRUD OPERATIONS =====

    /**
     * Create new employee with optimistic updates
     */
    async createEmployee() {
        // Normalize defaults for missing optional fields before validation (for tests and programmatic calls)
        if (this.formData.tariff_level === undefined || this.formData.tariff_level === null || this.formData.tariff_level === '') {
            this.formData.tariff_level = 0;
        }
        if (!this.formData.display_color) {
            this.formData.display_color = '#6366f1';
        }
        // Validate before proceeding to optimistic update
        if (!this.validateForm()) {
            throw new Error('Valideringsfeil: Kontroller feltene');
        }
        // Create optimistic employee object
        const normalizedName = this.normalizeEmployeeName(this.formData.name);
        const optimisticEmployee = {
            id: `temp_${Date.now()}`, // Temporary ID
            name: normalizedName,
            email: this.formData.email.trim() || null,
            hourly_wage: this.formData.hourly_wage ? parseFloat(this.formData.hourly_wage) : null,
            birth_date: this.formData.birth_date || null,
            display_color: this.formData.display_color,
            created_at: new Date().toISOString(),
            archived_at: null,
            _optimistic: true, // Mark as optimistic
            _loading: true // Mark as loading
        };

        try {
            // Apply optimistic update immediately
            this.app.employees.push(optimisticEmployee);
            this.app.onEmployeesLoaded();

            // Import employee service (supports test injection)
            const { employeeService } = await this.loadEmployeeService();

            // Prepare employee data
            const employeeData = {
                name: normalizedName,
                email: this.formData.email.trim() || null,
                hourly_wage: this.formData.hourly_wage ? parseFloat(this.formData.hourly_wage) : null,
                tariff_level: this.formData.tariff_level !== undefined ? parseInt(this.formData.tariff_level) : 0,
                birth_date: this.formData.birth_date || null,
                display_color: this.formData.display_color
            };

            // Create employee on server
            const newEmployee = await employeeService.createEmployee(employeeData);
            try { window.employee_create_success_total = (window.employee_create_success_total || 0) + 1; } catch {}

            // Avatars disabled: no upload

            // Replace optimistic employee with real employee
            const employeeIndex = this.app.employees.findIndex(emp => emp.id === optimisticEmployee.id);
            if (employeeIndex !== -1) {
                this.app.employees[employeeIndex] = newEmployee;
                this.app.onEmployeesLoaded();
            }

            // Show success message
            this.showSuccess(`${newEmployee.name} ble lagt til`);

        } catch (error) {
            console.error('Error creating employee:', error);
            try { window.employee_create_error_total = (window.employee_create_error_total || 0) + 1; } catch {}

            // Rollback optimistic update
            this.rollbackOptimisticCreate(optimisticEmployee.id);

            throw new Error(error.message || 'Kunne ikke opprette ansatt');
        }
    }

    /**
     * Update existing employee with optimistic updates
     */
    async updateEmployee() {
        if (!this.currentEmployee) {
            throw new Error('Ingen ansatt valgt for redigering');
        }

        // Prepare update data (only changed fields)
        const updateData = {};
        let wageChanged = false;

        const normalizedNameUpdate = this.normalizeEmployeeName(this.formData.name);
        if (normalizedNameUpdate !== (this.originalData.name || '')) {
            updateData.name = normalizedNameUpdate;
        }

        if (this.formData.email.trim() !== (this.originalData.email || '')) {
            updateData.email = this.formData.email.trim() || null;
        }

        const newWage = this.formData.hourly_wage ? parseFloat(this.formData.hourly_wage) : null;
        if (newWage !== this.originalData.hourly_wage) {
            updateData.hourly_wage = newWage;
            wageChanged = true;
        }

        const newLevel = this.formData.tariff_level !== undefined ? parseInt(this.formData.tariff_level) : 0;
        if (newLevel !== (this.originalData.tariff_level ?? 0)) {
            updateData.tariff_level = newLevel;
            wageChanged = true;
        }

        if (this.formData.birth_date !== (this.originalData.birth_date || '')) {
            updateData.birth_date = this.formData.birth_date || null;
        }

        if (this.formData.display_color !== (this.originalData.display_color || '')) {
            updateData.display_color = this.formData.display_color;
        }
        
        // If wage changed, ask about retroactive update
        let updateExistingShifts = false;
        if (wageChanged && this.app.shifts && this.app.shifts.length > 0) {
            // Check if employee has any shifts
            const hasShifts = this.app.shifts.some(shift => shift.employee_id === this.currentEmployee.id);
            if (hasShifts) {
                updateExistingShifts = await this.showWageChangeConfirmation();
            }
        }

        // Store original state for rollback
        const originalEmployee = { ...this.currentEmployee };
        const employeeIndex = this.app.employees.findIndex(emp => emp.id === this.currentEmployee.id);

        if (employeeIndex === -1) {
            throw new Error('Ansatt ikke funnet i lokal cache');
        }

        try {
            // Apply optimistic update immediately if there are changes
            if (Object.keys(updateData).length > 0) {
                const optimisticEmployee = {
                    ...this.app.employees[employeeIndex],
                    ...updateData,
                    _optimistic: true,
                    _loading: true
                };

                this.app.employees[employeeIndex] = optimisticEmployee;
                this.app.onEmployeesLoaded();
            }

            // Import employee service (supports test injection)
            const { employeeService } = await this.loadEmployeeService();

            // Update employee on server if there are changes
            let updatedEmployee = this.currentEmployee;
            if (Object.keys(updateData).length > 0) {
                updatedEmployee = await employeeService.updateEmployee(this.currentEmployee.id, updateData);
            }

            // Avatars disabled: no avatar change handling

            // Replace optimistic update with real data
            if (Object.keys(updateData).length > 0) {
                this.app.employees[employeeIndex] = updatedEmployee;
                this.app.onEmployeesLoaded();
                
                // Update the current employee carousel if visible
                if (this.app.employeeCarousel && this.app.currentEmployee?.id === updatedEmployee.id) {
                    this.app.currentEmployee = updatedEmployee;
                    this.app.employeeCarousel.updateEmployeeDisplay(updatedEmployee);
                }
                
                // Refresh shift display if needed
                if (this.app.updateShiftDisplay) {
                    this.app.updateShiftDisplay();
                }
            }

            // Handle retroactive wage update if requested
            if (updateExistingShifts && wageChanged) {
                await this.updateExistingShiftsWage(updatedEmployee);
            }

            // Show success message
            const wageMessage = updateExistingShifts && wageChanged 
                ? ` og eksisterende vakter ble oppdatert` 
                : '';
            this.showSuccess(`${updatedEmployee.name} ble oppdatert${wageMessage}`);

        } catch (error) {
            console.error('Error updating employee:', error);

            // Rollback optimistic update
            this.rollbackOptimisticUpdate(employeeIndex, originalEmployee);

            throw new Error(error.message || 'Kunne ikke oppdatere ansatt');
        }
    }

    /**
     * Upload avatar for employee
     * @param {string} employeeId - Employee ID
     */
    // Avatars disabled: upload function removed

    /**
     * Update existing shifts with new wage
     */
    async updateExistingShiftsWage(employee) {
        try {
            // Get all shifts for this employee
            const employeeShifts = this.app.shifts.filter(shift => 
                shift.employee_id === employee.id
            );
            
            // Update client-side objects first so UI reflects immediately
            for (const shift of employeeShifts) {
                // Ensure snapshot exists and set new wage
                shift.hourly_wage_snapshot = Number(employee.hourly_wage || 0);
                
                // Recalculate totals using snapshot-aware calc
                if (this.app.calculateShift) {
                    const recalculated = this.app.calculateShift(shift);
                    shift.calculated_wage = recalculated.total;
                }
            }
            
            if (employeeShifts.length === 0) return;
            
            // Persist to server for authoritative employee_shifts
            try {
                const { data: { session } } = await window.supa.auth.getSession();
                if (session) {
                    const headers = { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' };
                    // Only update shifts in the same month window being viewed
                    const currentMonth = this.app.currentMonth;
                    const currentYear = this.app.currentYear;
                    for (const shift of employeeShifts) {
                        // Only update if this shift carries a snapshot field (employees context)
                        if (typeof shift.hourly_wage_snapshot === 'number' || shift.employee_id) {
                            await fetch(`${window.CONFIG.apiBase}/employee-shifts/${shift.id}`, {
                                method: 'PUT',
                                headers,
                                body: JSON.stringify({
                                    // Sending no times triggers server to recompute snapshots from employee
                                    notes: shift.notes ?? undefined
                                })
                            }).catch(()=>{});
                        }
                    }
                }
            } catch (e) {
                console.warn('Retroactive server update failed or skipped:', e);
            }
            
            // Update the display
            if (this.app.updateShiftDisplay) {
                this.app.updateShiftDisplay();
            }
            // Refresh employee shifts from server to ensure numbers are recomputed
            if (this.app.fetchAndDisplayEmployeeShifts) {
                await this.app.fetchAndDisplayEmployeeShifts();
            }
            
            console.log(`Updated ${employeeShifts.length} existing shifts with new wage data`);
        } catch (error) {
            console.error('Error updating existing shifts:', error);
        }
    }

    /**
     * Show wage change confirmation dialog
     */
    async showWageChangeConfirmation() {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal active confirmation-modal';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 480px;">
                    <div class="modal-header">
                        <h2>Oppdater lønn</h2>
                    </div>
                    <div class="modal-body" style="padding: 24px;">
                        <div class="confirmation-icon" style="margin-bottom: 20px;">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <path d="M12 8v4"></path>
                                <path d="M12 16h.01"></path>
                            </svg>
                        </div>
                        <p style="font-size: 16px; color: var(--text-primary); margin-bottom: 12px;">
                            Du har endret lønnen for denne ansatte.
                        </p>
                        <p style="font-size: 14px; color: var(--text-secondary); line-height: 1.6;">
                            Vil du oppdatere lønnen kun for fremtidige vakter, eller også for eksisterende vakter som ikke er godkjent ennå?
                        </p>
                    </div>
                    <div class="modal-footer" style="padding: 20px 24px; gap: 12px; display: flex; justify-content: flex-end;">
                        <button type="button" class="btn btn-secondary" id="futureOnlyBtn">
                            Kun fremtidige vakter
                        </button>
                        <button type="button" class="btn btn-primary" id="retroactiveBtn">
                            Oppdater eksisterende vakter
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            const futureOnlyBtn = modal.querySelector('#futureOnlyBtn');
            const retroactiveBtn = modal.querySelector('#retroactiveBtn');
            
            const closeModal = (retroactive) => {
                modal.classList.remove('active');
                setTimeout(() => {
                    modal.remove();
                    resolve(retroactive);
                }, 300);
            };
            
            futureOnlyBtn.addEventListener('click', () => closeModal(false));
            retroactiveBtn.addEventListener('click', () => closeModal(true));
            
            // Close on outside click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal(false);
                }
            });
        });
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        // This could be enhanced with a toast notification system
        console.log('Success:', message);

        // For now, we'll use a simple approach
        // In a real app, you'd want a proper notification system
        if (window.showToast) {
            window.showToast(message, 'success');
        }
    }

    // Avatars removed: processing, cropping, and initials helpers deleted

    // ===== OPTIMISTIC UPDATE ROLLBACK METHODS =====

    /**
     * Rollback optimistic create operation
     * @param {string} optimisticId - Temporary ID of the optimistic employee
     */
    rollbackOptimisticCreate(optimisticId) {
        try {
            const employeeIndex = this.app.employees.findIndex(emp => emp.id === optimisticId);
            if (employeeIndex !== -1) {
                this.app.employees.splice(employeeIndex, 1);
                this.app.onEmployeesLoaded();
                console.log('Rolled back optimistic create for employee:', optimisticId);
            }
        } catch (error) {
            console.error('Error rolling back optimistic create:', error);
        }
    }

    /**
     * Rollback optimistic update operation
     * @param {number} employeeIndex - Index of the employee in the array
     * @param {Object} originalEmployee - Original employee data
     */
    rollbackOptimisticUpdate(employeeIndex, originalEmployee) {
        try {
            if (employeeIndex >= 0 && employeeIndex < this.app.employees.length) {
                this.app.employees[employeeIndex] = originalEmployee;
                this.app.onEmployeesLoaded();
                console.log('Rolled back optimistic update for employee:', originalEmployee.id);
            }
        } catch (error) {
            console.error('Error rolling back optimistic update:', error);
        }
    }

    /**
     * Rollback optimistic archive operation
     * @param {number} employeeIndex - Index where the employee should be restored
     * @param {Object} originalEmployee - Original employee data
     */
    rollbackOptimisticArchive(employeeIndex, originalEmployee) {
        try {
            // Remove the archived employee and restore the original
            const archivedIndex = this.app.employees.findIndex(emp => emp.id === originalEmployee.id);
            if (archivedIndex !== -1) {
                this.app.employees[archivedIndex] = originalEmployee;
            } else {
                // If not found, insert at original position
                this.app.employees.splice(employeeIndex, 0, originalEmployee);
            }
            this.app.onEmployeesLoaded();
            console.log('Rolled back optimistic archive for employee:', originalEmployee.id);
        } catch (error) {
            console.error('Error rolling back optimistic archive:', error);
        }
    }

    /**
     * Check if an employee is in optimistic state
     * @param {Object} employee - Employee object
     * @returns {boolean} True if employee is optimistic
     */
    isOptimistic(employee) {
        return employee && (employee._optimistic === true || employee._loading === true);
    }

    /**
     * Clean up optimistic flags from employee
     * @param {Object} employee - Employee object
     * @returns {Object} Cleaned employee object
     */
    cleanOptimisticFlags(employee) {
        const cleaned = { ...employee };
        delete cleaned._optimistic;
        delete cleaned._loading;
        return cleaned;
    }

    /**
     * Show loading state for optimistic operations
     * @param {string} message - Loading message
     */
    showOptimisticLoading(message = 'Lagrer...') {
        // This could be enhanced with a loading indicator
        console.log('Optimistic operation:', message);
    }

    /**
     * Hide loading state for optimistic operations
     */
    hideOptimisticLoading() {
        // This could be enhanced with a loading indicator
        console.log('Optimistic operation completed');
    }
}
