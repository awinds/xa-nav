const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json;charset=utf-8',
      ...extraHeaders,
    },
  });
}

export async function parseJson(request) {
  const text = await request.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export function getCookie(header, name) {
  if (!header) return null;
  const cookies = header.split(';').map((item) => item.trim());
  for (const cookie of cookies) {
    const [key, ...rest] = cookie.split('=');
    if (key === name) return rest.join('=');
  }
  return null;
}

export function createCookie(name, value, options = {}) {
  const parts = [`${name}=${value}`];
  if (options.maxAge) parts.push(`Max-Age=${options.maxAge}`);
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options.domain) parts.push(`Domain=${options.domain}`);
  if (options.expires) parts.push(`Expires=${options.expires.toUTCString()}`);
  return parts.join('; ');
}

function base64UrlEncode(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sha256(text) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(text));
  return base64UrlEncode(digest);
}

export async function hmacSha256(key, message) {
  const cryptoKey = await crypto.subtle.importKey('raw', encoder.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
  return base64UrlEncode(signature);
}

export async function createSignedToken(payload, secret, maxAgeSeconds = 300) {
  const expiry = Math.floor(Date.now() / 1000) + maxAgeSeconds;
  const token = `${payload}.${expiry}`;
  const signature = await hmacSha256(secret, token);
  return `${token}.${signature}`;
}

export async function verifySignedToken(token, secret) {
  if (!token || !secret) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [payload, expiry, signature] = parts;
  const raw = `${payload}.${expiry}`;
  const expected = await hmacSha256(secret, raw);
  if (expected !== signature) return null;
  const now = Math.floor(Date.now() / 1000);
  if (now > Number(expiry)) return null;
  return { payload, expiry: Number(expiry) };
}

export async function createAuthToken(adminId, secret, maxAgeSeconds) {
  return createSignedToken(String(adminId), secret, maxAgeSeconds);
}

export async function verifyAuthToken(token, secret) {
  const result = await verifySignedToken(token, secret);
  return result ? result.payload : null;
}

export function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

export function buildSearchFilter(keyword) {
  return normalizeText(keyword);
}

export function createCaptchaSvg(code) {
  const letters = code.split('').map((char, index) => {
    const rotate = Math.floor(Math.random() * 20) - 10;
    return `<text x="${20 + index * 24}" y="40" fill="#2b6cb0" font-size="28" transform="rotate(${rotate}, ${20 + index * 24}, 40)">${char}</text>`;
  }).join('');
  return `data:image/svg+xml;base64,${btoa(`<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="150" height="60"><defs><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/></filter></defs><rect width="150" height="60" fill="#eef2ff"/><g filter="url(#noise)"><rect width="150" height="60" fill="transparent"/></g>${letters}</svg>`)}`;
}

export function randomCaptchaCode(length = 5) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function ensureDefaultConfig(db) {
  const defaults = [
    ['cookie_max_age', '86400'],
    ['enable_turnstile', '0'],
    ['enable_captcha', '1'],
    ['turnstile_sitekey', ''],
    ['turnstile_secret', ''],
    ['site_title', 'XA-Nav'],
    ['site_description', '一个轻量、美观、可自托管的导航与书签管理平台，支持分类管理、私密收藏、友情链接、数据备份和智能元数据获取'],
    ['site_logo', ''],
    ['site_copyright', ''],
    ['favicon_api', 'https://icon.horse/icon/'],
    ['enable_ai_meta', '0'],
    ['default_lang', 'zh'],
  ];
  for (const [key, value] of defaults) {
    await db.prepare('INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)').bind(key, value).run();
  }
}

async function ensureDefaultCategory(db) {
  await db.prepare('INSERT OR IGNORE INTO categories (name, icon, sort_order, is_default, is_private) VALUES (?, ?, ?, 1, 0)')
    .bind('默认', 'fa-solid fa-folder', 999)
    .run();
}

async function ensureDefaultFriendLink(db) {
  await db.prepare(`
    INSERT INTO friend_links (name, icon, description, url, enabled, sort_order)
    SELECT ?, ?, ?, ?, 1, ?
    WHERE NOT EXISTS (SELECT 1 FROM friend_links WHERE url = ?)
  `)
    .bind('半日闲', '', '偷得浮生半日闲', 'https://www.xiaoa.me', 999, 'https://www.xiaoa.me')
    .run();
}

export async function ensureSiteInitialized(db) {
  const marker = await db.prepare('SELECT value FROM config WHERE key = ?').bind('__site_initialized').first();
  if (marker?.value === '1') return;

  await ensureDefaultConfig(db);
  await ensureDefaultCategory(db);
  await ensureDefaultFriendLink(db);
  await db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').bind('__site_initialized', '1').run();
}

export function getEnvAdmin(env) {
  const username = env.ADMIN_USER || 'admin';
  return {
    id: 'admin',
    username,
    displayName: username,
    role: 'admin',
  };
}

export const DEFAULT_AUTH_SECRET = 'IBfd3HhmZcPRttzv3Sup2xSvG3u5c8d-uNgSAVbqitzGZvYEt7yHym-IvoKrmlm7';

export function getAuthSecret(env) {
  return env.AUTH_SECRET || DEFAULT_AUTH_SECRET;
}

export async function getAuthenticatedAdmin(request, env) {
  const token = getCookie(request.headers.get('Cookie') || '', 'XA_NAV_AUTH');
  const payload = await verifyAuthToken(token, getAuthSecret(env));
  if (!payload) return null;
  return getEnvAdmin(env);
}

export async function isAuthenticated(request, env) {
  return Boolean(await getAuthenticatedAdmin(request, env));
}

export async function getConfigMap(db) {
  const result = await db.prepare('SELECT key, value FROM config').all();
  return (result?.results || []).reduce((acc, item) => ({ ...acc, [item.key]: item.value }), {});
}
