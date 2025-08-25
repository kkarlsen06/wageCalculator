import { SubscriptionModal } from './subscriptionModal.js';
import { deleteShiftsOutsideMonth } from './subscriptionValidator.js';
import { ConfirmationDialog } from './confirmationDialog.js';

export class PremiumFeatureModal {
  constructor() {
    this.modal = null;
    this.subscriptionModal = null;
    this.confirmationDialog = null;
    this.currentResolve = null;
    this.isVisible = false;
    this.currentMonth = null;
  }

  /**
   * Shows the premium feature modal
   * @param {Object} options - Modal options
   * @param {Array<string>} options.otherMonths - Other months with shifts that need to be deleted
   * @param {string} options.currentMonth - Current month (YYYY-MM) to keep
   * @returns {Promise<'upgrade'|'delete'|'cancel'>}
   */
  async show(options = {}) {
    const { otherMonths = [], currentMonth } = options;
    
    // Store currentMonth for later use in deletion
    this.currentMonth = currentMonth;
    
    return new Promise((resolve) => {
      this.currentResolve = resolve;
      this.createModal(otherMonths, currentMonth);
      this.attachEventListeners();
      this.isVisible = true;
    });
  }

  createModal(otherMonths, currentMonth) {
    if (this.modal) {
      this.modal.remove();
    }

    const modal = document.createElement('div');
    modal.className = 'modal premium-feature-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    const monthNames = {
      '01': 'januar', '02': 'februar', '03': 'mars', '04': 'april',
      '05': 'mai', '06': 'juni', '07': 'juli', '08': 'august',
      '09': 'september', '10': 'oktober', '11': 'november', '12': 'desember'
    };

    const formatMonth = (monthStr) => {
      const [year, month] = monthStr.split('-');
      return `${monthNames[month]} ${year}`;
    };

    const otherMonthsList = otherMonths.map(month => 
      `<li class="month-item">${formatMonth(month)}</li>`
    ).join('');

    modal.innerHTML = `
      <div class="modal-content premium-feature-content">
        <div class="modal-header">
          <div class="premium-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
            </svg>
          </div>
          <h2 class="modal-title">Premium-funksjon</h2>
        </div>
        
        <div class="modal-description">
          <p>Du har funnet en premium-funksjon. Oppgrader til et abonnement eller slett alle vakter i de andre månedene.</p>
        </div>
        
        <div class="modal-body">
          <div class="limitation-info">
            <div class="info-card">
              <div class="info-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>Gratis-plan begrensning</span>
              </div>
              <p>Gratis-planen tillater kun vakter i én måned om gangen. Du har allerede vakter i:</p>
              <ul class="months-list">
                ${otherMonthsList}
              </ul>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <div class="modal-footer-buttons">
            <button type="button" class="btn btn-outline" id="cancelBtn">
              Avbryt
            </button>
            <button type="button" class="btn btn-secondary" id="deleteShiftsBtn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3,6 5,6 21,6"></polyline>
                <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
              Slett andre
            </button>
            <button type="button" class="btn btn-primary" id="upgradeBtn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
              </svg>
              Oppgrader
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modal = modal;

    // Show modal with smooth animation
    requestAnimationFrame(() => {
      modal.classList.add('active');
    });
  }

  attachEventListeners() {
    if (!this.modal) return;

    const cancelBtn = this.modal.querySelector('#cancelBtn');
    const deleteBtn = this.modal.querySelector('#deleteShiftsBtn');
    const upgradeBtn = this.modal.querySelector('#upgradeBtn');

    // Cancel button
    cancelBtn?.addEventListener('click', () => {
      this.resolve('cancel');
    });

    // Delete shifts button
    deleteBtn?.addEventListener('click', async () => {
      await this.handleDeleteShifts();
    });

    // Upgrade button
    upgradeBtn?.addEventListener('click', () => {
      this.handleUpgrade();
    });

    // Click outside to close
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.resolve('cancel');
      }
    });

    // Escape key
    document.addEventListener('keydown', this.handleKeyDown);
  }

  handleKeyDown = (e) => {
    if (e.key === 'Escape' && this.isVisible) {
      this.resolve('cancel');
    }
  }

  async handleDeleteShifts() {
    if (!this.confirmationDialog) {
      this.confirmationDialog = new ConfirmationDialog();
    }

    const confirmed = await this.confirmationDialog.show({
      title: 'Slett vakter',
      message: 'Er du sikker på at du vil slette alle vakter i de andre månedene? Denne handlingen kan ikke angres.',
      confirmText: 'Ja, slett vaktene',
      cancelText: 'Avbryt',
      type: 'danger'
    });

    if (confirmed) {
      // Perform deletion immediately after confirmation
      try {
        // Get currentMonth from the data stored when modal was created
        const currentMonth = this.currentMonth;
        if (!currentMonth) {
          console.error('Current month not available for deletion');
          return;
        }

        const result = await deleteShiftsOutsideMonth(currentMonth);
        if (result.success) {
          // Show success message
          const message = result.deletedCount === 1 
            ? 'Slettet 1 vakt i andre måneder'
            : `Slettet ${result.deletedCount} vakter i andre måneder`;
          
          console.log(message);
          
          // Trigger UI refresh to update the interface immediately
          if (window.app && window.app.refreshUI) {
            // Reload user shifts from the server to get fresh data
            try {
              await this.reloadUserShifts();
            } catch (error) {
              console.error('Failed to reload shifts after deletion:', error);
              // Still resolve with success since deletion worked
            }
          }
          
          this.resolve('delete_completed');
        } else {
          console.error('Failed to delete shifts:', result.error);
          alert('Kunne ikke slette vakter. Prøv igjen.');
        }
      } catch (error) {
        console.error('Error deleting shifts:', error);
        alert('Systemfeil ved sletting av vakter.');
      }
    }
  }

  handleUpgrade() {
    this.resolve('upgrade');
  }

  async reloadUserShifts() {
    try {
      // Get fresh authentication token
      const { data: { session } } = await window.supa.auth.getSession();
      if (!session) {
        console.warn('No session available for refreshing shifts');
        return;
      }

      // Fetch fresh shift data from the server
      const response = await fetch(`${window.CONFIG.apiBase}/shifts`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Convert server data to app format
      const shifts = result.shifts || [];
      const formattedShifts = shifts.map(shift => ({
        id: shift.id,
        date: new Date(shift.shift_date),
        startTime: shift.start_time,
        endTime: shift.end_time,
        shiftType: shift.shift_type || 'regular',
        employee_id: shift.employee_id || null
      }));

      // Update app data and refresh UI
      if (window.app) {
        window.app.userShifts = [...formattedShifts];
        window.app.shifts = [...formattedShifts];
        window.app.refreshUI(formattedShifts);
      }

      console.log(`Reloaded ${formattedShifts.length} shifts after deletion`);
    } catch (error) {
      console.error('Error reloading user shifts:', error);
      throw error;
    }
  }

  resolve(action) {
    if (!this.isVisible) return;
    
    this.isVisible = false;
    this.hide();
    
    if (this.currentResolve) {
      this.currentResolve(action);
      this.currentResolve = null;
    }
  }

  hide() {
    if (!this.modal) return;

    this.modal.classList.remove('active');
    
    // Remove event listeners
    document.removeEventListener('keydown', this.handleKeyDown);
    
    // Remove modal after animation
    setTimeout(() => {
      if (this.modal) {
        this.modal.remove();
        this.modal = null;
      }
    }, 300);
  }

  /**
   * Shows the premium feature modal and handles the user's choice
   * @param {Object} options - Modal options
   * @returns {Promise<boolean>} True if action was completed successfully
   */
  static async showAndHandle(options = {}) {
    const modal = new PremiumFeatureModal();
    const choice = await modal.show(options);
    
    switch (choice) {
      case 'upgrade':
        // Open subscription modal
        if (!modal.subscriptionModal) {
          modal.subscriptionModal = new SubscriptionModal();
        }
        await modal.subscriptionModal.show();
        return false; // User chose to upgrade, shift creation should wait

      case 'delete_completed':
        // Deletion was already handled in handleDeleteShifts
        return true; // Allow shift creation to proceed

      case 'cancel':
      default:
        return false; // User cancelled, don't proceed with shift creation
    }
  }
}