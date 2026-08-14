const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, username);
  if (!user) {
    return res.status(401).json({ error: '用户不存在或密码错误' });
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ error: '用户不存在或密码错误' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  logAudit(user.id, user.username, 'LOGIN', 'USER', user.id, `用户 ${user.username} 登录系统`);

  const { password_hash, ...safeUser } = user;
  res.json({
    token,
    user: safeUser
  });
});

// Quick switch role/user for demo & testing
router.post('/switch-user', (req, res) => {
  const { userId } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(404).json({ error: '目标用户不存在' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  logAudit(user.id, user.username, 'SWITCH_ROLE', 'USER', user.id, `快速切换身份至 ${user.name} (${user.role})`);

  const { password_hash, ...safeUser } = user;
  res.json({
    token,
    user: safeUser
  });
});

// List all users for demo quick-switcher
router.get('/demo-users', (req, res) => {
  const users = db.prepare('SELECT id, username, email, role, name, avatar FROM users ORDER BY role ASC').all();
  res.json({ users });
});

// Current User Profile
router.get('/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, username, email, role, name, avatar, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }
  res.json({ user });
});

module.exports = router;
