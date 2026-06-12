import { jsonResponse } from '../../lib/utils.js';

// 尝试多个 favicon 来源，返回第一个可用的
export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const site = url.searchParams.get('url');
  if (!site) return jsonResponse({ success: false, message: '缺少 url 参数' }, 400);

  let hostname;
  try {
    hostname = new URL(site).hostname;
  } catch {
    return jsonResponse({ success: false, message: '无效的 URL' }, 400);
  }

  // 优先尝试直接获取 /favicon.ico
  const candidates = [
    `https://${hostname}/favicon.ico`,
    `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`,
    `https://faviconsnap.com/api?url=${encodeURIComponent(site)}`,
  ];

  for (const faviconUrl of candidates) {
    try {
      const res = await fetch(faviconUrl, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
      if (res.ok && res.headers.get('content-type')?.startsWith('image')) {
        return jsonResponse({ success: true, favicon: faviconUrl });
      }
    } catch {
      // 继续尝试下一个
    }
  }

  // 兜底直接返回 faviconsnap
  return jsonResponse({ success: true, favicon: `https://faviconsnap.com/api?url=${encodeURIComponent(site)}` });
}
