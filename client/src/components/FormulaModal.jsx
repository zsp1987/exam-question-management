import React, { useState, useMemo } from 'react';
import katex from 'katex';
import { X } from 'lucide-react';
import FormulaToolbar from './FormulaToolbar';

export default function FormulaModal({ open, onClose, onInsert }) {
  const [latex, setLatex] = useState('E = mc^2');
  const [block, setBlock] = useState(false);
  const preview = useMemo(() => {
    try { return katex.renderToString(latex, { displayMode: block, throwOnError: false }); } catch(e){ return '<span class="text-rose-600">Invalid LaTeX</span>'; }
  }, [latex, block]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] overflow-auto p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900">Insert LaTeX Formula</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-700">LaTeX Source</label>
            <textarea value={latex} onChange={e=>setLatex(e.target.value)} rows={3} className="w-full mt-1 px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none" placeholder="e.g. \\int_{0}^{\\infty} e^{-x^2} dx" />
            <label className="flex items-center gap-2 mt-2 text-xs">
              <input type="checkbox" checked={block} onChange={e=>setBlock(e.target.checked)} className="rounded" />
              <span>Block mode (centered $$...$$)</span>
            </label>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-700 mb-1">Live Preview</div>
            <div className="min-h-[60px] p-4 bg-slate-50 rounded-xl border border-slate-200 overflow-auto" dangerouslySetInnerHTML={{__html: preview}} />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-700 mb-1">Symbol Palette</div>
            <FormulaToolbar onInsertLatex={(txt)=>{
              // txt is like $latex$ or $$latex$$ - extract inner
              const inner = txt.replace(/^\$\$?/, '').replace(/\$\$?$/, '');
              setLatex(l => l ? l + ' ' + inner : inner);
            }} onInsertTable={()=>{}} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-lg">Cancel</button>
            <button onClick={()=>{ if(!latex.trim()) return; onInsert(latex.trim(), block); onClose(); }} className="px-5 py-2 text-xs font-bold bg-brand-600 text-white rounded-lg">Insert Formula</button>
          </div>
        </div>
      </div>
    </div>
  );
}
