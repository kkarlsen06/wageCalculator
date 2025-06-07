# Oppdaterings Pop-up System - Utviklerguide

Dette dokumentet forklarer hvordan oppdateringsmodalen fungerer og hvordan du enkelt kan oppdatere innholdet for nye funksjoner.

## 1. Hvor finner jeg modalen?

### JavaScript-kode:
- **Fil:** `/kalkulator/js/appLogic.js`
- **Linjer:** ~3150-3240 (søk etter `showRecurringIntroduction`)
- **Hovedfunksjoner:**
  - `showRecurringIntroduction()` - Viser modalen
  - `dismissRecurringIntro()` - Lukker modalen og markerer som sett
  - `checkAndShowRecurringIntro()` - Sjekker om den skal vises automatisk

### CSS-styling:
- **Fil:** `/kalkulator/css/style.css`
- **Linjer:** ~745-775 (søk etter `#recurringIntroModal`)
- **Klasser:**
  - `#recurringIntroModal` - Hovedcontainer
  - `#recurringIntroModal .modal-content` - Modal innhold
  - `#recurringIntroModal .modal-title` - Titelstyling

### HTML-knapp for manuell visning:
- **Fil:** `/kalkulator/app.html`
- **Linjer:** ~210-215 (i Innstillinger → Generelt fanen)

## 2. Slik oppdaterer du modalen for nye funksjoner

**Hovedprinsipp:** Du trenger **IKKE** å lage nye modaler! Bare endre innholdet i den eksisterende modalen.

### Steg 1: Oppdater modalens innhold i JavaScript
I `appLogic.js`, finn `showRecurringIntroduction()` og endre bare HTML-innholdet:

```javascript
const modalHtml = `
    <div id="recurringIntroModal" class="modal" style="display: flex;">
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2 class="modal-title">✨ Ny oppdatering: [Din nye funksjon]</h2>
            </div>
            <div class="modal-body" style="padding: 24px;">
                <div style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                    <!-- ENDRE KUN DETTE INNHOLDET: -->
                    <p><strong>🎉 Vi har lagt til [beskrivelse av ny funksjon]!</strong></p>
                    <p>Du finner den nye funksjonen [hvor brukeren finner den].</p>
                    <ul style="text-align: left; margin: 16px 0;">
                        <li>Fordel 1</li>
                        <li>Fordel 2</li>
                        <li>Fordel 3</li>
                    </ul>
                    <!-- SLUTT PÅ ENDRINGER -->
                </div>
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button class="btn btn-secondary" onclick="app.dismissRecurringIntro()">
                        Lukk
                    </button>
                </div>
            </div>
        </div>
    </div>
`;
```

### Steg 2: Nullstill visningsflagget i Supabase
For at modalen skal vises for alle brukere igjen, kjør denne SQL-kommandoen:
```sql
UPDATE user_settings 
SET has_seen_recurring_intro = false;
```

### Steg 3: Ferdig!
Det er alt! Modalen vil nå vise det nye innholdet til alle brukere.

## 3. Hvorfor denne tilnærmingen er bedre

✅ **Enkelt:** Bare endre HTML-innholdet, ingen nye filer eller funktioner
✅ **Vedlikeholdbart:** Samme modal, samme CSS, samme logikk
✅ **Fleksibelt:** Du kan endre innholdet så ofte du vil
✅ **Konsistent:** Samme opplevelse for brukerne hver gang

## 4. Alternativ: Versjonert tilnærming

Hvis du vil være ekstra sofistikert, kan du lage et versjonssystem:

```javascript
// I setDefaultSettings()
this.lastSeenUpdateVersion = "1.0.0"; // Oppdater denne for nye versjoner

// I showRecurringIntroduction()
const currentVersion = "1.1.0"; // Oppdater denne sammen med innholdet
if (this.lastSeenUpdateVersion >= currentVersion) {
    return; // Ikke vis modal hvis bruker har sett denne versjonen
}

// I dismissRecurringIntro()
this.lastSeenUpdateVersion = "1.1.0"; // Samme som currentVersion
```

Da slipper du å nullstille i Supabase - modalen vises automatisk kun for brukere som ikke har sett den nye versjonen.

## 5. Supabase SQL-kommandoer

### Nullstill for ny oppdatering (kjør hver gang du oppdaterer innholdet):
```sql
UPDATE user_settings 
SET has_seen_recurring_intro = false;
```

### Sjekk hvor mange som har sett den nye oppdateringen:
```sql
SELECT 
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE has_seen_recurring_intro = true) as seen_intro,
    COUNT(*) FILTER (WHERE has_seen_recurring_intro = false) as not_seen_intro
FROM user_settings;
```

### Test på spesifikk bruker:
```sql
UPDATE user_settings 
SET has_seen_recurring_intro = false 
WHERE user_id = 'din-bruker-id';
```

## 6. Testing og debugging

### Rask testing i browser console:
```javascript
// Reset for deg selv
localStorage.removeItem('lønnsberegnerSettings');
location.reload();

// Eller bare reset intro-flagget
app.hasSeenRecurringIntro = false;
app.showRecurringIntroduction();

// Sjekk status
console.log('Har sett intro:', app.hasSeenRecurringIntro);
```

### Timing-tips:
- Modalen vises automatisk etter 2 sekunder ved oppstart
- Juster delay-verdien hvis nødvendig for bedre brukeropplevelse

## 7. Eksempel på typisk oppdateringsworkflow

1. **Utvikle ny funksjon** (f.eks. "Timelønn-kalkulator")

2. **Oppdater modal-innholdet:**
   ```javascript
   <h2 class="modal-title">✨ Ny funksjon: Timelønn-kalkulator</h2>
   // ...
   <p><strong>🎉 Nå kan du regne ut timelønn basert på årslønn!</strong></p>
   <p>Du finner den nye funksjonen under "Verktøy" i toppmeny.</p>
   ```

3. **Nullstill i Supabase:**
   ```sql
   UPDATE user_settings SET has_seen_recurring_intro = false;
   ```

4. **Deploy og test** - alle brukere vil nå se den nye modalen

5. **Ferdig!** - ingen nye filer, ingen nye CSS-regler, minimal kode-endring
