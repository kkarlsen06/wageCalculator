# CSS Modules Migration Plan — Agent-Runnable & Self-Contained

**Mission**: Migrate UI components from global CSS to CSS Modules (`*.module.css`), preserving all existing visuals and behavior.

---

## Agent State (Update on Each Run)
```
DiscoveryComplete: false
LastRun: [UPDATE_WITH_ISO_DATETIME]
CurrentModule: [CURRENT_MODULE_BEING_WORKED_ON]
```

**Important**: When `DiscoveryComplete` becomes `true`, delete the entire "Discovery Commands" section below and update this state.

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

## Discovery Commands (Run Once, Then Delete This Section)

**Goal**: Analyze codebase to identify all components that need migration, then update the "Modules Left" list.

### Command 1: Find HTML/JS Class Usage
```bash
grep -Rho --include='*.{html,js,jsx,ts,tsx}' 'class[^=]*="[^"]*"' app/src app/index.html | \
sed -E 's/.*class[^=]*="([^"]*)".*/\1/' | tr ' ' '\n' | sed 's/[",]//g' | \
sort | uniq -c | sort -nr | head -n 200
```

### Command 2: Find classList.add() Usage
```bash
grep -Rho --include='*.{js,jsx,ts,tsx}' 'classList\.add\([^)]*\)' app/src | \
sed -E 's/.*add\(([^)]*)\).*/\1/' | tr ', ' '\n' | sed -E "s/[\"'\`]//g" | \
sort | uniq -c | sort -nr | head -n 200
```

### Analysis Instructions
1. Run both commands above
2. From results, identify component-like classes (cards, modals, buttons, forms, etc.)
3. Ignore utility classes (flex, mt-*, container, content, etc.)
4. Update "Modules Left" list below in alphabetical order
5. Set `DiscoveryComplete: true` in Agent State
6. **Delete this entire "Discovery Commands" section**

---

## Migration Progress Tracking

### Modules Left (Update After Each Migration)

**Note**: This list is seeded from current codebase analysis. Update after running Discovery Commands.

- [ ] button-primary
- [ ] button-secondary  
- [ ] dashboard-section
- [ ] employee-actions-menu
- [ ] employee-card
- [ ] employee-carousel
- [ ] employee-modal
- [ ] footer
- [ ] form-field
- [ ] header
- [ ] modal
- [ ] skeleton-block
- [ ] stats-view
- [ ] tabs
- [ ] toast
- [ ] total-card
- [ ] total-skeleton

**Instructions**: 
- Keep list alphabetical
- Remove items that don't exist in codebase during Discovery
- Move completed items to "Completed Modules" section below

### Completed Modules (Agent Updates After Each Success)

- [ ] _(none yet)_

**Format**: `- [x] ComponentName (YYYY-MM-DD)`