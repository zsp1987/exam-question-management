import React from 'react';
import { Star, Clock, User, GitCompare, Edit3, Trash2, Eye, CheckCircle2, XCircle, FolderPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';

function stripHtml(html){ if(!html) return ''; return html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim(); }

function TypeDot({type}){
  const cls = type==='SINGLE_CHOICE' ? 'bg-blue-500' : type==='MULTIPLE_CHOICE' ? 'bg-purple-500' : 'bg-emerald-500';
  return <span className={`inline-block w-2 h-2 rounded-full ${cls}`} title={type} />;
}

export default function QuestionTable({ questions, onViewDetails, onEdit, onOpenDiff, onOpenReview, onSubmitReview, onDelete, onAssignExam }){
  const { user, isTeacher, isReviewer, isAdmin } = useAuth();
  const { t } = useI18n();

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="text-left px-3 py-2.5 font-semibold">Title</th>
              <th className="text-left px-3 py-2.5 font-semibold hidden lg:table-cell">Subject</th>
              <th className="text-left px-3 py-2.5 font-semibold">Type</th>
              <th className="text-left px-3 py-2.5 font-semibold">Status</th>
              <th className="text-left px-3 py-2.5 font-semibold hidden sm:table-cell">Difficulty</th>
              <th className="text-left px-3 py-2.5 font-semibold hidden md:table-cell">Updated</th>
              <th className="text-right px-3 py-2.5 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {questions.map(q => {
              const canEdit = isAdmin || (isTeacher && (q.author_id === user?.id || !q.author_id));
              const canDelete = isAdmin || (isTeacher && q.author_id === user?.id && q.status === 'DRAFT');
              const title = stripHtml(q.title) || 'Untitled';
              return (
                <tr key={q.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 cursor-pointer" onClick={() => onViewDetails(q)}>
                  <td className="px-3 py-2.5 max-w-[360px]">
                    <div className="font-medium text-slate-900 dark:text-slate-100 truncate" title={title}>{title}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate hidden sm:block">{stripHtml(q.stem_rich_text).slice(0, 90)}</div>
                  </td>
                  <td className="px-3 py-2.5 hidden lg:table-cell"><span className="text-slate-600 dark:text-slate-400 truncate max-w-[140px] inline-block">{q.subject || '-'}</span></td>
                  <td className="px-3 py-2.5"><span className="inline-flex items-center gap-1.5"><TypeDot type={q.type} /><span className="hidden sm:inline text-slate-700 dark:text-slate-300">{q.type === 'SINGLE_CHOICE' ? 'Single' : q.type === 'MULTIPLE_CHOICE' ? 'Multiple' : 'Essay'}</span></span></td>
                  <td className="px-3 py-2.5">
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${q.status==='APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : q.status==='PENDING_REVIEW' ? 'bg-amber-50 text-amber-700 border-amber-200' : q.status==='REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                      {q.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 hidden sm:table-cell">
                    <span className="inline-flex gap-0.5">{[1,2,3,4,5].map(s => <Star key={s} className={`w-3 h-3 ${s <= q.difficulty ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-slate-600'}`} />)}</span>
                  </td>
                  <td className="px-3 py-2.5 hidden md:table-cell text-slate-500 dark:text-slate-400 whitespace-nowrap">{new Date(q.updated_at || q.created_at).toLocaleDateString()}</td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="inline-flex items-center gap-1" onClick={(e)=>e.stopPropagation()}>
                      {q.status==='APPROVED' && onAssignExam && (
                        <button type="button" title={t('btnAddToExam')} onClick={() => onAssignExam(q)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><FolderPlus className="w-3.5 h-3.5" /></button>
                      )}
                      <button type="button" title={t('btnDiff')} onClick={() => onOpenDiff(q)} className="p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><GitCompare className="w-3.5 h-3.5" /></button>
                      {canEdit && <button type="button" title={t('btnEdit')} onClick={() => onEdit(q)} className="p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><Edit3 className="w-3.5 h-3.5" /></button>}
                      <button type="button" title={t('btnDetails')} onClick={() => onViewDetails(q)} className="p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><Eye className="w-3.5 h-3.5" /></button>
                      {canDelete && <button type="button" title={t('btnDelete')} onClick={() => onDelete(q)} className="p-1 text-slate-400 hover:text-rose-600 rounded"><Trash2 className="w-3.5 h-3.5" /></button>}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
