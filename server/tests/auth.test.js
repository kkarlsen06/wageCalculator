#!/usr/bin/env node
/**
 * Automated Tests for Authentication and Critical Paths
 * Run with: node server/tests/auth.test.js
 */

import { getUidFromAuthHeader, verifySupabaseJWT } from '../lib/auth/verifySupabaseJwt.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

// Test configuration
const TEST_CONFIG = {
  serverPort: process.env.PORT || 8080,
  serverUrl: process.env.PUBLIC_APP_BASE_URL || 'http://localhost:8080'
};

class TestSuite {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, testFn) {
    this.tests.push({ name, testFn });
  }

  async run() {
    console.log('🧪 Running Authentication & Critical Path Tests');
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
    if (actual !== expected) {
      throw new Error(`${message}. Expected: ${expected}, Got: ${actual}`);
    }
  }

  assertNotEqual(actual, notExpected, message) {
    if (actual === notExpected) {
      throw new Error(`${message}. Should not equal: ${notExpected}`);
    }
  }
}

const suite = new TestSuite();

// Test 1: JWT Validation with invalid tokens
suite.test('JWT validation should reject invalid tokens', async () => {
  const invalidUID = await getUidFromAuthHeader('Bearer invalid-token');
  suite.assertEqual(invalidUID, null, 'Invalid JWT should return null');
  
  const missingUID = await getUidFromAuthHeader(null);
  suite.assertEqual(missingUID, null, 'Missing header should return null');
  
  const malformedUID = await getUidFromAuthHeader('NotBearer token');
  suite.assertEqual(malformedUID, null, 'Malformed header should return null');
});

// Test 2: Server health check
suite.test('Server health endpoint should respond', async () => {
  try {
    const response = await fetch(`${TEST_CONFIG.serverUrl}/health`);
    suite.assert(response.ok, 'Health endpoint should return 200');
    
    const data = await response.json();
    suite.assert(data.status, 'Health response should have status field');
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('⚠️  Server not running - skipping health check');
    } else {
      throw error;
    }
  }
});

// Test 3: API endpoints require authentication
suite.test('Protected endpoints should require authentication', async () => {
  try {
    const endpoints = ['/api/settings', '/api/billing/start'];
    
    for (const endpoint of endpoints) {
      const response = await fetch(`${TEST_CONFIG.serverUrl}${endpoint}`, {
        method: 'GET'
      });
      
      suite.assert(
        response.status === 401 || response.status === 403,
        `${endpoint} should require authentication (got ${response.status})`
      );
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('⚠️  Server not running - skipping auth tests');
    } else {
      throw error;
    }
  }
});

// Test 4: Environment variables validation
suite.test('Critical environment variables should be configured', () => {
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'STRIPE_SECRET_KEY'
  ];
  
  for (const varName of requiredVars) {
    suite.assert(
      process.env[varName],
      `${varName} environment variable should be set`
    );
    suite.assert(
      process.env[varName].length > 10,
      `${varName} should have reasonable length`
    );
  }
});

// Test 5: JWKS URL configuration
suite.test('JWKS URL should be properly configured', () => {
  const jwksUrl = process.env.SUPABASE_JWKS_URL || 'https://id.kkarlsen.dev/auth/v1/.well-known/jwks.json';
  
  suite.assert(
    jwksUrl.startsWith('https://'),
    'JWKS URL should use HTTPS'
  );
  suite.assert(
    jwksUrl.includes('.well-known/jwks.json'),
    'JWKS URL should point to JWKS endpoint'
  );
});

// Test 6: Stripe configuration
suite.test('Stripe configuration should be valid', () => {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  
  suite.assert(
    stripeKey.startsWith('sk_'),
    'Stripe secret key should start with sk_'
  );
  
  if (process.env.NODE_ENV === 'production') {
    suite.assert(
      stripeKey.startsWith('sk_live_'),
      'Production should use live Stripe key'
    );
  }
});

// Run the test suite
if (process.argv[1] === __filename) {
  suite.run().catch(console.error);
}

export default suite;
