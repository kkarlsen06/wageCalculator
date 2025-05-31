// Initialize Supabase client
document.addEventListener('DOMContentLoaded', async () => {
  const supa = window.supabase.createClient(
    "https://iuwjdacxbirhmsglcbxp.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1d2pkYWN4YmlyaG1zZ2xjYnhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0NTIxNDAsImV4cCI6MjA2NDAyODE0MH0.iSjbvGVpM3zOWCGpg5HrQp37PjJCmiHIwVQLgc2LgcE"
  );
  window.supa = supa;

  // Authentication guard
  const { data: { session } } = await supa.auth.getSession();
  if (!session) {
    window.location.href = './';
    return;
  }

  // Expose logout
  window.logout = async () => { await supa.auth.signOut(); window.location.href = './'; };

  // Import and start the app logic
  const { app } = await import('./appLogic.js?v=5');
  window.app = app;
  await app.init();
  // Display the app container
  document.getElementById('app').style.display = 'block';

  // Etter init og visning av app
  // Legg til event listeners for alle knapper
  document.querySelectorAll('[onclick]').forEach(el => {
    const onClick = el.getAttribute('onclick');
    if (onClick) {
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
      el.removeAttribute('onclick');
    }
  });

  // Add event listeners for elements with class-based selectors
  function addEventListeners() {
    // Handle shift items
    document.querySelectorAll('[data-shift-id]').forEach(el => {
      el.addEventListener('click', (event) => {
        if (!event.target.closest('.delete-shift-btn')) {
          const shiftId = el.getAttribute('data-shift-id');
          app.showShiftDetails(shiftId);
        }
      });
    });

    // Handle delete shift buttons
    document.querySelectorAll('.delete-shift-btn').forEach(el => {
      el.addEventListener('click', (event) => {
        event.stopPropagation();
        const shiftIndex = parseInt(el.getAttribute('data-shift-index'));
        app.deleteShift(shiftIndex).then(() => {
          // Close the shift details modal if it's open
          app.closeShiftDetails();
        });
      });
    });

    // Handle close shift details button
    document.querySelectorAll('.close-shift-details').forEach(el => {
      el.addEventListener('click', () => {
        app.closeShiftDetails();
      });
    });

    // Handle remove bonus slot buttons
    document.querySelectorAll('.remove-bonus').forEach(el => {
      el.addEventListener('click', () => {
        app.removeBonusSlot(el);
      });
    });
  }

  // Call addEventListeners initially and after DOM updates
  addEventListeners();

  // Re-add event listeners after DOM updates
  const observer = new MutationObserver(() => {
    addEventListeners();
  });
  observer.observe(document.body, { childList: true, subtree: true });
});
