/**
 * DOM Cache Utility
 * Reduces repeated DOM queries by caching frequently accessed elements
 */

class DOMCache {
    constructor() {
        this.cache = new Map();
        this.observers = new Map();
        this.initializeCommonElements();
    }

    /**
     * Get element from cache or query DOM if not cached
     * @param {string} selector - CSS selector or element ID
     * @param {boolean} isId - Whether selector is an ID (for optimization)
     * @returns {Element|null}
     */
    get(selector, isId = false) {
        // Check cache first
        if (this.cache.has(selector)) {
            const element = this.cache.get(selector);
            // Verify element is still in DOM
            if (element && element.isConnected) {
                return element;
            }
            // Remove stale reference
            this.cache.delete(selector);
        }

        // Query DOM
        const element = isId ? document.getElementById(selector) : document.querySelector(selector);
        
        // Cache if found
        if (element) {
            this.cache.set(selector, element);
        }
        
        return element;
    }

    /**
     * Get element by ID (optimized method)
     * @param {string} id - Element ID
     * @returns {Element|null}
     */
    getId(id) {
        return this.get(id, true);
    }

    /**
     * Get all elements matching selector
     * @param {string} selector - CSS selector
     * @returns {NodeList}
     */
    getAll(selector) {
        // Don't cache NodeLists as they can change
        return document.querySelectorAll(selector);
    }

    /**
     * Pre-cache commonly used elements
     */
    initializeCommonElements() {
        // Cache frequently accessed elements
        const commonElements = [
            'app',
            'totalAmount',
            'totalHours',
            'shiftCount',
            'baseAmount',
            'bonusAmount',
            'shiftList',
            'currentMonth',
            'monthDropdown',
            'settingsModal',
            'breakdownModal',
            'editShiftModal',
            'addShiftModal',
            'pauseDeductionToggle',
            'fullMinuteRangeToggle',
            'directTimeInputToggle',
            'monthlyGoalInput',
            'startHour',
            'startMinute',
            'endHour',
            'endMinute',
            'dateGrid',
            'shiftForm',
            'editShiftForm'
        ];

        commonElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                this.cache.set(id, element);
            }
        });

        // Cache common class selectors
        const commonSelectors = [
            '.progress-fill',
            '.progress-label',
            '.snap-container',
            '.floating-action-bar',
            '.shift-section',
            '.app-container',
            '.header',
            '.month-selector'
        ];

        commonSelectors.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                this.cache.set(selector, element);
            }
        });
    }

    /**
     * Clear cache (useful for testing or when DOM structure changes significantly)
     */
    clear() {
        this.cache.clear();
        this.observers.clear();
    }

    /**
     * Remove specific element from cache
     * @param {string} selector - Selector to remove
     */
    remove(selector) {
        this.cache.delete(selector);
    }

    /**
     * Get cache size (for debugging)
     * @returns {number}
     */
    size() {
        return this.cache.size;
    }

    /**
     * Watch for DOM changes and invalidate cache accordingly
     * @param {string} selector - Selector to watch
     * @param {Function} callback - Callback when element changes
     */
    watch(selector, callback) {
        const element = this.get(selector);
        if (!element) return;

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' || mutation.type === 'attributes') {
                    // Invalidate cache for this selector
                    this.cache.delete(selector);
                    if (callback) callback(mutation);
                }
            });
        });

        observer.observe(element, {
            childList: true,
            attributes: true,
            subtree: true
        });

        this.observers.set(selector, observer);
    }

    /**
     * Stop watching an element
     * @param {string} selector - Selector to stop watching
     */
    unwatch(selector) {
        const observer = this.observers.get(selector);
        if (observer) {
            observer.disconnect();
            this.observers.delete(selector);
        }
    }
}

// Create global instance
window.domCache = new DOMCache();

// Helper functions for easier usage
window.$ = (selector) => window.domCache.get(selector);
window.$id = (id) => window.domCache.getId(id);
window.$all = (selector) => window.domCache.getAll(selector);

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DOMCache;
}