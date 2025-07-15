# Analyse: Vaktkortet - Forskjellig oppdateringsfrekvens for grunnlønn og tillegg

## Problemstilling
Du har observert at i det aktive vaktkortet oppdateres grunnlønn og total lønn sekund for sekund, mens tillegg bare kalkuleres minutt for minutt.

## Årsaken til problemet

### 1. Timer-oppdatering (hver sekund)
Systemet bruker en timer som oppdaterer vaktkortet hvert sekund:
```javascript
this.nextShiftTimer = setInterval(() => {
    this.updateNextShiftCard();
}, 1000); // Update every second
```

### 2. Grunnlønn-kalkulering (sekund-presisjon)
Grunnlønnen kalkuleres basert på eksakt tid arbeidet i millisekunder:
```javascript
// Calculate time worked so far in hours
const timeWorked = now - shiftStartTime;
const hoursWorked = timeWorked / (1000 * 60 * 60);

// Calculate base earnings so far
const baseEarned = hoursWorked * wageRate;
```

Dette gir kontinuerlig, sekund-for-sekund oppdatering av grunnlønnen.

### 3. Tillegg-kalkulering (minutt-presisjon)
Tilleggene kalkuleres på en annen måte som kun bruker timer og minutter:
```javascript
// Current time WITHOUT seconds
const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

// This is passed to bonus calculation
const bonusEarned = this.calculateBonus(shift.startTime, currentTimeStr, bonusSegments);
```

`timeToMinutes`-funksjonen behandler kun timer og minutter:
```javascript
timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}
```

## Resultatet
- **Grunnlønn**: Oppdateres kontinuerlig med millisekund-presisjon → sekund-for-sekund oppdatering
- **Tillegg**: Bruker kun time:minutt format uten sekunder → oppdateres kun når minuttet endres
- **Total lønn**: Sum av grunnlønn + tillegg, så denne oppdateres sekund-for-sekund på grunn av grunnlønnen

## Vurdering

### Er dette ønsket atferd?
Dette er **sannsynligvis ikke ønsket atferd** av følgende grunner:

1. **Inkonsistens**: Forskjellig oppdateringsfrekvens for forskjellige deler av lønnskalkulasjonen er forvirrende
2. **Brukeropplevelse**: Det kan virke som systemet ikke fungerer riktig når deler av lønnen "henger etter"
3. **Implementasjonslogikk**: Virker som en utilsiktet konsekvens av hvordan koden er strukturert

### Løsningsforslag

**Alternativ 1: Gjør alt minutt-for-minutt**
```javascript
// Rund ned timer arbeidet til nærmeste hele minutt
const minutesWorked = Math.floor(timeWorked / (1000 * 60));
const hoursWorked = minutesWorked / 60;
```

**Alternativ 2: Gjør alt sekund-for-sekund**
```javascript
// Inkluder sekunder i tillegg-kalkulasjonen
const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
```

**Alternativ 3: Reduser oppdateringsfrekvens**
```javascript
// Oppdater kun hvert minutt
this.nextShiftTimer = setInterval(() => {
    this.updateNextShiftCard();
}, 60000); // Update every minute
```

## Anbefaling
Jeg anbefaler **Alternativ 1** (minutt-for-minutt oppdatering) fordi:
- Det gir konsistent brukeropplevelse
- Det er mindre intensivt for systemet
- Det er mer intuitivt at lønn akkumuleres per minutt arbeidet
- Det stemmer overens med hvordan tillegg allerede fungerer

Alternativt kan dere velge **Alternativ 3** og bare redusere oppdateringsfrekvensen til hvert minutt, som er enkleste løsning og vil løse inkonsistensen uten store kodeendringer.