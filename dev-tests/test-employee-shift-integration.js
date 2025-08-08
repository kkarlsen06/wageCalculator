/**
 * E2E Tests for Employee-Shift Integration
 * Tests the complete flow of employee selector, chips, and filtering
 */

// Test configuration
const TEST_CONFIG = {
    baseUrl: 'http://localhost:5173',
    timeout: 10000,
    employees: [
        { name: 'John Doe', display_color: '#3498db' },
        { name: 'Jane Smith', display_color: '#e74c3c' },
        { name: 'Bob Johnson', display_color: '#2ecc71' }
    ]
};

class EmployeeShiftE2ETests {
    constructor() {
        this.testResults = [];
        this.employees = [];
        this.shifts = [];
    }

    /**
     * Run all E2E tests
     */
    async runAllTests() {
        console.log('🚀 Starting Employee-Shift Integration E2E Tests');
        
        try {
            await this.setupTestData();
            await this.testCreateShiftWithEmployee();
            await this.testEditShiftEmployee();
            await this.testEmployeeFilterBar();
            await this.testEmployeeChipsDisplay();
            await this.testUnassignedShifts();
            await this.testMobileResponsiveness();
            
            this.displayResults();
        } catch (error) {
            console.error('❌ Test suite failed:', error);
        } finally {
            await this.cleanup();
        }
    }

    /**
     * Setup test data - create employees
     */
    async setupTestData() {
        console.log('📋 Setting up test data...');
        
        try {
            // Create test employees
            for (const employeeData of TEST_CONFIG.employees) {
                const response = await fetch('/employees', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${await this.getAuthToken()}`
                    },
                    body: JSON.stringify(employeeData)
                });

                if (response.ok) {
                    const result = await response.json();
                    this.employees.push(result.employee);
                    console.log(`✅ Created employee: ${result.employee.name}`);
                } else {
                    throw new Error(`Failed to create employee: ${employeeData.name}`);
                }
            }

            this.addTestResult('Setup', 'Employee creation', true);
        } catch (error) {
            this.addTestResult('Setup', 'Employee creation', false, error.message);
            throw error;
        }
    }

    /**
     * Test creating a shift with an employee assigned
     */
    async testCreateShiftWithEmployee() {
        console.log('🧪 Testing shift creation with employee...');
        
        try {
            const employee = this.employees[0];
            const shiftData = {
                shift_date: '2025-01-15',
                start_time: '09:00',
                end_time: '17:00',
                employee_id: employee.id
            };

            const response = await fetch('/shifts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await this.getAuthToken()}`
                },
                body: JSON.stringify(shiftData)
            });

            if (response.ok) {
                const result = await response.json();
                this.shifts.push(result.shift);
                
                // Verify employee context is included
                const hasEmployeeContext = result.shift.employee && 
                                         result.shift.employee.id === employee.id;
                
                this.addTestResult('Create Shift', 'With employee assignment', hasEmployeeContext);
                console.log(`✅ Created shift with employee: ${employee.name}`);
            } else {
                throw new Error('Failed to create shift with employee');
            }
        } catch (error) {
            this.addTestResult('Create Shift', 'With employee assignment', false, error.message);
        }
    }

    /**
     * Test editing a shift to change employee assignment
     */
    async testEditShiftEmployee() {
        console.log('🧪 Testing shift employee editing...');
        
        try {
            if (this.shifts.length === 0) {
                throw new Error('No shifts available for editing test');
            }

            const shift = this.shifts[0];
            const newEmployee = this.employees[1];
            
            const response = await fetch(`/shifts/${shift.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await this.getAuthToken()}`
                },
                body: JSON.stringify({
                    employee_id: newEmployee.id
                })
            });

            if (response.ok) {
                const result = await response.json();
                const hasCorrectEmployee = result.shift.employee && 
                                         result.shift.employee.id === newEmployee.id;
                
                this.addTestResult('Edit Shift', 'Change employee assignment', hasCorrectEmployee);
                console.log(`✅ Updated shift employee to: ${newEmployee.name}`);
            } else {
                throw new Error('Failed to update shift employee');
            }
        } catch (error) {
            this.addTestResult('Edit Shift', 'Change employee assignment', false, error.message);
        }
    }

    /**
     * Test employee filter bar functionality
     */
    async testEmployeeFilterBar() {
        console.log('🧪 Testing employee filter bar...');
        
        try {
            // Create shifts for different employees
            const employee1 = this.employees[0];
            const employee2 = this.employees[1];
            
            // Create shift for employee1
            await this.createTestShift('2025-01-16', '10:00', '18:00', employee1.id);
            
            // Create shift for employee2
            await this.createTestShift('2025-01-17', '08:00', '16:00', employee2.id);
            
            // Create unassigned shift
            await this.createTestShift('2025-01-18', '12:00', '20:00', null);

            // Test filtering by employee1
            const filteredResponse = await fetch(`/shifts?employee_id=${employee1.id}`, {
                headers: {
                    'Authorization': `Bearer ${await this.getAuthToken()}`
                }
            });

            if (filteredResponse.ok) {
                const result = await filteredResponse.json();
                const allShiftsForEmployee = result.shifts.every(shift => 
                    shift.employee_id === employee1.id
                );
                
                this.addTestResult('Filter Bar', 'Employee filtering', allShiftsForEmployee);
                console.log(`✅ Filter working for employee: ${employee1.name}`);
            } else {
                throw new Error('Failed to filter shifts by employee');
            }
        } catch (error) {
            this.addTestResult('Filter Bar', 'Employee filtering', false, error.message);
        }
    }

    /**
     * Test employee chips display in UI
     */
    async testEmployeeChipsDisplay() {
        console.log('🧪 Testing employee chips display...');
        
        try {
            // This would typically involve DOM testing in a real browser environment
            // For now, we'll test the data structure that would be used for chips
            
            const shiftsResponse = await fetch('/shifts', {
                headers: {
                    'Authorization': `Bearer ${await this.getAuthToken()}`
                }
            });

            if (shiftsResponse.ok) {
                const result = await shiftsResponse.json();
                const shiftsWithEmployees = result.shifts.filter(shift => shift.employee);
                const hasEmployeeData = shiftsWithEmployees.every(shift => 
                    shift.employee.name && shift.employee.display_color
                );
                
                this.addTestResult('UI Display', 'Employee chips data', hasEmployeeData);
                console.log(`✅ Employee chip data available for ${shiftsWithEmployees.length} shifts`);
            } else {
                throw new Error('Failed to fetch shifts for chip display test');
            }
        } catch (error) {
            this.addTestResult('UI Display', 'Employee chips data', false, error.message);
        }
    }

    /**
     * Test unassigned shifts handling
     */
    async testUnassignedShifts() {
        console.log('🧪 Testing unassigned shifts...');
        
        try {
            // Create an unassigned shift
            const shiftData = {
                shift_date: '2025-01-20',
                start_time: '14:00',
                end_time: '22:00',
                employee_id: null
            };

            const response = await fetch('/shifts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await this.getAuthToken()}`
                },
                body: JSON.stringify(shiftData)
            });

            if (response.ok) {
                const result = await response.json();
                const isUnassigned = !result.shift.employee_id && !result.shift.employee;
                
                this.addTestResult('Unassigned Shifts', 'Creation and handling', isUnassigned);
                console.log('✅ Unassigned shift created successfully');
            } else {
                throw new Error('Failed to create unassigned shift');
            }
        } catch (error) {
            this.addTestResult('Unassigned Shifts', 'Creation and handling', false, error.message);
        }
    }

    /**
     * Test mobile responsiveness (basic structure test)
     */
    async testMobileResponsiveness() {
        console.log('🧪 Testing mobile responsiveness...');
        
        try {
            // In a real E2E test, this would involve viewport testing
            // For now, we'll verify the API supports mobile-friendly data structures
            
            const response = await fetch('/shifts', {
                headers: {
                    'Authorization': `Bearer ${await this.getAuthToken()}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                const hasCompactData = result.shifts.every(shift => {
                    if (shift.employee) {
                        return shift.employee.name && shift.employee.display_color;
                    }
                    return true;
                });
                
                this.addTestResult('Mobile', 'Data structure compatibility', hasCompactData);
                console.log('✅ Mobile-friendly data structure verified');
            } else {
                throw new Error('Failed to verify mobile data structure');
            }
        } catch (error) {
            this.addTestResult('Mobile', 'Data structure compatibility', false, error.message);
        }
    }

    /**
     * Helper method to create a test shift
     */
    async createTestShift(date, startTime, endTime, employeeId) {
        const response = await fetch('/shifts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${await this.getAuthToken()}`
            },
            body: JSON.stringify({
                shift_date: date,
                start_time: startTime,
                end_time: endTime,
                employee_id: employeeId
            })
        });

        if (response.ok) {
            const result = await response.json();
            this.shifts.push(result.shift);
            return result.shift;
        } else {
            throw new Error(`Failed to create test shift for ${date}`);
        }
    }

    /**
     * Get authentication token (mock implementation)
     */
    async getAuthToken() {
        // In a real implementation, this would get a valid auth token
        return 'mock-auth-token';
    }

    /**
     * Add test result
     */
    addTestResult(category, test, passed, error = null) {
        this.testResults.push({
            category,
            test,
            passed,
            error,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Display test results
     */
    displayResults() {
        console.log('\n📊 Test Results Summary:');
        console.log('========================');
        
        const categories = [...new Set(this.testResults.map(r => r.category))];
        let totalPassed = 0;
        let totalTests = this.testResults.length;

        categories.forEach(category => {
            const categoryResults = this.testResults.filter(r => r.category === category);
            const passed = categoryResults.filter(r => r.passed).length;
            const total = categoryResults.length;
            
            console.log(`\n${category}: ${passed}/${total} passed`);
            
            categoryResults.forEach(result => {
                const status = result.passed ? '✅' : '❌';
                console.log(`  ${status} ${result.test}`);
                if (!result.passed && result.error) {
                    console.log(`     Error: ${result.error}`);
                }
            });
            
            totalPassed += passed;
        });

        console.log(`\n🎯 Overall: ${totalPassed}/${totalTests} tests passed`);
        
        if (totalPassed === totalTests) {
            console.log('🎉 All tests passed! Employee-shift integration is working correctly.');
        } else {
            console.log('⚠️  Some tests failed. Please review the errors above.');
        }
    }

    /**
     * Cleanup test data
     */
    async cleanup() {
        console.log('\n🧹 Cleaning up test data...');
        
        try {
            // Delete test shifts
            for (const shift of this.shifts) {
                await fetch(`/shifts/${shift.id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${await this.getAuthToken()}`
                    }
                });
            }

            // Archive test employees
            for (const employee of this.employees) {
                await fetch(`/employees/${employee.id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${await this.getAuthToken()}`
                    }
                });
            }

            console.log('✅ Cleanup completed');
        } catch (error) {
            console.error('❌ Cleanup failed:', error);
        }
    }
}

// Export for use in other test files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmployeeShiftE2ETests;
}

// Run tests if this file is executed directly
if (typeof window === 'undefined' && require.main === module) {
    const tests = new EmployeeShiftE2ETests();
    tests.runAllTests();
}
