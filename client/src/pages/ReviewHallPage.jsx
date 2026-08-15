import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, Clock, CheckCircle2, XCircle, RefreshCw, 
  MessageSquare, Star, Filter, Sparkles, BookOpen, AlertCircle, ArrowRight
} from 'lucide-react';
import { api } from '../api/client';
import MathRenderer from '../components/MathRenderer';
import TagBadge from '../components/TagBadge';
import ReviewModal from '../components/ReviewModal';
import VersionDiffModal from '../components/VersionDiffModal';
import { useI18n } from '../context/I18nContext';

export default function ReviewHallPage({ onViewQuestion, onEditQuestion }) {
  const { t, lang } = useI18n();
  const [pendingQuestions, setPendingQuestions] = useState([]);
  const [reviewRecords, setReviewRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');

  const [selectedSubject, setSelectedSubject] = useState('');
  const [reviewModalQuestion, setReviewModalQuestion] = useState(null);
  const [diffModalQuestion, setDiffModalQuestion] = useState(null);

  const fetchReviewData = async () => {
    try {
      setLoading(true);
      const [pendingRes, recordsRes] = await Promise.all([
        api.getPendingReviews({ subject: selectedSubject }),
        api.getReviewRecords(30)
      ]);
      setPendingQuestions(pendingRes.questions || []);
      setReviewRecords(recordsRes.records || []);
    } catch (err) {
      console.error('Failed to load review hall data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviewData();
  }, [selectedSubject]);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-amber-500/10 via-brand-500/5 to-purple-500/10 rounded-xl p-6 border border-amber-200/60 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">{t('reviewHallTitle')}</h1>
              <p className="text-xs text-slate-600">
                {t('reviewHallSubtitle')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-slate-200 p-1 rounded-xl shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                activeTab === 'pending'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{t('pendingQueue')} ({pendingQuestions.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                activeTab === 'history'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{t('reviewHistory')} ({reviewRecords.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={fetchReviewData}
            className="p-2 bg-white text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'pending' ? (
        <div className="space-y-4">
          {loading ? (
            <div className="py-20 text-center text-slate-500 text-xs">{t('loading')}</div>
          ) : pendingQuestions.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-slate-200 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">
                {lang === 'en' ? 'All certification items have been reviewed!' : '所有考题均已完成审核！'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {lang === 'en' ? 'The pending queue is clear. Newly submitted items will appear here automatically.' : '当前待审核队列为空，新提交的考题将自动在此处展示。'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingQuestions.map((q) => (
                <div
                  key={q.id}
                  className="bg-white rounded-xl border-2 border-amber-200/80 shadow-xs hover:shadow-md transition p-5 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-700" />
                        {t('statusPendingReview')}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-md">
                        {q.subject}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-mono font-bold bg-brand-50 text-brand-700 border border-brand-200 rounded-md">
                        v{q.version_number || 1}
                      </span>
                      <div className="flex items-center gap-0.5 text-xs bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                        <span className="text-[10px] text-slate-500">{t('difficultyLabel')}:</span>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3 h-3 ${s <= q.difficulty ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="text-xs text-slate-500">
                      SME: <strong className="text-slate-800">{q.author_name || q.author_username}</strong> · 
                      {new Date(q.updated_at || q.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 mb-2">
                      <MathRenderer content={q.title} />
                    </h3>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800">
                      <MathRenderer content={q.stem_rich_text} />
                    </div>
                  </div>

                  {q.options && q.options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt, idx) => (
                        <div
                          key={idx}
                          className={`p-2.5 rounded-xl text-xs border flex items-start gap-2 ${
                            opt.is_correct
                              ? 'bg-emerald-50 border-emerald-300 font-semibold text-emerald-950'
                              : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            opt.is_correct ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {opt.key}
                          </span>
                          <div className="flex-1">
                            <MathRenderer content={opt.text} />
                          </div>
                          {opt.is_correct && <span className="text-[10px] text-emerald-600 font-bold shrink-0">✓ Key</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="p-3.5 bg-amber-50/40 border border-amber-200/70 rounded-xl text-xs space-y-2">
                    <div>
                      <span className="font-bold text-amber-900 block mb-0.5">【{t('standardAnswer')}】:</span>
                      <div className="bg-white p-2 rounded border border-amber-100">
                        <MathRenderer content={q.standard_answer_rich_text || 'None'} />
                      </div>
                    </div>
                    {q.explanation_rich_text && (
                      <div>
                        <span className="font-bold text-amber-900 block mb-0.5">【{t('explanation')}】:</span>
                        <div className="bg-white p-2 rounded border border-amber-100">
                          <MathRenderer content={q.explanation_rich_text} />
                        </div>
                      </div>
                    )}
                  </div>

                  {q.tags && q.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {q.tags.map((tagItem) => (
                        <TagBadge key={tagItem.id} tag={tagItem} size="xs" />
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setDiffModalQuestion(q)}
                      className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition flex items-center gap-1"
                    >
                      <span>{t('btnDiff')}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onEditQuestion(q)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                      >
                        {t('btnEdit')}
                      </button>

                      <button
                        type="button"
                        onClick={() => setReviewModalQuestion(q)}
                        className="flex items-center gap-1.5 px-5 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md shadow-amber-600/20 transition hover:scale-[1.02]"
                      >
                        <CheckSquare className="w-4 h-4" />
                        <span>{t('btnReview')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-amber-600" />
            {t('reviewHistory')}
          </h3>

          <div className="divide-y divide-slate-100">
            {reviewRecords.map((r) => (
              <div key={r.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      r.action === 'APPROVE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : r.action === 'REJECT'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {r.action}
                    </span>
                    <strong className="text-slate-800">{r.question_title || 'Item'}</strong>
                  </div>
                  <p className="text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    Feedback: {r.comment || 'None'}
                  </p>
                </div>

                <div className="text-right shrink-0 text-slate-400 text-[11px]">
                  <p className="font-medium text-slate-600">{r.reviewer_name}</p>
                  <p>{new Date(r.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModalQuestion && (
        <ReviewModal
          question={reviewModalQuestion}
          onClose={() => setReviewModalQuestion(null)}
          onSuccess={() => fetchReviewData()}
        />
      )}

      {/* Version Diff Modal */}
      {diffModalQuestion && (
        <VersionDiffModal
          question={diffModalQuestion}
          onClose={() => setDiffModalQuestion(null)}
          onRollbackSuccess={() => fetchReviewData()}
        />
      )}
    </div>
  );
}
