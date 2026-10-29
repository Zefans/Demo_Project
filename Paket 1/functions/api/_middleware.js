import { json } from './_shared.js';

export async function onRequest({ next }) {
  try { return await next(); }
  catch (error) { return json({ error: error.message || 'Layanan belum siap. Periksa pengaturan Cloudflare.' }, 503); }
}
