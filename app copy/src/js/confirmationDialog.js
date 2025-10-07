/**
 * Confirmation Dialog Component
 * Reusable confirmation dialog for destructive actions
 */

import { lockScroll, unlockScroll } from './utils/scrollLock.js';

export class ConfirmationDialog {
    constructor() {
        this.isVisible = false;
        this.currentResolve = null;
        this.modal = null;
        
        // Bind methods
        this.handleConfirm = this.handleConfirm.bind(this);
        this.handleCancel = this.handleCancel.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleClickOutside = this.handleClickOutside.bind(this);
    }

    /**
     * Show confirmation dialog
     * @param {Object} options - Dialog options
     * @param {string} options.title - Dialog title
     * @param {string} options.message - Dialog message
     * @param {string} options.confirmText - Confirm button text
     * @param {string} options.cancelText - Cancel button text
     * @param {string} options.type - Dialog type ('danger', 'warning', 'info')
     * @returns {Promise<boolean>} True if confirmed
     */
    async show(options = {}) {
        const {
            title = 'Bekreft handling',
            message = 'Er du sikker?',
            confirmText = 'Bekreft',
            cancelText = 'Avbryt',
            type = 'danger'
        } = options;

        return new Promise((resolve) => {
            this.currentResolve = resolve;
            this.createDialog(title, message, confirmText, cancelText, type);
            this.attachEventListeners();
            this.isVisible = true;
        });
    }

    /**
     * Hide the dialog
     */
    hide() {
        if (!this.isVisible) return;
        
        this.removeEventListeners();
        
        if (this.modal) {
            this.modal.classList.remove('active');
            unlockScroll();
            setTimeout(() => {
                if (this.modal && this.modal.parentNode) {
                    this.modal.remove();
                }
                this.modal = null;
            }, 300);
        }
        
        this.isVisible = false;
    }

    /**
     * Create the dialog DOM structure
     */
    createDialog(title, message, confirmText, cancelText, type) {
        // Remove existing dialog if any
        const existingDialog = document.getElementById('confirmationDialog');
        if (existingDialog) {
            existingDialog.remove();
        }

        this.modal = document.createElement('div');
        this.modal.id = 'confirmationDialog';
        this.modal.className = 'modal confirmation-modal';
        this.modal.innerHTML = this.getDialogHTML(type);

        const titleEl = this.modal.querySelector('.confirmation-title');
        const messageEl = this.modal.querySelector('.confirmation-message');
        const cancelBtn = this.modal.querySelector('.cancel-btn');
        const confirmBtn = this.modal.querySelector('.confirm-btn');

        if (titleEl) titleEl.textContent = title;
        if (messageEl) messageEl.textContent = message;
        if (cancelBtn) cancelBtn.textContent = cancelText;
        if (confirmBtn) confirmBtn.textContent = confirmText;

        document.body.appendChild(this.modal);
        
        // Trigger animation
        setTimeout(() => {
            this.modal.classList.add('active');
            lockScroll();
        }, 10);
    }

    /**
     * Get the dialog HTML structure
     */
    getDialogHTML(type) {
        const iconSVG = this.getIconSVG(type);

        return `
            <div class="modal-content confirmation-content ${type}">
                <div class="confirmation-header">
                    <div class="confirmation-icon ${type}">
                        ${iconSVG}
                    </div>
                    <h3 class="confirmation-title"></h3>
                </div>

                <div class="confirmation-body">
                    <p class="confirmation-message"></p>
                </div>

                <div class="confirmation-footer">
                    <button type="button" class="btn btn-secondary cancel-btn"></button>
                    <button type="button" class="btn btn-${type} confirm-btn"></button>
                </div>
            </div>
        `;
    }

    /**
     * Get icon SVG for dialog type
     */
    getIconSVG(type) {
        switch (type) {
            case 'danger':
                return `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                `;
            case 'warning':
                return `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                `;
            case 'info':
                return `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                `;
            default:
                return '';
        }
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        if (!this.modal) return;

        // Button clicks
        const confirmBtn = this.modal.querySelector('.confirm-btn');
        const cancelBtn = this.modal.querySelector('.cancel-btn');
        
        if (confirmBtn) {
            confirmBtn.addEventListener('click', this.handleConfirm);
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', this.handleCancel);
        }

        // Global event listeners
        document.addEventListener('keydown', this.handleKeyDown);
        this.modal.addEventListener('click', this.handleClickOutside);
        
        // Focus confirm button
        setTimeout(() => {
            if (confirmBtn) {
                confirmBtn.focus();
            }
        }, 100);
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
     * Handle confirm action
     */
    handleConfirm() {
        this.hide();
        if (this.currentResolve) {
            this.currentResolve(true);
            this.currentResolve = null;
        }
    }

    /**
     * Handle cancel action
     */
    handleCancel() {
        this.hide();
        if (this.currentResolve) {
            this.currentResolve(false);
            this.currentResolve = null;
        }
    }

    /**
     * Handle keyboard events
     */
    handleKeyDown(e) {
        if (!this.isVisible) return;
        
        switch (e.key) {
            case 'Escape':
                e.preventDefault();
                this.handleCancel();
                break;
            case 'Enter':
                e.preventDefault();
                this.handleConfirm();
                break;
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
}

// Create singleton instance
export const confirmationDialog = new ConfirmationDialog();

// Convenience functions
export const confirm = (message, title = 'Bekreft handling') => {
    return confirmationDialog.show({
        title,
        message,
        type: 'danger'
    });
};

export const confirmWarning = (message, title = 'Advarsel') => {
    return confirmationDialog.show({
        title,
        message,
        type: 'warning'
    });
};

export const confirmInfo = (message, title = 'Informasjon') => {
    return confirmationDialog.show({
        title,
        message,
        type: 'info'
    });
};

// Archive-specific confirmation
export const confirmArchive = (employeeName) => {
    return confirmationDialog.show({
        title: 'Arkiver ansatt',
        message: `Er du sikker på at du vil arkivere ${employeeName}?\n\nArkiverte ansatte vil ikke vises i listen, men historiske data bevares. Du kan gjenopprette ansatte senere hvis nødvendig.`,
        confirmText: 'Arkiver',
        cancelText: 'Avbryt',
        type: 'warning'
    });
};
