const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const { sanitizeHtml } = require('../utils/sanitize');

function isWriterRole(role){ return role === 'WRITER' || role === 'TEACHER'; }

function canViewTasks(user){
  if(user.role === 'ADMIN' || user.role === 'REVIEWER') return true;
  if(isWriterRole(user.role)) return true;
  return false;
}

router.get('/', authenticateToken, (req, res) => {
  const user = req.user;
  if(!canViewTasks(user)) return res.status(403).json({ error: 'Forbidden: insufficient permissions for tasks' });
  let rows;
  if(user.role === 'ADMIN' || user.role === 'REVIEWER'){
    rows = db.prepare(`
      SELECT t.*, u1.name as creator_name, u2.name as assignee_name, u2.username as assignee_username,
        (SELECT COUNT(*) FROM questions q WHERE q.task_id = t.id AND q.deleted_at IS NULL) as current_count
      FROM tasks t
      LEFT JOIN users u1 ON t.created_by = u1.id
      LEFT JOIN users u2 ON t.assignee_id = u2.id
      ORDER BY t.created_at DESC`).all();
  } else {
    rows = db.prepare(`
      SELECT t.*, u1.name as creator_name, u2.name as assignee_name, u2.username as assignee_username,
        (SELECT COUNT(*) FROM questions q WHERE q.task_id = t.id AND q.deleted_at IS NULL) as current_count
      FROM tasks t
      LEFT JOIN users u1 ON t.created_by = u1.id
      LEFT JOIN users u2 ON t.assignee_id = u2.id
      WHERE t.assignee_id = ?
      ORDER BY t.created_at DESC`).all(user.id);
  }
  const tasks = rows.map(r => {
    let tb=null; try{ tb= r.type_breakdown ? JSON.parse(r.type_breakdown) : null; }catch(e){}
    const overdue = r.status !== 'COMPLETED' && r.deadline && new Date(r.deadline) < new Date();
    return { ...r, type_breakdown: tb, isOverdue: overdue };
  });
  res.json({ tasks });
});

router.get('/:id', authenticateToken, (req, res) => {
  const user = req.user;
  if(!canViewTasks(user)) return res.status(403).json({ error: 'Forbidden' });
  const task = db.prepare('SELECT t.*, u1.name as creator_name, u2.name as assignee_name FROM tasks t LEFT JOIN users u1 ON t.created_by=u1.id LEFT JOIN users u2 ON t.assignee_id=u2.id WHERE t.id=?').get(req.params.id);
  if(!task) return res.status(404).json({ error: 'Task not found' });
  if(isWriterRole(user.role) && user.role !== 'ADMIN' && user.role !== 'REVIEWER' && task.assignee_id !== user.id){
    return res.status(403).json({ error: 'Forbidden: not your task' });
  }
  let tb=null; try{ tb= task.type_breakdown ? JSON.parse(task.type_breakdown) : null; }catch(e){}
  const questions = db.prepare(`SELECT q.*, qv.title, qv.stem_rich_text, qv.options_json, qv.standard_answer_rich_text, qv.version_number FROM questions q JOIN question_versions qv ON q.current_version_id=qv.id WHERE q.task_id=? AND q.deleted_at IS NULL ORDER BY q.created_at ASC`).all(task.id);
  const formatted = questions.map(q=>{ let opts=[]; try{opts=JSON.parse(q.options_json||'[]')}catch(e){}; return {...q, options:opts, stem_rich_text: sanitizeHtml(q.stem_rich_text)}; });
  const counts = db.prepare(`SELECT type, COUNT(*) as c FROM questions WHERE task_id=? AND deleted_at IS NULL GROUP BY type`).all(task.id);
  const current_count = questions.length;
  const overdue = task.status !== 'COMPLETED' && task.deadline && new Date(task.deadline) < new Date();
  res.json({ task: { ...task, type_breakdown: tb, current_count, isOverdue: overdue, type_counts: counts }, questions: formatted });
});

router.post('/', authenticateToken, requireRole(['ADMIN','REVIEWER']), (req, res) => {
  const { title, description='', assignee_id, required_count, subject, category, type_breakdown, difficulty_min, difficulty_max, target_exam_folder_id, deadline } = req.body;
  if(!title || !title.trim()) return res.status(400).json({ error: 'Task title required' });
  if(!assignee_id) return res.status(400).json({ error: 'assignee_id required (single WRITER target)' });
  const assignee = db.prepare('SELECT * FROM users WHERE id=?').get(assignee_id);
  if(!assignee) return res.status(404).json({ error: 'Assignee not found' });
  if(!isWriterRole(assignee.role)) return res.status(400).json({ error: 'Assignee must be a WRITER' });
  const rc = parseInt(required_count,10);
  if(!rc || rc < 1 || rc > 100) return res.status(400).json({ error: 'required_count 1..100 required' });
  if(!deadline) return res.status(400).json({ error: 'deadline required (ISO)' });
  const d = new Date(deadline);
  if(isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid deadline' });
  if(type_breakdown){
    const allowed=['SINGLE_CHOICE','MULTIPLE_CHOICE','ESSAY'];
    if(typeof type_breakdown !== 'object') return res.status(400).json({ error: 'type_breakdown must be object' });
    for(const k of Object.keys(type_breakdown)){
      if(!allowed.includes(k)) return res.status(400).json({ error: `Invalid type in type_breakdown: ${k}` });
      if(type_breakdown[k] <0) return res.status(400).json({ error: 'type_breakdown counts >=0' });
    }
    const sum = Object.values(type_breakdown).reduce((a,b)=>a+Number(b||0),0);
    if(sum > rc) return res.status(400).json({ error: 'type_breakdown sum exceeds required_count' });
  }
  if(difficulty_min != null && (difficulty_min <1 || difficulty_min>5)) return res.status(400).json({ error: 'difficulty_min 1..5' });
  if(difficulty_max != null && (difficulty_max <1 || difficulty_max>5)) return res.status(400).json({ error: 'difficulty_max 1..5' });
  if(difficulty_min != null && difficulty_max != null && difficulty_min > difficulty_max) return res.status(400).json({ error: 'difficulty_min > difficulty_max' });
  if(target_exam_folder_id){
    const ex=db.prepare('SELECT id FROM exams WHERE id=?').get(target_exam_folder_id);
    if(!ex) return res.status(404).json({ error: 'target_exam_folder not found' });
  }
  const id=uuidv4();
  db.prepare(`INSERT INTO tasks (id, title, description, created_by, assignee_id, status, required_count, subject, category, type_breakdown, difficulty_min, difficulty_max, target_exam_folder_id, deadline) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, title.trim(), description||null, req.user.id, assignee_id, 'IN_PROGRESS', rc, subject||null, category||null, type_breakdown? JSON.stringify(type_breakdown):null, difficulty_min||null, difficulty_max||null, target_exam_folder_id||null, d.toISOString()
  );
  logAudit(req.user.id, req.user.username, 'CREATE_TASK', 'TASK', id, `Created task ${title} for ${assignee.name} (x${rc}, deadline ${d.toISOString()})`);
  const created=db.prepare('SELECT * FROM tasks WHERE id=?').get(id);
  res.status(201).json({ task: created });
});

router.post('/:id/questions', authenticateToken, (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id=?').get(req.params.id);
  if(!task) return res.status(404).json({ error: 'Task not found' });
  if(task.status !== 'IN_PROGRESS') return res.status(400).json({ error: `Task not in progress (status ${task.status})` });
  if(!isWriterRole(req.user.role)) return res.status(403).json({ error: 'Only WRITER can create task questions' });
  if(req.user.id !== task.assignee_id) return res.status(403).json({ error: 'Only assignee writer can create in this task' });
  const cur=db.prepare('SELECT COUNT(*) as c FROM questions WHERE task_id=? AND deleted_at IS NULL').get(task.id).c;
  if(cur >= task.required_count) return res.status(400).json({ error: `Task cap reached (${task.required_count}), cannot add more` });
  const { type='SINGLE_CHOICE', difficulty=3, subject, title, stem_rich_text, options=[], standard_answer_rich_text='', explanation_rich_text='', katex_source='', tagIds=[], category } = req.body;
  if(!title || !title.trim()) return res.status(400).json({ error: 'title required' });
  if(!stem_rich_text || !stem_rich_text.trim()) return res.status(400).json({ error: 'stem required' });
  if(task.subject && subject && subject !== task.subject) return res.status(400).json({ error: `subject must match task subject ${task.subject}` });
  if(task.category && category && category !== task.category) return res.status(400).json({ error: `category must match task category` });
  if(task.difficulty_min != null && difficulty < task.difficulty_min) return res.status(400).json({ error: `difficulty below task min ${task.difficulty_min}` });
  if(task.difficulty_max != null && difficulty > task.difficulty_max) return res.status(400).json({ error: `difficulty above task max ${task.difficulty_max}` });
  if(task.type_breakdown){
    let tb; try{ tb=JSON.parse(task.type_breakdown); }catch(e){ tb=null; }
    if(tb){
      const existing= db.prepare('SELECT type, COUNT(*) as c FROM questions WHERE task_id=? AND deleted_at IS NULL GROUP BY type').all(task.id);
      const counts={};
      existing.forEach(r=> counts[r.type]=r.c);
      counts[type] = (counts[type]||0)+1;
      for(const k of Object.keys(tb)){
        if((counts[k]||0) > tb[k]) return res.status(400).json({ error: `Type ${k} exceeds task allocation ${tb[k]}` });
      }
    }
  }
  if(type==='SINGLE_CHOICE' || type==='MULTIPLE_CHOICE'){
    if(!Array.isArray(options) || options.length<2) return res.status(400).json({ error: 'choice needs 2+ options' });
    if(!options.some(o=>o.is_correct)) return res.status(400).json({ error: 'choice needs correct option' });
  }
  const cleanStem=sanitizeHtml(stem_rich_text);
  const cleanAns=sanitizeHtml(standard_answer_rich_text);
  const cleanExp=sanitizeHtml(explanation_rich_text);
  const qid=uuidv4(), vid=uuidv4();
  const effSubject= subject || task.subject || 'AWS Certified Solutions Architect';
  db.prepare(`INSERT INTO questions (id, current_version_id, type, status, difficulty, subject, author_id, task_id) VALUES (?,?,?,?,?,?,?,?)`).run(qid, vid, type, 'DRAFT', difficulty, effSubject, req.user.id, task.id);
  db.prepare(`INSERT INTO question_versions (id, question_id, version_number, title, stem_rich_text, options_json, standard_answer_rich_text, explanation_rich_text, katex_source, change_summary, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(vid, qid, 1, title.trim(), cleanStem, JSON.stringify(options), cleanAns, cleanExp, katex_source||null, 'Task question', req.user.id);
  if(Array.isArray(tagIds) && tagIds.length){
    const st=db.prepare('INSERT INTO question_tags (question_id, tag_id) VALUES (?,?)');
    tagIds.forEach(t=>{ try{st.run(qid,t);}catch(e){}});
  }
  logAudit(req.user.id, req.user.username, 'CREATE_TASK_QUESTION', 'QUESTION', qid, `Task ${task.id} create question ${title}`);
  const created=db.prepare('SELECT q.*, qv.title, qv.stem_rich_text, qv.options_json, qv.version_number FROM questions q JOIN question_versions qv ON q.current_version_id=qv.id WHERE q.id=?').get(qid);
  res.status(201).json({ question: created });
});

router.post('/:id/submit', authenticateToken, (req, res) => {
  const task=db.prepare('SELECT * FROM tasks WHERE id=?').get(req.params.id);
  if(!task) return res.status(404).json({ error: 'Task not found' });
  if(task.status !== 'IN_PROGRESS') return res.status(400).json({ error: `Task not in progress (${task.status})` });
  if(req.user.id !== task.assignee_id) return res.status(403).json({ error: 'Only assignee can submit' });
  const count=db.prepare('SELECT COUNT(*) as c FROM questions WHERE task_id=? AND deleted_at IS NULL').get(task.id).c;
  if(count < 1) return res.status(400).json({ error: 'Task has no questions to submit' });
  if(count > task.required_count) return res.status(400).json({ error: 'Task exceeds required_count' });
  const drafts=db.prepare('SELECT id, current_version_id FROM questions WHERE task_id=? AND status=? AND deleted_at IS NULL').all(task.id, 'DRAFT');
  if(drafts.length !== count) return res.status(400).json({ error: 'All task questions must be DRAFT to submit (some not DRAFT)' });
  const tx=db.transaction(()=>{
    db.prepare('UPDATE tasks SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run('IN_REVIEW', task.id);
    drafts.forEach(q=>{
      db.prepare('UPDATE questions SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run('PENDING_REVIEW', q.id);
      db.prepare('INSERT INTO review_records (id, question_id, version_id, reviewer_id, action, comment) VALUES (?,?,?,?,?,?)').run(uuidv4(), q.id, q.current_version_id, req.user.id, 'SUBMIT', `Task ${task.id} submit`);
    });
  });
  tx();
  logAudit(req.user.id, req.user.username, 'SUBMIT_TASK', 'TASK', task.id, `Submitted task ${task.title} (${count} questions bulk PENDING)`);
  res.json({ success:true, submitted: count, status:'IN_REVIEW' });
});

router.post('/:id/review', authenticateToken, requireRole(['ADMIN','REVIEWER']), (req, res) => {
  const task=db.prepare('SELECT * FROM tasks WHERE id=?').get(req.params.id);
  if(!task) return res.status(404).json({ error: 'Task not found' });
  if(task.status !== 'IN_REVIEW') return res.status(400).json({ error: `Task not in review (${task.status})` });
  const { verdicts, newDeadline } = req.body;
  if(!Array.isArray(verdicts) || verdicts.length===0) return res.status(400).json({ error: 'verdicts required' });
  const taskQs=db.prepare('SELECT id, status FROM questions WHERE task_id=? AND deleted_at IS NULL').all(task.id);
  const allowedIds=new Set(taskQs.map(q=>q.id));
  for(const v of verdicts){
    if(!allowedIds.has(v.questionId)) return res.status(400).json({ error: `Question ${v.questionId} not in task` });
    if(!['ACCEPT','REJECT','REVISE'].includes(v.verdict)) return res.status(400).json({ error: `Invalid verdict ${v.verdict}` });
    const q=taskQs.find(x=>x.id===v.questionId);
    if(q.status !== 'PENDING_REVIEW') return res.status(400).json({ error: `Question ${v.questionId} not PENDING (status ${q.status})` });
  }
  const hasRevise=verdicts.some(v=>v.verdict==='REVISE');
  if(hasRevise){
    if(!newDeadline) return res.status(400).json({ error: 'newDeadline required when any REVISE' });
    const d=new Date(newDeadline); if(isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid newDeadline' });
  }
  const tx=db.transaction(()=>{
    verdicts.forEach(v=>{
      let newStatus, action;
      if(v.verdict==='ACCEPT'){ newStatus='APPROVED'; action='APPROVE'; }
      else if(v.verdict==='REJECT'){ newStatus='REJECTED'; action='REJECT'; }
      else { newStatus='DRAFT'; action='REJECT'; }
      db.prepare('UPDATE questions SET status=?, reviewer_id=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(newStatus, req.user.id, v.questionId);
      const qrow=db.prepare('SELECT current_version_id FROM questions WHERE id=?').get(v.questionId);
      const comment = v.verdict==='REVISE' ? `REVISE: ${v.comment||''}` : (v.comment||'');
      db.prepare('INSERT INTO review_records (id, question_id, version_id, reviewer_id, action, comment) VALUES (?,?,?,?,?,?)').run(uuidv4(), v.questionId, qrow.current_version_id, req.user.id, action, comment);
      db.prepare('INSERT INTO task_reviews (id, task_id, reviewer_id, question_id, verdict, comment) VALUES (?,?,?,?,?,?)').run(uuidv4(), task.id, req.user.id, v.questionId, v.verdict, v.comment||null);
    });
    if(hasRevise){
      const d=new Date(newDeadline).toISOString();
      db.prepare('UPDATE tasks SET status=?, revision_deadline=?, deadline=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run('IN_PROGRESS', d, d, task.id);
    } else {
      db.prepare('UPDATE tasks SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run('COMPLETED', task.id);
    }
  });
  tx();
  logAudit(req.user.id, req.user.username, 'REVIEW_TASK', 'TASK', task.id, `Reviewed task ${task.title}: ${verdicts.map(v=>`${v.questionId.slice(0,6)}:${v.verdict}`).join(', ')}${hasRevise ? ` (reopened new deadline ${newDeadline})` : ' (completed)'}`);
  res.json({ success:true, status: hasRevise ? 'IN_PROGRESS' : 'COMPLETED', verdicts });
});

router.get('/:id/questions', authenticateToken, (req, res) => {
  const task=db.prepare('SELECT * FROM tasks WHERE id=?').get(req.params.id);
  if(!task) return res.status(404).json({ error: 'Task not found' });
  if(isWriterRole(req.user.role) && req.user.role !== 'ADMIN' && req.user.role !== 'REVIEWER' && task.assignee_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  if(req.user.role==='VIEWER') return res.status(403).json({ error: 'Forbidden' });
  const qs=db.prepare(`SELECT q.*, qv.title, qv.stem_rich_text, qv.options_json, qv.version_number FROM questions q JOIN question_versions qv ON q.current_version_id=qv.id WHERE q.task_id=? AND q.deleted_at IS NULL ORDER BY q.created_at ASC`).all(task.id);
  res.json({ questions: qs });
});

module.exports = router;
