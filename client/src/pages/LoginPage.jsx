import React, { useState } from 'react';
import { 
  BookOpenCheck, Shield, Sparkles, CheckCircle2, 
  ArrowRight, Lock, User, AlertCircle, Globe
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';

export default function LoginPage() {
  const { login, switchUser, demoUsers } = useAuth();
  const { t, lang, toggleLang } = useI18n();
  const [username, setUsername] = useState('teacher');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      await login(username, password);
    } catch (err) {
      setError(err.message || (lang === 'en' ? 'Login failed, please verify credentials' : '登录失败，请检查用户名和密码'));
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (targetUser) => {
    try {
      setLoading(true);
      await switchUser(targetUser.id);
    } catch (err) {
      setError('Quick login failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100 relative">
      {/* Top right language switcher */}
      <div className="absolute top-5 right-5">
        <button
          type="button"
          onClick={toggleLang}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition backdrop-blur-md"
        >
          <Globe className="w-3.5 h-3.5 text-cyan-400" />
          <span>{lang === 'en' ? '🇺🇸 English' : '🇨🇳 中文'}</span>
        </button>
      </div>

      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 mx-auto flex items-center justify-center text-white shadow-xl shadow-brand-500/30">
            <BookOpenCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">EQMS Platform</h1>
          <p className="text-xs text-slate-400">
            {t('appSubtitle')}
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 p-6 shadow-2xl space-y-5">
          {error && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/40 text-rose-200 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">{lang === 'en' ? 'Username / Email' : '用户名 / 邮箱'}</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin / teacher / reviewer / viewer"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-900/60 border border-white/15 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">{lang === 'en' ? 'Password' : '登录密码'}</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="123456"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-900/60 border border-white/15 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-brand-600 to-indigo-500 hover:from-brand-500 hover:to-indigo-400 font-bold rounded-xl text-white shadow-lg shadow-brand-500/20 transition flex items-center justify-center gap-2"
            >
              <span>{loading ? t('loading') : t('login')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-4 border-t border-white/10 space-y-2.5">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
              {lang === 'en' ? 'Instant Role Simulator' : '一键快速角色身份登入'}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {demoUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleQuickLogin(u)}
                  className="p-2 bg-white/5 hover:bg-white/15 border border-white/10 rounded-xl text-left transition flex items-center justify-between text-[11px] text-slate-300"
                >
                  <div className="truncate">
                    <p className="font-bold text-white truncate">{u.name}</p>
                    <p className="text-[10px] text-brand-300 font-mono">[{u.role}]</p>
                  </div>
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0 ml-1" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
