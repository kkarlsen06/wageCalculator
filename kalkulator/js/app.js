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
    "https://iuwjdacxbirhmsglcbxp.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1d2pkYWN4YmlyaG1zZ2xjYnhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0NTIxNDAsImV4cCI6MjA2NDAyODE0MH0.iSjbvGVpM3zOWCGpg5HrQp37PjJCmiHIwVQLgc2LgcE"
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
});
