// Dynamic ES module imports
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2';

const supabase = createClient(
  'https://iuwjdacxbirhmsglcbxp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1d2pkYWN4YmlyaG1zZ2xjYnhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0NTIxNDAsImV4cCI6MjA2NDAyODE0MH0.iSjbvGVpM3zOWCGpg5HrQp37PjJCmiHIwVQLgc2LgcE'
);

// Authentication UI elements
const authBox = document.querySelector('#auth-box');
const forgotCard = document.querySelector('#forgot-card');
const app = document.querySelector('#app');
const authMsg = document.querySelector('#auth-msg');
const forgotMsg = document.querySelector('#forgot-msg');

// Login/Register buttons
const loginBtn = document.querySelector('#login-btn');
const signupBtn = document.querySelector('#signup-btn');
const forgotBtn = document.querySelector('#forgot-btn');
const sendResetBtn = document.querySelector('#send-reset-btn');
const backLoginBtn = document.querySelector('#back-login-btn');

// Input fields
const emailInput = document.querySelector('#email');
const passwordInput = document.querySelector('#password');
const forgotEmailInput = document.querySelector('#forgot-email');

// Authentication functions
async function login() {
  const email = emailInput.value;
  const password = passwordInput.value;
  
  if (!email || !password) {
    showAuthMessage('Vennligst fyll ut alle felt');
    return;
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      showAuthMessage('Innlogging feilet: ' + error.message);
    } else {
      showAuthMessage('Innlogget!', false);
      showApp();
    }
  } catch (err) {
    showAuthMessage('En feil oppstod under innlogging');
    console.error('Login error:', err);
  }
}

async function signup() {
  const email = emailInput.value;
  const password = passwordInput.value;
  
  if (!email || !password) {
    showAuthMessage('Vennligst fyll ut alle felt');
    return;
  }

  if (password.length < 6) {
    showAuthMessage('Passordet må være minst 6 tegn');
    return;
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) {
      showAuthMessage('Registrering feilet: ' + error.message);
    } else {
      showAuthMessage('Registrering vellykket! Sjekk e-posten din for bekreftelse.', false);
    }
  } catch (err) {
    showAuthMessage('En feil oppstod under registrering');
    console.error('Signup error:', err);
  }
}

async function sendPasswordReset() {
  const email = forgotEmailInput.value;
  
  if (!email) {
    showForgotMessage('Vennligst skriv inn e-post adressen din');
    return;
  }

  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      showForgotMessage('Kunne ikke sende tilbakestillings-e-post: ' + error.message);
    } else {
      showForgotMessage('Tilbakestillings-e-post sendt! Sjekk innboksen din.', false);
    }
  } catch (err) {
    showForgotMessage('En feil oppstod');
    console.error('Password reset error:', err);
  }
}

function showAuthMessage(message, isError = true) {
  authMsg.textContent = message;
  authMsg.style.color = isError ? 'var(--danger)' : 'var(--success)';
}

function showForgotMessage(message, isError = true) {
  forgotMsg.textContent = message;
  forgotMsg.style.color = isError ? 'var(--danger)' : 'var(--success)';
}

function showApp() {
  authBox.style.display = 'none';
  forgotCard.style.display = 'none';
  app.style.display = 'block';
}

function showAuth() {
  authBox.style.display = 'block';
  forgotCard.style.display = 'none';
  app.style.display = 'none';
  authMsg.textContent = '';
}

function showForgotPassword() {
  authBox.style.display = 'none';
  forgotCard.style.display = 'block';
  forgotMsg.textContent = '';
}

// Logout function
window.logout = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error);
    }
    showAuth();
  } catch (err) {
    console.error('Logout error:', err);
  }
};

// Event listeners
loginBtn.addEventListener('click', login);
signupBtn.addEventListener('click', signup);
forgotBtn.addEventListener('click', showForgotPassword);
sendResetBtn.addEventListener('click', sendPasswordReset);
backLoginBtn.addEventListener('click', showAuth);

// Enter key support
emailInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') login();
});
passwordInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') login();
});
forgotEmailInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendPasswordReset();
});

// Check initial auth state
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) {
    showApp();
  } else {
    showAuth();
  }
});

// Listen for auth changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    showApp();
  } else if (event === 'SIGNED_OUT') {
    showAuth();
  }
});

// Expose for global access
window.supabase = supabase;

// Simple app object for the UI (placeholder for actual app functionality)
window.app = {
  openSettings: () => {
    console.log('Settings opened');
    // Placeholder for settings functionality
  },
  toggleMonthDropdown: () => {
    console.log('Month dropdown toggled');
    // Placeholder for month dropdown functionality
  },
  toggleAddShift: () => {
    console.log('Add shift toggled');
    // Placeholder for add shift functionality
  },
  addShift: () => {
    console.log('Add shift');
    // Placeholder for add shift functionality
  },
  showBreakdown: (type) => {
    console.log('Show breakdown:', type);
    // Placeholder for breakdown functionality
  },
  closeSettings: () => {
    console.log('Settings closed');
    // Placeholder for close settings functionality
  },
  closeBreakdown: () => {
    console.log('Breakdown closed');
    // Placeholder for close breakdown functionality
  },
  switchSettingsTab: (tab) => {
    console.log('Switch settings tab:', tab);
    // Placeholder for tab switching functionality
  },
  togglePreset: () => {
    console.log('Toggle preset');
    // Placeholder for preset toggle functionality
  },
  addBonusSlot: (type) => {
    console.log('Add bonus slot:', type);
    // Placeholder for bonus slot functionality
  },
  clearAllData: () => {
    console.log('Clear all data');
    // Placeholder for clear data functionality
  }
};
