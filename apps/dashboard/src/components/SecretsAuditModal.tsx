import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Database,
  Key,
  Clock,
  Bell,
  Server,
  HardDrive,
  X,
  Lock,
  Sparkles,
  Info,
  Filter,
} from 'lucide-react';
import { fetchSecretsAudit, getStoredApiKey } from '../services/backendService';
import { SecretsAuditReport, SecretsAuditItem } from '../types';
import { getCacheMeta, getCachedVacancies } from '../services/indexedDbStorage';

interface SecretsAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiUrl?: string;
  onOpenSettings?: () => void;
}

export const SecretsAuditModal: React.FC<SecretsAuditModalProps> = ({
  isOpen,
  onClose,
  apiUrl,
  onOpenSettings,
}) => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<SecretsAuditReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [localCacheCount, setLocalCacheCount] = useState<number>(0);
  const [localSyncTime, setLocalSyncTime] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<string>('default');

  const runAudit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSecretsAudit(apiUrl);
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Ошибка соединения с сервером при выполнении аудита');
    } finally {
      setLoading(false);
    }

    // Проверяем локальные свойства клиента
    try {
      const cached = await getCachedVacancies();
      setLocalCacheCount(cached.length);
      const meta = await getCacheMeta();
      if (meta.lastSyncAt) setLocalSyncTime(meta.lastSyncAt);
    } catch {
      // Игнорируем ошибки кэша
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushStatus(Notification.permission);
    }
  }, [apiUrl]);

  useEffect(() => {
    if (isOpen) {
      runAudit();
    }
  }, [isOpen, runAudit]);

  if (!isOpen) return null;

  const handleCopyReport = () => {
    if (!report) return;
    const clientKey = getStoredApiKey();
    const formatted = `=== АУДИТ СЕКРЕТОВ И ПЕРЕМЕННЫХ ОКРУЖЕНИЯ RENDER ===
Дата: ${new Date(report.timestamp).toLocaleString('ru-RU')}
API URL: ${apiUrl || 'https://scan-agent-api.onrender.com'}
Сервер: 0.0.0.0:${report.server.port} (режим: ${report.server.nodeEnv}, аптайм: ${report.uptimeSeconds}с)
Клиентский API-ключ в браузере: ${clientKey ? `${clientKey.slice(0, 6)}... (длина: ${clientKey.length})` : 'отсутствует'}
Совпадение ключей: ${report.clientSession.keyMatchesServer ? 'ДА (200 OK)' : 'НЕТ (401 Mismatch)'}

--- ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ RENDER ---
${report.items
  .map(
    (item) =>
      `• [${item.status.toUpperCase()}] ${item.key}: ${item.preview} (${item.message})`
  )
  .join('\n')}

--- СТАТИСТИКА ---
Всего проверено: ${report.stats.total}
Готовы (OK): ${report.stats.valid}
Предупреждения: ${report.stats.warnings}
Ошибки: ${report.stats.errors}
Все системы в норме: ${report.stats.allReady ? 'ДА' : 'НЕТ'}
`;

    navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const getStatusBadge = (status: SecretsAuditItem['status']) => {
    switch (status) {
      case 'ok':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Подтвержден</span>
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-950/80 text-amber-300 border border-amber-800">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span>Внимание</span>
          </span>
        );
      case 'mismatch':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-950/80 text-rose-300 border border-rose-800 animate-pulse">
            <XCircle className="w-3 h-3 text-rose-400" />
            <span>Не совпадает (401)</span>
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-950/80 text-rose-300 border border-rose-800">
            <XCircle className="w-3 h-3 text-rose-400" />
            <span>Ошибка</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-gray-800 text-gray-400 border border-gray-700">
            <Info className="w-3 h-3 text-gray-400" />
            <span>Опционально</span>
          </span>
        );
    }
  };

  const getItemIcon = (key: string) => {
    switch (key) {
      case 'API_SECRET_KEY':
        return <Key className="w-4 h-4 text-rose-400" />;
      case 'DATABASE_URL':
        return <Database className="w-4 h-4 text-cyan-400" />;
      case 'CRON_SECRET':
        return <Clock className="w-4 h-4 text-amber-400" />;
      case 'VAPID_PUBLIC_KEY':
      case 'VAPID_PRIVATE_KEY':
      case 'VAPID_SUBJECT':
        return <Bell className="w-4 h-4 text-purple-400" />;
      case 'HH_SEARCH_URL':
        return <Filter className="w-4 h-4 text-blue-400" />;
      default:
        return <Server className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="bg-gray-950 border border-gray-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-gray-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Шапка модального окна */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/80 bg-gray-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-900/40 via-purple-900/30 to-emerald-900/40 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-inner">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white">Аудит секретов и ключей Render</h2>
                {report && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium border ${
                      report.stats.allReady
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                        : 'bg-amber-950/80 text-amber-300 border-amber-800'
                    }`}
                  >
                    {report.stats.valid}/{report.stats.total} Ключей в норме
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">
                Живая проверка переменных окружения, базы Neon и согласованности сессии дашборда
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={runAudit}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition disabled:opacity-50"
              title="Перепроверить статус сейчас"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-rose-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition"
              title="Закрыть"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Тело окна */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
          {/* Индикатор общего статуса */}
          {loading && !report && (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <RefreshCw className="w-8 h-8 text-rose-500 animate-spin" />
              <p className="text-sm text-gray-300 font-medium">Диагностика всех переменных на бэкенде...</p>
              <p className="text-xs text-gray-500">Проверяем Neon PostgreSQL, ключи API и подписи Web Push</p>
            </div>
          )}

          {error && (
            <div className="bg-rose-950/50 border border-rose-800/80 rounded-xl p-4 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-rose-200">Ошибка связи с бэкендом</h4>
                <p className="text-xs text-rose-300 mt-1">{error}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={runAudit}
                    className="px-3 py-1.5 bg-rose-800 hover:bg-rose-700 text-white text-xs rounded-lg transition"
                  >
                    Повторить попытку
                  </button>
                  {onOpenSettings && (
                    <button
                      onClick={onOpenSettings}
                      className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs rounded-lg transition"
                    >
                      Открыть настройки API
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {report && (
            <>
              {/* Главный сводный баннер */}
              <div
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  report.stats.allReady
                    ? 'bg-gradient-to-r from-emerald-950/50 via-gray-900 to-gray-900 border-emerald-800/80'
                    : 'bg-gradient-to-r from-amber-950/50 via-gray-900 to-gray-900 border-amber-800/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      report.stats.allReady ? 'bg-emerald-900/50 text-emerald-400' : 'bg-amber-900/50 text-amber-400'
                    }`}
                  >
                    {report.stats.allReady ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <AlertTriangle className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {report.stats.allReady
                        ? 'Все 7 секретов Render настроены идеально!'
                        : `Внимание: обнаружено ${report.stats.warnings + report.stats.errors} замечаний по секретам`}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Сервер Render прослушивает порт {report.server.port} • Аптайм: {Math.floor(report.uptimeSeconds / 60)} мин. • Сессия: {report.clientSession.keyMatchesServer ? 'Авторизована' : 'Требует синхронизации'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyReport}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-xs text-gray-200 transition"
                    title="Скопировать текстовый отчет аудита"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Скопировано!' : 'Копировать отчет'}</span>
                  </button>
                  <a
                    href="https://dashboard.render.com"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 bg-rose-900/60 hover:bg-rose-800/80 border border-rose-700/60 rounded-xl text-xs text-rose-200 transition"
                  >
                    <span>Панель Render</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Таблица / Список всех 7 ключей Render */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-gray-400 px-1">
                  <span className="font-semibold uppercase tracking-wider text-[11px] text-gray-400">
                    Переменные окружения Render Environment ({report.items.length})
                  </span>
                  <span>Последняя проверка: {new Date(report.timestamp).toLocaleTimeString('ru-RU')}</span>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {report.items.map((item) => (
                    <div
                      key={item.key}
                      className="bg-gray-900/70 border border-gray-800/90 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-gray-700 transition"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-gray-800/80 border border-gray-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                          {getItemIcon(item.key)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-semibold text-rose-300">
                              {item.key}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">
                              {item.category}
                            </span>
                            {getStatusBadge(item.status)}
                          </div>
                          <p className="text-xs text-gray-300 mt-1">
                            {item.message}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 sm:flex-col sm:items-end flex-shrink-0 pl-11 sm:pl-0">
                        <span className="font-mono text-[11px] bg-gray-950 px-2 py-1 rounded border border-gray-800 text-gray-300">
                          {item.preview}
                        </span>
                        {item.length > 0 && (
                          <span className="text-[10px] text-gray-500">
                            Длина: {item.length} симв.
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Локальный контур клиента (Браузер) */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-cyan-400" />
                  <span>Клиентский контур (Браузерная сессия)</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-gray-950 border border-gray-800/80 rounded-xl p-3">
                    <span className="text-gray-400 block text-[11px]">Ключ в LocalStorage</span>
                    <span className="font-mono text-emerald-400 font-medium mt-1 block truncate">
                      {report.clientSession.providedKeyPreview}
                    </span>
                    <span className="text-[10px] text-gray-500 mt-0.5 block">
                      {report.clientSession.keyMatchesServer ? 'Ключи идентичны' : 'Не совпадает!'}
                    </span>
                  </div>

                  <div className="bg-gray-950 border border-gray-800/80 rounded-xl p-3">
                    <span className="text-gray-400 block text-[11px]">Локальный кэш IndexedDB</span>
                    <span className="text-cyan-400 font-semibold mt-1 block">
                      {localCacheCount} сохраненных вакансий
                    </span>
                    <span className="text-[10px] text-gray-500 mt-0.5 block">
                      {localSyncTime ? `Синхр.: ${new Date(localSyncTime).toLocaleTimeString('ru-RU')}` : 'Автономный режим'}
                    </span>
                  </div>

                  <div className="bg-gray-950 border border-gray-800/80 rounded-xl p-3">
                    <span className="text-gray-400 block text-[11px]">Web Push уведомления</span>
                    <span className="text-purple-400 font-semibold mt-1 block capitalize">
                      {pushStatus === 'granted' ? 'Разрешены ✅' : pushStatus === 'denied' ? 'Заблокированы ❌' : 'Не запрошены ⏳'}
                    </span>
                    <span className="text-[10px] text-gray-500 mt-0.5 block">
                      RFC 8291 VAPID Web Push
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Подвал */}
        <div className="px-5 py-3 border-t border-gray-800/80 bg-gray-900/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Безопасная передача ключей: сырые секреты никогда не раскрываются целиком</span>
          </div>

          <div className="flex items-center gap-2">
            {onOpenSettings && (
              <button
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs rounded-xl transition"
              >
                Изменить ключи
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium rounded-xl transition"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
