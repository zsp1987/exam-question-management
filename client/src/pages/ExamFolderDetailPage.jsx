import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Plus, Download, Trash2, CheckCircle2, 
  FolderCheck, FileText, Sparkles, X, Star, Layers
} from 'lucide-react';
import { api } from '../api/client';
import MathRenderer from '../components/MathRenderer';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';

export default function ExamFolderDetailPage({ examId, onBack, onViewQuestion }) {
  const { isTeacher } = useAuth();
  const { t, lang } = useI18n();
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [availableQuestions, setAvailableQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add questions modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedQIds, setSelectedQIds] = useState([]);
  const [domainSection, setDomainSection] = useState('Domain 1: Core Architecture & Governance');
  const [adding, setAdding] = useState(false);

  const loadExamDetails = async () => {
    try {
      setLoading(true);
      const res = await api.getExam(examId);
      setExam(res.exam);
      setQuestions(res.questions || []);
      setAvailableQuestions(res.availableQuestions || []);
    } catch (err) {
      console.error('Failed to load exam details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExamDetails();
  }, [examId]);

  const handleAddQuestions = async () => {
    if (selectedQIds.length === 0) return;
    try {
      setAdding(true);
      await api.addQuestionsToExam(examId, selectedQIds, domainSection, 1.0);
      setShowAddModal(false);
      setSelectedQIds([]);
      loadExamDetails();
    } catch (err) {
      alert(t('error') + ': ' + err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveQuestion = async (qId) => {
    if (!window.confirm(lang === 'en' ? 'Remove this question from exam folder?' : '确定将此考题移出该认证考试？')) return;
    try {
      await api.removeQuestionFromExam(examId, qId);
      loadExamDetails();
    } catch (err) {
      alert(t('error') + ': ' + err.message);
    }
  };

  const handleExportMarkdown = async () => {
    try {
      const text = await api.exportExam(examId, 'markdown');
      const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exam.code}-Official-Exam-Paper.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(t('error') + ': ' + err.message);
    }
  };

  if (loading || !exam) {
    return <div className="py-20 text-center text-slate-500 text-xs">{t('loading')}</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs hover:bg-slate-50 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{lang === 'en' ? 'Back to Exam Folders' : '返回考试文件夹列表'}</span>
        </button>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportMarkdown}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-2xs transition"
          >
            <Download className="w-4 h-4 text-brand-600" />
            <span>{t('examExportMarkdown')}</span>
          </button>

          {isTeacher && (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-md shadow-brand-500/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>{t('btnAssignQuestions')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Exam Header Banner */}
      <div className="bg-gradient-to-r from-brand-600 to-indigo-700 rounded-xl p-6 sm:p-8 text-white shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="px-3 py-1 text-xs font-mono font-extrabold bg-white/20 backdrop-blur-md rounded-lg border border-white/20">
            {exam.code}
          </span>
          <span className="px-3 py-1 text-xs font-semibold bg-white/10 rounded-full">
            {exam.category}
          </span>
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            {exam.title}
          </h1>
          {exam.description && (
            <p className="text-xs sm:text-sm text-brand-100 mt-2 max-w-3xl leading-relaxed">
              {exam.description}
            </p>
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-white/15 text-center text-xs">
          <div className="bg-white/10 rounded-xl p-2.5">
            <span className="text-white/70 block text-[11px]">Curated Pool</span>
            <strong className="text-base font-bold">{questions.length} Items</strong>
          </div>
          <div className="bg-white/10 rounded-xl p-2.5">
            <span className="text-white/70 block text-[11px]">Passing Score</span>
            <strong className="text-base font-bold">{exam.passing_score} / 1000</strong>
          </div>
          <div className="bg-white/10 rounded-xl p-2.5">
            <span className="text-white/70 block text-[11px]">Time Limit</span>
            <strong className="text-base font-bold">{exam.time_limit_minutes} Mins</strong>
          </div>
          <div className="bg-white/10 rounded-xl p-2.5">
            <span className="text-white/70 block text-[11px]">Status</span>
            <strong className="text-base font-bold text-emerald-300">{exam.status}</strong>
          </div>
        </div>
      </div>

      {/* Assigned Questions List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FolderCheck className="w-4 h-4 text-brand-600" />
            <span>{t('examAssignedQuestions')} ({questions.length})</span>
          </h2>
        </div>

        {questions.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            {t('emptyExamFolder')}
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q, idx) => (
              <div
                key={q.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-xs transition space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-brand-600 text-white font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      {q.domain_section || 'Domain 1'}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-200 text-slate-700 rounded">
                      {q.type}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onViewQuestion(q)}
                      className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                    >
                      {t('btnDetails')}
                    </button>
                    {isTeacher && (
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(q.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        title="Remove from exam"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-xs sm:text-sm font-bold text-slate-900">
                  <MathRenderer content={q.title} />
                </div>

                <div className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200">
                  <MathRenderer content={q.stem_rich_text} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Approved Questions Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-brand-600" />
                {t('btnAssignQuestions')}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 flex-1 overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Exam Domain / Section</label>
                <input
                  type="text"
                  value={domainSection}
                  onChange={(e) => setDomainSection(e.target.value)}
                  placeholder="e.g. Domain 1: Design Resilient Architectures"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <span className="text-xs font-bold text-slate-700 block mb-2">
                  Select Approved Items ({availableQuestions.length} available)
                </span>

                {availableQuestions.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4">No additional approved questions available to add.</p>
                ) : (
                  <div className="space-y-2">
                    {availableQuestions.map((q) => {
                      const isChecked = selectedQIds.includes(q.id);
                      return (
                        <div
                          key={q.id}
                          onClick={() => {
                            setSelectedQIds(prev =>
                              prev.includes(q.id) ? prev.filter(id => id !== q.id) : [...prev, q.id]
                            );
                          }}
                          className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-start gap-3 ${
                            isChecked
                              ? 'bg-brand-50 border-brand-300 ring-2 ring-brand-100'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="mt-0.5 rounded text-brand-600"
                          />
                          <div className="flex-1">
                            <p className="font-bold text-slate-900"><MathRenderer content={q.title} /></p>
                            <span className="text-[10px] text-slate-500 font-mono">[{q.subject} · {q.type}]</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-100 mt-4 text-xs">
              <span className="text-slate-500">Selected {selectedQIds.length} questions</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  disabled={adding || selectedQIds.length === 0}
                  onClick={handleAddQuestions}
                  className="px-4 py-1.5 font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-xs disabled:opacity-40"
                >
                  {adding ? 'Adding...' : t('confirm')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
