const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// Get all tags
router.get('/', (req, res) => {
  const tags = db.prepare('SELECT * FROM tags ORDER BY category ASC, name ASC').all();
  
  // Group by category
  const categories = {};
  tags.forEach(tag => {
    if (!categories[tag.category]) {
      categories[tag.category] = [];
    }
    categories[tag.category].push(tag);
  });

  res.json({ tags, categories });
});

// Get all distinct subjects
router.get('/subjects', (req, res) => {
  const subjects = db.prepare(`
    SELECT DISTINCT subject FROM questions WHERE subject IS NOT NULL AND subject != ''
    UNION
    SELECT '高等数学'
    UNION
    SELECT '线性代数'
    UNION
    SELECT '概率论与数理统计'
    UNION
    SELECT '大学物理'
    UNION
    SELECT '数据结构与算法'
    UNION
    SELECT '计算机网络'
  `).all().map(s => s.subject);

  res.json({ subjects: subjects.filter(Boolean) });
});

// Create tag (WRITER, REVIEWER, ADMIN)
router.post('/', authenticateToken, requireRole(['WRITER', 'TEACHER', 'REVIEWER', 'ADMIN']), (req, res) => {
  const { name, category = '知识点', color = '#3b82f6' } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: '标签名称不能为空' });
  }

  const existing = db.prepare('SELECT id FROM tags WHERE name = ?').get(name.trim());
  if (existing) {
    return res.status(400).json({ error: '同名标签已存在' });
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO tags (id, name, category, color)
    VALUES (?, ?, ?, ?)
  `).run(id, name.trim(), category, color);

  logAudit(req.user.id, req.user.username, 'CREATE_TAG', 'TAG', id, `创建标签: ${name} (${category})`);

  const newTag = db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
  res.status(201).json({ tag: newTag });
});

// Update tag (ADMIN)
router.put('/:id', authenticateToken, requireRole(['ADMIN']), (req, res) => {
  const { id } = req.params;
  const { name, category, color } = req.body;

  const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
  if (!tag) {
    return res.status(404).json({ error: '标签不存在' });
  }

  db.prepare(`
    UPDATE tags
    SET name = COALESCE(?, name),
        category = COALESCE(?, category),
        color = COALESCE(?, color)
    WHERE id = ?
  `).run(name ? name.trim() : null, category || null, color || null, id);

  logAudit(req.user.id, req.user.username, 'UPDATE_TAG', 'TAG', id, `更新标签 ID: ${id}`);

  const updatedTag = db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
  res.json({ tag: updatedTag });
});

// Delete tag (ADMIN)
router.delete('/:id', authenticateToken, requireRole(['ADMIN']), (req, res) => {
  const { id } = req.params;
  const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
  if (!tag) {
    return res.status(404).json({ error: '标签不存在' });
  }

  db.prepare('DELETE FROM tags WHERE id = ?').run(id);
  logAudit(req.user.id, req.user.username, 'DELETE_TAG', 'TAG', id, `删除标签: ${tag.name}`);

  res.json({ success: true, message: `已成功删除标签: ${tag.name}` });
});

module.exports = router;
