import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Plus, RefreshCw, Layers, LayoutGrid, List, 
  ListFilter, Star, AlertCircle, CheckCircle2, Clock, 
  XCircle, Sparkles, Tag, BookOpen
} from 'lucide-react';
import { api } from '../api/client';
import QuestionCard from '../components/QuestionCard';
import QuestionTable from '../components/QuestionTable';
import VersionDiffModal from '../components/VersionDiffModal';
import ReviewModal from '../components/ReviewModal';
import AssignExamModal from '../components/AssignExamModal';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';

export default function QuestionListPage({ onNavigate, onEditQuestion, onViewQuestion }) {
  const { isTeacher } = useAuth();
  const { t, lang } = useI18n();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('eqms_q_view') || 'grid'); // grid | table
  
  // Search & Filter states
  const [keyword, setKeyword] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [subject, setSubject] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [selectedTagId, setSelectedTagId] = useState('');
  const [sortBy, setSortBy] = useState('updated_at');

  // Available Filter Options
  const [allTags, setAllTags] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);

  // Modals state
  const [diffModalQuestion, setDiffModalQuestion] = useState(null);
  const [reviewModalQuestion, setReviewModalQuestion] = useState(null);
  const [assignModalQuestion, setAssignModalQuestion] = useState(null);

  // Fetch Tags & Subjects on mount
  useEffect(() => {
    async function loadMeta() {
      try {
        const [tagsRes, subjectsRes] = await Promise.all([
          api.getTags(),
          api.getSubjects()
        ]);
        setAllTags(tagsRes.tags || []);
        setAllSubjects(subjectsRes.subjects || []);
      } catch (err) {
        console.error('Failed to load filter metadata:', err);
      }
    }
    loadMeta();
  }, []);

  // Fetch Questions
  const fetchQuestions = async (pageToFetch = pagination.page) => {
    try {
      setLoading(true);
      const res = await api.getQuestions({
        keyword,
        type,
        status,
        subject,
        difficulty,
        tagId: selectedTagId,
        page: pageToFetch,
        limit: pagination.limit,
        sortBy
      });
      setQuestions(res.data || []);
      setPagination(res.pagination || { page: 1, limit: 12, total: 0, totalPages: 1 });
    } catch (err) {
      console.error('Failed to fetch questions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions(1);
  }, [type, status, subject, difficulty, selectedTagId, sortBy]);

  useEffect(() => {
    localStorage.setItem('eqms_q_view', viewMode);
  }, [viewMode]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchQuestions(1);
  };

  const handleResetFilters = () => {
    setKeyword('');
    setType('');
    setStatus('');
    setSubject('');
    setDifficulty('');
    setSelectedTagId('');
    setSortBy('updated_at');
  };

  const handleSubmitReview = async (question) => {
    if (!window.confirm(`${lang === 'en' ? 'Submit question for expert review' : '确定将考题提交至专家审核大厅'}《${question.title}》?`)) return;
    try {
      await api.submitForReview(question.id, 'Exam creator submitted item for review');
      alert(t('success'));
      fetchQuestions();
    } catch (err) {
      alert(t('error') + ': ' + err.message);
    }
  };

  const handleDeleteQuestion = async (question) => {
    if (!window.confirm(`${lang === 'en' ? 'Permanently delete item' : '确定永久删除考题'}《${question.title}》?`)) return;
    try {
      await api.deleteQuestion(question.id);
      fetchQuestions();
    } catch (err) {
      alert(t('error') + ': ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Search Bar */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-brand-600" />
              {t('navQuestions')}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('navQuestionsDesc')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isTeacher && (
              <button
                type="button"
                onClick={() => onNavigate('create-question')}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 rounded-xl shadow-md shadow-brand-500/20 transition hover:scale-[1.02]"
              >
                <Plus className="w-4 h-4" />
                <span>{t('navCreateQuestion')}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => fetchQuestions()}
              className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Search Input Form */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none transition"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl shadow-xs transition"
          >
            {t('searchBtn')}
          </button>
        </form>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          {/* Question Type */}
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">{t('allTypes')}</option>
            <option value="SINGLE_CHOICE">{t('typeSingleChoice')}</option>
            <option value="MULTIPLE_CHOICE">{t('typeMultipleChoice')}</option>
            <option value="ESSAY">{t('typeEssay')}</option>
          </select>

          {/* Status */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">{t('allStatuses')}</option>
            <option value="APPROVED">{t('statusApproved')}</option>
            <option value="PENDING_REVIEW">{t('statusPendingReview')}</option>
            <option value="REJECTED">{t('statusRejected')}</option>
            <option value="DRAFT">{t('statusDraft')}</option>
          </select>

          {/* Subject */}
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">{t('allSubjects')}</option>
            {allSubjects.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Difficulty */}
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">{t('allDifficulties')}</option>
            <option value="1">{t('diff1')}</option>
            <option value="2">{t('diff2')}</option>
            <option value="3">{t('diff3')}</option>
            <option value="4">{t('diff4')}</option>
            <option value="5">{t('diff5')}</option>
          </select>

          {/* Tag Filter */}
          <select
            value={selectedTagId}
            onChange={(e) => setSelectedTagId(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 max-w-[150px] truncate"
          >
            <option value="">{t('allTags')}</option>
            {allTags.map((tItem) => (
              <option key={tItem.id} value={tItem.id}>{tItem.name} ({tItem.category})</option>
            ))}
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="updated_at">{t('sortByUpdated')}</option>
            <option value="created_at">{t('sortByCreated')}</option>
            <option value="difficulty">{t('sortByDifficulty')}</option>
          </select>

          {/* Reset Filters button */}
          {(keyword || type || status || subject || difficulty || selectedTagId) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-2.5 py-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            >
              {t('clearFilters')}
            </button>
          )}
        </div>
      </div>

      {/* Questions Results List */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-brand-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500">{t('loading')}</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200 space-y-3">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">{t('noData')}</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {lang === 'en' ? 'Try adjusting search terms or reset filters.' : '请尝试调整搜索关键词或重置筛选条件。'}
          </p>
          {isTeacher && (
            <button
              type="button"
              onClick={() => onNavigate('create-question')}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('navCreateQuestion')}</span>
            </button>
          )}
        </div>
      ) : (
        <>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-slate-500">{pagination.total} items</span>
          <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button type="button" onClick={() => setViewMode('grid')} title="Grid view" className={`p-1.5 ${viewMode==='grid' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'}`}><LayoutGrid className="w-4 h-4" /></button>
            <button type="button" onClick={() => setViewMode('table')} title="Table view" className={`p-1.5 ${viewMode==='table' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'}`}><List className="w-4 h-4" /></button>
          </div>
        </div>
        {viewMode === 'table' ? (
          <QuestionTable
            questions={questions}
            onViewDetails={onViewQuestion}
            onEdit={onEditQuestion}
            onOpenDiff={(targetQ) => setDiffModalQuestion(targetQ)}
            onOpenReview={(targetQ) => setReviewModalQuestion(targetQ)}
            onSubmitReview={handleSubmitReview}
            onDelete={handleDeleteQuestion}
            onAssignExam={(targetQ) => setAssignModalQuestion(targetQ)}
          />
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {questions.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              onViewDetails={onViewQuestion}
              onEdit={onEditQuestion}
              onOpenDiff={(targetQ) => setDiffModalQuestion(targetQ)}
              onOpenReview={(targetQ) => setReviewModalQuestion(targetQ)}
              onSubmitReview={handleSubmitReview}
              onDelete={handleDeleteQuestion}
              onAssignExam={(targetQ) => setAssignModalQuestion(targetQ)}
            />
          ))}
        </div>
        )}
        </>
      )}

      {/* Pagination Footer */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-5 py-3 rounded-xl border border-slate-200 text-xs text-slate-600">
          <span>
            {t('pageInfo', { page: pagination.page, totalPages: pagination.totalPages })} ({pagination.total} items)
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => fetchQuestions(pagination.page - 1)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
            >
              {t('prevPage')}
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchQuestions(pagination.page + 1)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
            >
              {t('nextPage')}
            </button>
          </div>
        </div>
      )}

      {/* Version Diff Modal */}
      {diffModalQuestion && (
        <VersionDiffModal
          question={diffModalQuestion}
          onClose={() => setDiffModalQuestion(null)}
          onRollbackSuccess={() => fetchQuestions()}
        />
      )}

      {/* Review Modal */}
      {reviewModalQuestion && (
        <ReviewModal
          question={reviewModalQuestion}
          onClose={() => setReviewModalQuestion(null)}
          onSuccess={() => fetchQuestions()}
        />
      )}

      {/* Assign to Exam Folder Modal */}
      {assignModalQuestion && (
        <AssignExamModal
          question={assignModalQuestion}
          onClose={() => setAssignModalQuestion(null)}
          onSuccess={() => fetchQuestions()}
        />
      )}
    </div>
  );
}
