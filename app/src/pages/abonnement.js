// Abonnement Route
// Converted from SubscriptionModal to follow the same pattern as settings

import { getUserId } from '/src/lib/auth/getUserId.js';
import { mountAll } from '../js/icons.js';

// Helper function to map price_id to tier
function priceIdToTier(priceId) {
  switch (priceId) {
    case 'price_1RzQ85Qiotkj8G58AO6st4fh':
      return 'pro';
    case 'price_1RzQC1Qiotkj8G58tYo4U5oO':
      return 'max';
    default:
      return 'free';
  }
}

function getAbonnementView() {
  return `
  <div id="abonnementPage" class="settings-page">
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
    <div id="abonnementContent" style="display: none;">

      <!-- Subscription Carousel -->
      <div class="subscription-carousel" role="tablist" aria-label="Velg abonnement">
        <!-- Navigation arrows -->
        <button class="carousel-arrow carousel-arrow-left" aria-label="Scroll venstre" style="display: none;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15,18 9,12 15,6"></polyline>
          </svg>
        </button>

        <div class="subscription-carousel-track" id="subscriptionCarouselTrack">
          <!-- Free Plan -->
          <div class="subscription-card" data-plan="free" role="tab" aria-label="Gratis plan">
            <div class="plan-header">
              <h3>Gratis</h3>
              <div class="plan-price">Alltid gratis</div>
            </div>
            <div class="plan-content" id="freeContent">
              <div class="plan-features">
                <span class="feature">Lagre vakter i én måned</span>
                <span class="feature">Grunnleggende rapporter</span>
                <span class="feature">Enkel vaktplanlegging</span>
                <span class="feature feature-limitation">Kun én måned med vakter om gangen</span>
              </div>
            </div>
            <button type="button" class="plan-cta" id="freeCta">Valgt</button>
          </div>

          <!-- Pro Plan -->
          <div class="subscription-card" data-plan="pro" role="tab" aria-label="Professional plan">
            <div class="plan-header">
              <h3>Professional</h3>
              <div class="plan-price">44,90 kr/mnd</div>
            </div>
            <div class="plan-content" id="proContent">
              <div class="plan-features">
                <span class="feature">Ubegrenset vakter</span>
                <span class="feature">Alle måneder tilgjengelig</span>
                <span class="feature">Avanserte rapporter</span>
                <span class="feature">Prioritert støtte</span>
              </div>
            </div>
            <button type="button" class="plan-cta" id="proCta">Oppgrader</button>
          </div>

          <!-- Max Plan -->
          <div class="subscription-card" data-plan="max" role="tab" aria-label="Max plan">
            <div class="plan-header">
              <h3>Max</h3>
              <div class="plan-price">89,90 kr/mnd</div>
            </div>
            <div class="plan-content" id="maxContent">
              <div class="plan-features">
                <span class="feature">Alle Pro-funksjoner</span>
                <span class="feature">Dedikert kundestøtte</span>
                <span class="feature">Prioritert funksjonalitetsutvikling</span>
                <span class="feature">Premium support</span>
              </div>
            </div>
            <button type="button" class="plan-cta" id="maxCta">Oppgrader</button>
          </div>
        </div>

        <button class="carousel-arrow carousel-arrow-right" aria-label="Scroll høyre" style="display: none;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9,18 15,12 9,6"></polyline>
          </svg>
        </button>
      </div>

      <p class="carousel-disclaimer">Avbryt når som helst</p>

      <div class="detail-title">
        <h1>Abonnement</h1>
        <p class="detail-subtitle">Få det meste ut av appen</p>
      </div>

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
    this.initialLoadComplete = false;
    this.initialLoadTime = null;

    // Carousel elements
    this.carouselTrack = null;
    this.leftArrow = null;
    this.rightArrow = null;

    // CTA buttons
    this.freeCta = null;
    this.proCta = null;
    this.maxCta = null;

    // Content elements
    this.freeContent = null;
    this.proContent = null;
    this.maxContent = null;

    this._loadingStartTime = null;
  }

  init() {
    // Cache DOM elements
    this.loadingEl = document.getElementById('abonnementLoading');
    this.contentEl = document.getElementById('abonnementContent');

    // Carousel elements
    this.carouselTrack = document.getElementById('subscriptionCarouselTrack');
    this.leftArrow = document.querySelector('.carousel-arrow-left');
    this.rightArrow = document.querySelector('.carousel-arrow-right');

    // CTA buttons
    this.freeCta = document.getElementById('freeCta');
    this.proCta = document.getElementById('proCta');
    this.maxCta = document.getElementById('maxCta');

    // Content elements
    this.freeContent = document.getElementById('freeContent');
    this.proContent = document.getElementById('proContent');
    this.maxContent = document.getElementById('maxContent');

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
    // Carousel navigation
    this.leftArrow?.addEventListener('click', () => {
      this.carouselTrack?.scrollBy({ left: -320, behavior: 'smooth' });
    });

    this.rightArrow?.addEventListener('click', () => {
      this.carouselTrack?.scrollBy({ left: 320, behavior: 'smooth' });
    });

    // CTA button event listeners
    this.freeCta?.addEventListener('click', async () => {
      await this.handleCtaClick('free');
    });

    this.proCta?.addEventListener('click', async () => {
      await this.handleCtaClick('pro');
    });

    this.maxCta?.addEventListener('click', async () => {
      await this.handleCtaClick('max');
    });

    // Update arrows on scroll
    this.carouselTrack?.addEventListener('scroll', () => {
      this.updateArrowVisibility();
    });

    // Add tap-to-focus functionality for cards
    const cards = document.querySelectorAll('.subscription-card');
    cards.forEach(card => {
      card.addEventListener('click', (e) => {
        // Don't trigger if clicking the CTA button
        if (e.target.closest('.plan-cta')) return;

        const planType = card.getAttribute('data-plan');
        this.centerPlan(planType);
      });
    });
  }

  async handleCtaClick(planType) {
    const currentTier = this.currentTier || 'free';

    // Don't process clicks on current plan (unless it's manage)
    if (planType === currentTier && this.isActive) {
      // Handle manage subscription
      if (currentTier !== 'free') {
        // For grandfathered Pro users (no paid subscription), show appreciation
        if (currentTier === 'pro' && this.beforePaywall && !window.SubscriptionState) {
          // Could show a modal or message here, for now just return
          console.log('[abonnement] Grandfathered Pro user clicked their plan - no action needed');
          return;
        }

        try {
          if (window.startBillingPortal) {
            await window.startBillingPortal({ redirect: true });
          }
        } catch (e) {
          console.warn('[abonnement] manage subscription failed:', e);
        }
      }
      return;
    }

    const button = planType === 'free' ? this.freeCta :
                   planType === 'pro' ? this.proCta : this.maxCta;

    if (!button) return;

    const wasDisabled = button.disabled;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');

    try {
      if (planType === 'pro') {
        // Upgrade to Pro
        if (window.startCheckout) {
          await window.startCheckout('price_1RzQ85Qiotkj8G58AO6st4fh', { mode: 'subscription' });
        }
      } else if (planType === 'max') {
        // Upgrade to Max or manage if already Pro
        if (currentTier === 'pro' && window.startPortalUpgrade) {
          await window.startPortalUpgrade({ redirect: true });
        } else if (window.startCheckout) {
          await window.startCheckout('price_1RzQC1Qiotkj8G58tYo4U5oO', { mode: 'subscription' });
        }
      } else if (planType === 'free') {
        // Downgrade to free - open billing portal
        if (window.startBillingPortal) {
          await window.startBillingPortal({ redirect: true });
        }
      }
    } catch (e) {
      console.warn('[abonnement] CTA action failed:', e);
      // Try billing portal as fallback for downgrades
      if ((planType === 'free' || (planType === 'max' && currentTier === 'pro')) && window.startBillingPortal) {
        try {
          await window.startBillingPortal({ redirect: true });
        } catch (_) { /* swallow */ }
      }
    } finally {
      button.removeAttribute('aria-busy');
      button.disabled = wasDisabled;
    }
  }

  updateArrowVisibility() {
    if (!this.carouselTrack || !this.leftArrow || !this.rightArrow) return;

    const { scrollLeft, scrollWidth, clientWidth } = this.carouselTrack;
    const isAtStart = scrollLeft <= 0;
    const isAtEnd = scrollLeft >= scrollWidth - clientWidth - 1;

    this.leftArrow.style.display = isAtStart ? 'none' : 'flex';
    this.rightArrow.style.display = isAtEnd ? 'none' : 'flex';
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

    // Hide loading and show content
    if (this.loadingEl) {
      this.loadingEl.style.display = 'none';
    }
    if (this.contentEl) {
      this.contentEl.style.display = 'block';
    }

    // Initialize carousel arrows
    this.updateArrowVisibility();

    // Center the user's current plan
    this.centerCurrentPlan();
  }

  async updateFromGlobalState() {
    // Skip if initial load hasn't completed yet to avoid race condition
    if (!this.initialLoadComplete) {
      return;
    }

    // Skip global updates for 2 seconds after initial load to prevent interference
    // This prevents DOMContentLoaded subscription refreshes from overriding the correct state
    if (this.initialLoadTime && (Date.now() - this.initialLoadTime) < 2000) {
      console.log('[abonnement] updateFromGlobalState: skipping - too soon after initial load');
      return;
    }

    await this.showContent();

    const row = window.SubscriptionState || null;
    const beforePaywall = this.beforePaywall;

    console.log('[abonnement] updateFromGlobalState:', { row, beforePaywall, currentTier: this.currentTier });

    // Determine current plan and status
    const { planName, statusText, periodText, isActive, tier, shouldShowAppreciation, appreciationData } = this.processSubscriptionData(row, beforePaywall);

    // Update carousel cards and CTAs
    this.updateCarouselCards(isActive, tier, shouldShowAppreciation, appreciationData);

    // Store current state
    this.currentTier = tier;
    this.isActive = isActive;

    // Center current plan in carousel
    this.centerCurrentPlan();
  }

  processSubscriptionData(row, beforePaywall) {
    if (!row) {
      if (beforePaywall) {
        return {
          planName: 'Professional',
          statusText: 'Early Supporter - Lifetime Access',
          periodText: 'Takk for at du var med fra starten!',
          isActive: true,
          tier: 'pro',
          shouldShowAppreciation: true,
          appreciationData: {
            title: 'Takk for at du var med fra starten! 🌟',
            text: 'Du har permanent tilgang til alle Professional-funksjoner som takk for å være en tidlig bruker. Du kan fortsatt abonnere for å støtte utviklingen og få tilgang til Max-funksjoner.'
          }
        };
      }
      return {
        planName: 'Gratis',
        statusText: 'Gratis plan',
        periodText: 'Lagre vakter i én måned om gangen',
        isActive: true,
        tier: 'free',
        shouldShowAppreciation: false,
        appreciationData: null
      };
    }

    const status = row.status || 'ukjent';
    const endRaw = row.current_period_end;
    const dateObj = endRaw ? new Date(endRaw) : null;
    const formatted = dateObj && !isNaN(dateObj) ? dateObj.toLocaleDateString('no-NO') : null;
    const isActive = (row.status === 'active');
    const tier = priceIdToTier(row.price_id);
    const plan = tier === 'max' ? 'Max' : (tier === 'pro' ? 'Professional' : 'Gratis');

    let appreciationData = null;
    let shouldShowAppreciation = false;

    if (isActive && tier !== 'free') {
      shouldShowAppreciation = true;
      if (beforePaywall) {
        appreciationData = {
          title: 'Du støtter oss i tillegg til å være early user! Legende! ❤️',
          text: 'Som early supporter hadde du allerede permanent Professional-tilgang, men du velger å støtte oss i tillegg. Dette betyr alt for utviklingen av produktet. Tusen takk!'
        };
      } else {
        appreciationData = {
          title: 'Takk for ditt verdifulle partnerskap!',
          text: 'Din støtte gjør det mulig for oss å fortsette å forbedre produktet.'
        };
      }
    }

    const statusMap = {
      'active': 'Aktiv',
      'canceled': 'Kansellert',
      'past_due': 'Forfalt',
      'unpaid': 'Ubetalt',
      'incomplete': 'Ufullstendig'
    };

    return {
      planName: plan,
      statusText: statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1),
      periodText: formatted ? `Neste fornyelse: ${formatted}` : '',
      isActive,
      tier,
      shouldShowAppreciation,
      appreciationData
    };
  }

  updateCarouselCards(isActive, tier, shouldShowAppreciation, appreciationData) {
    const currentTier = tier || 'free';

    // Update CTAs based on current subscription
    this.updateCtaButtons(currentTier, isActive);

    // Handle appreciation messages in cards
    if (shouldShowAppreciation && appreciationData) {
      this.showAppreciationInCard(currentTier, appreciationData);
    } else {
      this.hideAppreciationInCards();
    }
  }

  updateCtaButtons(currentTier, isActive) {
    // Reset all buttons
    const buttons = [
      { button: this.freeCta, plan: 'free' },
      { button: this.proCta, plan: 'pro' },
      { button: this.maxCta, plan: 'max' }
    ];

    buttons.forEach(({ button, plan }) => {
      if (!button) return;

      // Reset classes
      button.className = 'plan-cta';

      if (plan === currentTier && isActive) {
        // Current plan
        if (plan === 'free') {
          button.textContent = 'Valgt';
          button.classList.add('current-plan');
        } else if (plan === 'pro' && this.beforePaywall && !window.SubscriptionState) {
          // Grandfathered Pro user (no paid subscription)
          button.textContent = 'Din Plan';
          button.classList.add('current-plan');
        } else {
          button.textContent = 'Administrer';
          button.classList.add('manage-plan');
        }
      } else if (plan === 'free' && currentTier !== 'free') {
        // Downgrade to free
        button.textContent = 'Nedgrader';
        button.classList.add('downgrade');
      } else if (plan === 'pro' && currentTier === 'max') {
        // Downgrade from max to pro
        button.textContent = 'Nedgrader';
        button.classList.add('downgrade');
      } else {
        // Upgrade
        button.textContent = 'Oppgrader';
        button.classList.add('upgrade');
      }
    });
  }

  showAppreciationInCard(currentTier, appreciationData) {
    // Find the content element for the current tier
    const contentEl = currentTier === 'free' ? this.freeContent :
                      currentTier === 'pro' ? this.proContent :
                      currentTier === 'max' ? this.maxContent : null;

    if (!contentEl) return;

    // Replace features with appreciation message
    contentEl.innerHTML = `
      <div class="appreciation-content">
        <h4 class="appreciation-title">${appreciationData.title}</h4>
        <p class="appreciation-text">${appreciationData.text}</p>
      </div>
    `;
  }

  hideAppreciationInCards() {
    // Restore original feature lists (this should only be called if no subscription)
    // In practice, this is handled by the initial page load
  }

  centerCurrentPlan() {
    if (!this.carouselTrack) return;

    const currentTier = this.currentTier || 'free';

    // For free users, center Pro (index 1)
    // For pro users, center Pro (index 1)
    // For max users, center Max (index 2)
    let targetIndex = currentTier === 'max' ? 2 : 1;

    // If user is free, center pro plan for upgrade focus
    if (!this.isActive || currentTier === 'free') {
      targetIndex = 1; // Pro plan
    }

    const cards = this.carouselTrack.querySelectorAll('.subscription-card');
    if (cards.length === 0) return;

    const cardWidth = cards[0].offsetWidth + 16; // Card width + gap
    const scrollPosition = targetIndex * cardWidth - (this.carouselTrack.clientWidth / 2) + (cardWidth / 2);

    this.carouselTrack.scrollTo({
      left: Math.max(0, scrollPosition),
      behavior: 'smooth'
    });

    // Update arrow visibility after scroll
    setTimeout(() => this.updateArrowVisibility(), 300);
  }

  centerPlan(planType) {
    if (!this.carouselTrack) return;

    const planIndex = planType === 'free' ? 0 :
                      planType === 'pro' ? 1 :
                      planType === 'max' ? 2 : 1;

    const cards = this.carouselTrack.querySelectorAll('.subscription-card');
    if (cards.length === 0) return;

    const cardWidth = cards[0].offsetWidth + 16; // Card width + gap
    const scrollPosition = planIndex * cardWidth - (this.carouselTrack.clientWidth / 2) + (cardWidth / 2);

    this.carouselTrack.scrollTo({
      left: Math.max(0, scrollPosition),
      behavior: 'smooth'
    });

    // Update arrow visibility after scroll
    setTimeout(() => this.updateArrowVisibility(), 300);
  }

  async loadSubscription() {
    try {
      if (!window.supa || !window.supa.auth) {
        await this.showContent();
        this.updateCarouselCards(true, 'free', false, null);
        return;
      }

      const userId = await getUserId();
      if (!userId) {
        await this.showContent();
        this.updateCarouselCards(true, 'free', false, null);
        return;
      }

      // Fetch both subscription and user profile data
      const [subscriptionResult, profileResult] = await Promise.all([
        window.supa
          .from('subscriptions')
          .select('status,price_id,current_period_end,created_at,updated_at,stripe_subscription_id')
          .eq('user_id', userId)
          .maybeSingle(),
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
        this.updateCarouselCards(true, 'free', false, null);
        return;
      }

      const row = data; // subscriptions.maybeSingle() returns single object or null

      await this.showContent();

      // Process subscription data and update UI using the new streamlined method
      const { planName, statusText, periodText, isActive, tier, shouldShowAppreciation, appreciationData } = this.processSubscriptionData(row, beforePaywall);

      // Update carousel cards and CTAs
      this.updateCarouselCards(isActive, tier, shouldShowAppreciation, appreciationData);

      // Store current state
      this.currentTier = tier;
      this.isActive = isActive;

      // Center current plan in carousel
      this.centerCurrentPlan();

      // Mark initial load as complete
      this.initialLoadComplete = true;
      this.initialLoadTime = Date.now();

    } catch (e) {
      console.error('[abonnement] exception:', e);
      await this.showContent();
      // Show error state - default to free user experience
      this.updateCarouselCards(true, 'free', false, null);
      // Mark initial load as complete even in error case
      this.initialLoadComplete = true;
      this.initialLoadTime = Date.now();
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
  mountAll();

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
    btn.style.display = 'none';
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
          console.log('[abonnement] Main app not initialized, but avoiding page reload');
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