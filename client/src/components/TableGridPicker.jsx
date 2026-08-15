import React, { useState } from 'react';

export default function TableGridPicker({ onCreate }) {
  const [hover, setHover] = useState({ r: 3, c: 3 });
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded border transition ${open ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'}`}>
        Table ▾
      </button>
      {open && (
        <div className="absolute left-0 mt-2 z-50 bg-white rounded-xl shadow-2xl border border-slate-200 p-3 w-64">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-800">Select Table Size</span>
            <span className="text-[11px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">{hover.r} × {hover.c}</span>
          </div>
          <div className="grid grid-cols-8 gap-1 p-1 bg-slate-50 rounded-lg border border-slate-200">
            {Array.from({length:8}).map((_,r)=> Array.from({length:8}).map((_,c)=>{
              const ri=r+1, ci=c+1, active=ri<=hover.r && ci<=hover.c;
              return <div key={`${r}-${c}`} onMouseEnter={()=>setHover({r:ri,c:ci})} onClick={()=>{ onCreate(hover.r, hover.c); setOpen(false); }}
                className={`w-5 h-5 rounded cursor-pointer transition ${active ? 'bg-emerald-500 border border-emerald-600 scale-105' : 'bg-white border border-slate-200'}`} />;
            }))}
          </div>
          <div className="mt-3 flex justify-between pt-2 border-t border-slate-100">
            <button type="button" onClick={()=>setOpen(false)} className="text-[11px] text-slate-400 hover:text-slate-600">Cancel</button>
            <button type="button" onClick={()=>{ onCreate(hover.r, hover.c); setOpen(false); }} className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold">Generate ({hover.r}×{hover.c})</button>
          </div>
        </div>
      )}
    </div>
  );
}
