import { DAYS } from './days.js';

export function getDayMeta(value) {
  return DAYS.find(day => day.value === value) || null;
}

export function createDayPill(value, { active = false, interactive = false, onToggle } = {}) {
  const meta = getDayMeta(value);
  const label = meta ? meta.short : String(value);
  const title = meta ? meta.name : `Dag ${value}`;

  const el = document.createElement(interactive ? 'button' : 'span');
  el.className = `ub-day-pill${active ? ' is-active' : ''}`;
  el.textContent = label;
  el.setAttribute('data-day', String(value));
  el.setAttribute('title', title);
  el.setAttribute('aria-label', title);

  if (interactive) {
    el.type = 'button';
    el.setAttribute('aria-pressed', active ? 'true' : 'false');
    el.addEventListener('click', () => {
      const nextActive = !el.classList.contains('is-active');
      el.classList.toggle('is-active', nextActive);
      el.setAttribute('aria-pressed', nextActive ? 'true' : 'false');
      if (typeof onToggle === 'function') {
        onToggle(value, nextActive, el);
      }
    });
  }

  return el;
}
