import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// 1. Init
const supa = createClient(
  "https://iuwjdacxbirhmsglcbxp.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1d2pkYWN4YmlyaG1zZ2xjYnhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0NTIxNDAsImV4cCI6MjA2NDAyODE0MH0.iSjbvGVpM3zOWCGpg5HrQp37PjJCmiHIwVQLgc2LgcE"
);

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

// Auth actions
loginBtn.onclick  = () => signIn(emailInp.value, passInp.value);
signupBtn.onclick = () => signUp(emailInp.value, passInp.value);

async function signIn(email, password) {
  try {
    const { error } = await supa.auth.signInWithPassword({ email, password });
    authMsg.textContent = error ? error.message : "";
    if (!error) window.location.href = "app.html";
  } catch (err) {
    console.error("Supabase error:", err);
    authMsg.textContent = "Kunne ikke koble til autentiseringstjeneste";
  }
}

async function signUp(email, password) {
  try {
    const { error, data } = await supa.auth.signUp({ email, password });
    if (error) return authMsg.textContent = error.message;
    const alias = email.split("@")[0];
    await supa.from("profiles").insert({ id: data.user.id, username: alias });
    authMsg.textContent = "Registrering OK – sjekk e-post for bekreftelse!";
  } catch (err) {
    console.error("Supabase error:", err);
    authMsg.textContent = "Kunne ikke koble til autentiseringstjeneste";
  }
}

// Forgot password
forgotBtn.onclick = () => toggleForgot(true);
backLoginBtn.onclick = () => toggleForgot(false);
sendResetBtn.onclick = () => sendResetLink(forgotEmailInp.value);

function toggleForgot(show) {
  forgotCard.style.display = show ? "flex" : "none";
  authBox.style.display    = show ? "none" : "flex";
}

async function sendResetLink(email) {
  try {
    const { error } = await supa.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/#recover`
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

// Redirect if already logged in
supa.auth.onAuthStateChange(async (event, session) => {
  if (session) window.location.href = "app.html";
});

(async () => {
  const { data: { session } } = await supa.auth.getSession();
  if (session) window.location.href = "app.html";
})();

// Add enter key functionality to login form
document.addEventListener('DOMContentLoaded', function() {
    const passwordField = document.getElementById('password');
    const emailField = document.getElementById('email');
    const loginButton = document.getElementById('login-btn');
    
    // Add enter key functionality to password field
    if (passwordField && loginButton) {
        passwordField.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                loginButton.click();
            }
        });
    }
    
    // Also add to email field for convenience
    if (emailField && loginButton) {
        emailField.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                loginButton.click();
            }
        });
    }
    
    // Add enter key functionality to forgot password field
    const forgotEmailField = document.getElementById('forgot-email');
    const sendResetButton = document.getElementById('send-reset-btn');
    
    if (forgotEmailField && sendResetButton) {
        forgotEmailField.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                sendResetButton.click();
            }
        });
    }
});
