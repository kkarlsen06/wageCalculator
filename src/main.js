import './styles.css';
import './css/legal-modal.css';

// Root landing page scripts (side-effect imports)
import './js/loading-helpers.js';
import './js/error-handling.js';
import './js/redirect.js';
import './js/animations.js';

// Legal modal functionality
import LegalModal from './js/legal-modal.js';

// Initialize legal modal
document.addEventListener('DOMContentLoaded', () => {
    const legalModal = new LegalModal();
    
    // Add shield icon to footer for privacy policy
    const footer = document.querySelector('.footer');
    if (footer) {
        const footerLinks = footer.querySelector('.footer-links');
        if (footerLinks) {
            const privacyLink = document.createElement('a');
            privacyLink.href = '#';
            privacyLink.className = 'footer-privacy-link';
            privacyLink.setAttribute('aria-label', 'Personvern og vilkår');
            // Minimal inline SVG shield (no external icon libs)
            privacyLink.innerHTML = `
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <path d="M12 3l7 3v5c0 4.418-3.582 8-8 8s-8-3.582-8-8V6l9-3z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
                    <path d="M9.5 12.5l2 2l3-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>`;
            privacyLink.addEventListener('click', (e) => {
                e.preventDefault();
                legalModal.showFromLandingPage();
            });

            footerLinks.appendChild(privacyLink);
        }
    }

    // Hook up inline legal links on landing (if present)
    const legalLinks = document.querySelectorAll('[data-legal]');
    if (legalLinks.length) {
        legalLinks.forEach((el) => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = el.getAttribute('data-legal') === 'terms' ? 'terms' : 'privacy';
                // Show modal tailored for landing, then switch tab
                legalModal.showFromLandingPage();
                legalModal.switchTab(tab);
            });
        });
    }

    // Match CTA width to tagline width on mobile for visual harmony
    const adjustCtaWidth = () => {
        const tagline = document.querySelector('.tagline');
        const ctaBtn = document.querySelector('.open-app-btn');
        if (!tagline || !ctaBtn) return;

        const isMobile = window.innerWidth <= 600;
        if (isMobile) {
            // Defer to ensure fonts/layout have settled
            requestAnimationFrame(() => {
                const rect = tagline.getBoundingClientRect();
                const target = Math.ceil(rect.width * (2 / 3));

                // Measure natural (intrinsic) button width to avoid wrapping smaller than content
                const prevWidth = ctaBtn.style.width;
                ctaBtn.style.width = 'auto';
                const natural = Math.ceil(ctaBtn.getBoundingClientRect().width);
                // Restore will be overridden just below
                ctaBtn.style.width = prevWidth;

                const finalWidth = Math.max(target, natural);
                ctaBtn.style.width = finalWidth > 0 ? `${finalWidth}px` : '';
                ctaBtn.style.maxWidth = '100%';
            });
        } else {
            ctaBtn.style.width = '';
            ctaBtn.style.maxWidth = '';
        }
    };

    // Simple debounce to avoid thrashing on resize
    let resizeT;
    window.addEventListener('resize', () => {
        clearTimeout(resizeT);
        resizeT = setTimeout(adjustCtaWidth, 100);
    });
    window.addEventListener('orientationchange', () => setTimeout(adjustCtaWidth, 150));
    // Initial run
    adjustCtaWidth();
});
