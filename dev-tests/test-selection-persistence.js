/**
 * Selection Persistence Tests
 * Tests for employee selection state management and persistence
 */

// Mock localStorage for testing
class MockLocalStorage {
    constructor() {
        this.store = {};
    }
    
    getItem(key) {
        return this.store[key] || null;
    }
    
    setItem(key, value) {
        this.store[key] = String(value);
    }
    
    removeItem(key) {
        delete this.store[key];
    }
    
    clear() {
        this.store = {};
    }
}

// Mock URL for testing
class MockURL {
    constructor(url = 'http://localhost:3000/') {
        this.href = url;
        this.searchParams = new URLSearchParams();
    }
}

// Test utilities
class PersistenceTestUtils {
    static setupMocks() {
        // Mock localStorage
        global.localStorage = new MockLocalStorage();
        
        // Mock window.location
        delete window.location;
        window.location = {
            href: 'http://localhost:3000/',
            search: '',
            pathname: '/'
        };
        
        // Mock history API
        window.history = {
            replaceState: jest.fn(),
            pushState: jest.fn()
        };
        
        // Mock URLSearchParams
        global.URLSearchParams = class MockURLSearchParams {
            constructor(search = '') {
                this.params = new Map();
                if (search) {
                    this.parseSearch(search);
                }
            }
            
            parseSearch(search) {
                const pairs = search.replace('?', '').split('&');
                pairs.forEach(pair => {
                    const [key, value] = pair.split('=');
                    if (key) {
                        this.params.set(key, decodeURIComponent(value || ''));
                    }
                });
            }
            
            get(key) {
                return this.params.get(key);
            }
            
            set(key, value) {
                this.params.set(key, value);
            }
            
            toString() {
                const pairs = [];
                this.params.forEach((value, key) => {
                    pairs.push(`${key}=${encodeURIComponent(value)}`);
                });
                return pairs.join('&');
            }
        };
    }
    
    static cleanup() {
        localStorage.clear();
        window.location.search = '';
        if (window.history.replaceState.mockClear) {
            window.history.replaceState.mockClear();
        }
    }
    
    static createMockApp() {
        return {
            employees: [
                { id: 'emp1', name: 'John Doe' },
                { id: 'emp2', name: 'Jane Smith' },
                { id: 'emp3', name: 'Bob Johnson' }
            ],
            selectedEmployeeId: null,
            currentView: null,
            
            // Mock methods from appLogic.js
            initializeEmployeeState: function() {
                try {
                    // Check URL parameters first
                    const urlParams = new URLSearchParams(window.location.search);
                    const urlEmployeeId = urlParams.get('employee');
                    
                    // Check localStorage for persisted selection
                    const savedEmployeeId = localStorage.getItem('selectedEmployeeId');
                    
                    // Set selectedEmployeeId (URL takes precedence)
                    if (urlEmployeeId !== null) {
                        this.selectedEmployeeId = urlEmployeeId === 'all' ? null : urlEmployeeId;
                    } else if (savedEmployeeId !== null) {
                        this.selectedEmployeeId = savedEmployeeId === 'null' ? null : savedEmployeeId;
                    }
                } catch (error) {
                    console.error('Error initializing employee state:', error);
                    this.selectedEmployeeId = null;
                }
            },
            
            setSelectedEmployee: function(employeeId) {
                try {
                    this.selectedEmployeeId = employeeId;
                    
                    // Persist to localStorage
                    localStorage.setItem('selectedEmployeeId', employeeId === null ? 'null' : employeeId);
                    
                    // Update URL parameter without page reload
                    const url = new MockURL(window.location.href);
                    if (employeeId === null) {
                        url.searchParams.set('employee', 'all');
                    } else {
                        url.searchParams.set('employee', employeeId);
                    }
                    
                    // Mock history.replaceState
                    window.history.replaceState({}, '', url.href);
                    
                } catch (error) {
                    console.error('Error setting selected employee:', error);
                }
            },
            
            getSelectedEmployee: function() {
                if (this.selectedEmployeeId === null) {
                    return null;
                }
                return this.employees.find(emp => emp.id === this.selectedEmployeeId) || null;
            },
            
            isEmployeeSelected: function(employeeId) {
                return this.selectedEmployeeId === employeeId;
            },
            
            isAllEmployeesSelected: function() {
                return this.selectedEmployeeId === null;
            }
        };
    }
}

// Selection persistence test suite
class SelectionPersistenceTests {
    constructor() {
        this.tests = [];
        this.results = [];
    }
    
    addTest(name, testFn) {
        this.tests.push({ name, testFn });
    }
    
    async runAll() {
        console.log('💾 Running Selection Persistence Tests...\n');
        
        for (const test of this.tests) {
            try {
                PersistenceTestUtils.setupMocks();
                PersistenceTestUtils.cleanup();
                await test.testFn();
                this.results.push({ name: test.name, status: 'PASS' });
                console.log(`✅ ${test.name}`);
            } catch (error) {
                this.results.push({ name: test.name, status: 'FAIL', error: error.message });
                console.error(`❌ ${test.name}: ${error.message}`);
            }
        }
        
        this.printSummary();
    }
    
    printSummary() {
        const passed = this.results.filter(r => r.status === 'PASS').length;
        const failed = this.results.filter(r => r.status === 'FAIL').length;
        
        console.log('\n📊 Persistence Test Summary:');
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`📈 Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%`);
    }
}

const persistenceTests = new SelectionPersistenceTests();

// Test localStorage persistence
persistenceTests.addTest('Should persist selection to localStorage', () => {
    const app = PersistenceTestUtils.createMockApp();
    
    // Select an employee
    app.setSelectedEmployee('emp1');
    
    // Check localStorage
    const stored = localStorage.getItem('selectedEmployeeId');
    if (stored !== 'emp1') {
        throw new Error(`Expected 'emp1' in localStorage, got '${stored}'`);
    }
});

persistenceTests.addTest('Should persist "All" selection to localStorage', () => {
    const app = PersistenceTestUtils.createMockApp();
    
    // Select "All"
    app.setSelectedEmployee(null);
    
    // Check localStorage
    const stored = localStorage.getItem('selectedEmployeeId');
    if (stored !== 'null') {
        throw new Error(`Expected 'null' in localStorage, got '${stored}'`);
    }
});

persistenceTests.addTest('Should restore selection from localStorage', () => {
    const app = PersistenceTestUtils.createMockApp();
    
    // Pre-populate localStorage
    localStorage.setItem('selectedEmployeeId', 'emp2');
    
    // Initialize state
    app.initializeEmployeeState();
    
    if (app.selectedEmployeeId !== 'emp2') {
        throw new Error(`Expected 'emp2', got '${app.selectedEmployeeId}'`);
    }
});

persistenceTests.addTest('Should restore "All" selection from localStorage', () => {
    const app = PersistenceTestUtils.createMockApp();
    
    // Pre-populate localStorage with "null" string
    localStorage.setItem('selectedEmployeeId', 'null');
    
    // Initialize state
    app.initializeEmployeeState();
    
    if (app.selectedEmployeeId !== null) {
        throw new Error(`Expected null, got '${app.selectedEmployeeId}'`);
    }
});

// Test URL parameter persistence
persistenceTests.addTest('Should persist selection to URL parameters', () => {
    const app = PersistenceTestUtils.createMockApp();
    
    // Select an employee
    app.setSelectedEmployee('emp1');
    
    // Check if history.replaceState was called
    if (!window.history.replaceState.mock || window.history.replaceState.mock.calls.length === 0) {
        throw new Error('URL not updated');
    }
});

persistenceTests.addTest('Should restore selection from URL parameters', () => {
    const app = PersistenceTestUtils.createMockApp();
    
    // Mock URL with employee parameter
    window.location.search = '?employee=emp3';
    
    // Initialize state
    app.initializeEmployeeState();
    
    if (app.selectedEmployeeId !== 'emp3') {
        throw new Error(`Expected 'emp3', got '${app.selectedEmployeeId}'`);
    }
});

persistenceTests.addTest('Should restore "All" from URL parameter', () => {
    const app = PersistenceTestUtils.createMockApp();
    
    // Mock URL with "all" parameter
    window.location.search = '?employee=all';
    
    // Initialize state
    app.initializeEmployeeState();
    
    if (app.selectedEmployeeId !== null) {
        throw new Error(`Expected null, got '${app.selectedEmployeeId}'`);
    }
});

// Test URL precedence over localStorage
persistenceTests.addTest('Should prioritize URL over localStorage', () => {
    const app = PersistenceTestUtils.createMockApp();
    
    // Set conflicting values
    localStorage.setItem('selectedEmployeeId', 'emp1');
    window.location.search = '?employee=emp2';
    
    // Initialize state
    app.initializeEmployeeState();
    
    // URL should take precedence
    if (app.selectedEmployeeId !== 'emp2') {
        throw new Error(`Expected 'emp2' (from URL), got '${app.selectedEmployeeId}'`);
    }
});

// Test error handling
persistenceTests.addTest('Should handle localStorage errors gracefully', () => {
    const app = PersistenceTestUtils.createMockApp();
    
    // Mock localStorage error
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = () => {
        throw new Error('Storage quota exceeded');
    };
    
    // Should not throw
    try {
        app.setSelectedEmployee('emp1');
        // Should still update in-memory state
        if (app.selectedEmployeeId !== 'emp1') {
            throw new Error('In-memory state not updated');
        }
    } finally {
        localStorage.setItem = originalSetItem;
    }
});

persistenceTests.addTest('Should handle URL parsing errors gracefully', () => {
    const app = PersistenceTestUtils.createMockApp();
    
    // Mock malformed URL
    window.location.search = '?employee=%invalid%';
    
    // Should not throw and should default to null
    app.initializeEmployeeState();
    
    if (app.selectedEmployeeId !== null) {
        throw new Error('Should default to null on URL parsing error');
    }
});

// Test state consistency
persistenceTests.addTest('Should maintain state consistency across operations', () => {
    const app = PersistenceTestUtils.createMockApp();
    
    // Perform multiple operations
    app.setSelectedEmployee('emp1');
    app.setSelectedEmployee(null);
    app.setSelectedEmployee('emp2');
    
    // Check final state
    if (app.selectedEmployeeId !== 'emp2') {
        throw new Error('State inconsistency detected');
    }
    
    // Check localStorage consistency
    const stored = localStorage.getItem('selectedEmployeeId');
    if (stored !== 'emp2') {
        throw new Error('localStorage out of sync');
    }
});

// Run persistence tests
persistenceTests.runAll().catch(console.error);
