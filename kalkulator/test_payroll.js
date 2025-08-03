// Test script for payroll functionality
// Run this in the browser console after the app has loaded

function testPayrollFunctionality() {
    console.log('=== Testing Payroll Functionality ===');
    
    // Test 1: Check if payroll day setting is loaded correctly
    console.log('1. Payroll day setting:', app.payrollDay);
    
    // Test 2: Test previous month salary calculation
    console.log('2. Previous month salary calculation:');
    const prevSalary = app.calculatePreviousMonthSalary();
    console.log('   Previous month salary:', prevSalary);
    
    // Test 3: Test next payroll date calculation
    console.log('3. Next payroll date calculation:');
    const nextPayrollDate = app.getNextPayrollDate();
    console.log('   Next payroll date:', nextPayrollDate);
    
    // Test 4: Test payroll countdown
    console.log('4. Payroll countdown:');
    const countdown = app.calculatePayrollCountdown();
    console.log('   Countdown text:', countdown);
    
    // Test 5: Check if Next Payroll card is visible
    console.log('5. Next Payroll card visibility:');
    const payrollCard = document.getElementById('nextPayrollCard');
    console.log('   Card element exists:', !!payrollCard);
    console.log('   Card display style:', payrollCard ? payrollCard.style.display : 'N/A');
    
    // Test 6: Test with different payroll day values
    console.log('6. Testing different payroll day values:');
    const originalPayrollDay = app.payrollDay;
    
    [1, 15, 31].forEach(day => {
        app.payrollDay = day;
        const testDate = app.getNextPayrollDate();
        const testCountdown = app.calculatePayrollCountdown();
        console.log(`   Day ${day}: ${testDate.toDateString()} (${testCountdown})`);
    });
    
    // Restore original payroll day
    app.payrollDay = originalPayrollDay;
    
    console.log('=== Payroll Test Complete ===');
}

// Function to add test shifts for previous month
function addTestShiftsForPreviousMonth() {
    console.log('=== Adding Test Shifts for Previous Month ===');
    
    const now = new Date();
    let prevMonth = now.getMonth(); // 0-based
    let prevYear = now.getFullYear();
    
    if (prevMonth === 0) {
        prevMonth = 11; // December
        prevYear = prevYear - 1;
    } else {
        prevMonth = prevMonth - 1;
    }
    
    // Create test shifts for previous month
    const testShifts = [
        {
            id: 'test-1',
            date: new Date(prevYear, prevMonth, 5),
            startTime: '09:00',
            endTime: '17:00',
            type: 0, // weekday
            seriesId: null
        },
        {
            id: 'test-2',
            date: new Date(prevYear, prevMonth, 12),
            startTime: '10:00',
            endTime: '18:00',
            type: 0, // weekday
            seriesId: null
        },
        {
            id: 'test-3',
            date: new Date(prevYear, prevMonth, 19),
            startTime: '08:00',
            endTime: '16:00',
            type: 1, // saturday
            seriesId: null
        }
    ];
    
    // Add test shifts to app
    testShifts.forEach(shift => {
        app.shifts.push(shift);
    });
    
    console.log(`Added ${testShifts.length} test shifts for ${app.MONTHS[prevMonth]} ${prevYear}`);
    
    // Update display to show the payroll card
    app.updateDisplay();
    
    console.log('=== Test Shifts Added ===');
}

// Function to remove test shifts
function removeTestShifts() {
    console.log('=== Removing Test Shifts ===');
    
    const originalLength = app.shifts.length;
    app.shifts = app.shifts.filter(shift => !shift.id.startsWith('test-'));
    const newLength = app.shifts.length;
    
    console.log(`Removed ${originalLength - newLength} test shifts`);
    
    // Update display
    app.updateDisplay();
    
    console.log('=== Test Shifts Removed ===');
}

console.log('Payroll test functions loaded. Use:');
console.log('- testPayrollFunctionality() to test calculations');
console.log('- addTestShiftsForPreviousMonth() to add test data');
console.log('- removeTestShifts() to clean up test data');
