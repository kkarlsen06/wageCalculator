# Kompensasjonskalkulator

Dette er en webapplikasjon for å regne ut lønn basert på vakter, arbeidstid og tariffbasert timelønn. Den er laget for ansatte med varierende arbeidstid, og støtter både grunnlønn og tillegg.

🌐 **Live-versjon**

Se nettsiden live her: www.kkarlsen.art

- **Portfolio/hovedside**: `kkarlsen.art`
- **Kalkulator**: `kkarlsen.art/kalkulator`

🚀 **Funksjoner**
- Innlogging og registrering
- Tilbakestilling av passord
- Oversikt over lønn, timer og vakter
- Automatisk pausetrekk ved vakter over 5,5 timer
- Tariffbasert lønnssystem (Virke 2025)
- Tillegg for helg og helligdager
- Instillinger for tilpasning

🗂️ **Struktur**

```
kompensasjonskalkulator/
│
├── index.html              # Portfolio/hovedside
├── css/
│   └── main.css           # CSS for hovedsiden
├── kalkulator/            # Kalkulatorappen
│   ├── index.html         # Innlogging
│   ├── app.html           # Hovedkalkulator
│   ├── css/
│   │   └── style.css      # CSS for kalkulatoren
│   └── js/
│       ├── auth.js        # Autentisering
│       ├── app.js         # UI-kontroller
│       └── appLogic.js    # Forretningslogikk
└── _redirects             # Netlify redirects
```

🧪 Lokalt oppsett
	1.	Klon repoet:
        ```bash
        git clone https://github.com/kkarlsen-productions/kompensasjonskalkulator.git
        cd kompensasjonskalkulator
	2.	Åpne index.html i nettleseren din.

📜 Lisens
MIT © 2025 Hjalmar Samuel Kristensen-Karlsen
