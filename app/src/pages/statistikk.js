export function renderStatistikk() {
    return `
        <div class="statistics-page">
            <div class="statistics-header">
                <h1 class="page-title">Statistikk</h1>
            </div>

            <!-- Month Navigation - positioned 6px above nav bar -->
            <div class="tab-bar-container statistics-month-container">
                <div class="month-navigation dashboard-month-nav-inline">
                    <button class="month-nav-btn" onclick="navigateStatisticsMonth('prev')" aria-label="Forrige måned">
                        <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                    </button>
                    <span class="month-display" id="currentMonthStatistics">Mai 2025</span>
                    <button class="month-nav-btn" onclick="navigateStatisticsMonth('next')" aria-label="Neste måned">
                        <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <polyline points="9 6 15 12 9 18"></polyline>
                        </svg>
                    </button>
                </div>
            </div>

            <div class="statistics-content">
                <div class="weekly-hours-chart-card" id="weeklyHoursChart">
                    <div class="chart-cards-container">
                        <!-- Bar Chart Card -->
                        <div class="chart-visualization-card">
                            <div class="chart-container">
                                <div class="chart-content">
                                    <div class="chart-bars" id="chartBars">
                                        <!-- Bars will be populated dynamically -->
                                    </div>
                                </div>
                                <div class="chart-labels" id="chartLabels">
                                    <!-- Week labels will be populated dynamically -->
                                </div>
                            </div>
                            <div class="chart-tooltip" id="chartTooltip">
                                <span id="tooltipContent"></span>
                            </div>
                        </div>

                        <!-- Hours Section - Two Stacked Cards -->
                        <div class="chart-hours-section">
                            <!-- Total Hours Card -->
                            <div class="chart-hours-value-card">
                                <div class="hours-value-content">
                                    <div class="hours-value-number" id="totalHours">0</div>
                                    <div class="hours-value-label">timer</div>
                                </div>
                            </div>

                            <!-- Shift Count Card -->
                            <div class="chart-shifts-count-card">
                                <div class="shifts-count-content">
                                    <div class="shifts-count-number" id="shiftCount">0</div>
                                    <div class="shifts-count-label">vakter</div>
                                </div>
                            </div>

                            <!-- Custom tooltip for wage cards -->
                            <div class="wage-card-tooltip" id="wageCardTooltip">
                                <span id="wageTooltipContent"></span>
                            </div>
                        </div>
                    </div>

                    <!-- Progress bar positioned below both cards -->
                    <div class="chart-progress-bar" title="Månedlig mål fremdrift">
                        <div class="chart-progress-fill loading" style="width: 0%"></div>
                        <span class="chart-progress-label">0 % av 0 kr</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export function afterMountStatistikk() {
    // Initialize statistics view
    if (typeof window !== 'undefined' && window.app) {
        // Set current view for the app
        window.app.currentView = 'statistikk';

        // Initialize month display
        updateStatisticsMonthDisplay();

        // Load and display statistics data
        loadStatisticsData();

        // Set up chart interactions and force chart rendering
        setupChartInteractions();

        // Additional initialization to ensure proper display
        setTimeout(() => {
            // Force a complete refresh of the statistics display
            if (window.app.updateStats) {
                window.app.updateStats();
            }
            if (window.app.updateWeeklyChart) {
                window.app.updateWeeklyChart();
            }

            // Re-run chart interactions setup in case new bars were created
            setupChartInteractions();
        }, 200);
    }
}

// Month navigation for statistics page
function navigateStatisticsMonth(direction) {
    if (typeof window !== 'undefined' && window.app) {
        if (direction === 'prev') {
            window.app.navigateToPreviousMonth();
        } else if (direction === 'next') {
            window.app.navigateToNextMonth();
        }

        // Update the statistics display
        updateStatisticsMonthDisplay();
        loadStatisticsData();
    }
}

function updateStatisticsMonthDisplay() {
    if (typeof window !== 'undefined' && window.app) {
        const monthDisplay = document.getElementById('currentMonthStatistics');
        if (monthDisplay && window.app.getCurrentMonthDisplay) {
            monthDisplay.textContent = window.app.getCurrentMonthDisplay();
        }
    }
}

function loadStatisticsData() {
    if (typeof window !== 'undefined' && window.app) {
        // Use existing app methods to load and update statistics
        if (window.app.updateStats) {
            window.app.updateStats();
        }

        // Update chart if chart update method exists
        if (window.app.updateWeeklyChart) {
            window.app.updateWeeklyChart();
        }
    }
}

function setupChartInteractions() {
    // Set up any chart-specific interactions that were in the original statistics section
    const chartBars = document.querySelectorAll('.chart-bar');
    const tooltip = document.getElementById('chartTooltip');

    chartBars.forEach(bar => {
        bar.addEventListener('mouseenter', (e) => {
            if (tooltip && window.app?.showChartTooltip) {
                window.app.showChartTooltip(e.target, tooltip);
            }
        });

        bar.addEventListener('mouseleave', () => {
            if (tooltip) {
                tooltip.style.display = 'none';
            }
        });
    });

    // Ensure chart rendering is triggered after interactions are set up
    if (typeof window !== 'undefined' && window.app) {
        // Force chart update to ensure bars are displayed
        setTimeout(() => {
            if (window.app.updateWeeklyChart) {
                window.app.updateWeeklyChart();
            }
            if (window.app.refreshUI) {
                window.app.refreshUI();
            }
        }, 100);
    }
}

// Make month navigation functions available globally
if (typeof window !== 'undefined') {
    window.navigateStatisticsMonth = navigateStatisticsMonth;
}