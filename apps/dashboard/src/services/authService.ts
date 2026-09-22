export interface AuthUser {
  provider: 'github' | 'google' | 'apikey';
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  username?: string;
  authenticatedAt: string;
}

const AUTH_STORAGE_KEY = 'scan_agent_auth_user';
export const WHITELIST_EMAILS = ['d.nikulshin.dev@gmail.com'];
export const WHITELIST_USERNAMES = ['dnikulshinwork', 'dnikulshin'];

export function getStoredAuthUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredAuthUser(user: AuthUser | null): void {
  if (typeof window === 'undefined') return;
  if (!user) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } else {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  }
}

export function logout(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function isAuthorizedEmail(email: string): boolean {
  if (!email) return false;
  return WHITELIST_EMAILS.some((allowed) => allowed.toLowerCase() === email.trim().toLowerCase());
}

export function isAuthorizedUsername(username: string): boolean {
  if (!username) return false;
  return WHITELIST_USERNAMES.some((allowed) => allowed.toLowerCase() === username.trim().toLowerCase());
}

/**
 * Вход по мастер API Secret Key
 */
export function loginWithApiKey(apiKey: string): { ok: boolean; user?: AuthUser; error?: string } {
  const clean = apiKey.trim();
  if (!clean || clean.length < 8) {
    return { ok: false, error: 'Ключ слишком короткий (минимум 8 символов)' };
  }

  // Сохраняем ключ в хранилище для запросов к бэкенду
  localStorage.setItem('api_secret_key', clean);

  const user: AuthUser = {
    provider: 'apikey',
    id: `key-${clean.slice(0, 8)}`,
    name: 'Dmitry Nikulshin (Admin Key)',
    email: 'd.nikulshin.dev@gmail.com',
    username: 'DNikulshinWork',
    authenticatedAt: new Date().toISOString(),
  };

  setStoredAuthUser(user);
  return { ok: true, user };
}

/**
 * Авторизация через GitHub (по токену, OAuth или профилю GitHub)
 */
export async function loginWithGithubToken(token: string): Promise<{ ok: boolean; user?: AuthUser; error?: string }> {
  const cleanToken = token.trim();
  if (!cleanToken) {
    return { ok: false, error: 'Укажите токен GitHub (PAT или OAuth token)' };
  }

  try {
    const res = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!res.ok) {
      return { ok: false, error: `GitHub вернул ошибку (${res.status}): проверьте валидность токена` };
    }

    const ghUser = await res.json();
    const login = ghUser.login || '';
    const email = ghUser.email || '';

    if (!isAuthorizedUsername(login) && !isAuthorizedEmail(email)) {
      return {
        ok: false,
        error: `Доступ запрещен: пользователь GitHub "${login}" не входит в белый список разрешенных администраторов (DNikulshinWork)`,
      };
    }

    const user: AuthUser = {
      provider: 'github',
      id: String(ghUser.id),
      name: ghUser.name || ghUser.login,
      username: ghUser.login,
      email: ghUser.email || 'd.nikulshin.dev@gmail.com',
      avatarUrl: ghUser.avatar_url,
      authenticatedAt: new Date().toISOString(),
    };

    setStoredAuthUser(user);
    return { ok: true, user };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Ошибка сети при обращении к GitHub API' };
  }
}

/**
 * Быстрый вход для владельца (DNikulshinWork / d.nikulshin.dev@gmail.com)
 */
export function quickOwnerLogin(provider: 'github' | 'google' = 'github'): AuthUser {
  const user: AuthUser = {
    provider,
    id: provider === 'github' ? 'gh-dnikulshinwork' : 'g-dnikulshin',
    name: 'Dmitry Nikulshin',
    email: 'd.nikulshin.dev@gmail.com',
    username: 'DNikulshinWork',
    avatarUrl: 'https://avatars.githubusercontent.com/u/127116521?v=4',
    authenticatedAt: new Date().toISOString(),
  };
  setStoredAuthUser(user);
  return user;
}
