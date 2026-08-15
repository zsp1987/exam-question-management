import React, { useState, useEffect } from 'react';
import { 
  Save, Send, ArrowLeft, Plus, Trash2, CheckCircle2, 
  HelpCircle, Tag, Star, Sparkles, AlertCircle, BookOpen
} from 'lucide-react';
import RichEditor from '../components/RichEditor';
import TagBadge from '../components/TagBadge';
import { api } from '../api/client';
import { useI18n } from '../context/I18nContext';

export default function QuestionEditorPage({ questionId, onCancel, onSaved, taskId }) {
  const { t, lang } = useI18n();
  const isEditMode = Boolean(questionId);

  // Form States
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [type, setType] = useState('SINGLE_CHOICE');
  const [subject, setSubject] = useState('AWS Certified Solutions Architect');
  const [difficulty, setDifficulty] = useState(3);
  const [stemRichText, setStemRichText] = useState('');
  const [options, setOptions] = useState([
    { id: '1', key: 'A', text: '', is_correct: false },
    { id: '2', key: 'B', text: '', is_correct: false },
    { id: '3', key: 'C', text: '', is_correct: false },
    { id: '4', key: 'D', text: '', is_correct: false },
  ]);
  const [standardAnswer, setStandardAnswer] = useState('');
  const [explanation, setExplanation] = useState('');
  const [changeSummary, setChangeSummary] = useState(isEditMode ? 'Updated item architecture and formulas' : 'Initial Draft');
  
  // Tag Selection
  const [allTags, setAllTags] = useState([]);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [newTagName, setNewTagName] = useState('');

  // Available subjects
  const [subjects, setSubjects] = useState([
    'AWS Certified Solutions Architect', 
    'CISSP Information Security', 
    'Project Management Professional (PMP)', 
    'Certified Kubernetes Administrator (CKA)', 
    'Google Cloud Professional Cloud Architect',
    'Financial Risk Manager (FRM)'
  ]);

  // Load existing question if edit mode
  useEffect(() => {
    async function loadData() {
      try {
        const [tagsRes, subjectsRes] = await Promise.all([
          api.getTags(),
          api.getSubjects()
        ]);
        setAllTags(tagsRes.tags || []);
        if (subjectsRes.subjects && subjectsRes.subjects.length > 0) setSubjects(subjectsRes.subjects);

        if (isEditMode) {
          const res = await api.getQuestion(questionId);
          const q = res.question;
          setTitle(q.title || '');
          setType(q.type || 'SINGLE_CHOICE');
          setSubject(q.subject || 'AWS Certified Solutions Architect');
          setDifficulty(q.difficulty || 3);
          setStemRichText(q.stem_rich_text || '');
          if (q.options && q.options.length > 0) {
            setOptions(q.options);
          }
          setStandardAnswer(q.standard_answer_rich_text || '');
          setExplanation(q.explanation_rich_text || '');
          setSelectedTagIds(q.tags ? q.tags.map(t => t.id) : []);
          setChangeSummary(`Revision for version v${q.version_number || 1}`);
        }
      } catch (err) {
        setError('Failed to load item: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [questionId, isEditMode]);

  // Option Handlers
  const handleAddOption = () => {
    const nextKey = String.fromCharCode(65 + options.length);
    setOptions([...options, { id: Date.now().toString(), key: nextKey, text: '', is_correct: false }]);
  };

  const handleRemoveOption = (index) => {
    if (options.length <= 2) {
      alert(lang === 'en' ? 'Choice questions must have at least 2 options' : '选择题至少需要保留 2 个选项');
      return;
    }
    const updated = options.filter((_, idx) => idx !== index).map((opt, idx) => ({
      ...opt,
      key: String.fromCharCode(65 + idx)
    }));
    setOptions(updated);

    const correctKeys = updated.filter(o => o.is_correct).map(o => o.key).join(', ');
    setStandardAnswer(correctKeys);
  };

  const handleOptionTextChange = (index, text) => {
    const updated = [...options];
    updated[index].text = text;
    setOptions(updated);
  };

  const handleOptionCorrectToggle = (index) => {
    const updated = [...options];
    if (type === 'SINGLE_CHOICE') {
      updated.forEach((opt, idx) => {
        opt.is_correct = idx === index;
      });
      setStandardAnswer(updated[index].key);
    } else {
      updated[index].is_correct = !updated[index].is_correct;
      const correctKeys = updated.filter(o => o.is_correct).map(o => o.key).join(', ');
      setStandardAnswer(correctKeys);
    }
    setOptions(updated);
  };

  // Tag Handlers
  const toggleTag = (tagId) => {
    if (selectedTagIds.includes(tagId)) {
      setSelectedTagIds(selectedTagIds.filter(id => id !== tagId));
    } else {
      setSelectedTagIds([...selectedTagIds, tagId]);
    }
  };

  const handleCreateTag = async (e) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    try {
      const res = await api.createTag({ name: newTagName.trim(), category: 'Architecture' });
      setAllTags([...allTags, res.tag]);
      setSelectedTagIds([...selectedTagIds, res.tag.id]);
      setNewTagName('');
    } catch (err) {
      alert(t('error') + ': ' + err.message);
    }
  };

  // Submit Handler
  const handleSubmit = async (submitForReview = false) => {
    if (!title.trim()) {
      alert(lang === 'en' ? 'Please enter question title' : '请填写考题标题');
      return;
    }
    if (!stemRichText.trim()) {
      alert(lang === 'en' ? 'Please enter question scenario/stem' : '请填写考题题干内容');
      return;
    }

    if ((type === 'SINGLE_CHOICE' || type === 'MULTIPLE_CHOICE')) {
      const hasCorrect = options.some(o => o.is_correct);
      if (!hasCorrect) {
        alert(lang === 'en' ? 'Please select at least one correct option' : '请至少勾选一个正确选项');
        return;
      }
      const hasEmptyText = options.some(o => !o.text.trim());
      if (hasEmptyText) {
        alert(lang === 'en' ? 'Please fill out all option texts' : '请填写所有选项的内容');
        return;
      }
    }

    // Enforce 50KB per-field cap (Q6/Q7) + collect katex_source
    const collectLatex = (html) => {
      if (!html) return [];
      const re = /data-latex="([^"]*)"/g;
      const out = []; let m;
      while ((m = re.exec(html)) !== null) out.push(m[1]);
      return out;
    };
    const allLatex = [
      ...collectLatex(stemRichText),
      ...options.flatMap(o => collectLatex(o.text || '')),
      ...collectLatex(standardAnswer),
      ...collectLatex(explanation),
    ];
    const katex_source = allLatex.join('\n');

    // 50KB per-field check
    const checkFieldSize = (name, html) => {
      if (html && html.length > 50 * 1024) {
        alert((lang === 'en' ? name + ' exceeds 50KB limit, please shorten.' : name + ' 超过 50KB 限制，请精简内容。'));
        return false;
      }
      return true;
    };
    if (!checkFieldSize('Stem', stemRichText)) return;
    if (!checkFieldSize('Explanation', explanation)) return;
    if (!checkFieldSize('Standard Answer', standardAnswer)) return;
    for (const o of options) { if (!checkFieldSize('Option ' + o.key, o.text)) return; }

    const payload = {
      title: title.trim(),
      type,
      subject,
      difficulty,
      stem_rich_text: stemRichText,
      options: (type === 'SINGLE_CHOICE' || type === 'MULTIPLE_CHOICE') ? options : [],
      standard_answer_rich_text: standardAnswer,
      explanation_rich_text: explanation,
      katex_source,
      tagIds: selectedTagIds,
      change_summary: changeSummary.trim(),
      submitForReview
    };

    try {
      setSaving(true);
      if (isEditMode) {
        await api.updateQuestion(questionId, payload);
        alert(submitForReview ? (lang === 'en' ? 'Question updated and submitted for review!' : '考题已更新并提交至审核大厅！') : t('success'));
      } else if (taskId) {
        // Task-bound creation: use same draft form but via tasks endpoint (validates type/difficulty/subject & cap)
        await api.createTaskQuestion(taskId, payload);
        alert(lang === 'en' ? 'Question created in task!' : '任务题目已创建！');
      } else {
        await api.createQuestion(payload);
        alert(submitForReview ? (lang === 'en' ? 'New question created and submitted for review!' : '新考题已创建并送审！') : t('success'));
      }
      onSaved();
    } catch (err) {
      alert(t('error') + ': ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-500 text-xs">{t('loading')}</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs hover:bg-slate-50 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{lang === 'en' ? 'Back to Repository' : '返回题库列表'}</span>
        </button>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSubmit(false)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-2xs transition"
          >
            <Save className="w-3.5 h-3.5 text-slate-600" />
            <span>{isEditMode ? t('saveNewVersion') : t('saveDraft')}</span>
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => handleSubmit(true)}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 rounded-xl shadow-md shadow-brand-500/20 transition"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isEditMode ? t('saveNewVersionSubmit') : t('saveSubmit')}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Main Form */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
        <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-600" />
              {isEditMode ? (lang === 'en' ? 'Edit Certification Question (Generates Snapshot Version)' : '编辑考题 (将生成新版本快照)') : (lang === 'en' ? 'Draft New Certification Question' : '录入新认证考题')}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {lang === 'en' ? 'Embedded LaTeX formula solver, dynamic visual table generator & multi-option validation' : '支持嵌入 LaTeX 复杂公式、可视化拖拽表格排版与多题型适配'}
            </p>
          </div>
          {isEditMode && (
            <span className="px-2.5 py-1 text-xs font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 rounded-lg">
              Item ID: {questionId.slice(0, 8)}...
            </span>
          )}
        </div>

        {/* Basic Meta Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Question Type */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Question Type *</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              <option value="SINGLE_CHOICE">{t('typeSingleChoice')}</option>
              <option value="MULTIPLE_CHOICE">{t('typeMultipleChoice')}</option>
              <option value="ESSAY">{t('typeEssay')}</option>
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Certification Subject *</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              {subjects.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('difficultyLabel')} *</label>
            <div className="flex items-center gap-1 h-9 px-2 bg-slate-50 border border-slate-300 rounded-xl">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setDifficulty(s)}
                  className="p-1 hover:scale-110 transition"
                  title={`${s} Star`}
                >
                  <Star
                    className={`w-4 h-4 ${
                      s <= difficulty ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                    }`}
                  />
                </button>
              ))}
              <span className="text-[11px] font-bold text-slate-600 ml-1.5">{difficulty} Star</span>
            </div>
          </div>

          {/* Version Note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('editorChangeSummary')}</label>
            <input
              type="text"
              value={changeSummary}
              onChange={(e) => setChangeSummary(e.target.value)}
              placeholder={t('editorChangeSummaryPlaceholder')}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Title Input */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            {t('editorTitle')}
            <span className="text-[11px] font-normal text-slate-400 ml-2">
              {'Supports inline LaTeX, e.g. $\\tau \\le 50\\text{ms}$'}
            </span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. AWS Multi-Region DynamoDB Latency Trade-off Analysis"
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none font-medium"
          />
        </div>

        {/* Tag Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
            <span>Certification Domains & Knowledge Tags</span>
            <span className="text-[11px] text-slate-400">{selectedTagIds.length} tags selected</span>
          </label>
          <div className="flex flex-wrap items-center gap-1.5 p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-32 overflow-y-auto">
            {allTags.map((tag) => {
              const isSelected = selectedTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  style={{
                    backgroundColor: isSelected ? tag.color : '#ffffff',
                    color: isSelected ? '#ffffff' : '#334155',
                    borderColor: tag.color || '#cbd5e1'
                  }}
                  className={`px-2.5 py-1 text-xs font-medium rounded-full border transition flex items-center gap-1 ${
                    isSelected ? 'shadow-2xs scale-105' : 'hover:bg-slate-100 opacity-80'
                  }`}
                >
                  <Tag className="w-2.5 h-2.5" />
                  <span>{tag.name}</span>
                </button>
              );
            })}

            {/* Inline Quick Add Tag */}
            <form onSubmit={handleCreateTag} className="flex items-center gap-1 ml-2">
              <input
                type="text"
                placeholder="+ New Domain Tag"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="px-2 py-0.5 text-xs border border-slate-300 rounded-full bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 w-32"
              />
              {newTagName.trim() && (
                <button
                  type="submit"
                  className="px-2 py-0.5 text-[11px] bg-brand-600 text-white rounded-full font-bold"
                >
                  Add
                </button>
              )}
            </form>
          </div>
        </div>

        {/* Stem Editor */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            {t('editorStem')}
          </label>
          <RichEditor
            value={stemRichText}
            onChange={setStemRichText}
            label={lang === 'en' ? 'Scenario & Stem Editor' : '题干场景富文本编辑器'}
            minHeight="min-h-[180px]"
            showFormulaBar={true}
          />
        </div>

        {/* Options Management */}
        {(type === 'SINGLE_CHOICE' || type === 'MULTIPLE_CHOICE') && (
          <div className="space-y-3 p-4 bg-slate-50/70 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {t('editorOptions')} ({type === 'SINGLE_CHOICE' ? 'Single Choice' : 'Multiple Choice'})
                </h4>
                <p className="text-[11px] text-slate-500">
                  {'Supports LaTeX math in options (e.g. $\\tau \\le 50\\text{ms}$)'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddOption}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('editorAddOption')}</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {options.map((opt, idx) => (
                <div
                  key={opt.id || idx}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border bg-white transition ${
                    opt.is_correct ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-slate-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleOptionCorrectToggle(idx)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition ${
                      opt.is_correct
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                    title={opt.is_correct ? 'Click to deselect' : 'Click to mark as correct key'}
                  >
                    {opt.key}
                  </button>

                  <div className="flex-1">
                    <RichEditor
                      value={opt.text}
                      onChange={(val) => handleOptionTextChange(idx, val)}
                      label={`Option ${opt.key}`}
                      placeholder={`Enter option ${opt.key} text (tables & formulas supported)…`}
                      minHeight="min-h-[60px]"
                      showFormulaBar={true}
                    />
                  </div>



                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Remove option"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Standard Answer & Explanation */}
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {t('standardAnswer')}
            </label>
            {type === 'ESSAY' ? (
              <RichEditor
                value={standardAnswer}
                onChange={setStandardAnswer}
                label={t('standardAnswer')}
                minHeight="min-h-[140px]"
                showFormulaBar={true}
              />
            ) : (
              <input
                type="text"
                value={standardAnswer}
                onChange={(e) => setStandardAnswer(e.target.value)}
                placeholder="e.g. B or A, B, C"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {t('explanation')}
            </label>
            <RichEditor
              value={explanation}
              onChange={setExplanation}
              label={t('explanation')}
              minHeight="min-h-[140px]"
              showFormulaBar={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
