// Minimal SPA router for '/', '/login', '/onboarding'
// Mounts auth pages into '#spa-root' and toggles visibility with main app '#app'.

// Route type (JS doc): { path: string, render: () => Promise<string>|string, afterMount?: () => void }

import { renderLogin, afterMountLogin } from './pages/login.js';
import { renderOnboarding, afterMountOnboarding } from './pages/onboarding.js';
import { renderSettings, afterMountSettings } from './pages/settings.js';
import renderAbonnementPage, { afterMountAbonnement } from './pages/abonnement.js';
import { renderAnsatte, afterMountAnsatte } from './pages/ansatte.js';
import { renderAddShift, afterMountAddShift } from './pages/shiftAdd.js';
import { renderShiftEdit, afterMountShiftEdit } from './pages/shiftEdit.js';
import { renderShifts, afterMountShifts } from './pages/shifts.js';
import { renderLonnAI, afterMountLonnAI } from './pages/lonnAI.js';
import { mountAll } from './js/icons.js';
import { flipOnce } from './js/flipFallback.js';

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
      mountAll();

      // Show main app and hide SPA outlet
      const { appEl, spaEl } = getOutlets();
      if (spaEl) spaEl.style.display = 'none';
      if (appEl) {
        // Ensure app is visible even if prior CSS had !important rules
        try { appEl.style.setProperty('display', 'block', 'important'); } catch (_) { appEl.style.display = 'block'; }
      }

      // Clear stored scroll position when manually navigating to dashboard
      // (but preserve it when using back/forward navigation)
      if (!window.spaNavigationInProgress) {
        window.dashboardScrollPosition = undefined;
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

        // Restore original navbar if it was modified
        if (window._originalNavbarHTML) {
          const bottomNav = document.querySelector('.bottom-nav');
          if (bottomNav) {
            bottomNav.innerHTML = window._originalNavbarHTML;
          }
          window._originalNavbarHTML = null;
        }

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
  { path: '/ansatte', render: renderAnsatte, afterMount: afterMountAnsatte },
  { path: '/shifts', render: renderShifts, afterMount: afterMountShifts },
  { path: '/shift-add', render: renderAddShift, afterMount: afterMountAddShift },
  { path: '/shift-edit', render: renderShiftEdit, afterMount: afterMountShiftEdit },
  { path: '/lonnai', render: renderLonnAI, afterMount: afterMountLonnAI },
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
  // Mark that we're doing SPA navigation to prevent aggressive scroll restoration
  window.spaNavigationInProgress = true;

  const nav = () => {
    history.pushState({}, '', path);
    render();
    // Clear the flag after a brief delay
    setTimeout(() => {
      window.spaNavigationInProgress = false;
    }, 100);
  };

  // Pre-warm compositor layer
  const navEl = document.querySelector('.bottom-nav');
  if (navEl) {
    navEl.classList.add('vt-prewarm');
    void navEl.offsetWidth; // force reflow to realize the layer now
  }

  // Use View Transitions API if available, otherwise fall back to FLIP animation
  if ('startViewTransition' in document) {
    document.documentElement.classList.add('vt-active');
    const vt = document.startViewTransition(nav);
    vt.finished.finally(() => {
      document.documentElement.classList.remove('vt-active');
      navEl && navEl.classList.remove('vt-prewarm');
    });
  } else {
    // Firefox FLIP fallback: snapshot the FAB, navigate, then play FLIP animation
    const play = flipOnce('.nav-item.nav-add, .nav-item.nav-add-small');
    nav();
    requestAnimationFrame(play);
    navEl && navEl.classList.remove('vt-prewarm');
  }
}

function updateBodyClassForRoute(currentPath) {
  try {
    // Update body classes based on current route
    document.body.classList.toggle('view-shifts', currentPath === '/shifts');
  } catch (e) {
    console.warn('Error updating body class for route:', e);
  }
}

function updateBottomNavActiveState(currentPath) {
  try {
    const navItems = document.querySelectorAll('.bottom-nav .nav-item');
    navItems.forEach(item => {
      const href = item.getAttribute('data-href');
      const isActive = href === currentPath ||
                      (href === '/' && currentPath === '/') ||
                      (href === '/shifts' && currentPath === '/shifts') ||
                      (href === '/abonnement' && currentPath === '/abonnement') ||
                      (href === '/ansatte' && currentPath === '/ansatte') ||
                      (href === '/settings' && currentPath.startsWith('/settings'));

      item.classList.toggle('active', isActive);
    });
  } catch (e) {
    console.warn('Error updating nav active state:', e);
  }
}

export async function render() {
  const { appEl, spaEl } = getOutlets();
  const path = normalizePath(location.pathname);
  const match = routes.find(r => r.path === path) || routes[0];

  // Clean up floating elements for any route transition
  try {
    document.querySelectorAll('.floating-settings-bar, .floating-settings-backdrop, .floating-nav-btn').forEach(el => el.remove());
    const settingsPortal = document.getElementById('settings-floating-portal');
    if (settingsPortal) settingsPortal.remove();
    const abonnementPortal = document.getElementById('abonnement-floating-portal');
    if (abonnementPortal) abonnementPortal.remove();
    const addShiftPortal = document.getElementById('shift-add-floating-portal');
    if (addShiftPortal) addShiftPortal.remove();
  } catch (_) {}

  // Toggle containers: show SPA for non-root routes
  if (match.path === '/') {
    // Dashboard should always be at scroll position 0 since it's scroll-locked
    // Reset immediately, not in timeout
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    // Also reset any internal scroll positions in the snap container
    const snapContainer = document.querySelector('.snap-container');
    if (snapContainer) {
      snapContainer.scrollTop = 0;
      snapContainer.scrollLeft = 0;
    }
    // Reset scroll for all snap sections
    const snapSections = document.querySelectorAll('.snap-section');
    snapSections.forEach(section => {
      section.scrollTop = 0;
      section.scrollLeft = 0;
    });

    // Force reset again after elements are visible
    setTimeout(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      if (snapContainer) {
        snapContainer.scrollTop = 0;
        snapContainer.scrollLeft = 0;
      }
    }, 10);

    if (spaEl) spaEl.style.display = 'none';
    if (appEl) {
      appEl.style.setProperty('display', 'block', 'important');
      // Restore scrollability for dashboard
      appEl.style.removeProperty('pointer-events');
      appEl.style.removeProperty('position');
    }
    // Clean up auth-mode and any lingering auth markup to avoid layout offsets
    try {
      document.documentElement.classList.remove('auth-mode');
      document.body.classList.remove('auth-mode');
      document.documentElement.classList.remove('onboarding-route');
      document.body.classList.remove('onboarding-route');
      document.documentElement.classList.remove('spa-route');
      document.body.classList.remove('spa-route');
    } catch (_) {}

    // Clean up ansatte route overflow prevention
    try {
      document.body.style.removeProperty('overflow-x');
      document.body.style.removeProperty('max-width');
      document.documentElement.style.removeProperty('overflow-x');
      document.documentElement.style.removeProperty('max-width');
    } catch (_) {}

    try { if (spaEl) spaEl.innerHTML = ''; } catch (_) {}

    // Install scroll prevention listener for dashboard
    const preventDashboardScroll = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    // Remove any existing listener first
    window.removeEventListener('scroll', window._dashboardScrollPreventer);

    // Add new listener that prevents any scroll on dashboard
    window._dashboardScrollPreventer = preventDashboardScroll;
    window.addEventListener('scroll', preventDashboardScroll, { passive: false });
  } else {
    // Remove dashboard scroll preventer when leaving dashboard
    if (window._dashboardScrollPreventer) {
      window.removeEventListener('scroll', window._dashboardScrollPreventer);
      window._dashboardScrollPreventer = null;
    }

    // Dashboard is scroll-locked, so no need to store scroll position
    window.lastSpaRoute = match.path;

    if (appEl) {
      appEl.style.setProperty('display', 'none', 'important');
      // Prevent any interaction with the hidden dashboard
      appEl.style.setProperty('pointer-events', 'none', 'important');
      appEl.style.setProperty('position', 'fixed', 'important');
    }
    if (spaEl) {
      spaEl.style.display = 'block';
      // Reset scroll to top for SPA routes
      window.scrollTo(0, 0);
    }
    // Mark as SPA route to relax global overflow constraints
    try {
      document.documentElement.classList.add('spa-route');
      document.body.classList.add('spa-route');
    } catch (_) {}
  }

  // Hide bottom navigation for specific routes that need full screen
  const bottomNav = document.querySelector('.bottom-nav');
  if (bottomNav) {
    if (match.path === '/shift-add' || match.path === '/login') {
      bottomNav.style.display = 'none';
    } else {
      bottomNav.style.display = '';
    }
  }

  // Tag body/html during onboarding for scoped CSS
  try {
    const isOnboarding = match.path === '/onboarding';
    document.documentElement.classList.toggle('onboarding-route', isOnboarding);
    document.body.classList.toggle('onboarding-route', isOnboarding);
  } catch (_) {}

  // Update body classes for current route (for View Transitions)
  updateBodyClassForRoute(path);

  // Render into SPA outlet only for non-root routes
  if (spaEl && match.path !== '/') {
    spaEl.innerHTML = await match.render();
  }
  match.afterMount && match.afterMount();

  // Update bottom navigation active state AFTER afterMount to ensure navbar is properly restored
  updateBottomNavActiveState(path);
}

// History/back support
window.addEventListener('popstate', () => {
  // Mark that we're doing SPA navigation to prevent aggressive scroll restoration
  window.spaNavigationInProgress = true;
  render();
  // Clear the flag after a brief delay
  setTimeout(() => {
    window.spaNavigationInProgress = false;
  }, 100);
});

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

  // Update navigation active state on initial load
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      updateBottomNavActiveState(normalizePath(location.pathname));
    }, 100);
  });
}
