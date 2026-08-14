const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// Helper to format options & tags
function formatQuestionRow(q) {
  if (!q) return null;
  let options = [];
  if (q.options_json) {
    try { options = JSON.parse(q.options_json); } catch (e) {}
  }
  const tags = db.prepare(`
    SELECT t.id, t.name, t.category, t.color
    FROM tags t
    JOIN question_tags qt ON t.id = qt.tag_id
    WHERE qt.question_id = ?
  `).all(q.id);

  return { ...q, options, tags };
}

// 1. Get all certification exam folders
router.get('/', (req, res) => {
  const { category, status } = req.query;
  const where = ['1=1'];
  const params = [];

  if (category) {
    where.push('e.category = ?');
    params.push(category);
  }
  if (status) {
    where.push('e.status = ?');
    params.push(status);
  }

  const sql = `
    SELECT 
      e.*,
      u.name as creator_name,
      (SELECT COUNT(*) FROM exam_questions eq WHERE eq.exam_id = e.id) as total_questions,
      (SELECT COUNT(*) FROM exam_questions eq JOIN questions q ON eq.question_id = q.id WHERE eq.exam_id = e.id AND q.status = 'APPROVED') as approved_questions,
      (SELECT COUNT(*) FROM exam_questions eq JOIN questions q ON eq.question_id = q.id WHERE eq.exam_id = e.id AND q.type = 'SINGLE_CHOICE') as single_choice_count,
      (SELECT COUNT(*) FROM exam_questions eq JOIN questions q ON eq.question_id = q.id WHERE eq.exam_id = e.id AND q.type = 'MULTIPLE_CHOICE') as multiple_choice_count,
      (SELECT COUNT(*) FROM exam_questions eq JOIN questions q ON eq.question_id = q.id WHERE eq.exam_id = e.id AND q.type = 'ESSAY') as essay_count
    FROM exams e
    LEFT JOIN users u ON e.created_by = u.id
    WHERE ${where.join(' AND ')}
    ORDER BY e.updated_at DESC
  `;

  const exams = db.prepare(sql).all(...params);
  res.json({ exams });
});

// 2. Get single certification exam folder with all included questions
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const exam = db.prepare(`
    SELECT e.*, u.name as creator_name
    FROM exams e
    LEFT JOIN users u ON e.created_by = u.id
    WHERE e.id = ?
  `).get(id);

  if (!exam) {
    return res.status(404).json({ error: '认证考试文件夹不存在' });
  }

  // Get assigned questions
  const qRows = db.prepare(`
    SELECT 
      q.id, q.current_version_id, q.type, q.status, q.difficulty, q.subject,
      q.author_id, q.created_at, q.updated_at,
      qv.version_number, qv.title, qv.stem_rich_text, qv.options_json,
      qv.standard_answer_rich_text, qv.explanation_rich_text,
      eq.domain_section, eq.order_index, eq.score_weight, eq.added_at,
      u.name as author_name
    FROM exam_questions eq
    JOIN questions q ON eq.question_id = q.id
    JOIN question_versions qv ON q.current_version_id = qv.id
    LEFT JOIN users u ON q.author_id = u.id
    WHERE eq.exam_id = ?
    ORDER BY eq.order_index ASC, eq.added_at ASC
  `).all(id);

  const questions = qRows.map(formatQuestionRow);

  // Get other available approved questions not yet in this exam
  const availableQRows = db.prepare(`
    SELECT 
      q.id, q.type, q.status, q.difficulty, q.subject,
      qv.version_number, qv.title, qv.stem_rich_text
    FROM questions q
    JOIN question_versions qv ON q.current_version_id = qv.id
    WHERE q.status = 'APPROVED'
      AND q.id NOT IN (SELECT question_id FROM exam_questions WHERE exam_id = ?)
    ORDER BY q.updated_at DESC
  `).all(id);

  res.json({
    exam,
    questions,
    availableQuestions: availableQRows
  });
});

// 3. Create Certification Exam Folder
router.post('/', authenticateToken, requireRole(['TEACHER', 'REVIEWER', 'ADMIN']), (req, res) => {
  const {
    title,
    code,
    description = '',
    category = 'Cloud Architecture',
    passing_score = 750,
    time_limit_minutes = 180,
    status = 'ACTIVE'
  } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: '认证考试名称不能为空' });
  }
  if (!code || !code.trim()) {
    return res.status(400).json({ error: '认证代号不能为空 (如 AWS-SAP-C02, CISSP-2026)' });
  }

  const normalizedCode = code.trim().toUpperCase();
  const existing = db.prepare('SELECT id FROM exams WHERE UPPER(code) = ?').get(normalizedCode);
  if (existing) {
    return res.status(400).json({ error: `认证代号 ${normalizedCode} 已存在` });
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO exams (id, title, code, description, category, passing_score, time_limit_minutes, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    title.trim(),
    normalizedCode,
    description,
    category,
    parseInt(passing_score, 10) || 750,
    parseInt(time_limit_minutes, 10) || 180,
    status,
    req.user.id
  );

  logAudit(req.user.id, req.user.username, 'CREATE_EXAM_FOLDER', 'EXAM', id, `创建认证考试文件夹: ${title} (${normalizedCode})`);

  const created = db.prepare('SELECT * FROM exams WHERE id = ?').get(id);
  res.status(201).json({ exam: created });
});

// 4. Update Exam Folder
router.put('/:id', authenticateToken, requireRole(['TEACHER', 'REVIEWER', 'ADMIN']), (req, res) => {
  const { id } = req.params;
  const { title, code, description, category, passing_score, time_limit_minutes, status } = req.body;

  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(id);
  if (!exam) {
    return res.status(404).json({ error: '认证考试文件夹不存在' });
  }

  if (req.user.role === 'TEACHER' && exam.created_by !== req.user.id) {
    return res.status(403).json({ error: '只能编辑本人创建的认证考试文件夹' });
  }

  const normalizedCode = code ? code.trim().toUpperCase() : null;
  if (normalizedCode && normalizedCode !== exam.code) {
    const existing = db.prepare('SELECT id FROM exams WHERE UPPER(code) = ? AND id != ?').get(normalizedCode, id);
    if (existing) {
      return res.status(400).json({ error: `认证代号 ${normalizedCode} 已被其他考试占用` });
    }
  }

  db.prepare(`
    UPDATE exams
    SET title = COALESCE(?, title),
        code = COALESCE(?, code),
        description = COALESCE(?, description),
        category = COALESCE(?, category),
        passing_score = COALESCE(?, passing_score),
        time_limit_minutes = COALESCE(?, time_limit_minutes),
        status = COALESCE(?, status),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    title ? title.trim() : null,
    normalizedCode,
    description !== undefined ? description : null,
    category || null,
    passing_score ? parseInt(passing_score, 10) : null,
    time_limit_minutes ? parseInt(time_limit_minutes, 10) : null,
    status || null,
    id
  );

  logAudit(req.user.id, req.user.username, 'UPDATE_EXAM_FOLDER', 'EXAM', id, `更新认证考试文件夹: ${title || exam.title}`);

  const updated = db.prepare('SELECT * FROM exams WHERE id = ?').get(id);
  res.json({ exam: updated });
});

// 5. Delete Exam Folder
router.delete('/:id', authenticateToken, requireRole(['ADMIN', 'TEACHER']), (req, res) => {
  const { id } = req.params;
  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(id);
  if (!exam) {
    return res.status(404).json({ error: '认证考试文件夹不存在' });
  }

  if (req.user.role !== 'ADMIN' && exam.created_by !== req.user.id) {
    return res.status(403).json({ error: '只有管理员或创建者本人可以删除认证考试文件夹' });
  }

  db.prepare('DELETE FROM exams WHERE id = ?').run(id);
  logAudit(req.user.id, req.user.username, 'DELETE_EXAM_FOLDER', 'EXAM', id, `删除认证考试文件夹: ${exam.title} (${exam.code})`);

  res.json({ success: true, message: '已成功删除认证考试文件夹' });
});

// 6. Add Questions to Exam Folder
router.post('/:id/questions', authenticateToken, requireRole(['TEACHER', 'REVIEWER', 'ADMIN']), (req, res) => {
  const { id } = req.params;
  const { questionIds = [], domain_section = 'Core Knowledge Domain', score_weight = 1.0 } = req.body;

  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(id);
  if (!exam) {
    return res.status(404).json({ error: '认证考试文件夹不存在' });
  }

  if (!Array.isArray(questionIds) || questionIds.length === 0) {
    return res.status(400).json({ error: '请选择至少一道考题归入该认证考试' });
  }

  const maxOrderRow = db.prepare('SELECT MAX(order_index) as max_ord FROM exam_questions WHERE exam_id = ?').get(id);
  let currentOrder = maxOrderRow && maxOrderRow.max_ord ? maxOrderRow.max_ord : 0;

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO exam_questions (exam_id, question_id, domain_section, order_index, score_weight)
    VALUES (?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    questionIds.forEach((qId) => {
      currentOrder += 1;
      stmt.run(id, qId, domain_section, currentOrder, score_weight);
    });
  });

  try {
    transaction();
    logAudit(req.user.id, req.user.username, 'ADD_QUESTIONS_TO_EXAM', 'EXAM', id, `归入 ${questionIds.length} 道考题至认证考试【${exam.title}】`);
    res.json({ success: true, message: `已成功将 ${questionIds.length} 道考题归入认证考试【${exam.title}】` });
  } catch (err) {
    res.status(500).json({ error: '考题归入失败: ' + err.message });
  }
});

// 7. Remove Question from Exam Folder
router.delete('/:id/questions/:questionId', authenticateToken, requireRole(['TEACHER', 'REVIEWER', 'ADMIN']), (req, res) => {
  const { id, questionId } = req.params;
  db.prepare('DELETE FROM exam_questions WHERE exam_id = ? AND question_id = ?').run(id, questionId);

  logAudit(req.user.id, req.user.username, 'REMOVE_QUESTION_FROM_EXAM', 'EXAM', id, `从认证考试移除考题 ID: ${questionId}`);
  res.json({ success: true, message: '考题已移出当前认证考试文件夹' });
});

// 8. Export Full Certification Exam Package
router.get('/:id/export', (req, res) => {
  const { id } = req.params;
  const { format = 'markdown' } = req.query;

  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(id);
  if (!exam) {
    return res.status(404).json({ error: '认证考试不存在' });
  }

  const qRows = db.prepare(`
    SELECT 
      q.id, q.type, q.status, q.difficulty, q.subject,
      qv.version_number, qv.title, qv.stem_rich_text, qv.options_json,
      qv.standard_answer_rich_text, qv.explanation_rich_text,
      eq.domain_section, eq.order_index, eq.score_weight
    FROM exam_questions eq
    JOIN questions q ON eq.question_id = q.id
    JOIN question_versions qv ON q.current_version_id = qv.id
    WHERE eq.exam_id = ?
    ORDER BY eq.order_index ASC, eq.added_at ASC
  `).all(id);

  const questions = qRows.map(formatQuestionRow);

  if (format === 'markdown') {
    let md = `# Professional Certification Examination Paper\n\n`;
    md += `## 📋 Exam: ${exam.title} (${exam.code})\n\n`;
    md += `- **Domain Category**: ${exam.category}\n`;
    md += `- **Passing Score Requirement**: ${exam.passing_score} / 1000\n`;
    md += `- **Time Limit**: ${exam.time_limit_minutes} Minutes\n`;
    md += `- **Total Questions**: ${questions.length} Items\n`;
    md += `- **Export Date**: ${new Date().toUTCString()}\n\n`;
    md += `---\n\n`;

    questions.forEach((q, idx) => {
      md += `### Item ${idx + 1}. [${q.type}] (Domain: ${q.domain_section || 'General'})\n\n`;
      md += `**Title**: ${q.title}\n\n`;
      md += `**Scenario / Stem**:\n${q.stem_rich_text}\n\n`;

      if (q.options && q.options.length > 0) {
        md += `**Options**:\n`;
        q.options.forEach(opt => {
          md += `- **${opt.key}.** ${opt.text}\n`;
        });
        md += `\n`;
      }

      md += `<details><summary>👉 Click to view Standard Answer & Technical Rationale</summary>\n\n`;
      md += `**Correct Answer(s)**: ${q.standard_answer_rich_text || 'See explanation'}\n\n`;
      if (q.explanation_rich_text) {
        md += `**Architectural Rationale & Exam Domain Notes**:\n${q.explanation_rich_text}\n\n`;
      }
      md += `</details>\n\n---\n\n`;
    });

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${exam.code}-Exam-Package.md"`);
    return res.send(md);
  }

  res.json({ exam, questions });
});

module.exports = router;
