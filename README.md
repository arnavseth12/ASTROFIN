# ASTRO — Independent Astronomy Observatory

ASTRO is a multi-page astronomy and astrophysics project built around public scientific sources, transparent calculations, and lightweight interactive models. The visual system is intentionally restrained: image-led pages, editorial typography, fine rules, instrument-style metadata, and layouts chosen for each page's purpose.

## Run locally on Windows

1. Extract the project.
2. Open the folder containing `package.json` in VS Code.
3. Open **Terminal → New Terminal**.
4. Confirm Node and npm are available:

```powershell
node --version
npm --version
```

5. Install dependencies and start Vite:

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`. Do not double-click an HTML file; the project uses JavaScript modules and a development proxy.

Node.js 20.19+ is required by Vite 8. Node 22 or 24 is suitable.

## Commands

```powershell
npm test       # physics and endpoint tests
npm run build  # production build to dist/
npm run preview
```

## Pages

- `index.html` — image-led homepage, daily briefing, search and project index
- `observatory.html` — NASA Astronomy Picture of the Day and NASA media search
- `news.html` — Spaceflight News reporting feed
- `explore.html` — NASA media search and confirmed exoplanet lookup
- `research.html` — TESS Objects of Interest candidate workspace
- `laboratory.html` — browser-based physics calculators and transit-depth model
- `simulations.html` — lightweight 3D circular-orbit model
- `missions.html` — upcoming launch records
- `discoveries.html` — curated research pathways and scientific context
- `about.html` — project purpose, sources, attribution and data policy
- `diagnostics.html` — offline calculation checks and live service checks

## Data services

The current integrations do not require API keys:

| Provider | Use | Endpoint |
|---|---|---|
| NASA APOD feed | Daily astronomy image | `https://science.nasa.gov/wp-json/wp/v2/apod-basic/` |
| NASA Image and Video Library | Searchable NASA media | `https://images-api.nasa.gov/search` |
| Spaceflight News API v4 | Aggregated spaceflight reporting | `https://api.spaceflightnewsapi.net/v4/articles/` |
| Launch Library 2 | Upcoming launch records | `https://ll.thespacedevs.com/2.3.0/launches/upcoming/` |
| NASA Exoplanet Archive TAP | Confirmed planets and TESS TOIs | `https://exoplanetarchive.ipac.caltech.edu/TAP/sync` |

API endpoints are configured in `src/js/config.js`. Provider request code belongs in `src/js/services/`; page modules render the returned data. Do not paste API URLs into individual HTML pages.

### Exoplanet Archive and TESS identifiers

The Exoplanet Archive uses different column names in different tables:

- `pscomppars` (confirmed planets) uses its own confirmed-planet schema.
- `toi` (TESS Objects of Interest) uses **`tid`** for the TIC identifier. It does not use `tic_id`.

ASTRO queries `tid` from the TOI table and maps it to `tic_id` as a compatibility alias for the existing interface. A TOI disposition of `PC` or `APC` is not a confirmed planet.

Local development uses a Vite same-origin proxy:

- Browser path: `/api/exoplanet-archive/TAP/sync`
- Upstream: `https://exoplanetarchive.ipac.caltech.edu/TAP/sync`

The proxy is configured in `vite.config.js` for development and preview. Restart Vite after changing proxy settings.

GitHub Pages is static and cannot run this proxy. For live Exoplanet Archive searches after deployment, configure `VITE_EXOPLANET_TAP_URL` to a server-side proxy you control, or publish a dated static data snapshot. Never put private credentials in a `VITE_` variable; Vite bundles those values into public client code.

### Service limits and planned sources

- Launch Library 2 has a non-authenticated rate limit of 15 requests per hour. ASTRO caches responses locally for 30 minutes; avoid repeatedly running diagnostics.
- MAST / STScI is a planned source for TESS observation products and light curves: `https://mast.stsci.edu/api/v0/`
- JPL Horizons is a planned source for accurate ephemerides: `https://ssd-api.jpl.nasa.gov/doc/horizons.html`. Use a server-side proxy if required; do not expose private credentials in browser code.

## Scientific integrity

ASTRO distinguishes observed, archived, confirmed, candidate, calculated, and simulated information. The TESS workspace displays the archive's candidate dispositions; a candidate is not a confirmed planet. The transit plot is a simplified geometric model, not observed photometry. The 3D orbit is a scaled Newtonian circular-orbit visualization, not a physical scale model.

Calculations use SI units internally and display their assumptions. Scientific values should retain units, uncertainties, retrieval dates and model assumptions where available. Follow source links before using data in independent research.

## Project structure

```text
astro-platform/
├── index.html and the other page HTML files
├── package.json
├── vite.config.js
├── .env.example
├── public/
│   └── favicon.svg
├── src/
│   ├── styles/main.css
│   └── js/
│       ├── main.js
│       ├── config.js
│       ├── core/physics.js
│       ├── data/editorial.js
│       ├── services/   # shared HTTP and provider clients
│       └── pages/      # page-specific initialisation
├── tests/
└── .github/workflows/deploy.yml
```

## GitHub Pages

The included GitHub Actions workflow builds `dist/` and publishes it. Push the project to the `main` branch, then open repository **Settings → Pages** and select **GitHub Actions** as the source. GitHub Pages hosts the frontend only; it does not host Python or the Exoplanet Archive proxy.
