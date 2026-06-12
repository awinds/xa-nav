import { jsonResponse, createCaptchaSvg, randomCaptchaCode, createSignedToken, getAuthSecret } from '../lib/utils.js';

export async function onRequestGet({ env }) {
  const secret = getAuthSecret(env);
  const code = randomCaptchaCode(5);
  const token = await createSignedToken(code, secret, 180);
  return jsonResponse({ image: createCaptchaSvg(code), token });
}
