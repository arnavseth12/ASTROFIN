import { getUpcomingLaunches } from '../services/launches.js';
import { setStatus, formatDate, escapeHTML } from '../services/http.js';

export async function initMissions() {
  const status = document.getElementById('launch-status');
  const list = document.getElementById('launch-list');
  if (!list) return;
  setStatus(status, 'Requesting current launch records…');
  try {
    const launches = await getUpcomingLaunches(12);
    if (!launches.length) throw new Error('No upcoming launch records returned.');
    list.innerHTML = launches.map((launch) => `
      <article class="launch-row"><div class="launch-main"><span class="data-label">${escapeHTML(launch.provider)} · ${escapeHTML(launch.status)}</span><h2>${escapeHTML(launch.name)}</h2><p>${escapeHTML(launch.location)}</p></div>
      <div class="launch-time"><span class="data-label">NET (UTC)</span><strong>${escapeHTML(formatDate(launch.date, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }))}</strong><a href="${escapeHTML(launch.url)}" target="_blank" rel="noopener noreferrer">Mission record <span class="i i-up-right" aria-hidden="true"></span></a></div></article>`).join('');
    setStatus(status, `${launches.length} upcoming records returned. Launch dates and statuses can change; verify with the mission operator.`);
  } catch (error) {
    setStatus(status, `Launch feed unavailable: ${error.message}`, 'error');
  }
}
