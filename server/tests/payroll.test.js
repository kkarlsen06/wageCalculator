#!/usr/bin/env node
/**
 * Automated Tests for Payroll Calculations
 * Run with: node server/tests/payroll.test.js
 */

import { calcEmployeeShift } from '../payroll/calc.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

class PayrollTestSuite {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, testFn) {
    this.tests.push({ name, testFn });
  }

  async run() {
    console.log('🧪 Running Payroll Calculation Tests');
    console.log('='.repeat(60));
    
    for (const { name, testFn } of this.tests) {
      try {
        console.log(`\n🔍 ${name}`);
        await testFn();
        console.log('✅ PASSED');
        this.passed++;
      } catch (error) {
        console.log(`❌ FAILED: ${error.message}`);
        this.failed++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`📊 Test Results: ${this.passed} passed, ${this.failed} failed`);
    
    if (this.failed > 0) {
      process.exit(1);
    }
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  assertEqual(actual, expected, message) {
    if (Math.abs(actual - expected) > 0.01) { // Allow small floating point differences
      throw new Error(`${message}. Expected: ${expected}, Got: ${actual}`);
    }
  }
}

const suite = new PayrollTestSuite();

// Test 1: Basic wage calculation
suite.test('Basic wage calculation should work correctly', () => {
  const employee = {
    hourlyRate: 200, // 200 NOK per hour
    overtimeMultiplier: 1.5
  };
  
  const shift = {
    date: '2025-09-03',
    startTime: '09:00',
    endTime: '17:00', // 8 hours
    break: 60 // 1 hour break
  };
  
  const result = calcEmployeeShift(employee, shift);
  
  // 8 hours - 1 hour break = 7 hours worked
  // 7 hours * 200 NOK = 1400 NOK
  suite.assertEqual(result.totalPay, 1400, 'Basic 7-hour shift should equal 1400 NOK');
  suite.assertEqual(result.regularHours, 7, 'Regular hours should be 7');
  suite.assertEqual(result.overtimeHours, 0, 'No overtime for 7-hour shift');
});

// Test 2: Overtime calculation
suite.test('Overtime calculation should work correctly', () => {
  const employee = {
    hourlyRate: 200,
    overtimeMultiplier: 1.5
  };
  
  const shift = {
    date: '2025-09-03',
    startTime: '08:00',
    endTime: '19:00', // 11 hours
    break: 30 // 30 minutes break
  };
  
  const result = calcEmployeeShift(employee, shift);
  
  // 11 hours - 0.5 hour break = 10.5 hours worked
  // First 8 hours at regular rate: 8 * 200 = 1600
  // 2.5 hours overtime at 1.5x rate: 2.5 * 200 * 1.5 = 750
  // Total: 1600 + 750 = 2350
  suite.assertEqual(result.regularHours, 8, 'Regular hours should be capped at 8');
  suite.assertEqual(result.overtimeHours, 2.5, 'Overtime should be 2.5 hours');
  suite.assertEqual(result.totalPay, 2350, 'Total with overtime should be 2350 NOK');
});

// Test 3: Edge case - exactly 8 hours
suite.test('Exactly 8 hours should not trigger overtime', () => {
  const employee = {
    hourlyRate: 250,
    overtimeMultiplier: 1.5
  };
  
  const shift = {
    date: '2025-09-03',
    startTime: '09:00',
    endTime: '17:00', // 8 hours
    break: 0 // No break
  };
  
  const result = calcEmployeeShift(employee, shift);
  
  suite.assertEqual(result.regularHours, 8, 'Should work exactly 8 hours');
  suite.assertEqual(result.overtimeHours, 0, 'No overtime for exactly 8 hours');
  suite.assertEqual(result.totalPay, 2000, 'Should equal 8 * 250 = 2000 NOK');
});

// Test 4: Short shift calculation
suite.test('Short shift calculation should work', () => {
  const employee = {
    hourlyRate: 180,
    overtimeMultiplier: 1.5
  };
  
  const shift = {
    date: '2025-09-03',
    startTime: '14:00',
    endTime: '17:00', // 3 hours
    break: 15 // 15 minutes break
  };
  
  const result = calcEmployeeShift(employee, shift);
  
  // 3 hours - 0.25 hours break = 2.75 hours worked
  // 2.75 * 180 = 495 NOK
  suite.assertEqual(result.regularHours, 2.75, 'Should work 2.75 hours');
  suite.assertEqual(result.overtimeHours, 0, 'No overtime for short shift');
  suite.assertEqual(result.totalPay, 495, 'Should equal 2.75 * 180 = 495 NOK');
});

// Test 5: Night shift with different rates
suite.test('Different hourly rates should calculate correctly', () => {
  const employee = {
    hourlyRate: 300, // Higher night rate
    overtimeMultiplier: 2.0 // Higher overtime multiplier
  };
  
  const shift = {
    date: '2025-09-03',
    startTime: '22:00',
    endTime: '08:00', // 10 hours (crosses midnight)
    break: 60 // 1 hour break
  };
  
  const result = calcEmployeeShift(employee, shift);
  
  // 10 hours - 1 hour break = 9 hours worked
  // First 8 hours: 8 * 300 = 2400
  // 1 hour overtime: 1 * 300 * 2.0 = 600
  // Total: 2400 + 600 = 3000
  suite.assertEqual(result.regularHours, 8, 'Regular hours should be 8');
  suite.assertEqual(result.overtimeHours, 1, 'Overtime should be 1 hour');
  suite.assertEqual(result.totalPay, 3000, 'Total should be 3000 NOK');
});

// Run the test suite
if (process.argv[1] === __filename) {
  suite.run().catch(console.error);
}

export default PayrollTestSuite;