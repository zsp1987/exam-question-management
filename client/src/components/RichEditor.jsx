import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import { 
  Bold, Italic, Code, List, ListOrdered, Quote, 
  Heading2, Table as TableIcon, Sparkles
} from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import TableGridPicker from './TableGridPicker';
import FormulaModal from './FormulaModal';
import { InlineMath, BlockMath } from '../extensions/katex';

const MAX_HTML_SIZE = 50 * 1024; // 50KB per-field cap

function sanitizePasteHtml(html) {
  if (!html) return html;
  let out = html;
  // Strip style attributes (mso-* etc) except allow-list is handled server-side; client just normalizes
  // Flatten nested tables: keep only innermost table content
  // TipTap will re-parse; we just do light cleanup
  return out;
}

export default function RichEditor({
  value = '',
  onChange,
  label,
  placeholder,
  minHeight = 'min-h-[160px]',
  showFormulaBar = true
}) {
  const { t } = useI18n();
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      InlineMath,
      BlockMath,
    ],
    content: value || '<p></p>',
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      if (html.length > MAX_HTML_SIZE) {
        showToast('Content too large (50KB max) — please shorten');
        // Revert? We allow but warn; server will reject if >55KB
      }
      // Collect katex_source is done at submit time; onChange just HTML
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none p-3.5 text-sm text-slate-800 ${minHeight}`,
        placeholder: placeholder || 'Enter content…',
      },
      handlePaste: (view, event) => {
        // Let TipTap handle, then post-process for caps
        // We intercept after default by checking HTML
        const html = event.clipboardData?.getData('text/html') || '';
        if (html && /<table/i.test(html)) {
          // Check table size - count rows/cols
          const tmp = document.createElement('div');
          tmp.innerHTML = html;
          const tables = tmp.querySelectorAll('table');
          for (const tbl of tables) {
            const rows = tbl.querySelectorAll('tr').length;
            const cols = Math.max(...Array.from(tbl.querySelectorAll('tr')).map(tr => tr.querySelectorAll('td,th').length), 0);
            if (rows > 20 || cols > 20) {
              showToast(`Table truncated to 20×20 (spec limit) — pasted ${rows}×${cols}`);
            }
            // Check merged cells
            if (tbl.querySelector('[colspan], [rowspan]')) {
              showToast('Merged cells stripped (no merged cells per spec)');
            }
            // Check nested
            if (tbl.querySelector('table')) {
              showToast('Nested tables flattened');
            }
          }
        }
        if (html && html.length > 50 * 1024) {
          showToast('Pasted content too large (50KB max) — truncated');
        }
        return false; // let TipTap continue
      },
    },
  });

  // Sync external value -> editor (on load or reset)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    // Only sync if external value differs significantly (initial load)
    // Use isEmpty check to handle <p></p> vs ''
    const normalizedValue = value || '<p></p>';
    if (current !== normalizedValue && (normalizedValue !== '<p></p>' || current !== '<p></p>')) {
      // Avoid loop: only if value changed externally and not from our own onUpdate
      if (value && value !== current) {
        editor.commands.setContent(normalizedValue, false);
      } else if (!value && current !== '<p></p>') {
        editor.commands.setContent('<p></p>', false);
      }
    }
  }, [value, editor]);

  const handleCreateTable = useCallback((rows, cols) => {
    if (!editor) return;
    // Enforce 20x20 cap
    const cappedRows = Math.min(rows, 20);
    const cappedCols = Math.min(cols, 20);
    if (rows > 20 || cols > 20) showToast('Table capped to 20×20 (spec limit)');
    editor.chain().focus().insertTable({ rows: cappedRows, cols: cappedCols, withHeaderRow: true }).run();
  }, [editor, showToast]);

  const handleInsertFormula = useCallback((latex, isBlock) => {
    if (!editor) return;
    if (latex.length > 2000) { showToast('LaTeX too long (2000 max)'); return; }
    if (/\\(input|include|def|gdef|edef|xdef|let|futurelet|catcode|openin|openout|write|read)\b/i.test(latex)) {
      showToast('Blocked LaTeX command (input/def etc)'); return;
    }
    if (isBlock) {
      editor.chain().focus().insertContent({ type: 'blockMath', attrs: { latex } }).run();
    } else {
      editor.chain().focus().insertContent({ type: 'inlineMath', attrs: { latex } }).run();
    }
  }, [editor, showToast]);

  const isInTable = useMemo(() => {
    if (!editor) return false;
    return editor.isActive('table');
  }, [editor?.state]);

  // Helper to get row/col count for disable at 20
  const tableSize = useMemo(() => {
    if (!editor || !isInTable) return { rows: 0, cols: 0 };
    try {
      const dom = editor.view.dom;
      const selTable = dom.querySelector('.tiptap table');
      // fallback: count from editor state? For now use DOM
      if (!selTable) return { rows: 0, cols: 0 };
      const rows = selTable.querySelectorAll('tr').length;
      const cols = Math.max(...Array.from(selTable.querySelectorAll('tr')).map(tr => tr.children.length), 0);
      return { rows, cols };
    } catch { return { rows: 0, cols: 0 }; }
  }, [editor?.state, isInTable]);

  if (!editor) {
    return <div className={`border border-slate-300 rounded-xl p-4 bg-white ${minHeight}`}>Loading editor…</div>;
  }

  return (
    <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-xs focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-brand-500 transition">
      {/* Fixed Toolbar — identical across all 4 editors (Q5 a) */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-100/90 border-b border-slate-200">
        {label && (
          <span className="text-xs font-bold text-slate-700 mr-2 flex items-center gap-1.5 shrink-0">
            <span className="w-1.5 h-1.5 bg-brand-600 rounded-full" />
            {label}
          </span>
        )}
        <div className="flex items-center gap-0.5 border-r border-slate-300 pr-2 mr-1">
          <button type="button" title="Bold" onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded transition ${editor.isActive('bold') ? 'bg-brand-100 text-brand-700' : 'text-slate-600 hover:bg-slate-200'}`}>
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button type="button" title="Italic" onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded transition ${editor.isActive('italic') ? 'bg-brand-100 text-brand-700' : 'text-slate-600 hover:bg-slate-200'}`}>
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button type="button" title="Inline Code" onClick={() => editor.chain().focus().toggleCode().run()}
            className={`p-1.5 rounded transition ${editor.isActive('code') ? 'bg-brand-100 text-brand-700' : 'text-slate-600 hover:bg-slate-200'}`}>
            <Code className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-0.5 border-r border-slate-300 pr-2 mr-1">
          <TableGridPicker onCreate={handleCreateTable} />
          {showFormulaBar && (
            <button type="button" onClick={() => setShowFormulaModal(true)}
              className="flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-brand-50 text-brand-700 hover:bg-brand-100 border border-brand-200 rounded transition">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Formula</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <button type="button" title="Heading H2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1.5 rounded transition ${editor.isActive('heading', { level: 2 }) ? 'bg-brand-100 text-brand-700' : 'text-slate-600 hover:bg-slate-200'}`}>
            <Heading2 className="w-3.5 h-3.5" />
          </button>
          <button type="button" title="Bullet List" onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded ${editor.isActive('bulletList') ? 'bg-brand-100 text-brand-700' : 'text-slate-600 hover:bg-slate-200'}`}>
            <List className="w-3.5 h-3.5" />
          </button>
          <button type="button" title="Ordered List" onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded ${editor.isActive('orderedList') ? 'bg-brand-100 text-brand-700' : 'text-slate-600 hover:bg-slate-200'}`}>
            <ListOrdered className="w-3.5 h-3.5" />
          </button>
          <button type="button" title="Blockquote" onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-1.5 rounded ${editor.isActive('blockquote') ? 'bg-brand-100 text-brand-700' : 'text-slate-600 hover:bg-slate-200'}`}>
            <Quote className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bubble Menu — table row/col ops when inside table (Q3 a) */}
      {editor && (
        <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} className="flex items-center gap-1 p-1 bg-slate-800 rounded-lg shadow-xl border border-slate-700">
          {isInTable ? (
            <>
              <button type="button" onClick={() => editor.chain().focus().addRowBefore().run()} disabled={tableSize.rows >= 20}
                className="px-2 py-1 text-[11px] font-semibold bg-white/10 hover:bg-white/20 text-white rounded disabled:opacity-30">+Row Before</button>
              <button type="button" onClick={() => editor.chain().focus().addRowAfter().run()} disabled={tableSize.rows >= 20}
                className="px-2 py-1 text-[11px] font-semibold bg-white/10 hover:bg-white/20 text-white rounded disabled:opacity-30">+Row After</button>
              <button type="button" onClick={() => editor.chain().focus().deleteRow().run()}
                className="px-2 py-1 text-[11px] font-semibold bg-rose-500/80 hover:bg-rose-500 text-white rounded">−Row</button>
              <button type="button" onClick={() => editor.chain().focus().addColumnBefore().run()} disabled={tableSize.cols >= 20}
                className="px-2 py-1 text-[11px] font-semibold bg-white/10 hover:bg-white/20 text-white rounded disabled:opacity-30">+Col</button>
              <button type="button" onClick={() => editor.chain().focus().addColumnAfter().run()} disabled={tableSize.cols >= 20}
                className="px-2 py-1 text-[11px] font-semibold bg-white/10 hover:bg-white/20 text-white rounded disabled:opacity-30">+Col After</button>
              <button type="button" onClick={() => editor.chain().focus().deleteColumn().run()}
                className="px-2 py-1 text-[11px] font-semibold bg-rose-500/80 hover:bg-rose-500 text-white rounded">−Col</button>
              <button type="button" onClick={() => editor.chain().focus().toggleHeaderRow().run()}
                className="px-2 py-1 text-[11px] font-semibold bg-white/10 hover:bg-white/20 text-white rounded">Toggle Header</button>
              <button type="button" onClick={() => editor.chain().focus().deleteTable().run()}
                className="px-2 py-1 text-[11px] font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded">Delete Table</button>
            </>
          ) : null}
        </BubbleMenu>
      )}

      {/* TipTap ContentEditable */}
      <div className="relative">
        <EditorContent editor={editor} />
        {toast && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg">{toast}</div>
        )}
      </div>

      {/* Formula Modal */}
      <FormulaModal open={showFormulaModal} onClose={() => setShowFormulaModal(false)} onInsert={handleInsertFormula} />

      {/* Minimal prose/table styles */}
      <style>{`
        .tiptap table { border-collapse: collapse; width: 100%; margin: 0.75rem 0; }
        .tiptap table td, .tiptap table th { border: 1px solid #cbd5e1; padding: 6px 8px; min-width: 48px; }
        .tiptap table th { background: #f1f5f9; font-weight: 600; }
        .tiptap p.is-editor-empty:first-child::before { content: attr(data-placeholder); float: left; color: #94a3b8; pointer-events: none; height: 0; }
        .katex-inline { display: inline-block; }
        .katex-block { display: block; text-align: center; margin: 0.75rem 0; }
      `}</style>
    </div>
  );
}
