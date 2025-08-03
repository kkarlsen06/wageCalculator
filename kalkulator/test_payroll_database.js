// Test script for payroll day database functionality
// Run this in the browser console after the app has loaded

async function testPayrollDatabaseFunctionality() {
    console.log('=== Testing Payroll Day Database Functionality ===');
    
    try {
        // Check if user is logged in
        const { data: { user } } = await window.supa.auth.getUser();
        if (!user) {
            console.error('❌ No user logged in. Please log in first.');
            return;
        }
        
        console.log('✅ User logged in:', user.email);
        
        // Test 1: Check current payroll day setting
        console.log('\n1. Current payroll day setting:');
        console.log('   App state:', app.payrollDay);
        
        // Test 2: Load current settings from database
        console.log('\n2. Loading current settings from database:');
        const { data: currentSettings, error: loadError } = await window.supa
            .from('user_settings')
            .select('payroll_day, tax_deduction_enabled, tax_percentage')
            .eq('user_id', user.id)
            .single();
            
        if (loadError) {
            console.error('   ❌ Error loading settings:', loadError);
        } else {
            console.log('   ✅ Database values:');
            console.log('      payroll_day:', currentSettings?.payroll_day);
            console.log('      tax_deduction_enabled:', currentSettings?.tax_deduction_enabled);
            console.log('      tax_percentage:', currentSettings?.tax_percentage);
        }
        
        // Test 3: Test saving different payroll day values
        console.log('\n3. Testing save functionality:');
        const testValues = [1, 15, 31];
        
        for (const testValue of testValues) {
            console.log(`   Testing payroll day: ${testValue}`);
            
            // Update app state
            const originalValue = app.payrollDay;
            app.payrollDay = testValue;
            
            // Save to database
            await app.saveSettingsToSupabase();
            
            // Wait a moment for the save to complete
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Verify the save
            const { data: savedSettings, error: saveError } = await window.supa
                .from('user_settings')
                .select('payroll_day')
                .eq('user_id', user.id)
                .single();
                
            if (saveError) {
                console.error(`   ❌ Error verifying save for ${testValue}:`, saveError);
            } else if (savedSettings.payroll_day === testValue) {
                console.log(`   ✅ Successfully saved and verified: ${testValue}`);
            } else {
                console.error(`   ❌ Save verification failed. Expected: ${testValue}, Got: ${savedSettings.payroll_day}`);
            }
            
            // Restore original value
            app.payrollDay = originalValue;
        }
        
        // Test 4: Test loading functionality
        console.log('\n4. Testing load functionality:');
        
        // Set a test value in database directly
        const testPayrollDay = 25;
        const { error: directSaveError } = await window.supa
            .from('user_settings')
            .upsert({
                user_id: user.id,
                payroll_day: testPayrollDay,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });
            
        if (directSaveError) {
            console.error('   ❌ Error setting test value:', directSaveError);
        } else {
            console.log(`   ✅ Set test value in database: ${testPayrollDay}`);
            
            // Load settings using app function
            await app.loadFromSupabase();
            
            if (app.payrollDay === testPayrollDay) {
                console.log(`   ✅ Successfully loaded from database: ${app.payrollDay}`);
            } else {
                console.error(`   ❌ Load failed. Expected: ${testPayrollDay}, Got: ${app.payrollDay}`);
            }
        }
        
        // Test 5: Test UI update functionality
        console.log('\n5. Testing UI update functionality:');
        app.updateSettingsUI();
        
        const payrollDayInput = document.getElementById('payrollDayInput');
        if (payrollDayInput) {
            console.log('   ✅ Payroll day input found');
            console.log('   Input value:', payrollDayInput.value);
            console.log('   App state:', app.payrollDay);
            
            if (parseInt(payrollDayInput.value) === app.payrollDay) {
                console.log('   ✅ UI and app state are synchronized');
            } else {
                console.error('   ❌ UI and app state are not synchronized');
            }
        } else {
            console.error('   ❌ Payroll day input not found in DOM');
        }
        
        // Test 6: Test validation
        console.log('\n6. Testing validation:');
        const invalidValues = [0, 32, -1, 'invalid'];
        
        for (const invalidValue of invalidValues) {
            console.log(`   Testing invalid value: ${invalidValue}`);
            app.updatePayrollDay(invalidValue);
            
            if (app.payrollDay >= 1 && app.payrollDay <= 31) {
                console.log(`   ✅ Invalid value rejected, current value: ${app.payrollDay}`);
            } else {
                console.error(`   ❌ Invalid value accepted: ${app.payrollDay}`);
            }
        }
        
        // Restore original settings
        console.log('\n7. Restoring original settings...');
        if (currentSettings) {
            app.payrollDay = currentSettings.payroll_day || 15;
            await app.saveSettingsToSupabase();
            app.updateSettingsUI();
            console.log('   ✅ Original settings restored');
        }
        
        console.log('\n=== Payroll Day Database Test Complete ===');
        
    } catch (error) {
        console.error('❌ Test failed with error:', error);
    }
}

// Function to check database schema
async function checkPayrollDayColumn() {
    console.log('=== Checking Payroll Day Column Schema ===');
    
    try {
        // Try to query the column directly
        const { data, error } = await window.supa
            .from('user_settings')
            .select('payroll_day')
            .limit(1);
            
        if (error) {
            if (error.message.includes('column "payroll_day" does not exist')) {
                console.error('❌ payroll_day column does not exist in user_settings table');
                console.log('📋 Please run the SQL commands in database_schema_update.sql');
                return false;
            } else {
                console.error('❌ Error checking column:', error);
                return false;
            }
        } else {
            console.log('✅ payroll_day column exists and is accessible');
            return true;
        }
    } catch (error) {
        console.error('❌ Error checking schema:', error);
        return false;
    }
}

console.log('Payroll database test functions loaded. Use:');
console.log('- checkPayrollDayColumn() to verify the database column exists');
console.log('- testPayrollDatabaseFunctionality() to run comprehensive tests');
