import { jsonResponse, parseJson, getAuthenticatedAdmin, ensureSiteInitialized } from '../../lib/utils.js';

async function getAdmin(request, env) {
  return await getAuthenticatedAdmin(request, env);
}

function mapConfig(rows) {
  return (rows?.results || []).reduce((acc, item) => ({ ...acc, [item.key]: item.value }), {});
}

function maskConfig(config) {
  const safeConfig = { ...config };
  const turnstileSecret = String(safeConfig.turnstile_secret || '').trim();
  delete safeConfig.turnstile_secret;
  delete safeConfig.turnstile_enabled;
  safeConfig.turnstile_secret_configured = turnstileSecret ? '1' : '0';
  return safeConfig;
}

async function getConfig(env) {
  const result = await env.db.prepare('SELECT key, value FROM config').all();
  return mapConfig(result);
}

export async function onRequestGet({ env }) {
  await ensureSiteInitialized(env.db);
  const config = await getConfig(env);
  return jsonResponse({ config: maskConfig(config) });
}

export async function onRequestPost({ request, env }) {
  const admin = await getAdmin(request, env);
  if (!admin) return jsonResponse({ success: false, message: '未登录' }, 401);

  await ensureSiteInitialized(env.db);
  const body = await parseJson(request);
  const currentConfig = await getConfig(env);

  // 保存网站配置
  const submittedSecret = String(
    body.turnstile_secret ??
    body.turnstileSecret ??
    body.turnstile_secret_key ??
    body.TURNSTILE_SECRET ??
    ''
  ).trim();
  const currentSecret = String(currentConfig.turnstile_secret || '').trim();
  const enableTurnstile = body.enable_turnstile === true || body.enable_turnstile === '1';

  if (enableTurnstile && !String(body.turnstile_sitekey || '').trim()) {
    return jsonResponse({ success: false, message: '启用 Turnstile 时必须填写 Site Key' }, 400);
  }
  if (enableTurnstile && !submittedSecret && !currentSecret) {
    return jsonResponse({ success: false, message: '启用 Turnstile 时必须填写 Secret Key。请重新输入 Secret Key 后保存。' }, 400);
  }

  const entries = {
    site_title: String(body.site_title || 'XA-Nav'),
    site_description: String(body.site_description || ''),
    site_logo: String(body.site_logo || '').trim(),
    site_copyright: String(body.site_copyright || ''),
    favicon_api: String(body.favicon_api || 'https://icon.horse/icon/').trim(),
    enable_ai_meta: body.enable_ai_meta === true || body.enable_ai_meta === '1' ? '1' : '0',
    cookie_max_age: String(Number(body.cookie_max_age) || 86400),
    enable_captcha: body.enable_captcha === false || body.enable_captcha === '0' ? '0' : '1',
    enable_turnstile: enableTurnstile ? '1' : '0',
    turnstile_sitekey: String(body.turnstile_sitekey || '').trim(),
    default_lang: ['zh', 'en'].includes(body.default_lang) ? body.default_lang : 'zh',
  };
  if (submittedSecret) {
    entries.turnstile_secret = submittedSecret;
  } else if (currentSecret) {
    entries.turnstile_secret = currentSecret;
  }
  for (const [key, value] of Object.entries(entries)) {
    await env.db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').bind(key, value).run();
  }
  return jsonResponse({ success: true, config: maskConfig({ ...currentConfig, ...entries }) });
}
