import { getNews } from '../services/news.js';
import { formatDate, setStatus, escapeHTML } from '../services/http.js';

export async function initNews() {
  const status = document.getElementById('news-status');
  const container = document.getElementById('news-articles');
  if (!container) return;
  setStatus(status, 'Requesting recent spaceflight reporting…');
  try {
    const articles = await getNews(24);
    if (!articles.length) throw new Error('No articles were returned.');
    container.innerHTML = articles.map((article) => `
      <article class="article-row">
        <div class="article-copy"><div class="data-label">${escapeHTML(article.source)} / ${escapeHTML(formatDate(article.date))}</div>
        <h2><a href="${escapeHTML(article.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(article.title)}</a></h2>
        <p>${escapeHTML(article.summary)}</p></div>
        ${article.image ? `<a class="article-thumb" href="${escapeHTML(article.url)}" target="_blank" rel="noopener noreferrer"><img src="${escapeHTML(article.image)}" alt="" loading="lazy"></a>` : ''}
        <a class="article-open" href="${escapeHTML(article.url)}" target="_blank" rel="noopener noreferrer" aria-label="Open original article"><span class="i i-up-right" aria-hidden="true"></span></a>
      </article>`).join('');
    setStatus(status, `${articles.length} recent articles returned. Each headline links to its original publisher.`);
  } catch (error) {
    setStatus(status, `News service unavailable: ${error.message}`, 'error');
  }
}
