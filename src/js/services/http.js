/** Shared fetch utilities with bounded requests and a small local cache. */
const CACHE_PREFIX = 'astro-cache-v2:';

export function endpointURL(base, path) {
  const normalizedBase = `${String(base).replace(/\/+$/, '')}/`;
  const normalizedPath = String(path).replace(/^\/+/, '');
  return new URL(normalizedPath, normalizedBase);
}

export async function fetchJSON(url, { ttl = 0, timeout = 15000, headers = {} } = {}) {
  const cacheKey = CACHE_PREFIX + url;
  let cached = null;

  if (ttl > 0) {
    try {
      cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      if (cached && Date.now() - cached.savedAt < ttl) return cached.data;
    } catch {
      cached = null;
    }
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json', ...headers },
      signal: controller.signal
    });

    if (!response.ok) {
      let detail = '';
      try {
        const body = await response.json();
        detail = body.detail || body.message || body.error || '';
      } catch {
        // Some providers return plain-text error bodies.
      }
      throw new Error(`HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}${detail ? ` — ${detail}` : ''}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('json')) {
      throw new Error(`Expected JSON but received "${contentType || 'unknown content type'}".`);
    }

    const data = await response.json();
    if (ttl > 0) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), data }));
      } catch {
        // Storage is optional; the successful network response remains usable.
      }
    }
    return data;
  } catch (error) {
    if (cached?.data) return cached.data;
    if (error?.name === 'AbortError') {
      throw new Error(`Request timed out after ${Math.round(timeout / 1000)} seconds.`);
    }
    if (error instanceof TypeError) {
      throw new Error('The browser could not read this API response. Check your internet connection and whether the provider allows browser requests (CORS).');
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function setStatus(element, message, state = 'info') {
  if (!element) return;
  element.textContent = message;
  element.dataset.state = state;
}

export function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

export function formatDate(value, options = { dateStyle: 'medium' }) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(undefined, options).format(date);
}
