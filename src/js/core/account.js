/**
 * Accounts and the research library.
 *
 * Two modes behind one set of exported functions:
 *  - Database mode, when VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.
 *    Supabase Auth holds the credentials and Postgres holds profiles and
 *    libraries, protected by row level security (supabase/schema.sql).
 *  - Browser mode, otherwise. Accounts live in localStorage with a salted
 *    PBKDF2 hash. Useful for development, not for real users.
 *
 * Pages call ready() once (main.js does) and then use the same synchronous
 * reads in both modes; anything that writes returns a promise.
 */

import { backendEnabled, getClient, recoveryLink } from './backend.js';

const USERS_KEY = 'astro.users.v1';
const SESSION_KEY = 'astro.session.v1';
const libraryKey = (userId) => `astro.library.${userId}.v1`;

/* ---------- catalogue of choices ---------- */

export const INTERESTS = [
  { id: 'exoplanets', label: 'Exoplanets and transits', path: { label: 'TESS candidate field', href: './research.html' },
    sources: [
      { title: 'NASA Exoplanet Archive', url: 'https://exoplanetarchive.ipac.caltech.edu/', publisher: 'NASA / Caltech IPAC', kind: 'Dataset' },
      { title: 'TOI column definitions', url: 'https://exoplanetarchive.ipac.caltech.edu/docs/API_TOI_columns.html', publisher: 'NASA / Caltech IPAC', kind: 'Dataset' }
    ] },
  { id: 'blackholes', label: 'Black holes and relativity', path: { label: 'Schwarzschild radius calculator', href: './laboratory.html' },
    sources: [{ title: 'Black holes', url: 'https://science.nasa.gov/universe/black-holes/', publisher: 'NASA Science', kind: 'Article' }] },
  { id: 'cosmology', label: 'Cosmology and expansion', path: { label: 'Redshift and Hubble calculators', href: './laboratory.html' },
    sources: [{ title: 'The universe', url: 'https://science.nasa.gov/universe/', publisher: 'NASA Science', kind: 'Article' }] },
  { id: 'stars', label: 'Stars and stellar evolution', path: { label: 'Observatory image archive', href: './observatory.html' },
    sources: [{ title: 'MAST archive', url: 'https://mast.stsci.edu/', publisher: 'STScI', kind: 'Dataset' }] },
  { id: 'solar', label: 'Solar system', path: { label: 'Circular orbit model', href: './simulations.html' },
    sources: [{ title: 'Solar System Dynamics', url: 'https://ssd.jpl.nasa.gov/', publisher: 'NASA JPL', kind: 'Dataset' }] },
  { id: 'orbits', label: 'Orbital mechanics', path: { label: 'Circular orbit model', href: './simulations.html' },
    sources: [{ title: 'Solar System Dynamics', url: 'https://ssd.jpl.nasa.gov/', publisher: 'NASA JPL', kind: 'Dataset' }] },
  { id: 'spaceflight', label: 'Spaceflight and missions', path: { label: 'Upcoming launches', href: './missions.html' },
    sources: [{ title: 'Launch Library 2 documentation', url: 'https://lldev.thespacedevs.com/docs/', publisher: 'The Space Devs', kind: 'Dataset' }] },
  { id: 'archives', label: 'Observation and archives', path: { label: 'NASA image archive search', href: './observatory.html' },
    sources: [{ title: 'NASA Image and Video Library', url: 'https://images.nasa.gov/', publisher: 'NASA', kind: 'Dataset' }] },
  { id: 'instruments', label: 'Data analysis and instruments', path: { label: 'Physics calculators', href: './laboratory.html' },
    sources: [{ title: 'MAST archive', url: 'https://mast.stsci.edu/', publisher: 'STScI', kind: 'Dataset' }] },
  { id: 'amateur', label: 'Amateur astronomy', path: { label: 'Astronomy Picture of the Day', href: './observatory.html' },
    sources: [{ title: 'NASA Science', url: 'https://science.nasa.gov/', publisher: 'NASA', kind: 'Article' }] }
];

export const LEVELS = [
  { id: 'reader', label: 'Curious reader', hint: 'Learning how the field fits together' },
  { id: 'student', label: 'Student', hint: 'Coursework or a project' },
  { id: 'amateur', label: 'Amateur astronomer', hint: 'Observing and reading the literature' },
  { id: 'researcher', label: 'Researcher', hint: 'Working with data or writing papers' }
];

export const GOALS = [
  { id: 'learn', label: 'Learn the fundamentals', hint: 'Guided reading and the calculators' },
  { id: 'follow', label: 'Follow current research', hint: 'Sources and spaceflight news' },
  { id: 'write', label: 'Write and organise papers', hint: 'Notes, references and drafts' },
  { id: 'analyse', label: 'Analyse public data', hint: 'Archives and catalogues' }
];

export const PAPER_STATUSES = ['Outline', 'Drafting', 'Revising', 'Done'];
export const SOURCE_KINDS = ['Paper', 'Dataset', 'Article', 'Book', 'Other'];

export const LIMITS = Object.freeze({ docBytes: 1_000_000, totalDocBytes: 3_000_000, passwordMin: 10 });

/* ---------- storage ---------- */

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

const getUsers = () => read(USERS_KEY, {});
const normaliseEmail = (email) => String(email || '').trim().toLowerCase();

/* ---------- passwords ---------- */

const toHex = (bytes) => [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
const fromHex = (hex) => Uint8Array.from(hex.match(/.{2}/g).map((pair) => parseInt(pair, 16)));

async function derive(password, saltHex) {
  if (!globalThis.crypto?.subtle) {
    throw new Error('This browser blocks secure password hashing. Open the site over https or on localhost.');
  }
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: fromHex(saltHex), iterations: 210000, hash: 'SHA-256' }, key, 256);
  return toHex(new Uint8Array(bits));
}

function sameHash(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normaliseEmail(email));
}

export function validatePassword(password) {
  if (String(password).length < LIMITS.passwordMin) return `Use at least ${LIMITS.passwordMin} characters.`;
  if (!/[a-z]/i.test(password) || !/\d/.test(password)) return 'Include at least one letter and one number.';
  return '';
}

/* ---------- database mode ---------- */

export const usesBackend = backendEnabled;

const cache = { user: null, library: null, error: null, recovery: recoveryLink };
let readyPromise;
let syncTimer = null;
let dirty = false;

const emitSync = (state, message = '') =>
  window.dispatchEvent(new CustomEvent('astro:sync', { detail: { state, message } }));

function friendly(error, fallback) {
  const text = String(error?.message || '').toLowerCase();
  if (error?.status === 0 || /failed to fetch|network|retryable/.test(text) || error?.name === 'AuthRetryableFetchError') {
    return new Error('Could not reach the server. Check your connection and try again.');
  }
  if (/rate limit|too many/.test(text)) return new Error('Too many attempts. Wait a minute and try again.');
  if (/not confirmed/.test(text)) return new Error('Confirm your email first. Check your inbox for the link.');
  if (/password/.test(text) && /(weak|short|least)/.test(text)) return new Error(error.message);
  return new Error(fallback || error?.message || 'Something went wrong.');
}

function toUser(authUser, profile = {}) {
  const meta = authUser.user_metadata || {};
  return {
    id: authUser.id,
    email: authUser.email,
    name: profile.name || meta.name || String(authUser.email).split('@')[0],
    interests: profile.interests || meta.interests || [],
    level: profile.level ?? meta.level ?? '',
    goal: profile.goal ?? meta.goal ?? '',
    createdAt: profile.created_at || authUser.created_at
  };
}

async function pushLibrary() {
  clearTimeout(syncTimer);
  syncTimer = null;
  if (!dirty || !cache.user || !cache.library) return;
  dirty = false;
  try {
    const sb = await getClient();
    const { error } = await sb.from('libraries').upsert({
      user_id: cache.user.id, data: cache.library, updated_at: new Date().toISOString()
    });
    if (error) throw error;
    emitSync('saved');
  } catch (error) {
    dirty = true;
    console.error('Lodestar library sync failed:', error);
    emitSync('error', friendly(error, 'The last change could not be saved to the server.').message);
  }
}

function scheduleSync() {
  dirty = true;
  emitSync('saving');
  clearTimeout(syncTimer);
  syncTimer = setTimeout(pushLibrary, 700);
}

if (typeof window !== 'undefined' && backendEnabled) {
  window.addEventListener('pagehide', () => { if (dirty) pushLibrary(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && dirty) pushLibrary(); });
}

async function hydrate(authUser) {
  const sb = await getClient();
  const [profileResult, libraryResult] = await Promise.all([
    sb.from('profiles').select('*').eq('id', authUser.id).maybeSingle(),
    sb.from('libraries').select('data').eq('user_id', authUser.id).maybeSingle()
  ]);
  // Never seed over a library that failed to load: that would replace real work.
  if (profileResult.error) throw profileResult.error;
  if (libraryResult.error) throw libraryResult.error;

  cache.user = toUser(authUser, profileResult.data || {});
  const stored = libraryResult.data?.data;
  if (stored && Object.keys(stored).length) {
    cache.library = { ...emptyLibrary(), ...stored };
  } else {
    cache.library = buildSeed(cache.user);
    scheduleSync();
    await pushLibrary();
  }
}

/** Resolves once the saved session (if any) is loaded. Never rejects. */
export function ready() {
  readyPromise ||= (async () => {
    if (!backendEnabled) return;
    try {
      const sb = await getClient();
      const { data, error } = await sb.auth.getSession();
      if (error) throw error;
      if (data.session) await hydrate(data.session.user);
    } catch (error) {
      cache.error = error;
      console.error('Lodestar could not load your session:', error);
    }
  })();
  return readyPromise;
}

/** Set when the session could not be loaded, so pages can say why. */
export const sessionProblem = () => (cache.error ? friendly(cache.error).message : '');
export const isRecovery = () => backendEnabled && cache.recovery && Boolean(cache.user);

/* ---------- accounts ---------- */

export function currentUser() {
  if (backendEnabled) return cache.user;
  const id = read(SESSION_KEY, null);
  if (!id) return null;
  return Object.values(getUsers()).find((user) => user.id === id) || null;
}

export async function createAccount({ email, password, name, interests, level, goal }) {
  const key = normaliseEmail(email);
  if (!validateEmail(key)) throw new Error('Enter a valid email address.');
  const passwordProblem = validatePassword(password);
  if (passwordProblem) throw new Error(passwordProblem);

  if (backendEnabled) {
    let sb;
    try { sb = await getClient(); } catch (error) { throw friendly(error); }
    const { data, error } = await sb.auth.signUp({
      email: key,
      password,
      options: {
        data: { name: String(name || '').trim().slice(0, 60), interests: interests || [], level: level || '', goal: goal || '' },
        emailRedirectTo: new URL('./hub.html', window.location.href).href
      }
    });
    if (error) throw friendly(error, error.message);
    // With email confirmation on, an existing address comes back with no identities.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw new Error('An account with this email already exists. Sign in instead.');
    }
    // No session yet means the project requires the email to be confirmed first.
    if (!data.session) return { pending: true, email: key };
    try { await hydrate(data.session.user); } catch (failure) { throw friendly(failure); }
    return cache.user;
  }

  const users = getUsers();
  if (users[key]) throw new Error('An account with this email already exists in this browser. Sign in instead.');

  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
  const user = {
    id: crypto.randomUUID(),
    email: key,
    name: String(name || '').trim() || key.split('@')[0],
    salt,
    hash: await derive(password, salt),
    interests: interests || [],
    level: level || '',
    goal: goal || '',
    createdAt: new Date().toISOString()
  };
  users[key] = user;
  if (!write(USERS_KEY, users)) throw new Error('This browser could not save the account. Check that storage is not blocked or full.');

  saveLibrary(user.id, buildSeed(user));
  write(SESSION_KEY, user.id);
  return user;
}

export async function signIn(email, password) {
  // Same message for an unknown email and a wrong password.
  const failure = new Error('That email and password do not match.');

  if (backendEnabled) {
    let sb;
    try { sb = await getClient(); } catch (error) { throw friendly(error); }
    const { data, error } = await sb.auth.signInWithPassword({ email: normaliseEmail(email), password });
    if (error) throw friendly(error, failure.message);
    try { await hydrate(data.user); } catch (problem) { throw friendly(problem); }
    return cache.user;
  }

  const user = getUsers()[normaliseEmail(email)];
  if (!user) {
    await derive(password, '00'.repeat(16)).catch(() => {});
    throw failure;
  }
  if (!sameHash(await derive(password, user.salt), user.hash)) throw failure;
  write(SESSION_KEY, user.id);
  return user;
}

export async function signOut() {
  if (backendEnabled) {
    if (dirty) await pushLibrary();
    cache.user = null;
    cache.library = null;
    cache.recovery = false;
    try { await (await getClient()).auth.signOut(); } catch { /* the local session is cleared either way */ }
    return;
  }
  try { localStorage.removeItem(SESSION_KEY); } catch { /* storage unavailable */ }
}

export async function updateUser(patch) {
  const user = currentUser();
  if (!user) throw new Error('You are signed out.');

  if (backendEnabled) {
    const allowed = {};
    ['name', 'interests', 'level', 'goal'].forEach((field) => { if (field in patch) allowed[field] = patch[field]; });
    const sb = await getClient();
    const { error } = await sb.from('profiles').update(allowed).eq('id', user.id);
    if (error) throw friendly(error, 'Your changes could not be saved.');
    cache.user = { ...user, ...allowed };
    return cache.user;
  }

  const users = getUsers();
  users[user.email] = { ...user, ...patch };
  if (!write(USERS_KEY, users)) throw new Error('This browser could not save your changes.');
  return users[user.email];
}

export async function changePassword(current, next) {
  const user = currentUser();
  if (!user) throw new Error('You are signed out.');
  const problem = validatePassword(next);

  if (backendEnabled) {
    const sb = await getClient();
    // Supabase does not check the old password on update, so confirm it first.
    const check = await sb.auth.signInWithPassword({ email: user.email, password: current });
    if (check.error) throw friendly(check.error, 'Your current password is not correct.');
    if (problem) throw new Error(problem);
    const { error } = await sb.auth.updateUser({ password: next });
    if (error) throw friendly(error);
    return;
  }

  if (!sameHash(await derive(current, user.salt), user.hash)) throw new Error('Your current password is not correct.');
  if (problem) throw new Error(problem);
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
  await updateUser({ salt, hash: await derive(next, salt) });
}

/** After a reset-email link: the person is signed in, so no old password. */
export async function setNewPassword(next) {
  const problem = validatePassword(next);
  if (problem) throw new Error(problem);
  const { error } = await (await getClient()).auth.updateUser({ password: next });
  if (error) throw friendly(error);
  cache.recovery = false;
}

export async function sendPasswordReset(email) {
  if (!backendEnabled) throw new Error('Password reset needs the database. In browser mode, create a new account instead.');
  if (!validateEmail(email)) throw new Error('Enter a valid email address.');
  const { error } = await (await getClient()).auth.resetPasswordForEmail(normaliseEmail(email), {
    redirectTo: new URL('./account.html', window.location.href).href
  });
  if (error) throw friendly(error);
}

export async function deleteAccount() {
  const user = currentUser();
  if (!user) return;

  if (backendEnabled) {
    const sb = await getClient();
    const { error } = await sb.rpc('delete_my_account');
    if (error) throw friendly(error, 'The account could not be deleted. Try again.');
    dirty = false;
    cache.user = null;
    cache.library = null;
    try { await sb.auth.signOut(); } catch { /* already gone */ }
    return;
  }

  const users = getUsers();
  delete users[user.email];
  write(USERS_KEY, users);
  try {
    localStorage.removeItem(libraryKey(user.id));
    localStorage.removeItem(SESSION_KEY);
  } catch { /* storage unavailable */ }
}

/** Redirects to sign-up when nobody is signed in. Returns the user otherwise. */
export function requireUser() {
  const user = currentUser();
  if (!user) {
    window.location.replace(`./signup.html?next=${encodeURIComponent(window.location.pathname.split('/').pop() || 'hub.html')}`);
    return null;
  }
  return user;
}

/* ---------- library ---------- */

const emptyLibrary = () => ({ counter: 0, papers: [], sources: [], docs: [] });

export function loadLibrary(userId) {
  if (backendEnabled) return cache.library || emptyLibrary();
  return { ...emptyLibrary(), ...read(libraryKey(userId), {}) };
}

export function saveLibrary(userId, library) {
  if (backendEnabled) {
    cache.library = library;
    scheduleSync();
    return true;
  }
  return write(libraryKey(userId), library);
}

export const makeId = () => crypto.randomUUID();

export function addPaper(library, title = '') {
  library.counter += 1;
  const now = new Date().toISOString();
  const paper = {
    id: makeId(), number: library.counter, title, status: 'Outline', question: '', body: '',
    sourceIds: [], docIds: [], createdAt: now, updatedAt: now
  };
  library.papers.unshift(paper);
  return paper;
}

/** The sources and starter paper a set of interests would create. */
export function starterFor(interestIds) {
  const chosen = INTERESTS.filter((interest) => interestIds.includes(interest.id));
  const sources = [];
  const seen = new Set();
  chosen.forEach((interest) => interest.sources.forEach((source) => {
    if (!seen.has(source.url)) { seen.add(source.url); sources.push(source); }
  }));
  return {
    paperTitle: chosen.length ? `Reading notes: ${chosen[0].label.toLowerCase()}` : '',
    sources,
    paths: chosen.map((interest) => ({ interest: interest.label, ...interest.path }))
  };
}

function buildSeed(user) {
  const library = emptyLibrary();
  const starter = starterFor(user.interests);
  const now = new Date().toISOString();
  starter.sources.forEach((source) => library.sources.push({ id: makeId(), note: '', addedAt: now, ...source }));
  if (starter.paperTitle) addPaper(library, starter.paperTitle);
  return library;
}

export function citation(source) {
  const accessed = new Date().toLocaleDateString(undefined, { dateStyle: 'long' });
  return [source.publisher, source.title, source.url].filter(Boolean).join('. ') + `. Accessed ${accessed}.`;
}

export function exportData() {
  const user = currentUser();
  if (!user) return null;
  const { salt, hash, ...profile } = user; // hash fields exist in browser mode only
  return { exportedAt: new Date().toISOString(), profile, library: loadLibrary(user.id) };
}

/* ---------- shared form pieces ---------- */

const escapeText = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function renderInterestChips(container, selected, onChange) {
  container.innerHTML = INTERESTS.map((interest) =>
    `<button type="button" class="chip" data-interest="${interest.id}" aria-pressed="${selected.has(interest.id)}">${escapeText(interest.label)}</button>`).join('');
  container.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-interest]');
    if (!chip) return;
    const id = chip.dataset.interest;
    if (selected.has(id)) selected.delete(id); else selected.add(id);
    chip.setAttribute('aria-pressed', String(selected.has(id)));
    onChange?.(selected);
  });
}

export function renderChoices(container, name, options, value = '') {
  container.innerHTML = options.map((option) => `
    <label class="choice">
      <input type="radio" name="${name}" value="${option.id}"${option.id === value ? ' checked' : ''}>
      <span class="choice-title">${escapeText(option.label)}</span>
      <span class="choice-hint">${escapeText(option.hint)}</span>
    </label>`).join('');
}