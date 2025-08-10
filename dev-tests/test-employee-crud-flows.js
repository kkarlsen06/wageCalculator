/**
 * Employee CRUD Flows Test Suite
 * Tests for create/edit/archive flows with optimistic updates
 */

import { EmployeeModal } from '../kalkulator/js/employeeModal.js';

// Mock app with more realistic state management
const mockApp = {
    employees: [],
    selectedEmployeeId: null,
    employeeCache: new Map(),
    employeeAvatarCache: new Map(),
    
    onEmployeesLoaded: function() {
        console.log('Mock: Employees loaded, count:', this.employees.length);
    },
    
    getEmployeeAvatarUrl: async function(employeeId) {
        return this.employeeAvatarCache.get(employeeId)?.url || null;
    },
    
    getEmployeeInitials: function(employee) {
        const names = employee.name.split(' ');
        return names.length > 1 ? 
            (names[0][0] + names[names.length - 1][0]).toUpperCase() :
            employee.name.substring(0, 2).toUpperCase();
    }
};

// Mock employee service with controllable behavior
class MockEmployeeService {
    constructor() {
        this.shouldFail = false;
        this.delay = 100;
        this.createdEmployees = [];
        this.updatedEmployees = [];
        this.archivedEmployees = [];
    }
    
    async createEmployee(data) {
        await this.simulateDelay();
        
        if (this.shouldFail) {
            throw new Error('Mock create failure');
        }
        
        const employee = {
            id: `emp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ...data,
            created_at: new Date().toISOString(),
            archived_at: null
        };
        
        this.createdEmployees.push(employee);
        return employee;
    }
    
    async updateEmployee(id, data) {
        await this.simulateDelay();
        
        if (this.shouldFail) {
            throw new Error('Mock update failure');
        }
        
        const existingEmployee = mockApp.employees.find(emp => emp.id === id);
        if (!existingEmployee) {
            throw new Error('Employee not found');
        }
        
        const updatedEmployee = { ...existingEmployee, ...data };
        this.updatedEmployees.push(updatedEmployee);
        return updatedEmployee;
    }
    
    async archiveEmployee(id) {
        await this.simulateDelay();
        
        if (this.shouldFail) {
            throw new Error('Mock archive failure');
        }
        
        this.archivedEmployees.push(id);
        return { success: true };
    }
    
    async uploadAvatar(employeeId, file) {
        await this.simulateDelay();
        
        if (this.shouldFail) {
            throw new Error('Mock avatar upload failure');
        }
        
        return `https://example.com/avatars/${employeeId}.jpg`;
    }
    
    async simulateDelay() {
        return new Promise(resolve => setTimeout(resolve, this.delay));
    }
    
    reset() {
        this.shouldFail = false;
        this.delay = 100;
        this.createdEmployees = [];
        this.updatedEmployees = [];
        this.archivedEmployees = [];
    }
}

// Test utilities
class CRUDTestUtils {
    static setupMocks() {
        // Mock dynamic imports
        global.import = async (module) => {
            if (module === './employeeService.js') {
                return { employeeService: new MockEmployeeService() };
            }
            throw new Error(`Mock import not found: ${module}`);
        };
        
        // Mock DOM
        if (typeof document === 'undefined') {
            global.document = {
                createElement: () => ({
                    className: '',
                    innerHTML: '',
                    style: {},
                    addEventListener: () => {},
                    remove: () => {},
                    querySelector: () => null,
                    querySelectorAll: () => [],
                    classList: {
                        add: () => {},
                        remove: () => {},
                        toggle: () => {}
                    }
                }),
                body: { appendChild: () => {} },
                querySelector: () => null,
                querySelectorAll: () => []
            };
        }
        
        // Mock window methods
        global.window = {
            showToast: (message, type) => console.log(`Toast: ${message} (${type})`)
        };
        
        // Mock alert and confirm
        global.alert = (message) => console.log(`Alert: ${message}`);
        global.confirm = (message) => {
            console.log(`Confirm: ${message}`);
            return true; // Always confirm for tests
        };
    }
    
    static resetApp() {
        mockApp.employees = [];
        mockApp.selectedEmployeeId = null;
        mockApp.employeeCache.clear();
        mockApp.employeeAvatarCache.clear();
    }
    
    static createTestEmployee(overrides = {}) {
        return {
            id: `emp_${Date.now()}`,
            name: 'Test Employee',
            email: 'test@example.com',
            hourly_wage: 250,
            birth_date: '1990-01-01',
            display_color: '#3498db',
            created_at: new Date().toISOString(),
            archived_at: null,
            ...overrides
        };
    }
}

// Test suite
class CRUDFlowTests {
    constructor() {
        this.tests = [];
        this.results = [];
        this.mockService = new MockEmployeeService();
    }
    
    addTest(name, testFn) {
        this.tests.push({ name, testFn });
    }
    
    async runAll() {
        console.log('🔄 Running Employee CRUD Flow Tests...\n');
        
        for (const test of this.tests) {
            try {
                CRUDTestUtils.setupMocks();
                CRUDTestUtils.resetApp();
                this.mockService.reset();
                // Inject shared mock service into global.import
                global.import = async (module) => {
                    if (module === './employeeService.js') {
                        return { employeeService: this.mockService };
                    }
                    throw new Error(`Mock import not found: ${module}`);
                };
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
        
        console.log('\n📊 CRUD Flow Test Summary:');
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`📈 Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%`);
    }
}

const crudTests = new CRUDFlowTests();

// Create employee flow tests
crudTests.addTest('Should create employee successfully', async () => {
    const modal = new EmployeeModal(mockApp);
    
    // Set form data
    modal.formData = {
        name: 'New Employee',
        email: 'new@example.com',
        hourly_wage: '300',
        birth_date: '1985-05-15',
        display_color: '#e74c3c'
    };
    
    const initialCount = mockApp.employees.length;
    
    // Create employee
    await modal.createEmployee();
    
    // Check optimistic update was applied
    if (mockApp.employees.length !== initialCount + 1) {
        throw new Error('Employee not added to app state');
    }
    
    const newEmployee = mockApp.employees[mockApp.employees.length - 1];
    if (newEmployee.name !== 'New Employee') {
        throw new Error('Employee data not correct');
    }
});

crudTests.addTest('Should handle create employee failure with rollback', async () => {
    const modal = new EmployeeModal(mockApp);
    
    // Set form data
    modal.formData = {
        name: 'Failed Employee',
        email: 'failed@example.com',
        hourly_wage: '250',
        birth_date: '1990-01-01',
        display_color: '#3498db'
    };
    
    const initialCount = mockApp.employees.length;
    
    // Mock service to fail
    this.mockService.shouldFail = true;
    
    try {
        await modal.createEmployee();
        throw new Error('Should have thrown an error');
    } catch (error) {
        // Check rollback was applied
        if (mockApp.employees.length !== initialCount) {
            throw new Error('Rollback not applied correctly');
        }
    }
});

crudTests.addTest('Should update employee successfully', async () => {
    const modal = new EmployeeModal(mockApp);
    
    // Add existing employee
    const existingEmployee = CRUDTestUtils.createTestEmployee({
        name: 'Original Name',
        email: 'original@example.com'
    });
    mockApp.employees.push(existingEmployee);
    
    // Set up modal for editing
    modal.mode = 'edit';
    modal.currentEmployee = existingEmployee;
    modal.originalData = { ...existingEmployee };
    modal.formData = {
        name: 'Updated Name',
        email: 'updated@example.com',
        hourly_wage: existingEmployee.hourly_wage,
        birth_date: existingEmployee.birth_date,
        display_color: existingEmployee.display_color
    };
    
    // Update employee
    await modal.updateEmployee();
    
    // Check update was applied
    const updatedEmployee = mockApp.employees.find(emp => emp.id === existingEmployee.id);
    if (!updatedEmployee) {
        throw new Error('Employee not found after update');
    }
    
    if (updatedEmployee.name !== 'Updated Name') {
        throw new Error('Employee name not updated');
    }
    
    if (updatedEmployee.email !== 'updated@example.com') {
        throw new Error('Employee email not updated');
    }
});

crudTests.addTest('Should handle update employee failure with rollback', async () => {
    const modal = new EmployeeModal(mockApp);
    
    // Add existing employee
    const existingEmployee = CRUDTestUtils.createTestEmployee({
        name: 'Original Name'
    });
    mockApp.employees.push(existingEmployee);
    
    // Set up modal for editing
    modal.mode = 'edit';
    modal.currentEmployee = existingEmployee;
    modal.originalData = { ...existingEmployee };
    modal.formData = {
        name: 'Failed Update',
        email: existingEmployee.email,
        hourly_wage: existingEmployee.hourly_wage,
        birth_date: existingEmployee.birth_date,
        display_color: existingEmployee.display_color
    };
    
    // Mock service to fail
    this.mockService.shouldFail = true;
    
    try {
        await modal.updateEmployee();
        throw new Error('Should have thrown an error');
    } catch (error) {
        // Check rollback was applied
        const employee = mockApp.employees.find(emp => emp.id === existingEmployee.id);
        if (employee.name !== 'Original Name') {
            throw new Error('Rollback not applied correctly');
        }
    }
});

crudTests.addTest('Should handle optimistic updates correctly', async () => {
    const modal = new EmployeeModal(mockApp);
    
    // Set form data
    modal.formData = {
        name: 'Optimistic Employee',
        email: 'optimistic@example.com',
        hourly_wage: '275',
        birth_date: '1988-03-10',
        display_color: '#2ecc71'
    };
    
    // Slow down the mock service to test optimistic behavior
    this.mockService.delay = 500;
    
    const initialCount = mockApp.employees.length;
    
    // Start create operation (don't await to test optimistic state)
    const createPromise = modal.createEmployee();
    
    // Check optimistic state was applied immediately
    if (mockApp.employees.length !== initialCount + 1) {
        throw new Error('Optimistic update not applied');
    }
    
    const optimisticEmployee = mockApp.employees[mockApp.employees.length - 1];
    if (!optimisticEmployee._optimistic) {
        throw new Error('Optimistic flag not set');
    }
    
    // Wait for completion
    await createPromise;
    
    // Check final state
    const finalEmployee = mockApp.employees[mockApp.employees.length - 1];
    if (finalEmployee._optimistic) {
        throw new Error('Optimistic flag not cleared');
    }
});

crudTests.addTest('Should validate form before submission', async () => {
    const modal = new EmployeeModal(mockApp);
    
    // Set invalid form data
    modal.formData = {
        name: '', // Invalid: empty name
        email: 'invalid-email', // Invalid: bad format
        hourly_wage: '-100', // Invalid: negative
        birth_date: '2025-01-01', // Invalid: future date
        display_color: 'red' // Invalid: not hex
    };
    
    try {
        await modal.createEmployee();
        throw new Error('Should have failed validation');
    } catch (error) {
        // Should fail due to validation, not reach the service
        if (this.mockService.createdEmployees.length > 0) {
            throw new Error('Service was called despite validation failure');
        }
    }
});

// Run the tests
crudTests.runAll().catch(console.error);
