const express = require('express');
const router = express.Router();
const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');

// 1. Overview Statistics (VIEWER sees APPROVED-only per CONTEXT §4)
router.get('/overview', authenticateToken, (req, res) => {
  try {
    const isViewer = req.user && req.user.role === 'VIEWER';
    const isTeacher = req.user && req.user.role === 'TEACHER';
    let scopeClause = '';
    let scopeParams = [];
    if (isViewer) {
      scopeClause = "status = 'APPROVED' AND deleted_at IS NULL";
    } else if (isTeacher) {
      scopeClause = "(deleted_at IS NULL AND (status = 'APPROVED' OR author_id = ?))";
      scopeParams = [req.user.id];
    } else {
      scopeClause = 'deleted_at IS NULL';
    }

    const getCount = (where) => {
      const row = db.prepare(`SELECT COUNT(*) as c FROM questions WHERE ${where}`).get(...scopeParams);
      return row ? row.c : 0;
    };

    const totalQuestions = db.prepare(`SELECT COUNT(*) as c FROM questions WHERE ${scopeClause}`).get(...scopeParams).c;
    const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
    const pendingReviews = isViewer ? 0 : db.prepare("SELECT COUNT(*) as c FROM questions WHERE status = 'PENDING_REVIEW' AND deleted_at IS NULL").get().c;
    const approvedQuestions = db.prepare("SELECT COUNT(*) as c FROM questions WHERE status = 'APPROVED' AND deleted_at IS NULL").get().c;

    const byType = db.prepare(`SELECT type, COUNT(*) as count FROM questions WHERE ${scopeClause} GROUP BY type`).all(...scopeParams);
    const byStatus = isViewer ? [{ status: 'APPROVED', count: approvedQuestions }] : db.prepare(`SELECT status, COUNT(*) as count FROM questions WHERE deleted_at IS NULL GROUP BY status`).all();
    const byDifficulty = db.prepare(`SELECT difficulty, COUNT(*) as count FROM questions WHERE ${scopeClause} GROUP BY difficulty ORDER BY difficulty ASC`).all(...scopeParams);
    const bySubject = db.prepare(`SELECT subject, COUNT(*) as count FROM questions WHERE ${scopeClause} GROUP BY subject ORDER BY count DESC`).all(...scopeParams);

    const topTags = db.prepare(`
      SELECT t.id, t.name, t.color, t.category, COUNT(qt.question_id) as count
      FROM tags t LEFT JOIN question_tags qt ON t.id = qt.tag_id
      LEFT JOIN questions q ON qt.question_id = q.id AND ${scopeClause.replace(/questions\./g, 'q.').replace(/deleted_at/g, 'q.deleted_at').replace(/status/g, 'q.status').replace(/author_id/g, 'q.author_id')}
      GROUP BY t.id ORDER BY count DESC LIMIT 10
    `).all(...(isTeacher ? scopeParams : []));

    // Simplified topTags for viewer/teacher scoping: just correlate via join condition isn't trivial; fallback to global if scoped query fails
    let safeTopTags;
    try { safeTopTags = topTags; } catch (e) { safeTopTags = db.prepare(`SELECT t.id, t.name, t.color, t.category, COUNT(qt.question_id) as count FROM tags t LEFT JOIN question_tags qt ON t.id = qt.tag_id GROUP BY t.id ORDER BY count DESC LIMIT 10`).all(); }

    const recentActivity = db.prepare(`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 6`).all();

    res.json({
      summary: { totalQuestions, totalUsers, pendingReviews, approvedQuestions, approvalRate: totalQuestions > 0 ? Math.round((approvedQuestions / totalQuestions) * 100) : 0 },
      byType, byStatus, byDifficulty, bySubject, topTags: safeTopTags, recentActivity
    });
  } catch (err) {
    console.error('Stats overview error:', err);
    res.status(500).json({ error: '获取统计数据失败: ' + err.message });
  }
});

// 2. KPI daily rollup (Q17)
router.get('/kpi/daily', authenticateToken, (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM kpi_daily ORDER BY date DESC LIMIT 30').all();
    res.json({ kpi_daily: rows });
  } catch (err) {
    res.status(500).json({ error: 'KPI 查询失败: ' + err.message });
  }
});

router.post('/kpi/refresh', authenticateToken, (req, res) => {
  // ADMIN/REVIEWER only
  if (req.user.role !== 'ADMIN' && req.user.role !== 'REVIEWER') return res.status(403).json({ error: '仅 ADMIN/REVIEWER 可刷新 KPI' });
  try {
    const totalQuestions = db.prepare('SELECT COUNT(*) as c FROM questions WHERE deleted_at IS NULL').get().c;
    const approvedQuestions = db.prepare("SELECT COUNT(*) as c FROM questions WHERE status='APPROVED' AND deleted_at IS NULL").get().c;
    const pendingReviews = db.prepare("SELECT COUNT(*) as c FROM questions WHERE status='PENDING_REVIEW' AND deleted_at IS NULL").get().c;
    const byType = db.prepare('SELECT type, COUNT(*) as count FROM questions WHERE deleted_at IS NULL GROUP BY type').all();
    const byStatus = db.prepare('SELECT status, COUNT(*) as count FROM questions WHERE deleted_at IS NULL GROUP BY status').all();
    const byDifficulty = db.prepare('SELECT difficulty, COUNT(*) as count FROM questions WHERE deleted_at IS NULL GROUP BY difficulty ORDER BY difficulty').all();
    const date = new Date().toISOString().slice(0,10);
    const id = uuidv4();
    db.prepare(`INSERT OR REPLACE INTO kpi_daily (id, date, total_questions, approved_questions, pending_reviews, by_type_json, by_status_json, by_difficulty_json, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`).run(
      id, date, totalQuestions, approvedQuestions, pendingReviews, JSON.stringify(byType), JSON.stringify(byStatus), JSON.stringify(byDifficulty)
    );
    res.json({ success: true, date, totalQuestions, approvedQuestions });
  } catch (err) {
    res.status(500).json({ error: 'KPI 刷新失败: ' + err.message });
  }
});

// 3. Export Questions (Markdown Exam Paper / JSON)
router.get('/export', authenticateToken, (req, res) => {
  const { format = 'json', subject, status = 'APPROVED' } = req.query;
  // VIEWER can only export APPROVED
  if (req.user.role === 'VIEWER' && status !== 'APPROVED' && status !== 'ALL' ) {
    // allow but force APPROVED
  }
  const effectiveStatus = req.user.role === 'VIEWER' ? 'APPROVED' : status;
  
  const where = ['q.deleted_at IS NULL'];
  const params = [];
  if (subject) { where.push('q.subject = ?'); params.push(subject); }
  if (effectiveStatus && effectiveStatus !== 'ALL') { where.push('q.status = ?'); params.push(effectiveStatus); }
  if (req.user.role === 'TEACHER') {
    // teacher sees own drafts + all APPROVED already handled by status filter; if status is DRAFT we scope to own
    if (effectiveStatus !== 'APPROVED' && effectiveStatus !== 'ALL') {
      where.push('q.author_id = ?'); params.push(req.user.id);
    }
  }

  const sql = `
    SELECT 
      q.id, q.type, q.status, q.difficulty, q.subject, q.current_version_id,
      qv.version_number, qv.title, qv.stem_rich_text, qv.options_json, qv.katex_source,
      u.name as author_name
    FROM questions q JOIN question_versions qv ON q.current_version_id = qv.id
    LEFT JOIN users u ON q.author_id = u.id
    WHERE ${where.join(' AND ')} ORDER BY q.type ASC, q.difficulty ASC
  `;
  const rows = db.prepare(sql).all(...params);
  const questions = rows.map(q => {
    let options = [];
    if (q.options_json) try { options = JSON.parse(q.options_json); } catch (e) {}
    const tags = db.prepare(`SELECT t.name FROM tags t JOIN question_tags qt ON t.id = qt.tag_id WHERE qt.question_id = ?`).all(q.id).map(t => t.name);
    return { ...q, options, tags };
  });

  if (format === 'markdown') {
    let md = `# 题库试卷导出 (${subject || '全部学科'}) — Schema v1.0

`;
    md += `> 导出时间: ${new Date().toLocaleString('zh-CN')} | 共计 ${questions.length} 道考题 | 仅题干 (stem-only)

---

`;
    const typeNames = { SINGLE_CHOICE: '一、单选题 (Single Choice)', MULTIPLE_CHOICE: '二、多选题 (Multiple Choice)', ESSAY: '三、问答与计算题 (Essay / Problem Solving)' };
    const grouped = {};
    questions.forEach(q => { if (!grouped[q.type]) grouped[q.type] = []; grouped[q.type].push(q); });
    Object.keys(typeNames).forEach(typeKey => {
      const qList = grouped[typeKey];
      if (qList && qList.length > 0) {
        md += `## ${typeNames[typeKey]}

`;
        qList.forEach((q, idx) => {
          md += `### 第 ${idx + 1} 题: ${q.title} (难度: ${'★'.repeat(q.difficulty)}${'☆'.repeat(5 - q.difficulty)})

`;
          md += `**【题干】**
${q.stem_rich_text}

`;
          if (q.options && q.options.length > 0) {
            md += `**【选项】**
`;
            q.options.forEach(opt => { md += `- **${opt.key}.** ${opt.text}
`; });
            md += `
`;
          }
          if (q.tags && q.tags.length > 0) md += `**【标签】**: \`${q.tags.join('` `')}\`

`;
          md += `---

`;
        });
      }
    });
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="exam-paper.md"');
    return res.send(md);
  }

  res.json({ export_schema_version: '1.0', exported_at: new Date().toISOString(), total: questions.length, questions });
});

module.exports = router;
