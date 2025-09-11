// Minimal SPA router for '/', '/login', '/onboarding'
// Mounts auth pages into '#spa-root' and toggles visibility with main app '#app'.

// Route type (JS doc): { path: string, render: () => Promise<string>|string, afterMount?: () => void }

import { renderLogin, afterMountLogin } from './pages/login.js';
import { renderOnboarding, afterMountOnboarding } from './pages/onboarding.js';
import { renderSettings, afterMountSettings } from './pages/settings.js';
import renderAbonnementPage, { afterMountAbonnement } from './pages/abonnement.js';
import { renderAddShift, afterMountAddShift } from './pages/shiftAdd.js';
import { renderShiftEdit, afterMountShiftEdit } from './pages/shiftEdit.js';

// Helper: normalize path so '/index.html' maps to '/'
function normalizePath(pathname) {
  if (pathname === '/index.html') return '/';
  return pathname;
}

// Pages mount into this outlet; main app is in '#app'
function getOutlets() {
  const appEl = document.getElementById('app');
  let spaEl = document.getElementById('spa-root');
  if (!spaEl) {
    spaEl = document.createElement('div');
    spaEl.id = 'spa-root';
    spaEl.style.display = 'none';
    document.body.appendChild(spaEl);
  }
  return { appEl, spaEl };
}

export const routes = [
  {
    path: '/',
    render: () => '',
    afterMount: () => {
      // Show main app and hide SPA outlet
      const { appEl, spaEl } = getOutlets();
      if (spaEl) spaEl.style.display = 'none';
      if (appEl) {
        // Ensure app is visible even if prior CSS had !important rules
        try { appEl.style.setProperty('display', 'block', 'important'); } catch (_) { appEl.style.display = 'block'; }
      }
      
      // Clean up any floating elements, portals, and route-specific globals
      try {
        document.querySelectorAll('.floating-settings-bar, .floating-settings-backdrop, .floating-nav-btn').forEach(el => el.remove());
        const settingsPortal = document.getElementById('settings-floating-portal');
        if (settingsPortal) settingsPortal.remove();
        const abonnementPortal = document.getElementById('abonnement-floating-portal');
        if (abonnementPortal) abonnementPortal.remove();
        const addShiftPortal = document.getElementById('shift-add-floating-portal');
        if (addShiftPortal) addShiftPortal.remove();
        
        // Clean up shift add route globals
        if (window._shiftAddRouteCleanup) {
          window._shiftAddRouteCleanup.forEach(cleanup => {
            try { cleanup(); } catch (e) { console.warn('Cleanup error:', e); }
          });
          window._shiftAddRouteCleanup = [];
        }
        
        // Clean up shift edit route globals
        if (window._shiftEditRouteCleanup) {
          window._shiftEditRouteCleanup.forEach(cleanup => {
            try { cleanup(); } catch (e) { console.warn('Cleanup error:', e); }
          });
          window._shiftEditRouteCleanup = [];
        }
      } catch (_) {}
      
      // Reinitialize app content if needed
      try {
        if (typeof window !== 'undefined' && window.app && window.app.refreshUI) {
          setTimeout(() => window.app.refreshUI(), 50);
        }
      } catch (_) {}
    }
  },
  { path: '/login', render: renderLogin, afterMount: afterMountLogin },
  { path: '/onboarding', render: renderOnboarding, afterMount: afterMountOnboarding },
  { path: '/abonnement', render: renderAbonnementPage, afterMount: afterMountAbonnement },
  { path: '/shift-add', render: renderAddShift, afterMount: afterMountAddShift },
  { path: '/shift-edit', render: renderShiftEdit, afterMount: afterMountShiftEdit },
  { path: '/settings', render: renderSettings, afterMount: afterMountSettings },
  // Account settings detail (primary path)
  { path: '/settings/account', render: renderSettings, afterMount: afterMountSettings },
  // Legacy alias maintained for backward compatibility
  { path: '/settings/profile', render: renderSettings, afterMount: afterMountSettings },
  { path: '/settings/wage', render: renderSettings, afterMount: afterMountSettings },
  { path: '/settings/wage-advanced', render: renderSettings, afterMount: afterMountSettings },
  { path: '/settings/interface', render: renderSettings, afterMount: afterMountSettings },
  { path: '/settings/org', render: renderSettings, afterMount: afterMountSettings },
  { path: '/settings/data', render: renderSettings, afterMount: afterMountSettings },
];

export function navigate(path) {
  history.pushState({}, '', path);
  render();
}

export async function render() {
  const { appEl, spaEl } = getOutlets();
  const path = normalizePath(location.pathname);
  const match = routes.find(r => r.path === path) || routes[0];

  // Toggle containers: show SPA for non-root routes
  if (match.path === '/') {
    if (spaEl) spaEl.style.display = 'none';
    if (appEl) appEl.style.setProperty('display', 'block', 'important');
    // Clean up auth-mode and any lingering auth markup to avoid layout offsets
    try {
      document.documentElement.classList.remove('auth-mode');
      document.body.classList.remove('auth-mode');
      document.documentElement.classList.remove('onboarding-route');
      document.body.classList.remove('onboarding-route');
      document.documentElement.classList.remove('spa-route');
      document.body.classList.remove('spa-route');
    } catch (_) {}
    try { if (spaEl) spaEl.innerHTML = ''; } catch (_) {}
  } else {
    if (appEl) appEl.style.setProperty('display', 'none', 'important');
    if (spaEl) spaEl.style.display = 'block';
    // Mark as SPA route to relax global overflow constraints
    try {
      document.documentElement.classList.add('spa-route');
      document.body.classList.add('spa-route');
    } catch (_) {}
  }

  // Tag body/html during onboarding for scoped CSS
  try {
    const isOnboarding = match.path === '/onboarding';
    document.documentElement.classList.toggle('onboarding-route', isOnboarding);
    document.body.classList.toggle('onboarding-route', isOnboarding);
  } catch (_) {}

  // Render into SPA outlet only for non-root routes
  if (spaEl && match.path !== '/') {
    spaEl.innerHTML = await match.render();
  }
  match.afterMount && match.afterMount();
}

// History/back support
window.addEventListener('popstate', render);

// Intercept SPA-marked links
document.addEventListener('click', (e) => {
  const el = e.target && /** @type {HTMLElement} */(e.target).closest && /** @type {HTMLElement} */(e.target).closest('[data-spa]');
  if (!el) return;

  // Anchor handling
  if (el.tagName && el.tagName.toLowerCase() === 'a') {
    const a = /** @type {HTMLAnchorElement} */(el);
    if (a.origin === location.origin) {
      e.preventDefault();
      navigate(a.pathname + (a.search || ''));
    }
    return;
  }

  // Generic element with data-href
  const href = el.getAttribute('data-href');
  if (href) {
    e.preventDefault();
    try {
      const url = new URL(href, location.origin);
      navigate(url.pathname + (url.search || ''));
    } catch (_) {
      // Fallback: hard redirect
      location.href = href;
    }
  }
});

// Expose navigate for non-module scripts to avoid circular deps
if (typeof window !== 'undefined') {
  window.__navigate = navigate;
  window.navigateToRoute = navigate;
}
