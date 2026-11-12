import {
  LEVELS, GOALS, requireUser, signOut, updateUser, changePassword, deleteAccount,
  loadLibrary, exportData, renderInterestChips, renderChoices, LIMITS, setNewPassword, isRecovery,
  usesBackend
} from '../core/account.js';
import { formatDate } from '../services/http.js';

export function initAccount() {
  const user = requireUser();
  if (!user) return;

  const message = (id, text, failed = false) => {
    const node = document.getElementById(id);
    node.textContent = text;
    node.dataset.state = failed ? 'error' : '';
  };

  /* ---------- summary ---------- */
  const library = loadLibrary(user.id);
  document.getElementById('account-email').textContent = user.email;
  document.getElementById('account-joined').textContent = formatDate(user.createdAt);
  document.getElementById('stat-papers').textContent = library.papers.length;
  document.getElementById('stat-sources').textContent = library.sources.length;
  document.getElementById('stat-docs').textContent = library.docs.length;

  /* ---------- profile ---------- */
  const selected = new Set(user.interests);
  renderInterestChips(document.getElementById('interest-grid'), selected);
  renderChoices(document.getElementById('level-choices'), 'level', LEVELS, user.level);
  renderChoices(document.getElementById('goal-choices'), 'goal', GOALS, user.goal);

  const profileForm = document.getElementById('profile-form');
  profileForm.elements.name.value = user.name;
  profileForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!selected.size) { message('profile-status', 'Keep at least one interest selected.', true); return; }
    try {
      await updateUser({
        name: profileForm.elements.name.value.trim() || user.email.split('@')[0],
        interests: [...selected],
        level: document.querySelector('input[name=level]:checked')?.value || '',
        goal: document.querySelector('input[name=goal]:checked')?.value || ''
      });
      message('profile-status', 'Profile saved.');
    } catch (error) {
      message('profile-status', error.message, true);
    }
  });

  /* ---------- password ---------- */
  const passwordForm = document.getElementById('password-form');
  // Arriving from a reset email: already signed in, so no current password.
  const recovering = isRecovery();
  if (recovering) {
    passwordForm.querySelector('[for=pw-current]').hidden = true;
    passwordForm.elements.current.required = false;
    document.getElementById('recovery-note').hidden = false;
    document.getElementById('password-block').scrollIntoView();
  }
  passwordForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const { current, next, confirm } = passwordForm.elements;
    if (next.value !== confirm.value) { message('password-status', 'The new passwords do not match.', true); return; }
    try {
      if (recovering) await setNewPassword(next.value); else await changePassword(current.value, next.value);
      passwordForm.reset();
      message('password-status', 'Password changed.');
    } catch (error) {
      message('password-status', error.message, true);
    }
  });

  /* ---------- data ---------- */
  document.getElementById('export-data').addEventListener('click', () => {
    const data = exportData();
    if (!data) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = Object.assign(document.createElement('a'), { href: url, download: 'astro-research-export.json' });
    link.click();
    URL.revokeObjectURL(url);
    message('data-status', 'Export downloaded.');
  });

  document.getElementById('sign-out').addEventListener('click', async () => {
    await signOut();
    window.location.assign('./index.html');
  });

  /* ---------- delete ---------- */
  const deleteForm = document.getElementById('delete-form');
  const deleteInput = deleteForm.elements.confirm;
  const deleteButton = deleteForm.querySelector('[type=submit]');
  deleteInput.addEventListener('input', () => { deleteButton.disabled = deleteInput.value.trim().toLowerCase() !== user.email; });
  deleteForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (deleteInput.value.trim().toLowerCase() !== user.email) return;
    try {
      await deleteAccount();
    } catch (error) {
      message('delete-status', error.message, true);
      return;
    }
    window.location.assign('./index.html');
  });

  const where = document.getElementById('storage-where');
  if (where) where.textContent = usesBackend ? 'on the server' : 'in this browser';
  document.getElementById('password-rule').textContent = `At least ${LIMITS.passwordMin} characters, with a letter and a number`;
}