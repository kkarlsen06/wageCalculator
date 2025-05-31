// Initialize Supabase client when DOM is loaded
let supa;

document.addEventListener('DOMContentLoaded', function() {
  // Initialize Supabase client using global supabase object
  supa = window.supabase.createClient(
    "https://iuwjdacxbirhmsglcbxp.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1d2pkYWN4YmlyaG1zZ2xjYnhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0NTIxNDAsImV4cCI6MjA2NDAyODE0MH0.iSjbvGVpM3zOWCGpg5HrQp37PjJCmiHIwVQLgc2LgcE"
  );

  // Make supa available globally
  window.supa = supa;
  
  // Set up event listeners now that elements are available
  setupEventListeners();
  
  // Handle authentication state changes
  setupAuthStateHandling();
  
  // Check if user is coming from password reset email
  handlePasswordRecovery();
});

function setupEventListeners() {
  // Element refs
  const authMsg = document.getElementById("auth-msg");
  const emailInp = document.getElementById("email");
  const passInp = document.getElementById("password");
  const loginBtn = document.getElementById("login-btn");
  const signupBtn= document.getElementById("signup-btn");
  const authBox  = document.getElementById("auth-box");

  const forgotBtn      = document.getElementById("forgot-btn");
  const forgotCard     = document.getElementById("forgot-card");
  const forgotEmailInp = document.getElementById("forgot-email");
  const sendResetBtn   = document.getElementById("send-reset-btn");
  const backLoginBtn   = document.getElementById("back-login-btn");

  // Store references globally for other functions to use
  window.authElements = {
    authMsg, emailInp, passInp, loginBtn, signupBtn, authBox,
    forgotBtn, forgotCard, forgotEmailInp, sendResetBtn, backLoginBtn
  };

  // Auth actions
  if (loginBtn) loginBtn.onclick  = () => signIn(emailInp.value, passInp.value);
  if (signupBtn) signupBtn.onclick = () => signUp(emailInp.value, passInp.value);

  // Forgot password
  if (forgotBtn) forgotBtn.onclick = () => toggleForgot(true);
  if (backLoginBtn) backLoginBtn.onclick = () => toggleForgot(false);
  if (sendResetBtn) sendResetBtn.onclick = () => sendResetLink(forgotEmailInp.value);

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
    if (!error) window.location.href = "app.html";
  } catch (err) {
    console.error("Supabase error:", err);
    window.authElements.authMsg.textContent = "Kunne ikke koble til autentiseringstjeneste";
  }
}

async function signUp(email, password) {
  try {
    const { error, data } = await supa.auth.signUp({ email, password });
    if (error) return window.authElements.authMsg.textContent = error.message;
    const alias = email.split("@")[0];
    await supa.from("profiles").insert({ id: data.user.id, username: alias });
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
    
    console.log('Sending reset link with redirect URL:', redirectUrl);
    
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

// Check if current URL contains recovery tokens
function isInRecoveryMode() {
  const hashFragment = window.location.hash;
  const urlParams = new URLSearchParams(window.location.search);
  
  // Check for recovery tokens in either hash fragment or query parameters
  const hasRecoveryInHash = hashFragment.includes('access_token') && hashFragment.includes('type=recovery');
  const hasRecoveryInQuery = urlParams.has('token') && urlParams.get('type') === 'recovery';
  const hasRecoveryInSearch = window.location.search.includes('access_token') && window.location.search.includes('type=recovery');
  
  return hasRecoveryInHash || hasRecoveryInQuery || hasRecoveryInSearch;
}

function setupAuthStateHandling() {
  // Redirect if already logged in
  supa.auth.onAuthStateChange(async (event, session) => {
    console.log('Auth state change:', event, session);
    console.log('Is in recovery mode:', isInRecoveryMode());
  
    // Don't redirect if we're in password recovery mode
    if (session && !isInRecoveryMode()) {
      console.log('User logged in, redirecting to dashboard');
      window.location.href = "app.html";
    } else if (event === 'PASSWORD_RECOVERY') {
      // Handle password recovery
      console.log('PASSWORD_RECOVERY event triggered');
      showPasswordResetForm();
    } else if (event === 'TOKEN_REFRESHED' && isInRecoveryMode()) {
      // User is in recovery mode and token refreshed, show reset form
      console.log('Token refreshed in recovery mode');
      showPasswordResetForm();
    } else if (session && isInRecoveryMode()) {
      // User has valid session from recovery tokens, show password reset form
      console.log('User authenticated via recovery tokens, showing password reset form');
      showPasswordResetForm();
    }
  });

  // Check current session
  (async () => {
    // Don't auto-redirect if we're handling password recovery
    if (!isInRecoveryMode()) {
      const { data: { session } } = await supa.auth.getSession();
      if (session) {
        console.log('Existing session found, redirecting to dashboard');
        window.location.href = "app.html";
      }
    } else {
      console.log('Recovery mode detected, skipping auto-redirect');
    }
  })();
}

// Handle password recovery from email link
async function handlePasswordRecovery() {
    // Use the common function to check if we're in recovery mode
    if (!isInRecoveryMode()) {
        console.log('Not in recovery mode, skipping password recovery handling');
        return;
    }
    
    console.log('Password recovery mode detected, processing tokens...');
    
    const hashFragment = window.location.hash;
    const urlParams = new URLSearchParams(window.location.search);
    
    // Check if this is a recovery link (can be in hash or query params)
    const isRecoveryHash = hashFragment.includes('access_token') && hashFragment.includes('type=recovery');
    const isRecoveryQuery = urlParams.has('token') && urlParams.get('type') === 'recovery';
    
    if (isRecoveryHash) {
        // Handle tokens in hash fragment (modern Supabase format)
        try {
            console.log('Recovery link detected in hash:', hashFragment);
            
            // Parse the URL fragments to get tokens
            const hashParams = new URLSearchParams(hashFragment.substring(1));
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');
            const type = hashParams.get('type');
            
            if (type === 'recovery' && accessToken) {
                // Set the session using the tokens from the URL
                const { data, error } = await supa.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken || ''
                });
                
                if (error) {
                    console.error('Recovery error:', error);
                    if (window.authElements?.authMsg) {
                        window.authElements.authMsg.textContent = 'Ugyldig eller utløpt reset-lenke';
                    }
                    return;
                }
                
                if (data.session) {
                    console.log('Session set successfully, showing password reset form');
                    // Clear URL params and show password reset form
                    window.history.replaceState({}, document.title, window.location.pathname);
                    showPasswordResetForm();
                } else {
                    if (window.authElements?.authMsg) {
                        window.authElements.authMsg.textContent = 'Kunne ikke opprette session';
                    }
                }
            }
        } catch (err) {
            console.error('Recovery handling error:', err);
            if (window.authElements?.authMsg) {
                window.authElements.authMsg.textContent = 'Noe gikk galt ved passord-reset';
            }
        }
    } else if (isRecoveryQuery) {
        // Handle legacy Supabase token format in query params
        try {
            console.log('Recovery link detected in query params:', window.location.search);
            
            const token = urlParams.get('token');
            const type = urlParams.get('type');
            
            if (type === 'recovery' && token) {
                // Use verifyOtp to exchange the token for a session
                const { data, error } = await supa.auth.verifyOtp({
                    token_hash: token,
                    type: 'recovery'
                });
                
                if (error) {
                    console.error('Token verification error:', error);
                    if (window.authElements?.authMsg) {
                        window.authElements.authMsg.textContent = 'Ugyldig eller utløpt reset-lenke';
                    }
                    return;
                }
                
                if (data.session) {
                    console.log('Token verified successfully, showing password reset form');
                    // Clear URL params and show password reset form
                    window.history.replaceState({}, document.title, window.location.pathname);
                    showPasswordResetForm();
                } else {
                    if (window.authElements?.authMsg) {
                        window.authElements.authMsg.textContent = 'Kunne ikke opprette session';
                    }
                }
            }
        } catch (err) {
            console.error('Token verification error:', err);
            if (window.authElements?.authMsg) {
                window.authElements.authMsg.textContent = 'Noe gikk galt ved passord-reset';
            }
        }
    }
}

// Show password reset form
function showPasswordResetForm() {
    // Hide normal login form and forgot password form
    if (window.authElements?.authBox) window.authElements.authBox.style.display = 'none';
    if (window.authElements?.forgotCard) window.authElements.forgotCard.style.display = 'none';
    
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
            <h2 style="margin-bottom: 20px;">Sett nytt passord</h2>
            <input id="new-password" type="password" placeholder="Nytt passord" required class="form-control" style="margin-bottom: 12px;" />
            <input id="confirm-password" type="password" placeholder="Bekreft passord" required class="form-control" style="margin-bottom: 18px;" />
            <button id="update-password-btn" class="btn btn-primary" style="margin-bottom: 12px;">Oppdater passord</button>
            <button id="cancel-reset-btn" class="btn btn-secondary">Avbryt</button>
            <p id="reset-msg" style="color: var(--danger); min-height: 24px; text-align: center; font-size: 15px;"></p>
        </div>
    `;
    
    // Add event listeners
    const updateBtn = resetForm.querySelector('#update-password-btn');
    const cancelBtn = resetForm.querySelector('#cancel-reset-btn');
    const newPasswordInp = resetForm.querySelector('#new-password');
    const confirmPasswordInp = resetForm.querySelector('#confirm-password');
    
    updateBtn.onclick = () => updatePassword(newPasswordInp.value, confirmPasswordInp.value);
    cancelBtn.onclick = () => cancelPasswordReset();
    
    return resetForm;
}

// Update password
async function updatePassword(newPassword, confirmPassword) {
    const resetMsg = document.getElementById('reset-msg');
    
    if (!newPassword || newPassword.length < 6) {
        resetMsg.textContent = 'Passordet må være minst 6 tegn';
        return;
    }
    
    if (newPassword !== confirmPassword) {
        resetMsg.textContent = 'Passordene stemmer ikke overens';
        return;
    }
    
    try {
        const { error } = await supa.auth.updateUser({
            password: newPassword
        });
        
        if (error) {
            resetMsg.textContent = error.message;
        } else {
            resetMsg.style.color = 'var(--success)';
            resetMsg.textContent = 'Passord oppdatert! Omdirigerer...';
            
            // Clear the hash and redirect to app
            window.location.hash = '';
            setTimeout(() => {
                window.location.href = 'app.html';
            }, 2000);
        }
    } catch (err) {
        console.error('Password update error:', err);
        resetMsg.textContent = 'Kunne ikke oppdatere passord';
    }
}

// Cancel password reset
function cancelPasswordReset() {
    // Clear the hash
    window.location.hash = '';
    
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