# Kompensasjonskalkulator

En moderne webapplikasjon for å beregne lønn basert på vakter, arbeidstid og tariffbaserte timelønn. Applikasjonen er spesielt utviklet for ansatte med varierende arbeidstid og støtter komplekse lønnssystemer med grunnlønn og ulike tillegg.

## 🌐 Live-versjon

**Hovedside**: [kkarlsen.art](https://kkarlsen.art)  
**Kalkulator**: [kkarlsen.art/kalkulator](https://kkarlsen.art/kalkulator)

## 🚀 Funksjoner

### Autentisering
- Sikker innlogging og registrering
- Tilbakestilling av passord via e-post
- Brukerkontoer med personlige innstillinger

### Lønnssystem
- Tariffbasert lønnssystem (Virke 2025)
- Automatisk beregning av grunnlønn
- Tillegg for helg og helligdager
- Overtidstillegg og spesialtillegg
- Automatisk pausetrekk ved vakter over 5,5 timer

### Vaktregistrering
- Enkel registrering av arbeidsvakter
- Automatisk beregning av arbeidstimer
- Oversikt over lønn, timer og vakter
- Historikk over tidligere vakter

### Innstillinger
- Tilpassbare lønnsrater
- Personlige preferanser
- Fleksible innstillinger for ulike arbeidsforhold

## 🛠️ Teknologi

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Styling**: Responsivt design med moderne CSS
- **Hosting**: Netlify
- **Database**: LocalStorage (planlagt: Firebase/Supabase)

## 🗂️ Prosjektstruktur

```
kompensasjonskalkulator/
│
├── index.html              # Portfolio/hovedside
├── css/
│   └── main.css           # Styling for hovedsiden
├── kalkulator/            # Kalkulatorapplikasjon
│   ├── index.html         # Innloggingsside
│   ├── app.html           # Hovedkalkulator
│   ├── css/
│   │   └── style.css      # Styling for kalkulatoren
│   └── js/
│       ├── auth.js        # Autentisering og brukerhåndtering
│       ├── app.js         # UI-kontrollere og brukerinteraksjon
│       └── appLogic.js    # Forretningslogikk og beregninger
├── _redirects             # Netlify redirects og routing
└── README.md              # Prosjektdokumentasjon
```

## 🧪 Lokalt oppsett

1. **Klon repositoriet:**
   ```bash
   git clone https://github.com/kkarlsen-productions/kompensasjonskalkulator.git
   cd kompensasjonskalkulator
   ```

2. **Åpne i nettleser:**
   - Åpne `index.html` for hovedsiden
   - Naviger til `kalkulator/index.html` for kalkulatoren
   - Eller bruk en lokal webserver for best opplevelse

3. **Utvikling:**
   ```bash
   # Eksempel med Python (valgfritt)
   python -m http.server 8000
   # Gå til http://localhost:8000
   ```

## 🔧 Miljøvariabler

For å kjøre applikasjonen lokalt med backend-funksjonalitet (chat, innstillinger), må du sette opp miljøvariabler:

### Lokal utvikling
```bash
# Kopier eksempelfilen og tilpass verdier
cp .env.local.example .env.local

# Start utviklingsserver
npm run dev
```

### Produksjon (Netlify)
Frontend ruter nå alle API-kall via Netlify-proxy (`/api`). Ingen miljøvariabler for API-base er nødvendig.

## 📱 Responsivt design

Applikasjonen er fullt responsiv og fungerer på:
- Desktop-datamaskiner
- Nettbrett
- Mobiltelefoner

## 🔒 Sikkerhet

- Sikker håndtering av brukerdata
- Ingen sensitive data lagres i klartext
- HTTPS-tilkobling i produksjon

## 🤝 Bidrag

Vi ønsker bidrag velkommen! For å bidra:
1. Fork repositoriet
2. Opprett en feature branch
3. Commit dine endringer
4. Push til branchen
5. Åpne en Pull Request

## 📞 Kontakt

**Utvikler**: Hjalmar Samuel Kristensen-Karlsen  
**Portfolio**: [kkarlsen.art](https://kkarlsen.art)  
**GitHub**: [kkarlsen-productions](https://github.com/kkarlsen-productions)

## 📜 Lisens

MIT © 2025 Hjalmar Samuel Kristensen-Karlsen

---

*Denne applikasjonen er utviklet for å forenkle lønnsberegninger for ansatte med varierende arbeidstid og komplekse tariffavtaler.*
