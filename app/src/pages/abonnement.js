// Abonnement Route
// Converted from SubscriptionModal to follow the same pattern as settings

import { getUserId } from '/src/lib/auth/getUserId.js';

function getAbonnementView() {
  return `
  <div id="abonnementPage" class="settings-page">
    <div class="detail-title">
      <h1>Abonnementsadministrasjon</h1>
      <p class="detail-subtitle">Administrer ditt profesjonelle abonnement</p>
    </div>
    
    <!-- Loading state -->
    <div class="modal-loading" id="abonnementLoading" style="display: flex; align-items: center; justify-content: center; min-height: 60vh;">
      <div class="loading-spinner" style="animation: spin 1s linear infinite;">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
        </svg>
      </div>
    </div>
    
    <style>
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    </style>
    
    <!-- Main content - hidden initially -->
    <div class="settings-section" id="abonnementContent" style="display: none;">
      <h3>Abonnementsstatus</h3>
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
        <div id="earlyUserAppreciation" class="early-user-message" style="display:none;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 21s-6.716-4.09-9.193-8.09C.806 10.11 2.292 6 6.07 6c2.097 0 3.34 1.317 3.93 2.26C10.59 7.317 11.833 6 13.93 6c3.777 0 5.263 4.11 3.263 6.91C18.716 16.91 12 21 12 21z"></path>
          </svg>
          <div class="early-user-content">
            <h4>Du var her helt fra starten, tusen takk! &lt;3</h4>
            <p>Nyt professional-goder helt gratis. PS. Du kan fortsatt abonnere for å støtte oss.</p>
          </div>
        </div>
        <div id="earlyUserSubscribedThanks" class="early-user-subscribed" style="display:none;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 21s-6.716-4.09-9.193-8.09C.806 10.11 2.292 6 6.07 6c2.097 0 3.34 1.317 3.93 2.26C10.59 7.317 11.833 6 13.93 6c3.777 0 5.263 4.11 3.263 6.91C18.716 16.91 12 21 12 21z"></path>
          </svg>
          <div class="early-user-subscribed-content">
            <h4>Wow! Du var her fra starten, og støtter oss via abonnement i tillegg?! Legende! &lt;3</h4>
            <p>Dette betyr alt for utviklingen av produktet. Tusen takk!</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Subscription Plans Section -->
    <div class="settings-section" id="subscriptionPlans" style="display:none;">
      <h3>Tilgjengelige planer</h3>
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

    <!-- Action Buttons Section -->
    <div class="settings-section" id="actionButtons" style="display: none;">
      <div class="setting-actions">
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
      </div>
    </div>

    <!-- Standalone manage subscription button -->
    <div style="margin-top: 2rem; display: none;" id="manageSubBtnContainer">
      <button type="button" class="btn btn-outline" id="manageSubBtn" style="display: block; margin: 0 auto;">
        Administrer abonnement
      </button>
    </div>

  </div>
  `;
}

// Main page functionality for SPA
export default function renderAbonnementPage() {
  return getAbonnementView();
}

class AbonnementController {
  constructor() {
    this.currentTier = null;
    this.isActive = false;
    this.beforePaywall = false;
    this.loadingEl = null;
    this.contentEl = null;
    this.statusEl = null;
    this.periodEl = null;
    this.planEl = null;
    this.proBtn = null;
    this.maxBtn = null;
    this.manageBtn = null;
    this.thanksEl = null;
    this.plansEl = null;
    this.earlyUserEl = null;
    this.earlyUserSubscribedEl = null;
    this.statusIcon = null;
    this.actionButtonsEl = null;
    this.manageSubBtnContainer = null;
    this._loadingStartTime = null;
  }

  init() {
    // Cache DOM elements
    this.loadingEl = document.getElementById('abonnementLoading');
    this.contentEl = document.getElementById('abonnementContent');
    this.statusEl = document.getElementById('subscriptionStatus');
    this.periodEl = document.getElementById('subscriptionPeriod');
    this.planEl = document.getElementById('subscriptionPlan');
    this.proBtn = document.getElementById('upgradeProBtn');
    this.maxBtn = document.getElementById('upgradeMaxBtn');
    this.manageBtn = document.getElementById('manageSubBtn');
    this.thanksEl = document.getElementById('subscriptionThanks');
    this.plansEl = document.getElementById('subscriptionPlans');
    this.earlyUserEl = document.getElementById('earlyUserAppreciation');
    this.earlyUserSubscribedEl = document.getElementById('earlyUserSubscribedThanks');
    this.statusIcon = document.querySelector('.status-icon');
    this.actionButtonsEl = document.getElementById('actionButtons');
    this.manageSubBtnContainer = document.getElementById('manageSubBtnContainer');

    // Set loading start time
    this._loadingStartTime = Date.now();

    // Attach event listeners
    this.attachEventListeners();

    // Load subscription data
    this.loadSubscription();

    // Listen for global subscription updates
    this._onSubUpdated = () => {
      this.updateFromGlobalState().catch(e => console.warn('[abonnement] update error:', e));
    };
    document.addEventListener('subscription:updated', this._onSubUpdated);
  }

  attachEventListeners() {
    // Pro upgrade button
    this.proBtn?.addEventListener('click', async () => {
      if (!window.startCheckout || !this.proBtn) return;
      const btn = this.proBtn;
      const wasDisabled = btn.disabled;
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      try {
        await window.startCheckout('price_1RzQ85Qiotkj8G58AO6st4fh', { mode: 'subscription' });
      } catch (_) {
        // ErrorHelper in startCheckout already shows a toast
      } finally {
        btn.removeAttribute('aria-busy');
        btn.disabled = wasDisabled;
      }
    });

    // Enterprise upgrade button
    this.maxBtn?.addEventListener('click', async () => {
      if (!this.maxBtn) return;
      const btn = this.maxBtn;
      const wasDisabled = btn.disabled;
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      try {
        if (this.currentTier === 'pro' && window.startPortalUpgrade) {
          await window.startPortalUpgrade({ redirect: true });
        } else if (window.startCheckout) {
          await window.startCheckout('price_1RzQC1Qiotkj8G58tYo4U5oO', { mode: 'subscription' });
        }
      } catch (e) {
        console.warn('[abonnement] portal upgrade failed, falling back to billing portal', e);
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

    // Manage subscription button
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
    if (this.actionButtonsEl) {
      this.actionButtonsEl.style.display = 'block';
    }
    // The manage button is standalone and controlled separately by updateButtons method
  }

  async updateFromGlobalState() {
    await this.showContent();
    
    const row = window.SubscriptionState || null;
    const beforePaywall = this.beforePaywall;
    
    console.log('[abonnement] updateFromGlobalState:', { row, beforePaywall, currentTier: this.currentTier });
    
    if (!row) {
      if (beforePaywall) {
        // Early user with no subscription
        if (this.statusEl) this.statusEl.textContent = 'Early User - Pro-fordeler gratis';
        if (this.periodEl) this.periodEl.textContent = '';
        if (this.planEl) this.planEl.textContent = '';
        
        this.hideAllMessages();
        if (this.earlyUserEl) this.earlyUserEl.style.display = 'flex';
        
        if (this.plansEl) this.plansEl.style.display = 'none';
        if (this.manageBtn) this.manageBtn.style.display = 'none';
        if (this.proBtn) this.proBtn.style.display = '';
        if (this.maxBtn) this.maxBtn.style.display = '';
        if (this.statusIcon) this.statusIcon.style.color = 'var(--success)';
        this.currentTier = 'free';
        this.isActive = true;
        return;
      }
      
      // Regular free user
      if (this.statusEl) this.statusEl.textContent = 'Gratis plan';
      if (this.periodEl) this.periodEl.textContent = 'Du kan lagre vakter i én måned om gangen';
      if (this.planEl) this.planEl.textContent = 'Se abonnementene nedenfor. Abonner for tilgang til flere funksjoner!';
      this.hideAllMessages();
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
    const isActive = !!row.is_active || (row.status === 'active');
    const tier = String(row.tier || '').toLowerCase();
    const plan = tier === 'max' ? 'Enterprise' : (tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : null);

    this.currentTier = tier || null;
    this.isActive = isActive;

    if (this.statusEl) this.statusEl.textContent = `${status.charAt(0).toUpperCase()}${status.slice(1)}${plan ? ` - ${plan}` : ''}`;
    if (this.periodEl) this.periodEl.textContent = formatted ? `Neste fornyelse: ${formatted}` : '';
    if (this.planEl) this.planEl.textContent = plan ? `Takk for abonnementet!` : '';
    
    // Handle special messages
    const showEarlyUserSubscribedMessage = beforePaywall && isActive;
    const showRegularThanks = !beforePaywall && isActive && tier !== 'free';
    
    this.hideAllMessages();
    if (showEarlyUserSubscribedMessage && this.earlyUserSubscribedEl) {
      this.earlyUserSubscribedEl.style.display = 'flex';
    } else if (showRegularThanks && this.thanksEl) {
      this.thanksEl.style.display = 'flex';
    }

    if (this.plansEl) this.plansEl.style.display = isActive && tier !== 'free' ? 'none' : 'block';
    if (this.statusIcon) this.statusIcon.style.color = isActive ? 'var(--success)' : 'var(--text-secondary)';

    // Update buttons based on tier and status
    this.updateButtons(isActive, tier);
  }

  hideAllMessages() {
    if (this.thanksEl) this.thanksEl.style.display = 'none';
    if (this.earlyUserSubscribedEl) this.earlyUserSubscribedEl.style.display = 'none';
    if (this.earlyUserEl) this.earlyUserEl.style.display = 'none';
  }

  updateButtons(isActive, tier) {
    if (!isActive) {
      if (this.manageSubBtnContainer) this.manageSubBtnContainer.style.display = 'none';
      if (this.actionButtonsEl) this.actionButtonsEl.style.display = 'block';
      if (this.proBtn) this.proBtn.style.display = '';
      if (this.maxBtn) this.maxBtn.style.display = '';
    } else if (tier === 'free') {
      if (this.manageSubBtnContainer) this.manageSubBtnContainer.style.display = 'none';
      if (this.actionButtonsEl) this.actionButtonsEl.style.display = 'block';
      if (this.proBtn) this.proBtn.style.display = '';
      if (this.maxBtn) this.maxBtn.style.display = '';
    } else if (tier === 'pro') {
      if (this.manageSubBtnContainer) this.manageSubBtnContainer.style.display = 'block';
      if (this.actionButtonsEl) this.actionButtonsEl.style.display = 'block';
      if (this.proBtn) this.proBtn.style.display = 'none';
      if (this.maxBtn) this.maxBtn.style.display = '';
    } else if (tier === 'max') {
      if (this.manageSubBtnContainer) this.manageSubBtnContainer.style.display = 'block';
      if (this.actionButtonsEl) this.actionButtonsEl.style.display = 'none';
      if (this.proBtn) this.proBtn.style.display = 'none';
      if (this.maxBtn) this.maxBtn.style.display = 'none';
    } else {
      if (this.manageSubBtnContainer) this.manageSubBtnContainer.style.display = 'block';
      if (this.actionButtonsEl) this.actionButtonsEl.style.display = 'none';
      if (this.proBtn) this.proBtn.style.display = 'none';
      if (this.maxBtn) this.maxBtn.style.display = 'none';
    }
  }

  async loadSubscription() {
    try {
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

      // Fetch both subscription tier and user profile data
      const [subscriptionResult, profileResult] = await Promise.all([
        window.supa
          .from('subscription_tiers')
          .select('status,price_id,tier,is_active,current_period_end,updated_at')
          .eq('user_id', userId),
        window.supa
          .from('profiles')
          .select('before_paywall')
          .eq('id', userId)
          .single()
      ]);

      const { data, error } = subscriptionResult;
      const beforePaywall = profileResult.data?.before_paywall === true;
      this.beforePaywall = beforePaywall;
      
      console.log('[abonnement] loadSubscription profile data:', beforePaywall, profileResult.data);
      console.log('[abonnement] loadSubscription subscription data:', data, error, Array.isArray(data) && data.length ? data[0] : null);

      if (error) {
        console.error('[abonnement] fetch error:', error);
        await this.showContent();
        if (this.statusEl) this.statusEl.textContent = 'Systemfeil - kan ikke hente abonnementsinformasjon.';
        return;
      }

      const row = Array.isArray(data) && data.length ? data[0] : null;
      
      if (!row) {
        await this.showContent();
        
        if (beforePaywall) {
          // Early user with no subscription
          if (this.statusEl) this.statusEl.textContent = 'Early User - Pro-fordeler gratis';
          if (this.periodEl) this.periodEl.textContent = '';
          if (this.planEl) this.planEl.textContent = '';
          
          this.hideAllMessages();
          if (this.earlyUserEl) this.earlyUserEl.style.display = 'flex';
          
          if (this.plansEl) this.plansEl.style.display = 'none';
          if (this.manageBtn) this.manageBtn.style.display = 'none';
          if (this.proBtn) this.proBtn.style.display = '';
          if (this.maxBtn) this.maxBtn.style.display = '';
          if (this.statusIcon) this.statusIcon.style.color = 'var(--success)';
          return;
        }
        
        // Regular free user
        if (this.statusEl) this.statusEl.textContent = 'Gratis plan';
        if (this.periodEl) this.periodEl.textContent = 'Du kan lagre vakter i én måned om gangen';
        if (this.planEl) this.planEl.textContent = 'Se abonnementene nedenfor. Abonner for tilgang til flere funksjoner!';
        this.hideAllMessages();
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

      const isActive = !!row.is_active || (row.status === 'active');
      const tier = String(row.tier || '').toLowerCase();
      const plan = tier === 'max' ? 'Enterprise' : (tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : null);

      await this.showContent();
      
      this.currentTier = tier || null;
      
      console.log('[abonnement] loadSubscription values:', { beforePaywall, isActive, tier, plan });

      // Update UI
      if (this.statusEl) this.statusEl.textContent = `${status.charAt(0).toUpperCase()}${status.slice(1)}${plan ? ` - ${plan}` : ''}`;
      if (this.periodEl) this.periodEl.textContent = formatted ? `Neste fornyelse: ${formatted}` : '';
      if (this.planEl) this.planEl.textContent = plan ? `Takk for abonnementet!` : '';

      // Handle special messages
      const showEarlyUserSubscribedMessage = beforePaywall && isActive;
      const showRegularThanks = !beforePaywall && isActive && tier !== 'free';
      
      this.hideAllMessages();
      if (showEarlyUserSubscribedMessage && this.earlyUserSubscribedEl) {
        this.earlyUserSubscribedEl.style.display = 'flex';
      } else if (showRegularThanks && this.thanksEl) {
        this.thanksEl.style.display = 'flex';
      }

      if (this.plansEl) this.plansEl.style.display = isActive && tier !== 'free' ? 'none' : 'block';
      if (this.statusIcon) this.statusIcon.style.color = isActive ? 'var(--success)' : 'var(--text-secondary)';

      // Update buttons
      this.updateButtons(isActive, tier);

    } catch (e) {
      console.error('[abonnement] exception:', e);
      await this.showContent();
      if (this.statusEl) this.statusEl.textContent = 'Systemfeil - kan ikke hente abonnementsinformasjon.';
      if (this.periodEl) this.periodEl.textContent = '';
    }
  }

  destroy() {
    if (this._onSubUpdated) {
      document.removeEventListener('subscription:updated', this._onSubUpdated);
    }
  }
}

let abonnementController = null;

export async function afterMountAbonnement() {
  try {
    // Create controller instance and initialize
    abonnementController = new AbonnementController();
    abonnementController.init();

    // Set up floating navigation (same as settings)
    setupFloatingNavigation();

    // Set up SPA navigation
    setupSPANavigation();

    console.log('[abonnement] Page initialized successfully');
  } catch (e) {
    console.error('[abonnement] Page initialization failed:', e);
  }
}

function setupFloatingNavigation() {
  try {
    // Clean up any existing floating navigation
    document.querySelectorAll('.floating-nav-btn').forEach(el => el.remove());
    const existingPortal = document.getElementById('abonnement-floating-portal');
    if (existingPortal) existingPortal.remove();

    // Create portal for floating navigation (same approach as settings)
    const portal = document.createElement('div');
    portal.id = 'abonnement-floating-portal';
    portal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10000;
    `;
    document.documentElement.appendChild(portal);

    // Create floating nav button (close button for abonnement page)
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'floating-nav-btn btn btn-secondary';
    btn.setAttribute('data-spa', '');
    btn.style.pointerEvents = 'auto';
    btn.setAttribute('data-href', '/');
    btn.textContent = 'Lukk';
    portal.appendChild(btn);

    // Hard-bind navigation for the floating bar buttons to avoid any bubbling/portal edge cases
    const ensureRootVisible = () => {
      try {
        console.log('[abonnement] ensureRootVisible called');
        const appEl = document.getElementById('app');
        const spaEl = document.getElementById('spa-root');
        console.log('[abonnement] Elements found:', { appEl: !!appEl, spaEl: !!spaEl });
        
        if (spaEl) {
          console.log('[abonnement] Hiding spa-root');
          spaEl.style.display = 'none';
        }
        if (appEl) {
          console.log('[abonnement] Showing app element');
          console.log('[abonnement] App element has content:', appEl.innerHTML.length > 0);
          console.log('[abonnement] App element content preview:', appEl.innerHTML.slice(0, 200));
          appEl.style.setProperty('display', 'block', 'important');
        }
        
        console.log('[abonnement] Removing spa-route classes');
        document.documentElement.classList.remove('spa-route');
        document.body.classList.remove('spa-route');
        
        // Clean up floating UI remnants - match settings cleanup exactly
        console.log('[abonnement] Cleaning up floating elements');
        document.querySelectorAll('.floating-settings-bar, .floating-settings-backdrop, .floating-nav-btn').forEach(el => el.remove());
        const settingsPortal = document.getElementById('settings-floating-portal');
        if (settingsPortal) settingsPortal.remove();
        const abonnementPortal = document.getElementById('abonnement-floating-portal');
        if (abonnementPortal) abonnementPortal.remove();
        
        // Trigger main app initialization if it hasn't been done yet
        // This is needed because if we started on /abonnement, the main app never initialized
        if (!window.app || !window.app.initialized) {
          console.log('[abonnement] Main app not initialized, reloading page to fix');
          window.location.reload();
          return;
        }
        
        console.log('[abonnement] ensureRootVisible completed');
      } catch (err) {
        console.error('[abonnement] ensureRootVisible error:', err);
      }
    };

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Prefer SPA navigation
      try {
        console.log('[abonnement] Close button clicked, navigating to /');
        if (window.__navigate) {
          console.log('[abonnement] Using window.__navigate');
          window.__navigate('/');
        } else if (window.navigateToRoute) {
          console.log('[abonnement] Using window.navigateToRoute');
          window.navigateToRoute('/');
        } else {
          console.log('[abonnement] Using fallback window.location.href');
          window.location.href = '/';
        }
      } catch (err) { 
        console.error('[abonnement] Navigation error:', err);
        window.location.href = '/'; 
      }
      // Fallback soon after to ensure app becomes visible even if router render is delayed
      setTimeout(ensureRootVisible, 0);
    });

    console.log('[abonnement] Floating navigation initialized');
  } catch (e) {
    console.warn('[abonnement] Floating navigation init failed', e);
  }
}

function setupSPANavigation() {
  // Handle SPA navigation clicks
  document.addEventListener('click', function(e) {
    const link = e.target.closest('[data-spa]');
    if (link && link.hasAttribute('data-href')) {
      e.preventDefault();
      const href = link.getAttribute('data-href');
      
      // Navigate using the global SPA handler
      if (window.navigateToRoute) {
        window.navigateToRoute(href);
      } else {
        // Fallback to standard navigation
        window.location.href = href;
      }
    }
  });
}

// Cleanup when page is unloaded
window.addEventListener('beforeunload', () => {
  if (abonnementController) {
    abonnementController.destroy();
  }
  
  // Clean up floating navigation
  try {
    document.querySelectorAll('.floating-nav-btn').forEach(el => el.remove());
    const portal = document.getElementById('abonnement-floating-portal');
    if (portal) portal.remove();
  } catch (_) {}
});