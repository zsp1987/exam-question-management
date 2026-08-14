import React, { useState } from 'react';
import { 
  BookOpenCheck, UserCheck, Shield, ChevronDown, 
  Sparkles, LogOut, CheckCircle2, User, Globe
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';

export default function Navbar({ onNavigate, currentTab }) {
  const { user, demoUsers, switchUser, logout } = useAuth();
  const { lang, toggleLang, t } = useI18n();
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return <span className="px-2 py-0.5 text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200 rounded-md flex items-center gap-1"><Shield className="w-3 h-3"/> ADMIN</span>;
      case 'REVIEWER':
        return <span className="px-2 py-0.5 text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200 rounded-md flex items-center gap-1"><UserCheck className="w-3 h-3"/> REVIEWER</span>;
      case 'TEACHER':
        return <span className="px-2 py-0.5 text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200 rounded-md flex items-center gap-1"><Sparkles className="w-3 h-3"/> CREATOR</span>;
      case 'VIEWER':
        return <span className="px-2 py-0.5 text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 rounded-md flex items-center gap-1"><User className="w-3 h-3"/> VIEWER</span>;
      default:
        return null;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div 
            className="flex items-center gap-3 cursor-pointer select-none group"
            onClick={() => onNavigate('questions')}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition">
              <BookOpenCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-slate-900 tracking-tight">{t('appTitle')}</span>
                <span className="text-xs px-2 py-0.5 bg-brand-50 text-brand-700 font-semibold rounded-full border border-brand-200">
                  {lang === 'en' ? 'Cert Exam Platform' : '认证考试题库'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 -mt-0.5 hidden sm:block">
                {t('appSubtitle')}
              </p>
            </div>
          </div>

          {/* Right Actions: Language Switcher + Fast Role Switcher & User Profile */}
          <div className="flex items-center gap-3">
            {/* Language Switcher Toggle */}
            <button
              type="button"
              onClick={toggleLang}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs"
              title="Toggle Language / 切换中英文语言"
            >
              <Globe className="w-3.5 h-3.5 text-brand-600" />
              <span>{lang === 'en' ? '🇺🇸 English' : '🇨🇳 中文'}</span>
            </button>

            {/* Quick Role Switcher Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 text-slate-800 text-xs font-medium transition shadow-2xs"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-slate-500 hidden md:inline">{t('roleSwitcher')}</span>
                <span className="font-bold text-slate-900 max-w-[120px] truncate">{user?.name || 'User'}</span>
                {getRoleBadge(user?.role)}
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {showRoleDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900">{lang === 'en' ? 'Instant Role Simulator' : '一键切换测试角色'}</p>
                    <p className="text-[11px] text-slate-500">{lang === 'en' ? 'Switch profile to test role-based workflows' : '点击即刻以不同权限身份体验完整业务流程'}</p>
                  </div>

                  <div className="py-1">
                    {demoUsers.map((u) => {
                      const isActive = user?.id === u.id;
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={async () => {
                            await switchUser(u.id);
                            setShowRoleDropdown(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition ${
                            isActive ? 'bg-brand-50/80 text-brand-700 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {getRoleBadge(u.role)}
                            <div className="truncate">
                              <p className="font-medium text-slate-900 truncate">{u.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono">@{u.username}</p>
                            </div>
                          </div>
                          {isActive && <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Logout button */}
            <button
              type="button"
              title={t('logout')}
              onClick={logout}
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
