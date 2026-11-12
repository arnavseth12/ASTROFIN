import { getCandidateTargets, findCandidate } from '../services/exoplanets.js';
import { setStatus, escapeHTML } from '../services/http.js';
import { formatScientific } from '../core/physics.js';

let candidates = [];

export function initResearch() {
  document.getElementById('target-search-form')?.addEventListener('submit', searchOne);
  document.getElementById('reload-candidates')?.addEventListener('click', loadCandidates);
  loadCandidates();
}

async function loadCandidates() {
  const status = document.getElementById('candidate-status');
  setStatus(status, 'Requesting the latest candidate coordinates from the NASA Exoplanet Archive…');
  try {
    candidates = await getCandidateTargets(120);
    if (!candidates.length) throw new Error('The TOI table returned no matching rows.');
    renderMap(candidates);
    renderList(candidates);
    setStatus(status, `${candidates.length} TOI records retrieved. PC and APC dispositions are shown separately; a candidate is not a confirmed planet.`);
  } catch (error) {
    setStatus(status, `Candidate catalogue unavailable: ${error.message}`, 'error');
    const list = document.getElementById('candidate-record-list');
    if (list) list.textContent = 'The archive could not be reached. Try again later or open the NASA Exoplanet Archive directly.';
  }
}

async function searchOne(event) {
  event.preventDefault();
  const query = document.getElementById('target-query')?.value.trim();
  if (!query) return;
  setStatus(document.getElementById('candidate-status'), `Looking up ${query}…`);
  try {
    const records = await findCandidate(query);
    if (!records.length) throw new Error('No target record matched that identifier.');
    inspect(records[0]);
    setStatus(document.getElementById('candidate-status'), `Archive record found for ${query}.`);
  } catch (error) {
    setStatus(document.getElementById('candidate-status'), error.message, 'error');
  }
}

function renderMap(rows) {
  const svg = document.getElementById('candidate-sky-map');
  if (!svg) return;
  const NS = 'http://www.w3.org/2000/svg';
  svg.replaceChildren();
  const add = (tag, attrs, parent = svg) => {
    const node = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    parent.append(node);
    return node;
  };
  for (let ra = 0; ra <= 360; ra += 30) {
    const x = ra / 360 * 900;
    add('line', { x1: x, y1: 0, x2: x, y2: 430, class: 'map-gridline' });
    const anchor = ra === 0 ? 'start' : ra === 360 ? 'end' : 'middle';
    const label = add('text', { x: ra === 0 ? x + 6 : ra === 360 ? x - 6 : x, y: 420, class: 'map-axis-label', 'text-anchor': anchor });
    label.textContent = `${ra}°`;
  }
  for (let dec = -60; dec <= 60; dec += 30) {
    const y = (90 - dec) / 180 * 430;
    add('line', { x1: 0, y1: y, x2: 900, y2: y, class: 'map-gridline' });
    const label = add('text', { x: 7, y: y - 5, class: 'map-axis-label' });
    label.textContent = `${dec > 0 ? '+' : ''}${dec}°`;
  }
  rows.forEach((row) => {
    if (!Number.isFinite(Number(row.ra)) || !Number.isFinite(Number(row.dec))) return;
    const circle = add('circle', {
      cx: Number(row.ra) / 360 * 900,
      cy: (90 - Number(row.dec)) / 180 * 430,
      r: 4.2,
      class: row.tfopwg_disp === 'PC' ? 'candidate-point candidate-point-pc' : 'candidate-point candidate-point-apc',
      tabindex: 0,
      role: 'button',
      'aria-label': `TOI ${row.toi}, ${row.tfopwg_disp}`
    });
    circle.dataset.toi = row.toi;
    circle.addEventListener('click', () => inspect(row));
    circle.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); inspect(row); }
    });
  });
  const count = document.getElementById('map-count');
  if (count) count.textContent = `${rows.length} targets plotted`;
}

function renderList(rows) {
  const list = document.getElementById('candidate-record-list');
  if (!list) return;
  list.innerHTML = rows.slice(0, 30).map((row) => `<button type="button" class="candidate-row" data-toi="${escapeHTML(row.toi)}"><span class="candidate-row-id">TOI ${escapeHTML(row.toi)}</span><span class="candidate-row-disposition">${escapeHTML(row.tfopwg_disp)}</span><span class="candidate-row-coord">RA ${formatScientific(Number(row.ra), 4)}° / Dec ${formatScientific(Number(row.dec), 4)}°</span><span class="i i-right" aria-hidden="true"></span></button>`).join('');
  list.querySelectorAll('[data-toi]').forEach((button) => button.addEventListener('click', () => {
    const row = rows.find((candidate) => String(candidate.toi) === button.dataset.toi);
    if (row) inspect(row);
  }));
}

function markSelected(toi) {
  document.querySelectorAll('[data-toi]').forEach((node) => {
    const selected = String(node.dataset.toi) === String(toi);
    node.classList.toggle('is-selected', selected);
    if (node.tagName === 'BUTTON') {
      if (selected) node.setAttribute('aria-current', 'true');
      else node.removeAttribute('aria-current');
    }
  });
}

function inspect(row) {
  markSelected(row.toi);
  setText('selected-toi-index', `TOI ${row.toi}`);
  setText('target-inspector-title', `TOI ${row.toi}`);
  setText('target-inspector-summary', row.tfopwg_disp === 'PC'
    ? 'The archive currently classifies this record as a planetary candidate (PC). It is not a confirmed planet.'
    : 'The archive currently classifies this record as an ambiguous planetary candidate (APC). Additional validation is required.');
  const measurements = document.getElementById('target-measurements');
  const items = [
    ['TIC identifier', row.tid ?? row.tic_id], ['Disposition', row.tfopwg_disp],
    ['Orbital period', row.pl_orbper == null ? null : `${row.pl_orbper} days`],
    ['Estimated radius', row.pl_rade == null ? null : `${row.pl_rade} Earth radii`],
    ['Equilibrium temperature', row.pl_eqt == null ? null : `${row.pl_eqt} K`],
    ['TESS magnitude', row.st_tmag], ['Right ascension', row.ra == null ? null : `${row.ra}°`],
    ['Declination', row.dec == null ? null : `${row.dec}°`]
  ];
  if (measurements) measurements.innerHTML = items.map(([label, value]) => `<div><dt>${escapeHTML(label)}</dt><dd>${escapeHTML(value ?? 'Not listed')}</dd></div>`).join('');
  const link = document.getElementById('target-archive-link');
  if (link) link.href = `https://exoplanetarchive.ipac.caltech.edu/overview/${encodeURIComponent(`TOI-${row.toi}`)}`;
}

function setText(id, value) {
  const node = document.getElementById(id);
  if (node) node.textContent = value ?? '—';
}
