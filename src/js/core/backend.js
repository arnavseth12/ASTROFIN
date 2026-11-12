/**
 * Supabase connection. Set both variables in .env (see .env.example) and
 * accounts, sessions and libraries are stored on the server. Leave them unset
 * and the site keeps working with browser-only accounts.
 *
 * The anon key is designed to be public. What protects the data is the row
 * level security in supabase/schema.sql, not the key.
 */

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const backendEnabled = Boolean(url && key);

/** Captured before the client strips the tokens from the address bar. */
export const recoveryLink = typeof window !== 'undefined' && /type=recovery/.test(window.location.hash);

let client;

export async function getClient() {
  if (!backendEnabled) throw new Error('The database is not configured.');
  if (!client) {
    const { createClient } = await import('@supabase/supabase-js');
    client = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  }
  return client;
}