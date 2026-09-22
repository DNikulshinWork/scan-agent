import React, { useState } from 'react';
import { ShieldCheck, Key, Lock, ArrowRight, AlertCircle, CheckCircle2, UserCheck, Github, Mail } from 'lucide-react';
import { AuthUser, loginWithApiKey, loginWithGithubToken, quickOwnerLogin, isAuthorizedEmail } from '../services/authService';
import { BrandLogo } from './Navbar';

interface AuthLockScreenProps {
  onAuthenticated: (user: AuthUser) => void;
}

export const AuthLockScreen: React.FC<AuthLockScreenProps> = ({ onAuthenticated }) => {
  const [activeTab, setActiveTab] = useState<'quick' | 'github' | 'google' | 'apikey'>('quick');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [githubTokenInput, setGithubTokenInput] = useState('');
  const [googleEmailInput, setGoogleEmailInput] = useState('d.nikulshin.dev@gmail.com');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleQuickLogin = (provider: 'github' | 'google') => {
    setErrorMsg(null);
    const user = quickOwnerLogin(provider);
    onAuthenticated(user);
  };

  const handleApiKeyLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const res = loginWithApiKey(apiKeyInput);
    if (res.ok && res.user) {
      onAuthenticated(res.user);
    } else {
      setErrorMsg(res.error || 'Неверный API Secret Key');
    }
  };

  const handleGithubTokenLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    const res = await loginWithGithubToken(githubTokenInput);
    setLoading(false);
    if (res.ok && res.user) {
      onAuthenticated(res.user);
    } else {
      setErrorMsg(res.error || 'Ошибка авторизации через GitHub');
    }
  };

  const handleGoogleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!isAuthorizedEmail(googleEmailInput)) {
      setErrorMsg(`Доступ запрещен: email "${googleEmailInput}" не в белом списке администраторов`);
      return;
    }
    const user = quickOwnerLogin('google');
    user.email = googleEmailInput.trim();
    onAuthenticated(user);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-cyan-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-gray-900/90 border border-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-md relative z-10">
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-3 mb-6">
          <BrandLogo />
          <div>
            <h1 className="text-xl font-bold text-gray-100 flex items-center justify-center gap-2">
              <span>ScanAgent Dashboard</span>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full">
                Protected
              </span>
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Доступ ограничен для владельца: <strong>Dmitry Nikulshin</strong>
            </p>
          </div>
        </div>

        {/* Auth method tabs */}
        <div className="flex bg-gray-950 p-1 rounded-xl border border-gray-800/80 mb-5">
          <button
            type="button"
            onClick={() => { setActiveTab('quick'); setErrorMsg(null); }}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition ${
              activeTab === 'quick' ? 'bg-rose-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Быстрый вход
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('github'); setErrorMsg(null); }}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition ${
              activeTab === 'github' ? 'bg-rose-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            GitHub
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('google'); setErrorMsg(null); }}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition ${
              activeTab === 'google' ? 'bg-rose-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Google
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('apikey'); setErrorMsg(null); }}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition ${
              activeTab === 'apikey' ? 'bg-rose-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            API Ключ
          </button>
        </div>

        {/* Tab content 1: Quick Owner Login */}
        {activeTab === 'quick' && (
          <div className="space-y-3">
            <p className="text-xs text-gray-300 leading-relaxed text-center mb-2">
              Подтвердите личность владельца аккаунта в 1 клик:
            </p>

            <button
              type="button"
              onClick={() => handleQuickLogin('github')}
              className="w-full py-2.5 px-4 bg-gray-800 hover:bg-gray-700 text-gray-100 rounded-xl text-xs font-semibold border border-gray-700 transition flex items-center justify-center gap-2 shadow-sm"
            >
              <Github className="w-4 h-4 text-white" />
              <span>Войти как DNikulshinWork (GitHub)</span>
              <ArrowRight className="w-3.5 h-3.5 ml-auto text-gray-400" />
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('google')}
              className="w-full py-2.5 px-4 bg-gray-800 hover:bg-gray-700 text-gray-100 rounded-xl text-xs font-semibold border border-gray-700 transition flex items-center justify-center gap-2 shadow-sm"
            >
              <Mail className="w-4 h-4 text-rose-400" />
              <span>Войти как d.nikulshin.dev@gmail.com</span>
              <ArrowRight className="w-3.5 h-3.5 ml-auto text-gray-400" />
            </button>
          </div>
        )}

        {/* Tab content 2: GitHub PAT / OAuth */}
        {activeTab === 'github' && (
          <form onSubmit={handleGithubTokenLogin} className="space-y-3">
            <p className="text-xs text-gray-400 leading-relaxed">
              Авторизация через GitHub API. Введите ваш Personal Access Token для мгновенной валидации прав профиля:
            </p>
            <div>
              <input
                type="password"
                value={githubTokenInput}
                onChange={(e) => setGithubTokenInput(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-rose-500 font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !githubTokenInput.trim()}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-lg shadow-rose-950/50"
            >
              <Github className="w-4 h-4" />
              <span>{loading ? 'Проверка прав GitHub...' : 'Войти через GitHub'}</span>
            </button>
          </form>
        )}

        {/* Tab content 3: Google */}
        {activeTab === 'google' && (
          <form onSubmit={handleGoogleLogin} className="space-y-3">
            <p className="text-xs text-gray-400 leading-relaxed">
              Подтверждение авторизованного Google Email адреса:
            </p>
            <div>
              <input
                type="email"
                value={googleEmailInput}
                onChange={(e) => setGoogleEmailInput(e.target.value)}
                placeholder="d.nikulshin.dev@gmail.com"
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-rose-500 font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={!googleEmailInput.trim()}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-lg shadow-rose-950/50"
            >
              <Mail className="w-4 h-4" />
              <span>Подтвердить Google Email</span>
            </button>
          </form>
        )}

        {/* Tab content 4: API Secret Key */}
        {activeTab === 'apikey' && (
          <form onSubmit={handleApiKeyLogin} className="space-y-3">
            <p className="text-xs text-gray-400 leading-relaxed">
              Вход по мастер API-ключу бэкенда (<code className="text-rose-400">API_SECRET_KEY</code>):
            </p>
            <div>
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="scan_live_... или ваш ключ"
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-rose-500 font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={!apiKeyInput.trim()}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-lg shadow-rose-950/50"
            >
              <Key className="w-4 h-4" />
              <span>Разблокировать по API-ключу</span>
            </button>
          </form>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="mt-4 p-2.5 bg-rose-950/40 border border-rose-900/60 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Whitelist notice */}
        <div className="mt-6 pt-4 border-t border-gray-800/80 flex items-center justify-between text-[11px] text-gray-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>RBAC Белый список</span>
          </div>
          <span className="font-mono text-gray-300">d.nikulshin.dev@gmail.com</span>
        </div>
      </div>
    </div>
  );
};
