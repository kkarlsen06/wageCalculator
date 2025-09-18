# Morph Animations with View Transitions API

A guide for implementing smooth PowerPoint-style morph transitions between routes in vanilla JS SPAs.

## Overview

The View Transitions API provides native browser support for smooth element morphing between DOM states. For unsupported browsers (mainly Firefox), we use a FLIP (First, Last, Invert, Play) fallback that provides visually similar results.

## Core Implementation Pattern

### 1. Mark Elements as Shared

Elements that should morph between routes need the same `view-transition-name`:

```css
/* Both versions of the same logical element */
.nav-item.nav-add,
.nav-item.nav-add-small {
  view-transition-name: fab-plus;
}

/* Tune the transition */
::view-transition-group(fab-plus) {
  animation-duration: 260ms;
  animation-timing-function: cubic-bezier(.22,1,.36,1);
}
```

### 2. Wrap Navigation in Transitions

```js
export function navigate(path) {
  const nav = () => {
    history.pushState({}, '', path);
    render();
  };

  if ('startViewTransition' in document) {
    document.startViewTransition(nav);
  } else {
    // FLIP fallback for Firefox
    const play = flipOnce('.nav-item.nav-add, .nav-item.nav-add-small');
    nav();
    requestAnimationFrame(play);
  }
}
```

### 3. FLIP Fallback Implementation

```js
export function flipOnce(selector) {
  const el = document.querySelector(selector);
  if (!el) return () => {};

  // FIRST: Capture initial position
  const first = el.getBoundingClientRect();

  return () => {
    // LAST: Capture final position
    const last = el.getBoundingClientRect();

    // INVERT: Calculate transform needed to appear at initial position
    const dx = first.left - last.left;
    const dy = first.top - last.top;
    const sx = first.width / Math.max(1, last.width);
    const sy = first.height / Math.max(1, last.height);

    // PLAY: Animate from inverted state to natural position
    el.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
      { transform: 'none' }
    ], {
      duration: 260,
      easing: 'cubic-bezier(.22,1,.36,1)'
    });
  };
}
```

## Critical Rules for Successful Morphing

### Element Continuity
- **Same `view-transition-name`** on both elements
- **Element must exist in DOM** in both states
- Use `visibility: hidden` instead of `display: none` to hide elements

### Timing Sequence
1. Capture initial state (FLIP only)
2. Execute DOM changes (navigation)
3. Browser automatically morphs (View Transitions) or play animation (FLIP)

### Performance Considerations
- Keep animation duration reasonable (200-300ms)
- Use hardware-accelerated properties (transform, opacity)
- Minimize layout thrash during transitions

## Advanced Patterns

### Multiple Morphing Elements
```css
.tab-indicator { view-transition-name: tab-indicator; }
.hero-card { view-transition-name: hero-card; }
.fab-button { view-transition-name: fab-button; }
```

### Conditional Morphing
```js
// Only morph specific route transitions
if (shouldMorphBetween(currentRoute, targetRoute)) {
  document.startViewTransition(nav);
} else {
  nav();
}
```

### Accessibility Integration
```css
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*) {
    animation-duration: 1ms;
  }
}
```

## Debugging Tips

### Common Issues
1. **No morph occurs**: Check `view-transition-name` matches exactly
2. **Janky animation**: Element might be changing containers/styles during transition
3. **FLIP doesn't work**: Element selector might not match after navigation

### Browser DevTools
- View Transitions show up in Chrome DevTools Performance tab
- Use `::view-transition-*` pseudo-elements to debug transition state
- Console.log first/last positions in FLIP to debug calculations

## Integration with SPA Routers

### Route-Specific Cleanup
```js
// Clean up floating elements that might interfere
document.querySelectorAll('.floating-overlay').forEach(el => el.remove());

// Restore original navbar state if modified
if (window._originalNavbarHTML) {
  const nav = document.querySelector('.bottom-nav');
  nav.innerHTML = window._originalNavbarHTML;
}
```

### State Management
- Mark navigation in progress to prevent scroll restoration conflicts
- Clear transition flags after brief delay
- Handle cleanup for abandoned transitions

## Production Considerations

### Browser Support
- View Transitions: Chrome/Edge 111+, Safari 18+
- FLIP fallback: All modern browsers with Web Animations API
- Graceful degradation: Instant navigation if both fail

### Performance Budget
- Each morphing element adds computational overhead
- Limit to 3-5 simultaneously morphing elements max
- Test on lower-end devices

### User Experience
- Morph should feel intentional, not accidental
- Duration should match user expectations (not too fast/slow)
- Respect user motion preferences

This approach provides smooth, native-feeling transitions that enhance the perceived performance and polish of the application.