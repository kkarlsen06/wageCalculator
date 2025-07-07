// ═══════════════════════════════════════════════════════════════════════════
// PORTFOLIO ANIMATIONS
// ═══════════════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────────────
// INITIALIZATION
// ───────────────────────────────────────────────────────────────────────────

// Immediate scroll prevention - run first
(function() {
    // Prevent browser scroll restoration
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    
    // Force scroll to top immediately and repeatedly
    const scrollToTop = () => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
    };
    
    scrollToTop();
    
    // Clear any hash from URL that might cause scrolling
    if (window.location.hash && window.location.hash !== '#') {
        history.replaceState(null, null, window.location.pathname + window.location.search);
        scrollToTop();
    }
    
    // Prevent any delayed scrolling
    setTimeout(scrollToTop, 1);
    setTimeout(scrollToTop, 10);
    setTimeout(scrollToTop, 50);
    setTimeout(scrollToTop, 100);
})();

// Ensure page starts at top on beforeunload
window.addEventListener('beforeunload', () => {
    window.scrollTo(0, 0);
});

// Additional scroll prevention on load
window.addEventListener('load', () => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
});

// Prevent intersection observer from triggering scroll
let preventScrolling = true;
setTimeout(() => {
    preventScrolling = false;
}, 500);

document.addEventListener('DOMContentLoaded', () => {
    // Force scroll to top multiple times with delays
    const forceTop = () => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
    };
    
    forceTop();
    setTimeout(forceTop, 0);
    setTimeout(forceTop, 1);
    setTimeout(forceTop, 10);
    setTimeout(forceTop, 50);
    setTimeout(forceTop, 100);
    setTimeout(forceTop, 200);
    setTimeout(forceTop, 500);
    
    initNavbar();
    initScrollAnimations();
    initParallax();
    initTypingEffect();
    initHoverEffects();
    initMobileMenu();
    initMobileStats();
});

// ───────────────────────────────────────────────────────────────────────────
// NAVBAR FUNCTIONALITY
// ───────────────────────────────────────────────────────────────────────────
function initNavbar() {
    const navbar = document.querySelector('.navbar');
    let lastScroll = 0;
    
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        // Add background on scroll
        if (currentScroll > 50) {
            navbar.style.background = 'rgba(10, 10, 11, 0.95)';
            navbar.style.backdropFilter = 'blur(30px)';
        } else {
            navbar.style.background = 'rgba(10, 10, 11, 0.8)';
            navbar.style.backdropFilter = 'blur(20px)';
        }
        
        // Hide/show on scroll
        if (currentScroll > lastScroll && currentScroll > 200) {
            navbar.style.transform = 'translateY(-100%)';
        } else {
            navbar.style.transform = 'translateY(0)';
        }
        
        lastScroll = currentScroll;
    });
    
    // Smooth scroll for nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href.startsWith('#')) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });
}

// ───────────────────────────────────────────────────────────────────────────
// SCROLL ANIMATIONS
// ───────────────────────────────────────────────────────────────────────────
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                
                // Stagger animations for child elements
                const children = entry.target.querySelectorAll('.animate-child');
                children.forEach((child, i) => {
                    setTimeout(() => {
                        child.classList.add('animate-in');
                    }, i * 100);
                });
            }
        });
    }, observerOptions);
    
    // Observe sections
    document.querySelectorAll('.section-header, .tech-card, .feature-item').forEach(el => {
        el.classList.add('animate-element');
        observer.observe(el);
    });
}

// ───────────────────────────────────────────────────────────────────────────
// PARALLAX EFFECTS
// ───────────────────────────────────────────────────────────────────────────
function initParallax() {
    const orbs = document.querySelectorAll('.gradient-orb');
    
    // Store initial positions and respect CSS animations
    window.addEventListener('mousemove', (e) => {
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;
        
        orbs.forEach((orb, i) => {
            const speed = (i + 1) * 0.2; // Reduced speed for subtlety
            const xPos = (x - 0.5) * speed * 30; // Reduced range
            const yPos = (y - 0.5) * speed * 30; // Reduced range
            
            // Use CSS custom properties to avoid overriding CSS animations
            orb.style.setProperty('--mouse-x', `${xPos}px`);
            orb.style.setProperty('--mouse-y', `${yPos}px`);
        });
    });
    
    // Subtle parallax on scroll
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        
        orbs.forEach((orb, i) => {
            const speed = (i + 1) * 0.1; // Much more subtle scroll effect
            orb.style.setProperty('--scroll-y', `${scrolled * speed}px`);
        });
    });
}

// ───────────────────────────────────────────────────────────────────────────
// TYPING EFFECT
// ───────────────────────────────────────────────────────────────────────────
function initTypingEffect() {
    const subtitle = document.querySelector('.hero-subtitle');
    const subtitleText = document.querySelector('.hero-subtitle-text');
    const phrases = [
        'Utvikler med øye for detaljer',
        'Elsker å løse avanserte problemer',
        'Bygger intuitive brukergrensesnitt',
        'Brenner for god brukeropplevelse',
        'Skaper løsninger som fungerer, hver gang'
    ];
    
    let currentPhrase = 0;
    let currentChar = 0;
    let isDeleting = false;
    let typingSpeed = 100;
    let initialTextDeleted = false;
    
    function startScrollAnimation(futureText) {
        // Temporarily set the text to measure what the width will be
        const currentText = subtitleText.textContent;
        subtitleText.textContent = futureText;
        
        const textWidth = subtitleText.scrollWidth;
        const containerWidth = subtitle.clientWidth;
        
        // Restore the current text
        subtitleText.textContent = currentText;
        
        if (textWidth > containerWidth) {
            subtitle.classList.add('overflow-scroll');
            
            // Calculate how much we need to scroll left to keep the end visible
            const overflowAmount = textWidth - containerWidth;
            const scrollDistance = -overflowAmount;
            
            // Set scroll position BEFORE updating text
            subtitleText.style.transform = `translateX(${scrollDistance}px)`;
            
        } else {
            subtitle.classList.remove('overflow-scroll');
            subtitleText.style.transform = 'translateX(0)';
        }
    }
    
    function updateText(text) {
        // First, calculate and set scroll position for the new text
        startScrollAnimation(text);
        
        // Then update the text content
        subtitleText.textContent = text;
    }
    
    function type() {
        // If we haven't deleted the initial "Alta, Norge" text yet
        if (!initialTextDeleted) {
            const currentText = subtitleText.textContent;
            if (currentText.length > 0) {
                updateText(currentText.substring(0, currentText.length - 1));
                setTimeout(type, 80); // Fast deletion speed
                return;
            } else {
                initialTextDeleted = true;
                currentChar = 0;
                typingSpeed = 500; // Pause before starting new phrases
            }
        }
        
        const phrase = phrases[currentPhrase];
        
        if (isDeleting) {
            updateText(phrase.substring(0, currentChar - 1));
            currentChar--;
            typingSpeed = 50;
        } else {
            updateText(phrase.substring(0, currentChar + 1));
            currentChar++;
            typingSpeed = 100;
        }
        
        if (!isDeleting && currentChar === phrase.length) {
            typingSpeed = 2000;
            isDeleting = true;
        } else if (isDeleting && currentChar === 0) {
            isDeleting = false;
            currentPhrase = (currentPhrase + 1) % phrases.length;
            typingSpeed = 500;
            // Ensure there's always some content to maintain height
            updateText('\u00A0'); // Non-breaking space
        }
        
        setTimeout(type, typingSpeed);
    }
    
    // Listen for window resize to restart scroll animation
    window.addEventListener('resize', debounce(() => {
        startScrollAnimation(subtitleText.textContent);
    }, 100));
    
    // Start after a longer delay to show "Alta, Norge" for more time
    setTimeout(type, 4000); // Increased from 1500 to 4000ms (4 seconds)
}

// ───────────────────────────────────────────────────────────────────────────
// HOVER EFFECTS
// ───────────────────────────────────────────────────────────────────────────
function initHoverEffects() {
    // Button ripple effect
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.classList.add('ripple');
            
            this.appendChild(ripple);
            
            setTimeout(() => ripple.remove(), 600);
        });
    });
    
    // Card tilt effect - disabled on mobile
    document.querySelectorAll('.tech-card, .floating-card').forEach(card => {
        // Only enable tilt effect on desktop
        if (window.innerWidth > 768) {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                const rotateX = (y - centerY) / 10;
                const rotateY = (centerX - x) / 10;
                
                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
            });
        }
    });
}

// ───────────────────────────────────────────────────────────────────────────
// MOBILE MENU
// ───────────────────────────────────────────────────────────────────────────
function initMobileMenu() {
    const toggle = document.querySelector('.nav-toggle');
    const menu = document.querySelector('.nav-menu');
    
    toggle?.addEventListener('click', () => {
        menu.classList.toggle('active');
        toggle.classList.toggle('active');
    });
}

// ───────────────────────────────────────────────────────────────────────────
// MOBILE STATS HANDLING
// ───────────────────────────────────────────────────────────────────────────
function initMobileStats() {
    const heroStats = document.querySelector('.hero-stats');
    
    if (!heroStats) return;
    
    // Store references to event listener functions to prevent memory leaks
    let visualViewportResizeListener = null;
    let visualViewportScrollListener = null;
    let keyboardResizeListener = null;
    let isMobile = false;
    let initialHeight = 0; // Will be set when transitioning to mobile
    
    // Ensure immediate correct positioning on mobile - no animation delay
    const ensureCorrectPositioning = () => {
        if (window.innerWidth <= 768) {
            heroStats.style.left = '50%';
            heroStats.style.transform = 'translateX(-50%)';
            heroStats.style.position = 'fixed';
            heroStats.style.opacity = '1';
            heroStats.style.display = 'flex';
        }
    };
    
    // Function to update stats position for mobile
    const updateStatsPosition = () => {
        if (window.visualViewport) {
            const offset = window.visualViewport.height < window.innerHeight ? 
                window.innerHeight - window.visualViewport.height : 0;
            
            heroStats.style.bottom = `calc(var(--space-md) + ${offset}px)`;
        }
        // Ensure positioning stays correct during updates
        ensureCorrectPositioning();
    };
    
    // Function to handle keyboard detection
    const handleKeyboardToggle = debounce(() => {
        if (!isMobile) return;
        
        const currentHeight = window.innerHeight;
        const heightDiff = initialHeight - currentHeight;
        
        if (heightDiff > 150) {
            // Keyboard likely open
            heroStats.style.display = 'none';
        } else {
            // Keyboard likely closed
            heroStats.style.display = 'flex';
        }
    }, 100);
    
    // Function to clean up existing listeners
    const removeExistingListeners = () => {
        if (visualViewportResizeListener && window.visualViewport) {
            window.visualViewport.removeEventListener('resize', visualViewportResizeListener);
            visualViewportResizeListener = null;
        }
        
        if (visualViewportScrollListener && window.visualViewport) {
            window.visualViewport.removeEventListener('scroll', visualViewportScrollListener);
            visualViewportScrollListener = null;
        }
        
        if (keyboardResizeListener) {
            window.removeEventListener('resize', keyboardResizeListener);
            keyboardResizeListener = null;
        }
    };
    
    // Function to add mobile-specific listeners
    const addMobileListeners = () => {
        if (window.visualViewport) {
            visualViewportResizeListener = updateStatsPosition;
            visualViewportScrollListener = updateStatsPosition;
            
            window.visualViewport.addEventListener('resize', visualViewportResizeListener);
            window.visualViewport.addEventListener('scroll', visualViewportScrollListener);
            updateStatsPosition();
        }
        
        keyboardResizeListener = handleKeyboardToggle;
        window.addEventListener('resize', keyboardResizeListener);
    };
    
    // Handle viewport changes on mobile
    const handleViewportChange = () => {
        const shouldBeMobile = window.innerWidth <= 768;
        
        if (shouldBeMobile !== isMobile) {
            // Clean up existing listeners before changing mode
            removeExistingListeners();
            
            isMobile = shouldBeMobile;
            
            if (isMobile) {
                // Capture the initial height when transitioning to mobile
                initialHeight = window.innerHeight;
                // Ensure immediate correct positioning before adding listeners
                ensureCorrectPositioning();
                addMobileListeners();
            } else {
                // Reset styles when switching back to desktop
                heroStats.style.bottom = '';
                heroStats.style.display = '';
                heroStats.style.left = '';
                heroStats.style.transform = '';
                heroStats.style.position = '';
                heroStats.style.opacity = '';
            }
        }
    };
    
    // Initial setup
    handleViewportChange();
    
    // Capture initial height if we're starting on mobile
    if (isMobile) {
        initialHeight = window.innerHeight;
    }
    
    // Ensure immediate correct positioning on page load
    ensureCorrectPositioning();
    
    // Listen for viewport changes (but don't add duplicate listeners)
    window.addEventListener('resize', debounce(handleViewportChange, 100));
}

// ───────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ───────────────────────────────────────────────────────────────────────────
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ───────────────────────────────────────────────────────────────────────────
// ANIMATION CSS INJECTION
// ───────────────────────────────────────────────────────────────────────────
const animationStyles = `
    .animate-element {
        opacity: 0;
        transform: translateY(30px);
        transition: all 0.8s ease-out;
    }
    
    .animate-element.animate-in {
        opacity: 1;
        transform: translateY(0);
    }
    
    .animate-child {
        opacity: 0;
        transform: translateX(-20px);
        transition: all 0.6s ease-out;
    }
    
    .animate-child.animate-in {
        opacity: 1;
        transform: translateX(0);
    }
    
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.5);
        transform: scale(0);
        animation: ripple-animation 0.6s ease-out;
        pointer-events: none;
    }
    
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    .nav-menu.active {
        display: flex !important;
        position: fixed;
        top: 60px;
        right: 20px;
        flex-direction: column;
        background: var(--bg-card);
        padding: var(--space-lg);
        border-radius: 12px;
        box-shadow: var(--shadow-xl);
        border: 1px solid var(--border-color);
    }
    
    .nav-toggle.active span:nth-child(1) {
        transform: rotate(45deg) translate(5px, 5px);
    }
    
    .nav-toggle.active span:nth-child(2) {
        opacity: 0;
    }
    
    .nav-toggle.active span:nth-child(3) {
        transform: rotate(-45deg) translate(7px, -6px);
    }
`;

// Inject animation styles
const styleSheet = document.createElement('style');
styleSheet.textContent = animationStyles;
document.head.appendChild(styleSheet);

// ───────────────────────────────────────────────────────────────────────────
// PERFORMANCE MONITORING
// ───────────────────────────────────────────────────────────────────────────
if ('performance' in window) {
    window.addEventListener('load', () => {
        const perfData = window.performance.timing;
        const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
        console.log(`Page load time: ${pageLoadTime}ms`);
    });
}

