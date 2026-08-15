const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const db = require("../db");
const { JWT_SECRET, authenticateToken } = require("../middleware/auth");
const { logAudit } = require("../middleware/audit");

const avatarDir = path.join(__dirname, "..", "uploads", "avatars");
if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });

const avatarStorage = multer.diskStorage({
	destination: (req, file, cb) => cb(null, avatarDir),
	filename: (req, file, cb) => {
		const ext = path.extname(file.originalname).toLowerCase();
		const safeExt = [".jpg", ".jpeg", ".png", ".webp"].includes(ext)
			? ext
			: ".png";
		cb(null, uuidv4() + safeExt);
	},
});

const avatarUpload = multer({
	storage: avatarStorage,
	limits: { fileSize: 2 * 1024 * 1024 },
	fileFilter: (req, file, cb) => {
		const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
		if (!allowed.includes(file.mimetype)) {
			return cb(new Error("Avatar must be jpg/png/webp (≤2MB)"));
		}
		const ext = path.extname(file.originalname).toLowerCase();
		if (ext === ".svg") return cb(new Error("SVG avatars are not allowed"));
		cb(null, null);
	},
});

// Login
router.post("/login", (req, res) => {
	const { username, password } = req.body;
	if (!username || !password) {
		return res.status(400).json({ error: "用户名和密码不能为空" });
	}

	const user = db
		.prepare("SELECT * FROM users WHERE username = ? OR email = ?")
		.get(username, username);
	if (!user) {
		return res.status(401).json({ error: "用户不存在或密码错误" });
	}

	const isMatch = bcrypt.compareSync(password, user.password_hash);
	if (!isMatch) {
		return res.status(401).json({ error: "用户不存在或密码错误" });
	}

	const token = jwt.sign(
		{ id: user.id, username: user.username, role: user.role, name: user.name },
		JWT_SECRET,
		{ expiresIn: "7d" },
	);

	logAudit(
		user.id,
		user.username,
		"LOGIN",
		"USER",
		user.id,
		`用户 ${user.username} 登录系统`,
	);

	const { password_hash, ...safeUser } = user;
	res.json({
		token,
		user: safeUser,
	});
});

// Quick switch role/user for demo & testing
router.post("/switch-user", (req, res) => {
	const { userId } = req.body;
	const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
	if (!user) {
		return res.status(404).json({ error: "目标用户不存在" });
	}

	const token = jwt.sign(
		{ id: user.id, username: user.username, role: user.role, name: user.name },
		JWT_SECRET,
		{ expiresIn: "7d" },
	);

	logAudit(
		user.id,
		user.username,
		"SWITCH_ROLE",
		"USER",
		user.id,
		`快速切换身份至 ${user.name} (${user.role})`,
	);

	const { password_hash, ...safeUser } = user;
	res.json({
		token,
		user: safeUser,
	});
});

// List all users for demo quick-switcher
router.get("/demo-users", (req, res) => {
	const users = db
		.prepare(
			"SELECT id, username, email, role, name, avatar FROM users ORDER BY role ASC",
		)
		.all();
	res.json({ users });
});

// Current User Profile
router.get("/me", authenticateToken, (req, res) => {
	const user = db
		.prepare(
			"SELECT id, username, email, role, name, avatar, created_at FROM users WHERE id = ?",
		)
		.get(req.user.id);
	if (!user) {
		return res.status(404).json({ error: "用户不存在" });
	}
	res.json({ user });
});

// Update own profile (name, email, password)
router.put("/profile", authenticateToken, (req, res) => {
	const { name, email, password, currentPassword } = req.body;
	const userId = req.user.id;
	const existing = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
	if (!existing) return res.status(404).json({ error: "用户不存在" });

	// If password change requested, verify currentPassword
	let newHash = existing.password_hash;
	if (password && password.trim()) {
		if (
			!currentPassword ||
			!bcrypt.compareSync(currentPassword, existing.password_hash)
		) {
			return res.status(400).json({ error: "Current password is incorrect" });
		}
		newHash = bcrypt.hashSync(password.trim(), 10);
	}

	if (email && email.trim() && email.trim() !== existing.email) {
		const dup = db
			.prepare("SELECT id FROM users WHERE email = ? AND id != ?")
			.get(email.trim(), userId);
		if (dup) return res.status(400).json({ error: "Email already in use" });
	}

	const newName = name && name.trim() ? name.trim() : existing.name;
	const newEmail = email && email.trim() ? email.trim() : existing.email;

	db.prepare(
		"UPDATE users SET name = ?, email = ?, password_hash = ? WHERE id = ?",
	).run(newName, newEmail, newHash, userId);
	logAudit(
		userId,
		existing.username,
		"UPDATE_PROFILE",
		"USER",
		userId,
		`Updated profile: ${newName} <${newEmail}>`,
	);

	const updated = db
		.prepare(
			"SELECT id, username, email, role, name, avatar, created_at FROM users WHERE id = ?",
		)
		.get(userId);
	// Issue new token so name in token stays fresh (optional)
	const token = jwt.sign(
		{
			id: updated.id,
			username: updated.username,
			role: updated.role,
			name: updated.name,
		},
		JWT_SECRET,
		{ expiresIn: "7d" },
	);
	res.json({ user: updated, token });
});

// Upload avatar (authenticated, any role)
router.post("/avatar", authenticateToken, (req, res) => {
	avatarUpload.single("avatar")(req, res, (err) => {
		if (err) return res.status(400).json({ error: err.message });
		if (!req.file)
			return res.status(400).json({ error: "No avatar file received" });
		const url = `/uploads/avatars/${req.file.filename}`;
		// Remove old avatar file if it was a local upload (optional)
		const prev = db
			.prepare("SELECT avatar FROM users WHERE id = ?")
			.get(req.user.id);
		db.prepare("UPDATE users SET avatar = ? WHERE id = ?").run(
			url,
			req.user.id,
		);
		logAudit(
			req.user.id,
			req.user.username,
			"UPLOAD_AVATAR",
			"USER",
			req.user.id,
			`Uploaded avatar -> ${url}`,
		);
		const updated = db
			.prepare(
				"SELECT id, username, email, role, name, avatar, created_at FROM users WHERE id = ?",
			)
			.get(req.user.id);
		const token = jwt.sign(
			{
				id: updated.id,
				username: updated.username,
				role: updated.role,
				name: updated.name,
			},
			JWT_SECRET,
			{ expiresIn: "7d" },
		);
		res.json({ url, user: updated, token });
	});
});

module.exports = router;
