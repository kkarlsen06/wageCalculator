// Legacy static fallback for non-Vite environments
// Note: Vite builds will override via `src/runtime-config.js`
const CONFIG = {
    supabase: {
        url: "https://your-project-id.supabase.co",
        anonKey: "sb_publishable_z9EoG7GZZMS3RL4hmilh5A_xI0va5Nb"
    },
    apiBase: '/api',
    debug: false,
    version: "1.0.0"
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else {
    window.CONFIG = { ...(window.CONFIG || {}), ...CONFIG };
}