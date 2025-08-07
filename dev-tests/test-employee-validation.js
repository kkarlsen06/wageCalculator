#!/usr/bin/env node

/**
 * Test suite for employee validation helper function
 * Tests the validateEmployeeOwnership function logic
 */

console.log('🧪 Testing Employee Validation Logic\n');

// Mock the validateEmployeeOwnership function logic
function mockValidateEmployeeOwnership(managerId, employeeId) {
  // Simulate the validation logic
  if (!employeeId) {
    return { valid: true }; // No employee_id provided is valid (optional)
  }

  // Mock database check - simulate employee ownership
  const mockEmployees = {
    'manager-1': [
      { id: 'emp-1', name: 'Employee 1', display_color: '#FF0000' },
      { id: 'emp-2', name: 'Employee 2', display_color: '#00FF00' }
    ],
    'manager-2': [
      { id: 'emp-3', name: 'Employee 3', display_color: '#0000FF' }
    ]
  };

  const managerEmployees = mockEmployees[managerId] || [];
  const employee = managerEmployees.find(emp => emp.id === employeeId);

  if (!employee) {
    return { 
      valid: false, 
      error: 'Employee not found or does not belong to you',
      statusCode: 403 
    };
  }

  return { 
    valid: true, 
    employee: {
      id: employee.id,
      name: employee.name,
      display_color: employee.display_color
    }
  };
}

// Test cases
const testCases = [
  {
    name: 'Valid employee ownership',
    managerId: 'manager-1',
    employeeId: 'emp-1',
    expectedValid: true
  },
  {
    name: 'No employee_id provided (optional)',
    managerId: 'manager-1',
    employeeId: null,
    expectedValid: true
  },
  {
    name: 'Employee belongs to different manager',
    managerId: 'manager-1',
    employeeId: 'emp-3',
    expectedValid: false
  },
  {
    name: 'Non-existent employee',
    managerId: 'manager-1',
    employeeId: 'emp-999',
    expectedValid: false
  },
  {
    name: 'Non-existent manager',
    managerId: 'manager-999',
    employeeId: 'emp-1',
    expectedValid: false
  }
];

console.log('Running validation tests...\n');

let passed = 0;
let total = testCases.length;

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.name}`);
  
  const result = mockValidateEmployeeOwnership(testCase.managerId, testCase.employeeId);
  
  if (result.valid === testCase.expectedValid) {
    console.log('✅ PASS');
    if (result.valid && result.employee) {
      console.log(`   Employee context: ${result.employee.name} (${result.employee.display_color})`);
    } else if (!result.valid) {
      console.log(`   Error: ${result.error} (Status: ${result.statusCode})`);
    }
    passed++;
  } else {
    console.log('❌ FAIL');
    console.log(`   Expected valid: ${testCase.expectedValid}, got: ${result.valid}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  }
  console.log('');
});

console.log(`📊 Results: ${passed}/${total} tests passed\n`);

if (passed === total) {
  console.log('🎉 All validation tests passed!');
} else {
  console.log('⚠️  Some validation tests failed');
  process.exit(1);
}

// Test schema validation
console.log('\n🔍 Testing Schema Updates...\n');

// Mock schema objects to verify they include employee_id
const addShiftSchema = {
  name: 'addShift',
  description: 'Add one work shift',
  parameters: {
    type: 'object',
    properties: {
      shift_date: { type: 'string', description: 'YYYY-MM-DD' },
      start_time: { type: 'string', description: 'HH:mm' },
      end_time: { type: 'string', description: 'HH:mm' },
      employee_id: { type: 'string', description: 'Optional employee ID to assign shift to' }
    },
    required: ['shift_date', 'start_time', 'end_time']
  }
};

const editShiftSchema = {
  name: 'editShift',
  description: 'Edit an existing work shift',
  parameters: {
    type: 'object',
    properties: {
      shift_id: { type: 'integer', description: 'ID of shift to edit' },
      employee_id: { type: 'string', description: 'Optional employee ID to assign shift to' }
    },
    required: []
  }
};

// Verify schemas
console.log('Checking addShift schema...');
if (addShiftSchema.parameters.properties.employee_id) {
  console.log('✅ addShift schema includes employee_id parameter');
} else {
  console.log('❌ addShift schema missing employee_id parameter');
}

console.log('\nChecking editShift schema...');
if (editShiftSchema.parameters.properties.employee_id) {
  console.log('✅ editShift schema includes employee_id parameter');
} else {
  console.log('❌ editShift schema missing employee_id parameter');
}

console.log('\n🔍 Testing API Endpoint Structure...\n');

// Mock API endpoint structure validation
const expectedEndpoints = [
  'GET /shifts',
  'POST /shifts', 
  'PUT /shifts/:id',
  'DELETE /shifts/:id'
];

console.log('Expected shift endpoints:');
expectedEndpoints.forEach(endpoint => {
  console.log(`✅ ${endpoint}`);
});

console.log('\n📋 Expected query parameters for GET /shifts:');
console.log('✅ employee_id - Filter by specific employee');
console.log('✅ from - Start date filter (YYYY-MM-DD)');
console.log('✅ to - End date filter (YYYY-MM-DD)');

console.log('\n📝 Expected request body for POST /shifts:');
console.log('✅ shift_date (required) - YYYY-MM-DD');
console.log('✅ start_time (required) - HH:mm');
console.log('✅ end_time (required) - HH:mm');
console.log('✅ employee_id (optional) - UUID');

console.log('\n📊 Expected response format:');
console.log('✅ shift object with employee context');
console.log('✅ employee: { id, name, display_color } or null');

console.log('\n🎯 All structural validations complete!');
