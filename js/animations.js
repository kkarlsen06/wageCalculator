// Scroll-triggered animations
class ScrollAnimations {
    constructor() {
        this.init();
    }

    init() {
        this.setupIntersectionObserver();
        this.addAnimationClasses();
        this.enhanceExistingAnimations();
    }

    setupIntersectionObserver() {
        // Create intersection observer for scroll animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -100px 0px'
        };

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    console.log('Element intersecting:', entry.target.className);
                    entry.target.classList.add('animate-in');
                    
                    // Add special handling for staggered animations
                    if (entry.target.classList.contains('stagger-animation')) {
                        this.triggerStaggeredAnimation(entry.target);
                    }
                    
                    // Unobserve the element after animation to improve performance
                    this.observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        // Observe all elements with animation classes
        this.observeElements();
    }

    addAnimationClasses() {
        console.log('Adding animation classes to elements...');
        
        // Add animation classes to sections
        const sections = document.querySelectorAll('section');
        console.log('Found sections:', sections.length);
        sections.forEach((section, index) => {
            section.classList.add('animate-on-scroll');
            section.style.transitionDelay = `${index * 0.1}s`;
        });

        // Add classes to section headers
        const sectionHeaders = document.querySelectorAll('.section-header');
        console.log('Found section headers:', sectionHeaders.length);
        sectionHeaders.forEach(header => {
            header.classList.add('animate-on-scroll');
        });

        // Add classes to about content
        const aboutText = document.querySelector('.about-text');
        if (aboutText) {
            console.log('Adding animation to about text');
            aboutText.classList.add('animate-on-scroll', 'slide-left');
        }

        const aboutStats = document.querySelector('.about-stats');
        if (aboutStats) {
            console.log('Adding stagger animation to about stats');
            aboutStats.classList.add('stagger-animation');
        }

        // Add classes to project cards
        const projectCards = document.querySelectorAll('.project-card');
        console.log('Found project cards:', projectCards.length);
        projectCards.forEach((card, index) => {
            card.classList.add('animate-on-scroll');
            card.style.transitionDelay = `${index * 0.2}s`;
        });

        // Add classes to tech content
        const techContent = document.querySelector('.tech-content');
        if (techContent) {
            console.log('Adding animation to tech content');
            techContent.classList.add('animate-on-scroll');
        }

        const techStack = document.querySelector('.tech-stack');
        if (techStack) {
            console.log('Adding animation to tech stack');
            techStack.classList.add('animate-on-scroll', 'slide-left');
        }

        const techGrid = document.querySelector('.tech-grid');
        if (techGrid) {
            console.log('Adding stagger animation to tech grid');
            techGrid.classList.add('stagger-animation');
        }

        // Add classes to footer
        const footer = document.querySelector('footer');
        if (footer) {
            console.log('Adding animation to footer');
            footer.classList.add('animate-on-scroll');
        }
    }

    triggerStaggeredAnimation(container) {
        const children = container.children;
        Array.from(children).forEach((child, index) => {
            setTimeout(() => {
                child.style.opacity = '1';
                child.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }

    enhanceExistingAnimations() {
        // Add subtle entrance animations to buttons
        const buttons = document.querySelectorAll('.btn');
        buttons.forEach((btn, index) => {
            btn.addEventListener('mouseenter', () => {
                btn.style.transform = 'translateY(-2px) scale(1.05)';
            });
            
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = '';
            });
        });

        // Add parallax effect to hero background
        this.setupParallax();
    }

    setupParallax() {
        const hero = document.querySelector('.hero');
        if (!hero) return;

        let ticking = false;

        const updateParallax = () => {
            const scrolled = window.pageYOffset;
            const rate = scrolled * -0.2;
            
            hero.style.transform = `translateY(${rate}px)`;
            ticking = false;
        };

        const requestTick = () => {
            if (!ticking) {
                requestAnimationFrame(updateParallax);
                ticking = true;
            }
        };

        window.addEventListener('scroll', requestTick, { passive: true });
    }

    observeElements() {
        // Observe all elements with animation classes
        const animatedElements = document.querySelectorAll('.animate-on-scroll, .stagger-animation');
        console.log('Observing elements:', animatedElements.length);
        
        animatedElements.forEach((element, index) => {
            console.log(`Observing element ${index}:`, element.className);
            this.observer.observe(element);
        });
        
        // Fallback: If no elements found, try again after a short delay
        if (animatedElements.length === 0) {
            console.log('No animated elements found, retrying in 500ms...');
            setTimeout(() => this.observeElements(), 500);
        }
    }

    // Utility method to add entrance animation to dynamically added elements
    animateElement(element, animationType = 'fadeInUp', delay = 0) {
        element.style.opacity = '0';
        element.style.transform = this.getTransformForAnimation(animationType);
        element.style.transition = `all 0.6s var(--ease-default) ${delay}s`;
        
        // Trigger animation on next frame
        requestAnimationFrame(() => {
            element.style.opacity = '1';
            element.style.transform = 'none';
        });
    }

    getTransformForAnimation(type) {
        const transforms = {
            fadeInUp: 'translateY(30px)',
            fadeInDown: 'translateY(-30px)',
            slideInLeft: 'translateX(-50px)',
            slideInRight: 'translateX(50px)',
            scaleIn: 'scale(0.8)'
        };
        return transforms[type] || transforms.fadeInUp;
    }
}

// Initialize animations when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing animations...');
    
    // Only initialize if user hasn't set reduced motion preference
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        console.log('Motion is allowed, starting animations...');
        
        // Add a small delay to ensure all CSS is loaded
        setTimeout(() => {
            new ScrollAnimations();
        }, 100);
    } else {
        console.log('Reduced motion preferred, skipping animations');
    }
});

// Also try on window load as fallback
window.addEventListener('load', () => {
    if (!window.ScrollAnimations && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        console.log('Fallback initialization on window load...');
        new ScrollAnimations();
    }
});

// Export for use in other scripts
window.ScrollAnimations = ScrollAnimations;
