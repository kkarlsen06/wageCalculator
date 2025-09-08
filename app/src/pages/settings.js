// Redesigned Settings route with home list + detail subpages and slide animations

function getHomeView() {
  return `
  <div class="settings-home">
    <div class="settings-content">
    <h1 class="settings-title">Innstillinger</h1>
    <ul class="settings-list" role="list">
      <li>
        <div class="settings-item" data-spa data-href="/settings/account">
          <div class="item-main">
            <svg class="item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <div class="item-text">
              <span class="item-title">Konto</span>
              <span class="item-sub">Profil, sikkerhet og tilgang</span>
            </div>
          </div>
          <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </div>
      </li>
      <li>
        <div class="settings-item" data-spa data-href="/settings/wage">
          <div class="item-main">
            <svg class="item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
            <div class="item-text">
              <span class="item-title">Lønn</span>
              <span class="item-sub">Grunnlønn og utbetaling</span>
            </div>
          </div>
          <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </div>
      </li>
      <li>
        <div class="settings-item" data-spa data-href="/settings/wage-advanced">
          <div class="item-main">
            <svg class="item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            <div class="item-text">
              <span class="item-title">Avansert lønn</span>
              <span class="item-sub">Tillegg, pauser og skatt</span>
            </div>
          </div>
          <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </div>
      </li>
      <li>
        <div class="settings-item" data-spa data-href="/settings/interface">
          <div class="item-main">
            <svg class="item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
            <div class="item-text">
              <span class="item-title">Utseende</span>
              <span class="item-sub">Tema, visninger og bedriftsfunksjoner</span>
            </div>
          </div>
          <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </div>
      </li>
      <li>
        <div class="settings-item" data-spa data-href="/settings/data">
          <div class="item-main">
            <svg class="item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M3 3h18v18H3z"></path>
              <path d="M3 9h18"></path>
              <path d="M9 21V9"></path>
            </svg>
            <div class="item-text">
              <span class="item-title">Data</span>
              <span class="item-sub">Eksport, import og sikkerhetskopi</span>
            </div>
          </div>
          <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </div>
      </li>
    </ul>
    </div>
    <div class="settings-bottom-bar">
      <button type="button" class="btn btn-secondary" data-spa data-href="/">Lukk</button>
    </div>
  </div>`;
}

function getAccountDetail() {
  return `
  <div class="settings-detail">
    <div class="settings-content">
      <h2 class="detail-title">Konto</h2>
      <div class="detail-body">
        <div class="placeholder-content">
          <div class="placeholder-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <h3>Kontoinnstillinger</h3>
          <p>Profil, sikkerhet og tilgang vil bli implementert her.</p>
        </div>
      </div>
    </div>
    <div class="settings-bottom-bar">
      <button type="button" class="btn btn-secondary" data-spa data-href="/">Lukk</button>
      <button type="button" class="btn btn-secondary" data-spa data-href="/settings?from=detail">Tilbake</button>
    </div>
  </div>`;
}

function getWageDetail() {
  return `
  <div class="settings-detail">
    <div class="settings-content">
      <h2 class="detail-title">Lønn</h2>
      <div class="detail-body">
        <div class="placeholder-content">
          <div class="placeholder-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
          <h3>Lønnsinnstillinger</h3>
          <p>Grunnlønn og utbetaling vil bli implementert her.</p>
        </div>
      </div>
    </div>
    <div class="settings-bottom-bar">
      <button type="button" class="btn btn-secondary" data-spa data-href="/">Lukk</button>
      <button type="button" class="btn btn-secondary" data-spa data-href="/settings?from=detail">Tilbake</button>
    </div>
  </div>`;
}

function getWageAdvancedDetail() {
  return `
  <div class="settings-detail">
    <div class="settings-content">
      <h2 class="detail-title">Avansert lønn</h2>
      <div class="detail-body">
        <div class="placeholder-content">
          <div class="placeholder-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </div>
          <h3>Avanserte lønnsinnstillinger</h3>
          <p>Tillegg, pauser og skatt vil bli implementert her.</p>
        </div>
      </div>
    </div>
    <div class="settings-bottom-bar">
      <button type="button" class="btn btn-secondary" data-spa data-href="/">Lukk</button>
      <button type="button" class="btn btn-secondary" data-spa data-href="/settings?from=detail">Tilbake</button>
    </div>
  </div>`;
}

function getInterfaceDetail() {
  return `
  <div class="settings-detail">
    <div class="settings-content">
      <h2 class="detail-title">Utseende</h2>
      <div class="detail-body">
        <div class="placeholder-content">
          <div class="placeholder-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
          </div>
          <h3>Utseendeinnstillinger</h3>
          <p>Tema, visninger og bedriftsfunksjoner vil bli implementert her.</p>
        </div>
      </div>
    </div>
    <div class="settings-bottom-bar">
      <button type="button" class="btn btn-secondary" data-spa data-href="/">Lukk</button>
      <button type="button" class="btn btn-secondary" data-spa data-href="/settings?from=detail">Tilbake</button>
    </div>
  </div>`;
}

function getDataDetail() {
  return `
  <div class="settings-detail">
    <div class="settings-content">
      <h2 class="detail-title">Data</h2>
      <div class="detail-body">
        <div class="placeholder-content">
          <div class="placeholder-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 3h18v18H3z"></path>
              <path d="M3 9h18"></path>
              <path d="M9 21V9"></path>
            </svg>
          </div>
          <h3>Databehandling</h3>
          <p>Eksport, import og sikkerhetskopi vil bli implementert her.</p>
        </div>
      </div>
    </div>
    <div class="settings-bottom-bar">
      <button type="button" class="btn btn-secondary" data-spa data-href="/">Lukk</button>
      <button type="button" class="btn btn-secondary" data-spa data-href="/settings?from=detail">Tilbake</button>
    </div>
  </div>`;
}

export function renderSettings() {
  const path = typeof location !== 'undefined' ? location.pathname : '/settings';
  const isHome = path === '/settings';
  const section = path.split('/')[2] || '';
  let inner;
  if (isHome) {
    inner = getHomeView();
  } else if (section === 'account') {
    inner = getAccountDetail();
  } else if (section === 'wage') {
    inner = getWageDetail();
  } else if (section === 'wage-advanced') {
    inner = getWageAdvancedDetail();
  } else if (section === 'interface') {
    inner = getInterfaceDetail();
  } else if (section === 'data') {
    inner = getDataDetail();
  } else {
    inner = getHomeView();
  }
  return `
  <div id="settingsPage" class="settings-page app-container">
    ${inner}
  </div>`;
}

export function afterMountSettings() {
  const path = typeof location !== 'undefined' ? location.pathname : '/settings';
  const section = path.split('/')[2] || '';
  const params = new URLSearchParams(location.search || '');

  // Entrance animations - apply only to inner content wrapper
  try {
    const content = document.querySelector('#settingsPage .settings-content');
    if (content) {
      if (section) {
        content.classList.add('slide-in-right');
        setTimeout(() => content.classList.remove('slide-in-right'), 350);
      } else if (params.get('from') === 'detail') {
        content.classList.add('slide-in-left');
        // Clean URL params without reload
        try { history.replaceState({}, '', '/settings'); } catch (_) {}
        setTimeout(() => content.classList.remove('slide-in-left'), 350);
      }
    }
  } catch (_) {}

  // Create floating settings bar - portal approach to avoid containing block issues
  try {
    // Hide any inline bottom bars in the content to prevent duplicates
    document.querySelectorAll('#settingsPage .settings-bottom-bar').forEach(el => {
      el.style.display = 'none';
    });

    // Clean up any existing floating elements globally
    document.querySelectorAll('.floating-settings-backdrop, .floating-settings-bar').forEach(el => el.remove());

    // Create a dedicated portal container that's guaranteed to be outside all transforms/contains
    let portal = document.getElementById('settings-floating-portal');
    if (!portal) {
      portal = document.createElement('div');
      portal.id = 'settings-floating-portal';
      portal.style.cssText = `
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        pointer-events: none !important;
        z-index: 9999 !important;
        transform: none !important;
        will-change: auto !important;
        contain: none !important;
        isolation: auto !important;
      `;
      // Append to document.documentElement instead of body to avoid any body-level constraints
      document.documentElement.appendChild(portal);
    }

    // Create backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'floating-settings-backdrop';
    backdrop.style.pointerEvents = 'none';
    portal.appendChild(backdrop);

    // Create floating bar
    const bar = document.createElement('div');
    bar.className = 'floating-settings-bar';
    bar.style.pointerEvents = 'all'; // Re-enable pointer events for the bar itself
    const isDetail = !!section;
    
    // Render contents: Close button (left) and Back button (right when detail)
    bar.innerHTML = `
      <button type="button" class="btn btn-secondary" data-spa data-href="/">Lukk</button>
      ${isDetail ? `
        <button type="button" class="back-btn" data-spa data-href="/settings?from=detail" aria-label="Tilbake">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          <span>Tilbake</span>
        </button>
      ` : '<span></span>'}
    `;
    
    portal.appendChild(bar);
  } catch (e) {
    console.warn('[settings-route] floating settings bar init failed', e);
  }
}
