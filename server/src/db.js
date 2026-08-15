const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'data', 'eqms.db');
const dataDir = path.dirname(dbPath);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('ADMIN', 'REVIEWER', 'WRITER', 'VIEWER', 'TEACHER')),
      name TEXT NOT NULL,
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      category TEXT DEFAULT '知识点',
      color TEXT DEFAULT '#3b82f6',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS exams (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'Cloud Architecture',
      passing_score INTEGER DEFAULT 750,
      time_limit_minutes INTEGER DEFAULT 180,
      minimum_total_weight INTEGER DEFAULT 100,
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DRAFT', 'ARCHIVED')),
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      current_version_id TEXT,
      type TEXT NOT NULL CHECK (type IN ('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'ESSAY')),
      status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED')),
      difficulty INTEGER NOT NULL DEFAULT 3 CHECK (difficulty BETWEEN 1 AND 5),
      subject TEXT NOT NULL DEFAULT 'AWS Solutions Architect',
      author_id TEXT NOT NULL,
      reviewer_id TEXT,
      deleted_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (author_id) REFERENCES users(id),
      FOREIGN KEY (reviewer_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS exam_questions (
      exam_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      pinned_version_id TEXT,
      domain_section TEXT DEFAULT 'Core Knowledge Domain',
      order_index INTEGER DEFAULT 1,
      score_weight REAL DEFAULT 1.0,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (exam_id, question_id),
      FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
      FOREIGN KEY (pinned_version_id) REFERENCES question_versions(id)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      created_by TEXT NOT NULL,
      assignee_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS','IN_REVIEW','COMPLETED')),
      required_count INTEGER NOT NULL,
      subject TEXT,
      category TEXT,
      type_breakdown TEXT, -- JSON {SINGLE_CHOICE: n, MULTIPLE_CHOICE: n, ESSAY: n} optional
      difficulty_min INTEGER,
      difficulty_max INTEGER,
      target_exam_folder_id TEXT,
      deadline TEXT NOT NULL,
      revision_deadline TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (assignee_id) REFERENCES users(id),
      FOREIGN KEY (target_exam_folder_id) REFERENCES exams(id)
    );

    CREATE TABLE IF NOT EXISTS question_versions (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL,
      version_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      stem_rich_text TEXT NOT NULL,
      options_json TEXT,
      standard_answer_rich_text TEXT,
      explanation_rich_text TEXT,
      katex_source TEXT,
      change_summary TEXT DEFAULT 'Initial Version',
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS question_tags (
      question_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (question_id, tag_id),
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS review_records (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL,
      version_id TEXT,
      reviewer_id TEXT NOT NULL,
      action TEXT NOT NULL CHECK (action IN ('APPROVE', 'REJECT', 'SUBMIT')),
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewer_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      username TEXT,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS task_reviews (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      reviewer_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      verdict TEXT NOT NULL CHECK (verdict IN ('ACCEPT','REJECT','REVISE')),
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewer_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS kpi_daily (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      total_questions INTEGER DEFAULT 0,
      approved_questions INTEGER DEFAULT 0,
      pending_reviews INTEGER DEFAULT 0,
      by_type_json TEXT,
      by_status_json TEXT,
      by_difficulty_json TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Idempotent column migrations for existing DBs
  const migrate = (table, col, ddl) => {
    try {
      const cols = db.prepare(`PRAGMA table_info(${table})`).all();
      if (!cols.some(c => c.name === col)) {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
        console.log(`[migrate] added ${table}.${col}`);
      }
    } catch (e) {
      console.warn(`[migrate] ${table}.${col} failed:`, e.message);
    }
  };
  migrate('exams', 'minimum_total_weight', 'minimum_total_weight INTEGER DEFAULT 100');
  migrate('questions', 'deleted_at', 'deleted_at DATETIME');
  migrate('exam_questions', 'pinned_version_id', 'pinned_version_id TEXT');
  migrate('question_versions', 'katex_source', 'katex_source TEXT');
  migrate('questions', 'task_id', 'task_id TEXT');

  // Backfill pinned_version_id for existing rows (current_version_id where APPROVED)
  try {
    const rows = db.prepare(`
      SELECT eq.exam_id, eq.question_id, q.current_version_id, q.status
      FROM exam_questions eq
      JOIN questions q ON eq.question_id = q.id
      WHERE eq.pinned_version_id IS NULL
    `).all();
    if (rows.length > 0) {
      const upd = db.prepare('UPDATE exam_questions SET pinned_version_id = ? WHERE exam_id = ? AND question_id = ?');
      let filled = 0;
      rows.forEach(r => {
        if (r.current_version_id) {
          upd.run(r.current_version_id, r.exam_id, r.question_id);
          filled++;
        }
      });
      if (filled) console.log(`[migrate] backfilled pinned_version_id for ${filled} exam_questions`);
    }
  } catch (e) {
    console.warn('[migrate] pinned_version_id backfill failed:', e.message);
  }

  // Composite indices
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_questions_status_type_difficulty_subject ON questions(status, type, difficulty, subject);
    CREATE INDEX IF NOT EXISTS idx_exam_questions_exam_pinned ON exam_questions(exam_id, pinned_version_id);
    CREATE INDEX IF NOT EXISTS idx_questions_deleted_at ON questions(deleted_at);
    CREATE INDEX IF NOT EXISTS idx_questions_author_id ON questions(author_id);
    CREATE INDEX IF NOT EXISTS idx_question_versions_qid_vnum ON question_versions(question_id, version_number);
    CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id, status);
    CREATE INDEX IF NOT EXISTS idx_questions_task ON questions(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_reviews_task ON task_reviews(task_id);
  `);
}

initSchema();

module.exports = db;
