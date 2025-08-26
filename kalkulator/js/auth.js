// API Base URL configuration
const API_BASE = window.CONFIG?.apiBase || '/api';

// Initialize Supabase client when DOM is loaded

import { supabase } from '../../src/supabase-client.js'
import { signInWithGoogle } from './auth-google.js'
const supa = supabase;
window.supa = supa;

async function initAuth() {
  // Make supa available globally
  window.supa = supa;

  // Enable auth mode for proper scrolling
  document.documentElement.classList.add('auth-mode');
  document.body.classList.add('auth-mode');

  // Check if Supabase has processed the URL automatically
  await new Promise(resolve => setTimeout(resolve, 100)); // Give Supabase time to process



  // Check if Supabase has processed the URL automatically
  await new Promise(resolve => setTimeout(resolve, 100)); // Give Supabase time to process

  let shouldDisplayLoginPage = true; // Assume we display the login page by default


  // Immediate redirect if already authenticated and not in a recovery flow
  try {
    const { data: { session } } = await supa.auth.getSession();

    if (session) {
      try {
        const ok = await fetch(`${API_BASE}/settings`, {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        if (ok.status === 200) {          // token accepted by backend
          window.location.replace('index.html');
          return;
        }
      } catch (_) { /* ignore network errors */ }

      // token was bad – clear it and stay on login page
      try {
        await supa.auth.signOut();
      } catch (e) {
        console.warn('signOut error:', e?.message || e);
      }
      console.log('Stale token removed; showing login.');
    }

    // Always make body visible when staying on login page
    document.body.style.visibility = 'visible';
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


  // Fallback: If after all checks, the page is meant to be shown but is still hidden
  if (shouldDisplayLoginPage && document.body.style.visibility === 'hidden') {
    console.warn('Fallback: Body was still hidden after initial setup, forcing visibility.');
    document.body.style.visibility = 'visible';
  }
}

// Run initAuth immediately if DOM is already ready, otherwise wait for DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuth);
} else {
  initAuth();
}

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

  const showResetBtn   = document.getElementById("show-reset-btn");
  const resetForm      = document.getElementById("reset-form");
  const resetStep1     = document.getElementById("reset-step-1");
  const resetStep2     = document.getElementById("reset-step-2");
  const resetEmailInp  = document.getElementById("reset-email");
  const resetSendBtn   = document.getElementById("reset-send");
  const resetCodeInp   = document.getElementById("reset-code");
  const resetPasswordInp = document.getElementById("reset-password");
  const resetConfirmBtn = document.getElementById("reset-confirm");
  const resetBackBtn   = document.getElementById("reset-back");
  const backToLoginBtn = document.getElementById("back-to-login-btn");
  const resetResendBtn = document.getElementById("reset-resend");
  const resendTimer    = document.getElementById("resend-timer");
  const googleBtn      = document.getElementById("btn-google");

  // Store references globally for other functions to use
  window.authElements = {
    authMsg, emailInp, passInp, loginBtn, signupBtn, authBox,
    signupCard, signupEmail, signupPassword, signupName, 
    createAccountBtn, backLoginSignupBtn, signupMsg,
    completeProfileCard, completeName, 
    completeProfileBtn, skipProfileBtn, completeProfileMsg,
    showResetBtn, resetForm, resetStep1, resetStep2, resetEmailInp, resetSendBtn,
    resetCodeInp, resetPasswordInp, resetConfirmBtn, resetBackBtn, backToLoginBtn,
    resetResendBtn, resendTimer, googleBtn
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

  // Reset form handlers
  const resetEmailForm = document.getElementById('reset-email-form');
  if (resetEmailForm) {
    resetEmailForm.addEventListener('submit', function(event) {
      event.preventDefault();
      handleSendRecoveryCode();
    });
  }

  const resetCodeForm = document.getElementById('reset-code-form');
  if (resetCodeForm) {
    resetCodeForm.addEventListener('submit', function(event) {
      event.preventDefault();
      handleVerifyCodeAndSetPassword();
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

  // Reset form navigation
  if (showResetBtn) showResetBtn.onclick = () => showResetForm();
  if (backToLoginBtn) backToLoginBtn.onclick = () => showLoginForm();
  if (resetBackBtn) resetBackBtn.onclick = () => showResetStep1();
  if (resetSendBtn) resetSendBtn.onclick = () => handleSendRecoveryCode();
  if (resetConfirmBtn) resetConfirmBtn.onclick = () => handleVerifyCodeAndSetPassword();
  if (resetResendBtn) resetResendBtn.onclick = () => handleResendCode();
  if (googleBtn) googleBtn.onclick = () => handleGoogleSignIn();

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

  // Enter key support for reset forms
  if (resetEmailInp && resetSendBtn) {
    resetEmailInp.addEventListener('keypress', function(event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        resetSendBtn.click();
      }
    });
  }

  if (resetCodeInp && resetConfirmBtn) {
    resetCodeInp.addEventListener('keypress', function(event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        resetPasswordInp.focus();
      }
    });
  }

  if (resetPasswordInp && resetConfirmBtn) {
    resetPasswordInp.addEventListener('keypress', function(event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        resetConfirmBtn.click();
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

async function handleGoogleSignIn() {
  try {
    await signInWithGoogle();
  } catch (e) {
    console.error("[oauth] Google sign-in failed:", e);
    window.authElements.authMsg.textContent = "Google innlogging feilet. Prøv igjen.";
  }
}

function showSignupForm() {
  window.authElements.authBox.style.display = "none";
  window.authElements.signupCard.style.display = "flex";
  window.authElements.resetForm.style.display = "none";
}

function showLoginForm() {
  window.authElements.authBox.style.display = "flex";
  window.authElements.signupCard.style.display = "none";
  window.authElements.resetForm.style.display = "none";
  window.authElements.completeProfileCard.style.display = "none";
}

function showResetForm() {
  window.authElements.authBox.style.display = "none";
  window.authElements.signupCard.style.display = "none";
  window.authElements.resetForm.style.display = "flex";
  window.authElements.resetStep1.style.display = "block";
  window.authElements.resetStep2.style.display = "none";
  window.authElements.completeProfileCard.style.display = "none";
  
  // Clear any messages and reset form
  const resetMsg = document.getElementById('reset-msg');
  if (resetMsg) resetMsg.textContent = '';
  if (window.authElements.resetEmailInp) window.authElements.resetEmailInp.value = '';
}

function showResetStep1() {
  window.authElements.resetStep1.style.display = "block";
  window.authElements.resetStep2.style.display = "none";
  // Clear step 2 inputs
  if (window.authElements.resetCodeInp) window.authElements.resetCodeInp.value = '';
  if (window.authElements.resetPasswordInp) window.authElements.resetPasswordInp.value = '';
}

function showResetStep2() {
  window.authElements.resetStep1.style.display = "none";
  window.authElements.resetStep2.style.display = "block";
  // Focus the code input
  if (window.authElements.resetCodeInp) {
    setTimeout(() => window.authElements.resetCodeInp.focus(), 100);
  }
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
    const { data, error } = await supa.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName.trim()
        }
      }
    });

    if (error) {
      console.error('[signup] failed', error);
      window.authElements.signupMsg.textContent = 'Kunne ikke opprette konto. Se konsollen.';
    } else if (data?.session) {
      // instant login
      window.location.href = `${window.location.origin}/kalkulator/index.html`;
    } else {
      // fallback if confirm-email still on
      window.authElements.signupMsg.style.color = 'var(--success)';
      window.authElements.signupMsg.textContent = 'Registrering OK – sjekk e-post for bekreftelse!';
    }

    console.log('[signup]', { user: !!data?.user, session: !!data?.session, error });
  } catch (err) {
    console.error('Supabase error:', err);
    window.authElements.signupMsg.textContent = 'Kunne ikke koble til autentiseringstjeneste';
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
        window.location.replace("index.html");
      }, 150);
      
    } catch (err) {
      console.error("Error checking profile completion:", err);
      // If there's an error, just redirect to app
      
      if (!isRedirecting) {
        isRedirecting = true;
        setTimeout(() => {
          window.location.replace("index.html");
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
      window.location.replace("index.html");
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

    window.location.href = "index.html";
  } catch (err) {
    console.error("Error completing profile:", err);
    window.authElements.completeProfileMsg.textContent = "Kunne ikke oppdatere profil";
  }
}

async function skipProfileCompletion() {
  // Just redirect to app without requiring profile completion
  window.location.href = "index.html";
}

// Reset form handlers
async function handleSendRecoveryCode() {
  const email = window.authElements.resetEmailInp.value.trim();
  if (!email) {
    const msg = document.getElementById('reset-msg');
    if (msg) {
      msg.style.color = 'var(--danger)';
      msg.textContent = 'Vennligst skriv inn e-postadresse';
    }
    return;
  }

  // Disable button during request
  const btn = window.authElements.resetSendBtn;
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Sender...';
  }

  const success = await sendRecoveryCode(email);
  if (success) {
    showResetStep2();
    startResendTimer();
  }

  // Re-enable button
  if (btn) {
    btn.disabled = false;
    btn.textContent = 'Send kode';
  }
}

async function handleVerifyCodeAndSetPassword() {
  const email = window.authElements.resetEmailInp.value.trim();
  const code = window.authElements.resetCodeInp.value.trim();
  const password = window.authElements.resetPasswordInp.value;

  if (!email || !code || !password) {
    const msg = document.getElementById('reset-msg');
    if (msg) {
      msg.style.color = 'var(--danger)';
      msg.textContent = 'Vennligst fyll ut alle felt';
    }
    return;
  }

  // Disable button during request
  const btn = window.authElements.resetConfirmBtn;
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Oppdaterer...';
  }

  await verifyCodeAndSetPassword(email, code, password);

  // Re-enable button (verifyCodeAndSetPassword handles this in finally block)
}

async function handleResendCode() {
  const email = window.authElements.resetEmailInp.value.trim();
  if (!email) return;

  const btn = window.authElements.resetResendBtn;
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Sender...';
  }

  const success = await sendRecoveryCode(email);
  if (success) {
    startResendTimer();
  }
}

function startResendTimer() {
  const timer = window.authElements.resendTimer;
  const resendBtn = window.authElements.resetResendBtn;
  
  if (!timer || !resendBtn) return;

  let seconds = 60;
  resendBtn.disabled = true;
  
  const updateTimer = () => {
    timer.textContent = `Send ny kode (${seconds}s)`;
    seconds--;
    
    if (seconds < 0) {
      timer.textContent = '';
      resendBtn.disabled = false;
      resendBtn.textContent = 'Send ny kode';
    } else {
      setTimeout(updateTimer, 1000);
    }
  };
  
  updateTimer();
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



async function sendMagicLink(email) {
  try {
    // Use the current domain to ensure consistency
    const currentDomain = window.location.origin;
    const redirectUrl = `${currentDomain}/kalkulator/login.html`; // Redirect to kalkulator login after magic link login
    
    
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

// Minimal helper
function isValidEmail(s){ return /^\S+@\S+\.\S+$/.test(String(s||'').trim()); }

let otpCooldownUntil = 0;

export async function sendRecoveryCode(email) {
  const msg = document.getElementById('reset-msg');
  const btn = document.getElementById('reset-send');
  try {
    if (!isValidEmail(email)) throw new Error('Ugyldig e-postadresse');

    const now = Date.now();
    if (now < otpCooldownUntil) {
      const secs = Math.ceil((otpCooldownUntil - now)/1000);
      throw new Error(`Vent ${secs}s før du sender på nytt`);
    }

    // Optional CAPTCHA: gotrue_meta_security: { captcha_token }
    const { error } = await supa.auth.resetPasswordForEmail(email /* , { gotrue_meta_security: { captcha_token } } */);
    if (error) throw error;

    otpCooldownUntil = Date.now() + 60_000; // 60s cooldown
    if (msg) { msg.style.color = 'var(--success)'; msg.textContent = 'Kode sendt! Sjekk e-posten din.'; }
    return true;
  } catch (e) {
    if (msg) { msg.style.color = 'var(--danger)'; msg.textContent = e.message || 'Kunne ikke sende kode'; }
    return false;
  } finally {
    if (btn) btn.disabled = false;
  }
}

export async function verifyCodeAndSetPassword(email, code, newPassword) {
  const msg = document.getElementById('reset-msg');
  const btn = document.getElementById('reset-confirm');
  try {
    if (!isValidEmail(email)) throw new Error('Ugyldig e-postadresse');
    if (!(code && /^\d{6}$/.test(code))) throw new Error('Koden må være 6 sifre');
    if (!newPassword || newPassword.length < 8) throw new Error('Passordet må ha minst 8 tegn');

    const { error: vErr } = await supa.auth.verifyOtp({ email, token: code, type: 'recovery' });
    if (vErr) throw vErr;

    const { error: uErr } = await supa.auth.updateUser({ password: newPassword });
    if (uErr) throw uErr;

    if (msg) { msg.style.color = 'var(--success)'; msg.textContent = 'Passord oppdatert! Logg inn med det nye passordet.'; }

    // Optional: Sign out to force fresh credentials, then show login form
    await supa.auth.signOut();
    // Toggle UI back to login:
    const sectionLogin = document.getElementById('auth-box');
    const sectionReset = document.getElementById('reset-form');
    if (sectionReset) sectionReset.style.display = 'none';
    if (sectionLogin) sectionLogin.style.display = 'flex';
    return true;
  } catch (e) {
    if (msg) { msg.style.color = 'var(--danger)'; msg.textContent = e.message || 'Kunne ikke oppdatere passord'; }
    return false;
  } finally {
    if (btn) btn.disabled = false;
  }
}


function setupAuthStateHandling() {
  // Redirect if already logged in
  supa.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN') {
      await checkAndShowProfileCompletion();
    } else if (session && event !== 'SIGNED_OUT') {
      await checkAndShowProfileCompletion();
    }
  });

  // Check current session
  (async () => {
    const { data: { session } } = await supa.auth.getSession();
    if (session) {
      await checkAndShowProfileCompletion();
    }
  })();
}





