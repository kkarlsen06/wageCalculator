/**
 * Legal Modal Component
 * Handles display of Privacy Policy and Terms & Conditions
 */

class LegalModal {
    constructor() {
        this.modal = null;
        this.isOpen = false;
        this.init();
    }

    init() {
        this.createModal();
        this.bindEvents();
        
        // Ensure modal is hidden by default - CSS classes will handle this
        if (this.modal) {
            this.modal.classList.remove('active');
        }
    }

    createModal() {
        // Create modal container
        this.modal = document.createElement('div');
        this.modal.className = 'legal-modal';
        this.modal.setAttribute('role', 'dialog');
        this.modal.setAttribute('aria-labelledby', 'legal-modal-title');
        this.modal.setAttribute('aria-modal', 'true');

        // Modal content
        this.modal.innerHTML = `
            <div class="legal-modal-overlay"></div>
            <div class="legal-modal-container">
                <div class="legal-modal-header">
                    <h2 id="legal-modal-title">Privacy Policy & Terms</h2>
                    <button class="legal-modal-close" aria-label="Close modal">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                
                <div class="legal-modal-tabs">
                    <button class="legal-tab active" data-tab="privacy">Privacy Policy</button>
                    <button class="legal-tab" data-tab="terms">Terms & Conditions</button>
                </div>
                
                <div class="legal-modal-content">
                    <div class="legal-tab-content active" id="privacy-content">
                        <div class="legal-content-scroll">
                            <h3>Privacy Policy</h3>
                            <p><strong>Last updated:</strong> January 2025</p>
                            
                            <h4>1. Introduction</h4>
                            <p>This Privacy Policy describes how the Wage Calculator application ("we", "our", or "us") collects, uses, and protects your personal information when you use our service.</p>
                            
                            <h4>2. Information We Collect</h4>
                            <h5>2.1 Personal Information</h5>
                            <ul>
                                <li><strong>Account Information:</strong> Email address, password, and first name when you create an account</li>
                                <li><strong>Profile Information:</strong> Profile picture (optional), hourly rate preferences, and user settings</li>
                                <li><strong>Employee Data:</strong> Names, email addresses, birth dates, hourly wages, and tariff levels for employees you manage</li>
                                <li><strong>Shift Data:</strong> Work schedules, start/end times, break periods, and wage calculations</li>
                            </ul>
                            
                            <h5>2.2 Technical Information</h5>
                            <ul>
                                <li><strong>Usage Data:</strong> How you interact with the application, features used, and performance metrics</li>
                                <li><strong>Device Information:</strong> Browser type, operating system, and device identifiers</li>
                                <li><strong>Log Data:</strong> Server logs, error reports, and audit trail information</li>
                            </ul>
                            
                            <h4>3. How We Use Your Information</h4>
                            <h5>3.1 Primary Purposes</h5>
                            <ul>
                                <li><strong>Service Provision:</strong> To provide wage calculation services and manage your account</li>
                                <li><strong>Data Processing:</strong> To calculate wages, overtime, and compensation based on your input</li>
                                <li><strong>User Experience:</strong> To personalize your experience and improve our services</li>
                            </ul>
                            
                            <h4>4. Data Storage and Security</h4>
                            <ul>
                                <li>All data is stored securely in Supabase cloud infrastructure</li>
                                <li>Data is processed in accordance with EU data protection regulations</li>
                                <li>We implement industry-standard security measures to protect your information</li>
                            </ul>
                            
                            <h4>5. Your Rights</h4>
                            <ul>
                                <li>Access, update, and delete your personal information</li>
                                <li>Export your data in standard formats</li>
                                <li>Request complete deletion of your account and associated data</li>
                            </ul>
                            
                            <h4>6. Contact Information</h4>
                            <p>For questions about this Privacy Policy, contact us at: <strong>kkarlsen06@kkarlsen.art</strong></p>
                        </div>
                    </div>
                    
                    <div class="legal-tab-content" id="terms-content">
                        <div class="legal-content-scroll">
                            <h3>Terms and Conditions</h3>
                            <p><strong>Last updated:</strong> January 2025</p>
                            
                            <h4>1. Acceptance of Terms</h4>
                            <p>By accessing and using the Wage Calculator application ("Service"), you accept and agree to be bound by the terms and provision of this agreement.</p>
                            
                            <h4>2. Description of Service</h4>
                            <p>The Wage Calculator is a web-based application that provides:</p>
                            <ul>
                                <li>Wage calculation services based on work schedules and tariff agreements</li>
                                <li>Employee management and shift tracking</li>
                                <li>Payroll calculation and reporting features</li>
                                <li>User account management and data storage</li>
                            </ul>
                            
                            <h4>3. User Accounts and Registration</h4>
                            <ul>
                                <li>You must provide accurate, current, and complete information during registration</li>
                                <li>You are responsible for maintaining the confidentiality of your account credentials</li>
                                <li>You must be at least 18 years old to create an account</li>
                            </ul>
                            
                            <h4>4. Acceptable Use</h4>
                            <h5>4.1 Permitted Uses</h5>
                            <ul>
                                <li>Personal wage calculations and employee management</li>
                                <li>Business use for managing employee payroll</li>
                                <li>Educational and research purposes</li>
                            </ul>
                            
                            <h5>4.2 Prohibited Uses</h5>
                            <ul>
                                <li>Attempting to gain unauthorized access to the system</li>
                                <li>Using the service for illegal or fraudulent activities</li>
                                <li>Interfering with the service's operation or other users' access</li>
                            </ul>
                            
                            <h4>5. Service Limitations</h4>
                            <ul>
                                <li>The service is provided "as is" without warranties of any kind</li>
                                <li>We do not warrant the accuracy of calculations or results</li>
                                <li>We are not liable for any losses related to wage calculations or business decisions</li>
                            </ul>
                            
                            <h4>6. Contact Information</h4>
                            <p>For questions about these terms, contact us at: <strong>kkarlsen06@kkarlsen.art</strong></p>
                        </div>
                    </div>
                </div>
                
                <div class="legal-modal-footer">
                    <button class="btn btn-primary legal-modal-accept" id="legal-accept-btn">I Accept</button>
                    <button class="btn btn-secondary legal-modal-decline" id="legal-decline-btn">Decline</button>
                </div>
            </div>
        `;

        // Add to document
        document.body.appendChild(this.modal);
    }

    bindEvents() {
        // Close button
        const closeBtn = this.modal.querySelector('.legal-modal-close');
        closeBtn.addEventListener('click', () => this.close());

        // Overlay click
        const overlay = this.modal.querySelector('.legal-modal-overlay');
        overlay.addEventListener('click', () => this.close());

        // Tab switching
        const tabs = this.modal.querySelectorAll('.legal-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Accept/Decline buttons
        const acceptBtn = this.modal.querySelector('#legal-accept-btn');
        const declineBtn = this.modal.querySelector('#legal-decline-btn');
        
        if (acceptBtn) {
            acceptBtn.addEventListener('click', () => this.accept());
        }
        if (declineBtn) {
            declineBtn.addEventListener('click', () => this.decline());
        }

        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }

    switchTab(tabName) {
        // Update active tab
        const tabs = this.modal.querySelectorAll('.legal-tab');
        const contents = this.modal.querySelectorAll('.legal-tab-content');
        
        tabs.forEach(tab => tab.classList.remove('active'));
        contents.forEach(content => content.classList.remove('active'));
        
        const targetTab = this.modal.querySelector(`[data-tab="${tabName}"]`);
        const targetContent = this.modal.querySelector(`#${tabName}-content`);
        
        if (targetTab) {
            targetTab.classList.add('active');
        }
        if (targetContent) {
            targetContent.classList.add('active');
        }
    }

    open() {
        console.log('open() called');
        
        // For login page, don't scroll to top
        const isLoginPage = window.location.pathname.includes('login.html');
        
        if (!isLoginPage) {
            // Scroll to top before opening modal (only for landing page)
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
        
        // Wait for scroll to complete before showing modal (or show immediately on login page)
        const delay = isLoginPage ? 0 : 300;
        setTimeout(() => {
            this.modal.classList.add('active');
            this.isOpen = true;
            document.body.style.overflow = 'hidden';
            console.log('Modal opened with active class');
            
            // Focus management
            setTimeout(() => {
                this.modal.querySelector('.legal-modal-close').focus();
            }, 100);
        }, delay);
    }

    close() {
        this.modal.classList.remove('active');
        this.isOpen = false;
        document.body.style.overflow = '';
        
        // Remove landing page class when closing
        this.modal.classList.remove('landing-page');
    }

    accept() {
        // Trigger custom event for acceptance
        const event = new CustomEvent('legalAccepted', {
            detail: { accepted: true }
        });
        document.dispatchEvent(event);
        this.close();
    }

    decline() {
        // Trigger custom event for decline
        const event = new CustomEvent('legalDeclined', {
            detail: { accepted: false }
        });
        document.dispatchEvent(event);
        this.close();
    }

    // Method to show without accept/decline buttons (for info display)
    showInfo() {
        console.log('showInfo called');
        const footer = this.modal.querySelector('.legal-modal-footer');
        if (footer) {
            footer.style.display = 'none';
            console.log('Footer hidden in showInfo');
        }
        this.open();
    }

    // Method to show with accept/decline buttons (for consent)
    showConsent() {
        const footer = this.modal.querySelector('.legal-modal-footer');
        if (footer) {
            footer.style.display = 'flex';
        }
        this.open();
    }

    // Method specifically for landing page display with enhanced scroll behavior
    showFromLandingPage() {
        console.log('showFromLandingPage called');
        
        // Hide the footer with accept/decline buttons for landing page
        const footer = this.modal.querySelector('.legal-modal-footer');
        if (footer) {
            footer.style.display = 'none';
            console.log('Footer hidden');
        }
        
        // Add landing page class for enhanced animation
        this.modal.classList.add('landing-page');
        
        // Check current scroll position and scroll smoothly to top
        const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
        
        if (currentScroll > 100) {
            // Enhanced scroll to top for landing page with smooth behavior
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
            
            // Wait for scroll to complete before showing modal
            setTimeout(() => {
                this.showModalAfterScroll();
            }, 400);
        } else {
            // Already near top, show modal immediately
            this.showModalAfterScroll();
        }
    }
    
    // Helper method to show modal after scroll completion
    showModalAfterScroll() {
        this.modal.classList.add('active');
        this.isOpen = true;
        document.body.style.overflow = 'hidden';
        
        // Focus management with slight delay for better UX
        setTimeout(() => {
            this.modal.querySelector('.legal-modal-close').focus();
        }, 150);
    }

    destroy() {
        if (this.modal && this.modal.parentNode) {
            this.modal.parentNode.removeChild(this.modal);
        }
    }
}

// Export for use in other modules
export default LegalModal;
