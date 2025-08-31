import '/css/style.css';
import '/src/css/legal-modal.css';

// Third-party globals
// Removed duplicate Supabase CDN import; using ESM client from /src/supabase-client.js

// Utilities (attach to window)
import '../../marketing/src/js/loading-helpers.js';
import '../../marketing/src/js/error-handling.js';

// Config and auth logic
// Ensure window.CONFIG is initialized from Vite envs before auth logic runs
import '/src/runtime-config.js';
import '/js/auth.js';

// Legal handler for terms acceptance
import LegalHandler from '/js/legal-handler.js';

// Initialize legal handler
document.addEventListener('DOMContentLoaded', () => {
    new LegalHandler();
});

