/**
 * Performance Monitor
 * Tracks key performance metrics and provides insights
 */

class PerformanceMonitor {
    constructor() {
        this.metrics = {
            domQueries: 0,
            domQueryTime: 0,
            funcCalls: new Map(),
            memoryUsage: [],
            renderTimes: [],
            loadTimes: []
        };
        
        this.observers = [];
        this.isEnabled = window.location.search.includes('perf=true') || 
                        window.location.hostname === 'localhost';
        
        if (this.isEnabled) {
            this.init();
        }
    }

    init() {
        // Monitor page load performance
        this.trackPageLoad();
        
        // Monitor DOM mutations
        this.trackDOMMutations();
        
        // Monitor memory usage periodically
        this.startMemoryMonitoring();
        
        // Track Core Web Vitals
        this.trackCoreWebVitals();
    }

    /**
     * Track page load performance
     */
    trackPageLoad() {
        window.addEventListener('load', () => {
            // Use Navigation Timing API
            const navigation = performance.getEntriesByType('navigation')[0];
            if (navigation) {
                const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
                const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
                const ttfb = navigation.responseStart - navigation.requestStart;
                
                this.metrics.loadTimes.push({
                    timestamp: Date.now(),
                    loadTime,
                    domContentLoaded,
                    ttfb
                });
                
                log.info('Page Load Performance', {
                    loadTime: `${loadTime.toFixed(2)}ms`,
                    domContentLoaded: `${domContentLoaded.toFixed(2)}ms`,
                    ttfb: `${ttfb.toFixed(2)}ms`
                });
            }
        });
    }

    /**
     * Track DOM mutations for performance impact
     */
    trackDOMMutations() {
        let mutationCount = 0;
        const observer = new MutationObserver((mutations) => {
            mutationCount += mutations.length;
            
            // Log heavy mutation bursts
            if (mutations.length > 10) {
                log.warn('Heavy DOM mutations detected', {
                    count: mutations.length,
                    total: mutationCount
                });
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true
        });

        this.observers.push(observer);
    }

    /**
     * Start memory monitoring
     */
    startMemoryMonitoring() {
        if (!performance.memory) return;

        const checkMemory = () => {
            const memory = performance.memory;
            const usage = {
                timestamp: Date.now(),
                used: memory.usedJSHeapSize / 1024 / 1024,
                total: memory.totalJSHeapSize / 1024 / 1024,
                limit: memory.jsHeapSizeLimit / 1024 / 1024
            };

            this.metrics.memoryUsage.push(usage);
            
            // Keep only last 100 measurements
            if (this.metrics.memoryUsage.length > 100) {
                this.metrics.memoryUsage.shift();
            }

            // Warn if memory usage is high
            if (usage.used > 50) {
                log.warn('High memory usage detected', {
                    used: `${usage.used.toFixed(2)}MB`,
                    total: `${usage.total.toFixed(2)}MB`
                });
            }
        };

        // Check every 30 seconds
        setInterval(checkMemory, 30000);
        checkMemory(); // Initial check
    }

    /**
     * Track Core Web Vitals
     */
    trackCoreWebVitals() {
        // Track LCP (Largest Contentful Paint)
        new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            log.info('LCP:', `${lastEntry.startTime.toFixed(2)}ms`);
        }).observe({ entryTypes: ['largest-contentful-paint'] });

        // Track FID (First Input Delay)
        new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach(entry => {
                log.info('FID:', `${(entry.processingStart - entry.startTime).toFixed(2)}ms`);
            });
        }).observe({ entryTypes: ['first-input'] });

        // Track CLS (Cumulative Layout Shift)
        let clsScore = 0;
        new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach(entry => {
                if (!entry.hadRecentInput) {
                    clsScore += entry.value;
                }
            });
            log.info('CLS:', clsScore.toFixed(4));
        }).observe({ entryTypes: ['layout-shift'] });
    }

    /**
     * Wrap DOM queries to track performance
     * @param {Function} originalFn - Original DOM query function
     * @param {string} methodName - Method name for tracking
     * @returns {Function} - Wrapped function
     */
    wrapDOMQuery(originalFn, methodName) {
        return function(...args) {
            const start = performance.now();
            const result = originalFn.apply(this, args);
            const end = performance.now();
            
            window.perfMonitor.metrics.domQueries++;
            window.perfMonitor.metrics.domQueryTime += (end - start);
            
            // Log slow queries
            if (end - start > 5) {
                log.warn(`Slow DOM query (${methodName}):`, {
                    time: `${(end - start).toFixed(2)}ms`,
                    selector: args[0]
                });
            }
            
            return result;
        };
    }

    /**
     * Track function call performance
     * @param {Function} fn - Function to track
     * @param {string} name - Function name
     * @returns {Function} - Wrapped function
     */
    trackFunction(fn, name) {
        return (...args) => {
            const start = performance.now();
            const result = fn.apply(this, args);
            const end = performance.now();
            
            const duration = end - start;
            
            // Track function calls
            if (!this.metrics.funcCalls.has(name)) {
                this.metrics.funcCalls.set(name, {
                    count: 0,
                    totalTime: 0,
                    maxTime: 0,
                    minTime: Infinity
                });
            }
            
            const funcStats = this.metrics.funcCalls.get(name);
            funcStats.count++;
            funcStats.totalTime += duration;
            funcStats.maxTime = Math.max(funcStats.maxTime, duration);
            funcStats.minTime = Math.min(funcStats.minTime, duration);
            
            // Log slow function calls
            if (duration > 10) {
                log.warn(`Slow function call (${name}):`, {
                    time: `${duration.toFixed(2)}ms`,
                    args: args.length
                });
            }
            
            return result;
        };
    }

    /**
     * Track render performance
     * @param {string} componentName - Component name
     * @param {Function} renderFn - Render function
     * @returns {any} - Render result
     */
    trackRender(componentName, renderFn) {
        const start = performance.now();
        const result = renderFn();
        const end = performance.now();
        
        const duration = end - start;
        this.metrics.renderTimes.push({
            component: componentName,
            duration,
            timestamp: Date.now()
        });
        
        // Keep only last 50 render times
        if (this.metrics.renderTimes.length > 50) {
            this.metrics.renderTimes.shift();
        }
        
        // Log slow renders
        if (duration > 16) { // 16ms = 60fps threshold
            log.warn(`Slow render (${componentName}):`, `${duration.toFixed(2)}ms`);
        }
        
        return result;
    }

    /**
     * Get performance summary
     * @returns {Object} - Performance summary
     */
    getSummary() {
        const summary = {
            domQueries: {
                count: this.metrics.domQueries,
                totalTime: this.metrics.domQueryTime,
                averageTime: this.metrics.domQueries > 0 ? 
                    this.metrics.domQueryTime / this.metrics.domQueries : 0
            },
            functions: {},
            memory: {
                current: this.metrics.memoryUsage.length > 0 ? 
                    this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1] : null,
                peak: this.metrics.memoryUsage.reduce((max, usage) => 
                    usage.used > max ? usage.used : max, 0)
            },
            renders: {
                count: this.metrics.renderTimes.length,
                averageTime: this.metrics.renderTimes.length > 0 ?
                    this.metrics.renderTimes.reduce((sum, render) => 
                        sum + render.duration, 0) / this.metrics.renderTimes.length : 0
            }
        };
        
        // Add function call summaries
        this.metrics.funcCalls.forEach((stats, name) => {
            summary.functions[name] = {
                count: stats.count,
                totalTime: stats.totalTime,
                averageTime: stats.totalTime / stats.count,
                maxTime: stats.maxTime,
                minTime: stats.minTime
            };
        });
        
        return summary;
    }

    /**
     * Log performance summary
     */
    logSummary() {
        const summary = this.getSummary();
        
        log.group('Performance Summary', () => {
            log.info('DOM Queries:', summary.domQueries);
            log.info('Memory Usage:', summary.memory);
            log.info('Render Performance:', summary.renders);
            
            if (Object.keys(summary.functions).length > 0) {
                log.info('Function Performance:', summary.functions);
            }
        });
    }

    /**
     * Reset all metrics
     */
    reset() {
        this.metrics = {
            domQueries: 0,
            domQueryTime: 0,
            funcCalls: new Map(),
            memoryUsage: [],
            renderTimes: [],
            loadTimes: []
        };
    }

    /**
     * Enable/disable monitoring
     * @param {boolean} enabled - Enable or disable
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        
        if (!enabled) {
            // Disconnect all observers
            this.observers.forEach(observer => observer.disconnect());
            this.observers = [];
        } else if (this.observers.length === 0) {
            this.init();
        }
    }
}

// Create global instance
window.perfMonitor = new PerformanceMonitor();

// Wrap common DOM methods for performance tracking
if (window.perfMonitor.isEnabled) {
    // Wrap querySelector methods
    const originalQuerySelector = Document.prototype.querySelector;
    const originalQuerySelectorAll = Document.prototype.querySelectorAll;
    const originalGetElementById = Document.prototype.getElementById;
    
    Document.prototype.querySelector = window.perfMonitor.wrapDOMQuery(
        originalQuerySelector, 'querySelector'
    );
    Document.prototype.querySelectorAll = window.perfMonitor.wrapDOMQuery(
        originalQuerySelectorAll, 'querySelectorAll'
    );
    Document.prototype.getElementById = window.perfMonitor.wrapDOMQuery(
        originalGetElementById, 'getElementById'
    );
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceMonitor;
}