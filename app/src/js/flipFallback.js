// FLIP fallback for Firefox - provides smooth transitions when View Transitions API is not available
export function flipOnce(selector) {
  const el = document.querySelector(selector);
  if (!el) return () => {};

  const first = el.getBoundingClientRect();

  return () => {
    const last = el.getBoundingClientRect();
    const dx = first.left - last.left;
    const dy = first.top - last.top;
    const sx = first.width / Math.max(1, last.width);
    const sy = first.height / Math.max(1, last.height);

    try {
      el.animate(
        [
          {
            transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`
          },
          {
            transform: 'none'
          }
        ],
        {
          duration: 260,
          easing: 'cubic-bezier(.22,1,.36,1)'
        }
      );
    } catch {
      // Animation API not supported, fail silently
    }
  };
}