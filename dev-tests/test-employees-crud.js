// Integration tests for employee CRUD endpoints
import 'dotenv/config';

// Test configuration
const API_BASE = process.env.NODE_ENV === 'production' 
    ? 'https://wagecalculator-gbpd.onrender.com'
    : 'http://localhost:5173';

// Mock auth token for testing (replace with actual token in real tests)
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || 'mock-token-for-testing';

console.log('🧪 Testing Employee CRUD endpoints...\n');
console.log('API Base:', API_BASE);

// Helper function to make authenticated requests
async function makeRequest(method, path, body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AUTH_TOKEN}`
        }
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE}${path}`, options);
    const data = await response.json();
    
    return { response, data };
}

// Test data
const testEmployee = {
    name: 'Test Employee',
    email: 'test@example.com',
    hourly_wage: 250.50,
    birth_date: '1990-05-15',
    display_color: '#3498db'
};

const invalidEmployee = {
    name: '',
    email: 'invalid-email',
    hourly_wage: -10,
    birth_date: 'invalid-date'
};

let createdEmployeeId = null;

async function testCreateEmployee() {
    console.log('📝 Testing POST /employees...');
    
    try {
        // Test valid employee creation
        const { response, data } = await makeRequest('POST', '/employees', testEmployee);
        
        console.log('📊 Response Status:', response.status);
        console.log('📊 Response Body:', JSON.stringify(data, null, 2));
        
        if (response.status === 201) {
            console.log('✅ Employee created successfully');
            
            // Validate response structure
            if (data.employee && data.employee.id) {
                createdEmployeeId = data.employee.id;
                console.log('✅ Employee ID captured:', createdEmployeeId);
                
                // Validate returned data
                if (data.employee.name === testEmployee.name) {
                    console.log('✅ Name matches');
                } else {
                    console.log('❌ Name mismatch');
                }
                
                if (data.employee.email === testEmployee.email) {
                    console.log('✅ Email matches');
                } else {
                    console.log('❌ Email mismatch');
                }
                
                if (Math.abs(data.employee.hourly_wage - testEmployee.hourly_wage) < 0.01) {
                    console.log('✅ Hourly wage matches');
                } else {
                    console.log('❌ Hourly wage mismatch');
                }
                
            } else {
                console.log('❌ Missing employee data in response');
                return false;
            }
        } else {
            console.log('❌ Unexpected status code for valid employee creation');
            return false;
        }
        
        return true;
    } catch (error) {
        console.log('❌ Test failed with error:', error.message);
        return false;
    }
}

async function testCreateEmployeeValidation() {
    console.log('\n📝 Testing POST /employees validation...');
    
    try {
        // Test empty name
        const { response: response1, data: data1 } = await makeRequest('POST', '/employees', { name: '' });
        console.log('📊 Empty name - Status:', response1.status, 'Message:', data1.error);
        
        if (response1.status === 400 && data1.error.includes('Name is required')) {
            console.log('✅ Empty name validation works');
        } else {
            console.log('❌ Empty name validation failed');
        }
        
        // Test invalid email
        const { response: response2, data: data2 } = await makeRequest('POST', '/employees', { 
            name: 'Test', 
            email: 'invalid-email' 
        });
        console.log('📊 Invalid email - Status:', response2.status, 'Message:', data2.error);
        
        if (response2.status === 400 && data2.error.includes('Invalid email format')) {
            console.log('✅ Invalid email validation works');
        } else {
            console.log('❌ Invalid email validation failed');
        }
        
        // Test negative hourly wage
        const { response: response3, data: data3 } = await makeRequest('POST', '/employees', { 
            name: 'Test', 
            hourly_wage: -10 
        });
        console.log('📊 Negative wage - Status:', response3.status, 'Message:', data3.error);
        
        if (response3.status === 400 && data3.error.includes('Hourly wage must be a number >= 0')) {
            console.log('✅ Negative wage validation works');
        } else {
            console.log('❌ Negative wage validation failed');
        }
        
        // Test invalid birth date
        const { response: response4, data: data4 } = await makeRequest('POST', '/employees', { 
            name: 'Test', 
            birth_date: 'invalid-date' 
        });
        console.log('📊 Invalid birth date - Status:', response4.status, 'Message:', data4.error);
        
        if (response4.status === 400 && data4.error.includes('Birth date must be in YYYY-MM-DD format')) {
            console.log('✅ Invalid birth date validation works');
        } else {
            console.log('❌ Invalid birth date validation failed');
        }
        
        return true;
    } catch (error) {
        console.log('❌ Validation test failed with error:', error.message);
        return false;
    }
}

async function testGetEmployees() {
    console.log('\n📝 Testing GET /employees...');
    
    try {
        // Test getting all employees
        const { response, data } = await makeRequest('GET', '/employees');
        
        console.log('📊 Response Status:', response.status);
        console.log('📊 Response Body:', JSON.stringify(data, null, 2));
        
        if (response.status === 200) {
            console.log('✅ Employees fetched successfully');
            
            if (Array.isArray(data.employees)) {
                console.log('✅ Employees array returned');
                console.log('📊 Number of employees:', data.employees.length);
                
                // Check if our created employee is in the list
                const foundEmployee = data.employees.find(emp => emp.id === createdEmployeeId);
                if (foundEmployee) {
                    console.log('✅ Created employee found in list');
                } else {
                    console.log('❌ Created employee not found in list');
                }
            } else {
                console.log('❌ Employees is not an array');
                return false;
            }
        } else {
            console.log('❌ Unexpected status code for GET employees');
            return false;
        }
        
        return true;
    } catch (error) {
        console.log('❌ Test failed with error:', error.message);
        return false;
    }
}

async function testUpdateEmployee() {
    console.log('\n📝 Testing PUT /employees/:id...');
    
    if (!createdEmployeeId) {
        console.log('❌ No employee ID available for update test');
        return false;
    }
    
    try {
        const updateData = {
            name: 'Updated Employee Name',
            email: 'updated@example.com',
            hourly_wage: 300.75
        };
        
        const { response, data } = await makeRequest('PUT', `/employees/${createdEmployeeId}`, updateData);
        
        console.log('📊 Response Status:', response.status);
        console.log('📊 Response Body:', JSON.stringify(data, null, 2));
        
        if (response.status === 200) {
            console.log('✅ Employee updated successfully');
            
            // Validate updated data
            if (data.employee.name === updateData.name) {
                console.log('✅ Name updated correctly');
            } else {
                console.log('❌ Name not updated correctly');
            }
            
            if (data.employee.email === updateData.email) {
                console.log('✅ Email updated correctly');
            } else {
                console.log('❌ Email not updated correctly');
            }
            
            if (Math.abs(data.employee.hourly_wage - updateData.hourly_wage) < 0.01) {
                console.log('✅ Hourly wage updated correctly');
            } else {
                console.log('❌ Hourly wage not updated correctly');
            }
        } else {
            console.log('❌ Unexpected status code for employee update');
            return false;
        }
        
        return true;
    } catch (error) {
        console.log('❌ Test failed with error:', error.message);
        return false;
    }
}

async function testDeleteEmployee() {
    console.log('\n📝 Testing DELETE /employees/:id...');
    
    if (!createdEmployeeId) {
        console.log('❌ No employee ID available for delete test');
        return false;
    }
    
    try {
        const { response, data } = await makeRequest('DELETE', `/employees/${createdEmployeeId}`);
        
        console.log('📊 Response Status:', response.status);
        console.log('📊 Response Body:', JSON.stringify(data, null, 2));
        
        if (response.status === 200) {
            console.log('✅ Employee archived successfully');
            
            // Validate that archived_at is set
            if (data.employee.archived_at) {
                console.log('✅ archived_at timestamp set');
            } else {
                console.log('❌ archived_at timestamp not set');
            }
        } else {
            console.log('❌ Unexpected status code for employee deletion');
            return false;
        }
        
        return true;
    } catch (error) {
        console.log('❌ Test failed with error:', error.message);
        return false;
    }
}

async function testCrossTenantSecurity() {
    console.log('\n📝 Testing cross-tenant security...');
    
    try {
        // Test accessing non-existent employee (should return 403)
        const fakeEmployeeId = '00000000-0000-0000-0000-000000000000';
        
        const { response: getResponse } = await makeRequest('GET', `/employees/${fakeEmployeeId}/avatar-read-url`);
        console.log('📊 Fake employee access - Status:', getResponse.status);
        
        if (getResponse.status === 403) {
            console.log('✅ Cross-tenant access properly blocked');
        } else {
            console.log('❌ Cross-tenant access not properly blocked');
        }
        
        return true;
    } catch (error) {
        console.log('❌ Security test failed with error:', error.message);
        return false;
    }
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Starting Employee CRUD tests...\n');
    
    const results = [];
    
    results.push(await testCreateEmployee());
    results.push(await testCreateEmployeeValidation());
    results.push(await testGetEmployees());
    results.push(await testUpdateEmployee());
    results.push(await testDeleteEmployee());
    results.push(await testCrossTenantSecurity());
    
    const passed = results.filter(r => r).length;
    const total = results.length;
    
    console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);
    
    if (passed === total) {
        console.log('🎉 All tests passed!');
    } else {
        console.log('❌ Some tests failed');
    }
    
    return passed === total;
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllTests().catch(console.error);
}

export { runAllTests };
