# Analyse: Pausetrekk i Current Shift Kortet

## Problemstilling
Hvordan tas pausetrekk med i betraktning (eller ignoreres fullstendig) i det aktive vaktkortet som vises under pågående vakter?

## Hovedfunn

### ⚠️ **KRITISK: Pausetrekk ignoreres i live-beregninger**

Det aktive vaktkortet (current shift card) **ignorerer fullstendig pausetrekk** under pågående vakter, selv når vakten er over 5,5 timer.

## Detaljert Analyse

### 1. Pausetrekk-systemet i applikasjonen

#### Konstanter og innstillinger:
```javascript
PAUSE_THRESHOLD: 5.5,     // Timer som utløser pausetrekk
PAUSE_DEDUCTION: 0.5,     // Antall timer som trekkes fra (30 minutter)
pauseDeduction: true,     // Brukerinnstilling (kan skrus av/på)
```

#### Brukergrensesnitt:
- Innstilling i settings: "Pausetrekk" toggle
- Beskrivelse: "Trekk fra betalt pause for vakter over 5,5 timer"
- Standard: **Aktivert** (`checked`)

### 2. Hvor pausetrekk BLIR anvendt

#### A) Final vaktberegning (`calculateHours` funksjon):
```javascript
// Apply pause deduction if enabled
if (this.pauseDeduction && durationHours > this.PAUSE_THRESHOLD) {
    paidHours -= this.PAUSE_DEDUCTION;
    adjustedEndMinutes -= this.PAUSE_DEDUCTION * 60;
}
```

**Anvendes i:**
- Vaktliste (historiske vakter)
- Statistikk og totaler
- Endelig lønnsberegning

### 3. Hvor pausetrekk IKKE blir anvendt

#### A) Live-beregning i current shift card (`calculateCurrentShiftEarnings`):
```javascript
calculateCurrentShiftEarnings(shift, now) {
    // Calculate time worked so far in hours
    const timeWorked = now - shiftStartTime;
    const hoursWorked = timeWorked / (1000 * 60 * 60);
    
    // Calculate base earnings so far
    const baseEarned = hoursWorked * wageRate;
    
    // ❌ INGEN PAUSETREKK HER!
    
    return {
        totalHours: hoursWorked,      // Rå timer uten pausetrekk
        baseEarned: baseEarned,       // Grunnlønn uten pausetrekk
        bonusEarned: bonusEarned,     // Tillegg beregnet på full tid
        totalEarned: baseEarned + bonusEarned  // Total uten pausetrekk
    };
}
```

## Konsekvenser av denne implementasjonen

### 1. **Brukerforvirring**
- **Under vakten**: Bruker ser f.eks. 1200 kr for 6-timers vakt
- **Etter vakten**: Samme vakt viser 1120 kr (80 kr mindre pga. pausetrekk)
- **Inkonsistens**: Forskjellige beløp for samme vakt

### 2. **Upresise forventninger**
- Brukere tror de tjener mer enn de faktisk gjør
- Pausetrekk kommer som en "negativ overraskelse"
- Manglende transparens i lønnssystemet

### 3. **Tidsforskjell i beregninger**
- **Live**: Baselønn oppdateres sekund-for-sekund (uten pausetrekk)
- **Live**: Tillegg oppdateres sekund-for-sekund med `calculateBonusWithSeconds`
- **Final**: Minutt-basert beregning med pausetrekk

## Løsningsforslag

### Alternativ 1: **Implementer pausetrekk i live-beregning** ⭐ (ANBEFALT)

Modifiser `calculateCurrentShiftEarnings` til å inkludere pausetrekk:

```javascript
calculateCurrentShiftEarnings(shift, now) {
    const shiftDate = new Date(shift.date);
    const [startHour, startMinute] = shift.startTime.split(':').map(Number);
    const shiftStartTime = new Date(shiftDate);
    shiftStartTime.setHours(startHour, startMinute, 0, 0);
    
    // Calculate time worked so far in hours
    const timeWorked = now - shiftStartTime;
    let hoursWorked = timeWorked / (1000 * 60 * 60);
    
    // Apply pause deduction if enabled and threshold is met
    let paidHours = hoursWorked;
    if (this.pauseDeduction && hoursWorked > this.PAUSE_THRESHOLD) {
        paidHours = hoursWorked - this.PAUSE_DEDUCTION;
    }
    
    // Get wage rate and bonuses
    const wageRate = this.getCurrentWageRate();
    const bonuses = this.getCurrentBonuses();
    const bonusType = shift.type === 0 ? 'weekday' : (shift.type === 1 ? 'saturday' : 'sunday');
    const bonusSegments = bonuses[bonusType] || [];
    
    // Calculate earnings based on PAID hours
    const baseEarned = paidHours * wageRate;
    
    // For bonus calculation, use adjusted end time
    const adjustedMinutes = (paidHours * 60) + (startHour * 60) + startMinute;
    const adjustedHour = Math.floor(adjustedMinutes / 60) % 24;
    const adjustedMinute = adjustedMinutes % 60;
    const adjustedTimeStr = `${adjustedHour.toString().padStart(2, '0')}:${adjustedMinute.toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    const bonusEarned = this.calculateBonusWithSeconds(shift.startTime, adjustedTimeStr, bonusSegments);
    
    return {
        totalHours: hoursWorked,              // Faktiske timer arbeidet
        paidHours: paidHours,                 // Timer som betales
        pauseDeducted: this.pauseDeduction && hoursWorked > this.PAUSE_THRESHOLD,
        baseEarned: baseEarned,               // Grunnlønn basert på betalte timer
        bonusEarned: bonusEarned,             // Tillegg basert på betalte timer
        totalEarned: baseEarned + bonusEarned // Total basert på betalte timer
    };
}
```

### Alternativ 2: **Vis pausetrekk-info i UI**

Legg til visual indikator når pausetrekk vil bli anvendt:

```html
<div class="pause-warning" style="display: ${hoursWorked > 5.5 && pauseDeduction ? 'block' : 'none'}">
    <small>⚠️ Pausetrekk på 30 min vil bli trukket fra ved vaktens slutt</small>
</div>
```

### Alternativ 3: **Real-time pausetrekk indikator**

Vis både "brutto" og "netto" beløp i live-visningen:

```html
<div class="earnings-breakdown">
    <div class="gross-earnings">Brutto: 1200 kr</div>
    <div class="pause-deduction">- Pausetrekk: 80 kr</div>
    <div class="net-earnings">Netto: 1120 kr</div>
</div>
```

## Anbefaling

**Implementer Alternativ 1** for å sikre konsistens mellom live-visning og endelig beregning. Dette vil:

✅ Eliminere brukerforvirring  
✅ Gi korrekte forventninger  
✅ Sikre transparens i lønnssystemet  
✅ Matche eksisterende pausetrekk-logikk  

Tillegg: Kombinér med Alternativ 2 for ekstra tydlighet når pausetrekk blir anvendt.