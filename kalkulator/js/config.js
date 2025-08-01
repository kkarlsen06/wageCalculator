// Configuration file for API keys and settings
// Note: In production, these should be loaded from environment variables
const CONFIG = {
    supabase: {
        url: "https://iuwjdacxbirhmsglcbxp.supabase.co",
        anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1d2pkYWN4YmlyaG1zZ2xjYnhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0NTIxNDAsImV4cCI6MjA2NDAyODE0MH0.iSjbvGVpM3zOWCGpg5HrQp37PjJCmiHIwVQLgc2LgcE"
    },
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