import React, { useState, useEffect } from 'react';
import { 
  Tags, Plus, Trash2, Edit3, X, Check, 
  Sparkles, RefreshCw, Layers 
} from 'lucide-react';
import { api } from '../api/client';
import TagBadge from '../components/TagBadge';
import { useI18n } from '../context/I18nContext';

const PRESET_COLORS = [
  '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', 
  '#ec4899', '#06b6d4', '#ef4444', '#6366f1', '#14b8a6'
];

export default function AdminTagsPage() {
  const { t, lang } = useI18n();
  const [tags, setTags] = useState([]);
  const [categories, setCategories] = useState({});
  const [loading, setLoading] = useState(true);

  // Form modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Architecture');
  const [color, setColor] = useState('#3b82f6');
  const [submitting, setSubmitting] = useState(false);

  const fetchTags = async () => {
    try {
      setLoading(true);
      const res = await api.getTags();
      setTags(res.tags || []);
      setCategories(res.categories || {});
    } catch (err) {
      console.error('Failed to load tags:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const handleCreateTag = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setSubmitting(true);
      await api.createTag({ name: name.trim(), category, color });
      setShowAddModal(false);
      setName('');
      fetchTags();
    } catch (err) {
      alert(t('error') + ': ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTag = async (tag) => {
    if (!window.confirm(`${lang === 'en' ? 'Delete domain tag' : '确定删除标签'}【${tag.name}】?`)) return;
    try {
      await api.deleteTag(tag.id);
      fetchTags();
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
            <Tags className="w-5 h-5 text-brand-600" />
            {t('navAdminTags')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Organize and classify certification knowledge domains, formulas, and syllabus modules
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-md shadow-brand-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'en' ? 'Create Domain Tag' : '新建考点标签'}</span>
          </button>

          <button
            type="button"
            onClick={fetchTags}
            className="p-2 bg-slate-100 text-slate-600 hover:text-slate-900 rounded-xl transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Category Groups */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(categories).map(([catName, tagList]) => (
          <div key={catName} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-brand-600" />
                {catName} ({tagList.length})
              </h3>
            </div>

            <div className="flex flex-wrap gap-2">
              {tagList.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full text-xs border bg-slate-50 hover:bg-white transition shadow-2xs group"
                  style={{ borderColor: tag.color || '#cbd5e1' }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                  <span className="font-semibold text-slate-800">{tag.name}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteTag(tag)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-full hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Tags className="w-4 h-4 text-brand-600" />
                <span>{lang === 'en' ? 'Create Domain Tag' : '新建考点标签'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTag} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tag Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Zero Trust Architecture"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Category Domain *</label>
                <input
                  type="text"
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Architecture, Security, PMP Formulas, DevOps"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Color Theme</label>
                <div className="flex items-center gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-6 h-6 rounded-full transition flex items-center justify-center ${
                        color === c ? 'ring-2 ring-offset-2 ring-slate-800 scale-110' : 'hover:scale-105'
                      }`}
                    >
                      {color === c && <Check className="w-3 h-3 text-white" />}
                    </button>
                  ))}
                </div>
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
