function setAppHeight() {
  const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  document.documentElement.style.setProperty('--app-height', h + 'px');
}
setAppHeight();
window.addEventListener('resize', setAppHeight);
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', setAppHeight);
}

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

  // Expose logout
  window.logout = async () => { await supa.auth.signOut(); window.location.href = './'; };

  // After ensuring session, show welcome, init app, and display
  const { app } = await import('./appLogic.js?v=5');
  window.app = app;

  await showWelcomeScreen();
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

  // Handle floating action bar visibility based on scroll position
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

      // Show floating bar when any part of the shift section is visible
      // This ensures the bar is always visible when user is in the shift section
      const shouldBeVisible = rect.top < viewportHeight && rect.bottom > 0;

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
