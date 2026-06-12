import { jsonResponse, parseJson, getAuthenticatedAdmin, ensureDefaultCategory } from '../../../lib/utils.js';

async function requireAdmin(request, env) {
  return await getAuthenticatedAdmin(request, env);
}

export async function onRequestPut({ request, env, params }) {
  const admin = await requireAdmin(request, env);
  if (!admin) return jsonResponse({ success: false, message: '未登录' }, 401);
  await ensureDefaultCategory(env.D1);
  const id = params.id;
  const cat = await env.D1.prepare('SELECT is_default FROM categories WHERE id = ?').bind(id).first();
  if (cat?.is_default) return jsonResponse({ success: false, message: '默认分类不可修改' }, 403);
  const body = await parseJson(request);
  const { name, parentId, icon, sortOrder = 0 } = body;
  const isPrivate = body.isPrivate ? 1 : 0;
  if (!name) return jsonResponse({ success: false, message: '分类名称不能为空' }, 400);
  await env.D1.prepare('UPDATE categories SET name=?, parent_id=?, icon=?, sort_order=?, is_private=? WHERE id=?')
    .bind(name, parentId || null, icon || '', sortOrder, isPrivate, id).run();
  return jsonResponse({ success: true });
}

export async function onRequestDelete({ request, env, params }) {
  const admin = await requireAdmin(request, env);
  if (!admin) return jsonResponse({ success: false, message: '未登录' }, 401);
  await ensureDefaultCategory(env.D1);
  const id = params.id;
  const cat = await env.D1.prepare('SELECT is_default FROM categories WHERE id = ?').bind(id).first();
  if (cat?.is_default) return jsonResponse({ success: false, message: '默认分类不可删除' }, 403);
  await env.D1.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();
  return jsonResponse({ success: true });
}
