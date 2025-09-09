// Redesigned Settings route with home list + detail subpages and slide animations

function getHomeView() {
  return `
  <div class="settings-home">
    <div class="settings-content">
    <h1 class="settings-title">Innstillinger</h1>
    <ul class="settings-list" role="list">
      <li>
        <div class="settings-item" data-spa data-href="/settings/account">
          <div class="item-main">
            <svg class="item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <div class="item-text">
              <span class="item-title">Konto</span>
              <span class="item-sub">Profil, sikkerhet og tilgang</span>
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
              <span class="item-title">Lønn</span>
              <span class="item-sub">Grunnlønn og utbetaling</span>
            </div>
          </div>
          <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </div>
      </li>
      <li>
        <div class="settings-item" data-spa data-href="/settings/wage-advanced">
          <div class="item-main">
            <svg class="item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            <div class="item-text">
              <span class="item-title">Avansert lønn</span>
              <span class="item-sub">Tillegg, pauser og skatt</span>
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
              <span class="item-sub">Tema, visninger og bedriftsfunksjoner</span>
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
              <span class="item-title">Data</span>
              <span class="item-sub">Eksport, import og sikkerhetskopi</span>
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

function getAccountDetail() {
  return `
  <div class="settings-detail">
    <div class="settings-content">
      <h2 class="detail-title">Konto</h2>
        <!-- Konto content without section box -->
        <div style="display: flex; flex-direction: column; gap: var(--space-2);">
            <!-- Card: Profilinformasjon -->
            <div class="setting-card is-standard" id="accountProfileInfoCard">
              <div class="setting-header">
                <span>Profilinformasjon</span>
              </div>
              <div class="setting-body">
                <div class="form-group">
                  <label for="accountName">Fornavn</label>
                  <input id="accountName" type="text" autocomplete="given-name" placeholder="Fornavn"
                         onblur="app.updateAccount && app.updateAccount()"
                         onkeydown="if(event.key==='Enter'){ event.preventDefault(); app.updateAccount && app.updateAccount(); }" />
                </div>
                <div class="form-group">
                  <label for="accountEmail">E-post</label>
                  <input id="accountEmail" type="email" placeholder="E-post" disabled />
                </div>
              </div>
            </div>

            <!-- Card: Profilbilde -->
            <div class="setting-card is-standard" id="accountAvatarCard">
              <div class="setting-header">
                <span>Profilbilde</span>
              </div>
              <div class="setting-body">
                <div class="row-inline">
                  <div id="accountAvatarPreview" class="avatar-preview" aria-live="polite">
                    <img id="accountAvatarImage" class="avatar-image" alt="Profilbilde" />
                    <div id="accountAvatarPlaceholder" aria-hidden="true">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                    </div>
                  </div>
                  <div class="avatar-upload-controls">
                    <div class="setting-actions">
                      <button id="accountAvatarChooseBtn" type="button" class="btn btn-secondary">Velg bilde</button>
                      <button id="accountAvatarRemoveBtn" type="button" class="btn btn-secondary">Fjern</button>
                    </div>
                    <input id="accountAvatarInput" type="file" accept="image/*" class="hidden" />
                  </div>
                </div>
                <div id="accountPictureProgress" class="upload-progress mt-10" aria-live="polite">
                  <div id="accountPictureProgressFill" class="upload-progress-fill"></div>
                  <div id="accountPictureProgressText" class="upload-progress-text">Laster opp...</div>
                </div>
              </div>
            </div>

            <!-- Card: Tilkoblinger -->
            <div class="setting-card is-compact" id="accountConnectionsCard">
              <div class="setting-header">
                <span>Tilkoblinger</span>
              </div>
              <div class="setting-body">
                <div class="setting-actions">
                  <button id="btn-link-google" type="button" class="btn btn-secondary">
                    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 48 48" style="background:transparent">
                      <path d="M44.5 20H24v8.5h11.8C34.6 33.9 29.9 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 3.1l6-6C34.6 4.3 29.6 2 24 2 12.4 2 3 11.4 3 23s9.4 21 21 21 20-9.4 20-21c0-1.2-.1-2.1-.3-3z" fill="#FFC107"/>
                      <path d="M6.3 14.7l7 5.1C14.7 16.3 18.9 13 24 13c3.1 0 5.9 1.1 8.1 3.1l6-6C34.6 4.3 29.6 2 24 2 15.5 2 8.2 6.7 6.3 14.7z" fill="#FF3D00"/>
                      <path d="M24 44c5.7 0 10.6-1.9 14.1-5.2l-6.5-5.4c-2 1.4-4.6 2.2-7.6 2.2-5.9 0-10.8-3.9-12.6-9.3l-7.1 5.5C7.2 38.8 15 44 24 44z" fill="#4CAF50"/>
                      <path d="M44.5 20H24v8.5h11.8c-1 2.9-3 5.2-5.6 6.9l6.5 5.4C39.8 42.5 45 38 45 23c0-1.2-.2-2.1-.5-3z" fill="#1976D2"/>
                    </svg>
                    <span class="btn-label">Koble til Google</span>
                  </button>
                  <button id="btn-unlink-google" type="button" class="btn btn-secondary hidden">
                    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 48 48" style="background:transparent">
                      <path d="M44.5 20H24v8.5h11.8C34.6 33.9 29.9 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 3.1l6-6C34.6 4.3 29.6 2 24 2 12.4 2 3 11.4 3 23s9.4 21 21 21 20-9.4 20-21c0-1.2-.1-2.1-.3-3z" fill="#FFC107"/>
                      <path d="M6.3 14.7l7 5.1C14.7 16.3 18.9 13 24 13c3.1 0 5.9 1.1 8.1 3.1l6-6C34.6 4.3 29.6 2 24 2 15.5 2 8.2 6.7 6.3 14.7z" fill="#FF3D00"/>
                      <path d="M24 44c5.7 0 10.6-1.9 14.1-5.2l-6.5-5.4c-2 1.4-4.6 2.2-7.6 2.2-5.9 0-10.8-3.9-12.6-9.3l-7.1 5.5C7.2 38.8 15 44 24 44z" fill="#4CAF50"/>
                      <path d="M44.5 20H24v8.5h11.8c-1 2.9-3 5.2-5.6 6.9l6.5 5.4C39.8 42.5 45 38 45 23c0-1.2-.2-2.1-.5-3z" fill="#1976D2"/>
                    </svg>
                    <span class="btn-label">Fjern Google-konto</span>
                  </button>
                  <span id="google-unlink-warning" class="text-warning hidden">Legg til en annen påloggingsmetode før du fjerner Google.</span>
                </div>
              </div>
            </div>

            <!-- Card: Handlinger -->
            <div class="setting-card is-compact" id="accountActionsCard">
              <div class="setting-header">
                <span>Handlinger</span>
              </div>
              <div class="setting-actions">
                <button type="button" class="btn btn-secondary" onclick="app.restartOnboarding && app.restartOnboarding()">Start onboarding på nytt</button>
              </div>
            </div>
        </div>

        <!-- Section Box: Farlige handlinger (collapsible) -->
        <div style="margin-top: var(--space-2);">
        <section class="settings-section" aria-labelledby="danger-section-title">
          <header class="settings-section-header">
            <button type="button" class="settings-collapse-toggle btn btn-secondary" data-toggle-section="dangerousActions" aria-expanded="false" aria-controls="dangerousActions">
              Farlige handlinger
              <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left:8px; width:16px; height:16px; pointer-events: none;"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </header>
          <div id="dangerousActions" class="settings-section-body settings-collapsible-content hidden">
            <div class="setting-card is-compact">
              <div class="setting-header">
                <span>Slett alle vakter</span>
              </div>
              <div class="setting-actions">
                <button type="button" class="btn btn-danger" onclick="app.clearAllShifts && app.clearAllShifts()">Slett alle</button>
              </div>
            </div>
          </div>
        </section>
        </div>

        <!-- Avatar Crop Modal -->
        <div id="cropModal" class="modal" role="dialog" aria-modal="true" aria-labelledby="cropModalTitle" style="display:none;">
          <div class="modal-content">
            <h3 id="cropModalTitle">Juster profilbilde</h3>
            <div class="crop-controls">
              <img id="cropImage" class="crop-image" alt="Beskjær bilde" />
              <input id="cropZoomSlider" class="crop-zoom-slider" type="range" min="0.1" max="3" step="0.01" value="1" />
              <div class="row-inline">
                <button id="zoomOutBtn" type="button" class="btn btn-secondary">-</button>
                <button id="zoomInBtn" type="button" class="btn btn-secondary">+</button>
              </div>
            </div>
            <div class="modal-footer-buttons" style="display:flex; gap:8px; justify-content:flex-end; margin-top:16px;">
              <button id="cancelCropBtn" type="button" class="btn btn-secondary">Avbryt</button>
              <button id="confirmCropBtn" type="button" class="btn btn-primary">Lagre</button>
            </div>
          </div>
        </div>
    </div>
    <div class="settings-bottom-bar">
      <button type="button" class="btn btn-secondary" data-spa data-href="/settings?from=detail">Tilbake</button>
    </div>
  </div>`;
}

function getWageDetail() {
  return `
  <div class="settings-detail">
    <div class="settings-content">
      <h2 class="detail-title">Lønn</h2>
        <!-- Section Box: Lønnsmodell -->
        <section class="settings-section" aria-labelledby="wage-model-title">
          <header class="settings-section-header">
            <h3 id="wage-model-title">Lønnsmodell</h3>
            <p class="section-description">Virke-tariff eller egendefinert</p>
          </header>
          <div class="settings-section-body">
            <!-- Card: Bruk Virke-tariff (toggle) -->
            <div class="setting-card is-compact">
              <div class="setting-header">Bruk Virke-tariff</div>
              <div class="setting-body">
                <div class="switch-group">
                  <label for="usePresetToggle" class="switch-text">Virke-tariff</label>
                  <label class="switch">
                    <input id="usePresetToggle" aria-label="Virke-tariff" type="checkbox" onchange="app.togglePreset && app.togglePreset()" />
                    <span class="slider"></span>
                  </label>
                </div>
                <div class="form-hint">Bytt mellom tariff og egendefinert lønn.</div>
              </div>
            </div>

            <!-- Card: Virke-tariff (preset) -->
            <div id="presetWageSection" class="setting-card is-standard">
              <div class="setting-header">Virke-tariff nivå</div>
              <div class="setting-body">
                <label for="wageSelect">Velg nivå</label>
                <select id="wageSelect" onchange="app.updateWageLevel && app.updateWageLevel(this.value)">
                  <option value="-1">Under 16 år - 129,91 kr/time</option>
                  <option value="-2">Under 18 år - 132,90 kr/time</option>
                  <option value="1">Trinn 1 - 184,54 kr/time</option>
                  <option value="2">Trinn 2 - 185,38 kr/time</option>
                  <option value="3">Trinn 3 - 187,46 kr/time</option>
                  <option value="4">Trinn 4 - 193,05 kr/time</option>
                  <option value="5">Trinn 5 - 210,81 kr/time</option>
                  <option value="6">Trinn 6 - 256,14 kr/time</option>
                </select>
              </div>
            </div>

            <!-- Card: Egendefinert lønn (custom) -->
            <div id="customWageSection" class="setting-card is-standard" style="display:none;">
              <div class="setting-header">Egendefinert lønn</div>
              <div class="setting-body">
                <label for="customWageInput">Sats (kr/time)</label>
                <input id="customWageInput" type="number" inputmode="decimal" step="0.01" min="0" placeholder="200"
                       onchange="app.updateCustomWage && app.updateCustomWage(this.value)" />
                <div id="customWageError" class="form-hint" style="display:none; color: var(--danger);">Ugyldig beløp. Skriv inn et tall over 0.</div>
              </div>
            </div>
          </div>
        </section>

        <!-- Section Box: Mål og utbetaling -->
        <section class="settings-section" aria-labelledby="goals-title">
          <header class="settings-section-header">
            <h3 id="goals-title">Mål og utbetaling</h3>
          </header>
          <div class="settings-section-body">
            <!-- Card: Månedsmål -->
            <div class="setting-card is-standard">
              <div class="setting-header">Månedsmål</div>
              <div class="setting-body">
                <label for="monthlyGoalInput">Beløp (kr)</label>
                <input id="monthlyGoalInput" type="number" inputmode="numeric" step="1" min="1" placeholder="20000" />
                <div id="monthlyGoalError" class="form-hint" style="display:none; color: var(--danger);">Skriv inn et beløp større enn 0.</div>
              </div>
              <div class="setting-actions">
                <button id="saveMonthlyGoalBtn" type="button" class="btn btn-primary">Lagre månedsmål</button>
              </div>
            </div>

            <!-- Card: Lønnsdato -->
            <div class="setting-card is-compact">
              <div class="setting-header">Lønnsdato</div>
              <div class="setting-body">
                <label for="payrollDayInput">Dag i måneden (1–31)</label>
                <input id="payrollDayInput" type="number" inputmode="numeric" min="1" max="31" step="1" placeholder="15" onchange="app.updatePayrollDay && app.updatePayrollDay(this.value)" />
                <div id="payrollDayError" class="form-hint" style="display:none; color: var(--danger);">Ugyldig dato. Velg et tall mellom 1 og 31.</div>
              </div>
            </div>
          </div>
        </section>
    </div>
    <div class="settings-bottom-bar">
      <button type="button" class="btn btn-secondary" data-spa data-href="/settings?from=detail">Tilbake</button>
    </div>
  </div>`;
}

function getWageAdvancedDetail() {
  return `
  <div class="settings-detail">
    <div class="settings-content">
      <h2 class="detail-title">Avansert lønn</h2>
        <!-- Section Box: Pausetrekk -->
        <section class="settings-section" aria-labelledby="break-deduction-title">
          <header class="settings-section-header">
            <h3 id="break-deduction-title">Pausetrekk</h3>
            <p class="section-description">Juridisk pausetrekk med valgbar metode eller bedrifts­policy.</p>
          </header>
          <div class="settings-section-body">
            <!-- Card: Toggle -->
            <div class="setting-card is-compact">
              <div class="setting-header">Aktiver pausetrekk</div>
              <div class="setting-body">
                <div class="switch-group">
                  <label for="pauseDeductionEnabledToggle" class="switch-text">Pausetrekk</label>
                  <label class="switch">
                    <input id="pauseDeductionEnabledToggle" aria-label="Pausetrekk" type="checkbox" />
                    <span class="slider"></span>
                  </label>
                </div>
                <div class="form-hint">Skjul/vis avanserte pausetrekk-innstillinger.</div>
              </div>
            </div>

            <div id="breakDeductionSubsection" class="settings-section-body">
              <!-- Card: Metode / Bedriftspolicy (conditional by subscription) -->
              <div class="setting-card is-standard">
                <div class="setting-header">Metode</div>
                <div class="setting-body">
                  <!-- Basic method select (non-enterprise) -->
                  <div id="basicMethodContainer">
                    <label for="pauseDeductionMethodSelect">Velg metode</label>
                    <select id="pauseDeductionMethodSelect">
                      <option value="proportional">Proporsjonal (anbefalt)</option>
                      <option value="base_only">Kun grunnlønn</option>
                      <option value="end_of_shift">Slutt av vakt (legacy)</option>
                      <option value="none">Ingen trekk</option>
                    </select>
                  </div>

                  <!-- Enterprise policy select (replaces basic select when active) -->
                  <div id="orgBreakPolicySection" style="display:none;">
                    <label for="breakPolicySelect">Bedriftspolicy</label>
                    <select id="breakPolicySelect">
                      <option value="proportional_across_periods">Proporsjonal trekk (anbefalt)</option>
                      <option value="from_base_rate">Trekk kun fra grunnlønn</option>
                      <option value="fixed_0_5_over_5_5h">Trekk på slutten av vakt</option>
                      <option value="none">Ingen trekk - betalt pause</option>
                    </select>
                    <div class="form-hint">Styrt av bedriftsnivå for Enterprise.</div>
                  </div>

                  <!-- Always-visible method info -->
                  <div class="form-hint" id="proportionalInfo">Proporsjonalt: Trekkes fra alle timer. Anbefalt.</div>
                  <div class="form-hint hidden" id="baseOnlyInfo">Kun grunnlønn: Trekk kun fra grunnlønn. Tillegg bevares.</div>
                  <div class="form-hint hidden" id="endOfShiftInfo">⚠️ Slutt av vakt: Trekker på slutten. Kan være problematisk.</div>
                  <div class="form-hint hidden" id="noneInfo">Ingen trekk: Pause betales.</div>
                </div>
              </div>

              <!-- Card: Grenser -->
              <div class="setting-card is-compact">
                <div class="setting-header">Grenser</div>
                <div class="setting-body">
                  <div class="form-group">
                    <label for="pauseThresholdInput">Terskel (timer)</label>
                    <input id="pauseThresholdInput" type="number" step="0.5" min="0" max="24" placeholder="5.5" />
                    <div id="pauseThresholdError" class="form-hint" style="display:none; color: var(--danger);">Velg mellom 0 og 24 timer.</div>
                  </div>
                  <div class="form-group">
                    <label for="pauseDeductionMinutesInput">Pausetrekk (minutter)</label>
                    <input id="pauseDeductionMinutesInput" type="number" step="15" min="0" max="120" placeholder="30" />
                    <div id="pauseMinutesError" class="form-hint" style="display:none; color: var(--danger);">Velg mellom 0 og 120 minutter.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Section Box: Skatt -->
        <section class="settings-section" aria-labelledby="tax-section-title">
          <header class="settings-section-header">
            <h3 id="tax-section-title">Skatt</h3>
          </header>
          <div class="settings-section-body">
            <!-- Card: Skattetrekk (toggle) -->
            <div class="setting-card is-compact">
              <div class="setting-header">Skattetrekk</div>
              <div class="setting-body">
                <div class="switch-group">
                  <label for="taxDeductionToggle" class="switch-text">Skattetrekk</label>
                  <label class="switch">
                    <input id="taxDeductionToggle" aria-label="Skattetrekk" type="checkbox" onchange="app.toggleTaxDeduction && app.toggleTaxDeduction(this.checked)" />
                    <span class="slider"></span>
                  </label>
                </div>
                <div class="form-hint">Vis netto beløp ved å trekke skatt.</div>
              </div>
            </div>

            <!-- Card: Skatteprosent -->
            <div id="taxPercentageSection" class="setting-card is-standard" style="display:none;">
              <div class="setting-header">Skatteprosent</div>
              <div class="setting-body">
                <label for="taxPercentageInput">Skattetrekk (%)</label>
                <input id="taxPercentageInput" type="number" inputmode="decimal" min="0" max="100" step="0.5" placeholder="35"
                       onchange="app.updateTaxPercentage && app.updateTaxPercentage(this.value)" />
                <div id="taxPercentageError" class="form-hint" style="display:none; color: var(--danger);">Velg mellom 0 og 100%.</div>
              </div>
            </div>
          </div>
        </section>

        <!-- Section Box: Tillegg -->
        <section class="settings-section" aria-labelledby="advanced-supplements-title">
          <header class="settings-section-header">
            <h3 id="advanced-supplements-title">Tillegg</h3>
            <p class="section-description">Flere tillegg per dag er tillatt, men tidsrom kan ikke overlappe.</p>
          </header>
          <div class="settings-section-body">
            <div class="setting-card is-long">
              <div class="setting-body">
                <!-- Ukedag group -->
                <div class="supplement-group" data-type="weekday">
                  <div class="group-title">Ukedag</div>
                  <div id="weekdayBonusSlots" class="supplement-list" aria-live="polite"></div>
                  <div class="setting-actions">
                    <button id="addWeekdaySupplementBtn" type="button" class="btn btn-secondary">Legg til</button>
                  </div>
                </div>
                <!-- Lørdag group -->
                <div class="supplement-group" data-type="saturday">
                  <div class="group-title">Lørdag</div>
                  <div id="saturdayBonusSlots" class="supplement-list" aria-live="polite"></div>
                  <div class="setting-actions">
                    <button id="addSaturdaySupplementBtn" type="button" class="btn btn-secondary">Legg til</button>
                  </div>
                </div>
                <!-- Søndag group -->
                <div class="supplement-group" data-type="sunday">
                  <div class="group-title">Søndag</div>
                  <div id="sundayBonusSlots" class="supplement-list" aria-live="polite"></div>
                  <div class="setting-actions">
                    <button id="addSundaySupplementBtn" type="button" class="btn btn-secondary">Legg til</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
    </div>
    <div class="settings-bottom-bar">
      <button type="button" class="btn btn-secondary" data-spa data-href="/settings?from=detail">Tilbake</button>
    </div>
  </div>`;
}

function getInterfaceDetail() {
  return `
  <div class="settings-detail">
    <div class="settings-content">
      <h2 class="detail-title">Utseende</h2>
        <!-- Section Box: Tema -->
        <section class="settings-section" aria-labelledby="theme-section-title">
          <header class="settings-section-header">
            <h3 id="theme-section-title">Tema</h3>
          </header>
          <div class="settings-section-body">
            <div class="setting-card is-compact">
              <div class="setting-header" style="display:flex;align-items:center;gap:8px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="opacity:0.7;">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                  <line x1="8" y1="21" x2="16" y2="21"></line>
                  <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
                <span>Tema</span>
              </div>
              <div class="setting-body">
                <div class="row-inline" role="radiogroup" aria-label="Tema">
                  <label for="themeLight" style="display:flex;align-items:center;gap:8px;">
                    <input type="radio" id="themeLight" name="theme" value="light" />
                    Lys
                  </label>
                  <label for="themeDark" style="display:flex;align-items:center;gap:8px;">
                    <input type="radio" id="themeDark" name="theme" value="dark" />
                    Mørk
                  </label>
                  <label for="themeSystem" style="display:flex;align-items:center;gap:8px;">
                    <input type="radio" id="themeSystem" name="theme" value="system" />
                    Automatisk
                  </label>
                </div>
                <div class="form-hint">Endring lagres og brukes med en gang.</div>
              </div>
            </div>
          </div>
        </section>

        <!-- Section Box: Visning av vakter -->
        <section class="settings-section" aria-labelledby="shifts-view-title">
          <header class="settings-section-header">
            <h3 id="shifts-view-title">Visning av vakter</h3>
          </header>
          <div class="settings-section-body">
            <div class="setting-card is-compact">
              <div class="setting-header" style="display:flex;align-items:center;gap:8px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="opacity:0.7;">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span>Standardvisning</span>
              </div>
              <div class="setting-body">
                <div class="switch-group">
                  <label for="defaultShiftsViewToggle" class="switch-text">Åpne kalender som standard</label>
                  <label class="switch">
                    <input id="defaultShiftsViewToggle" aria-label="Åpne kalender som standard" type="checkbox" />
                    <span class="slider"></span>
                  </label>
                </div>
                <div class="form-hint">Når aktivert, åpnes kalenderen i stedet for liste.</div>
              </div>
            </div>
          </div>
        </section>

        <!-- Section Box: Bedriftsfunksjoner -->
        <section class="settings-section" aria-labelledby="business-features-title">
          <header class="settings-section-header">
            <h3 id="business-features-title">Bedriftsfunksjoner</h3>
          </header>
          <div class="settings-section-body">
            <!-- Card: Vis bedriftsfanen (Enterprise) -->
            <div id="employeeTabVisibilityGroup" class="setting-card is-compact" style="display:none;">
              <div class="setting-header" style="display:flex;align-items:center;gap:8px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="opacity:0.7;">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>Vis bedriftsfanen</span>
              </div>
              <div class="setting-body">
                <div class="switch-group">
                  <label for="showEmployeeTabToggle" class="switch-text">Vis «Ansatte»-fanen</label>
                  <label class="switch">
                    <input id="showEmployeeTabToggle" aria-label="Vis «Ansatte»-fanen" type="checkbox" />
                    <span class="slider"></span>
                  </label>
                </div>
                <div class="form-hint">Krever Enterprise. Viser fanen «Ansatte» i bunnmenyen.</div>
              </div>
            </div>

            <!-- Card: Oppgrader til Enterprise (Upsell when not subscribed) -->
            <div id="enterpriseUpsellGroup" class="setting-card is-compact" style="display:none;">
              <div class="setting-header">Oppgrader</div>
              <div class="setting-actions">
                <button type="button" class="btn btn-primary" onclick="app.openSubscription && app.openSubscription()">Oppgrader til Enterprise</button>
              </div>
            </div>
          </div>
        </section>

        <!-- Section Box: Tidsregistrering og format -->
        <section class="settings-section" aria-labelledby="time-format-title">
          <header class="settings-section-header">
            <h3 id="time-format-title">Tidsregistrering og format</h3>
          </header>
          <div class="settings-section-body">
            <!-- Card: Direkte tidsinput -->
            <div class="setting-card is-compact">
              <div class="setting-header">Direkte tidsinput</div>
              <div class="setting-body">
                <div class="switch-group">
                  <label for="directTimeInputToggle" class="switch-text">Skriv tid direkte</label>
                  <label class="switch">
                    <input id="directTimeInputToggle" aria-label="Skriv tid direkte" type="checkbox" />
                    <span class="slider"></span>
                  </label>
                </div>
                <div class="form-hint">Raskere registrering uten nedtrekksmenyer.</div>
              </div>
            </div>

            <!-- Card: Minuttintervall -->
            <div class="setting-card is-compact">
              <div class="setting-header">Minuttintervall</div>
              <div class="setting-body">
                <div class="switch-group">
                  <label for="fullMinuteRangeToggle" class="switch-text">Vis alle minutter</label>
                  <label class="switch">
                    <input id="fullMinuteRangeToggle" aria-label="Vis alle minutter" type="checkbox" />
                    <span class="slider"></span>
                  </label>
                </div>
                <div class="form-hint">Vis hvert minutt i stedet for 15-minutters intervaller.</div>
              </div>
            </div>

            <!-- Card: Valutavisning -->
            <div class="setting-card is-compact">
              <div class="setting-header">Valutavisning</div>
              <div class="setting-body">
                <div class="switch-group">
                  <label for="currencyFormatToggle" class="switch-text">Bruk «NOK» i stedet for «kr»</label>
                  <label class="switch">
                    <input id="currencyFormatToggle" aria-label="Bruk «NOK» i stedet for «kr»" type="checkbox" />
                    <span class="slider"></span>
                  </label>
                </div>
                <div class="form-hint">Mer formell visning i rapporter og eksport.</div>
              </div>
            </div>
          </div>
        </section>
    </div>
    <div class="settings-bottom-bar">
      <button type="button" class="btn btn-secondary" data-spa data-href="/settings?from=detail">Tilbake</button>
    </div>
  </div>`;
}

function getDataDetail() {
  return `
  <div class="settings-detail">
    <div class="settings-content">
      <h2 class="detail-title">Data</h2>
        <!-- Section Box: Eksport -->
        <section class="settings-section" aria-labelledby="export-section-title">
          <header class="settings-section-header">
            <h3 id="export-section-title">Eksport</h3>
          </header>
          <div class="settings-section-body">
            <!-- Card: Periodevalg -->
            <div class="setting-card is-standard">
              <div class="setting-header">Periode</div>
              <div class="setting-body">
                <div class="form-group export-period-options">
                  <div class="row-inline" style="display:flex; flex-direction:column; gap:8px;">
                    <label style="display:flex; align-items:center; gap:8px;">
                      <input type="radio" name="exportPeriod" value="current" checked />
                      <span>Denne måneden (<span id="currentMonthLabel"></span>)</span>
                    </label>
                    <label style="display:flex; align-items:center; gap:8px;">
                      <input type="radio" name="exportPeriod" value="year" />
                      <span>Hele året (alle 12 måneder)</span>
                    </label>
                    <label style="display:flex; align-items:center; gap:8px;">
                      <input type="radio" name="exportPeriod" value="all" />
                      <span>Alle vakter jeg har registrert</span>
                    </label>
                    <label style="display:flex; align-items:center; gap:8px;">
                      <input type="radio" name="exportPeriod" value="custom" />
                      <span>Velg datoer selv</span>
                    </label>
                  </div>
                </div>

                <!-- Conditional custom period section -->
                <div id="customPeriodSection" class="setting-card is-standard" style="display:none;">
                  <div class="setting-header">Egendefinert periode</div>
                  <div class="setting-body">
                    <div class="form-group">
                      <label for="exportStartDate">Startdato</label>
                      <input id="exportStartDate" type="date" />
                    </div>
                    <div class="form-group">
                      <label for="exportEndDate">Sluttdato</label>
                      <input id="exportEndDate" type="date" />
                    </div>
                    <div id="exportDateError" class="form-hint" style="display:none; color: var(--danger);">Startdato må være før eller lik sluttdato.</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Card: Eksporter-knapper -->
            <div class="setting-card is-compact">
              <div class="setting-header">Eksporter</div>
              <div class="setting-actions">
                <button id="exportCsvBtn" type="button" class="btn btn-primary" onclick="app.exportDataWithPeriod && app.exportDataWithPeriod('csv')">CSV (Excel)</button>
                <button id="exportPdfBtn" type="button" class="btn btn-secondary" onclick="app.exportDataWithPeriod && app.exportDataWithPeriod('pdf')">PDF-rapport</button>
              </div>
            </div>
          </div>
        </section>

        <!-- Section Box: Lønnsrapport (Enterprise) -->
        <section id="enterprisePayrollSection" class="settings-section" aria-labelledby="payroll-section-title" style="display:none;">
          <header class="settings-section-header">
            <h3 id="payroll-section-title">Lønnsrapport</h3>
            <p class="section-description">Detaljert CSV for ansatte (Enterprise)</p>
          </header>
          <div class="settings-section-body">
            <div class="setting-card is-compact">
              <div class="setting-header">Eksporter lønnsrapport</div>
              <div class="setting-actions">
                <button type="button" class="btn btn-primary" onclick="app.openCsvExportModal && app.openCsvExportModal()">Åpne eksport</button>
              </div>
            </div>
          </div>
        </section>

        <!-- Section Box: Import -->
        <section class="settings-section" aria-labelledby="import-section-title">
          <header class="settings-section-header">
            <h3 id="import-section-title">Import</h3>
            <p class="section-description">Importer vakter og innstillinger fra fil</p>
          </header>
          <div class="settings-section-body">
            <div class="setting-card is-standard">
              <div class="setting-header">Importer data</div>
              <div class="setting-body">
                <label for="importFileData">Velg fil</label>
                <div class="row-inline" style="display:flex; gap:8px; align-items:center;">
                  <input id="importFileData" type="file" accept=".csv,.json" />
                  <button id="importUploadBtn" type="button" class="btn btn-secondary" onclick="app.importDataFromDataTab && app.importDataFromDataTab()" disabled>Last opp</button>
                </div>
                <div class="form-hint">Støtter CSV og JSON. Maks 10 MB.</div>
                <div id="importStatus" class="form-hint" aria-live="polite"></div>
                <div id="importProgress" style="height:8px;background:var(--border);border-radius:9999px;overflow:hidden;display:none;">
                  <div id="importProgressFill" style="height:100%;width:0;background:var(--accent);transition:width .3s;"></div>
                </div>
                <div id="importResult" class="form-hint"></div>
              </div>
            </div>
          </div>
        </section>
    </div>
    <div class="settings-bottom-bar">
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
  } else if (section === 'account' || section === 'profile') {
    inner = getAccountDetail();
  } else if (section === 'wage') {
    inner = getWageDetail();
  } else if (section === 'wage-advanced') {
    inner = getWageAdvancedDetail();
  } else if (section === 'interface') {
    inner = getInterfaceDetail();
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
    document.querySelectorAll('.floating-settings-backdrop, .floating-settings-bar, .floating-nav-btn').forEach(el => el.remove());

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
        /* Allow clicks to pass through except for the floating bar itself */
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

    const isDetail = !!section;
    // Create a single floating nav button (no wrapping bar)
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = isDetail ? 'floating-nav-btn back-btn' : 'floating-nav-btn btn btn-secondary';
    btn.setAttribute('data-spa', '');
    btn.style.pointerEvents = 'auto';
    if (isDetail) {
      btn.setAttribute('data-href', '/settings?from=detail');
      btn.setAttribute('aria-label', 'Tilbake');
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        <span>Tilbake</span>
      `;
    } else {
      btn.setAttribute('data-href', '/');
      btn.textContent = 'Lukk';
    }
    portal.appendChild(btn);

    // Hard-bind navigation for the floating bar buttons to avoid any bubbling/portal edge cases
    try {
      const ensureRootVisible = () => {
        try {
          const appEl = document.getElementById('app');
          const spaEl = document.getElementById('spa-root');
          if (spaEl) spaEl.style.display = 'none';
          if (appEl) appEl.style.setProperty('display', 'block', 'important');
          document.documentElement.classList.remove('spa-route');
          document.body.classList.remove('spa-route');
          // Clean up floating UI remnants
          document.querySelectorAll('.floating-settings-bar, .floating-settings-backdrop, .floating-nav-btn').forEach(el => el.remove());
          const p = document.getElementById('settings-floating-portal');
          if (p) p.remove();
        } catch (_) {}
      };

      const isClose = !isDetail;
      if (isClose) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          // Prefer SPA navigation
          try {
            if (window.__navigate) window.__navigate('/'); else window.location.href = '/';
          } catch (_) { window.location.href = '/'; }
          // Fallback soon after to ensure app becomes visible even if router render is delayed
          setTimeout(ensureRootVisible, 0);
        });
      }

      if (isDetail) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          try {
            const href = btn.getAttribute('data-href') || '/settings';
            if (window.__navigate) window.__navigate(href); else window.location.href = href;
          } catch (_) { window.location.href = '/settings'; }
        });
      }
    } catch (_) { /* non-fatal */ }

    // Ensure the settings page has enough bottom padding to scroll content above the floating bar/backdrop
    try {
      const page = document.getElementById('settingsPage');
      // Measure the actual button height (includes padding)
      const barHeight = btn.getBoundingClientRect().height || 56;
      // Add a comfortable buffer so the last element can clear the gradient
      const desiredPadding = Math.max(120, Math.ceil(barHeight + 40));
      if (page) {
        page.style.paddingBottom = `calc(${desiredPadding}px + env(safe-area-inset-bottom, 0px))`;
      }
    } catch (_) {}
  } catch (e) {
    console.warn('[settings-route] floating settings bar init failed', e);
  }

  // Section-specific initializers
  try {
    if ((section === 'account' || section === 'profile') && window.app) {
      // Load data and wire controls for Konto view
      window.app.loadAccountData?.();
      window.app.initAccountAvatarControls?.();
      window.app.initGoogleLinkButton?.();
      window.app.setupCollapsibleEventListeners?.();
    } else if (section === 'wage' && window.app) {
      // Initialize wage UI state and basic validation
      window.app.updateSettingsUI?.();
      // Inline validation for custom wage input
      const customInput = document.getElementById('customWageInput');
      const errorEl = document.getElementById('customWageError');
      if (customInput && errorEl) {
        const validate = () => {
          const v = parseFloat(customInput.value);
          const invalid = Number.isNaN(v) || v <= 0;
          errorEl.style.display = invalid ? 'block' : 'none';
          customInput.setAttribute('aria-invalid', invalid ? 'true' : 'false');
        };
        customInput.addEventListener('input', validate);
        validate();
      }

      // Wire Månedsmål explicit save behavior (no auto-save here)
      const monthlyGoalInput = document.getElementById('monthlyGoalInput');
      const monthlyGoalError = document.getElementById('monthlyGoalError');
      const saveMonthlyGoalBtn = document.getElementById('saveMonthlyGoalBtn');
      if (monthlyGoalInput && saveMonthlyGoalBtn) {
        // Ensure input reflects current value
        if (typeof window.app.monthlyGoal !== 'undefined') {
          monthlyGoalInput.value = window.app.monthlyGoal;
        }
        const validateMonthlyGoal = () => {
          const val = parseInt(monthlyGoalInput.value, 10);
          const invalid = Number.isNaN(val) || val <= 0;
          if (monthlyGoalError) monthlyGoalError.style.display = invalid ? 'block' : 'none';
          monthlyGoalInput.setAttribute('aria-invalid', invalid ? 'true' : 'false');
          return !invalid;
        };
        monthlyGoalInput.addEventListener('input', validateMonthlyGoal);
        validateMonthlyGoal();
        saveMonthlyGoalBtn.addEventListener('click', async () => {
          if (!validateMonthlyGoal()) return;
          const nextVal = parseInt(monthlyGoalInput.value, 10);
          window.app.monthlyGoal = nextVal;
          try { await window.app.saveSettingsToSupabase?.(); } catch (_) {}
          try { window.app.saveToLocalStorage?.(); } catch (_) {}
          try { window.ErrorHelper?.showSuccess?.('Månedsmål lagret', { duration: 2500 }); } catch (_) {}
        });
      }

      // Wire Lønnsdato validation + auto-save on valid change
      const payrollDayInput = document.getElementById('payrollDayInput');
      const payrollDayError = document.getElementById('payrollDayError');
      if (payrollDayInput) {
        // Remove inline onchange handler to control persistence with validation
        try { payrollDayInput.onchange = null; } catch (_) {}
        const validatePayrollDay = () => {
          const d = parseInt(payrollDayInput.value, 10);
          const invalid = Number.isNaN(d) || d < 1 || d > 31;
          if (payrollDayError) payrollDayError.style.display = invalid ? 'block' : 'none';
          payrollDayInput.setAttribute('aria-invalid', invalid ? 'true' : 'false');
          return !invalid;
        };
        payrollDayInput.addEventListener('input', validatePayrollDay);
        payrollDayInput.addEventListener('change', (e) => {
          if (!validatePayrollDay()) return;
          window.app.updatePayrollDay?.(e.target.value);
        });
        // Initial validation state
        validatePayrollDay();
      }
      // Ensure collapsible handlers present for future sections reuse
      window.app.setupCollapsibleEventListeners?.();
    } else if (section === 'wage-advanced' && window.app) {
      // Initialize Tillegg UI: render rows, wire add/edit/remove, validation and auto-save

      const timeToMinutes = (t) => {
        if (!t || typeof t !== 'string') return null;
        const m = t.match(/^(\d{1,2}):(\d{2})$/);
        if (!m) return null;
        const hh = parseInt(m[1], 10), mm = parseInt(m[2], 10);
        if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
        return hh * 60 + mm;
      };

      const hasOverlap = (list) => {
        // list: [{from:'HH:MM', to:'HH:MM'}]
        const ranges = list
          .map((x, idx) => ({ idx, a: timeToMinutes(x.from), b: timeToMinutes(x.to) }))
          .filter(r => r.a !== null && r.b !== null && r.a < r.b);
        ranges.sort((r1, r2) => r1.a - r2.a);
        for (let i = 1; i < ranges.length; i++) {
          if (ranges[i].a < ranges[i-1].b) return true;
        }
        return false;
      };

      const formatRowText = (slot) => `${slot.from || '--:--'}–${slot.to || '--:--'} • ${typeof slot.rate === 'number' ? slot.rate.toFixed(2) : (slot.rate || '0')} kr/t`;

      const renderGroup = (type) => {
        const container = document.getElementById(`${type}BonusSlots`);
        if (!container) return;
        const saved = (window.app.customBonuses && window.app.customBonuses[type]) || [];
        container.innerHTML = '';
        saved.forEach((slot, index) => {
          const row = document.createElement('div');
          row.className = 'supplement-row';
          row.setAttribute('data-type', type);
          row.setAttribute('data-index', String(index));
          row.innerHTML = `
            <div class="supplement-meta">${formatRowText(slot)}</div>
            <div class="supplement-actions">
              <button type="button" class="btn btn-secondary" data-action="edit">Rediger</button>
              <button type="button" class="btn btn-danger" data-action="remove">Fjern</button>
            </div>
          `;
          container.appendChild(row);
        });
      };

      const renderAll = () => {
        ['weekday','saturday','sunday'].forEach(renderGroup);
      };

      const tryPersist = async (type, indexOrNull, slot, editorEl) => {
        // Inline validation: complete, non-overlap, positive rate
        const fromMin = timeToMinutes(slot.from);
        const toMin = timeToMinutes(slot.to);
        const rateOk = typeof slot.rate === 'number' && !Number.isNaN(slot.rate) && slot.rate > 0;
        const timeOk = fromMin !== null && toMin !== null && fromMin < toMin;
        let errorMsg = '';
        if (!timeOk) errorMsg = 'Ugyldig tidsrom';
        else if (!rateOk) errorMsg = 'Ugyldig sats';
        if (timeOk && rateOk) {
          const current = (window.app.customBonuses && window.app.customBonuses[type]) || [];
          const next = current.slice();
          if (indexOrNull === null) next.push({ from: slot.from, to: slot.to, rate: slot.rate });
          else next[indexOrNull] = { from: slot.from, to: slot.to, rate: slot.rate };
          if (hasOverlap(next)) errorMsg = 'Tidsrom overlapper';
          else errorMsg = '';
          if (!errorMsg) {
            const ok = await window.app.upsertBonusSlot?.(type, indexOrNull, { from: slot.from, to: slot.to, rate: slot.rate });
            if (ok) {
              // Re-render list and restore scroll
              const y = window.scrollY;
              renderGroup(type);
              window.scrollTo(0, y);
              return true;
            } else {
              errorMsg = 'Kunne ikke lagre';
            }
          }
        }
        // Show/hide inline error on editor
        if (editorEl) {
          let err = editorEl.querySelector('.inline-error');
          if (!err) { err = document.createElement('div'); err.className = 'inline-error'; editorEl.appendChild(err); }
          err.textContent = errorMsg || '';
          editorEl.classList.toggle('has-error', !!errorMsg);
        }
        return false;
      };

      const attachEditorListeners = (slotEl, type, indexOrNull) => {
        if (!slotEl) return;
        const inputs = slotEl.querySelectorAll('input');
        const readSlot = () => {
          const [fromEl, toEl, rateEl] = inputs;
          return {
            from: fromEl?.value || '',
            to: toEl?.value || '',
            rate: parseFloat(rateEl?.value || '0')
          };
        };
        const onChange = async () => {
          // format time inputs via app helper
          inputs.forEach(inp => { if (inp.type === 'time') window.app.formatTimeInput?.(inp); });
          const slot = readSlot();
          // Only attempt save when all fields present
          if (!slot.from || !slot.to || !slot.rate) return;
          // Clear any pending global debounce to avoid double saves
          try { if (window.app.autoSaveTimeout) { clearTimeout(window.app.autoSaveTimeout); window.app.autoSaveTimeout = null; } } catch(_){}
          await tryPersist(type, indexOrNull, slot, slotEl);
        };
        inputs.forEach(inp => {
          inp.addEventListener('change', onChange);
          inp.addEventListener('input', () => {
            // live validate but do not persist until complete
            const slot = readSlot();
            const fromMin = timeToMinutes(slot.from);
            const toMin = timeToMinutes(slot.to);
            let errorMsg = '';
            if (slot.from && slot.to && (fromMin === null || toMin === null || fromMin >= toMin)) errorMsg = 'Ugyldig tidsrom';
            if (slot.from && slot.to && !errorMsg) {
              const curr = (window.app.customBonuses && window.app.customBonuses[type]) || [];
              const next = curr.slice();
              if (indexOrNull === null) next.push({ from: slot.from, to: slot.to, rate: slot.rate || 0 });
              else next[indexOrNull] = { from: slot.from, to: slot.to, rate: slot.rate || 0 };
              if (hasOverlap(next)) errorMsg = 'Tidsrom overlapper';
            }
            let err = slotEl.querySelector('.inline-error');
            if (!err) { err = document.createElement('div'); err.className = 'inline-error'; slotEl.appendChild(err); }
            err.textContent = errorMsg || '';
            slotEl.classList.toggle('has-error', !!errorMsg);
          });
        });
        const removeBtn = slotEl.querySelector('.remove-bonus');
        if (removeBtn) {
          removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!confirm('Er du sikker på at du vil fjerne dette tillegget?')) return;
            slotEl.remove();
          });
        }
      };

      const openEditorForExisting = (type, index) => {
        const container = document.getElementById(`${type}BonusSlots`);
        if (!container) return;
        const saved = (window.app.customBonuses && window.app.customBonuses[type]) || [];
        const slot = saved[index];
        if (!slot) return;
        // Remove the view row and insert an editor
        const y = window.scrollY;
        const row = container.querySelector(`.supplement-row[data-index="${index}"]`);
        if (row) row.remove();
        window.app.addBonusSlot?.(type);
        const editor = container.querySelector('.bonus-slot:last-of-type');
        if (editor) {
          // Prefill values
          const inputs = editor.querySelectorAll('input');
          if (inputs[0]) inputs[0].value = slot.from;
          if (inputs[1]) inputs[1].value = slot.to;
          if (inputs[2]) inputs[2].value = String(slot.rate);
          attachEditorListeners(editor, type, index);
        }
        window.scrollTo(0, y);
      };

      const handleAdd = (type) => {
        const y = window.scrollY;
        window.app.addBonusSlot?.(type);
        const container = document.getElementById(`${type}BonusSlots`);
        const editor = container && container.querySelector('.bonus-slot:last-of-type');
        if (editor) attachEditorListeners(editor, type, null);
        window.scrollTo(0, y);
      };

      // Wire add buttons
      document.getElementById('addWeekdaySupplementBtn')?.addEventListener('click', () => handleAdd('weekday'));
      document.getElementById('addSaturdaySupplementBtn')?.addEventListener('click', () => handleAdd('saturday'));
      document.getElementById('addSundaySupplementBtn')?.addEventListener('click', () => handleAdd('sunday'));

      // Delegate edit/remove for rows
      ['weekday','saturday','sunday'].forEach((type) => {
        const container = document.getElementById(`${type}BonusSlots`);
        if (!container) return;
        container.addEventListener('click', async (e) => {
          const btn = e.target && e.target.closest && e.target.closest('button');
          if (!btn) return;
          const action = btn.getAttribute('data-action');
          const row = btn.closest('.supplement-row');
          const idx = row ? parseInt(row.getAttribute('data-index') || '-1', 10) : -1;
          if (action === 'edit' && idx >= 0) {
            openEditorForExisting(type, idx);
          } else if (action === 'remove' && idx >= 0) {
            if (!confirm('Fjern dette tillegget?')) return;
            const curr = (window.app.customBonuses && window.app.customBonuses[type]) || [];
            curr.splice(idx, 1);
            window.app.customBonuses[type] = curr;
            try { await window.app.saveSettingsToSupabase?.(); } catch(_) {}
            try { window.app.saveToLocalStorage?.(); } catch(_) {}
            const y = window.scrollY;
            renderGroup(type);
            window.scrollTo(0, y);
          }
        });
      });

      // Initial render for Tillegg
      renderAll();

      // Initialize Pausetrekk UI state and validations
      try {
        // Sync current app settings into inputs
        window.app.updateSettingsUI?.();

        // Enterprise vs Basic control switching
        if (window.app && window.app.updateOrgSettingsUI) {
          // Toggle which control is visible based on subscription
          import('/src/js/subscriptionUtils.js').then(({ hasEnterpriseSubscription }) => {
            hasEnterpriseSubscription().then((hasEnterprise) => {
              const basic = document.getElementById('basicMethodContainer');
              const enterprise = document.getElementById('orgBreakPolicySection');
              if (basic && enterprise) {
                enterprise.style.display = hasEnterprise ? '' : 'none';
                basic.style.display = hasEnterprise ? 'none' : '';
              }
              // Ensure org UI state (disabled/enabled) reflects subscription
              window.app.updateOrgSettingsUI?.();
              // If enterprise, mirror saved org policy value
              if (hasEnterprise) {
                const sel = document.getElementById('breakPolicySelect');
                if (sel && window.app.orgSettings && window.app.orgSettings.break_policy) {
                  sel.value = window.app.orgSettings.break_policy;
                }
              }
            });
          }).catch(() => {});
        }

        // Wire break policy change to server org-settings
        const pageScope = document.getElementById('settingsPage') || document;
        const breakPolicySelect = pageScope.querySelector('#breakPolicySelect');
        if (breakPolicySelect) {
          breakPolicySelect.addEventListener('change', () => window.app.saveOrgSettings?.());
        }

        // Show/hide subsection on toggle
        const toggle = pageScope.querySelector('#pauseDeductionEnabledToggle');
        const subsection = pageScope.querySelector('#breakDeductionSubsection');
        if (toggle && subsection) {
          // Ensure the route-scoped toggle reflects current state
          if (window.app && typeof window.app.pauseDeductionEnabled !== 'undefined') {
            toggle.checked = !!window.app.pauseDeductionEnabled;
          }
          const setVis = () => { subsection.style.display = toggle.checked ? '' : 'none'; };
          toggle.addEventListener('change', setVis);
          setVis();
        }

        // Inline validation for threshold and minutes
        const thresholdInput = pageScope.querySelector('#pauseThresholdInput');
        const thresholdError = pageScope.querySelector('#pauseThresholdError');
        const minutesInput = pageScope.querySelector('#pauseDeductionMinutesInput');
        const minutesError = pageScope.querySelector('#pauseMinutesError');

        // Ensure current values are reflected in the route-scoped inputs (avoid duplicate-ID conflicts)
        if (thresholdInput && window.app && typeof window.app.pauseThresholdHours !== 'undefined') {
          thresholdInput.value = window.app.pauseThresholdHours;
        }
        if (minutesInput && window.app && typeof window.app.pauseDeductionMinutes !== 'undefined') {
          minutesInput.value = window.app.pauseDeductionMinutes;
        }

        const validateThreshold = () => {
          if (!thresholdInput) return true;
          // Don't show errors when disabled or empty on load
          if (toggle && !toggle.checked) { if (thresholdError) thresholdError.style.display = 'none'; thresholdInput.setAttribute('aria-invalid', 'false'); return true; }
          if (thresholdInput.value === '' || thresholdInput.value == null) { if (thresholdError) thresholdError.style.display = 'none'; thresholdInput.setAttribute('aria-invalid', 'false'); return true; }
          const v = parseFloat(thresholdInput.value);
          const invalid = Number.isNaN(v) || v < 0 || v > 24;
          if (thresholdError) thresholdError.style.display = invalid ? 'block' : 'none';
          thresholdInput.setAttribute('aria-invalid', invalid ? 'true' : 'false');
          return !invalid;
        };
        const validateMinutes = () => {
          if (!minutesInput) return true;
          // Don't show errors when disabled or empty on load
          if (toggle && !toggle.checked) { if (minutesError) minutesError.style.display = 'none'; minutesInput.setAttribute('aria-invalid', 'false'); return true; }
          if (minutesInput.value === '' || minutesInput.value == null) { if (minutesError) minutesError.style.display = 'none'; minutesInput.setAttribute('aria-invalid', 'false'); return true; }
          const v = parseInt(minutesInput.value, 10);
          const invalid = Number.isNaN(v) || v < 0 || v > 120;
          if (minutesError) minutesError.style.display = invalid ? 'block' : 'none';
          minutesInput.setAttribute('aria-invalid', invalid ? 'true' : 'false');
          return !invalid;
        };
        thresholdInput?.addEventListener('input', validateThreshold);
        minutesInput?.addEventListener('input', validateMinutes);
        // Initialize validation state on load (after values ensured)
        validateThreshold();
        validateMinutes();

        // Initialize Skatt (tax) UI state and validations
        try {
          // Sync current tax settings into the UI and visibility
          // Update legacy UI first, then ensure route-scoped inputs reflect state
          window.app.updateTaxDeductionUI?.();

          // Inline validation for tax percentage
          const taxInput = pageScope.querySelector('#taxPercentageInput');
          const taxError = pageScope.querySelector('#taxPercentageError');
          const taxSection = pageScope.querySelector('#taxPercentageSection');
          if (taxInput && window.app) taxInput.value = window.app.taxPercentage ?? '';
          if (taxSection && window.app) taxSection.style.display = window.app.taxDeductionEnabled ? '' : 'none';
          const validateTax = () => {
            if (!taxInput) return true;
            if (taxInput.value === '' || taxInput.value == null) { if (taxError) taxError.style.display = 'none'; taxInput.setAttribute('aria-invalid', 'false'); return true; }
            const v = parseFloat(taxInput.value);
            const invalid = Number.isNaN(v) || v < 0 || v > 100;
            if (taxError) taxError.style.display = invalid ? 'block' : 'none';
            taxInput.setAttribute('aria-invalid', invalid ? 'true' : 'false');
            return !invalid;
          };
          taxInput?.addEventListener('input', validateTax);
          // Auto-save via app method on valid change; app clamps and persists
          taxInput?.addEventListener('change', () => {
            window.app.updateTaxPercentage?.(taxInput.value);
            validateTax();
          });
          validateTax();

          // Ensure toggle updates section visibility consistently
          const taxToggle = pageScope.querySelector('#taxDeductionToggle');
          if (taxToggle && !taxToggle._boundChange) {
            taxToggle.addEventListener('change', () => {
              window.app.toggleTaxDeduction?.(taxToggle.checked);
              window.app.updateTaxDeductionUI?.();
              if (taxSection) taxSection.style.display = taxToggle.checked ? '' : 'none';
            });
            taxToggle._boundChange = true;
          }
        } catch (e) {
          console.warn('[settings-route] tax init failed', e);
        }
      } catch (e) {
        console.warn('[settings-route] pausetrekk init failed', e);
      }
    } else if (section === 'interface') {
      try {
        // Ensure theme UI radios are discovered and wired
        if (window.themeIntegration && window.themeIntegration.setupThemeUI) {
          window.themeIntegration.setupThemeUI();
        }
        // Reflect current theme selection immediately
        if (window.themeIntegration && window.themeIntegration.updateThemeUI && window.themeManager) {
          window.themeIntegration.updateThemeUI(window.themeManager.getCurrentTheme());
        }

        // Initialize settings values for default shifts view
        if (window.app && window.app.updateSettingsUI) {
          window.app.updateSettingsUI();
        }
        // Attach listeners for newly-rendered toggles (currency/default view, etc.)
        if (window.app && window.app.setupNewSettingsListeners) {
          window.app.setupNewSettingsListeners();
        }

        // Ensure SPA settings toggles reflect current state and are wired
        const root = document.getElementById('settingsPage');
        if (root && window.app) {
          const setChecked = (id, val) => { const el = root.querySelector(`#${id}`); if (el) el.checked = !!val; };

          // Mirror current values into SPA controls
          setChecked('defaultShiftsViewToggle', window.app.defaultShiftsView === 'calendar');
          setChecked('currencyFormatToggle', window.app.currencyFormat);
          setChecked('directTimeInputToggle', window.app.directTimeInput);
          setChecked('fullMinuteRangeToggle', window.app.fullMinuteRange);

          // Enterprise gating for Business Features
          if (window.hasEnterpriseSubscription) {
            window.hasEnterpriseSubscription().then((hasEnt) => {
              const visGroup = root.querySelector('#employeeTabVisibilityGroup');
              const upsellGroup = root.querySelector('#enterpriseUpsellGroup');
              const toggle = root.querySelector('#showEmployeeTabToggle');
              if (visGroup) visGroup.style.display = hasEnt ? '' : 'none';
              if (upsellGroup) upsellGroup.style.display = hasEnt ? 'none' : '';
              if (toggle) {
                toggle.disabled = !hasEnt;
                toggle.checked = (window.app.showEmployeeTab !== false);
              }
            }).catch(() => {});
          }

          // Bind SPA toggle listeners explicitly (avoid legacy modal collisions)
          const spaCurrency = root.querySelector('#currencyFormatToggle');
          if (spaCurrency && !spaCurrency._bound) {
            spaCurrency.addEventListener('change', () => {
              window.app.currencyFormat = !!spaCurrency.checked;
              window.app.saveSettingsToSupabase?.();
              window.app.updateDisplay?.();
            });
            spaCurrency._bound = true;
          }

          const spaDefaultView = root.querySelector('#defaultShiftsViewToggle');
          if (spaDefaultView && !spaDefaultView._bound) {
            spaDefaultView.addEventListener('change', () => {
              window.app.defaultShiftsView = spaDefaultView.checked ? 'calendar' : 'list';
              window.app.saveSettingsToSupabase?.();
            });
            spaDefaultView._bound = true;
          }

          const spaDirectTime = root.querySelector('#directTimeInputToggle');
          if (spaDirectTime && !spaDirectTime._bound) {
            spaDirectTime.addEventListener('change', (e) => {
              const fullMinute = root.querySelector('#fullMinuteRangeToggle');
              if (e.target.checked && fullMinute) {
                fullMinute.checked = false;
                window.app.fullMinuteRange = false;
              }
              window.app.directTimeInput = !!e.target.checked;
              window.app.populateTimeSelects?.();
              window.app.saveSettingsToSupabase?.();
            });
            spaDirectTime._bound = true;
          }

          const spaFullMinute = root.querySelector('#fullMinuteRangeToggle');
          if (spaFullMinute && !spaFullMinute._bound) {
            spaFullMinute.addEventListener('change', (e) => {
              const directTime = root.querySelector('#directTimeInputToggle');
              if (e.target.checked && directTime) {
                directTime.checked = false;
                window.app.directTimeInput = false;
              }
              window.app.fullMinuteRange = !!e.target.checked;
              const currentSelections = {
                startHour: document.getElementById('startHour')?.value || '',
                startMinute: document.getElementById('startMinute')?.value || '',
                endHour: document.getElementById('endHour')?.value || '',
                endMinute: document.getElementById('endMinute')?.value || ''
              };
              window.app.populateTimeSelects?.();
              setTimeout(() => {
                if (currentSelections.startHour) {
                  const sh = document.getElementById('startHour');
                  if (sh) sh.value = currentSelections.startHour;
                }
                if (currentSelections.startMinute) {
                  const sm = document.getElementById('startMinute');
                  if (sm?.querySelector(`option[value="${currentSelections.startMinute}"]`)) sm.value = currentSelections.startMinute;
                }
                if (currentSelections.endHour) {
                  const eh = document.getElementById('endHour');
                  if (eh) eh.value = currentSelections.endHour;
                }
                if (currentSelections.endMinute) {
                  const em = document.getElementById('endMinute');
                  if (em?.querySelector(`option[value="${currentSelections.endMinute}"]`)) em.value = currentSelections.endMinute;
                }
              }, 50);
              window.app.saveSettingsToSupabase?.();
            });
            spaFullMinute._bound = true;
          }

          const spaShowEmployees = root.querySelector('#showEmployeeTabToggle');
          if (spaShowEmployees && !spaShowEmployees._bound) {
            spaShowEmployees.addEventListener('change', async () => {
              try {
                const hasEnt = await (window.hasEnterpriseSubscription?.() || Promise.resolve(false));
                if (!hasEnt) {
                  spaShowEmployees.checked = (window.app.showEmployeeTab !== false);
                  if (window.showToast) window.showToast('Krever Enterprise-abonnement', 'info');
                  return;
                }
                window.app.showEmployeeTab = !!spaShowEmployees.checked;
                await window.app.saveSettingsToSupabase?.();
                await window.app.updateTabBarVisibility?.();
              } catch (_) {}
            });
            spaShowEmployees._bound = true;
          }
        }
      } catch (e) {
        console.warn('[settings-route] interface init failed', e);
      }
    } else if (section === 'data') {
      try {
        // Setup export option controls and current month label
        window.app.setupExportPeriodOptions?.();
        window.app.updateCurrentMonthLabel?.();

        // Inline validation for custom date range
        const startInput = document.getElementById('exportStartDate');
        const endInput = document.getElementById('exportEndDate');
        const errorEl = document.getElementById('exportDateError');
        const csvBtn = document.getElementById('exportCsvBtn');
        const pdfBtn = document.getElementById('exportPdfBtn');

        const isCustomSelected = () => {
          const r = document.querySelector('input[name="exportPeriod"]:checked');
          return r && r.value === 'custom';
        };

        const setDisabled = (disabled) => {
          if (csvBtn) csvBtn.disabled = !!disabled;
          if (pdfBtn) pdfBtn.disabled = !!disabled;
        };

        const validateDates = () => {
          if (!isCustomSelected()) {
            // Not custom: always enabled, hide errors
            if (errorEl) errorEl.style.display = 'none';
            startInput?.setAttribute('aria-invalid', 'false');
            endInput?.setAttribute('aria-invalid', 'false');
            setDisabled(false);
            return true;
          }
          const s = startInput?.value || '';
          const e = endInput?.value || '';
          if (!s || !e) {
            if (errorEl) { errorEl.textContent = 'Velg både start- og sluttdato.'; errorEl.style.display = 'block'; }
            startInput?.setAttribute('aria-invalid', s ? 'false' : 'true');
            endInput?.setAttribute('aria-invalid', e ? 'false' : 'true');
            setDisabled(true);
            return false;
          }
          const start = new Date(s);
          const end = new Date(e);
          const invalid = start > end;
          if (errorEl) {
            errorEl.textContent = invalid ? 'Startdato må være før eller lik sluttdato.' : '';
            errorEl.style.display = invalid ? 'block' : 'none';
          }
          startInput?.setAttribute('aria-invalid', invalid ? 'true' : 'false');
          endInput?.setAttribute('aria-invalid', invalid ? 'true' : 'false');
          setDisabled(invalid);
          return !invalid;
        };

        // Bind listeners
        startInput?.addEventListener('input', validateDates);
        endInput?.addEventListener('input', validateDates);
        document.querySelectorAll('input[name="exportPeriod"]').forEach(r => r.addEventListener('change', () => {
          // Ensure label + defaults update
          window.app.updateCurrentMonthLabel?.();
          // Validate immediately on change
          validateDates();
        }));

        // Initial validation state
        validateDates();

        // Enterprise gating for payroll export section
        try {
          import('/src/js/subscriptionUtils.js').then(({ hasEnterpriseSubscription }) => {
            hasEnterpriseSubscription().then((hasEnt) => {
              const sec = document.getElementById('enterprisePayrollSection');
              if (sec) sec.style.display = hasEnt ? '' : 'none';
            }).catch(() => {
              const sec = document.getElementById('enterprisePayrollSection');
              if (sec) sec.style.display = 'none';
            });
          }).catch(() => {
            const sec = document.getElementById('enterprisePayrollSection');
            if (sec) sec.style.display = 'none';
          });
        } catch (_) {}

        // Import validation + lightweight progress feedback
        (function setupImportUI(){
          const fileInput = document.getElementById('importFileData');
          const uploadBtn = document.getElementById('importUploadBtn');
          const statusEl = document.getElementById('importStatus');
          const progress = document.getElementById('importProgress');
          const fill = document.getElementById('importProgressFill');
          const resultEl = document.getElementById('importResult');
          if (!fileInput || !uploadBtn) return;

          const MAX_MB = 10;
          const resetState = () => {
            if (statusEl) statusEl.textContent = '';
            if (resultEl) resultEl.textContent = '';
            if (progress) progress.style.display = 'none';
            if (fill) fill.style.width = '0%';
          };

          const formatSize = (bytes) => {
            const mb = bytes / (1024*1024);
            return `${mb.toFixed(2)} MB`;
          };

          const validateFile = (file) => {
            if (!file) return { ok: false, msg: 'Velg en fil å importere.' };
            const nameOk = /\.(csv|json)$/i.test(file.name);
            if (!nameOk) return { ok: false, msg: 'Ugyldig filtype. Velg CSV eller JSON.' };
            const sizeOk = file.size <= MAX_MB * 1024 * 1024;
            if (!sizeOk) return { ok: false, msg: `Filen er for stor (${formatSize(file.size)}). Maks ${MAX_MB} MB.` };
            return { ok: true };
          };

          fileInput.addEventListener('change', () => {
            resetState();
            const file = fileInput.files?.[0];
            const v = validateFile(file);
            uploadBtn.disabled = !v.ok;
            if (statusEl) statusEl.textContent = v.ok
              ? `Klar: ${file.name} (${formatSize(file.size)})`
              : v.msg;
          });

          // Soft progress UI around the existing import handler
          if (!uploadBtn._boundImport) {
            uploadBtn.addEventListener('click', () => {
              const file = fileInput.files?.[0];
              const v = validateFile(file);
              if (!v.ok) {
                if (statusEl) statusEl.textContent = v.msg;
                return;
              }
              // Start visual progress
              if (progress) progress.style.display = '';
              if (fill) fill.style.width = '15%';
              if (statusEl) statusEl.textContent = 'Leser fil…';

              // Brief delay to let UI update before heavy work
              setTimeout(() => {
                if (fill) fill.style.width = '35%';
                if (statusEl) statusEl.textContent = 'Prosesserer…';
                try {
                  // Call existing import method (alerts still shown on success/error)
                  window.app.importDataFromDataTab?.();
                } catch (e) {
                  if (statusEl) statusEl.textContent = 'Feil ved oppstart av import.';
                  if (fill) fill.style.width = '0%';
                  return;
                }

                // Provide optimistic progress while FileReader works
                setTimeout(() => { if (fill) fill.style.width = '70%'; }, 300);

                // Heuristic completion indicator; underlying method will alert
                setTimeout(() => {
                  if (fill) fill.style.width = '100%';
                  if (statusEl) statusEl.textContent = 'Ferdig – oppdaterer visning…';
                  setTimeout(() => {
                    if (progress) progress.style.display = 'none';
                    if (resultEl) resultEl.textContent = 'Hvis alt gikk bra, vises importerte vakter nå i appen.';
                  }, 400);
                }, 900);
              }, 50);
            });
            uploadBtn._boundImport = true;
          }
        })();
      } catch (e) {
        console.warn('[settings-route] data init failed', e);
      }
    }
  } catch (e) {
    console.warn('[settings-route] account initializers failed', e);
  }
}
