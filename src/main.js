import './styles.css';

// Root landing page scripts (side-effect imports)
import './js/loading-helpers.js';
import './js/error-handling.js';
import './js/redirect.js';
import { initAnimations } from './js/animations.js';
import { initPrivacyModal } from './js/privacy-modal.js';

// Initialize everything on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM ready, initializing...');
    initAnimations();
    initPrivacyModal();
});


