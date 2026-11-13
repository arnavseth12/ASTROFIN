import {
  INTERESTS, LEVELS, GOALS, currentUser, createAccount, signIn, starterFor,
  renderInterestChips, renderChoices, validateEmail, validatePassword, LIMITS, usesBackend
} from '../core/account.js';
import { escapeHTML } from '../services/http.js';

const STEP_NAMES = ['Interests', 'Your work', 'Account'];

function destination() {
  const next = new URLSearchParams(window.location.search).get('next') || '';
  // Only relative page names, never an arbitrary URL.
  return /^[a-z-]+\.html$/.test(next) ? `./${next}` : './hub.html';
}

export function initSignup() {
  if (currentUser()) {
    window.location.replace('./hub.html');
    return;
  }

  const selected = new Set();
  let step = 0;

  if (usesBackend) {
    document.getElementById('storage-note').textContent =
      'Your account and library are saved to your Lodestar account, so you can sign in from any device. Export a copy from your account page any time.';
  }

  const panels = [...document.querySelectorAll('[data-step]')];
  const dots = [...document.querySelectorAll('[data-step-dot]')];
  const stepLabel = document.getElementById('step-label');
  const interestGrid = document.getElementById('interest-grid');
  const interestCount = document.getElementById('interest-count');
  const toStep2 = document.getElementById('to-step-2');
  const preview = document.getElementById('starter-preview');

  const show = (next) => {
    step = next;
    panels.forEach((panel) => { panel.hidden = Number(panel.dataset.step) !== step; });
    dots.forEach((dot) => {
      const index = Number(dot.dataset.stepDot);
      dot.classList.toggle('is-current', index === step);
      dot.classList.toggle('is-done', index < step);
      if (index === step) dot.setAttribute('aria-current', 'step'); else dot.removeAttribute('aria-current');
    });
    stepLabel.textContent = `Step ${step + 1} of ${STEP_NAMES.length} · ${STEP_NAMES[step]}`;
    panels[step].querySelector('h2')?.focus({ preventScroll: true });
  };

  const renderPreview = () => {
    const starter = starterFor([...selected]);
    interestCount.textContent = selected.size ? `${selected.size} selected` : 'None selected yet';
    toStep2.disabled = selected.size === 0;
    if (!selected.size) {
      preview.innerHTML = '<p class="preview-empty">Pick an interest and the sources it brings appear here.</p>';
      return;
    }
    preview.innerHTML = `
      <div class="preview-block"><span class="data-label">Starter paper</span>
        <p class="preview-paper"><span class="paper-no">01</span>${escapeHTML(starter.paperTitle)}</p></div>
      <div class="preview-block"><span class="data-label">Starter sources</span>
        <ul class="preview-sources">${starter.sources.map((source) =>
          `<li><strong>${escapeHTML(source.title)}</strong><span>${escapeHTML(source.publisher)} · ${escapeHTML(source.kind)}</span></li>`).join('')}</ul></div>`;
  };

  renderInterestChips(interestGrid, selected, renderPreview);
  renderChoices(document.getElementById('level-choices'), 'level', LEVELS);
  renderChoices(document.getElementById('goal-choices'), 'goal', GOALS);
  renderPreview();
  show(0);

  toStep2.addEventListener('click', () => show(1));
  document.getElementById('back-to-1').addEventListener('click', () => show(0));
  document.getElementById('to-step-3').addEventListener('click', () => show(2));
  document.getElementById('back-to-2').addEventListener('click', () => show(1));

  /* ---------- password field ---------- */
  const password = document.getElementById('signup-password');
  const toggle = document.getElementById('toggle-password');
  const hint = document.getElementById('password-hint');
  toggle.addEventListener('click', () => {
    const reveal = password.type === 'password';
    password.type = reveal ? 'text' : 'password';
    toggle.textContent = reveal ? 'Hide' : 'Show';
    toggle.setAttribute('aria-pressed', String(reveal));
  });
  password.addEventListener('input', () => {
    hint.textContent = password.value ? (validatePassword(password.value) || 'Looks good') : `At least ${LIMITS.passwordMin} characters, with a letter and a number`;
  });

  /* ---------- create account (last step) ---------- */
  const form = document.getElementById('account-form');
  const error = document.getElementById('account-error');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    error.textContent = '';
    const email = form.elements.email.value;
    if (!validateEmail(email)) { error.textContent = 'Enter a valid email address.'; form.elements.email.focus(); return; }
    const problem = validatePassword(password.value);
    if (problem) { error.textContent = problem; password.focus(); return; }

    const submit = form.querySelector('[type=submit]');
    submit.disabled = true;
    submit.textContent = 'Creating account';
    try {
      const result = await createAccount({
        email,
        password: password.value,
        name: document.getElementById('display-name').value,
        interests: [...selected],
        level: document.querySelector('input[name=level]:checked')?.value || '',
        goal: document.querySelector('input[name=goal]:checked')?.value || ''
      });
      if (result?.pending) {
        const note = document.getElementById('confirm-note');
        note.textContent = `Check ${result.email} for a confirmation link, then sign in. Your interests are saved with the account.`;
        note.hidden = false;
        submit.textContent = 'Check your email';
        return;
      }
      window.location.assign(`${destination()}${destination().includes('?') ? '&' : '?'}welcome=1`);
    } catch (failure) {
      error.textContent = failure.message;
      submit.disabled = false;
      submit.textContent = 'Create account';
    }
  });

  /* ---------- sign in ---------- */
  const signinForm = document.getElementById('signin-form');
  const signinError = document.getElementById('signin-error');
  signinForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    signinError.textContent = '';
    const submit = signinForm.querySelector('[type=submit]');
    submit.disabled = true;
    try {
      await signIn(signinForm.elements.email.value, signinForm.elements.password.value);
      window.location.assign(destination());
    } catch (failure) {
      signinError.textContent = failure.message;
      submit.disabled = false;
    }
  });

  if (window.location.hash === '#signin') document.getElementById('signin').open = true;
}