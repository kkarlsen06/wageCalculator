import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Init Supabase client
const supa = createClient('https://iuwjdacxbirhmsglcbxp.supabase.co','<your_anon_key>');

// Element references
const authMsg  = document.getElementById('auth-msg');
const emailInp = document.getElementById('email');
const passInp  = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const signupBtn= document.getElementById('signup-btn');
const authBox  = document.getElementById('auth-box');
const appBox   = document.getElementById('app');
// Forgot-password
const forgotBtn      = document.getElementById('forgot-btn');
const forgotCard     = document.getElementById('forgot-card');
const forgotEmailInp = document.getElementById('forgot-email');
const sendResetBtn   = document.getElementById('send-reset-btn');
const backLoginBtn   = document.getElementById('back-login-btn');
const forgotMsg      = document.getElementById('forgot-msg');
// Recovery
const recoveryCard       = document.getElementById('recovery-card');
const newPasswordInp     = document.getElementById('new-password');
const confirmPasswordInp = document.getElementById('confirm-password');
const updatePasswordBtn  = document.getElementById('update-password-btn');
const cancelRecoveryBtn  = document.getElementById('cancel-recovery-btn');
const recoveryMsg        = document.getElementById('recovery-msg');

// Auth actions
loginBtn.onclick  = () => signIn(emailInp.value, passInp.value);
signupBtn.onclick = () => signUp(emailInp.value, passInp.value);
// ...existing JS (sendResetLink, updatePassword, toggleUI, auth state change, etc.)...

// Expose logout and app on window
window.logout = () => supa.auth.signOut();
window.supa   = supa;

// Initialize app
// ...existing app.init() call...
