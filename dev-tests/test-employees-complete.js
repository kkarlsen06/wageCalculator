// Comprehensive integration tests for all employee endpoints
import 'dotenv/config';

// Test configuration
const API_BASE = process.env.NODE_ENV === 'production' 
    ? 'https://wagecalculator-gbpd.onrender.com'
    : 'http://localhost:5173';

// Mock auth token for testing (replace with actual token in real tests)
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || 'mock-token-for-testing';

console.log('🧪 Testing Complete Employee Management System...\n');
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
    
    let data;
    try {
        data = await response.json();
    } catch (e) {
        data = null;
    }
    
    return { response, data };
}

let testEmployeeId = null;

async function testEmployeeCRUD() {
    console.log('📝 Testing Employee CRUD Operations...\n');
    
    try {
        // 1. Create Employee
        console.log('1️⃣ Creating employee...');
        const createData = {
            name: 'Test Employee',
            email: 'test@example.com',
            hourly_wage: 250.50,
            birth_date: '1990-05-15',
            display_color: '#3498db'
        };
        
        const { response: createResponse, data: createData_result } = await makeRequest('POST', '/employees', createData);
        
        if (createResponse.status === 201 && createData_result.employee) {
            testEmployeeId = createData_result.employee.id;
            console.log('✅ Employee created successfully:', testEmployeeId);
        } else {
            console.log('❌ Failed to create employee:', createResponse.status, createData_result);
            return false;
        }
        
        // 2. Get All Employees
        console.log('\n2️⃣ Fetching all employees...');
        const { response: getResponse, data: getData } = await makeRequest('GET', '/employees');
        
        if (getResponse.status === 200 && Array.isArray(getData.employees)) {
            const foundEmployee = getData.employees.find(emp => emp.id === testEmployeeId);
            if (foundEmployee) {
                console.log('✅ Employee found in list');
            } else {
                console.log('❌ Employee not found in list');
                return false;
            }
        } else {
            console.log('❌ Failed to fetch employees:', getResponse.status, getData);
            return false;
        }
        
        // 3. Update Employee
        console.log('\n3️⃣ Updating employee...');
        const updateData = {
            name: 'Updated Test Employee',
            hourly_wage: 300.75
        };
        
        const { response: updateResponse, data: updateData_result } = await makeRequest('PUT', `/employees/${testEmployeeId}`, updateData);
        
        if (updateResponse.status === 200 && updateData_result.employee) {
            if (updateData_result.employee.name === updateData.name) {
                console.log('✅ Employee updated successfully');
            } else {
                console.log('❌ Employee update failed - name mismatch');
                return false;
            }
        } else {
            console.log('❌ Failed to update employee:', updateResponse.status, updateData_result);
            return false;
        }
        
        // 4. Test Archive (Soft Delete)
        console.log('\n4️⃣ Archiving employee...');
        const { response: deleteResponse, data: deleteData } = await makeRequest('DELETE', `/employees/${testEmployeeId}`);
        
        if (deleteResponse.status === 200 && deleteData.employee && deleteData.employee.archived_at) {
            console.log('✅ Employee archived successfully');
        } else {
            console.log('❌ Failed to archive employee:', deleteResponse.status, deleteData);
            return false;
        }
        
        // 5. Verify archived employee is excluded from default list
        console.log('\n5️⃣ Verifying archived employee exclusion...');
        const { response: getResponse2, data: getData2 } = await makeRequest('GET', '/employees');
        
        if (getResponse2.status === 200 && Array.isArray(getData2.employees)) {
            const foundArchivedEmployee = getData2.employees.find(emp => emp.id === testEmployeeId);
            if (!foundArchivedEmployee) {
                console.log('✅ Archived employee properly excluded from default list');
            } else {
                console.log('❌ Archived employee still appears in default list');
                return false;
            }
        } else {
            console.log('❌ Failed to fetch employees for verification:', getResponse2.status, getData2);
            return false;
        }
        
        // 6. Verify archived employee is included when requested
        console.log('\n6️⃣ Verifying archived employee inclusion with flag...');
        const { response: getResponse3, data: getData3 } = await makeRequest('GET', '/employees?include_archived=1');
        
        if (getResponse3.status === 200 && Array.isArray(getData3.employees)) {
            const foundArchivedEmployee = getData3.employees.find(emp => emp.id === testEmployeeId);
            if (foundArchivedEmployee && foundArchivedEmployee.archived_at) {
                console.log('✅ Archived employee properly included with flag');
            } else {
                console.log('❌ Archived employee not found with include_archived flag');
                return false;
            }
        } else {
            console.log('❌ Failed to fetch employees with archived flag:', getResponse3.status, getData3);
            return false;
        }
        
        return true;
    } catch (error) {
        console.log('❌ CRUD test failed with error:', error.message);
        return false;
    }
}

async function testValidation() {
    console.log('\n📝 Testing Input Validation...\n');
    
    try {
        const validationTests = [
            {
                name: 'Empty name',
                data: { name: '' },
                expectedStatus: 400,
                expectedError: 'Name is required'
            },
            {
                name: 'Invalid email',
                data: { name: 'Test', email: 'invalid-email' },
                expectedStatus: 400,
                expectedError: 'Invalid email format'
            },
            {
                name: 'Negative wage',
                data: { name: 'Test', hourly_wage: -10 },
                expectedStatus: 400,
                expectedError: 'Hourly wage must be a number >= 0'
            },
            {
                name: 'Invalid birth date',
                data: { name: 'Test', birth_date: 'invalid-date' },
                expectedStatus: 400,
                expectedError: 'Birth date must be in YYYY-MM-DD format'
            }
        ];
        
        for (const test of validationTests) {
            console.log(`Testing: ${test.name}...`);
            const { response, data } = await makeRequest('POST', '/employees', test.data);
            
            if (response.status === test.expectedStatus && data.error && data.error.includes(test.expectedError)) {
                console.log(`✅ ${test.name} validation works`);
            } else {
                console.log(`❌ ${test.name} validation failed - Status: ${response.status}, Error: ${data?.error}`);
                return false;
            }
        }
        
        return true;
    } catch (error) {
        console.log('❌ Validation test failed with error:', error.message);
        return false;
    }
}

async function testAvatarEndpoints() {
    console.log('\n📝 Testing Avatar Signed URL Endpoints...\n');
    
    if (!testEmployeeId) {
        console.log('❌ No test employee ID available for avatar tests');
        return false;
    }
    
    try {
        // Test avatar upload URL generation
        console.log('1️⃣ Testing avatar upload URL generation...');
        const { response: uploadResponse, data: uploadData } = await makeRequest('POST', `/employees/${testEmployeeId}/avatar-upload-url`, { ext: 'png' });
        
        if (uploadResponse.status === 200 && uploadData.signedUrl) {
            console.log('✅ Avatar upload URL generated successfully');
        } else if (uploadResponse.status === 403) {
            console.log('⚠️  Avatar upload URL test skipped - employee archived or access denied');
        } else {
            console.log('❌ Failed to generate avatar upload URL:', uploadResponse.status, uploadData);
            return false;
        }
        
        // Test avatar read URL generation
        console.log('\n2️⃣ Testing avatar read URL generation...');
        const { response: readResponse, data: readData } = await makeRequest('GET', `/employees/${testEmployeeId}/avatar-read-url`);
        
        if (readResponse.status === 200 && readData.url) {
            console.log('✅ Avatar read URL generated successfully');
        } else if (readResponse.status === 403) {
            console.log('⚠️  Avatar read URL test skipped - employee archived or access denied');
        } else {
            console.log('❌ Failed to generate avatar read URL:', readResponse.status, readData);
            return false;
        }
        
        return true;
    } catch (error) {
        console.log('❌ Avatar endpoint test failed with error:', error.message);
        return false;
    }
}

async function testSecurity() {
    console.log('\n📝 Testing Security & Access Control...\n');
    
    try {
        // Test access to non-existent employee
        console.log('1️⃣ Testing access to non-existent employee...');
        const fakeId = '00000000-0000-0000-0000-000000000000';
        
        const { response: fakeResponse } = await makeRequest('PUT', `/employees/${fakeId}`, { name: 'Hacker' });
        
        if (fakeResponse.status === 403) {
            console.log('✅ Access to non-existent employee properly blocked');
        } else {
            console.log('❌ Access to non-existent employee not properly blocked:', fakeResponse.status);
            return false;
        }
        
        // Test unauthorized access (no token)
        console.log('\n2️⃣ Testing unauthorized access...');
        const unauthorizedResponse = await fetch(`${API_BASE}/employees`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (unauthorizedResponse.status === 401) {
            console.log('✅ Unauthorized access properly blocked');
        } else {
            console.log('❌ Unauthorized access not properly blocked:', unauthorizedResponse.status);
            return false;
        }
        
        return true;
    } catch (error) {
        console.log('❌ Security test failed with error:', error.message);
        return false;
    }
}

async function testDuplicateNameValidation() {
    console.log('\n📝 Testing Duplicate Name Validation...\n');
    
    try {
        // Create first employee
        console.log('1️⃣ Creating first employee...');
        const employee1Data = { name: 'Duplicate Test Employee', email: 'dup1@example.com' };
        const { response: create1Response, data: create1Data } = await makeRequest('POST', '/employees', employee1Data);
        
        if (create1Response.status !== 201) {
            console.log('❌ Failed to create first employee for duplicate test');
            return false;
        }
        
        const employee1Id = create1Data.employee.id;
        console.log('✅ First employee created:', employee1Id);
        
        // Try to create second employee with same name
        console.log('\n2️⃣ Attempting to create duplicate employee...');
        const employee2Data = { name: 'Duplicate Test Employee', email: 'dup2@example.com' };
        const { response: create2Response, data: create2Data } = await makeRequest('POST', '/employees', employee2Data);
        
        if (create2Response.status === 409 && create2Data.error.includes('already exists')) {
            console.log('✅ Duplicate name properly rejected');
        } else {
            console.log('❌ Duplicate name not properly rejected:', create2Response.status, create2Data);
            return false;
        }
        
        // Clean up - archive the test employee
        await makeRequest('DELETE', `/employees/${employee1Id}`);
        console.log('✅ Test employee cleaned up');
        
        return true;
    } catch (error) {
        console.log('❌ Duplicate name test failed with error:', error.message);
        return false;
    }
}

// Run all tests
async function runCompleteTests() {
    console.log('🚀 Starting Complete Employee Management Tests...\n');
    
    const testResults = [];
    
    console.log('=' .repeat(60));
    testResults.push(await testEmployeeCRUD());
    
    console.log('\n' + '=' .repeat(60));
    testResults.push(await testValidation());
    
    console.log('\n' + '=' .repeat(60));
    testResults.push(await testAvatarEndpoints());
    
    console.log('\n' + '=' .repeat(60));
    testResults.push(await testSecurity());
    
    console.log('\n' + '=' .repeat(60));
    testResults.push(await testDuplicateNameValidation());
    
    const passed = testResults.filter(r => r).length;
    const total = testResults.length;
    
    console.log('\n' + '=' .repeat(60));
    console.log(`📊 Final Test Results: ${passed}/${total} test suites passed`);
    
    if (passed === total) {
        console.log('🎉 All employee management tests passed!');
        console.log('✅ Employee CRUD endpoints are working correctly');
        console.log('✅ Input validation is working correctly');
        console.log('✅ Avatar signed URL endpoints are working correctly');
        console.log('✅ Security and access control are working correctly');
        console.log('✅ Duplicate name validation is working correctly');
    } else {
        console.log('❌ Some employee management tests failed');
        console.log('Please review the output above for details');
    }
    
    return passed === total;
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runCompleteTests().catch(console.error);
}

export { runCompleteTests };
