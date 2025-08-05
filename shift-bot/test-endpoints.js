// Test script for the Supabase-backed API endpoints
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5173';

// Mock JWT token for testing (you would get this from Supabase auth in real usage)
const MOCK_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1d2pkYWN4YmlyaG1zZ2xjYnhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0NTIxNDAsImV4cCI6MjA2NDAyODE0MH0.iSjbvGVpM3zOWCGpg5HrQp37PjJCmiHIwVQLgc2LgcE';

async function testEndpoints() {
  console.log('🧪 Testing API endpoints...\n');

  // Test 1: GET /settings without auth (should fail)
  console.log('1. Testing GET /settings without auth...');
  try {
    const response = await fetch(`${BASE_URL}/settings`);
    console.log(`   Status: ${response.status}`);
    const data = await response.json();
    console.log(`   Response:`, data);
  } catch (error) {
    console.log(`   Error:`, error.message);
  }

  // Test 2: GET /settings with auth (should work)
  console.log('\n2. Testing GET /settings with auth...');
  try {
    const response = await fetch(`${BASE_URL}/settings`, {
      headers: {
        'Authorization': `Bearer ${MOCK_TOKEN}`
      }
    });
    console.log(`   Status: ${response.status}`);
    const data = await response.json();
    console.log(`   Response:`, data);
  } catch (error) {
    console.log(`   Error:`, error.message);
  }

  // Test 3: POST /chat without auth (should fail)
  console.log('\n3. Testing POST /chat without auth...');
  try {
    const response = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: 'You are a helpful wage-bot.' },
          { role: 'user', content: 'Add a shift for today from 9:00 to 17:00' }
        ]
      })
    });
    console.log(`   Status: ${response.status}`);
    const data = await response.json();
    console.log(`   Response:`, data);
  } catch (error) {
    console.log(`   Error:`, error.message);
  }

  // Test 4: POST /chat with auth (should work)
  console.log('\n4. Testing POST /chat with auth...');
  try {
    const response = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MOCK_TOKEN}`
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: 'You are a helpful wage-bot.' },
          { role: 'user', content: 'Hello, how are you?' }
        ]
      })
    });
    console.log(`   Status: ${response.status}`);
    const data = await response.json();
    console.log(`   Response:`, data);
  } catch (error) {
    console.log(`   Error:`, error.message);
  }

  console.log('\n✅ Testing complete!');
}

testEndpoints().catch(console.error);
