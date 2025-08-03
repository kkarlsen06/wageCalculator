// Comprehensive test script for the complete Next Payroll card implementation
// Run this in the browser console after the app has loaded

async function testCompletePayrollImplementation() {
    console.log('=== Comprehensive Next Payroll Card Test ===');
    
    try {
        // Check if user is logged in
        const { data: { user } } = await window.supa.auth.getUser();
        if (!user) {
            console.error('❌ No user logged in. Please log in first.');
            return;
        }
        
        console.log('✅ User logged in:', user.email);
        
        // Test 1: HTML Structure
        console.log('\n1. Testing HTML Structure:');
        const payrollCard = document.getElementById('nextPayrollCard');
        const payrollContent = document.getElementById('nextPayrollContent');
        
        console.log('   Payroll card element:', !!payrollCard);
        console.log('   Payroll content element:', !!payrollContent);
        
        if (payrollCard && payrollContent) {
            console.log('   ✅ HTML structure is correct');
            
            // Check positioning relative to other elements
            const weeklyHoursChart = document.getElementById('weeklyHoursChart');
            const monthNav = document.querySelector('.dashboard-month-nav');
            
            if (weeklyHoursChart && monthNav) {
                const chartRect = weeklyHoursChart.getBoundingClientRect();
                const payrollRect = payrollCard.getBoundingClientRect();
                const navRect = monthNav.getBoundingClientRect();
                
                if (payrollRect.top > chartRect.bottom && payrollRect.bottom < navRect.top) {
                    console.log('   ✅ Card is positioned correctly between stats card and month navigation');
                } else {
                    console.log('   ⚠️  Card positioning may need adjustment');
                    console.log('      Chart bottom:', chartRect.bottom);
                    console.log('      Payroll top:', payrollRect.top);
                    console.log('      Payroll bottom:', payrollRect.bottom);
                    console.log('      Nav top:', navRect.top);
                }
            }
        } else {
            console.error('   ❌ HTML structure is missing');
        }
        
        // Test 2: CSS Styling
        console.log('\n2. Testing CSS Styling:');
        if (payrollCard) {
            const computedStyle = window.getComputedStyle(payrollCard);
            console.log('   Display:', computedStyle.display);
            console.log('   Position:', computedStyle.position);
            console.log('   Background:', computedStyle.background);
            
            // Check if CSS classes exist
            const hasPayrollCardClass = document.querySelector('.next-payroll-card') !== null;
            const hasPayrollItemClass = document.querySelector('.payroll-item') !== null;
            
            console.log('   .next-payroll-card class exists:', hasPayrollCardClass);
            console.log('   .payroll-item class exists:', hasPayrollItemClass);
            
            if (hasPayrollCardClass && hasPayrollItemClass) {
                console.log('   ✅ CSS classes are properly defined');
            } else {
                console.error('   ❌ Some CSS classes are missing');
            }
        }
        
        // Test 3: Settings Integration
        console.log('\n3. Testing Settings Integration:');
        const payrollDayInput = document.getElementById('payrollDayInput');
        
        if (payrollDayInput) {
            console.log('   ✅ Payroll day input found in settings');
            console.log('   Current value:', payrollDayInput.value);
            console.log('   App state:', app.payrollDay);
            
            // Test the update function
            const originalValue = app.payrollDay;
            app.updatePayrollDay(20);
            
            if (app.payrollDay === 20) {
                console.log('   ✅ updatePayrollDay function works');
            } else {
                console.error('   ❌ updatePayrollDay function failed');
            }
            
            // Restore original value
            app.updatePayrollDay(originalValue);
        } else {
            console.error('   ❌ Payroll day input not found in settings');
        }
        
        // Test 4: Calculation Functions
        console.log('\n4. Testing Calculation Functions:');
        
        // Test previous month salary calculation
        const prevSalary = app.calculatePreviousMonthSalary();
        console.log('   Previous month salary:', prevSalary);
        
        // Test next payroll date calculation
        const nextPayrollDate = app.getNextPayrollDate();
        console.log('   Next payroll date:', nextPayrollDate.toDateString());
        
        // Test countdown calculation
        const countdown = app.calculatePayrollCountdown();
        console.log('   Payroll countdown:', countdown);
        
        if (typeof prevSalary === 'number' && nextPayrollDate instanceof Date && typeof countdown === 'string') {
            console.log('   ✅ All calculation functions return correct types');
        } else {
            console.error('   ❌ Some calculation functions return incorrect types');
        }
        
        // Test 5: Card Visibility Logic
        console.log('\n5. Testing Card Visibility Logic:');
        
        const shouldShow = app.checkPayrollCardVisibility();
        console.log('   Should show card:', shouldShow);
        console.log('   Current display:', payrollCard ? payrollCard.style.display : 'N/A');
        
        // Test with different viewport sizes (simulate)
        const originalWidth = window.innerWidth;
        const originalHeight = window.innerHeight;
        
        // Simulate small screen
        Object.defineProperty(window, 'innerWidth', { value: 400, configurable: true });
        Object.defineProperty(window, 'innerHeight', { value: 600, configurable: true });
        
        const shouldShowSmall = app.checkPayrollCardVisibility();
        console.log('   Should show on small screen (400x600):', shouldShowSmall);
        
        // Simulate large screen
        Object.defineProperty(window, 'innerWidth', { value: 1200, configurable: true });
        Object.defineProperty(window, 'innerHeight', { value: 900, configurable: true });
        
        const shouldShowLarge = app.checkPayrollCardVisibility();
        console.log('   Should show on large screen (1200x900):', shouldShowLarge);
        
        // Restore original dimensions
        Object.defineProperty(window, 'innerWidth', { value: originalWidth, configurable: true });
        Object.defineProperty(window, 'innerHeight', { value: originalHeight, configurable: true });
        
        // Test 6: Card Content Generation
        console.log('\n6. Testing Card Content Generation:');
        
        // Force update the card
        app.updateNextPayrollCard();
        
        if (payrollContent && payrollContent.innerHTML.trim() !== '') {
            console.log('   ✅ Card content is generated');
            
            // Check for required elements
            const hasPayrollItem = payrollContent.querySelector('.payroll-item') !== null;
            const hasPayrollTitle = payrollContent.querySelector('.payroll-title') !== null;
            const hasPayrollCountdown = payrollContent.querySelector('.payroll-countdown') !== null;
            const hasPayrollAmount = payrollContent.querySelector('.payroll-amount') !== null;
            const hasPayrollPeriod = payrollContent.querySelector('.payroll-period') !== null;
            
            console.log('   Has payroll item:', hasPayrollItem);
            console.log('   Has payroll title:', hasPayrollTitle);
            console.log('   Has payroll countdown:', hasPayrollCountdown);
            console.log('   Has payroll amount:', hasPayrollAmount);
            console.log('   Has payroll period:', hasPayrollPeriod);
            
            if (hasPayrollItem && hasPayrollTitle && hasPayrollCountdown && hasPayrollAmount && hasPayrollPeriod) {
                console.log('   ✅ All required content elements are present');
            } else {
                console.error('   ❌ Some content elements are missing');
            }
        } else {
            console.log('   ⚠️  Card content is empty (may be hidden due to no salary data)');
        }
        
        // Test 7: Responsive Behavior
        console.log('\n7. Testing Responsive Behavior:');
        
        // Check media queries by examining computed styles at different breakpoints
        const testBreakpoints = [
            { width: 360, height: 640, name: 'Small Mobile' },
            { width: 480, height: 800, name: 'Mobile' },
            { width: 768, height: 1024, name: 'Tablet' },
            { width: 1024, height: 768, name: 'Desktop' }
        ];
        
        for (const breakpoint of testBreakpoints) {
            // Simulate viewport
            Object.defineProperty(window, 'innerWidth', { value: breakpoint.width, configurable: true });
            Object.defineProperty(window, 'innerHeight', { value: breakpoint.height, configurable: true });
            
            // Trigger resize event
            window.dispatchEvent(new Event('resize'));
            
            // Wait for any debounced updates
            await new Promise(resolve => setTimeout(resolve, 200));
            
            const visibility = app.checkPayrollCardVisibility();
            console.log(`   ${breakpoint.name} (${breakpoint.width}x${breakpoint.height}): ${visibility ? 'Visible' : 'Hidden'}`);
        }
        
        // Restore original dimensions
        Object.defineProperty(window, 'innerWidth', { value: originalWidth, configurable: true });
        Object.defineProperty(window, 'innerHeight', { value: originalHeight, configurable: true });
        window.dispatchEvent(new Event('resize'));
        
        // Test 8: Integration with updateDisplay
        console.log('\n8. Testing Integration with updateDisplay:');
        
        const originalUpdateNextPayrollCard = app.updateNextPayrollCard;
        let updateNextPayrollCardCalled = false;
        
        app.updateNextPayrollCard = function() {
            updateNextPayrollCardCalled = true;
            return originalUpdateNextPayrollCard.call(this);
        };
        
        app.updateDisplay();
        
        if (updateNextPayrollCardCalled) {
            console.log('   ✅ updateNextPayrollCard is called during updateDisplay');
        } else {
            console.error('   ❌ updateNextPayrollCard is not called during updateDisplay');
        }
        
        // Restore original function
        app.updateNextPayrollCard = originalUpdateNextPayrollCard;
        
        console.log('\n=== Complete Payroll Implementation Test Finished ===');
        console.log('✅ Test completed successfully');
        
    } catch (error) {
        console.error('❌ Test failed with error:', error);
    }
}

// Quick visual test function
function quickVisualTest() {
    console.log('=== Quick Visual Test ===');
    
    const payrollCard = document.getElementById('nextPayrollCard');
    if (payrollCard) {
        // Force show the card for visual inspection
        payrollCard.style.display = 'block';
        payrollCard.style.border = '2px solid red';
        payrollCard.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
        
        console.log('✅ Payroll card is now highlighted in red for visual inspection');
        console.log('   Check the dashboard to see the card positioning');
        
        // Remove highlighting after 5 seconds
        setTimeout(() => {
            payrollCard.style.border = '';
            payrollCard.style.backgroundColor = '';
            console.log('   Highlighting removed');
        }, 5000);
    } else {
        console.error('❌ Payroll card not found');
    }
}

// Test the critical fixes
async function testCriticalFixes() {
    console.log('=== Testing Critical Fixes ===');

    try {
        // Test 1: Database Persistence Fix
        console.log('\n1. Testing Database Persistence Fix:');

        const { data: { user } } = await window.supa.auth.getUser();
        if (!user) {
            console.error('   ❌ No user logged in for database test');
        } else {
            // Test saving payroll day
            const originalPayrollDay = app.payrollDay;
            const testPayrollDay = 22;

            console.log('   Original payroll day:', originalPayrollDay);
            app.updatePayrollDay(testPayrollDay);
            console.log('   Updated to:', app.payrollDay);

            // Wait for save to complete
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Verify in database
            const { data: savedData, error } = await window.supa
                .from('user_settings')
                .select('payroll_day')
                .eq('user_id', user.id)
                .single();

            if (error) {
                console.error('   ❌ Database read error:', error);
            } else if (savedData.payroll_day === testPayrollDay) {
                console.log('   ✅ Database persistence working correctly');
            } else {
                console.error('   ❌ Database persistence failed. Expected:', testPayrollDay, 'Got:', savedData.payroll_day);
            }

            // Restore original value
            app.updatePayrollDay(originalPayrollDay);
        }

        // Test 2: Responsive Positioning Logic
        console.log('\n2. Testing Responsive Positioning Logic:');

        const payrollCard = document.getElementById('nextPayrollCard');
        if (!payrollCard) {
            console.error('   ❌ Payroll card not found');
        } else {
            // Test different viewport sizes
            const testViewports = [
                { width: 375, height: 667, name: 'iPhone SE', expectedClass: 'payroll-card-below-viewport' },
                { width: 414, height: 896, name: 'iPhone 11', expectedClass: 'payroll-card-below-viewport' },
                { width: 768, height: 1024, name: 'iPad Portrait', expectedClass: 'payroll-card-visible' },
                { width: 1024, height: 768, name: 'iPad Landscape', expectedClass: 'payroll-card-visible' },
                { width: 1200, height: 800, name: 'Desktop', expectedClass: 'payroll-card-visible' },
                { width: 375, height: 400, name: 'Mobile Landscape', expectedClass: 'payroll-card-hidden' }
            ];

            const originalWidth = window.innerWidth;
            const originalHeight = window.innerHeight;

            for (const viewport of testViewports) {
                // Simulate viewport
                Object.defineProperty(window, 'innerWidth', { value: viewport.width, configurable: true });
                Object.defineProperty(window, 'innerHeight', { value: viewport.height, configurable: true });

                // Update positioning
                app.applyPayrollCardPositioning(payrollCard);

                // Check if correct class is applied
                const hasExpectedClass = payrollCard.classList.contains(viewport.expectedClass);
                const status = hasExpectedClass ? '✅' : '❌';

                console.log(`   ${status} ${viewport.name} (${viewport.width}x${viewport.height}): ${viewport.expectedClass} ${hasExpectedClass ? 'applied' : 'NOT applied'}`);

                if (!hasExpectedClass) {
                    console.log('      Current classes:', Array.from(payrollCard.classList).join(', '));
                }
            }

            // Restore original dimensions
            Object.defineProperty(window, 'innerWidth', { value: originalWidth, configurable: true });
            Object.defineProperty(window, 'innerHeight', { value: originalHeight, configurable: true });
            app.applyPayrollCardPositioning(payrollCard);
        }

        // Test 3: Space Detection Algorithm
        console.log('\n3. Testing Space Detection Algorithm:');

        const testSpaceDetection = [
            { width: 375, height: 667, name: 'Small Mobile', expectedResult: false },
            { width: 768, height: 1024, name: 'Tablet Portrait', expectedResult: true },
            { width: 1024, height: 768, name: 'Desktop', expectedResult: true },
            { width: 414, height: 736, name: 'Large Mobile', expectedResult: false }
        ];

        for (const test of testSpaceDetection) {
            Object.defineProperty(window, 'innerWidth', { value: test.width, configurable: true });
            Object.defineProperty(window, 'innerHeight', { value: test.height, configurable: true });

            const hasSpace = app.checkAvailableSpaceForPayrollCard();
            const status = hasSpace === test.expectedResult ? '✅' : '❌';

            console.log(`   ${status} ${test.name} (${test.width}x${test.height}): Expected ${test.expectedResult}, Got ${hasSpace}`);
        }

        // Restore original dimensions
        Object.defineProperty(window, 'innerWidth', { value: originalWidth, configurable: true });
        Object.defineProperty(window, 'innerHeight', { value: originalHeight, configurable: true });

        // Test 4: Card Behavior Validation
        console.log('\n4. Testing Card Behavior Validation:');

        // Force update the card
        app.updateNextPayrollCard();

        if (payrollCard) {
            const isVisible = payrollCard.style.display !== 'none';
            const hasPositioningClass = payrollCard.classList.contains('payroll-card-visible') ||
                                      payrollCard.classList.contains('payroll-card-below-viewport') ||
                                      payrollCard.classList.contains('payroll-card-hidden');

            console.log('   Card is visible:', isVisible);
            console.log('   Has positioning class:', hasPositioningClass);
            console.log('   Current classes:', Array.from(payrollCard.classList).join(', '));

            if (isVisible && hasPositioningClass) {
                console.log('   ✅ Card behavior is working correctly');
            } else {
                console.error('   ❌ Card behavior needs attention');
            }
        }

        console.log('\n=== Critical Fixes Test Complete ===');

    } catch (error) {
        console.error('❌ Critical fixes test failed:', error);
    }
}

// Test layout fixes specifically
function testLayoutFixes() {
    console.log('=== Testing Layout Fixes ===');

    const payrollCard = document.getElementById('nextPayrollCard');
    if (!payrollCard) {
        console.error('❌ Payroll card not found');
        return;
    }

    // Test 1: Conservative Space Detection
    console.log('\n1. Testing Conservative Space Detection:');

    const testViewports = [
        { width: 375, height: 667, name: 'iPhone SE', expectedVisible: false },
        { width: 414, height: 896, name: 'iPhone 11', expectedVisible: false },
        { width: 768, height: 1024, name: 'iPad Portrait', expectedVisible: false }, // Should be conservative
        { width: 768, height: 1100, name: 'iPad Portrait Tall', expectedVisible: true },
        { width: 1024, height: 768, name: 'iPad Landscape', expectedVisible: false }, // Should be conservative
        { width: 1200, height: 800, name: 'Desktop', expectedVisible: true },
        { width: 1400, height: 900, name: 'Large Desktop', expectedVisible: true }
    ];

    const originalWidth = window.innerWidth;
    const originalHeight = window.innerHeight;

    for (const viewport of testViewports) {
        Object.defineProperty(window, 'innerWidth', { value: viewport.width, configurable: true });
        Object.defineProperty(window, 'innerHeight', { value: viewport.height, configurable: true });

        const hasSpace = app.checkAvailableSpaceForPayrollCard();
        const status = hasSpace === viewport.expectedVisible ? '✅' : '❌';

        console.log(`   ${status} ${viewport.name} (${viewport.width}x${viewport.height}): Expected ${viewport.expectedVisible}, Got ${hasSpace}`);
    }

    // Restore original dimensions
    Object.defineProperty(window, 'innerWidth', { value: originalWidth, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: originalHeight, configurable: true });

    // Test 2: Document Flow Integration
    console.log('\n2. Testing Document Flow Integration:');

    // Force show the card for testing
    payrollCard.style.display = 'block';
    app.applyPayrollCardPositioning(payrollCard);

    const computedStyle = window.getComputedStyle(payrollCard);
    const position = computedStyle.position;
    const display = computedStyle.display;
    const marginTop = computedStyle.marginTop;
    const marginBottom = computedStyle.marginBottom;

    console.log('   Position:', position);
    console.log('   Display:', display);
    console.log('   Margin Top:', marginTop);
    console.log('   Margin Bottom:', marginBottom);

    if (position === 'static' && display === 'block') {
        console.log('   ✅ Card is properly integrated in document flow');
    } else {
        console.error('   ❌ Card is not properly integrated in document flow');
    }

    // Test 3: Element Spacing and Overlap Detection
    console.log('\n3. Testing Element Spacing and Overlap Detection:');

    const weeklyHoursChart = document.getElementById('weeklyHoursChart');
    const monthNav = document.querySelector('.dashboard-month-nav');
    const shiftsSection = document.querySelector('.shifts-section');

    if (weeklyHoursChart && payrollCard) {
        const chartRect = weeklyHoursChart.getBoundingClientRect();
        const payrollRect = payrollCard.getBoundingClientRect();

        const gap = payrollRect.top - chartRect.bottom;
        console.log(`   Gap between chart and payroll card: ${gap}px`);

        if (gap >= 15) {
            console.log('   ✅ Proper spacing between chart and payroll card');
        } else if (gap >= 0) {
            console.log('   ⚠️  Minimal spacing between chart and payroll card');
        } else {
            console.error('   ❌ Overlap detected between chart and payroll card');
        }
    }

    if (payrollCard && shiftsSection) {
        const payrollRect = payrollCard.getBoundingClientRect();
        const shiftsRect = shiftsSection.getBoundingClientRect();

        const gap = shiftsRect.top - payrollRect.bottom;
        console.log(`   Gap between payroll card and shifts section: ${gap}px`);

        if (gap >= 15) {
            console.log('   ✅ Proper spacing between payroll card and shifts section');
        } else if (gap >= 0) {
            console.log('   ⚠️  Minimal spacing between payroll card and shifts section');
        } else {
            console.error('   ❌ Overlap detected between payroll card and shifts section');
        }
    }

    // Test 4: Z-Index Stacking Order
    console.log('\n4. Testing Z-Index Stacking Order:');

    const payrollZIndex = parseInt(computedStyle.zIndex) || 0;
    console.log('   Payroll card z-index:', payrollZIndex);

    // Check against other elements
    if (monthNav) {
        const monthNavStyle = window.getComputedStyle(monthNav);
        const monthNavZIndex = parseInt(monthNavStyle.zIndex) || 0;
        console.log('   Month nav z-index:', monthNavZIndex);

        if (monthNavZIndex > payrollZIndex) {
            console.log('   ✅ Month navigation is above payroll card');
        } else {
            console.error('   ❌ Month navigation may be below payroll card');
        }
    }

    // Test 5: Responsive Behavior Validation
    console.log('\n5. Testing Responsive Behavior:');

    const testResponsiveViewports = [
        { width: 375, height: 667, name: 'Small Mobile' },
        { width: 768, height: 1024, name: 'Tablet' },
        { width: 1200, height: 800, name: 'Desktop' }
    ];

    for (const viewport of testResponsiveViewports) {
        Object.defineProperty(window, 'innerWidth', { value: viewport.width, configurable: true });
        Object.defineProperty(window, 'innerHeight', { value: viewport.height, configurable: true });

        // Trigger resize and positioning update
        window.dispatchEvent(new Event('resize'));
        await new Promise(resolve => setTimeout(resolve, 200));

        app.applyPayrollCardPositioning(payrollCard);

        const hasVisibleClass = payrollCard.classList.contains('payroll-card-visible');
        const hasBelowViewportClass = payrollCard.classList.contains('payroll-card-below-viewport');
        const hasHiddenClass = payrollCard.classList.contains('payroll-card-hidden');

        console.log(`   ${viewport.name}: visible=${hasVisibleClass}, below=${hasBelowViewportClass}, hidden=${hasHiddenClass}`);

        if (hasVisibleClass || hasBelowViewportClass || hasHiddenClass) {
            console.log(`   ✅ ${viewport.name} has appropriate positioning class`);
        } else {
            console.error(`   ❌ ${viewport.name} missing positioning class`);
        }
    }

    // Restore original dimensions
    Object.defineProperty(window, 'innerWidth', { value: originalWidth, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: originalHeight, configurable: true });
    window.dispatchEvent(new Event('resize'));

    console.log('\n=== Layout Fixes Test Complete ===');
}

// Test with realistic mobile viewport heights accounting for browser nav bars
function testRealisticMobileViewports() {
    console.log('=== Testing Realistic Mobile Viewport Heights ===');

    const payrollCard = document.getElementById('nextPayrollCard');
    if (!payrollCard) {
        console.error('❌ Payroll card not found');
        return;
    }

    // Realistic mobile viewport heights accounting for browser UI
    const realisticViewports = [
        // iPhone SE (actual usable height after browser UI)
        { width: 375, height: 667, usableHeight: 567, name: 'iPhone SE (with browser UI)', expectedVisible: false },
        { width: 375, height: 667, usableHeight: 607, name: 'iPhone SE (minimal browser UI)', expectedVisible: false },

        // iPhone 12/13/14 (actual usable height after browser UI)
        { width: 390, height: 844, usableHeight: 744, name: 'iPhone 12-14 (with browser UI)', expectedVisible: false },
        { width: 390, height: 844, usableHeight: 784, name: 'iPhone 12-14 (minimal browser UI)', expectedVisible: false },

        // iPhone 12/13/14 Pro Max (actual usable height after browser UI)
        { width: 428, height: 926, usableHeight: 826, name: 'iPhone Pro Max (with browser UI)', expectedVisible: false },
        { width: 428, height: 926, usableHeight: 866, name: 'iPhone Pro Max (minimal browser UI)', expectedVisible: false },

        // iPad Mini (actual usable height after browser UI)
        { width: 768, height: 1024, usableHeight: 924, name: 'iPad Mini (with browser UI)', expectedVisible: false },
        { width: 768, height: 1024, usableHeight: 964, name: 'iPad Mini (minimal browser UI)', expectedVisible: false },

        // iPad (actual usable height after browser UI)
        { width: 820, height: 1180, usableHeight: 1080, name: 'iPad (with browser UI)', expectedVisible: false },
        { width: 820, height: 1180, usableHeight: 1120, name: 'iPad (minimal browser UI)', expectedVisible: false },

        // Desktop screens (should still be conservative)
        { width: 1200, height: 800, usableHeight: 780, name: 'Small Desktop', expectedVisible: false },
        { width: 1400, height: 900, usableHeight: 880, name: 'Medium Desktop', expectedVisible: false }, // Should be conservative
        { width: 1600, height: 1000, usableHeight: 980, name: 'Large Desktop', expectedVisible: true }, // Only very large screens
        { width: 1920, height: 1080, usableHeight: 1060, name: 'Full HD Desktop', expectedVisible: true }
    ];

    const originalWidth = window.innerWidth;
    const originalHeight = window.innerHeight;

    console.log('\n1. Testing Space Detection with Realistic Heights:');

    for (const viewport of realisticViewports) {
        // Test with both reported height and usable height
        Object.defineProperty(window, 'innerWidth', { value: viewport.width, configurable: true });
        Object.defineProperty(window, 'innerHeight', { value: viewport.height, configurable: true });

        const hasSpaceReported = app.checkAvailableSpaceForPayrollCard();

        // Test with usable height (accounting for browser UI)
        Object.defineProperty(window, 'innerHeight', { value: viewport.usableHeight, configurable: true });
        const hasSpaceUsable = app.checkAvailableSpaceForPayrollCard();

        const statusReported = hasSpaceReported === viewport.expectedVisible ? '✅' : '❌';
        const statusUsable = hasSpaceUsable === viewport.expectedVisible ? '✅' : '❌';

        console.log(`   ${statusReported} ${viewport.name}:`);
        console.log(`      Reported height (${viewport.height}px): ${hasSpaceReported}`);
        console.log(`      Usable height (${viewport.usableHeight}px): ${hasSpaceUsable}`);
        console.log(`      Expected: ${viewport.expectedVisible}`);
    }

    console.log('\n2. Testing Positioning Classes:');

    for (const viewport of realisticViewports.slice(0, 8)) { // Test first 8 viewports
        Object.defineProperty(window, 'innerWidth', { value: viewport.width, configurable: true });
        Object.defineProperty(window, 'innerHeight', { value: viewport.usableHeight, configurable: true });

        // Clear existing classes
        payrollCard.classList.remove('payroll-card-visible', 'payroll-card-below-viewport', 'payroll-card-hidden');

        // Apply positioning
        app.applyPayrollCardPositioning(payrollCard);

        const hasVisible = payrollCard.classList.contains('payroll-card-visible');
        const hasBelowViewport = payrollCard.classList.contains('payroll-card-below-viewport');
        const hasHidden = payrollCard.classList.contains('payroll-card-hidden');

        console.log(`   ${viewport.name}:`);
        console.log(`      Classes: visible=${hasVisible}, below=${hasBelowViewport}, hidden=${hasHidden}`);

        if (viewport.expectedVisible && hasVisible) {
            console.log('      ✅ Correctly positioned as visible');
        } else if (!viewport.expectedVisible && (hasBelowViewport || hasHidden)) {
            console.log('      ✅ Correctly positioned below viewport or hidden');
        } else {
            console.error('      ❌ Incorrect positioning');
        }
    }

    console.log('\n3. Testing Spacing with Browser UI Constraints:');

    // Test a typical mobile scenario
    Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 744, configurable: true }); // iPhone with browser UI

    payrollCard.style.display = 'block';
    payrollCard.classList.remove('payroll-card-visible', 'payroll-card-below-viewport', 'payroll-card-hidden');
    payrollCard.classList.add('payroll-card-below-viewport');

    const computedStyle = window.getComputedStyle(payrollCard);
    const marginTop = parseInt(computedStyle.marginTop);
    const marginBottom = parseInt(computedStyle.marginBottom);

    console.log(`   Mobile spacing (390x744 with browser UI):`);
    console.log(`      Margin top: ${marginTop}px`);
    console.log(`      Margin bottom: ${marginBottom}px`);

    if (marginTop >= 25 && marginBottom >= 35) {
        console.log('      ✅ Adequate spacing for mobile with browser UI');
    } else {
        console.error('      ❌ Insufficient spacing for mobile with browser UI');
    }

    // Restore original dimensions
    Object.defineProperty(window, 'innerWidth', { value: originalWidth, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: originalHeight, configurable: true });

    console.log('\n=== Realistic Mobile Viewport Test Complete ===');
}

// Test specifically on large mobile devices to verify no overlaps
function testLargeMobileDevices() {
    console.log('=== Testing Large Mobile Devices for Overlap Issues ===');

    const payrollCard = document.getElementById('nextPayrollCard');
    const shiftsSection = document.querySelector('.shifts-section');
    const monthPicker = document.querySelector('.month-navigation-container');

    if (!payrollCard) {
        console.error('❌ Payroll card not found');
        return;
    }

    // Specific large mobile devices that were problematic
    const largeMobileDevices = [
        { width: 428, height: 926, name: 'iPhone Pro Max', expectedInViewport: false },
        { width: 414, height: 896, name: 'iPhone 11 Pro Max', expectedInViewport: false },
        { width: 430, height: 932, name: 'iPhone 12/13/14 Pro Max', expectedInViewport: false },
        { width: 412, height: 915, name: 'Large Android Phone (Pixel)', expectedInViewport: false },
        { width: 450, height: 900, name: 'Large Android Phone (Samsung)', expectedInViewport: false },
        { width: 768, height: 1024, name: 'iPad Portrait', expectedInViewport: false },
        { width: 820, height: 1180, name: 'iPad Air Portrait', expectedInViewport: false },
        { width: 834, height: 1194, name: 'iPad Pro 11" Portrait', expectedInViewport: false },
        { width: 800, height: 1280, name: 'Medium Tablet Portrait', expectedInViewport: false },
        { width: 900, height: 1200, name: 'Large Tablet Portrait', expectedInViewport: false }
    ];

    const originalWidth = window.innerWidth;
    const originalHeight = window.innerHeight;

    console.log('\n1. Testing Space Detection for Large Mobile Devices:');

    for (const device of largeMobileDevices) {
        Object.defineProperty(window, 'innerWidth', { value: device.width, configurable: true });
        Object.defineProperty(window, 'innerHeight', { value: device.height, configurable: true });

        const hasSpace = app.checkAvailableSpaceForPayrollCard();
        const status = hasSpace === device.expectedInViewport ? '✅' : '❌';

        console.log(`   ${status} ${device.name} (${device.width}x${device.height}): Expected ${device.expectedInViewport}, Got ${hasSpace}`);

        if (hasSpace !== device.expectedInViewport) {
            console.error(`      ❌ CRITICAL: ${device.name} should NEVER show payroll card in viewport!`);
        }
    }

    console.log('\n2. Testing Positioning Classes for Large Mobile Devices:');

    for (const device of largeMobileDevices.slice(0, 6)) { // Test first 6 devices
        Object.defineProperty(window, 'innerWidth', { value: device.width, configurable: true });
        Object.defineProperty(window, 'innerHeight', { value: device.height, configurable: true });

        // Clear existing classes
        payrollCard.classList.remove('payroll-card-visible', 'payroll-card-below-viewport', 'payroll-card-hidden');

        // Apply positioning
        app.applyPayrollCardPositioning(payrollCard);

        const hasVisible = payrollCard.classList.contains('payroll-card-visible');
        const hasBelowViewport = payrollCard.classList.contains('payroll-card-below-viewport');
        const hasHidden = payrollCard.classList.contains('payroll-card-hidden');

        console.log(`   ${device.name}:`);
        console.log(`      Classes: visible=${hasVisible}, below=${hasBelowViewport}, hidden=${hasHidden}`);

        if (hasVisible) {
            console.error(`      ❌ CRITICAL: ${device.name} should NOT have payroll-card-visible class!`);
        } else if (hasBelowViewport || hasHidden) {
            console.log('      ✅ Correctly positioned below viewport or hidden');
        } else {
            console.error('      ❌ Missing positioning class');
        }
    }

    console.log('\n3. Testing Spacing and Overlap Prevention:');

    // Test with a typical large mobile device
    Object.defineProperty(window, 'innerWidth', { value: 428, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 926, configurable: true });

    // Force show payroll card for spacing test
    payrollCard.style.display = 'block';
    payrollCard.classList.remove('payroll-card-visible', 'payroll-card-below-viewport', 'payroll-card-hidden');
    payrollCard.classList.add('payroll-card-below-viewport');

    // Wait for layout to settle
    setTimeout(() => {
        const payrollRect = payrollCard.getBoundingClientRect();

        if (shiftsSection) {
            const shiftsRect = shiftsSection.getBoundingClientRect();
            const gap = shiftsRect.top - payrollRect.bottom;

            console.log(`   iPhone Pro Max spacing test:`);
            console.log(`      Payroll card bottom: ${payrollRect.bottom}px`);
            console.log(`      Shifts section top: ${shiftsRect.top}px`);
            console.log(`      Gap: ${gap}px`);

            if (gap >= 40) {
                console.log('      ✅ Adequate spacing between payroll card and shifts section');
            } else if (gap >= 0) {
                console.log('      ⚠️  Minimal spacing - may need more');
            } else {
                console.error('      ❌ CRITICAL: Overlap detected between payroll card and shifts section!');
            }
        }

        if (monthPicker) {
            const monthPickerRect = monthPicker.getBoundingClientRect();
            const gap = monthPickerRect.top - payrollRect.bottom;

            console.log(`      Month picker top: ${monthPickerRect.top}px`);
            console.log(`      Gap to month picker: ${gap}px`);

            if (gap >= 30) {
                console.log('      ✅ Adequate spacing between payroll card and month picker');
            } else if (gap >= 0) {
                console.log('      ⚠️  Minimal spacing to month picker - may need more');
            } else {
                console.error('      ❌ CRITICAL: Overlap detected between payroll card and month picker!');
            }
        }

        // Test margin values
        const computedStyle = window.getComputedStyle(payrollCard);
        const marginBottom = parseInt(computedStyle.marginBottom);

        console.log(`      Payroll card margin-bottom: ${marginBottom}px`);

        if (marginBottom >= 50) {
            console.log('      ✅ Adequate bottom margin on payroll card');
        } else {
            console.error('      ❌ Insufficient bottom margin on payroll card');
        }

    }, 100);

    // Restore original dimensions
    Object.defineProperty(window, 'innerWidth', { value: originalWidth, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: originalHeight, configurable: true });

    console.log('\n=== Large Mobile Devices Test Complete ===');
}

// Test the new restructured layout
function testNewLayoutStructure() {
    console.log('=== Testing New Layout Structure ===');

    // Test 1: Verify HTML structure order
    console.log('\n1. Testing HTML Structure Order:');

    const totalCard = document.querySelector('.total-card');
    const nextShiftCard = document.querySelector('.next-shift-card');
    const nextPayrollCard = document.querySelector('.next-payroll-card');
    const shiftsSection = document.querySelector('.shift-section');
    const statsCard = document.querySelector('.shifts-section .weekly-hours-chart-card') ||
                     document.querySelector('.shift-section .weekly-hours-chart-card');
    const monthPicker = document.querySelector('.shift-section .month-navigation-container');

    if (!totalCard || !nextShiftCard || !nextPayrollCard || !shiftsSection) {
        console.error('❌ Missing required elements for layout test');
        return;
    }

    // Check order in dashboard
    const dashboardContent = document.querySelector('.dashboard-content');
    if (dashboardContent) {
        const dashboardChildren = Array.from(dashboardContent.children);
        const totalIndex = dashboardChildren.indexOf(totalCard);
        const nextShiftIndex = dashboardChildren.indexOf(nextShiftCard);
        const nextPayrollIndex = dashboardChildren.indexOf(nextPayrollCard);

        console.log('   Dashboard order:');
        console.log(`      Total card index: ${totalIndex}`);
        console.log(`      Next shift card index: ${nextShiftIndex}`);
        console.log(`      Next payroll card index: ${nextPayrollIndex}`);

        if (totalIndex < nextShiftIndex && nextShiftIndex < nextPayrollIndex) {
            console.log('   ✅ Correct dashboard order: Total → Next Shift → Next Payroll');
        } else {
            console.error('   ❌ Incorrect dashboard order');
        }
    }

    // Check shifts section structure
    if (statsCard && monthPicker) {
        const shiftsContainer = statsCard.closest('.app-container');
        const shiftsChildren = Array.from(shiftsContainer.children);
        const statsIndex = shiftsChildren.indexOf(statsCard);
        const monthPickerIndex = shiftsChildren.indexOf(monthPicker);

        console.log('   Shifts section order:');
        console.log(`      Stats card index: ${statsIndex}`);
        console.log(`      Month picker index: ${monthPickerIndex}`);

        if (statsIndex < monthPickerIndex) {
            console.log('   ✅ Correct shifts section order: Stats Card → Month Picker → Shift List');
        } else {
            console.error('   ❌ Incorrect shifts section order');
        }
    } else {
        console.error('   ❌ Stats card or month picker not found in shifts section');
    }

    // Test 2: Verify element positioning and spacing
    console.log('\n2. Testing Element Positioning and Spacing:');

    const totalRect = totalCard.getBoundingClientRect();
    const nextShiftRect = nextShiftCard.getBoundingClientRect();
    const nextPayrollRect = nextPayrollCard.getBoundingClientRect();
    const shiftsRect = shiftsSection.getBoundingClientRect();

    console.log('   Element positions:');
    console.log(`      Total card: top=${totalRect.top}, bottom=${totalRect.bottom}`);
    console.log(`      Next shift card: top=${nextShiftRect.top}, bottom=${nextShiftRect.bottom}`);
    console.log(`      Next payroll card: top=${nextPayrollRect.top}, bottom=${nextPayrollRect.bottom}`);
    console.log(`      Shifts section: top=${shiftsRect.top}, bottom=${shiftsRect.bottom}`);

    // Check spacing between elements
    const shiftToPayrollGap = nextPayrollRect.top - nextShiftRect.bottom;
    const payrollToShiftsGap = shiftsRect.top - nextPayrollRect.bottom;

    console.log('   Spacing:');
    console.log(`      Next shift to payroll gap: ${shiftToPayrollGap}px`);
    console.log(`      Payroll to shifts section gap: ${payrollToShiftsGap}px`);

    if (shiftToPayrollGap >= 20) {
        console.log('   ✅ Adequate spacing between next shift and payroll cards');
    } else {
        console.error('   ❌ Insufficient spacing between next shift and payroll cards');
    }

    if (payrollToShiftsGap >= 40) {
        console.log('   ✅ Adequate spacing between payroll card and shifts section');
    } else {
        console.error('   ❌ Insufficient spacing between payroll card and shifts section');
    }

    // Test 3: Verify stats card and month picker positioning within shifts section
    console.log('\n3. Testing Stats Card and Month Picker in Shifts Section:');

    if (statsCard && monthPicker) {
        const statsRect = statsCard.getBoundingClientRect();
        const monthPickerRect = monthPicker.getBoundingClientRect();

        console.log('   Shifts section internal positioning:');
        console.log(`      Stats card: top=${statsRect.top}, bottom=${statsRect.bottom}`);
        console.log(`      Month picker: top=${monthPickerRect.top}, bottom=${monthPickerRect.bottom}`);

        const statsToMonthGap = monthPickerRect.top - statsRect.bottom;
        console.log(`      Stats to month picker gap: ${statsToMonthGap}px`);

        if (statsToMonthGap >= 15) {
            console.log('   ✅ Adequate spacing between stats card and month picker');
        } else {
            console.error('   ❌ Insufficient spacing between stats card and month picker');
        }

        // Verify stats card is within shifts section
        if (statsRect.top >= shiftsRect.top && statsRect.bottom <= shiftsRect.bottom) {
            console.log('   ✅ Stats card is properly contained within shifts section');
        } else {
            console.error('   ❌ Stats card is not properly contained within shifts section');
        }
    }

    // Test 4: Test responsive behavior
    console.log('\n4. Testing Responsive Behavior:');

    const testViewports = [
        { width: 375, height: 667, name: 'Mobile' },
        { width: 768, height: 1024, name: 'Tablet' },
        { width: 1200, height: 800, name: 'Desktop' }
    ];

    const originalWidth = window.innerWidth;
    const originalHeight = window.innerHeight;

    for (const viewport of testViewports) {
        Object.defineProperty(window, 'innerWidth', { value: viewport.width, configurable: true });
        Object.defineProperty(window, 'innerHeight', { value: viewport.height, configurable: true });

        // Trigger resize
        window.dispatchEvent(new Event('resize'));

        // Wait for layout to settle
        setTimeout(() => {
            const payrollStyle = window.getComputedStyle(nextPayrollCard);
            const marginBottom = parseInt(payrollStyle.marginBottom);

            console.log(`   ${viewport.name} (${viewport.width}x${viewport.height}):`);
            console.log(`      Payroll card margin-bottom: ${marginBottom}px`);

            if (marginBottom >= 35) {
                console.log(`      ✅ Adequate margin on ${viewport.name}`);
            } else {
                console.error(`      ❌ Insufficient margin on ${viewport.name}`);
            }
        }, 100);
    }

    // Restore original dimensions
    Object.defineProperty(window, 'innerWidth', { value: originalWidth, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: originalHeight, configurable: true });
    window.dispatchEvent(new Event('resize'));

    console.log('\n=== New Layout Structure Test Complete ===');
}

// Test visual balance and spacing improvements
function testVisualBalanceAndSpacing() {
    console.log('=== Testing Visual Balance and Spacing Improvements ===');

    const dashboardContent = document.querySelector('.dashboard-content');
    const totalCard = document.querySelector('.total-card');
    const nextShiftCard = document.querySelector('.next-shift-card');
    const nextPayrollCard = document.querySelector('.next-payroll-card');
    const shiftsSection = document.querySelector('.shift-section');
    const statsCard = document.querySelector('.shifts-section .weekly-hours-chart-card') ||
                     document.querySelector('.shift-section .weekly-hours-chart-card');
    const monthPicker = document.querySelector('.shift-section .month-navigation-container');

    if (!dashboardContent || !totalCard || !nextShiftCard || !nextPayrollCard) {
        console.error('❌ Missing required elements for visual balance test');
        return;
    }

    // Test 1: Dashboard Card Spacing Consistency
    console.log('\n1. Testing Dashboard Card Spacing Consistency:');

    const dashboardStyle = window.getComputedStyle(dashboardContent);
    const dashboardGap = parseInt(dashboardStyle.gap);
    const dashboardJustifyContent = dashboardStyle.justifyContent;

    console.log(`   Dashboard gap: ${dashboardGap}px`);
    console.log(`   Dashboard justify-content: ${dashboardJustifyContent}`);

    if (dashboardGap >= 24) {
        console.log('   ✅ Adequate gap between dashboard cards');
    } else {
        console.error('   ❌ Insufficient gap between dashboard cards');
    }

    if (dashboardJustifyContent === 'center') {
        console.log('   ✅ Dashboard content is vertically centered');
    } else {
        console.error('   ❌ Dashboard content is not vertically centered');
    }

    // Test spacing between individual cards
    const totalRect = totalCard.getBoundingClientRect();
    const nextShiftRect = nextShiftCard.getBoundingClientRect();
    const nextPayrollRect = nextPayrollCard.getBoundingClientRect();

    const totalToShiftGap = nextShiftRect.top - totalRect.bottom;
    const shiftToPayrollGap = nextPayrollRect.top - nextShiftRect.bottom;

    console.log(`   Total to Next Shift gap: ${totalToShiftGap}px`);
    console.log(`   Next Shift to Payroll gap: ${shiftToPayrollGap}px`);

    const gapTolerance = 5; // Allow 5px tolerance for rounding
    if (Math.abs(totalToShiftGap - shiftToPayrollGap) <= gapTolerance) {
        console.log('   ✅ Dashboard card spacing is consistent');
    } else {
        console.error('   ❌ Dashboard card spacing is inconsistent');
    }

    // Test 2: Vertical Centering Effectiveness
    console.log('\n2. Testing Vertical Centering:');

    const dashboardRect = dashboardContent.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const headerHeight = 80; // Approximate header height
    const availableHeight = viewportHeight - headerHeight;

    const dashboardTop = dashboardRect.top - headerHeight;
    const dashboardBottom = viewportHeight - dashboardRect.bottom;

    console.log(`   Available height: ${availableHeight}px`);
    console.log(`   Space above dashboard: ${dashboardTop}px`);
    console.log(`   Space below dashboard: ${dashboardBottom}px`);

    const centeringBalance = Math.abs(dashboardTop - dashboardBottom);
    if (centeringBalance <= 50) { // Allow 50px tolerance
        console.log('   ✅ Dashboard content is well-centered vertically');
    } else if (centeringBalance <= 100) {
        console.log('   ⚠️  Dashboard content is approximately centered');
    } else {
        console.error('   ❌ Dashboard content is not properly centered');
    }

    // Test 3: Shifts Section Spacing
    console.log('\n3. Testing Shifts Section Spacing:');

    if (statsCard && monthPicker) {
        const statsRect = statsCard.getBoundingClientRect();
        const monthPickerRect = monthPicker.getBoundingClientRect();

        const statsToMonthGap = monthPickerRect.top - statsRect.bottom;
        console.log(`   Stats card to month picker gap: ${statsToMonthGap}px`);

        if (statsToMonthGap >= 35) {
            console.log('   ✅ Adequate spacing between stats card and month picker');
        } else if (statsToMonthGap >= 25) {
            console.log('   ⚠️  Minimal spacing between stats card and month picker');
        } else {
            console.error('   ❌ Insufficient spacing between stats card and month picker');
        }

        // Check month picker bottom margin
        const monthPickerStyle = window.getComputedStyle(monthPicker);
        const monthPickerMarginBottom = parseInt(monthPickerStyle.marginBottom);

        console.log(`   Month picker margin-bottom: ${monthPickerMarginBottom}px`);

        if (monthPickerMarginBottom >= 30) {
            console.log('   ✅ Adequate spacing after month picker');
        } else {
            console.error('   ❌ Insufficient spacing after month picker');
        }
    } else {
        console.error('   ❌ Stats card or month picker not found in shifts section');
    }

    // Test 4: Responsive Behavior
    console.log('\n4. Testing Responsive Spacing Behavior:');

    const testViewports = [
        { width: 375, height: 667, name: 'Mobile', expectedGap: 20 },
        { width: 768, height: 1024, name: 'Tablet', expectedGap: 24 },
        { width: 1200, height: 800, name: 'Desktop', expectedGap: 28 }
    ];

    const originalWidth = window.innerWidth;
    const originalHeight = window.innerHeight;

    for (const viewport of testViewports) {
        Object.defineProperty(window, 'innerWidth', { value: viewport.width, configurable: true });
        Object.defineProperty(window, 'innerHeight', { value: viewport.height, configurable: true });

        // Trigger resize
        window.dispatchEvent(new Event('resize'));

        // Wait for layout to settle
        setTimeout(() => {
            const updatedDashboardStyle = window.getComputedStyle(dashboardContent);
            const updatedGap = parseInt(updatedDashboardStyle.gap);

            console.log(`   ${viewport.name} (${viewport.width}x${viewport.height}):`);
            console.log(`      Dashboard gap: ${updatedGap}px (expected: ${viewport.expectedGap}px)`);

            if (updatedGap >= viewport.expectedGap - 2) { // Allow 2px tolerance
                console.log(`      ✅ Appropriate spacing for ${viewport.name}`);
            } else {
                console.error(`      ❌ Insufficient spacing for ${viewport.name}`);
            }
        }, 100);
    }

    // Test 5: Payroll Card Positioning Logic Integrity
    console.log('\n5. Testing Payroll Card Positioning Logic Integrity:');

    // Test that payroll card positioning logic still works
    const hasSpace = app.checkAvailableSpaceForPayrollCard();
    console.log(`   Space detection result: ${hasSpace}`);

    // Apply positioning
    app.applyPayrollCardPositioning(nextPayrollCard);

    const hasVisible = nextPayrollCard.classList.contains('payroll-card-visible');
    const hasBelowViewport = nextPayrollCard.classList.contains('payroll-card-below-viewport');
    const hasHidden = nextPayrollCard.classList.contains('payroll-card-hidden');

    console.log(`   Payroll card classes: visible=${hasVisible}, below=${hasBelowViewport}, hidden=${hasHidden}`);

    if (hasVisible || hasBelowViewport || hasHidden) {
        console.log('   ✅ Payroll card positioning logic is working correctly');
    } else {
        console.error('   ❌ Payroll card positioning logic may be broken');
    }

    // Restore original dimensions
    Object.defineProperty(window, 'innerWidth', { value: originalWidth, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: originalHeight, configurable: true });
    window.dispatchEvent(new Event('resize'));

    console.log('\n=== Visual Balance and Spacing Test Complete ===');
}

console.log('Complete payroll test functions loaded. Use:');
console.log('- testCompletePayrollImplementation() for comprehensive testing');
console.log('- testCriticalFixes() for testing the critical fixes');
console.log('- testLayoutFixes() for testing layout and positioning fixes');
console.log('- testRealisticMobileViewports() for testing with realistic mobile heights');
console.log('- testLargeMobileDevices() for testing specific large mobile devices');
console.log('- testNewLayoutStructure() for testing the restructured layout');
console.log('- testVisualBalanceAndSpacing() for testing visual balance and spacing improvements');
console.log('- quickVisualTest() for quick visual verification');
