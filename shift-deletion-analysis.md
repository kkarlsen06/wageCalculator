# Analyse av vakt-sletting problem med flere dialogbokser

## Problem beskrivelse
Brukeren opplevde at når de prøvde å slette en vakt, skjedde det ingenting ved de første klikkene, og senere dukket det opp flere bekreftelsesdialogbokser samtidig. De mistenker at problemet kan være knyttet til at de lukket og åpnet vakt-detaljer-modalen igjen.

## Teknisk analyse

### 1. Kodeflyt for vakt-sletting

1. **Bruker klikker på slett-knappen** i vakt-detaljer-modalen
2. **Event delegation** i `app.js` (linje 248-255) fanger opp klikket
3. **`deleteShift(shiftIndex)`** kalles i `appLogic.js` (linje 3969-4013)
4. **Bekreftelsesdialog** vises: `confirm('Er du sikker på at du vil slette denne vakten?')`

### 2. Identifiserte problemer

#### A. Ingen debouncing eller knapp-deaktivering
```javascript
// I app.js linje 248-255
const deleteBtn = event.target.closest('.delete-shift-btn');
if (deleteBtn) {
    event.stopPropagation();
    const shiftIndex = parseInt(deleteBtn.getAttribute('data-shift-index'));
    app.deleteShift(shiftIndex).then(() => {
        app.closeShiftDetails();
    });
}
```

**Problem**: Ingen beskyttelse mot flere raske klikk. Hver klikk starter en ny `deleteShift`-operasjon.

#### B. Asynkron operasjon uten tilbakemelding
```javascript
// I appLogic.js linje 3969-4013
async deleteShift(index) {
    // ... kode ...
    if (!confirm('Er du sikker på at du vil slette denne vakten?')) return;
    // ... resten av sletting ...
}
```

**Problem**: Brukeren ser ingen visuell indikasjon på at noe skjer når de klikker. Dette får dem til å klikke flere ganger.

#### C. Modal gjenopprettelse kan skape problemer
I `showShiftDetails` (linje 2983-3190) blir modalen bygget opp dynamisk hver gang, men event delegation i `app.js` er allerede satt opp globalt.

### 3. Hvorfor oppstår problemet?

1. **Bruker klikker flere ganger** fordi de ikke får umiddelbar respons
2. **Hver klikk starter en ny `deleteShift`-operasjon** (asynkron)
3. **Alle operasjoner viser sine egne bekreftelsesdialogbokser** når de når `confirm()`-linjen
4. **Ingen mekanisme stopper de påfølgende operasjonene** etter at den første starter

### 4. Scenario: Lukking og gjenåpning av modal

Når brukeren lukker modalen og åpner den igjen:
- Den globale event delegation-handleren i `app.js` er fortsatt aktiv
- Ny modal blir opprettet med samme knapper og data-attributter
- Problemet forverres ikke direkte, men mangel på tilbakemelding gjør det lett å utløse på nytt

## Anbefalte løsninger

### 1. Umiddelbar løsning: Legg til debouncing
```javascript
// I app.js, erstatt eksisterende delete-handler
let deleteInProgress = false;
document.body.addEventListener('click', (event) => {
    const deleteBtn = event.target.closest('.delete-shift-btn');
    if (deleteBtn && !deleteInProgress) {
        event.stopPropagation();
        deleteInProgress = true;
        
        // Deaktiver knappen visuelt
        deleteBtn.disabled = true;
        deleteBtn.style.opacity = '0.5';
        
        const shiftIndex = parseInt(deleteBtn.getAttribute('data-shift-index'));
        app.deleteShift(shiftIndex).then(() => {
            app.closeShiftDetails();
        }).finally(() => {
            deleteInProgress = false;
            deleteBtn.disabled = false;
            deleteBtn.style.opacity = '1';
        });
    }
});
```

### 2. Forbedret tilbakemelding i deleteShift-funksjonen
```javascript
async deleteShift(index) {
    const shift = this.shifts[index];
    if (shift.seriesId) {
        if (confirm('Denne vakten er del av en serie. Vil du slette hele serien?')) {
            await this.deleteSeries(shift.seriesId);
            return;
        }
    }
    
    // Vis bekreftelsesdialog FØRST
    if (!confirm('Er du sikker på at du vil slette denne vakten?')) return;
    
    // Vis loading-indikator
    const loadingIndicator = this.showLoadingIndicator('Sletter vakt...');
    
    try {
        // ... eksisterende sletting-kode ...
        
        this.updateDisplay();
        this.showSuccessMessage('Vakt slettet');
    } catch (e) {
        console.error('Error in deleteShift:', e);
        alert('En feil oppstod ved sletting av vakt');
    } finally {
        this.hideLoadingIndicator(loadingIndicator);
    }
}
```

### 3. Alternativ: Flytt bekreftelsesdialog til UI-laget
```javascript
// I stedet for confirm() i deleteShift, vis en custom modal
showDeleteConfirmation(shiftIndex) {
    const modal = this.createConfirmationModal(
        'Bekreft sletting',
        'Er du sikker på at du vil slette denne vakten?',
        () => this.performDelete(shiftIndex) // Callback for bekreftelse
    );
    document.body.appendChild(modal);
}

async performDelete(shiftIndex) {
    // Kun selve sletting-logikken, ingen confirm()
    try {
        // ... sletting-kode uten confirm() ...
    } catch (e) {
        // ... error handling ...
    }
}
```

## Konklusjon

Problemet skyldes manglende beskyttelse mot multiple raske klikk kombinert med asynkron operasjon som ikke gir umiddelbar tilbakemelding. Løsningen er å implementere debouncing og bedre brukeropplevelse med loading-indikatorer og knapp-deaktivering.

Den primære årsaken er **ikke** direkte knyttet til modal-lukking og gjenåpning, men denne handlingen kan gjøre det lettere å utløse problemet igjen hvis brukeren fortsatt ikke får tilstrekkelig tilbakemelding.