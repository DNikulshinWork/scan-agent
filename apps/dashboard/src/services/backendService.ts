import { Vacancy, KeywordScoringRule, VacancyStatus, VacancyOutcome } from '../types';
import { initialVacancies, defaultScoringRules } from '../data/mockData';
import {
  getCachedVacancies,
  saveCachedVacancies,
  updateCachedVacancy,
  queuePendingSync,
  flushPendingSync,
  getCacheMeta,
} from './indexedDbStorage';

export const DEFAULT_BACKEND_URL = 'https://scan-agent-api.onrender.com';

export function getStoredApiKey(): string {
  if (typeof window === 'undefined') return '';
  const key = (
    localStorage.getItem('api_secret_key') ||
    localStorage.getItem('scan_agent_api_key') ||
    localStorage.getItem('API_SECRET_KEY') ||
    (typeof process !== 'undefined' && (process.env as any)?.NEXT_PUBLIC_API_SECRET_KEY) ||
    ''
  ).trim();
  return key.replace(/^["']|["']$/g, '');
}

export function setStoredApiKey(key: string): void {
  if (typeof window === 'undefined') return;
  const clean = key ? key.trim().replace(/^["']|["']$/g, '') : '';
  if (!clean) {
    localStorage.removeItem('api_secret_key');
    localStorage.removeItem('scan_agent_api_key');
    localStorage.removeItem('API_SECRET_KEY');
  } else {
    localStorage.setItem('api_secret_key', clean);
    localStorage.setItem('scan_agent_api_key', clean);
  }
}

export function buildProtectedUrl(endpoint: string, base: string = DEFAULT_BACKEND_URL): string {
  const clean = (base || DEFAULT_BACKEND_URL).trim().replace(/\/$/, '');
  const url = `${clean}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const key = getStoredApiKey();
  if (!key) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}apiKey=${encodeURIComponent(key)}`;
}

export function getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...extraHeaders,
  };
  const key = getStoredApiKey();
  if (key) {
    headers['x-api-key'] = key;
    headers['Authorization'] = `Bearer ${key}`;
  }
  return headers;
}

export interface FetchResult {
  vacancies: Vacancy[];
  source: 'backend' | 'cache' | 'fallback';
  warning?: string;
  isBackendOnline?: boolean;
  totalCached?: number;
  lastSyncAt?: string | null;
}

export interface BackendHealthResponse {
  status: string;
  api: string;
  database: string;
  dbLatencyMs?: number;
  totalOrders?: number;
  uptimeSeconds?: number;
  scanner?: {
    isScanning: boolean;
    autoScanEnabled: boolean;
    autoScanIntervalMinutes: number;
    lastScanAt: string | null;
    lastScanDurationMs?: number;
    lastFoundCount?: number;
    nextScheduledRun: string | null;
    lastError: string | null;
  };
}

/**
 * Проверка доступности нашего бэкенда и базы данных Neon
 */
export async function checkBackendStatus(
  apiUrl: string = DEFAULT_BACKEND_URL
): Promise<{ ok: boolean; data?: BackendHealthResponse; error?: string }> {
  const clean = (apiUrl || DEFAULT_BACKEND_URL).trim().replace(/\/$/, '');
  if (!clean) return { ok: false, error: 'URL бэкенда не указан' };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7000);

  try {
    const res = await fetch(`${clean}/api/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data: BackendHealthResponse = await res.json();
      return { ok: true, data };
    }
    return { ok: false, error: `Бэкенд вернул статус HTTP ${res.status}` };
  } catch (err: any) {
    clearTimeout(timeoutId);
    return {
      ok: false,
      error: err.name === 'AbortError' ? 'Таймаут (бэкенд на Render просыпается)' : 'Сервер недоступен',
    };
  }
}

/**
 * Получение вакансий: строго через наш бэкенд с автоматическим кэшированием в IndexedDB.
 * Никаких прямых обращений к api.hh.ru!
 * При недоступности бэкенда мгновенно отдаются данные из локального кэша IndexedDB.
 */
export async function loadVacanciesWithCache(
  apiUrl: string = DEFAULT_BACKEND_URL
): Promise<FetchResult> {
  const clean = (apiUrl || DEFAULT_BACKEND_URL).trim().replace(/\/$/, '');
  const cached = await getCachedVacancies();
  const meta = await getCacheMeta();

  // 1. Пытаемся получить свежие данные с нашего бэкенда (Neon PostgreSQL)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const targetUrl = buildProtectedUrl('/api/vacancies?limit=150', clean);
    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: getAuthHeaders(),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.status === 401) {
      console.warn('API Key rejected (401 Unauthorized)');
      if (cached.length > 0) {
        return {
          vacancies: cached,
          source: 'cache',
          isBackendOnline: true,
          warning: 'Бэкенд отклонил доступ (401): проверьте API_SECRET_KEY в Настройках ⚙️. Отображаются данные из кэша.',
          totalCached: cached.length,
          lastSyncAt: meta.lastSyncAt,
        };
      }
    }

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const normalized: Vacancy[] = data.map((item: any) => ({
          id: item.id || `hh-${item.orderId}`,
          orderId: String(item.orderId),
          source: 'hh',
          title: item.title || 'Без названия',
          description: item.description || '',
          price: item.price || 'Договорная',
          salaryNum: item.salaryNum ?? null,
          link: item.link || `https://hh.ru/vacancy/${item.orderId}`,
          employer: item.employer || 'Компания не указана',
          city: item.city || 'Удаленно',
          isRemote: Boolean(item.isRemote),
          score: item.score ?? 5,
          keywordScore: item.score ? item.score * 4 : 20,
          matchPercentage: item.matchPercent ?? item.matchPercentage ?? 75,
          matchedKeywords: Array.isArray(item.tags)
            ? item.tags
            : typeof item.tags === 'string' && item.tags
            ? item.tags.split(',').map((t: string) => t.trim())
            : ['TypeScript', 'React'],
          missingKeywords: [],
          filterVerdict: item.verdict || item.filterVerdict || 'Соответствует стеку резюме',
          hook: item.hook || '',
          pitch: item.pitch || '',
          tags: Array.isArray(item.tags)
            ? item.tags
            : typeof item.tags === 'string' && item.tags
            ? item.tags.split(',').map((t: string) => t.trim())
            : ['TypeScript', 'React'],
          status: (item.status as VacancyStatus) || 'new',
          outcome: (item.outcome as VacancyOutcome) || 'pending',
          publishedAt: item.publishedAt ? new Date(item.publishedAt).toISOString() : new Date().toISOString(),
          processedAt: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString(),
          appliedAt: item.appliedAt ? new Date(item.appliedAt).toISOString() : null,
          experienceRequirement: item.experienceRequirement,
          schedule: item.schedule,
        }));

        // Сохраняем в кэш IndexedDB
        await saveCachedVacancies(normalized);

        // Пытаемся отправить отложенные оффлайн-мутации, если были
        await flushPendingSync(async (pending) => {
          try {
            const pRes = await fetch(`${clean}/api/vacancies/${pending.id}`, {
              method: 'PATCH',
              headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
              body: JSON.stringify({ status: pending.status, outcome: pending.outcome }),
            });
            return pRes.ok;
          } catch {
            return false;
          }
        });

        return {
          vacancies: normalized,
          source: 'backend',
          isBackendOnline: true,
          totalCached: normalized.length,
          lastSyncAt: new Date().toISOString(),
        };
      }
    }
  } catch (err) {
    console.warn('Backend request failed or timed out, using cache:', err);
  }

  // 2. Если бэкенд не ответил, возвращаем кэш из IndexedDB
  if (cached.length > 0) {
    return {
      vacancies: cached,
      source: 'cache',
      isBackendOnline: false,
      warning: `Бэкенд на Render временно недоступен или засыпает. Загружено ${cached.length} вакансий из локального кэша IndexedDB.`,
      totalCached: cached.length,
      lastSyncAt: meta.lastSyncAt,
    };
  }

  // 3. Если кэш пуст (первый запуск в оффлайн-режиме), наполняем начальными данными
  await saveCachedVacancies(initialVacancies);
  return {
    vacancies: initialVacancies,
    source: 'fallback',
    isBackendOnline: false,
    warning: 'Кэш пуст, связь с бэкендом отсутствует. Загружены базовые демонстрационные вакансии.',
    totalCached: initialVacancies.length,
    lastSyncAt: new Date().toISOString(),
  };
}

/**
 * Запуск сбора вакансий на бэкенде через Playwright
 */
export async function triggerBackendScanJob(
  apiUrl: string = DEFAULT_BACKEND_URL,
  options: { maxPages?: number; sync?: boolean } = { maxPages: 2, sync: true }
): Promise<{ ok: boolean; scanned: number; durationMs?: number; message?: string }> {
  const clean = (apiUrl || DEFAULT_BACKEND_URL).trim().replace(/\/$/, '');

  const targetUrl = buildProtectedUrl('/api/scan', clean);
  const res = await fetch(targetUrl, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ sync: options.sync ?? true, maxPages: options.maxPages ?? 2 }),
  });

  if (res.status === 401) {
    throw new Error('API-ключ не сохранен в браузере или не совпадает с API_SECRET_KEY на Render (401). Откройте Настройки (⚙️) и укажите точно такой же ключ.');
  }

  if (res.status === 409) {
    return {
      ok: false,
      scanned: 0,
      message: 'Сканирование уже выполняется на сервере другим процессом или cron-задачей. Пожалуйста, подождите.',
    };
  }

  if (!res.ok) {
    const errorText = await res.text().catch(() => res.statusText);
    throw new Error(`Ошибка запуска сканера на сервере (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return {
    ok: true,
    scanned: data.scanned ?? 0,
    durationMs: data.durationMs,
    message: data.message,
  };
}

/**
 * Синхронизация изменения статуса / отклика вакансии:
 * Сначала сохраняется в IndexedDB (мгновенный UI отклик), затем отправляется на бэкенд.
 * Если бэкенд оффлайн — встает в очередь pending_sync.
 */
export async function syncVacancyUpdate(
  apiUrl: string = DEFAULT_BACKEND_URL,
  id: string,
  updates: { status?: VacancyStatus; outcome?: VacancyOutcome; pitch?: string }
): Promise<void> {
  // Мгновенно обновляем IndexedDB
  await updateCachedVacancy(id, updates);

  const clean = (apiUrl || DEFAULT_BACKEND_URL).trim().replace(/\/$/, '');
  if (!clean) return;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const targetUrl = buildProtectedUrl(`/api/vacancies/${id}`, clean);
    const res = await fetch(targetUrl, {
      method: 'PATCH',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ status: updates.status, outcome: updates.outcome }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      await queuePendingSync({
        id,
        status: updates.status,
        outcome: updates.outcome,
        timestamp: Date.now(),
      });
    }
  } catch {
    // В случае сбоя сети сохраняем в очередь для отправки при восстановлении
    await queuePendingSync({
      id,
      status: updates.status,
      outcome: updates.outcome,
      timestamp: Date.now(),
    });
  }
}

/**
 * Загрузка актуальных правил скоринга с бэкенда (Neon PostgreSQL)
 */
export async function fetchScoringRules(
  apiUrl: string = DEFAULT_BACKEND_URL
): Promise<{ rules: KeywordScoringRule; source: 'backend' | 'cache' }> {
  const clean = (apiUrl || DEFAULT_BACKEND_URL).trim().replace(/\/$/, '');
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const targetUrl = buildProtectedUrl('/api/scoring-rules', clean);
    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: getAuthHeaders(),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const rules = await res.json();
      if (typeof window !== 'undefined') {
        localStorage.setItem('scan_agent_scoring_rules', JSON.stringify(rules));
      }
      return { rules, source: 'backend' };
    }
  } catch {
    // fallback to cache
  }

  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem('scan_agent_scoring_rules');
    if (cached) {
      try {
        return { rules: JSON.parse(cached), source: 'cache' };
      } catch {}
    }
  }
  return { rules: defaultScoringRules, source: 'cache' };
}

/**
 * Сохранение правил скоринга на бэкенде в базе данных Neon
 */
export async function saveScoringRules(
  apiUrl: string = DEFAULT_BACKEND_URL,
  rules: KeywordScoringRule
): Promise<{ ok: boolean; message: string }> {
  if (typeof window !== 'undefined') {
    localStorage.setItem('scan_agent_scoring_rules', JSON.stringify(rules));
  }
  const clean = (apiUrl || DEFAULT_BACKEND_URL).trim().replace(/\/$/, '');
  try {
    const res = await fetch(`${clean}/api/scoring-rules`, {
      method: 'PUT',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(rules),
    });
    if (res.ok) {
      const data = await res.json();
      return { ok: true, message: data.message || 'Правила скоринга сохранены в базе Neon' };
    }
    return { ok: false, message: `Ошибка сервера (${res.status})` };
  } catch (err: any) {
    return { ok: false, message: 'Бэкенд временно недоступен, правила сохранены локально в кэше' };
  }
}

/**
 * Получение публичного VAPID-ключа для оформления браузерной подписки Push
 */
export async function fetchVapidPublicKey(
  apiUrl: string = DEFAULT_BACKEND_URL
): Promise<string> {
  const clean = (apiUrl || DEFAULT_BACKEND_URL).trim().replace(/\/$/, '');
  const res = await fetch(`${clean}/api/push/vapid-public-key`);
  if (!res.ok) throw new Error('Не удалось получить VAPID ключ с бэкенда');
  const data = await res.json();
  return data.publicKey;
}

/**
 * Сохранение Push-подписки браузера на бэкенде
 */
export async function registerPushSubscription(
  apiUrl: string = DEFAULT_BACKEND_URL,
  subscription: PushSubscription
): Promise<{ ok: boolean; message: string }> {
  const clean = (apiUrl || DEFAULT_BACKEND_URL).trim().replace(/\/$/, '');
  const subJson = subscription.toJSON();
  const res = await fetch(`${clean}/api/push/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: subJson.endpoint,
      keys: subJson.keys,
    }),
  });
  if (!res.ok) throw new Error('Ошибка сохранения Push-подписки на бэкенде');
  return res.json();
}

/**
 * Отписка от Web Push на сервере
 */
export async function unregisterPushSubscription(
  apiUrl: string = DEFAULT_BACKEND_URL,
  endpoint: string
): Promise<{ ok: boolean }> {
  const clean = (apiUrl || DEFAULT_BACKEND_URL).trim().replace(/\/$/, '');
  const res = await fetch(`${clean}/api/push/unsubscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint }),
  });
  return res.json();
}

/**
 * Вызов отправки тестового Web Push уведомления с сервера
 */
export async function triggerServerTestPush(
  apiUrl: string = DEFAULT_BACKEND_URL,
  endpoint?: string
): Promise<{ ok: boolean; message: string; sent?: number }> {
  const clean = (apiUrl || DEFAULT_BACKEND_URL).trim().replace(/\/$/, '');
  const res = await fetch(`${clean}/api/push/send-test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Ошибка отправки тестового Web Push с сервера');
  }
  return res.json();
}
