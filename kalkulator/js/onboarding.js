// Onboarding module: moved from inline script to satisfy CSP (no unsafe-inline)
export const show = (el) => el && el.classList.remove('hidden');
export const hide = (el) => el && el.classList.add('hidden');
export const toggleHidden = (el, on) => el && el.classList[on ? 'add' : 'remove']('hidden');
// Uses globally available Supabase client from bootstrap-supa.js

const supabase = window.supa;

let currentStep = 1;
const totalSteps = 7;
let onboardingData = {};
let user = null;

// Initialize onboarding
async function initOnboarding() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = '/kalkulator/login.html';
    return;
  }

  user = session.user;

  // Already onboarded? redirect
  if (user.user_metadata?.finishedOnboarding) {
    window.location.href = '/kalkulator/index.html';
    return;
  }

  await loadExistingSettings();

  // Wire events previously in inline handlers
  wireEventHandlers();

  updateProgress();
  updateNavigationButtons();
}

function wireEventHandlers() {
  // Navigation
  const backBtn = document.getElementById('backBtn');
  const nextBtn = document.getElementById('nextBtn');
  const skipLink = document.getElementById('skipLink');
  if (backBtn) backBtn.addEventListener('click', previousStep);
  if (nextBtn) nextBtn.addEventListener('click', nextStep);
  if (skipLink) skipLink.addEventListener('click', (e) => { e.preventDefault(); skipStep(); });

  // Wage options
  document.querySelectorAll('.wage-option').forEach(el => {
    el.addEventListener('click', () => selectWageType(el.dataset.value));
  });

  // Bonus add buttons
  const addWeekday = document.getElementById('addWeekdayBonus');
  const addSaturday = document.getElementById('addSaturdayBonus');
  const addSunday = document.getElementById('addSundayBonus');
  if (addWeekday) addWeekday.addEventListener('click', () => addBonusSlot('weekday'));
  if (addSaturday) addSaturday.addEventListener('click', () => addBonusSlot('saturday'));
  if (addSunday) addSunday.addEventListener('click', () => addBonusSlot('sunday'));

  // Delegated remove for bonus slots
  ['weekdayBonusSlots', 'saturdayBonusSlots', 'sundayBonusSlots'].forEach(id => {
    const container = document.getElementById(id);
    if (container) {
      container.addEventListener('click', (e) => {
        const btn = e.target.closest('.remove-bonus-btn');
        if (btn && container.contains(btn)) {
          e.preventDefault();
          const slot = btn.closest('.bonus-slot');
          if (slot) slot.remove();
        }
      });
    }
  });

  // Breaks
  const paidBreakToggle = document.getElementById('paidBreakToggle');
  const advToggle = document.getElementById('advancedBreaksToggle');
  if (paidBreakToggle) paidBreakToggle.addEventListener('change', togglePaidBreak);
  if (advToggle) advToggle.addEventListener('click', toggleAdvancedBreaks);

  // Tax
  const taxToggle = document.getElementById('taxDeductionToggle');
  if (taxToggle) taxToggle.addEventListener('change', toggleTaxDeduction);

  // Theme radios
  document.querySelectorAll('input[name="theme"]').forEach(r => {
    r.addEventListener('change', (e) => previewTheme(e.target.value));
  });

  // Profile picture
  const uploadBtn = document.getElementById('uploadProfileButton');
  const fileInput = document.getElementById('profilePicture');
  if (uploadBtn && fileInput) {
    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', onProfileFileChange);
  }
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

    // Step 1: Name and profile picture
    if (user.user_metadata?.first_name) {
      document.getElementById('firstName').value = user.user_metadata.first_name;
    }
    if (settings?.profile_picture_url || user.user_metadata?.avatar_url) {
      setProfilePicture(settings?.profile_picture_url || user.user_metadata.avatar_url);
    }

    // Step 2: Wage settings
    if (settings?.use_preset !== undefined) {
      if (settings.use_preset) {
        selectWageType('virke');
        if (settings.current_wage_level) {
          document.getElementById('wageSelect').value = settings.current_wage_level;
        }
      } else {
        selectWageType('custom');
        if (settings.custom_wage) {
          document.getElementById('customWageInput').value = settings.custom_wage;
        }
        if (settings.custom_bonuses) {
          prefillCustomBonuses(settings.custom_bonuses);
        }
      }
    }

    // Step 3: Break settings
    if (settings?.pause_deduction_method === 'none') {
      document.getElementById('paidBreakToggle').checked = true;
      togglePaidBreak();
    } else {
      document.getElementById('paidBreakToggle').checked = false;
      if (settings?.pause_threshold_hours) {
        document.getElementById('pauseThreshold').value = settings.pause_threshold_hours;
      }
      if (settings?.pause_deduction_minutes) {
        document.getElementById('pauseDuration').value = settings.pause_deduction_minutes;
      }
    }

    // Step 4: Monthly goal
    if (settings?.monthly_goal) {
      document.getElementById('monthlyGoal').value = settings.monthly_goal;
    }

    // Step 5: Tax and payday settings
    if (settings?.tax_deduction_enabled) {
      document.getElementById('taxDeductionToggle').checked = true;
      toggleTaxDeduction();
      if (settings.tax_percentage) {
        document.getElementById('taxPercentage').value = settings.tax_percentage;
      }
    }
    if (settings?.payroll_day) {
      document.getElementById('payrollDay').value = settings.payroll_day;
    }

    // Step 6: Theme
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
  document.getElementById('progressFill').style.width = progressPercent + '%';
}

function updateNavigationButtons() {
  const backBtn = document.getElementById('backBtn');
  const nextBtn = document.getElementById('nextBtn');
  const skipLink = document.getElementById('skipLink');
  if (backBtn) toggleHidden(backBtn, currentStep === 1);
  if (currentStep === totalSteps) {
    if (nextBtn) nextBtn.innerHTML = 'Gå til dashboard <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"></polyline></svg>';
    if (skipLink) hide(skipLink);
  } else {
    if (nextBtn) nextBtn.innerHTML = 'Neste <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"></polyline></svg>';
    if (skipLink) toggleHidden(skipLink, !(currentStep === 4 || currentStep === 5));
  }
}

async function nextStep() {
  if (!validateCurrentStep()) return;
  await saveCurrentStepData();
  if (currentStep === totalSteps) {
    await completeOnboarding();
    return;
  }
  const currentStepEl = document.getElementById(`step${currentStep}`);
  currentStepEl.classList.add('slide-out-left');
  setTimeout(() => {
    currentStepEl.classList.remove('active', 'slide-out-left');
    currentStep++;
    const nextStepEl = document.getElementById(`step${currentStep}`);
    nextStepEl.classList.add('active');
    updateProgress();
    updateNavigationButtons();
  }, 300);
}

function previousStep() {
  if (currentStep === 1) return;
  const currentStepEl = document.getElementById(`step${currentStep}`);
  currentStepEl.classList.add('slide-out-right');
  setTimeout(() => {
    currentStepEl.classList.remove('active', 'slide-out-right');
    currentStep--;
    const prevStepEl = document.getElementById(`step${currentStep}`);
    prevStepEl.classList.add('active');
    updateProgress();
    updateNavigationButtons();
  }, 300);
}

function skipStep() {
  if (currentStep === 4 || currentStep === 5) {
    nextStep();
  }
}

function validateCurrentStep() {
  document.querySelectorAll('.form-control.error').forEach(el => el.classList.remove('error'));
  document.querySelectorAll('.form-error.show').forEach(el => el.classList.remove('show'));
  switch (currentStep) {
    case 1: {
      const firstName = document.getElementById('firstName').value.trim();
      if (!firstName) { showFieldError('firstName', 'firstNameError'); return false; }
      break;
    }
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
      break;
    }
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
      break;
    }
    case 3: {
      const paidBreak = document.getElementById('paidBreakToggle').checked;
      onboardingData.pause_deduction_method = paidBreak ? 'none' : 'proportional';
      if (!paidBreak) {
        onboardingData.pause_threshold_hours = parseFloat(document.getElementById('pauseThreshold').value) || 5.5;
        onboardingData.pause_deduction_minutes = parseInt(document.getElementById('pauseDuration').value) || 30;
      }
      break;
    }
    case 4: {
      const monthlyGoal = document.getElementById('monthlyGoal').value;
      onboardingData.monthly_goal = monthlyGoal ? parseInt(monthlyGoal) : null;
      break;
    }
    case 5: {
      onboardingData.tax_deduction_enabled = document.getElementById('taxDeductionToggle').checked;
      if (onboardingData.tax_deduction_enabled) {
        onboardingData.tax_percentage = parseFloat(document.getElementById('taxPercentage').value) || 25;
      }
      const payrollDay = document.getElementById('payrollDay').value;
      onboardingData.payroll_day = payrollDay ? parseInt(payrollDay) : null;
      break;
    }
    case 6: {
      const selectedTheme = document.querySelector('input[name="theme"]:checked').value;
      onboardingData.theme = selectedTheme;
      break;
    }
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
    if (settingsData.monthly_goal === undefined || settingsData.monthly_goal === '') {
      settingsData.monthly_goal = null;
    }
    if (settingsData.payroll_day === undefined || settingsData.payroll_day === '') {
      settingsData.payroll_day = null;
    }
    if (typeof settingsData.profile_picture_url === 'string' && settingsData.profile_picture_url.startsWith('data:')) {
      console.warn('[onboarding] stripping inline profile picture data URL before save');
      delete settingsData.profile_picture_url;
    }

    const { error: settingsError } = await supabase
      .from('user_settings')
      .upsert(settingsData, { onConflict: 'user_id' });
    if (settingsError) throw settingsError;

    const metadataUpdate = { finishedOnboarding: true };
    if (onboardingData.first_name) metadataUpdate.first_name = onboardingData.first_name;
    const { error: metadataError } = await supabase.auth.updateUser({ data: metadataUpdate });
    if (metadataError) throw metadataError;

    window.location.href = '/kalkulator/index.html';
  } catch (error) {
    console.error('Error completing onboarding:', error);
    alert('Det oppstod en feil ved lagring av innstillingene. Prøv igjen.');
  }
}

function selectWageType(type) {
  document.querySelectorAll('.wage-option').forEach(el => el.classList.remove('selected'));
  const target = document.querySelector(`[data-value="${type}"]`);
  if (target) target.classList.add('selected');
  const virkeSection = document.getElementById('virkeWageSection');
  const customSection = document.getElementById('customWageSection');
  if (type === 'virke') {
    virkeSection.classList.remove('hidden');
    customSection.classList.add('hidden');
  } else {
    virkeSection.classList.add('hidden');
    customSection.classList.remove('hidden');
  }
}

async function onProfileFileChange(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) { setProfilePreview(ev.target.result); };
  reader.readAsDataURL(file);
  try {
    const publicUrl = await uploadProfilePictureToStorage(file);
    if (publicUrl) onboardingData.profile_picture_url = publicUrl;
  } catch (err) {
    console.error('Failed to upload profile picture:', err);
  }
}

function setProfilePreview(url) {
  const preview = document.getElementById('profilePreview');
  preview.innerHTML = `<img src="${url}" alt="Profilbilde">`;
}

function setProfilePicture(url) {
  setProfilePreview(url);
  onboardingData.profile_picture_url = url;
}

async function uploadProfilePictureToStorage(file) {
  if (!user?.id) throw new Error('No user ID available');
  const fileExt = file.name.split('.').pop();
  const fileName = `${user.id}/onboarding_${Date.now()}.${fileExt}`;
  const { error: uploadError } = await supabase.storage
    .from('profile-pictures')
    .upload(fileName, file, { contentType: file.type, upsert: true });
  if (uploadError) throw uploadError;
  const { data: publicData } = supabase.storage.from('profile-pictures').getPublicUrl(fileName);
  if (publicData?.publicUrl) return publicData.publicUrl;
  throw new Error('Failed to get public URL');
}

function togglePaidBreak() {
  const isChecked = document.getElementById('paidBreakToggle').checked;
  const advancedSection = document.getElementById('breakAdvancedSection');
  toggleHidden(advancedSection, isChecked);
}

function toggleAdvancedBreaks() {
  const content = document.getElementById('breakAdvancedContent');
  const toggle = document.querySelector('.advanced-toggle svg');
  if (content.classList.contains('hidden')) {
    content.classList.remove('hidden');
    content.classList.add('fade-in');
    if (toggle) toggle.style.transform = 'rotate(90deg)';
  } else {
    content.classList.add('hidden');
    content.classList.remove('fade-in');
    if (toggle) toggle.style.transform = 'rotate(0deg)';
  }
}

function toggleTaxDeduction() {
  const isChecked = document.getElementById('taxDeductionToggle').checked;
  const taxSection = document.getElementById('taxPercentageSection');
  if (isChecked) {
    taxSection.classList.remove('hidden');
    taxSection.classList.add('fade-in');
  } else {
    taxSection.classList.add('hidden');
    taxSection.classList.remove('fade-in');
  }
}

function previewTheme(theme) {
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.className = prefersDark ? 'theme-dark' : 'theme-light';
  } else {
    document.documentElement.className = `theme-${theme}`;
  }
}

function addBonusSlot(type) {
  const container = document.getElementById(`${type}BonusSlots`);
  if (!container) return;
  const existingSlots = container.querySelectorAll('.bonus-slot');
  if (existingSlots.length >= 10) return;
  let defaultFrom, defaultTo, defaultAmount, placeholder;
  switch (type) {
    case 'weekday':
      defaultFrom = '18:00'; defaultTo = '22:00'; placeholder = '25.00'; defaultAmount = 25; break;
    case 'saturday':
      defaultFrom = '00:00'; defaultTo = '23:59'; placeholder = '50.00'; defaultAmount = 50; break;
    case 'sunday':
      defaultFrom = '00:00'; defaultTo = '23:59'; placeholder = '100.00'; defaultAmount = 100; break;
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
      <button type="button" class="remove-bonus-btn" title="Fjern tillegg">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>`;
  container.insertAdjacentHTML('beforeend', slotHtml);
}

function collectCustomBonuses() {
  const bonuses = { weekday: [], saturday: [], sunday: [] };
  ['weekday', 'saturday', 'sunday'].forEach(type => {
    const slots = document.querySelectorAll(`#${type}BonusSlots .bonus-slot`);
    slots.forEach(slot => {
      const inputs = slot.querySelectorAll('input');
      const from = inputs[0].value;
      const to = inputs[1].value;
      const rate = parseFloat(inputs[2].value);
      if (from && to && rate) bonuses[type].push({ from, to, rate });
    });
  });
  return bonuses;
}

document.addEventListener('DOMContentLoaded', initOnboarding);
