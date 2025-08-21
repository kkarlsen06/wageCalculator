import '/kalkulator/css/style.css';

// Third-party globals
import 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

// Utilities (attach to window)
import './js/loading-helpers.js';
import './js/error-handling.js';

// Privacy modal functionality
import { initPrivacyModal } from './js/privacy-modal.js';

// Config and auth logic
// Ensure window.CONFIG is initialized from Vite envs before auth logic runs
import '/src/runtime-config.js';
import '/kalkulator/js/auth.js';

// Initialize privacy modal for login page
document.addEventListener('DOMContentLoaded', () => {
    initPrivacyModal();
});


