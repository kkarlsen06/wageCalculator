// Integration tests for /health/employees endpoint
import 'dotenv/config';

// Test configuration
const API_BASE = process.env.NODE_ENV === 'production' 
    ? 'https://wagecalculator-gbpd.onrender.com'
    : 'http://localhost:5173';

console.log('🧪 Testing /health/employees endpoint...\n');
console.log('API Base:', API_BASE);

async function testHealthEndpoint() {
    try {
        console.log('📡 Calling /health/employees...');
        
        const response = await fetch(`${API_BASE}/health/employees`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('📊 Response Status:', response.status);
        console.log('📊 Response Status Text:', response.statusText);

        const healthData = await response.json();
        console.log('📊 Response Body:', JSON.stringify(healthData, null, 2));

        // Test response structure
        console.log('\n🔍 Validating response structure...');
        
        const requiredFields = ['timestamp', 'status', 'checks'];
        const missingFields = requiredFields.filter(field => !(field in healthData));
        
        if (missingFields.length > 0) {
            console.log('❌ Missing required fields:', missingFields);
            return false;
        }
        console.log('✅ All required fields present');

        // Test timestamp format
        const timestamp = new Date(healthData.timestamp);
        if (isNaN(timestamp.getTime())) {
            console.log('❌ Invalid timestamp format');
            return false;
        }
        console.log('✅ Valid timestamp format');

        // Test status values
        const validStatuses = ['healthy', 'degraded', 'unhealthy'];
        if (!validStatuses.includes(healthData.status)) {
            console.log('❌ Invalid status value:', healthData.status);
            return false;
        }
        console.log('✅ Valid status value:', healthData.status);

        // Test individual checks
        console.log('\n🔍 Validating individual health checks...');
        
        const expectedChecks = [
            'employees_rls',
            'user_shifts_rls', 
            'employee_id_fk',
            'employee_avatars_bucket'
        ];

        for (const checkName of expectedChecks) {
            if (!(checkName in healthData.checks)) {
                console.log(`❌ Missing health check: ${checkName}`);
                return false;
            }

            const check = healthData.checks[checkName];
            
            // Validate check structure
            if (!check.status) {
                console.log(`❌ ${checkName}: Missing status field`);
                return false;
            }

            const validCheckStatuses = ['ok', 'error', 'missing'];
            if (!validCheckStatuses.includes(check.status)) {
                console.log(`❌ ${checkName}: Invalid status value: ${check.status}`);
                return false;
            }

            console.log(`✅ ${checkName}: ${check.status}`);
            
            // Log additional details
            if (check.error) {
                console.log(`   ⚠️  Error: ${check.error}`);
            }
            if (check.enabled !== undefined) {
                console.log(`   ℹ️  Enabled: ${check.enabled}`);
            }
            if (check.exists !== undefined) {
                console.log(`   ℹ️  Exists: ${check.exists}`);
            }
        }

        // Test RLS checks specifically
        console.log('\n🔍 Validating RLS checks...');
        
        const rlsChecks = ['employees_rls', 'user_shifts_rls'];
        for (const rlsCheck of rlsChecks) {
            const check = healthData.checks[rlsCheck];
            if (check.status === 'ok' && !check.enabled) {
                console.log(`⚠️  ${rlsCheck}: Status is OK but RLS not enabled`);
            } else if (check.status === 'ok' && check.enabled) {
                console.log(`✅ ${rlsCheck}: RLS properly enabled`);
            }
        }

        // Test FK constraint check
        console.log('\n🔍 Validating FK constraint check...');
        const fkCheck = healthData.checks.employee_id_fk;
        if (fkCheck.status === 'ok') {
            if (fkCheck.exists && fkCheck.on_delete_action === 'SET NULL') {
                console.log('✅ FK constraint: Properly configured with ON DELETE SET NULL');
            } else {
                console.log('⚠️  FK constraint: Exists but may not have correct ON DELETE action');
            }
        }

        // Test bucket check
        console.log('\n🔍 Validating bucket check...');
        const bucketCheck = healthData.checks.employee_avatars_bucket;
        if (bucketCheck.status === 'ok' && bucketCheck.exists) {
            console.log('✅ Employee avatars bucket: Exists and accessible');
        } else if (bucketCheck.status === 'missing') {
            console.log('⚠️  Employee avatars bucket: Missing (may need to be created)');
        }

        // Overall assessment
        console.log('\n📋 Overall Assessment:');
        const errorCount = Object.values(healthData.checks).filter(check => check.status === 'error').length;
        const missingCount = Object.values(healthData.checks).filter(check => check.status === 'missing').length;
        
        console.log(`   Errors: ${errorCount}`);
        console.log(`   Missing: ${missingCount}`);
        console.log(`   Overall Status: ${healthData.status}`);

        if (healthData.status === 'healthy') {
            console.log('🎉 All systems operational!');
        } else if (healthData.status === 'degraded') {
            console.log('⚠️  Some components missing but system functional');
        } else {
            console.log('🚨 System has critical issues');
        }

        return true;

    } catch (error) {
        console.log('❌ Test failed with error:', error.message);
        console.log('Stack trace:', error.stack);
        return false;
    }
}

async function testHealthEndpointErrorHandling() {
    console.log('\n🧪 Testing error handling...');
    
    try {
        // Test with invalid endpoint
        const response = await fetch(`${API_BASE}/health/nonexistent`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('📊 Invalid endpoint status:', response.status);
        
        if (response.status === 404) {
            console.log('✅ Correctly returns 404 for invalid endpoint');
        } else {
            console.log('⚠️  Unexpected status for invalid endpoint');
        }

    } catch (error) {
        console.log('❌ Error handling test failed:', error.message);
    }
}

async function runAllTests() {
    console.log('🚀 Starting health endpoint integration tests...\n');
    
    const mainTestResult = await testHealthEndpoint();
    await testHealthEndpointErrorHandling();
    
    console.log('\n📊 Test Summary:');
    console.log(`Main health test: ${mainTestResult ? '✅ PASSED' : '❌ FAILED'}`);
    
    if (mainTestResult) {
        console.log('\n🎉 All integration tests completed successfully!');
        console.log('\n💡 Next steps:');
        console.log('   1. Verify RLS policies are properly configured');
        console.log('   2. Ensure FK constraints have ON DELETE SET NULL');
        console.log('   3. Create employee-avatars bucket if missing');
        console.log('   4. Monitor health endpoint in production');
    } else {
        console.log('\n🚨 Integration tests failed - check server logs');
    }
}

// Run tests
runAllTests().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
});
