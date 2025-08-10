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
                <div class="carousel-edge-blur left" aria-hidden="true" style="display: none;"></div>
                <button class="carousel-arrow carousel-arrow-left" aria-label="Scroll venstre" style="display: none;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                </button>
                <div class="employee-carousel-track" id="employeeCarouselTrack"
                     aria-describedby="carouselInstructions">
                    <!-- Employee tiles will be rendered here -->
                </div>
                <button class="carousel-arrow carousel-arrow-right" aria-label="Scroll høyre" style="display: none;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                </button>
                <div class="carousel-edge-blur right" aria-hidden="true" style="display: none;"></div>
                <div class="carousel-status sr-only" aria-live="polite" id="carouselStatus">
                    <!-- Status updates will be announced here -->
                </div>
            </div>
        `;

        this.track = this.container.querySelector('.employee-carousel-track');
        this.statusElement = this.container.querySelector('#carouselStatus');
        this.leftArrow = this.container.querySelector('.carousel-arrow-left');
        this.rightArrow = this.container.querySelector('.carousel-arrow-right');
        this.leftEdgeBlur = this.container.querySelector('.carousel-edge-blur.left');
        this.rightEdgeBlur = this.container.querySelector('.carousel-edge-blur.right');
    }

    /**
     * Attach event listeners for touch, mouse, and keyboard interactions
     */
    attachEventListeners() {
        // Simplified touch events - let native scrolling work
        this.track.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
        this.track.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
        
        // Add wheel event for horizontal scrolling on desktop
        this.track.addEventListener('wheel', (e) => {
            if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
                e.preventDefault();
                this.track.scrollLeft += e.deltaX;
            } else if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                // Allow horizontal scroll with vertical wheel
                e.preventDefault();
                this.track.scrollLeft += e.deltaY;
            }
        }, { passive: false });
        // Click handler for all tile interactions
        this.track.addEventListener('click', (e) => {
            const tile = e.target.closest('.employee-tile');
            if (tile) {
                e.preventDefault();
                e.stopPropagation();
                
                // Handle add tile
                if (tile.dataset.action === 'add') {
                    try {
                        console.debug('[employees] add-click');
                        this.handleAddEmployee();
                    } catch (err) {
                        console.error('Add employee click handler failed:', err);
                    }
                } else {
                    // Handle employee selection
                    this.handleTileClick(tile);
                }
            }
        });
        
        // Keyboard navigation
        this.track.addEventListener('keydown', this.handleKeyDown.bind(this));

        // Focus events for accessibility
        this.track.addEventListener('focus', this.handleFocus.bind(this), true);

        // Scroll events for virtualization and arrow visibility
        this.track.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });

        // Arrow button clicks for desktop navigation
        if (this.leftArrow && this.rightArrow) {
            this.leftArrow.addEventListener('click', () => {
                this.track.scrollBy({ left: -200, behavior: 'smooth' });
            });
            this.rightArrow.addEventListener('click', () => {
                this.track.scrollBy({ left: 200, behavior: 'smooth' });
            });
        }

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

            // Render employee tiles
            const employeeTiles = await this.createEmployeeTiles();

            // Render "Add" tile
            const addTile = this.createAddTile();

            // Combine all tiles
            const html = employeeTiles + addTile;

            // Cache and render
            this.renderCache.set(renderKey, html);
            this.lastRenderKey = renderKey;
            this.track.innerHTML = html;

            // Update active states and focus management
            this.updateActiveStates();
            this.updateFocusManagement();

            // Scroll to active item if needed
            this.scrollToActiveItem();
            
            // Update arrow visibility after render
            this.updateArrowVisibility();

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
        const selectedId = this.app.selectedEmployeeId || 'none';
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

        // Avatars disabled: always render initials
        return `
            <div class="employee-tile ${isActive ? 'active' : ''}"
                 data-employee-id="${employee.id}"
                 role="tab"
                 tabindex="${isActive ? '0' : '-1'}"
                 aria-selected="${isActive}"
                 aria-label="${accessibleDescription}"
                 aria-describedby="employee-desc-${employee.id}">
                <div class="employee-avatar" style="--employee-color: ${displayColor}">
                    <div class="avatar-initials" aria-hidden="true">${initials}</div>
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
            const isActive = this.app.isEmployeeSelected(employeeId);
            
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
     * Handle touch move - removed as we're using native scrolling
     * This method is no longer called, but kept for backward compatibility
     */
    handleTouchMove(e) {
        // Let native scrolling handle movement
        // Just cancel long press if moved
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const deltaX = this.touchStartX - touch.clientX;
            const deltaY = this.touchStartY - touch.clientY;
            
            if (Math.abs(deltaX) > this.touchThreshold || Math.abs(deltaY) > this.touchThreshold) {
                this.cancelLongPress();
                this.isDragging = true;
            }
        }
    }

    /**
     * Handle touch end
     */
    handleTouchEnd(e) {
        this.cancelLongPress();
        
        // Let click event handle tile selection
        // This prevents double-firing on touch devices
        this.isDragging = false;
    }

    /**
     * Handle mouse down - simplified for long press only
     */
    handleMouseDown(e) {
        // Let native scrolling handle dragging
        // Just track for long press
        const target = e.target.closest('.employee-tile');
        if (target && target.dataset.employeeId && target.dataset.employeeId !== 'all') {
            this.startLongPress(target, e);
        }
    }

    /**
     * Handle mouse move - no longer needed with native scrolling
     */
    handleMouseMove(e) {
        // Method kept for backward compatibility
        this.cancelLongPress();
    }

    /**
     * Handle mouse up - simplified
     */
    handleMouseUp(e) {
        this.cancelLongPress();
        // Click is now handled by the click event listener
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
                if (e.shiftKey) {
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
        } else if (employeeId) {
            const employee = this.app.employees.find(emp => emp.id === employeeId);
            if (employee) {
                const isAlreadySelected = this.app.isEmployeeSelected(employeeId);
                if (isAlreadySelected) {
                    // Clicking an already selected employee opens the Edit Employee modal
                    this.app.showEditEmployeeModal?.(employee);
                } else {
                    this.app.setSelectedEmployee(employeeId);
                    this.announceSelection(`${employee.name} valgt`);
                }
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
        if (!employeeId) return;

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
            console.debug('[employees] opening create employee modal');
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
        // Update arrow visibility on desktop
        this.updateArrowVisibility();
        
        if (!this.isVirtualized) return;

        // Throttle scroll events
        if (this.scrollTimeout) return;

        this.scrollTimeout = setTimeout(() => {
            this.updateVisibleRange();
            this.scrollTimeout = null;
        }, 16); // ~60fps
    }
    
    /**
     * Update arrow visibility based on scroll position
     */
    updateArrowVisibility() {
        if (!this.leftArrow || !this.rightArrow || !this.track) return;
        
        // Only show arrows on desktop
        const isDesktop = window.innerWidth > 768;
        if (!isDesktop) {
            this.leftArrow.style.display = 'none';
            this.rightArrow.style.display = 'none';
            if (this.leftEdgeBlur) this.leftEdgeBlur.style.display = 'none';
            if (this.rightEdgeBlur) this.rightEdgeBlur.style.display = 'none';
            return;
        }
        
        const scrollLeft = this.track.scrollLeft;
        const scrollWidth = this.track.scrollWidth;
        const clientWidth = this.track.clientWidth;
        
        // Show/hide left arrow
        const showLeft = scrollLeft > 5;
        this.leftArrow.style.display = showLeft ? 'flex' : 'none';
        if (this.leftEdgeBlur) this.leftEdgeBlur.style.display = showLeft ? 'block' : 'none';
        
        // Show/hide right arrow
        const showRight = scrollLeft < scrollWidth - clientWidth - 5;
        this.rightArrow.style.display = showRight ? 'flex' : 'none';
        if (this.rightEdgeBlur) this.rightEdgeBlur.style.display = showRight ? 'block' : 'none';
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
            const addTile = this.createAddTile();

            this.track.innerHTML = employeeTiles + addTile;
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

            // Avatars disabled: nothing to preload
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
