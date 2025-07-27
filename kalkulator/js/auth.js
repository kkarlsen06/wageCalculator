// Initialize Supabase client when DOM is loaded
let supa;
let isInPasswordRecovery = false; // Flag to track if we're in password recovery flow

document.addEventListener('DOMContentLoaded', async function() {

  // Initialize Supabase client using configuration
  supa = window.supabase.createClient(
    window.CONFIG.supabase.url,
    window.CONFIG.supabase.anonKey
  );

  // Make supa available globally
  window.supa = supa;

  // Enable auth mode for proper scrolling
  document.documentElement.classList.add('auth-mode');
  document.body.classList.add('auth-mode');
  
  // Check if Supabase has processed the URL automatically
  await new Promise(resolve => setTimeout(resolve, 100)); // Give Supabase time to process
  
  // Set up auth state listening IMMEDIATELY to catch any recovery events
  supa.auth.onAuthStateChange(async (event, session) => {
    
    if (event === 'PASSWORD_RECOVERY') {
      isInPasswordRecovery = true;
      document.body.style.visibility = 'visible';
      setTimeout(() => showPasswordResetForm(), 50);
      return;
    }
    
    if (event === 'SIGNED_IN' && (isInRecoveryMode() || sessionStorage.getItem('supabase_recovery_flow') === 'true')) {
      isInPasswordRecovery = true;
      document.body.style.visibility = 'visible';
      setTimeout(() => showPasswordResetForm(), 50);
      return;
    }
  });
  
  // Check immediately if we have a recovery session
  try {
    const { data: { session } } = await supa.auth.getSession();
    
    if (session && (isInRecoveryMode() || sessionStorage.getItem('supabase_recovery_flow') === 'true')) {
      isInPasswordRecovery = true;
      document.body.style.visibility = 'visible';
      setTimeout(() => showPasswordResetForm(), 100);
      return;
    }
  } catch (e) {
    console.error('Error in immediate session check:', e);
  }
  
  // Check if Supabase has processed the URL automatically
  await new Promise(resolve => setTimeout(resolve, 100)); // Give Supabase time to process
  
  let shouldDisplayLoginPage = true; // Assume we display the login page by default

  // Check if we're in password recovery mode BEFORE checking session
  const isRecoveryFlow = isInRecoveryMode();

  // Immediate redirect if already authenticated and not in a recovery flow
  try {
    const { data: { session } } = await supa.auth.getSession();

    if (session && !isRecoveryFlow && !isInPasswordRecovery) {
      shouldDisplayLoginPage = false;
      window.location.replace('app.html');
      return; // Stop further script execution on this page if redirected
    } else if (session && isRecoveryFlow) {
      isInPasswordRecovery = true;
    }
  } catch (e) {
    console.error('Error checking session for immediate redirect:', e);
    // In case of error, default to showing the login page (shouldDisplayLoginPage remains true)
  }

  // If we are not redirecting, make the body visible
  if (shouldDisplayLoginPage) {
    document.body.style.visibility = 'visible';
  }
  
  // Set up event listeners now that elements are available
  setupEventListeners();
  
  // Handle authentication state changes
  setupAuthStateHandling();
  
  // Check if user is coming from password reset email (via URL hash)
  handlePasswordRecovery();

  // Fallback: If after all checks, the page is meant to be shown but is still hidden
  if (shouldDisplayLoginPage && document.body.style.visibility === 'hidden') {
    console.warn('Fallback: Body was still hidden after initial setup, forcing visibility.');
    document.body.style.visibility = 'visible';
  }
});

function setupEventListeners() {
  // Element refs
  const authMsg = document.getElementById("auth-msg");
  const emailInp = document.getElementById("email");
  const passInp = document.getElementById("password");
  const loginBtn = document.getElementById("login-btn");
  const signupBtn= document.getElementById("signup-btn");
  const authBox  = document.getElementById("auth-box");

  // Signup form elements
  const signupCard = document.getElementById("signup-card");
  const signupEmail = document.getElementById("signup-email");
  const signupPassword = document.getElementById("signup-password");
  const signupName = document.getElementById("signup-name");
  const createAccountBtn = document.getElementById("create-account-btn");
  const backLoginSignupBtn = document.getElementById("back-login-signup-btn");
  const signupMsg = document.getElementById("signup-msg");

  // Profile completion form elements
  const completeProfileCard = document.getElementById("complete-profile-card");
  const completeName = document.getElementById("complete-name");
  const completeProfileBtn = document.getElementById("complete-profile-btn");
  const skipProfileBtn = document.getElementById("skip-profile-btn");
  const completeProfileMsg = document.getElementById("complete-profile-msg");

  const forgotBtn      = document.getElementById("forgot-btn");
  const forgotCard     = document.getElementById("forgot-card");
  const forgotEmailInp = document.getElementById("forgot-email");
  const sendResetBtn   = document.getElementById("send-reset-btn");
  const sendMagicLinkBtn = document.getElementById("send-magic-link-btn"); // New button
  const backLoginBtn   = document.getElementById("back-login-btn");

  // Store references globally for other functions to use
  window.authElements = {
    authMsg, emailInp, passInp, loginBtn, signupBtn, authBox,
    signupCard, signupEmail, signupPassword, signupName, 
    createAccountBtn, backLoginSignupBtn, signupMsg,
    completeProfileCard, completeName, 
    completeProfileBtn, skipProfileBtn, completeProfileMsg,
    forgotBtn, forgotCard, forgotEmailInp, sendResetBtn, sendMagicLinkBtn, backLoginBtn // Added sendMagicLinkBtn
  };

  // Auth actions
  if (loginBtn) loginBtn.onclick  = () => signIn(emailInp.value, passInp.value);
  if (signupBtn) signupBtn.onclick = () => showSignupForm();
  if (createAccountBtn) createAccountBtn.onclick = () => signUpWithDetails();
  if (backLoginSignupBtn) backLoginSignupBtn.onclick = () => showLoginForm();

  // Form submission handlers
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', function(event) {
      event.preventDefault();
      signIn(emailInp.value, passInp.value);
    });
  }

  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', function(event) {
      event.preventDefault();
      signUpWithDetails();
    });
  }

  const forgotForm = document.getElementById('forgot-form');
  if (forgotForm) {
    forgotForm.addEventListener('submit', function(event) {
      event.preventDefault();
      sendResetLink(forgotEmailInp.value);
    });
  }

  const completeProfileForm = document.getElementById('complete-profile-form');
  if (completeProfileForm) {
    completeProfileForm.addEventListener('submit', function(event) {
      event.preventDefault();
      completeProfile();
    });
  }

  // Profile completion actions
  if (completeProfileBtn) completeProfileBtn.onclick = () => completeProfile();
  if (skipProfileBtn) skipProfileBtn.onclick = () => skipProfileCompletion();

  // Forgot password
  if (forgotBtn) forgotBtn.onclick = () => toggleForgot(true);
  if (backLoginBtn) backLoginBtn.onclick = () => toggleForgot(false);
  if (sendResetBtn) sendResetBtn.onclick = () => sendResetLink(forgotEmailInp.value);
  if (sendMagicLinkBtn) sendMagicLinkBtn.onclick = () => sendMagicLink(forgotEmailInp.value); // New event listener

  // Add enter key functionality
  if (passInp && loginBtn) {
    passInp.addEventListener('keypress', function(event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        loginBtn.click();
      }
    });
  }

  if (emailInp && loginBtn) {
    emailInp.addEventListener('keypress', function(event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        loginBtn.click();
      }
    });
  }

  // Enter key support for signup form
  if (signupName && createAccountBtn) {
    signupName.addEventListener('keypress', function(event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        createAccountBtn.click();
      }
    });
  }

  // Enter key support for profile completion form
  if (completeName && completeProfileBtn) {
    completeName.addEventListener('keypress', function(event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        completeProfileBtn.click();
      }
    });
  }

  if (forgotEmailInp && sendResetBtn) {
    forgotEmailInp.addEventListener('keypress', function(event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        sendResetBtn.click();
      }
    });
  }
}

async function signIn(email, password) {
  try {
    const { error } = await supa.auth.signInWithPassword({ email, password });
    window.authElements.authMsg.textContent = error ? error.message : "";
    // Don't call checkAndShowProfileCompletion here - let auth state change handle it
  } catch (err) {
    console.error("Supabase error:", err);
    window.authElements.authMsg.textContent = "Kunne ikke koble til autentiseringstjeneste";
  }
}

function showSignupForm() {
  window.authElements.authBox.style.display = "none";
  window.authElements.signupCard.style.display = "flex";
  window.authElements.forgotCard.style.display = "none";
}

function showLoginForm() {
  window.authElements.authBox.style.display = "flex";
  window.authElements.signupCard.style.display = "none";
  window.authElements.forgotCard.style.display = "none";
  window.authElements.completeProfileCard.style.display = "none";
}

async function signUpWithDetails() {
  const email = window.authElements.signupEmail.value;
  const password = window.authElements.signupPassword.value;
  const firstName = window.authElements.signupName.value;

  if (!email || !password || !firstName) {
    window.authElements.signupMsg.textContent = "Vennligst fyll ut alle påkrevde felt";
    return;
  }

  try {
    const { error, data } = await supa.auth.signUp({ 
      email, 
      password,
      options: {
        data: {
          first_name: firstName.trim()
        }
      }
    });
    
    if (error) {
      window.authElements.signupMsg.textContent = error.message;
      return;
    }

    window.authElements.signupMsg.style.color = "var(--success)";
    window.authElements.signupMsg.textContent = "Registrering OK – sjekk e-post for bekreftelse!";
  } catch (err) {
    console.error("Supabase error:", err);
    window.authElements.signupMsg.textContent = "Kunne ikke koble til autentiseringstjeneste";
  }
}

// Add a flag to prevent multiple simultaneous redirects
let isRedirecting = false;

async function checkAndShowProfileCompletion() {
  // Add a safety timeout
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error("checkAndShowProfileCompletion timeout")), 10000);
  });
  
  const mainPromise = async () => {
    try {
      if (isRedirecting) {
        return;
      }
      
      
      let user = null;
      try {
        const { data: { user: userData }, error } = await supa.auth.getUser();
        user = userData;
        
        if (error) {
          console.error("Error getting user:", error);
          throw error;
        }
      } catch (getUserError) {
        console.error("Exception while getting user:", getUserError);
        // Try to get user from session instead
        try {
          const { data: { session } } = await supa.auth.getSession();
          user = session?.user || null;
        } catch (sessionError) {
          console.error("Error getting session:", sessionError);
        }
      }
      
      if (!user) {
        return;
      }


      // For existing users or users without first_name, just redirect to app
      // The simplified profile system doesn't require mandatory completion
      
      isRedirecting = true;
      
      // Small delay to ensure auth state is properly set
      setTimeout(() => {
        window.location.replace("app.html");
      }, 150);
      
    } catch (err) {
      console.error("Error checking profile completion:", err);
      // If there's an error, just redirect to app
      
      if (!isRedirecting) {
        isRedirecting = true;
        setTimeout(() => {
          window.location.replace("app.html");
        }, 100);
      }
    }
  };
  
  try {
    await Promise.race([mainPromise(), timeoutPromise]);
  } catch (timeoutError) {
    console.error("checkAndShowProfileCompletion timed out:", timeoutError);
    // Force redirect on timeout
    if (!isRedirecting) {
      isRedirecting = true;
      window.location.replace("app.html");
    }
  }
}

function showProfileCompletionForm() {
  window.authElements.authBox.style.display = "none";
  window.authElements.signupCard.style.display = "none";
  window.authElements.forgotCard.style.display = "none";
  window.authElements.completeProfileCard.style.display = "flex";
}

async function completeProfile() {
  const firstName = window.authElements.completeName.value;

  if (!firstName) {
    window.authElements.completeProfileMsg.textContent = "Vennligst fyll ut fornavn";
    return;
  }

  try {
    const { error } = await supa.auth.updateUser({
      data: { 
        first_name: firstName.trim()
      }
    });

    if (error) {
      window.authElements.completeProfileMsg.textContent = "Feil ved oppdatering av profil";
      console.error("Profile update error:", error);
      return;
    }

    window.location.href = "app.html";
  } catch (err) {
    console.error("Error completing profile:", err);
    window.authElements.completeProfileMsg.textContent = "Kunne ikke oppdatere profil";
  }
}

async function skipProfileCompletion() {
  // Just redirect to app without requiring profile completion
  window.location.href = "app.html";
}

// Legacy function - no longer used since we have signUpWithDetails
async function signUp(email, password) {
  try {
    const { error, data } = await supa.auth.signUp({ email, password });
    if (error) return window.authElements.authMsg.textContent = error.message;
    window.authElements.authMsg.textContent = "Registrering OK – sjekk e-post for bekreftelse!";
  } catch (err) {
    console.error("Supabase error:", err);
    window.authElements.authMsg.textContent = "Kunne ikke koble til autentiseringstjeneste";
  }
}

function toggleForgot(show) {
  window.authElements.forgotCard.style.display = show ? "flex" : "none";
  window.authElements.authBox.style.display    = show ? "none" : "flex";
}

async function sendResetLink(email) {
  try {
    // Use the current domain to ensure consistency
    const currentDomain = window.location.origin;
    const redirectUrl = `${currentDomain}/kalkulator/index.html`;
    
    
    const { error } = await supa.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl
    });
    const msg = document.getElementById("forgot-msg");
    msg.style.color = error ? "var(--danger)" : "var(--success)";
    msg.textContent = error ? error.message : "Sjekk e-posten din for lenke!";
  } catch (err) {
    const msg = document.getElementById("forgot-msg");
    msg.style.color = "var(--danger)";
    msg.textContent = "Kunne ikke sende e-post";
    console.error("Supabase reset error:", err);
  }
}

async function sendMagicLink(email) {
  try {
    // Use the current domain to ensure consistency
    const currentDomain = window.location.origin;
    const redirectUrl = `${currentDomain}/kalkulator/index.html`; // Or app.html if you want to redirect there after magic link login
    
    
    const { error } = await supa.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    const msg = document.getElementById("forgot-msg");
    msg.style.color = error ? "var(--danger)" : "var(--success)";
    msg.textContent = error ? error.message : "Magisk lenke sendt! Sjekk e-posten din.";
  } catch (err) {
    const msg = document.getElementById("forgot-msg");
    msg.style.color = "var(--danger)";
    msg.textContent = "Kunne ikke sende magisk lenke";
    console.error("Supabase magic link error:", err);
  }
}

// Check if current URL contains recovery tokens
function isInRecoveryMode() {
  const hashFragment = window.location.hash;
  const urlParams = new URLSearchParams(window.location.search);
  const currentUrl = window.location.href;
  
  // Check for recovery tokens in either hash fragment or query parameters
  const hasRecoveryInHash = hashFragment.includes('access_token') && hashFragment.includes('type=recovery');
  const hasRecoveryInQuery = urlParams.has('token') && urlParams.get('type') === 'recovery';
  const hasRecoveryInSearch = window.location.search.includes('access_token') && window.location.search.includes('type=recovery');
  
  // Check for the specific recovery type parameter in different formats
  const hasRecoveryType = hashFragment.includes('type=recovery') || window.location.search.includes('type=recovery');
  
  // Check if we came from Supabase verify URL (even if tokens are not visible anymore)
  const cameFromSupabaseVerify = document.referrer.includes('supabase.co/auth/v1/verify') || 
                                sessionStorage.getItem('supabase_recovery_flow') === 'true';
  
  // Parse hash fragment as URL parameters if it contains access_token
  let hashParams = null;
  if (hashFragment.startsWith('#') && hashFragment.includes('access_token')) {
    try {
      hashParams = new URLSearchParams(hashFragment.substring(1));
    } catch (e) {
      console.error('Error parsing hash fragment:', e);
    }
  }
  
  const hasHashRecoveryType = hashParams && hashParams.get('type') === 'recovery';
  
  const isRecovery = hasRecoveryInHash || hasRecoveryInQuery || hasRecoveryInSearch || 
                    hasRecoveryType || cameFromSupabaseVerify || hasHashRecoveryType;
  
  
  // If we detect recovery mode, mark it in sessionStorage for future checks
  if (isRecovery) {
    sessionStorage.setItem('supabase_recovery_flow', 'true');
  }
  
  return isRecovery;
}

function setupAuthStateHandling() {
  // Redirect if already logged in
  supa.auth.onAuthStateChange(async (event, session) => {
  
    // Handle different auth events
    if (event === 'PASSWORD_RECOVERY') {
      isInPasswordRecovery = true;
      showPasswordResetForm();
    } else if (event === 'SIGNED_IN') {
      // Check if this sign in is from a recovery flow
      if (isInRecoveryMode() || isInPasswordRecovery) {
        isInPasswordRecovery = true;
        showPasswordResetForm();
      } else {
        await checkAndShowProfileCompletion();
      }
    } else if (event === 'TOKEN_REFRESHED' && (isInRecoveryMode() || isInPasswordRecovery)) {
      isInPasswordRecovery = true;
      showPasswordResetForm();
    } else if (session && !isInRecoveryMode() && !isInPasswordRecovery && event !== 'SIGNED_OUT') {
      await checkAndShowProfileCompletion();
    }
  });

  // Check current session - but respect recovery mode
  (async () => {
    if (!isInRecoveryMode() && !isInPasswordRecovery) {
      const { data: { session } } = await supa.auth.getSession();
      if (session) {
        await checkAndShowProfileCompletion();
      }
    } else {
      // If we're in recovery mode, make sure the form shows
      if (isInRecoveryMode()) {
        isInPasswordRecovery = true;
        setTimeout(() => showPasswordResetForm(), 200);
      }
    }
  })();
}

// Handle password recovery from email link
async function handlePasswordRecovery() {
  const isRecovery = isInRecoveryMode();
  
  // Also check if Supabase has set any auth-related data
  const hashFragment = window.location.hash;
  const hasAuthFragment = hashFragment.includes('access_token') || hashFragment.includes('refresh_token');
                    
  if (isRecovery || hasAuthFragment) {
    isInPasswordRecovery = true; // Set the flag
    document.body.style.visibility = 'visible'; // Make body visible for recovery form
    
    // Show the password reset form immediately
    setTimeout(() => {
      showPasswordResetForm();
    }, 100); // Small delay to ensure DOM is ready
  }
}

// Show password reset form
function showPasswordResetForm() {
    
    // Hide normal login form and forgot password form
    if (window.authElements?.authBox) window.authElements.authBox.style.display = 'none';
    if (window.authElements?.signupCard) window.authElements.signupCard.style.display = 'none';
    if (window.authElements?.forgotCard) window.authElements.forgotCard.style.display = 'none';
    if (window.authElements?.completeProfileCard) window.authElements.completeProfileCard.style.display = 'none';
    
    // Create or show password reset form
    let resetForm = document.getElementById('reset-password-form');
    if (!resetForm) {
        resetForm = createPasswordResetForm();
        document.body.appendChild(resetForm);
    }
    resetForm.style.display = 'flex';
}

// Create password reset form
function createPasswordResetForm() {
    const resetForm = document.createElement('div');
    resetForm.id = 'reset-password-form';
    resetForm.className = 'auth-center';
    resetForm.innerHTML = `
        <div class="login-card">
            <form id="reset-password-form-element" novalidate>
                <h2 style="margin-bottom: 20px;">Sett nytt passord</h2>
                <label for="new-password" class="form-label">Nytt passord</label>
                <input id="new-password" name="new-password" type="password" placeholder="Nytt passord" required class="form-control" style="margin-bottom: 12px;" autocomplete="new-password" />
                <label for="confirm-password" class="form-label">Bekreft passord</label>
                <input id="confirm-password" name="confirm-password" type="password" placeholder="Bekreft passord" required class="form-control" style="margin-bottom: 18px;" autocomplete="new-password" />
                <button id="update-password-btn" type="submit" class="btn btn-primary" style="margin-bottom: 12px;">Oppdater passord</button>
            </form>
            <button id="cancel-reset-btn" class="btn btn-secondary">Avbryt</button>
            <p id="reset-msg" style="color: var(--danger); min-height: 24px; text-align: center; font-size: 15px;"></p>
        </div>
    `;
    
    // Add event listeners
    const updateBtn = resetForm.querySelector('#update-password-btn');
    const cancelBtn = resetForm.querySelector('#cancel-reset-btn');
    const newPasswordInp = resetForm.querySelector('#new-password');
    const confirmPasswordInp = resetForm.querySelector('#confirm-password');
    const resetFormElement = resetForm.querySelector('#reset-password-form-element');

    updateBtn.onclick = () => updatePassword(newPasswordInp.value, confirmPasswordInp.value);
    cancelBtn.onclick = () => cancelPasswordReset();

    // Add form submission handler
    if (resetFormElement) {
        resetFormElement.addEventListener('submit', function(event) {
            event.preventDefault();
            updatePassword(newPasswordInp.value, confirmPasswordInp.value);
        });
    }
    
    // Add enter key support for password reset form
    newPasswordInp.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            confirmPasswordInp.focus();
        }
    });
    
    confirmPasswordInp.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            updateBtn.click();
        }
    });
    
    return resetForm;
}

// Update password
async function updatePassword(newPassword, confirmPassword) {
    const resetMsg = document.getElementById('reset-msg');
    const updateBtn = document.getElementById('update-password-btn');
    
    // Reset message styling
    resetMsg.style.color = 'var(--danger)';
    
    if (!newPassword || newPassword.length < 6) {
        resetMsg.textContent = 'Passordet må være minst 6 tegn';
        return;
    }
    
    if (newPassword !== confirmPassword) {
        resetMsg.textContent = 'Passordene stemmer ikke overens';
        return;
    }
    
    // Disable button during update
    updateBtn.disabled = true;
    updateBtn.textContent = 'Oppdaterer...';
    resetMsg.textContent = '';
    
    try {
        // First verify we have a session from the recovery link
        const { data: { session } } = await supa.auth.getSession();
        
        if (!session) {
            resetMsg.textContent = 'Ugyldig eller utløpt tilbakestillingslenke. Prøv å be om en ny lenke.';
            return;
        }
        
        // Verify this is actually a recovery session by checking user metadata or URL
        const isRecoverySession = isInRecoveryMode() || isInPasswordRecovery;
        if (!isRecoverySession) {
            console.warn('Attempting password update without recovery context');
        }
        
        
        const { error } = await supa.auth.updateUser({
            password: newPassword
        });
        
        if (error) {
            console.error('Password update error:', error);
            resetMsg.textContent = error.message || 'Kunne ikke oppdatere passord';
        } else {
            resetMsg.style.color = 'var(--success)';
            resetMsg.textContent = 'Passord oppdatert! Omdirigerer...';
            
            // Clear the recovery flag and hash, then redirect to app
            isInPasswordRecovery = false;
            window.location.hash = '';
            sessionStorage.removeItem('supabase_recovery_flow');
            
            // Sign out and then redirect to login to force fresh authentication
            setTimeout(async () => {
                await supa.auth.signOut();
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 500);
            }, 1500);
        }
    } catch (err) {
        console.error('Password update exception:', err);
        resetMsg.textContent = 'Kunne ikke oppdatere passord. Prøv igjen.';
    } finally {
        // Re-enable button
        updateBtn.disabled = false;
        updateBtn.textContent = 'Oppdater passord';
    }
}

// Cancel password reset
function cancelPasswordReset() {
    // Clear the recovery flag and hash
    isInPasswordRecovery = false;
    window.location.hash = '';
    sessionStorage.removeItem('supabase_recovery_flow');
    
    // Hide reset form and show login form
    const resetForm = document.getElementById('reset-password-form');
    if (resetForm) {
        resetForm.style.display = 'none';
    }
    
    if (window.authElements?.authBox) window.authElements.authBox.style.display = 'flex';
    if (window.authElements?.forgotCard) window.authElements.forgotCard.style.display = 'none';
    
    // Clear any messages
    if (window.authElements?.authMsg) window.authElements.authMsg.textContent = '';
}