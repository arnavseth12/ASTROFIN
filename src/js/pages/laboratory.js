import { models, calculateTransitDepth, formatScientific, CONSTANTS } from '../core/physics.js';

let selectedModel = 'escapeVelocity';
let lastTransitDepth = null;

export function initLaboratory() {
  const choices = [...document.querySelectorAll('[data-calculation]')];

  choices.forEach((button) => {
    button.type = 'button';
    button.addEventListener('click', () => {
      selectedModel = button.dataset.calculation;
      choices.forEach((item) => {
        const active = item === button;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      renderModel();
    });
  });

  document.getElementById('calculator-form')?.addEventListener('submit', calculateCurrent);
  document.getElementById('transit-form')?.addEventListener('submit', calculateTransit);

  window.addEventListener('resize', () => {
    if (lastTransitDepth !== null) drawTransitChart(lastTransitDepth);
  });

  renderModel();
  calculateTransit();
}

function renderModel() {
  const model = models[selectedModel];
  if (!model) return;

  setText('calculator-category', model.category);
  setText('calculator-title', model.title);
  setText('calculator-description', model.description);
  setText('calculator-equation', model.equation);
  setText('calculator-assumptions', model.assumptions);

  const fields = document.getElementById('calculator-fields');
  if (fields) {
    fields.replaceChildren();

    for (const field of model.fields) {
      const label = document.createElement('label');
      label.className = 'calculator-field';
      label.append(document.createTextNode(field.label));

      const unit = document.createElement('span');
      unit.textContent = field.unit;
      label.append(unit);

      const input = document.createElement('input');
      input.type = 'number';
      input.step = 'any';
      input.required = true;
      input.name = field.name;
      input.value = String(field.value);
      input.inputMode = 'decimal';
      input.autocomplete = 'off';
      label.append(input);
      fields.append(label);
    }
  }

  choicesSetPressedState();
  renderResult('Result', '—', 'Enter values, then calculate.');
}

function choicesSetPressedState() {
  document.querySelectorAll('[data-calculation]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.calculation === selectedModel));
  });
}

function calculateCurrent(event) {
  event.preventDefault();

  const model = models[selectedModel];
  const form = event.currentTarget;
  const values = {};

  try {
    for (const field of model.fields) {
      const input = form.elements.namedItem(field.name);
      if (!input) throw new Error(`Missing input: ${field.label}.`);
      if (input.value.trim() === '') throw new Error(`${field.label} is required.`);
      const value = input.valueAsNumber;
      if (!Number.isFinite(value)) throw new Error(`${field.label} must be a valid number.`);
      values[field.name] = value;
    }

    const answer = model.calculate(values);
    const display = formatResult(answer, model.resultUnit);
    renderResult('Calculated result', display.value, display.unit);
  } catch (error) {
    renderResult('Input error', 'Check inputs', error.message, true);
  }
}

function renderResult(label, value, unit, isError = false) {
  const result = document.getElementById('calculator-result');
  if (!result) return;

  result.replaceChildren();
  const category = document.createElement('span');
  category.className = 'data-label';
  category.textContent = label;

  const output = document.createElement('strong');
  output.textContent = value;
  if (isError) output.className = 'error-value';

  const detail = document.createElement('span');
  detail.className = 'result-unit';
  detail.textContent = unit;

  result.append(category, output, detail);
}

function formatResult(value, unit) {
  if (!Number.isFinite(value)) throw new Error('The calculation did not produce a finite result.');

  if (unit === 's') {
    if (value >= CONSTANTS.YEAR) return { value: formatScientific(value / CONSTANTS.YEAR), unit: 'years' };
    if (value >= CONSTANTS.DAY) return { value: formatScientific(value / CONSTANTS.DAY), unit: 'days' };
    if (value >= 60) return { value: formatScientific(value / 60), unit: 'minutes' };
  }
  if (unit === 'm' && value > 1e6) return { value: formatScientific(value / 1000), unit: 'km' };
  if (unit === 'm/s') return { value: formatScientific(value / 1000), unit: 'km/s' };
  return { value: formatScientific(value), unit };
}

function calculateTransit(event) {
  event?.preventDefault();

  const planetInput = document.getElementById('transit-planet-radius');
  const starInput = document.getElementById('transit-star-radius');
  const ppmElement = document.getElementById('transit-ppm');
  const status = document.querySelector('.chart-caption');

  try {
    if (!planetInput || !starInput) throw new Error('Transit inputs are missing from this page.');
    const planet = planetInput.valueAsNumber;
    const star = starInput.valueAsNumber;
    if (!Number.isFinite(planet) || !Number.isFinite(star)) {
      throw new Error('Enter valid planet and star radii.');
    }

    const depth = calculateTransitDepth(planet, star);
    if (depth >= 1) {
      throw new Error('The simplified model requires the planet radius to be smaller than the star radius.');
    }

    lastTransitDepth = depth;
    const ppm = depth * 1e6;
    if (ppmElement) {
      ppmElement.textContent = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(ppm);
    }
    if (status) status.textContent = 'Illustrative box-shaped model · not observed data';
    drawTransitChart(depth);
  } catch (error) {
    lastTransitDepth = null;
    if (ppmElement) ppmElement.textContent = '—';
    if (status) status.textContent = error.message;
    clearTransitChart();
  }
}

/** Draw the simplified transit profile with the browser's native canvas API.
 * It avoids a charting dependency; this is a conceptual model, not a fit
 * to observed photometry.
 */
function drawTransitChart(depth) {
  const canvas = document.getElementById('transit-chart');
  if (!(canvas instanceof HTMLCanvasElement)) return;

  const rect = canvas.getBoundingClientRect();
  const cssWidth = Math.max(320, Math.round(rect.width || 640));
  const cssHeight = 210;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.round(cssWidth * pixelRatio);
  canvas.height = Math.round(cssHeight * pixelRatio);
  canvas.style.width = '100%';
  canvas.style.height = `${cssHeight}px`;

  const context = canvas.getContext('2d');
  if (!context) return;
  context.scale(pixelRatio, pixelRatio);
  context.clearRect(0, 0, cssWidth, cssHeight);

  const left = 64;
  const right = cssWidth - 14;
  const top = 18;
  const bottom = cssHeight - 32;
  const plotWidth = right - left;
  const plotHeight = bottom - top;
  const baseline = 1;
  const lower = Math.max(0, 1 - depth * 1.35 - 0.00003);
  const yFor = (value) => bottom - ((value - lower) / (baseline - lower || 1)) * plotHeight;

  context.font = '12px "IBM Plex Mono", monospace';
  context.lineWidth = 1;
  context.strokeStyle = 'rgba(231, 231, 223, 0.10)';
  context.fillStyle = '#8e978c';

  for (let i = 0; i <= 3; i += 1) {
    const y = top + (plotHeight / 3) * i;
    context.beginPath();
    context.moveTo(left, y);
    context.lineTo(right, y);
    context.stroke();
    const value = baseline - ((baseline - lower) / 3) * i;
    context.fillText(`${(value * 100).toFixed(3)}%`, 0, y + 4);
  }

  context.strokeStyle = '#c58a5a';
  context.lineWidth = 2;
  context.beginPath();
  for (let i = 0; i <= 100; i += 1) {
    const phase = (i - 50) / 50;
    const inTransit = Math.abs(phase) < 0.26;
    const flux = inTransit ? 1 - depth : 1;
    const x = left + (i / 100) * plotWidth;
    const y = yFor(flux);
    if (i === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.stroke();

  context.fillStyle = '#8e978c';
  context.fillText('Transit phase', left, cssHeight - 8);
}

function clearTransitChart() {
  const canvas = document.getElementById('transit-chart');
  const context = canvas?.getContext?.('2d');
  if (context) context.clearRect(0, 0, canvas.width, canvas.height);
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value ?? '—';
}
