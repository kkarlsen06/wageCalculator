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
  const maxRetries = 5;

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

    // Animate letters in
    allLetters.forEach((span, i) => {
      span.style.animation = `letter-in 0.5s forwards ${i * 0.1}s`;
    });
    const inDuration = 500 + allLetters.length * 100; // ms
    await new Promise(res => setTimeout(res, inDuration + 300));

    // Animate whole text out
    welcomeContainer.style.transformOrigin = 'center center';
    welcomeContainer.style.animation = `text-out 0.5s forwards`;
    await new Promise(res => setTimeout(res, 800));  // 0.5s animation + buffer

    // Remove welcome overlay
    welcomeScreen.remove();
  }

  // Animate main app elements
  function animateAppEntries() {
    const container = document.querySelector('.app-container');
    if (!container) return;
    const children = Array.from(container.children);
    children.forEach((el, idx) => {
      el.style.opacity = '0';
      el.style.animation = `fadeInDown 0.6s forwards ${idx * 0.1}s`;
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
    
    // Use event delegation for shift items to handle dynamically generated content
    document.body.addEventListener('click', (event) => {
      // Check if we clicked on any buttons first - if so, don't trigger shift details
      if (event.target.closest('.delete-shift-btn') || 
          event.target.closest('.edit-shift-btn') ||
          event.target.closest('.btn')) {
        return; // Let the button handlers take care of this
      }
      
      const shiftItem = event.target.closest('[data-shift-id]');
      if (shiftItem) {
        const shiftId = shiftItem.getAttribute('data-shift-id');
        console.log('Shift clicked, ID:', shiftId); // Debug log
        app.showShiftDetails(shiftId);
      }
    });

    // Use event delegation for delete shift buttons
    document.body.addEventListener('click', (event) => {
      const deleteBtn = event.target.closest('.delete-shift-btn');
      if (deleteBtn) {
        event.stopPropagation();
        const shiftIndex = parseInt(deleteBtn.getAttribute('data-shift-index'));
        app.deleteShift(shiftIndex).then(() => {
          // Close the shift details modal if it's open
          app.closeShiftDetails();
        });
      }
    });

    // Use event delegation for edit shift buttons
    document.body.addEventListener('click', (event) => {
      const editBtn = event.target.closest('.edit-shift-btn');
      if (editBtn) {
        event.stopPropagation();
        const shiftId = editBtn.getAttribute('data-shift-id');
        app.editShift(shiftId);
      }
    });
    
    eventListenersAdded = true;

    // Use event delegation for close shift details button
    document.body.addEventListener('click', (event) => {
      const closeBtn = event.target.closest('.close-shift-details');
      if (closeBtn) {
        event.stopPropagation();
        app.closeShiftDetails();
      }
    });

    // Handle modal close when clicking outside modal content
    document.body.addEventListener('click', (event) => {
      const modal = event.target.closest('.modal');
      if (modal && event.target === modal) {
        // Clicked on modal overlay, close the modal
        if (modal.id === 'addShiftModal') {
          app.closeAddShiftModal();
        } else if (modal.id === 'editShiftModal') {
          app.closeEditShift();
        } else if (modal.id === 'settingsModal') {
          app.closeSettings();
        } else if (modal.id === 'breakdownModal') {
          app.closeBreakdown();
        }
      }
    });

    // Handle ESC key to close modals
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        // Check which modal is open and close it
        if (document.getElementById('addShiftModal').style.display === 'block') {
          app.closeAddShiftModal();
        } else if (document.getElementById('editShiftModal').style.display === 'block') {
          app.closeEditShift();
        } else if (document.getElementById('settingsModal').style.display === 'block') {
          app.closeSettings();
        } else if (document.getElementById('breakdownModal').style.display === 'block') {
          app.closeBreakdown();
        }
      }
    });

    // Handle remove bonus slot buttons
    document.querySelectorAll('.remove-bonus').forEach(el => {
      el.addEventListener('click', () => {
        app.removeBonusSlot(el);
      });
    });
  }

  // Call addEventListeners once - event delegation handles dynamic content
  addEventListeners();

  // Add scroll handling for shift section to enable scrolling back to dashboard
  function setupShiftSectionScroll() {
    const shiftContainer = document.querySelector('.shift-section .app-container');
    const snapContainer = document.querySelector('.snap-container');
    
    if (!shiftContainer || !snapContainer) return;

    let touchStartY = 0;
    let touchCurrentY = 0;
    let isDragging = false;
    let atTop = false;
    const threshold = 80; // pixels to drag before triggering navigation

    // Create pull indicator element
    const pullIndicator = document.createElement('div');
    pullIndicator.style.cssText = `
      position: absolute;
      top: -50px;
      left: 50%;
      transform: translateX(-50%);
      width: 40px;
      height: 40px;
      background: var(--bg-tertiary);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s, transform 0.2s;
      z-index: 100;
    `;
    pullIndicator.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="18 15 12 9 6 15"></polyline>
      </svg>
    `;
    shiftContainer.style.position = 'relative';
    shiftContainer.appendChild(pullIndicator);

    // Touch start
    shiftContainer.addEventListener('touchstart', (e) => {
      if (shiftContainer.scrollTop <= 0) {
        touchStartY = e.touches[0].clientY;
        atTop = true;
      } else {
        atTop = false;
      }
    }, { passive: true });

    // Touch move
    shiftContainer.addEventListener('touchmove', (e) => {
      if (!atTop) return;
      
      touchCurrentY = e.touches[0].clientY;
      const pullDistance = touchCurrentY - touchStartY;
      
      // Only track downward pulls when at top
      if (pullDistance > 0 && shiftContainer.scrollTop <= 0) {
        isDragging = true;
        
        // Prevent default to stop bounce effect
        if (pullDistance > 10) {
          e.preventDefault();
        }
        
        // Show and animate pull indicator
        const progress = Math.min(pullDistance / threshold, 1);
        pullIndicator.style.opacity = progress;
        pullIndicator.style.transform = `translateX(-50%) translateY(${Math.min(pullDistance * 0.5, 40)}px) scale(${0.8 + progress * 0.2})`;
        
        // Add slight transform to container for feedback
        shiftContainer.style.transform = `translateY(${Math.min(pullDistance * 0.3, 30)}px)`;
      }
    }, { passive: false });

    // Touch end
    shiftContainer.addEventListener('touchend', (e) => {
      if (!isDragging) return;
      
      const pullDistance = touchCurrentY - touchStartY;
      
      // Reset visual feedback
      pullIndicator.style.opacity = '0';
      pullIndicator.style.transform = 'translateX(-50%) translateY(0) scale(0.8)';
      shiftContainer.style.transform = 'translateY(0)';
      
      // If pulled far enough, navigate to dashboard
      if (pullDistance > threshold) {
        const dashboardSection = document.querySelector('.dashboard-section');
        if (dashboardSection) {
          snapContainer.scrollTo({
            top: dashboardSection.offsetTop,
            behavior: 'smooth'
          });
        }
      }
      
      // Reset state
      isDragging = false;
      touchStartY = 0;
      touchCurrentY = 0;
    }, { passive: true });

    // Also handle wheel events for desktop
    shiftContainer.addEventListener('wheel', (e) => {
      // If at top and scrolling up
      if (shiftContainer.scrollTop <= 0 && e.deltaY < 0) {
        e.preventDefault();
        const dashboardSection = document.querySelector('.dashboard-section');
        if (dashboardSection) {
          snapContainer.scrollTo({
            top: dashboardSection.offsetTop,
            behavior: 'smooth'
          });
        }
      }
    }, { passive: false });
  }

  // Setup scroll handling after a short delay to ensure DOM is ready
  setTimeout(setupShiftSectionScroll, 100);

  // Make shift section immediately scrollable when it comes into view
  function makeShiftSectionResponsive() {
    const snapContainer = document.querySelector('.snap-container');
    const shiftSection = document.querySelector('.shift-section');
    const shiftContainer = document.querySelector('.shift-section .app-container');
    
    if (!snapContainer || !shiftSection || !shiftContainer) return;

    // Use Intersection Observer to detect when shift section is visible
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
          // Shift section is more than 50% visible
          // Focus the container to make it immediately scrollable
          shiftContainer.focus({ preventScroll: true });
          
          // If there's a pending scroll, apply it
          if (window.pendingShiftScroll) {
            shiftContainer.scrollTop = window.pendingShiftScroll;
            window.pendingShiftScroll = null;
          }
        }
      });
    }, {
      threshold: [0.5]
    });

    observer.observe(shiftSection);
  }

  makeShiftSectionResponsive();
});
