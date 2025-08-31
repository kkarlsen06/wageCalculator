// Initialize runtime config before any kalkulator scripts
import '/src/runtime-config.js';
import '/src/js/apiBase.js'; // logs [api] base on boot
import '/src/js/error-handling.js';

// CSS is linked via kalkulator/index.html to avoid duplication

// Third-party CDN globals are left as-is in HTML (Supabase, jsPDF, Cropper, marked, DOMPurify)
// Configure Markdown rendering so single newlines become <br> in chat
if (typeof window !== 'undefined') {
  try {
    const mk = window.marked || (typeof marked !== 'undefined' ? marked : null);
    if (mk && typeof mk.setOptions === 'function') {
      mk.setOptions({
        gfm: true,
        breaks: true
      });
    }
  } catch (_) {
    // Non-fatal: chat will still render, just without single-line breaks
  }
}

// Provide uuidv4 globally (previously defined inline in HTML)
if (typeof window !== 'undefined' && !window.uuidv4) {
  window.uuidv4 = function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };
}

// Load feature flags (reads window.CONFIG.apiBase)
import '/js/featureFlags.js';

// App bootstrap (was loaded via <script type="module" src="js/app.js">)
import '/js/app.js';

// Theme management system
import '/js/themeIntegration.js';

// If app.js uses ESM default export or side effects, ensure DOMContentLoaded init remains intact.
// Expose inline handlers compatibility by attaching window.app if the module exported it.
// window.app is attached by /js/app.js when it initializes

// Ensure checkout helpers are available on the kalkulator page
import '/src/js/checkout.js';

// Checkout/Portal status toast on app page
import { refreshSubscriptionState } from '/js/subscriptionState.js';
import { getUserId } from '/src/lib/auth/getUserId.js';

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const status = params.get('checkout');
      if (status && window.ErrorHelper) {
        if (status === 'success') {
          window.ErrorHelper.showSuccess('Betaling fullført!');
        } else if (status === 'cancel' || status === 'error' || status === 'failed') {
          window.ErrorHelper.showError('Betaling ble avbrutt eller feilet.');
        }
        params.delete('checkout');
      }

      const portal = params.get('portal');
      if (portal) {
        if (portal === 'done' && window.ErrorHelper) {
          window.ErrorHelper.showSuccess('Abonnement oppdatert!');
        }
        // Immediately refresh subscription state without full reload
        (async () => {
          try {
            const userId = await getUserId();
            if (userId) {
              await refreshSubscriptionState(userId);
            } else {
              console.warn('[sub] refresh skipped: no user');
            }
          } catch (e) {
            console.warn('[sub] refresh failed', e);
          }
        })();
        params.delete('portal');
      }

      if (status || portal) {
        const base = window.location.origin + window.location.pathname + (params.toString() ? `?${params}` : '');
        window.history.replaceState({}, document.title, base);
      }
    } catch (_) {}
  });
}
