export function auditModals() {
  const elements = Array.from(document.querySelectorAll<HTMLElement>('*'));
  const overs = elements
    .map((el) => ({ el, overflowY: getComputedStyle(el).overflowY }))
    .filter(({ overflowY }) => overflowY === 'auto' || overflowY === 'scroll');

  console.group('Modal Scroll Audit');
  console.table(
    overs.map(({ el, overflowY }) => ({
      node:
        el.tagName +
        (el.id ? `#${el.id}` : '') +
        (el.className
          ? `.${String(el.className).trim().replace(/\s+/g, '.')}`
          : ''),
      overflowY,
    })),
  );
  console.log(
    'html/body locked?',
    document.documentElement.classList.contains('modal-open'),
    document.body.classList.contains('modal-open'),
  );
  console.groupEnd();
}

if (import.meta?.env?.DEV) {
  (window as typeof window & { __auditModals?: () => void }).__auditModals = auditModals;
}
