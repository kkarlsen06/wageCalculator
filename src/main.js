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
            privacyLink.setAttribute('aria-label', 'Privacy Policy and Terms');
            privacyLink.innerHTML = '<i class="fas fa-shield-alt"></i>';
            privacyLink.addEventListener('click', (e) => {
                e.preventDefault();
                legalModal.showFromLandingPage();
            });
            
            footerLinks.appendChild(privacyLink);
        }
    }
});


