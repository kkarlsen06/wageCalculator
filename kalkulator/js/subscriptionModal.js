// Subscription Modal Component
// - Creates a modal matching existing .modal styling
// - Fetches current user's subscription from Supabase view 'subscription_tiers'
// - Provides upgrade buttons that call window.startCheckout

import { getUserId } from '../../src/lib/auth/getUserId.js';

export class SubscriptionModal {
  constructor() {
    this.modal = null;
    this.statusEl = null;
    this.periodEl = null;
    this.planEl = null;
    this.currentTier = null;
    this.isActive = false;
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
          <div id="subscriptionPlan" style="color: var(--text-secondary); margin-top: 4px;"></div>
          <div id="subscriptionThanks" style="display:none; margin-top: 12px; color: var(--text-secondary); align-items: center; gap: 8px;">
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
    // Hide all action buttons initially to avoid flicker while loading state
    if (this.proBtn) this.proBtn.style.display = 'none';
    if (this.maxBtn) this.maxBtn.style.display = 'none';
    // manageBtn is already hidden via inline style in markup

    this.proBtn?.addEventListener('click', async () => {
      if (!window.startCheckout || !this.proBtn) return;
      const btn = this.proBtn;
      const wasDisabled = btn.disabled;
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      try {
        await window.startCheckout('price_1RzQ85Qiotkj8G58AO6st4fh', { mode: 'subscription' });
      } catch (_) {
        // ErrorHelper in startCheckout already shows a toast; swallow to avoid unhandled rejection
      } finally {
        btn.removeAttribute('aria-busy');
        btn.disabled = wasDisabled;
      }
    });
    this.maxBtn?.addEventListener('click', async () => {
      if (!this.maxBtn) return;
      const btn = this.maxBtn;
      const wasDisabled = btn.disabled;
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      try {
        // If currently on Pro, open Billing Portal deep link to update existing sub
        if (this.currentTier === 'pro' && window.startPortalUpgrade) {
          await window.startPortalUpgrade({ redirect: true });
        } else if (window.startCheckout) {
          // If no active sub, create Max via Checkout
          await window.startCheckout('price_1RzQC1Qiotkj8G58tYo4U5oO', { mode: 'subscription' });
        }
      } catch (e) {
        // Fallback: open general Billing Portal if upgrade deep-link fails (e.g. config not enabled)
        console.warn('[sub] portal upgrade failed, falling back to billing portal', e);
        try {
          if (this.currentTier === 'pro' && window.startBillingPortal) {
            await window.startBillingPortal({ redirect: true });
          }
        } catch (_) { /* swallow */ }
      } finally {
        btn.removeAttribute('aria-busy');
        btn.disabled = wasDisabled;
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
    this.planEl = modal.querySelector('#subscriptionPlan');

    document.body.appendChild(modal);
    this.modal = modal;

    // Listen for global subscription state updates to re-render while open
    this._onSubUpdated = () => this.updateFromGlobalState();
    document.addEventListener('subscription:updated', this._onSubUpdated);
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

    // If we already have global state (e.g., after portal return), render immediately
    this.updateFromGlobalState();

    // Load subscription info as a fallback
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

  updateFromGlobalState() {
    if (!this.modal) return;
    const row = window.SubscriptionState || null;
    if (!row) {
      if (this.statusEl) this.statusEl.textContent = 'Ingen aktivt abonnement';
      if (this.periodEl) this.periodEl.textContent = '';
      if (this.planEl) this.planEl.textContent = '';
      if (this.thanksEl) this.thanksEl.style.display = 'none';
      if (this.manageBtn) this.manageBtn.style.display = 'none';
      if (this.proBtn) this.proBtn.style.display = '';
      if (this.maxBtn) this.maxBtn.style.display = '';
      this.currentTier = null;
      this.isActive = false;
      return;
    }
    const status = row.status || 'ukjent';
    const endRaw = row.current_period_end;
    const dateObj = typeof endRaw === 'number' ? new Date(endRaw * 1000) : (endRaw ? new Date(endRaw) : null);
    const formatted = dateObj && !isNaN(dateObj) ? dateObj.toLocaleDateString('no-NO') : null;
    const isActive = !!row.is_active;
    const tier = String(row.tier || '').toLowerCase();
    const plan = tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : null;

    this.currentTier = tier || null;
    this.isActive = isActive;

    if (this.statusEl) this.statusEl.textContent = `Status: ${status}${plan ? ` (${plan})` : ''}`;
    if (this.periodEl) this.periodEl.textContent = formatted ? `Neste faktureringsdato: ${formatted}` : '';
    if (this.planEl) this.planEl.textContent = plan ? `Plan: ${plan}` : '';
    if (this.thanksEl) this.thanksEl.style.display = isActive ? 'flex' : 'none';

    if (!isActive) {
      if (this.manageBtn) this.manageBtn.style.display = 'none';
      if (this.proBtn) this.proBtn.style.display = '';
      if (this.maxBtn) this.maxBtn.style.display = '';
    } else if (tier === 'pro') {
      if (this.manageBtn) this.manageBtn.style.display = '';
      if (this.proBtn) this.proBtn.style.display = 'none';
      if (this.maxBtn) this.maxBtn.style.display = '';
    } else if (tier === 'max') {
      if (this.manageBtn) this.manageBtn.style.display = '';
      if (this.proBtn) this.proBtn.style.display = 'none';
      if (this.maxBtn) this.maxBtn.style.display = 'none';
    } else {
      if (this.manageBtn) this.manageBtn.style.display = '';
      if (this.proBtn) this.proBtn.style.display = 'none';
      if (this.maxBtn) this.maxBtn.style.display = 'none';
    }
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

      // Fetch subscription tier from Supabase view
      const { data, error } = await window.supa
        .from('subscription_tiers')
        .select('status,price_id,tier,is_active,current_period_end,updated_at')
        .eq('user_id', userId);

      if (error) {
        console.error('[subscription] fetch error:', error);
        if (this.statusEl) this.statusEl.textContent = 'Kunne ikke hente abonnement.';
        return;
      }

      const row = Array.isArray(data) && data.length ? data[0] : null;
      if (import.meta?.env?.DEV || window.CONFIG?.debug) {
        console.log('[subscription_tiers] raw row:', row);
      }
      if (!row) {
        if (this.statusEl) this.statusEl.textContent = 'Ingen aktivt abonnement';
        if (this.periodEl) this.periodEl.textContent = '';
        if (this.planEl) this.planEl.textContent = '';
        if (this.thanksEl) this.thanksEl.style.display = 'none';
        if (this.manageBtn) this.manageBtn.style.display = 'none';
        if (this.proBtn) this.proBtn.style.display = '';
        if (this.maxBtn) this.maxBtn.style.display = '';
        return;
      }

      const status = row.status || 'ukjent';
      const endRaw = row.current_period_end;
      const dateObj = typeof endRaw === 'number'
        ? new Date(endRaw * 1000)
        : (endRaw ? new Date(endRaw) : null);
      const formatted = dateObj && !isNaN(dateObj) ? dateObj.toLocaleDateString('no-NO') : null;

      const isActive = !!row.is_active;
      const tier = String(row.tier || '').toLowerCase();
      const plan = tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : null;

      // Remember current tier for button logic
      this.currentTier = tier || null;

      // Update UI
      if (this.statusEl) this.statusEl.textContent = `Status: ${status}${plan ? ` (${plan})` : ''}`;
      if (this.periodEl) this.periodEl.textContent = formatted ? `Neste faktureringsdato: ${formatted}` : '';
      if (this.planEl) this.planEl.textContent = plan ? `Plan: ${plan}` : '';

      // Show thanks heart if active
      if (this.thanksEl) this.thanksEl.style.display = isActive ? 'flex' : 'none';

      // Buttons per requirements:
      // - tier = 'pro' and active → show Manage + offer upgrade to Max
      // - tier = 'max' and active → show Manage only
      // - is_active = false → show both upgrade options
      if (!isActive) {
        if (this.manageBtn) this.manageBtn.style.display = 'none';
        if (this.proBtn) this.proBtn.style.display = '';
        if (this.maxBtn) this.maxBtn.style.display = '';
      } else if (tier === 'pro') {
        if (this.manageBtn) this.manageBtn.style.display = '';
        if (this.proBtn) this.proBtn.style.display = 'none';
        if (this.maxBtn) this.maxBtn.style.display = '';
      } else if (tier === 'max') {
        if (this.manageBtn) this.manageBtn.style.display = '';
        if (this.proBtn) this.proBtn.style.display = 'none';
        if (this.maxBtn) this.maxBtn.style.display = 'none';
      } else {
        // Active but unknown tier: default to manage only
        if (this.manageBtn) this.manageBtn.style.display = '';
        if (this.proBtn) this.proBtn.style.display = 'none';
        if (this.maxBtn) this.maxBtn.style.display = 'none';
      }
    } catch (e) {
      console.error('[subscription] exception:', e);
      if (this.statusEl) this.statusEl.textContent = 'Kunne ikke hente abonnement.';
      if (this.periodEl) this.periodEl.textContent = '';
    }
  }
}
