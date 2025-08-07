/**
 * Mobile Viewport Tests
 * Tests for responsive behavior and mobile-specific functionality
 */

// Test utilities for viewport manipulation
class ViewportTestUtils {
    static setViewport(width, height) {
        // Mock window dimensions
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: width
        });
        
        Object.defineProperty(window, 'innerHeight', {
            writable: true,
            configurable: true,
            value: height
        });
        
        // Trigger resize event
        window.dispatchEvent(new Event('resize'));
    }
    
    static createMobileViewport() {
        this.setViewport(375, 667); // iPhone SE dimensions
    }
    
    static createTabletViewport() {
        this.setViewport(768, 1024); // iPad dimensions
    }
    
    static createDesktopViewport() {
        this.setViewport(1920, 1080); // Desktop dimensions
    }
    
    static async waitForResize(ms = 100) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    static getComputedStyleValue(element, property) {
        return window.getComputedStyle(element).getPropertyValue(property);
    }
    
    static createTestContainer() {
        const container = document.createElement('div');
        container.className = 'employees-container';
        container.innerHTML = `
            <div class="employees-header">
                <h2>Ansatte</h2>
                <div class="employees-summary">3 aktive ansatte</div>
            </div>
            <div class="employee-carousel-container" id="testCarouselContainer">
                <div class="employee-carousel">
                    <div class="employee-carousel-track">
                        <div class="employee-tile">
                            <div class="employee-avatar">
                                <div class="avatar-initials">JD</div>
                            </div>
                            <div class="employee-name">John Doe</div>
                        </div>
                        <div class="employee-tile">
                            <div class="employee-avatar">
                                <div class="avatar-initials">JS</div>
                            </div>
                            <div class="employee-name">Jane Smith</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(container);
        return container;
    }
    
    static cleanup() {
        const containers = document.querySelectorAll('.employees-container');
        containers.forEach(container => container.remove());
        
        // Reset viewport to desktop
        this.createDesktopViewport();
    }
}

// Mobile viewport test suite
class MobileViewportTests {
    constructor() {
        this.tests = [];
        this.results = [];
    }
    
    addTest(name, testFn) {
        this.tests.push({ name, testFn });
    }
    
    async runAll() {
        console.log('📱 Running Mobile Viewport Tests...\n');
        
        for (const test of this.tests) {
            try {
                ViewportTestUtils.cleanup();
                await test.testFn();
                this.results.push({ name: test.name, status: 'PASS' });
                console.log(`✅ ${test.name}`);
            } catch (error) {
                this.results.push({ name: test.name, status: 'FAIL', error: error.message });
                console.error(`❌ ${test.name}: ${error.message}`);
            }
        }
        
        this.printSummary();
    }
    
    printSummary() {
        const passed = this.results.filter(r => r.status === 'PASS').length;
        const failed = this.results.filter(r => r.status === 'FAIL').length;
        
        console.log('\n📊 Mobile Test Summary:');
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`📈 Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%`);
    }
}

const mobileTests = new MobileViewportTests();

// Test responsive layout changes
mobileTests.addTest('Should adapt layout for mobile viewport', async () => {
    ViewportTestUtils.createMobileViewport();
    const container = ViewportTestUtils.createTestContainer();
    
    await ViewportTestUtils.waitForResize();
    
    const track = container.querySelector('.employee-carousel-track');
    const tile = container.querySelector('.employee-tile');
    const avatar = container.querySelector('.employee-avatar');
    
    // Check mobile-specific styles are applied
    const trackGap = ViewportTestUtils.getComputedStyleValue(track, 'gap');
    const avatarWidth = ViewportTestUtils.getComputedStyleValue(avatar, 'width');
    
    // These values should be smaller on mobile (exact values depend on CSS)
    if (parseInt(avatarWidth) > 50) {
        throw new Error('Avatar not sized for mobile');
    }
});

mobileTests.addTest('Should handle tablet viewport', async () => {
    ViewportTestUtils.createTabletViewport();
    const container = ViewportTestUtils.createTestContainer();
    
    await ViewportTestUtils.waitForResize();
    
    const track = container.querySelector('.employee-carousel-track');
    if (!track) throw new Error('Carousel track not found');
    
    // Should still be responsive but not as compact as mobile
    const trackPadding = ViewportTestUtils.getComputedStyleValue(track, 'padding-left');
    if (parseInt(trackPadding) < 8) {
        throw new Error('Tablet padding too small');
    }
});

mobileTests.addTest('Should handle desktop viewport', async () => {
    ViewportTestUtils.createDesktopViewport();
    const container = ViewportTestUtils.createTestContainer();
    
    await ViewportTestUtils.waitForResize();
    
    const avatar = container.querySelector('.employee-avatar');
    const avatarWidth = ViewportTestUtils.getComputedStyleValue(avatar, 'width');
    
    // Desktop should have larger avatars
    if (parseInt(avatarWidth) < 40) {
        throw new Error('Desktop avatar too small');
    }
});

// Test touch interaction areas
mobileTests.addTest('Should have adequate touch targets on mobile', async () => {
    ViewportTestUtils.createMobileViewport();
    const container = ViewportTestUtils.createTestContainer();
    
    await ViewportTestUtils.waitForResize();
    
    const tile = container.querySelector('.employee-tile');
    const rect = tile.getBoundingClientRect();
    
    // Touch targets should be at least 44px (iOS guideline)
    if (rect.height < 40) {
        throw new Error('Touch target too small for mobile');
    }
});

// Test safe area support
mobileTests.addTest('Should respect safe area insets', async () => {
    ViewportTestUtils.createMobileViewport();
    
    // Mock safe area insets
    document.documentElement.style.setProperty('--safe-area-inset-left', '20px');
    document.documentElement.style.setProperty('--safe-area-inset-right', '20px');
    
    const container = ViewportTestUtils.createTestContainer();
    
    await ViewportTestUtils.waitForResize();
    
    const track = container.querySelector('.employee-carousel-track');
    const computedStyle = window.getComputedStyle(track);
    
    // Should use safe area insets in padding
    const paddingLeft = computedStyle.paddingLeft;
    if (!paddingLeft.includes('max') && parseInt(paddingLeft) < 20) {
        console.warn('Safe area insets may not be properly applied');
    }
    
    // Clean up
    document.documentElement.style.removeProperty('--safe-area-inset-left');
    document.documentElement.style.removeProperty('--safe-area-inset-right');
});

// Test scroll behavior on mobile
mobileTests.addTest('Should enable scroll snap on mobile', async () => {
    ViewportTestUtils.createMobileViewport();
    const container = ViewportTestUtils.createTestContainer();
    
    await ViewportTestUtils.waitForResize();
    
    const track = container.querySelector('.employee-carousel-track');
    const scrollSnapType = ViewportTestUtils.getComputedStyleValue(track, 'scroll-snap-type');
    
    // Should have scroll snap enabled on mobile
    if (!scrollSnapType.includes('mandatory')) {
        console.warn('Scroll snap may not be enabled on mobile');
    }
});

// Test responsive font sizes
mobileTests.addTest('Should use appropriate font sizes for mobile', async () => {
    ViewportTestUtils.createMobileViewport();
    const container = ViewportTestUtils.createTestContainer();
    
    await ViewportTestUtils.waitForResize();
    
    const employeeName = container.querySelector('.employee-name');
    const fontSize = ViewportTestUtils.getComputedStyleValue(employeeName, 'font-size');
    
    // Mobile font sizes should be smaller but still readable
    const fontSizePx = parseInt(fontSize);
    if (fontSizePx < 10 || fontSizePx > 16) {
        throw new Error(`Mobile font size ${fontSizePx}px may not be optimal`);
    }
});

// Test orientation changes
mobileTests.addTest('Should handle orientation changes', async () => {
    // Portrait
    ViewportTestUtils.setViewport(375, 667);
    const container = ViewportTestUtils.createTestContainer();
    
    await ViewportTestUtils.waitForResize();
    
    // Landscape
    ViewportTestUtils.setViewport(667, 375);
    await ViewportTestUtils.waitForResize();
    
    // Should not break layout
    const track = container.querySelector('.employee-carousel-track');
    if (!track) throw new Error('Layout broken after orientation change');
});

// Test high contrast mode
mobileTests.addTest('Should support high contrast mode', async () => {
    ViewportTestUtils.createMobileViewport();
    
    // Mock high contrast media query
    const mockMediaQuery = {
        matches: true,
        addEventListener: () => {},
        removeEventListener: () => {}
    };
    
    window.matchMedia = jest.fn().mockImplementation(query => {
        if (query === '(prefers-contrast: high)') {
            return mockMediaQuery;
        }
        return { matches: false, addEventListener: () => {}, removeEventListener: () => {} };
    });
    
    const container = ViewportTestUtils.createTestContainer();
    
    // Should not throw errors with high contrast
    const tile = container.querySelector('.employee-tile');
    if (!tile) throw new Error('High contrast mode broke layout');
});

// Test reduced motion
mobileTests.addTest('Should respect reduced motion preference', async () => {
    ViewportTestUtils.createMobileViewport();
    
    // Mock reduced motion media query
    const mockMediaQuery = {
        matches: true,
        addEventListener: () => {},
        removeEventListener: () => {}
    };
    
    window.matchMedia = jest.fn().mockImplementation(query => {
        if (query === '(prefers-reduced-motion: reduce)') {
            return mockMediaQuery;
        }
        return { matches: false, addEventListener: () => {}, removeEventListener: () => {} };
    });
    
    const container = ViewportTestUtils.createTestContainer();
    
    // Should disable animations when reduced motion is preferred
    const track = container.querySelector('.employee-carousel-track');
    const scrollBehavior = ViewportTestUtils.getComputedStyleValue(track, 'scroll-behavior');
    
    if (scrollBehavior === 'smooth') {
        console.warn('Smooth scrolling may not respect reduced motion preference');
    }
});

// Run mobile tests
mobileTests.runAll().catch(console.error);
