import { jsonResponse, parseJson, getAuthenticatedAdmin } from '../../lib/utils.js';

async function requireAdmin(request, env) {
  return await getAuthenticatedAdmin(request, env);
}

async function ensureFriendLinksTable(env) {
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
}

function normalizePayload(body) {
  return {
    name: String(body.name || '').trim(),
    icon: String(body.icon || '').trim(),
    description: String(body.description || '').trim(),
    url: String(body.url || '').trim(),
    enabled: body.enabled === false || body.enabled === '0' || body.enabled === 0 ? 0 : 1,
    sortOrder: Number(body.sortOrder ?? body.sort_order ?? 0) || 0,
  };
}

export async function onRequestGet({ request, env }) {
  const admin = await requireAdmin(request, env);
  if (!admin) return jsonResponse({ success: false, message: '未登录' }, 401);

  await ensureFriendLinksTable(env);
  const result = await env.D1.prepare(`
    SELECT id, name, icon, description, url, enabled, sort_order AS sortOrder
    FROM friend_links
    ORDER BY sort_order DESC, created_at DESC
  `).all();

  return jsonResponse({ friendLinks: result?.results || [] });
}

export async function onRequestPost({ request, env }) {
  const admin = await requireAdmin(request, env);
  if (!admin) return jsonResponse({ success: false, message: '未登录' }, 401);

  await ensureFriendLinksTable(env);
  const data = normalizePayload(await parseJson(request));
  if (!data.name || !data.url) return jsonResponse({ success: false, message: '站点名和 URL 不能为空' }, 400);

  const write = await env.D1.prepare('INSERT INTO friend_links (name, icon, description, url, enabled, sort_order) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(data.name, data.icon, data.description, data.url, data.enabled, data.sortOrder)
    .run();

  const friendLink = await env.D1.prepare(`
    SELECT id, name, icon, description, url, enabled, sort_order AS sortOrder
    FROM friend_links
    WHERE id = ?
  `).bind(write.meta.last_row_id).first();

  return jsonResponse({ success: true, friendLink });
}
