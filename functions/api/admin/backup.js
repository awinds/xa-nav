import { jsonResponse, parseJson, getAuthenticatedAdmin, ensureCategoryPrivacyColumn } from '../../lib/utils.js';

async function requireAdmin(request, env) {
  return await getAuthenticatedAdmin(request, env);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function unescapeHtml(value) {
  return String(value || '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function textAttr(value, name) {
  const match = String(value || '').match(new RegExp(`${name}="([^"]*)"`, 'i'));
  return match ? unescapeHtml(match[1]) : '';
}

function stripTags(value) {
  return unescapeHtml(String(value || '').replace(/<[^>]+>/g, '').trim());
}

function buildBookmarksHtml(categories, bookmarks) {
  const childrenByParent = new Map();
  for (const cat of categories) {
    const key = cat.parentId ? Number(cat.parentId) : 0;
    if (!childrenByParent.has(key)) childrenByParent.set(key, []);
    childrenByParent.get(key).push(cat);
  }
  const bookmarksByCat = new Map();
  for (const bookmark of bookmarks) {
    const key = bookmark.categoryId ? Number(bookmark.categoryId) : 0;
    if (!bookmarksByCat.has(key)) bookmarksByCat.set(key, []);
    bookmarksByCat.get(key).push(bookmark);
  }

  const renderBookmark = (bookmark, indent = '    ') => `${indent}<DT><A HREF="${escapeHtml(bookmark.url)}"${bookmark.tags ? ` TAGS="${escapeHtml(bookmark.tags)}"` : ''}${bookmark.description ? ` DESCRIPTION="${escapeHtml(bookmark.description)}"` : ''}>${escapeHtml(bookmark.title)}</A>`;
  const renderCategory = (cat, depth = 1) => {
    const pad = '  '.repeat(depth);
    const lines = [
      `${pad}<DT><H3>${escapeHtml(cat.name)}</H3>`,
      `${pad}<DL><p>`,
    ];
    for (const child of childrenByParent.get(Number(cat.id)) || []) lines.push(renderCategory(child, depth + 1));
    for (const bookmark of bookmarksByCat.get(Number(cat.id)) || []) lines.push(renderBookmark(bookmark, `${pad}  `));
    lines.push(`${pad}</DL><p>`);
    return lines.join('\n');
  };

  const lines = [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    '<TITLE>Bookmarks</TITLE>',
    '<H1>Bookmarks</H1>',
    '<DL><p>',
  ];
  for (const cat of childrenByParent.get(0) || []) lines.push(renderCategory(cat));
  for (const bookmark of bookmarksByCat.get(0) || []) lines.push(renderBookmark(bookmark, '  '));
  lines.push('</DL><p>');
  return lines.join('\n');
}

function parseBookmarksHtml(html) {
  const categories = [];
  const bookmarks = [];
  const stack = [];
  const tokenRe = /<DT>\s*<H3[^>]*>([\s\S]*?)<\/H3>|<DT>\s*<A\s+([^>]*)>([\s\S]*?)<\/A>|<\/DL>/gi;
  let match;
  while ((match = tokenRe.exec(html))) {
    if (match[1] !== undefined) {
      const name = stripTags(match[1]);
      if (name) {
        const parentPath = [...stack];
        const categoryPath = [...stack, name];
        categories.push({
          name,
          icon: 'fa-solid fa-folder',
          parentName: stack[stack.length - 1] || '',
          parentPath,
          categoryPath,
          sortOrder: 0,
          isPrivate: 0,
        });
        stack.push(name);
      }
      continue;
    }
    if (match[2] !== undefined) {
      const title = stripTags(match[3]);
      const url = textAttr(match[2], 'HREF');
      if (title && url) {
        bookmarks.push({
          title,
          url,
          description: textAttr(match[2], 'DESCRIPTION'),
          favicon: textAttr(match[2], 'ICON') || textAttr(match[2], 'ICON_URI'),
          categoryName: stack[stack.length - 1] || '',
          categoryPath: [...stack],
          tags: textAttr(match[2], 'TAGS'),
          sortOrder: 0,
          enabled: 1,
        });
      }
      continue;
    }
    if (stack.length) stack.pop();
  }
  return { categories, bookmarks };
}

async function readBackup(env) {
  await ensureCategoryPrivacyColumn(env.D1);
  const [categories, bookmarks, config] = await Promise.all([
    env.D1.prepare('SELECT id, name, parent_id AS parentId, icon, sort_order AS sortOrder, is_default AS isDefault, is_private AS isPrivate FROM categories ORDER BY sort_order DESC, id ASC').all(),
    env.D1.prepare('SELECT id, title, url, description, favicon, category_id AS categoryId, sort_order AS sortOrder, tags, enabled FROM bookmarks ORDER BY sort_order DESC, created_at DESC').all(),
    env.D1.prepare("SELECT key, value FROM config WHERE key != 'turnstile_secret'").all(),
  ]);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    categories: categories?.results || [],
    bookmarks: bookmarks?.results || [],
    config: config?.results || [],
  };
}

function getPathKey(path) {
  return Array.isArray(path) ? path.filter(Boolean).join('\u001f') : '';
}

async function importBackup(env, data) {
  await ensureCategoryPrivacyColumn(env.D1);
  const categories = Array.isArray(data.categories) ? data.categories : [];
  const bookmarks = Array.isArray(data.bookmarks) ? data.bookmarks : [];
  const config = Array.isArray(data.config) ? data.config : [];
  const categoryIdByName = new Map();
  const categoryIdByPath = new Map();

  for (const item of config) {
    if (!item?.key || item.key === 'turnstile_secret') continue;
    await env.D1.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)')
      .bind(item.key, String(item.value ?? '')).run();
  }

  for (const cat of categories.filter((c) => !c.parentName && !c.parentId && !getPathKey(c.parentPath))) {
    if (!cat.name) continue;
    await env.D1.prepare('INSERT OR IGNORE INTO categories (name, parent_id, icon, sort_order, is_default, is_private) VALUES (?, NULL, ?, ?, ?, ?)')
      .bind(cat.name, cat.icon || 'fa-solid fa-folder', Number(cat.sortOrder || 0), cat.isDefault ? 1 : 0, cat.isPrivate ? 1 : 0).run();
    const row = await env.D1.prepare('SELECT id FROM categories WHERE name = ? ORDER BY id DESC LIMIT 1').bind(cat.name).first();
    if (row?.id) {
      categoryIdByName.set(cat.name, row.id);
      categoryIdByPath.set(getPathKey(cat.categoryPath || [cat.name]), row.id);
    }
  }

  for (const cat of categories.filter((c) => c.parentName || c.parentId || getPathKey(c.parentPath))) {
    if (!cat.name) continue;
    const parentPathKey = getPathKey(cat.parentPath);
    const parentId = parentPathKey ? categoryIdByPath.get(parentPathKey) : (cat.parentName ? categoryIdByName.get(cat.parentName) : cat.parentId);
    await env.D1.prepare('INSERT OR IGNORE INTO categories (name, parent_id, icon, sort_order, is_default, is_private) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(cat.name, parentId || null, cat.icon || 'fa-solid fa-folder', Number(cat.sortOrder || 0), cat.isDefault ? 1 : 0, cat.isPrivate ? 1 : 0).run();
    const row = await env.D1.prepare('SELECT id FROM categories WHERE name = ? ORDER BY id DESC LIMIT 1').bind(cat.name).first();
    if (row?.id) {
      categoryIdByName.set(cat.name, row.id);
      categoryIdByPath.set(getPathKey(cat.categoryPath || [...(cat.parentPath || []), cat.name]), row.id);
    }
  }

  for (const bookmark of bookmarks) {
    if (!bookmark.title || !bookmark.url) continue;
    const categoryPathKey = getPathKey(bookmark.categoryPath);
    const categoryId = categoryPathKey ? categoryIdByPath.get(categoryPathKey) : (bookmark.categoryName ? categoryIdByName.get(bookmark.categoryName) : bookmark.categoryId);
    await env.D1.prepare('INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, sort_order, tags, enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(bookmark.title, bookmark.url, bookmark.description || '', bookmark.favicon || '', categoryId || null, Number(bookmark.sortOrder || 0), bookmark.tags || '', bookmark.enabled === 0 ? 0 : 1).run();
  }
}

export async function onRequestGet({ request, env }) {
  const admin = await requireAdmin(request, env);
  if (!admin) return jsonResponse({ success: false, message: '未登录' }, 401);
  const type = new URL(request.url).searchParams.get('type') || 'json';
  const backup = await readBackup(env);
  if (type === 'html' || type === 'browser') {
    const html = buildBookmarksHtml(backup.categories, backup.bookmarks);
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html;charset=utf-8',
        'Content-Disposition': 'attachment; filename="xa-nav-bookmarks.html"',
      },
    });
  }
  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      'Content-Type': 'application/json;charset=utf-8',
      'Content-Disposition': 'attachment; filename="xa-nav-backup.json"',
    },
  });
}

export async function onRequestPost({ request, env }) {
  const admin = await requireAdmin(request, env);
  if (!admin) return jsonResponse({ success: false, message: '未登录' }, 401);
  const body = await parseJson(request);
  if (body.type === 'html') {
    await importBackup(env, parseBookmarksHtml(body.content || ''));
    return jsonResponse({ success: true, message: '书签文件导入完成' });
  }
  await importBackup(env, body.backup || body);
  return jsonResponse({ success: true, message: 'JSON 备份导入完成' });
}
