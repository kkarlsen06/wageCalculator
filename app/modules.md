# CSS Modules Migration Plan — Agent-Runnable & Self-Contained

**Mission**: Migrate UI components from global CSS to CSS Modules (`*.module.css`), preserving all existing visuals and behavior.

---

## Agent State (Update on Each Run)
```
DiscoveryComplete: true
LastRun: 2025-09-12T12:30:00Z
CurrentModule: total-card
```

---

## Ground Rules (Must Follow)

1. **Scope**: Only work in `/app` directory. Never modify `/marketing`.
2. **Visual Preservation**: Do not change any visuals or redesign. Exact visual parity required.
3. **Component Structure**: Each component gets its own folder at `app/src/components/<ComponentName>/`
   - Required files per component:
     - `<ComponentName>.module.css` (scoped styles)
     - `<ComponentName>.js` (mounts CSS classes to DOM elements)
4. **CSS Cleanup**: Only remove CSS from legacy files after successful migration of that specific component.
5. **Shared Styles**: Keep CSS variables and shared tokens in `:root` unchanged.

---

## Step-by-Step Migration Process

Execute these steps in order for each component:

### Step 1: Create Component Files
```
app/src/components/<ComponentName>/<ComponentName>.module.css
app/src/components/<ComponentName>/<ComponentName>.js
```

### Step 2: Extract and Move Styles
- Identify component styles in `style.css`, `settings.css`, `themes.css`
- Copy ONLY the relevant CSS rules to `<ComponentName>.module.css`
- Transform selectors:
  - Root selector (e.g., `.total-card`) → `.root`
  - Child selectors (e.g., `.total-label`) → `.label`

### Step 3: Create JavaScript Mount Function
```javascript
// Example: TotalCard.js
import styles from './TotalCard.module.css';

export function mountTotalCard(el) {
  // Remove legacy class
  el.classList.remove('total-card');
  // Add module-scoped class
  el.classList.add(styles.root);
  
  // Apply child element classes
  el.querySelector('.total-label')?.classList.add(styles.label);
  el.querySelector('.total-amount')?.classList.add(styles.amount);
  el.querySelector('.total-secondary-info')?.classList.add(styles.secondary);
}
```

### Step 4: Integrate with App Bootstrap
Add to main application file (e.g., `kalkulator.js`):
```javascript
import { mountTotalCard } from '/src/components/TotalCard/TotalCard.js';
document.querySelectorAll('.total-card').forEach(mountTotalCard);
```

### Step 5: Remove Legacy CSS
Delete ONLY the migrated CSS declarations from legacy files. Do not remove shared styles.

### Step 6: Visual Verification
Ensure exact visual parity. If visuals differ, fix in the module CSS, never in global styles.


---

## Migration Progress Tracking

### Modules Left (Update After Each Migration)

**Note**: Final comprehensive analysis completed on 2025-09-12 with triple-check verification. Components ordered by priority/complexity.

**High Priority - Core UI Components:**
- [ ] total-card
- [ ] next-shift-card  
- [ ] next-payroll-card
- [ ] modal
- [ ] header
- [ ] tab-bar
- [ ] floating-action-bar
- [ ] snap-container

**Form & Input Components:**
- [ ] form-group
- [ ] form-control
- [ ] form-input
- [ ] form-actions
- [ ] form-progress
- [ ] form-sections
- [ ] time-input
- [ ] date-cell
- [ ] date-selector-group
- [ ] calendar-cell
- [ ] switch-group
- [ ] toggle-input
- [ ] radio-option

**Employee Management:**
- [ ] employee-form
- [ ] employee-modal-content
- [ ] employee-carousel
- [ ] employee-actions-menu
- [ ] employee-filter-bar
- [ ] employee-tile
- [ ] employee-avatar
- [ ] employees-container
- [ ] employees-placeholder

**Charts & Statistics:**
- [ ] weekly-hours-chart-card
- [ ] chart-visualization-card
- [ ] chart-hours-section
- [ ] chart-progress-bar
- [ ] chart-cards-container
- [ ] statistics-section

**Settings & Configuration:**
- [ ] settings-detail
- [ ] settings-item
- [ ] settings-section
- [ ] settings-collapse-toggle
- [ ] advanced-section
- [ ] advanced-toggle
- [ ] theme-selector
- [ ] profile-dropdown
- [ ] user-profile-container

**Profile & Avatar Management:**
- [ ] profile-picture-controls
- [ ] profile-picture-current
- [ ] profile-placeholder
- [ ] avatar-upload
- [ ] avatar-preview

**Navigation & Layout:**
- [ ] month-navigation
- [ ] shift-calendar
- [ ] calendar-display-toggle
- [ ] dashboard-section
- [ ] week-separator
- [ ] calendar-employee-chips

**Authentication & Onboarding:**
- [ ] login-card
- [ ] onboarding-container
- [ ] onboarding-step
- [ ] onboarding-progress
- [ ] auth-center
- [ ] legal-modal

**Premium & Subscriptions:**
- [ ] premium-feature-modal
- [ ] plan-card
- [ ] subscription-status-card
- [ ] subscription-plans
- [ ] upgrade-prompt-card

**Chat & Communication:**
- [ ] chatbox-container
- [ ] chatbox-pill
- [ ] chatbox-message
- [ ] chatbox-input-container

**Wage & Rate Components:**
- [ ] wage-info-card
- [ ] wage-type-options
- [ ] rate-preview-card
- [ ] rate-input-group
- [ ] bonus-breakdown
- [ ] bonus-details
- [ ] tariff-card
- [ ] tariff-grid

**Menu & Dropdown Systems:**
- [ ] menu-items
- [ ] menu-header
- [ ] menu-close-btn
- [ ] dropdown-item
- [ ] filter-chip

**Progress & Step Components:**
- [ ] progress-card
- [ ] progress-step
- [ ] progress-line
- [ ] step-header

**Loading & State Components:**
- [ ] loading-spinner
- [ ] loading-overlay
- [ ] loading-skeleton
- [ ] skeleton-block
- [ ] profile-skeleton

**Utility & UI Elements:**
- [ ] confirmation-modal
- [ ] info-card
- [ ] info-box
- [ ] toast
- [ ] backdrop-blur
- [ ] app-footer
- [ ] empty-state
- [ ] error-box

**Instructions**: 
- Keep list alphabetical
- Remove items that don't exist in codebase during Discovery
- Move completed items to "Completed Modules" section below

### Completed Modules (Agent Updates After Each Success)

- [ ] _(none yet)_

**Format**: `- [x] ComponentName (YYYY-MM-DD)`