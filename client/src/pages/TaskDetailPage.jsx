import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Send, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";

export default function TaskDetailPage({ taskId, onBack, onViewQuestion, onCreateQuestion }) {
  const { user } = useAuth();
  const { lang } = useI18n();
  const [task, setTask] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const isWriterAssignee = task && user && task.assignee_id === user.id;
  const isReviewer = user.role==='ADMIN' || user.role==='REVIEWER';
  const [submitting, setSubmitting] = useState(false);
  const [verdicts, setVerdicts] = useState({}); // questionId -> {verdict, comment}
  const [newDeadline, setNewDeadline] = useState("");

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await api.getTask(taskId);
      setTask(res.task);
      setQuestions(res.questions||[]);
    } catch(e){ console.error(e); } finally { setLoading(false); }
  };
  useEffect(()=>{ fetchDetail(); }, [taskId]);

  const handleSubmitTask = async () => {
    if(!confirm(lang==='en'?'Submit all task questions as a batch? (becomes PENDING, read-only)':'确定提交任务下全部题目（批量变为 PENDING，提交后只读）?')) return;
    try{ setSubmitting(true); await api.submitTask(taskId); fetchDetail(); }catch(e){ alert(e.message); }finally{ setSubmitting(false); }
  };
  const handleReview = async () => {
    const list = questions.map(q=>({ questionId: q.id, verdict: verdicts[q.id]?.verdict || 'ACCEPT', comment: verdicts[q.id]?.comment || '' }));
    const hasRevise = list.some(v=>v.verdict==='REVISE');
    if(hasRevise && !newDeadline) return alert(lang==='en'?'New deadline required when any REVISE':'存在 REVISE 时必须设置新 deadline');
    try{ await api.reviewTask(taskId, { verdicts: list, newDeadline: hasRevise ? newDeadline : undefined }); fetchDetail(); }catch(e){ alert(e.message); }
  };

  if(loading || !task) return <p className="text-xs text-slate-500 py-10 text-center">Loading...</p>;

  const canWriterSubmit = isWriterAssignee && task.status==='IN_PROGRESS' && questions.length >=1 && questions.length <= task.required_count;
  const canWriterCreate = isWriterAssignee && task.status==='IN_PROGRESS' && questions.length < task.required_count;
  const canReview = isReviewer && task.status==='IN_REVIEW';

  return (
    <div className="space-y-6 pb-12">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200"><ArrowLeft className="w-4 h-4" />{lang==='en'?'Back':'返回'}</button>
      <div className="bg-white rounded-xl p-5 border border-slate-200 space-y-3">
        <div className="flex flex-wrap justify-between gap-2">
          <h1 className="text-lg font-bold text-slate-900">{task.title}</h1>
          <span className={`px-2 py-1 text-xs font-bold rounded-full border ${task.status==='COMPLETED'?'bg-emerald-100 text-emerald-800 border-emerald-200':task.status==='IN_REVIEW'?'bg-amber-100 text-amber-800 border-amber-200':'bg-slate-100 text-slate-700 border-slate-200'}`}>{task.status}</span>
        </div>
        {task.description && <p className="text-xs text-slate-600">{task.description}</p>}
        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
          <span>Assignee: {task.assignee_name}</span>
          <span>Required: {questions.length}/{task.required_count}</span>
          <span>Deadline: {new Date(task.deadline).toLocaleDateString()}</span>
          {task.revision_deadline && <span>Revision: {new Date(task.revision_deadline).toLocaleDateString()}</span>}
          {task.subject && <span>Subject: {task.subject}</span>}
        </div>
        <div className="flex gap-2">
          {canWriterCreate && <button onClick={()=> onCreateQuestion(taskId)} className="px-3 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-xl flex items-center gap-1"><Plus className="w-3.5 h-3.5" />{lang==='en'?'Add Question':'添加题目'}</button>}
          {canWriterSubmit && <button disabled={submitting} onClick={handleSubmitTask} className="px-4 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded-xl flex items-center gap-1 disabled:opacity-50"><Send className="w-3.5 h-3.5" />{lang==='en'?'Submit Task':'提交任务'}</button>}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h3 className="text-xs font-bold text-slate-900">Questions ({questions.length}/{task.required_count})</h3>
        {questions.length===0 ? <p className="text-xs text-slate-500">No questions yet</p> : (
          <div className="space-y-2">
            {questions.map(q=> (
              <div key={q.id} className="p-3 border border-slate-200 rounded-xl flex gap-3 items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{q.title}</p>
                  <p className="text-xs text-slate-500">{q.type} · {q.status} · {q.subject}</p>
                </div>
                <button onClick={()=>onViewQuestion(q)} className="text-xs text-slate-600 hover:text-slate-900 underline">View</button>
                {canReview && (
                  <div className="flex items-center gap-1">
                    <select value={verdicts[q.id]?.verdict||'ACCEPT'} onChange={e=>setVerdicts(v=>({...v, [q.id]:{...(v[q.id]||{}), verdict:e.target.value}}))} className="px-2 py-1 text-xs border border-slate-300 rounded-lg">
                      <option value="ACCEPT">ACCEPT</option>
                      <option value="REJECT">REJECT</option>
                      <option value="REVISE">REVISE</option>
                    </select>
                    <input placeholder="comment" value={verdicts[q.id]?.comment||''} onChange={e=>setVerdicts(v=>({...v,[q.id]:{...(v[q.id]||{}), comment:e.target.value}}))} className="px-2 py-1 text-xs border border-slate-300 rounded-lg w-28" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {canReview && questions.length>0 && (
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <label className="text-xs font-semibold">New deadline (required if any REVISE)<input type="date" value={newDeadline} onChange={e=>setNewDeadline(e.target.value)} className="ml-2 px-2 py-1 text-xs border border-slate-300 rounded-lg" /></label>
            <button onClick={handleReview} className="px-4 py-2 text-xs font-bold bg-amber-600 text-white rounded-xl">Submit Batch Review</button>
          </div>
        )}
      </div>
    </div>
  );
}
