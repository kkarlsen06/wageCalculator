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
    const welcomeTextStr = `Hei, ${firstName}`;

    // Create overlay
    const welcomeScreen = document.createElement('div');
    welcomeScreen.id = 'welcomeScreen';
    const h1 = document.createElement('h1');
    h1.id = 'welcomeText';
    welcomeScreen.appendChild(h1);
    document.body.appendChild(welcomeScreen);

    // Populate letters
    h1.innerHTML = '';
    const letters = [...welcomeTextStr].map((char, i) => {
      const span = document.createElement('span');
      span.className = 'letter';
      // Render normal spaces as non-breaking spaces
      span.textContent = char === ' ' ? '\u00A0' : char;
      h1.appendChild(span);
      return span;
    });

    // Animate letters in
    letters.forEach((span, i) => {
      span.style.animation = `letter-in 0.5s forwards ${i * 0.1}s`;
    });
    const inDuration = 500 + letters.length * 100; // ms
    await new Promise(res => setTimeout(res, inDuration + 300));

    // Animate whole text out
    h1.style.transformOrigin = 'center center';
    h1.style.animation = `text-out 0.5s forwards`;
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
