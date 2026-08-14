import React, { useState, useEffect } from 'react';
import { GitCompare, History, ArrowRight, RotateCcw, X, Check, AlertCircle } from 'lucide-react';
import MathRenderer from './MathRenderer';
import { api } from '../api/client';

export default function VersionDiffModal({ question, onClose, onRollbackSuccess }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [v1Id, setV1Id] = useState('');
  const [v2Id, setV2Id] = useState('');
  const [v1Data, setV1Data] = useState(null);
  const [v2Data, setV2Data] = useState(null);
  const [rollbackLoading, setRollbackLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadVersions() {
      try {
        setLoading(true);
        const res = await api.getVersions(question.id);
        const list = res.versions || [];
        setVersions(list);

        if (list.length > 0) {
          // Default: compare latest version (list[0]) with previous version (list[1] or list[0])
          const latest = list[0];
          const prev = list.length > 1 ? list[1] : list[0];
          setV1Id(prev.id);
          setV2Id(latest.id);
          setV1Data(prev);
          setV2Data(latest);
        }
      } catch (err) {
        setError('获取版本历史失败: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    loadVersions();
  }, [question.id]);

  const handleV1Change = async (id) => {
    setV1Id(id);
    const found = versions.find(v => v.id === id);
    if (found) setV1Data(found);
  };

  const handleV2Change = async (id) => {
    setV2Id(id);
    const found = versions.find(v => v.id === id);
    if (found) setV2Data(found);
  };

  const handleRollback = async (targetVersion) => {
    if (!window.confirm(`确定将考题回退至版本 v${targetVersion.version_number} 吗？系统将创建一个新的递增版本。`)) {
      return;
    }
    try {
      setRollbackLoading(true);
      await api.rollbackVersion(question.id, targetVersion.id);
      alert(`已成功回滚至版本 v${targetVersion.version_number}`);
      if (onRollbackSuccess) onRollbackSuccess();
      onClose();
    } catch (err) {
      alert('回滚失败: ' + err.message);
    } finally {
      setRollbackLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center">
              <GitCompare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">考题版本变更对比 (Visual Diff)</h3>
              <p className="text-xs text-slate-500">
                对比不同快照版本在题干、选项、答案与解析上的演变细节
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">正在加载版本快照...</div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 text-sm flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Version Selectors Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">对比基准版本 (A):</span>
                <select
                  value={v1Id}
                  onChange={(e) => handleV1Change(e.target.value)}
                  className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg shadow-2xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                >
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      v{v.version_number} - {v.change_summary || '未命名'} ({new Date(v.created_at).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 text-slate-400">
                <ArrowRight className="w-4 h-4" />
                <span className="text-xs font-bold text-brand-600">VS</span>
                <ArrowRight className="w-4 h-4" />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">目标版本 (B):</span>
                <select
                  value={v2Id}
                  onChange={(e) => handleV2Change(e.target.value)}
                  className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg shadow-2xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                >
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      v{v.version_number} - {v.change_summary || '未命名'} ({new Date(v.created_at).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Side-by-Side Comparison Panels */}
            {v1Data && v2Data && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: Version 1 Panel */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-xs font-bold bg-slate-200 text-slate-800 rounded">
                        版本 v{v1Data.version_number}
                      </span>
                      <span className="text-xs text-slate-500">{v1Data.author_name || '作者'}</span>
                    </div>
                    <button
                      type="button"
                      disabled={rollbackLoading}
                      onClick={() => handleRollback(v1Data)}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>回滚至此版本</span>
                    </button>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase">变更原因 / 备注:</span>
                    <p className="text-xs text-slate-700 font-medium">{v1Data.change_summary || '无'}</p>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase">考题标题:</span>
                    <div className="mt-1 p-2 bg-white rounded border border-slate-200 text-xs text-slate-800">
                      <MathRenderer content={v1Data.title} />
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase">题干内容与排版:</span>
                    <div className="mt-1 p-3 bg-white rounded border border-slate-200 text-xs text-slate-800">
                      <MathRenderer content={v1Data.stem_rich_text} />
                    </div>
                  </div>

                  {v1Data.options && v1Data.options.length > 0 && (
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase">选项列表:</span>
                      <div className="mt-1 space-y-1">
                        {v1Data.options.map((opt, idx) => (
                          <div key={idx} className={`p-2 rounded text-xs border flex items-start gap-2 ${opt.is_correct ? 'bg-emerald-50 border-emerald-300 font-semibold text-emerald-900' : 'bg-white border-slate-200'}`}>
                            <span className="font-bold">{opt.key}.</span>
                            <div className="flex-1"><MathRenderer content={opt.text} /></div>
                            {opt.is_correct && <span className="text-[10px] text-emerald-600 font-bold shrink-0">✓ 正确答案</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {v1Data.explanation_rich_text && (
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase">解析与考点:</span>
                      <div className="mt-1 p-2 bg-white rounded border border-slate-200 text-xs text-slate-700">
                        <MathRenderer content={v1Data.explanation_rich_text} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Version 2 Panel */}
                <div className="border-2 border-brand-200 rounded-xl p-4 bg-brand-50/20 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-brand-200">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-xs font-bold bg-brand-600 text-white rounded">
                        版本 v{v2Data.version_number} (当前目标)
                      </span>
                      <span className="text-xs text-slate-500">{v2Data.author_name || '作者'}</span>
                    </div>
                    {v2Data.version_number !== question.version_number && (
                      <button
                        type="button"
                        disabled={rollbackLoading}
                        onClick={() => handleRollback(v2Data)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>回滚至此版本</span>
                      </button>
                    )}
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase">变更原因 / 备注:</span>
                    <p className="text-xs text-brand-900 font-medium">{v2Data.change_summary || '无'}</p>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase">考题标题:</span>
                    <div className="mt-1 p-2 bg-white rounded border border-brand-200 text-xs text-slate-800">
                      <MathRenderer content={v2Data.title} />
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase">题干内容与排版:</span>
                    <div className="mt-1 p-3 bg-white rounded border border-brand-200 text-xs text-slate-800">
                      <MathRenderer content={v2Data.stem_rich_text} />
                    </div>
                  </div>

                  {v2Data.options && v2Data.options.length > 0 && (
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase">选项列表:</span>
                      <div className="mt-1 space-y-1">
                        {v2Data.options.map((opt, idx) => (
                          <div key={idx} className={`p-2 rounded text-xs border flex items-start gap-2 ${opt.is_correct ? 'bg-emerald-50 border-emerald-300 font-semibold text-emerald-900' : 'bg-white border-slate-200'}`}>
                            <span className="font-bold">{opt.key}.</span>
                            <div className="flex-1"><MathRenderer content={opt.text} /></div>
                            {opt.is_correct && <span className="text-[10px] text-emerald-600 font-bold shrink-0">✓ 正确答案</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {v2Data.explanation_rich_text && (
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase">解析与考点:</span>
                      <div className="mt-1 p-2 bg-white rounded border border-brand-200 text-xs text-slate-700">
                        <MathRenderer content={v2Data.explanation_rich_text} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
          <span>共记录 {versions.length} 个历史版本快照</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition"
          >
            关闭对比
          </button>
        </div>
      </div>
    </div>
  );
}
