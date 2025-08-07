/**
 * Employee Carousel Test Suite
 * Comprehensive tests for employee carousel functionality
 */

import { EmployeeCarousel } from '../kalkulator/js/employeeCarousel.js';
import { EmployeeActionsMenu } from '../kalkulator/js/employeeActionsMenu.js';

// Mock app object for testing
const mockApp = {
    employees: [
        {
            id: 'emp1',
            name: 'John Doe',
            email: 'john@example.com',
            hourly_wage: 250.50,
            display_color: '#3498db',
            archived_at: null
        },
        {
            id: 'emp2',
            name: 'Jane Smith',
            email: 'jane@example.com',
            hourly_wage: 275.00,
            display_color: '#e74c3c',
            archived_at: null
        },
        {
            id: 'emp3',
            name: 'Bob Johnson',
            email: 'bob@example.com',
            hourly_wage: 300.00,
            display_color: '#2ecc71',
            archived_at: '2025-01-01T00:00:00Z'
        }
    ],
    selectedEmployeeId: null,
    employeeCache: new Map(),
    employeeAvatarCache: new Map(),
    
    // Mock methods
    isEmployeeSelected: function(id) {
        return this.selectedEmployeeId === id;
    },
    
    isAllEmployeesSelected: function() {
        return this.selectedEmployeeId === null;
    },
    
    setSelectedEmployee: function(id) {
        this.selectedEmployeeId = id;
        console.log('Selected employee changed to:', id);
    },
    
    getEmployeeInitials: function(employee) {
        const names = employee.name.split(' ');
        return names.length > 1 ? 
            (names[0][0] + names[names.length - 1][0]).toUpperCase() :
            employee.name.substring(0, 2).toUpperCase();
    },
    
    getEmployeeDisplayColor: function(employee) {
        return employee.display_color || '#6366f1';
    },
    
    getEmployeeAvatarUrl: async function(employeeId) {
        // Mock avatar URL - return null to test initials fallback
        return null;
    }
};

// Test utilities
class TestUtils {
    static createMockContainer() {
        const container = document.createElement('div');
        container.id = 'test-carousel-container';
        document.body.appendChild(container);
        return container;
    }
    
    static cleanup() {
        const container = document.getElementById('test-carousel-container');
        if (container) {
            container.remove();
        }
        
        // Clean up any action menus
        const menus = document.querySelectorAll('.employee-actions-menu');
        menus.forEach(menu => menu.remove());
    }
    
    static simulateTouch(element, type, x = 100, y = 100) {
        const touch = new Touch({
            identifier: 1,
            target: element,
            clientX: x,
            clientY: y,
            radiusX: 2.5,
            radiusY: 2.5,
            rotationAngle: 10,
            force: 0.5
        });
        
        const touchEvent = new TouchEvent(type, {
            cancelable: true,
            bubbles: true,
            touches: [touch],
            targetTouches: [touch],
            changedTouches: [touch]
        });
        
        element.dispatchEvent(touchEvent);
    }
    
    static simulateKeyPress(element, key) {
        const keyEvent = new KeyboardEvent('keydown', {
            key: key,
            bubbles: true,
            cancelable: true
        });
        element.dispatchEvent(keyEvent);
    }
    
    static waitForRender(ms = 100) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Test suite
class EmployeeCarouselTests {
    constructor() {
        this.tests = [];
        this.results = [];
    }
    
    addTest(name, testFn) {
        this.tests.push({ name, testFn });
    }
    
    async runAll() {
        console.log('🧪 Running Employee Carousel Tests...\n');
        
        for (const test of this.tests) {
            try {
                TestUtils.cleanup();
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
        
        console.log('\n📊 Test Summary:');
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`📈 Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%`);
        
        if (failed > 0) {
            console.log('\n💥 Failed Tests:');
            this.results.filter(r => r.status === 'FAIL').forEach(r => {
                console.log(`   - ${r.name}: ${r.error}`);
            });
        }
    }
}

// Initialize test suite
const testSuite = new EmployeeCarouselTests();

// Basic rendering tests
testSuite.addTest('Should render carousel with employees', async () => {
    const container = TestUtils.createMockContainer();
    const carousel = new EmployeeCarousel(container, mockApp);
    
    await TestUtils.waitForRender();
    
    const track = container.querySelector('.employee-carousel-track');
    if (!track) throw new Error('Carousel track not found');
    
    const tiles = track.querySelectorAll('.employee-tile');
    // Should have: All tile + 3 employees + Add tile = 5 tiles
    if (tiles.length !== 5) throw new Error(`Expected 5 tiles, got ${tiles.length}`);
    
    carousel.destroy();
});

testSuite.addTest('Should show employee initials when no avatar', async () => {
    const container = TestUtils.createMockContainer();
    const carousel = new EmployeeCarousel(container, mockApp);
    
    await TestUtils.waitForRender();
    
    const initials = container.querySelectorAll('.avatar-initials');
    if (initials.length === 0) throw new Error('No initials found');
    
    const johnInitials = Array.from(initials).find(el => el.textContent === 'JD');
    if (!johnInitials) throw new Error('John Doe initials not found');
    
    carousel.destroy();
});

// Selection tests
testSuite.addTest('Should handle employee selection', async () => {
    const container = TestUtils.createMockContainer();
    const carousel = new EmployeeCarousel(container, mockApp);
    
    await TestUtils.waitForRender();
    
    // Find John Doe's tile
    const tiles = container.querySelectorAll('.employee-tile');
    const johnTile = Array.from(tiles).find(tile => 
        tile.querySelector('.employee-name')?.textContent === 'John Doe'
    );
    
    if (!johnTile) throw new Error('John Doe tile not found');
    
    // Simulate click
    johnTile.click();
    
    if (mockApp.selectedEmployeeId !== 'emp1') {
        throw new Error('Employee selection not working');
    }
    
    carousel.destroy();
});

testSuite.addTest('Should persist selection state', async () => {
    // Set initial selection
    mockApp.setSelectedEmployee('emp2');
    
    const container = TestUtils.createMockContainer();
    const carousel = new EmployeeCarousel(container, mockApp);
    
    await TestUtils.waitForRender();
    
    const activeTile = container.querySelector('.employee-tile.active');
    if (!activeTile) throw new Error('No active tile found');
    
    const employeeName = activeTile.querySelector('.employee-name')?.textContent;
    if (employeeName !== 'Jane Smith') {
        throw new Error('Wrong employee selected');
    }
    
    carousel.destroy();
});

// Touch interaction tests
testSuite.addTest('Should handle touch interactions', async () => {
    const container = TestUtils.createMockContainer();
    const carousel = new EmployeeCarousel(container, mockApp);
    
    await TestUtils.waitForRender();
    
    const track = container.querySelector('.employee-carousel-track');
    
    // Simulate touch start
    TestUtils.simulateTouch(track, 'touchstart', 100, 100);
    
    // Simulate touch move (horizontal scroll)
    TestUtils.simulateTouch(track, 'touchmove', 50, 100);
    
    // Simulate touch end
    TestUtils.simulateTouch(track, 'touchend', 50, 100);
    
    // Should not throw errors
    carousel.destroy();
});

// Keyboard navigation tests
testSuite.addTest('Should handle keyboard navigation', async () => {
    const container = TestUtils.createMockContainer();
    const carousel = new EmployeeCarousel(container, mockApp);
    
    await TestUtils.waitForRender();
    
    const firstTile = container.querySelector('.employee-tile');
    firstTile.focus();
    
    // Test arrow key navigation
    TestUtils.simulateKeyPress(firstTile, 'ArrowRight');
    
    // Should not throw errors
    carousel.destroy();
});

// Performance tests
testSuite.addTest('Should handle large employee lists', async () => {
    // Create mock app with many employees
    const largeApp = { ...mockApp };
    largeApp.employees = Array.from({ length: 50 }, (_, i) => ({
        id: `emp${i}`,
        name: `Employee ${i}`,
        email: `emp${i}@example.com`,
        hourly_wage: 250 + i,
        display_color: '#3498db',
        archived_at: null
    }));
    
    const container = TestUtils.createMockContainer();
    const carousel = new EmployeeCarousel(container, largeApp);
    
    await TestUtils.waitForRender();
    
    // Should enable virtualization
    if (!carousel.isVirtualized) {
        throw new Error('Virtualization not enabled for large list');
    }
    
    carousel.destroy();
});

// Actions menu tests
testSuite.addTest('Should show actions menu on long press', async () => {
    const container = TestUtils.createMockContainer();
    const carousel = new EmployeeCarousel(container, mockApp);
    
    await TestUtils.waitForRender();
    
    const employeeTile = container.querySelector('.employee-tile[data-employee-id="emp1"]');
    if (!employeeTile) throw new Error('Employee tile not found');
    
    // Simulate long press by calling the method directly
    await carousel.showActionsMenu(employeeTile);
    
    await TestUtils.waitForRender();
    
    const menu = document.querySelector('.employee-actions-menu');
    if (!menu) throw new Error('Actions menu not shown');
    
    carousel.destroy();
});

// Run all tests
testSuite.runAll().catch(console.error);
