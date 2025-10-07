// Feature flags utility for client-side feature toggles
// Provides a hook-like interface for fetching and caching feature flags

import { API_BASE as RESOLVED_API_BASE } from '/src/lib/net/apiBase.js';

class FeatureFlags {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = new Map();
        this.cacheDuration = 5 * 60 * 1000; // 5 minutes
        this.fallbacks = {
            employees: true // Default fallback for employees feature
        };
    }

    /**
     * Get feature flags from server with caching and fallback
     * @returns {Promise<Object>} Feature flags object
     */
    async getFeatureFlags() {
        const cacheKey = 'feature_flags';
        const now = Date.now();

        // Check if we have valid cached data
        if (this.cache.has(cacheKey) && this.cacheExpiry.get(cacheKey) > now) {
            return this.cache.get(cacheKey);
        }

        try {
            const fallbackBase = (typeof window !== 'undefined' && window.CONFIG?.apiBase) || '';
            const API_BASE = fallbackBase || RESOLVED_API_BASE || '/api';

            // Use browser fetch only; node-fetch is not bundled in browser builds
            const response = await fetch(`${API_BASE}/config`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const config = await response.json();
            const features = config.features || {};

            // Merge with fallbacks to ensure all expected flags exist
            const mergedFeatures = { ...this.fallbacks, ...features };

            // Cache the result
            this.cache.set(cacheKey, mergedFeatures);
            this.cacheExpiry.set(cacheKey, now + this.cacheDuration);

            return mergedFeatures;
        } catch (error) {
            console.warn('Failed to fetch feature flags, using fallbacks:', error.message);
            
            // Return cached data if available, otherwise use fallbacks
            if (this.cache.has(cacheKey)) {
                return this.cache.get(cacheKey);
            }
            
            return { ...this.fallbacks };
        }
    }

    /**
     * Check if a specific feature is enabled
     * @param {string} featureName - Name of the feature to check
     * @returns {Promise<boolean>} Whether the feature is enabled
     */
    async isFeatureEnabled(featureName) {
        const flags = await this.getFeatureFlags();
        return flags[featureName] ?? this.fallbacks[featureName] ?? false;
    }

    /**
     * Clear the feature flags cache
     */
    clearCache() {
        this.cache.clear();
        this.cacheExpiry.clear();
    }

    /**
     * Set cache duration in milliseconds
     * @param {number} duration - Cache duration in milliseconds
     */
    setCacheDuration(duration) {
        this.cacheDuration = duration;
    }
}

// Create a singleton instance
const featureFlags = new FeatureFlags();

/**
 * Hook-like function to get feature flags
 * Usage: const flags = await useFeatureFlags();
 * @returns {Promise<Object>} Feature flags object
 */
async function useFeatureFlags() {
    return await featureFlags.getFeatureFlags();
}

/**
 * Hook-like function to check if a feature is enabled
 * Usage: const isEnabled = await useFeature('employees');
 * @param {string} featureName - Name of the feature to check
 * @returns {Promise<boolean>} Whether the feature is enabled
 */
async function useFeature(featureName) {
    return await featureFlags.isFeatureEnabled(featureName);
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FeatureFlags, useFeatureFlags, useFeature, featureFlags };
} else if (typeof window !== 'undefined') {
    window.FeatureFlags = FeatureFlags;
    window.useFeatureFlags = useFeatureFlags;
    window.useFeature = useFeature;
    window.featureFlags = featureFlags;
}
