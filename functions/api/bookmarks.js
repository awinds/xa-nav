import { jsonResponse, isAuthenticated } from '../lib/utils.js';

export async function onRequestGet({ request, env }) {
  const authed = await isAuthenticated(request, env);
  const result = await env.db.prepare(`
    SELECT b.id, b.title, b.url, b.description, b.favicon, b.tags, b.sort_order AS sortOrder,
      b.category_id AS categoryId, c.name AS categoryName, c.icon AS categoryIcon
    FROM bookmarks b
    LEFT JOIN categories c ON b.category_id = c.id
    LEFT JOIN categories p ON c.parent_id = p.id
    WHERE b.enabled = 1
      AND (? = 1 OR (COALESCE(c.is_private, 0) = 0 AND COALESCE(p.is_private, 0) = 0))
    ORDER BY b.sort_order DESC, b.created_at DESC
  `).bind(authed ? 1 : 0).all();
  return jsonResponse({ bookmarks: result?.results || [] });
}
