const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'eqms-super-secure-secret-key-2026';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '未提供身份认证令牌 (Token Missing)' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: '认证令牌无效或已过期 (Token Invalid/Expired)' });
    }
    req.user = user;
    next();
  });
}

function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: '请先登录系统' });
    }
    
    // ADMIN has bypass for everything
    if (req.user.role === 'ADMIN' || allowedRoles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({ 
      error: `权限不足: 当前角色 [${req.user.role}] 无法执行此操作，需要角色: [${allowedRoles.join(', ')}]` 
    });
  };
}

module.exports = {
  JWT_SECRET,
  authenticateToken,
  requireRole,
};
