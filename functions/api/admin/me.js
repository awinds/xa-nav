import { jsonResponse, getAuthenticatedAdmin } from '../../lib/utils.js';

export async function onRequestGet({ request, env }) {
  const admin = await getAuthenticatedAdmin(request, env);
  if (!admin) {
    return jsonResponse({ authenticated: false }, 401);
  }
  return jsonResponse({ authenticated: true, admin });
}
