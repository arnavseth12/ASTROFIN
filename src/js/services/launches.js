import { CONFIG } from '../config.js';
import { fetchJSON, endpointURL } from './http.js';

export async function getUpcomingLaunches(limit = 10) {
  // Keep the /2.3.0 version segment in the request path.
  const url = endpointURL(CONFIG.launchLibrary, 'launches/upcoming/');
  url.search = new URLSearchParams({ limit: String(limit), ordering: 'net' });
  const data = await fetchJSON(url.toString(), { ttl: 30 * 60 * 1000 });
  return (data.results || []).map((item) => ({
    name: item.name || 'Unnamed mission',
    date: item.net || '',
    status: item.status?.name || 'Status unavailable',
    provider: item.launch_service_provider?.name || 'Provider not listed',
    location: item.pad?.location?.name || item.pad?.name || 'Launch location unavailable',
    url: item.url || 'https://www.spacedevs.com/'
  }));
}
