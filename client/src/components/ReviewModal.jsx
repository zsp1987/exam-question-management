import React, { useState } from 'react';
import { CheckCircle2, XCircle, MessageSquare, Sparkles, X, Send } from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../api/client';
import MathRenderer from './MathRenderer';

const QUICK_COMMENTS = {
  APPROVE: [
    '考点明确，公式与排版严谨规范，解析详尽，审核通过。',
    '题干表述清晰无歧义，采分点标准，同意入库。',
    '难度适中，符合教学大纲与考纲要求，审核通过。'
  ],
  REJECT: [
    '参考答案过于简略，请补充标准排版步骤与采分要点。',
    '公式排版存在格式异常或下标不清晰，请修正后再送审。',
    '题干条件可能存在冗余或反例，请命题人仔细复核。',
    '选项中存在歧义，请调整干扰项设置。'
  ]
};

export default function ReviewModal({ question, onClose, onSuccess }) {
  const [action, setAction] = useState('APPROVE'); // 'APPROVE', 'REJECT'
  const [comment, setComment] = useState(QUICK_COMMENTS.APPROVE[0]);
  const [submitting, setSubmitting] = useState(false);

  const handleActionChange = (newAction) => {
    setAction(newAction);
    setComment(QUICK_COMMENTS[newAction][0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) {
      alert('请填写审核意见');
      return;
    }

    try {
      setSubmitting(true);
      await api.submitReviewDecision(question.id, action, comment.trim());
      
      if (action === 'APPROVE') {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }

      onSuccess(action);
      onClose();
    } catch (err) {
      alert('审核处理失败: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">考题评审与流转批注</h3>
              <p className="text-xs text-slate-500">
                出题人: {question.author_name || '教师'} · 版本: v{question.version_number || 1}
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

        {/* Question Title & Stem preview */}
        <div className="p-5 border-b border-slate-200 max-h-48 overflow-y-auto bg-slate-50/50 space-y-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">待审考题预览:</span>
          <div className="text-xs font-semibold text-slate-800">
            <MathRenderer content={question.title} />
          </div>
          <div className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
            <MathRenderer content={question.stem_rich_text} />
          </div>
        </div>

        {/* Review Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Action Radio Buttons */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">审核决定 (Decision):</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleActionChange('APPROVE')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-bold text-xs transition ${
                  action === 'APPROVE'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className={`w-4 h-4 ${action === 'APPROVE' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>通过审核 (Approve)</span>
              </button>

              <button
                type="button"
                onClick={() => handleActionChange('REJECT')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-bold text-xs transition ${
                  action === 'REJECT'
                    ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <XCircle className={`w-4 h-4 ${action === 'REJECT' ? 'text-rose-600' : 'text-slate-400'}`} />
                <span>驳回退回 (Reject)</span>
              </button>
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <span className="text-xs font-medium text-slate-500 mb-1.5 block">常用快捷评语:</span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_COMMENTS[action].map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setComment(preset)}
                  className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-left transition truncate max-w-full"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Comment Textarea */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-brand-600" />
              <span>评审意见与修改建议 (必填)</span>
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="请输入针对本考题的审核评语、修改意见或采纳依据..."
              className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white rounded-xl shadow-md transition ${
                action === 'APPROVE'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? '提交中...' : action === 'APPROVE' ? '确认通过' : '确认驳回'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
