// Simplified feature flags test to avoid module format differences
import fetch from 'node-fetch';

console.log('🧪 Running Feature Flags Tests...\n');

async function run() {
  const API_BASE = 'http://localhost:5173';
  let total = 0;
  let passed = 0;

  async function asyncTest(name, fn) {
    total++;
    console.log(`Test ${total}: ${name}`);
    try { await fn(); console.log('✅ PASSED\n'); passed++; }
    catch (e) { console.log('❌ FAILED:', e.message, '\n'); }
  }

  await asyncTest('/config returns features with employees boolean', async () => {
    const res = await fetch(`${API_BASE}/config`);
    if (!res.ok) throw new Error('HTTP error');
    const json = await res.json();
    if (!json.features || typeof json.features.employees !== 'boolean') {
      throw new Error('Missing employees boolean');
    }
  });

  console.log('📊 Test Summary:');
  console.log(`Tests passed: ${passed}/${total}`);
  if (passed !== total) process.exit(1);
}

run().catch(e => { console.error('Test runner failed:', e); process.exit(1); });
