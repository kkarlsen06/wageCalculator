function trapFocus(container) {
    const focusableSelectors = [
        'a[href]', 'area[href]', 'input:not([disabled])', 'select:not([disabled])',
        'textarea:not([disabled])', 'button:not([disabled])', 'iframe', 'object',
        'embed', '[tabindex]:not([tabindex="-1"])', '[contenteditable]'
    ];
    const focusable = container.querySelectorAll(focusableSelectors.join(','));
    if (!focusable.length) return () => {};
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    function handleKeydown(e) {
        if (e.key !== 'Tab') return;
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }

    container.addEventListener('keydown', handleKeydown);
    return () => container.removeEventListener('keydown', handleKeydown);
}

export function initPrivacyModal() {
    const modal = document.getElementById('privacy-modal');
    if (!modal) {
        console.warn('Privacy modal not found in DOM');
        return;
    }
    console.log('Privacy modal initialized');
    
    const dialog = modal.querySelector('.modal__dialog');
    const openers = document.querySelectorAll('[data-open-privacy]');
    const closers = modal.querySelectorAll('[data-close-privacy]');
    let restoreFocusEl = null;
    let releaseFocus = null;

    function openModal() {
        console.log('Opening modal...');
        if (modal.classList.contains('is-open')) {
            console.log('Modal already open');
            return;
        }
        restoreFocusEl = document.activeElement;
        
        // Scroll to top so user can see the modal
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        // Focus the dialog or the close button
        const closeBtn = modal.querySelector('.modal__close');
        (closeBtn || dialog).focus({ preventScroll: true });
        releaseFocus = trapFocus(modal);
        console.log('Modal opened successfully');
    }

    function closeModal() {
        if (!modal.classList.contains('is-open')) return;
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        if (releaseFocus) releaseFocus();
        if (restoreFocusEl && typeof restoreFocusEl.focus === 'function') {
            restoreFocusEl.focus({ preventScroll: true });
        }
    }

    // Open via triggers
    openers.forEach(btn => {
        console.log('Adding click listener to:', btn);
        btn.addEventListener('click', (e) => {
            console.log('Privacy button clicked');
            e.preventDefault();
            openModal();
        });
    });

    // Close via overlay or dedicated close buttons
    closers.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            closeModal();
        });
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('is-open')) {
            closeModal();
        }
    });

    // Prevent clicks inside dialog from closing
    dialog.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}
