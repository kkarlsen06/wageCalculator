#!/usr/bin/env node
/**
 * Test CSV export endpoint functionality
 * Tests: Authentication, filtering, CSV format, boundary cases
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const API_BASE = 'http://localhost:3000';

// Test manager credentials
const TEST_MANAGER = {
  email: process.env.TEST_EMAIL || 'test@example.com',
  password: process.env.TEST_PASSWORD || 'test123456'
};

async function getAuthToken() {
  const { data, error } = await supabase.auth.signInWithPassword(TEST_MANAGER);
  if (error) throw new Error(`Auth failed: ${error.message}`);
  return data.session.access_token;
}

async function testCsvExport() {
  console.log('🧪 Testing CSV export endpoint...\n');
  
  try {
    // Get auth token
    const token = await getAuthToken();
    console.log('✅ Authentication successful');
    
    // Test 1: Export all shifts
    console.log('\n📋 Test 1: Export all shifts');
    const allShiftsResponse = await fetch(`${API_BASE}/reports/wages`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!allShiftsResponse.ok) {
      throw new Error(`Export failed: ${allShiftsResponse.status} ${allShiftsResponse.statusText}`);
    }
    
    const allShiftsCsv = await allShiftsResponse.text();
    const lines = allShiftsCsv.split('\n').filter(l => l.trim());
    console.log(`✅ Exported ${lines.length - 1} shifts (including header)`);
    
    // Verify CSV header
    const expectedHeader = 'employee_name,shift_date,start_time,end_time,duration_hours,break_minutes,break_policy_used,paid_hours,tariff_level_snapshot,hourly_wage_snapshot,gross_wage';
    if (lines[0] !== expectedHeader) {
      throw new Error(`Invalid CSV header: ${lines[0]}`);
    }
    console.log('✅ CSV header format correct');
    
    // Test 2: Export with date range
    console.log('\n📋 Test 2: Export with date range');
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    
    const rangeResponse = await fetch(
      `${API_BASE}/reports/wages?from=${firstDay}&to=${lastDay}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    
    if (!rangeResponse.ok) {
      throw new Error(`Range export failed: ${rangeResponse.status}`);
    }
    
    const rangeCsv = await rangeResponse.text();
    const rangeLines = rangeCsv.split('\n').filter(l => l.trim());
    console.log(`✅ Exported ${rangeLines.length - 1} shifts for current month`);
    
    // Test 3: Verify break policy calculation
    console.log('\n📋 Test 3: Verify break policy calculations');
    if (lines.length > 1) {
      const dataLine = lines[1].split(',');
      const durationHours = parseFloat(dataLine[4]);
      const breakMinutes = parseInt(dataLine[5]);
      const breakPolicy = dataLine[6];
      const paidHours = parseFloat(dataLine[7]);
      const hourlyWage = parseFloat(dataLine[9]);
      const grossWage = parseFloat(dataLine[10]);
      
      console.log(`  Duration: ${durationHours}h`);
      console.log(`  Break minutes: ${breakMinutes}`);
      console.log(`  Break policy: ${breakPolicy}`);
      console.log(`  Paid hours: ${paidHours}h`);
      console.log(`  Hourly wage: ${hourlyWage} kr`);
      console.log(`  Gross wage: ${grossWage} kr`);
      
      // Verify calculation
      const expectedGross = Math.round(paidHours * hourlyWage * 100) / 100;
      if (Math.abs(grossWage - expectedGross) > 0.01) {
        throw new Error(`Wage calculation mismatch: ${grossWage} != ${expectedGross}`);
      }
      console.log('✅ Wage calculations verified');
    }
    
    // Test 4: Test with invalid employee_id (should fail)
    console.log('\n📋 Test 4: Test access control');
    const invalidResponse = await fetch(
      `${API_BASE}/reports/wages?employee_id=invalid-uuid`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    
    if (invalidResponse.status !== 403 && invalidResponse.status !== 400) {
      throw new Error(`Expected 403/400 for invalid employee, got ${invalidResponse.status}`);
    }
    console.log('✅ Access control working correctly');
    
    // Test 5: Test without auth (should fail)
    console.log('\n📋 Test 5: Test authentication requirement');
    const noAuthResponse = await fetch(`${API_BASE}/reports/wages`);
    
    if (noAuthResponse.status !== 401) {
      throw new Error(`Expected 401 without auth, got ${noAuthResponse.status}`);
    }
    console.log('✅ Authentication required as expected');
    
    console.log('\n✅ All CSV export tests passed!');
    
    // Clean up
    await supabase.auth.signOut();
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests
testCsvExport().then(() => process.exit(0));
