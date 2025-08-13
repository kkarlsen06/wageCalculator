# E2E test plan for XSS

Scenarier:

- Reflected/DOM via URL
  - Åpne `/kalkulator/index.html?q=%3Cimg%20src=x%20onerror=alert(1)%3E` og `#<svg/onload=alert(1)>`.
  - Forventning: Ingen dialog/alert; tekst tilføyet vises som tekst.

- Stored via API-data (ansatt)
  - Opprett ansatt i DB via API med navn `<img src=x onerror=alert(1)>` og `display_color = 'red; background:url(javascript:alert(1))'`.
  - Last kalkulatorens employees-visning.
  - Forventning: `.employee-name` viser escape’et tekst; farge er trygg; ingen JS kjører.

- Chat/Markdown rendering
  - Fôr chatten med tekst som inneholder `<script>alert(1)</script>` eller `[xss](javascript:alert(1))`.
  - Forventning: Ingen kjøring; lenker med farlig skjema fjernes/blokkeres.

Automatisering (Playwright skisse):

- Sett `page.on('dialog', d => { throw new Error('Unexpected dialog: ' + d.message()); })`.
- Naviger til hver URL med payload;
- Bekreft at `await page.$('text=/onerror=|<script/').then(x=>!x)`.
- Verifiser at `.employee-name` har `textContent` som matcher literal payload-streng (escaped i DOM).