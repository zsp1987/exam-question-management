const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const { sanitizeHtml } = require('../utils/sanitize');

// Helper to format question object (sanitize on render)
function formatQuestionRow(q) {
  if (!q) return null;
  let options = [];
  if (q.options_json) {
    try { options = JSON.parse(q.options_json); } catch (e) { options = []; }
  }
  const tags = db.prepare(`
    SELECT t.id, t.name, t.category, t.color
    FROM tags t JOIN question_tags qt ON t.id = qt.tag_id
    WHERE qt.question_id = ?
  `).all(q.id);
  return {
    ...q,
    stem_rich_text: sanitizeHtml(q.stem_rich_text),
    standard_answer_rich_text: sanitizeHtml(q.standard_answer_rich_text),
    explanation_rich_text: sanitizeHtml(q.explanation_rich_text),
    options,
    tags
  };
}

function visibilityClause(user) {
  // Returns SQL fragment and params for visibility
  if (!user) return { clause: "q.deleted_at IS NULL AND q.status = 'APPROVED'", params: [] };
  if (user.role === 'ADMIN' || user.role === 'REVIEWER') {
    return { clause: 'q.deleted_at IS NULL', params: [] };
  }
  if (user.role === 'TEACHER') {
    return { clause: "(q.deleted_at IS NULL AND (q.status = 'APPROVED' OR q.author_id = ?))", params: [user.id] };
  }
  // VIEWER
  return { clause: "q.deleted_at IS NULL AND q.status = 'APPROVED'", params: [] };
}

// 1. Multi-faceted Search / List Questions
router.get('/', authenticateToken, (req, res) => {
  try {
    const {
      keyword, type, status, difficulty, subject, tagId, authorId,
      page = 1, limit = 10, sortBy = 'updated_at', sortOrder = 'DESC'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;
    const params = [];
    const whereClauses = [];

    // Visibility scoping per CONTEXT §2.1
    const vis = visibilityClause(req.user);
    whereClauses.push(vis.clause);
    params.push(...vis.params);

    if (keyword && keyword.trim()) {
      const term = `%${keyword.trim()}%`;
      whereClauses.push(`(
        qv.title LIKE ? OR 
        qv.stem_rich_text LIKE ? OR 
        qv.standard_answer_rich_text LIKE ? OR 
        qv.explanation_rich_text LIKE ?
      )`);
      params.push(term, term, term, term);
    }
    if (type) { whereClauses.push('q.type = ?'); params.push(type); }
    if (status) {
      // VIEWER cannot filter to non-APPROVED; enforce
      if (req.user.role === 'VIEWER' && status !== 'APPROVED') {
        return res.status(403).json({ error: 'VIEWER 仅可查看已批准题目' });
      }
      if (req.user.role === 'TEACHER' && ['DRAFT','PENDING_REVIEW','REJECTED'].includes(status)) {
        // Teacher can only list own drafts - additional author check is handled via visibilityClause already
      }
      whereClauses.push('q.status = ?'); params.push(status);
    }
    if (difficulty) { whereClauses.push('q.difficulty = ?'); params.push(parseInt(difficulty, 10)); }
    if (subject) { whereClauses.push('q.subject = ?'); params.push(subject); }
    if (authorId) { whereClauses.push('q.author_id = ?'); params.push(authorId); }
    if (tagId) {
      whereClauses.push(`EXISTS (SELECT 1 FROM question_tags qt WHERE qt.question_id = q.id AND qt.tag_id = ?)`);
      params.push(tagId);
    }

    const allowedSortFields = ['updated_at', 'created_at', 'difficulty', 'type', 'status'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? `q.${sortBy}` : 'q.updated_at';
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const countSql = `
      SELECT COUNT(DISTINCT q.id) as total
      FROM questions q JOIN question_versions qv ON q.current_version_id = qv.id
      WHERE ${whereClauses.join(' AND ')}
    `;
    const countResult = db.prepare(countSql).get(...params);
    const total = countResult ? countResult.total : 0;

    const dataSql = `
      SELECT 
        q.id, q.current_version_id, q.type, q.status, q.difficulty, q.subject,
        q.author_id, q.reviewer_id, q.deleted_at, q.created_at, q.updated_at,
        qv.version_number, qv.title, qv.stem_rich_text, qv.options_json,
        qv.standard_answer_rich_text, qv.explanation_rich_text, qv.change_summary, qv.katex_source,
        u.name as author_name, u.username as author_username,
        r.name as reviewer_name,
        (SELECT COUNT(*) FROM question_versions qv2 WHERE qv2.question_id = q.id) as total_versions
      FROM questions q
      JOIN question_versions qv ON q.current_version_id = qv.id
      LEFT JOIN users u ON q.author_id = u.id
      LEFT JOIN users r ON q.reviewer_id = r.id
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY ${safeSortBy} ${safeSortOrder}
      LIMIT ? OFFSET ?
    `;
    const rows = db.prepare(dataSql).all(...params, limitNum, offset);
    const formattedQuestions = rows.map(formatQuestionRow);
    res.json({
      data: formattedQuestions,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) || 1 }
    });
  } catch (err) {
    console.error('Failed to query questions:', err);
    res.status(500).json({ error: '查询考题失败: ' + err.message });
  }
});

// 2. Get Single Question Details by ID
router.get('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const row = db.prepare(`
    SELECT 
      q.id, q.current_version_id, q.type, q.status, q.difficulty, q.subject,
      q.author_id, q.reviewer_id, q.deleted_at, q.created_at, q.updated_at,
      qv.version_number, qv.title, qv.stem_rich_text, qv.options_json,
      qv.standard_answer_rich_text, qv.explanation_rich_text, qv.change_summary, qv.katex_source,
      u.name as author_name, u.username as author_username,
      r.name as reviewer_name,
      (SELECT COUNT(*) FROM question_versions qv2 WHERE qv2.question_id = q.id) as total_versions
    FROM questions q
    JOIN question_versions qv ON q.current_version_id = qv.id
    LEFT JOIN users u ON q.author_id = u.id
    LEFT JOIN users r ON q.reviewer_id = r.id
    WHERE q.id = ? AND q.deleted_at IS NULL
  `).get(id);
  if (!row) return res.status(404).json({ error: '考题不存在' });

  // Visibility check
  if (req.user.role === 'VIEWER' && row.status !== 'APPROVED') {
    return res.status(403).json({ error: 'VIEWER 仅可查看已批准题目' });
  }
  if (req.user.role === 'TEACHER' && row.author_id !== req.user.id && row.status !== 'APPROVED') {
    return res.status(403).json({ error: '仅可查看本人草稿或已批准题目' });
  }

  const question = formatQuestionRow(row);
  const reviewHistory = db.prepare(`
    SELECT r.id, r.action, r.comment, r.created_at, u.name as reviewer_name, u.role as reviewer_role
    FROM review_records r LEFT JOIN users u ON r.reviewer_id = u.id
    WHERE r.question_id = ? ORDER BY r.created_at DESC, r.rowid DESC
  `).all(id);
  res.json({ question, reviewHistory });
});

// 3. Create Question (TEACHER, REVIEWER, ADMIN)
router.post('/', authenticateToken, requireRole(['TEACHER', 'REVIEWER', 'ADMIN']), (req, res) => {
  const {
    type = 'SINGLE_CHOICE', difficulty = 3, subject = 'AWS Certified Solutions Architect',
    title, stem_rich_text, options = [], standard_answer_rich_text = '', explanation_rich_text = '',
    katex_source = '', tagIds = [], submitForReview = false
  } = req.body;

  if (!title || !title.trim()) return res.status(400).json({ error: '考题标题不能为空' });
  if (!stem_rich_text || !stem_rich_text.trim()) return res.status(400).json({ error: '考题题干内容不能为空' });
  if (type === 'SINGLE_CHOICE' || type === 'MULTIPLE_CHOICE') {
    if (!Array.isArray(options) || options.length < 2) return res.status(400).json({ error: '选择题必须至少包含 2 个选项' });
    if (options.some(o => !o.text || !o.text.trim())) return res.status(400).json({ error: '选择题选项内容不能为空' });
    if (!options.some(o => o.is_correct)) return res.status(400).json({ error: '选择题必须指定至少一个正确选项' });
  }

  // Sanitize on write (defense in depth)
  const cleanStem = sanitizeHtml(stem_rich_text);
  const cleanAnswer = sanitizeHtml(standard_answer_rich_text);
  const cleanExplanation = sanitizeHtml(explanation_rich_text);

  const questionId = uuidv4();
  const versionId = uuidv4();
  const initialStatus = submitForReview ? 'PENDING_REVIEW' : 'DRAFT';

  const transaction = db.transaction(() => {
    db.prepare(`INSERT INTO questions (id, current_version_id, type, status, difficulty, subject, author_id) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(questionId, versionId, type, initialStatus, difficulty, subject, req.user.id);
    db.prepare(`INSERT INTO question_versions (id, question_id, version_number, title, stem_rich_text, options_json, standard_answer_rich_text, explanation_rich_text, katex_source, change_summary, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(versionId, questionId, 1, title.trim(), cleanStem, JSON.stringify(options), cleanAnswer, cleanExplanation, katex_source, '初始创建', req.user.id);
    if (Array.isArray(tagIds) && tagIds.length > 0) {
      const tagStmt = db.prepare('INSERT INTO question_tags (question_id, tag_id) VALUES (?, ?)');
      tagIds.forEach(tId => { try { tagStmt.run(questionId, tId); } catch (e) {} });
    }
    if (submitForReview) {
      db.prepare(`INSERT INTO review_records (id, question_id, version_id, reviewer_id, action, comment) VALUES (?, ?, ?, ?, 'SUBMIT', '提交初审')`).run(uuidv4(), questionId, versionId, req.user.id);
    }
  });
  try {
    transaction();
    logAudit(req.user.id, req.user.username, 'CREATE_QUESTION', 'QUESTION', questionId, `创建考题: ${title} (${type})`);
    const created = db.prepare(`SELECT q.*, qv.title, qv.stem_rich_text, qv.options_json, qv.standard_answer_rich_text, qv.explanation_rich_text, qv.version_number, qv.katex_source FROM questions q JOIN question_versions qv ON q.current_version_id = qv.id WHERE q.id = ?`).get(questionId);
    res.status(201).json({ question: formatQuestionRow(created) });
  } catch (err) {
    console.error('Failed to create question:', err);
    res.status(500).json({ error: '创建考题失败: ' + err.message });
  }
});

// 4. Update Question (Creates a NEW Version Snapshot)
router.put('/:id', authenticateToken, requireRole(['TEACHER', 'REVIEWER', 'ADMIN']), (req, res) => {
  const { id } = req.params;
  const {
    title, stem_rich_text, options = [], standard_answer_rich_text = '', explanation_rich_text = '',
    katex_source, difficulty, subject, type, tagIds, change_summary = '更新考题内容',
    submitForReview = false, expected_version, expected_updated_at
  } = req.body;

  const question = db.prepare('SELECT * FROM questions WHERE id = ? AND deleted_at IS NULL').get(id);
  if (!question) return res.status(404).json({ error: '考题不存在' });

  // RBAC: TEACHER can only edit own
  if (req.user.role === 'TEACHER' && question.author_id !== req.user.id) {
    return res.status(403).json({ error: '只能编辑本人创建的考题' });
  }
  if (req.user.role === 'REVIEWER' && question.author_id !== req.user.id) {
    return res.status(403).json({ error: 'REVIEWER 仅可编辑本人创建的题目' });
  }

  // State guards per grill Q8/Q9/Q1
  if (question.status === 'PENDING_REVIEW') {
    return res.status(400).json({ error: '题目正在审核中，须等待审核完成（通过/驳回）后方可编辑' });
  }
  if (question.status === 'REJECTED') {
    // REJECTED -> DRAFT is allowed (reopen flow), goes to DRAFT via update. That's the only path.
    // Allow - it will transition to DRAFT below.
  }
  if (!title || !title.trim()) return res.status(400).json({ error: '考题标题不能为空' });
  if (!stem_rich_text || !stem_rich_text.trim()) return res.status(400).json({ error: '考题题干内容不能为空' });

  const effectiveType = type || question.type;
  if (effectiveType === 'SINGLE_CHOICE' || effectiveType === 'MULTIPLE_CHOICE') {
    if (!Array.isArray(options) || options.length < 2) return res.status(400).json({ error: '选择题必须至少包含 2 个选项' });
    if (options.some(o => !o.text || !o.text.trim())) return res.status(400).json({ error: '选择题选项内容不能为空' });
    if (!options.some(o => o.is_correct)) return res.status(400).json({ error: '选择题必须指定至少一个正确选项' });
  }

  // Optimistic lock (Q11)
  if (expected_version !== undefined && expected_version !== null) {
    const curVer = db.prepare('SELECT MAX(version_number) as max_v FROM question_versions WHERE question_id = ?').get(id);
    const curMax = curVer ? curVer.max_v : 0;
    if (parseInt(expected_version, 10) !== curMax) {
      return res.status(409).json({ error: '版本冲突：题目已被他人修改，请刷新后重试', current_version: curMax });
    }
  }
  if (expected_updated_at) {
    if (question.updated_at !== expected_updated_at) {
      return res.status(409).json({ error: '版本冲突：题目已被他人修改，请刷新后重试', current_updated_at: question.updated_at });
    }
  }

  const maxVerRow = db.prepare('SELECT MAX(version_number) as max_v FROM question_versions WHERE question_id = ?').get(id);
  const nextVersionNumber = (maxVerRow ? maxVerRow.max_v : 0) + 1;
  const newVersionId = uuidv4();

  // Q1: editing APPROVED resets to DRAFT
  let newStatus;
  if (question.status === 'APPROVED') {
    newStatus = 'DRAFT';
  } else if (submitForReview) {
    newStatus = 'PENDING_REVIEW';
  } else {
    newStatus = 'DRAFT';
  }

  const cleanStem = sanitizeHtml(stem_rich_text);
  const cleanAnswer = sanitizeHtml(standard_answer_rich_text);
  const cleanExplanation = sanitizeHtml(explanation_rich_text);

  const transaction = db.transaction(() => {
    db.prepare(`INSERT INTO question_versions (id, question_id, version_number, title, stem_rich_text, options_json, standard_answer_rich_text, explanation_rich_text, katex_source, change_summary, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      newVersionId, id, nextVersionNumber, title.trim(), cleanStem, JSON.stringify(options), cleanAnswer, cleanExplanation, katex_source || null, change_summary.trim() || `版本 v${nextVersionNumber} 迭代`, req.user.id
    );
    db.prepare(`UPDATE questions SET current_version_id = ?, type = COALESCE(?, type), status = ?, difficulty = COALESCE(?, difficulty), subject = COALESCE(?, subject), updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(
      newVersionId, type || null, newStatus, difficulty ? parseInt(difficulty, 10) : null, subject || null, id
    );
    if (Array.isArray(tagIds)) {
      db.prepare('DELETE FROM question_tags WHERE question_id = ?').run(id);
      const tagStmt = db.prepare('INSERT INTO question_tags (question_id, tag_id) VALUES (?, ?)');
      tagIds.forEach(tId => { try { tagStmt.run(id, tId); } catch (e) {} });
    }
    if (submitForReview) {
      db.prepare(`INSERT INTO review_records (id, question_id, version_id, reviewer_id, action, comment) VALUES (?, ?, ?, ?, 'SUBMIT', ?)`).run(uuidv4(), id, newVersionId, req.user.id, `提交版本 v${nextVersionNumber} 审核: ${change_summary}`);
    }
  });
  try {
    transaction();
    logAudit(req.user.id, req.user.username, 'UPDATE_QUESTION', 'QUESTION', id, `更新考题版本至 v${nextVersionNumber}: ${change_summary} (status ${question.status} -> ${newStatus})`);
    const updated = db.prepare(`SELECT q.*, qv.title, qv.stem_rich_text, qv.options_json, qv.standard_answer_rich_text, qv.explanation_rich_text, qv.version_number, qv.katex_source FROM questions q JOIN question_versions qv ON q.current_version_id = qv.id WHERE q.id = ?`).get(id);
    res.json({ question: formatQuestionRow(updated) });
  } catch (err) {
    console.error('Failed to update question:', err);
    res.status(500).json({ error: '更新考题失败: ' + err.message });
  }
});

// 5. Submit Question for Review
router.post('/:id/submit-review', authenticateToken, requireRole(['TEACHER', 'REVIEWER', 'ADMIN']), (req, res) => {
  const { id } = req.params;
  const { comment = '申请审核' } = req.body;
  const question = db.prepare('SELECT * FROM questions WHERE id = ? AND deleted_at IS NULL').get(id);
  if (!question) return res.status(404).json({ error: '考题不存在' });
  if (req.user.role === 'TEACHER' && question.author_id !== req.user.id) return res.status(403).json({ error: '只能提交本人创建的考题送审' });
  if (question.status === 'APPROVED') return res.status(400).json({ error: '该考题已通过审核，如需修改请先编辑保存新版本' });
  if (question.status === 'PENDING_REVIEW') return res.status(400).json({ error: '该考题已在审核中，请等待审核结果' });
  if (question.status === 'REJECTED') return res.status(400).json({ error: '已驳回题目请先编辑重开为 DRAFT 后再提交' });
  db.prepare(`UPDATE questions SET status = 'PENDING_REVIEW', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(id);
  db.prepare(`INSERT INTO review_records (id, question_id, version_id, reviewer_id, action, comment) VALUES (?, ?, ?, ?, 'SUBMIT', ?)`).run(uuidv4(), id, question.current_version_id, req.user.id, comment);
  logAudit(req.user.id, req.user.username, 'SUBMIT_REVIEW', 'QUESTION', id, `提交考题送审`);
  res.json({ success: true, message: '考题已成功提交至审核大厅' });
});

// 6. Get Question Version History List
router.get('/:id/versions', authenticateToken, (req, res) => {
  const { id } = req.params;
  const q = db.prepare('SELECT id, deleted_at FROM questions WHERE id = ?').get(id);
  if (!q) return res.status(404).json({ error: '考题不存在' });
  const versions = db.prepare(`SELECT qv.*, u.name as author_name, u.username as author_username FROM question_versions qv LEFT JOIN users u ON qv.created_by = u.id WHERE qv.question_id = ? ORDER BY qv.version_number DESC`).all(id);
  const formatted = versions.map(v => {
    let options = [];
    if (v.options_json) try { options = JSON.parse(v.options_json); } catch (e) {}
    return { ...v, stem_rich_text: sanitizeHtml(v.stem_rich_text), standard_answer_rich_text: sanitizeHtml(v.standard_answer_rich_text), explanation_rich_text: sanitizeHtml(v.explanation_rich_text), options };
  });
  res.json({ versions: formatted });
});

// 7. Get Specific Version Snapshot
router.get('/:id/versions/:versionId', authenticateToken, (req, res) => {
  const { id, versionId } = req.params;
  const version = db.prepare(`SELECT qv.*, u.name as author_name, u.username as author_username FROM question_versions qv LEFT JOIN users u ON qv.created_by = u.id WHERE qv.question_id = ? AND qv.id = ?`).get(id, versionId);
  if (!version) return res.status(404).json({ error: '指定版本不存在' });
  let options = [];
  if (version.options_json) try { options = JSON.parse(version.options_json); } catch (e) {}
  res.json({ version: { ...version, stem_rich_text: sanitizeHtml(version.stem_rich_text), standard_answer_rich_text: sanitizeHtml(version.standard_answer_rich_text), explanation_rich_text: sanitizeHtml(version.explanation_rich_text), options } });
});

// 8. Rollback to a specific historic version
router.post('/:id/rollback/:versionId', authenticateToken, requireRole(['TEACHER', 'REVIEWER', 'ADMIN']), (req, res) => {
  const { id, versionId } = req.params;
  const question = db.prepare('SELECT * FROM questions WHERE id = ? AND deleted_at IS NULL').get(id);
  if (!question) return res.status(404).json({ error: '考题不存在' });
  if (req.user.role === 'TEACHER' && question.author_id !== req.user.id) return res.status(403).json({ error: '只能回滚本人创建的考题版本' });
  if (question.status === 'PENDING_REVIEW') return res.status(400).json({ error: '审核中的题目不可回滚' });
  const targetVersion = db.prepare('SELECT * FROM question_versions WHERE question_id = ? AND id = ?').get(id, versionId);
  if (!targetVersion) return res.status(404).json({ error: '目标回滚版本不存在' });
  const maxV = db.prepare('SELECT MAX(version_number) as max_v FROM question_versions WHERE question_id = ?').get(id);
  const nextV = (maxV ? maxV.max_v : 1) + 1;
  const newVId = uuidv4();
  const newStatus = question.status === 'APPROVED' ? 'DRAFT' : 'DRAFT';
  const transaction = db.transaction(() => {
    db.prepare(`INSERT INTO question_versions (id, question_id, version_number, title, stem_rich_text, options_json, standard_answer_rich_text, explanation_rich_text, katex_source, change_summary, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      newVId, id, nextV, targetVersion.title, targetVersion.stem_rich_text, targetVersion.options_json, targetVersion.standard_answer_rich_text, targetVersion.explanation_rich_text, targetVersion.katex_source, `回滚至历史版本 v${targetVersion.version_number}`, req.user.id
    );
    db.prepare(`UPDATE questions SET current_version_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(newVId, newStatus, id);
  });
  try {
    transaction();
    logAudit(req.user.id, req.user.username, 'ROLLBACK_VERSION', 'QUESTION', id, `回滚考题至历史版本 v${targetVersion.version_number} (生成新版本 v${nextV})`);
    res.json({ success: true, message: `已成功回滚至版本 v${targetVersion.version_number}，当前新版本号为 v${nextV}`, newVersionNumber: nextV });
  } catch (err) {
    console.error('Failed to rollback:', err);
    res.status(500).json({ error: '回滚版本失败: ' + err.message });
  }
});

// 9. Soft Delete Question (Q3)
router.delete('/:id', authenticateToken, requireRole(['TEACHER', 'ADMIN']), (req, res) => {
  const { id } = req.params;
  const question = db.prepare('SELECT * FROM questions WHERE id = ? AND deleted_at IS NULL').get(id);
  if (!question) return res.status(404).json({ error: '考题不存在或已删除' });
  if (req.user.role === 'TEACHER' && question.author_id !== req.user.id) return res.status(403).json({ error: '只能删除本人创建的考题' });
  // Block if pinned in any exam
  const pinned = db.prepare('SELECT COUNT(*) as c FROM exam_questions WHERE question_id = ?').get(id).c;
  if (pinned > 0) return res.status(400).json({ error: `该考题已被 ${pinned} 个认证考试引用，请先从考试中移除后再删除` });
  db.prepare('UPDATE questions SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
  logAudit(req.user.id, req.user.username, 'SOFT_DELETE_QUESTION', 'QUESTION', id, `软删除考题 ID: ${id}`);
  res.json({ success: true, message: '考题已删除（软删除，可由管理员恢复）' });
});

// 10. Restore soft-deleted question (ADMIN only)
router.post('/:id/restore', authenticateToken, requireRole(['ADMIN']), (req, res) => {
  const { id } = req.params;
  const question = db.prepare('SELECT * FROM questions WHERE id = ? AND deleted_at IS NOT NULL').get(id);
  if (!question) return res.status(404).json({ error: '考题不存在或未被删除' });
  db.prepare('UPDATE questions SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
  logAudit(req.user.id, req.user.username, 'RESTORE_QUESTION', 'QUESTION', id, `恢复考题 ID: ${id}`);
  res.json({ success: true, message: '考题已恢复' });
});

// 11. ADMIN revoke APPROVED -> DRAFT (Q10)
router.post('/:id/revoke', authenticateToken, requireRole(['ADMIN']), (req, res) => {
  const { id } = req.params;
  const { comment = '管理员撤销已批准状态' } = req.body;
  const question = db.prepare('SELECT * FROM questions WHERE id = ? AND deleted_at IS NULL').get(id);
  if (!question) return res.status(404).json({ error: '考题不存在' });
  if (question.status !== 'APPROVED') return res.status(400).json({ error: `仅可撤销已批准题目，当前状态: ${question.status}` });

  // Create new DRAFT version copying current content
  const curVer = db.prepare('SELECT * FROM question_versions WHERE id = ?').get(question.current_version_id);
  if (!curVer) return res.status(500).json({ error: '当前版本不存在' });
  const maxV = db.prepare('SELECT MAX(version_number) as max_v FROM question_versions WHERE question_id = ?').get(id);
  const nextV = (maxV ? maxV.max_v : 1) + 1;
  const newVId = uuidv4();
  const transaction = db.transaction(() => {
    db.prepare(`INSERT INTO question_versions (id, question_id, version_number, title, stem_rich_text, options_json, standard_answer_rich_text, explanation_rich_text, katex_source, change_summary, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      newVId, id, nextV, curVer.title, curVer.stem_rich_text, curVer.options_json, curVer.standard_answer_rich_text, curVer.explanation_rich_text, curVer.katex_source, `ADMIN 撤销 APPROVED → DRAFT: ${comment}`, req.user.id
    );
    db.prepare(`UPDATE questions SET current_version_id = ?, status = 'DRAFT', reviewer_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(newVId, id);
    db.prepare(`INSERT INTO review_records (id, question_id, version_id, reviewer_id, action, comment) VALUES (?, ?, ?, ?, 'REJECT', ?)`).run(uuidv4(), id, newVId, req.user.id, `ADMIN 撤销: ${comment}`);
  });
  try {
    transaction();
    logAudit(req.user.id, req.user.username, 'REVOKE_APPROVED', 'QUESTION', id, `撤销已批准题目 v${curVer.version_number} → DRAFT v${nextV}: ${comment} (pins 保持不变，需重审后 re-pin)`);
    res.json({ success: true, message: `已撤销至 DRAFT v${nextV}，需重新送审；考试中的 pin 保持旧版本不变`, newVersionNumber: nextV });
  } catch (err) {
    console.error('Failed to revoke:', err);
    res.status(500).json({ error: '撤销失败: ' + err.message });
  }
});

module.exports = router;
