// Tax Deduction Debug Script
// Run this in the browser console to test tax deduction functionality

console.log('=== TAX DEDUCTION DEBUG SCRIPT ===');

// Function to check current state
function checkTaxDeductionState() {
    console.log('\n--- Current Tax Deduction State ---');
    console.log('App state - taxDeductionEnabled:', app.taxDeductionEnabled);
    console.log('App state - taxPercentage:', app.taxPercentage);
    
    const toggle = document.getElementById('taxDeductionToggle');
    const input = document.getElementById('taxPercentageInput');
    const section = document.getElementById('taxPercentageSection');
    
    console.log('UI Elements:');
    console.log('- Toggle element exists:', !!toggle);
    console.log('- Toggle checked:', toggle?.checked);
    console.log('- Input element exists:', !!input);
    console.log('- Input value:', input?.value);
    console.log('- Section element exists:', !!section);
    console.log('- Section visible:', section?.style.display !== 'none');
}

// Function to test database loading
async function testDatabaseLoad() {
    console.log('\n--- Testing Database Load ---');
    try {
        const { data: { user } } = await window.supa.auth.getUser();
        if (!user) {
            console.log('No user logged in');
            return;
        }
        
        const { data: settings, error } = await window.supa
            .from('user_settings')
            .select('tax_deduction_enabled, tax_percentage')
            .eq('user_id', user.id)
            .single();
            
        if (error) {
            console.error('Database error:', error);
        } else {
            console.log('Database values:');
            console.log('- tax_deduction_enabled:', settings?.tax_deduction_enabled);
            console.log('- tax_percentage:', settings?.tax_percentage);
        }
    } catch (e) {
        console.error('Error testing database load:', e);
    }
}

// Function to test database save
async function testDatabaseSave(enabled = true, percentage = 25.0) {
    console.log('\n--- Testing Database Save ---');
    console.log('Setting values:', { enabled, percentage });
    
    app.taxDeductionEnabled = enabled;
    app.taxPercentage = percentage;
    
    await app.saveSettingsToSupabase();
    console.log('Save completed, checking database...');
    
    // Wait a moment then check
    setTimeout(testDatabaseLoad, 1000);
}

// Function to test UI update
function testUIUpdate() {
    console.log('\n--- Testing UI Update ---');
    app.updateSettingsUI();
    checkTaxDeductionState();
}

// Function to simulate toggle click
function simulateToggleClick() {
    console.log('\n--- Simulating Toggle Click ---');
    const toggle = document.getElementById('taxDeductionToggle');
    if (toggle) {
        toggle.checked = !toggle.checked;
        app.toggleTaxDeduction();
        checkTaxDeductionState();
    } else {
        console.log('Toggle element not found');
    }
}

// Function to simulate percentage change
function simulatePercentageChange(value = 30.0) {
    console.log('\n--- Simulating Percentage Change ---');
    const input = document.getElementById('taxPercentageInput');
    if (input) {
        input.value = value;
        app.updateTaxPercentage(value);
        checkTaxDeductionState();
    } else {
        console.log('Input element not found');
    }
}

// Function to run full test suite
async function runFullTest() {
    console.log('\n=== RUNNING FULL TAX DEDUCTION TEST ===');
    
    console.log('1. Initial state check:');
    checkTaxDeductionState();
    
    console.log('2. Database load test:');
    await testDatabaseLoad();
    
    console.log('3. UI update test:');
    testUIUpdate();
    
    console.log('4. Toggle simulation:');
    simulateToggleClick();
    
    console.log('5. Percentage change simulation:');
    simulatePercentageChange(35.5);
    
    console.log('6. Database save test:');
    await testDatabaseSave(true, 28.5);
    
    console.log('\n=== TEST COMPLETE ===');
    console.log('Check the console output above for any issues.');
}

// Export functions to global scope for easy access
window.taxDebug = {
    checkState: checkTaxDeductionState,
    testLoad: testDatabaseLoad,
    testSave: testDatabaseSave,
    testUI: testUIUpdate,
    simulateToggle: simulateToggleClick,
    simulatePercentage: simulatePercentageChange,
    runFullTest: runFullTest
};

console.log('\nDebug functions available:');
console.log('- taxDebug.checkState() - Check current state');
console.log('- taxDebug.testLoad() - Test database loading');
console.log('- taxDebug.testSave(enabled, percentage) - Test database saving');
console.log('- taxDebug.testUI() - Test UI update');
console.log('- taxDebug.simulateToggle() - Simulate toggle click');
console.log('- taxDebug.simulatePercentage(value) - Simulate percentage change');
console.log('- taxDebug.runFullTest() - Run complete test suite');

console.log('\nTo start debugging, run: taxDebug.runFullTest()');
