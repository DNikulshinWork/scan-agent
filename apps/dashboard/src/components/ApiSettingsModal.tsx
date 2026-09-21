import React, { useState, useEffect } from 'react';
import { Settings, Server, CheckCircle2, AlertCircle, RefreshCw, X, Shield, Globe, ExternalLink, Key } from 'lucide-react';

interface ApiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiUrl: string;
  onSaveApiUrl: (url: string) => void;
}

export const ApiSettingsModal: React.FC<ApiSettingsModalProps> = ({
  isOpen,
  onClose,
  apiUrl,
  onSaveApiUrl,
}) => {
  const [inputUrl, setInputUrl] = useState(apiUrl);
  const [testingStatus, setTestingStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');

  const [hhToken, setHhToken] = useState<string>('');
  const [hhTestingStatus, setHhTestingStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [hhStatusMessage, setHhStatusMessage] = useState<string>('');

  useEffect(() => {
    setInputUrl(apiUrl);
    if (typeof window !== 'undefined') {
      const savedToken = localStorage.getItem('hh_access_token') || '';
      setHhToken(savedToken);
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
    setStatusMessage('Проверка доступности /api/health...');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${target}/api/health`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        setTestingStatus('success');
        setStatusMessage(`Бэкенд доступен! Uptime: ${Math.round(data.uptime || 0)} сек`);
      } else {
        setTestingStatus('error');
        setStatusMessage(`Сервер вернул статус HTTP ${res.status}`);
      }
    } catch (err: any) {
      setTestingStatus('error');
      setStatusMessage(
        err.name === 'AbortError'
          ? 'Таймаут (6 сек). Сервер спит или недоступен.'
          : 'Не удалось подключиться. Проверьте CORS и статус сервера.'
      );
    }
  };

  const testHhToken = async () => {
    const token = hhToken.trim();
    if (!token) {
      setHhTestingStatus('error');
      setHhStatusMessage('Введите токен для проверки');
      return;
    }

    setHhTestingStatus('testing');
    setHhStatusMessage('Проверка токена в HeadHunter API...');

    try {
      const res = await fetch('https://api.hh.ru/vacancies?text=TypeScript&per_page=1', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (res.ok) {
        setHhTestingStatus('success');
        setHhStatusMessage('Токен подтвержден! Прямой доступ к HeadHunter API активен.');
      } else if (res.status === 403) {
        setHhTestingStatus('error');
        setHhStatusMessage('Ошибка 403: Токен недействителен или истек (требуется перевыпуск на dev.hh.ru).');
      } else {
        setHhTestingStatus('error');
        setHhStatusMessage(`HH API вернул статус ${res.status}: ${res.statusText}`);
      }
    } catch (err: any) {
      setHhTestingStatus('error');
      setHhStatusMessage(`Сетевой сбой: ${err.message || 'CORS / Офлайн'}`);
    }
  };

  const handleSave = () => {
    const cleanUrl = inputUrl.trim().replace(/\/$/, '');
    onSaveApiUrl(cleanUrl);

    if (typeof window !== 'undefined') {
      if (hhToken.trim()) {
        localStorage.setItem('hh_access_token', hhToken.trim());
      } else {
        localStorage.removeItem('hh_access_token');
      }
    }

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
              <h3 className="text-base font-semibold text-white">Параметры сбора вакансий</h3>
              <p className="text-xs text-gray-400">HeadHunter OAuth и подключение к бэкенду Fastify</p>
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
          {/* Section 1: HH OAuth Access Token */}
          <div className="space-y-2 p-3.5 bg-gray-950/60 rounded-xl border border-gray-800">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-300 uppercase tracking-wider">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>HeadHunter OAuth Token</span>
              </label>
              <a
                href="https://dev.hh.ru"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1"
              >
                <span>dev.hh.ru</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <p className="text-[11px] text-gray-400">
              Необходим для прямого поиска вакансий через официальный API HeadHunter (без 403 Forbidden).
            </p>

            <div className="flex gap-2">
              <input
                type="password"
                value={hhToken}
                onChange={(e) => setHhToken(e.target.value)}
                placeholder="Вставьте access_token из личного кабинета dev.hh.ru..."
                className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-rose-500 font-mono"
              />
              <button
                type="button"
                onClick={testHhToken}
                disabled={hhTestingStatus === 'testing' || !hhToken.trim()}
                className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium rounded-xl border border-gray-700 transition flex items-center gap-1.5 disabled:opacity-50 shrink-0"
              >
                {hhTestingStatus === 'testing' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                )}
                Проверить
              </button>
            </div>

            {hhTestingStatus === 'success' && (
              <div className="flex items-center gap-2 text-emerald-400 text-xs mt-1.5 bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-900/50">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{hhStatusMessage}</span>
              </div>
            )}
            {hhTestingStatus === 'error' && (
              <div className="flex items-center gap-2 text-rose-400 text-xs mt-1.5 bg-rose-950/40 p-2.5 rounded-lg border border-rose-900/50">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{hhStatusMessage}</span>
              </div>
            )}
          </div>

          {/* Section 2: Fastify Backend URL */}
          <div className="space-y-2 p-3.5 bg-gray-950/60 rounded-xl border border-gray-800">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-300 uppercase tracking-wider">
              <Globe className="w-3.5 h-3.5 text-rose-400" />
              <span>URL бэкенда (Render / Railway / VPS)</span>
            </label>

            <p className="text-[11px] text-gray-400">
              Если у вас развернут бэкенд на Fastify, он может сканировать HH и сохранять данные в PostgreSQL (Neon).
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
                  <Globe className="w-3.5 h-3.5" />
                )}
                Проверить
              </button>
            </div>

            {testingStatus === 'success' && (
              <div className="flex items-center gap-2 text-emerald-400 text-xs mt-1.5 bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-900/50">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}
            {testingStatus === 'error' && (
              <div className="flex items-center gap-2 text-rose-400 text-xs mt-1.5 bg-rose-950/40 p-2.5 rounded-lg border border-rose-900/50">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}
          </div>

          {/* Section 3: Explanation */}
          <div className="p-3.5 bg-gray-950/70 rounded-xl border border-gray-800/80 text-xs space-y-2.5 text-gray-300">
            <div className="flex items-center gap-1.5 font-semibold text-gray-200">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Решение проблемы 403 Forbidden (Playwright + Stealth):</span>
            </div>
            <p className="text-gray-400 leading-relaxed text-[11px]">
              HeadHunter отключил бесплатный доступ к API физлицам (код 403). Вместо API бэкенд использует браузерный движок <strong>Playwright</strong> с плагином <strong>stealth</strong>. Он эмулирует реального пользователя, парсит свежие вакансии по вашему стеку и сохраняет их в базу PostgreSQL Neon.
            </p>

            <div className="pt-2 border-t border-gray-800/80 space-y-1.5 text-[11px]">
              <div className="text-gray-300 font-semibold flex items-center gap-1">
                <span>⏰ Автоматический опрос и пробуждение сервисов:</span>
              </div>
              <ul className="list-disc pl-4 space-y-1 text-gray-400">
                <li>
                  <strong className="text-rose-300">/health</strong> — вызывается cron-job каждые 14 минут. Делает реальный запрос <code className="bg-gray-800 px-1 rounded text-gray-200">SELECT 1</code> в базу данных, пробуждая Render и Neon.
                </li>
                <li>
                  <strong className="text-rose-300">/api/scan/cron</strong> — эндпоинт для автоматического сбора вакансий по внешнему расписанию.
                </li>
                <li>
                  <strong className="text-rose-300">Кнопка «Сбор»</strong> — мгновенный ручной сбор и синхронизация в дашборд.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 bg-gray-950/80 border-t border-gray-800 shrink-0">
          <button
            type="button"
            onClick={() => {
              setInputUrl('');
              setHhToken('');
              if (typeof window !== 'undefined') {
                localStorage.removeItem('hh_access_token');
              }
            }}
            className="text-xs text-gray-400 hover:text-gray-200 underline cursor-pointer"
          >
            Сбросить всё
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 sm:px-4 py-2 text-xs font-medium text-gray-400 hover:text-gray-200 cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-950/40 transition cursor-pointer"
            >
              Сохранить настройки
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
