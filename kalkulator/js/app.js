// API Base URL configuration
const API_BASE = window.CONFIG?.apiBase || '';

function setAppHeight() {
  // Use visual viewport for better mobile browser UI handling
  const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  document.documentElement.style.setProperty('--app-height', h + 'px');

  // Also set dynamic viewport height for modern browsers
  document.documentElement.style.setProperty('--dvh', h + 'px');
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

  // Immediate redirect check - if we can quickly determine no session exists
  try {
    const { data: { session: quickSession } } = await supa.auth.getSession();
    if (!quickSession) {
      console.log('Quick session check: No session found, redirecting to login immediately');
      window.location.href = 'login.html';
      return;
    }
  } catch (quickCheckError) {
    console.log('Quick session check failed, proceeding with retry logic:', quickCheckError);
    // Continue with the retry logic below
  }

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

      // Update chatbox placeholder with user name
      if (window.chatbox && window.chatbox.updatePlaceholder) {
        window.chatbox.updatePlaceholder();
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
        console.log('[login] no session – redirecting to login page');
        window.location.href = 'login.html';
        return;
      }
    } else {
      console.log(`App.html: Session found for user:`, session.user.email);
    }
  }

  // Expose logout function
  window.logout = async () => {
    // Clear chat log before signing out
    if (window.chatbox && window.chatbox.clear) {
      window.chatbox.clear();
    }
    await supa.auth.signOut();
    window.location.href = 'login.html';
  };

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

// ===== CHATBOX FUNCTIONALITY =====
(function() {
  'use strict';

  let chatMessages = [
    { role: 'system', content: 'Du er en chatbot som hjelper brukeren å registrere skift via addShift eller addSeries. Svar alltid på norsk.' }
  ];

  let chatElements = {};
  let isExpanded = false;
  let isInInputMode = false;
  let hasFirstMessage = false;

  // Initialize chatbox when DOM is ready
  function initChatbox() {
    chatElements = {
      pill: document.getElementById('chatboxPill'),
      expandedContent: document.getElementById('chatboxExpandedContent'),
      close: document.getElementById('chatboxClose'),
      log: document.getElementById('chatboxLog'),
      input: document.getElementById('chatboxInput'),
      send: document.getElementById('chatboxSend'),
      placeholder: document.getElementById('chatboxPillPlaceholder'),
      pillInput: document.getElementById('chatboxPillInput')
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
        console.log('Supabase client not yet available, using default placeholder');
        if (chatElements.placeholder) {
          chatElements.placeholder.textContent = 'Trenger du hjelp?';
        }
        return;
      }

      const { data: { user } } = await window.supa.auth.getUser();
      if (!user || !chatElements.placeholder) return;

      // Use first name if available, otherwise use first part of email, fallback to 'Bruker'
      const userName = user.user_metadata?.first_name ||
                      user.email?.split('@')[0] ||
                      'Bruker';

      chatElements.placeholder.textContent = `Trenger du hjelp, ${userName}?`;
    } catch (err) {
      console.error('Error updating chatbox placeholder:', err);
      // Fallback to default
      if (chatElements.placeholder) {
        chatElements.placeholder.textContent = 'Trenger du hjelp, Bruker?';
      }
    }
  }

  function setupChatEventListeners() {
    // Pill content click to enter input mode (but not when expanded or clicking close button)
    chatElements.pill.addEventListener('click', function(e) {
      if (!e.target.closest('.chatbox-close') && !isExpanded) {
        enterInputMode();
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

    // Send button in expanded view
    if (chatElements.send) {
      chatElements.send.addEventListener('click', sendExpandedMessage);
    }

    // Enter key in pill input
    chatElements.pillInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendPillMessage();
      } else if (e.key === 'Escape') {
        exitInputMode();
      }
    });

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

    // Click outside to exit input mode
    document.addEventListener('click', function(e) {
      if (isInInputMode && !chatElements.pill.contains(e.target)) {
        exitInputMode();
      }
    });
  }

  function enterInputMode() {
    if (isInInputMode || isExpanded) return; // Don't allow input mode when expanded

    isInInputMode = true;
    chatElements.placeholder.style.display = 'none';
    chatElements.pillInput.style.display = 'block';
    chatElements.pillInput.focus();
  }

  function exitInputMode() {
    if (!isInInputMode) return;

    isInInputMode = false;
    chatElements.pillInput.style.display = 'none';
    chatElements.pillInput.value = '';
    chatElements.placeholder.style.display = 'block';
  }

  function expandChatbox() {
    isExpanded = true;
    chatElements.pill.classList.add('expanded');
    chatElements.expandedContent.style.display = 'block';
    chatElements.close.style.display = 'flex';

    // Add class to body for CSS targeting (fallback for browsers without :has() support)
    document.body.classList.add('chatbox-expanded-active');

    // Focus input after animation
    setTimeout(() => {
      if (chatElements.input) {
        chatElements.input.focus();
      }
    }, 300);
  }

  function collapseChatbox() {
    isExpanded = false;
    isInInputMode = false;
    hasFirstMessage = false;

    chatElements.pill.classList.remove('expanded');
    chatElements.expandedContent.style.display = 'none';
    chatElements.close.style.display = 'none';
    chatElements.pillInput.style.display = 'none';
    chatElements.pillInput.value = '';
    chatElements.placeholder.style.display = 'block';

    // Remove class from body
    document.body.classList.remove('chatbox-expanded-active');

    // Clear chat log
    if (chatElements.log) {
      chatElements.log.innerHTML = '';
    }
    chatMessages = [
      { role: 'system', content: 'Du er en chatbot som hjelper brukeren å registrere skift via addShift eller addSeries. Svar alltid på norsk.' }
    ];
  }

  function autoResizeTextarea() {
    const textarea = chatElements.input;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
  }

  function appendMessage(role, text) {
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
      // Render Markdown for assistant messages
      const html = DOMPurify.sanitize(marked.parse(text));
      messageDiv.innerHTML = html;
    } else {
      // Plain text for user messages
      messageDiv.textContent = text;
    }

    chatElements.log.appendChild(messageDiv);
    chatElements.log.scrollTop = chatElements.log.scrollHeight;

    // Return the message element so it can be removed if needed
    return messageDiv;
  }

  async function sendPillMessage() {
    const text = chatElements.pillInput.value.trim();
    if (!text) return;

    // Exit input mode
    exitInputMode();

    // Send the message
    await sendMessage(text);
  }

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

    // Detect if this is likely a multi-step operation
    const isMultiStep = detectMultiStepOperation(messageText);

    // Show appropriate thinking indicator
    const spinner = isMultiStep
      ? appendMessage('assistant', '<span class="multi-step-indicator">Utfører flere operasjoner... <span class="dots"><span>.</span><span>.</span><span>.</span></span></span>')
      : appendMessage('assistant', '<span class="dots"><span>.</span><span>.</span><span>.</span></span>');

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

      // Use streaming for better user experience
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          messages: chatMessages,
          stream: true
        })
      });

      if (!response.ok) {
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

      // Replace spinner content with response text in the same bubble
      // Use Markdown rendering for assistant messages
      if (data.assistant) {
        const html = DOMPurify.sanitize(marked.parse(txt));
        spinner.innerHTML = html;
      } else {
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

      // Fallback to non-streaming request if streaming fails
      try {
        console.log('Streaming failed, falling back to regular request...');
        const fallbackResponse = await fetch(`${API_BASE}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
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
  function handleStreamEvent(event, spinnerElement) {
    switch (event.type) {
      case 'status':
        updateSpinnerText(spinnerElement, event.message);
        break;
      case 'gpt_response':
        if (event.tool_calls && event.tool_calls.length > 0) {
          const toolCallsText = event.tool_calls.map(call => call.name).join(', ');
          updateSpinnerText(spinnerElement, `GPT planlegger: ${toolCallsText}`);
        }
        break;
      case 'tool_calls_start':
        updateSpinnerText(spinnerElement, event.message);
        break;
      case 'tool_call_start':
        updateSpinnerText(spinnerElement, event.message);
        break;
      case 'tool_call_complete':
        updateSpinnerText(spinnerElement, event.message + ' ✓');
        break;
      case 'generating_response':
        updateSpinnerText(spinnerElement, event.message);
        break;
    }
  }

  function updateSpinnerText(spinnerElement, text) {
    if (spinnerElement && spinnerElement.parentNode) {
      spinnerElement.innerHTML = `<span class="stream-status">${text}</span> <span class="dots"><span>.</span><span>.</span><span>.</span></span>`;
    }
  }

  // Detect if message likely requires multiple operations
  function detectMultiStepOperation(messageText) {
    const text = messageText.toLowerCase();

    // Patterns that typically require multiple operations
    const multiStepPatterns = [
      /vis.*og.*endre/,           // "vis vaktene og endre"
      /vis.*og.*slett/,           // "vis vaktene og slett"
      /hent.*og.*oppdater/,       // "hent vaktene og oppdater"
      /legg til.*og.*legg til/,   // "legg til mandag og legg til tirsdag"
      /legg til.*\d+:\d+.*og.*\d+:\d+/,  // "legg til mandag 09:00 og tirsdag 10:00"
      /kopier.*til.*og/,          // "kopier til onsdag og fredag"
      /slett.*og.*legg til/,      // "slett vaktene og legg til nye"
      /endre.*og.*endre/,         // "endre mandag og endre tirsdag"
      /\bog\b.*\bog\b/,           // multiple "og" (and) conjunctions
      /,.*og/,                    // comma followed by "og"
      /først.*så/,                // "først ... så"
      /deretter/,                 // "deretter"
      /etterpå/,                  // "etterpå"
      /mandag.*og.*tirsdag/,      // specific day combinations
      /tirsdag.*og.*onsdag/,
      /onsdag.*og.*torsdag/,
      /torsdag.*og.*fredag/,
      /fredag.*og.*lørdag/,
      /lørdag.*og.*søndag/
    ];

    return multiStepPatterns.some(pattern => pattern.test(text));
  }

  // Clear chat log function (for sign-out)
  function clearChatLog() {
    if (chatElements.log) {
      chatElements.log.innerHTML = '';
    }
    chatMessages = [
      { role: 'system', content: 'Du er en chatbot som hjelper brukeren å registrere skift via addShift eller addSeries. Svar alltid på norsk.' }
    ];

    // Reset all states
    hasFirstMessage = false;
    isExpanded = false;
    isInInputMode = false;

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
    if (chatElements.pillInput) {
      chatElements.pillInput.style.display = 'none';
      chatElements.pillInput.value = '';
    }
    if (chatElements.placeholder) {
      chatElements.placeholder.style.display = 'block';
    }
  }

  // Expose functions globally for app integration
  window.chatbox = {
    init: initChatbox,
    clear: clearChatLog,
    expand: expandChatbox,
    collapse: collapseChatbox,
    updatePlaceholder: updateChatboxPlaceholder
  };

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatbox);
  } else {
    initChatbox();
  }

})();
