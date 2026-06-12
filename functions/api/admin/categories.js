import { jsonResponse, parseJson, getAuthenticatedAdmin, ensureDefaultCategory } from '../../lib/utils.js';

async function requireAdmin(request, env) {
  return await getAuthenticatedAdmin(request, env);
}

export async function onRequestGet({ env }) {
  await ensureDefaultCategory(env.D1);
  const result = await env.D1.prepare(
    'SELECT id, name, parent_id AS parentId, icon, sort_order AS sortOrder, is_default AS isDefault, is_private AS isPrivate FROM categories ORDER BY sort_order DESC, id ASC'
  ).all();
  return jsonResponse({ categories: result?.results || [] });
}

export async function onRequestPost({ request, env }) {
  const admin = await requireAdmin(request, env);
  if (!admin) return jsonResponse({ success: false, message: '未登录' }, 401);
  await ensureDefaultCategory(env.D1);
  const body = await parseJson(request);
  const { name, parentId, icon, sortOrder = 0 } = body;
  const isPrivate = body.isPrivate ? 1 : 0;
  if (!name) return jsonResponse({ success: false, message: '分类名称不能为空' }, 400);
  await env.D1.prepare('INSERT INTO categories (name, parent_id, icon, sort_order, is_default, is_private) VALUES (?, ?, ?, ?, 0, ?)')
    .bind(name, parentId || null, icon || '', sortOrder, isPrivate).run();
  return jsonResponse({ success: true });
}

export async function onRequestPut() {
  return new Response('请使用 /api/admin/categories/:id', { status: 404 });
}

export async function onRequestDelete() {
  return new Response('请使用 /api/admin/categories/:id', { status: 404 });
}
