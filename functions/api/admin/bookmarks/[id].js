import { jsonResponse, parseJson, getAuthenticatedAdmin } from '../../../lib/utils.js';

async function requireAdmin(request, env) {
  return await getAuthenticatedAdmin(request, env);
}

export async function onRequestPut({ request, env, params }) {
  const admin = await requireAdmin(request, env);
  if (!admin) return jsonResponse({ success: false, message: '未登录' }, 401);
  const id = params.id;
  const body = await parseJson(request);
  const { title, url, description, favicon, categoryId, sortOrder = 0, tags = '', enabled = 1 } = body;
  if (!title || !url) return jsonResponse({ success: false, message: '标题和链接不能为空' }, 400);
  await env.D1.prepare('UPDATE bookmarks SET title=?, url=?, description=?, favicon=?, category_id=?, sort_order=?, tags=?, enabled=? WHERE id=?')
    .bind(title, url, description || '', favicon || '', categoryId || null, sortOrder, tags, enabled ? 1 : 0, id).run();
  const bookmark = await env.D1.prepare(`
    SELECT b.id, b.title, b.url, b.description, b.favicon, b.tags, b.sort_order AS sortOrder,
      b.category_id AS categoryId, b.enabled, c.name AS categoryName
    FROM bookmarks b
    LEFT JOIN categories c ON b.category_id = c.id
    WHERE b.id = ?
  `).bind(id).first();
  return jsonResponse({ success: true, bookmark });
}

export async function onRequestDelete({ request, env, params }) {
  const admin = await requireAdmin(request, env);
  if (!admin) return jsonResponse({ success: false, message: '未登录' }, 401);
  const id = params.id;
  await env.D1.prepare('DELETE FROM bookmarks WHERE id = ?').bind(id).run();
  return jsonResponse({ success: true });
}
