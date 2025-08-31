// API Base URL configuration
const API_BASE = import.meta.env.VITE_API_URL || '/api';
// Optional separate base for streaming to bypass proxies/CDNs that buffer POST responses
// If not provided via config, auto-select Azure origin in production domain.
const STREAM_API_BASE = window.CONFIG?.apiStreamBase
  || ((typeof window !== 'undefined' && /kkarlsen\.dev$/i.test(window.location.hostname))
      ? 'https://server.kkarlsen.dev'
      : API_BASE);

// Remove global animation kill-switch. Initial app load animations are handled by
// app-ready/animations-complete logic below.

import { supabase } from '/src/supabase-client.js'
// then just use supabase directly

// DEBUG: check client
supabase.auth.getSession().then(({ data, error }) => {
  console.log("[debug] supabase session", data?.session, error)
})

function setAppHeight() {
  // Skip dynamic height calculations in chatbox-view mode to prevent viewport instability
  if (document.body.classList.contains('chatbox-view')) {
    return;
  }

  // Use visual viewport for better mobile browser UI handling
  const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
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
  console.log('Theme colors are now managed by the theme system');
}

// Enhanced responsive month navigation handler - UPDATED: Always use dashboard navigation
function handleResponsiveMonthNavigation() {
  // Skip navigation calculations in chatbox-view mode to prevent viewport instability
  if (document.body.classList.contains('chatbox-view')) {
    return;
  }

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
  // Skip scroll-based height calculations in chatbox-view mode
  if (document.body.classList.contains('chatbox-view')) {
    return;
  }

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
  let keyboardTransitionTimeout = null;
  let scrollPosition = 0;

  function onViewportChange() {
    // Skip viewport calculations in chatbox-view mode to prevent instability
    if (document.body.classList.contains('chatbox-view')) {
      // In chatbox-view, only handle basic keyboard state for CSS classes
      const currentHeight = window.visualViewport.height;
      const heightDifference = initialViewportHeight - currentHeight;
      const wasKeyboardVisible = keyboardVisible;
      keyboardVisible = heightDifference > 150;

      if (keyboardVisible !== wasKeyboardVisible) {
        if (keyboardVisible) {
          document.body.classList.add('keyboard-visible');
        } else {
          document.body.classList.remove('keyboard-visible');
        }
      }
      return;
    }

    const currentHeight = window.visualViewport.height;
    const heightDifference = initialViewportHeight - currentHeight;

    // Keyboard is considered visible if viewport height decreased by more than 150px
    const wasKeyboardVisible = keyboardVisible;
    keyboardVisible = heightDifference > 150;

    // Only act on keyboard state changes
    if (keyboardVisible !== wasKeyboardVisible) {
      const chatboxPill = document.getElementById('chatboxPill');
      const chatboxInput = document.getElementById('chatboxInput');

      // Clear any pending transition timeout
      if (keyboardTransitionTimeout) {
        clearTimeout(keyboardTransitionTimeout);
      }

      if (keyboardVisible) {
        // Keyboard appeared - optimize layout

        // Add keyboard visible class with smooth transition
        document.body.classList.add('keyboard-visible');

        // No scroll position manipulation or viewport stabilization in any mode
        // CSS-only positioning handles everything

        // Hide non-essential navigation elements
        hideNavigationElements();

      } else {
        // Keyboard hidden - restore layout

        document.body.classList.remove('keyboard-visible');

        // No scroll position manipulation - CSS handles everything

        // Show navigation elements again
        showNavigationElements();
      }
    }
  }

  function hideNavigationElements() {
    // Skip hiding navigation elements in chatbox-view mode to prevent layout shifts
    if (document.body.classList.contains('chatbox-view')) {
      return; // Don't hide anything in chatbox-view - elements are already hidden by CSS
    }

    // Hide shifts section navigation (only in regular dashboard view)
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
    // Skip showing navigation elements in chatbox-view mode to prevent layout shifts
    if (document.body.classList.contains('chatbox-view')) {
      return; // Don't show anything in chatbox-view - elements are controlled by CSS
    }

    // Show navigation elements again (only in regular dashboard view)
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

  // Listen for viewport changes
  window.visualViewport.addEventListener('resize', onViewportChange);

  // Handle orientation changes
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      initialViewportHeight = window.visualViewport.height;
      keyboardVisible = false;
      document.body.classList.remove('keyboard-visible');
      // No scroll position manipulation
      showNavigationElements();
    }, 500);
  });

  // Prevent any page movement when chatbox input is focused
  document.addEventListener('focusin', (e) => {
    if (e.target.matches('input, textarea, select')) {
      // For chatbox input, prevent ALL movement - page stays exactly where it is
      if (e.target.id === 'chatboxInput') {
        // Store current scroll position
        const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const currentScrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

        // Prevent any scroll movement
        setTimeout(() => {
          window.scrollTo(currentScrollLeft, currentScrollTop);
        }, 0);

        return;
      }

      // For other inputs outside chatbox-view, use gentle scrolling if needed
      if (!document.body.classList.contains('chatbox-view')) {
        setTimeout(() => {
          if (keyboardVisible) {
            const inputRect = e.target.getBoundingClientRect();
            const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;

            // Only scroll if input is significantly hidden
            if (inputRect.bottom > viewportHeight - 20) {
              const scrollAmount = Math.min(inputRect.bottom - viewportHeight + 40, 100);
              window.scrollBy({
                top: scrollAmount,
                behavior: 'smooth'
              });
            }
          }
        }, 300);
      }
    }
  });

  // Adjust chat layout when keyboard is active and input is focused
  function adjustChatLayoutForKeyboard() {
    if (!document.body.classList.contains('chatbox-view')) return;

    const chatboxInput = document.getElementById('chatboxInput');
    const chatboxLog = document.getElementById('chatboxLog');
    const dashboardContent = document.querySelector('.chatbox-view .dashboard-content');

    if (!chatboxInput || !chatboxLog) return;

    // Get input position after browser scroll
    const inputRect = chatboxInput.getBoundingClientRect();
    const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;

    // Calculate available space above input for chat content
    // Account for collapsed spacing (no gaps, margins, or padding)
    const availableHeight = inputRect.top - 40; // Reduced from 60px due to collapsed spacing

    // Adjust chat log to fit in available space
    if (availableHeight > 100) { // Minimum viable height
      chatboxLog.style.maxHeight = availableHeight + 'px';
      chatboxLog.style.height = availableHeight + 'px';

      // Scroll chat log to bottom to show latest messages
      setTimeout(() => {
        chatboxLog.scrollTop = chatboxLog.scrollHeight;
      }, 50);
    }

    // Also ensure dashboard content uses collapsed spacing
    if (dashboardContent) {
      dashboardContent.style.marginBottom = '0';
      dashboardContent.style.gap = '0';
      dashboardContent.style.paddingBottom = '0';
    }
  }

  // Handle input blur events and restore layout
  document.addEventListener('focusout', (e) => {
    if (e.target.matches('input, textarea, select')) {
      // Clear any pending timeouts
      if (keyboardTransitionTimeout) {
        clearTimeout(keyboardTransitionTimeout);
      }

      // Restore chat layout when chatbox input loses focus
      if (e.target.id === 'chatboxInput') {
        setTimeout(() => {
          restoreChatLayout();
        }, 100);
      }
    }
  });

  // Restore chat layout to normal when input is not focused
  function restoreChatLayout() {
    if (!document.body.classList.contains('chatbox-view')) return;

    const chatboxLog = document.getElementById('chatboxLog');
    const dashboardContent = document.querySelector('.chatbox-view .dashboard-content');

    if (!chatboxLog) return;

    // Reset chat log to normal size
    chatboxLog.style.maxHeight = '';
    chatboxLog.style.height = '';

    // Restore normal dashboard content spacing
    if (dashboardContent) {
      dashboardContent.style.marginBottom = '';
      dashboardContent.style.gap = '';
      dashboardContent.style.paddingBottom = '';
    }
  }
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
      // Special handling for chatbox input - prevent any scroll movement
      if (input.id === 'chatboxInput') {
        // Prevent scroll on focus
        input.addEventListener('focus', (e) => {
          e.preventDefault();
          // Store and maintain scroll position
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

          setTimeout(() => {
            window.scrollTo(scrollLeft, scrollTop);
          }, 0);
        });

        input.addEventListener('input', () => {
          // Simple auto-resize without any layout changes
          input.style.height = 'auto';
          const newHeight = Math.min(input.scrollHeight, 80);
          input.style.height = newHeight + 'px';
          // No layout manipulation - input stays in place
        });
      } else {
        // Auto-resize other textareas normally
        input.addEventListener('input', () => {
          input.style.height = 'auto';
          input.style.height = Math.min(input.scrollHeight, 120) + 'px';
        });
      }
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
          isChatboxView: document.body.classList.contains('chatbox-view'),
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
  // Enable global skeletons until profile + app data are ready
  document.body.classList.add('skeleton-active');
  // Show app container immediately so skeletons are visible
  const earlyAppEl = document.getElementById('app');
  if (earlyAppEl) {
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
      console.log('Quick session check: Session found');
    } else {
      console.log('Quick session check: No session yet; will retry before redirecting');
    }
  } catch (quickCheckError) {
    console.log('Quick session check failed, proceeding with retry logic:', quickCheckError);
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

      // Update chatbox text with user name
      if (window.chatbox && window.chatbox.updateText) {
        window.chatbox.updateText();
      }

      // Load avatar: prefer /settings.profile_picture_url, fallback to user metadata
      let avatarUrl = '';
      try {
        const { data: { session } } = await supa.auth.getSession();
        const token = session?.access_token;
        if (token) {
          const resp = await fetch(`${window.CONFIG.apiBase}/settings`, { headers: { Authorization: `Bearer ${token}` } });
          if (resp.ok) {
            const json = await resp.json();
            avatarUrl = json?.profile_picture_url || '';
          }
        }
      } catch (_) { /* ignore */ }
      // Fallback: read directly from user_settings via Supabase if backend not used
      if (!avatarUrl) {
        try {
          const userId = user?.id;
          if (!userId) return;
          const { data: row } = await supa
            .from('user_settings')
            .select('profile_picture_url')
            .eq('user_id', userId)
            .maybeSingle();
          avatarUrl = row?.profile_picture_url || '';
        } catch (_) { /* ignore */ }
      }
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
        console.log('App is ready, proceeding with content check');
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
        console.log('All content is ready, proceeding with skeleton removal');
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
        console.log('[login] no session – redirecting to login page');
        window.location.href = 'login.html';
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
    const isOnOnboarding = location.pathname.endsWith('/onboarding.html');
    if (!user.user_metadata?.finishedOnboarding && !isOnOnboarding) {
      console.log('→ redirect to onboarding (finishedOnboarding=false)');
      location.replace('/onboarding.html?from=' + encodeURIComponent(location.pathname));
      return;
    }
  }

  // Expose logout function
  window.logout = async () => {
    // Clear chat log before signing out
    if (window.chatbox && window.chatbox.clear) {
      window.chatbox.clear();
    }
    try {
      await supa.auth.signOut();
    } catch (e) {
      console.warn('signOut error:', e?.message || e);
    }
    try {
      const { data: { session } } = await supa.auth.getSession();
      console.log('[logout] session after signOut:', session ? 'still present' : 'null');
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
    window.location.href = 'login.html';
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

  // Display the app container immediately with no animations
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
      warn.style.cssText = 'margin:12px 16px;padding:10px;border-radius:8px;background:#332e00;color:#ffd666;font-size:14px;';
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

      // Modal close when clicking outside modal content
      const modal = event.target.closest('.modal');
      if (modal && event.target === modal) {
        const modalId = modal.id;
        if (modalId === 'addShiftModal') {
          app.closeAddShiftModal();
        } else if (modalId === 'editShiftModal') {
          app.closeEditShift();
        } else if (modalId === 'settingsModal') {
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
         // Check which modal is open and close it
         const modalActions = {
           'addShiftModal': () => app.closeAddShiftModal(),
           'editShiftModal': () => app.closeEditShift(),
           'settingsModal': () => app.closeSettings()
         };

         for (const [modalId, closeAction] of Object.entries(modalActions)) {
           const modal = document.getElementById(modalId);
           if (modal && modal.style.display === 'block') {
             closeAction();
             break;
           }
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

// ===== CHATBOX FUNCTIONALITY =====
(function() {
  'use strict';

  // Keep conversation history; server injects the authoritative system prompt.
  let chatMessages = [];

  let chatElements = {};
  let isExpanded = false;
  let hasFirstMessage = false;

  // Initialize chatbox when DOM is ready
  function initChatbox() {
    chatElements = {
      pill: document.getElementById('chatboxPill'),
      expandedContent: document.getElementById('chatboxExpandedContent'),
      close: document.getElementById('chatboxClose'),
      newChat: document.getElementById('chatboxNewChat'),
      log: document.getElementById('chatboxLog'),
      input: document.getElementById('chatboxInput'),
      send: document.getElementById('chatboxSend'),
      pillText: document.getElementById('chatboxPillPlaceholder')
    };

    if (!chatElements.pill || !chatElements.expandedContent) {
      console.warn('Chatbox elements not found');
      return;
    }

    setupChatEventListeners();
    updateChatboxPlaceholder(); // Set initial placeholder with user name
  }

  // Update chatbox placeholder with user's name
  async function updateChatboxPlaceholder() {
    try {
      // Check if Supabase client is available
      if (!window.supa || !window.supa.auth) {
        console.log('Supabase client not yet available, using default text');
        if (chatElements.pillText) {
          chatElements.pillText.textContent = 'Trenger du hjelp?';
        }
        return;
      }

      const { data: { user } } = await window.supa.auth.getUser();
      if (!user || !chatElements.pillText) return;

      // Use first name if available, otherwise use first part of email, fallback to 'Bruker'
      const userName = user.user_metadata?.first_name ||
                      user.email?.split('@')[0] ||
                      'Bruker';

      chatElements.pillText.textContent = `Trenger du hjelp, ${userName}?`;
    } catch (err) {
      console.error('Error updating chatbox text:', err);
      // Fallback to default
      if (chatElements.pillText) {
        chatElements.pillText.textContent = 'Trenger du hjelp, Bruker?';
      }
    }
  }

  function setupChatEventListeners() {
    // Pill content click to expand chatbox directly (but not when expanded or clicking close button)
    chatElements.pill.addEventListener('click', function(e) {
      if (!e.target.closest('.chatbox-close') && !isExpanded) {
        expandChatbox();
      }
    });

    // Close button
    if (chatElements.close) {
      chatElements.close.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        collapseChatbox();
      });
    }

    // New chat button
    if (chatElements.newChat) {
      chatElements.newChat.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        startNewChat();
      });
    }

    // Send button in expanded view
    if (chatElements.send) {
      chatElements.send.addEventListener('click', sendExpandedMessage);
    }

    // Note: Pill input event handlers removed since we now expand directly

    // Enter key in expanded input (with Shift+Enter for new line)
    if (chatElements.input) {
      chatElements.input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendExpandedMessage();
        }
      });

      // Auto-resize textarea in expanded view
      chatElements.input.addEventListener('input', autoResizeTextarea);
    }

    // Note: Click outside handler removed since we no longer use input mode
  }

  // Add personalized greeting message
  async function addGreetingMessage() {
    try {
      // Get current time for appropriate greeting
      const now = new Date();
      const hour = now.getHours();
      let timeGreeting;

      if (hour >= 5 && hour < 12) {
        timeGreeting = 'God morgen';
      } else if (hour >= 12 && hour < 17) {
        timeGreeting = 'God dag';
      } else if (hour >= 17 && hour < 22) {
        timeGreeting = 'God kveld';
      } else {
        timeGreeting = 'God natt';
      }

      // Get user name for personalization
      let userName = 'Bruker';
      try {
        if (window.supa && window.supa.auth) {
          const { data: { user } } = await window.supa.auth.getUser();
          if (user) {
            userName = user.user_metadata?.first_name ||
                      user.email?.split('@')[0] ||
                      'Bruker';
          }
        }
      } catch (err) {
        console.log('Could not get user info for greeting:', err);
      }

      // Create engaging greeting message
      const greetingMessages = [
        `${timeGreeting}, ${userName}! 👋 Jeg er her for å hjelpe deg med å registrere skift og holde oversikt over arbeidstiden din. Hva kan jeg hjelpe deg med i dag?`,
        `${timeGreeting}! 🌟 Klar for å gjøre arbeidsdagen din enklere? Jeg kan hjelpe deg registrere skift, legge til serier, eller svare på spørsmål om appen.`,
        `Hei ${userName}! ${timeGreeting} ✨ Jeg er din personlige assistent for skiftregistrering. Spør meg om hva som helst - fra å legge til nye skift til å forstå statistikkene dine!`
      ];

      // Select a random greeting
      const randomGreeting = greetingMessages[Math.floor(Math.random() * greetingMessages.length)];

      // Add the greeting message with streaming animation
      appendMessage('assistant', randomGreeting, { streaming: true, streamSpeed: 25 });

    } catch (err) {
      console.error('Error creating greeting message:', err);
      // Fallback greeting with streaming animation
      appendMessage('assistant', 'Hei! 👋 Jeg er her for å hjelpe deg med å registrere skift og holde oversikt over arbeidstiden din. Hva kan jeg hjelpe deg med?', { streaming: true, streamSpeed: 25 });
    }
  }

  // Note: enterInputMode and exitInputMode functions removed since we now expand directly

  function expandChatbox() {
    isExpanded = true;

    // Apply chatbox view similar to stats view
    applyChatboxView();

    chatElements.pill.classList.add('expanded');
    chatElements.expandedContent.style.display = 'block';
    chatElements.close.style.display = 'flex';
    if (chatElements.newChat) {
      chatElements.newChat.style.display = 'flex';
    }

    // Add class to body for CSS targeting (fallback for browsers without :has() support)
    document.body.classList.add('chatbox-expanded-active');

    // Note: Greeting message is now handled by the tab view system in appLogic.js
    // to avoid duplicate greetings

    // Focus input after animation - prevent any page movement
    setTimeout(() => {
      if (chatElements.input) {
        // Store current scroll position before focus
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

        // Focus input with scroll prevention
        chatElements.input.focus({ preventScroll: true });

        // Ensure page hasn't moved
        setTimeout(() => {
          window.scrollTo(scrollLeft, scrollTop);
        }, 0);
      }
    }, 300);
  }

  function collapseChatbox() {
    isExpanded = false;
    hasFirstMessage = false;

    // Restore normal dashboard view
    restoreNormalDashboardView();

    chatElements.pill.classList.remove('expanded');
    chatElements.expandedContent.style.display = 'none';
    chatElements.close.style.display = 'none';
    if (chatElements.newChat) {
      chatElements.newChat.style.display = 'none';
    }
    // Pill text is always visible - no need to hide/show

    // Remove class from body
    document.body.classList.remove('chatbox-expanded-active');

    // Clear chat log
    if (chatElements.log) {
      chatElements.log.innerHTML = '';
    }
    chatMessages = [];
  }

  function startNewChat() {
    // Clear current chat messages and history
    chatMessages = [];
    if (chatElements.log) {
      chatElements.log.innerHTML = '';
    }
    
    // Reset chat state
    hasFirstMessage = false;
    
    // Add a new greeting message
    addGreetingMessage();
    
    // Focus the input field
    setTimeout(() => {
      if (chatElements.input) {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        chatElements.input.focus({ preventScroll: true });
        
        setTimeout(() => {
          window.scrollTo(scrollLeft, scrollTop);
        }, 0);
      }
    }, 100);
  }

  function autoResizeTextarea() {
    const textarea = chatElements.input;
    if (!textarea) return;

    // Reset height to auto to get accurate scrollHeight
    textarea.style.height = 'auto';

    // Calculate max height based on keyboard visibility
    const isKeyboardVisible = document.body.classList.contains('keyboard-visible');
    const maxHeight = isKeyboardVisible ? 80 : 100; // Smaller max height when keyboard is visible

    // Set new height with smooth transition
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = newHeight + 'px';

    // No scroll manipulation for chatbox input - CSS positioning handles everything
    // Input positioning is handled entirely by CSS fixed positioning
  }

  // Apply chatbox view - similar to stats view functionality
  function applyChatboxView() {
    const body = document.body;
    const dashboardContent = document.querySelector('.dashboard-content');
    const chatboxContainer = document.querySelector('.chatbox-container');

    if (!dashboardContent || !chatboxContainer) return;

    // Add chatbox view class to body
    body.classList.add('chatbox-view');

    // Hide dashboard cards manually as backup (but keep shifts section visible)
    const totalCard = document.querySelector('.total-card');
    const nextShiftCard = document.querySelector('.next-shift-card');
    const nextPayrollCard = document.querySelector('.next-payroll-card');
    const monthNav = document.querySelector('.dashboard-month-nav');
    const floatingActionBar = document.querySelector('.floating-action-bar');

    if (totalCard) totalCard.style.display = 'none';
    if (nextShiftCard) nextShiftCard.style.display = 'none';
    if (nextPayrollCard) nextPayrollCard.style.display = 'none';
    // Completely hide month navigation - multiple approaches to ensure it's gone
    if (monthNav) {
      monthNav.style.display = 'none';
      monthNav.style.visibility = 'hidden';
      monthNav.style.height = '0';
      monthNav.style.margin = '0';
      monthNav.style.padding = '0';
      monthNav.style.opacity = '0';
    }
    // Keep shifts section visible (similar to stats view) - remove the line that was hiding it
    // if (shiftSection) shiftSection.style.display = 'none'; // REMOVED: Let shifts section remain visible
    if (floatingActionBar) floatingActionBar.style.display = 'none'; // Hide floating action bar

    // Move the chatbox to dashboard content if not already there
    if (chatboxContainer && dashboardContent && !dashboardContent.contains(chatboxContainer)) {
      // Create a container for the chatbox in dashboard
      const chatboxDashboardContainer = document.createElement('div');
      chatboxDashboardContainer.className = 'dashboard-chatbox-container';
      chatboxDashboardContainer.style.order = '1'; // Position first in dashboard

      // Move the chatbox to the dashboard
      chatboxDashboardContainer.appendChild(chatboxContainer);
      dashboardContent.appendChild(chatboxDashboardContainer);
    }
  }

  // Restore normal dashboard view
  function restoreNormalDashboardView() {
    const body = document.body;
    const chatboxContainer = document.querySelector('.chatbox-container');

    // Remove chatbox view class from body
    body.classList.remove('chatbox-view');

    // Show dashboard cards again (shifts section was never hidden)
    const totalCard = document.querySelector('.total-card');
    const nextShiftCard = document.querySelector('.next-shift-card');
    const nextPayrollCard = document.querySelector('.next-payroll-card');
    const monthNav = document.querySelector('.dashboard-month-nav');
    const floatingActionBar = document.querySelector('.floating-action-bar');

    if (totalCard) totalCard.style.display = '';
    if (nextShiftCard) nextShiftCard.style.display = '';
    if (nextPayrollCard) nextPayrollCard.style.display = '';
    // Completely restore month navigation - clear ALL inline styles
    if (monthNav) {
      monthNav.style.display = '';
      monthNav.style.visibility = '';
      monthNav.style.height = '';
      monthNav.style.margin = '';
      monthNav.style.padding = '';
      monthNav.style.opacity = '';
      monthNav.style.width = '';
      monthNav.style.position = '';
      monthNav.style.left = '';
    }
    // Shifts section was never hidden, so no need to restore it
    // if (shiftSection) shiftSection.style.display = ''; // REMOVED: shifts section was never hidden
    if (floatingActionBar) floatingActionBar.style.display = ''; // Restore floating action bar

    // Move the chatbox back to its original position
    const dashboardChatboxContainer = document.querySelector('.dashboard-chatbox-container');
    const originalChatboxParent = document.querySelector('.app-container');

    if (dashboardChatboxContainer && chatboxContainer && originalChatboxParent) {
      // Move chatbox back to its original position (after dashboard section)
      originalChatboxParent.appendChild(chatboxContainer);
      // Remove the temporary container
      dashboardChatboxContainer.remove();
    }
  }

  function appendMessage(role, text, options = {}) {
    // Ensure expanded view is shown after first message
    if (!hasFirstMessage && !isExpanded) {
      hasFirstMessage = true;
      expandChatbox();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `chatbox-message ${role}`;

    // Check if text contains HTML (for dots animation)
    if (text.includes('<span class="dots">')) {
      messageDiv.innerHTML = text;
    } else if (role === 'assistant') {
      // Check if streaming animation is requested
      if (options.streaming) {
        // Start with empty content for streaming
        messageDiv.innerHTML = '';
        chatElements.log.appendChild(messageDiv);
        chatElements.log.scrollTop = chatElements.log.scrollHeight;

        // Start streaming animation
        streamText(messageDiv, text, options.streamSpeed || 75);
        return messageDiv;
      } else {
        // Render Markdown for assistant messages
        const html = DOMPurify.sanitize(marked.parse(text));
        messageDiv.innerHTML = html;
      }
    } else {
      // Plain text for user messages
      messageDiv.textContent = text;
    }

    chatElements.log.appendChild(messageDiv);
    chatElements.log.scrollTop = chatElements.log.scrollHeight;

    // Return the message element so it can be removed if needed
    return messageDiv;
  }

  // Stream text in token-like chunks with realistic typing animation
  function streamText(element, text, speed = 25) {
    // Split text into tokens (word fragments, punctuation, spaces)
    const tokens = tokenizeText(text);
    let currentTokenIndex = 0;
    let currentText = '';

    // Add a subtle cursor during typing (no blinking to avoid visual artifacts)
    const cursor = document.createElement('span');
    cursor.className = 'typing-cursor';
    cursor.textContent = '▊';
    cursor.style.opacity = '0.7';

    function streamNextToken() {
      if (currentTokenIndex < tokens.length) {
        currentText += tokens[currentTokenIndex];
        currentTokenIndex++;

        // Create content with cursor inline to avoid line breaks
        const html = DOMPurify.sanitize(marked.parse(currentText));
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        // Add cursor to the last element or create a span for it
        const lastElement = tempDiv.lastElementChild || tempDiv;
        if (lastElement.tagName === 'P') {
          // Add cursor inside the paragraph to keep it inline
          lastElement.appendChild(cursor.cloneNode(true));
        } else {
          // For other elements, add cursor after
          tempDiv.appendChild(cursor.cloneNode(true));
        }

        // Update element content
        element.innerHTML = tempDiv.innerHTML;

        // Auto-scroll to bottom
        chatElements.log.scrollTop = chatElements.log.scrollHeight;

        // Continue streaming with variable speed based on token type
        const currentToken = tokens[currentTokenIndex - 1];
        let nextDelay = speed;

        // Adjust speed based on token characteristics
        if (currentToken === ' ') {
          nextDelay = speed * 0.5; // Faster for spaces
        } else if (currentToken.match(/[.!?]/)) {
          nextDelay = speed * 2; // Slower after punctuation
        } else if (currentToken.length > 3) {
          nextDelay = speed * 1.2; // Slightly slower for longer tokens
        }

        // Add slight randomness for natural feel
        nextDelay += Math.random() * 10;

        setTimeout(streamNextToken, nextDelay);
      } else {
        // Remove cursor when done
        cursor.remove();

        // Final render to ensure proper markdown formatting
        const finalHtml = DOMPurify.sanitize(marked.parse(text));
        element.innerHTML = finalHtml;

        // Final scroll
        chatElements.log.scrollTop = chatElements.log.scrollHeight;
      }
    }

    // Start streaming after a brief delay
    setTimeout(streamNextToken, 100);
  }

  // Tokenize text into realistic chunks (similar to how LLMs generate tokens)
  function tokenizeText(text) {
    const tokens = [];
    let currentToken = '';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      // Handle different character types
      if (char.match(/\s/)) {
        // Space or whitespace - finish current token and add space as separate token
        if (currentToken) {
          tokens.push(currentToken);
          currentToken = '';
        }
        tokens.push(char);
      } else if (char.match(/[.!?,:;]/)) {
        // Punctuation - finish current token and add punctuation as separate token
        if (currentToken) {
          tokens.push(currentToken);
          currentToken = '';
        }
        tokens.push(char);
      } else if (char.match(/[()[\]{}]/)) {
        // Brackets - finish current token and add bracket as separate token
        if (currentToken) {
          tokens.push(currentToken);
          currentToken = '';
        }
        tokens.push(char);
      } else {
        // Regular character - add to current token
        currentToken += char;

        // Create token chunks of 2-4 characters for realistic streaming
        if (currentToken.length >= 2 && Math.random() > 0.6) {
          tokens.push(currentToken);
          currentToken = '';
        }
      }
    }

    // Add any remaining token
    if (currentToken) {
      tokens.push(currentToken);
    }

    return tokens;
  }

  // Stream text in real-time as chunks arrive from server
  function streamTextRealtime(element) {
    let displayedLength = 0;
    const speed = 25; // Optimized speed within user preferences (15-30ms intervals)

    function streamNextChunk() {
      if (!element.isStreaming && displayedLength >= element.fullText.length) {
        // Streaming complete - render final markdown
        element.streamingActive = false;
        const finalHtml = DOMPurify.sanitize(marked.parse(element.fullText));
        element.innerHTML = finalHtml;
        element.classList.remove('streaming-text');
        chatElements.log.scrollTop = chatElements.log.scrollHeight;
        return;
      }

      const targetText = element.fullText;
      if (displayedLength < targetText.length) {
        // Use word-based streaming (2-5 characters at a time) - optimized for smooth rendering
        const chunkSize = Math.min(Math.floor(Math.random() * 3) + 2, targetText.length - displayedLength);
        displayedLength += chunkSize;

        const displayText = targetText.substring(0, displayedLength);

        // Add typing cursor during streaming
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = DOMPurify.sanitize(marked.parse(displayText));

        // Add cursor
        const cursor = document.createElement('span');
        cursor.className = 'typing-cursor';
        cursor.textContent = '▊';
        cursor.style.opacity = '0.7';
        tempDiv.appendChild(cursor);

        element.innerHTML = tempDiv.innerHTML;
        chatElements.log.scrollTop = chatElements.log.scrollHeight;

        // Continue streaming with variable speed
        const nextDelay = speed + Math.random() * 10; // Add slight randomness
        setTimeout(streamNextChunk, nextDelay);
      } else {
        // Wait for more chunks or completion
        setTimeout(streamNextChunk, 50);
      }
    }

    streamNextChunk();
  }

  // Note: sendPillMessage function removed since we now expand directly

  async function sendExpandedMessage() {
    const text = chatElements.input.value.trim();
    if (!text) return;

    // Clear input
    chatElements.input.value = '';
    autoResizeTextarea();

    // Send the message
    await sendMessage(text);
  }

  async function sendMessage(messageText) {
    // Disable send button during request
    if (chatElements.send) {
      chatElements.send.disabled = true;
    }

    // Add user message
    appendMessage('user', messageText);
    chatMessages.push({ role: 'user', content: messageText });

    // Show thinking indicator - only dots, no hardcoded text
    const spinner = appendMessage('assistant', '<span class="dots"><span>.</span><span>.</span><span>.</span></span>');

    // Get JWT token from Supabase session (declare outside try block)
    let token;
    try {
      const { data: { session } } = await window.supa.auth.getSession();
      token = session?.access_token;

      if (!token) {
        spinner.remove();
        appendMessage('system', 'Du må være innlogget for å bruke chat-funksjonen.');
        return;
      }
    } catch (authError) {
      console.error('Auth error:', authError);
      spinner.textContent = '⚠️ Autentiseringsfeil.';
      return;
    }

    try {

      // Start a session to enable GET-based streaming through CDNs
      const startResp = await fetch(`${STREAM_API_BASE}/chat/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          messages: chatMessages,
          currentMonth: window.app?.currentMonth || new Date().getMonth() + 1,
          currentYear: window.app?.currentYear || new Date().getFullYear()
        })
      });

      if (!startResp.ok) {
        throw new Error(`HTTP ${startResp.status}: ${startResp.statusText}`);
      }
      const { sid } = await startResp.json();
      if (!sid) throw new Error('Missing session id');

      // Stream over GET (SSE-friendly across proxies)
      const response = await fetch(`${STREAM_API_BASE}/chat/stream?sid=${encodeURIComponent(sid)}`, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalData = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              break;
            }

            try {
              const parsed = JSON.parse(data);
              handleStreamEvent(parsed, spinner);

              if (parsed.type === 'complete') {
                finalData = parsed;
              } else if (parsed.type === 'text_stream_end') {
                // For text streaming, the message is already rendered.
                // Defer to subsequent shifts_update events; do not overwrite UI.
                finalData = { assistant: null, shifts: [] };
              }
            } catch (e) {
              console.warn('Failed to parse streaming data:', data);
            }
          }
        }
      }

      const data = finalData;

      // Handle response - check if we have valid data
      if (!data) {
        throw new Error('No data received from streaming response');
      }

      // Log raw JSON response for debugging
      console.debug('[/chat response]', data);

      // Handle response - now only GPT-generated assistant messages
      const txt = data.assistant
        ?? (data.error && `⚠️ ${data.error}`)
        ?? '⚠️ Ukjent svar fra serveren.';

      // Replace spinner content only if not streamed already
      // Use Markdown rendering for assistant messages
      if (data.assistant && spinner && spinner.parentNode) {
        const html = DOMPurify.sanitize(marked.parse(txt));
        spinner.innerHTML = html;
      } else if (!data.assistant && txt && spinner && spinner.parentNode) {
        spinner.textContent = txt;
      }
      if (data.assistant) {
        chatMessages.push({ role: 'assistant', content: data.assistant });
      }

      // Always update shifts table - dedupe and render
      const shifts = data.shifts || [];
      const uniq = [];
      const seen = new Set();
      for (const s of shifts) {
        const k = `${s.shift_date}|${s.start_time}|${s.end_time}`;
        if (!seen.has(k)) {
          seen.add(k);
          uniq.push(s);
        }
      }

      // Always call refreshUI to update all components
      if (window.app && window.app.refreshUI) {
        // Convert shifts data to app format if needed
        const newShifts = uniq.map(shift => ({
          id: shift.id || Date.now() + Math.random(),
          date: new Date(shift.date || shift.shift_date),
          startTime: shift.startTime || shift.start_time,
          endTime: shift.endTime || shift.end_time,
          type: shift.type !== undefined ? shift.type : shift.shift_type,
          seriesId: shift.seriesId || shift.series_id || null
        }));

        // Update app shifts and refresh all UI components
        if (window.app.shifts && window.app.userShifts) {
          window.app.shifts = [...newShifts];
          window.app.userShifts = [...newShifts];
        }
        window.app.refreshUI(newShifts);
      }

    } catch (error) {
      console.error('Chat error:', error);

      // Skip secondary streaming retry — GET approach should be stable

      // Fallback to non-streaming request if streaming fails
      try {
        console.log('Streaming failed, falling back to regular request...');
        const fallbackResponse = await fetch(`${STREAM_API_BASE}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            messages: chatMessages,
            stream: false
          })
        });

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();

          const txt = fallbackData.assistant
            ?? (fallbackData.error && `⚠️ ${fallbackData.error}`)
            ?? '⚠️ Ukjent svar fra serveren.';

          if (fallbackData.assistant) {
            const html = DOMPurify.sanitize(marked.parse(txt));
            spinner.innerHTML = html;
          } else {
            spinner.textContent = txt;
          }

          if (fallbackData.assistant) {
            chatMessages.push({ role: 'assistant', content: fallbackData.assistant });
          }

          // Update shifts
          const shifts = fallbackData.shifts || [];
          const uniq = [];
          const seen = new Set();
          for (const s of shifts) {
            const k = `${s.shift_date}|${s.start_time}|${s.end_time}`;
            if (!seen.has(k)) {
              seen.add(k);
              uniq.push(s);
            }
          }

          if (window.app && window.app.refreshUI) {
            const newShifts = uniq.map(shift => ({
              id: shift.id || Date.now() + Math.random(),
              date: new Date(shift.date || shift.shift_date),
              startTime: shift.startTime || shift.start_time,
              endTime: shift.endTime || shift.end_time,
              type: shift.type !== undefined ? shift.type : shift.shift_type,
              seriesId: shift.seriesId || shift.series_id || null
            }));

            if (window.app.shifts && window.app.userShifts) {
              window.app.shifts = [...newShifts];
              window.app.userShifts = [...newShifts];
            }
            window.app.refreshUI(newShifts);
          }
        } else {
          throw new Error('Fallback request also failed');
        }
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError);
        spinner.textContent = '⚠️ Kunne ikke koble til serveren.';
      }
    } finally {
      if (chatElements.send) {
        chatElements.send.disabled = false;
      }
    }
  }

  // Handle streaming events from server
  let streamingTextElement = null;

  function handleStreamEvent(event, spinnerElement) {
    switch (event.type) {
      case 'status':
        updateSpinnerText(spinnerElement, event.message);
        break;
      case 'gpt_response':
        if (event.tool_calls && event.tool_calls.length > 0) {
          const toolCallsText = event.tool_calls.map(call => call.name).join(', ');
          updateSpinnerText(spinnerElement, `GPT planlegger: ${toolCallsText}`);
        } else {
          // No tools -> model will respond directly
          updateSpinnerText(spinnerElement, 'Venter på svar');
        }
        break;
      case 'tool_calls_start':
        // Backend may send only { iteration, count }
        if (event.message) {
          updateSpinnerText(spinnerElement, event.message);
        } else {
          const c = Number(event.count) || 0;
          const msg = c <= 1 ? 'Kjører 1 verktøy' : `Kjører ${c} verktøy`;
          updateSpinnerText(spinnerElement, msg);
        }
        break;
      case 'tool_call_start':
        // Legacy alias; prefer unified 'tool_call'
        updateSpinnerText(spinnerElement, event.message || 'Kjører verktøy');
        break;
      case 'tool_call_complete':
        updateSpinnerText(spinnerElement, (event.message || 'Verktøy ferdig') + ' ✓');
        break;
      case 'tool_call':
        // Current backend emits { type: 'tool_call', iteration, name, argsSummary }
        if (event.name) {
          updateSpinnerText(spinnerElement, `Kjører: ${event.name}`);
        } else {
          updateSpinnerText(spinnerElement, 'Kjører verktøy');
        }
        break;
      case 'tool_result':
        // Current backend emits { type: 'tool_result', iteration, name, ok, duration_ms }
        if (event.name) {
          const mark = event.ok ? '✓' : '✗';
          updateSpinnerText(spinnerElement, `${event.name} ${mark}`);
        } else {
          updateSpinnerText(spinnerElement, event.ok ? 'Verktøy fullført ✓' : 'Verktøy feilet ✗');
        }
        break;
      case 'text_stream_start':
        // Replace spinner with empty text element for streaming
        streamingTextElement = document.createElement('div');
        streamingTextElement.className = 'streaming-text';
        streamingTextElement.fullText = ''; // Store the full text being built
        streamingTextElement.isStreaming = true;
        streamingTextElement.streamingActive = false; // Track if streaming animation is active
        spinnerElement.parentNode.replaceChild(streamingTextElement, spinnerElement);
        break;
      case 'text_chunk':
        // Accumulate text chunks and stream them smoothly
        if (streamingTextElement && streamingTextElement.isStreaming) {
          streamingTextElement.fullText += event.content;

          // If not already streaming, start the streaming animation
          if (!streamingTextElement.streamingActive) {
            streamingTextElement.streamingActive = true;
            streamTextRealtime(streamingTextElement);
          }
        }
        break;
      case 'text_stream_end':
        // Mark streaming as complete and let the streamText function handle final rendering
        if (streamingTextElement) {
          streamingTextElement.isStreaming = false;
          const finalText = streamingTextElement.fullText;

          // Add to chat messages
          chatMessages.push({ role: 'assistant', content: finalText });
          streamingTextElement = null;
        }
        break;
      case 'shifts_update':
        // Update shifts in the UI
        if (event.shifts && window.app && window.app.refreshUI) {
          const shifts = event.shifts || [];
          const uniq = [];
          const seen = new Set();
          for (const s of shifts) {
            const k = `${s.shift_date}|${s.start_time}|${s.end_time}`;
            if (!seen.has(k)) {
              seen.add(k);
              uniq.push(s);
            }
          }

          const newShifts = uniq.map(shift => ({
            id: shift.id || Date.now() + Math.random(),
            date: new Date(shift.date || shift.shift_date),
            startTime: shift.startTime || shift.start_time,
            endTime: shift.endTime || shift.end_time,
            type: shift.type !== undefined ? shift.type : shift.shift_type,
            seriesId: shift.seriesId || shift.series_id || null
          }));

          if (window.app.shifts && window.app.userShifts) {
            window.app.shifts = [...newShifts];
            window.app.userShifts = [...newShifts];
          }
          window.app.refreshUI(newShifts);
        }
        break;
    }
  }

  function updateSpinnerText(spinnerElement, text) {
    if (spinnerElement && spinnerElement.parentNode) {
      spinnerElement.innerHTML = `<span class="stream-status">${text}</span> <span class="dots"><span>.</span><span>.</span><span>.</span></span>`;
    }
  }



  // Clear chat log function (for sign-out)
  function clearChatLog() {
    if (chatElements.log) {
      chatElements.log.innerHTML = '';
    }
    chatMessages = [];

    // Reset all states
    hasFirstMessage = false;
    isExpanded = false;

    // Remove class from body
    document.body.classList.remove('chatbox-expanded-active');

    // Reset UI to initial state
    if (chatElements.pill) {
      chatElements.pill.classList.remove('expanded');
    }
    if (chatElements.expandedContent) {
      chatElements.expandedContent.style.display = 'none';
    }
    if (chatElements.close) {
      chatElements.close.style.display = 'none';
    }
    if (chatElements.newChat) {
      chatElements.newChat.style.display = 'none';
    }
    // Pill text is always visible - no need to manipulate display
  }

  // Expose functions globally for app integration
  window.chatbox = {
    init: initChatbox,
    clear: clearChatLog,
    expand: expandChatbox,
    collapse: collapseChatbox,
    startNewChat: startNewChat,
    updateText: updateChatboxPlaceholder,
    appendMessage: appendMessage,
    streamText: streamText,
    tokenizeText: tokenizeText
  };

  // Also expose streaming functions globally for legacy compatibility
  window.streamText = streamText;
  window.tokenizeText = tokenizeText;

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatbox);
  } else {
    initChatbox();
  }

})();
