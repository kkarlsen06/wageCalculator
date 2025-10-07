export function renderStatistikk() {
    return `
        <div class="statistics-page">
            <header class="statistics-hero" role="banner">
                <div class="statistics-hero__text">
                    <span class="statistics-hero__eyebrow">Innsikt</span>
                    <h1 class="statistics-hero__title">Statistikk</h1>
                    <p class="statistics-hero__subtitle">
                        Følg inntektene dine og finn trender i <span data-month-copy data-month-fallback="denne måneden">denne måneden</span>.
                    </p>
                    <p class="statistics-hero__status" aria-live="polite">
                        Sist oppdatert <time id="lastUpdatedTime">--:--</time>
                    </p>
                </div>
                <div class="statistics-hero__meta">
                    <div class="statistics-month" role="group" aria-label="Velg måned">
                        <button type="button" class="month-nav-button" aria-label="Forrige måned" onclick="navigateStatisticsMonth('prev')">
                            <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="15 18 9 12 15 6"></polyline>
                            </svg>
                        </button>
                        <div class="month-display" id="currentMonthStatistics" aria-live="polite" aria-atomic="true">--</div>
                        <button type="button" class="month-nav-button" aria-label="Neste måned" onclick="navigateStatisticsMonth('next')">
                            <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="9 6 15 12 9 18"></polyline>
                            </svg>
                        </button>
                    </div>
                    <button type="button" class="statistics-hero__pill" id="statisticsSummaryPill" aria-controls="statisticsOverviewSection">
                        <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 17c3-6 9-10 18-10"></path>
                            <polyline points="19 5 21 7 19 9"></polyline>
                        </svg>
                        <span>Oppsummering</span>
                    </button>
                </div>
            </header>

            <section class="statistics-overview" id="statisticsOverviewSection" aria-labelledby="statisticsOverviewHeading">
                <div class="section-heading">
                    <h2 id="statisticsOverviewHeading">Månedsoversikt</h2>
                    <p>Høydepunkter for <span id="overviewMonthName">denne måneden</span>.</p>
                </div>
                <div class="statistics-overview__grid">
                    <article class="finance-card finance-card--primary total-card" tabindex="0">
                        <div class="finance-card__header">
                            <div>
                                <p class="finance-card__eyebrow">Utbetalt</p>
                                <h3 class="finance-card__title">Denne måneden</h3>
                            </div>
                            <span class="finance-card__icon" aria-hidden="true">
                                <svg focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="3" y="6" width="18" height="12" rx="2"></rect>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                    <circle cx="12" cy="13" r="2.5"></circle>
                                </svg>
                            </span>
                        </div>
                        <div class="finance-card__metric" id="totalAmount" aria-live="polite">0 kr</div>
                        <p class="finance-card__caption total-label">Denne måneden</p>
                        <div class="total-secondary-info" id="totalSecondaryInfo" aria-live="polite">
                            <div class="secondary-info-content">
                                <span class="bonus-amount">0 kr</span>
                                <span class="before-tax-text">før skatt</span>
                            </div>
                        </div>
                    </article>

                    <article class="finance-card finance-card--muted" aria-live="polite">
                        <div class="finance-card__header">
                            <p class="finance-card__eyebrow">Timer jobbet</p>
                            <span class="finance-card__icon" aria-hidden="true">
                                <svg focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="12" cy="12" r="8"></circle>
                                    <polyline points="12 8 12 12 15 13"></polyline>
                                </svg>
                            </span>
                        </div>
                        <div class="finance-card__metric" id="totalHoursDisplay">0</div>
                        <p class="finance-card__caption" id="totalHoursSubtext">Timer registrert</p>
                    </article>

                    <article class="finance-card finance-card--muted" aria-live="polite">
                        <div class="finance-card__header">
                            <p class="finance-card__eyebrow">Antall vakter</p>
                            <span class="finance-card__icon" aria-hidden="true">
                                <svg focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="3" y="4" width="18" height="18" rx="3"></rect>
                                    <path d="M16 2v4"></path>
                                    <path d="M8 2v4"></path>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                </svg>
                            </span>
                        </div>
                        <div class="finance-card__metric" id="shiftCountDisplay">0</div>
                        <p class="finance-card__caption" id="shiftCountSubtext">Registrerte vakter</p>
                    </article>

                    <article class="finance-card finance-card--goal" aria-live="polite">
                        <div class="finance-card__header">
                            <p class="finance-card__eyebrow">Måloppnåelse</p>
                            <span class="finance-card__icon" aria-hidden="true">
                                <svg focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="12" cy="12" r="9"></circle>
                                    <polyline points="12 7 12 12 15 15"></polyline>
                                </svg>
                            </span>
                        </div>
                        <div class="finance-card__metric" id="goalProgressValue">0%</div>
                        <p class="finance-card__caption" id="goalProgressMeta">0 kr av 0 kr</p>
                    </article>
                </div>
            </section>

            <section class="statistics-chart" aria-labelledby="workloadHeading">
                <div class="section-heading">
                    <h2 id="workloadHeading">Ukentlig oversikt</h2>
                    <p>Se hvordan timene fordeler seg gjennom måneden.</p>
                </div>
                <div class="weekly-hours-chart-card" id="weeklyHoursChart">
                    <div class="chart-cards-container">
                        <div class="chart-visualization-card" role="presentation">
                            <div class="chart-container">
                                <div class="chart-content">
                                    <div class="chart-bars" id="chartBars" role="list" aria-label="Timer per uke"></div>
                                </div>
                                <div class="chart-labels" id="chartLabels" aria-hidden="true"></div>
                            </div>
                            <div class="chart-tooltip" id="chartTooltip" role="status" aria-live="polite">
                                <span id="tooltipContent"></span>
                            </div>
                        </div>

                        <div class="chart-hours-section chart-stats-section" aria-label="Detaljer for valgt periode">
                            <div class="chart-hours-value-card" role="button" tabindex="0">
                                <div class="hours-value-content">
                                    <div class="hours-value-number" id="totalHours">0</div>
                                    <div class="hours-value-label">timer</div>
                                </div>
                            </div>

                            <div class="chart-shifts-count-card" role="button" tabindex="0">
                                <div class="shifts-count-content">
                                    <div class="shifts-count-number" id="shiftCount">0</div>
                                    <div class="shifts-count-label">vakter</div>
                                </div>
                            </div>

                            <div class="wage-card-tooltip" id="wageCardTooltip" role="tooltip">
                                <span id="wageTooltipContent"></span>
                            </div>
                        </div>
                    </div>

                    <div class="chart-progress-bar" title="Fremdrift mot månedlig mål">
                        <div class="chart-progress-fill loading" style="width: 0%"></div>
                        <span class="chart-progress-label">0 % av 0 kr</span>
                        <span class="sr-only" id="chartProgressAccessible"></span>
                    </div>
                </div>
            </section>

            <section class="statistics-insights" aria-labelledby="statisticsInsightsHeading">
                <div class="section-heading">
                    <h2 id="statisticsInsightsHeading">Lønnsinnsikt</h2>
                    <p>Oppdag hvordan vaktene påvirker inntektene dine.</p>
                </div>
                <div class="statistics-insights__grid">
                    <article class="insight-card" aria-live="polite">
                        <div class="insight-card__header">
                            <span class="insight-card__icon" aria-hidden="true">
                                <svg focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M12 3v3"></path>
                                    <path d="M12 18v3"></path>
                                    <path d="M4.93 4.93l2.12 2.12"></path>
                                    <path d="M16.95 16.95l2.12 2.12"></path>
                                    <path d="M21 12h-3"></path>
                                    <path d="M6 12H3"></path>
                                    <circle cx="12" cy="12" r="4"></circle>
                                </svg>
                            </span>
                            <p class="insight-card__eyebrow">Snitt per time</p>
                        </div>
                        <div class="insight-card__metric" id="averageHourlyRate">—</div>
                        <p class="insight-card__caption" id="averageHourlyMeta">Basert på registrerte timer</p>
                    </article>

                    <article class="insight-card" aria-live="polite">
                        <div class="insight-card__header">
                            <span class="insight-card__icon" aria-hidden="true">
                                <svg focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M4 9v11a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9"></path>
                                    <path d="M12 3l8 6H4Z"></path>
                                    <path d="M9 14h6"></path>
                                    <path d="M9 18h3"></path>
                                </svg>
                            </span>
                            <p class="insight-card__eyebrow">Tillegg og bonuser</p>
                        </div>
                        <div class="insight-card__metric" id="totalBonusAmount">—</div>
                        <p class="insight-card__caption">Totalt ekstra denne måneden</p>
                    </article>

                    <article class="insight-card insight-card--accent" aria-live="polite">
                        <div class="insight-card__header">
                            <span class="insight-card__icon" aria-hidden="true">
                                <svg focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                                    <polygon points="12 2 15 9 22 9 17 14 19 21 12 17 5 21 7 14 2 9 9 9"></polygon>
                                </svg>
                            </span>
                            <p class="insight-card__eyebrow">Beste vakt</p>
                        </div>
                        <div class="insight-card__metric" id="bestShiftValue">—</div>
                        <p class="insight-card__caption" id="bestShiftMeta">Ingen registrerte vakter ennå</p>
                    </article>
                </div>
            </section>
        </div>
    `;
}

export function afterMountStatistikk() {
    // Initialize statistics view
    if (typeof window !== 'undefined' && window.app) {
        // Set current view for the app
        window.app.currentView = 'statistikk';

        attachStatisticsEnhancer();

        // Initialize month display
        updateStatisticsMonthDisplay();

        setupStatisticsSummaryNavigation();

        // Load and display statistics data
        loadStatisticsData();

        // Set up chart interactions and force chart rendering
        setupChartInteractions();

        updateFinanceHighlights();

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
            updateFinanceHighlights();
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
        if (monthDisplay) {
            const displayText = typeof window.app.getCurrentMonthDisplay === 'function'
                ? window.app.getCurrentMonthDisplay()
                : '';

            if (displayText && displayText.trim().length > 0) {
                monthDisplay.textContent = displayText;
            } else {
                const monthName = getDisplayMonthName();
                const year = Number.isFinite(window.app.currentYear)
                    ? window.app.currentYear
                    : new Date().getFullYear();
                monthDisplay.textContent = monthName ? `${monthName} ${year}` : '--';
            }
        }

        updateMonthCopy();
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

        updateFinanceHighlights();
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

    const statCards = document.querySelectorAll('.chart-hours-value-card, .chart-shifts-count-card');
    statCards.forEach(card => {
        if (card.dataset.keyboardBound === 'true') {
            return;
        }

        card.setAttribute('role', card.getAttribute('role') || 'button');
        card.setAttribute('tabindex', card.getAttribute('tabindex') || '0');

        card.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                card.click();
            }
        });

        card.dataset.keyboardBound = 'true';
    });
}

function setupStatisticsSummaryNavigation() {
    if (typeof window === 'undefined') {
        return;
    }

    const summaryButton = document.getElementById('statisticsSummaryPill');
    const overviewSection = document.getElementById('statisticsOverviewSection');

    if (!summaryButton || !overviewSection || summaryButton.dataset.bound === 'true') {
        return;
    }

    const focusOverviewHeading = () => {
        const heading = document.getElementById('statisticsOverviewHeading');
        if (!heading || typeof heading.focus !== 'function') {
            return;
        }

        const hadTabIndex = heading.hasAttribute('tabindex');
        if (!hadTabIndex) {
            heading.setAttribute('tabindex', '-1');
        }

        heading.focus({ preventScroll: true });

        if (!hadTabIndex) {
            heading.addEventListener('blur', () => {
                heading.removeAttribute('tabindex');
            }, { once: true });
        }
    };

    const handleClick = (event) => {
        event.preventDefault();

        const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        try {
            overviewSection.scrollIntoView({
                behavior: prefersReducedMotion ? 'auto' : 'smooth',
                block: 'start'
            });
        } catch (_) {
            overviewSection.scrollIntoView();
        }

        window.requestAnimationFrame(() => {
            focusOverviewHeading();
        });
    };

    summaryButton.addEventListener('click', handleClick);
    summaryButton.dataset.bound = 'true';
}

function attachStatisticsEnhancer() {
    if (!window.app || window.app.__statisticsEnhancerInstalled || window.app.__statisticsEnhancerPending) {
        return;
    }

    const installWrapper = () => {
        if (typeof window.app.updateStats !== 'function') {
            return false;
        }

        const originalUpdateStats = window.app.updateStats.bind(window.app);
        window.app.updateStats = function enhancedUpdateStats(...args) {
            const result = originalUpdateStats(...args);

            if (window.app?.currentView === 'statistikk') {
                requestAnimationFrame(() => {
                    updateFinanceHighlights();
                });
            }

            return result;
        };

        window.app.__statisticsEnhancerInstalled = true;
        window.app.__statisticsEnhancerPending = false;
        return true;
    };

    if (installWrapper()) {
        return;
    }

    window.app.__statisticsEnhancerPending = true;
    let attempts = 0;
    const interval = setInterval(() => {
        if (installWrapper() || attempts > 20) {
            clearInterval(interval);
            window.app.__statisticsEnhancerPending = false;
        }
        attempts += 1;
    }, 100);
}

function updateFinanceHighlights() {
    if (typeof window === 'undefined' || !window.app) {
        return;
    }

    const app = window.app;
    const month = app.currentMonth;
    const year = app.currentYear;
    const shifts = Array.isArray(app.shifts) ? app.shifts : [];

    const monthShifts = shifts.filter(shift => {
        if (!shift || !shift.date) {
            return false;
        }

        const date = shift.date instanceof Date ? shift.date : new Date(shift.date);
        if (Number.isNaN(date.getTime())) {
            return false;
        }

        return date.getMonth() === (month - 1) && date.getFullYear() === year;
    });

    let totalHours = 0;
    let totalBase = 0;
    let totalBonus = 0;
    let bestShift = null;

    monthShifts.forEach(shift => {
        if (typeof app.calculateShift !== 'function') {
            return;
        }

        const calculation = app.calculateShift.call(app, shift);
        if (!calculation) {
            return;
        }

        totalHours += calculation.hours || 0;
        totalBase += calculation.baseWage || 0;
        totalBonus += calculation.bonus || 0;

        const shiftTotal = (calculation.baseWage || 0) + (calculation.bonus || 0);
        if (!bestShift || shiftTotal > bestShift.total) {
            bestShift = {
                total: shiftTotal,
                hours: calculation.hours || 0,
                shift
            };
        }
    });

    const totalAmount = totalBase + totalBonus;
    const taxFactor = app.taxDeductionEnabled ? 1 - ((app.taxPercentage || 0) / 100) : 1;
    const displayAmount = totalAmount * taxFactor;

    const formatter = typeof app.formatCurrency === 'function'
        ? app.formatCurrency.bind(app)
        : (value) => new Intl.NumberFormat('no-NO', { style: 'currency', currency: 'NOK', maximumFractionDigits: 0 }).format(value || 0);

    const hoursDisplay = document.getElementById('totalHoursDisplay');
    if (hoursDisplay) {
        hoursDisplay.textContent = formatHoursValue(totalHours);
    }

    const hoursSubtext = document.getElementById('totalHoursSubtext');
    if (hoursSubtext) {
        const monthName = getDisplayMonthName();
        if (totalHours > 0 && monthName) {
            hoursSubtext.textContent = `Timer registrert i ${monthName.toLowerCase()}`;
        } else if (monthName) {
            hoursSubtext.textContent = `Ingen registrerte timer for ${monthName.toLowerCase()}`;
        } else {
            hoursSubtext.textContent = totalHours > 0 ? 'Timer registrert denne perioden' : 'Ingen timer registrert';
        }
    }

    const shiftDisplay = document.getElementById('shiftCountDisplay');
    if (shiftDisplay) {
        shiftDisplay.textContent = monthShifts.length.toLocaleString('no-NO');
    }

    const shiftSubtext = document.getElementById('shiftCountSubtext');
    if (shiftSubtext) {
        const monthName = getDisplayMonthName();
        if (monthShifts.length > 0 && monthName) {
            const suffix = monthShifts.length === 1 ? 'vakt' : 'vakter';
            shiftSubtext.textContent = `${suffix} i ${monthName.toLowerCase()}`;
        } else if (monthName) {
            shiftSubtext.textContent = `Ingen vakter registrert i ${monthName.toLowerCase()}`;
        } else {
            shiftSubtext.textContent = 'Ingen vakter registrert';
        }
    }

    const averageRateEl = document.getElementById('averageHourlyRate');
    if (averageRateEl) {
        if (totalHours > 0) {
            averageRateEl.textContent = formatter(totalAmount / totalHours);
        } else {
            averageRateEl.textContent = '—';
        }
    }

    const averageMetaEl = document.getElementById('averageHourlyMeta');
    if (averageMetaEl) {
        if (totalHours > 0) {
            const suffix = monthShifts.length === 1 ? 'vakt' : 'vakter';
            averageMetaEl.textContent = `${formatHoursValue(totalHours)} timer fordelt på ${monthShifts.length} ${suffix}`;
        } else {
            averageMetaEl.textContent = 'Registrer vakter for å se snittlønn per time';
        }
    }

    const bonusEl = document.getElementById('totalBonusAmount');
    if (bonusEl) {
        bonusEl.textContent = totalBonus > 0 ? formatter(totalBonus) : '—';
    }

    const bestShiftValueEl = document.getElementById('bestShiftValue');
    const bestShiftMetaEl = document.getElementById('bestShiftMeta');
    if (bestShiftValueEl && bestShiftMetaEl) {
        if (bestShift) {
            bestShiftValueEl.textContent = formatter(bestShift.total);

            const date = bestShift.shift.date instanceof Date ? bestShift.shift.date : new Date(bestShift.shift.date);
            const hasValidDate = !Number.isNaN(date.getTime());
            const formattedDate = hasValidDate ? date.toLocaleDateString('no-NO', { day: '2-digit', month: 'short' }) : '';
            const timeRange = bestShift.shift.startTime && bestShift.shift.endTime
                ? `${bestShift.shift.startTime}–${bestShift.shift.endTime}`
                : '';
            const hoursText = `${formatHoursValue(bestShift.hours)} timer`;

            const details = [formattedDate, timeRange, hoursText].filter(Boolean).join(' • ');
            bestShiftMetaEl.textContent = details || 'Detaljer utilgjengelig';
        } else {
            bestShiftValueEl.textContent = '—';
            bestShiftMetaEl.textContent = 'Ingen registrerte vakter ennå';
        }
    }

    const monthNameEl = document.getElementById('overviewMonthName');
    if (monthNameEl) {
        const monthName = getDisplayMonthName();
        monthNameEl.textContent = monthName || 'denne måneden';
    }

    const monthlyGoal = getMonthlyGoalValue();
    const progressValueEl = document.getElementById('goalProgressValue');
    const progressMetaEl = document.getElementById('goalProgressMeta');
    if (progressValueEl && progressMetaEl) {
        if (monthlyGoal > 0) {
            const percentRaw = (displayAmount / monthlyGoal) * 100;
            const percentValue = Math.max(0, percentRaw);
            const percentFormatted = percentValue > 0 && percentValue < 10
                ? percentValue.toFixed(1)
                : Math.round(percentValue);

            progressValueEl.textContent = `${Math.min(percentFormatted, 999)}%`;
            progressMetaEl.textContent = `${formatter(displayAmount)} av ${formatter(monthlyGoal)}`;
        } else {
            progressValueEl.textContent = '—';
            progressMetaEl.textContent = 'Sett et mål for å følge fremdrift';
        }
    }

    const progressBar = document.querySelector('.chart-progress-bar');
    if (progressBar) {
        if (monthlyGoal > 0) {
            const percentRaw = (displayAmount / monthlyGoal) * 100;
            const percentValue = Math.max(0, Math.min(percentRaw, 100));

            progressBar.setAttribute('role', 'progressbar');
            progressBar.setAttribute('aria-valuemin', '0');
            progressBar.setAttribute('aria-valuemax', monthlyGoal.toString());
            progressBar.setAttribute('aria-valuenow', Math.round(Math.min(displayAmount, monthlyGoal)).toString());
            progressBar.setAttribute('aria-valuetext', `${percentValue.toFixed(percentValue < 10 ? 1 : 0)}% av ${formatter(monthlyGoal)}`);
        } else {
            progressBar.removeAttribute('role');
            progressBar.removeAttribute('aria-valuemin');
            progressBar.removeAttribute('aria-valuemax');
            progressBar.removeAttribute('aria-valuenow');
            progressBar.removeAttribute('aria-valuetext');
        }
    }

    const progressAccessible = document.getElementById('chartProgressAccessible');
    if (progressAccessible) {
        if (monthlyGoal > 0) {
            const percentRaw = (displayAmount / monthlyGoal) * 100;
            const percentValue = Math.max(0, percentRaw);
            const percentFormatted = percentValue > 0 && percentValue < 10
                ? percentValue.toFixed(1)
                : Math.round(percentValue);

            progressAccessible.textContent = `${percentFormatted}% av ${formatter(monthlyGoal)}`;
        } else {
            progressAccessible.textContent = 'Ingen mål definert for denne måneden.';
        }
    }

    updateMonthCopy();
}

function updateMonthCopy() {
    if (typeof window === 'undefined' || !window.app) {
        return;
    }

    const monthName = getDisplayMonthName();
    document.querySelectorAll('[data-month-copy]').forEach(element => {
        const fallback = element.getAttribute('data-month-fallback') || 'denne måneden';
        element.textContent = monthName || fallback;
    });
}

function getDisplayMonthName() {
    if (typeof window === 'undefined' || !window.app) {
        return '';
    }

    const months = Array.isArray(window.app.MONTHS) ? window.app.MONTHS : [];
    const monthIndex = (window.app.currentMonth || 1) - 1;
    const baseName = months[monthIndex];

    if (!baseName) {
        return '';
    }

    return baseName.charAt(0).toUpperCase() + baseName.slice(1);
}

function getMonthlyGoalValue() {
    if (typeof window === 'undefined') {
        return 20000;
    }

    const appGoal = window.app?.monthlyGoal;
    if (typeof appGoal === 'number' && !Number.isNaN(appGoal)) {
        return appGoal;
    }

    const stored = localStorage.getItem('monthlyGoal');
    const parsed = stored ? parseInt(stored, 10) : NaN;
    return Number.isFinite(parsed) ? parsed : 20000;
}

function formatHoursValue(value) {
    if (!Number.isFinite(value) || value === 0) {
        return '0';
    }

    const hasDecimals = Math.abs(value % 1) > 0.01;
    return value.toLocaleString('no-NO', {
        minimumFractionDigits: hasDecimals ? 1 : 0,
        maximumFractionDigits: hasDecimals ? 1 : 0
    });
}

// Make month navigation functions available globally
if (typeof window !== 'undefined') {
    window.navigateStatisticsMonth = navigateStatisticsMonth;
}
