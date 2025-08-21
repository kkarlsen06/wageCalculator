import '/kalkulator/css/style.css';
import '/src/css/legal-modal.css';

// Third-party globals
import 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

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


