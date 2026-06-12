import { jsonResponse, ensureDefaultCategory, isAuthenticated } from '../lib/utils.js';

export async function onRequestGet({ request, env }) {
  await ensureDefaultCategory(env.D1);
  const authed = await isAuthenticated(request, env);
  const result = await env.D1.prepare(`
    SELECT c.id, c.name, c.parent_id AS parentId, c.icon, c.sort_order AS sortOrder,
      c.is_default AS isDefault, c.is_private AS isPrivate
    FROM categories c
    LEFT JOIN categories p ON c.parent_id = p.id
    WHERE ? = 1 OR (c.is_private = 0 AND COALESCE(p.is_private, 0) = 0)
    ORDER BY c.sort_order DESC, c.id ASC
  `).bind(authed ? 1 : 0).all();
  return jsonResponse({ categories: result?.results || [] });
}
