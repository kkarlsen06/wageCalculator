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

### AI-drevet Chat-assistent
- Intelligent chatbot for vaktregistrering
- Naturlig språkbehandling på norsk
- Automatisk parsing av vaktinformasjon
- Støtte for enkeltskift og skiftserier
- Redigering og sletting av eksisterende vakter

### Innstillinger
- Tilpassbare lønnsrater
- Personlige preferanser
- Fleksible innstillinger for ulike arbeidsforhold

## 🛠️ Teknologi

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Netlify Functions (Node.js)
- **AI Integration**: OpenAI GPT-4o-mini for chat functionality
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: Responsivt design med moderne CSS
- **Hosting**: Netlify

## 🗂️ Prosjektstruktur

```
wageCalculator/
│
├── index.html              # Portfolio/hovedside
├── css/
│   └── style.css          # Styling for hovedsiden
├── kalkulator/            # Kalkulatorapplikasjon
│   ├── index.html         # Hovedapplikasjon
│   ├── login.html         # Innloggingsside
│   ├── css/
│   │   └── style.css      # Styling for kalkulatoren
│   └── js/
│       ├── auth.js        # Autentisering og brukerhåndtering
│       ├── app.js         # UI-kontrollere og brukerinteraksjon
│       ├── appLogic.js    # Forretningslogikk og beregninger
│       └── config.js      # Konfigurasjon (Supabase keys)
├── netlify/
│   └── functions/
│       └── chat.js        # Serverless chat function (OpenAI + Supabase)
├── server.js              # Legacy Express server (for local dev)
├── package.json           # Node.js dependencies
├── netlify.toml           # Netlify configuration
├── _redirects             # Netlify redirects og routing
└── README.md              # Prosjektdokumentasjon
```

## 🧪 Lokalt oppsett

### Forutsetninger
- Node.js >=22
- npm eller yarn
- Netlify CLI (for serverless functions)

### Installasjon

1. **Klon repositoriet:**
   ```bash
   git clone https://github.com/kkarlsen06/wageCalculator.git
   cd wageCalculator
   ```

2. **Installer avhengigheter:**
   ```bash
   npm install
   ```

3. **Installer Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

4. **Sett opp miljøvariabler:**
   Opprett en `.env` fil i prosjektets rot med følgende variabler:
   ```env
   OPENAI_API_KEY=your_openai_api_key
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

### Lokal utvikling

**Med Netlify Functions (anbefalt for produksjon-lignende miljø):**
```bash
netlify dev
```
Dette starter en lokal server på `http://localhost:8888` med full støtte for serverless functions.

**Med Express server (legacy):**
```bash
npm start
```
Dette starter Express-serveren på `http://localhost:5173`.

### Deployment til Netlify

1. **Koble til Netlify:**
   ```bash
   netlify init
   ```

2. **Sett miljøvariabler i Netlify Dashboard:**
   - Gå til Site Settings → Environment Variables
   - Legg til:
     - `OPENAI_API_KEY`
     - `SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY`

3. **Deploy:**
   ```bash
   netlify deploy --prod
   ```

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
