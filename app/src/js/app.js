// API Base URL configuration (unified)
import { API_BASE as RESOLVED_API_BASE } from '/src/lib/net/apiBase.js';
const API_BASE = (typeof window !== 'undefined' && window.CONFIG?.apiBase)
  ? window.CONFIG.apiBase
  : (RESOLVED_API_BASE || '/api');

// Remove global animation kill-switch. Initial app load animations are handled by
// app-ready/animations-complete logic below.

import { supabase } from '/src/supabase-client.js'
// Create a local alias for consistency with other modules and expose globally later
const supa = supabase;

// Mark SPA route class early to prevent flash of main app on non-root routes (e.g., /settings, /login)
try {
  const p = (typeof location !== 'undefined' && location.pathname) ? location.pathname : '/';
  const isSpa = p !== '/' && p !== '/index.html';
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('spa-route', isSpa);
    document.body.classList.toggle('spa-route', isSpa);
  }
} catch (_) { /* non-fatal */ }


function setAppHeight() {
  // Use static viewport height on mobile to prevent content pushdown when browser UI appears
  // Only use visualViewport for desktop or when explicitly needed for keyboard handling
  const isMobile = window.innerWidth <= 768;
  const h = isMobile ? window.innerHeight : (window.visualViewport ? window.visualViewport.height : window.innerHeight);
  document.documentElement.style.setProperty('--app-height', h + 'px');

  // Also set dynamic viewport height for modern browsers
  document.documentElement.style.setProperty('--dvh', h + 'px');
}

// Detect iOS PWA mode and add appropriate class
function detectiOSPWA() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;

  if (isIOS && isStandalone) {
    document.documentElement.classList.add('ios-pwa');
    // Additional adjustments for iOS PWA
    setAppHeight();
  }
}

function setThemeColor() {
  // This function is now handled by the theme manager
  // setThemeColor is no longer needed as theme manager handles meta theme colors
  // console.log('Theme colors are now managed by the theme system');
}

// Enhanced responsive month navigation handler - UPDATED: Always use dashboard navigation
function handleResponsiveMonthNavigation() {
  // Get month navigation elements
  const dashboardNav = document.querySelector('.dashboard-month-nav');
  const shiftNav = document.querySelector('.shift-section .month-navigation-container');

  if (!dashboardNav || !shiftNav) return;

  // UPDATED: Always use dashboard navigation across all screen sizes
  // This ensures a single month picker instance that stays in the dashboard section consistently
  document.body.classList.add('force-dashboard-nav');
}

setAppHeight();
setThemeColor();
detectiOSPWA();
handleResponsiveMonthNavigation(); // Initial call
window.addEventListener('resize', () => {
  setAppHeight();
  handleResponsiveMonthNavigation();
});
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => {
    setAppHeight();
    handleResponsiveMonthNavigation();
  });
}

// Also listen for orientation changes that might affect mobile browser UI
window.addEventListener('orientationchange', () => {
  setTimeout(() => {
    setAppHeight();
    handleResponsiveMonthNavigation(); // Handle month navigation positioning after orientation change
  }, 100); // Delay to ensure orientation change is complete
});

// Listen for scroll events that might trigger mobile browser UI changes
let scrollTimeout;
window.addEventListener('scroll', () => {
  clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => {
    setAppHeight();
  }, 50); // Debounced scroll handler
});

// Enhanced mobile keyboard handling with improved UX
function handleMobileKeyboard() {
  if (!window.visualViewport) return;

  let initialViewportHeight = window.visualViewport.height;
  let keyboardVisible = false;

  function onViewportChange() {
    const currentHeight = window.visualViewport.height;
    const heightDifference = initialViewportHeight - currentHeight;
    const wasKeyboardVisible = keyboardVisible;
    keyboardVisible = heightDifference > 150;

    if (keyboardVisible !== wasKeyboardVisible) {
      document.body.classList.toggle('keyboard-visible', keyboardVisible);
      if (keyboardVisible) {
        hideNavigationElements();
      } else {
        showNavigationElements();
      }
    }
  }

  function hideNavigationElements() {
    const shiftNav = document.querySelector('.shift-section .month-navigation-container');
    const dashboardNav = document.querySelector('.dashboard-month-nav');

    if (shiftNav) {
      shiftNav.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
      shiftNav.style.opacity = '0';
      shiftNav.style.transform = 'translateY(-20px)';
      shiftNav.style.pointerEvents = 'none';
    }

    if (dashboardNav) {
      dashboardNav.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
      dashboardNav.style.opacity = '0';
      dashboardNav.style.transform = 'translateY(-20px)';
      dashboardNav.style.pointerEvents = 'none';
    }
  }

  function showNavigationElements() {
    const shiftNav = document.querySelector('.shift-section .month-navigation-container');
    const dashboardNav = document.querySelector('.dashboard-month-nav');

    if (shiftNav) {
      shiftNav.style.opacity = '';
      shiftNav.style.transform = '';
      shiftNav.style.pointerEvents = '';
    }

    if (dashboardNav) {
      dashboardNav.style.opacity = '';
      dashboardNav.style.transform = '';
      dashboardNav.style.pointerEvents = '';
    }
  }

  window.visualViewport.addEventListener('resize', onViewportChange);

  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      initialViewportHeight = window.visualViewport.height;
      keyboardVisible = false;
      document.body.classList.remove('keyboard-visible');
      showNavigationElements();
    }, 500);
  });

  document.addEventListener('focusin', (e) => {
    if (!e.target.matches('input, textarea, select')) return;

    setTimeout(() => {
      if (!keyboardVisible) return;

      const inputRect = e.target.getBoundingClientRect();
      const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;

      if (inputRect.bottom > viewportHeight - 20) {
        const scrollAmount = Math.min(inputRect.bottom - viewportHeight + 40, 100);
        window.scrollBy({
          top: scrollAmount,
          behavior: 'smooth'
        });
      }
    }, 300);
  });
}

// Initialize mobile keyboard handling
if (window.innerWidth <= 768) {
  handleMobileKeyboard();
}

// Enhanced mobile input handling for better keyboard experience
function enhanceMobileInputs() {
  // Add touch-friendly behavior to all inputs
  const inputs = document.querySelectorAll('input, textarea, select');

  inputs.forEach(input => {
    // Prevent zoom on focus for iOS
    if (input.type !== 'file') {
      input.style.fontSize = '16px';
    }

    // Add smooth focus transitions
    input.addEventListener('focus', () => {
      input.style.transition = 'border-color 0.2s ease, box-shadow 0.2s ease';
    });

    // Handle mobile-specific input behavior
    if (input.tagName.toLowerCase() === 'textarea') {
      input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
      });
    }
  });
}

// Debugging function for viewport instability
function debugViewportStability() {
  if (window.location.search.includes('debug=viewport')) {
    let lastHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    let changeCount = 0;

    const logViewportChange = () => {
      const currentHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      if (Math.abs(currentHeight - lastHeight) > 5) {
        changeCount++;
        console.log(`Viewport change #${changeCount}: ${lastHeight}px → ${currentHeight}px`, {
          isKeyboardVisible: document.body.classList.contains('keyboard-visible'),
          activeElement: document.activeElement?.id || 'none'
        });
        lastHeight = currentHeight;
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', logViewportChange);
    }
    window.addEventListener('resize', logViewportChange);
  }
}

// Initialize mobile input enhancements and debugging
if (window.innerWidth <= 768) {
  document.addEventListener('DOMContentLoaded', () => {
    enhanceMobileInputs();
    debugViewportStability();
  });
  // Also run on dynamic content changes
  const observer = new MutationObserver(() => {
    enhanceMobileInputs();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

// Initialize Supabase client
document.addEventListener('DOMContentLoaded', async () => {
  // Create backdrop-filter sentinel to prevent pop-in on Safari/PWA
  if (!document.querySelector('.backdrop-sentinel')) {
    const s = document.createElement('div');
    s.className = 'backdrop-sentinel';
    document.body.appendChild(s);
  }

  // Enable global skeletons until profile + app data are ready
  document.body.classList.add('skeleton-active');
  // Only show the main app container early on the root route.
  // On SPA routes like /login, /onboarding, /settings/* we keep it hidden to avoid layering under SPA UI.
  const earlyAppEl = document.getElementById('app');
  const pathAtLoad = (typeof location !== 'undefined' && location.pathname) ? location.pathname : '/';
  const isRootRoute = pathAtLoad === '/' || pathAtLoad === '/index.html';
  if (earlyAppEl && isRootRoute) {
    earlyAppEl.style.setProperty('display', 'block', 'important');
    // Do NOT add 'app-ready' yet; that would hide content containers and suppress skeletons
  }

  window.supa = supa;
  try {
    const mask = (s) => {
      if (!s) return '';
      const str = String(s);
      if (str.length <= 8) return str[0] + '…' + str[str.length - 1];
      return str.slice(0, 4) + '…' + str.slice(-4);
    };
    const host = (() => { try { return new URL(window.CONFIG.supabase.url).host; } catch (_) { return window.CONFIG.supabase.url; } })();
    console.log(`[boot] supabase client url=${host} key=${mask(window.CONFIG.supabase.anonKey)}`);
  } catch (_) {}

  // Enhanced authentication guard with retry logic
  let session = null;
  let retryCount = 0;
  const maxRetries = 3; // Reduced from 5 to 3

  // Quick session check (non-blocking) - prefer retry loop to avoid false negatives
  try {
    const { data: { session: quickSession } } = await supa.auth.getSession();
    if (quickSession) {
      session = quickSession;
      // console.log('Quick session check: Session found');
    } else {
      // console.log('Quick session check: No session yet; will retry before redirecting');
    }
  } catch (quickCheckError) {
    // console.log('Quick session check failed, proceeding with retry logic:', quickCheckError);
  }

  // Load and display profile information immediately after greeting
  async function loadAndDisplayProfileInfo() {
    try {
      const { data: { user } } = await supa.auth.getUser();
      if (!user) return;

      // Load theme preferences from database (priority: database > localStorage)
      if (window.themeManager && window.themeManager.loadThemeFromDatabase) {
        await window.themeManager.loadThemeFromDatabase();
      }

      // Load nickname
      const nicknameElement = document.getElementById('userNickname');
      if (nicknameElement) {
        // Use first name if available, otherwise use first part of email
        const nickname = user.user_metadata?.first_name ||
                        user.email?.split('@')[0] ||
                        'Bruker';
        nicknameElement.textContent = nickname;
      }


      // Load avatar: read directly from user_settings via Supabase
      let avatarUrl = '';
      try {
        const userId = user?.id;
        if (userId) {
          const { data: row } = await supa
            .from('user_settings')
            .select('profile_picture_url')
            .eq('user_id', userId)
            .maybeSingle();
          avatarUrl = row?.profile_picture_url || '';
        }
      } catch (_) { /* ignore */ }
      if (!avatarUrl) avatarUrl = user.user_metadata?.avatar_url || '';
      const topbarImg = document.getElementById('userAvatarImg');
      const profileIcon = document.querySelector('.profile-icon');
      if (topbarImg) {
        if (avatarUrl) {
          // Attach robust handlers before setting src
          topbarImg.onload = () => {
            topbarImg.style.display = 'block';
            if (profileIcon) profileIcon.style.display = 'none';
          };
          topbarImg.onerror = () => {
            topbarImg.style.display = 'none';
            if (profileIcon) profileIcon.style.display = 'block';
          };
          topbarImg.src = avatarUrl;
        } else {
          topbarImg.style.display = 'none';
          if (profileIcon) profileIcon.style.display = 'block';
        }
      }
    } catch (error) {
      console.error('Error loading profile info:', error);
    }
  }

  // Enhanced skeleton removal with immediate appearance
  async function removeSkeletonsSmoothly() {
    // First, add app-ready class to enable content visibility
    const appEl = document.getElementById('app');
    if (appEl) {
      appEl.classList.add('app-ready');
    }

    // Immediately add animations-complete class for instant content appearance
    if (appEl) {
      appEl.classList.add('animations-complete');
    }

    // Now remove skeleton-active class to hide skeletons immediately
    document.body.classList.remove('skeleton-active');

    // Do not force-hide all skeleton placeholders here.
    // Leave per-section skeletons to disappear naturally as their data arrives.
  }

  // Wait for both profile info and app initialization to complete
  // before removing skeletons to ensure content is fully ready
  let profileInfoLoaded = false;
  let appInitialized = false;

  async function checkAndRemoveSkeletons() {
    // Only proceed when both app and profile are ready
    if (!(appInitialized && profileInfoLoaded)) return;

    // Wait until content has real data to avoid a flash of defaults
    try {
      await waitForContentReady();
    } catch (_) { /* fall through on timeout */ }

    // Small microtask delay to allow any first paint/update
    await new Promise(resolve => setTimeout(resolve, 50));
    await removeSkeletonsSmoothly();
  }

  // Wait for the app to be in a ready state
  async function waitForAppReady() {
    const maxWaitTime = 3000; // Maximum 3 seconds
    const checkInterval = 100; // Check every 100ms
    let elapsed = 0;

    while (elapsed < maxWaitTime) {
      // Check if the app has finished its initial setup
      // This includes waiting for the updateDisplay function to complete
      if (window.app && window.app.shifts && window.app.shifts.length >= 0) {
        // console.log('App is ready, proceeding with content check');
        break;
      }

      // Wait a bit more and check again
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      elapsed += checkInterval;
    }

    if (elapsed >= maxWaitTime) {
      console.warn('App readiness check timed out, proceeding anyway');
    }
  }

  // Wait for content to be fully populated with real data
  async function waitForContentReady() {
    const maxWaitTime = 5000; // Maximum 5 seconds to prevent hanging
    const checkInterval = 100; // Check every 100ms
    let elapsed = 0;

    while (elapsed < maxWaitTime) {
      // Early exit if app data loading is complete and there are no shifts
      // This prevents unnecessary waiting when the "no shifts" state is already determined
      if (window.app && window.app.isDataLoading === false && window.app.shifts && window.app.shifts.length === 0) {
        // console.log('No shifts detected and data loading complete, proceeding with skeleton removal immediately');
        break;
      }

      // Check if total card has been populated by appLogic (works even if value is 0 kr)
      const totalCard = document.querySelector('.total-card');
      const hasRealTotalData = totalCard && totalCard.dataset.populated === '1';

      // Check if next shift content has real data (not skeleton or empty state)
      const nextShiftContent = document.getElementById('nextShiftContent');
      const hasRealShiftData = nextShiftContent &&
        !nextShiftContent.querySelector('.skeleton') &&
        (nextShiftContent.children.length > 0 || nextShiftContent.querySelector('.next-shift-empty'));

      // Check if next payroll content has real data
      const nextPayrollContent = document.getElementById('nextPayrollContent');
      const hasRealPayrollData = nextPayrollContent &&
        !nextPayrollContent.querySelector('.skeleton') &&
        (nextPayrollContent.children.length > 0 || nextPayrollContent.querySelector('.next-payroll-empty'));

      // Check if month display has real data (not skeleton)
      const monthDisplay = document.querySelector('.month-display');
      const hasRealMonthData = monthDisplay &&
        monthDisplay.textContent &&
        monthDisplay.textContent !== '';

      // If all content is ready, break out of the loop
      if (hasRealTotalData && hasRealShiftData && hasRealPayrollData && hasRealMonthData) {
        // console.log('All content is ready, proceeding with skeleton removal');
        break;
      }

      // Wait a bit more and check again
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      elapsed += checkInterval;
    }

    if (elapsed >= maxWaitTime) {
      console.warn('Content readiness check timed out, proceeding anyway');
    }
  }

  // Mark profile info as loaded
  loadAndDisplayProfileInfo().then(() => {
    profileInfoLoaded = true;
    checkAndRemoveSkeletons();
  }).catch(error => {
    console.error('Error loading profile info:', error);
    profileInfoLoaded = true;
    checkAndRemoveSkeletons();
  });

  // Create and show welcome screen
  async function showWelcomeScreen() {
    // Fetch user for name
    const { data: { user } } = await supa.auth.getUser();
    const firstName = user?.user_metadata?.first_name || '';

    // Create overlay
    const welcomeScreen = document.createElement('div');
    welcomeScreen.id = 'welcomeScreen';
    const welcomeContainer = document.createElement('div');
    welcomeContainer.className = 'welcome-container';
    welcomeScreen.appendChild(welcomeContainer);
    document.body.appendChild(welcomeScreen);

    // Create "Hei" line
    const heiLine = document.createElement('div');
    heiLine.className = 'welcome-line';
    heiLine.id = 'heiLine';
    welcomeContainer.appendChild(heiLine);

    // Create name line(s)
    const nameLine = document.createElement('div');
    nameLine.className = 'welcome-line name-line';
    nameLine.id = 'nameLine';
    welcomeContainer.appendChild(nameLine);

    // Populate "Hei" letters
    const heiText = 'Hei';
    const heiLetters = [...heiText].map((char, i) => {
      const span = document.createElement('span');
      span.className = 'letter';
      span.textContent = char;
      heiLine.appendChild(span);
      return span;
    });

    // Handle name with potential line break for two-part names
    let nameLetters = [];
    if (firstName) {
      const nameParts = firstName.trim().split(' ');

      if (nameParts.length > 1) {
        // Multi-part name - create spans for potential responsive breaking
        nameParts.forEach((part, partIndex) => {
          const partSpan = document.createElement('span');
          partSpan.className = 'name-part';

          [...part].forEach((char, charIndex) => {
            const span = document.createElement('span');
            span.className = 'letter';
            span.textContent = char;
            partSpan.appendChild(span);
            nameLetters.push(span);
          });

          nameLine.appendChild(partSpan);

          // Add space between parts (except for the last part)
          if (partIndex < nameParts.length - 1) {
            const spaceSpan = document.createElement('span');
            spaceSpan.className = 'letter name-space';
            spaceSpan.textContent = '\u00A0';
            nameLine.appendChild(spaceSpan);
            nameLetters.push(spaceSpan);
          }
        });
      } else {
        // Single name part
        [...firstName].forEach((char, i) => {
          const span = document.createElement('span');
          span.className = 'letter';
          span.textContent = char;
          nameLine.appendChild(span);
          nameLetters.push(span);
        });
      }
    }

    const allLetters = [...heiLetters, ...nameLetters];

    // Animate letters in with improved timing
    allLetters.forEach((span, i) => {
      // Reduced stagger time from 0.1s to 0.08s for smoother flow
      span.style.animation = `letter-in 0.4s forwards ${i * 0.08}s`;
    });
    const inDuration = 400 + allLetters.length * 80; // Reduced timing
    await new Promise(res => setTimeout(res, inDuration + 100)); // Slightly longer buffer for smoother transition

    // Animate whole text out with better timing
    welcomeContainer.style.transformOrigin = 'center center';

    welcomeContainer.style.animation = `text-out 0.6s forwards`;
    await new Promise(res => setTimeout(res, 700));  // Longer buffer for smoother app entrance

    // Remove welcome overlay
    welcomeScreen.remove();
  }

  // Animate main app elements with coordinated, smooth reveal (no long staggers)
  function animateAppEntries() {
    const container = document.querySelector('.app-container');
    const appEl = document.getElementById('app');
    if (!container || !appEl) return;

    // Add the app-ready class to enable initial hidden states
    appEl.classList.add('app-ready');

    // Elements to reveal together (skip header which is already visible)
    const toReveal = [
      container.querySelector('.tab-bar-container'),
      container.querySelector('.content')
    ].filter(Boolean);

    // Use double requestAnimationFrame for paint-safe class toggles
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Prepare for animation
        toReveal.forEach(el => el.classList.add('animate-ready'));

        // Reveal all at once with a short delay to ensure styles applied
        setTimeout(() => {
          toReveal.forEach(el => el.classList.add('animate-complete'));

          // Finalize after animation
          setTimeout(() => {
            toReveal.forEach(el => el.classList.remove('animate-ready'));
            appEl.classList.add('animations-complete');
          }, 300); // shorter duration for snappier UX
        }, 50);
      });
    });
  }

  while (!session && retryCount < maxRetries) {
    console.log(`App.html: Checking session (attempt ${retryCount + 1}/${maxRetries})`);
    const { data: { session: currentSession } } = await supa.auth.getSession();
    session = currentSession;

    if (!session) {
      retryCount++;
      if (retryCount < maxRetries) {
        console.log(`App.html: No session found, waiting 200ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, 200));
      } else {
        console.log(`App.html: No session after ${maxRetries} attempts, redirecting to login`);
        // console.log('[login] no session – redirecting to login page');
        if (window.__navigate) window.__navigate('/login'); else window.location.href = '/login';
        return;
      }
    } else {
      console.log(`App.html: Session found for user:`, session.user.email);
    }
  }

  // Check onboarding status after successful authentication
  if (session?.user) {
    const user = session.user;

    // Check if user has finished onboarding
  const isOnOnboarding = location.pathname === '/onboarding';
  if (!user.user_metadata?.finishedOnboarding && !isOnOnboarding) {
    // console.log('→ redirect to onboarding (finishedOnboarding=false)');
    if (window.__navigate) window.__navigate('/onboarding'); else location.replace('/onboarding');
    return;
  }
  }

  // Expose logout function
  window.logout = async () => {
    try {
      await supa.auth.signOut();
    } catch (e) {
      console.warn('signOut error:', e?.message || e);
    }
    try {
      const { data: { session } } = await supa.auth.getSession();
      // console.log('[logout] session after signOut:', session ? 'still present' : 'null');
    } catch (_) {}
    try {
      // Clear app caches/state that might assume a session
      if (window.localStorage) {
        localStorage.removeItem('appState');
        localStorage.removeItem('employeeCache');
      }
      if (window.sessionStorage) {
        sessionStorage.removeItem('supabase_recovery_flow');
      }
    } catch (_) {}
    if (window.__navigate) window.__navigate('/login'); else window.location.href = '/login';
  };

  // After ensuring session, show welcome, init app, and display
  let appModule;
  try {
    // Bust cache to ensure latest appLogic edits are loaded
    appModule = await import('./appLogic.js');
  } catch (e) {
    console.error('Failed to load appLogic module:', e);
  }
  const app = appModule?.app;
  window.app = app;
  
  // Make hasEnterpriseSubscription available globally for shift edit route
  try {
    const { hasEnterpriseSubscription } = await import('./subscriptionUtils.js');
    window.hasEnterpriseSubscription = hasEnterpriseSubscription;
  } catch (e) {
    console.warn('Failed to load subscriptionUtils:', e);
  }


  // React to subscription changes by toggling visibility of the Ansatte tab
  try {
    document.addEventListener('subscription:updated', async () => {
      if (window.app && typeof window.app.updateTabBarVisibility === 'function') {
        try { await window.app.updateTabBarVisibility(); } catch (_) {}
      }
    });
  } catch (_) {}

  // Skip welcome screen animations entirely
  // await showWelcomeScreen();

  // Load and display profile information immediately after greeting
  await loadAndDisplayProfileInfo();

  // Initialize app with robust error handling so UI still appears
  let initFailed = false;
  if (app && typeof app.init === 'function') {
    try {
      await app.init();
      // Mark app as initialized
      appInitialized = true;
      checkAndRemoveSkeletons();
    } catch (e) {
      initFailed = true;
      console.error('App initialization failed:', e);
      try {
        // Attempt minimal fallback so user still sees UI
        app.loadFromLocalStorage?.();
      } catch (fallbackErr) {
        console.error('Fallback to local storage failed:', fallbackErr);
      }
      // Mark app as initialized even on error to prevent hanging
      appInitialized = true;
      checkAndRemoveSkeletons();
    }
  } else {
    initFailed = true;
    console.error('App module not available or missing init()');
    // Mark app as initialized even on error to prevent hanging
    appInitialized = true;
    checkAndRemoveSkeletons();
  }

  // If we're on a SPA route, don't show the main app container
  // Covers auth (/login, /onboarding) and settings pages (/settings, /settings/*)
  {
    const p = (typeof location !== 'undefined' && location.pathname) ? location.pathname : '/';
    const isSpaRoute = p !== '/' && p !== '/index.html';
    if (isSpaRoute) {
      const appAuthEl = document.getElementById('app');
      if (appAuthEl) appAuthEl.style.setProperty('display', 'none', 'important');
      return;
    }
  }

  // Display the app container immediately with no animations (root route only)
  const appEl = document.getElementById('app');
  if (appEl) {
    // Show the app immediately
    appEl.style.setProperty('display', 'block', 'important');
    // Mark as ready without running entry animations
    appEl.classList.add('animations-complete');

    // Ensure key sections are visible without any animated states (but keep month picker hidden during shimmer)
    try {
      const container = document.querySelector('.app-container');
      if (container) {
        const reveal = (el) => {
          if (!el) return;
          el.style.visibility = 'visible';
          el.style.opacity = '1';
          el.style.transform = 'none';
        };
        reveal(container.querySelector('.tab-bar-container'));
        reveal(container.querySelector('.content'));
        // Do not reveal month navigation while skeletons are active
      }
    } catch (e) {
      console.warn('Ensure-visible encountered an error:', e);
    }

    if (initFailed) {
      // Surface a non-blocking inline notice if init failed
      const warn = document.createElement('div');
      warn.className = 'nonblocking-warning';
      warn.style.cssText = 'margin:12px 16px;padding:10px;border-radius:var(--radius-panel);background:#332e00;color:#ffd666;font-size:14px;box-shadow:var(--shadow-card-lite);';
      warn.textContent = 'Noe gikk galt under innlasting. Viser tilgjengelig data – prøv å oppdatere siden.';
      appEl.prepend(warn);
    }
  }

  // Skeleton removal is now handled by checkAndRemoveSkeletons() function
  // which ensures both profile info and app initialization are complete

  // Etter init og visning av app
  // Legg til event listeners for alle knapper
  document.querySelectorAll('[onclick]').forEach(el => {
    const onClick = el.getAttribute('onclick');
    if (onClick) {
      // Wire a safe listener that mirrors the inline handler
      el.addEventListener('click', (event) => {
        try {
          // Parse and execute the onclick handler safely
          if (onClick.includes('app.')) {
            // Extract function name and parameters
            const match = onClick.match(/app\.(\w+)\((.*?)\)/);
            if (match) {
              const [, functionName, params] = match;

              // Handle different parameter types
              let parsedParams = [];
              if (params.trim()) {
                // Simple parameter parsing for common cases
                if (params.includes("'") || params.includes('"')) {
                  // String parameters
                  parsedParams = [params.replace(/['"]/g, '')];
                } else if (params.includes('event.stopPropagation()')) {
                  // Handle event.stopPropagation(); app.deleteShift(index)
                  event.stopPropagation();
                  const indexMatch = onClick.match(/app\.deleteShift\((\d+)\)/);
                  if (indexMatch) {
                    app.deleteShift(parseInt(indexMatch[1]));
                    return;
                  }
                } else if (params.includes('this')) {
                  // Handle 'this' parameter
                  parsedParams = [el];
                } else if (params.match(/^\d+$/)) {
                  // Numeric parameter
                  parsedParams = [parseInt(params)];
                }
              }

              // Execute the function
              if (app[functionName]) {
                console.log(`Executing ${functionName} with params:`, parsedParams);
                app[functionName](...parsedParams);
              }
            }
          } else if (onClick.includes('logout()')) {
            logout();
          }
        } catch (error) {
          console.error('Error executing onclick handler:', error, 'Original onclick:', onClick);
        }
      });
      // Remove the inline onclick attribute to satisfy strict CSP (no 'unsafe-inline')
      el.removeAttribute('onclick');
    }
  });

  // Replace inline onchange handlers with safe listeners (CSP-friendly)
  document.querySelectorAll('[onchange]').forEach(el => {
    const onChange = el.getAttribute('onchange');
    if (!onChange) return;

    el.addEventListener('change', (event) => {
      try {
        if (onChange.includes('app.')) {
          const match = onChange.match(/app\.(\w+)\((.*?)\)/);
          if (match) {
            const [, functionName, params] = match;
            let parsedParams = [];
            const p = params.trim();
            if (p) {
              if (/this\.value/.test(p)) {
                parsedParams = [event.target?.value];
              } else if (/this\.checked/.test(p)) {
                parsedParams = [!!event.target?.checked];
              } else if (p.includes("'") || p.includes('"')) {
                parsedParams = [p.replace(/['"]/g, '')];
              } else if (/^\d+$/.test(p)) {
                parsedParams = [parseInt(p)];
              } else if (p.includes('this')) {
                parsedParams = [event.target];
              }
            }
            if (app[functionName]) {
              console.log(`Executing ${functionName} with params:`, parsedParams);
              app[functionName](...parsedParams);
            }
          }
        }
      } catch (error) {
        console.error('Error executing onchange handler:', error, 'Original onchange:', onChange);
      }
    });

    // Remove the inline attribute to prevent CSP violations
    el.removeAttribute('onchange');
  });

  // Add event listeners for elements with class-based selectors (using event delegation)
  let eventListenersAdded = false;
  function addEventListeners() {
    if (eventListenersAdded) return; // Prevent duplicate listeners

    // Consolidated click event delegation
    document.body.addEventListener('click', (event) => {
      // Delete shift buttons
      const deleteBtn = event.target.closest('.delete-shift-btn');
      if (deleteBtn) {
        event.stopPropagation();
        const shiftIndex = parseInt(deleteBtn.getAttribute('data-shift-index'));
        app.deleteShift(shiftIndex).then(() => {
          app.closeShiftDetails();
        });
        return;
      }

      // Edit shift buttons
      const editBtn = event.target.closest('.edit-shift-btn');
      if (editBtn) {
        event.stopPropagation();
        const shiftId = editBtn.getAttribute('data-shift-id');
        app.editShift(shiftId);
        return;
      }

      // Close shift details button
      const closeBtn = event.target.closest('.close-shift-details');
      if (closeBtn) {
        event.stopPropagation();
        app.closeShiftDetails();
        return;
      }

      // Remove bonus slot buttons
      const removeBtn = event.target.closest('.remove-bonus');
      if (removeBtn) {
        event.stopPropagation();
        app.removeBonusSlot(removeBtn);
        return;
      }

      // Add supplement buttons
      const addWeekdayBtn = event.target.closest('#addWeekdaySupplementBtn');
      if (addWeekdayBtn) {
        event.stopPropagation();
        app.addBonusSlot('weekday');
        return;
      }

      const addSaturdayBtn = event.target.closest('#addSaturdaySupplementBtn');
      if (addSaturdayBtn) {
        event.stopPropagation();
        app.addBonusSlot('saturday');
        return;
      }

      const addSundayBtn = event.target.closest('#addSundaySupplementBtn');
      if (addSundayBtn) {
        event.stopPropagation();
        app.addBonusSlot('sunday');
        return;
      }

      // Modal close when clicking outside modal content
      const modal = event.target.closest('.modal');
      if (modal && event.target === modal) {
        const modalId = modal.id;
        if (modalId === 'settingsModal') {
          app.closeSettings();
        }
        return;
      }

      // Shift items (should be last to avoid conflicts)
      if (!event.target.closest('.btn')) {
        const shiftItem = event.target.closest('[data-shift-id]');
        if (shiftItem) {
          const shiftId = shiftItem.getAttribute('data-shift-id');
          app.showShiftDetails(shiftId);
        }
      }
    });

     // Handle ESC key to close modals
     document.addEventListener('keydown', (event) => {
       if (event.key === 'Escape') {
         const settingsModal = document.getElementById('settingsModal');
         if (settingsModal && settingsModal.style.display === 'block') {
           app.closeSettings();
         }
       }
     });

    eventListenersAdded = true;
  }

  // Call addEventListeners once - event delegation handles dynamic content
  addEventListeners();

  // Handle floating action bar visibility when viewing shifts section
  const snapContainer = document.querySelector('.snap-container');
  const floatingBar = document.querySelector('.floating-action-bar');
  const floatingBarBackdrop = document.querySelector('.floating-action-bar-backdrop');
  const shiftSection = document.querySelector('.shift-section');

  if (snapContainer && floatingBar && floatingBarBackdrop && shiftSection) {
    // Initially hide the floating bar and backdrop
    floatingBar.style.display = 'none';
    floatingBar.style.opacity = '0';
    floatingBarBackdrop.style.opacity = '0';

    let isVisible = false;
    let animationTimeout = null;
    let ticking = false;

    function checkFloatingBarVisibility() {
      const rect = shiftSection.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // Calculate how much of the viewport the shifts section occupies
      const visibleTop = Math.max(0, rect.top);
      const visibleBottom = Math.min(viewportHeight, rect.bottom);
      const visibleHeight = Math.max(0, visibleBottom - visibleTop);
      const viewportCoverage = visibleHeight / viewportHeight;

      // Show floating bar only when shifts section occupies at least 60% of viewport
      const shouldBeVisible = viewportCoverage >= 0.6;

      if (shouldBeVisible && !isVisible) {
        // Show with fade in animation
        isVisible = true;
        clearTimeout(animationTimeout);
        floatingBar.style.display = 'flex';
        floatingBar.style.animation = 'fadeInUp 0.3s ease-out forwards';
        floatingBar.style.opacity = '1';
        floatingBarBackdrop.style.opacity = '1';
      } else if (!shouldBeVisible && isVisible) {
        // Hide with fade out animation
        isVisible = false;
        clearTimeout(animationTimeout);
        floatingBar.style.animation = 'fadeOutDown 0.3s ease-out forwards';
        floatingBar.style.opacity = '0';
        floatingBarBackdrop.style.opacity = '0';

        // Hide completely after animation completes
        animationTimeout = setTimeout(() => {
          if (!isVisible) {
            floatingBar.style.display = 'none';
          }
        }, 300);
      }

      ticking = false;
    }

    // Check on scroll with throttling
    snapContainer.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(checkFloatingBarVisibility);
        ticking = true;
      }
    });

    // Check initially
    checkFloatingBarVisibility();
  }

});
