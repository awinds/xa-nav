import { jsonResponse, parseJson, getAuthenticatedAdmin } from '../../lib/utils.js';

async function requireAdmin(request, env) {
  return await getAuthenticatedAdmin(request, env);
}

function getId(request) {
  // 支持 /api/admin/bookmarks/123 路径参数
  const segments = new URL(request.url).pathname.split('/');
  const last = segments[segments.length - 1];
  return /^\d+$/.test(last) ? last : new URL(request.url).searchParams.get('id');
}

export async function onRequestGet({ env }) {
  const result = await env.db.prepare(`
    SELECT b.id, b.title, b.url, b.description, b.favicon, b.tags, b.sort_order AS sortOrder,
      b.category_id AS categoryId, b.enabled, c.name AS categoryName
    FROM bookmarks b
    LEFT JOIN categories c ON b.category_id = c.id
    ORDER BY b.sort_order DESC, b.created_at DESC
  `).all();
  return jsonResponse({ bookmarks: result?.results || [] });
}

export async function onRequestPost({ request, env }) {
  const admin = await requireAdmin(request, env);
  if (!admin) return jsonResponse({ success: false, message: '未登录' }, 401);
  const body = await parseJson(request);
  const { title, url, description, favicon, categoryId, sortOrder = 0, tags = '', enabled = 1 } = body;
  if (!title || !url) return jsonResponse({ success: false, message: '标题和链接不能为空' }, 400);
  const write = await env.db.prepare('INSERT INTO bookmarks (title, url, description, favicon, category_id, sort_order, tags, enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(title, url, description || '', favicon || '', categoryId || null, sortOrder, tags, enabled ? 1 : 0)
    .run();
  const bookmark = await env.db.prepare(`
    SELECT b.id, b.title, b.url, b.description, b.favicon, b.tags, b.sort_order AS sortOrder,
      b.category_id AS categoryId, b.enabled, c.name AS categoryName
    FROM bookmarks b
    LEFT JOIN categories c ON b.category_id = c.id
    WHERE b.id = ?
  `).bind(write.meta.last_row_id).first();
  return jsonResponse({ success: true, bookmark });
}

export async function onRequestPut() {
  return new Response('请使用 /api/admin/bookmarks/:id', { status: 404 });
}

export async function onRequestDelete() {
  return new Response('请使用 /api/admin/bookmarks/:id', { status: 404 });
}
