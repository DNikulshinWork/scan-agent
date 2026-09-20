import React, { useState, useEffect } from 'react';
import { Settings, Server, CheckCircle2, AlertCircle, RefreshCw, X, Shield, Globe, ExternalLink } from 'lucide-react';

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

  useEffect(() => {
    setInputUrl(apiUrl);
  }, [apiUrl]);

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

  const handleSave = () => {
    const clean = inputUrl.trim().replace(/\/$/, '');
    onSaveApiUrl(clean);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Настройка Fastify Backend API</h3>
              <p className="text-xs text-gray-400">Связь GitHub Pages со сканером и базой Neon</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
              URL развернутого бэкенда (Render / Railway / VPS)
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://scan-agent-api.onrender.com"
                className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-rose-500 font-mono text-xs"
              />
              <button
                type="button"
                onClick={testConnection}
                disabled={testingStatus === 'testing'}
                className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium rounded-xl border border-gray-700 transition flex items-center gap-1.5 disabled:opacity-50"
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

          <div className="p-4 bg-gray-950/70 rounded-xl border border-gray-800/80 text-xs space-y-2 text-gray-300">
            <div className="flex items-center gap-1.5 font-semibold text-gray-200">
              <Shield className="w-4 h-4 text-amber-400" />
              <span>Как это работает с GitHub Secrets:</span>
            </div>
            <p className="text-gray-400 leading-relaxed">
              1. Значение по умолчанию берется из переменной сборки{' '}
              <code className="bg-gray-800 px-1 py-0.5 rounded text-rose-300">
                NEXT_PUBLIC_API_URL
              </code>
              , которую можно передать из секрета репозитория{' '}
              <code className="bg-gray-800 px-1 py-0.5 rounded text-rose-300">
                API_URL
              </code>
              .
            </p>
            <p className="text-gray-400 leading-relaxed">
              2. При необходимости адрес можно переопределить прямо здесь — значение сохранится в{' '}
              <code className="bg-gray-800 px-1 py-0.5 rounded text-gray-300">localStorage</code> вашего браузера.
            </p>
            <p className="text-gray-400 leading-relaxed">
              3. Если бэкенд не запущен, дашборд работает в режиме прямого сканирования API HeadHunter.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-950/50 border-t border-gray-800">
          <button
            type="button"
            onClick={() => setInputUrl('')}
            className="text-xs text-gray-400 hover:text-gray-200 underline"
          >
            Сбросить (Offline / Client Mode)
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-gray-200"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-950/40 transition"
            >
              Сохранить URL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
