import React, { useState, useEffect } from 'react';
import { Settings, Server, CheckCircle2, AlertCircle, RefreshCw, X, Database, Globe, Trash2, Cpu, HardDrive, Rocket } from 'lucide-react';
import { getCacheMeta, clearCachedVacancies } from '../services/indexedDbStorage';

interface ApiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiUrl: string;
  onSaveApiUrl: (url: string) => void;
  onRefreshFromBackend?: () => void;
}

export const ApiSettingsModal: React.FC<ApiSettingsModalProps> = ({
  isOpen,
  onClose,
  apiUrl,
  onSaveApiUrl,
  onRefreshFromBackend,
}) => {
  const [inputUrl, setInputUrl] = useState(apiUrl);
  const [testingStatus, setTestingStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [backendMeta, setBackendMeta] = useState<any>(null);

  // Render Deploy Hook State
  const [deployHookUrl, setDeployHookUrl] = useState(
    'https://api.render.com/deploy/srv-danv04oae00c73a5vv10?key=lKtY2NRDKUc'
  );
  const [deployStatus, setDeployStatus] = useState<'idle' | 'deploying' | 'success' | 'error'>('idle');
  const [deployFeedback, setDeployFeedback] = useState<string | null>(null);

  const handleTriggerDeploy = async () => {
    const target = deployHookUrl.trim();
    if (!target) return;
    setDeployStatus('deploying');
    setDeployFeedback('Отправка запроса на Render Deploy Hook...');
    try {
      const res = await fetch(target, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setDeployStatus('success');
        setDeployFeedback(
          `Деплой успешно запущен на Render! ${data.deploy?.id ? `ID: ${data.deploy.id}` : ''}`
        );
      } else {
        setDeployStatus('error');
        setDeployFeedback(`Render вернул HTTP ${res.status}`);
      }
    } catch {
      setDeployStatus('error');
      setDeployFeedback('Ошибка соединения с api.render.com (проверьте блокировщики или CORS)');
    }
  };

  // IndexedDB Cache State
  const [cacheMeta, setCacheMeta] = useState<{ lastSyncAt: string | null; totalCount: number }>({
    lastSyncAt: null,
    totalCount: 0,
  });
  const [cacheStatusMessage, setCacheStatusMessage] = useState<string | null>(null);

  const loadCacheInfo = async () => {
    try {
      const meta = await getCacheMeta();
      setCacheMeta(meta);
    } catch {
      // игнорируем
    }
  };

  useEffect(() => {
    setInputUrl(apiUrl);
    if (isOpen) {
      loadCacheInfo();
    }
  }, [apiUrl, isOpen]);

  if (!isOpen) return null;

  const testConnection = async () => {
    const target = inputUrl.trim().replace(/\/$/, '');
    if (!target) {
      setTestingStatus('error');
      setStatusMessage('Введите URL бэкенда');
      return;
    }

    setTestingStatus('testing');
    setStatusMessage('Проверка доступности /api/health и подключения к Neon DB...');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);
      const res = await fetch(`${target}/api/health`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        setTestingStatus('success');
        setBackendMeta(data);
        setStatusMessage(
          `Бэкенд доступен! База: ${data.database || 'connected'} (${data.dbLatencyMs || 0}мс), всего в БД: ${
            data.totalOrders || 0
          } вакансий.`
        );
      } else {
        setTestingStatus('error');
        setStatusMessage(`Сервер вернул статус HTTP ${res.status}`);
      }
    } catch (err: any) {
      setTestingStatus('error');
      setStatusMessage(
        err.name === 'AbortError'
          ? 'Таймаут (7 сек). Бэкенд на Render засыпает или недоступен.'
          : 'Не удалось подключиться к серверу. Проверьте адрес и CORS.'
      );
    }
  };

  const handleClearCache = async () => {
    if (window.confirm('Очистить локальный кэш IndexedDB? Данные будут повторно загружены с бэкенда.')) {
      await clearCachedVacancies();
      await loadCacheInfo();
      setCacheStatusMessage('Кэш IndexedDB успешно очищен');
      setTimeout(() => setCacheStatusMessage(null), 3000);
      if (onRefreshFromBackend) {
        onRefreshFromBackend();
      }
    }
  };

  const handleSave = () => {
    const cleanUrl = inputUrl.trim().replace(/\/$/, '');
    onSaveApiUrl(cleanUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Параметры источника данных</h3>
              <p className="text-xs text-gray-400">Бэкенд Fastify + Neon DB и кэш IndexedDB</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Section 1: Backend Fastify API URL */}
          <div className="space-y-2.5 p-3.5 bg-gray-950/60 rounded-xl border border-gray-800">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-300 uppercase tracking-wider">
              <Globe className="w-3.5 h-3.5 text-rose-400" />
              <span>URL бэкенда ScanAgent (Render API)</span>
            </label>

            <p className="text-[11px] text-gray-400 leading-relaxed">
              Прямые вызовы к публичному <code>api.hh.ru</code> полностью исключены. Все данные собираются сервером через Headless Playwright (обход блокировок и 403 Forbidden) и сохраняются в базу PostgreSQL (Neon).
            </p>

            <div className="flex gap-2">
              <input
                type="url"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://scan-agent-api.onrender.com"
                className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-rose-500 font-mono"
              />
              <button
                type="button"
                onClick={testConnection}
                disabled={testingStatus === 'testing'}
                className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium rounded-xl border border-gray-700 transition flex items-center gap-1.5 disabled:opacity-50 shrink-0"
              >
                {testingStatus === 'testing' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Server className="w-3.5 h-3.5 text-rose-400" />
                )}
                Проверить
              </button>
            </div>

            {testingStatus === 'success' && (
              <div className="flex items-start gap-2 text-emerald-400 text-xs mt-1 bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-900/50">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-medium">{statusMessage}</p>
                  {backendMeta?.scanner?.lastScanAt && (
                    <p className="text-[10px] text-emerald-300/80">
                      Последний скан: {new Date(backendMeta.scanner.lastScanAt).toLocaleString('ru-RU')}
                    </p>
                  )}
                </div>
              </div>
            )}
            {testingStatus === 'error' && (
              <div className="flex items-center gap-2 text-rose-400 text-xs mt-1 bg-rose-950/40 p-2.5 rounded-lg border border-rose-900/50">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}
          </div>

          {/* Section 2: IndexedDB Local Cache & Offline Resilience */}
          <div className="space-y-3 p-3.5 bg-gray-950/60 rounded-xl border border-gray-800">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-300 uppercase tracking-wider">
                <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                <span>Автономный кэш браузера (IndexedDB)</span>
              </label>
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                Offline-First
              </span>
            </div>

            <p className="text-[11px] text-gray-400 leading-relaxed">
              Все полученные с бэкенда вакансии кэшируются локально в <strong>IndexedDB</strong>. При потере соединения или когда сервер Render уходит в спящий режим, приложение загружается мгновенно из локального хранилища.
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-gray-900 border border-gray-800 flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-gray-400">Сохранено вакансий</div>
                  <div className="text-sm font-semibold text-white">{cacheMeta.totalCount}</div>
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-gray-900 border border-gray-800 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-gray-400">Синхронизация</div>
                  <div className="text-[11px] font-medium text-gray-200 truncate">
                    {cacheMeta.lastSyncAt ? new Date(cacheMeta.lastSyncAt).toLocaleTimeString('ru-RU') : 'Не выполнялась'}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleClearCache}
                className="flex-1 px-3 py-2 bg-gray-900 hover:bg-gray-800 text-gray-300 text-xs font-medium rounded-xl border border-gray-800 transition flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                Очистить кэш
              </button>
              {onRefreshFromBackend && (
                <button
                  type="button"
                  onClick={() => {
                    onRefreshFromBackend();
                    loadCacheInfo();
                  }}
                  className="flex-1 px-3 py-2 bg-gray-900 hover:bg-gray-800 text-gray-300 text-xs font-medium rounded-xl border border-gray-800 transition flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                  Обновить из БД
                </button>
              )}
            </div>

            {cacheStatusMessage && (
              <p className="text-[11px] text-emerald-400 text-center animate-fade-in">
                {cacheStatusMessage}
              </p>
            )}
          </div>

          {/* Section 3: Render Deploy Hook */}
          <div className="space-y-3 p-3.5 bg-gray-950/60 rounded-xl border border-gray-800">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-300 uppercase tracking-wider">
                <Rocket className="w-3.5 h-3.5 text-amber-400" />
                <span>Render Deploy Hook (srv-danv04oae00c73a5vv10)</span>
              </label>
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                CI/CD Auto-Deploy
              </span>
            </div>

            <p className="text-[11px] text-gray-400 leading-relaxed">
              Настроен вебхук мгновенного обновления бэкенда на <strong>Render.com</strong>. При каждом пуше в ветку <code className="text-amber-300">main</code> GitHub Actions автоматически вызывает этот хук после сборки Docker-образа. Также деплой можно запустить вручную прямо сейчас:
            </p>

            <div className="flex gap-2">
              <input
                type="url"
                value={deployHookUrl}
                onChange={(e) => setDeployHookUrl(e.target.value)}
                placeholder="https://api.render.com/deploy/srv-..."
                className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-[11px] text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-500 font-mono"
              />
              <button
                type="button"
                onClick={handleTriggerDeploy}
                disabled={deployStatus === 'deploying'}
                className="px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-medium rounded-xl border border-amber-500/30 transition flex items-center gap-1.5 disabled:opacity-50 shrink-0"
              >
                {deployStatus === 'deploying' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Rocket className="w-3.5 h-3.5" />
                )}
                Запустить деплой
              </button>
            </div>

            {deployFeedback && (
              <div
                className={`flex items-center gap-2 text-xs p-2.5 rounded-lg border ${
                  deployStatus === 'success'
                    ? 'text-emerald-400 bg-emerald-950/40 border-emerald-900/50'
                    : 'text-rose-400 bg-rose-950/40 border-rose-900/50'
                }`}
              >
                {deployStatus === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{deployFeedback}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 flex justify-end gap-2 bg-gray-950/60 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-gray-200 transition"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-rose-950/50 transition"
          >
            Сохранить настройки
          </button>
        </div>
      </div>
    </div>
  );
};
