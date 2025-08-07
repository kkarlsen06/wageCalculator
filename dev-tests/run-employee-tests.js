#!/usr/bin/env node

/**
 * Employee Carousel Test Runner
 * Runs all employee-related tests and generates a comprehensive report
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test configuration
const TEST_CONFIG = {
    timeout: 30000, // 30 seconds
    retries: 2,
    verbose: true
};

// ANSI color codes for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

class TestRunner {
    constructor() {
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            duration: 0,
            suites: []
        };
        this.startTime = Date.now();
    }

    log(message, color = 'reset') {
        console.log(`${colors[color]}${message}${colors.reset}`);
    }

    async runTestSuite(suiteName, testFile) {
        this.log(`\n🧪 Running ${suiteName}...`, 'cyan');
        
        const suiteStartTime = Date.now();
        const suiteResult = {
            name: suiteName,
            file: testFile,
            tests: [],
            duration: 0,
            passed: 0,
            failed: 0
        };

        try {
            // Setup DOM environment for browser-like testing
            this.setupDOMEnvironment();
            
            // Import and run the test file
            const testModule = await import(testFile);
            
            // If the test file exports a run function, call it
            if (testModule.run) {
                await testModule.run();
            }
            
            this.log(`✅ ${suiteName} completed`, 'green');
            
        } catch (error) {
            this.log(`❌ ${suiteName} failed: ${error.message}`, 'red');
            suiteResult.failed++;
            this.results.failed++;
        }

        suiteResult.duration = Date.now() - suiteStartTime;
        this.results.suites.push(suiteResult);
        this.results.total++;
    }

    setupDOMEnvironment() {
        // Mock DOM environment for Node.js testing
        if (typeof window === 'undefined') {
            global.window = {
                innerWidth: 1920,
                innerHeight: 1080,
                addEventListener: () => {},
                removeEventListener: () => {},
                dispatchEvent: () => {},
                getComputedStyle: () => ({
                    getPropertyValue: () => '16px'
                }),
                matchMedia: () => ({
                    matches: false,
                    addEventListener: () => {},
                    removeEventListener: () => {}
                }),
                history: {
                    replaceState: () => {},
                    pushState: () => {}
                },
                location: {
                    href: 'http://localhost:3000/',
                    search: '',
                    pathname: '/'
                }
            };
        }

        if (typeof document === 'undefined') {
            global.document = {
                createElement: (tag) => ({
                    tagName: tag.toUpperCase(),
                    className: '',
                    innerHTML: '',
                    style: {},
                    addEventListener: () => {},
                    removeEventListener: () => {},
                    appendChild: () => {},
                    remove: () => {},
                    querySelector: () => null,
                    querySelectorAll: () => [],
                    getBoundingClientRect: () => ({
                        width: 100,
                        height: 100,
                        top: 0,
                        left: 0,
                        right: 100,
                        bottom: 100
                    }),
                    focus: () => {},
                    click: () => {},
                    dispatchEvent: () => {}
                }),
                body: {
                    appendChild: () => {},
                    removeChild: () => {},
                    querySelector: () => null,
                    querySelectorAll: () => []
                },
                querySelector: () => null,
                querySelectorAll: () => [],
                getElementById: () => null,
                addEventListener: () => {},
                removeEventListener: () => {}
            };
        }

        // Mock Touch and TouchEvent for touch testing
        if (typeof Touch === 'undefined') {
            global.Touch = class Touch {
                constructor(options) {
                    Object.assign(this, options);
                }
            };
        }

        if (typeof TouchEvent === 'undefined') {
            global.TouchEvent = class TouchEvent extends Event {
                constructor(type, options = {}) {
                    super(type, options);
                    this.touches = options.touches || [];
                    this.targetTouches = options.targetTouches || [];
                    this.changedTouches = options.changedTouches || [];
                }
            };
        }

        // Mock KeyboardEvent
        if (typeof KeyboardEvent === 'undefined') {
            global.KeyboardEvent = class KeyboardEvent extends Event {
                constructor(type, options = {}) {
                    super(type, options);
                    this.key = options.key || '';
                    this.code = options.code || '';
                    this.ctrlKey = options.ctrlKey || false;
                    this.shiftKey = options.shiftKey || false;
                    this.altKey = options.altKey || false;
                    this.metaKey = options.metaKey || false;
                }
            };
        }

        // Mock CSS environment
        if (typeof getComputedStyle === 'undefined') {
            global.getComputedStyle = () => ({
                getPropertyValue: () => '16px'
            });
        }
    }

    async runAllTests() {
        this.log('🚀 Starting Employee Carousel Test Suite', 'bright');
        this.log('=' .repeat(50), 'blue');

        const testSuites = [
            {
                name: 'Employee Carousel Core Tests',
                file: join(__dirname, 'test-employee-carousel.js')
            },
            {
                name: 'Mobile Viewport Tests',
                file: join(__dirname, 'test-mobile-viewport.js')
            },
            {
                name: 'Selection Persistence Tests',
                file: join(__dirname, 'test-selection-persistence.js')
            },
            {
                name: 'Employee Modal Tests',
                file: join(__dirname, 'test-employee-modal.js')
            },
            {
                name: 'Employee CRUD Flow Tests',
                file: join(__dirname, 'test-employee-crud-flows.js')
            }
        ];

        // Run each test suite
        for (const suite of testSuites) {
            await this.runTestSuite(suite.name, suite.file);
        }

        this.generateReport();
    }

    generateReport() {
        this.results.duration = Date.now() - this.startTime;
        
        this.log('\n' + '=' .repeat(50), 'blue');
        this.log('📊 TEST RESULTS SUMMARY', 'bright');
        this.log('=' .repeat(50), 'blue');

        // Overall statistics
        this.log(`\n📈 Overall Results:`, 'bright');
        this.log(`   Total Suites: ${this.results.total}`);
        this.log(`   ✅ Passed: ${this.results.passed}`, 'green');
        this.log(`   ❌ Failed: ${this.results.failed}`, this.results.failed > 0 ? 'red' : 'green');
        this.log(`   ⏱️  Duration: ${this.results.duration}ms`);

        const successRate = this.results.total > 0 ? 
            ((this.results.passed / this.results.total) * 100).toFixed(1) : 0;
        
        this.log(`   📊 Success Rate: ${successRate}%`, 
            successRate >= 90 ? 'green' : successRate >= 70 ? 'yellow' : 'red');

        // Suite breakdown
        if (this.results.suites.length > 0) {
            this.log(`\n📋 Suite Breakdown:`, 'bright');
            this.results.suites.forEach(suite => {
                const status = suite.failed === 0 ? '✅' : '❌';
                const color = suite.failed === 0 ? 'green' : 'red';
                this.log(`   ${status} ${suite.name} (${suite.duration}ms)`, color);
            });
        }

        // Performance insights
        this.log(`\n⚡ Performance Insights:`, 'bright');
        const avgDuration = this.results.suites.length > 0 ? 
            this.results.suites.reduce((sum, suite) => sum + suite.duration, 0) / this.results.suites.length : 0;
        
        this.log(`   Average suite duration: ${avgDuration.toFixed(0)}ms`);
        
        if (avgDuration > 5000) {
            this.log(`   ⚠️  Some tests are running slowly`, 'yellow');
        }

        // Recommendations
        this.log(`\n💡 Recommendations:`, 'bright');
        
        if (this.results.failed > 0) {
            this.log(`   🔧 Fix ${this.results.failed} failing test suite(s)`, 'red');
        }
        
        if (successRate < 90) {
            this.log(`   📈 Improve test coverage and reliability`, 'yellow');
        }
        
        if (this.results.failed === 0) {
            this.log(`   🎉 All tests passing! Great work!`, 'green');
        }

        // Exit with appropriate code
        process.exit(this.results.failed > 0 ? 1 : 0);
    }
}

// Run the tests
const runner = new TestRunner();
runner.runAllTests().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
});
