const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const MAX_SIZE = 5 * 1024 * 1024; // 5MB per Q16

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || (file.mimetype === 'image/png' ? '.png' : file.mimetype === 'image/webp' ? '.webp' : '.jpg');
    cb(null, uuidv4() + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error('仅支持 jpg/png/webp 图片（≤5MB），已拒绝: ' + file.mimetype));
    }
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.svg') return cb(new Error('SVG 图片已禁用（XSS 向量）'));
    cb(null, null);
  }
});

// POST /api/uploads/image - TEACHER/REVIEWER/ADMIN per Q16
router.post('/image', authenticateToken, requireRole(['TEACHER', 'REVIEWER', 'ADMIN']), (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) return res.status(400).json({ error: '未收到图片文件' });
    const url = `/uploads/${req.file.filename}`;
    logAudit(req.user.id, req.user.username, 'UPLOAD_IMAGE', 'UPLOAD', req.file.filename, `上传图片 ${req.file.originalname} -> ${url}`);
    res.json({ url, filename: req.file.filename, mimetype: req.file.mimetype, size: req.file.size });
  });
});

module.exports = router;
