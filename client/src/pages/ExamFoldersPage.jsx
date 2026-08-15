import React, { useState, useEffect } from 'react';
import { 
  FolderCheck, Plus, Download, FileCode, CheckCircle2, 
  Clock, ShieldCheck, Sparkles, BookOpen, Trash2, Edit3, X, ArrowRight, Layers
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';

export default function ExamFoldersPage({ onSelectExam }) {
  const { isTeacher, isAdmin } = useAuth();
  const { t, lang } = useI18n();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Exam Folder Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('Cloud Architecture');
  const [passingScore, setPassingScore] = useState(750);
  const [timeLimit, setTimeLimit] = useState(180);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const res = await api.getExams();
      setExams(res.exams || []);
    } catch (err) {
      console.error('Failed to load exams:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const handleCreateExam = async (e) => {
    e.preventDefault();
    if (!title.trim() || !code.trim()) return;

    try {
      setSubmitting(true);
      await api.createExam({
        title: title.trim(),
        code: code.trim().toUpperCase(),
        category,
        passing_score: passingScore,
        time_limit_minutes: timeLimit,
        description
      });
      setShowAddModal(false);
      setTitle('');
      setCode('');
      setDescription('');
      fetchExams();
    } catch (err) {
      alert(t('error') + ': ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExam = async (exam) => {
    if (!window.confirm(`${lang === 'en' ? 'Delete certification exam folder' : '确定删除认证考试文件夹'}【${exam.title}】?`)) return;
    try {
      await api.deleteExam(exam.id);
      fetchExams();
    } catch (err) {
      alert(t('error') + ': ' + err.message);
    }
  };

  const handleExportMarkdown = async (exam) => {
    try {
      const text = await api.exportExam(exam.id, 'markdown');
      const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exam.code}-Exam-Package-${new Date().toISOString().slice(0, 10)}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(t('error') + ': ' + err.message);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <FolderCheck className="w-5 h-5 text-brand-600" />
            {t('examFoldersTitle')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('examFoldersSubtitle')}
          </p>
        </div>

        {isTeacher && (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 rounded-xl shadow-md shadow-brand-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>{t('btnCreateExam')}</span>
          </button>
        )}
      </div>

      {/* Exam Folders Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-500 text-xs">{t('loading')}</div>
      ) : exams.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200 text-slate-400 text-xs">
          {t('noData')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition p-6 flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                {/* Top Meta */}
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 text-xs font-mono font-extrabold bg-brand-50 text-brand-700 border border-brand-200 rounded-lg">
                    {exam.code}
                  </span>
                  <span className="px-2.5 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700 rounded-full">
                    {exam.category}
                  </span>
                </div>

                {/* Title */}
                <div>
                  <h3 
                    onClick={() => onSelectExam(exam)}
                    className="text-base font-bold text-slate-900 group-hover:text-brand-600 transition cursor-pointer leading-snug"
                  >
                    {exam.title}
                  </h3>
                  {exam.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {exam.description}
                    </p>
                  )}
                </div>

                {/* Score & Time & Question Count KPIs */}
                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Passing Score</span>
                    <strong className="text-slate-900 font-mono text-sm">{exam.passing_score} / 1000</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Time Limit</span>
                    <strong className="text-slate-900 font-mono text-sm">{exam.time_limit_minutes}m</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Curated Items</span>
                    <strong className="text-emerald-600 font-mono text-sm">{exam.total_questions || 0} items</strong>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    title={t('examExportMarkdown')}
                    onClick={() => handleExportMarkdown(exam)}
                    className="p-1.5 text-slate-600 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      title="Delete Exam Folder"
                      onClick={() => handleDeleteExam(exam)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onSelectExam(exam)}
                  className="flex items-center gap-1 px-3.5 py-1.5 font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition shadow-xs"
                >
                  <span>{lang === 'en' ? 'Manage Exam Pool' : '管理考题归档'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Exam Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FolderCheck className="w-4 h-4 text-brand-600" />
                {t('btnCreateExam')}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateExam} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Certification Exam Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. AWS Certified Solutions Architect - Professional"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Exam Code *</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. SAP-C02"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category Domain *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  >
                    <option value="Cloud Architecture">Cloud Architecture</option>
                    <option value="Cybersecurity">Cybersecurity</option>
                    <option value="Project Management">Project Management</option>
                    <option value="DevOps & Containers">DevOps & Containers</option>
                    <option value="Data & AI">Data & AI</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Passing Score (Points) *</label>
                  <input
                    type="number"
                    min="100"
                    max="1000"
                    value={passingScore}
                    onChange={(e) => setPassingScore(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Duration (Minutes) *</label>
                  <input
                    type="number"
                    min="30"
                    max="480"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description & Scope</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Outline certification requirements and target candidates..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-xs"
                >
                  {submitting ? 'Creating...' : t('confirm')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
