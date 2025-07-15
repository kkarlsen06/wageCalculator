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
    
    // Single scroll to top function
    const scrollToTop = () => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
    };
    
    // Clear any hash from URL that might cause scrolling
    if (window.location.hash && window.location.hash !== '#') {
        history.replaceState(null, null, window.location.pathname + window.location.search);
    }
    
    // Force scroll to top immediately
    scrollToTop();
    
    // Single delayed scroll to top to handle any deferred scrolling
    setTimeout(scrollToTop, 50);
})();

// Ensure page starts at top on beforeunload
window.addEventListener('beforeunload', () => {
    window.scrollTo(0, 0);
});

// Prevent intersection observer from triggering scroll
let preventScrolling = true;
setTimeout(() => {
    preventScrolling = false;
}, 500);

document.addEventListener('DOMContentLoaded', () => {
    // Single scroll to top on DOM ready
    window.scrollTo(0, 0);
    
    // Store cleanup functions
    const cleanupFunctions = [];
    
    initNavbar();
    initScrollAnimations();
    initParallax();
    
    // Store cleanup function from initTypingEffect
    const typingCleanup = initTypingEffect();
    if (typingCleanup) {
        cleanupFunctions.push(typingCleanup);
    }
    
    initHoverEffects();
    initMobileMenu();
    
    // Store cleanup function from initMobileStats
    const mobileStatsCleanup = initMobileStats();
    if (mobileStatsCleanup) {
        cleanupFunctions.push(mobileStatsCleanup);
    }
    
    // Global cleanup function if needed
    window.cleanupAnimations = () => {
        cleanupFunctions.forEach(cleanup => cleanup());
    };
});

// ───────────────────────────────────────────────────────────────────────────
// COUNTING ANIMATIONS
// ───────────────────────────────────────────────────────────────────────────
function initCountingAnimations() {
    const stats = document.querySelectorAll('.stat-number, .preview-stat .stat-value');
    
    const animateCount = (element, target, duration = 2000) => {
        const start = 0;
        const increment = target / (duration / 16);
        let current = start;
        
        const updateCount = () => {
            current += increment;
            if (current < target) {
                // Format based on content type
                if (element.textContent.includes('%')) {
                    element.textContent = Math.floor(current) + '%';
                } else if (element.textContent.includes('+')) {
                    element.textContent = '+' + Math.floor(current) + '%';
                } else if (element.textContent.includes('t')) {
                    element.textContent = Math.floor(current) + 't';
                } else if (element.textContent.includes('kr') || element.textContent.includes(',')) {
                    element.textContent = Math.floor(current).toLocaleString('no-NO') + ',-';
                } else {
                    element.textContent = Math.floor(current);
                }
                requestAnimationFrame(updateCount);
            } else {
                // Set final value
                element.textContent = element.getAttribute('data-final-value') || element.textContent;
            }
        };
        
        // Store original value and start animation
        element.setAttribute('data-final-value', element.textContent);
        element.textContent = '0';
        requestAnimationFrame(updateCount);
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const element = entry.target;
                const text = element.textContent;
                
                // Extract numeric value
                let value = 0;
                if (text.includes('100%')) value = 100;
                else if (text.includes('5+')) value = 5;
                else if (text.includes('24/7')) value = 24;
                else if (text.includes('45.750')) value = 45750;
                else if (text.includes('18%')) value = 18;
                else if (text.includes('162.5')) value = 162.5;
                
                animateCount(element, value);
                observer.unobserve(element);
            }
        });
    }, { threshold: 0.5 });
    
    stats.forEach(stat => observer.observe(stat));
}

// ───────────────────────────────────────────────────────────────────────────
// VISUAL HIERARCHY & ATTENTION GUIDANCE
// ───────────────────────────────────────────────────────────────────────────
function initVisualHierarchy() {
    // Add entrance animations with staggered timing
    const heroElements = document.querySelectorAll('.hero-badge, .hero-title, .hero-description, .hero-cta, .hero-stats');
    
    heroElements.forEach((element, index) => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        
        setTimeout(() => {
            element.style.transition = 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, 300 + (index * 150));
    });
    
    // Add focus indicators for key elements
    const focusElements = document.querySelectorAll('.btn-primary, .hero-stats, .showcase-cta');
    
    focusElements.forEach(element => {
        element.addEventListener('mouseenter', () => {
            element.style.transform = 'scale(1.02)';
            element.style.boxShadow = '0 8px 25px rgba(99, 102, 241, 0.3)';
        });
        
        element.addEventListener('mouseleave', () => {
            element.style.transform = 'scale(1)';
            element.style.boxShadow = '';
        });
    });
    
    // Add pulsing animation to primary CTA
    const primaryCTA = document.querySelector('.btn-primary');
    if (primaryCTA) {
        setInterval(() => {
            primaryCTA.style.animation = 'pulse-glow 2s ease-in-out';
            setTimeout(() => {
                primaryCTA.style.animation = '';
            }, 2000);
        }, 8000);
    }
}

// ───────────────────────────────────────────────────────────────────────────
// LOADING ANIMATIONS
// ───────────────────────────────────────────────────────────────────────────
function initLoadingAnimations() {
    // Add loading state to page
    const body = document.body;
    body.classList.add('loading');
    
    // Simulate content loading
    setTimeout(() => {
        body.classList.remove('loading');
        body.classList.add('loaded');
        
        // Trigger entrance animations
        document.querySelectorAll('.animate-on-load').forEach((element, index) => {
            setTimeout(() => {
                element.classList.add('animate-in');
            }, index * 100);
        });
    }, 500);
    
    // Add progress indicator
    const progressBar = document.createElement('div');
    progressBar.className = 'loading-progress';
    progressBar.innerHTML = '<div class="progress-bar"></div>';
    document.body.appendChild(progressBar);
    
    // Animate progress
    const progressBarInner = progressBar.querySelector('.progress-bar');
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            setTimeout(() => {
                progressBar.style.opacity = '0';
                setTimeout(() => progressBar.remove(), 300);
            }, 200);
        }
        progressBarInner.style.width = progress + '%';
    }, 100);
}

// ───────────────────────────────────────────────────────────────────────────
// NAVBAR FUNCTIONALITY
// ───────────────────────────────────────────────────────────────────────────
function initNavbar() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;
    
    let lastScroll = 0;
    let ticking = false;
    
    const updateNavbar = () => {
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
        ticking = false;
    };
    
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(updateNavbar);
            ticking = true;
        }
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
    if (!orbs.length) return;
    
    let ticking = false;
    
    const updateParallax = (e) => {
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;
        
        orbs.forEach((orb, i) => {
            const speed = (i + 1) * 0.2;
            const xPos = (x - 0.5) * speed * 30;
            const yPos = (y - 0.5) * speed * 30;
            
            orb.style.setProperty('--mouse-x', `${xPos}px`);
            orb.style.setProperty('--mouse-y', `${yPos}px`);
        });
        
        ticking = false;
    };
    
    window.addEventListener('mousemove', (e) => {
        if (!ticking) {
            requestAnimationFrame(() => updateParallax(e));
            ticking = true;
        }
    });
    
    // Subtle parallax on scroll
    let scrollTicking = false;
    
    const updateScrollParallax = () => {
        const scrolled = window.pageYOffset;
        
        orbs.forEach((orb, i) => {
            const speed = (i + 1) * 0.1;
            orb.style.setProperty('--scroll-y', `${scrolled * speed}px`);
        });
        
        scrollTicking = false;
    };
    
    window.addEventListener('scroll', () => {
        if (!scrollTicking) {
            requestAnimationFrame(updateScrollParallax);
            scrollTicking = true;
        }
    });
}

// ───────────────────────────────────────────────────────────────────────────
// TYPING EFFECT
// ───────────────────────────────────────────────────────────────────────────
function initTypingEffect() {
    const heroName = document.querySelector('.hero-name');
    if (!heroName) return;
    
    const originalText = heroName.textContent;
    const texts = [
        'Hjalmar Karlsen',
        'Utvikler',
        'Designer',
        'Problemløser'
    ];
    
    let currentTextIndex = 0;
    let currentCharIndex = 0;
    let isDeleting = false;
    let typingSpeed = 100;
    let initialTextDeleted = false;
    let currentTypingTimeout = null;
    let isActive = true;
    
    function startScrollAnimation(futureText) {
        const currentText = subtitleText.textContent;
        subtitleText.textContent = futureText;
        
        const textWidth = subtitleText.scrollWidth;
        const containerWidth = subtitle.clientWidth;
        
        subtitleText.textContent = currentText;
        
        if (textWidth > containerWidth) {
            subtitle.classList.add('overflow-scroll');
            const overflowAmount = textWidth - containerWidth;
            const scrollDistance = -overflowAmount;
            subtitleText.style.transform = `translateX(${scrollDistance}px)`;
        } else {
            subtitle.classList.remove('overflow-scroll');
            subtitleText.style.transform = 'translateX(0)';
        }
    }
    
    function updateText(text) {
        startScrollAnimation(text);
        subtitleText.textContent = text;
    }
    
    function type() {
        if (!isActive) return; // Stop if cleanup was called
        
        if (!initialTextDeleted) {
            const currentText = subtitleText.textContent;
            if (currentText.length > 0) {
                updateText(currentText.substring(0, currentText.length - 1));
                currentTypingTimeout = setTimeout(type, 80);
                return;
            } else {
                initialTextDeleted = true;
                currentChar = 0;
                typingSpeed = 500;
            }
        }
        
        const phrase = phrases[currentPhrase];
        
        if (isDeleting) {
            heroName.textContent = currentText.substring(0, currentCharIndex - 1);
            currentCharIndex--;
            typingSpeed = 50;
        } else {
            heroName.textContent = currentText.substring(0, currentCharIndex + 1);
            currentCharIndex++;
            typingSpeed = 100;
        }
        
        if (!isDeleting && currentCharIndex === currentText.length) {
            typingSpeed = 2000; // Pause at end
            isDeleting = true;
        } else if (isDeleting && currentCharIndex === 0) {
            isDeleting = false;
            currentTextIndex = (currentTextIndex + 1) % texts.length;
            typingSpeed = 500; // Pause before next word
        }
        
        currentTypingTimeout = setTimeout(type, typingSpeed);
    }
    
    // Store debounced resize handler for cleanup
    const debouncedResizeHandler = debounce(() => {
        startScrollAnimation(subtitleText.textContent);
    }, 100);
    
    // Listen for window resize to restart scroll animation
    window.addEventListener('resize', debouncedResizeHandler);
    
    // Store timeout ID for cleanup
    let typingTimeout = setTimeout(type, 4000);
    
    // Return cleanup function
    return () => {
        isActive = false;
        clearTimeout(typingTimeout);
        clearTimeout(currentTypingTimeout);
        window.removeEventListener('resize', debouncedResizeHandler);
    };
}

// ───────────────────────────────────────────────────────────────────────────
// HOVER EFFECTS
// ───────────────────────────────────────────────────────────────────────────
function initHoverEffects() {
    // Enhanced hover effects for interactive elements
    const interactiveElements = document.querySelectorAll('.btn, .tech-card, .feature-item, .nav-link');
    
    interactiveElements.forEach(element => {
        element.addEventListener('mouseenter', (e) => {
            // Add subtle glow effect
            element.style.transform = 'translateY(-2px)';
            element.style.boxShadow = '0 10px 25px rgba(99, 102, 241, 0.2)';
            
            // Add ripple effect for buttons
            if (element.classList.contains('btn')) {
                const ripple = document.createElement('span');
                ripple.className = 'ripple';
                element.appendChild(ripple);
                
                const rect = element.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = e.clientX - rect.left - size / 2;
                const y = e.clientY - rect.top - size / 2;
                
                ripple.style.width = ripple.style.height = size + 'px';
                ripple.style.left = x + 'px';
                ripple.style.top = y + 'px';
                
                setTimeout(() => ripple.remove(), 600);
            }
        });
        
        element.addEventListener('mouseleave', () => {
            element.style.transform = '';
            element.style.boxShadow = '';
        });
    });
}

// ───────────────────────────────────────────────────────────────────────────
// MOBILE MENU
// ───────────────────────────────────────────────────────────────────────────
function initMobileMenu() {
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (!navToggle || !navMenu) return;
    
    navToggle.addEventListener('click', () => {
        const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
        navToggle.setAttribute('aria-expanded', !isExpanded);
        navMenu.classList.toggle('active');
        
        // Animate menu items
        const menuItems = navMenu.querySelectorAll('.nav-link');
        menuItems.forEach((item, index) => {
            if (!isExpanded) {
                item.style.animation = `slideInRight 0.3s ease forwards ${index * 0.1}s`;
            } else {
                item.style.animation = '';
            }
        });
    });
}

// ───────────────────────────────────────────────────────────────────────────
// MOBILE STATS
// ───────────────────────────────────────────────────────────────────────────
function initMobileStats() {
    const heroStats = document.querySelector('.hero-stats');
    if (!heroStats) return;
    
    // Ensure stats are properly positioned on mobile
    const ensureCorrectPositioning = () => {
        if (window.innerWidth <= 768) {
            heroStats.style.position = 'relative';
            heroStats.style.bottom = 'auto';
            heroStats.style.left = 'auto';
            heroStats.style.transform = 'none';
        }
    };
    
    const updateStatsPosition = () => {
        if (window.innerWidth <= 768) {
            const heroBottom = document.querySelector('.hero-bottom-section');
            if (heroBottom) {
                const bottomRect = heroBottom.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                
                if (bottomRect.bottom > viewportHeight) {
                    heroStats.style.position = 'fixed';
                    heroStats.style.bottom = '20px';
                    heroStats.style.left = '50%';
                    heroStats.style.transform = 'translateX(-50%)';
                    heroStats.style.zIndex = '1000';
                } else {
                    heroStats.style.position = 'relative';
                    heroStats.style.bottom = 'auto';
                    heroStats.style.left = 'auto';
                    heroStats.style.transform = 'none';
                }
            }
        }
    };
    
    // Remove existing event listeners to prevent duplicates
    const removeExistingListeners = () => {
        window.removeEventListener('scroll', updateStatsPosition);
        window.removeEventListener('resize', updateStatsPosition);
        window.removeEventListener('orientationchange', updateStatsPosition);
    };
    
    // Add mobile-specific event listeners
    const addMobileListeners = () => {
        if (window.innerWidth <= 768) {
            window.addEventListener('scroll', updateStatsPosition);
            window.addEventListener('resize', updateStatsPosition);
            window.addEventListener('orientationchange', updateStatsPosition);
        }
    };
    
    // Handle viewport changes
    const handleViewportChange = () => {
        removeExistingListeners();
        ensureCorrectPositioning();
        addMobileListeners();
    };
    
    // Initialize
    handleViewportChange();
    
    // Debounced resize handler
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(handleViewportChange, 250);
    });
}

// ───────────────────────────────────────────────────────────────────────────
// COUNTING ANIMATIONS
// ───────────────────────────────────────────────────────────────────────────

// Global observer instance to prevent memory leaks
let countingObserver = null;

function initCountingAnimations() {
    // Clean up existing observer to prevent memory leaks
    if (countingObserver) {
        countingObserver.disconnect();
        countingObserver = null;
    }
    
    // Robust value extraction function
    const extractNumericValue = (text) => {
        if (!text) return null;
        
        // Remove any non-numeric characters except decimal points, plus signs, and slashes
        const cleanText = text.trim();
        
        // Handle percentage values (e.g., "100%")
        if (cleanText.includes('%')) {
            const match = cleanText.match(/(\d+(?:\.\d+)?)%/);
            return match ? parseFloat(match[1]) : null;
        }
        
        // Handle time values (e.g., "24/7", "162.5t")
        if (cleanText.includes('/') || cleanText.includes('t')) {
            const match = cleanText.match(/(\d+(?:\.\d+)?)/);
            return match ? parseFloat(match[1]) : null;
        }
        
        // Handle currency values (e.g., "45.750,-")
        if (cleanText.includes(',') || cleanText.includes('.')) {
            const match = cleanText.match(/(\d+(?:\.\d+)?)/);
            return match ? parseFloat(match[1]) : null;
        }
        
        // Handle simple numbers with plus signs (e.g., "+18%", "5+")
        const match = cleanText.match(/(\+?\d+(?:\.\d+)?)/);
        return match ? parseFloat(match[1]) : null;
    };
    
    // Animation function
    const animateValue = (element, targetValue, duration = 2000) => {
        if (!element || targetValue === null) return;
        
        const startValue = 0;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const currentValue = startValue + (targetValue - startValue) * easeOutQuart;
            
            // Format the value based on the original text
            const originalText = element.getAttribute('data-original-text') || element.textContent;
            let formattedValue;
            
            if (originalText.includes('%')) {
                formattedValue = `${Math.round(currentValue)}%`;
            } else if (originalText.includes('/')) {
                formattedValue = `${Math.round(currentValue)}/7`;
            } else if (originalText.includes('t')) {
                formattedValue = `${currentValue.toFixed(1)}t`;
            } else if (originalText.includes(',') || originalText.includes('.')) {
                formattedValue = `${Math.round(currentValue).toLocaleString('no-NO')},-`;
            } else if (originalText.includes('+')) {
                formattedValue = `+${Math.round(currentValue)}`;
            } else {
                formattedValue = Math.round(currentValue).toString();
            }
            
            element.textContent = formattedValue;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    };
    
    // Observer callback
    const handleIntersection = (entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const element = entry.target;
                
                // Skip if already animated
                if (element.classList.contains('counting-animated')) {
                    return;
                }
                
                // Store original text for formatting
                const originalText = element.textContent;
                element.setAttribute('data-original-text', originalText);
                
                // Extract numeric value
                const targetValue = extractNumericValue(originalText);
                
                if (targetValue !== null) {
                    // Mark as animated to prevent re-triggering
                    element.classList.add('counting-animated');
                    
                    // Start animation
                    animateValue(element, targetValue);
                }
            }
        });
    };
    
    // Create observer with proper options
    const observerOptions = {
        threshold: 0.5,
        rootMargin: '0px 0px -50px 0px'
    };
    
    ensureCorrectPositioning();
    
    // Store the debounced handler so we can remove it later
    const debouncedHandleViewportChange = debounce(handleViewportChange, 100);
    window.addEventListener('resize', debouncedHandleViewportChange);
    
    // Return cleanup function
    return () => {
        removeExistingListeners();
        window.removeEventListener('resize', debouncedHandleViewportChange);
    };
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

