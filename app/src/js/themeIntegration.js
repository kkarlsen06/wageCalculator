/**
 * Theme Integration with Main Application
 * Connects the theme manager with the UI components
 */

import { themeManager, THEMES } from './themeManager.js';

// Make themeManager available globally for the observer
window.themeManager = themeManager;

class ThemeIntegration {
  constructor() {
    this.initialized = false;
    this.themeInputs = null;
    this.themeOptionElements = [];
  }

  init() {
    if (this.initialized) return;
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.setupThemeUI();
      });
    } else {
      this.setupThemeUI();
    }
    
    this.initialized = true;
  }

  setupThemeUI() {
    // Get theme selector inputs
    this.themeInputs = {
      light: document.getElementById('themeLight'),
      dark: document.getElementById('themeDark'),
      system: document.getElementById('themeSystem')
    };

    this.themeOptionElements = Array.from(document.querySelectorAll('.theme-option[data-theme-option]'));

    // Set initial state based on current theme
    this.updateThemeUI(themeManager.getCurrentTheme());

    // Add event listeners
    Object.entries(this.themeInputs).forEach(([theme, input]) => {
      if (input) {
        input.addEventListener('change', (e) => {
          if (e.target.checked) {
            themeManager.setTheme(theme);
            this.updateThemeOptionStates(theme);
          }
        });
      }
    });

    // Listen for theme changes from other sources
    document.addEventListener('themeChange', (event) => {
      this.updateThemeUI(event.detail.userTheme);
      this.handleThemeChange(event.detail);
    });

    // Listen for skeleton loading completion and reapply theme
    this.observeSkeletonLoading();

    // Handle system theme changes to update UI
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (themeManager.isSystemTheme()) {
        // Update the system preview to reflect current system theme
        this.updateSystemPreview();
      }
    });

    console.log('Theme integration initialized');
  }

  updateThemeUI(currentTheme) {
    if (!this.themeInputs) return;

    // Update radio button selection
    Object.entries(this.themeInputs).forEach(([theme, input]) => {
      if (input) {
        input.checked = theme === currentTheme;
      }
    });

    this.updateThemeOptionStates(currentTheme);

    // Update system preview to reflect current system theme
    this.updateSystemPreview();
  }

  updateThemeOptionStates(currentTheme) {
    if (!this.themeOptionElements || this.themeOptionElements.length === 0) return;

    this.themeOptionElements.forEach((option) => {
      const optionTheme = option.getAttribute('data-theme-option');
      const isSelected = optionTheme === currentTheme;
      option.classList.toggle('is-selected', isSelected);
    });
  }

  updateSystemPreview() {
    const systemPreview = document.querySelector('.theme-preview-system');
    if (!systemPreview) return;

    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    systemPreview.setAttribute('data-system-theme', systemTheme);
  }

  observeSkeletonLoading() {
    // Watch for skeleton loading completion and reapply theme
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && 
            mutation.attributeName === 'class' && 
            mutation.target === document.body) {
          
          const hadSkeleton = mutation.oldValue && mutation.oldValue.includes('skeleton-active');
          const hasSkeleton = document.body.classList.contains('skeleton-active');
          
          // If skeleton loading just finished (had it, now doesn't)
          if (hadSkeleton && !hasSkeleton) {
            console.log('Skeleton loading completed, reapplying theme...');
            // Reapply theme after skeleton loading completes
            setTimeout(() => {
              themeManager.applyTheme(themeManager.getCurrentTheme());
            }, 100); // Small delay to ensure DOM is stable
          }
        }
      });
    });

    // Start observing
    observer.observe(document.body, { 
      attributes: true, 
      attributeOldValue: true,
      attributeFilter: ['class']
    });

    // Also listen for DOMContentLoaded and other events where skeleton state might change
    document.addEventListener('DOMContentLoaded', () => {
      // Ensure theme is applied even if skeleton loading is already done
      setTimeout(() => {
        themeManager.applyTheme(themeManager.getCurrentTheme());
      }, 200);
    });
  }

  handleThemeChange(themeInfo) {
    // Add theme switching class to prevent transitions during theme change
    document.documentElement.classList.add('theme-switching');
    
    // Remove the class after a brief delay to allow theme change to complete
    setTimeout(() => {
      document.documentElement.classList.remove('theme-switching');
    }, 100);

    // Update any theme-dependent UI elements
    this.updateThemeDependentElements(themeInfo.resolvedTheme);

    // Notify other parts of the application about theme change
    this.notifyApplicationThemeChange(themeInfo);

    console.log(`Theme changed to: ${themeInfo.userTheme} (resolved: ${themeInfo.resolvedTheme})`);
  }

  updateThemeDependentElements(resolvedTheme) {
    // Update any elements that need special handling for theme changes
    // For example, update chart colors, icons, etc.
    
    // Update favicon if we have theme-specific favicons
    this.updateFavicon(resolvedTheme);
    
    // Update any cached image colors or chart themes
    this.updateChartThemes(resolvedTheme);
  }

  updateFavicon(theme) {
    // If you have theme-specific favicons, update them here
    // This is optional and only needed if you want different favicons for themes
    const favicon = document.querySelector('link[rel="icon"]');
    if (favicon) {
      // Example: favicon.href = `/assets/favicon-${theme}.ico`;
    }
  }

  updateChartThemes(theme) {
    // If you have charts or data visualizations that need theme updates
    // trigger their re-rendering or color updates here
    
    // Example: trigger chart re-render for theme-aware charts
    const chartUpdateEvent = new CustomEvent('chartThemeUpdate', {
      detail: { theme }
    });
    document.dispatchEvent(chartUpdateEvent);
  }

  notifyApplicationThemeChange(themeInfo) {
    // Notify the main application about theme changes
    if (typeof window !== 'undefined' && window.app && window.app.onThemeChange) {
      window.app.onThemeChange(themeInfo);
    }

    // Store theme preference for analytics or debugging
    if (typeof window !== 'undefined' && window.app && window.app.logEvent) {
      window.app.logEvent('theme_change', {
        theme: themeInfo.userTheme,
        resolved_theme: themeInfo.resolvedTheme,
        is_system: themeInfo.isSystemTheme
      });
    }
  }

  // Public API methods for manual theme control
  setTheme(theme) {
    themeManager.setTheme(theme);
  }

  getCurrentTheme() {
    return themeManager.getCurrentTheme();
  }

  getCurrentResolvedTheme() {
    return themeManager.getCurrentResolvedTheme();
  }

  toggleTheme() {
    themeManager.toggleTheme();
  }

  isDarkTheme() {
    return themeManager.isDarkTheme();
  }

  isLightTheme() {
    return themeManager.isLightTheme();
  }

  isSystemTheme() {
    return themeManager.isSystemTheme();
  }
}

// Create and export singleton instance
export const themeIntegration = new ThemeIntegration();

// Initialize automatically
themeIntegration.init();

// Export for global access
if (typeof window !== 'undefined') {
  window.themeIntegration = themeIntegration;
}