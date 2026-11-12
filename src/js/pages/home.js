import { getApod } from '../services/nasa.js';
import { getNews } from '../services/news.js';
import { cosmicFacts, challenges, dailyItem } from '../data/editorial.js';
import { formatDate } from '../services/http.js';

export async function initHome() {
  const year = document.querySelector('[data-current-year]');
  if (year) year.textContent = new Date().getFullYear();

  const fact = dailyItem(cosmicFacts);
  setText('home-fact-title', fact.title);
  setText('home-fact-text', fact.text);
  const factSource = document.getElementById('home-fact-source');
  if (factSource) factSource.href = fact.source;

  const challenge = dailyItem(challenges);
  setText('challenge-type', challenge.type);
  setText('challenge-title', challenge.title);
  setText('challenge-prompt', challenge.prompt);
  setText('challenge-answer', challenge.answer);

  const searchForm = document.getElementById('home-search-form');
  searchForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const q = document.getElementById('home-search')?.value.trim();
    if (q) window.location.href = `./explore.html?q=${encodeURIComponent(q)}`;
  });

  loadHomeApod();
  loadHomeNews();
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

async function loadHomeApod() {
  try {
    const apod = await getApod();
    setText('home-apod-date', apod.date ? formatDate(apod.date) : 'NASA / APOD');
    setText('home-apod-title', apod.title);
    const explanation = apod.explanation.length > 230
      ? `${apod.explanation.slice(0, 227).trimEnd()}…`
      : apod.explanation;
    setText('home-apod-caption', explanation);
    setText('home-apod-credit', `Image: ${apod.credit}`);
    const source = document.getElementById('home-apod-source');
    if (source) source.href = apod.pageUrl;
    const image = document.getElementById('home-apod-image');
    const placeholder = document.getElementById('home-apod-placeholder');
    if (apod.mediaType === 'image' && apod.imageUrl && image) {
      image.src = apod.imageUrl;
      image.alt = apod.alt;
      image.hidden = false;
      image.addEventListener('error', () => {
        image.hidden = true;
        if (placeholder) {
          placeholder.hidden = false;
          placeholder.textContent = 'The NASA image could not be loaded. Open the source record instead.';
        }
      }, { once: true });
      if (placeholder) placeholder.hidden = true;
    } else if (placeholder) {
      placeholder.textContent = apod.mediaType === 'image'
        ? 'NASA has not supplied an image URL for this record.'
        : `Today's APOD is ${apod.mediaType}. Open the NASA source to view it.`;
    }
  } catch (error) {
    const placeholder = document.getElementById('home-apod-placeholder');
    if (placeholder) placeholder.textContent = `NASA's image feed is unavailable right now: ${error.message}`;
  }
}

async function loadHomeNews() {
  const container = document.getElementById('home-news');
  if (!container) return;
  try {
    const articles = await getNews(3);
    if (!articles.length) throw new Error('The feed returned no articles.');
    container.replaceChildren(...articles.map((article) => {
      const item = document.createElement('a');
      item.className = 'news-brief-item';
      item.href = article.url;
      item.target = '_blank';
      item.rel = 'noopener noreferrer';
      const title = document.createElement('strong');
      title.textContent = article.title;
      const meta = document.createElement('span');
      meta.textContent = `${article.source} · ${formatDate(article.date)}`;
      item.append(title, meta);
      return item;
    }));
  } catch (error) {
    const message = document.createElement('p');
    message.className = 'loading-line';
    message.textContent = `News feed unavailable: ${error.message}`;
    container.replaceChildren(message);
  }
}
