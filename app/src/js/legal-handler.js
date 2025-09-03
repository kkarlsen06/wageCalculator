/**
 * Legal Handler for Login Page
 * Manages terms acceptance and legal modal display
 */

import LegalModal from '/src/js/legal-modal.js';

class LegalHandler {
    constructor() {
        this.legalModal = null;
        this.termsAccepted = false;
        this.hasViewedTerms = false;
        this.init();
    }

    init() {
        // Initialize legal modal
        this.legalModal = new LegalModal();
        
        // Bind events
        this.bindEvents();
        
        // Listen for legal acceptance events
        this.listenForLegalEvents();
        
        // Set initial visual state
        this.updateCheckboxVisualState();
    }

    bindEvents() {
        // Terms and privacy buttons
        const showTermsBtn = document.getElementById('show-terms-btn');
        const showPrivacyBtn = document.getElementById('show-privacy-btn');
        const termsCheckbox = document.getElementById('terms-accept');
        const createAccountBtn = document.getElementById('create-account-btn');

        if (showTermsBtn) {
            showTermsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Terms button clicked');
                this.showModal('terms');
            });
        }

        if (showPrivacyBtn) {
            showPrivacyBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Privacy button clicked');
                this.showModal('privacy');
            });
        }

        if (termsCheckbox) {
            termsCheckbox.addEventListener('click', (e) => {
                if (!this.hasViewedTerms) {
                    // Prevent checkbox from being checked
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Show the modal to force user to read terms
                    this.showModalForConsent();
                } else {
                    // Allow normal checkbox behavior after they've viewed the terms
                    this.termsAccepted = e.target.checked;
                    this.updateCreateAccountButton();
                }
            });
        }

        if (createAccountBtn) {
            createAccountBtn.addEventListener('click', (e) => {
                if (!this.termsAccepted) {
                    e.preventDefault();
                    this.showTermsRequiredMessage();
                    return false;
                }
            });
        }

        // Form submission validation
        const signupForm = document.getElementById('signup-form');
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => {
                if (!this.termsAccepted) {
                    e.preventDefault();
                    this.showTermsRequiredMessage();
                    return false;
                }
            });
        }
    }

    listenForLegalEvents() {
        // Listen for legal acceptance from modal
        document.addEventListener('legalAccepted', (e) => {
            this.hasViewedTerms = true;
            this.termsAccepted = true;
            const termsCheckbox = document.getElementById('terms-accept');
            if (termsCheckbox) {
                termsCheckbox.checked = true;
            }
            this.updateCreateAccountButton();
        });

        document.addEventListener('legalDeclined', (e) => {
            this.hasViewedTerms = true; // They've seen it, but declined
            this.termsAccepted = false;
            const termsCheckbox = document.getElementById('terms-accept');
            if (termsCheckbox) {
                termsCheckbox.checked = false;
            }
            this.updateCreateAccountButton();
        });
    }

    showModal(tab) {
        console.log(`showModal called with tab: ${tab}`);
        // Switch to the correct tab first
        this.legalModal.switchTab(tab);
        // Then show the modal in info mode (without accept/decline buttons)
        this.legalModal.showInfo();
    }

    showModalForConsent() {
        // Show modal with accept/decline buttons for first-time consent
        this.legalModal.switchTab('privacy'); // Start with privacy policy
        this.legalModal.showConsent();
    }

    updateCreateAccountButton() {
        const createAccountBtn = document.getElementById('create-account-btn');
        if (createAccountBtn) {
            if (this.termsAccepted) {
                createAccountBtn.disabled = false;
                createAccountBtn.classList.remove('btn-disabled');
                createAccountBtn.classList.add('btn-primary');
            } else {
                createAccountBtn.disabled = true;
                createAccountBtn.classList.remove('btn-primary');
                createAccountBtn.classList.add('btn-disabled');
            }
        }
        
        // Update checkbox visual state
        this.updateCheckboxVisualState();
    }

    updateCheckboxVisualState() {
        const checkmark = document.querySelector('.checkmark');
        if (checkmark) {
            if (!this.hasViewedTerms) {
                checkmark.classList.add('must-read');
            } else {
                checkmark.classList.remove('must-read');
            }
        }
    }

    showTermsRequiredMessage() {
        // Show error message
        const signupMsg = document.getElementById('signup-msg');
        if (signupMsg) {
            if (!this.hasViewedTerms) {
                signupMsg.textContent = 'Vennligst les vilkår og betingelser ved å klikke på avkrysningsboksen.';
            } else {
                signupMsg.textContent = 'Du må godta vilkår og betingelser for å opprette en konto.';
            }
            signupMsg.style.display = 'block';
            
            // Clear message after 5 seconds
            setTimeout(() => {
                signupMsg.textContent = '';
                signupMsg.style.display = 'none';
            }, 5000);
        }

        // Scroll to checkbox
        const termsCheckbox = document.getElementById('terms-accept');
        if (termsCheckbox) {
            termsCheckbox.scrollIntoView({ behavior: 'smooth', block: 'center' });
            termsCheckbox.focus();
        }
    }

    // Method to check if terms are accepted
    isTermsAccepted() {
        return this.termsAccepted;
    }

    // Method to reset terms acceptance
    resetTermsAcceptance() {
        this.termsAccepted = false;
        this.hasViewedTerms = false;
        const termsCheckbox = document.getElementById('terms-accept');
        if (termsCheckbox) {
            termsCheckbox.checked = false;
        }
        this.updateCreateAccountButton();
    }

    destroy() {
        if (this.legalModal) {
            this.legalModal.destroy();
        }
    }
}

// Export for use in other modules
export default LegalHandler;
