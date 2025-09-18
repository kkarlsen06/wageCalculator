import './editor.css';
import { supabase } from '../../supabase-client.js';
import { getUserId } from '../../lib/auth/getUserId.js';
import { normalizeUb } from '../../lib/ubNormalize.js';
import { DAYS, normalizeDays } from './days.js';
import { createDayPill } from './day-pill.js';
import { formatDayPills, sortRules, mutuallyExclusive } from './utils.js';

function timeStringToMinutes(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function cloneRules(rules) {
  return rules.map(rule => ({
    days: normalizeDays(rule.days),
    from: rule.from,
    to: rule.to,
    ...(rule.rate !== undefined ? { rate: rule.rate } : {}),
    ...(rule.percent !== undefined ? { percent: rule.percent } : {}),
  }));
}

class CustomBonusEditor {
  constructor(root) {
    this.root = root;
    this.rules = [];
    this.userId = null;
    this.persistTarget = null;
    this.loadingEl = null;
    this.listEl = null;
    this.emptyEl = null;
    this.addButton = null;
    this.modal = null;
    this.cleanupModal = null;
    this.isSaving = false;
  }

  async init() {
    this.renderSkeleton();
    await this.loadInitialRules();
    this.renderRules();
  }

  renderSkeleton() {
    this.root.innerHTML = '';
    this.root.classList.add('ub-editor-root');

    this.loadingEl = document.createElement('div');
    this.loadingEl.className = 'ub-editor-loading';
    this.loadingEl.textContent = 'Laster tillegg…';
    this.root.appendChild(this.loadingEl);

    this.listEl = document.createElement('div');
    this.listEl.className = 'ub-rule-list';
    this.root.appendChild(this.listEl);

    this.emptyEl = document.createElement('div');
    this.emptyEl.className = 'ub-empty-state';
    this.emptyEl.textContent = 'Ingen tilpassede tillegg';
    this.root.appendChild(this.emptyEl);

    const actions = document.createElement('div');
    actions.className = 'ub-editor-actions';
    this.addButton = document.createElement('button');
    this.addButton.type = 'button';
    this.addButton.className = 'btn btn-primary ub-add-btn';
    this.addButton.textContent = 'Legg til';
    this.addButton.addEventListener('click', () => {
      this.openModal();
    });
    actions.appendChild(this.addButton);
    this.root.appendChild(actions);

    this.setLoading(true);
  }

  setLoading(isLoading) {
    if (this.loadingEl) this.loadingEl.style.display = isLoading ? '' : 'none';
    if (this.listEl) this.listEl.style.display = isLoading ? 'none' : '';
    if (this.emptyEl) this.emptyEl.style.display = 'none';
    if (this.addButton) this.addButton.disabled = isLoading;
  }

  async loadInitialRules() {
    try {
      const appRules = this.getAppRules();
      this.rules = sortRules(appRules);

      this.userId = await getUserId();
      if (!this.userId) {
        this.setLoading(false);
        return;
      }

      const { data: row, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', this.userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.warn('[ub-editor] Failed to fetch user_settings', error);
        this.setLoading(false);
        return;
      }

      if (row) {
        const normalized = normalizeUb(row.custom_bonuses);
        if (normalized.migrated) {
          try {
            const column = row.id ? 'id' : 'user_id';
            const value = row.id ?? row.user_id;
            if (value) {
              await supabase
                .from('user_settings')
                .update({ custom_bonuses: normalized.data, updated_at: new Date().toISOString() })
                .eq(column, value);
              console.info('UB migrated ->', value);
            }
          } catch (migrationError) {
            console.warn('[ub-editor] Failed to persist migrated UB bonuses', migrationError);
          }
        }
        const normalizedData = normalized.data && typeof normalized.data === 'object'
          ? normalized.data
          : { rules: [] };
        const rowRules = Array.isArray(normalizedData.rules) ? normalizedData.rules : [];
        this.rules = sortRules(rowRules.map(rule => this.sanitizeRule(rule)));
        const targetColumn = row.id ? 'id' : 'user_id';
        const targetValue = row.id ?? row.user_id;
        if (targetValue) {
          this.persistTarget = { column: targetColumn, value: targetValue };
        }
        this.syncWithApp(this.rules);
      }
    } catch (err) {
      console.error('[ub-editor] Failed to load custom bonuses', err);
    } finally {
      this.setLoading(false);
    }
  }

  getAppRules() {
    const source = Array.isArray(window?.app?.customBonuses?.rules)
      ? window.app.customBonuses.rules
      : [];
    return source.map(rule => this.sanitizeRule(rule));
  }

  sanitizeRule(rule = {}) {
    const days = normalizeDays(rule.days);
    const exclusive = mutuallyExclusive({ rate: rule.rate, percent: rule.percent });
    const sanitized = {
      days,
      from: typeof rule.from === 'string' ? rule.from : '',
      to: typeof rule.to === 'string' ? rule.to : '',
    };
    if (exclusive.rate !== undefined) {
      const numericRate = Number(exclusive.rate);
      if (!Number.isNaN(numericRate)) sanitized.rate = numericRate;
    }
    if (exclusive.percent !== undefined) {
      const numericPercent = Number(exclusive.percent);
      if (!Number.isNaN(numericPercent)) sanitized.percent = numericPercent;
    }
    return sanitized;
  }

  renderRules() {
    if (!this.listEl) return;
    this.listEl.innerHTML = '';
    const hasRules = this.rules.length > 0;
    if (this.emptyEl) this.emptyEl.style.display = hasRules ? 'none' : '';
    this.rules.forEach((rule, index) => {
      const row = this.createRuleRow(rule, index);
      this.listEl.appendChild(row);
    });
  }

  createRuleRow(rule, index) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ub-rule-row';
    button.dataset.index = String(index);
    button.setAttribute('aria-label', `${formatDayPills(rule.days)} ${rule.from}–${rule.to}`);

    const meta = document.createElement('div');
    meta.className = 'ub-rule-meta';

    const daysWrap = document.createElement('div');
    daysWrap.className = 'ub-rule-days';
    DAYS.forEach(day => {
      const pill = createDayPill(day.value, { active: rule.days.includes(day.value) });
      daysWrap.appendChild(pill);
    });
    if (rule.days.length === DAYS.length) {
      const allLabel = document.createElement('span');
      allLabel.className = 'ub-all-days-label';
      allLabel.textContent = 'Alle dager';
      daysWrap.appendChild(allLabel);
    }
    meta.appendChild(daysWrap);

    const times = document.createElement('div');
    times.className = 'ub-rule-times';
    const fromLabel = rule.from || '--:--';
    const toLabel = rule.to || '--:--';
    times.textContent = `${fromLabel}–${toLabel}`;
    meta.appendChild(times);

    const value = document.createElement('div');
    value.className = 'ub-rule-value';
    if (rule.rate !== undefined) {
      value.textContent = `kr ${this.formatNumber(rule.rate)}/t`;
    } else if (rule.percent !== undefined) {
      value.textContent = `${this.formatNumber(rule.percent)}%`;
    } else {
      value.textContent = '';
    }

    button.appendChild(meta);
    button.appendChild(value);

    button.addEventListener('click', () => {
      this.openModal(rule, index);
    });

    if (this.isSaving) {
      button.disabled = true;
    }

    return button;
  }

  formatNumber(value) {
    if (typeof value !== 'number' || Number.isNaN(value)) return '';
    return value.toLocaleString('no-NO', {
      minimumFractionDigits: value % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    });
  }

  setSaving(isSaving) {
    this.isSaving = isSaving;
    if (this.addButton) this.addButton.disabled = isSaving;
    if (this.listEl) {
      this.listEl.querySelectorAll('button.ub-rule-row').forEach(btn => {
        btn.disabled = isSaving;
      });
    }
  }

  async persistRules(nextRules) {
    const previous = cloneRules(this.rules);
    const sorted = sortRules(nextRules.map(rule => this.sanitizeRule(rule)));
    this.rules = sorted;
    this.renderRules();

    if (!this.userId) {
      this.syncWithApp(sorted, { persistLocal: true });
      console.info('UB rules saved', sorted.length);
      return true;
    }

    this.setSaving(true);

    try {
      const payload = {
        custom_bonuses: { rules: cloneRules(sorted) },
        updated_at: new Date().toISOString(),
      };

      let response;
      if (this.persistTarget) {
        response = await supabase
          .from('user_settings')
          .update(payload)
          .eq(this.persistTarget.column, this.persistTarget.value)
          .select()
          .single();
      } else {
        response = await supabase
          .from('user_settings')
          .upsert({ ...payload, user_id: this.userId }, { onConflict: 'user_id' })
          .select()
          .single();
      }

      if (response.error) {
        throw response.error;
      }

      const data = response.data;
      if (data?.id) {
        this.persistTarget = { column: 'id', value: data.id };
      } else if (data?.user_id) {
        this.persistTarget = { column: 'user_id', value: data.user_id };
      }

      this.syncWithApp(sorted, { persistLocal: true });
      console.info('UB rules saved', sorted.length);
      return true;
    } catch (error) {
      console.error('[ub-editor] Failed to save rules', error);
      this.rules = previous;
      this.renderRules();
      if (window.showToast) {
        window.showToast('Kunne ikke lagre tillegg', 'error');
      }
      return false;
    } finally {
      this.setSaving(false);
    }
  }

  syncWithApp(rules, { persistLocal = false } = {}) {
    if (!window.app) return;
    const safeRules = cloneRules(rules);
    window.app.customBonuses = { rules: safeRules };
    if (persistLocal) {
      window.app.saveToLocalStorage?.();
      window.app.updateDisplay?.();
    }
  }

  validateRule(candidate, ignoreIndex = -1) {
    const days = normalizeDays(candidate.days);
    if (days.length === 0) {
      return { valid: false, error: 'Velg minst én dag.' };
    }

    const fromMinutes = timeStringToMinutes(candidate.from);
    const toMinutes = timeStringToMinutes(candidate.to);
    if (fromMinutes === null || toMinutes === null) {
      return { valid: false, error: 'Oppgi start- og sluttid (HH:MM).' };
    }
    if (fromMinutes === toMinutes) {
      return { valid: false, error: 'Start- og sluttid kan ikke være like.' };
    }
    if (toMinutes < fromMinutes) {
      return { valid: false, error: 'Sluttid må være etter starttid.' };
    }

    const type = candidate.valueType === 'percent' ? 'percent' : 'rate';
    if (type === 'rate') {
      const numeric = Number(candidate.rate);
      if (!Number.isFinite(numeric) || numeric < 0) {
        return { valid: false, error: 'Skriv inn en sats over eller lik 0.' };
      }
    } else {
      const numeric = Number(candidate.percent);
      if (!Number.isFinite(numeric) || numeric < 0) {
        return { valid: false, error: 'Skriv inn en prosent over eller lik 0.' };
      }
    }

    if (this.hasOverlap({ days, from: candidate.from, to: candidate.to }, ignoreIndex)) {
      return { valid: false, error: 'Tidsrommet overlapper med et eksisterende tillegg.' };
    }

    return { valid: true, error: '' };
  }

  hasOverlap(candidate, ignoreIndex) {
    const candidateStart = timeStringToMinutes(candidate.from);
    const candidateEnd = timeStringToMinutes(candidate.to);
    if (candidateStart === null || candidateEnd === null) return false;

    for (let index = 0; index < this.rules.length; index += 1) {
      if (index === ignoreIndex) continue;
      const existing = this.rules[index];
      const shared = candidate.days.some(day => existing.days.includes(day));
      if (!shared) continue;
      const existingStart = timeStringToMinutes(existing.from);
      const existingEnd = timeStringToMinutes(existing.to);
      if (existingStart === null || existingEnd === null) continue;
      if (rangesOverlap(candidateStart, candidateEnd, existingStart, existingEnd)) {
        return true;
      }
    }
    return false;
  }

  openModal(rule = null, index = -1) {
    this.closeModal();
    const editing = index >= 0;
    const initialDays = editing ? normalizeDays(rule.days) : [];
    const state = {
      days: new Set(initialDays),
      from: editing ? rule.from : '',
      to: editing ? rule.to : '',
      valueType: editing && rule.percent !== undefined ? 'percent' : 'rate',
      rate: editing && rule.rate !== undefined ? String(rule.rate) : '',
      percent: editing && rule.percent !== undefined ? String(rule.percent) : '',
    };

    const backdrop = document.createElement('div');
    backdrop.className = 'ub-modal-backdrop';

    const modal = document.createElement('div');
    modal.className = 'ub-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    const header = document.createElement('div');
    header.className = 'ub-modal-header';
    const title = document.createElement('h3');
    title.id = 'ubModalTitle';
    title.textContent = editing ? 'Rediger tillegg' : 'Nytt tillegg';
    modal.setAttribute('aria-labelledby', title.id);
    header.appendChild(title);
    modal.appendChild(header);

    const body = document.createElement('div');
    body.className = 'ub-modal-body';

    const daysField = document.createElement('div');
    daysField.className = 'ub-field';
    const daysLabel = document.createElement('label');
    daysLabel.textContent = 'Dager';
    daysField.appendChild(daysLabel);

    const daySelector = document.createElement('div');
    daySelector.className = 'ub-day-selector';

    const dayGroup = document.createElement('div');
    dayGroup.className = 'ub-day-pill-group';
    const pillRefs = [];
    DAYS.forEach(day => {
      const pill = createDayPill(day.value, {
        active: state.days.has(day.value),
        interactive: true,
        onToggle: (value, active) => {
          if (active) {
            state.days.add(value);
          } else {
            state.days.delete(value);
          }
          updateDayUI();
          updateValidation();
        },
      });
      pillRefs.push(pill);
      dayGroup.appendChild(pill);
    });
    daySelector.appendChild(dayGroup);

    const allButton = document.createElement('button');
    allButton.type = 'button';
    allButton.className = 'ub-day-all';
    allButton.textContent = 'Alle';
    allButton.setAttribute('aria-pressed', 'false');
    allButton.addEventListener('click', () => {
      if (state.days.size === DAYS.length) {
        state.days.clear();
      } else {
        DAYS.forEach(day => state.days.add(day.value));
      }
      updateDayUI();
      updateValidation();
    });
    daySelector.appendChild(allButton);
    daysField.appendChild(daySelector);
    body.appendChild(daysField);

    const timeField = document.createElement('div');
    timeField.className = 'ub-field';
    const timeLabel = document.createElement('label');
    timeLabel.textContent = 'Tidsrom';
    timeField.appendChild(timeLabel);

    const timeGrid = document.createElement('div');
    timeGrid.className = 'ub-time-grid';

    const fromWrapper = document.createElement('div');
    const fromLabel = document.createElement('label');
    fromLabel.textContent = 'Fra';
    fromWrapper.appendChild(fromLabel);
    const fromInput = document.createElement('input');
    fromInput.type = 'time';
    fromInput.value = state.from;
    fromInput.addEventListener('input', () => {
      state.from = fromInput.value;
      updateValidation();
    });
    fromWrapper.appendChild(fromInput);
    timeGrid.appendChild(fromWrapper);

    const toWrapper = document.createElement('div');
    const toLabel = document.createElement('label');
    toLabel.textContent = 'Til';
    toWrapper.appendChild(toLabel);
    const toInput = document.createElement('input');
    toInput.type = 'time';
    toInput.value = state.to;
    toInput.addEventListener('input', () => {
      state.to = toInput.value;
      updateValidation();
    });
    toWrapper.appendChild(toInput);
    timeGrid.appendChild(toWrapper);
    timeField.appendChild(timeGrid);
    body.appendChild(timeField);

    const typeField = document.createElement('div');
    typeField.className = 'ub-field';
    const typeLabel = document.createElement('label');
    typeLabel.textContent = 'Verditype';
    typeField.appendChild(typeLabel);

    const typeToggle = document.createElement('div');
    typeToggle.className = 'ub-type-toggle';

    const rateOption = document.createElement('label');
    const rateRadio = document.createElement('input');
    rateRadio.type = 'radio';
    rateRadio.name = 'ub-value-type';
    rateRadio.value = 'rate';
    rateRadio.checked = state.valueType === 'rate';
    rateRadio.addEventListener('change', () => {
      if (rateRadio.checked) {
        state.valueType = 'rate';
        const exclusive = mutuallyExclusive({ rate: state.rate, percent: state.percent });
        state.rate = exclusive.rate ?? '';
        state.percent = exclusive.percent ?? '';
        updateValueUI();
        updateValidation();
      }
    });
    rateOption.appendChild(rateRadio);
    rateOption.appendChild(document.createTextNode('Sats (kr/t)'));
    typeToggle.appendChild(rateOption);

    const percentOption = document.createElement('label');
    const percentRadio = document.createElement('input');
    percentRadio.type = 'radio';
    percentRadio.name = 'ub-value-type';
    percentRadio.value = 'percent';
    percentRadio.checked = state.valueType === 'percent';
    percentRadio.addEventListener('change', () => {
      if (percentRadio.checked) {
        state.valueType = 'percent';
        const exclusive = mutuallyExclusive({ rate: state.rate, percent: state.percent });
        state.rate = exclusive.rate ?? '';
        state.percent = exclusive.percent ?? '';
        updateValueUI();
        updateValidation();
      }
    });
    percentOption.appendChild(percentRadio);
    percentOption.appendChild(document.createTextNode('Prosent (%)'));
    typeToggle.appendChild(percentOption);

    typeField.appendChild(typeToggle);
    body.appendChild(typeField);

    const valueField = document.createElement('div');
    valueField.className = 'ub-field';
    const valueLabel = document.createElement('label');
    valueLabel.textContent = 'Verdi';
    valueField.appendChild(valueLabel);

    const valueWrapper = document.createElement('div');
    valueWrapper.className = 'ub-value-wrapper';
    const valueInput = document.createElement('input');
    valueInput.type = 'number';
    valueInput.min = '0';
    valueInput.step = '0.1';
    valueInput.inputMode = 'decimal';
    const valueSuffix = document.createElement('span');
    valueSuffix.className = 'ub-value-suffix';
    valueWrapper.appendChild(valueInput);
    valueWrapper.appendChild(valueSuffix);
    valueField.appendChild(valueWrapper);
    body.appendChild(valueField);

    const errorEl = document.createElement('div');
    errorEl.className = 'ub-form-error';
    body.appendChild(errorEl);

    modal.appendChild(body);

    const footer = document.createElement('div');
    footer.className = 'ub-modal-footer';

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn btn-danger';
    deleteBtn.textContent = 'Slett';
    deleteBtn.style.visibility = editing ? 'visible' : 'hidden';
    deleteBtn.disabled = !editing;

    const rightActions = document.createElement('div');
    rightActions.className = 'ub-actions-right';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.textContent = 'Avbryt';

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'btn btn-primary';
    saveBtn.textContent = 'Lagre';

    footer.appendChild(deleteBtn);
    rightActions.appendChild(cancelBtn);
    rightActions.appendChild(saveBtn);
    footer.appendChild(rightActions);

    modal.appendChild(footer);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    this.modal = backdrop;

    const updateDayUI = () => {
      pillRefs.forEach(pill => {
        const day = Number(pill.getAttribute('data-day'));
        const active = state.days.has(day);
        pill.classList.toggle('is-active', active);
        if (pill.tagName === 'BUTTON') {
          pill.setAttribute('aria-pressed', active ? 'true' : 'false');
        }
      });
      const allActive = state.days.size === DAYS.length;
      allButton.classList.toggle('is-active', allActive);
      allButton.setAttribute('aria-pressed', allActive ? 'true' : 'false');
    };

    const updateValueUI = () => {
      if (state.valueType === 'percent') {
        valueSuffix.textContent = '%';
        valueInput.value = state.percent ?? '';
      } else {
        valueSuffix.textContent = 'kr/t';
        valueInput.value = state.rate ?? '';
      }
    };

    const getCandidate = () => ({
      days: Array.from(state.days),
      from: state.from,
      to: state.to,
      valueType: state.valueType,
      rate: state.valueType === 'rate' ? valueInput.value : state.rate,
      percent: state.valueType === 'percent' ? valueInput.value : state.percent,
    });

    const updateValidation = () => {
      const candidate = getCandidate();
      const validation = this.validateRule(candidate, index);
      errorEl.textContent = validation.error;
      saveBtn.disabled = !validation.valid;
    };

    valueInput.addEventListener('input', () => {
      if (state.valueType === 'percent') {
        state.percent = valueInput.value;
      } else {
        state.rate = valueInput.value;
      }
      const exclusive = mutuallyExclusive({ rate: state.valueType === 'rate' ? state.rate : undefined, percent: state.valueType === 'percent' ? state.percent : undefined });
      state.rate = exclusive.rate ?? '';
      state.percent = exclusive.percent ?? '';
      updateValidation();
    });

    cancelBtn.addEventListener('click', () => {
      this.closeModal();
    });

    saveBtn.addEventListener('click', async () => {
      if (saveBtn.disabled) return;
      const candidate = getCandidate();
      const validation = this.validateRule(candidate, index);
      if (!validation.valid) {
        errorEl.textContent = validation.error;
        return;
      }
      saveBtn.disabled = true;
      deleteBtn.disabled = true;
      cancelBtn.disabled = true;
      const sanitized = this.buildRuleFromCandidate(candidate);
      const nextRules = editing
        ? this.rules.map((existing, idx) => (idx === index ? sanitized : existing))
        : [...this.rules, sanitized];
      const success = await this.persistRules(nextRules);
      if (success) {
        this.closeModal();
      } else {
        saveBtn.disabled = false;
        deleteBtn.disabled = !editing;
        cancelBtn.disabled = false;
        updateValidation();
      }
    });

    deleteBtn.addEventListener('click', async () => {
      if (!editing) return;
      if (!confirm('Slette dette tillegget?')) return;
      saveBtn.disabled = true;
      deleteBtn.disabled = true;
      cancelBtn.disabled = true;
      const nextRules = this.rules.filter((_, idx) => idx !== index);
      const success = await this.persistRules(nextRules);
      if (success) {
        this.closeModal();
      } else {
        saveBtn.disabled = false;
        deleteBtn.disabled = !editing;
        cancelBtn.disabled = false;
        updateValidation();
      }
    });

    const handleBackdropClick = (event) => {
      if (event.target === backdrop) {
        this.closeModal();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.closeModal();
      }
    };

    backdrop.addEventListener('click', handleBackdropClick);
    document.addEventListener('keydown', handleKeyDown);

    this.cleanupModal = () => {
      backdrop.removeEventListener('click', handleBackdropClick);
      document.removeEventListener('keydown', handleKeyDown);
    };

    updateDayUI();
    updateValueUI();
    updateValidation();
    setTimeout(() => {
      const focusTarget = dayGroup.querySelector('button') || fromInput;
      focusTarget?.focus();
    }, 0);
  }

  buildRuleFromCandidate(candidate) {
    const days = normalizeDays(candidate.days);
    const type = candidate.valueType === 'percent' ? 'percent' : 'rate';
    const base = {
      days,
      from: candidate.from,
      to: candidate.to,
    };
    const exclusive = mutuallyExclusive({
      rate: type === 'rate' ? candidate.rate : undefined,
      percent: type === 'percent' ? candidate.percent : undefined,
    });
    if (exclusive.rate !== undefined) {
      base.rate = Number(exclusive.rate);
    }
    if (exclusive.percent !== undefined) {
      base.percent = Number(exclusive.percent);
    }
    return base;
  }

  closeModal() {
    if (typeof this.cleanupModal === 'function') {
      this.cleanupModal();
      this.cleanupModal = null;
    }
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
  }
}

export async function mountCustomBonusEditor(root) {
  if (!root) return null;
  const editor = new CustomBonusEditor(root);
  await editor.init();
  return editor;
}
