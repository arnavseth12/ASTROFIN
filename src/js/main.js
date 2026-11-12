/**
 * ASTRO application entry point.
 * Page code is loaded on demand so an optional library used by one page
 * cannot prevent the rest of the site from starting.
 */

const pageModules = {
  home: () => import('./pages/home.js'),
  observatory: () => import('./pages/observatory.js'),
  news: () => import('./pages/news.js'),
  explore: () => import('./pages/explore.js'),
  research: () => import('./pages/research.js'),
  laboratory: () => import('./pages/laboratory.js'),
  simulations: () => import('./pages/simulations.js'),
  missions: () => import('./pages/missions.js'),
  diagnostics: () => import('./pages/diagnostics.js'),
  signup: () => import('./pages/signup.js'),
  signin: () => import('./pages/signin.js'),
  account: () => import('./pages/account.js'),
  hub: () => import('./pages/hub.js')
};

const initializerNames = {
  home: 'initHome',
  observatory: 'initObservatory',
  news: 'initNews',
  explore: 'initExplore',
  research: 'initResearch',
  laboratory: 'initLaboratory',
  simulations: 'initSimulation',
  missions: 'initMissions',
  diagnostics: 'initDiagnostics',
  signup: 'initSignup',
  signin: 'initSignin',
  account: 'initAccount',
  hub: 'initHub'
};

function initNavigation() {
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.getElementById('primary-nav');
  const dropdowns = [...document.querySelectorAll('.nav-dropdown')];

  const closeNavigation = ({ restoreFocus = false } = {}) => {
    nav?.classList.remove('is-open');
    toggle?.setAttribute('aria-expanded', 'false');
    dropdowns.forEach((details) => { details.open = false; });
    if (restoreFocus) toggle?.focus();
  };

  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const isOpen = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!isOpen));
      nav.classList.toggle('is-open', !isOpen);
      if (isOpen) dropdowns.forEach((details) => { details.open = false; });
    });

    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => closeNavigation());
    });
  }

  dropdowns.forEach((details) => {
    details.addEventListener('toggle', () => {
      if (!details.open) return;
      dropdowns.forEach((other) => {
        if (other !== details) other.open = false;
      });
    });
  });

  document.addEventListener('click', (event) => {
    if (header && !header.contains(event.target)) closeNavigation();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeNavigation({ restoreFocus: true });
  });
}

/* The Sign up button is plain HTML in every page header, so it shows even if
   this script fails. This only upgrades it to "Research hub" when signed in,
   and it is isolated so a problem here can never stop the rest of the site. */
async function initAccountLink() {
  try {
    const link = document.querySelector('[data-account-link]');
    if (!link) return;
    const { ready, currentUser } = await import('./core/account.js');
    await ready();
    if (currentUser()) {
      link.href = './hub.html';
      link.textContent = 'Research hub';
      document.querySelector('[data-signin-link]')?.setAttribute('hidden', '');
    }
  } catch (error) {
    console.warn('ASTRO account link unavailable:', error);
  }
}

function markCurrentNavigation() {
  const page = document.body.dataset.page || 'home';
  const routeMap = {
    home: ['home'],
    observatory: ['explore'],
    explore: ['explore'],
    research: ['explore'],
    laboratory: ['laboratory'],
    simulations: ['laboratory'],
    missions: ['missions'],
    news: ['discoveries'],
    discoveries: ['discoveries'],
    about: ['about']
  };

  document.querySelectorAll('[data-nav]').forEach((link) => {
    if ((routeMap[page] || []).includes(link.dataset.nav)) {
      link.setAttribute('aria-current', link.matches('summary') ? 'location' : 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

function updateYear() {
  document.querySelectorAll('[data-current-year]').forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });
}

function showRuntimeError(error) {
  console.error('ASTRO failed to initialise:', error);

  let panel = document.getElementById('astro-runtime-error');
  if (!panel) {
    panel = document.createElement('section');
    panel.id = 'astro-runtime-error';
    panel.className = 'runtime-error';
    panel.setAttribute('role', 'alert');
    panel.innerHTML = `
      <strong>ASTRO could not start this page.</strong>
      <p class="runtime-error-message"></p>
      <p>Open the VS Code terminal, confirm that you are in the project folder, run <code>npm install</code>, then restart with <code>npm run dev</code>.</p>
      <p>If it still fails, open the browser console (F12) and share the first red error.</p>
    `;
    document.body.prepend(panel);
  }

  const message = panel.querySelector('.runtime-error-message');
  if (message) message.textContent = error instanceof Error ? error.message : String(error);
}

async function startAstro() {
  initNavigation();
  initAccountLink();
  markCurrentNavigation();
  updateYear();

  const page = document.body.dataset.page || 'home';
  const loadModule = pageModules[page];
  const initializerName = initializerNames[page];

  if (!loadModule || !initializerName) return;

  try {
    // Saved sessions load from the database before any account page runs.
    if (['signup', 'signin', 'account', 'hub'].includes(page)) {
      const { ready } = await import('./core/account.js');
      await ready();
    }
    const module = await loadModule();
    const initializer = module[initializerName];
    if (typeof initializer !== 'function') {
      throw new Error(`Page initialiser "${initializerName}" was not exported.`);
    }
    await initializer();
  } catch (error) {
    showRuntimeError(error);
  }
}

window.addEventListener('unhandledrejection', (event) => {
  showRuntimeError(event.reason || new Error('An unhandled asynchronous error occurred.'));
});

startAstro();