import React, { useState } from 'react';
import { Sigma, Table, Grid, Plus, Trash2, HelpCircle } from 'lucide-react';
import MathRenderer from './MathRenderer';
import { useI18n } from '../context/I18nContext';

const FORMULA_CATEGORIES = [
  {
    nameEn: 'Calculus & Limits',
    nameZh: '微积分与极限',
    items: [
      { label: 'Limit', latex: '\\lim_{x \\to 0} f(x)', desc: '$\\lim_{x \\to 0}$' },
      { label: 'Infinity', latex: '\\infty', desc: '$\\infty$' },
      { label: 'Definite Integral', latex: '\\int_{a}^{b} f(x) dx', desc: '$\\int_a^b$' },
      { label: 'Partial Derivative', latex: '\\frac{\\partial f}{\\partial x}', desc: '$\\frac{\\partial}{\\partial x}$' },
      { label: 'Summation', latex: '\\sum_{i=1}^{n} a_i', desc: '$\\sum_{i=1}^n$' },
      { label: 'Expectation', latex: '\\mathbb{E}[X]', desc: '$\\mathbb{E}[X]$' },
    ]
  },
  {
    nameEn: 'Cert & EVM Formulas',
    nameZh: '认证与工程计算',
    items: [
      { label: 'PMP CPI', latex: '\\text{CPI} = \\frac{EV}{AC}', desc: '$\\text{CPI} = \\frac{EV}{AC}$' },
      { label: 'PMP SPI', latex: '\\text{SPI} = \\frac{EV}{PV}', desc: '$\\text{SPI} = \\frac{EV}{PV}$' },
      { label: 'PMP EAC', latex: '\\text{EAC} = \\frac{BAC}{\\text{CPI}}', desc: '$\\text{EAC} = \\frac{BAC}{\\text{CPI}}$' },
      { label: 'Network Latency', latex: '\\tau_{\\text{repl}} \\le 50\\text{ms}', desc: '$\\tau \\le 50\\text{ms}$' },
      { label: 'Big-O Bound', latex: '\\mathcal{O}(n \\log n)', desc: '$\\mathcal{O}(n \\log n)$' },
      { label: 'Diffie-Hellman', latex: 'g^{ab} \\pmod p', desc: '$g^{ab} \\pmod p$' },
    ]
  },
  {
    nameEn: 'Matrix & Cases',
    nameZh: '矩阵与分段',
    items: [
      { 
        label: '2x2 Matrix', 
        latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', 
        desc: '$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$' 
      },
      { 
        label: '3x3 Matrix', 
        latex: '\\begin{pmatrix} a_{11} & a_{12} & a_{13} \\\\ a_{21} & a_{22} & a_{23} \\\\ a_{31} & a_{32} & a_{33} \\end{pmatrix}', 
        desc: '3x3 Matrix' 
      },
      { 
        label: 'Piecewise', 
        latex: 'f(x) = \\begin{cases} x^2, & x \\ge 0 \\\\ -x, & x < 0 \\end{cases}', 
        desc: 'Piecewise' 
      },
      { label: 'Vector', latex: '\\vec{v}', desc: '$\\vec{v}$' },
    ]
  },
  {
    nameEn: 'Greek & Symbols',
    nameZh: '希腊字母与符号',
    items: [
      { label: 'alpha', latex: '\\alpha', desc: '$\\alpha$' },
      { label: 'beta', latex: '\\beta', desc: '$\\beta$' },
      { label: 'delta', latex: '\\delta', desc: '$\\delta$' },
      { label: 'lambda', latex: '\\lambda', desc: '$\\lambda$' },
      { label: 'sigma', latex: '\\sigma', desc: '$\\sigma$' },
      { label: 'tau', latex: '\\tau', desc: '$\\tau$' },
      { label: 'implies', latex: '\\implies', desc: '$\\implies$' },
      { label: 'approx', latex: '\\approx', desc: '$\\approx$' },
    ]
  }
];

export default function FormulaToolbar({ onInsertLatex, onInsertTable }) {
  const { lang, t } = useI18n();
  const [activeTab, setActiveTab] = useState(0);
  const [isBlockMode, setIsBlockMode] = useState(false);
  const [showTablePicker, setShowTablePicker] = useState(false);

  // Hover Grid dimensions (up to 8x8)
  const [hoverGrid, setHoverGrid] = useState({ rows: 3, cols: 3 });

  const handleItemClick = (latex) => {
    const formatted = isBlockMode ? `\n$$${latex}$$\n` : `$${latex}$`;
    onInsertLatex(formatted);
  };

  const handleCreateGridTable = (rows, cols) => {
    let tableHtml = '\n<table class="min-w-full border border-slate-300 text-sm my-2">\n  <thead>\n    <tr class="bg-slate-100">\n';
    for (let c = 1; c <= cols; c++) {
      tableHtml += `      <th class="border p-2">Header ${c}</th>\n`;
    }
    tableHtml += '    </tr>\n  </thead>\n  <tbody>\n';
    for (let r = 1; r <= rows; r++) {
      tableHtml += '    <tr>\n';
      for (let c = 1; c <= cols; c++) {
        tableHtml += `      <td class="border p-2">Item (${r},${c})</td>\n`;
      }
      tableHtml += '    </tr>\n';
    }
    tableHtml += '  </tbody>\n</table>\n';
    onInsertTable(tableHtml);
    setShowTablePicker(false);
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 my-2 shadow-xs text-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Sigma className="w-4 h-4 text-brand-600" />
          <span className="text-xs font-semibold text-slate-700">
            {lang === 'en' ? 'LaTeX Formula & Dynamic Table Engine' : 'LaTeX 数学公式与动态表格生成引擎'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1 text-xs cursor-pointer text-slate-600 hover:text-slate-900 select-none">
            <input
              type="checkbox"
              checked={isBlockMode}
              onChange={(e) => setIsBlockMode(e.target.checked)}
              className="rounded text-brand-600 focus:ring-brand-500 w-3.5 h-3.5"
            />
            <span>{t('blockMath')}</span>
          </label>

          {/* Visual Grid Drag/Hover Table Picker Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTablePicker(!showTablePicker)}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded border transition ${
                showTablePicker
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'text-slate-700 bg-white border-slate-300 hover:bg-slate-100'
              }`}
            >
              <Table className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t('insertTable')} (Grid)</span>
            </button>

            {/* Visual Grid Selector Popup */}
            {showTablePicker && (
              <div className="absolute right-0 mt-2 z-50 bg-white rounded-xl shadow-2xl border border-slate-200 p-3.5 w-64 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-800">
                    {t('dragTableGrid')}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                    {hoverGrid.rows} × {hoverGrid.cols}
                  </span>
                </div>

                {/* 8x8 Grid of cells */}
                <div className="grid grid-cols-8 gap-1.5 p-1 bg-slate-50 rounded-lg border border-slate-200">
                  {Array.from({ length: 8 }).map((_, r) =>
                    Array.from({ length: 8 }).map((_, c) => {
                      const rowIdx = r + 1;
                      const colIdx = c + 1;
                      const isHovered = rowIdx <= hoverGrid.rows && colIdx <= hoverGrid.cols;
                      return (
                        <div
                          key={`${r}-${c}`}
                          onMouseEnter={() => setHoverGrid({ rows: rowIdx, cols: colIdx })}
                          onClick={() => handleCreateGridTable(hoverGrid.rows, hoverGrid.cols)}
                          className={`w-5 h-5 rounded cursor-pointer transition ${
                            isHovered
                              ? 'bg-emerald-500 border border-emerald-600 shadow-2xs scale-105'
                              : 'bg-white border border-slate-200 hover:border-slate-400'
                          }`}
                        />
                      );
                    })
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowTablePicker(false)}
                    className="text-[11px] text-slate-400 hover:text-slate-600"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCreateGridTable(hoverGrid.rows, hoverGrid.cols)}
                    className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-xs hover:bg-emerald-700"
                  >
                    {t('genTable')} ({hoverGrid.rows}×{hoverGrid.cols})
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-1 mt-2.5">
        {FORMULA_CATEGORIES.map((cat, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setActiveTab(idx)}
            className={`px-2.5 py-1 text-xs rounded font-medium transition ${
              activeTab === idx
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            {lang === 'en' ? cat.nameEn : cat.nameZh}
          </button>
        ))}
      </div>

      {/* Formula Buttons Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5 mt-2.5 max-h-40 overflow-y-auto p-1 bg-white rounded border border-slate-200">
        {FORMULA_CATEGORIES[activeTab].items.map((item, idx) => (
          <button
            key={idx}
            type="button"
            title={`Insert: ${item.latex}`}
            onClick={() => handleItemClick(item.latex)}
            className="flex items-center justify-center p-1.5 rounded border border-slate-100 hover:border-brand-300 hover:bg-brand-50 text-slate-700 text-xs transition group"
          >
            <div className="text-center truncate">
              <MathRenderer content={item.desc} className="text-xs pointer-events-none scale-90" />
              <span className="text-[10px] text-slate-600 block mt-0.5">{item.label}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
