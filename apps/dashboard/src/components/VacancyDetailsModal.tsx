import React, { useState } from 'react';
import { X, ExternalLink, Copy, Check, Sparkles, Building2, MapPin, Calendar, Clock, Send } from 'lucide-react';
import { Vacancy, VacancyStatus, VacancyOutcome } from '../types';

interface VacancyDetailsModalProps {
  vacancy: Vacancy | null;
  onClose: () => void;
  onUpdatePitch: (id: string, newPitch: string) => void;
  onStatusChange?: (id: string, newStatus: VacancyStatus) => void;
  onOutcomeChange?: (id: string, newOutcome: VacancyOutcome) => void;
}

export const VacancyDetailsModal: React.FC<VacancyDetailsModalProps> = ({
  vacancy,
  onClose,
  onUpdatePitch,
}) => {
  if (!vacancy) return null;

  const [pitchText, setPitchText] = useState(vacancy.pitch);
  const [copied, setCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleCopy = () => {
    const fullText = vacancy.hook ? `${vacancy.hook}\n\n${pitchText}` : pitchText;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSavePitch = () => {
    onUpdatePitch(vacancy.id, pitchText);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-800 flex items-start justify-between gap-4 bg-gray-950/60">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-red-600/20 text-red-300 border border-red-500/30">
                HH.ru ID: {vacancy.orderId}
              </span>
              <span className="text-xs text-emerald-400 font-bold">
                💰 {vacancy.price}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white leading-tight">
              {vacancy.title}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 pt-1">
              <span className="flex items-center gap-1 text-gray-300">
                <Building2 className="w-3.5 h-3.5" />
                {vacancy.employer}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {vacancy.city}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Опубликовано: {new Date(vacancy.publishedAt).toLocaleDateString('ru-RU')}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-sm text-gray-200">
          {/* Filter Matching Bar */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-rose-950/40 to-slate-900/40 border border-rose-800/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-rose-300 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                Оценка фильтрами стека (Детерминированная)
              </span>
              <div className="flex items-center gap-2">
                {vacancy.matchPercentage ? (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                    {vacancy.matchPercentage}% совпадение
                  </span>
                ) : null}
                <span className="text-base font-bold text-white bg-rose-600/40 px-2.5 py-0.5 rounded-lg border border-rose-500/40">
                  {vacancy.score} / 10
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              {vacancy.filterVerdict || vacancy.reason}
            </p>

            {vacancy.tags && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {vacancy.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] px-2 py-0.5 rounded bg-gray-900/80 text-rose-200 border border-rose-800/40 font-mono"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Job Description */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Описание вакансии с HeadHunter
            </h4>
            <div className="p-4 rounded-xl bg-gray-950/80 border border-gray-800 text-xs sm:text-sm text-gray-300 leading-relaxed max-h-56 overflow-y-auto whitespace-pre-wrap">
              {vacancy.description}
            </div>
          </div>

          {/* Cover Letter Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Готовый отклик (Cover Letter для HH.ru)
              </h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSavePitch}
                  className="text-xs text-rose-400 hover:text-rose-300 font-medium px-2 py-1 rounded bg-rose-950/40 border border-rose-800/40"
                >
                  {isSaved ? 'Сохранено!' : 'Сохранить правки'}
                </button>
              </div>
            </div>

            {vacancy.hook && (
              <div className="p-3 rounded-lg bg-gray-950 border border-gray-800 text-xs italic text-rose-200">
                <span className="font-semibold text-gray-500 not-italic mr-1">Hook:</span>
                {vacancy.hook}
              </div>
            )}

            <textarea
              rows={6}
              value={pitchText}
              onChange={(e) => setPitchText(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3.5 text-xs sm:text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-rose-500 font-mono leading-relaxed"
              placeholder="Текст сопроводительного письма..."
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-800 bg-gray-950/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <a
            href={vacancy.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-rose-400 hover:text-rose-300 flex items-center justify-center sm:justify-start gap-1.5 py-1"
          >
            <span>Перейти к вакансии на HH.ru</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors shadow-lg shadow-rose-900/30 min-h-[40px]"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Отклик скопирован!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Скопировать отклик</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
