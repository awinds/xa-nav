import { jsonResponse } from '../lib/utils.js';

export async function onRequestGet({ env }) {
  const result = await env.db.prepare(`
    SELECT id, name, icon, description, url, enabled, sort_order AS sortOrder
    FROM friend_links
    WHERE enabled = 1
    ORDER BY sort_order DESC, created_at DESC
  `).all();

  return jsonResponse({ friendLinks: result?.results || [] });
}
