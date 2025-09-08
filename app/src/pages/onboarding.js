// Onboarding page: renders markup from former app/onboarding.html and wires logic
// Load onboarding styles only when this route is used
import '/src/css/onboarding.css';

export function renderOnboarding() {
  return `
  <div class="onboarding-container">
    <div class="onboarding-progress"><div class="onboarding-progress-fill" id="progressFill"></div></div>

    <div class="onboarding-step active" id="step1">
      <div class="step-header">
        <div class="welcome-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </div>
        <h1 class="step-title">Velkommen!</h1>
        <p class="step-subtitle">La oss sette opp din personlige lønnskalkulator. Det tar bare noen få minutter.</p>
      </div>
      <div class="form-group">
        <label class="form-label">Fornavn</label>
        <input type="text" class="form-control" id="firstName" placeholder="F.eks. Ola" maxlength="50" required>
        <div class="form-error" id="firstNameError">Vennligst fyll inn fornavnet ditt</div>
        <div class="form-hint">Dette vises i velkomstmeldinger og rapporter</div>
      </div>
      <div class="form-group">
        <label class="form-label">Profilbilde (valgfritt)</label>
        <div class="profile-upload">
          <div class="profile-preview" id="profilePreview">
            <div class="profile-placeholder" id="profilePlaceholder">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
          </div>
          <input type="file" id="profilePicture" accept="image/*" style="display: none;">
          <button type="button" class="btn btn-secondary" onclick="document.getElementById('profilePicture').click()">Velg bilde</button>
        </div>
      </div>
    </div>

    <div class="onboarding-step" id="step2">
      <div class="step-header">
        <h1 class="step-title">Lønnstype</h1>
        <p class="step-subtitle">Velg hvordan lønnen din beregnes</p>
      </div>
      <div class="wage-type-options">
        <div class="wage-option" data-value="virke" onclick="selectWageType('virke')">
          <div class="wage-option-title">Virke-tariff</div>
          <div class="wage-option-subtitle">Lønnstrinn basert på tariffavtalen</div>
        </div>
        <div class="wage-option" data-value="custom" onclick="selectWageType('custom')">
          <div class="wage-option-title">Egen lønn</div>
          <div class="wage-option-subtitle">Egendefinert timelønn</div>
        </div>
      </div>
      <div class="form-group hidden" id="virkeWageSection">
        <label class="form-label">Lønnstrinn (Virke 2025)</label>
        <select class="form-control" id="wageSelect">
          <option value="-1">Unge arbeidstakere under 16 år (129,91 kr/t)</option>
          <option value="-2">Unge arbeidstakere under 18 år (132,90 kr/t)</option>
          <option value="1" selected>Trinn 1 (184,54 kr/t)</option>
          <option value="2">Trinn 2 (185,38 kr/t)</option>
          <option value="3">Trinn 3 (187,46 kr/t)</option>
          <option value="4">Trinn 4 (193,05 kr/t)</option>
          <option value="5">Trinn 5 (210,81 kr/t)</option>
          <option value="6">Trinn 6 (256,14 kr/t)</option>
        </select>
      </div>
      <div class="form-group hidden" id="customWageSection">
        <label class="form-label">Timelønn (kr)</label>
        <input type="number" class="form-control" id="customWageInput" placeholder="200.00" step="0.01" min="50" max="1000" required>
        <div class="form-error" id="customWageError">Vennligst fyll inn en gyldig timelønn (50-1000 kr)</div>
        <div class="form-hint">Grunnlønn per time før tillegg</div>
        <div class="advanced-section" id="supplementsSection">
          <div class="form-group">
            <label class="form-label">Ukedag-tillegg (mandag-fredag)</label>
            <div class="form-hint">Ekstra betaling for kveldsvakter og lignende</div>
            <div class="bonus-slots" id="weekdayBonusSlots"></div>
            <button type="button" class="btn-add-bonus" onclick="addBonusSlot('weekday')">+ Legg til kveldstillegg</button>
          </div>
          <div class="form-group">
            <label class="form-label">Lørdag-tillegg</label>
            <div class="form-hint">Helgetillegg for lørdager</div>
            <div class="bonus-slots" id="saturdayBonusSlots"></div>
            <button type="button" class="btn-add-bonus" onclick="addBonusSlot('saturday')">+ Legg til lørdagstillegg</button>
          </div>
          <div class="form-group">
            <label class="form-label">Søndag/helligdag-tillegg</label>
            <div class="form-hint">Høyeste tillegg for søndager og helligdager</div>
            <div class="bonus-slots" id="sundayBonusSlots"></div>
            <button type="button" class="btn-add-bonus" onclick="addBonusSlot('sunday')">+ Legg til søndagstillegg</button>
          </div>
        </div>
      </div>
    </div>

    <div class="onboarding-step" id="step3">
      <div class="step-header">
        <h1 class="step-title">Pauseinnstillinger</h1>
        <p class="step-subtitle">Hvordan skal pausetid håndteres i lønnsberegningen?</p>
      </div>
      <div class="switch-group">
        <div>
          <div style="font-weight: var(--font-weight-medium); color: var(--text-primary);">Betalt pause</div>
          <div style="font-size: var(--text-sm); color: var(--text-secondary); margin-top: 4px;">Alle timer betales, inkludert pausetid</div>
        </div>
        <label class="switch">
          <input type="checkbox" id="paidBreakToggle" onchange="togglePaidBreak()">
          <span class="slider"></span>
        </label>
      </div>
      <div class="advanced-section" id="breakAdvancedSection">
        <div class="advanced-toggle" onclick="toggleAdvancedBreaks()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
          Avanserte innstillinger
        </div>
        <div class="hidden" id="breakAdvancedContent">
          <div class="form-group">
            <label class="form-label">Pausetrekk-terskel (timer)</label>
            <input type="number" class="form-control" id="pauseThreshold" value="5.5" step="0.5" min="0" max="24">
            <div class="form-hint">Minimum vaktlengde for å utløse pausetrekk</div>
          </div>
          <div class="form-group">
            <label class="form-label">Pausetrekk (minutter)</label>
            <input type="number" class="form-control" id="pauseDuration" value="30" step="15" min="0" max="120">
            <div class="form-hint">Antall minutter som trekkes fra</div>
          </div>
        </div>
      </div>
    </div>

    <div class="onboarding-step" id="step4">
      <div class="step-header">
        <h1 class="step-title">Månedlig mål</h1>
        <p class="step-subtitle">Sett et inntektsmål for å følge fremdriften din</p>
      </div>
      <div class="form-group">
        <label class="form-label">Månedlig inntektsmål (NOK)</label>
        <input type="number" class="form-control" id="monthlyGoal" placeholder="20 000" step="1000" min="1000" max="200000">
        <div class="form-hint">Brukes til fremdriftslinjen i dashbordet og måloppfølging (valgfritt)</div>
      </div>
    </div>

    <div class="onboarding-step" id="step5">
      <div class="step-header">
        <h1 class="step-title">Skatt og lønningsdag</h1>
        <p class="step-subtitle">Konfigurer skattetrekk og når du får utbetalt lønn</p>
      </div>
      <div class="switch-group">
        <div>
          <div style="font-weight: var(--font-weight-medium); color: var(--text-primary);">Trekk skatt</div>
          <div style="font-size: var(--text-sm); color: var(--text-secondary); margin-top: 4px;">Viser netto lønn etter skattetrekk</div>
        </div>
        <label class="switch">
          <input type="checkbox" id="taxDeductionToggle" onchange="toggleTaxDeduction()">
          <span class="slider"></span>
        </label>
      </div>
      <div class="form-group hidden" id="taxPercentageSection">
        <label class="form-label">Skattetrekk (%)</label>
        <input type="number" class="form-control" id="taxPercentage" placeholder="25" min="0" max="60" step="0.1">
        <div class="form-hint">Typisk skattetrekk er 20-35% avhengig av inntekt</div>
      </div>
      <div class="form-group">
        <label class="form-label">Lønningsdag (valgfritt)</label>
        <input type="number" class="form-control" id="payrollDay" placeholder="15" min="1" max="31">
        <div class="form-hint">Hvilken dag i måneden du får utbetalt lønn (1-31)</div>
      </div>
    </div>

    <div class="onboarding-step" id="step6">
      <div class="step-header">
        <h1 class="step-title">Velg tema</h1>
        <p class="step-subtitle">Tilpass utseendet til dine preferanser</p>
      </div>
      <div class="theme-options">
        <label class="theme-option">
          <input type="radio" name="theme" value="light" onchange="previewTheme('light')">
          <div class="theme-preview theme-preview-light"><div class="theme-preview-header"></div><div class="theme-preview-content"></div></div>
          <span>Lyst</span>
        </label>
        <label class="theme-option">
          <input type="radio" name="theme" value="dark" onchange="previewTheme('dark')">
          <div class="theme-preview theme-preview-dark"><div class="theme-preview-header"></div><div class="theme-preview-content"></div></div>
          <span>Mørkt</span>
        </label>
        <label class="theme-option">
          <input type="radio" name="theme" value="system" checked onchange="previewTheme('system')">
          <div class="theme-preview theme-preview-system"><div class="theme-preview-header"></div><div class="theme-preview-content"></div></div>
          <span>System</span>
        </label>
      </div>
    </div>

    <div class="onboarding-step" id="step7">
      <div class="step-header">
        <div class="completion-icon">
          <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <h1 class="step-title">Alt klart!</h1>
        <p class="step-subtitle">Lønnsberegeneren din er nå konfigurert og klar til bruk. Velkommen ombord!</p>
      </div>
      <div class="info-box"><div class="info-content"><strong>Hva skjer nå?</strong><br>Du blir sendt til dashbordet hvor du kan begynne å registrere vakter og følge med på inntektene dine.</div></div>
    </div>

    <div class="onboarding-nav">
      <button type="button" class="btn btn-secondary" id="backBtn" onclick="previousStep()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        Tilbake
      </button>
      <a href="#" class="skip-link" id="skipLink" onclick="skipStep()">Hopp over</a>
      <button type="button" class="btn btn-primary" id="nextBtn" onclick="nextStep()">Neste <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"></polyline></svg></button>
    </div>
  </div>`;
}

export async function afterMountOnboarding() {
  const supabase = window.supa;
  if (!supabase) {
    console.error('Supabase client not available');
    return;
  }

  let currentStep = 1;
  const totalSteps = 7;
  let onboardingData = {};
  let user = null;

  async function initOnboarding() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      if (window.__navigate) window.__navigate('/login'); else window.location.href = '/login';
      return;
    }
    user = session.user;
    if (user.user_metadata?.finishedOnboarding) {
      if (window.__navigate) window.__navigate('/'); else window.location.href = '/';
      return;
    }
    await loadExistingSettings();
    updateProgress();
    updateNavigationButtons();
  }

  async function loadExistingSettings() {
    try {
      const { data: settings, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') {
        console.error('Error loading existing settings:', error);
        return;
      }
      if (user.user_metadata?.first_name) {
        const el = document.getElementById('firstName');
        if (el) el.value = user.user_metadata.first_name;
      }
      if (settings?.profile_picture_url || user.user_metadata?.avatar_url) {
        setProfilePicture(settings?.profile_picture_url || user.user_metadata.avatar_url);
      }
      if (settings?.use_preset !== undefined) {
        if (settings.use_preset) {
          selectWageType('virke');
          if (settings.current_wage_level) {
            const sel = document.getElementById('wageSelect');
            if (sel) sel.value = settings.current_wage_level;
          }
        } else {
          selectWageType('custom');
          if (settings.custom_wage) {
            const inp = document.getElementById('customWageInput');
            if (inp) inp.value = settings.custom_wage;
          }
          if (settings.custom_bonuses) {
            prefillCustomBonuses(settings.custom_bonuses);
          }
        }
      }
      if (settings?.pause_deduction_method === 'none') {
        const toggle = document.getElementById('paidBreakToggle');
        if (toggle) toggle.checked = true;
        togglePaidBreak();
      } else {
        const toggle = document.getElementById('paidBreakToggle');
        if (toggle) toggle.checked = false;
        if (settings?.pause_threshold_hours) {
          const el = document.getElementById('pauseThreshold');
          if (el) el.value = settings.pause_threshold_hours;
        }
        if (settings?.pause_deduction_minutes) {
          const el = document.getElementById('pauseDuration');
          if (el) el.value = settings.pause_deduction_minutes;
        }
      }
      if (settings?.monthly_goal) {
        const el = document.getElementById('monthlyGoal');
        if (el) el.value = settings.monthly_goal;
      }
      if (settings?.tax_deduction_enabled) {
        const t = document.getElementById('taxDeductionToggle');
        if (t) t.checked = true;
        toggleTaxDeduction();
        if (settings.tax_percentage) {
          const el = document.getElementById('taxPercentage');
          if (el) el.value = settings.tax_percentage;
        }
      }
      if (settings?.payroll_day) {
        const el = document.getElementById('payrollDay');
        if (el) el.value = settings.payroll_day;
      }
      if (settings?.theme) {
        const themeRadio = document.querySelector(`input[name="theme"][value="${settings.theme}"]`);
        if (themeRadio) {
          themeRadio.checked = true;
          previewTheme(settings.theme);
        }
      }
    } catch (error) {
      console.error('Error loading existing settings:', error);
    }
  }

  function prefillCustomBonuses(customBonuses) {
    if (!customBonuses || typeof customBonuses !== 'object') return;
    ['weekday', 'saturday', 'sunday'].forEach(type => {
      const bonuses = customBonuses[type];
      if (Array.isArray(bonuses) && bonuses.length > 0) {
        bonuses.forEach(bonus => {
          if (bonus.from && bonus.to && bonus.rate) {
            addBonusSlot(type);
            const container = document.getElementById(`${type}BonusSlots`);
            const lastSlot = container.lastElementChild;
            if (lastSlot) {
              const inputs = lastSlot.querySelectorAll('input');
              if (inputs.length >= 3) {
                inputs[0].value = bonus.from;
                inputs[1].value = bonus.to;
                inputs[2].value = bonus.rate;
              }
            }
          }
        });
      }
    });
  }

  function updateProgress() {
    const progressPercent = (currentStep / totalSteps) * 100;
    const el = document.getElementById('progressFill');
    if (el) el.style.width = progressPercent + '%';
  }

  function updateNavigationButtons() {
    const backBtn = document.getElementById('backBtn');
    const nextBtn = document.getElementById('nextBtn');
    const skipLink = document.getElementById('skipLink');
    if (backBtn) backBtn.style.display = currentStep === 1 ? 'none' : 'flex';
    if (nextBtn && skipLink) {
      if (currentStep === totalSteps) {
        nextBtn.textContent = 'Gå til dashboard';
        nextBtn.innerHTML = 'Gå til dashboard <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"></polyline></svg>';
        skipLink.style.display = 'none';
      } else {
        nextBtn.innerHTML = 'Neste <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"></polyline></svg>';
        skipLink.style.display = (currentStep === 4 || currentStep === 5) ? 'inline' : 'none';
      }
    }
  }

  window.nextStep = async function() {
    if (!validateCurrentStep()) return;
    await saveCurrentStepData();
    if (currentStep === totalSteps) { await completeOnboarding(); return; }
    const cur = document.getElementById(`step${currentStep}`);
    if (cur) cur.classList.add('slide-out-left');
    setTimeout(() => {
      if (cur) cur.classList.remove('active', 'slide-out-left');
      currentStep++;
      const next = document.getElementById(`step${currentStep}`);
      if (next) next.classList.add('active');
      updateProgress();
      updateNavigationButtons();
    }, 300);
  };

  window.previousStep = function() {
    if (currentStep === 1) return;
    const cur = document.getElementById(`step${currentStep}`);
    if (cur) cur.classList.add('slide-out-right');
    setTimeout(() => {
      if (cur) cur.classList.remove('active', 'slide-out-right');
      currentStep--;
      const prev = document.getElementById(`step${currentStep}`);
      if (prev) prev.classList.add('active');
      updateProgress();
      updateNavigationButtons();
    }, 300);
  };

  window.skipStep = function() {
    if (currentStep === 4 || currentStep === 5) nextStep();
  };

  function validateCurrentStep() {
    document.querySelectorAll('.form-control.error').forEach(el => el.classList.remove('error'));
    document.querySelectorAll('.form-error.show').forEach(el => el.classList.remove('show'));
    switch (currentStep) {
      case 1: {
        const firstNameEl = document.getElementById('firstName');
        const firstName = (firstNameEl?.value || '').trim();
        if (!firstName) {
          // Fallback to metadata if input hasn't populated yet but user has a saved name
          const metaName = (user && user.user_metadata && typeof user.user_metadata.first_name === 'string')
            ? user.user_metadata.first_name.trim()
            : '';
          if (metaName) {
            if (firstNameEl) firstNameEl.value = metaName;
            // Allow progression; saveCurrentStepData will pick up the value
            break;
          }
          showFieldError('firstName', 'firstNameError');
          return false;
        }
        break; }
      case 2: {
        const selectedWageType = document.querySelector('.wage-option.selected');
        if (!selectedWageType) { alert('Vennligst velg en lønnstype'); return false; }
        if (selectedWageType.dataset.value === 'custom') {
          const customWage = document.getElementById('customWageInput').value;
          if (!customWage || parseFloat(customWage) < 50 || parseFloat(customWage) > 1000) {
            showFieldError('customWageInput', 'customWageError');
            return false;
          }
        }
        break; }
    }
    return true;
  }

  function showFieldError(fieldId, errorId) {
    const field = document.getElementById(fieldId);
    const error = document.getElementById(errorId);
    if (field) field.classList.add('error');
    if (error) error.classList.add('show');
    if (field) field.focus();
  }

  async function saveCurrentStepData() {
    switch (currentStep) {
      case 1:
        onboardingData.first_name = document.getElementById('firstName').value.trim();
        break;
      case 2: {
        const selectedWageType = document.querySelector('.wage-option.selected');
        if (selectedWageType?.dataset.value === 'virke') {
          onboardingData.use_preset = true;
          onboardingData.current_wage_level = parseInt(document.getElementById('wageSelect').value);
          onboardingData.custom_wage = null;
          onboardingData.custom_bonuses = { weekday: [], saturday: [], sunday: [] };
        } else {
          onboardingData.use_preset = false;
          onboardingData.custom_wage = parseFloat(document.getElementById('customWageInput').value);
          onboardingData.current_wage_level = null;
          onboardingData.custom_bonuses = collectCustomBonuses();
        }
        break; }
      case 3: {
        const paidBreak = document.getElementById('paidBreakToggle').checked;
        onboardingData.pause_deduction_method = paidBreak ? 'none' : 'proportional';
        if (!paidBreak) {
          onboardingData.pause_threshold_hours = parseFloat(document.getElementById('pauseThreshold').value) || 5.5;
          onboardingData.pause_deduction_minutes = parseInt(document.getElementById('pauseDuration').value) || 30;
        }
        break; }
      case 4: {
        const monthlyGoal = document.getElementById('monthlyGoal').value;
        onboardingData.monthly_goal = monthlyGoal ? parseInt(monthlyGoal) : null;
        break; }
      case 5: {
        onboardingData.tax_deduction_enabled = document.getElementById('taxDeductionToggle').checked;
        if (onboardingData.tax_deduction_enabled) {
          onboardingData.tax_percentage = parseFloat(document.getElementById('taxPercentage').value) || 25;
        }
        const payrollDay = document.getElementById('payrollDay').value;
        onboardingData.payroll_day = payrollDay ? parseInt(payrollDay) : null;
        break; }
      case 6: {
        const selectedTheme = document.querySelector('input[name="theme"]:checked').value;
        onboardingData.theme = selectedTheme;
        break; }
    }
  }

  async function completeOnboarding() {
    try {
      const settingsData = {
        user_id: user.id,
        use_preset: onboardingData.use_preset !== undefined ? onboardingData.use_preset : true,
        custom_wage: onboardingData.custom_wage,
        current_wage_level: onboardingData.current_wage_level,
        pause_deduction_method: onboardingData.pause_deduction_method || 'proportional',
        pause_threshold_hours: onboardingData.pause_threshold_hours || 5.5,
        pause_deduction_minutes: onboardingData.pause_deduction_minutes || 30,
        monthly_goal: onboardingData.monthly_goal,
        theme: onboardingData.theme || 'system',
        tax_deduction_enabled: onboardingData.tax_deduction_enabled || false,
        tax_percentage: onboardingData.tax_percentage,
        payroll_day: onboardingData.payroll_day,
        profile_picture_url: onboardingData.profile_picture_url,
        custom_bonuses: onboardingData.custom_bonuses || { weekday: [], saturday: [], sunday: [] }
      };
      Object.keys(settingsData).forEach(key => {
        if (settingsData[key] === null || settingsData[key] === undefined || settingsData[key] === '') {
          delete settingsData[key];
        }
      });
      if (settingsData.monthly_goal === undefined || settingsData.monthly_goal === '') settingsData.monthly_goal = null;
      if (settingsData.payroll_day === undefined || settingsData.payroll_day === '') settingsData.payroll_day = null;
      if (typeof settingsData.profile_picture_url === 'string' && settingsData.profile_picture_url.startsWith('data:')) {
        console.warn('[onboarding] stripping inline profile picture data URL before save');
        delete settingsData.profile_picture_url;
      }
      const { error: settingsError } = await supabase.from('user_settings').upsert(settingsData, { onConflict: 'user_id' });
      if (settingsError) { console.error('Error saving settings:', settingsError); throw settingsError; }

      const metadataUpdate = { finishedOnboarding: true };
      if (onboardingData.first_name) metadataUpdate.first_name = onboardingData.first_name;
      const { error: metadataError } = await supabase.auth.updateUser({ data: metadataUpdate });
      if (metadataError) { console.error('Error updating user metadata:', metadataError); throw metadataError; }

      // Hard reload to boot the main app cleanly
      window.location.replace('index.html');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      alert('Det oppstod en feil ved lagring av innstillingene. Prøv igjen.');
    }
  }

  // UI helpers
  window.selectWageType = function(type) {
    document.querySelectorAll('.wage-option').forEach(el => el.classList.remove('selected'));
    const opt = document.querySelector(`[data-value="${type}"]`);
    if (opt) opt.classList.add('selected');
    const virke = document.getElementById('virkeWageSection');
    const custom = document.getElementById('customWageSection');
    if (type === 'virke') { if (virke) virke.classList.remove('hidden'); if (custom) custom.classList.add('hidden'); }
    else { if (virke) virke.classList.add('hidden'); if (custom) custom.classList.remove('hidden'); }
  };

  document.getElementById('profilePicture')?.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(ev) { setProfilePreview(ev.target.result); };
      reader.readAsDataURL(file);
      try {
        const publicUrl = await uploadProfilePictureToStorage(file);
        if (publicUrl) { onboardingData.profile_picture_url = publicUrl; }
      } catch (err) { console.error('Failed to upload profile picture:', err); }
    }
  });

  function setProfilePreview(url) {
    const preview = document.getElementById('profilePreview');
    if (preview) preview.innerHTML = `<img src="${url}" alt="Profilbilde">`;
  }
  function setProfilePicture(url) { setProfilePreview(url); onboardingData.profile_picture_url = url; }

  async function uploadProfilePictureToStorage(file) {
    if (!user?.id) throw new Error('No user ID available');
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/onboarding_${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('profile-pictures').upload(fileName, file, { contentType: file.type, upsert: true });
    if (uploadError) throw uploadError;
    const { data: publicData } = supabase.storage.from('profile-pictures').getPublicUrl(fileName);
    if (publicData?.publicUrl) return publicData.publicUrl;
    throw new Error('Failed to get public URL');
  }

  window.togglePaidBreak = function() {
    const isChecked = document.getElementById('paidBreakToggle').checked;
    const advancedSection = document.getElementById('breakAdvancedSection');
    if (advancedSection) advancedSection.style.display = isChecked ? 'none' : 'block';
  };

  window.toggleAdvancedBreaks = function() {
    const content = document.getElementById('breakAdvancedContent');
    const toggle = document.querySelector('.advanced-toggle svg');
    if (!content || !toggle) return;
    if (content.classList.contains('hidden')) { content.classList.remove('hidden'); content.classList.add('fade-in'); toggle.style.transform = 'rotate(90deg)'; }
    else { content.classList.add('hidden'); content.classList.remove('fade-in'); toggle.style.transform = 'rotate(0deg)'; }
  };

  window.toggleTaxDeduction = function() {
    const isChecked = document.getElementById('taxDeductionToggle').checked;
    const taxSection = document.getElementById('taxPercentageSection');
    if (!taxSection) return;
    if (isChecked) { taxSection.classList.remove('hidden'); taxSection.classList.add('fade-in'); }
    else { taxSection.classList.add('hidden'); taxSection.classList.remove('fade-in'); }
  };

  window.previewTheme = function(theme) {
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.className = prefersDark ? 'theme-dark' : 'theme-light';
    } else { document.documentElement.className = `theme-${theme}`; }
  };

  window.addBonusSlot = function(type) {
    const container = document.getElementById(`${type}BonusSlots`);
    if (!container) return;
    const existingSlots = container.querySelectorAll('.bonus-slot');
    if (existingSlots.length >= 10) return;
    let defaultFrom, defaultTo, defaultAmount, placeholder;
    switch (type) {
      case 'weekday': defaultFrom = '18:00'; defaultTo = '22:00'; placeholder = '25.00'; defaultAmount = 25; break;
      case 'saturday': defaultFrom = '00:00'; defaultTo = '23:59'; placeholder = '50.00'; defaultAmount = 50; break;
      case 'sunday': defaultFrom = '00:00'; defaultTo = '23:59'; placeholder = '100.00'; defaultAmount = 100; break;
    }
    const slotHtml = `
      <div class="bonus-slot">
        <div class="bonus-slot-field">
          <label class="bonus-slot-label">Fra tid</label>
          <input type="time" value="${defaultFrom}" required>
        </div>
        <div class="bonus-slot-field">
          <label class="bonus-slot-label">Til tid</label>
          <input type="time" value="${defaultTo}" required>
        </div>
        <div class="bonus-slot-field">
          <label class="bonus-slot-label">Tillegg (kr/t)</label>
          <input type="number" placeholder="${placeholder}" value="${defaultAmount}" step="0.01" min="0" max="500" required>
        </div>
        <button type="button" class="remove-bonus-btn" onclick="this.parentElement.remove()" title="Fjern tillegg">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>`;
    container.insertAdjacentHTML('beforeend', slotHtml);
  };

  await initOnboarding();
}
