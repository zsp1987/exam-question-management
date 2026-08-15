import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Download, Printer, FileText, PieChart, 
  Layers, CheckCircle2, Clock, XCircle, Sparkles, BookOpen, Filter, FileCode
} from 'lucide-react';
import { api } from '../api/client';
import MathRenderer from '../components/MathRenderer';
import { useI18n } from '../context/I18nContext';

export default function ReportsPage() {
  const { t, lang } = useI18n();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const [exportSubject, setExportSubject] = useState('');
  const [exportStatus, setExportStatus] = useState('APPROVED');
  const [paperQuestions, setPaperQuestions] = useState([]);
  const [paperLoading, setPaperLoading] = useState(false);
  const [allSubjects, setAllSubjects] = useState([]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [statsRes, subjectsRes] = await Promise.all([
          api.getOverviewStats(),
          api.getSubjects()
        ]);
        setStats(statsRes);
        setAllSubjects(subjectsRes.subjects || []);
      } catch (err) {
        console.error('Failed to load stats:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleLoadPaper = async () => {
    try {
      setPaperLoading(true);
      const res = await api.exportQuestions('json', {
        subject: exportSubject,
        status: exportStatus
      });
      setPaperQuestions(res.questions || []);
    } catch (err) {
      alert(t('error') + ': ' + err.message);
    } finally {
      setPaperLoading(false);
    }
  };

  useEffect(() => {
    handleLoadPaper();
  }, [exportSubject, exportStatus]);

  const handleDownloadMarkdown = async () => {
    try {
      const text = await api.exportQuestions('markdown', {
        subject: exportSubject,
        status: exportStatus
      });
      const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Certification-Exam-${exportSubject || 'All-Domains'}-${new Date().toISOString().slice(0, 10)}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(t('error') + ': ' + err.message);
    }
  };

  const handleDownloadJson = () => {
    const jsonStr = JSON.stringify(paperQuestions, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Certification-Questions-${exportSubject || 'All'}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading || !stats) {
    return <div className="py-20 text-center text-slate-500 text-xs">{t('loading')}</div>;
  }

  const { summary, byType, byStatus, byDifficulty, bySubject } = stats;

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-brand-600" />
            {t('reportsTitle')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('reportsSubtitle')}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 block mb-1">{t('totalPoolSize')}</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">{summary.totalQuestions}</span>
            <span className="text-xs text-slate-400">items</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-amber-600 block mb-1">{t('statusPendingReview')}</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-600">{summary.pendingReviews}</span>
            <span className="text-xs text-amber-500">items</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-emerald-600 block mb-1">{t('statusApproved')}</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600">{summary.approvedQuestions}</span>
            <span className="text-xs text-emerald-500">items</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-brand-600 block mb-1">{t('passingRate')}</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-brand-600">{summary.approvalRate}%</span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 1. By Question Type */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <PieChart className="w-4 h-4 text-brand-600" />
            {t('typeComposition')}
          </h3>
          <div className="space-y-3">
            {byType.map((item) => {
              const percent = summary.totalQuestions > 0 ? Math.round((item.count / summary.totalQuestions) * 100) : 0;
              return (
                <div key={item.type} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium text-slate-700">
                    <span>{item.type}</span>
                    <span className="font-mono text-slate-500">{item.count} items ({percent}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${percent}%` }}
                      className={`h-full rounded-full ${
                        item.type === 'SINGLE_CHOICE' ? 'bg-blue-500' : item.type === 'MULTIPLE_CHOICE' ? 'bg-purple-500' : 'bg-emerald-500'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. By Difficulty */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-amber-500" />
            {t('difficultyDistribution')}
          </h3>
          <div className="space-y-2.5">
            {byDifficulty.map((d) => {
              const percent = summary.totalQuestions > 0 ? Math.round((d.count / summary.totalQuestions) * 100) : 0;
              return (
                <div key={d.difficulty} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium text-slate-700">
                    <span>{'★'.repeat(d.difficulty)}{'☆'.repeat(5 - d.difficulty)} ({d.difficulty} Star)</span>
                    <span className="font-mono text-slate-500">{d.count} items</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${percent}%` }}
                      className="h-full bg-amber-400 rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. By Subject */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-purple-600" />
            {t('subjectCoverage')}
          </h3>
          <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
            {bySubject.map((s) => {
              const percent = summary.totalQuestions > 0 ? Math.round((s.count / summary.totalQuestions) * 100) : 0;
              return (
                <div key={s.subject} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium text-slate-700">
                    <span className="truncate max-w-[150px]">{s.subject}</span>
                    <span className="font-mono text-slate-500">{s.count} items</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${percent}%` }}
                      className="h-full bg-purple-500 rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Assembly & Export Engine */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-600" />
              {t('paperGenerator')}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Assemble official certification exam papers and download standardized packages
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownloadMarkdown}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl shadow-xs transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('downloadMdPaper')}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadJson}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-xl transition"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>{t('downloadJsonData')}</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t('printPaper')}</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600">Certification Domain:</span>
            <select
              value={exportSubject}
              onChange={(e) => setExportSubject(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Domains</option>
              {allSubjects.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600">Review Status:</span>
            <select
              value={exportStatus}
              onChange={(e) => setExportStatus(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="APPROVED">Approved Items Only (Recommended)</option>
              <option value="ALL">All Statuses</option>
            </select>
          </div>

          <div className="text-slate-400 ml-auto">
            Assembled <strong className="text-slate-800">{paperQuestions.length}</strong> items
          </div>
        </div>

        {/* Paper Preview Canvas */}
        <div className="border border-slate-200 rounded-xl p-6 sm:p-8 bg-slate-50/40 space-y-6">
          <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {exportSubject || 'Comprehensive'} Professional Certification Examination
            </h2>
            <p className="text-xs text-slate-500">
              Exam Standard: ISO/IEC 17024 Accredited · Generated by EQMS Platform
            </p>
          </div>

          {paperLoading ? (
            <div className="py-12 text-center text-slate-400 text-xs">{t('loading')}</div>
          ) : paperQuestions.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs italic">
              {t('noData')}
            </div>
          ) : (
            <div className="space-y-6">
              {paperQuestions.map((q, idx) => (
                <div key={q.id} className="space-y-2 border-b border-slate-200/80 pb-4 text-xs sm:text-sm">
                  <div className="flex items-baseline gap-2 font-bold text-slate-900">
                    <span className="text-sm text-brand-700">Item {idx + 1}.</span>
                    <div className="flex-1">
                      <MathRenderer content={q.title} />
                    </div>
                  </div>

                  <div className="pl-6 text-slate-700">
                    <MathRenderer content={q.stem_rich_text} />
                  </div>

                  {q.options && q.options.length > 0 && (
                    <div className="pl-6 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-start gap-2 text-slate-800">
                          <span className="font-bold">{opt.key}.</span>
                          <div><MathRenderer content={opt.text} /></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
