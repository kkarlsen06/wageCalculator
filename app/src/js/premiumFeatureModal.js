import { deleteShiftsOutsideMonth } from './subscriptionValidator.js';
import { ConfirmationDialog } from './confirmationDialog.js';
import { getUserId } from '/src/lib/auth/getUserId.js';

export class PremiumFeatureModal {
  constructor() {
    this.modal = null;
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
      document.body.classList.add('modal-open');
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

  async showSubscriptionModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `
      <div class="modal-content subscription-modal-content">
        <div class="modal-header">
          <div class="modal-header-content">
            <h2 class="modal-title">Abonnementsadministrasjon</h2>
            <p class="modal-subtitle">Administrer ditt profesjonelle abonnement</p>
          </div>
          <button type="button" class="modal-close-btn" aria-label="Lukk">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div class="modal-loading" id="modalLoading">
          <div class="loading-content">
            <div class="loading-spinner">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
              </svg>
            </div>
            <p class="loading-text">Henter abonnementsinformasjon...</p>
          </div>
        </div>
        
        <div class="modal-body" id="modalContent" style="display: none;">
          <div class="subscription-status-card">
            <div class="status-header">
              <svg class="status-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9 12l2 2 4-4"></path>
              </svg>
              <div id="subscriptionStatus" class="status-text"></div>
            </div>
            <div class="status-details">
              <div id="subscriptionPeriod" class="period-info"></div>
              <div id="subscriptionPlan" class="plan-info"></div>
            </div>
          </div>
          
          <div class="subscription-plans" id="subscriptionPlans">
            <h4>Tilgjengelige planer</h4>
            <div class="plans-grid">
              <div class="plan-card free-plan">
                <div class="plan-header">
                  <h5>Gratis</h5>
                  <div class="plan-price">Alltid gratis</div>
                </div>
                <div class="plan-features">
                  <span class="feature">Lagre vakter i én måned</span>
                  <span class="feature">Grunnleggende rapporter</span>
                  <span class="feature">Enkel vaktplanlegging</span>
                  <span class="feature feature-limitation">Kun én måned med vakter om gangen</span>
                </div>
              </div>
              
              <div class="plan-card pro-plan">
                <div class="plan-header">
                  <h5>Professional</h5>
                  <div class="plan-price">Pro-nivå</div>
                </div>
                <div class="plan-features">
                  <span class="feature">Ubegrenset vakter</span>
                  <span class="feature">Alle måneder tilgjengelig</span>
                  <span class="feature">Avanserte rapporter</span>
                  <span class="feature">Prioritert støtte</span>
                </div>
              </div>
              
              <div class="plan-card max-plan">
                <div class="plan-header">
                  <h5>Enterprise</h5>
                  <div class="plan-price">For bedrifter</div>
                </div>
                <div class="plan-features">
                  <span class="feature">Alle Pro-funksjoner</span>
                  <span class="feature">Ansattadministrasjon</span>
                  <span class="feature">Lønnsberegning for ansatte</span>
                  <span class="feature">Avansert rapportering</span>
                  <span class="feature">Dedikert støtte</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer" id="modalFooter" style="display: none;">
          <div class="modal-footer-buttons">
            <button type="button" class="btn btn-secondary" id="upgradeProBtn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
              </svg>
              Oppgrader til Professional
            </button>
            <button type="button" class="btn btn-primary" id="upgradeMaxBtn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
              </svg>
              Oppgrader til Enterprise
            </button>
            <button type="button" class="btn btn-outline" id="manageSubBtn" style="display:none;">
              Administrer abonnement
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close handlers
    const closeBtn = modal.querySelector('.modal-close-btn');
    closeBtn?.addEventListener('click', () => {
      modal.classList.remove('active');
      document.body.classList.remove('modal-open');
      modal.style.display = 'none';
      modal.remove();
    });
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
        document.body.classList.remove('modal-open');
        modal.style.display = 'none';
        modal.remove();
      }
    });

    // Button handlers
    const proBtn = modal.querySelector('#upgradeProBtn');
    const maxBtn = modal.querySelector('#upgradeMaxBtn');
    const manageBtn = modal.querySelector('#manageSubBtn');

    proBtn?.addEventListener('click', async () => {
      if (!window.startCheckout) return;
      try {
        await window.startCheckout('price_1RzQ85Qiotkj8G58AO6st4fh', { mode: 'subscription' });
      } catch (e) {
        console.error('Checkout error:', e);
      }
    });

    maxBtn?.addEventListener('click', async () => {
      try {
        if (window.startCheckout) {
          await window.startCheckout('price_1RzQC1Qiotkj8G58tYo4U5oO', { mode: 'subscription' });
        }
      } catch (e) {
        console.error('Checkout error:', e);
      }
    });

    manageBtn?.addEventListener('click', async () => {
      try {
        if (window.startBillingPortal) {
          await window.startBillingPortal({ redirect: true });
        }
      } catch (e) {
        console.error('Billing portal error:', e);
      }
    });

    // Show modal
    modal.style.display = 'flex';
    modal.classList.add('active');
    document.body.classList.add('modal-open');

    // Load subscription data
    try {
      const userId = await getUserId();
      if (userId && window.supa) {
        const { data } = await window.supa
          .from('subscription_tiers')
          .select('status,tier,is_active,current_period_end')
          .eq('user_id', userId);

        const loadingEl = modal.querySelector('#modalLoading');
        const contentEl = modal.querySelector('#modalContent');
        const footerEl = modal.querySelector('#modalFooter');

        // Hide loading, show content
        if (loadingEl) loadingEl.style.display = 'none';
        if (contentEl) contentEl.style.display = 'block';
        if (footerEl) footerEl.style.display = 'block';

        const row = Array.isArray(data) && data.length ? data[0] : null;
        const statusEl = modal.querySelector('#subscriptionStatus');
        const periodEl = modal.querySelector('#subscriptionPeriod');
        const planEl = modal.querySelector('#subscriptionPlan');

        if (row) {
          const status = row.status || 'ukjent';
          const tier = String(row.tier || '').toLowerCase();
          const plan = tier === 'max' ? 'Enterprise' : (tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : null);
          
          if (statusEl) statusEl.textContent = `${status.charAt(0).toUpperCase()}${status.slice(1)}${plan ? ` - ${plan}` : ''}`;
          if (periodEl && row.current_period_end) {
            const date = new Date(typeof row.current_period_end === 'number' ? row.current_period_end * 1000 : row.current_period_end);
            if (!isNaN(date)) {
              periodEl.textContent = `Neste fornyelse: ${date.toLocaleDateString('no-NO')}`;
            }
          }
          if (planEl) planEl.textContent = plan ? 'Takk for abonnementet!' : '';
        } else {
          if (statusEl) statusEl.textContent = 'Gratis plan';
          if (periodEl) periodEl.textContent = 'Du kan lagre vakter i én måned om gangen';
          if (planEl) planEl.textContent = 'Se abonnementene nedenfor. Abonner for tilgang til flere funksjoner!';
        }
      }
    } catch (e) {
      console.error('Error loading subscription:', e);
    }
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
    document.body.classList.remove('modal-open');

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
        await modal.showSubscriptionModal();
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