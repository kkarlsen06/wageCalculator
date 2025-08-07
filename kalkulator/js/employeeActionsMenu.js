/**
 * Employee Actions Menu Component
 * Context menu for employee actions (Edit, Archive, Color, Upload avatar)
 * Mobile-first design with proper touch handling and accessibility
 */

export class EmployeeActionsMenu {
    constructor(app) {
        this.app = app;
        this.currentMenu = null;
        this.currentEmployeeId = null;
        this.isVisible = false;
        
        // Bind methods
        this.handleDocumentClick = this.handleDocumentClick.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleResize = this.handleResize.bind(this);
    }

    /**
     * Show actions menu for an employee
     * @param {string} employeeId - Employee ID
     * @param {HTMLElement} triggerElement - Element that triggered the menu
     * @param {Object} options - Additional options
     */
    show(employeeId, triggerElement, options = {}) {
        try {
            // Hide any existing menu
            this.hide();

            const employee = this.app.employees.find(emp => emp.id === employeeId);
            if (!employee) {
                console.error('Employee not found:', employeeId);
                return;
            }

            this.currentEmployeeId = employeeId;
            this.createMenu(employee, triggerElement, options);
            this.attachEventListeners();
            this.isVisible = true;

            // Announce to screen readers
            this.announceMenuOpen(employee.name);

        } catch (error) {
            console.error('Error showing employee actions menu:', error);
        }
    }

    /**
     * Hide the actions menu
     */
    hide() {
        if (this.currentMenu) {
            this.currentMenu.remove();
            this.currentMenu = null;
        }
        
        this.removeEventListeners();
        this.currentEmployeeId = null;
        this.isVisible = false;
    }

    /**
     * Create the menu DOM structure
     */
    createMenu(employee, triggerElement, options) {
        // Create menu container
        this.currentMenu = document.createElement('div');
        this.currentMenu.className = 'employee-actions-menu';
        this.currentMenu.setAttribute('role', 'menu');
        this.currentMenu.setAttribute('aria-label', `Handlinger for ${employee.name}`);
        
        // Create menu items
        const menuItems = this.createMenuItems(employee);
        this.currentMenu.innerHTML = `
            <div class="menu-header">
                <div class="menu-employee-info">
                    <div class="menu-employee-avatar" style="--employee-color: ${this.app.getEmployeeDisplayColor(employee)}">
                        ${this.getEmployeeAvatarContent(employee)}
                    </div>
                    <div class="menu-employee-name">${employee.name}</div>
                </div>
                <button class="menu-close-btn" aria-label="Lukk meny">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div class="menu-items">
                ${menuItems}
            </div>
        `;

        // Position the menu
        this.positionMenu(triggerElement, options);
        
        // Add to DOM
        document.body.appendChild(this.currentMenu);
        
        // Focus first menu item
        setTimeout(() => {
            const firstItem = this.currentMenu.querySelector('.menu-item');
            if (firstItem) {
                firstItem.focus();
            }
        }, 100);
    }

    /**
     * Create menu items HTML
     */
    createMenuItems(employee) {
        const items = [
            {
                id: 'edit',
                icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>`,
                label: 'Rediger',
                description: 'Rediger ansattinformasjon'
            },
            {
                id: 'avatar',
                icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21,15 16,10 5,21"></polyline>
                </svg>`,
                label: 'Endre bilde',
                description: 'Last opp profilbilde'
            },
            {
                id: 'color',
                icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="13.5" cy="6.5" r=".5"></circle>
                    <circle cx="17.5" cy="10.5" r=".5"></circle>
                    <circle cx="8.5" cy="7.5" r=".5"></circle>
                    <circle cx="6.5" cy="12.5" r=".5"></circle>
                    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"></path>
                </svg>`,
                label: 'Endre farge',
                description: 'Velg visningsfarge'
            },
            {
                id: 'archive',
                icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3,6 5,6 21,6"></polyline>
                    <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>`,
                label: employee.archived_at ? 'Gjenopprett' : 'Arkiver',
                description: employee.archived_at ? 'Gjenopprett ansatt' : 'Arkiver ansatt',
                className: 'destructive'
            }
        ];

        return items.map(item => `
            <button class="menu-item ${item.className || ''}" 
                    data-action="${item.id}" 
                    role="menuitem"
                    aria-describedby="desc-${item.id}">
                <div class="menu-item-icon">${item.icon}</div>
                <div class="menu-item-content">
                    <div class="menu-item-label">${item.label}</div>
                    <div class="menu-item-description" id="desc-${item.id}">${item.description}</div>
                </div>
            </button>
        `).join('');
    }

    /**
     * Get employee avatar content for menu header
     */
    getEmployeeAvatarContent(employee) {
        // This will be enhanced when avatar loading is implemented
        const initials = this.app.getEmployeeInitials(employee);
        return `<div class="avatar-initials">${initials}</div>`;
    }

    /**
     * Position the menu relative to trigger element
     */
    positionMenu(triggerElement, options) {
        const rect = triggerElement.getBoundingClientRect();
        const menuWidth = 280;
        const menuHeight = 320;
        const padding = 16;
        
        let left = rect.left;
        let top = rect.bottom + 8;
        
        // Adjust horizontal position if menu would go off-screen
        if (left + menuWidth > window.innerWidth - padding) {
            left = window.innerWidth - menuWidth - padding;
        }
        if (left < padding) {
            left = padding;
        }
        
        // Adjust vertical position if menu would go off-screen
        if (top + menuHeight > window.innerHeight - padding) {
            top = rect.top - menuHeight - 8;
        }
        if (top < padding) {
            top = padding;
        }
        
        this.currentMenu.style.left = `${left}px`;
        this.currentMenu.style.top = `${top}px`;
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Close menu on outside click
        document.addEventListener('click', this.handleDocumentClick, true);
        
        // Handle keyboard navigation
        document.addEventListener('keydown', this.handleKeyDown);
        
        // Handle window resize
        window.addEventListener('resize', this.handleResize);
        
        // Handle menu item clicks
        if (this.currentMenu) {
            this.currentMenu.addEventListener('click', this.handleMenuClick.bind(this));
        }
    }

    /**
     * Remove event listeners
     */
    removeEventListeners() {
        document.removeEventListener('click', this.handleDocumentClick, true);
        document.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('resize', this.handleResize);
    }

    /**
     * Handle document click (close menu if clicked outside)
     */
    handleDocumentClick(e) {
        if (this.currentMenu && !this.currentMenu.contains(e.target)) {
            this.hide();
        }
    }

    /**
     * Handle keyboard navigation
     */
    handleKeyDown(e) {
        if (!this.isVisible) return;
        
        switch (e.key) {
            case 'Escape':
                e.preventDefault();
                this.hide();
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.focusNextItem();
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.focusPreviousItem();
                break;
        }
    }

    /**
     * Handle window resize (reposition menu)
     */
    handleResize() {
        if (this.isVisible) {
            this.hide(); // Simple approach: close menu on resize
        }
    }

    /**
     * Handle menu item clicks
     */
    handleMenuClick(e) {
        const menuItem = e.target.closest('.menu-item');
        const closeBtn = e.target.closest('.menu-close-btn');
        
        if (closeBtn) {
            this.hide();
            return;
        }
        
        if (menuItem) {
            const action = menuItem.dataset.action;
            this.handleAction(action);
        }
    }

    /**
     * Handle menu actions
     */
    async handleAction(action) {
        try {
            const employee = this.app.employees.find(emp => emp.id === this.currentEmployeeId);
            if (!employee) return;

            this.hide(); // Close menu first

            switch (action) {
                case 'edit':
                    await this.handleEditEmployee(employee);
                    break;
                case 'avatar':
                    await this.handleChangeAvatar(employee);
                    break;
                case 'color':
                    await this.handleChangeColor(employee);
                    break;
                case 'archive':
                    await this.handleArchiveEmployee(employee);
                    break;
            }
        } catch (error) {
            console.error('Error handling menu action:', error);
        }
    }

    /**
     * Handle edit employee action
     */
    async handleEditEmployee(employee) {
        try {
            // Import employee modal
            const { EmployeeModal } = await import('./employeeModal.js');

            // Create or get existing modal instance
            if (!this.employeeModal) {
                this.employeeModal = new EmployeeModal(this.app);
            }

            // Show edit modal
            await this.employeeModal.showEdit(employee);

        } catch (error) {
            console.error('Error opening edit employee modal:', error);
            this.showError('Kunne ikke åpne redigeringsvindu');
        }
    }

    /**
     * Handle change avatar action
     */
    async handleChangeAvatar(employee) {
        try {
            // Import employee modal
            const { EmployeeModal } = await import('./employeeModal.js');

            // Create or get existing modal instance
            if (!this.employeeModal) {
                this.employeeModal = new EmployeeModal(this.app);
            }

            // Show edit modal with focus on avatar section
            await this.employeeModal.showEdit(employee);

            // Focus on avatar upload after modal is shown
            setTimeout(() => {
                const avatarUploadBtn = document.querySelector('.avatar-upload-btn');
                if (avatarUploadBtn) {
                    avatarUploadBtn.focus();
                    avatarUploadBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 200);

        } catch (error) {
            console.error('Error opening avatar upload:', error);
            this.showError('Kunne ikke åpne avatar-opplasting');
        }
    }

    /**
     * Handle change color action
     */
    async handleChangeColor(employee) {
        try {
            // Import employee modal
            const { EmployeeModal } = await import('./employeeModal.js');

            // Create or get existing modal instance
            if (!this.employeeModal) {
                this.employeeModal = new EmployeeModal(this.app);
            }

            // Show edit modal with focus on color section
            await this.employeeModal.showEdit(employee);

            // Focus on color picker after modal is shown
            setTimeout(() => {
                const colorInput = document.querySelector('#employeeColor');
                if (colorInput) {
                    colorInput.focus();
                    colorInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 200);

        } catch (error) {
            console.error('Error opening color picker:', error);
            this.showError('Kunne ikke åpne fargevalg');
        }
    }

    /**
     * Handle archive employee action
     */
    async handleArchiveEmployee(employee) {
        try {
            // Show confirmation dialog
            const confirmed = await this.showArchiveConfirmation(employee);
            if (!confirmed) return;

            // Import employee service
            const { employeeService } = await import('./employeeService.js');

            // Store original state for rollback
            const originalEmployee = { ...employee };
            const employeeIndex = this.app.employees.findIndex(emp => emp.id === employee.id);

            if (employeeIndex === -1) {
                throw new Error('Ansatt ikke funnet');
            }

            // Apply optimistic update
            const archivedEmployee = {
                ...employee,
                archived_at: new Date().toISOString(),
                _optimistic: true,
                _loading: true
            };

            this.app.employees[employeeIndex] = archivedEmployee;
            this.app.onEmployeesLoaded();

            try {
                // Archive on server
                await employeeService.archiveEmployee(employee.id);

                // Update with final state
                this.app.employees[employeeIndex] = {
                    ...archivedEmployee,
                    _optimistic: false,
                    _loading: false
                };
                this.app.onEmployeesLoaded();

                // Show success message
                this.showSuccess(`${employee.name} ble arkivert`);

            } catch (error) {
                // Rollback on failure
                this.app.employees[employeeIndex] = originalEmployee;
                this.app.onEmployeesLoaded();
                throw error;
            }

        } catch (error) {
            console.error('Error archiving employee:', error);
            this.showError(error.message || 'Kunne ikke arkivere ansatt');
        }
    }

    /**
     * Show archive confirmation dialog
     * @param {Object} employee - Employee to archive
     * @returns {Promise<boolean>} True if confirmed
     */
    async showArchiveConfirmation(employee) {
        try {
            // Import confirmation dialog
            const { confirmArchive } = await import('./confirmationDialog.js');

            // Show enhanced confirmation dialog
            return await confirmArchive(employee.name);

        } catch (error) {
            console.error('Error showing confirmation dialog:', error);

            // Fallback to basic confirm
            return new Promise((resolve) => {
                const confirmed = confirm(
                    `Er du sikker på at du vil arkivere ${employee.name}?\n\n` +
                    'Arkiverte ansatte vil ikke vises i listen, men historiske data bevares.'
                );
                resolve(confirmed);
            });
        }
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        // This could be enhanced with a toast notification system
        alert(message);
    }

    /**
     * Show success message
     * @param {string} message - Success message
     */
    showSuccess(message) {
        // This could be enhanced with a toast notification system
        console.log('Success:', message);

        if (window.showToast) {
            window.showToast(message, 'success');
        }
    }

    /**
     * Focus next menu item
     */
    focusNextItem() {
        const items = this.currentMenu.querySelectorAll('.menu-item');
        const currentIndex = Array.from(items).findIndex(item => item === document.activeElement);
        const nextIndex = (currentIndex + 1) % items.length;
        items[nextIndex].focus();
    }

    /**
     * Focus previous menu item
     */
    focusPreviousItem() {
        const items = this.currentMenu.querySelectorAll('.menu-item');
        const currentIndex = Array.from(items).findIndex(item => item === document.activeElement);
        const prevIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
        items[prevIndex].focus();
    }

    /**
     * Announce menu open to screen readers
     */
    announceMenuOpen(employeeName) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = `Handlingsmeny åpnet for ${employeeName}`;
        
        document.body.appendChild(announcement);
        setTimeout(() => announcement.remove(), 1000);
    }
}
