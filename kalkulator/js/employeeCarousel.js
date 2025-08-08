/**
 * Employee Carousel Component
 * Horizontal scrolling carousel for employee selection with mobile-first design
 * Following PLACEHOLDER_EMPLOYEES_V1 ruleset
 */

export class EmployeeCarousel {
    constructor(container, app) {
        this.container = container;
        this.app = app;
        this.isInitialized = false;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.isDragging = false;
        this.scrollStartX = 0;
        this.longPressTimer = null;
        this.longPressThreshold = 500; // ms
        
        // Performance optimization
        this.renderCache = new Map();
        this.lastRenderKey = '';
        this.virtualizationThreshold = 30; // Virtualize when more than 30 employees
        this.visibleRange = { start: 0, end: 20 }; // Show 20 items at a time
        this.itemWidth = 80; // Approximate item width for calculations
        this.isVirtualized = false;
        this.isMobile = window.innerWidth <= 768;
        this.touchThreshold = 10; // Minimum distance for touch gestures

        this.init();
    }

    /**
     * Initialize the carousel
     */
    init() {
        if (this.isInitialized) return;
        
        this.createCarouselStructure();
        this.attachEventListeners();
        this.isInitialized = true;
        
        // Initial render
        this.render();
    }

    /**
     * Create the carousel HTML structure
     */
    createCarouselStructure() {
        this.container.innerHTML = `
            <div class="employee-carousel" role="tablist" aria-label="Velg ansatt">
                <div class="carousel-instructions sr-only" aria-live="polite" id="carouselInstructions">
                    Bruk piltastene for å navigere mellom ansatte. Trykk Enter eller mellomrom for å velge. Trykk og hold eller bruk Shift+F10 for handlingsmeny.
                </div>
                <div class="employee-carousel-track" id="employeeCarouselTrack"
                     aria-describedby="carouselInstructions">
                    <!-- Employee tiles will be rendered here -->
                </div>
                <div class="carousel-status sr-only" aria-live="polite" id="carouselStatus">
                    <!-- Status updates will be announced here -->
                </div>
            </div>
        `;

        this.track = this.container.querySelector('.employee-carousel-track');
        this.statusElement = this.container.querySelector('#carouselStatus');
    }

    /**
     * Attach event listeners for touch, mouse, and keyboard interactions
     */
    attachEventListeners() {
        // Touch events for mobile
        this.track.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.track.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.track.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
        
        // Mouse events for desktop
        this.track.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.track.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.track.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.track.addEventListener('mouseleave', this.handleMouseUp.bind(this));
        
        // Keyboard navigation
        this.track.addEventListener('keydown', this.handleKeyDown.bind(this));

        // Focus events for accessibility
        this.track.addEventListener('focus', this.handleFocus.bind(this), true);

        // Scroll events for virtualization
        this.track.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });

        // Window resize for mobile detection
        window.addEventListener('resize', this.handleResize.bind(this), { passive: true });

        // Prevent context menu on long press
        this.track.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    /**
     * Render the carousel with current employees
     */
    async render() {
        try {
            // Generate render key for caching
            const renderKey = this.generateRenderKey();
            if (renderKey === this.lastRenderKey && this.renderCache.has(renderKey)) {
                this.track.innerHTML = this.renderCache.get(renderKey);
                this.updateActiveStates();
                return;
            }

            // Show loading state
            this.showLoadingState();
            this.announceLoading();

            // Render "All" tile
            const allTile = this.createAllTile();

            // Render employee tiles
            const employeeTiles = await this.createEmployeeTiles();

            // Render "Add" tile
            const addTile = this.createAddTile();

            // Combine all tiles
            const html = allTile + employeeTiles + addTile;

            // Cache and render
            this.renderCache.set(renderKey, html);
            this.lastRenderKey = renderKey;
            this.track.innerHTML = html;

            // Update active states and focus management
            this.updateActiveStates();
            this.updateFocusManagement();

            // Scroll to active item if needed
            this.scrollToActiveItem();

            // Announce completion
            const employeeCount = this.app.employees.length;
            this.announceSelection(`${employeeCount} ansatte lastet`);

        } catch (error) {
            console.error('Error rendering employee carousel:', error);
            this.showErrorState();
            this.announceError();
        }
    }

    /**
     * Generate a cache key for the current render state
     */
    generateRenderKey() {
        const employeeIds = this.app.employees.map(emp => emp.id).sort().join(',');
        const selectedId = this.app.selectedEmployeeId || 'all';
        return `${employeeIds}_${selectedId}_${this.app.employees.length}`;
    }

    /**
     * Create the "All" employees tile
     */
    createAllTile() {
        const isActive = this.app.isAllEmployeesSelected();
        return `
            <div class="employee-tile ${isActive ? 'active' : ''}" 
                 data-employee-id="all" 
                 role="tab" 
                 tabindex="${isActive ? '0' : '-1'}"
                 aria-selected="${isActive}"
                 aria-label="Alle ansatte">
                <div class="employee-avatar all-avatar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                </div>
                <div class="employee-name">Alle</div>
            </div>
        `;
    }

    /**
     * Create employee tiles (with virtualization for large lists)
     */
    async createEmployeeTiles() {
        if (!this.app.employees || this.app.employees.length === 0) {
            return '';
        }

        // Check if we need virtualization
        this.isVirtualized = this.app.employees.length > this.virtualizationThreshold;

        if (this.isVirtualized) {
            return await this.createVirtualizedEmployeeTiles();
        } else {
            const tiles = await Promise.all(
                this.app.employees.map(employee => this.createEmployeeTile(employee))
            );
            return tiles.join('');
        }
    }

    /**
     * Create virtualized employee tiles for large lists
     */
    async createVirtualizedEmployeeTiles() {
        const { start, end } = this.visibleRange;
        const visibleEmployees = this.app.employees.slice(start, end);

        // Create spacer elements for items outside visible range
        const beforeSpacer = start > 0 ?
            `<div class="carousel-spacer" style="width: ${start * this.itemWidth}px;"></div>` : '';

        const afterSpacer = end < this.app.employees.length ?
            `<div class="carousel-spacer" style="width: ${(this.app.employees.length - end) * this.itemWidth}px;"></div>` : '';

        // Create tiles for visible employees
        const tiles = await Promise.all(
            visibleEmployees.map(employee => this.createEmployeeTile(employee))
        );

        return beforeSpacer + tiles.join('') + afterSpacer;
    }

    /**
     * Create a single employee tile
     */
    async createEmployeeTile(employee) {
        const isActive = this.app.isEmployeeSelected(employee.id);
        const initials = this.app.getEmployeeInitials(employee);
        const displayColor = this.app.getEmployeeDisplayColor(employee);
        const accessibleDescription = this.getEmployeeAccessibleDescription(employee);

        // Try to get avatar URL
        let avatarUrl = null;
        try {
            avatarUrl = await this.app.getEmployeeAvatarUrl(employee.id);
        } catch (error) {
            console.warn('Failed to load avatar for employee:', employee.id);
        }

        return `
            <div class="employee-tile ${isActive ? 'active' : ''}"
                 data-employee-id="${employee.id}"
                 role="tab"
                 tabindex="${isActive ? '0' : '-1'}"
                 aria-selected="${isActive}"
                 aria-label="${accessibleDescription}"
                 aria-describedby="employee-desc-${employee.id}">
                <div class="employee-avatar" style="--employee-color: ${displayColor}">
                    ${avatarUrl ?
                        `<img src="${avatarUrl}" alt="Profilbilde for ${employee.name}" class="avatar-image" />` :
                        `<div class="avatar-initials" aria-hidden="true">${initials}</div>`
                    }
                </div>
                <div class="employee-name" id="employee-desc-${employee.id}">${employee.name}</div>
                <button class="employee-actions-btn"
                        aria-label="Åpne handlingsmeny for ${employee.name}"
                        aria-haspopup="menu"
                        data-employee-id="${employee.id}"
                        tabindex="-1">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="12" cy="5" r="1"></circle>
                        <circle cx="12" cy="19" r="1"></circle>
                    </svg>
                </button>
            </div>
        `;
    }

    /**
     * Create the "Add" employee tile
     */
    createAddTile() {
        return `
            <div class="employee-tile add-tile" 
                 data-action="add" 
                 role="button" 
                 tabindex="0"
                 aria-label="Legg til ny ansatt">
                <div class="employee-avatar add-avatar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="16"></line>
                        <line x1="8" y1="12" x2="16" y2="12"></line>
                    </svg>
                </div>
                <div class="employee-name">Legg til</div>
            </div>
        `;
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        this.track.innerHTML = `
            <div class="employee-carousel-loading">
                <div class="loading-skeleton"></div>
                <div class="loading-skeleton"></div>
                <div class="loading-skeleton"></div>
            </div>
        `;
    }

    /**
     * Show error state
     */
    showErrorState() {
        this.track.innerHTML = `
            <div class="employee-carousel-error">
                <div class="error-message">Kunne ikke laste ansatte</div>
                <button class="retry-btn" onclick="app.loadEmployees()">Prøv igjen</button>
            </div>
        `;
    }

    /**
     * Update active states for all tiles
     */
    updateActiveStates() {
        const tiles = this.track.querySelectorAll('.employee-tile');
        tiles.forEach(tile => {
            const employeeId = tile.dataset.employeeId;
            const isActive = employeeId === 'all' ? 
                this.app.isAllEmployeesSelected() : 
                this.app.isEmployeeSelected(employeeId);
            
            tile.classList.toggle('active', isActive);
            tile.setAttribute('aria-selected', isActive);
            tile.setAttribute('tabindex', isActive ? '0' : '-1');
        });
    }

    /**
     * Scroll to the active item
     */
    scrollToActiveItem() {
        const activeTile = this.track.querySelector('.employee-tile.active');
        if (activeTile) {
            activeTile.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            });
        }
    }

    /**
     * Handle touch start
     */
    handleTouchStart(e) {
        const touch = e.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        this.scrollStartX = this.track.scrollLeft;
        this.isDragging = false;

        // Start long press timer
        const target = e.target.closest('.employee-tile');
        if (target && target.dataset.employeeId && target.dataset.employeeId !== 'all') {
            this.startLongPress(target, e);
        }
    }

    /**
     * Handle touch move
     */
    handleTouchMove(e) {
        if (e.touches.length !== 1) return;

        const touch = e.touches[0];
        const deltaX = this.touchStartX - touch.clientX;
        const deltaY = this.touchStartY - touch.clientY;

        // Determine if this is a horizontal scroll
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > this.touchThreshold) {
            e.preventDefault(); // Prevent vertical scroll
            this.isDragging = true;

            // Smooth scrolling with momentum on mobile
            if (this.isMobile) {
                const momentum = deltaX * 0.8; // Reduce sensitivity on mobile
                this.track.scrollLeft = this.scrollStartX + momentum;
            } else {
                this.track.scrollLeft = this.scrollStartX + deltaX;
            }
        }

        // Cancel long press if moved too much
        if (Math.abs(deltaX) > this.touchThreshold || Math.abs(deltaY) > this.touchThreshold) {
            this.cancelLongPress();
        }
    }

    /**
     * Handle touch end
     */
    handleTouchEnd(e) {
        this.cancelLongPress();

        if (!this.isDragging) {
            // This was a tap, not a drag
            const target = e.target.closest('.employee-tile');
            if (target) {
                this.handleTileClick(target);
            }
        }

        this.isDragging = false;
    }

    /**
     * Handle mouse down
     */
    handleMouseDown(e) {
        this.touchStartX = e.clientX;
        this.scrollStartX = this.track.scrollLeft;
        this.isDragging = false;

        // Start long press timer for right-click alternative
        const target = e.target.closest('.employee-tile');
        if (target && target.dataset.employeeId && target.dataset.employeeId !== 'all') {
            this.startLongPress(target, e);
        }
    }

    /**
     * Handle mouse move
     */
    handleMouseMove(e) {
        if (e.buttons !== 1) return; // Only handle left mouse button

        const deltaX = this.touchStartX - e.clientX;

        if (Math.abs(deltaX) > 10) {
            this.isDragging = true;
            this.track.scrollLeft = this.scrollStartX + deltaX;
            this.cancelLongPress();
        }
    }

    /**
     * Handle mouse up
     */
    handleMouseUp(e) {
        this.cancelLongPress();

        if (!this.isDragging) {
            const target = e.target.closest('.employee-tile');
            if (target) {
                this.handleTileClick(target);
            }
        }

        this.isDragging = false;
    }

    /**
     * Handle keyboard navigation
     */
    handleKeyDown(e) {
        const focusedTile = document.activeElement.closest('.employee-tile');
        if (!focusedTile) return;

        let nextTile = null;

        switch (e.key) {
            case 'ArrowLeft':
                nextTile = focusedTile.previousElementSibling;
                break;
            case 'ArrowRight':
                nextTile = focusedTile.nextElementSibling;
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                this.handleTileClick(focusedTile);
                return;
            case 'ContextMenu':
            case 'F10':
                if (e.shiftKey && focusedTile.dataset.employeeId !== 'all') {
                    e.preventDefault();
                    this.showActionsMenu(focusedTile);
                }
                return;
        }

        if (nextTile) {
            e.preventDefault();
            nextTile.focus();
            nextTile.scrollIntoView({ behavior: 'smooth', inline: 'center' });
        }
    }

    /**
     * Handle tile click/tap
     */
    handleTileClick(tile) {
        const employeeId = tile.dataset.employeeId;
        const action = tile.dataset.action;

        // Handle actions button first
        if (tile.classList.contains('employee-actions-btn') ||
            tile.closest('.employee-actions-btn')) {
            const parentTile = tile.closest('.employee-tile');
            if (parentTile) {
                this.showActionsMenu(parentTile);
                return;
            }
        }

        if (action === 'add') {
            this.handleAddEmployee();
        } else if (employeeId === 'all') {
            this.app.setSelectedEmployee(null);
            this.announceSelection('Alle ansatte valgt');
        } else if (employeeId) {
            const employee = this.app.employees.find(emp => emp.id === employeeId);
            if (employee) {
                this.app.setSelectedEmployee(employeeId);
                this.announceSelection(`${employee.name} valgt`);
            }
        }
    }

    /**
     * Start long press timer
     */
    startLongPress(tile, event) {
        this.cancelLongPress();
        this.longPressTimer = setTimeout(() => {
            this.showActionsMenu(tile);
            // Provide haptic feedback if available
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
        }, this.longPressThreshold);
    }

    /**
     * Cancel long press timer
     */
    cancelLongPress() {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
    }

    /**
     * Show actions menu for an employee
     */
    async showActionsMenu(tile) {
        const employeeId = tile.dataset.employeeId;
        if (!employeeId || employeeId === 'all') return;

        try {
            // Import actions menu dynamically
            const { EmployeeActionsMenu } = await import('./employeeActionsMenu.js');

            // Create or get existing actions menu instance
            if (!this.actionsMenu) {
                this.actionsMenu = new EmployeeActionsMenu(this.app);
            }

            // Show the menu
            this.actionsMenu.show(employeeId, tile);

        } catch (error) {
            console.error('Error showing actions menu:', error);
        }
    }

    /**
     * Handle add employee action
     */
    async handleAddEmployee() {
        try {
            // Import employee modal
            const { EmployeeModal } = await import('./employeeModal.js');

            // Create or get existing modal instance
            if (!this.employeeModal) {
                this.employeeModal = new EmployeeModal(this.app);
            }

            // Show create modal
            await this.employeeModal.showCreate();

        } catch (error) {
            console.error('Error opening add employee modal:', error);
            this.announceSelection('Kunne ikke åpne nytt ansatt-vindu');
        }
    }

    /**
     * Update the carousel (called when employees change)
     */
    update() {
        this.renderCache.clear();
        this.render();
    }

    /**
     * Destroy the carousel and clean up
     */
    destroy() {
        this.cancelLongPress();
        this.cleanup();

        // Clean up actions menu
        if (this.actionsMenu) {
            this.actionsMenu.hide();
            this.actionsMenu = null;
        }

        this.isInitialized = false;
    }

    /**
     * Announce status to screen readers
     * @param {string} message - Message to announce
     */
    announceSelection(message) {
        if (this.statusElement) {
            this.statusElement.textContent = message;
        }
    }

    /**
     * Announce loading state
     */
    announceLoading() {
        this.announceSelection('Laster ansatte...');
    }

    /**
     * Announce error state
     */
    announceError() {
        this.announceSelection('Feil ved lasting av ansatte');
    }

    /**
     * Get accessible description for employee tile
     * @param {Object} employee - Employee object
     * @returns {string} Accessible description
     */
    getEmployeeAccessibleDescription(employee) {
        const parts = [`Ansatt: ${employee.name}`];

        if (employee.hourly_wage) {
            parts.push(`Timelønn: ${employee.hourly_wage} kr`);
        }

        if (employee.archived_at) {
            parts.push('Arkivert');
        }

        return parts.join(', ');
    }

    /**
     * Update focus management when employees change
     */
    updateFocusManagement() {
        const tiles = this.track.querySelectorAll('.employee-tile');
        const activeTile = this.track.querySelector('.employee-tile.active');

        // Ensure only the active tile is focusable
        tiles.forEach(tile => {
            const isActive = tile.classList.contains('active');
            tile.setAttribute('tabindex', isActive ? '0' : '-1');
        });

        // If no active tile and tiles exist, make first tile focusable
        if (!activeTile && tiles.length > 0) {
            tiles[0].setAttribute('tabindex', '0');
        }
    }

    /**
     * Handle focus events for better accessibility
     */
    handleFocus(e) {
        const tile = e.target.closest('.employee-tile');
        if (tile) {
            // Announce the focused employee
            const employeeId = tile.dataset.employeeId;
            if (employeeId === 'all') {
                this.announceSelection('Fokus på: Alle ansatte');
            } else if (tile.dataset.action === 'add') {
                this.announceSelection('Fokus på: Legg til ny ansatt');
            } else {
                const employee = this.app.employees.find(emp => emp.id === employeeId);
                if (employee) {
                    this.announceSelection(`Fokus på: ${this.getEmployeeAccessibleDescription(employee)}`);
                }
            }
        }
    }

    /**
     * Handle scroll events for virtualization
     */
    handleScroll() {
        if (!this.isVirtualized) return;

        // Throttle scroll events
        if (this.scrollTimeout) return;

        this.scrollTimeout = setTimeout(() => {
            this.updateVisibleRange();
            this.scrollTimeout = null;
        }, 16); // ~60fps
    }

    /**
     * Update visible range for virtualization
     */
    updateVisibleRange() {
        if (!this.isVirtualized) return;

        const scrollLeft = this.track.scrollLeft;
        const containerWidth = this.track.clientWidth;

        // Calculate visible range with buffer
        const buffer = 5; // Show 5 extra items on each side
        const startIndex = Math.max(0, Math.floor(scrollLeft / this.itemWidth) - buffer);
        const endIndex = Math.min(
            this.app.employees.length,
            Math.ceil((scrollLeft + containerWidth) / this.itemWidth) + buffer
        );

        // Only re-render if range changed significantly
        if (Math.abs(startIndex - this.visibleRange.start) > 3 ||
            Math.abs(endIndex - this.visibleRange.end) > 3) {
            this.visibleRange = { start: startIndex, end: endIndex };
            this.renderVirtualizedUpdate();
        }
    }

    /**
     * Render virtualized update (more efficient than full re-render)
     */
    async renderVirtualizedUpdate() {
        try {
            const employeeTiles = await this.createVirtualizedEmployeeTiles();
            const allTile = this.createAllTile();
            const addTile = this.createAddTile();

            this.track.innerHTML = allTile + employeeTiles + addTile;
            this.updateActiveStates();
            this.updateFocusManagement();

        } catch (error) {
            console.error('Error updating virtualized carousel:', error);
        }
    }

    /**
     * Debounced render method for performance
     */
    debouncedRender() {
        if (this.renderTimeout) {
            clearTimeout(this.renderTimeout);
        }

        this.renderTimeout = setTimeout(() => {
            this.render();
            this.renderTimeout = null;
        }, 100);
    }

    /**
     * Optimized update method that only re-renders if necessary
     */
    update() {
        const newRenderKey = this.generateRenderKey();

        // Only re-render if something actually changed
        if (newRenderKey !== this.lastRenderKey) {
            this.renderCache.clear();
            this.debouncedRender();
        } else {
            // Just update active states if data is the same
            this.updateActiveStates();
            this.updateFocusManagement();
        }
    }

    /**
     * Preload avatar images for better performance
     */
    async preloadAvatars() {
        if (!this.app.employees || this.app.employees.length === 0) return;

        // Preload avatars for visible employees
        const visibleEmployees = this.isVirtualized ?
            this.app.employees.slice(this.visibleRange.start, this.visibleRange.end) :
            this.app.employees.slice(0, 10); // Preload first 10 if not virtualized

        const preloadPromises = visibleEmployees.map(async (employee) => {
            try {
                await this.app.getEmployeeAvatarUrl(employee.id);
            } catch (error) {
                // Ignore preload errors
            }
        });

        await Promise.allSettled(preloadPromises);
    }

    /**
     * Clean up performance-related resources
     */
    cleanup() {
        if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
            this.scrollTimeout = null;
        }

        if (this.renderTimeout) {
            clearTimeout(this.renderTimeout);
            this.renderTimeout = null;
        }

        this.renderCache.clear();
    }

    /**
     * Handle window resize for mobile detection and layout updates
     */
    handleResize() {
        const wasMobile = this.isMobile;
        this.isMobile = window.innerWidth <= 768;

        // Update item width based on screen size
        if (this.isMobile) {
            this.itemWidth = window.innerWidth <= 480 ? 60 : 70;
        } else {
            this.itemWidth = 80;
        }

        // Re-render if mobile state changed
        if (wasMobile !== this.isMobile) {
            this.debouncedRender();
        }

        // Update virtualization if needed
        if (this.isVirtualized) {
            this.updateVisibleRange();
        }
    }
}
