#!/usr/bin/env node

/**
 * Test suite for employee-aware shift CRUD operations
 * Tests employee_id validation, filtering, and cross-tenant protection
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Mock test data for validation
const MOCK_MANAGER_ID = 'test-manager-uuid-1';
const MOCK_EMPLOYEE_ID = 'test-employee-uuid-1';
const MOCK_FOREIGN_EMPLOYEE_ID = 'foreign-employee-uuid-2';

let testEmployee1 = null;
let testEmployee2 = null;
let testShift1 = null;
let testShift2 = null;

async function authenticateUser(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) {
    console.error(`Authentication failed for ${email}:`, error.message);
    return null;
  }
  
  return {
    token: data.session.access_token,
    id: data.user.id
  };
}

async function makeRequest(method, endpoint, data = null, token = null) {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const options = {
    method,
    headers
  };
  
  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }
  
  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  const responseData = await response.text();
  
  let parsedData;
  try {
    parsedData = JSON.parse(responseData);
  } catch {
    parsedData = responseData;
  }
  
  return {
    status: response.status,
    data: parsedData
  };
}

async function setup() {
  console.log('🔧 Setting up test environment...');
  
  // Authenticate test managers
  const auth1 = await authenticateUser(TEST_MANAGER_1.email, TEST_MANAGER_1.password);
  const auth2 = await authenticateUser(TEST_MANAGER_2.email, TEST_MANAGER_2.password);
  
  if (!auth1 || !auth2) {
    throw new Error('Failed to authenticate test users');
  }
  
  TEST_MANAGER_1.token = auth1.token;
  TEST_MANAGER_1.id = auth1.id;
  TEST_MANAGER_2.token = auth2.token;
  TEST_MANAGER_2.id = auth2.id;
  
  // Create test employees
  const emp1Response = await makeRequest('POST', '/employees', {
    name: 'Test Employee 1',
    email: 'emp1@test.com',
    display_color: '#FF0000'
  }, TEST_MANAGER_1.token);
  
  const emp2Response = await makeRequest('POST', '/employees', {
    name: 'Test Employee 2', 
    email: 'emp2@test.com',
    display_color: '#00FF00'
  }, TEST_MANAGER_2.token);
  
  if (emp1Response.status !== 201 || emp2Response.status !== 201) {
    throw new Error('Failed to create test employees');
  }
  
  testEmployee1 = emp1Response.data.employee;
  testEmployee2 = emp2Response.data.employee;
  
  console.log('✅ Test environment setup complete');
}

async function cleanup() {
  console.log('🧹 Cleaning up test data...');
  
  // Delete test shifts
  if (testShift1) {
    await makeRequest('DELETE', `/shifts/${testShift1.id}`, null, TEST_MANAGER_1.token);
  }
  if (testShift2) {
    await makeRequest('DELETE', `/shifts/${testShift2.id}`, null, TEST_MANAGER_2.token);
  }
  
  // Delete test employees
  if (testEmployee1) {
    await makeRequest('DELETE', `/employees/${testEmployee1.id}`, null, TEST_MANAGER_1.token);
  }
  if (testEmployee2) {
    await makeRequest('DELETE', `/employees/${testEmployee2.id}`, null, TEST_MANAGER_2.token);
  }
  
  console.log('✅ Cleanup complete');
}

async function testCreateShiftWithEmployee() {
  console.log('\n📝 Test: Create shift with employee_id');
  
  const shiftData = {
    shift_date: '2025-01-15',
    start_time: '09:00',
    end_time: '17:00',
    employee_id: testEmployee1.id
  };
  
  const response = await makeRequest('POST', '/shifts', shiftData, TEST_MANAGER_1.token);
  
  if (response.status === 201) {
    testShift1 = response.data.shift;
    console.log('✅ Shift created successfully with employee context');
    console.log(`   Employee: ${testShift1.employee?.name || 'None'}`);
    return true;
  } else {
    console.log('❌ Failed to create shift:', response.data);
    return false;
  }
}

async function testCreateShiftWithoutEmployee() {
  console.log('\n📝 Test: Create shift without employee_id');
  
  const shiftData = {
    shift_date: '2025-01-16',
    start_time: '10:00', 
    end_time: '18:00'
  };
  
  const response = await makeRequest('POST', '/shifts', shiftData, TEST_MANAGER_2.token);
  
  if (response.status === 201) {
    testShift2 = response.data.shift;
    console.log('✅ Shift created successfully without employee');
    console.log(`   Employee: ${testShift2.employee || 'None'}`);
    return true;
  } else {
    console.log('❌ Failed to create shift:', response.data);
    return false;
  }
}

async function testCrossTenantEmployeeValidation() {
  console.log('\n🔒 Test: Cross-tenant employee validation');
  
  const shiftData = {
    shift_date: '2025-01-17',
    start_time: '09:00',
    end_time: '17:00',
    employee_id: testEmployee2.id // Manager 1 trying to use Manager 2's employee
  };
  
  const response = await makeRequest('POST', '/shifts', shiftData, TEST_MANAGER_1.token);
  
  if (response.status === 403) {
    console.log('✅ Cross-tenant access properly blocked');
    return true;
  } else {
    console.log('❌ Cross-tenant access not blocked:', response.data);
    return false;
  }
}

async function testGetShiftsWithEmployeeFilter() {
  console.log('\n📋 Test: Get shifts with employee filter');
  
  const response = await makeRequest('GET', `/shifts?employee_id=${testEmployee1.id}`, null, TEST_MANAGER_1.token);
  
  if (response.status === 200) {
    const shifts = response.data.shifts;
    const hasEmployeeShift = shifts.some(s => s.employee_id === testEmployee1.id);
    
    if (hasEmployeeShift) {
      console.log('✅ Employee filtering works correctly');
      console.log(`   Found ${shifts.length} shifts for employee`);
      return true;
    } else {
      console.log('❌ No shifts found for employee filter');
      return false;
    }
  } else {
    console.log('❌ Failed to get shifts:', response.data);
    return false;
  }
}

async function testGetShiftsWithDateFilter() {
  console.log('\n📅 Test: Get shifts with date filter');
  
  const response = await makeRequest('GET', '/shifts?from=2025-01-15&to=2025-01-15', null, TEST_MANAGER_1.token);
  
  if (response.status === 200) {
    const shifts = response.data.shifts;
    const hasDateShift = shifts.some(s => s.shift_date === '2025-01-15');
    
    if (hasDateShift) {
      console.log('✅ Date filtering works correctly');
      console.log(`   Found ${shifts.length} shifts for date range`);
      return true;
    } else {
      console.log('❌ No shifts found for date filter');
      return false;
    }
  } else {
    console.log('❌ Failed to get shifts:', response.data);
    return false;
  }
}

async function testUpdateShiftEmployee() {
  console.log('\n✏️  Test: Update shift employee assignment');
  
  if (!testShift2) {
    console.log('❌ No test shift available for update');
    return false;
  }
  
  const updateData = {
    employee_id: testEmployee2.id
  };
  
  const response = await makeRequest('PUT', `/shifts/${testShift2.id}`, updateData, TEST_MANAGER_2.token);
  
  if (response.status === 200) {
    const updatedShift = response.data.shift;
    if (updatedShift.employee_id === testEmployee2.id) {
      console.log('✅ Shift employee assignment updated successfully');
      console.log(`   Employee: ${updatedShift.employee?.name || 'None'}`);
      return true;
    } else {
      console.log('❌ Employee assignment not updated correctly');
      return false;
    }
  } else {
    console.log('❌ Failed to update shift:', response.data);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting employee-aware shift tests...\n');
  
  try {
    await setup();
    
    const results = [];
    results.push(await testCreateShiftWithEmployee());
    results.push(await testCreateShiftWithoutEmployee());
    results.push(await testCrossTenantEmployeeValidation());
    results.push(await testGetShiftsWithEmployeeFilter());
    results.push(await testGetShiftsWithDateFilter());
    results.push(await testUpdateShiftEmployee());
    
    const passed = results.filter(r => r).length;
    const total = results.length;
    
    console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);
    
    if (passed === total) {
      console.log('🎉 All tests passed!');
    } else {
      console.log('⚠️  Some tests failed');
    }
    
  } catch (error) {
    console.error('💥 Test suite failed:', error.message);
  } finally {
    await cleanup();
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { runTests };
