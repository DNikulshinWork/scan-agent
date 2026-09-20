import React from 'react';
import { Download, TrendingUp, Trophy, XCircle, Send, Filter, CheckCircle2, ArrowRight } from 'lucide-react';
import { Vacancy } from '../types';

interface StatsViewProps {
  vacancies: Vacancy[];
}

export const StatsView: React.FC<StatsViewProps> = ({ vacancies }) => {
  const totalParsed = vacancies.length;
  const filtered = vacancies.filter((v) => v.score === 0).length;
  const passedScore = vacancies.filter((v) => v.score >= 7).length;
  const applied = vacancies.filter((v) => v.status === 'applied').length;
  const won = vacancies.filter((v) => v.outcome === 'won').length;
  const lost = vacancies.filter((v) => v.outcome === 'lost').length;
  const winRate = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0;

  // Score distribution histogram
  const scoreBuckets: Record<string, number> = {
    '0-2 (Мусор)': 0,
    '3-4 (Слабо)': 0,
    '5-6 (Средне)': 0,
    '7-8 (Хорошо)': 0,
    '9-10 (Идеально)': 0,
  };

  vacancies.forEach((v) => {
    if (v.score <= 2) scoreBuckets['0-2 (Мусор)']++;
    else if (v.score <= 4) scoreBuckets['3-4 (Слабо)']++;
    else if (v.score <= 6) scoreBuckets['5-6 (Средне)']++;
    else if (v.score <= 8) scoreBuckets['7-8 (Хорошо)']++;
    else scoreBuckets['9-10 (Идеально)']++;
  });

  const handleExportMarkdown = () => {
    const dateStr = new Date().toISOString().slice(0, 10);
    const lines: string[] = [
      `# ScanAgent HH.ru — Отчет по вакансиям (${dateStr})`,
      '',
      `## 📊 Ключевые метрики`,
      `- Всего спарсено с HH.ru: **${totalParsed}**`,
      `- Отсеяно pre-filter / hardExclude: **${filtered}**`,
      `- Высокий скор (≥7/10): **${passedScore}**`,
      `- Отправлено откликов: **${applied}**`,
      `- Успешные офферы (Won): **${won}**`,
      `- Отказы (Lost): **${lost}**`,
      `- Win Rate: **${winRate}%**`,
      '',
      `## 📋 Список актуальных вакансий`,
      '',
    ];

    vacancies.forEach((v) => {
      lines.push(`### ${v.title}`);
      lines.push(`- **Компания:** ${v.employer}`);
      lines.push(`- **Зарплата:** ${v.price}`);
      lines.push(`- **Локация:** ${v.city}`);
      lines.push(`- **Скор:** ${v.score}/10`);
      lines.push(`- **Ссылка:** ${v.link}`);
      lines.push(`- **Статус:** ${v.status} (${v.outcome})`);
      if (v.hook) lines.push(`- **Hook:** ${v.hook}`);
      lines.push('');
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `scan-agent-hh-${dateStr}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getPercent = (count: number, total: number) => {
    if (!total) return '0%';
    return `${Math.round((count / total) * 100)}%`;
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-800">
        <div>
          <h2 className="text-xl font-bold text-white">📊 Аналитика и Воронка HH.ru</h2>
          <p className="text-xs text-gray-400">
            Метрики парсинга, скоринга и конверсии откликов на вакансии HeadHunter
          </p>
        </div>
        <button
          onClick={handleExportMarkdown}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold border border-gray-700 transition-colors self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-rose-400" />
          <span>Скачать отчет в Markdown</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-4 space-y-1">
          <div className="text-xs text-gray-400 font-medium">Спарсено вакансий</div>
          <div className="text-2xl font-black text-white">{totalParsed}</div>
          <div className="text-[11px] text-gray-500">Автоматически с HH.ru</div>
        </div>

        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-4 space-y-1">
          <div className="text-xs text-gray-400 font-medium">Высокий матч (≥7)</div>
          <div className="text-2xl font-black text-rose-400">{passedScore}</div>
          <div className="text-[11px] text-gray-500">{getPercent(passedScore, totalParsed)} от общего числа</div>
        </div>

        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-4 space-y-1">
          <div className="text-xs text-gray-400 font-medium">Отправлено откликов</div>
          <div className="text-2xl font-black text-blue-400">{applied}</div>
          <div className="text-[11px] text-gray-500">{getPercent(applied, passedScore)} от качественных</div>
        </div>

        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-4 space-y-1">
          <div className="text-xs text-gray-400 font-medium">Win Rate (Офферы)</div>
          <div className="text-2xl font-black text-emerald-400">{winRate}%</div>
          <div className="text-[11px] text-gray-500">
            {won} побед / {lost} отказов
          </div>
        </div>
      </div>

      {/* Funnel Stage Visualization */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-5">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-rose-400" />
          <span>Воронка отбора вакансий</span>
        </h3>

        <div className="space-y-3">
          {[
            {
              title: '1. Сбор вакансий по поисковым параметрам HH.ru',
              count: totalParsed,
              percent: 100,
              color: 'bg-gray-700',
            },
            {
              title: '2. Первичный отсев stop-words (1С, Bitrix, QA, etc.)',
              count: totalParsed - filtered,
              percent: totalParsed ? Math.round(((totalParsed - filtered) / totalParsed) * 100) : 0,
              color: 'bg-indigo-600',
            },
            {
              title: '3. Прошли скоринг соответствия стеку (score ≥ 7)',
              count: passedScore,
              percent: totalParsed ? Math.round((passedScore / totalParsed) * 100) : 0,
              color: 'bg-rose-600',
            },
            {
              title: '4. Отправлен отклик с подготовленным питчем',
              count: applied,
              percent: totalParsed ? Math.round((applied / totalParsed) * 100) : 0,
              color: 'bg-blue-600',
            },
            {
              title: '5. Оффер / Успешный контакт (Won)',
              count: won,
              percent: totalParsed ? Math.round((won / totalParsed) * 100) : 0,
              color: 'bg-emerald-500',
            },
          ].map((stage, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-300 font-medium">{stage.title}</span>
                <span className="text-gray-400 font-mono">
                  {stage.count} ({stage.percent}%)
                </span>
              </div>
              <div className="h-2.5 bg-gray-950 rounded-full overflow-hidden border border-gray-800">
                <div
                  className={`h-full ${stage.color} rounded-full transition-all duration-500`}
                  style={{ width: `${Math.max(stage.percent, 3)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Score Histogram */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white">Распределение оценок соответствия стеку</h3>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {Object.entries(scoreBuckets).map(([label, count]) => {
            const maxVal = Math.max(...Object.values(scoreBuckets), 1);
            const heightPct = Math.round((count / maxVal) * 100);
            return (
              <div
                key={label}
                className="bg-gray-950 border border-gray-800/80 rounded-xl p-3 flex flex-col justify-between items-center text-center gap-2"
              >
                <div className="text-xs text-gray-400 font-medium">{label}</div>
                <div className="text-xl font-bold text-white">{count}</div>
                <div className="w-full bg-gray-900 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-rose-500 h-full rounded-full" style={{ width: `${heightPct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
