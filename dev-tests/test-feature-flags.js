// Unit tests for feature flags functionality
import { FeatureFlags } from '../kalkulator/js/featureFlags.js';

console.log('🧪 Running Feature Flags Tests...\n');

// Simple test runner for Node.js environment (no Jest)
async function runTests() {
    const featureFlags = new FeatureFlags();
    let testsPassed = 0;
    let testsTotal = 0;

    function test(name, testFn) {
        testsTotal++;
        console.log(`Test ${testsTotal}: ${name}`);
        try {
            testFn();
            console.log('✅ PASSED\n');
            testsPassed++;
        } catch (error) {
            console.log('❌ FAILED:', error.message, '\n');
        }
    }

    async function asyncTest(name, testFn) {
        testsTotal++;
        console.log(`Test ${testsTotal}: ${name}`);
        try {
            await testFn();
            console.log('✅ PASSED\n');
            testsPassed++;
        } catch (error) {
            console.log('❌ FAILED:', error.message, '\n');
        }
    }
    // Test basic functionality
    test('should create FeatureFlags instance', () => {
        const ff = new FeatureFlags();
        if (!ff) throw new Error('Failed to create FeatureFlags instance');
        if (typeof ff.getFeatureFlags !== 'function') throw new Error('getFeatureFlags method missing');
        if (typeof ff.isFeatureEnabled !== 'function') throw new Error('isFeatureEnabled method missing');
    });

    test('should have correct fallback values', () => {
        const ff = new FeatureFlags();
        if (ff.fallbacks.employees !== true) throw new Error('employees fallback should be true');
    });

    test('should manage cache correctly', () => {
        const ff = new FeatureFlags();
        ff.setCacheDuration(5000);
        if (ff.cacheDuration !== 5000) throw new Error('Cache duration not set correctly');

        ff.clearCache();
        if (ff.cache.size !== 0) throw new Error('Cache not cleared');
    });

    // Test fallback behavior when fetch fails
    await asyncTest('should use fallbacks when fetch fails', async () => {
        const ff = new FeatureFlags();

        // Mock fetch to fail
        const originalFetch = global.fetch;
        global.fetch = () => Promise.reject(new Error('Network error'));

        try {
            const flags = await ff.getFeatureFlags();
            if (flags.employees !== true) throw new Error('employees fallback should be true');
        } finally {
            global.fetch = originalFetch;
        }
    });

    await asyncTest('should handle isFeatureEnabled correctly', async () => {
        const ff = new FeatureFlags();

        // Mock fetch to fail so we get fallbacks
        const originalFetch = global.fetch;
        global.fetch = () => Promise.reject(new Error('Network error'));

        try {
            const isEnabled = await ff.isFeatureEnabled('employees');
            if (isEnabled !== true) throw new Error('employees should be enabled by fallback');

            const isUnknown = await ff.isFeatureEnabled('unknownFeature');
            if (isUnknown !== false) throw new Error('unknown feature should be false');
        } finally {
            global.fetch = originalFetch;
        }
    });

    // Run all tests
    console.log('📊 Test Summary:');
    console.log(`Tests passed: ${testsPassed}/${testsTotal}`);

    if (testsPassed === testsTotal) {
        console.log('🎉 All tests passed!');
    } else {
        console.log('🚨 Some tests failed');
        process.exit(1);
    }
}

// Run the tests
runTests().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
});
