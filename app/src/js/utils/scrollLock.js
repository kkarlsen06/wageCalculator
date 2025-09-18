let lockCount = 0;
let scrollPosition = 0;
let previousBodyStyles = null;

function ensureGlobal() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }
  return true;
}

export function lockScroll() {
  if (!ensureGlobal()) return;

  if (lockCount === 0) {
    scrollPosition = window.scrollY || window.pageYOffset || 0;

    if (!previousBodyStyles) {
      previousBodyStyles = {
        position: document.body.style.position,
        top: document.body.style.top,
        width: document.body.style.width,
      };
    }

    document.documentElement.classList.add('modal-open');
    document.body.classList.add('modal-open');

    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollPosition}px`;
    document.body.style.width = '100%';
  }

  lockCount += 1;
}

export function unlockScroll() {
  if (!ensureGlobal() || lockCount === 0) return;

  lockCount -= 1;
  if (lockCount > 0) return;

  document.documentElement.classList.remove('modal-open');
  document.body.classList.remove('modal-open');

  if (previousBodyStyles) {
    document.body.style.position = previousBodyStyles.position || '';
    document.body.style.top = previousBodyStyles.top || '';
    document.body.style.width = previousBodyStyles.width || '';
    previousBodyStyles = null;
  } else {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
  }

  window.scrollTo(0, scrollPosition);
}
