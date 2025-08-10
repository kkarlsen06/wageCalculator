/**
 * Employee Modal Test Suite
 * Comprehensive tests for employee modal functionality
 */

import { EmployeeModal } from '../kalkulator/js/employeeModal.js';

// Mock app object for testing
const mockApp = {
    employees: [
        {
            id: 'emp1',
            name: 'John Doe',
            email: 'john@example.com',
            hourly_wage: 250.50,
            birth_date: '1990-01-15',
            display_color: '#3498db',
            archived_at: null
        },
        {
            id: 'emp2',
            name: 'Jane Smith',
            email: 'jane@example.com',
            hourly_wage: 275.00,
            birth_date: '1985-06-20',
            display_color: '#e74c3c',
            archived_at: null
        }
    ],
    selectedEmployeeId: null,
    employeeCache: new Map(),
    // Avatars disabled
    
    // Mock methods
    onEmployeesLoaded: function() {
        console.log('Mock: Employees loaded');
    },
    
    // Avatars disabled
    
    getEmployeeInitials: function(employee) {
        const names = employee.name.split(' ');
        return names.length > 1 ? 
            (names[0][0] + names[names.length - 1][0]).toUpperCase() :
            employee.name.substring(0, 2).toUpperCase();
    }
};

// Mock employee service
const mockEmployeeService = {
    createEmployee: async function(data) {
        return {
            id: `emp_${Date.now()}`,
            ...data,
            created_at: new Date().toISOString(),
            archived_at: null
        };
    },
    
    updateEmployee: async function(id, data) {
        const employee = mockApp.employees.find(emp => emp.id === id);
        if (!employee) throw new Error('Employee not found');
        return { ...employee, ...data };
    },
    
    // Avatars disabled
};

// Test utilities
class ModalTestUtils {
    static createMockFile(name = 'test.jpg', type = 'image/jpeg', size = 1024) {
        const file = new File(['test content'], name, { type });
        Object.defineProperty(file, 'size', { value: size });
        return file;
    }
    
    static createMockFileReader() {
        return {
            readAsDataURL: function(file) {
                setTimeout(() => {
                    this.onload({ target: { result: 'data:image/jpeg;base64,test' } });
                }, 10);
            }
        };
    }
    
    static setupMockDOM() {
        // Mock DOM methods
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
                    focus: () => {},
                    click: () => {},
                    setAttribute: () => {},
                    removeAttribute: () => {},
                    classList: {
                        add: () => {},
                        remove: () => {},
                        toggle: () => {},
                        contains: () => false
                    }
                }),
                body: {
                    appendChild: () => {},
                    removeChild: () => {}
                },
                querySelector: () => null,
                querySelectorAll: () => [],
                getElementById: () => null
            };
        }
        
        // Mock FileReader
        global.FileReader = function() {
            return ModalTestUtils.createMockFileReader();
        };
    }
    
    static cleanup() {
        // Clean up any modals
        const modals = document.querySelectorAll('#employeeModal');
        modals.forEach(modal => modal.remove());
    }
}

// Test suite
class EmployeeModalTests {
    constructor() {
        this.tests = [];
        this.results = [];
    }
    
    addTest(name, testFn) {
        this.tests.push({ name, testFn });
    }
    
    async runAll() {
        console.log('🧪 Running Employee Modal Tests...\n');
        
        for (const test of this.tests) {
            try {
                ModalTestUtils.setupMockDOM();
                ModalTestUtils.cleanup();
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
        
        console.log('\n📊 Modal Test Summary:');
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`📈 Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%`);
    }
}

const modalTests = new EmployeeModalTests();

// Basic modal functionality tests
modalTests.addTest('Should create modal instance', () => {
    const modal = new EmployeeModal(mockApp);
    if (!modal) throw new Error('Modal not created');
    if (modal.app !== mockApp) throw new Error('App not set correctly');
});

modalTests.addTest('Should initialize with correct default state', () => {
    const modal = new EmployeeModal(mockApp);
    
    if (modal.isVisible !== false) throw new Error('Should not be visible initially');
    if (modal.mode !== 'create') throw new Error('Should default to create mode');
    if (modal.isSubmitting !== false) throw new Error('Should not be submitting initially');
    if (Object.keys(modal.validationErrors).length !== 0) throw new Error('Should have no validation errors initially');
});

// Form validation tests
modalTests.addTest('Should validate required name field', () => {
    const modal = new EmployeeModal(mockApp);
    
    // Test empty name
    if (modal.validateField('name', '')) throw new Error('Empty name should be invalid');
    if (modal.validateField('name', '   ')) throw new Error('Whitespace name should be invalid');
    
    // Test valid name
    if (!modal.validateField('name', 'John Doe')) throw new Error('Valid name should be valid');
});

modalTests.addTest('Should validate email format', () => {
    const modal = new EmployeeModal(mockApp);
    
    // Test invalid emails
    if (modal.validateField('email', 'invalid-email')) throw new Error('Invalid email should be invalid');
    if (modal.validateField('email', 'test@')) throw new Error('Incomplete email should be invalid');
    
    // Test valid emails
    if (!modal.validateField('email', '')) throw new Error('Empty email should be valid (optional)');
    if (!modal.validateField('email', 'test@example.com')) throw new Error('Valid email should be valid');
});

modalTests.addTest('Should validate hourly wage', () => {
    const modal = new EmployeeModal(mockApp);
    
    // Test invalid wages
    if (modal.validateField('hourly_wage', '-10')) throw new Error('Negative wage should be invalid');
    if (modal.validateField('hourly_wage', 'abc')) throw new Error('Non-numeric wage should be invalid');
    if (modal.validateField('hourly_wage', '15000')) throw new Error('Excessive wage should be invalid');
    
    // Test valid wages
    if (!modal.validateField('hourly_wage', '')) throw new Error('Empty wage should be valid (optional)');
    if (!modal.validateField('hourly_wage', '250.50')) throw new Error('Valid wage should be valid');
});

modalTests.addTest('Should validate birth date', () => {
    const modal = new EmployeeModal(mockApp);
    
    // Test invalid dates
    if (modal.validateField('birth_date', '2020-01-01')) throw new Error('Future date should be invalid (too young)');
    if (modal.validateField('birth_date', '1900-01-01')) throw new Error('Very old date should be invalid');
    
    // Test valid dates
    if (!modal.validateField('birth_date', '')) throw new Error('Empty date should be valid (optional)');
    if (!modal.validateField('birth_date', '1990-01-15')) throw new Error('Valid date should be valid');
});

modalTests.addTest('Should validate display color', () => {
    const modal = new EmployeeModal(mockApp);
    
    // Test invalid colors
    if (modal.validateField('display_color', '')) throw new Error('Empty color should be invalid');
    if (modal.validateField('display_color', 'red')) throw new Error('Named color should be invalid');
    if (modal.validateField('display_color', '#GGG')) throw new Error('Invalid hex should be invalid');
    
    // Test valid colors
    if (!modal.validateField('display_color', '#FF0000')) throw new Error('Valid hex color should be valid');
    if (!modal.validateField('display_color', '#3498db')) throw new Error('Valid hex color should be valid');
});

// Avatars disabled: remove avatar-related tests

// Form state tests
modalTests.addTest('Should populate form with employee data', async () => {
    const modal = new EmployeeModal(mockApp);
    const employee = mockApp.employees[0];
    
    await modal.populateForm(employee);
    
    if (modal.formData.name !== employee.name) throw new Error('Name not populated correctly');
    if (modal.formData.email !== employee.email) throw new Error('Email not populated correctly');
    if (modal.formData.hourly_wage !== employee.hourly_wage) throw new Error('Wage not populated correctly');
    if (modal.formData.birth_date !== employee.birth_date) throw new Error('Birth date not populated correctly');
    if (modal.formData.display_color !== employee.display_color) throw new Error('Color not populated correctly');
});

modalTests.addTest('Should detect unsaved changes', async () => {
    const modal = new EmployeeModal(mockApp);
    
    // Test create mode
    modal.mode = 'create';
    modal.formData.name = 'Test User';
    if (!modal.hasUnsavedChanges()) throw new Error('Should detect changes in create mode');
    
    // Test edit mode
    modal.mode = 'edit';
    modal.originalData = { name: 'Original Name', email: '', hourly_wage: null };
    modal.formData.name = 'Changed Name';
    if (!modal.hasUnsavedChanges()) throw new Error('Should detect changes in edit mode');
    
    // Test no changes
    modal.formData.name = 'Original Name';
    if (modal.hasUnsavedChanges()) throw new Error('Should not detect changes when none exist');
});

// Run the tests
modalTests.runAll().catch(console.error);
