const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// 1. Get Pending Review Questions List
router.get('/pending', authenticateToken, requireRole(['REVIEWER', 'ADMIN']), (req, res) => {
  const { subject } = req.query;
  const where = ["q.status = 'PENDING_REVIEW'"];
  const params = [];

  if (subject) {
    where.push('q.subject = ?');
    params.push(subject);
  }

  const sql = `
    SELECT 
      q.id, q.current_version_id, q.type, q.status, q.difficulty, q.subject,
      q.author_id, q.created_at, q.updated_at,
      qv.version_number, qv.title, qv.stem_rich_text, qv.options_json,
      qv.standard_answer_rich_text, qv.explanation_rich_text, qv.change_summary,
      u.name as author_name, u.username as author_username
    FROM questions q
    JOIN question_versions qv ON q.current_version_id = qv.id
    LEFT JOIN users u ON q.author_id = u.id
    WHERE ${where.join(' AND ')}
    ORDER BY q.updated_at ASC
  `;

  const rows = db.prepare(sql).all(...params);

  const questions = rows.map(q => {
    let options = [];
    if (q.options_json) {
      try {
        options = JSON.parse(q.options_json);
      } catch (e) {}
    }
    const tags = db.prepare(`
      SELECT t.id, t.name, t.category, t.color
      FROM tags t
      JOIN question_tags qt ON t.id = qt.tag_id
      WHERE qt.question_id = ?
    `).all(q.id);
    return { ...q, options, tags };
  });

  res.json({ questions, count: questions.length });
});

// 2. Submit Review Decision (APPROVE / REJECT)
router.post('/:id/decision', authenticateToken, requireRole(['REVIEWER', 'ADMIN']), (req, res) => {
  const { id } = req.params;
  const { action, comment = '' } = req.body;

  if (!action || !['APPROVE', 'REJECT'].includes(action)) {
    return res.status(400).json({ error: '审核动作必须为 APPROVE (通过) 或 REJECT (驳回)' });
  }

  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
  if (!question) {
    return res.status(404).json({ error: '考题不存在' });
  }

  // Ensure question is in PENDING_REVIEW status
  if (question.status !== 'PENDING_REVIEW') {
    return res.status(400).json({ error: `该考题当前状态为 [${question.status}]，无法执行审核操作` });
  }

  const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
  const reviewId = uuidv4();

  const transaction = db.transaction(() => {
    // 1. Update question status and reviewer_id
    db.prepare(`
      UPDATE questions
      SET status = ?,
          reviewer_id = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newStatus, req.user.id, id);

    // 2. Insert into review_records
    db.prepare(`
      INSERT INTO review_records (id, question_id, version_id, reviewer_id, action, comment)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(reviewId, id, question.current_version_id, req.user.id, action, comment.trim());
  });

  try {
    transaction();
    const actionText = action === 'APPROVE' ? '审核通过' : '审核驳回';
    logAudit(req.user.id, req.user.username, 'REVIEW_QUESTION', 'QUESTION', id, `${actionText}: ${comment || '无补充意见'}`);

    res.json({
      success: true,
      message: `考题已${actionText}`,
      status: newStatus
    });
  } catch (err) {
    console.error('Failed to submit review:', err);
    res.status(500).json({ error: '审核处理失败: ' + err.message });
  }
});

// 3. Get Review History Stream
router.get('/records', authenticateToken, (req, res) => {
  const { limit = 20 } = req.query;
  const sql = `
    SELECT 
      r.id, r.question_id, r.action, r.comment, r.created_at,
      u.name as reviewer_name, u.username as reviewer_username,
      qv.title as question_title
    FROM review_records r
    LEFT JOIN users u ON r.reviewer_id = u.id
    LEFT JOIN questions q ON r.question_id = q.id
    LEFT JOIN question_versions qv ON q.current_version_id = qv.id
    ORDER BY r.created_at DESC, r.rowid DESC
    LIMIT ?
  `;

  const records = db.prepare(sql).all(parseInt(limit, 10) || 20);
  res.json({ records });
});

module.exports = router;
