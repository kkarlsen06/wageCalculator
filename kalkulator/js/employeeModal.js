/**
 * Employee Settings Modal Component
 * Modal for creating and editing employees with avatar upload
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
            display_color: '#6366f1',
            avatar: null
        };

        // Avatar state
        this.avatarPreview = null;
        this.avatarFile = null;
        this.avatarChanged = false;

        // Bind methods
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handleCancel = this.handleCancel.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleClickOutside = this.handleClickOutside.bind(this);
        this.handleAvatarChange = this.handleAvatarChange.bind(this);
        this.handleFieldChange = this.handleFieldChange.bind(this);
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
        const submitText = this.mode === 'create' ? 'Legg til' : 'Lagre endringer';
        const rates = this.app?.PRESET_WAGE_RATES || {};
        const fmt = (n) => typeof n === 'number' ? n.toFixed(2).replace('.', ',') : '';

        return `
            <div class="modal-content employee-modal-content">
                <div class="modal-header">
                    <h2>${title}</h2>
                    <button type="button" class="modal-close-btn" aria-label="Lukk">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <form class="employee-form" id="employeeForm">
                    <div class="form-sections">
                        <!-- Avatar Section -->
                        <div class="form-section avatar-section">
                            <div class="avatar-upload-container">
                                <div class="avatar-preview" id="avatarPreview">
                                    <div class="avatar-placeholder">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                            <circle cx="12" cy="7" r="4"></circle>
                                        </svg>
                                    </div>
                                </div>
                                <div class="avatar-upload-controls">
                                    <input type="file" id="avatarInput" accept="image/*" style="display: none;">
                                    <button type="button" class="btn btn-secondary avatar-upload-btn">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                            <polyline points="21,15 16,10 5,21"></polyline>
                                        </svg>
                                        Velg bilde
                                    </button>
                                    <button type="button" class="btn btn-ghost avatar-remove-btn" style="display: none;">
                                        Fjern bilde
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Basic Information -->
                        <div class="form-section">
                            <h3>Grunnleggende informasjon</h3>

                            <div class="form-group">
                                <label for="employeeName" class="form-label required">
                                    Navn
                                </label>
                                <input
                                    type="text"
                                    id="employeeName"
                                    name="name"
                                    class="form-input"
                                    required
                                    autocomplete="name"
                                    placeholder="Skriv inn navn"
                                    aria-describedby="nameError">
                                <div class="form-error" id="nameError"></div>
                            </div>

                            <div class="form-group">
                                <label for="employeeEmail" class="form-label">
                                    E-post
                                </label>
                                <input
                                    type="email"
                                    id="employeeEmail"
                                    name="email"
                                    class="form-input"
                                    autocomplete="email"
                                    placeholder="ansatt@bedrift.no"
                                    aria-describedby="emailError">
                                <div class="form-error" id="emailError"></div>
                            </div>

                            <div class="form-group">
                                <label for="employeeTariff" class="form-label">
                                    Lønnstrinn
                                </label>
                                <select id="employeeTariff" name="tariff_level" class="form-input" aria-describedby="tariffError">
                                    <option value="0">Egendefinert (bruk timelønn)</option>
                                    <option value="-2">Unge arbeidstakere under 18 år (${fmt(rates['-2'])} kr/t)</option>
                                    <option value="-1">Unge arbeidstakere under 16 år (${fmt(rates['-1'])} kr/t)</option>
                                    <option value="1">Trinn 1 (${fmt(rates[1])} kr/t)</option>
                                    <option value="2">Trinn 2 (${fmt(rates[2])} kr/t)</option>
                                    <option value="3">Trinn 3 (${fmt(rates[3])} kr/t)</option>
                                    <option value="4">Trinn 4 (${fmt(rates[4])} kr/t)</option>
                                    <option value="5">Trinn 5 (${fmt(rates[5])} kr/t)</option>
                                    <option value="6">Trinn 6 (${fmt(rates[6])} kr/t)</option>
                                </select>
                                <div class="form-error" id="tariffError"></div>
                                <div class="help-text" id="effectiveRateHelp">Effektiv sats: <span id="effectiveRatePreview">-</span></div>
                            </div>

                            <div class="form-group">
                                <label for="employeeWage" class="form-label">
                                    Timelønn (kr)
                                </label>
                                <input
                                    type="number"
                                    id="employeeWage"
                                    name="hourly_wage"
                                    class="form-input"
                                    min="0"
                                    step="0.01"
                                    placeholder="250.00"
                                    aria-describedby="wageError">
                                <div class="form-error" id="wageError"></div>
                            </div>

                            <div class="form-group">
                                <label for="employeeBirthDate" class="form-label">
                                    Fødselsdato
                                </label>
                                <input
                                    type="date"
                                    id="employeeBirthDate"
                                    name="birth_date"
                                    class="form-input"
                                    aria-describedby="birthDateError">
                                <div class="form-error" id="birthDateError"></div>
                            </div>
                        </div>

                        <!-- Appearance -->
                        <div class="form-section">
                            <h3>Utseende</h3>

                            <div class="form-group">
                                <label for="employeeColor" class="form-label">
                                    Visningsfarge
                                </label>
                                <div class="color-picker-container">
                                    <input
                                        type="color"
                                        id="employeeColor"
                                        name="display_color"
                                        class="color-input"
                                        value="#6366f1">
                                    <div class="color-presets" id="colorPresets">
                                        <!-- Color presets will be populated here -->
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary cancel-btn">
                            Avbryt
                        </button>
                        <button type="submit" class="btn btn-primary submit-btn">
                            <span class="btn-text">${submitText}</span>
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
            display_color: '#6366f1',
            avatar: null
        };

        this.validationErrors = {};
        this.avatarPreview = null;
        this.avatarFile = null;
        this.avatarChanged = false;
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
            display_color: employee.display_color || '#6366f1',
            avatar: null
        };

        // Load avatar if exists
        if (employee.id) {
            try {
                const avatarUrl = await this.app.getEmployeeAvatarUrl(employee.id);
                if (avatarUrl) {
                    this.avatarPreview = avatarUrl;
                }
            } catch (error) {
                console.warn('Failed to load employee avatar:', error);
            }
        }
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        if (!this.modal) return;

        // Form submission
        const form = this.modal.querySelector('#employeeForm');
        if (form) {
            form.addEventListener('submit', this.handleSubmit);
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

        // Avatar upload
        const avatarUploadBtn = this.modal.querySelector('.avatar-upload-btn');
        const avatarInput = this.modal.querySelector('#avatarInput');
        if (avatarUploadBtn && avatarInput) {
            avatarUploadBtn.addEventListener('click', () => avatarInput.click());
            avatarInput.addEventListener('change', this.handleAvatarChange);
        }

        // Avatar remove
        const avatarRemoveBtn = this.modal.querySelector('.avatar-remove-btn');
        if (avatarRemoveBtn) {
            avatarRemoveBtn.addEventListener('click', this.handleAvatarRemove.bind(this));
        }

        // Form field changes
        const inputs = this.modal.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('input', this.handleFieldChange);
            input.addEventListener('blur', this.handleFieldBlur.bind(this));
        });

        // Color presets
        this.setupColorPresets();

        // Global event listeners
        document.addEventListener('keydown', this.handleKeyDown);
        this.modal.addEventListener('click', this.handleClickOutside);

        // Populate form fields
        this.updateFormFields();
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

        // Update avatar preview
        this.updateAvatarPreview();
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


    /**
     * Update avatar preview
     */
    updateAvatarPreview() {
        const avatarPreview = this.modal?.querySelector('#avatarPreview');
        const avatarRemoveBtn = this.modal?.querySelector('.avatar-remove-btn');

        if (!avatarPreview) return;

        if (this.avatarPreview) {
            avatarPreview.innerHTML = `<img src="${this.avatarPreview}" alt="Avatar preview" class="avatar-image">`;
            if (avatarRemoveBtn) {
                avatarRemoveBtn.style.display = 'inline-flex';
            }
        } else {
            // Show initials or placeholder
            const name = this.formData.name;
            if (name) {
                const initials = this.app.getEmployeeInitials({ name });
                avatarPreview.innerHTML = `
                    <div class="avatar-initials" style="background-color: ${this.formData.display_color}">
                        ${initials}
                    </div>
                `;
            } else {
                avatarPreview.innerHTML = `
                    <div class="avatar-placeholder">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                    </div>
                `;
            }

            if (avatarRemoveBtn) {
                avatarRemoveBtn.style.display = 'none';
            }
        }
    }

    /**
     * Setup color presets
     */
    setupColorPresets() {
        const colorPresets = this.modal?.querySelector('#colorPresets');
        if (!colorPresets) return;

        const presetColors = [
            '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
            '#f97316', '#f59e0b', '#eab308', '#84cc16',
            '#22c55e', '#10b981', '#06b6d4', '#0ea5e9',
            '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7'
        ];

        colorPresets.innerHTML = presetColors.map(color => `
            <button type="button" class="color-preset" data-color="${color}" style="background-color: ${color}">
                <span class="sr-only">${color}</span>
            </button>
        `).join('');

        // Add click handlers for presets
        colorPresets.addEventListener('click', (e) => {
            const preset = e.target.closest('.color-preset');
            if (preset) {

                const color = preset.dataset.color;
                this.formData.display_color = color;

                const colorInput = this.modal.querySelector('[name="display_color"]');
                if (colorInput) {
                    colorInput.value = color;
                }

                this.updateAvatarPreview();
                this.updateColorPresetSelection();
            }
        });

        this.updateColorPresetSelection();
    }

    /**
     * Update color preset selection
     */
    updateColorPresetSelection() {
        const presets = this.modal?.querySelectorAll('.color-preset');
        if (!presets) return;

        presets.forEach(preset => {
            preset.classList.toggle('active', preset.dataset.color === this.formData.display_color);
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

            // Update avatar preview if name or color changed
            if (name === 'name' || name === 'display_color') {
                this.updateAvatarPreview();
            }

            // Update color preset selection if color changed
            if (name === 'display_color') {
                this.updateColorPresetSelection();
            }

            // Update effective rate preview when tariff_level or hourly_wage changes
            if (name === 'tariff_level' || name === 'hourly_wage') {
                this.updateEffectiveRatePreview();
            }
        }
    }

    /**
     * Handle field blur for validation
     */
    handleFieldBlur(e) {
        const { name, value } = e.target;
        this.validateField(name, value);
    }

    /**
     * Handle avatar file selection
     */
    async handleAvatarChange(e) {
        const file = e.target.files[0];
        if (!file) return;

        try {
            // Validate file
            const validation = this.validateAvatarFile(file);
            if (!validation.valid) {
                this.showError(validation.error);
                return;
            }

            // Create preview
            const reader = new FileReader();
            reader.onload = (event) => {
                this.avatarPreview = event.target.result;
                this.avatarFile = file;
                this.avatarChanged = true;
                this.updateAvatarPreview();
            };
            reader.readAsDataURL(file);

        } catch (error) {
            console.error('Error handling avatar change:', error);
            this.showError('Feil ved lasting av bilde');
        }
    }

    /**
     * Handle avatar removal
     */
    handleAvatarRemove() {
        this.avatarPreview = null;
        this.avatarFile = null;
        this.avatarChanged = true;
        this.updateAvatarPreview();

        // Clear file input
        const avatarInput = this.modal?.querySelector('#avatarInput');
        if (avatarInput) {
            avatarInput.value = '';
        }
    }

    /**
     * Handle form submission
     */
    async handleSubmit(e) {
        e.preventDefault();

        if (this.isSubmitting) return;

        try {
            // Validate form
            if (!this.validateForm()) {
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
            if (!input.classList.contains('submit-btn')) {
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
            ) || this.avatarFile;
        }

        if (!this.originalData) return false;

        // Check for changes in form data
        const hasDataChanges = Object.keys(this.formData).some(key => {
            if (key === 'avatar') return false; // Handle avatar separately
            return this.formData[key] !== (this.originalData[key] || '');
        });

        return hasDataChanges || this.avatarChanged;
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

    /**
     * Validate avatar file
     * @param {File} file - File to validate
     * @returns {Object} Validation result
     */
    validateAvatarFile(file) {
        if (!file) {
            return { valid: false, error: 'Ingen fil valgt' };
        }

        // Check file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            return {
                valid: false,
                error: 'Ugyldig filtype. Kun JPG, PNG og WebP er tillatt.'
            };
        }

        // Check file size (10MB limit)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            return {
                valid: false,
                error: 'Filen er for stor. Maksimal størrelse er 10MB.'
            };
        }

        return { valid: true, error: null };
    }

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
        // Create optimistic employee object
        const optimisticEmployee = {
            id: `temp_${Date.now()}`, // Temporary ID
            name: this.formData.name.trim(),
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

            // Import employee service
            const { employeeService } = await import('./employeeService.js');

            // Prepare employee data
            const employeeData = {
                name: this.formData.name.trim(),
                email: this.formData.email.trim() || null,
                hourly_wage: this.formData.hourly_wage ? parseFloat(this.formData.hourly_wage) : null,
                tariff_level: this.formData.tariff_level !== undefined ? parseInt(this.formData.tariff_level) : 0,
                birth_date: this.formData.birth_date || null,
                display_color: this.formData.display_color
            };

            // Create employee on server
            const newEmployee = await employeeService.createEmployee(employeeData);

            // Upload avatar if provided
            if (this.avatarFile) {
                try {
                    await this.uploadAvatar(newEmployee.id);
                } catch (avatarError) {
                    console.warn('Avatar upload failed:', avatarError);
                    // Don't fail the entire operation for avatar upload
                }
            }

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

        if (this.formData.name.trim() !== (this.originalData.name || '')) {
            updateData.name = this.formData.name.trim();
        }

        if (this.formData.email.trim() !== (this.originalData.email || '')) {
            updateData.email = this.formData.email.trim() || null;
        }

        const newWage = this.formData.hourly_wage ? parseFloat(this.formData.hourly_wage) : null;
        if (newWage !== this.originalData.hourly_wage) {
            updateData.hourly_wage = newWage;
        }

        const newLevel = this.formData.tariff_level !== undefined ? parseInt(this.formData.tariff_level) : 0;
        if (newLevel !== (this.originalData.tariff_level ?? 0)) {
            updateData.tariff_level = newLevel;
        }

        if (this.formData.birth_date !== (this.originalData.birth_date || '')) {
            updateData.birth_date = this.formData.birth_date || null;
        }

        if (this.formData.display_color !== (this.originalData.display_color || '')) {
            updateData.display_color = this.formData.display_color;
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

            // Import employee service
            const { employeeService } = await import('./employeeService.js');

            // Update employee on server if there are changes
            let updatedEmployee = this.currentEmployee;
            if (Object.keys(updateData).length > 0) {
                updatedEmployee = await employeeService.updateEmployee(this.currentEmployee.id, updateData);
            }

            // Handle avatar changes
            if (this.avatarChanged) {
                if (this.avatarFile) {
                    try {
                        await this.uploadAvatar(this.currentEmployee.id);
                    } catch (avatarError) {
                        console.warn('Avatar upload failed:', avatarError);
                        // Don't fail the entire operation for avatar upload
                    }
                } else {
                    // Remove avatar from cache
                    this.app.employeeAvatarCache.delete(this.currentEmployee.id);
                }
            }

            // Replace optimistic update with real data
            if (Object.keys(updateData).length > 0) {
                this.app.employees[employeeIndex] = updatedEmployee;
                this.app.onEmployeesLoaded();
            }

            // Show success message
            this.showSuccess(`${updatedEmployee.name} ble oppdatert`);

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
    async uploadAvatar(employeeId) {
        if (!this.avatarFile) return;

        try {
            // Import employee service
            const { employeeService } = await import('./employeeService.js');

            // Upload avatar
            const avatarUrl = await employeeService.uploadAvatar(employeeId, this.avatarFile);

            // Update cache
            this.app.employeeAvatarCache.set(employeeId, {
                url: avatarUrl,
                timestamp: Date.now()
            });

            console.log('Avatar uploaded successfully:', avatarUrl);

        } catch (error) {
            console.error('Error uploading avatar:', error);
            // Don't throw here - avatar upload failure shouldn't fail the entire operation
            this.showError('Ansatt ble lagret, men avatar kunne ikke lastes opp: ' + error.message);
        }
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

    // ===== AVATAR PROCESSING =====

    /**
     * Process avatar file with optional cropping
     * @param {File} file - Image file to process
     * @returns {Promise<Blob>} Processed image blob
     */
    async processAvatarFile(file) {
        try {
            // Check if we have image processing utilities
            if (window.imageUtils) {
                // Use existing image processing utilities
                return await window.imageUtils.compressImage(file, {
                    maxWidth: 400,
                    maxHeight: 400,
                    quality: 0.8,
                    format: 'jpeg'
                });
            } else {
                // Fallback: return original file
                return file;
            }
        } catch (error) {
            console.warn('Error processing avatar file:', error);
            return file; // Return original file as fallback
        }
    }

    /**
     * Show avatar cropping modal (if cropping library is available)
     * @param {File} file - Image file to crop
     */
    async showAvatarCropping(file) {
        // This would integrate with a cropping library like Cropper.js
        // For now, we'll use the file directly
        return file;
    }

    /**
     * Generate avatar initials from name
     * @param {string} name - Employee name
     * @returns {string} Initials
     */
    generateAvatarInitials(name) {
        if (!name || name.trim().length === 0) return '?';

        const names = name.trim().split(/\s+/);
        if (names.length === 1) {
            return names[0].substring(0, 2).toUpperCase();
        }

        return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }

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
