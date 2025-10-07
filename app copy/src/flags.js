const DEFAULT_ENABLE_CUSTOM_BONUS_EDITOR = true;

function coerceFlag(value, fallback) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['false', '0', 'off', 'nei', 'no'].includes(normalized)) return false;
    if (['true', '1', 'on', 'ja', 'yes'].includes(normalized)) return true;
    return fallback;
  }
  return fallback;
}

let resolved = DEFAULT_ENABLE_CUSTOM_BONUS_EDITOR;

if (typeof window !== 'undefined' && window.CONFIG?.features?.ENABLE_CUSTOM_BONUS_EDITOR !== undefined) {
  resolved = coerceFlag(window.CONFIG.features.ENABLE_CUSTOM_BONUS_EDITOR, DEFAULT_ENABLE_CUSTOM_BONUS_EDITOR);
} else if (typeof import.meta !== 'undefined' && import.meta.env && Object.prototype.hasOwnProperty.call(import.meta.env, 'VITE_ENABLE_CUSTOM_BONUS_EDITOR')) {
  resolved = coerceFlag(import.meta.env.VITE_ENABLE_CUSTOM_BONUS_EDITOR, DEFAULT_ENABLE_CUSTOM_BONUS_EDITOR);
}

export const ENABLE_CUSTOM_BONUS_EDITOR = resolved;

export function isCustomBonusEditorEnabled() {
  return ENABLE_CUSTOM_BONUS_EDITOR;
}
