## UI/UX Enhancements
- Provide a user-selectable light/dark theme instead of hardcoding the theme color to black, allowing the interface to match user or system preferences.
- Implement offline caching with a service worker so that the calculator continues to function when the network is unavailable.
- Improve the login flow by removing the inline style that hides the body and instead use a class toggle to avoid flashes of unstyled content.
- Introduce an onboarding walkthrough or contextual tooltips to guide first-time users through key features.

## Accessibility
- Ensure focus is moved to modals and returned when they close to aid keyboard and screen‑reader users.
- Review icon-only buttons and provide descriptive `aria-label` text wherever it is missing.

## Feature Ideas
- Allow importing shifts from calendar files or popular scheduling services to reduce manual entry.
- Add PDF export alongside the existing CSV download so reports can be shared more easily.
- Support recurring shift templates or favorites for faster entry of common schedules.

## Testing and Quality
- Add automated tests and a `test` script in `package.json` to catch regressions and enable continuous integration.
- Introduce linting and formatting tools to keep code style consistent across contributions.

