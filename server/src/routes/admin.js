const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// All admin routes require ADMIN role
router.use(authenticateToken, requireRole(['ADMIN']));

// 1. Get All Users
router.get('/users', (req, res) => {
  const users = db.prepare(`
    SELECT id, username, email, role, name, avatar, created_at,
      (SELECT COUNT(*) FROM questions WHERE author_id = users.id) as question_count
    FROM users
    ORDER BY created_at DESC
  `).all();

  res.json({ users });
});

// 2. Create User
router.post('/users', (req, res) => {
  const { username, email, password, role = 'WRITER', name } = req.body;

  if (!username || !email || !password || !name) {
    return res.status(400).json({ error: '请填写完整用户信息 (用户名、邮箱、密码、姓名)' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username.trim(), email.trim());
  if (existing) {
    return res.status(400).json({ error: '用户名或邮箱已存在' });
  }

  const id = uuidv4();
  const passwordHash = bcrypt.hashSync(password, 10);

  db.prepare(`
    INSERT INTO users (id, username, email, password_hash, role, name)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, username.trim(), email.trim(), passwordHash, role, name.trim());

  logAudit(req.user.id, req.user.username, 'CREATE_USER', 'USER', id, `创建新用户: ${username} (${role})`);

  const created = db.prepare('SELECT id, username, email, role, name, created_at FROM users WHERE id = ?').get(id);
  res.status(201).json({ user: created });
});

// 3. Update User (Role, Name, etc.)
router.put('/users/:id', (req, res) => {
  const { id } = req.params;
  const { role, name, email, password } = req.body;

  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!target) {
    return res.status(404).json({ error: '目标用户不存在' });
  }

  let hash = target.password_hash;
  if (password && password.trim()) {
    hash = bcrypt.hashSync(password.trim(), 10);
  }

  db.prepare(`
    UPDATE users
    SET role = COALESCE(?, role),
        name = COALESCE(?, name),
        email = COALESCE(?, email),
        password_hash = ?
    WHERE id = ?
  `).run(role || null, name || null, email || null, hash, id);

  logAudit(req.user.id, req.user.username, 'UPDATE_USER', 'USER', id, `更新用户 ${target.username} 信息与角色为 ${role || target.role}`);

  const updated = db.prepare('SELECT id, username, email, role, name, created_at FROM users WHERE id = ?').get(id);
  res.json({ user: updated });
});

// 4. Delete User
router.delete('/users/:id', (req, res) => {
  const { id } = req.params;
  if (id === req.user.id) {
    return res.status(400).json({ error: '无法删除当前登录的管理员自身账号' });
  }

  const target = db.prepare('SELECT username FROM users WHERE id = ?').get(id);
  if (!target) {
    return res.status(404).json({ error: '目标用户不存在' });
  }

  // Check foreign key dependencies to prevent SQLite constraint error
  const questionCount = db.prepare('SELECT COUNT(*) as c FROM questions WHERE author_id = ?').get(id).c;
  const examCount = db.prepare('SELECT COUNT(*) as c FROM exams WHERE created_by = ?').get(id).c;
  const reviewCount = db.prepare('SELECT COUNT(*) as c FROM review_records WHERE reviewer_id = ?').get(id).c;

  if (questionCount > 0 || examCount > 0 || reviewCount > 0) {
    return res.status(400).json({
      error: `无法直接删除用户 [${target.username}]：该账号名下存在关联业务记录（${questionCount} 道考题、${examCount} 个认证考试、${reviewCount} 条评审记录）。`
    });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  logAudit(req.user.id, req.user.username, 'DELETE_USER', 'USER', id, `删除用户: ${target.username}`);

  res.json({ success: true, message: `已成功删除用户: ${target.username}` });
});

// 5. Get Audit Logs
router.get('/audit-logs', (req, res) => {
  const { page = 1, limit = 20, action, username, keyword } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  const where = ['1=1'];
  const params = [];
  if (action) {
    where.push('action = ?');
    params.push(action);
  }
  if (username) {
    where.push('username LIKE ?');
    params.push(`%${username}%`);
  }
  if (keyword && keyword.trim()) {
    where.push('(details LIKE ? OR username LIKE ? OR action LIKE ?)');
    const kw = `%${keyword.trim()}%`;
    params.push(kw, kw, kw);
  }

  const whereSql = where.join(' AND ');
  const total = db.prepare(`SELECT COUNT(*) as total FROM audit_logs WHERE ${whereSql}`).get(...params).total;
  
  const logs = db.prepare(`
    SELECT * FROM audit_logs 
    WHERE ${whereSql}
    ORDER BY created_at DESC 
    LIMIT ? OFFSET ?
  `).all(...params, limitNum, offset);

  res.json({
    logs,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1
    }
  });
});

module.exports = router;
