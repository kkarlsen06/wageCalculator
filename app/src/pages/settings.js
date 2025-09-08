// Redesigned Settings route with home list + detail subpages and slide animations

function getHomeView() {
  return `
  <div class="settings-home">
    <div class="settings-content">
    <h1 class="settings-title">Innstillinger</h1>
    <ul class="settings-list" role="list">
      <li>
        <div class="settings-item" data-spa data-href="/settings/profile">
          <div class="item-main">
            <svg class="item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <div class="item-text">
              <span class="item-title">Min profil</span>
              <span class="item-sub">Navn, e-post, profilbilde, pålogging</span>
            </div>
          </div>
          <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </div>
      </li>
      <li>
        <div class="settings-item" data-spa data-href="/settings/wage">
          <div class="item-main">
            <svg class="item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
            <div class="item-text">
              <span class="item-title">Min lønn</span>
              <span class="item-sub">Timelønn, tillegg, utbetaling</span>
            </div>
          </div>
          <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </div>
      </li>
      <li>
        <div class="settings-item" data-spa data-href="/settings/interface">
          <div class="item-main">
            <svg class="item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
            <div class="item-text">
              <span class="item-title">Utseende</span>
              <span class="item-sub">Tema, visninger, formatering</span>
            </div>
          </div>
          <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </div>
      </li>
      <li>
        <div class="settings-item" data-spa data-href="/settings/org">
          <div class="item-main">
            <svg class="item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M3 21h18"></path>
              <path d="M5 21V7l8-4v18"></path>
              <path d="M19 21V11l-6-4"></path>
            </svg>
            <div class="item-text">
              <span class="item-title">Bedrift</span>
              <span class="item-sub">Organisasjon og regler</span>
            </div>
          </div>
          <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </div>
      </li>
      <li>
        <div class="settings-item" data-spa data-href="/settings/data">
          <div class="item-main">
            <svg class="item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M3 3h18v18H3z"></path>
              <path d="M3 9h18"></path>
              <path d="M9 21V9"></path>
            </svg>
            <div class="item-text">
              <span class="item-title">Data og eksport</span>
              <span class="item-sub">Eksport, import, sikkerhetskopi</span>
            </div>
          </div>
          <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </div>
      </li>
    </ul>
    </div>
    <div class="settings-bottom-bar">
      <button type="button" class="btn btn-secondary" data-spa data-href="/">Lukk</button>
    </div>
  </div>`;
}

function getProfileDetail() {
  // Profile content reusing IDs; crop modal added for avatar
  return `
  <div class="settings-detail">
    <div class="settings-content">
    <h2 class="detail-title">Min profil</h2>
    <div class="detail-body">
      <form id="profile-form" novalidate>
        <div class="form-group form-group-with-hint">
          <label for="profileName">Fornavn</label>
          <input type="text" id="profileName" name="given-name" class="form-control" placeholder="Fornavn" autocomplete="given-name">
          <small class="form-hint">Vises i velkomstskjermen og rapporter</small>
        </div>

        <div class="form-group form-group-with-hint">
          <label for="profileEmail">E-post</label>
          <input type="email" id="profileEmail" name="email" class="form-control" placeholder="E-post" disabled autocomplete="email">
          <small class="form-hint">E-postadressen kan ikke endres etter registrering</small>
        </div>

        <div class="form-group form-group-with-hint avatar-section">
          <label>Profilbilde</label>
          <div class="avatar-upload-container">
            <div class="avatar-preview" id="profileAvatarPreview">
              <img id="profileAvatarImage" class="avatar-image" alt="Forhåndsvisning" />
              <div id="profileAvatarPlaceholder" class="avatar-placeholder" aria-hidden="true">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
            </div>
            <div class="avatar-upload-controls row-inline">
              <input type="file" id="profileAvatarInput" accept="image/*" class="hidden" />
              <button type="button" class="btn btn-secondary avatar-upload-btn" id="profileAvatarChooseBtn">Velg bilde</button>
              <button type="button" class="btn btn-danger avatar-remove-btn" id="profileAvatarRemoveBtn">Fjern</button>
            </div>
            <div id="profilePictureProgress" class="upload-progress hidden">
              <div id="profilePictureProgressFill" class="upload-progress-fill"></div>
              <div id="profilePictureProgressText" class="upload-progress-text">Laster opp...</div>
            </div>
          </div>
        </div>

        <div class="form-group form-group-with-hint">
          <label>Pålogging</label>
          <div id="google-linking-row" class="row-inline mb-16">
            <button id="btn-link-google" type="button" class="btn btn-secondary btn-icon-inline">
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 48 48">
                <path d="M44.5 20H24v8.5h11.8C34.6 33.9 29.9 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 3.1l6-6C34.6 4.3 29.6 2 24 2 12.4 2 3 11.4 3 23s9.4 21 21 21 20-9.4 20-21c0-1.2-.1-2.1-.5-3z" fill="#FFC107"/>
                <path d="M6.3 14.7l7 5.1C14.7 16.3 18.9 13 24 13c3.1 0 5.9 1.1 8.1 3.1l6-6C34.6 4.3 29.6 2 24 2 15.5 2 8.2 6.7 6.3 14.7z" fill="#FF3D00"/>
                <path d="M24 44c5.7 0 10.6-1.9 14.1-5.2l-6.5-5.4c-2 1.4-4.6 2.2-7.6 2.2-5.9 0-10.8-3.9-12.6-9.3l-7.1 5.5C7.2 38.8 15 44 24 44z" fill="#4CAF50"/>
                <path d="M44.5 20H24v8.5h11.8c-1 2.9-3 5.2-5.6 6.9l-6.5 5.4C39.8 42.5 45 38 45 23c0-1.2-.2-2.1-.5-3z" fill="#1976D2"/>
              </svg>
              Koble til Google
            </button>
            <button id="btn-unlink-google" type="button" class="btn btn-danger btn-icon-inline hidden">
              Fjern Google-konto
            </button>
            <span id="google-unlink-warning" class="form-hint text-warning hidden">
              Du må ha et annet innloggingsalternativ før du kan fjerne Google.
            </span>
          </div>
          <small class="form-hint">Koble Google-kontoen din for enklere innlogging</small>
        </div>

        <div class="form-group form-group-with-hint">
          <label>Kontoadministrasjon</label>
          <div class="form-row">
            <button class="btn btn-primary mr-8" onclick="app.restartOnboarding()">
              <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 4v6h6"></path>
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
              </svg>
              Start onboarding på nytt
            </button>
            <button class="btn btn-danger" onclick="app.clearAllShifts()">
              <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18"></path>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                <path d="M8 6V4c0-1 1-2 2-2h4c0 1 1 2 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
              Slett alle vakter
            </button>
          </div>
          <small class="form-hint">Permanent fjerning av alle vakter eller starte onboarding på nytt</small>
        </div>
      </form>
    </div>
    </div>

    <!-- Crop modal used by avatar editor -->
    <div id="cropModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title">Juster profilbilde</h2>
        </div>
        <div class="modal-body">
          <div class="crop-controls">
            <img id="cropImage" alt="Beskjær bilde" class="crop-image" />
            <input id="cropZoomSlider" type="range" min="0.1" max="3" step="0.01" value="1" class="crop-zoom-slider">
            <div class="row-inline">
              <button id="zoomOutBtn" type="button" class="btn btn-secondary">-</button>
              <button id="zoomInBtn" type="button" class="btn btn-secondary">+</button>
            </div>
          </div>
        </div>
        <div class="modal-fixed-footer">
          <div class="modal-bottom-actions row-inline">
            <button type="button" class="btn btn-secondary modal-close-bottom" id="cancelCropBtn">Avbryt</button>
            <button type="button" class="btn btn-primary" id="confirmCropBtn">Lagre</button>
          </div>
        </div>
      </div>
    </div>

    <div class="settings-bottom-bar">
      <button type="button" class="btn btn-secondary" data-spa data-href="/">Lukk</button>
      <button type="button" class="btn btn-secondary" data-spa data-href="/settings?from=detail">Tilbake</button>
    </div>
  </div>`;
}

function getWageDetail() {
  return `
  <div class="settings-detail">
    <div class="settings-content">
    <h2 class="detail-title">Min lønn</h2>
    <div class="detail-body">
      <div id="wageTab" class="tab-content active">
        <div class="settings-section-header">
            <h3>Lønnsberegning</h3>
            <p class="section-description">Sett opp hvordan lønnen din skal beregnes</p>
        </div>

        <div class="form-group">
            <div class="flex justify-between align-center mb-10">
                <label>Lønnsmodell</label>
                <span id="presetBadge" class="preset-badge hidden">Virke-tariff</span>
            </div>
            <div class="switch-group">
                <div>
                    <span class="text-secondary">Bruk Virke-tariff</span>
                    <small class="form-hint">Automatisk beregning basert på offisiell lønnsavtale</small>
                </div>
                <label class="switch">
                    <input type="checkbox" id="usePresetToggle" checked onchange="app.togglePreset()">
                    <span class="slider"></span>
                </label>
            </div>
        </div>

        <div id="presetWageSection" class="settings-subsection">
            <div class="form-group settings-level-2">
                <label>Velg ditt lønnstrinn</label>
                <select class="form-control" id="wageSelect" onchange="app.updateWageLevel(this.value)">
                    <option value="-1">Under 16 år - 129,91 kr/time</option>
                    <option value="-2">Under 18 år - 132,90 kr/time</option>
                    <option value="1" selected>Trinn 1 - 184,54 kr/time</option>
                    <option value="2">Trinn 2 - 185,38 kr/time</option>
                    <option value="3">Trinn 3 - 187,46 kr/time</option>
                    <option value="4">Trinn 4 - 193,05 kr/time</option>
                    <option value="5">Trinn 5 - 210,81 kr/time</option>
                    <option value="6">Trinn 6 - 256,14 kr/time</option>
                </select>
                <small class="form-hint">Basert på Virke-tariff 2025. Velg trinnet som passer din erfaring.</small>
            </div>
        </div>

        <div id="customWageSection" class="settings-subsection hidden">
            <div class="form-group settings-level-2">
                <label>Din timelønn</label>
                <input type="number" class="form-control" id="customWageInput" placeholder="200" step="0.01" onchange="app.updateCustomWage(this.value)">
                <small class="form-hint">Skriv inn din timelønn i kroner</small>
            </div>

            <div class="form-group settings-level-2">
                <button type="button" class="settings-collapse-toggle" data-toggle-section="bonusWageSettings" aria-expanded="false">
                    <svg class="collapse-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                    <span>Tillegg for ulike tider</span>
                </button>
                
                <div class="settings-collapsible-content hidden" id="bonusWageSettings">
                    <div class="form-group settings-level-3">
                        <label>Ukedager (man–fre)</label>
                        <div class="bonus-slots" id="weekdayBonusSlots"></div>
                        <button class="btn btn-secondary" onclick="app.addBonusSlot('weekday')">+ Legg til tidsperiode</button>
                    </div>

                    <div class="form-group settings-level-3">
                        <label>Lørdag</label>
                        <div class="bonus-slots" id="saturdayBonusSlots"></div>
                        <button class="btn btn-secondary" onclick="app.addBonusSlot('saturday')">+ Legg til tidsperiode</button>
                    </div>

                    <div class="form-group settings-level-3">
                        <label>Søndag/helligdag</label>
                        <div class="bonus-slots" id="sundayBonusSlots"></div>
                        <button class="btn btn-secondary" onclick="app.addBonusSlot('sunday')">+ Legg til tidsperiode</button>
                    </div>
                </div>
            </div>
        </div>

        <div class="form-group form-group-with-hint">
            <div class="settings-section-divider">
                <h4>Pauser og trekk</h4>
            </div>

            <div class="switch-group">
              <div>
                <span class="text-secondary">Trekk pause fra lønnen</span>
                <small class="form-hint">Automatisk trekk for ubetalt pause på lange vakter</small>
              </div>
              <label class="switch">
                  <input type="checkbox" id="pauseDeductionEnabledToggle" checked>
                  <span class="slider"></span>
              </label>
            </div>

            <div class="settings-subsection" id="breakDeductionSubsection">
                <div class="form-group settings-level-2">
                  <label for="pauseDeductionMethodSelect">Metode</label>
                  <select id="pauseDeductionMethodSelect" class="form-control">
                    <option value="proportional">Proporsjonal (anbefalt)</option>
                    <option value="base_only">Kun grunnlønn</option>
                    <option value="end_of_shift">Slutt av vakt (legacy)</option>
                  </select>
                  <small class="form-hint">Velg hvordan pausetrekk skal beregnes</small>
                </div>

                <div class="form-group settings-level-2">
                    <button type="button" class="settings-collapse-toggle" data-toggle-section="advancedBreakSettings" aria-expanded="false">
                        <svg class="collapse-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                        <span>Avansert</span>
                    </button>
                    
                    <div class="settings-collapsible-content hidden" id="advancedBreakSettings">
                        <div class="form-group settings-level-3" id="methodExplanation">
                          <div class="method-info">
                            <div id="proportionalInfo" class="method-description">
                              <strong>Proporsjonalt:</strong> Trekkes fra alle timer. Anbefalt.
                            </div>
                            <div id="baseOnlyInfo" class="method-description hidden">
                              <strong>Kun grunnlønn:</strong> Trekk kun fra grunnlønn. Tillegg bevares.
                            </div>
                            <div id="endOfShiftInfo" class="method-description hidden">
                              <strong>⚠️ Slutt av vakt:</strong> Trekker på slutten. Kan være problematisk.
                            </div>
                            <div id="noneInfo" class="method-description hidden">
                              <strong>Ingen trekk:</strong> Pause betales.
                            </div>
                          </div>
                        </div>

                        <div class="form-group settings-level-3" id="pauseThresholdSection">
                          <label for="pauseThresholdInput">Terskel (timer)</label>
                          <input type="number" id="pauseThresholdInput" class="form-control" min="0" max="24" step="0.5" value="5.5">
                          <small class="form-hint">Min. vaktlengde for trekk</small>
                        </div>

                        <div class="form-group settings-level-3" id="pauseDeductionMinutesSection">
                          <label for="pauseDeductionMinutesInput">Trekk (minutter)</label>
                          <input type="number" id="pauseDeductionMinutesInput" class="form-control" min="0" max="120" step="15" value="30">
                          <small class="form-hint">Antall minutter i trekk</small>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="form-group form-group-with-hint">
            <div class="settings-section-divider">
                <h4>Mål og oversikt</h4>
            </div>
            <label for="monthlyGoalInput">Månedlig inntektsmål</label>
            <div class="switch-group">
                <input type="number" id="monthlyGoalInput" class="form-control input-inline" min="0" step="100" placeholder="20000">
                <button class="btn btn-secondary ml-8" id="saveMonthlyGoalBtn">Lagre</button>
            </div>
            <small class="form-hint">Hvor mye ønsker du å tjene per måned?</small>
        </div>

        <div class="form-group form-group-with-hint">
            <div class="settings-section-divider">
                <h4>Skatt</h4>
            </div>

            <div class="switch-group">
              <div>
                <span class="text-secondary">Trekk skatt i beregning</span>
                <small class="form-hint">Vis estimert skattetrekk i summer</small>
              </div>
              <label class="switch">
                  <input type="checkbox" id="taxDeductionToggle" onchange="app.toggleTaxDeduction(this.checked)">
                  <span class="slider"></span>
              </label>
            </div>

            <div id="taxPercentageSection" class="settings-subsection hidden">
                <div class="form-group settings-level-2">
                    <label for="taxPercentageInput">Skatteprosent</label>
                    <input type="number" id="taxPercentageInput" class="form-control" min="0" max="100" step="0.5" placeholder="35" onchange="app.updateTaxPercentage(this.value)">
                    <small class="form-hint">Prosent av brutto som trekkes som skatt</small>
                </div>
            </div>
        </div>

        <div class="form-group form-group-with-hint">
            <div class="settings-section-divider">
                <h4>Utbetaling</h4>
            </div>
            <label for="payrollDayInput">Lønningsdag</label>
            <div class="switch-group">
                <input type="number" id="payrollDayInput" class="form-control input-inline" min="1" max="31" step="1" placeholder="15" onchange="app.updatePayrollDay(this.value)">
            </div>
            <small class="form-hint">Hvilken dag får du utbetalt lønn? Brukes for å vise neste lønningsdag.</small>
        </div>
      </div>
    </div>
    </div>
    <div class="settings-bottom-bar">
      <button type="button" class="btn btn-secondary" data-spa data-href="/">Lukk</button>
      <button type="button" class="btn btn-secondary" data-spa data-href="/settings?from=detail">Tilbake</button>
    </div>
  </div>`;
}

function getOrgDetail() {
  return `
  <div class="settings-detail">
    <div class="settings-content">
    <h2 class="detail-title">Bedrift</h2>
    <div class="detail-body">
      <div id="orgTab" class="tab-content active">
        <div id="orgEnterpriseContent" class="hidden">
            <div class="settings-section-header">
                <h3>Bedriftsinnstillinger</h3>
                <p class="section-description">Innstillinger som påvirker alle ansatte i bedriften</p>
            </div>

            <div class="form-group settings-level-2" id="orgBreakPolicySection">
                <label for="breakPolicySelect">Pausepolicy for ansatte</label>
                <select id="breakPolicySelect" class="form-control">
                    <option value="proportional_across_periods">Proporsjonal trekk (anbefalt)</option>
                    <option value="from_base_rate">Trekk kun fra grunnlønn</option>
                    <option value="fixed_0_5_over_5_5h">Trekk på slutten av vakt</option>
                    <option value="none">Ingen trekk - betalt pause</option>
                </select>
                <small class="form-hint">Hvordan skal pause trekkes fra lønnen for alle ansatte? Påvirker rapporter og oversikter.</small>
            </div>

            <div class="form-group form-group-with-hint mt-32">
                <div class="settings-section-divider">
                    <h4>Rapporter og eksport</h4>
                </div>
            </div>

            <div class="form-group settings-level-2">
                <label>Lønnsrapporter</label>
                <div class="mt-10">
                    <button type="button" class="btn btn-primary" onclick="app.openCsvExportModal()">
                        <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Eksporter lønnsrapport
                    </button>
                </div>
                <small class="form-hint">Last ned detaljert lønnsrapport for alle ansatte som CSV-fil</small>
            </div>
        </div>

        <div id="orgUpsellContent">
            <div class="settings-section-header">
                <h3>Bedrift</h3>
                <p class="section-description">Lås opp bedriftsfunksjoner med Enterprise</p>
            </div>

            <div class="form-group settings-level-2 text-left">
                <p class="mb-12">
                    Bedriftsinnstillinger som felles pausepolicy, avanserte rapporter og administrasjon er tilgjengelig i Enterprise.
                </p>
                <small class="form-hint">Oppgrader for å konfigurere bedriftspolicy og få flere eksportmuligheter.</small>
            </div>

            <div class="form-group mt-16">
                <button type="button" class="btn btn-primary" onclick="app.openSubscription()">
                    <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M20 6L9 17l-5-5"></path>
                    </svg>
                    Oppgrader til Enterprise
                </button>
            </div>
        </div>
      </div>
    </div>
    </div>
    <div class="settings-bottom-bar">
      <button type="button" class="btn btn-secondary" data-spa data-href="/">Lukk</button>
      <button type="button" class="btn btn-secondary" data-spa data-href="/settings?from=detail">Tilbake</button>
    </div>
  </div>`;
}

function getInterfaceDetail() {
  return `
  <div class="settings-detail">
    <div class="settings-content">
    <h2 class="detail-title">Utseende</h2>
    <div class="detail-body">
      <div id="interfaceTab" class="tab-content active">
        <div class="settings-section-header">
            <h3>Tema og visning</h3>
            <p class="section-description">Tilpass utseendet og grunnleggende funksjoner</p>
        </div>
        
        <div class="form-group settings-level-2">
            <label>Fargetema</label>
            <div class="theme-selector">
                <div class="theme-options">
                    <label class="theme-option">
                        <input type="radio" name="theme" value="light" id="themeLight">
                        <div class="theme-preview theme-preview-light">
                            <div class="theme-preview-header"></div>
                            <div class="theme-preview-content"></div>
                        </div>
                        <span>Lys</span>
                    </label>
                    <label class="theme-option">
                        <input type="radio" name="theme" value="dark" id="themeDark">
                        <div class="theme-preview theme-preview-dark">
                            <div class="theme-preview-header"></div>
                            <div class="theme-preview-content"></div>
                        </div>
                        <span>Mørk</span>
                    </label>
                    <label class="theme-option">
                        <input type="radio" name="theme" value="system" id="themeSystem" checked>
                        <div class="theme-preview theme-preview-system">
                            <div class="theme-preview-header"></div>
                            <div class="theme-preview-content"></div>
                        </div>
                        <span>Automatisk</span>
                    </label>
                </div>
            </div>
            <small class="form-hint">Velg lyst eller mørkt tema, eller la appen følge systeminnstillingene</small>
        </div>

        <div class="form-group settings-level-2">
            <label>Vaktvisning</label>
            <div class="switch-group">
              <div>
                <span class="text-secondary">Åpne kalender først</span>
                <small class="form-hint">Vis kalender i stedet for liste når du åpner vaktene</small>
              </div>
              <label class="switch">
                  <input type="checkbox" id="defaultShiftsViewToggle">
                  <span class="slider"></span>
              </label>
            </div>
        </div>

        <div class="form-group form-group-with-hint mt-32">
            <div class="settings-section-divider">
                <h4>Navigasjon og funksjoner</h4>
            </div>
        </div>

        <div class="form-group settings-level-2" id="employeeTabVisibilityGroup">
            <label>Bedriftsfunksjoner</label>
            <div class="switch-group">
              <div>
                <span class="text-secondary" id="businessToggleLabel">Vis bedriftsfunksjoner</span>
                <small class="form-hint" id="businessToggleHint">Vis "Ansatte"-fanen og relaterte funksjoner i appen</small>
                <small class="form-hint text-warning hidden" id="businessUpgradeHint">Abonner til Enterprise for tilgang til bedriftsfunksjoner</small>
              </div>
              <label class="switch" id="businessToggleSwitch">
                  <input type="checkbox" id="showEmployeeTabToggle">
                  <span class="slider"></span>
              </label>
            </div>
        </div>

        <div class="form-group form-group-with-hint mt-32">
            <div class="settings-section-divider">
                <h4>Registrering og format</h4>
            </div>
        </div>

        <div class="form-group settings-level-2">
            <label>Tidsregistrering</label>
            <div class="switch-group">
              <div>
                <span class="text-secondary">Skriv tid direkte</span>
                <small class="form-hint">Raskere registrering uten dropdown-menyer (for erfarne brukere)</small>
              </div>
              <label class="switch">
                  <input type="checkbox" id="directTimeInputToggle">
                  <span class="slider"></span>
              </label>
            </div>
            
            <div class="settings-subsection" id="timeInputSubsection">
                <div class="form-group settings-level-3">
                    <button type="button" class="settings-collapse-toggle" data-toggle-section="timeFormatSettings" aria-expanded="false">
                        <svg class="collapse-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                        <span>Avanserte tidsinnstillinger</span>
                    </button>
                    
                    <div class="settings-collapsible-content hidden" id="timeFormatSettings">
                        <div class="form-group settings-level-4">
                            <label>Minutt-presisjon</label>
                            <div class="switch-group">
                              <div>
                                <span class="text-secondary">Vis alle minutter</span>
                                <small class="form-hint">Vis hvert minutt i stedet for 15-minutters intervaller</small>
                              </div>
                              <label class="switch">
                                  <input type="checkbox" id="fullMinuteRangeToggle">
                                  <span class="slider"></span>
                              </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="form-group settings-level-2">
            <label>Valutaformat</label>
            <div class="switch-group">
              <div>
                <span class="text-secondary">Bruk \"NOK\" i stedet for \"kr\"</span>
                <small class="form-hint">Mer formell fremstilling i rapporter og eksport</small>
              </div>
              <label class="switch">
                  <input type="checkbox" id="currencyFormatToggle">
                  <span class="slider"></span>
              </label>
            </div>
        </div>
      </div>
    </div>
    </div>
    <div class="settings-bottom-bar">
      <button type="button" class="btn btn-secondary" data-spa data-href="/">Lukk</button>
      <button type="button" class="btn btn-secondary" data-spa data-href="/settings?from=detail">Tilbake</button>
    </div>
  </div>`;
}

function getDataDetail() {
  return `
  <div class="settings-detail">
    <div class="settings-content">
    <h2 class="detail-title">Data og eksport</h2>
    <div class="detail-body">
      <div id="dataTab" class="tab-content active">
        <div class="settings-section-header">
            <h3>Data og backup</h3>
            <p class="section-description">Eksporter data for regnskap eller sikkerhetskopi</p>
        </div>
        
        <div id="exportOptionsSection" class="settings-level-2">
            <div class="form-group">
                <label>Velg periode å eksportere</label>
                <div class="export-period-options">
                    <label class="radio-option">
                        <input type="radio" name="exportPeriod" value="current">
                        <span id="currentMonthLabel">Denne måneden</span>
                    </label>
                    <label class="radio-option">
                        <input type="radio" name="exportPeriod" value="year">
                        <span>Hele året (alle 12 måneder)</span>
                    </label>
                    <label class="radio-option">
                        <input type="radio" name="exportPeriod" value="all">
                        <span>Alle vakter jeg har registrert</span>
                    </label>
                    <label class="radio-option">
                        <input type="radio" name="exportPeriod" value="custom">
                        <span>Velg datoer selv</span>
                    </label>
                </div>
            </div>

            <div id="customPeriodSection" class="form-group settings-level-3 hidden">
                <label class="custom-period-header">Velg datoer</label>
                <small class="form-hint">Fra hvilken dato til hvilken dato?</small>
                <div class="form-row">
                    <input type="date" id="exportStartDate" class="form-control" placeholder="Fra dato">
                    <input type="date" id="exportEndDate" class="form-control" placeholder="Til dato">
                </div>
            </div>

            <div class="form-group">
                <label>Last ned som:</label>
                <div class="export-buttons-container">
                    <button class="btn btn-primary" onclick="app.exportDataWithPeriod('csv')">
                        <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                        </svg>
                        CSV (Excel)
                    </button>
                    <button class="btn btn-secondary" onclick="app.exportDataWithPeriod('pdf')">
                        <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                        </svg>
                        PDF-rapport
                    </button>
                </div>
                <small class="form-hint">CSV kan åpnes i Excel. PDF er ferdig formatert rapport.</small>
            </div>
        </div>

        <div class="form-group form-group-with-hint mt-32">
            <div class="settings-section-divider">
                <h4>Importer vakter</h4>
            </div>
            <small class="form-hint">Last opp vaktdata fra andre systemer eller sikkerhetskopier</small>
        </div>
        
        <div class="form-group settings-level-2">
            <label>Velg fil å importere</label>
            <div class="form-row">
                <input type="file" id="importFileData" class="form-control" accept=".csv,.json">
                <button class="btn btn-secondary" onclick="app.importDataFromDataTab()">
                    <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 10 12 5 7 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="5"></line>
                    </svg>
                    Last opp
                </button>
            </div>
            <small class="form-hint">Støtter CSV- og JSON-filer. Vakter blir lagt til de du allerede har.</small>
        </div>
      </div>
    </div>
    </div>
    <div class="settings-bottom-bar">
      <button type="button" class="btn btn-secondary" data-spa data-href="/">Lukk</button>
      <button type="button" class="btn btn-secondary" data-spa data-href="/settings?from=detail">Tilbake</button>
    </div>
  </div>`;
}

export function renderSettings() {
  const path = typeof location !== 'undefined' ? location.pathname : '/settings';
  const isHome = path === '/settings';
  const section = path.split('/')[2] || '';
  let inner;
  if (isHome) {
    inner = getHomeView();
  } else if (section === 'profile') {
    inner = getProfileDetail();
  } else if (section === 'wage') {
    inner = getWageDetail();
  } else if (section === 'interface') {
    inner = getInterfaceDetail();
  } else if (section === 'org') {
    inner = getOrgDetail();
  } else if (section === 'data') {
    inner = getDataDetail();
  } else {
    inner = getHomeView();
  }
  return `
  <div id="settingsPage" class="settings-page app-container">
    ${inner}
  </div>`;
}

export function afterMountSettings() {
  const path = typeof location !== 'undefined' ? location.pathname : '/settings';
  const section = path.split('/')[2] || '';
  const params = new URLSearchParams(location.search || '');

  // Entrance animations - apply only to inner content wrapper
  try {
    const content = document.querySelector('#settingsPage .settings-content');
    if (content) {
      if (section) {
        content.classList.add('slide-in-right');
        setTimeout(() => content.classList.remove('slide-in-right'), 350);
      } else if (params.get('from') === 'detail') {
        content.classList.add('slide-in-left');
        // Clean URL params without reload
        try { history.replaceState({}, '', '/settings'); } catch (_) {}
        setTimeout(() => content.classList.remove('slide-in-left'), 350);
      }
    }
  } catch (_) {}

  // Create floating settings bar - portal approach to avoid containing block issues
  try {
    // Hide any inline bottom bars in the content to prevent duplicates
    document.querySelectorAll('#settingsPage .settings-bottom-bar').forEach(el => {
      el.style.display = 'none';
    });

    // Clean up any existing floating elements globally
    document.querySelectorAll('.floating-settings-backdrop, .floating-settings-bar').forEach(el => el.remove());

    // Create a dedicated portal container that's guaranteed to be outside all transforms/contains
    let portal = document.getElementById('settings-floating-portal');
    if (!portal) {
      portal = document.createElement('div');
      portal.id = 'settings-floating-portal';
      portal.style.cssText = `
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        pointer-events: none !important;
        z-index: 9999 !important;
        transform: none !important;
        will-change: auto !important;
        contain: none !important;
        isolation: auto !important;
      `;
      // Append to document.documentElement instead of body to avoid any body-level constraints
      document.documentElement.appendChild(portal);
    }

    // Create backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'floating-settings-backdrop';
    backdrop.style.pointerEvents = 'none';
    portal.appendChild(backdrop);

    // Create floating bar
    const bar = document.createElement('div');
    bar.className = 'floating-settings-bar';
    bar.style.pointerEvents = 'all'; // Re-enable pointer events for the bar itself
    const isDetail = !!section;
    
    // Render contents: Close button (left) and Back button (right when detail)
    bar.innerHTML = `
      <button type="button" class="btn btn-secondary" data-spa data-href="/">Lukk</button>
      ${isDetail ? `
        <button type="button" class="back-btn" data-spa data-href="/settings?from=detail" aria-label="Tilbake">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          <span>Tilbake</span>
        </button>
      ` : '<span></span>'}
    `;
    
    portal.appendChild(bar);
  } catch (e) {
    console.warn('[settings-route] floating settings bar init failed', e);
  }

  if (section === 'profile') {
    try {
      window.app?.loadProfileData?.();
      window.app?.initProfileAvatarControls?.();
      
      // Initialize Google OAuth buttons after a short delay to ensure DOM is ready
      setTimeout(() => {
        try {
          window.app?.initGoogleLinkButton?.();
        } catch (e) {
          console.warn('[settings-route] Google link button init failed', e);
        }
      }, 100);
      
      const profileForm = document.getElementById('profile-form');
      const nameInput = document.getElementById('profileName');
      if (profileForm && !profileForm.__boundSubmit) {
        profileForm.__boundSubmit = true;
        profileForm.addEventListener('submit', (e) => { e.preventDefault(); window.app?.updateProfile?.(); });
      }
      if (nameInput && !nameInput.__boundProfile) {
        nameInput.__boundProfile = true;
        nameInput.addEventListener('blur', () => { window.app?.updateProfile?.(); });
        nameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); window.app?.updateProfile?.(); } });
      }
    } catch (e) {
      console.warn('[settings-route] profile init failed', e);
    }
  }

  // Initialize logic for the selected tab using inlined content
  try {
    if (!window.app) return;
    window.app.updateSettingsUI?.();

    if (section === 'wage') {
      setTimeout(() => { try { window.app.updateTaxDeductionUI?.(); } catch (_) {} }, 50);
      setTimeout(() => { try { window.app.setupCollapsibleEventListeners?.(); } catch (_) {} }, 100);
      if (window.app.usePreset === false) {
        setTimeout(() => { try { window.app.populateCustomBonusSlots?.(); } catch (_) {} }, 100);
      }
      // Optional focus helpers from query params
      try {
        const focus = params.get('focus');
        if (focus === 'payrollDay') {
          const payrollDayInput = document.getElementById('payrollDayInput');
          if (payrollDayInput) {
            payrollDayInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => { try { payrollDayInput.focus(); payrollDayInput.select?.(); } catch(_){} }, 250);
          }
        }
      } catch (_) {}
    } else if (section === 'data') {
      setTimeout(() => { try { window.app.setupExportPeriodOptions?.(); } catch (_) {} }, 100);
    } else if (section === 'org') {
      (async () => {
        try {
          const hasEnt = await (window.app?.hasEnterpriseSubscription ? window.app.hasEnterpriseSubscription() : (await import('../js/subscriptionUtils.js')).hasEnterpriseSubscription());
          const showEmployeeTab = window.app?.showEmployeeTab !== false;
          
          // Only show Bedrift content if user has Enterprise AND hasn't disabled employee tab
          const shouldShowOrgContent = hasEnt && showEmployeeTab;
          
          const upsell = document.getElementById('orgUpsellContent');
          const ent = document.getElementById('orgEnterpriseContent');
          
          if (shouldShowOrgContent) {
            if (upsell) upsell.style.display = 'none';
            if (ent) {
              ent.style.display = '';
              ent.classList.remove('hidden');
            }
            
            const sel = document.getElementById('breakPolicySelect');
            if (sel && window.app.orgSettings?.break_policy) sel.value = window.app.orgSettings.break_policy;
            if (sel && !sel._immediateSaveBound) {
              sel.addEventListener('change', async () => { await window.app.saveOrgSettings(); });
              sel._immediateSaveBound = true;
            }
            await window.app.updateOrgSettingsUI?.();
          } else if (hasEnt && !showEmployeeTab) {
            // User has enterprise but disabled employee tab - show special message
            if (upsell) {
              upsell.innerHTML = `
                <div class="settings-section-header">
                  <h3>Bedrift</h3>
                  <p class="section-description">Bedriftsfunksjoner er skjult</p>
                </div>
                <div class="form-group settings-level-2 text-left">
                  <p class="mb-12">
                    Du har Enterprise, men har valgt å skjule "Ansatte"-fanen i utseendeinnstillingene.
                  </p>
                  <small class="form-hint">Gå til Utseende → Bedriftsfunksjoner for å aktivere bedriftsfunksjoner igjen.</small>
                </div>`;
              upsell.style.display = '';
            }
            if (ent) {
              ent.style.display = 'none';
              ent.classList.add('hidden');
            }
          } else {
            // No enterprise - show upsell
            if (upsell) upsell.style.display = '';
            if (ent) {
              ent.style.display = 'none';
              ent.classList.add('hidden');
            }
          }
        } catch (e) {
          console.warn('[settings-route] org init failed', e);
        }
      })();
    } else if (section === 'interface') {
      // Handle business features toggle state based on enterprise subscription
      (async () => {
        try {
          const hasEnt = await (window.app?.hasEnterpriseSubscription ? window.app.hasEnterpriseSubscription() : (await import('../js/subscriptionUtils.js')).hasEnterpriseSubscription());
          const showEmployeeTab = window.app?.showEmployeeTab !== false;
          
          const toggleSwitch = document.getElementById('businessToggleSwitch');
          const toggleInput = document.getElementById('showEmployeeTabToggle');
          const toggleLabel = document.getElementById('businessToggleLabel');
          const toggleHint = document.getElementById('businessToggleHint');
          const upgradeHint = document.getElementById('businessUpgradeHint');
          
          if (!hasEnt) {
            // No enterprise subscription - disable toggle and show upgrade hint
            if (toggleSwitch) toggleSwitch.style.opacity = '0.5';
            if (toggleInput) {
              toggleInput.disabled = true;
              toggleInput.checked = false;
            }
            if (toggleLabel) toggleLabel.textContent = 'Bedriftsfunksjoner (krever Enterprise)';
            if (toggleHint) toggleHint.classList.add('hidden');
            if (upgradeHint) upgradeHint.classList.remove('hidden');
          } else {
            // Has enterprise subscription - enable toggle and set current state
            if (toggleSwitch) toggleSwitch.style.opacity = '1';
            if (toggleInput) {
              toggleInput.disabled = false;
              toggleInput.checked = showEmployeeTab;
            }
            if (toggleLabel) toggleLabel.textContent = 'Vis bedriftsfunksjoner';
            if (toggleHint) toggleHint.classList.remove('hidden');
            if (upgradeHint) upgradeHint.classList.add('hidden');
            
            // Add event listener for toggle changes
            if (toggleInput && !toggleInput._businessToggleBound) {
              toggleInput.addEventListener('change', async (e) => {
                try {
                  if (window.app) {
                    window.app.showEmployeeTab = e.target.checked;
                    await window.app.saveSettingsToSupabase();
                    await window.app.updateTabBarVisibility();
                  }
                } catch (error) {
                  console.warn('[settings] Failed to save business toggle setting:', error);
                  // Revert toggle state on error
                  e.target.checked = !e.target.checked;
                }
              });
              toggleInput._businessToggleBound = true;
            }
          }
        } catch (e) {
          console.warn('[settings-route] interface business toggle init failed', e);
        }
      })();
    }
  } catch (e) {
    console.warn('[settings-route] settings detail init failed', e);
  }

  // Floating settings bar already initialized above
}
