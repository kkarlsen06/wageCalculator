# XSS Audit and Remediation

Denne rapporten dokumenterer funn, risiko, fiks og verifikasjon for XSS (reflected, stored, DOM) i prosjektet.

## Funn

- Fil: `kalkulator/js/employeeCarousel.js`
  - Type: DOM XSS-sinks via `innerHTML`
  - Linjer: createCarouselStructure/track rendering; `createEmployeeTile` interpolerte `employee.name` og `aria-label` uten escaping; `showErrorState` brukte inline `onclick`.
  - Utnyttelse: Ondartet `employee.name` fra backend (stored XSS) kunne injisere HTML/JS i tile-navn og aria-attributter; inline `onclick` muliggjorde DOM XSS via DOM clobbering.

- Fil: `kalkulator/js/employeeActionsMenu.js`
  - Type: DOM XSS via `innerHTML` med ukontrollert `employee.name` og CSS-injeksjon via `--employee-color`.
  - Utnyttelse: Stored XSS fra ansattnavn og CSS context escape via `display_color` (for eksempel `red; background:url(javascript:...)`).

- Fil: `kalkulator/js/appLogic.js`
  - Type: DOM XSS-sinks via `insertAdjacentHTML` (modal), samt inline style med brukerfarge; greeting markdown render via `DOMPurify` uten sentral policy.
  - Utnyttelse: Potensielt DOM XSS hvis user-generert HTML noen gang blandes inn; CSS-injeksjon via farge.

- Fil: `kalkulator/index.html`
  - Type: Omfattende bruk av `onclick` i HTML (inline event handlers). Ikke i seg selv XSS, men CSP-hardening må unngå `unsafe-inline`.

- Fil: `server.js`
  - Type: Manglende sikkerhets-headere/CSP og cookie-flagg. Åpner for bredere XSS-angrepsflate.

- Filer: `kalkulator/js/app.js` og `kalkulator/js/appLogic.js`
  - Type: MarkDown-rendering til HTML med DOMPurify—ok, men uten sentral policy og fallback.

Kilder (sources) observert:
- URL-fragmenter i `auth.js` (`window.location.hash`, `search`) – brukt for Supabase-recovery-flow.
- `localStorage` og API-responser (ansattnavn/farger) – potensielle lagringsbaner for skadelige verdier.

## Risiko

- Stored XSS gjennom ansattnavn/farge påvirker alle brukere i samme org.
- DOM XSS gjennom `innerHTML` og inline `onclick` kan trigges uten side-refresh.
- Manglende CSP og `unsafe-inline` i HTML øker sannsynlighet/impact.

## Fikser (edits)

- Ny modul: `kalkulator/js/security.js`
  - `escapeHTML`, `safeUrl`, `safeCssColor`, `sanitizeHTML` (DOMPurify wrapper med ALLOWED_URI_REGEXP).

- `employeeCarousel.js`
  - Escape `employee.name` og aria-labels via `escapeHTML`.
  - Valider farge via `safeCssColor` for `--employee-color`.
  - Fjern inline `onclick` i error state; legg til `addEventListener`.

- `employeeActionsMenu.js`
  - Escape navn i `aria-label` og i header via `escapeHTML`.
  - Valider farge via `safeCssColor`.

- `appLogic.js`
  - Når valgt ansatt vises i pill: `nameEl.textContent` beholdes; `color-dot` style settes via `safeCssColor`.
  - Greeting Markdown: bruk `sanitizeHTML(marked.parse(...))` i stedet for rå DOMPurify.

- `app.js`
  - All Markdown-rendering flyttes til `sanitizeHTML(marked.parse(...))` for sentral policy.

- `server.js`
  - Legg til Helmet, CSP med per-request nonce, referrer-policy, COOP/COEP, disable x-powered-by.
  - Cookie-defaults: `HttpOnly; Secure; SameSite=Lax`.

Ingen funksjonalitet fjernet; event-lyttere erstatter inline `onclick` der de oppstod i dynamiske templates.

## Verifikasjon

- Manuelle payloads
  - URL: `?q=%3Cimg%20src=x%20onerror=alert(1)%3E` og `#<svg/onload=alert(1)>` – ingen alert; tekst renderes som tekst.
  - Ansattnavn satt til `<img src=x onerror=alert(1)>` – vises som tekst, ingen JS kjører.
  - `display_color` satt til `red; background: url(javascript:alert(1))` – farge faller tilbake til trygg verdi; ingen JS.

- CSP
  - Respons har `Content-Security-Policy` uten `unsafe-inline` for script; nonce påkrevd (inline skript må merkes eller flyttes). Eksterne kilder begrenset.

- Cookies
  - Alle cookies satt via `res.cookie` får `HttpOnly; Secure; SameSite=Lax` som standard.

## Tester (plan/implementasjon)

- Unit
  - `safeUrl` avviser `javascript:`, `data:`, ukjente protokoller.
  - `safeCssColor` aksepterer lovlige farger og avviser injeksjoner med `;`.
  - `escapeHTML` konverterer `< > & " '`. 

- E2E (Playwright el.l.)
  - Naviger til kalkulator med lagret ansattnavn/farge med ondsinnet payload; `page.on('dialog', fail)`; bekreft at `.employee-name` inneholder ren tekst.
  - Gå til sider med hash/param-payload; bekreft at DOM ikke inneholder `<script>`/on* og at app fungerer.

## Hardening og videre arbeid

- Eliminere resterende inline `onclick` i statisk HTML ved å la `app.js` delegere alle klikk (allerede delvis gjort).
- Legge nonce på eventuelle uunngåelige inline-skript eller flytte dem til egne filer.
- Vurdere `trusted-types` for å eliminere farlige sinker i fremtiden.

## Commit-maler

- Tittel: `fix(xss): <side/komponent> – fjern sink, kontekst-escape, CSP`
- Beskrivelse: Problem (type XSS + repro) • Løsning (diff + sanitiser + CSP) • Risiko/rollback (feature flag) • Tester (unit/e2e) • Sikkerhetsnotat.