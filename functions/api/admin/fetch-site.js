import { jsonResponse, getAuthenticatedAdmin, getConfigMap } from '../../lib/utils.js';

async function requireAdmin(request, env) {
  return await getAuthenticatedAdmin(request, env);
}

function cleanAiText(value, maxLength = 300) {
  return String(value || '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function normalizeAiTags(value) {
  if (Array.isArray(value)) {
    return value.map((tag) => cleanAiText(tag, 30)).filter(Boolean).slice(0, 5).join(',');
  }
  return String(value || '')
    .split(/[,，、\s]+/)
    .map((tag) => cleanAiText(tag, 30))
    .filter(Boolean)
    .slice(0, 5)
    .join(',');
}

function parseAiJson(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try { return JSON.parse(match[0]); } catch { return null; }
  }
}

async function generateSiteMetaWithAI(env, { title, hostname, url }) {
  if (!env?.AI?.run) return {};
  try {
    const prompt = `请根据网站信息生成一个简短中文描述和最多 5 个中文标签。只返回 JSON，不要 Markdown。\n网站标题：${title || hostname}\n域名：${hostname}\nURL：${url}\n格式：{"description":"不超过60字的网站描述","tags":["标签1","标签2"]}`;
    const result = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: '你是网址导航后台的元数据助手。只输出合法 JSON。' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 256,
    });
    const text = result?.response || result?.text || result?.output || '';
    const data = parseAiJson(Array.isArray(text) ? text.join('\n') : text);
    if (!data || typeof data !== 'object') return {};
    return {
      description: cleanAiText(data.description, 120),
      tags: normalizeAiTags(data.tags),
    };
  } catch {
    return {};
  }
}

function extractMeta(html, hostname, siteUrl) {
  // title
  let title = '';
  const titleMatch = html.match(/<title[^>]*>([^<]{1,200})<\/title>/i);
  if (titleMatch) title = titleMatch[1].trim();
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']{1,200})["']/i)
    || html.match(/<meta[^>]+content=["']([^"']{1,200})["'][^>]+property=["']og:title["']/i);
  if (ogTitle) title = ogTitle[1].trim();

  // description
  let description = '';
  const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{1,300})["']/i)
    || html.match(/<meta[^>]+content=["']([^"']{1,300})["'][^>]+name=["']description["']/i);
  if (descMatch) description = descMatch[1].trim();
  const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']{1,300})["']/i)
    || html.match(/<meta[^>]+content=["']([^"']{1,300})["'][^>]+property=["']og:description["']/i);
  if (ogDesc) description = ogDesc[1].trim();

  // favicon — try multiple link tags
  let favicon = '';
  const iconPatterns = [
    /<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["']/i,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*icon[^"']*["']/i,
    /<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i,
  ];
  for (const pattern of iconPatterns) {
    const m = html.match(pattern);
    if (m) { favicon = m[1].trim(); break; }
  }
  // resolve relative favicon
  if (favicon && !favicon.startsWith('http')) {
    favicon = favicon.startsWith('//')
      ? `https:${favicon}`
      : favicon.startsWith('/')
      ? `https://${hostname}${favicon}`
      : `https://${hostname}/${favicon}`;
  }

  // keywords as tags
  let tags = '';
  const kwMatch = html.match(/<meta[^>]+name=["']keywords["'][^>]+content=["']([^"']{1,200})["']/i)
    || html.match(/<meta[^>]+content=["']([^"']{1,200})["'][^>]+name=["']keywords["']/i);
  if (kwMatch) {
    tags = kwMatch[1].split(/[,，]/).slice(0, 5).map((t) => t.trim()).filter(Boolean).join(',');
  }

  return { title, description, favicon, tags };
}

export async function onRequestGet({ request, env }) {
  const admin = await requireAdmin(request, env);
  if (!admin) return jsonResponse({ success: false, message: '未登录' }, 401);

  const reqUrl = new URL(request.url);
  const site = reqUrl.searchParams.get('url');
  if (!site) return jsonResponse({ success: false, message: '缺少 url 参数' }, 400);

  let siteUrl;
  let hostname;
  try {
    siteUrl = site.startsWith('http') ? site : `https://${site}`;
    hostname = new URL(siteUrl).hostname;
  } catch {
    return jsonResponse({ success: false, message: '无效的 URL' }, 400);
  }

  const config = await getConfigMap(env.db);
  const enableAiMeta = config.enable_ai_meta === '1';

  try {
    const res = await fetch(siteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NavBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(8000),
      redirect: 'follow',
    });

    if (!res.ok) {
      const aiMeta = enableAiMeta ? await generateSiteMetaWithAI(env, { title: hostname, hostname, url: siteUrl }) : {};
      return jsonResponse({
        success: true,
        title: hostname,
        description: aiMeta.description || '',
        favicon: '',
        tags: aiMeta.tags || '',
      });
    }

    // 只读前 50KB，足够提取 meta
    const reader = res.body.getReader();
    let html = '';
    let bytes = 0;
    const decoder = new TextDecoder();
    while (bytes < 50000) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      bytes += value.length;
    }
    reader.cancel();

    const meta = extractMeta(html, hostname, siteUrl);
    if (!meta.title) meta.title = hostname;
    if (enableAiMeta && (!meta.description || !meta.tags)) {
      const aiMeta = await generateSiteMetaWithAI(env, { title: meta.title, hostname, url: siteUrl });
      if (!meta.description && aiMeta.description) meta.description = aiMeta.description;
      if (!meta.tags && aiMeta.tags) meta.tags = aiMeta.tags;
    }

    return jsonResponse({ success: true, ...meta });
  } catch (err) {
    const aiMeta = enableAiMeta ? await generateSiteMetaWithAI(env, { title: hostname, hostname, url: siteUrl }) : {};
    return jsonResponse({
      success: true,
      title: hostname,
      description: aiMeta.description || '',
      favicon: '',
      tags: aiMeta.tags || '',
    });
  }
}
