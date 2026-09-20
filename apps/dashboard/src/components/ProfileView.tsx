import React, { useState } from 'react';
import {
  User,
  FileText,
  Check,
  Plus,
  Trash2,
  ShieldAlert,
  SlidersHorizontal,
  Save,
  Briefcase,
  ExternalLink,
  Code,
  Github,
  Mail,
  Phone,
  Send,
  Globe,
} from 'lucide-react';
import { DeveloperProfile, KeywordScoringRule } from '../types';

interface ProfileViewProps {
  profile: DeveloperProfile;
  onUpdateProfile: (profile: DeveloperProfile) => void;
  scoringRules: KeywordScoringRule;
  onUpdateRules: (rules: KeywordScoringRule) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  onUpdateProfile,
  scoringRules,
  onUpdateRules,
}) => {
  const [profileData, setProfileData] = useState<DeveloperProfile>(profile);
  const [rulesData, setRulesData] = useState<KeywordScoringRule>(scoringRules);
  const [newSkill, setNewSkill] = useState('');
  const [newStopWord, setNewStopWord] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    onUpdateProfile(profileData);
    onUpdateRules(rulesData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !profileData.stack.includes(newSkill.trim())) {
      setProfileData((prev) => ({
        ...prev,
        stack: [...prev.stack, newSkill.trim()],
      }));
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setProfileData((prev) => ({
      ...prev,
      stack: prev.stack.filter((s) => s !== skill),
    }));
  };

  const handleAddStopWord = () => {
    if (newStopWord.trim() && !rulesData.hardExclude.includes(newStopWord.trim().toLowerCase())) {
      setRulesData((prev) => ({
        ...prev,
        hardExclude: [...prev.hardExclude, newStopWord.trim().toLowerCase()],
      }));
      setNewStopWord('');
    }
  };

  const handleRemoveStopWord = (word: string) => {
    setRulesData((prev) => ({
      ...prev,
      hardExclude: prev.hardExclude.filter((w) => w !== word),
    }));
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
      {/* Header with Save Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <User className="w-5 h-5 text-rose-400" />
            <span>Обновленное резюме и Фильтры стека (без AI)</span>
          </h2>
          <p className="text-xs text-gray-400">
            Детерминированная фильтрация вакансий HH.ru по ключевым технологиям и стоп-словам без LLM токенов
          </p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-900/30 transition-colors self-start sm:self-auto"
        >
          {isSaved ? (
            <>
              <Check className="w-4 h-4 text-emerald-300" />
              <span>Сохранено!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Сохранить настройки</span>
            </>
          )}
        </button>
      </div>

      {/* Developer Overview & Contacts */}
      <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-rose-400" />
          <span>Личные данные и контакты из резюме</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1">ФИО разработчика</label>
            <input
              type="text"
              value={profileData.name}
              onChange={(e) => setProfileData((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Желаемая должность / Headline</label>
            <input
              type="text"
              value={profileData.headline}
              onChange={(e) => setProfileData((prev) => ({ ...prev, headline: e.target.value }))}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>

        {/* Quick Contact Badges */}
        <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-gray-300">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-950 border border-gray-800">
            <Phone className="w-3.5 h-3.5 text-rose-400" />
            <span>{profileData.phone}</span>
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-950 border border-gray-800">
            <Mail className="w-3.5 h-3.5 text-rose-400" />
            <span>{profileData.email}</span>
          </span>
          <a
            href="https://t.me/nikulshin_dev"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-950 border border-gray-800 text-blue-400 hover:text-blue-300"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{profileData.telegram}</span>
          </a>
          <a
            href={profileData.github}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-950 border border-gray-800 text-gray-200 hover:text-white"
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub</span>
          </a>
          <a
            href={profileData.portfolioUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-950 border border-gray-800 text-rose-300 hover:text-rose-200"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Портфолио</span>
          </a>
        </div>
      </div>

      {/* Projects from Dmitry's Resume */}
      <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Code className="w-4 h-4 text-emerald-400" />
            <span>Проекты из резюме (используются в шаблонах откликов)</span>
          </h3>
          <span className="text-xs text-gray-500 font-mono">
            {profileData.projects?.length || 0} проектов
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {profileData.projects?.map((proj, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-gray-950 border border-gray-800/80 space-y-2 flex flex-col justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-bold text-white leading-snug">{proj.title}</h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-900 text-rose-300 border border-rose-900/30">
                    {proj.category}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed line-clamp-3">
                  {proj.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-1 pt-2 border-t border-gray-900">
                {proj.stack.map((st) => (
                  <span
                    key={st}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-gray-900 text-gray-300 border border-gray-800"
                  >
                    {st}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stack Tags Filter Configuration */}
      <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-rose-400" />
          <span>Целевой стек для совпадения фильтров (Core & Related Skills)</span>
        </h3>
        <p className="text-xs text-gray-400">
          При нахождении этих технологий в названии или описании вакансии на HH.ru начисляются баллы (Core: +10 pts, Related: +5 pts).
        </p>

        <div className="flex flex-wrap gap-1.5">
          {profileData.stack.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-gray-950 text-gray-200 border border-gray-800 group"
            >
              <span>{skill}</span>
              <button
                type="button"
                onClick={() => handleRemoveSkill(skill)}
                className="text-gray-500 hover:text-rose-400"
              >
                ×
              </button>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2 pt-2 max-w-sm">
          <input
            type="text"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
            placeholder="Добавить технологию в фильтр..."
            className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
          />
          <button
            type="button"
            onClick={handleAddSkill}
            className="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs text-white font-medium flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Добавить</span>
          </button>
        </div>
      </div>

      {/* Stop Words / Hard Exclude Filter */}
      <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-white">Стоп-слова для HH.ru (Hard Exclude)</h3>
        </div>
        <p className="text-xs text-gray-400">
          Вакансии, содержащие эти слова в названии или описании, мгновенно отсекаются с баллом 0 (мусор).
        </p>

        <div className="flex flex-wrap gap-1.5">
          {rulesData.hardExclude.map((word) => (
            <span
              key={word}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-rose-950/20 text-rose-300 border border-rose-900/30"
            >
              <span>{word}</span>
              <button
                type="button"
                onClick={() => handleRemoveStopWord(word)}
                className="text-rose-500 hover:text-white"
              >
                ×
              </button>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2 pt-1 max-w-sm">
          <input
            type="text"
            value={newStopWord}
            onChange={(e) => setNewStopWord(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddStopWord()}
            placeholder="Новое стоп-слово..."
            className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
          />
          <button
            type="button"
            onClick={handleAddStopWord}
            className="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs text-white font-medium flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Добавить</span>
          </button>
        </div>
      </div>

      {/* Full Resume Raw Text */}
      <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-bold text-white">Полный текст резюме с HeadHunter</h3>
          </div>
          <span className="text-[11px] text-gray-500">
            {profileData.hhResumeRawText.length} символов
          </span>
        </div>
        <p className="text-xs text-gray-400">
          Текстовая копия обновленного резюме Дмитрия Никульшина. Всегда под рукой для копирования и обновления.
        </p>

        <textarea
          rows={12}
          value={profileData.hhResumeRawText}
          onChange={(e) => setProfileData((prev) => ({ ...prev, hhResumeRawText: e.target.value }))}
          className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-rose-500 font-mono leading-relaxed"
          placeholder="Текст резюме HeadHunter..."
        />
      </div>
    </div>
  );
};
