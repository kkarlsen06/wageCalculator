let activeLocks = 0;
let __lockY = 0;
let previousBodyStyles = null;

function ensureDom() {
  return typeof window !== 'undefined' && typeof document !== 'undefined' && document.body;
}

export function lockScroll() {
  if (!ensureDom()) return;

  if (activeLocks === 0) {
    __lockY = window.scrollY || window.pageYOffset || 0;

    previousBodyStyles = {
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      width: document.body.style.width,
    };

    document.documentElement.classList.add('scroll-locked');
    document.body.classList.add('scroll-locked');
    document.documentElement.classList.add('modal-open');
    document.body.classList.add('modal-open');

    document.body.style.position = 'fixed';
    document.body.style.top = `-${__lockY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
  }

  activeLocks += 1;
}

export function unlockScroll() {
  if (!ensureDom() || activeLocks === 0) return;

  activeLocks -= 1;
  if (activeLocks > 0) return;

  if (previousBodyStyles) {
    document.body.style.position = previousBodyStyles.position || '';
    document.body.style.top = previousBodyStyles.top || '';
    document.body.style.left = previousBodyStyles.left || '';
    document.body.style.right = previousBodyStyles.right || '';
    document.body.style.width = previousBodyStyles.width || '';
    previousBodyStyles = null;
  } else {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
  }

  document.documentElement.classList.remove('scroll-locked');
  document.body.classList.remove('scroll-locked');
  document.documentElement.classList.remove('modal-open');
  document.body.classList.remove('modal-open');

  window.scrollTo(0, __lockY || 0);
}
