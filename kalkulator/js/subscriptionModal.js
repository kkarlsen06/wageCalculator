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
        
        <!-- Loading state -->
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
        
        <!-- Main content - hidden initially -->
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
            <div id="subscriptionThanks" class="appreciation-message" style="display:none;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 21s-6.716-4.09-9.193-8.09C.806 10.11 2.292 6 6.07 6c2.097 0 3.34 1.317 3.93 2.26C10.59 7.317 11.833 6 13.93 6c3.777 0 5.263 4.11 3.263 6.91C18.716 16.91 12 21 12 21z"></path>
              </svg>
              <span>Takk for ditt verdsatte partnerskap</span>
            </div>
          </div>
          
          <div class="subscription-plans" id="subscriptionPlans" style="display:none;">
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
                </div>
                <div class="plan-limitation">
                  Kun én måned med vakter om gangen
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
        
        <!-- Footer - hidden initially -->
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

    // Close handlers
    const closeBtn = modal.querySelector('.modal-close-btn');
    closeBtn?.addEventListener('click', () => this.hide());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.hide();
    });

    // Cache elements
    this.loadingEl = modal.querySelector('#modalLoading');
    this.contentEl = modal.querySelector('#modalContent');
    this.footerEl = modal.querySelector('#modalFooter');
    this.proBtn = modal.querySelector('#upgradeProBtn');
    this.maxBtn = modal.querySelector('#upgradeMaxBtn');
    this.manageBtn = modal.querySelector('#manageSubBtn');
    this.thanksEl = modal.querySelector('#subscriptionThanks');
    this.plansEl = modal.querySelector('#subscriptionPlans');

    // Initially show loading state, hide content and footer
    if (this.loadingEl) this.loadingEl.style.display = 'flex';
    if (this.contentEl) this.contentEl.style.display = 'none';
    if (this.footerEl) this.footerEl.style.display = 'none';

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
    this.statusIcon = modal.querySelector('.status-icon');

    document.body.appendChild(modal);
    this.modal = modal;

    // Listen for global subscription state updates to re-render while open
    this._onSubUpdated = () => {
      // Don't await here to avoid blocking event handling, but handle errors gracefully
      this.updateFromGlobalState().catch(e => console.warn('[subscription] update error:', e));
    };
    document.addEventListener('subscription:updated', this._onSubUpdated);
  }

  async show() {
    this.createModal();
    if (!this.modal) return;
    
    // Reset loading timer for new modal session
    this._loadingStartTime = Date.now();
    
    // Hide floating action bar if present
    const floatingBar = document.querySelector('.floating-action-bar');
    const floatingBarBackdrop = document.querySelector('.floating-action-bar-backdrop');
    if (floatingBar) floatingBar.style.display = 'none';
    if (floatingBarBackdrop) floatingBarBackdrop.style.display = 'none';

    // Show modal centered like other modals
    this.modal.style.display = 'flex';
    this.modal.classList.add('active');

    // If we already have global state (e.g., after portal return), render immediately
    await this.updateFromGlobalState();

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

  async showContent(minDelay = 350) {
    // Ensure loading is visible for at least minDelay ms for better UX
    if (!this._loadingStartTime) {
      this._loadingStartTime = Date.now();
    }
    
    const elapsed = Date.now() - this._loadingStartTime;
    const remainingDelay = Math.max(0, minDelay - elapsed);
    
    if (remainingDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, remainingDelay));
    }
    
    // Hide loading and show content with smooth transition
    if (this.loadingEl) {
      this.loadingEl.style.display = 'none';
    }
    if (this.contentEl) {
      this.contentEl.style.display = 'block';
    }
    if (this.footerEl) {
      this.footerEl.style.display = 'block';
    }
  }

  async updateFromGlobalState() {
    if (!this.modal) return;
    
    // Show content and hide loading
    await this.showContent();
    
    const row = window.SubscriptionState || null;
    if (!row) {
      if (this.statusEl) this.statusEl.textContent = 'Gratis plan aktiv';
      if (this.periodEl) this.periodEl.textContent = 'Du kan lagre vakter i én måned om gangen';
      if (this.planEl) this.planEl.textContent = 'Aktuell plan: Gratis';
      if (this.thanksEl) this.thanksEl.style.display = 'none';
      if (this.plansEl) this.plansEl.style.display = 'block';
      if (this.manageBtn) this.manageBtn.style.display = 'none';
      if (this.proBtn) this.proBtn.style.display = '';
      if (this.maxBtn) this.maxBtn.style.display = '';
      if (this.statusIcon) this.statusIcon.style.color = 'var(--success)';
      this.currentTier = 'free';
      this.isActive = true;
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

    if (this.statusEl) this.statusEl.textContent = `${status.charAt(0).toUpperCase()}${status.slice(1)}${plan ? ` - ${plan}` : ''}`;
    if (this.periodEl) this.periodEl.textContent = formatted ? `Neste fornyelse: ${formatted}` : '';
    if (this.planEl) this.planEl.textContent = plan ? `Aktuell plan: ${plan}` : '';
    if (this.thanksEl) this.thanksEl.style.display = isActive && tier !== 'free' ? 'flex' : 'none';
    if (this.plansEl) this.plansEl.style.display = isActive && tier !== 'free' ? 'none' : 'block';
    if (this.statusIcon) this.statusIcon.style.color = isActive ? 'var(--success)' : 'var(--text-secondary)';

    if (!isActive) {
      if (this.manageBtn) this.manageBtn.style.display = 'none';
      if (this.proBtn) this.proBtn.style.display = '';
      if (this.maxBtn) this.maxBtn.style.display = '';
    } else if (tier === 'free') {
      // Free plan users can upgrade to either Pro or Enterprise
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
      // Keep loading state visible during fetch
      if (this.periodEl) this.periodEl.textContent = '';

      if (!window.supa || !window.supa.auth) {
        await this.showContent();
        if (this.statusEl) this.statusEl.textContent = 'Kunne ikke hente abonnementsinformasjon.';
        return;
      }

      const userId = await getUserId();
      if (!userId) {
        await this.showContent();
        if (this.statusEl) this.statusEl.textContent = 'Autentisering påkrevd.';
        return;
      }

      // Fetch subscription tier from Supabase view
      const { data, error } = await window.supa
        .from('subscription_tiers')
        .select('status,price_id,tier,is_active,current_period_end,updated_at')
        .eq('user_id', userId);

      if (error) {
        console.error('[subscription] fetch error:', error);
        await this.showContent();
        if (this.statusEl) this.statusEl.textContent = 'Systemfeil - kan ikke hente abonnementsinformasjon.';
        return;
      }

      const row = Array.isArray(data) && data.length ? data[0] : null;
      if (import.meta?.env?.DEV || window.CONFIG?.debug) {
        console.log('[subscription_tiers] raw row:', row);
      }
      if (!row) {
        await this.showContent();
        if (this.statusEl) this.statusEl.textContent = 'Gratis plan aktiv';
        if (this.periodEl) this.periodEl.textContent = 'Du kan lagre vakter i én måned om gangen';
        if (this.planEl) this.planEl.textContent = 'Aktuell plan: Gratis';
        if (this.thanksEl) this.thanksEl.style.display = 'none';
        if (this.plansEl) this.plansEl.style.display = 'block';
        if (this.manageBtn) this.manageBtn.style.display = 'none';
        if (this.proBtn) this.proBtn.style.display = '';
        if (this.maxBtn) this.maxBtn.style.display = '';
        if (this.statusIcon) this.statusIcon.style.color = 'var(--success)';
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

      // Show content now that we have data
      await this.showContent();
      
      // Remember current tier for button logic
      this.currentTier = tier || null;

      // Update UI
      if (this.statusEl) this.statusEl.textContent = `${status.charAt(0).toUpperCase()}${status.slice(1)}${plan ? ` - ${plan}` : ''}`;
      if (this.periodEl) this.periodEl.textContent = formatted ? `Neste fornyelse: ${formatted}` : '';
      if (this.planEl) this.planEl.textContent = plan ? `Aktuell plan: ${plan}` : '';

      // Show thanks heart if active
      if (this.thanksEl) this.thanksEl.style.display = isActive ? 'flex' : 'none';

      // Buttons per requirements:
      // - tier = 'free' and active → show both upgrade options
      // - tier = 'pro' and active → show Manage + offer upgrade to Max
      // - tier = 'max' and active → show Manage only
      // - is_active = false → show both upgrade options
      if (!isActive) {
        if (this.manageBtn) this.manageBtn.style.display = 'none';
        if (this.proBtn) this.proBtn.style.display = '';
        if (this.maxBtn) this.maxBtn.style.display = '';
      } else if (tier === 'free') {
        // Free plan users can upgrade to either Pro or Enterprise
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
      await this.showContent();
      if (this.statusEl) this.statusEl.textContent = 'Systemfeil - kan ikke hente abonnementsinformasjon.';
      if (this.periodEl) this.periodEl.textContent = '';
    }
  }
}
