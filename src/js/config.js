const env = import.meta.env ?? {};

/*
 * The Exoplanet Archive does not currently provide browser-readable CORS
 * responses in all contexts. During local development, Vite proxies TAP
 * requests through the same origin. A deployed static site needs a hosted
 * proxy/backend configured with VITE_EXOPLANET_TAP_URL.
 */
const exoplanetTapUrl = env.DEV
  ? '/api/exoplanet-archive/TAP/sync'
  : (env.VITE_EXOPLANET_TAP_URL || '');

export const CONFIG = Object.freeze({
  apod: env.VITE_NASA_APOD_URL || 'https://science.nasa.gov/wp-json/wp/v2/apod-basic/',
  nasaImages: env.VITE_NASA_IMAGES_URL || 'https://images-api.nasa.gov',
  exoplanetTap: exoplanetTapUrl,
  spaceflightNews: env.VITE_SPACEFLIGHT_NEWS_URL || 'https://api.spaceflightnewsapi.net/v4',
  launchLibrary: env.VITE_LAUNCH_LIBRARY_URL || 'https://ll.thespacedevs.com/2.3.0'
});
