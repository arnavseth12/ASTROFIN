import { CONFIG } from '../config.js';
import { fetchJSON } from './http.js';

function normalizeApod(payload) {
  const record = Array.isArray(payload) ? payload[0] : payload;
  if (!record || typeof record !== 'object') throw new Error('NASA APOD returned an empty record.');
  const mediaType = record.media_type || record.type || 'image';
  const rawTitle = record.title;
  const title = typeof rawTitle === 'string' ? rawTitle : rawTitle?.rendered;
  const imageUrl = record.hdurl || record.image_url || record.media_url || '';
  return {
    title: title || 'Astronomy Picture of the Day',
    date: record.date || record.post_date || '',
    explanation: record.explanation || record.caption || 'NASA has not supplied an explanation for this item.',
    mediaType,
    imageUrl,
    pageUrl: record.permalink || record.url || 'https://science.nasa.gov/astronomy/',
    credit: record.credit || record.copyright || 'NASA / APOD',
    alt: record.alt || record.title || 'Astronomical image from NASA APOD'
  };
}

export async function getApod() {
  const url = new URL(CONFIG.apod);
  url.searchParams.set('api_key', 'DEMO_KEY');

  try {
    // The current NASA feed documents date/count/api_key parameters.
    // Do not use WordPress's generic per_page parameter here.
    const data = await fetchJSON(url.toString(), { ttl: 60 * 60 * 1000 });
    return normalizeApod(data);
  } catch (primaryError) {
    // Temporary compatibility fallback while NASA's legacy passthrough remains online.
    // NASA announced that this legacy endpoint is scheduled for retirement on 1 Dec 2026.
    const fallback = new URL('https://api.nasa.gov/planetary/apod');
    fallback.searchParams.set('api_key', 'DEMO_KEY');
    try {
      const data = await fetchJSON(fallback.toString(), { ttl: 60 * 60 * 1000 });
      return normalizeApod(data);
    } catch (fallbackError) {
      throw new Error(`Current APOD feed failed (${primaryError.message}); fallback also failed (${fallbackError.message}).`);
    }
  }
}

export async function searchNasaImages(query, limit = 18) {
  const url = new URL('/search', CONFIG.nasaImages);
  url.search = new URLSearchParams({ q: query, media_type: 'image', page_size: String(limit) });
  const data = await fetchJSON(url.toString(), { ttl: 30 * 60 * 1000 });
  return (data.collection?.items || []).map((item) => {
    const meta = item.data?.[0] || {};
    const preview = item.links?.find((link) => link.rel === 'preview')?.href || '';
    return {
      id: meta.nasa_id || `${meta.title || 'nasa-media'}-${meta.date_created || 'undated'}`,
      title: meta.title || 'Untitled NASA media record',
      description: meta.description || '',
      date: meta.date_created || '',
      center: meta.center || 'NASA',
      image: preview,
      nasaId: meta.nasa_id || '',
      source: item.href || 'https://images.nasa.gov/'
    };
  }).filter((item) => item.image);
}
