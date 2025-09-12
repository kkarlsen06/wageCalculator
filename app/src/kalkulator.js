// Initialize runtime config before any kalkulator scripts
import '/src/runtime-config.js';
import '/src/lib/net/apiBase.js'; // logs [api] base on boot
import '/src/lib/error-handling.js';

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
import '/src/js/featureFlags.js';

// App bootstrap: import immediately so DOMContentLoaded handlers inside app.js bind correctly
import '/src/js/app.js';

// Theme management system
import '/src/js/themeIntegration.js';

// Offline sync management for background sync and shift queue processing
import '/src/js/offline-sync-manager.js';

// Debug utilities for offline functionality (development only)
if (window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1')) {
    import('/src/js/offline-debug-utils.js');
}

// If app.js uses ESM default export or side effects, ensure DOMContentLoaded init remains intact.
// Expose inline handlers compatibility by attaching window.app if the module exported it.
// window.app is attached by /js/app.js when it initializes

// Ensure checkout helpers are available on the kalkulator page
import '/src/js/checkout.js';

// Checkout/Portal status toast on app page
import { refreshSubscriptionState } from '/src/js/subscriptionState.js';
import { getUserId } from '/src/lib/auth/getUserId.js';
import { render as renderSpa } from './router.js';

if (typeof window !== 'undefined') {
  // Register service worker for offline support
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        // PWABuilder runtime detectors (no-ops, safe in prod)
        try {
          if ('SyncManager' in window && registration.sync) {
            await registration.sync.register('pwa-detect');
          }
          if (registration.periodicSync && 'permissions' in navigator) {
            const perm = await navigator.permissions.query({ name: 'periodic-background-sync' });
            if (perm.state === 'granted') {
              await registration.periodicSync.register('pwa-detect-periodic', { minInterval: 24 * 60 * 60 * 1000 });
            }
          }
        } catch {}
        
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker available - could show update notification
                console.log('New service worker available');
              }
            });
          }
        });
        
        // Handle service worker updates
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!refreshing) {
            refreshing = true;
            window.location.reload();
          }
        });
        
        console.log('Service worker registered successfully');
      } catch (error) {
        console.warn('Service worker registration failed:', error);
      }
    });
  }

  // Render SPA route on load (supports /, /login, /onboarding)
  window.addEventListener('DOMContentLoaded', () => {
    try { renderSpa(); } catch (e) { console.warn('SPA render failed', e); }
  });

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
