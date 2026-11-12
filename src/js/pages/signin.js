import { currentUser, signIn, sendPasswordReset, usesBackend, sessionProblem } from '../core/account.js';

function destination() {
  const next = new URLSearchParams(window.location.search).get('next') || '';
  // Only relative page names, never an arbitrary URL.
  return /^[a-z-]+\.html$/.test(next) ? `./${next}` : './hub.html';
}

export function initSignin() {
  if (currentUser()) {
    window.location.replace(destination());
    return;
  }

  const form = document.getElementById('signin-form');
  const error = document.getElementById('signin-error');
  const status = document.getElementById('signin-status');
  const password = document.getElementById('signin-password');
  const toggle = document.getElementById('toggle-signin-password');
  const forgot = document.getElementById('forgot-password');

  const problem = sessionProblem();
  if (problem) error.textContent = problem;

  toggle.addEventListener('click', () => {
    const reveal = password.type === 'password';
    password.type = reveal ? 'text' : 'password';
    toggle.textContent = reveal ? 'Hide' : 'Show';
    toggle.setAttribute('aria-pressed', String(reveal));
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    error.textContent = '';
    status.textContent = '';
    const submit = form.querySelector('[type=submit]');
    submit.disabled = true;
    submit.textContent = 'Signing in';
    try {
      await signIn(form.elements.email.value, password.value);
      window.location.assign(destination());
    } catch (failure) {
      error.textContent = failure.message;
      submit.disabled = false;
      submit.textContent = 'Sign in';
    }
  });

  forgot.hidden = !usesBackend;
  forgot.addEventListener('click', async () => {
    error.textContent = '';
    status.textContent = '';
    const email = form.elements.email.value;
    try {
      await sendPasswordReset(email);
      // The same message whether or not the address has an account.
      status.textContent = `If ${email.trim()} has an account, a reset link is on its way.`;
    } catch (failure) {
      error.textContent = failure.message;
    }
  });
}