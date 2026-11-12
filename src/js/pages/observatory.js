import { getApod, searchNasaImages } from '../services/nasa.js';
import { formatDate, setStatus, escapeHTML } from '../services/http.js';

export async function initObservatory() {
  const img = document.getElementById('observatory-apod-image');
  const placeholder = document.getElementById('observatory-apod-placeholder');
  try {
    const apod = await getApod();
    setText('observatory-date', apod.date ? formatDate(apod.date) : 'NASA / APOD');
    setText('observatory-apod-title', apod.title);
    setText('observatory-apod-explanation', apod.explanation);
    setText('observatory-apod-credit', `Source: ${apod.credit}`);
    const open = document.getElementById('observatory-apod-open');
    if (open) open.href = apod.pageUrl;
    if (apod.mediaType === 'image' && img && apod.imageUrl) {
      img.src = apod.imageUrl;
      img.alt = apod.alt;
      img.hidden = false;
      img.addEventListener('error', () => {
        img.hidden = true;
        if (placeholder) {
          placeholder.hidden = false;
          placeholder.textContent = 'The image could not be loaded. Open the original NASA record instead.';
        }
      }, { once: true });
      if (placeholder) placeholder.hidden = true;
    } else if (placeholder) {
      placeholder.textContent = `Today's APOD is ${apod.mediaType}. Use the original source link to view it.`;
    }
  } catch (error) {
    if (placeholder) placeholder.textContent = `NASA APOD unavailable: ${error.message}`;
  }

  const form = document.getElementById('image-search-form');
  form?.addEventListener('submit', searchImages);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

async function searchImages(event) {
  event.preventDefault();
  const query = document.getElementById('image-query')?.value.trim();
  const status = document.getElementById('image-search-status');
  const results = document.getElementById('image-results');
  if (!query || !results) return;
  setStatus(status, 'Searching NASA’s media archive…');
  results.replaceChildren();
  try {
    const records = await searchNasaImages(query, 18);
    if (!records.length) throw new Error('No image records were returned. Try a broader search term.');
    results.innerHTML = records.map((item) => `
      <article class="media-result">
        <a href="${escapeHTML(item.source)}" target="_blank" rel="noopener noreferrer" class="media-result-image">
          <img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.title)}" loading="lazy">
        </a>
        <div class="media-result-copy"><span class="data-label">${escapeHTML(item.center)} · ${escapeHTML(formatDate(item.date))}</span>
        <h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.description.slice(0, 220))}</p>
        <a class="source-link" href="${escapeHTML(item.source)}" target="_blank" rel="noopener noreferrer">Open NASA record <span class="i i-up-right" aria-hidden="true"></span></a></div>
      </article>`).join('');
    setStatus(status, `${records.length} NASA media records returned. These are archive items, not necessarily scientific observations.`);
  } catch (error) {
    setStatus(status, `NASA image search failed: ${error.message}`, 'error');
  }
}
