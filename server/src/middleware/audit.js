const { v4: uuidv4 } = require('uuid');
const db = require('../db');

function logAudit(userId, username, action, resourceType, resourceId, details) {
  try {
    const stmt = db.prepare(`
      INSERT INTO audit_logs (id, user_id, username, action, resource_type, resource_id, details)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      uuidv4(),
      userId || null,
      username || 'System',
      action,
      resourceType,
      resourceId || null,
      typeof details === 'object' ? JSON.stringify(details) : details || null
    );
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

module.exports = { logAudit };
