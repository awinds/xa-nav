import { jsonResponse } from '../lib/utils.js';

export async function onRequestGet({ env }) {
  await env.D1.prepare(`CREATE TABLE IF NOT EXISTS friend_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '',
    description TEXT DEFAULT '',
    url TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();

  const result = await env.D1.prepare(`
    SELECT id, name, icon, description, url, enabled, sort_order AS sortOrder
    FROM friend_links
    WHERE enabled = 1
    ORDER BY sort_order DESC, created_at DESC
  `).all();

  return jsonResponse({ friendLinks: result?.results || [] });
}
