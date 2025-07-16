# Implementasjonsplan: Pausefunksjonalitet

## Database Migration
SQL-kommandoer er klar i `database-pause-migration.sql` - kjør disse i Supabase SQL Editor.

## 1. Innstillinger - Standard Pausetid

### A) Legg til i app.js konstanter:
```javascript
DEFAULT_PAUSE_START_HOURS: 2.5,    // Standard pause starter etter 2,5 timer
DEFAULT_PAUSE_DURATION: 0.5,       // Standard pause er 30 minutter
```

### B) Legg til i brukerinnstillinger:
```javascript
// I appLogic.js
pauseStartHours: 2.5,    // Timer etter vaktstart
pauseDuration: 0.5,      // Pause-varighet i timer
```

### C) UI i settings modal (app.html):
```html
<div class="form-group">
    <label>Standard pausetid</label>
    <div class="form-group-inline">
        <div>
            <label>Pause starter etter</label>
            <select id="pauseStartHours">
                <option value="1.5">1,5 timer</option>
                <option value="2.0">2 timer</option>
                <option value="2.5" selected>2,5 timer</option>
                <option value="3.0">3 timer</option>
                <option value="4.0">4 timer</option>
            </select>
        </div>
        <div>
            <label>Varighet</label>
            <select id="pauseDuration">
                <option value="0.25">15 min</option>
                <option value="0.5" selected>30 min</option>
                <option value="0.75">45 min</option>
                <option value="1.0">1 time</option>
            </select>
        </div>
    </div>
    <small class="form-hint">Standardverdier for nye vakter. Kan justeres per vakt.</small>
</div>
```

## 2. Current Shift Card - Pause Badge og Logikk

### A) Modifiser `calculateCurrentShiftEarnings` funksjon:
```javascript
calculateCurrentShiftEarnings(shift, now) {
    const shiftDate = new Date(shift.date);
    const [startHour, startMinute] = shift.startTime.split(':').map(Number);
    const shiftStartTime = new Date(shiftDate);
    shiftStartTime.setHours(startHour, startMinute, 0, 0);
    
    // Calculate time worked so far in hours
    const timeWorked = now - shiftStartTime;
    let hoursWorked = timeWorked / (1000 * 60 * 60);
    
    // Check if currently in pause
    const pauseStart = shift.pauseStartHours || this.pauseStartHours;
    const pauseDuration = shift.pauseDuration || this.pauseDuration;
    const isInPause = hoursWorked >= pauseStart && hoursWorked <= (pauseStart + pauseDuration);
    
    // Adjust hours worked if pause has been completed
    let paidHours = hoursWorked;
    if (hoursWorked > (pauseStart + pauseDuration)) {
        paidHours = hoursWorked - pauseDuration;
    } else if (isInPause) {
        // During pause - stop at pause start time
        paidHours = pauseStart;
    }
    
    // Rest of calculation...
    const wageRate = this.getCurrentWageRate();
    const baseEarned = paidHours * wageRate;
    
    return {
        totalHours: hoursWorked,
        paidHours: paidHours,
        isInPause: isInPause,
        pauseStart: pauseStart,
        pauseDuration: pauseDuration,
        baseEarned: baseEarned,
        bonusEarned: bonusEarned,
        totalEarned: baseEarned + bonusEarned
    };
}
```

### B) Legg til pause badge i `displayCurrentShiftCard`:
```javascript
displayCurrentShiftCard(currentShift, now) {
    // ... existing code ...
    const currentEarnings = this.calculateCurrentShiftEarnings(currentShift, now);
    
    // Lag pause badge
    const pauseBadge = currentEarnings.isInPause ? '<span class="pause-badge">Pause</span>' : '';
    const seriesBadge = currentShift.seriesId ? '<span class="series-badge">Serie</span>' : '';
    
    const html = `
        <div class="shift-item ${typeClass} active" data-shift-id="${currentShift.id}">
            <div class="shift-header">
                ${pauseBadge}
                ${seriesBadge}
                <span class="shift-date">${day}. ${this.MONTHS[shiftDate.getMonth()]}</span>
                <span class="shift-weekday">${this.WEEKDAYS[shiftDate.getDay()]}</span>
            </div>
            <!-- rest of HTML -->
        </div>
    `;
}
```

### C) CSS for pause badge:
```css
.pause-badge {
    background: #ff6b35;
    color: white;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
}
```

## 3. Vaktdetaljer Modal - Pause Justering

### A) Legg til pause-felt i shift details modal:
```html
<div class="pause-section">
    <h4>Pauseinnstillinger</h4>
    <div class="form-group">
        <label>Pause starter etter</label>
        <select id="editPauseStart">
            <option value="">Ingen pause</option>
            <option value="1.5">1,5 timer</option>
            <option value="2.0">2 timer</option>
            <option value="2.5">2,5 timer</option>
            <option value="3.0">3 timer</option>
            <option value="4.0">4 timer</option>
        </select>
    </div>
    <div class="form-group">
        <label>Pause-varighet</label>
        <select id="editPauseDuration">
            <option value="0.25">15 minutter</option>
            <option value="0.5">30 minutter</option>
            <option value="0.75">45 minutter</option>
            <option value="1.0">1 time</option>
        </select>
    </div>
</div>
```

### B) Oppdater `showShiftDetails` funksjon:
```javascript
showShiftDetails(shiftId) {
    const shift = this.shifts.find(s => s.id === shiftId);
    
    // Populate pause fields
    document.getElementById('editPauseStart').value = shift.pauseStartHours || '';
    document.getElementById('editPauseDuration').value = shift.pauseDuration || this.pauseDuration;
    
    // ... rest of function
}
```

## 4. Database Operasjoner

### A) Oppdater `addShift` funksjon:
```javascript
// I Supabase insert
const shiftData = {
    user_id: user.id,
    shift_date: finalDateStr,
    start_time: newShift.startTime,
    end_time: newShift.endTime,
    shift_type: newShift.type,
    series_id: seriesId,
    pause_start_hours: this.pauseStartHours,  // Standard verdi
    pause_duration_hours: this.pauseDuration  // Standard verdi
};
```

### B) Oppdater `updateShift` funksjon:
```javascript
const updateData = {
    shift_date: dateStr,
    start_time: startTime,
    end_time: endTime,
    shift_type: type,
    pause_start_hours: document.getElementById('editPauseStart').value || null,
    pause_duration_hours: parseFloat(document.getElementById('editPauseDuration').value)
};
```

### C) Oppdater `loadUserShifts` mapping:
```javascript
this.userShifts = data.map(s => ({
    id: s.id,
    date: new Date(s.shift_date + 'T00:00:00.000Z'),
    startTime: s.start_time,
    endTime: s.end_time,
    type: s.shift_type,
    seriesId: s.series_id || null,
    pauseStartHours: s.pause_start_hours,
    pauseDuration: s.pause_duration_hours || 0.5
}));
```

## 5. Endelig `calculateHours` oppdatering

Oppdater eksisterende `calculateHours` funksjon til å bruke lagret pause-data:

```javascript
calculateHours(shift) {
    // ... existing code ...
    
    let paidHours = durationHours;
    let adjustedEndMinutes = endMinutes;
    
    // Use stored pause data instead of fixed deduction
    if (shift.pauseStartHours && durationHours > shift.pauseStartHours) {
        const pauseDuration = shift.pauseDuration || 0.5;
        if (durationHours >= (shift.pauseStartHours + pauseDuration)) {
            paidHours -= pauseDuration;
            adjustedEndMinutes -= pauseDuration * 60;
        }
    }
    
    // ... rest of function
}
```

## Testing Sjekkliste

- [ ] Database migration kjørt
- [ ] Standard pauseinnstillinger fungerer
- [ ] Pause badge vises i current shift card
- [ ] Lønnsøkning stopper under pause
- [ ] Pause kan justeres fra vaktdetaljer
- [ ] Pause-data lagres og hentes fra database
- [ ] Eksisterende vakter fungerer (bakoverkompatibilitet)
- [ ] Endelig lønnsberegning inkluderer pause

## Fordeler med denne løsningen

✅ **Fleksibel**: Pause kan være forskjellig for hver vakt  
✅ **Transparent**: Brukeren ser når de er i pause  
✅ **Konsistent**: Samme logikk i live-visning og endelig beregning  
✅ **Brukervennlig**: Intuitive standardverdier som kan justeres  
✅ **Bakoverkompatibel**: Eksisterende vakter påvirkes ikke