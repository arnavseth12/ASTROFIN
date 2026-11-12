import { getApod, searchNasaImages } from '../services/nasa.js';
import { getNews } from '../services/news.js';
import { getUpcomingLaunches } from '../services/launches.js';
import { getCandidateTargets, searchConfirmedPlanets } from '../services/exoplanets.js';
import { models, calculateTransitDepth, CONSTANTS } from '../core/physics.js';

export function initDiagnostics() {
  const button = document.getElementById('run-diagnostics');
  button?.addEventListener('click', runDiagnostics);
  runLocalChecks();
}

function addResult(container, label, state, detail) {
  const row = document.createElement('article');
  row.className = 'diagnostic-row';
  row.dataset.state = state;

  const heading = document.createElement('div');
  heading.className = 'diagnostic-row-heading';

  const name = document.createElement('strong');
  name.textContent = label;

  const badge = document.createElement('span');
  badge.className = 'diagnostic-state';
  badge.textContent = state[0].toUpperCase() + state.slice(1);

  const description = document.createElement('p');
  description.textContent = detail;

  heading.append(name, badge);
  row.append(heading, description);
  container.append(row);
  return row;
}

function runLocalChecks() {
  const container = document.getElementById('local-diagnostic-results');
  if (!container) return;
  container.replaceChildren();

  try {
    const earthSpeed = models.escapeVelocity.calculate({
      mass: CONSTANTS.M_EARTH,
      radius: CONSTANTS.R_EARTH
    });
    const transit = calculateTransitDepth(1, 1);

    if (Math.abs(earthSpeed - 11186) > 30) throw new Error('Earth escape-speed check was outside its expected range.');
    if (Math.abs(transit - 0.0000839) > 0.000001) throw new Error('Transit-depth check was outside its expected range.');

    addResult(container, 'Physics calculation engine', 'passed', `Offline checks passed. Earth escape speed: ${(earthSpeed / 1000).toFixed(3)} km/s. A 1 R⊕ planet across a 1 R☉ star: ${(transit * 1e6).toFixed(1)} ppm.`);
  } catch (error) {
    addResult(container, 'Physics calculation engine', 'failed', error.message);
  }
}

async function runDiagnostics() {
  const button = document.getElementById('run-diagnostics');
  const container = document.getElementById('api-diagnostic-results');
  const summary = document.getElementById('diagnostic-summary');
  if (!container) return;

  button.disabled = true;
  button.textContent = 'Testing services…';
  container.replaceChildren();
  if (summary) summary.textContent = 'Testing public data services from this browser. Results can differ by network or provider availability.';

  const checks = [
    ['NASA APOD feed', async () => {
      const item = await getApod();
      if (!item.title || !item.pageUrl) throw new Error('The feed responded but required APOD fields were missing.');
      return `${item.title} · ${item.date || 'date not supplied'} · ${item.mediaType}`;
    }],
    ['NASA Image and Video Library', async () => {
      const items = await searchNasaImages('Saturn', 2);
      if (!items.length) throw new Error('The API responded, but this test query returned no image previews.');
      return `${items.length} image preview(s) returned for “Saturn”.`;
    }],
    ['Spaceflight News API', async () => {
      const items = await getNews(1);
      if (!items.length) throw new Error('The API responded, but no article was returned.');
      return `Latest article: ${items[0].title}`;
    }],
    ['Launch Library 2', async () => {
      const items = await getUpcomingLaunches(1);
      if (!items.length) throw new Error('The API responded, but no upcoming launch was returned.');
      return `Upcoming record: ${items[0].name} · ${items[0].status}`;
    }],
    ['NASA Exoplanet Archive — confirmed planets', async () => {
      const items = await searchConfirmedPlanets('Kepler', 1);
      if (!items.length) throw new Error('No confirmed-planet records matched the test query.');
      return `Archive record: ${items[0].pl_name} · host ${items[0].hostname || 'not listed'}.`;
    }],
    ['NASA Exoplanet Archive — TESS candidates', async () => {
      const items = await getCandidateTargets(10);
      if (!items.length) throw new Error('The TOI table returned no candidate records.');
      return `${items.length} TOI candidate/ambiguous-candidate record(s) returned.`;
    }]
  ];

  let passed = 0;
  for (const [label, check] of checks) {
    const row = addResult(container, label, 'checking', 'Request in progress…');
    try {
      const detail = await check();
      row.dataset.state = 'passed';
      row.querySelector('.diagnostic-state').textContent = 'Passed';
      row.querySelector('p').textContent = detail;
      passed += 1;
    } catch (error) {
      row.dataset.state = 'failed';
      row.querySelector('.diagnostic-state').textContent = 'Failed';
      row.querySelector('p').textContent = error.message || String(error);
    }
  }

  const total = checks.length;
  if (summary) summary.textContent = `${passed} of ${total} external service checks passed. The physics engine is tested separately above and does not require an API.`;
  button.disabled = false;
  button.textContent = 'Run checks again';
}
