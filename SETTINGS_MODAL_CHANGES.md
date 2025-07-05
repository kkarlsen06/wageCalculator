# Innstillinger Modal - Endringer

## Oversikt
Splittet "Konto & Data" fanen i innstillinger modalen i to separate faner: "Konto" og "Data". Lagt til periode-valg funksjonalitet for eksport av PDF og CSV.

## Endringer Implementert

### 1. HTML Endringer (`kalkulator/app.html`)
- **Fane struktur**: Endret fra 3 til 4 faner i innstillinger modalen
  - "Lønn & Beregning" (uendret)
  - "Brukergrensesnitt" (uendret)  
  - "Konto" (nytt - bare profil og kontoadministrasjon)
  - "Data" (nytt - eksport/import med periode-valg)

- **Ny periode-valg seksjon i Data fanen**:
  - Radio buttons for periode-valg: "Alle data", "Inneværende måned", "Egendefinert periode"
  - Dato-felt for egendefinert periode (vises kun når valgt)
  - Oppdaterte eksport knapper som kaller `app.exportDataWithPeriod()`

### 2. CSS Endringer (`kalkulator/css/style.css`)
- **Radio button styling**: Lagt til `.radio-option` stil for periode-valg
- **Hover effekter**: Grense-farge endring ved hover
- **Responsiv design**: Mobile-tilpasninger for radio buttons
- **Visuell feedback**: Aktiv tilstand markering for valgte alternativer

### 3. JavaScript Endringer (`kalkulator/js/appLogic.js`)

#### Nye Funksjoner:
- `setupExportPeriodOptions()`: Setter opp event listeners for periode-valg
- `updateCurrentMonthLabel()`: Oppdaterer etiketten for "inneværende måned" 
- `exportDataWithPeriod(format)`: Hovedfunksjon for eksport med periode-filtrering
- `importDataFromDataTab()`: Import funksjon for data fanen

#### Modifiserte Funksjoner:
- `switchSettingsTab()`: Støtte for ny 'data' fane og setup av periode-valg
- `updateHeader()`: Oppdaterer måned-etiketten i eksport valg

#### Periode-filtrering:
- **Alle data**: Eksporterer alle lagrede vakter
- **Inneværende måned**: Filtrerer basert på måned valgt i month-picker
- **Egendefinert periode**: Bruker start/slutt datoer fra dato-felt

### 4. Funksjonalitets Forbedringer

#### PDF Eksport:
- Bekreftet at `doc.save()` brukes for faktisk nedlasting
- Periode informasjon inkludert i PDF rapporten
- Dynamisk filnavn med dato

#### Validering:
- Sjekker at datoer er fylt ut for egendefinert periode
- Validerer at startdato er før sluttdato  
- Varsler hvis ingen vakter finnes i valgt periode

#### Brukeropplevelse:
- Automatisk oppsett av standard datoer for egendefinert periode
- Skjuler/viser egendefinert periode seksjon basert på valg
- Oppdaterer måned-etiketten dynamisk når bruker endrer måned

## Testing
- ✅ JavaScript syntax validering passert
- ✅ Lokal webserver startet for testing
- ✅ Alle nye funksjoner implementert uten syntax feil

## Kompatibilitet
- Beholder eksisterende funksjonalitet for den originale `exportData()` funksjonen
- Separate file input IDer for å unngå konflikter
- Bakoverkompatibel med eksisterende innstillinger struktur