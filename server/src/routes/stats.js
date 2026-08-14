const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// 1. Overview Statistics
router.get('/overview', (req, res) => {
  try {
    const totalQuestions = db.prepare('SELECT COUNT(*) as c FROM questions').get().c;
    const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
    const pendingReviews = db.prepare("SELECT COUNT(*) as c FROM questions WHERE status = 'PENDING_REVIEW'").get().c;
    const approvedQuestions = db.prepare("SELECT COUNT(*) as c FROM questions WHERE status = 'APPROVED'").get().c;

    // By Type
    const byType = db.prepare(`
      SELECT type, COUNT(*) as count 
      FROM questions 
      GROUP BY type
    `).all();

    // By Status
    const byStatus = db.prepare(`
      SELECT status, COUNT(*) as count 
      FROM questions 
      GROUP BY status
    `).all();

    // By Difficulty
    const byDifficulty = db.prepare(`
      SELECT difficulty, COUNT(*) as count 
      FROM questions 
      GROUP BY difficulty 
      ORDER BY difficulty ASC
    `).all();

    // By Subject
    const bySubject = db.prepare(`
      SELECT subject, COUNT(*) as count 
      FROM questions 
      GROUP BY subject 
      ORDER BY count DESC
    `).all();

    // Top Tags
    const topTags = db.prepare(`
      SELECT t.id, t.name, t.color, t.category, COUNT(qt.question_id) as count
      FROM tags t
      LEFT JOIN question_tags qt ON t.id = qt.tag_id
      GROUP BY t.id
      ORDER BY count DESC
      LIMIT 10
    `).all();

    // Recent Activity (from audit logs)
    const recentActivity = db.prepare(`
      SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 6
    `).all();

    res.json({
      summary: {
        totalQuestions,
        totalUsers,
        pendingReviews,
        approvedQuestions,
        approvalRate: totalQuestions > 0 ? Math.round((approvedQuestions / totalQuestions) * 100) : 0
      },
      byType,
      byStatus,
      byDifficulty,
      bySubject,
      topTags,
      recentActivity
    });
  } catch (err) {
    console.error('Stats overview error:', err);
    res.status(500).json({ error: '获取统计数据失败: ' + err.message });
  }
});

// 2. Export Questions (Markdown Exam Paper / JSON)
router.get('/export', authenticateToken, (req, res) => {
  const { format = 'json', subject, status = 'APPROVED' } = req.query;
  
  const where = ['1=1'];
  const params = [];
  if (subject) {
    where.push('q.subject = ?');
    params.push(subject);
  }
  if (status && status !== 'ALL') {
    where.push('q.status = ?');
    params.push(status);
  }

  const sql = `
    SELECT 
      q.id, q.type, q.status, q.difficulty, q.subject,
      qv.version_number, qv.title, qv.stem_rich_text, qv.options_json,
      qv.standard_answer_rich_text, qv.explanation_rich_text,
      u.name as author_name
    FROM questions q
    JOIN question_versions qv ON q.current_version_id = qv.id
    LEFT JOIN users u ON q.author_id = u.id
    WHERE ${where.join(' AND ')}
    ORDER BY q.type ASC, q.difficulty ASC
  `;

  const rows = db.prepare(sql).all(...params);
  const questions = rows.map(q => {
    let options = [];
    if (q.options_json) {
      try { options = JSON.parse(q.options_json); } catch (e) {}
    }
    const tags = db.prepare(`
      SELECT t.name FROM tags t
      JOIN question_tags qt ON t.id = qt.tag_id
      WHERE qt.question_id = ?
    `).all(q.id).map(t => t.name);

    return { ...q, options, tags };
  });

  if (format === 'markdown') {
    // Generate Markdown formatted Exam Paper
    let md = `# 题库试卷导出 (${subject || '全部学科'})\n\n`;
    md += `> 导出时间: ${new Date().toLocaleString('zh-CN')} | 共计 ${questions.length} 道考题\n\n`;
    md += `---\n\n`;

    const typeNames = {
      SINGLE_CHOICE: '一、单选题 (Single Choice)',
      MULTIPLE_CHOICE: '二、多选题 (Multiple Choice)',
      ESSAY: '三、问答与计算题 (Essay / Problem Solving)'
    };

    const grouped = {};
    questions.forEach(q => {
      if (!grouped[q.type]) grouped[q.type] = [];
      grouped[q.type].push(q);
    });

    Object.keys(typeNames).forEach(typeKey => {
      const qList = grouped[typeKey];
      if (qList && qList.length > 0) {
        md += `## ${typeNames[typeKey]}\n\n`;
        qList.forEach((q, idx) => {
          md += `### 第 ${idx + 1} 题: ${q.title} (难度: ${'★'.repeat(q.difficulty)}${'☆'.repeat(5 - q.difficulty)})\n\n`;
          md += `**【题干】**\n${q.stem_rich_text}\n\n`;
          
          if (q.options && q.options.length > 0) {
            md += `**【选项】**\n`;
            q.options.forEach(opt => {
              md += `- **${opt.key}.** ${opt.text}\n`;
            });
            md += `\n`;
          }

          md += `<details><summary>👉 点击展开【参考答案与解析】</summary>\n\n`;
          md += `**【标准答案】**: ${q.standard_answer_rich_text || '略'}\n\n`;
          if (q.explanation_rich_text) {
            md += `**【解析与考点】**:\n${q.explanation_rich_text}\n\n`;
          }
          if (q.tags && q.tags.length > 0) {
            md += `**【标签】**: \`${q.tags.join('` `')}\`\n\n`;
          }
          md += `</details>\n\n---\n\n`;
        });
      }
    });

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="exam-paper.md"');
    return res.send(md);
  }

  res.json({ questions });
});

module.exports = router;
