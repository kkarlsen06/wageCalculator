# Navigation & Icon Refactor — Implementation Prompt (Authoritative)

You are an engineer asked to **unify navigation** and **standardize icons** across the WageCalculator app. Follow this spec precisely. When choices arise, prefer fewer tabs, labeled icons, and safe-area‑correct layout. Produce small commits.

---
## Outcomes
- One persistent **bottom nav** (mobile) with a **center “+”** that opens *Add shift*.
- Four tabs max: **Hjem**(`/`), **Skift**(`/shifts`), **Chat**(`/chat`), **Profil**(`/profile`).
- Existing dashboard toggles remain **inside screens**:
  - Hjem: `Oversikt | Statistikk`
  - Skift: `Liste | Kalender`
- **All icons** are external SVG files in `app/public/icons/` using a single **icon loader**.
- Remove the header profile dropdown once the Profile tab exists.

Non‑goals: Renaming routes, redesigning content, or changing paywall logic.

---
## Directory & Tech assumptions
- Vite app. Public assets served from `app/public`. Source in `app/src`.
- Use `import.meta.glob` to load SVGs as raw strings.
- All dimensions use CSS; no inline `width/height` in SVG files.

---
## Icon system (single source of truth)
**Style rules for every icon file**
- `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `stroke-width="1.9"`, `stroke-linecap="round"`, `stroke-linejoin="round"`.

**Canonical files**
- Keep existing: `/icons/stars.svg` (Chat), `/icons/bars.svg` (Statistikk toggle).
- Use newly added: `/icons/home.svg` (Hjem), `/icons/shifts.svg` (Skift).
- Create: `/icons/profile.svg` with this exact content:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 12.2a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4"/>
  <path d="M4.2 20.5a7.8 7.8 0 0 1 15.6 0"/>
</svg>
```

**Refactor task — extract inline SVGs**
1. Search the repo for inline `<svg` (exclude brand logo, favicon, PWA icons).
2. For each, create a file in `app/public/icons/<kebab-name>.svg` with the style rules above.
3. Replace inline markup with an empty container, e.g. `<span class="icon" data-icon="<name>"></span>`.
4. Colors must come from the parent element’s `color`. Do **not** hardcode fills.

**Icon loader** (create `app/src/js/icons.js`):
```js
// Loads all public icons as raw strings. Usage: mountIcon(el, 'home')
const ICONS = import.meta.glob('/icons/*.svg', { as: 'raw', eager: true });
export function mountIcon(el, name){
  const key = `/icons/${name}.svg`;
  if (ICONS[key]) el.innerHTML = ICONS[key];
}
export function mountAll(root=document){
  root.querySelectorAll('[data-icon]').forEach(el => mountIcon(el, el.dataset.icon));
}
```
Call `mountAll()` once after DOM ready and after client‑side route changes.

---
## Bottom navigation (mobile)
**HTML skeleton** (place in the main HTML template, **outside** any scroll container, just before `</body>`):
```html
<nav id="bottom-nav" class="bottom-nav" role="navigation" aria-label="Hovednavigasjon">
  <a href="/" data-route="home" class="nav-item" aria-current="page">
    <span class="icon" data-icon="home" aria-hidden="true"></span><span class="label">Hjem</span>
  </a>
  <a href="/shifts" data-route="shifts" class="nav-item">
    <span class="icon" data-icon="shifts" aria-hidden="true"></span><span class="label">Skift</span>
  </a>
  <button id="nav-add" class="nav-add" aria-label="Legg til skift">+</button>
  <a href="/chat" data-route="chat" class="nav-item">
    <span class="icon" data-icon="stars" aria-hidden="true"></span><span class="label">Chat</span>
  </a>
  <a href="/profile" data-route="profile" class="nav-item">
    <span class="icon" data-icon="profile" aria-hidden="true"></span><span class="label">Profil</span>
  </a>
</nav>
```

**CSS** (create `app/src/css/bottom-nav.css`):
```css
.bottom-nav{position:fixed;left:0;right:0;bottom:0;z-index:1000;
  height:calc(64px + env(safe-area-inset-bottom));
  padding:8px 12px max(8px, env(safe-area-inset-bottom));
  display:grid;grid-template-columns:1fr 1fr auto 1fr 1fr;align-items:center;
  backdrop-filter:saturate(160%) blur(16px);
  background:rgba(10,12,16,.9);
  border-top:1px solid rgba(255,255,255,.06)
}
.bottom-nav .nav-item{justify-self:center;display:flex;flex-direction:column;gap:4px;align-items:center;
  text-decoration:none;font-size:12px;color:#c8d2e0}
.bottom-nav .nav-item[aria-current="page"]{color:#ffffff}
.bottom-nav .icon{width:24px;height:24px;display:block}
.nav-add{justify-self:center;width:56px;height:56px;margin-top:-28px;border:0;border-radius:9999px;
  display:grid;place-items:center;font-size:28px;color:#001018;background:linear-gradient(180deg,#54d0ff,#2aa3ff);
  box-shadow:0 8px 24px rgba(0,0,0,.35)}

/* Page padding to avoid underlap */
:root{--nav-h:72px}
.main, .snap-container{padding-bottom:calc(var(--nav-h) + env(safe-area-inset-bottom))}

/* Hide bar when keyboard opens (best-effort) */
@supports (height: 1dvh){
  .keyboard-open .bottom-nav{transform:translateY(100%)}
}
```

**JS behavior** (create `app/src/js/bottom-nav.js`):
```js
import { mountAll } from './icons.js';

function setActive(){
  const p = location.pathname;
  document.querySelectorAll('#bottom-nav .nav-item').forEach(a=>{
    const is = p === '/' ? a.dataset.route==='home' : p.startsWith(a.getAttribute('href'));
    a.toggleAttribute('aria-current', is);
  });
}

export function initBottomNav(){
  mountAll(document.getElementById('bottom-nav'));
  setActive();
  window.addEventListener('popstate', setActive);
  document.getElementById('nav-add')?.addEventListener('click', ()=>{
    // Prefer sheet if available, else hard navigate
    (window.openAddShiftSheet?.() ?? (location.href='/shifts/new'));
  });
  // Keyboard hide heuristic
  const vv = window.visualViewport;
  if (vv){
    const r = ()=>{
      const open = (vv.height || 0) < (window.innerHeight * 0.8);
      document.documentElement.classList.toggle('keyboard-open', open);
    };
    vv.addEventListener('resize', r); r();
  }
}
```
Call `initBottomNav()` from your main entry after DOM is ready.

---
## Screens & toggles
- **Hjem (`/`)**: Keep hero. Add segmented control `Oversikt | Statistikk` **inside** the screen. Use `/icons/bars.svg` for Statistikk if an icon is needed.
- **Skift (`/shifts`)**: Segmented `Liste | Kalender`. Row tap → `/shifts/:id`. FAB/+ opens `/shifts/new`.
- **Chat (`/chat`)**: Use `/icons/stars.svg`. If user lacks access, redirect to `/paywall?from=chat`.
- **Profil (`/profile`)**: Links to `/settings`, `/subscription`, and **Logg ut** action. Remove header dropdown elsewhere.

---
## Desktop behavior (≥768px)
- Switch to a left rail with the same 4 items; global "+" becomes a top‑right button. Keep the icon system identical.

---
## Acceptance checklist (agent must provide)
- [ ] Screenshot of the bottom nav on iOS Safari and PWA (safe‑area correct).
- [ ] Proof that inline SVGs were removed and replaced with file icons.
- [ ] `icons.js` glob loader works; `mountAll()` injects the four tab icons.
- [ ] Active state follows SPA navigation.
- [ ] Content never sits under the bar; keyboard hide works.

---
## Commit plan
1. `feat(icons): add profile.svg, loader, extract inline svgs`
2. `feat(nav): add persistent bottom nav + FAB`
3. `chore: remove header profile dropdown`

```