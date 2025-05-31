import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// 1. Init
const supa = createClient(
  "https://iuwjdacxbirhmsglcbxp.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1d2pkYWN4YmlyaG1zZ2xjYnhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0NTIxNDAsImV4cCI6MjA2NDAyODE0MH0.iSjbvGVpM3zOWCGpg5HrQp37PjJCmiHIwVQLgc2LgcE"
);

// Make supa available globally
window.supa = supa;

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
      redirectTo: "https://kkarlsen.art/kalkulator/index.html#recover"
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
  console.log('Auth state change:', event, session);
  
  // Don't redirect if we're in password recovery mode
  const hashFragment = window.location.hash;
  const isRecoveryMode = hashFragment.includes('recover') || hashFragment.includes('access_token');
  
  if (session && !isRecoveryMode) {
    window.location.href = "app.html";
  } else if (event === 'PASSWORD_RECOVERY') {
    // Handle password recovery
    showPasswordResetForm();
  }
});

(async () => {
  // Don't auto-redirect if we're handling password recovery
  const hashFragment = window.location.hash;
  const isRecoveryMode = hashFragment.includes('recover') || hashFragment.includes('access_token');
  
  if (!isRecoveryMode) {
    const { data: { session } } = await supa.auth.getSession();
    if (session) window.location.href = "app.html";
  }
})();

// Add enter key functionality to login form
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is coming from password reset email
    handlePasswordRecovery();
    
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

// Handle password recovery from email link
async function handlePasswordRecovery() {
    const hashFragment = window.location.hash;
    
    // Check if this is a recovery link
    if (hashFragment.includes('recover') || hashFragment.includes('access_token')) {
        try {
            // Get the session from the URL fragments
            const { data, error } = await supa.auth.getSession();
            
            if (error) {
                console.error('Recovery error:', error);
                authMsg.textContent = 'Ugyldig eller utløpt reset-lenke';
                return;
            }
            
            if (data.session) {
                // User is authenticated, show password reset form
                showPasswordResetForm();
            } else {
                authMsg.textContent = 'Ugyldig eller utløpt reset-lenke';
            }
        } catch (err) {
            console.error('Recovery handling error:', err);
            authMsg.textContent = 'Noe gikk galt ved passord-reset';
        }
    }
}

// Show password reset form
function showPasswordResetForm() {
    // Hide normal login form and forgot password form
    authBox.style.display = 'none';
    forgotCard.style.display = 'none';
    
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
    
    authBox.style.display = 'flex';
    forgotCard.style.display = 'none';
    
    // Clear any messages
    authMsg.textContent = '';
}

window.addEventListener("DOMContentLoaded", async () => {
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const type = hashParams.get("type");
  const accessToken = hashParams.get("access_token");

  if (type === "recovery" && accessToken) {
    const { error } = await supa.auth.setSession({
      access_token: accessToken,
      refresh_token: hashParams.get("refresh_token") ?? ""
    });

    if (error) {
      alert("Kunne ikke logge inn med reset-lenken.");
      return;
    }

    document.getElementById("recover-form")?.style.setProperty("display", "block");
  }
});

document.getElementById("recover-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const newPassword = document.getElementById("new-password").value;

  const { error } = await supa.auth.updateUser({
    password: newPassword
  });

  if (error) {
    alert("Kunne ikke oppdatere passord: " + error.message);
  } else {
    alert("Passordet er oppdatert! Du er nå logget inn.");
    window.location.href = "/kalkulator/index.html"; // redirect etterpå
  }
});