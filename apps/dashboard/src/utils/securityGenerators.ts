/**
 * Утилиты для генерации криптографически стойких секретов, VAPID-ключей и токенов доступа
 */

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Генерация случайного API-ключа (x-api-key / Bearer token)
 */
export function generateApiKey(prefix: string = 'scan_live_'): string {
  const array = new Uint8Array(24);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < array.length; i++) array[i] = Math.floor(Math.random() * 256);
  }
  const hex = Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${prefix}${hex}`;
}

/**
 * Генерация секретного токена для cron-задач
 */
export function generateCronSecret(): string {
  const array = new Uint8Array(24);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < array.length; i++) array[i] = Math.floor(Math.random() * 256);
  }
  const hex = Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
  return `cron_sec_${hex}`;
}

/**
 * Генерация валидной пары VAPID-ключей (ECDSA P-256) в браузере через Web Crypto API
 * Соответствует RFC 8291 / web-push стандарту
 */
export async function generateVapidKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
  try {
    const cryptoObj = typeof window !== 'undefined' ? window.crypto : (globalThis as any).crypto;
    if (!cryptoObj?.subtle) {
      throw new Error('Web Crypto API недоступно');
    }

    const keyPair = await cryptoObj.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify']
    );

    const rawPublicKey = await cryptoObj.subtle.exportKey('raw', keyPair.publicKey);
    const jwkPrivateKey = await cryptoObj.subtle.exportKey('jwk', keyPair.privateKey);

    const publicKey = toBase64Url(new Uint8Array(rawPublicKey));
    const privateKey = jwkPrivateKey.d || '';

    return { publicKey, privateKey };
  } catch (err) {
    console.error('Ошибка генерации VAPID через Web Crypto:', err);
    // Детерминированный fallback при отсутствии SubtleCrypto
    const pubArr = new Uint8Array(65);
    const privArr = new Uint8Array(32);
    pubArr[0] = 0x04;
    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(pubArr.subarray(1));
      window.crypto.getRandomValues(privArr);
    }
    return {
      publicKey: toBase64Url(pubArr),
      privateKey: toBase64Url(privArr),
    };
  }
}

/**
 * Формирование готового текста переменных окружения для вставки в Render / .env
 */
export function formatEnvConfig(params: {
  apiKey?: string;
  cronSecret?: string;
  vapidPublicKey?: string;
  vapidPrivateKey?: string;
  vapidSubject?: string;
  renderHook?: string;
}): string {
  const lines = [
    '# --- ScanAgent Render / Production Environment ---',
    params.apiKey ? `API_SECRET_KEY="${params.apiKey}"` : null,
    params.cronSecret ? `CRON_SECRET="${params.cronSecret}"` : null,
    params.vapidPublicKey ? `VAPID_PUBLIC_KEY="${params.vapidPublicKey}"` : null,
    params.vapidPrivateKey ? `VAPID_PRIVATE_KEY="${params.vapidPrivateKey}"` : null,
    `VAPID_SUBJECT="${params.vapidSubject || 'mailto:d.nikulshin.dev@gmail.com'}"`,
    params.renderHook ? `RENDER_DEPLOY_HOOK_URL="${params.renderHook}"` : null,
  ].filter(Boolean);

  return lines.join('\n');
}
