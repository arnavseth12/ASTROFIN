import { defineConfig } from 'vite';
import { resolve } from 'node:path';

const pages = [
  'index',
  'observatory',
  'news',
  'explore',
  'research',
  'laboratory',
  'simulations',
  'missions',
  'discoveries',
  'about',
  'diagnostics',
  'signup',
  'signin',
  'account',
  'hub'
];

const exoplanetArchiveProxy = {
  target: 'https://exoplanetarchive.ipac.caltech.edu',
  changeOrigin: true,
  secure: true,
  rewrite: (path) => path.replace(/^\/api\/exoplanet-archive/, '')
};

export default defineConfig({
  base: './',
  server: {
    proxy: {
      '/api/exoplanet-archive': exoplanetArchiveProxy
    }
  },
  preview: {
    proxy: {
      '/api/exoplanet-archive': exoplanetArchiveProxy
    }
  },
  build: {
    rollupOptions: {
      input: Object.fromEntries(
        pages.map((page) => [page, resolve(process.cwd(), `${page}.html`)])
      )
    }
  }
});