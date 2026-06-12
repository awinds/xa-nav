import { jsonResponse, parseJson, getAuthenticatedAdmin } from '../../../lib/utils.js';

async function requireAdmin(request, env) {
  return await getAuthenticatedAdmin(request, env);
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

export async function onRequestPut({ request, env, params }) {
  const admin = await requireAdmin(request, env);
  if (!admin) return jsonResponse({ success: false, message: '未登录' }, 401);

  const id = params.id;
  const data = normalizePayload(await parseJson(request));
  if (!data.name || !data.url) return jsonResponse({ success: false, message: '站点名和 URL 不能为空' }, 400);

  await env.db.prepare('UPDATE friend_links SET name=?, icon=?, description=?, url=?, enabled=?, sort_order=? WHERE id=?')
    .bind(data.name, data.icon, data.description, data.url, data.enabled, data.sortOrder, id)
    .run();

  const friendLink = await env.db.prepare(`
    SELECT id, name, icon, description, url, enabled, sort_order AS sortOrder
    FROM friend_links
    WHERE id = ?
  `).bind(id).first();

  return jsonResponse({ success: true, friendLink });
}

export async function onRequestDelete({ request, env, params }) {
  const admin = await requireAdmin(request, env);
  if (!admin) return jsonResponse({ success: false, message: '未登录' }, 401);

  await env.db.prepare('DELETE FROM friend_links WHERE id = ?').bind(params.id).run();
  return jsonResponse({ success: true });
}
