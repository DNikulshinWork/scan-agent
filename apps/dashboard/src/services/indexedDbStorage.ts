import { Vacancy } from '../types';

const DB_NAME = 'ScanAgentDB';
const DB_VERSION = 1;
const VACANCIES_STORE = 'vacancies';
const META_STORE = 'metadata';
const PENDING_STORE = 'pending_sync';

export interface CacheMeta {
  lastSyncAt: string | null;
  totalCount: number;
  backendOnline?: boolean;
}

export interface PendingSyncItem {
  id: string;
  status?: string;
  outcome?: string;
  timestamp: number;
}

function hasIndexedDB(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!hasIndexedDB()) {
      return reject(new Error('IndexedDB not supported in this environment'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(VACANCIES_STORE)) {
        const store = db.createObjectStore(VACANCIES_STORE, { keyPath: 'id' });
        store.createIndex('orderId', 'orderId', { unique: false });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('score', 'score', { unique: false });
        store.createIndex('publishedAt', 'publishedAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'key' });
      }

      if (!db.objectStoreNames.contains(PENDING_STORE)) {
        db.createObjectStore(PENDING_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

// Fallback: localStorage
const LS_VACANCIES_KEY = 'scan_agent_vacancies_cache';
const LS_META_KEY = 'scan_agent_cache_meta';
const LS_PENDING_KEY = 'scan_agent_pending_sync';

function getLocalStorageVacancies(): Vacancy[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LS_VACANCIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalStorageVacancies(vacancies: Vacancy[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_VACANCIES_KEY, JSON.stringify(vacancies));
  } catch (e) {
    console.warn('localStorage quota exceeded for vacancies cache', e);
  }
}

/**
 * Получение всех закешированных вакансий из IndexedDB (с прозрачным фоллбэком на localStorage)
 */
export async function getCachedVacancies(): Promise<Vacancy[]> {
  if (!hasIndexedDB()) {
    return getLocalStorageVacancies();
  }

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(VACANCIES_STORE, 'readonly');
      const store = tx.objectStore(VACANCIES_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const items = request.result || [];
        // Сортировка по времени публикации / создания (свежие сверху)
        items.sort((a, b) => {
          const dateA = new Date(a.publishedAt || a.processedAt || 0).getTime();
          const dateB = new Date(b.publishedAt || b.processedAt || 0).getTime();
          return dateB - dateA;
        });
        resolve(items);
      };

      request.onerror = () => {
        console.warn('Error reading from IndexedDB, falling back to localStorage');
        resolve(getLocalStorageVacancies());
      };
    });
  } catch (err) {
    console.warn('IndexedDB unavailable, using localStorage:', err);
    return getLocalStorageVacancies();
  }
}

/**
 * Сохранение списка вакансий в кэш IndexedDB.
 * Сохраняет локальные изменения статусов пользователя (например, 'applied'), если они есть.
 */
export async function saveCachedVacancies(newVacancies: Vacancy[]): Promise<void> {
  if (!hasIndexedDB()) {
    saveLocalStorageVacancies(newVacancies);
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        LS_META_KEY,
        JSON.stringify({ lastSyncAt: new Date().toISOString(), totalCount: newVacancies.length })
      );
    }
    return;
  }

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([VACANCIES_STORE, META_STORE], 'readwrite');
      const vacStore = tx.objectStore(VACANCIES_STORE);
      const metaStore = tx.objectStore(META_STORE);

      // Получаем существующие для слияния локальных статусов
      const getExisting = vacStore.getAll();

      getExisting.onsuccess = () => {
        const existingMap = new Map<string, Vacancy>();
        (getExisting.result || []).forEach((v: Vacancy) => {
          existingMap.set(v.id, v);
          if (v.orderId) existingMap.set(v.orderId, v);
        });

        for (const vac of newVacancies) {
          const existing = existingMap.get(vac.id) || (vac.orderId ? existingMap.get(vac.orderId) : undefined);
          // Сохраняем пользовательский статус, если пользователь уже откликнулся или отклонил локально
          const merged: Vacancy = {
            ...vac,
            status: existing && existing.status !== 'new' ? existing.status : vac.status,
            outcome: existing && existing.outcome !== 'pending' ? existing.outcome : vac.outcome,
            pitch: existing && existing.pitch ? existing.pitch : vac.pitch,
            appliedAt: existing?.appliedAt || vac.appliedAt,
          };
          vacStore.put(merged);
        }

        // Записываем метаданные синхронизации
        metaStore.put({
          key: 'sync_meta',
          lastSyncAt: new Date().toISOString(),
          totalCount: newVacancies.length,
        });
      };

      tx.oncomplete = () => {
        // Дублируем в localStorage для мгновенной доступности
        saveLocalStorageVacancies(newVacancies);
        resolve();
      };

      tx.onerror = () => {
        saveLocalStorageVacancies(newVacancies);
        reject(tx.error);
      };
    });
  } catch (err) {
    saveLocalStorageVacancies(newVacancies);
  }
}

/**
 * Быстрое обновление единичной вакансии в кэше IndexedDB
 */
export async function updateCachedVacancy(id: string, updates: Partial<Vacancy>): Promise<void> {
  if (!hasIndexedDB()) {
    const list = getLocalStorageVacancies();
    const updated = list.map((v) => (v.id === id ? { ...v, ...updates } : v));
    saveLocalStorageVacancies(updated);
    return;
  }

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(VACANCIES_STORE, 'readwrite');
      const store = tx.objectStore(VACANCIES_STORE);
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const existing = getReq.result;
        if (existing) {
          store.put({ ...existing, ...updates });
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    const list = getLocalStorageVacancies();
    const updated = list.map((v) => (v.id === id ? { ...v, ...updates } : v));
    saveLocalStorageVacancies(updated);
  }
}

/**
 * Очистка кэша вакансий
 */
export async function clearCachedVacancies(): Promise<void> {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(LS_VACANCIES_KEY);
    localStorage.removeItem(LS_META_KEY);
  }

  if (!hasIndexedDB()) return;

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction([VACANCIES_STORE, META_STORE, PENDING_STORE], 'readwrite');
      tx.objectStore(VACANCIES_STORE).clear();
      tx.objectStore(META_STORE).clear();
      tx.objectStore(PENDING_STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // игнорируем
  }
}

/**
 * Получение метаданных о кэше (время последней синхронизации и количество)
 */
export async function getCacheMeta(): Promise<CacheMeta> {
  if (!hasIndexedDB()) {
    try {
      const raw = localStorage.getItem(LS_META_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { lastSyncAt: null, totalCount: getLocalStorageVacancies().length };
  }

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction([META_STORE, VACANCIES_STORE], 'readonly');
      const metaStore = tx.objectStore(META_STORE);
      const vacStore = tx.objectStore(VACANCIES_STORE);

      const metaReq = metaStore.get('sync_meta');
      const countReq = vacStore.count();

      let lastSyncAt: string | null = null;
      let count = 0;

      metaReq.onsuccess = () => {
        if (metaReq.result) {
          lastSyncAt = metaReq.result.lastSyncAt;
        }
      };

      countReq.onsuccess = () => {
        count = countReq.result || 0;
      };

      tx.oncomplete = () => {
        resolve({ lastSyncAt, totalCount: count });
      };

      tx.onerror = () => {
        resolve({ lastSyncAt: null, totalCount: getLocalStorageVacancies().length });
      };
    });
  } catch {
    return { lastSyncAt: null, totalCount: getLocalStorageVacancies().length };
  }
}

/**
 * Добавление отложенного обновления статуса в очередь для синхронизации при появлении сети
 */
export async function queuePendingSync(item: PendingSyncItem): Promise<void> {
  if (!hasIndexedDB()) {
    try {
      const raw = localStorage.getItem(LS_PENDING_KEY);
      const queue: PendingSyncItem[] = raw ? JSON.parse(raw) : [];
      queue.push(item);
      localStorage.setItem(LS_PENDING_KEY, JSON.stringify(queue));
    } catch {}
    return;
  }

  try {
    const db = await openDB();
    const tx = db.transaction(PENDING_STORE, 'readwrite');
    tx.objectStore(PENDING_STORE).put(item);
  } catch {}
}

/**
 * Отправка накопленных оффлайн-мутаций на бэкенд при восстановлении связи
 */
export async function flushPendingSync(
  syncHandler: (item: PendingSyncItem) => Promise<boolean>
): Promise<number> {
  if (!hasIndexedDB()) {
    try {
      const raw = localStorage.getItem(LS_PENDING_KEY);
      const queue: PendingSyncItem[] = raw ? JSON.parse(raw) : [];
      if (!queue.length) return 0;

      const remaining: PendingSyncItem[] = [];
      let syncedCount = 0;
      for (const item of queue) {
        const ok = await syncHandler(item);
        if (ok) syncedCount++;
        else remaining.push(item);
      }
      localStorage.setItem(LS_PENDING_KEY, JSON.stringify(remaining));
      return syncedCount;
    } catch {
      return 0;
    }
  }

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(PENDING_STORE, 'readwrite');
      const store = tx.objectStore(PENDING_STORE);
      const getReq = store.getAll();

      getReq.onsuccess = async () => {
        const items: PendingSyncItem[] = getReq.result || [];
        if (!items.length) {
          resolve(0);
          return;
        }

        let synced = 0;
        for (const item of items) {
          try {
            const ok = await syncHandler(item);
            if (ok) {
              synced++;
              const delTx = db.transaction(PENDING_STORE, 'readwrite');
              delTx.objectStore(PENDING_STORE).delete(item.id);
            }
          } catch {}
        }
        resolve(synced);
      };

      getReq.onerror = () => resolve(0);
    });
  } catch {
    return 0;
  }
}
