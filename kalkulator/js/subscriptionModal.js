// Subscription Modal Component
// - Creates a modal matching existing .modal styling
// - Fetches current user's subscription from Supabase 'subscriptions'
// - Provides upgrade buttons that call window.startCheckout

import { getUserId } from '../../src/lib/auth/getUserId.js';

export class SubscriptionModal {
  constructor() {
    this.modal = null;
    this.statusEl = null;
    this.periodEl = null;
  }

  createModal() {
    if (this.modal) return;
    const modal = document.createElement('div');
    modal.id = 'subscriptionModal';
    modal.className = 'modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `
      <div class="modal-content subscription-modal-content">
        <div class="modal-header">
          <div class="modal-header-content">
            <h2 class="modal-title">Ditt abonnement</h2>
          </div>
          <button type="button" class="modal-close-btn" aria-label="Lukk">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div id="subscriptionStatus" style="margin-bottom: 12px; font-weight: 500;">Laster abonnement…</div>
          <div id="subscriptionPeriod" style="color: var(--text-secondary);"></div>
          <div id="subscriptionThanks" style="display:none; margin-top: 12px; color: var(--text-secondary); display: flex; align-items: center; gap: 8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 21s-6.716-4.09-9.193-8.09C.806 10.11 2.292 6 6.07 6c2.097 0 3.34 1.317 3.93 2.26C10.59 7.317 11.833 6 13.93 6c3.777 0 5.263 4.11 3.263 6.91C18.716 16.91 12 21 12 21z"></path>
            </svg>
            <span>Tusen takk for at du abonnerer!</span>
          </div>
        </div>
        <div class="modal-footer">
          <div class="modal-footer-buttons">
            <button type="button" class="btn btn-secondary" id="upgradeProBtn">Oppgrader til Pro</button>
            <button type="button" class="btn btn-primary" id="upgradeMaxBtn">Oppgrader til Max</button>
              <button type="button" class="btn btn-secondary" id="manageSubBtn" style="display:none;">Administrer abonnement</button>
          </div>
        </div>
      </div>
    `;

    // Close handlers
    const closeBtn = modal.querySelector('.modal-close-btn');
    closeBtn?.addEventListener('click', () => this.hide());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.hide();
    });

    // Cache elements
    this.proBtn = modal.querySelector('#upgradeProBtn');
    this.maxBtn = modal.querySelector('#upgradeMaxBtn');
    this.manageBtn = modal.querySelector('#manageSubBtn');
    this.thanksEl = modal.querySelector('#subscriptionThanks');

    // Buttons
    this.proBtn?.addEventListener('click', () => {
      if (window.startCheckout) {
        window.startCheckout('price_1RzQ85Qiotkj8G58AO6st4fh', { mode: 'subscription' });
      }
    });
    this.maxBtn?.addEventListener('click', () => {
      if (window.startCheckout) {
        window.startCheckout('price_1RzQC1Qiotkj8G58tYo4U5oO', { mode: 'subscription' });
      }
    });
    this.manageBtn?.addEventListener('click', async () => {
      try {
        if (window.startBillingPortal) {
          this.manageBtn.classList.add('loading');
          await window.startBillingPortal({ redirect: true });
        }
      } finally {
        this.manageBtn.classList.remove('loading');
      }
    });

    this.statusEl = modal.querySelector('#subscriptionStatus');
    this.periodEl = modal.querySelector('#subscriptionPeriod');

    document.body.appendChild(modal);
    this.modal = modal;
  }

  async show() {
    this.createModal();
    if (!this.modal) return;
    // Hide floating action bar if present
    const floatingBar = document.querySelector('.floating-action-bar');
    const floatingBarBackdrop = document.querySelector('.floating-action-bar-backdrop');
    if (floatingBar) floatingBar.style.display = 'none';
    if (floatingBarBackdrop) floatingBarBackdrop.style.display = 'none';

    // Show modal centered like other modals
    this.modal.style.display = 'flex';
    this.modal.classList.add('active');
    // Load subscription info
    await this.loadSubscription();
  }

  hide() {
    if (!this.modal) return;
    this.modal.classList.remove('active');
    this.modal.style.display = 'none';
    // Restore floating action bar
    const floatingBar = document.querySelector('.floating-action-bar');
    const floatingBarBackdrop = document.querySelector('.floating-action-bar-backdrop');
    if (floatingBar) floatingBar.style.display = '';
    if (floatingBarBackdrop) floatingBarBackdrop.style.display = '';
  }

  async loadSubscription() {
    try {
      if (this.statusEl) this.statusEl.textContent = 'Laster abonnement…';
      if (this.periodEl) this.periodEl.textContent = '';

      if (!window.supa || !window.supa.auth) {
        if (this.statusEl) this.statusEl.textContent = 'Kunne ikke hente abonnement.';
        return;
      }

      const userId = await getUserId();
      if (!userId) {
        if (this.statusEl) this.statusEl.textContent = 'Ikke innlogget.';
        return;
      }

      // Fetch possible subscription row(s) for the user
      const { data, error } = await window.supa
        .from('subscriptions')
        .select('status,current_period_end')
        .eq('user_id', userId);

      if (error) {
        console.error('[subscription] fetch error:', error);
        if (this.statusEl) this.statusEl.textContent = 'Kunne ikke hente abonnement.';
        return;
      }

      const row = Array.isArray(data) && data.length ? data[0] : null;
      if (!row) {
        if (this.statusEl) this.statusEl.textContent = 'Ingen aktivt abonnement';
        if (this.periodEl) this.periodEl.textContent = '';
        return;
      }

      const status = row.status || 'ukjent';
      const endRaw = row.current_period_end;
      const dateObj = typeof endRaw === 'number'
        ? new Date(endRaw * 1000)
        : (endRaw ? new Date(endRaw) : null);
      const formatted = dateObj && !isNaN(dateObj) ? dateObj.toLocaleDateString('no-NO') : null;

      const isSubscribed = ['active', 'trialing', 'past_due', 'unpaid'].includes(String(status).toLowerCase());

      // Update UI
      if (this.statusEl) this.statusEl.textContent = `Status: ${status}`;
      if (this.periodEl) this.periodEl.textContent = formatted ? `Neste faktureringsdato: ${formatted}` : '';

      // Show thanks heart if subscribed
      if (this.thanksEl) this.thanksEl.style.display = isSubscribed ? 'flex' : 'none';

      // Toggle manage button visibility
      if (this.manageBtn) this.manageBtn.style.display = isSubscribed ? '' : 'none';

      // Disable upgrade buttons if already subscribed (no plan-tier info available client-side yet)
      if (this.proBtn) {
        if (isSubscribed) {
          this.proBtn.setAttribute('disabled', 'true');
          this.proBtn.title = 'Du har allerede et aktivt abonnement';
        } else {
          this.proBtn.removeAttribute('disabled');
          this.proBtn.title = '';
        }
      }
      if (this.maxBtn) {
        if (isSubscribed) {
          this.maxBtn.setAttribute('disabled', 'true');
          this.maxBtn.title = 'Du har allerede et aktivt abonnement';
        } else {
          this.maxBtn.removeAttribute('disabled');
          this.maxBtn.title = '';
        }
      }
    } catch (e) {
      console.error('[subscription] exception:', e);
      if (this.statusEl) this.statusEl.textContent = 'Kunne ikke hente abonnement.';
      if (this.periodEl) this.periodEl.textContent = '';
    }
  }
}
