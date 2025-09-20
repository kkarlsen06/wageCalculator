/**
 * Theme Management System
 * Provides user-selectable light/dark theme functionality
 */

const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system'
};

const STORAGE_KEY = 'user-theme-preference';

class ThemeManager {
  constructor() {
    this.currentTheme = this.getStoredTheme() || THEMES.SYSTEM;
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.databaseThemeLoaded = false;
    
    // Initialize theme on construction
    this.init();
  }

  init() {
    // Apply initial theme immediately - before DOM ready
    this.applyTheme(this.currentTheme);
    
    // Also apply on DOM ready to ensure it's applied
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.applyTheme(this.currentTheme);
      });
    }
    
    // Listen for system theme changes
    this.mediaQuery.addEventListener('change', (e) => {
      if (this.currentTheme === THEMES.SYSTEM) {
        this.applySystemTheme();
      }
    });

    // Listen for storage changes in other tabs
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) {
        const newTheme = e.newValue || THEMES.SYSTEM;
        this.setTheme(newTheme, false); // Don't save to storage since it came from storage
      }
    });
  }

  getStoredTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to read theme preference from localStorage:', error);
      return null;
    }
  }

  saveTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
      console.warn('Failed to save theme preference to localStorage:', error);
    }
  }

  async loadThemeFromDatabase() {
    if (this.databaseThemeLoaded) return;
    
    try {
      // Check if Supabase is available and user is authenticated
      if (typeof window !== 'undefined' && window.supa) {
        const { data: { user } } = await window.supa.auth.getUser();
        if (!user?.id) return;

        // Try to fetch theme from backend API first
        let databaseTheme = null;
        try {
          const { data: { session } } = await window.supa.auth.getSession();
          const token = session?.access_token;
          if (token) {
            const resp = await fetch(`${window.CONFIG.apiBase}/settings`, { 
              headers: { Authorization: `Bearer ${token}` } 
            });
            if (resp.ok) {
              const json = await resp.json();
              databaseTheme = json?.theme;
            }
          }
        } catch (_) { /* ignore API errors */ }

        // Fallback: read directly from user_settings via Supabase
        if (!databaseTheme) {
          const { data: row } = await window.supa
            .from('user_settings')
            .select('theme')
            .eq('user_id', user.id)
            .maybeSingle();
          databaseTheme = row?.theme;
        }

        // Apply database theme if found (database takes precedence over local storage)
        if (databaseTheme && Object.values(THEMES).includes(databaseTheme)) {
          this.currentTheme = databaseTheme;
          this.applyTheme(databaseTheme);
          // Update local storage to match database
          this.saveTheme(databaseTheme);
        }
      }
    } catch (error) {
      console.warn('Failed to load theme from database:', error);
    } finally {
      this.databaseThemeLoaded = true;
    }
  }

  async saveThemeToDatabase(theme) {
    try {
      // Check if Supabase is available and user is authenticated
      if (typeof window !== 'undefined' && window.supa) {
        const { data: { user } } = await window.supa.auth.getUser();
        if (!user?.id) return;

        // Try to save via backend API first
        try {
          const { data: { session } } = await window.supa.auth.getSession();
          const token = session?.access_token;
          if (token) {
            const resp = await fetch(`${window.CONFIG.apiBase}/settings`, { 
              method: 'PATCH',
              headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ theme })
            });
            if (resp.ok) {
              return;
            }
          }
        } catch (_) { /* ignore API errors, try direct DB */ }

        // Fallback: save directly to user_settings via Supabase
        const { error } = await window.supa
          .from('user_settings')
          .upsert({ 
            user_id: user.id, 
            theme: theme 
          }, {
            onConflict: 'user_id'
          });
          
        if (error) {
          console.warn('Failed to save theme to database:', error);
        }
      }
    } catch (error) {
      console.warn('Failed to save theme to database:', error);
    }
  }

  getSystemTheme() {
    return this.mediaQuery.matches ? THEMES.DARK : THEMES.LIGHT;
  }

  resolveTheme(theme) {
    if (theme === THEMES.SYSTEM) {
      return this.getSystemTheme();
    }
    return theme;
  }

  applySystemTheme() {
    const systemTheme = this.getSystemTheme();
    this.applyThemeToDOM(systemTheme);
    this.notifyThemeChange(this.currentTheme, systemTheme);
  }

  applyTheme(theme) {
    const resolvedTheme = this.resolveTheme(theme);
    this.applyThemeToDOM(resolvedTheme);
    this.notifyThemeChange(theme, resolvedTheme);
  }

  applyThemeToDOM(resolvedTheme) {
    const html = document.documentElement;
    
    // Remove existing theme classes
    html.classList.remove('theme-light', 'theme-dark');
    
    // Add the appropriate theme class
    html.classList.add(`theme-${resolvedTheme}`);
    
    // Update meta theme-color for browser chrome
    this.updateMetaThemeColor(resolvedTheme);
  }

  updateMetaThemeColor(theme) {
    const color = theme === THEMES.LIGHT ? '#ffffff' : '#121212';
    
    // Update all theme-color meta tags
    const metaTags = document.querySelectorAll('meta[name="theme-color"]');
    metaTags.forEach(tag => {
      tag.setAttribute('content', color);
    });
  }

  setTheme(theme, save = true) {
    if (!Object.values(THEMES).includes(theme)) {
      console.warn(`Invalid theme: ${theme}. Using system theme.`);
      theme = THEMES.SYSTEM;
    }

    this.currentTheme = theme;
    
    if (save) {
      this.saveTheme(theme);
      // Also save to database if user is authenticated
      this.saveThemeToDatabase(theme);
    }
    
    this.applyTheme(theme);
  }

  getCurrentTheme() {
    return this.currentTheme;
  }

  getCurrentResolvedTheme() {
    return this.resolveTheme(this.currentTheme);
  }

  toggleTheme() {
    const resolvedTheme = this.getCurrentResolvedTheme();
    const newTheme = resolvedTheme === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
    this.setTheme(newTheme);
  }

  // Event system for theme changes
  notifyThemeChange(userTheme, resolvedTheme) {
    const event = new CustomEvent('themeChange', {
      detail: {
        userTheme,
        resolvedTheme,
        isSystemTheme: userTheme === THEMES.SYSTEM
      }
    });
    
    document.dispatchEvent(event);
  }

  // Utility method to check if current theme is dark
  isDarkTheme() {
    return this.getCurrentResolvedTheme() === THEMES.DARK;
  }

  // Utility method to check if current theme is light
  isLightTheme() {
    return this.getCurrentResolvedTheme() === THEMES.LIGHT;
  }

  // Utility method to check if system theme is being used
  isSystemTheme() {
    return this.currentTheme === THEMES.SYSTEM;
  }
}

// Export theme constants and manager
export { THEMES, ThemeManager };

// Create and export a singleton instance
export const themeManager = new ThemeManager();