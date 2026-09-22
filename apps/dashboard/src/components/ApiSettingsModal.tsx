import React, { useState, useEffect } from 'react';
import {
  Settings,
  Server,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Database,
  Globe,
  Trash2,
  Cpu,
  HardDrive,
  Rocket,
  Key,
  ShieldCheck,
  Copy,
  Sparkles,
  LogOut,
  Check,
  Radio,
  Eye,
  EyeOff,
} from 'lucide-react';
import { getCacheMeta, clearCachedVacancies } from '../services/indexedDbStorage';
import { getStoredApiKey, setStoredApiKey } from '../services/backendService';
import { generateApiKey, generateCronSecret, generateVapidKeyPair, formatEnvConfig } from '../utils/securityGenerators';
import { getStoredAuthUser, logout, AuthUser } from '../services/authService';

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
  const [apiKeyInput, setApiKeyInput] = useState(() => getStoredApiKey());
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingStatus, setTestingStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [backendMeta, setBackendMeta] = useState<any>(null);

  // Security generation states
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [generatedVapid, setGeneratedVapid] = useState<{ publicKey: string; privateKey: string } | null>(null);
  const [generatedCron, setGeneratedCron] = useState<string>('');
  const [isGeneratingVapid, setIsGeneratingVapid] = useState(false);

  // Auth User
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => getStoredAuthUser());

  // Render Deploy Hook State
  const [deployHookUrl, setDeployHookUrl] = useState(() => {
    return localStorage.getItem('render_deploy_hook_url') || '';
  });
  const [deployStatus, setDeployStatus] = useState<'idle' | 'deploying' | 'success' | 'error'>('idle');
  const [deployFeedback, setDeployFeedback] = useState<string | null>(null);

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 3000);
    } catch {
      // fallback
    }
  };

  const handleGenerateApiKey = () => {
    const key = generateApiKey();
    setApiKeyInput(key);
    setStoredApiKey(key);
    copyToClipboard(key, 'apiKey');
  };

  const handleGenerateCronSecret = () => {
    const secret = generateCronSecret();
    setGeneratedCron(secret);
    copyToClipboard(secret, 'cron');
  };

  const handleGenerateVapid = async () => {
    setIsGeneratingVapid(true);
    try {
      const keys = await generateVapidKeyPair();
      setGeneratedVapid(keys);
      copyToClipboard(`VAPID_PUBLIC_KEY="${keys.publicKey}"\nVAPID_PRIVATE_KEY="${keys.privateKey}"`, 'vapid');
    } finally {
      setIsGeneratingVapid(false);
    }
  };

  const handleCopyEnvBlock = () => {
    const envBlock = formatEnvConfig({
      apiKey: apiKeyInput || 'your-production-api-secret-key-32chars',
      cronSecret: generatedCron || 'your-production-cron-secret-key-123',
      vapidPublicKey: generatedVapid?.publicKey || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBKr3qBUYIHBQFLXYp5Nksh8U',
      vapidPrivateKey: generatedVapid?.privateKey || 'your-production-vapid-private-key',
      vapidSubject: 'mailto:d.nikulshin.dev@gmail.com',
      renderHook: deployHookUrl || undefined,
    });
    copyToClipboard(envBlock, 'allEnv');
  };

  const handleTriggerDeploy = async () => {
    const target = deployHookUrl.trim();
    if (!target) return;
    localStorage.setItem('render_deploy_hook_url', target);
    setDeployStatus('deploying');
    setDeployFeedback('Отправка запроса на Render Deploy Hook...');
    try {
      const res = await fetch(target, { method: 'POST' });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setDeployStatus('success');
        setDeployFeedback(`Деплой успешно запущен на Render! ${data.deploy?.id ? `ID: ${data.deploy.id}` : ''}`);
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
    setApiKeyInput(getStoredApiKey());
    setAuthUser(getStoredAuthUser());
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
      const cleanKey = apiKeyInput.trim().replace(/^["']|["']$/g, '');
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (cleanKey) {
        headers['x-api-key'] = cleanKey;
        headers['Authorization'] = `Bearer ${cleanKey}`;
      }

      const res = await fetch(`${target}/api/health`, {
        signal: controller.signal,
        headers,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        setTestingStatus('error');
        setStatusMessage(`Сервер вернул статус HTTP ${res.status}`);
        return;
      }

      const data = await res.json();
      setBackendMeta(data);

      // Проверяем доступ к защищенному эндпоинту с переданным ключом
      const queryParam = cleanKey ? `?apiKey=${encodeURIComponent(cleanKey)}` : '';
      const protectedRes = await fetch(`${target}/api/scoring-rules${queryParam}`, {
        headers,
      });

      if (protectedRes.status === 401) {
        setTestingStatus('error');
        setStatusMessage(
          'Бэкенд активен, но API-ключ отклонен (401 Unauthorized). Убедитесь, что в поле ниже введен точно такой же ключ, как в переменной API_SECRET_KEY на панели Render.'
        );
        return;
      }

      setTestingStatus('success');
      setStatusMessage(
        `Отлично! Бэкенд онлайн и API-ключ подтвержден (200 OK). База Neon: ${data.database || 'connected'} (${data.dbLatencyMs || 0}мс), вакансий: ${
          data.totalOrders || 0
        }.`
      );
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

  const handleLogout = () => {
    logout();
    window.location.reload();
  };

  const handleSave = () => {
    const cleanUrl = inputUrl.trim().replace(/\/$/, '');
    onSaveApiUrl(cleanUrl);
    setStoredApiKey(apiKeyInput.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Параметры безопасности и API</h3>
              <p className="text-xs text-gray-400">Fastify + Neon DB, ключи доступа x-api-key и VAPID</p>
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
          {/* Section: Active Session / RBAC */}
          {authUser && (
            <div className="p-3.5 bg-gray-950/80 rounded-xl border border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-xs border border-rose-500/30">
                  {authUser.name ? authUser.name.charAt(0) : 'D'}
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                    <span>{authUser.name}</span>
                    <span className="px-1.5 py-0.5 text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                      Администратор
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-400 font-mono">
                    {authUser.email || authUser.username || authUser.id}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="px-2.5 py-1.5 bg-gray-900 hover:bg-rose-950/40 text-gray-400 hover:text-rose-300 text-xs rounded-lg border border-gray-800 hover:border-rose-900/50 transition flex items-center gap-1.5"
                title="Выйти из аккаунта и заблокировать дашборд"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Выйти</span>
              </button>
            </div>
          )}

          {/* Section 1: Backend Fastify API URL */}
          <div className="space-y-2.5 p-3.5 bg-gray-950/60 rounded-xl border border-gray-800">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-300 uppercase tracking-wider">
              <Globe className="w-3.5 h-3.5 text-rose-400" />
              <span>URL бэкенда ScanAgent (Render API)</span>
            </label>

            <p className="text-[11px] text-gray-400 leading-relaxed">
              Прямые вызовы к публичному <code>api.hh.ru</code> полностью исключены. Все данные собираются сервером через Headless Playwright и сохраняются в PostgreSQL (Neon).
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

          {/* Section 2: API Secret Key Protection (x-api-key) */}
          <div className="space-y-3 p-3.5 bg-gray-950/60 rounded-xl border border-gray-800">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-300 uppercase tracking-wider">
                <Key className="w-3.5 h-3.5 text-rose-400" />
                <span>Ключ авторизации API (API_SECRET_KEY / x-api-key)</span>
              </label>
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                Security Enforced
              </span>
            </div>

            <p className="text-[11px] text-gray-400 leading-relaxed">
              Все защищенные эндпоинты бэкенда (<code className="text-rose-300">/api/vacancies</code>, <code className="text-rose-300">/api/scan</code>, <code className="text-rose-300">/api/scoring-rules</code>, <code className="text-rose-300">/api/push/*</code>) проверяют заголовок <code className="text-gray-300 font-mono">x-api-key</code> или <code className="text-gray-300 font-mono">Bearer</code>.
            </p>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKeyInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setApiKeyInput(val);
                    setStoredApiKey(val.trim());
                  }}
                  placeholder="scan_live_... (вставьте тот же ключ, что и на Render)"
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-3 pr-9 py-2 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-rose-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
                  title={showApiKey ? 'Скрыть ключ' : 'Показать ключ'}
                >
                  {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <button
                type="button"
                onClick={handleGenerateApiKey}
                className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium rounded-xl border border-rose-500/30 transition flex items-center gap-1.5 shrink-0"
                title="Сгенерировать новый ключ и скопировать"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Сгенерировать</span>
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-gray-400">
              <span>
                Статус в браузере:{' '}
                {apiKeyInput.trim() ? (
                  <strong className="text-emerald-400">Сохранен ({apiKeyInput.trim().slice(0, 8)}...)</strong>
                ) : (
                  <strong className="text-amber-400">Не задан (будет 401 ошибка)</strong>
                )}
              </span>
              {apiKeyInput.trim() && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(apiKeyInput.trim(), 'apiKeyExisting')}
                  className="text-gray-400 hover:text-gray-200 underline"
                >
                  {copiedField === 'apiKeyExisting' ? 'Скопировано!' : 'Скопировать'}
                </button>
              )}
            </div>

            {copiedField === 'apiKey' && (
              <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Новый API-ключ сгенерирован и сохранен в браузере! Укажите его в Render как API_SECRET_KEY.</span>
              </p>
            )}
          </div>

          {/* Section 3: Generator of VAPID & Cron Secrets */}
          <div className="space-y-3 p-3.5 bg-gray-950/60 rounded-xl border border-gray-800">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-300 uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Генератор секретов (VAPID Push & CRON)</span>
              </label>
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                1-Click Setup
              </span>
            </div>

            <p className="text-[11px] text-gray-400 leading-relaxed">
              Генерация криптографических пар ключей ECDSA P-256 для Web Push уведомлений и токенов cron-job.org без сторонних утилит.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* VAPID button */}
              <button
                type="button"
                onClick={handleGenerateVapid}
                disabled={isGeneratingVapid}
                className="p-2.5 bg-gray-900 hover:bg-gray-800 text-left rounded-xl border border-gray-800 transition flex flex-col gap-1 group"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-gray-200 group-hover:text-cyan-400">
                  <span className="flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-cyan-400" />
                    VAPID-пара (P-256)
                  </span>
                  {copiedField === 'vapid' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-gray-400" />
                  )}
                </div>
                <div className="text-[10px] text-gray-400">
                  {generatedVapid ? 'Ключи скопированы в буфер' : 'Сгенерировать Public & Private'}
                </div>
              </button>

              {/* CRON_SECRET button */}
              <button
                type="button"
                onClick={handleGenerateCronSecret}
                className="p-2.5 bg-gray-900 hover:bg-gray-800 text-left rounded-xl border border-gray-800 transition flex flex-col gap-1 group"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-gray-200 group-hover:text-amber-400">
                  <span className="flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    CRON_SECRET
                  </span>
                  {copiedField === 'cron' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-gray-400" />
                  )}
                </div>
                <div className="text-[10px] text-gray-400">
                  {generatedCron ? 'Секрет скопирован в буфер' : 'Для cron-job.org /api/scan/cron'}
                </div>
              </button>
            </div>

            {/* Quick Export .env block */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleCopyEnvBlock}
                className="w-full py-2 px-3 bg-gray-900 hover:bg-gray-800 text-gray-200 text-xs font-medium rounded-xl border border-gray-700/80 transition flex items-center justify-center gap-2"
              >
                {copiedField === 'allEnv' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Конфигурация .env скопирована в буфер обмена!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Скопировать готовый блок переменных для Render (.env)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Section 4: IndexedDB Local Cache & Offline Resilience */}
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

          {/* Section 5: Render Deploy Hook */}
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
