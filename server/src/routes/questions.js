const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// Helper to format question object
function formatQuestionRow(q) {
  if (!q) return null;
  
  // Parse options_json
  let options = [];
  if (q.options_json) {
    try {
      options = JSON.parse(q.options_json);
    } catch (e) {
      options = [];
    }
  }

  // Fetch tags
  const tags = db.prepare(`
    SELECT t.id, t.name, t.category, t.color
    FROM tags t
    JOIN question_tags qt ON t.id = qt.tag_id
    WHERE qt.question_id = ?
  `).all(q.id);

  return {
    ...q,
    options,
    tags
  };
}

// 1. Multi-faceted Search / List Questions
router.get('/', (req, res) => {
  try {
    const {
      keyword,
      type,
      status,
      difficulty,
      subject,
      tagId,
      authorId,
      page = 1,
      limit = 10,
      sortBy = 'updated_at',
      sortOrder = 'DESC'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;
    const params = [];
    const whereClauses = ['1=1'];

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

    if (type) {
      whereClauses.push('q.type = ?');
      params.push(type);
    }

    if (status) {
      whereClauses.push('q.status = ?');
      params.push(status);
    }

    if (difficulty) {
      whereClauses.push('q.difficulty = ?');
      params.push(parseInt(difficulty, 10));
    }

    if (subject) {
      whereClauses.push('q.subject = ?');
      params.push(subject);
    }

    if (authorId) {
      whereClauses.push('q.author_id = ?');
      params.push(authorId);
    }

    if (tagId) {
      whereClauses.push(`EXISTS (
        SELECT 1 FROM question_tags qt WHERE qt.question_id = q.id AND qt.tag_id = ?
      )`);
      params.push(tagId);
    }

    const allowedSortFields = ['updated_at', 'created_at', 'difficulty', 'type', 'status'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? `q.${sortBy}` : 'q.updated_at';
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Count total matching items
    const countSql = `
      SELECT COUNT(DISTINCT q.id) as total
      FROM questions q
      JOIN question_versions qv ON q.current_version_id = qv.id
      WHERE ${whereClauses.join(' AND ')}
    `;
    const countResult = db.prepare(countSql).get(...params);
    const total = countResult ? countResult.total : 0;

    // Fetch paginated rows with current version snapshot
    const dataSql = `
      SELECT 
        q.id, q.current_version_id, q.type, q.status, q.difficulty, q.subject,
        q.author_id, q.reviewer_id, q.created_at, q.updated_at,
        qv.version_number, qv.title, qv.stem_rich_text, qv.options_json,
        qv.standard_answer_rich_text, qv.explanation_rich_text, qv.change_summary,
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
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (err) {
    console.error('Failed to query questions:', err);
    res.status(500).json({ error: '查询考题失败: ' + err.message });
  }
});

// 2. Get Single Question Details by ID (includes current version snapshot and tags)
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT 
      q.id, q.current_version_id, q.type, q.status, q.difficulty, q.subject,
      q.author_id, q.reviewer_id, q.created_at, q.updated_at,
      qv.version_number, qv.title, qv.stem_rich_text, qv.options_json,
      qv.standard_answer_rich_text, qv.explanation_rich_text, qv.change_summary,
      u.name as author_name, u.username as author_username,
      r.name as reviewer_name,
      (SELECT COUNT(*) FROM question_versions qv2 WHERE qv2.question_id = q.id) as total_versions
    FROM questions q
    JOIN question_versions qv ON q.current_version_id = qv.id
    LEFT JOIN users u ON q.author_id = u.id
    LEFT JOIN users r ON q.reviewer_id = r.id
    WHERE q.id = ?
  `;

  const row = db.prepare(sql).get(id);
  if (!row) {
    return res.status(404).json({ error: '考题不存在' });
  }

  const question = formatQuestionRow(row);

  // Also get review records history
  const reviewHistory = db.prepare(`
    SELECT r.id, r.action, r.comment, r.created_at, u.name as reviewer_name, u.role as reviewer_role
    FROM review_records r
    LEFT JOIN users u ON r.reviewer_id = u.id
    WHERE r.question_id = ?
    ORDER BY r.created_at DESC, r.rowid DESC
  `).all(id);

  res.json({ question, reviewHistory });
});

// 3. Create Question (TEACHER, REVIEWER, ADMIN)
router.post('/', authenticateToken, requireRole(['TEACHER', 'REVIEWER', 'ADMIN']), (req, res) => {
  const {
    type = 'SINGLE_CHOICE',
    difficulty = 3,
    subject = 'AWS Certified Solutions Architect',
    title,
    stem_rich_text,
    options = [],
    standard_answer_rich_text = '',
    explanation_rich_text = '',
    tagIds = [],
    submitForReview = false
  } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: '考题标题不能为空' });
  }
  if (!stem_rich_text || !stem_rich_text.trim()) {
    return res.status(400).json({ error: '考题题干内容不能为空' });
  }

  // Validate options for choice questions
  if (type === 'SINGLE_CHOICE' || type === 'MULTIPLE_CHOICE') {
    if (!Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ error: '选择题必须至少包含 2 个选项' });
    }
    const hasEmpty = options.some(o => !o.text || !o.text.trim());
    if (hasEmpty) {
      return res.status(400).json({ error: '选择题选项内容不能为空' });
    }
    const hasCorrect = options.some(o => o.is_correct);
    if (!hasCorrect) {
      return res.status(400).json({ error: '选择题必须指定至少一个正确选项' });
    }
  }

  const questionId = uuidv4();
  const versionId = uuidv4();
  const initialStatus = submitForReview ? 'PENDING_REVIEW' : 'DRAFT';

  const transaction = db.transaction(() => {
    // 1. Insert Question
    db.prepare(`
      INSERT INTO questions (id, current_version_id, type, status, difficulty, subject, author_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(questionId, versionId, type, initialStatus, difficulty, subject, req.user.id);

    // 2. Insert Version 1
    db.prepare(`
      INSERT INTO question_versions (
        id, question_id, version_number, title, stem_rich_text,
        options_json, standard_answer_rich_text, explanation_rich_text,
        change_summary, created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      versionId,
      questionId,
      1,
      title.trim(),
      stem_rich_text,
      JSON.stringify(options),
      standard_answer_rich_text,
      explanation_rich_text,
      '初始创建',
      req.user.id
    );

    // 3. Insert Question Tags
    if (Array.isArray(tagIds) && tagIds.length > 0) {
      const tagStmt = db.prepare('INSERT INTO question_tags (question_id, tag_id) VALUES (?, ?)');
      tagIds.forEach(tId => {
        try {
          tagStmt.run(questionId, tId);
        } catch (e) {
          // ignore duplicate
        }
      });
    }

    // 4. If submit for review immediately, log in review_records
    if (submitForReview) {
      db.prepare(`
        INSERT INTO review_records (id, question_id, version_id, reviewer_id, action, comment)
        VALUES (?, ?, ?, ?, 'SUBMIT', '提交初审')
      `).run(uuidv4(), questionId, versionId, req.user.id);
    }
  });

  try {
    transaction();
    logAudit(req.user.id, req.user.username, 'CREATE_QUESTION', 'QUESTION', questionId, `创建考题: ${title} (${type})`);
    
    // Return created question
    const created = db.prepare(`
      SELECT q.*, qv.title, qv.stem_rich_text, qv.options_json, qv.standard_answer_rich_text, qv.explanation_rich_text, qv.version_number
      FROM questions q
      JOIN question_versions qv ON q.current_version_id = qv.id
      WHERE q.id = ?
    `).get(questionId);

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
    title,
    stem_rich_text,
    options = [],
    standard_answer_rich_text = '',
    explanation_rich_text = '',
    difficulty,
    subject,
    type,
    tagIds,
    change_summary = '更新考题内容',
    submitForReview = false
  } = req.body;

  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
  if (!question) {
    return res.status(404).json({ error: '考题不存在' });
  }

  // Teacher can only edit their own questions
  if (req.user.role === 'TEACHER' && question.author_id !== req.user.id) {
    return res.status(403).json({ error: '只能编辑本人创建的考题' });
  }

  if (!title || !title.trim()) {
    return res.status(400).json({ error: '考题标题不能为空' });
  }
  if (!stem_rich_text || !stem_rich_text.trim()) {
    return res.status(400).json({ error: '考题题干内容不能为空' });
  }

  const effectiveType = type || question.type;
  if (effectiveType === 'SINGLE_CHOICE' || effectiveType === 'MULTIPLE_CHOICE') {
    if (!Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ error: '选择题必须至少包含 2 个选项' });
    }
    const hasEmpty = options.some(o => !o.text || !o.text.trim());
    if (hasEmpty) {
      return res.status(400).json({ error: '选择题选项内容不能为空' });
    }
    const hasCorrect = options.some(o => o.is_correct);
    if (!hasCorrect) {
      return res.status(400).json({ error: '选择题必须指定至少一个正确选项' });
    }
  }

  // Query latest version number
  const maxVerRow = db.prepare('SELECT MAX(version_number) as max_v FROM question_versions WHERE question_id = ?').get(id);
  const nextVersionNumber = (maxVerRow ? maxVerRow.max_v : 0) + 1;
  const newVersionId = uuidv4();

  const newStatus = submitForReview ? 'PENDING_REVIEW' : 'DRAFT';

  const transaction = db.transaction(() => {
    // 1. Insert new snapshot in question_versions
    db.prepare(`
      INSERT INTO question_versions (
        id, question_id, version_number, title, stem_rich_text,
        options_json, standard_answer_rich_text, explanation_rich_text,
        change_summary, created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newVersionId,
      id,
      nextVersionNumber,
      title.trim(),
      stem_rich_text,
      JSON.stringify(options),
      standard_answer_rich_text,
      explanation_rich_text,
      change_summary.trim() || `版本 v${nextVersionNumber} 迭代`,
      req.user.id
    );

    // 2. Update Question master record
    db.prepare(`
      UPDATE questions
      SET current_version_id = ?,
          type = COALESCE(?, type),
          status = ?,
          difficulty = COALESCE(?, difficulty),
          subject = COALESCE(?, subject),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      newVersionId,
      type || null,
      newStatus,
      difficulty ? parseInt(difficulty, 10) : null,
      subject || null,
      id
    );

    // 3. Update Tags
    if (Array.isArray(tagIds)) {
      db.prepare('DELETE FROM question_tags WHERE question_id = ?').run(id);
      const tagStmt = db.prepare('INSERT INTO question_tags (question_id, tag_id) VALUES (?, ?)');
      tagIds.forEach(tId => {
        try {
          tagStmt.run(id, tId);
        } catch (e) {}
      });
    }

    // 4. Log review submission if requested
    if (submitForReview) {
      db.prepare(`
        INSERT INTO review_records (id, question_id, version_id, reviewer_id, action, comment)
        VALUES (?, ?, ?, ?, 'SUBMIT', ?)
      `).run(uuidv4(), id, newVersionId, req.user.id, `提交版本 v${nextVersionNumber} 审核: ${change_summary}`);
    }
  });

  try {
    transaction();
    logAudit(req.user.id, req.user.username, 'UPDATE_QUESTION', 'QUESTION', id, `更新考题版本至 v${nextVersionNumber}: ${change_summary}`);

    const updated = db.prepare(`
      SELECT q.*, qv.title, qv.stem_rich_text, qv.options_json, qv.standard_answer_rich_text, qv.explanation_rich_text, qv.version_number
      FROM questions q
      JOIN question_versions qv ON q.current_version_id = qv.id
      WHERE q.id = ?
    `).get(id);

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

  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
  if (!question) {
    return res.status(404).json({ error: '考题不存在' });
  }

  // Teacher can only submit their own questions for review
  if (req.user.role === 'TEACHER' && question.author_id !== req.user.id) {
    return res.status(403).json({ error: '只能提交本人创建的考题送审' });
  }

  if (question.status === 'APPROVED') {
    return res.status(400).json({ error: '该考题已通过审核，如需修改请先编辑保存新版本' });
  }

  db.prepare(`
    UPDATE questions
    SET status = 'PENDING_REVIEW', updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(id);

  db.prepare(`
    INSERT INTO review_records (id, question_id, version_id, reviewer_id, action, comment)
    VALUES (?, ?, ?, ?, 'SUBMIT', ?)
  `).run(uuidv4(), id, question.current_version_id, req.user.id, comment);

  logAudit(req.user.id, req.user.username, 'SUBMIT_REVIEW', 'QUESTION', id, `提交考题送审`);

  res.json({ success: true, message: '考题已成功提交至审核大厅' });
});

// 6. Get Question Version History List
router.get('/:id/versions', (req, res) => {
  const { id } = req.params;
  const versions = db.prepare(`
    SELECT qv.*, u.name as author_name, u.username as author_username
    FROM question_versions qv
    LEFT JOIN users u ON qv.created_by = u.id
    WHERE qv.question_id = ?
    ORDER BY qv.version_number DESC
  `).all(id);

  const formatted = versions.map(v => {
    let options = [];
    if (v.options_json) {
      try {
        options = JSON.parse(v.options_json);
      } catch (e) {}
    }
    return { ...v, options };
  });

  res.json({ versions: formatted });
});

// 7. Get Specific Version Snapshot
router.get('/:id/versions/:versionId', (req, res) => {
  const { id, versionId } = req.params;
  const version = db.prepare(`
    SELECT qv.*, u.name as author_name, u.username as author_username
    FROM question_versions qv
    LEFT JOIN users u ON qv.created_by = u.id
    WHERE qv.question_id = ? AND qv.id = ?
  `).get(id, versionId);

  if (!version) {
    return res.status(404).json({ error: '指定版本不存在' });
  }

  let options = [];
  if (version.options_json) {
    try {
      options = JSON.parse(version.options_json);
    } catch (e) {}
  }

  res.json({ version: { ...version, options } });
});

// 8. Rollback to a specific historic version
router.post('/:id/rollback/:versionId', authenticateToken, requireRole(['TEACHER', 'REVIEWER', 'ADMIN']), (req, res) => {
  const { id, versionId } = req.params;
  
  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
  if (!question) {
    return res.status(404).json({ error: '考题不存在' });
  }

  // Teacher can only rollback their own questions
  if (req.user.role === 'TEACHER' && question.author_id !== req.user.id) {
    return res.status(403).json({ error: '只能回滚本人创建的考题版本' });
  }

  const targetVersion = db.prepare('SELECT * FROM question_versions WHERE question_id = ? AND id = ?').get(id, versionId);
  if (!targetVersion) {
    return res.status(404).json({ error: '目标回滚版本不存在' });
  }

  // Get max version number
  const maxV = db.prepare('SELECT MAX(version_number) as max_v FROM question_versions WHERE question_id = ?').get(id);
  const nextV = (maxV ? maxV.max_v : 1) + 1;
  const newVId = uuidv4();

  const transaction = db.transaction(() => {
    // Insert new version holding target version's content
    db.prepare(`
      INSERT INTO question_versions (
        id, question_id, version_number, title, stem_rich_text,
        options_json, standard_answer_rich_text, explanation_rich_text,
        change_summary, created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newVId,
      id,
      nextV,
      targetVersion.title,
      targetVersion.stem_rich_text,
      targetVersion.options_json,
      targetVersion.standard_answer_rich_text,
      targetVersion.explanation_rich_text,
      `回滚至历史版本 v${targetVersion.version_number}`,
      req.user.id
    );

    // Update question current version
    db.prepare(`
      UPDATE questions
      SET current_version_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newVId, id);
  });

  try {
    transaction();
    logAudit(req.user.id, req.user.username, 'ROLLBACK_VERSION', 'QUESTION', id, `回滚考题至历史版本 v${targetVersion.version_number} (生成新版本 v${nextV})`);
    
    res.json({
      success: true,
      message: `已成功回滚至版本 v${targetVersion.version_number}，当前新版本号为 v${nextV}`,
      newVersionNumber: nextV
    });
  } catch (err) {
    console.error('Failed to rollback:', err);
    res.status(500).json({ error: '回滚版本失败: ' + err.message });
  }
});

// 9. Delete Question
router.delete('/:id', authenticateToken, requireRole(['TEACHER', 'ADMIN']), (req, res) => {
  const { id } = req.params;
  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
  if (!question) {
    return res.status(404).json({ error: '考题不存在' });
  }

  if (req.user.role === 'TEACHER' && question.author_id !== req.user.id) {
    return res.status(403).json({ error: '只能删除本人创建的考题' });
  }

  db.prepare('DELETE FROM questions WHERE id = ?').run(id);
  logAudit(req.user.id, req.user.username, 'DELETE_QUESTION', 'QUESTION', id, `删除考题 ID: ${id}`);

  res.json({ success: true, message: '考题已删除' });
});

module.exports = router;
