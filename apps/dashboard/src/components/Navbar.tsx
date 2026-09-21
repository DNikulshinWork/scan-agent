import React from 'react';
import { Briefcase, BarChart3, User, Server, RefreshCw, Settings } from 'lucide-react';
import { PushNotificationToggle } from './PushNotificationToggle';

interface NavbarProps {
  activeTab: 'vacancies' | 'stats' | 'profile' | 'plan';
  setActiveTab: (tab: 'vacancies' | 'stats' | 'profile' | 'plan') => void;
  onTriggerScan: () => void;
  isScanning: boolean;
  vacanciesCount: number;
  onOpenSettings?: () => void;
  backendOnline?: boolean;
  apiUrl?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onTriggerScan,
  isScanning,
  vacanciesCount,
  onOpenSettings,
  backendOnline,
  apiUrl,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-gray-950/90 backdrop-blur-md border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <img
              src="/icon.svg"
              alt="ScanAgent"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl shadow-lg shadow-rose-950/50 shrink-0 border border-rose-500/20"
            />
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-base sm:text-lg font-bold text-white tracking-tight">ScanAgent</span>
                <span className="px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  PWA
                </span>
                {backendOnline !== undefined && (
                  <span
                    onClick={onOpenSettings}
                    className={`cursor-pointer inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-medium rounded-full border shrink-0 transition-colors ${
                      backendOnline
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                        : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/20'
                    }`}
                    title={
                      backendOnline
                        ? 'Бэкенд Fastify API + Neon DB подключен'
                        : 'Автономный режим: данные загружаются из локального кэша IndexedDB'
                    }
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        backendOnline ? 'bg-emerald-400 animate-pulse' : 'bg-cyan-400'
                      }`}
                    />
                    <span className="hidden md:inline">
                      {backendOnline ? 'Бэкенд Онлайн' : 'IndexedDB Кэш'}
                    </span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-400 hidden md:block">
                Мониторинг вакансий HH.ru на фильтрах · Render & Neon & GitHub Pages
              </p>
            </div>
          </div>

          {/* Navigation Tabs (Hidden on mobile, handled by MobileBottomNav) */}
          <nav className="hidden sm:flex items-center gap-1 bg-gray-900/80 p-1 rounded-xl border border-gray-800">
            <button
              onClick={() => setActiveTab('vacancies')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'vacancies'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Вакансии</span>
              <span className={`text-xs px-1.5 py-0.2 rounded-full ${activeTab === 'vacancies' ? 'bg-rose-700 text-white' : 'bg-gray-800 text-gray-400'}`}>
                {vacanciesCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('stats')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'stats'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Статистика</span>
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'profile'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Резюме & Стек</span>
            </button>

            <button
              onClick={() => setActiveTab('plan')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'plan'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              <Server className="w-4 h-4" />
              <span>План & Деплой</span>
            </button>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <PushNotificationToggle apiUrl={apiUrl} />

            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-xl border border-gray-800 transition shrink-0"
                title="Параметры источника данных и кэша IndexedDB"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onTriggerScan}
              disabled={isScanning}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white shadow-lg shadow-rose-900/20 transition-colors shrink-0"
              title="Запустить сбор вакансий через наш бэкенд"
            >
              <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isScanning ? 'animate-spin' : ''}`} />
              <span>
                {isScanning ? 'Сканирование...' : 'Собрать вакансии'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
