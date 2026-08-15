import React from 'react';
import { 
  Star, Clock, User, GitCompare, Edit3, Trash2, 
  Send, CheckCircle2, XCircle, Eye, CheckSquare, Sparkles, FolderPlus
} from 'lucide-react';
import TagBadge from './TagBadge';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';

function stripHtml(html) {
  if (!html) return '';
  const tmp = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return tmp;
}

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

  const getTypeBadge = (type) => {
    switch (type) {
      case 'SINGLE_CHOICE':
        return <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded">{t('typeSingleChoice')}</span>;
      case 'MULTIPLE_CHOICE':
        return <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 rounded">{t('typeMultipleChoice')}</span>;
      case 'ESSAY':
        return <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">{t('typeEssay')}</span>;
      default:
        return <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700 rounded">{type}</span>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> {t('statusApproved')}</span>;
      case 'PENDING_REVIEW':
        return <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 rounded-full flex items-center gap-1"><Clock className="w-3 h-3"/> {t('statusPendingReview')}</span>;
      case 'REJECTED':
        return <span className="px-1.5 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 rounded-full flex items-center gap-1"><XCircle className="w-3 h-3"/> {t('statusRejected')}</span>;
      case 'DRAFT':
      default:
        return <span className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 rounded-full">{t('statusDraft')}</span>;
    }
  };

  const canEditQuestion = isAdmin || (isTeacher && (question.author_id === user?.id || !question.author_id));
  const canDeleteQuestion = isAdmin || (isTeacher && question.author_id === user?.id && question.status === 'DRAFT');

  const titlePlain = question.title ? stripHtml(question.title) : 'Untitled';
  const excerpt = question.stem_rich_text ? stripHtml(question.stem_rich_text).slice(0, 140) : '';

  const stop = (fn) => (e) => { e.stopPropagation(); fn(question); };

  return (
    <div
      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs hover:shadow transition overflow-hidden cursor-pointer flex flex-col min-h-[132px]"
      onClick={() => onViewDetails(question)}
      title="Click to view details"
    >
      <div className="p-3 flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {getTypeBadge(question.type)}
          {getStatusBadge(question.status)}
          <span className="px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded">v{question.version_number || 1}</span>
        </div>
        <div className="flex items-center gap-0.5 text-amber-400 shrink-0">
          {[1,2,3,4,5].map(s => (
            <Star key={s} className={`w-3 h-3 ${s <= question.difficulty ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-slate-600'}`} />
          ))}
        </div>
      </div>

      <div className="px-3 pb-2 space-y-1 flex-1 min-w-0">
        <h3 className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-slate-100 leading-snug line-clamp-2 min-w-0">{titlePlain}</h3>
        {excerpt && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{excerpt}</p>
        )}
        <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
          <span className="inline-flex items-center gap-1 truncate"><User className="w-3 h-3" />{question.author_name || question.author_username || 'Author'}</span>
          <span className="inline-flex items-center gap-1 shrink-0"><Clock className="w-3 h-3" />{new Date(question.updated_at || question.created_at).toLocaleDateString()}</span>
          {question.subject && <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] truncate max-w-[110px]">{question.subject}</span>}
        </div>
        {question.tags && question.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {question.tags.slice(0, 4).map(t => <TagBadge key={t.id || t.name} tag={t} size="xs" />)}
            {question.tags.length > 4 && <span className="text-[10px] text-slate-400">+{question.tags.length - 4}</span>}
          </div>
        )}
      </div>

      <div className="px-3 py-2 bg-slate-50/60 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
        <span className="text-[10px] text-slate-400">{question.options?.length ? `${question.options.length} options` : (question.type === 'ESSAY' ? 'Essay' : '')}</span>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {question.status === 'APPROVED' && onAssignExam && (
            <button type="button" title={t('btnAddToExam')} onClick={stop(onAssignExam)} className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded">
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
          )}
          <button type="button" title={t('btnDiff')} onClick={stop(onOpenDiff)} className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
            <GitCompare className="w-3.5 h-3.5" />
          </button>
          {canEditQuestion && (
            <button type="button" title={t('btnEdit')} onClick={stop(onEdit)} className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}
          <button type="button" title={t('btnDetails')} onClick={stop(onViewDetails)} className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
            <Eye className="w-3.5 h-3.5" />
          </button>
          {canDeleteQuestion && (
            <button type="button" title={t('btnDelete')} onClick={stop(onDelete)} className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          {(question.status === 'DRAFT' || question.status === 'REJECTED') && isTeacher && (
            <button type="button" onClick={stop(onSubmitReview)} className="px-2 py-0.5 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded hover:bg-amber-100">Submit</button>
          )}
          {question.status === 'PENDING_REVIEW' && isReviewer && (
            <button type="button" onClick={stop(onOpenReview)} className="px-2 py-0.5 text-[10px] font-bold text-white bg-amber-600 hover:bg-amber-700 rounded">Review</button>
          )}
        </div>
      </div>
    </div>
  );
}
