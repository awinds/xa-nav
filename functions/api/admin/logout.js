import { jsonResponse } from '../../lib/utils.js';

export async function onRequestPost() {
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json;charset=utf-8',
      'Set-Cookie': 'XA_NAV_AUTH=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
    },
  });
}
