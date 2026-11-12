import { searchNasaImages } from '../services/nasa.js';
import { searchConfirmedPlanets } from '../services/exoplanets.js';
import { formatDate, setStatus, escapeHTML } from '../services/http.js';

export function initExplore() {
  const form = document.getElementById('universe-search-form');
  const input = document.getElementById('universe-query');
  const modes = [...document.querySelectorAll('[data-mode]')];
  let mode = 'images';
  modes.forEach((button) => button.addEventListener('click', () => {
    mode = button.dataset.mode;
    modes.forEach((item) => item.classList.toggle('is-active', item === button));
    setStatus(document.getElementById('universe-search-status'), mode === 'images'
      ? 'Search NASA’s image and video media archive.'
      : 'Search the NASA Exoplanet Archive’s confirmed-planet table.');
  }));
  form?.addEventListener('submit', (event) => runSearch(event, mode));
  const query = new URLSearchParams(window.location.search).get('q');
  if (query && input) {
    input.value = query;
    form?.requestSubmit();
  }
}

async function runSearch(event, initialMode) {
  event.preventDefault();
  const mode = document.querySelector('[data-mode].is-active')?.dataset.mode || initialMode;
  const query = document.getElementById('universe-query')?.value.trim();
  const status = document.getElementById('universe-search-status');
  const results = document.getElementById('universe-results');
  if (!query || !results) return;
  results.replaceChildren();
  setStatus(status, mode === 'images' ? 'Searching NASA media…' : 'Querying confirmed planetary systems…');
  try {
    if (mode === 'images') {
      const records = await searchNasaImages(query, 18);
      if (!records.length) throw new Error('No media records found.');
      results.className = 'universe-results media-results-grid';
      results.innerHTML = records.map((item) => `
        <article class="media-result compact-result"><a class="media-result-image" href="${escapeHTML(item.source)}" target="_blank" rel="noopener noreferrer"><img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.title)}" loading="lazy"></a>
        <div class="media-result-copy"><span class="data-label">${escapeHTML(item.center)} · ${escapeHTML(formatDate(item.date))}</span><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.description.slice(0, 160))}</p><a class="source-link" href="${escapeHTML(item.source)}" target="_blank" rel="noopener noreferrer">NASA record <span class="i i-up-right" aria-hidden="true"></span></a></div></article>`).join('');
      setStatus(status, `${records.length} NASA media records found. Media catalogue records are not scientific classifications.`);
    } else {
      const records = await searchConfirmedPlanets(query);
      if (!records.length) throw new Error('No matching confirmed-planet records found.');
      results.className = 'universe-results planet-results';
      results.innerHTML = records.map((row) => `
        <article class="planet-result"><div class="data-label">Confirmed record · ${escapeHTML(row.disc_year ?? 'year not listed')}</div>
        <h3>${escapeHTML(row.pl_name)}</h3><p>Host star: ${escapeHTML(row.hostname || 'Not listed')}</p>
        <dl class="planet-measures"><div><dt>Method</dt><dd>${escapeHTML(row.discoverymethod || '—')}</dd></div><div><dt>Radius</dt><dd>${row.pl_rade == null ? '—' : `${escapeHTML(row.pl_rade)} R⊕`}</dd></div><div><dt>Mass</dt><dd>${row.pl_bmasse == null ? '—' : `${escapeHTML(row.pl_bmasse)} M⊕`}</dd></div><div><dt>Period</dt><dd>${row.pl_orbper == null ? '—' : `${escapeHTML(row.pl_orbper)} days`}</dd></div></dl></article>`).join('');
      setStatus(status, `${records.length} archive records returned from PSCompPars. Values may be absent where the archive has no measurement.`);
    }
  } catch (error) {
    setStatus(status, `Search unavailable: ${error.message}`, 'error');
  }
}
