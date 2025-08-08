#!/usr/bin/env node

/**
 * Test Runner for Employee-Shift Integration E2E Tests
 * 
 * Usage:
 *   node dev-tests/run-employee-shift-tests.js
 * 
 * This script runs comprehensive E2E tests for the employee-shift integration
 * including employee selector, chips, and filtering functionality.
 */

const EmployeeShiftE2ETests = require('./test-employee-shift-integration.js');

async function main() {
    console.log('🎯 Employee-Shift Integration Test Runner');
    console.log('==========================================\n');
    
    const tests = new EmployeeShiftE2ETests();
    
    try {
        await tests.runAllTests();
        process.exit(0);
    } catch (error) {
        console.error('💥 Test runner failed:', error);
        process.exit(1);
    }
}

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

// Run the tests
main();
