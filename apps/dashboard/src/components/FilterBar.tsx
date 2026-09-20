import React from 'react';
import { Search, SlidersHorizontal, MapPin, X, Sparkles } from 'lucide-react';
import { FilterState, VacancyStatus } from '../types';

interface FilterBarProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  availableTags: string[];
  counts: { all: number; new: number; applied: number; skipped: number };
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  setFilters,
  availableTags,
  counts,
}) => {
  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4 sm:p-5 mb-6 space-y-4 shadow-sm">
      {/* Search and Status row */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
            placeholder="Поиск по названию вакансии, компании или стеку..."
            className="w-full bg-gray-950/80 border border-gray-700/80 rounded-xl pl-10 pr-10 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-rose-500 transition-colors"
          />
          {filters.searchQuery && (
            <button
              onClick={() => setFilters((prev) => ({ ...prev, searchQuery: '' }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-gray-950/90 p-1 rounded-xl border border-gray-800 self-start md:self-auto overflow-x-auto max-w-full">
          {(
            [
              { key: 'all', label: 'Все', count: counts.all },
              { key: 'new', label: '🆕 Новые', count: counts.new },
              { key: 'applied', label: '✅ Откликнулся', count: counts.applied },
              { key: 'skipped', label: '⏭ Пропущены', count: counts.skipped },
            ] as const
          ).map(({ key, label, count }) => {
            const isActive = filters.status === key;
            return (
              <button
                key={key}
                onClick={() => setFilters((prev) => ({ ...prev, status: key as 'all' | VacancyStatus }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-rose-600 text-white shadow-sm font-semibold'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
                }`}
              >
                <span>{label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-rose-700 text-white' : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Second filter row: Match score, Salary filter, Remote only, Active tag clear */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-800/80">
        <div className="flex flex-wrap items-center gap-3">
          {/* Min Score Filter */}
          <div className="flex items-center gap-2 text-xs text-gray-300">
            <SlidersHorizontal className="w-3.5 h-3.5 text-rose-400" />
            <span>Мин. совпадение:</span>
            <select
              value={filters.minScore}
              onChange={(e) => setFilters((prev) => ({ ...prev, minScore: Number(e.target.value) }))}
              className="bg-gray-950 border border-gray-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-rose-500"
            >
              <option value="0">Все вакансии</option>
              <option value="6">≥ 6 / 10 (Частичное)</option>
              <option value="7">≥ 7 / 10 (Хорошее)</option>
              <option value="8">≥ 8 / 10 (Высокое)</option>
              <option value="9">≥ 9 / 10 (100% стек)</option>
            </select>
          </div>

          {/* Min Salary Filter */}
          <div className="flex items-center gap-2 text-xs text-gray-300">
            <span>Мин. зарплата:</span>
            <select
              value={filters.minSalary}
              onChange={(e) => setFilters((prev) => ({ ...prev, minSalary: Number(e.target.value) }))}
              className="bg-gray-950 border border-gray-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-rose-500"
            >
              <option value="0">Любая</option>
              <option value="150000">от 150 000 ₽</option>
              <option value="200000">от 200 000 ₽</option>
              <option value="250000">от 250 000 ₽</option>
              <option value="300000">от 300 000 ₽</option>
            </select>
          </div>

          {/* Remote checkbox */}
          <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none bg-gray-950/60 px-3 py-1 rounded-lg border border-gray-800 hover:border-gray-700">
            <input
              type="checkbox"
              checked={filters.remoteOnly}
              onChange={(e) => setFilters((prev) => ({ ...prev, remoteOnly: e.target.checked }))}
              className="rounded border-gray-700 text-rose-600 focus:ring-rose-500 w-3.5 h-3.5"
            />
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span>Только удаленка</span>
          </label>
        </div>

        {filters.selectedTag && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Фильтр по тегу:</span>
            <button
              onClick={() => setFilters((prev) => ({ ...prev, selectedTag: '' }))}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30"
            >
              <span>{filters.selectedTag}</span>
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Popular tag chips */}
      <div className="flex items-center gap-1.5 flex-wrap pt-1">
        <span className="text-xs text-gray-500 mr-1">Теги:</span>
        {availableTags.slice(0, 10).map((tag) => {
          const isSelected = filters.selectedTag === tag;
          return (
            <button
              key={tag}
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  selectedTag: isSelected ? '' : tag,
                }))
              }
              className={`text-xs px-2.5 py-0.5 rounded-full border transition-all ${
                isSelected
                  ? 'bg-rose-600 text-white border-rose-500 font-medium'
                  : 'bg-gray-950/70 text-gray-400 border-gray-800 hover:border-gray-700 hover:text-gray-200'
              }`}
            >
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
};
