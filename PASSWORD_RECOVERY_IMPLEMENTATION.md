# Password Recovery Implementation

## Oversikt
Implementert komplett funksjonalitet for reset passord via e-post lenker i kalkulatoren.

## Hvordan det fungerer

### 1. Bruker ber om reset passord
- Bruker klikker "Glemt passord?" på innloggingssiden
- Fyller inn e-postadressen sin
- Klikker "Send tilbakestillings-link"
- Supabase sender en e-post med en recovery-lenke

### 2. Brukeren klikker på lenken i e-posten
- Lenken inneholder recovery tokens enten som:
  - Hash fragment: `#access_token=xxx&type=recovery&token_type=bearer`
  - Query parameters: `?access_token=xxx&type=recovery&token_type=bearer`
  - Legacy format: `?token=xxx&type=recovery`

### 3. Automatisk håndtering
- Hovedsiden (`/index.html`) detecterer recovery tokens og omdirigerer til `/kalkulator/index.html`
- Kalkulator-siden detecterer recovery tokens og viser reset passord-skjemaet automatisk
- Alle andre skjemaer (innlogging, registrering) skjules

### 4. Passord-reset
- Bruker fyller inn nytt passord (minimum 6 tegn)
- Bekrefter passordet
- Systemet validerer at recovery-sessionen er gyldig
- Oppdaterer passordet via Supabase
- Omdirigerer til kalkulatoren (`app.html`)

## Tekniske detaljer

### Funksjoner implementert:
- `handlePasswordRecovery()` - Detecterer recovery tokens i URL
- `isInRecoveryMode()` - Sjekker om vi er i recovery-modus
- `showPasswordResetForm()` - Viser reset-skjemaet
- `createPasswordResetForm()` - Lager reset-skjemaet dynamisk
- `updatePassword()` - Håndterer passord-oppdatering
- `cancelPasswordReset()` - Avbryter reset-prosessen

### Feilhåndtering:
- Validering av passord-lengde (minimum 6 tegn)
- Sammenligning av passord og bekreftelse
- Sjekk av gyldig recovery-session
- Bruker-vennlige feilmeldinger
- Automatisk deaktivering av knapper under oppdatering

### UI/UX forbedringer:
- Enter-key støtte for alle input-felt
- Loading-tilstand på knapper
- Automatisk fokus mellom felt
- Responsivt design som matcher resten av appen
- Tydelige success/error meldinger

## Testing

### Manuell testing:
1. Åpne `/test-recovery.html` for å teste forskjellige token-formater
2. Test recovery-lenker:
   - Hash-basert: `/kalkulator/index.html#access_token=test&type=recovery`
   - Query-basert: `/kalkulator/index.html?access_token=test&type=recovery`
   - Legacy: `/kalkulator/index.html?token=test&type=recovery`

### Ekte testing:
1. Gå til kalkulatoren og klikk "Glemt passord?"
2. Skriv inn en gyldig e-postadresse som er registrert
3. Sjekk e-posten og klikk på lenken
4. Test reset passord-funksjonaliteten

## Sikkerhet
- Recovery tokens håndteres av Supabase og har begrenset levetid
- Passord valideres før oppdatering
- Session verificeres før passord-endring
- Ingen sensitive data lagres i localStorage eller lignende
- Automatisk omdirigering etter vellykket reset

## Filer modifisert:
- `/kalkulator/js/auth.js` - Hovedlogikk for password recovery
- `/kalkulator/index.html` - Fjernet unødvendig HTML-form
- `/test-recovery.html` - Test-side for utvikling

## Kjente begrensninger:
- Recovery tokens må være gyldige i Supabase for å fungere
- Krever aktiv internettforbindelse til Supabase
- E-post må være bekreftet i Supabase for å motta recovery-lenker
