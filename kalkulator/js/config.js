// Configuration file for API keys and settings
// Note: In production, these should be loaded from environment variables
const CONFIG = {
    supabase: {
        url: "https://iuwjdacxbirhmsglcbxp.supabase.co",
        anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1d2pkYWN4YmlyaG1zZ2xjYnhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0NTIxNDAsImV4cCI6MjA2NDAyODE0MH0.iSjbvGVpM3zOWCGpg5HrQp37PjJCmiHIwVQLgc2LgcE"
    },
    // API configuration - smart dev/prod detection with overrides
    apiBase: (() => {
        try {
            if (typeof window !== 'undefined') {
                // Allow explicit override via query param or localStorage
                const u = new URL(window.location.href);
                const qp = u.searchParams.get('apiBase');
                const ls = window.localStorage ? localStorage.getItem('apiBase') : null;
                // Only allow known-safe origins
                const allowlist = new Set([
                    'https://wagecalculator-gbpd.onrender.com',
                    'http://localhost:5173'
                ]);
                const normalize = (val) => {
                    try {
                        const url = new URL(val);
                        return `${url.protocol}//${url.host}`;
                    } catch {
                        return '';
                    }
                };
                if (qp) {
                    const nqp = normalize(qp);
                    if (allowlist.has(nqp)) return nqp;
                }
                if (ls) {
                    const nls = normalize(ls);
                    if (allowlist.has(nls)) return nls;
                }

                // If running from file:// or on local hostnames, use local Express server
                const isFile = window.location.protocol === 'file:';
                const host = window.location.hostname;
                if (isFile || ['localhost', '127.0.0.1', '0.0.0.0'].includes(host)) {
                    return 'http://localhost:5173';
                }
            }
        } catch (e) {
            // fall through to prod
        }
        // Production default
        return 'https://wagecalculator-gbpd.onrender.com';
    })(),
    // Add other configuration options here
    debug: false,
    version: "1.0.0"
};

// Export the configuration for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else {
    window.CONFIG = CONFIG;
}