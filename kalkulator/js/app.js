function setAppHeight() {
  const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  document.documentElement.style.setProperty('--app-height', h + 'px');
}

function setThemeColor() {
  // Ensure theme color is set to black for browser chrome
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', '#000000');
  }

  // Also set for different color schemes
  const lightThemeMeta = document.querySelector('meta[name="theme-color"][media*="light"]');
  if (lightThemeMeta) {
    lightThemeMeta.setAttribute('content', '#000000');
  }

  const darkThemeMeta = document.querySelector('meta[name="theme-color"][media*="dark"]');
  if (darkThemeMeta) {
    darkThemeMeta.setAttribute('content', '#000000');
  }
}

// Enhanced responsive month navigation handler for iOS Safari viewport issues
function handleResponsiveMonthNavigation() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const orientation = width > height ? 'landscape' : 'portrait';
  const isLargeDevice = Math.max(width, height) >= 800; // Detect large devices

  // Get month navigation elements
  const dashboardNav = document.querySelector('.dashboard-month-nav');
  const shiftNav = document.querySelector('.shift-section .month-navigation-container');

  if (!dashboardNav || !shiftNav) return;

  // Enhanced logic for iOS Safari viewport issues
  let useDashboardNav = false;

  // Desktop
  if (width >= 1024) {
    useDashboardNav = true;
  }
  // Large mobile in landscape (iOS Safari fix)
  else if (orientation === 'landscape' && height >= 400 && isLargeDevice) {
    useDashboardNav = true;
  }
  // Large mobile portrait (iPhone Pro Max and larger)
  else if (width >= 430 && orientation === 'portrait') {
    useDashboardNav = true;
  }

  // Apply the decision with CSS class override
  if (useDashboardNav) {
    document.body.classList.add('force-dashboard-nav');
  } else {
    document.body.classList.remove('force-dashboard-nav');
  }
}

setAppHeight();
setThemeColor();
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

// Initialize Supabase client
document.addEventListener('DOMContentLoaded', async () => {
  const supa = window.supabase.createClient(
    window.CONFIG.supabase.url,
    window.CONFIG.supabase.anonKey
  );
  window.supa = supa;

  // Enhanced authentication guard with retry logic
  let session = null;
  let retryCount = 0;
  const maxRetries = 3; // Reduced from 5 to 3

  // Load and display profile information immediately after greeting
  async function loadAndDisplayProfileInfo() {
    try {
      const { data: { user } } = await supa.auth.getUser();
      if (!user) return;

      // Load nickname
      const nicknameElement = document.getElementById('userNickname');
      if (nicknameElement) {
        // Use first name if available, otherwise use first part of email
        const nickname = user.user_metadata?.first_name ||
                        user.email?.split('@')[0] ||
                        'Bruker';
        nicknameElement.textContent = nickname;
      }

      // Load profile picture
      try {
        const { data: settings } = await supa
          .from('user_settings')
          .select('profile_picture_url')
          .eq('user_id', user.id)
          .single();

        const profilePictureUrl = settings?.profile_picture_url;
        updateTopBarProfilePicture(profilePictureUrl);
      } catch (profileErr) {
        // If there's an error loading profile picture, just show placeholder
        console.log('No profile picture found or error loading:', profileErr);
        updateTopBarProfilePicture(null);
      }

    } catch (err) {
      console.error('Error loading profile info:', err);
      // Fallback to default
      const nicknameElement = document.getElementById('userNickname');
      if (nicknameElement) {
        nicknameElement.textContent = 'Bruker';
      }
      // Show placeholder profile picture
      updateTopBarProfilePicture(null);
    }
  }

  // Helper function to update top bar profile picture
  function updateTopBarProfilePicture(imageUrl) {
    const profileIcon = document.querySelector('.profile-icon');
    if (!profileIcon) return;

    const profileBtn = profileIcon.closest('.user-profile-btn');
    if (!profileBtn) return;

    if (imageUrl) {
      // Replace SVG with image
      const img = document.createElement('img');
      img.src = imageUrl;
      img.alt = 'Profilbilde';
      img.className = 'profile-picture-img';
      img.style.cssText = `
        transition: all var(--speed-normal) var(--ease-default);
        opacity: 0;
      `;

      // Fade in when loaded
      img.onload = () => {
        img.style.opacity = '1';
      };

      // Handle image load error
      img.onerror = () => {
        console.log('Profile picture failed to load, showing placeholder');
        updateTopBarProfilePicture(null);
      };

      profileIcon.replaceWith(img);
    } else {
      // Show placeholder SVG
      if (profileIcon.tagName === 'IMG') {
        const svg = document.createElement('svg');
        svg.className = 'icon-sm profile-icon';
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');
        svg.setAttribute('aria-hidden', 'true');
        svg.innerHTML = `
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        `;
        profileIcon.replaceWith(svg);
      }
    }
  }

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

  // Animate main app elements with improved sequencing
  function animateAppEntries() {
    const container = document.querySelector('.app-container');
    if (!container) return;
    const children = Array.from(container.children);

    // Use requestAnimationFrame for smoother animations
    requestAnimationFrame(() => {
      children.forEach((el, idx) => {
        // Skip animating the header since profile info should be immediately visible
        if (el.classList.contains('header')) {
          return;
        }

        el.style.opacity = '0';
        // Reduced stagger time from 0.1s to 0.08s and longer duration for smoother animation
        el.style.animation = `fadeInDown 0.8s forwards ${idx * 0.08}s`;
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
        window.location.href = './';
        return;
      }
    } else {
      console.log(`App.html: Session found for user:`, session.user.email);
    }
  }

  // Expose logout function
  window.logout = async () => { await supa.auth.signOut(); window.location.href = './'; };

  // After ensuring session, show welcome, init app, and display
  const { app } = await import('./appLogic.js?v=5');
  window.app = app;

  await showWelcomeScreen();

  // Load and display profile information immediately after greeting
  await loadAndDisplayProfileInfo();

  await app.init();

  // Display the app container and animate entries
  const appEl = document.getElementById('app');
  if (appEl) {
    appEl.style.display = 'block';
    animateAppEntries();


  }

  // Etter init og visning av app
  // Legg til event listeners for alle knapper
  document.querySelectorAll('[onclick]').forEach(el => {
    const onClick = el.getAttribute('onclick');
    if (onClick) {
      // Store the original onclick for repeated use
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
      // Keep the onclick attribute but set it to empty to prevent double execution
      el.setAttribute('onclick', 'return false;');
    }
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

      // Show floating bar when shift section is visible (any part of it)
      // This accounts for the section being tall and extending beyond viewport
      const shouldBeVisible = rect.top < viewportHeight * 0.9 && rect.bottom > viewportHeight * 0.1;

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
