import { CONFIG } from '../config.js';
import { fetchJSON } from './http.js';

/* NASA Exoplanet Archive TAP service.
   The confirmed-planet table uses tic_id; the TOI table uses tid. */

function tapURL(query) {
  if (!CONFIG.exoplanetTap) {
    throw new Error('The Exoplanet Archive requires a server-side TAP proxy. Local development uses the Vite proxy.');
  }

  const url = new URL(CONFIG.exoplanetTap, window.location.origin);
  url.search = new URLSearchParams({ query, format: 'json' }).toString();
  return url.toString();
}

function safeLiteral(value) {
  return String(value ?? '')
    .trim()
    .replace(/[\x00-\x1f\x7f]/g, '')
    .replace(/'/g, "''");
}

function clampLimit(value, minimum, maximum) {
  const number = Number(value);
  if (!Number.isFinite(number)) return minimum;
  return Math.min(Math.max(Math.floor(number), minimum), maximum);
}

async function runQuery(query, ttl) {
  const rows = await fetchJSON(tapURL(query), { ttl });
  if (!Array.isArray(rows)) {
    throw new Error('NASA Exoplanet Archive returned an unexpected response.');
  }
  return rows;
}

function normalizeCandidate(row) {
  // `tid` is the canonical TOI-table field. `tic_id` remains as an alias
  // for older ASTRO UI code that already reads row.tic_id.
  return {
    ...row,
    tic_id: row.tid ?? row.tic_id ?? null,
    disposition: row.tfopwg_disp ?? null
  };
}

export async function searchConfirmedPlanets(searchTerm, limit = 30) {
  const term = safeLiteral(searchTerm);
  if (!term) return [];

  const safeLimit = clampLimit(limit, 1, 100);
  const query = `
    SELECT TOP ${safeLimit}
      pl_name, hostname, discoverymethod, disc_year,
      pl_rade, pl_bmasse, pl_orbper
    FROM pscomppars
    WHERE pl_name LIKE '%${term}%' OR hostname LIKE '%${term}%'
    ORDER BY disc_year DESC
  `;

  return runQuery(query, 60 * 60 * 1000);
}

export async function getCandidateTargets(limit = 100) {
  const safeLimit = clampLimit(limit, 10, 200);
  const query = `
    SELECT TOP ${safeLimit}
      toi, tid, tfopwg_disp, ra, dec,
      pl_orbper, pl_trandep, pl_rade, pl_eqt, st_tmag
    FROM toi
    WHERE tfopwg_disp IN ('PC', 'APC')
      AND ra IS NOT NULL
      AND dec IS NOT NULL
    ORDER BY toi DESC
  `;

  const rows = await runQuery(query, 6 * 60 * 60 * 1000);
  return rows.map(normalizeCandidate);
}

export async function findCandidate(identifier) {
  const value = String(identifier ?? '').trim();
  let condition;

  if (/^\d+(?:\.\d+)?$/.test(value)) {
    condition = `toi = ${value}`;
  } else if (/^TIC\s*\d+$/i.test(value)) {
    const ticNumber = value.replace(/\D/g, '');
    condition = `tid = ${ticNumber}`;
  } else {
    throw new Error('Enter a TOI number (for example 123.01) or TIC identifier (for example TIC 123456789).');
  }

  const query = `
    SELECT TOP 10
      toi, tid, tfopwg_disp, ra, dec,
      pl_orbper, pl_trandep, pl_rade, pl_eqt, st_tmag
    FROM toi
    WHERE ${condition}
  `;

  const rows = await runQuery(query, 60 * 60 * 1000);
  return rows.map(normalizeCandidate);
}
