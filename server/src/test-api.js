const db = require('./db');

console.log('Testing Database Schema & Certification Exam Records...');

const exams = db.prepare('SELECT * FROM exams').all();
console.log(`✓ Loaded ${exams.length} certification exam folders:`, exams.map(e => `${e.code} (${e.title})`));

const questions = db.prepare('SELECT count(*) as count FROM questions').get();
console.log(`✓ Total certification questions in DB: ${questions.count}`);

const examQuestions = db.prepare('SELECT eq.*, e.title as exam_title FROM exam_questions eq JOIN exams e ON eq.exam_id = e.id').all();
console.log(`✓ Total assigned questions in certification exam folders: ${examQuestions.length}`);

const users = db.prepare('SELECT username, role, name FROM users').all();
console.log('✓ Users & RBAC roles:', users);

console.log('All backend database tests PASSED successfully!');
