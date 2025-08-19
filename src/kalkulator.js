// Initialize runtime config before any kalkulator scripts
import '/src/runtime-config.js';

// CSS is linked via kalkulator/index.html to avoid duplication

// Third-party CDN globals are left as-is in HTML (Supabase, jsPDF, Cropper, marked, DOMPurify)

// Provide uuidv4 globally (previously defined inline in HTML)
if (typeof window !== 'undefined' && !window.uuidv4) {
  window.uuidv4 = function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };
}

// Load feature flags (reads window.CONFIG.apiBase)
import '/kalkulator/js/featureFlags.js';

// App bootstrap (was loaded via <script type="module" src="js/app.js">)
import '/kalkulator/js/app.js';

// If app.js uses ESM default export or side effects, ensure DOMContentLoaded init remains intact.
// Expose inline handlers compatibility by attaching window.app if the module exported it.
// window.app is attached by /kalkulator/js/app.js when it initializes


