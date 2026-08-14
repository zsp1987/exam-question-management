import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Edit3, GitCompare, RotateCcw, Clock, 
  User, CheckCircle2, XCircle, Star, MessageSquare, 
  History, Sparkles, BookOpen, FolderPlus
} from 'lucide-react';
import { api } from '../api/client';
import MathRenderer from '../components/MathRenderer';
import TagBadge from '../components/TagBadge';
import VersionDiffModal from '../components/VersionDiffModal';
import ReviewModal from '../components/ReviewModal';
import AssignExamModal from '../components/AssignExamModal';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';

export default function QuestionDetailPage({ questionId, onBack, onEdit }) {
  const { user, isReviewer, isTeacher, isAdmin } = useAuth();
  const { t, lang } = useI18n();
  const [question, setQuestion] = useState(null);
  const [versions, setVersions] = useState([]);
  const [reviewHistory, setReviewHistory] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [diffModalOpen, setDiffModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  const loadQuestionData = async () => {
    try {
      setLoading(true);
      const [detailRes, versionsRes] = await Promise.all([
        api.getQuestion(questionId),
        api.getVersions(questionId)
      ]);
      setQuestion(detailRes.question);
      setReviewHistory(detailRes.reviewHistory || []);
      setVersions(versionsRes.versions || []);
      setSelectedVersion(versionsRes.versions?.[0] || null);
    } catch (err) {
      setError('Failed to load item: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestionData();
  }, [questionId]);

  const handleRollback = async (targetVersion) => {
    if (!window.confirm(`${lang === 'en' ? 'Rollback to version' : '确定回退至版本'} v${targetVersion.version_number}?`)) return;
    try {
      await api.rollbackVersion(question.id, targetVersion.id);
      alert(t('success'));
      loadQuestionData();
    } catch (err) {
      alert(t('error') + ': ' + err.message);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-500 text-xs">{t('loading')}</div>;
  }

  if (error || !question) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <p className="text-rose-600 text-sm mb-4">{error || 'Item not found'}</p>
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold"
        >
          {lang === 'en' ? 'Back to Repository' : '返回题库'}
        </button>
      </div>
    );
  }

  const activeDisplayData = selectedVersion || question;
  const canEdit = isAdmin || (isTeacher && (question.author_id === user?.id || !question.author_id));

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
          <span>{lang === 'en' ? 'Back to Repository' : '返回题库列表'}</span>
        </button>

        <div className="flex items-center gap-2.5">
          {question.status === 'APPROVED' && (
            <button
              type="button"
              onClick={() => setAssignModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl shadow-2xs transition"
            >
              <FolderPlus className="w-4 h-4 text-emerald-600" />
              <span>{t('btnAddToExam')}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setDiffModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-2xs transition"
          >
            <GitCompare className="w-4 h-4 text-brand-600" />
            <span>{t('btnDiff')}</span>
          </button>

          {question.status === 'PENDING_REVIEW' && isReviewer && (
            <button
              type="button"
              onClick={() => setReviewModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md shadow-amber-600/20 transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{t('btnReview')}</span>
            </button>
          )}

          {canEdit && (
            <button
              type="button"
              onClick={() => onEdit(question)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-md shadow-brand-500/20 transition"
            >
              <Edit3 className="w-4 h-4" />
              <span>{lang === 'en' ? 'Edit & Version Snapshot' : '编辑并生成新版本'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Question Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200 rounded-lg">
                  {question.type}
                </span>
                <span className="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded-lg">
                  {question.subject}
                </span>
                <span className="px-2.5 py-1 text-xs font-mono font-bold bg-purple-50 text-purple-700 border border-purple-200 rounded-lg">
                  Snapshot: v{activeDisplayData.version_number}
                </span>
              </div>

              <div className="flex items-center gap-1 text-xs bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-400 mr-1">{t('difficultyLabel')}:</span>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-3.5 h-3.5 ${
                      s <= question.difficulty ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Item Title</span>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                <MathRenderer content={activeDisplayData.title} />
              </h1>
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Scenario & Stem</span>
              <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800">
                <MathRenderer content={activeDisplayData.stem_rich_text} />
              </div>
            </div>

            {activeDisplayData.options && activeDisplayData.options.length > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Options</span>
                <div className="space-y-2">
                  {activeDisplayData.options.map((opt, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start gap-3 p-3 rounded-xl text-xs sm:text-sm border transition ${
                        opt.is_correct
                          ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-semibold'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                        opt.is_correct ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {opt.key}
                      </span>
                      <div className="flex-1">
                        <MathRenderer content={opt.text} />
                      </div>
                      {opt.is_correct && (
                        <span className="text-xs text-emerald-600 font-bold shrink-0">✓ Key</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('standardAnswer')}</span>
              <div className="p-3.5 bg-emerald-50/40 rounded-xl border border-emerald-200 text-xs sm:text-sm text-emerald-950 font-medium">
                <MathRenderer content={activeDisplayData.standard_answer_rich_text || 'None'} />
              </div>
            </div>

            {activeDisplayData.explanation_rich_text && (
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('explanation')}</span>
                <div className="p-3.5 bg-amber-50/40 rounded-xl border border-amber-200 text-xs sm:text-sm text-slate-800">
                  <MathRenderer content={activeDisplayData.explanation_rich_text} />
                </div>
              </div>
            )}

            {question.tags && question.tags.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Certification Domains</span>
                <div className="flex flex-wrap gap-1.5">
                  {question.tags.map((tagItem) => (
                    <TagBadge key={tagItem.id} tag={tagItem} size="sm" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Version Timeline */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-4 h-4 text-brand-600" />
                Version Audit Trail ({versions.length})
              </h3>
              <button
                type="button"
                onClick={() => setDiffModalOpen(true)}
                className="text-[11px] font-bold text-brand-600 hover:text-brand-700"
              >
                {t('btnDiff')}
              </button>
            </div>

            <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {versions.map((v) => {
                const isSelected = selectedVersion?.id === v.id;
                const isCurrent = v.version_number === question.version_number;
                return (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVersion(v)}
                    className={`relative pl-7 cursor-pointer group transition`}
                  >
                    <div className={`absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full border-2 bg-white transition ${
                      isSelected
                        ? 'border-brand-600 ring-4 ring-brand-100 bg-brand-600'
                        : isCurrent
                        ? 'border-emerald-500 bg-emerald-500'
                        : 'border-slate-300 group-hover:border-brand-400'
                    }`} />

                    <div className={`p-3 rounded-xl border text-xs transition ${
                      isSelected
                        ? 'bg-brand-50/70 border-brand-300 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-900">
                          v{v.version_number}
                          {isCurrent && <span className="ml-1 text-[10px] text-emerald-600 font-bold">(Active)</span>}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(v.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <p className="text-slate-600 text-[11px] line-clamp-2">
                        {v.change_summary || 'No summary'}
                      </p>

                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-200/60 text-[10px] text-slate-400">
                        <span>SME: {v.author_name || 'Author'}</span>
                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRollback(v);
                            }}
                            className="text-amber-700 hover:text-amber-900 font-bold flex items-center gap-0.5"
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                            <span>Rollback</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Review Stream */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-amber-600" />
              Review Audit Records ({reviewHistory.length})
            </h3>

            {reviewHistory.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No review records</p>
            ) : (
              <div className="space-y-2.5 divide-y divide-slate-100">
                {reviewHistory.map((r) => (
                  <div key={r.id} className="pt-2 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        r.action === 'APPROVE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : r.action === 'REJECT'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {r.action}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100 text-[11px]">
                      {r.comment || 'No comment'}
                    </p>
                    <p className="text-[10px] text-slate-400">Reviewer: {r.reviewer_name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {diffModalOpen && (
        <VersionDiffModal
          question={question}
          onClose={() => setDiffModalOpen(false)}
          onRollbackSuccess={() => loadQuestionData()}
        />
      )}

      {reviewModalOpen && (
        <ReviewModal
          question={question}
          onClose={() => setReviewModalOpen(false)}
          onSuccess={() => loadQuestionData()}
        />
      )}

      {assignModalOpen && (
        <AssignExamModal
          question={question}
          onClose={() => setAssignModalOpen(false)}
          onSuccess={() => loadQuestionData()}
        />
      )}
    </div>
  );
}
