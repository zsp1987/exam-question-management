import { useEffect, useState } from "react";
import { ClipboardList, Plus, Calendar, Users, AlertCircle, CheckCircle2, Clock, Eye } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";

export default function TasksPage({ onViewTask }) {
  const { user, isAdmin, isReviewer } = useAuth();
  const { t, lang } = useI18n();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  // create form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [requiredCount, setRequiredCount] = useState(5);
  const [deadline, setDeadline] = useState("");
  const [subject, setSubject] = useState("");
  const [writers, setWriters] = useState([]);

  const canCreate = isAdmin || isReviewer;

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await api.getTasks();
      setTasks(res.tasks || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };
  useEffect(() => { fetchTasks(); }, []);
  useEffect(() => {
    if (canCreate) {
      api.getAdminUsers().then(r=> setWriters((r.users||[]).filter(u=>u.role==='WRITER'||u.role==='TEACHER'))).catch(()=>{});
    }
  }, [canCreate]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if(!title.trim()||!assigneeId||!deadline) return alert(lang==='en'?"Missing fields":"Missing required fields");
    try {
      await api.createTask({ title: title.trim(), description, assignee_id: assigneeId, required_count: Number(requiredCount), deadline, subject: subject||undefined });
      setTitle(""); setDescription(""); setAssigneeId(""); setDeadline(""); setSubject("");
      setShowCreate(false);
      fetchTasks();
    } catch(err){ alert(err.message); }
  };

  const statusBadge = (s, overdue) => {
    if(s==='COMPLETED') return <span className="px-2 py-0.5 text-[11px] font-bold bg-emerald-100 text-emerald-800 rounded-full">Completed</span>;
    if(s==='IN_REVIEW') return <span className="px-2 py-0.5 text-[11px] font-bold bg-amber-100 text-amber-800 rounded-full">In Review</span>;
    return <span className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${overdue?'bg-rose-100 text-rose-800 border border-rose-200':'bg-slate-100 text-slate-700 border border-slate-200'}`}>{overdue?'Overdue':'In Progress'}</span>;
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white rounded-xl p-5 border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2"><ClipboardList className="w-5 h-5 text-slate-900" />{lang==='en'?'Tasks':'任务'}</h1>
          <p className="text-xs text-slate-500">{lang==='en'?'Reviewer assigns, writer fulfills, submit batch, review batch':'Reviewer/ADMIN 分配任务，Writer 在任务内创建并提交，Reviewer 批量评审'}</p>
        </div>
        {canCreate && (
          <button onClick={()=>setShowCreate(!showCreate)} className="px-4 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl flex items-center gap-1.5"><Plus className="w-4 h-4" />{showCreate? (lang==='en'?'Close':'关闭') : (lang==='en'?'New Task':'新建任务')}</button>
        )}
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl p-5 border border-slate-200 space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">Title *<input value={title} onChange={e=>setTitle(e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl" required /></label>
            <label className="block">Assignee (Writer) *<select value={assigneeId} onChange={e=>setAssigneeId(e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl" required><option value="">{lang==='en'?'Select Writer':'选择 Writer'}</option>{writers.map(w=><option key={w.id} value={w.id}>{w.name} ({w.username})</option>)}</select></label>
            <label className="block">Required count *<input type="number" min={1} max={100} value={requiredCount} onChange={e=>setRequiredCount(e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl" required /></label>
            <label className="block">Deadline *<input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl" required /></label>
            <label className="block">Subject (optional)<input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="AWS Certified Solutions Architect" className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl" /></label>
            <label className="block sm:col-span-2">Description<textarea value={description} onChange={e=>setDescription(e.target.value)} rows={2} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl" /></label>
          </div>
          <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold">Create Task</button>
        </form>
      )}

      {loading ? <p className="text-xs text-slate-500 py-10 text-center">Loading...</p> : tasks.length===0 ? (
        <div className="bg-white rounded-xl p-10 text-center border border-slate-200 text-xs text-slate-500">{lang==='en'?'No tasks':'暂无任务'}</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {tasks.map(t => (
            <div key={t.id} onClick={()=>onViewTask(t)} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 hover:shadow cursor-pointer">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-sm text-slate-900 line-clamp-2">{t.title}</h3>
                {statusBadge(t.status, t.isOverdue)}
              </div>
              {t.description && <p className="text-xs text-slate-600 line-clamp-2">{t.description}</p>}
              <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{t.assignee_name || t.assignee_id.slice(0,8)}</span>
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(t.deadline).toLocaleDateString()} {t.isOverdue && <AlertCircle className="w-3 h-3 text-rose-500" />}</span>
                <span className="flex items-center gap-1"><ClipboardList className="w-3.5 h-3.5" />{t.current_count}/{t.required_count}</span>
                {t.subject && <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[11px]">{t.subject}</span>}
              </div>
              <div className="flex justify-end">
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700"><Eye className="w-3.5 h-3.5" />View</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
