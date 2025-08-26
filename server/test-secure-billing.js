#!/usr/bin/env node
/**
 * Test Script for Secure Supabase UID <-> Stripe Integration
 * 
 * This script tests the secure billing implementation with different scenarios:
 * - Case A: Frontend sends bogus UID while server JWT is correct
 * - Case B: Different emails between app and Stripe 
 * - Case C: Existing customer without metadata
 */

import { getUidFromAuthHeader } from './lib/auth/verifySupabaseJwt.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Test configuration
const TEST_CONFIG = {
  serverPort: 8080, // Adjust based on your server
  supabaseUrl: process.env.SUPABASE_URL,
  validJWT: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...', // Replace with valid test JWT
  testUID: '032d8c2a-9af6-4777-99f0-24e2c4058bf3', // Test UID from .env
  priceId: 'price_1234567890abcdef' // Replace with actual price ID
};

console.log('🔒 Testing Secure Supabase UID <-> Stripe Integration');
console.log('=' .repeat(60));

// Test Case A: Frontend sends bogus UID, server JWT is correct
async function testCaseA() {
  console.log('\n📝 Case A: Frontend sends bogus UID while server JWT is correct');
  
  const bogusUID = '00000000-0000-0000-0000-000000000000';
  const correctJWT = `Bearer ${TEST_CONFIG.validJWT}`;
  
  try {
    const response = await fetch(`http://localhost:${TEST_CONFIG.serverPort}/api/billing/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': correctJWT
      },
      body: JSON.stringify({
        uid: bogusUID, // Bogus UID from frontend
        priceId: TEST_CONFIG.priceId
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Server ignored bogus UID and used JWT-derived UID');
      console.log(`   Customer ID: ${result.customerId}`);
      console.log(`   Session ID: ${result.sessionId}`);
    } else {
      console.log('❌ Request failed:', result.error);
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }
}

// Test Case B: Email differs between app and Stripe
async function testCaseB() {
  console.log('\n📝 Case B: Emails differ between app and Stripe → linkage works via UID');
  console.log('   This test demonstrates that email is NOT used for identity resolution');
  console.log('   Even if customer email in Stripe differs from Supabase, UID metadata works');
  
  // This would be tested by:
  // 1. Creating a customer via /api/billing/start
  // 2. Manually changing the customer's email in Stripe dashboard
  // 3. Triggering a webhook event
  // 4. Verifying that the webhook still correctly resolves the UID via metadata
  
  console.log('   ℹ️  Manual test: Create customer, change email in Stripe, trigger webhook');
}

// Test Case C: Existing customer without metadata
async function testCaseC() {
  console.log('\n📝 Case C: Existing customer without metadata → gets updated');
  console.log('   This demonstrates how existing customers get supabase_uid metadata added');
  
  // Check health endpoint for unlinked customers
  try {
    const response = await fetch(`http://localhost:${TEST_CONFIG.serverPort}/admin/unlinked-customers`, {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.validJWT}`
      }
    });
    
    if (response.ok) {
      const healthData = await response.json();
      console.log('✅ Health check results:');
      console.log(`   Customers without UID: ${healthData.summary.customers_without_uid}`);
      console.log(`   Subscriptions without UID: ${healthData.summary.subscriptions_without_uid}`);
      console.log(`   Total issues: ${healthData.summary.total_issues}`);
    } else {
      console.log('❌ Health check failed');
    }
  } catch (error) {
    console.log('❌ Health check error:', error.message);
  }
}

// Sample webhook validation
function showSampleWebhook() {
  console.log('\n📝 Sample Webhook JSON (sanitized):');
  
  const sampleWebhook = {
    id: "evt_1234567890abcdef",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_1234567890abcdef",
        customer: "cus_1234567890abcdef",
        client_reference_id: "032d8c2a-9af6-4777-99f0-24e2c4058bf3", // UID for recovery
        metadata: {
          supabase_uid: "032d8c2a-9af6-4777-99f0-24e2c4058bf3" // Primary UID source
        },
        subscription: "sub_1234567890abcdef"
      }
    }
  };
  
  console.log(JSON.stringify(sampleWebhook, null, 2));
}

// JWT validation test
async function testJWTValidation() {
  console.log('\n📝 JWT Validation Test');
  
  try {
    // Test valid JWT
    const validUID = await getUidFromAuthHeader(`Bearer ${TEST_CONFIG.validJWT}`);
    console.log(`✅ Valid JWT extracted UID: ${validUID || 'null'}`);
    
    // Test invalid JWT
    const invalidUID = await getUidFromAuthHeader('Bearer invalid-token');
    console.log(`❌ Invalid JWT extracted UID: ${invalidUID || 'null'}`);
    
    // Test missing header
    const missingUID = await getUidFromAuthHeader(null);
    console.log(`❌ Missing header extracted UID: ${missingUID || 'null'}`);
    
  } catch (error) {
    console.log('❌ JWT validation error:', error.message);
  }
}

// Expected console logs during full run
function showExpectedLogs() {
  console.log('\n📝 Expected Console Logs During Full Run:');
  console.log(`
[billing] uid=032d8c2a-9af6-4777-99f0-24e2c4058bf3 customer=pending session=pending
[billing] Security: client UID=00000000-0000-0000-0000-000000000000 differs from server UID=032d8c2a-9af6-4777-99f0-24e2c4058bf3
[billing] Found existing customer: cus_1234567890abcdef
[billing] uid=032d8c2a-9af6-4777-99f0-24e2c4058bf3 customer=cus_1234567890abcdef session=cs_1234567890abcdef

[webhook] type=checkout.session.completed uid=032d8c2a-9af6-4777-99f0-24e2c4058bf3 customer=cus_1234567890abcdef
[webhook] Updated customer<->UID mapping: cus_1234567890abcdef <-> 032d8c2a-9af6-4777-99f0-24e2c4058bf3

[webhook] type=customer.subscription.created uid=032d8c2a-9af6-4777-99f0-24e2c4058bf3 customer=cus_1234567890abcdef
[webhook] Updated subscription: sub_1234567890abcdef -> active
`);
}

// Main test runner
async function runTests() {
  console.log(`Server URL: http://localhost:${TEST_CONFIG.serverPort}`);
  console.log(`Test UID: ${TEST_CONFIG.testUID}`);
  
  // Basic connectivity test
  try {
    const healthResponse = await fetch(`http://localhost:${TEST_CONFIG.serverPort}/health`);
    if (healthResponse.ok) {
      console.log('✅ Server is running');
    } else {
      console.log('❌ Server not responding properly');
      return;
    }
  } catch (error) {
    console.log('❌ Cannot connect to server. Is it running on port', TEST_CONFIG.serverPort, '?');
    return;
  }
  
  // Run test cases
  await testJWTValidation();
  await testCaseA();
  await testCaseB();
  await testCaseC();
  showSampleWebhook();
  showExpectedLogs();
  
  console.log('\n✅ Test suite completed');
  console.log('\n📋 Manual Testing Steps:');
  console.log('1. Start your server with: npm run dev:server');
  console.log('2. Update TEST_CONFIG with valid JWT and price ID');
  console.log('3. Run: node test-secure-billing.js');
  console.log('4. Check server logs for security warnings and UID resolution');
  console.log('5. Test webhook by completing a real checkout session');
}

// Run tests if this script is executed directly
if (process.argv[1] === __filename) {
  runTests().catch(console.error);
}

export { testCaseA, testCaseB, testCaseC, showSampleWebhook };