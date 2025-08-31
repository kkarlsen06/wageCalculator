// Minimal SPA router for '/', '/login', '/onboarding'
// Mounts auth pages into '#spa-root' and toggles visibility with main app '#app'.

// Route type (JS doc): { path: string, render: () => Promise<string>|string, afterMount?: () => void }

import { renderLogin, afterMountLogin } from './pages/login.js';
import { renderOnboarding, afterMountOnboarding } from './pages/onboarding.js';

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
      if (appEl) appEl.style.display = 'block';
    }
  },
  { path: '/login', render: renderLogin, afterMount: afterMountLogin },
  { path: '/onboarding', render: renderOnboarding, afterMount: afterMountOnboarding },
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
    } catch (_) {}
    try { if (spaEl) spaEl.innerHTML = ''; } catch (_) {}
  } else {
    if (appEl) appEl.style.setProperty('display', 'none', 'important');
    if (spaEl) spaEl.style.display = 'block';
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
  const a = e.target && /** @type {HTMLElement} */(e.target).closest && /** @type {HTMLElement} */(e.target).closest('a');
  if (a && a.origin === location.origin && a.getAttribute('data-spa') !== null) {
    e.preventDefault();
    navigate(a.pathname + (a.search || ''));
  }
});

// Expose navigate for non-module scripts to avoid circular deps
if (typeof window !== 'undefined') {
  window.__navigate = navigate;
}
