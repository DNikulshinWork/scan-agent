import React from 'react';
import { Briefcase, BarChart3, User, Server } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: 'vacancies' | 'stats' | 'profile' | 'plan';
  setActiveTab: (tab: 'vacancies' | 'stats' | 'profile' | 'plan') => void;
  vacanciesCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  vacanciesCount,
}) => {
  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-gray-950/95 backdrop-blur-lg border-t border-gray-800/90 pb-safe">
      <div className="grid grid-cols-4 h-16">
        <button
          onClick={() => setActiveTab('vacancies')}
          className={`flex flex-col items-center justify-center gap-1 transition ${
            activeTab === 'vacancies' ? 'text-rose-500 font-semibold' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <div className="relative">
            <Briefcase className="w-5 h-5" />
            {vacanciesCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-rose-600 text-white text-[9px] font-bold px-1 rounded-full min-w-4 text-center">
                {vacanciesCount}
              </span>
            )}
          </div>
          <span className="text-[11px]">Вакансии</span>
        </button>

        <button
          onClick={() => setActiveTab('stats')}
          className={`flex flex-col items-center justify-center gap-1 transition ${
            activeTab === 'stats' ? 'text-rose-500 font-semibold' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[11px]">Анализ</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center justify-center gap-1 transition ${
            activeTab === 'profile' ? 'text-rose-500 font-semibold' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[11px]">Резюме</span>
        </button>

        <button
          onClick={() => setActiveTab('plan')}
          className={`flex flex-col items-center justify-center gap-1 transition ${
            activeTab === 'plan' ? 'text-rose-500 font-semibold' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Server className="w-5 h-5" />
          <span className="text-[11px]">Сервер</span>
        </button>
      </div>
    </nav>
  );
};
