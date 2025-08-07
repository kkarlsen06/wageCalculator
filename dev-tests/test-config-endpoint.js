// Test the /config endpoint
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5173';

async function testConfigEndpoint() {
    console.log('🧪 Testing /config endpoint...\n');
    
    try {
        console.log('📡 Calling /config...');
        const response = await fetch(`${API_BASE}/config`);
        
        console.log('📊 Response Status:', response.status);
        console.log('📊 Response Status Text:', response.statusText);
        
        const config = await response.json();
        console.log('📊 Response Body:', JSON.stringify(config, null, 2));
        
        // Validate response structure
        if (!config.features) {
            throw new Error('Missing features object');
        }
        
        if (typeof config.features.employees !== 'boolean') {
            throw new Error('employees feature flag should be boolean');
        }
        
        console.log('✅ Config endpoint working correctly');
        console.log(`✅ Employees feature flag: ${config.features.employees}`);
        
        return true;
    } catch (error) {
        console.log('❌ Config endpoint test failed:', error.message);
        return false;
    }
}

testConfigEndpoint().then(success => {
    if (success) {
        console.log('\n🎉 Config endpoint test passed!');
    } else {
        console.log('\n🚨 Config endpoint test failed!');
        process.exit(1);
    }
}).catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
});
