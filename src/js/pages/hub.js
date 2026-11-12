import {
  PAPER_STATUSES, SOURCE_KINDS, LIMITS, requireUser, loadLibrary, saveLibrary,
  addPaper, makeId, citation, starterFor
} from '../core/account.js';
import { escapeHTML, formatDate } from '../services/http.js';

const pad = (number) => String(number).padStart(2, '0');
const wordCount = (text) => (text.trim() ? text.trim().split(/\s+/).length : 0);
const formatBytes = (bytes) => (bytes < 1024 ? `${bytes} B` : bytes < 1_048_576 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1_048_576).toFixed(1)} MB`);
const isWebURL = (value) => { try { return /^https?:$/.test(new URL(value).protocol); } catch { return false; } };

export function initHub() {
  const user = requireUser();
  if (!user) return;

  const library = loadLibrary(user.id);
  const state = { tab: 'papers', paperId: library.papers[0]?.id || null };

  const root = document.getElementById('hub-root');
  const status = document.getElementById('hub-status');
  const tabButtons = [...document.querySelectorAll('[data-tab]')];
  const panels = { papers: document.getElementById('panel-papers'), sources: document.getElementById('panel-sources'), docs: document.getElementById('panel-docs') };

  const say = (message, kind = 'info') => { status.textContent = message; status.dataset.state = kind === 'error' ? 'error' : ''; };

  window.addEventListener('astro:sync', (event) => {
    if (event.detail.state === 'error') say(event.detail.message, 'error');
  });

  const persist = () => {
    if (saveLibrary(user.id, library)) return true;
    say('Your browser storage is full, so the last change was not saved. Remove a document or export your data from the account page.', 'error');
    return false;
  };

  if (new URLSearchParams(window.location.search).get('welcome')) {
    say(`Account created. ${library.sources.length} starter ${library.sources.length === 1 ? 'source was' : 'sources were'} added from your interests.`);
    window.history.replaceState(null, '', window.location.pathname);
  }

  const currentPaper = () => library.papers.find((paper) => paper.id === state.paperId) || null;

  /* ---------- tabs ---------- */
  const updateCounts = () => {
    document.getElementById('count-papers').textContent = library.papers.length;
    document.getElementById('count-sources').textContent = library.sources.length;
    document.getElementById('count-docs').textContent = library.docs.length;
  };

  const showTab = (tab) => {
    state.tab = tab;
    tabButtons.forEach((button) => {
      const active = button.dataset.tab === tab;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });
    Object.entries(panels).forEach(([name, panel]) => { panel.hidden = name !== tab; });
  };

  tabButtons.forEach((button) => button.addEventListener('click', () => showTab(button.dataset.tab)));

  /* ---------- papers ---------- */
  const renderPaperList = () => {
    const list = document.getElementById('paper-list');
    list.innerHTML = library.papers.length
      ? library.papers.map((paper) => `
          <button type="button" class="paper-row${paper.id === state.paperId ? ' is-selected' : ''}" data-paper="${paper.id}"${paper.id === state.paperId ? ' aria-current="true"' : ''}>
            <span class="paper-no">${pad(paper.number)}</span>
            <span class="paper-title">${escapeHTML(paper.title || 'Untitled paper')}</span>
            <span class="paper-status">${escapeHTML(paper.status)}</span>
          </button>`).join('')
      : '<p class="empty-note">No papers yet. Start one to keep notes, sources and documents together.</p>';
  };

  const renderEditor = () => {
    const editor = document.getElementById('paper-editor');
    const paper = currentPaper();
    if (!paper) {
      editor.innerHTML = '<div class="editor-empty"><h2>Start a paper</h2><p>Each paper keeps a research question, your notes, the sources you cite and the documents you rely on.</p><button type="button" class="button button-dark" data-action="new-paper">New paper</button></div>';
      return;
    }
    editor.innerHTML = `
      <div class="editor-head">
        <span class="data-label">Paper ${pad(paper.number)}</span>
        <label class="field-inline"><span class="visually-hidden">Status</span>
          <select id="paper-status" aria-label="Status">${PAPER_STATUSES.map((s) => `<option${s === paper.status ? ' selected' : ''}>${s}</option>`).join('')}</select></label>
      </div>
      <label class="visually-hidden" for="paper-title">Title</label>
      <input id="paper-title" class="paper-title-input" type="text" value="${escapeHTML(paper.title)}" placeholder="Title" maxlength="160">
      <label class="field" for="paper-question"><span class="field-label">Research question</span>
        <input id="paper-question" type="text" value="${escapeHTML(paper.question)}" placeholder="What are you trying to find out" maxlength="300"></label>
      <label class="field" for="paper-body"><span class="field-label">Notes and draft</span>
        <textarea id="paper-body" rows="16" placeholder="Write freely. Link claims to the sources attached below.">${escapeHTML(paper.body)}</textarea></label>
      <div class="editor-meta"><span id="paper-words" class="mono">${wordCount(paper.body)} words</span><span id="paper-saved" class="mono">Saved ${new Date(paper.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>

      <div class="attach-block"><div class="attach-head"><span class="section-label">Sources cited</span>
        <button type="button" class="text-button" data-action="copy-references">Copy references</button></div>
        ${library.sources.length
          ? `<ul class="attach-list">${library.sources.map((source) => `
              <li><label class="check"><input type="checkbox" data-attach-source="${source.id}"${paper.sourceIds.includes(source.id) ? ' checked' : ''}>
              <span>${escapeHTML(source.title)}</span><small>${escapeHTML(source.publisher || source.kind)}</small></label></li>`).join('')}</ul>`
          : '<p class="empty-note">No sources yet. Add one in the Sources tab.</p>'}</div>

      <div class="attach-block"><div class="attach-head"><span class="section-label">Documents used</span></div>
        ${library.docs.length
          ? `<ul class="attach-list">${library.docs.map((doc) => `
              <li><label class="check"><input type="checkbox" data-attach-doc="${doc.id}"${paper.docIds.includes(doc.id) ? ' checked' : ''}>
              <span>${escapeHTML(doc.name)}</span><small>${formatBytes(doc.size)}</small></label></li>`).join('')}</ul>`
          : '<p class="empty-note">No documents yet. Upload one in the Documents tab.</p>'}</div>

      <div class="editor-foot"><button type="button" class="text-button danger" data-action="delete-paper">Delete paper</button></div>`;
  };

  let saveTimer;
  const touchPaper = (paper) => {
    paper.updatedAt = new Date().toISOString();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (persist()) {
        const saved = document.getElementById('paper-saved');
        if (saved) saved.textContent = `Saved ${new Date(paper.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }
    }, 400);
  };

  panels.papers.addEventListener('click', (event) => {
    const row = event.target.closest('[data-paper]');
    if (row) { state.paperId = row.dataset.paper; renderPaperList(); renderEditor(); return; }

    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'new-paper') {
      const paper = addPaper(library);
      state.paperId = paper.id;
      if (persist()) { updateCounts(); renderPaperList(); renderEditor(); document.getElementById('paper-title')?.focus(); }
    }
    if (action === 'delete-paper') {
      const paper = currentPaper();
      if (!paper || !window.confirm(`Delete "${paper.title || 'Untitled paper'}"? This cannot be undone.`)) return;
      library.papers = library.papers.filter((item) => item.id !== paper.id);
      state.paperId = library.papers[0]?.id || null;
      persist(); updateCounts(); renderPaperList(); renderEditor();
    }
    if (action === 'copy-references') {
      const paper = currentPaper();
      const lines = library.sources.filter((source) => paper.sourceIds.includes(source.id)).map(citation);
      if (!lines.length) { say('Attach at least one source to copy references.'); return; }
      navigator.clipboard?.writeText(lines.join('\n')).then(
        () => say(`Copied ${lines.length} ${lines.length === 1 ? 'reference' : 'references'}.`),
        () => say('Your browser blocked copying. Select the text manually from the Sources tab.', 'error')
      );
    }
  });

  panels.papers.addEventListener('input', (event) => {
    const paper = currentPaper();
    if (!paper) return;
    const { id, value } = event.target;
    if (id === 'paper-title') {
      paper.title = value;
      const row = document.querySelector(`[data-paper="${paper.id}"] .paper-title`);
      if (row) row.textContent = value || 'Untitled paper';
    } else if (id === 'paper-question') paper.question = value;
    else if (id === 'paper-body') {
      paper.body = value;
      document.getElementById('paper-words').textContent = `${wordCount(value)} words`;
    } else return;
    touchPaper(paper);
  });

  panels.papers.addEventListener('change', (event) => {
    const paper = currentPaper();
    if (!paper) return;
    const target = event.target;
    if (target.id === 'paper-status') {
      paper.status = target.value;
      const row = document.querySelector(`[data-paper="${paper.id}"] .paper-status`);
      if (row) row.textContent = paper.status;
    } else if (target.dataset.attachSource) {
      paper.sourceIds = target.checked ? [...new Set([...paper.sourceIds, target.dataset.attachSource])] : paper.sourceIds.filter((id) => id !== target.dataset.attachSource);
      renderSources();
    } else if (target.dataset.attachDoc) {
      paper.docIds = target.checked ? [...new Set([...paper.docIds, target.dataset.attachDoc])] : paper.docIds.filter((id) => id !== target.dataset.attachDoc);
    } else return;
    touchPaper(paper);
  });

  /* ---------- sources ---------- */
  const renderSources = () => {
    const list = document.getElementById('source-list');
    list.innerHTML = library.sources.length
      ? library.sources.map((source) => {
          const used = library.papers.filter((paper) => paper.sourceIds.includes(source.id)).length;
          return `
          <li class="library-row">
            <div class="library-main">
              <a class="library-title" href="${escapeHTML(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(source.title)} <span class="i i-up-right" aria-hidden="true"></span></a>
              <span class="library-meta">${[source.publisher, source.kind, `added ${formatDate(source.addedAt)}`, used ? `cited in ${used} ${used === 1 ? 'paper' : 'papers'}` : 'not cited yet'].filter(Boolean).map(escapeHTML).join(' · ')}</span>
              ${source.note ? `<p class="library-note">${escapeHTML(source.note)}</p>` : ''}
            </div>
            <div class="library-actions">
              <button type="button" class="text-button" data-copy-citation="${source.id}">Copy citation</button>
              <button type="button" class="text-button danger" data-remove-source="${source.id}">Remove</button>
            </div>
          </li>`;
        }).join('')
      : '<li class="empty-note">No sources yet. Add the first one above.</li>';
  };

  document.getElementById('source-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const error = document.getElementById('source-error');
    const url = form.elements.url.value.trim();
    const title = form.elements.title.value.trim();
    error.textContent = '';
    if (!title) { error.textContent = 'Give the source a title.'; return; }
    if (!isWebURL(url)) { error.textContent = 'Enter a full link starting with https://'; return; }
    library.sources.unshift({ id: makeId(), title, url, publisher: form.elements.publisher.value.trim(), kind: form.elements.kind.value, note: form.elements.note.value.trim(), addedAt: new Date().toISOString() });
    if (!persist()) { library.sources.shift(); return; }
    form.reset();
    updateCounts(); renderSources(); renderEditor();
    say('Source added.');
  });

  panels.sources.addEventListener('click', (event) => {
    const copy = event.target.closest('[data-copy-citation]');
    const remove = event.target.closest('[data-remove-source]');
    if (copy) {
      const source = library.sources.find((item) => item.id === copy.dataset.copyCitation);
      navigator.clipboard?.writeText(citation(source)).then(() => say('Citation copied.'), () => say('Your browser blocked copying.', 'error'));
    }
    if (remove) {
      const source = library.sources.find((item) => item.id === remove.dataset.removeSource);
      if (!window.confirm(`Remove "${source.title}"? It will also be detached from any paper that cites it.`)) return;
      library.sources = library.sources.filter((item) => item.id !== source.id);
      library.papers.forEach((paper) => { paper.sourceIds = paper.sourceIds.filter((id) => id !== source.id); });
      persist(); updateCounts(); renderSources(); renderEditor();
    }
  });

  /* ---------- documents ---------- */
  const renderDocs = () => {
    const list = document.getElementById('doc-list');
    const total = library.docs.reduce((sum, doc) => sum + doc.size, 0);
    document.getElementById('doc-quota').textContent = `${formatBytes(total)} of ${formatBytes(LIMITS.totalDocBytes)} used`;
    list.innerHTML = library.docs.length
      ? library.docs.map((doc) => `
          <li class="library-row">
            <div class="library-main">
              <span class="library-title">${escapeHTML(doc.name)}</span>
              <span class="library-meta">${escapeHTML(doc.type || 'file')} · ${formatBytes(doc.size)} · added ${formatDate(doc.addedAt)}</span>
            </div>
            <div class="library-actions">
              <a class="text-button" href="${escapeHTML(doc.data)}" download="${escapeHTML(doc.name)}">Download</a>
              <button type="button" class="text-button danger" data-remove-doc="${doc.id}">Remove</button>
            </div>
          </li>`).join('')
      : '<li class="empty-note">No documents yet. Upload a PDF, notes or a dataset extract.</li>';
  };

  document.getElementById('doc-input').addEventListener('change', async (event) => {
    const input = event.target;
    const error = document.getElementById('doc-error');
    error.textContent = '';
    for (const file of input.files) {
      const total = library.docs.reduce((sum, doc) => sum + doc.size, 0);
      if (file.size > LIMITS.docBytes) { error.textContent = `${file.name} is over ${formatBytes(LIMITS.docBytes)}. Keep a link in Sources for larger files.`; continue; }
      if (total + file.size > LIMITS.totalDocBytes) { error.textContent = 'Document storage is full. Remove a file first.'; break; }
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      }).catch(() => null);
      if (!data) { error.textContent = `${file.name} could not be read.`; continue; }
      const doc = { id: makeId(), name: file.name, type: file.type, size: file.size, data, addedAt: new Date().toISOString() };
      library.docs.unshift(doc);
      if (!persist()) { library.docs.shift(); break; }
    }
    input.value = '';
    updateCounts(); renderDocs(); renderEditor();
  });

  panels.docs.addEventListener('click', (event) => {
    const remove = event.target.closest('[data-remove-doc]');
    if (!remove) return;
    const doc = library.docs.find((item) => item.id === remove.dataset.removeDoc);
    if (!window.confirm(`Remove "${doc.name}"?`)) return;
    library.docs = library.docs.filter((item) => item.id !== doc.id);
    library.papers.forEach((paper) => { paper.docIds = paper.docIds.filter((id) => id !== doc.id); });
    persist(); updateCounts(); renderDocs(); renderEditor();
  });

  /* ---------- suggested pathways ---------- */
  const paths = starterFor(user.interests).paths;
  const pathList = document.getElementById('pathway-list');
  pathList.innerHTML = paths.length
    ? paths.slice(0, 5).map((path) => `<a class="pathway-row" href="${path.href}"><span class="pathway-interest">${escapeHTML(path.interest)}</span><span class="pathway-link">${escapeHTML(path.label)}</span><span class="i i-right" aria-hidden="true"></span></a>`).join('')
    : '<p class="empty-note">Add interests on your account page to get suggested starting points.</p>';

  document.getElementById('hub-user').textContent = user.name;

  updateCounts();
  renderPaperList();
  renderEditor();
  renderSources();
  renderDocs();
  showTab('papers');
}