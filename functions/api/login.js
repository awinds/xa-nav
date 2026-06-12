import { jsonResponse, parseJson, verifySignedToken, createAuthToken, getEnvAdmin, getAuthSecret, ensureDefaultConfig } from '../lib/utils.js';

async function verifyCaptcha(token, answer, secret) {
  if (!token || !answer) return false;
  const result = await verifySignedToken(token, secret);
  if (!result) return false;
  return result.payload.toUpperCase() === answer?.trim()?.toUpperCase();
}

async function verifyTurnstile(turnstileToken, secret) {
  if (!secret) return { success: true };
  if (!turnstileToken) return { success: false, message: 'Turnstile Token 缺失，请完成验证后再登录。' };

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(turnstileToken)}`,
  });
  const result = await response.json();
  if (result.success === true) return { success: true };

  console.error('Turnstile verification failed:', result['error-codes'] || result);
  return { success: false, message: 'Turnstile 验证失败，请检查 Secret Key 是否与 Site Key 匹配。' };
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await parseJson(request);
    const username = body.username?.trim();
    const password = body.password || '';
    const captchaToken = body.captchaToken;
    const captchaAnswer = body.captchaAnswer;
    const turnstileToken = body.turnstileToken;

    if (!username || !password) {
      return jsonResponse({ success: false, message: '请输入用户名和密码。' }, 400);
    }

    let configRows;
    try {
      await ensureDefaultConfig(env.D1);
      configRows = await env.D1.prepare('SELECT key, value FROM config').all();
    } catch (error) {
      console.error('Config read error:', error);
      return jsonResponse({ success: false, message: '数据库表未创建，请先执行 db/schema.sql 后再访问。' }, 500);
    }

    const config = (configRows?.results || []).reduce((map, item) => ({ ...map, [item.key]: item.value }), {});
    const turnstileSecret = String(config.turnstile_secret || '').trim();
    const enableTurnstile = config.enable_turnstile === '1' && Boolean(turnstileSecret);
    const enableCaptcha = config.enable_captcha !== '0'; // 默认启用

    const authSecret = getAuthSecret(env);

    if (enableCaptcha && !await verifyCaptcha(captchaToken, captchaAnswer, authSecret)) {
      return jsonResponse({ success: false, message: '图片验证码错误，请重新输入。' }, 400);
    }

    if (enableTurnstile) {
      const turnstileResult = await verifyTurnstile(turnstileToken, turnstileSecret);
      if (!turnstileResult.success) {
        return jsonResponse({ success: false, message: turnstileResult.message }, 400);
      }
    }

    const adminUser = env.ADMIN_USER || 'admin';
    const adminPassword = env.ADMIN_PASSWORD || 'admin123';
    if (username !== adminUser || password !== adminPassword) {
      return jsonResponse({ success: false, message: '用户名或密码错误，请检查后重试。' }, 401);
    }

    const admin = getEnvAdmin(env);
    const maxAge = Number(config.cookie_max_age || '86400');
    const token = await createAuthToken(admin.id, authSecret, maxAge);
    const cookie = `XA_NAV_AUTH=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

    return new Response(JSON.stringify({ success: true, admin }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
        'Set-Cookie': cookie,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return jsonResponse({ success: false, message: '服务器内部错误，请检查 D1 表结构或日志。' }, 500);
  }
}
