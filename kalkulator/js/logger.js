/**
 * Logger Utility
 * Conditional logging system for development vs production
 */

class Logger {
    constructor() {
        // Determine environment
        this.isDevelopment = this.detectEnvironment();
        
        // Performance tracking
        this.startTime = performance.now();
        this.marks = new Map();
        
        // Log levels
        this.levels = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3
        };
        
        // Set default log level based on environment
        this.logLevel = this.isDevelopment ? this.levels.DEBUG : this.levels.WARN;
    }

    /**
     * Detect if we're in development or production
     * @returns {boolean}
     */
    detectEnvironment() {
        // Check for localhost or development indicators
        const hostname = window.location.hostname;
        const isDev = hostname === 'localhost' || 
                     hostname === '127.0.0.1' || 
                     hostname.includes('dev') ||
                     window.location.search.includes('debug=true');
        
        return isDev;
    }

    /**
     * Set log level
     * @param {string} level - Log level (ERROR, WARN, INFO, DEBUG)
     */
    setLevel(level) {
        if (this.levels[level] !== undefined) {
            this.logLevel = this.levels[level];
        }
    }

    /**
     * Check if logging is enabled for level
     * @param {number} level - Log level number
     * @returns {boolean}
     */
    shouldLog(level) {
        return level <= this.logLevel;
    }

    /**
     * Error logging (always enabled)
     * @param {string} message - Error message
     * @param {...any} args - Additional arguments
     */
    error(message, ...args) {
        if (this.shouldLog(this.levels.ERROR)) {
            console.error(`[ERROR] ${message}`, ...args);
        }
    }

    /**
     * Warning logging
     * @param {string} message - Warning message
     * @param {...any} args - Additional arguments
     */
    warn(message, ...args) {
        if (this.shouldLog(this.levels.WARN)) {
            console.warn(`[WARN] ${message}`, ...args);
        }
    }

    /**
     * Info logging
     * @param {string} message - Info message
     * @param {...any} args - Additional arguments
     */
    info(message, ...args) {
        if (this.shouldLog(this.levels.INFO)) {
            console.info(`[INFO] ${message}`, ...args);
        }
    }

    /**
     * Debug logging (development only)
     * @param {string} message - Debug message
     * @param {...any} args - Additional arguments
     */
    debug(message, ...args) {
        if (this.shouldLog(this.levels.DEBUG)) {
            console.log(`[DEBUG] ${message}`, ...args);
        }
    }

    /**
     * Performance mark
     * @param {string} name - Mark name
     */
    mark(name) {
        if (this.isDevelopment) {
            this.marks.set(name, performance.now());
        }
    }

    /**
     * Measure performance between marks
     * @param {string} name - Measurement name
     * @param {string} startMark - Start mark name
     * @param {string} endMark - End mark name (optional, defaults to current time)
     */
    measure(name, startMark, endMark) {
        if (!this.isDevelopment) return;

        const startTime = this.marks.get(startMark);
        const endTime = endMark ? this.marks.get(endMark) : performance.now();
        
        if (startTime !== undefined && endTime !== undefined) {
            const duration = endTime - startTime;
            this.debug(`Performance: ${name} took ${duration.toFixed(2)}ms`);
            return duration;
        }
        
        this.warn(`Performance: Missing mark for ${name}`);
        return null;
    }

    /**
     * Time a function execution
     * @param {string} name - Operation name
     * @param {Function} fn - Function to time
     * @returns {any} - Function result
     */
    time(name, fn) {
        if (!this.isDevelopment) {
            return fn();
        }

        const startTime = performance.now();
        const result = fn();
        const endTime = performance.now();
        
        this.debug(`Timer: ${name} took ${(endTime - startTime).toFixed(2)}ms`);
        return result;
    }

    /**
     * Log DOM performance
     * @param {string} operation - Operation name
     * @param {number} elementCount - Number of elements processed
     * @param {number} duration - Duration in ms
     */
    domPerf(operation, elementCount, duration) {
        if (this.isDevelopment) {
            this.debug(`DOM: ${operation} processed ${elementCount} elements in ${duration.toFixed(2)}ms`);
        }
    }

    /**
     * Log memory usage (development only)
     */
    memory() {
        if (this.isDevelopment && performance.memory) {
            const memory = performance.memory;
            this.debug(`Memory: Used ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB / ${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
        }
    }

    /**
     * Group console logs
     * @param {string} name - Group name
     * @param {Function} fn - Function to execute in group
     */
    group(name, fn) {
        if (this.isDevelopment) {
            console.group(name);
            fn();
            console.groupEnd();
        } else {
            fn();
        }
    }

    /**
     * Conditional logging based on condition
     * @param {boolean} condition - Condition to check
     * @param {string} message - Message to log
     * @param {...any} args - Additional arguments
     */
    if(condition, message, ...args) {
        if (condition && this.isDevelopment) {
            this.debug(message, ...args);
        }
    }

    /**
     * Enable/disable all logging
     * @param {boolean} enabled - Enable or disable logging
     */
    setEnabled(enabled) {
        this.logLevel = enabled ? this.levels.DEBUG : -1;
    }

    /**
     * Get current log level name
     * @returns {string}
     */
    getCurrentLevel() {
        const levelNames = Object.keys(this.levels);
        return levelNames.find(name => this.levels[name] === this.logLevel) || 'UNKNOWN';
    }
}

// Create global instance
window.logger = new Logger();

// Create aliases for common operations
window.log = {
    error: (...args) => window.logger.error(...args),
    warn: (...args) => window.logger.warn(...args),
    info: (...args) => window.logger.info(...args),
    debug: (...args) => window.logger.debug(...args),
    mark: (name) => window.logger.mark(name),
    measure: (...args) => window.logger.measure(...args),
    time: (...args) => window.logger.time(...args),
    memory: () => window.logger.memory(),
    group: (...args) => window.logger.group(...args),
    if: (...args) => window.logger.if(...args)
};

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Logger;
}