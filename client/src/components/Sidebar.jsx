import React, { useEffect, useState } from 'react';
import { 
  FolderCheck, Layers, PlusCircle, CheckSquare, BarChart3, 
  Users, Tags, History, ShieldAlert, Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { api } from '../api/client';

export default function Sidebar({ currentTab, onNavigate }) {
  const { user, isAdmin, isReviewer, isTeacher } = useAuth();
  const { t } = useI18n();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    async function fetchPendingCount() {
      if (isReviewer) {
        try {
          const res = await api.getPendingReviews();
          setPendingCount(res.count || 0);
        } catch (e) {}
      }
    }
    fetchPendingCount();
    const timer = setInterval(fetchPendingCount, 15000);
    return () => clearInterval(timer);
  }, [isReviewer, currentTab]);

  const navItems = [
    {
      id: 'exam-folders',
      label: t('navExamFolders'),
      icon: FolderCheck,
      show: true,
      desc: t('navExamFoldersDesc')
    },
    {
      id: 'questions',
      label: t('navQuestions'),
      icon: Layers,
      show: true,
      desc: t('navQuestionsDesc')
    },
    {
      id: 'create-question',
      label: t('navCreateQuestion'),
      icon: PlusCircle,
      show: isTeacher,
      highlight: true,
      desc: t('navCreateQuestionDesc')
    },
    {
      id: 'reviews',
      label: t('navReviews'),
      icon: CheckSquare,
      show: isReviewer,
      badge: pendingCount,
      desc: t('navReviewsDesc')
    },
    {
      id: 'reports',
      label: t('navReports'),
      icon: BarChart3,
      show: true,
      desc: t('navReportsDesc')
    },
  ];

  const adminItems = [
    {
      id: 'admin-console',
      label: t('adminConsole'),
      icon: ShieldAlert,
      show: isAdmin,
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 p-4 flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="space-y-6">
        {/* Main Navigation */}
        <div>
          <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            {t('coreWorkflow')}
          </p>
          <div className="space-y-1">
            {navItems.filter(i => i.show).map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition group ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/20'
                      : item.highlight
                      ? 'text-brand-700 bg-brand-50/60 hover:bg-brand-100/70 border border-brand-200/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className={`w-4 h-4 shrink-0 transition ${isActive ? 'text-white' : item.highlight ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full shrink-0 ${
                      isActive ? 'bg-white text-brand-700' : 'bg-amber-500 text-white animate-bounce'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Admin Section */}
        {isAdmin && (
          <div>
            <div className="space-y-1">
              {adminItems.filter(i => i.show).map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onNavigate(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition ${
                      isActive
                        ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/20'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-purple-50 hover:text-purple-700'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer Info Box */}
      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
        <div className="flex items-center gap-1.5 font-bold text-slate-700 mb-1">
          <Sparkles className="w-3.5 h-3.5 text-brand-600" />
          <span>Professional Standard</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Full versioning & audit logs compliant with ISO/IEC 17024 exam certification guidelines.
        </p>
      </div>
    </aside>
  );
}
