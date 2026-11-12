import { CONFIG } from '../config.js';
import { fetchJSON, endpointURL } from './http.js';

export async function getNews(limit = 12) {
  // Keep the /v4 path segment; a leading slash would silently drop it.
  const url = endpointURL(CONFIG.spaceflightNews, 'articles/');
  url.search = new URLSearchParams({ limit: String(limit) });
  const data = await fetchJSON(url.toString(), { ttl: 20 * 60 * 1000 });
  return (data.results || []).map((item) => ({
    title: item.title || 'Untitled article',
    summary: item.summary || '',
    url: item.url || '',
    image: item.image_url || '',
    date: item.published_at || '',
    source: item.news_site || 'Original publisher'
  })).filter((item) => item.url);
}
