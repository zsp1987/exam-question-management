import React, { useState } from 'react';
import { 
  Star, Clock, User, GitCompare, Edit3, Trash2, 
  Send, CheckCircle2, XCircle, ChevronDown, ChevronUp, 
  Eye, CheckSquare, Sparkles, BookOpen, FolderPlus
} from 'lucide-react';
import MathRenderer from './MathRenderer';
import TagBadge from './TagBadge';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';

export default function QuestionCard({
  question,
  onViewDetails,
  onEdit,
  onOpenDiff,
  onOpenReview,
  onSubmitReview,
  onDelete,
  onAssignExam
}) {
  const { user, isReviewer, isTeacher, isAdmin } = useAuth();
  const { t } = useI18n();
  const [showAnswer, setShowAnswer] = useState(false);

  const getTypeBadge = (type) => {
    switch (type) {
      case 'SINGLE_CHOICE':
        return <span className="px-2 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-md">{t('typeSingleChoice')}</span>;
      case 'MULTIPLE_CHOICE':
        return <span className="px-2 py-0.5 text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 rounded-md">{t('typeMultipleChoice')}</span>;
      case 'ESSAY':
        return <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">{t('typeEssay')}</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700 rounded-md">{type}</span>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return <span className="px-2 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> {t('statusApproved')}</span>;
      case 'PENDING_REVIEW':
        return <span className="px-2 py-0.5 text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 rounded-full flex items-center gap-1"><Clock className="w-3 h-3"/> {t('statusPendingReview')}</span>;
      case 'REJECTED':
        return <span className="px-2 py-0.5 text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 rounded-full flex items-center gap-1"><XCircle className="w-3 h-3"/> {t('statusRejected')}</span>;
      case 'DRAFT':
      default:
        return <span className="px-2 py-0.5 text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 rounded-full flex items-center gap-1">{t('statusDraft')}</span>;
    }
  };

  const canEditQuestion = isAdmin || (isTeacher && (question.author_id === user?.id || !question.author_id));
  const canDeleteQuestion = isAdmin || (isTeacher && question.author_id === user?.id && question.status === 'DRAFT');

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition duration-200 overflow-hidden group">
      {/* Card Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2.5 bg-slate-50/50">
        <div className="flex flex-wrap items-center gap-2">
          {getTypeBadge(question.type)}
          {getStatusBadge(question.status)}
          <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-md">
            {question.subject || 'General Certification'}
          </span>
          <span className="px-2 py-0.5 text-xs font-mono font-bold bg-brand-50 text-brand-700 border border-brand-200 rounded-md">
            v{question.version_number || 1}
          </span>
        </div>

        {/* Difficulty Stars */}
        <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-200 text-xs">
          <span className="text-[11px] font-semibold text-slate-400 mr-0.5">{t('difficultyLabel')}:</span>
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

      {/* Card Body */}
      <div className="p-4 sm:p-5 space-y-4">
        {/* Title */}
        <div className="font-bold text-sm sm:text-base text-slate-900 leading-snug">
          <MathRenderer content={question.title} />
        </div>

        {/* Question Stem */}
        <div className="text-xs sm:text-sm text-slate-700 bg-slate-50/60 p-3.5 rounded-xl border border-slate-100/80">
          <MathRenderer content={question.stem_rich_text} />
        </div>

        {/* Choice Options */}
        {question.options && question.options.length > 0 && (
          <div className="space-y-1.5 pt-1">
            {question.options.map((opt, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-2.5 p-2.5 rounded-xl text-xs border transition ${
                  showAnswer && opt.is_correct
                    ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-semibold'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                  showAnswer && opt.is_correct ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {opt.key}
                </span>
                <div className="flex-1">
                  <MathRenderer content={opt.text} />
                </div>
                {showAnswer && opt.is_correct && (
                  <span className="text-[10px] text-emerald-600 font-bold shrink-0">✓ Key</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Tags */}
        {question.tags && question.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {question.tags.map((t) => (
              <TagBadge key={t.id || t.name} tag={t} size="xs" />
            ))}
          </div>
        )}

        {/* Expandable Standard Answer & Explanation */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowAnswer(!showAnswer)}
            className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 transition"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{showAnswer ? t('collapseAnswer') : t('expandAnswer')}</span>
            {showAnswer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {showAnswer && (
            <div className="mt-2.5 p-3.5 rounded-xl bg-amber-50/40 border border-amber-200/60 text-xs text-slate-800 space-y-2 animate-in fade-in duration-150">
              <div>
                <span className="font-bold text-amber-900 block mb-0.5">【{t('standardAnswer')}】</span>
                <div className="bg-white p-2 rounded border border-amber-100">
                  <MathRenderer content={question.standard_answer_rich_text || 'None'} />
                </div>
              </div>

              {question.explanation_rich_text && (
                <div>
                  <span className="font-bold text-amber-900 block mb-0.5">【{t('explanation')}】</span>
                  <div className="bg-white p-2 rounded border border-amber-100">
                    <MathRenderer content={question.explanation_rich_text} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Card Footer: Metadata and Actions */}
      <div className="px-4 sm:px-5 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <User className="w-3 h-3 text-slate-400" />
            {question.author_name || question.author_username || 'Author'}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            {new Date(question.updated_at || question.created_at).toLocaleDateString()}
          </span>
          {question.total_versions > 1 && (
            <span className="text-[10px] px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded font-mono">
              {t('totalVersions', { count: question.total_versions })}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          {/* Add to Exam Folder if approved */}
          {question.status === 'APPROVED' && onAssignExam && (
            <button
              type="button"
              title={t('btnAddToExam')}
              onClick={() => onAssignExam(question)}
              className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg border border-emerald-200 transition"
            >
              <FolderPlus className="w-4 h-4 text-emerald-600" />
            </button>
          )}

          {/* Version Diff */}
          <button
            type="button"
            title={t('btnDiff')}
            onClick={() => onOpenDiff(question)}
            className="p-1.5 text-slate-600 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition"
          >
            <GitCompare className="w-4 h-4" />
          </button>

          {/* Submit for Review */}
          {(question.status === 'DRAFT' || question.status === 'REJECTED') && isTeacher && (
            <button
              type="button"
              onClick={() => onSubmitReview(question)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition"
            >
              <Send className="w-3 h-3" />
              <span>{t('btnSubmitReview')}</span>
            </button>
          )}

          {/* Review button */}
          {question.status === 'PENDING_REVIEW' && isReviewer && (
            <button
              type="button"
              onClick={() => onOpenReview(question)}
              className="flex items-center gap-1 px-3 py-1 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs transition"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{t('btnReview')}</span>
            </button>
          )}

          {/* Edit */}
          {canEditQuestion && (
            <button
              type="button"
              title={t('btnEdit')}
              onClick={() => onEdit(question)}
              className="p-1.5 text-slate-600 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}

          {/* Details */}
          <button
            type="button"
            title={t('btnDetails')}
            onClick={() => onViewDetails(question)}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition"
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* Delete */}
          {canDeleteQuestion && (
            <button
              type="button"
              title={t('btnDelete')}
              onClick={() => onDelete(question)}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
