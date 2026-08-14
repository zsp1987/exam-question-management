import React, { useState, useRef } from 'react';
import { 
  Bold, Italic, Code, List, ListOrdered, Quote, 
  Eye, Edit3, Columns, Sparkles, Plus, Trash2, 
  Heading2, Table
} from 'lucide-react';
import FormulaToolbar from './FormulaToolbar';
import MathRenderer from './MathRenderer';
import { useI18n } from '../context/I18nContext';

export default function RichEditor({
  value = '',
  onChange,
  label,
  placeholder,
  minHeight = 'min-h-[160px]',
  showFormulaBar = true
}) {
  const { t } = useI18n();
  const [viewMode, setViewMode] = useState('split'); // 'edit', 'preview', 'split'
  const [showFormulaPanel, setShowFormulaPanel] = useState(false);
  const textareaRef = useRef(null);

  const defaultPlaceholder = placeholder || 'Enter content, supporting HTML table formatting and LaTeX formulas (e.g. $\\tau \\le 50\\text{ms}$)...';

  const insertTextAtCursor = (textToInsert) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(value + textToInsert);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = textarea.value;

    const newVal = currentVal.substring(0, start) + textToInsert + currentVal.substring(end);
    onChange(newVal);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
    }, 10);
  };

  const wrapSelectionWithTags = (openTag, closeTag) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = textarea.value;
    const selectedText = currentVal.substring(start, end) || 'text';

    const newVal = currentVal.substring(0, start) + openTag + selectedText + closeTag + currentVal.substring(end);
    onChange(newVal);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + openTag.length, end + openTag.length);
    }, 10);
  };

  // Helper for adding a row to a table snippet
  const handleQuickAddRow = () => {
    insertTextAtCursor('\n    <tr>\n      <td class="border p-2">New Cell A</td>\n      <td class="border p-2">New Cell B</td>\n      <td class="border p-2">New Cell C</td>\n    </tr>\n');
  };

  return (
    <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-xs focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-brand-500 transition">
      {/* Editor Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-100/90 border-b border-slate-200">
        <div className="flex flex-wrap items-center gap-1">
          {label && (
            <span className="text-xs font-bold text-slate-700 mr-2 flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5 text-brand-600" />
              {label}
            </span>
          )}

          <div className="flex items-center gap-0.5 border-r border-slate-300 pr-1.5 mr-1">
            <button
              type="button"
              title="Bold"
              onClick={() => wrapSelectionWithTags('<strong>', '</strong>')}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded transition"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Italic"
              onClick={() => wrapSelectionWithTags('<em>', '</em>')}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded transition"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Inline Code"
              onClick={() => wrapSelectionWithTags('<code>', '</code>')}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded transition"
            >
              <Code className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-0.5 border-r border-slate-300 pr-1.5 mr-1">
            <button
              type="button"
              title="Heading H3"
              onClick={() => wrapSelectionWithTags('<h3>', '</h3>')}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded transition"
            >
              <Heading2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Unordered List"
              onClick={() => wrapSelectionWithTags('<ul>\n  <li>', '</li>\n</ul>')}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded transition"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Ordered List"
              onClick={() => wrapSelectionWithTags('<ol>\n  <li>', '</li>\n</ol>')}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded transition"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Quote"
              onClick={() => wrapSelectionWithTags('<blockquote>', '</blockquote>')}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded transition"
            >
              <Quote className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Table Quick Row Modifier Button */}
          <button
            type="button"
            title="Quick append table row"
            onClick={handleQuickAddRow}
            className="flex items-center gap-1 px-2 py-1 text-[11px] text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded font-medium transition mr-1"
          >
            <Plus className="w-3 h-3 text-emerald-600" />
            <span>{t('tableAddRow')}</span>
          </button>

          {showFormulaBar && (
            <button
              type="button"
              onClick={() => setShowFormulaPanel(!showFormulaPanel)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded transition ${
                showFormulaPanel 
                  ? 'bg-brand-600 text-white shadow-xs' 
                  : 'bg-brand-50 text-brand-700 hover:bg-brand-100 border border-brand-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{showFormulaPanel ? t('hideFormulaHelper') : t('formulaHelper')}</span>
            </button>
          )}
        </div>

        {/* View Mode Selector */}
        <div className="flex items-center gap-1 bg-white border border-slate-300 p-0.5 rounded-lg text-xs">
          <button
            type="button"
            onClick={() => setViewMode('edit')}
            className={`flex items-center gap-1 px-2 py-1 rounded transition ${
              viewMode === 'edit' ? 'bg-brand-50 text-brand-700 font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Edit3 className="w-3 h-3" />
            <span>{t('viewEdit')}</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('split')}
            className={`flex items-center gap-1 px-2 py-1 rounded transition ${
              viewMode === 'split' ? 'bg-brand-50 text-brand-700 font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Columns className="w-3 h-3" />
            <span>{t('viewSplit')}</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('preview')}
            className={`flex items-center gap-1 px-2 py-1 rounded transition ${
              viewMode === 'preview' ? 'bg-brand-50 text-brand-700 font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>{t('viewPreview')}</span>
          </button>
        </div>
      </div>

      {/* Togglable Formula & Table Toolbar */}
      {showFormulaPanel && (
        <div className="px-3 py-1 bg-slate-50 border-b border-slate-200">
          <FormulaToolbar
            onInsertLatex={(latex) => insertTextAtCursor(latex)}
            onInsertTable={(tableHtml) => insertTextAtCursor(tableHtml)}
          />
        </div>
      )}

      {/* Editor Body */}
      <div className={`grid ${viewMode === 'split' ? 'grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200' : 'grid-cols-1'}`}>
        {/* Editor input */}
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={defaultPlaceholder}
              className={`w-full p-3.5 text-xs sm:text-sm font-mono text-slate-800 bg-white focus:outline-none resize-y ${minHeight}`}
            />
          </div>
        )}

        {/* Live WYSIWYG Preview */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className={`p-3.5 bg-slate-50/70 overflow-y-auto ${minHeight}`}>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center justify-between border-b border-slate-200/80 pb-1">
              <span>{t('livePreviewHeader')}</span>
              <span className="text-[10px] text-emerald-600 font-medium">● Live KaTeX</span>
            </div>
            {value ? (
              <MathRenderer content={value} />
            ) : (
              <p className="text-xs text-slate-400 italic py-4">（Empty content）</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
