import '/kalkulator/css/style.css';
import '/src/css/legal-modal.css';

// Third-party globals
// Removed duplicate Supabase CDN import; using ESM client from /src/supabase-client.js

// Utilities (attach to window)
import './js/loading-helpers.js';
import './js/error-handling.js';

// Config and auth logic
// Ensure window.CONFIG is initialized from Vite envs before auth logic runs
import '/src/runtime-config.js';
import '/kalkulator/js/auth.js';

// Legal handler for terms acceptance
import LegalHandler from '/kalkulator/js/legal-handler.js';

// Initialize legal handler
document.addEventListener('DOMContentLoaded', () => {
    new LegalHandler();
});

// Simple toggle to show reset form using .hidden class
document.addEventListener('DOMContentLoaded', () => {
  const $ = (s, r = document) => r.querySelector(s);

  const showResetBtn = $('#show-reset-btn');
  const loginCard     = $('#login-card');
  const signupCard    = $('#signup-card');
  const resetForm     = $('#reset-form');
  const resetStep2    = $('#reset-step-2');

  showResetBtn?.addEventListener('click', () => {
    loginCard?.classList.add('hidden');
    signupCard?.classList.add('hidden');
    resetForm?.classList.remove('hidden');
    resetStep2?.classList.add('hidden'); // always start at step 1
  });
});

