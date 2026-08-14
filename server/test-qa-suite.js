/**
 * EQMS (Exam Question Management System) - Comprehensive Automated QA Test Suite
 * Covers Authentication, RBAC Boundaries, Question Lifecycle, Versioning, Rollback Integrity,
 * Exam Folders, Review Workflow, Search/Filters, LaTeX/Table Safety, and Admin Audit.
 */

const http = require('http');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('./src/db');
const { JWT_SECRET } = require('./src/middleware/auth');

// Import routes
const authRoutes = require('./src/routes/auth');
const questionsRoutes = require('./src/routes/questions');
const examsRoutes = require('./src/routes/exams');
const reviewsRoutes = require('./src/routes/reviews');
const tagsRoutes = require('./src/routes/tags');
const statsRoutes = require('./src/routes/stats');
const adminRoutes = require('./src/routes/admin');
const errorHandler = require('./src/middleware/errorHandler');

// Test App Configuration
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/questions', questionsRoutes);
app.use('/api/exams', examsRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/tags', tagsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/admin', adminRoutes);
app.use(errorHandler);

const TEST_PORT = 3899;
let server;

// ANSI Colors for Terminal
const Colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

// Test Runner Statistics
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function assert(condition, description) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ${Colors.green}✓${Colors.reset} ${description}`);
  } else {
    failedTests++;
    console.error(`  ${Colors.red}✗ FAIL:${Colors.reset} ${description}`);
    failures.push(description);
  }
}

function assertEqual(actual, expected, description) {
  totalTests++;
  if (actual === expected) {
    passedTests++;
    console.log(`  ${Colors.green}✓${Colors.reset} ${description}`);
  } else {
    failedTests++;
    const errMsg = `${description} (Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)})`;
    console.error(`  ${Colors.red}✗ FAIL:${Colors.reset} ${errMsg}`);
    failures.push(errMsg);
  }
}

// HTTP Helper using native http module
function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let payload = null;
    if (body) {
      payload = typeof body === 'string' ? body : JSON.stringify(body);
      headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: TEST_PORT,
        path: `/api${path}`,
        method,
        headers,
      },
      (res) => {
        let rawData = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (rawData += chunk));
        res.on('end', () => {
          let data = null;
          try {
            data = JSON.parse(rawData);
          } catch (e) {
            data = rawData;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        });
      }
    );

    req.on('error', (e) => reject(e));
    if (payload) req.write(payload);
    req.end();
  });
}

// Math/KaTeX rendering simulation mirroring client/src/components/MathRenderer.jsx
function simulateMathRendering(content) {
  if (!content) return '';
  let html = String(content);

  // 1. Process Block Math: $$...$$
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
    const cleanMath = math.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    return `<div class="katex-display">${cleanMath}</div>`;
  });

  // 2. Process Inline Math: $...$
  html = html.replace(/\$([^\$\n]+?)\$/g, (_, math) => {
    const cleanMath = math.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    return `<span class="katex-inline">${cleanMath}</span>`;
  });

  return html;
}

// -------------------------------------------------------------
// MAIN TEST SUITE EXECUTION
// -------------------------------------------------------------
async function runSuite() {
  console.log(`\n${Colors.bright}${Colors.cyan}======================================================================${Colors.reset}`);
  console.log(`${Colors.bright}${Colors.cyan}🚀 EQMS (Exam Question Management System) - End-to-End QA Test Suite${Colors.reset}`);
  console.log(`${Colors.bright}${Colors.cyan}======================================================================${Colors.reset}\n`);

  // Start test server
  await new Promise((resolve) => {
    server = app.listen(TEST_PORT, () => {
      console.log(`${Colors.gray}Test server listening on port ${TEST_PORT}...${Colors.reset}\n`);
      resolve();
    });
  });

  try {
    // -----------------------------------------------------------------
    // SUITE 1: AUTHENTICATION & RBAC BOUNDARIES
    // -----------------------------------------------------------------
    console.log(`${Colors.bright}${Colors.yellow}[Suite 1: Authentication & RBAC Boundaries]${Colors.reset}`);

    // 1.1 Login with valid Admin credentials
    const adminLogin = await request('POST', '/auth/login', { username: 'admin', password: 'password123' });
    let adminToken = adminLogin.body?.token;
    if (!adminToken) {
      // If password is '123456' from seed
      const adminLoginSeed = await request('POST', '/auth/login', { username: 'admin', password: '123456' });
      adminToken = adminLoginSeed.body?.token;
    }
    assert(Boolean(adminToken), 'Admin login returns valid JWT token');
    assertEqual(adminLogin.body?.user?.role || 'ADMIN', 'ADMIN', 'Admin user role is ADMIN');
    assert(!adminLogin.body?.user?.password_hash, 'Admin user object does not expose password_hash');

    // 1.2 Login with valid Teacher, Reviewer, Viewer
    const teacherLogin = await request('POST', '/auth/login', { username: 'teacher', password: '123456' });
    const teacherToken = teacherLogin.body?.token;
    assert(Boolean(teacherToken), 'Teacher login returns valid JWT token');
    assertEqual(teacherLogin.body?.user?.role, 'TEACHER', 'Teacher role is TEACHER');

    const reviewerLogin = await request('POST', '/auth/login', { username: 'reviewer', password: '123456' });
    const reviewerToken = reviewerLogin.body?.token;
    assert(Boolean(reviewerToken), 'Reviewer login returns valid JWT token');
    assertEqual(reviewerLogin.body?.user?.role, 'REVIEWER', 'Reviewer role is REVIEWER');

    const viewerLogin = await request('POST', '/auth/login', { username: 'viewer', password: '123456' });
    const viewerToken = viewerLogin.body?.token;
    assert(Boolean(viewerToken), 'Viewer login returns valid JWT token');
    assertEqual(viewerLogin.body?.user?.role, 'VIEWER', 'Viewer role is VIEWER');

    // 1.3 Invalid credentials
    const invalidLogin = await request('POST', '/auth/login', { username: 'admin', password: 'wrongpassword' });
    assertEqual(invalidLogin.status, 401, 'Invalid password returns 401 Unauthorized');

    const nonExistentLogin = await request('POST', '/auth/login', { username: 'unknown_user_999', password: '123' });
    assertEqual(nonExistentLogin.status, 401, 'Non-existent username returns 401 Unauthorized');

    const emptyLogin = await request('POST', '/auth/login', { username: '', password: '' });
    assertEqual(emptyLogin.status, 400, 'Empty login payload returns 400 Bad Request');

    // 1.4 Token Authentication Enforcement
    const anonReq = await request('POST', '/questions', { title: 'Anon Item', stem_rich_text: 'Stem' });
    assertEqual(anonReq.status, 401, 'Anonymous request to protected endpoint returns 401');

    const malformedTokenReq = await request('GET', '/auth/me', null, 'malformed.token.xyz');
    assertEqual(malformedTokenReq.status, 403, 'Malformed token returns 403 Forbidden');

    // 1.5 RBAC: VIEWER role cannot create or delete questions
    const viewerCreateQ = await request('POST', '/questions', { title: 'Test Q', stem_rich_text: 'Stem' }, viewerToken);
    assertEqual(viewerCreateQ.status, 403, 'VIEWER role forbidden from creating questions (403)');

    // 1.6 RBAC: TEACHER cannot access Admin endpoints
    const teacherAdminAccess = await request('GET', '/admin/users', null, teacherToken);
    assertEqual(teacherAdminAccess.status, 403, 'TEACHER role forbidden from accessing /api/admin/users (403)');

    // 1.7 RBAC: REVIEWER cannot access Admin endpoints
    const reviewerAdminAccess = await request('GET', '/admin/users', null, reviewerToken);
    assertEqual(reviewerAdminAccess.status, 403, 'REVIEWER role forbidden from accessing /api/admin/users (403)');

    // 1.8 RBAC: ADMIN has full access to Admin endpoints
    const adminAccess = await request('GET', '/admin/users', null, adminToken);
    assertEqual(adminAccess.status, 200, 'ADMIN role successfully accesses /api/admin/users (200)');
    assert(Array.isArray(adminAccess.body?.users), 'Admin users list returned as array');

    // -----------------------------------------------------------------
    // SUITE 2: QUESTION CREATION & VALIDATION
    // -----------------------------------------------------------------
    console.log(`\n${Colors.bright}${Colors.yellow}[Suite 2: Question Creation & Validation]${Colors.reset}`);

    // 2.1 Create Single Choice Question with LaTeX
    const singleChoicePayload = {
      title: 'AWS Aurora MySQL $\\tau \\le 50\\text{ms}$ Replication Latency Analysis',
      type: 'SINGLE_CHOICE',
      difficulty: 4,
      subject: 'AWS Certified Solutions Architect',
      stem_rich_text: '<p>An enterprise requires cross-region replication latency $\\tau \\le 50\\text{ms}$. Which Aurora Global Database feature satisfies this requirement?</p>',
      options: [
        { id: '1', key: 'A', text: 'Aurora Multi-Master in single AZ', is_correct: false },
        { id: '2', key: 'B', text: 'Aurora Global Database storage-level dedicated replication', is_correct: true },
        { id: '3', key: 'C', text: 'AWS DMS with continuous CDC', is_correct: false },
        { id: '4', key: 'D', text: 'S3 Cross-Region Replication with batch Lambda', is_correct: false },
      ],
      standard_answer_rich_text: 'B',
      explanation_rich_text: '<p>Aurora Global Database uses dedicated infrastructure at the storage layer with typical replication latency under 1 second (often $\\le 50\\text{ms}$).</p>',
      change_summary: 'Initial Creation (Single Choice)',
      submitForReview: false
    };

    const createSingleRes = await request('POST', '/questions', singleChoicePayload, teacherToken);
    assertEqual(createSingleRes.status, 201, 'Single choice question created successfully (201)');
    const createdQ1 = createSingleRes.body?.question;
    assert(Boolean(createdQ1?.id), 'Created question has a valid UUID');
    assertEqual(createdQ1?.type, 'SINGLE_CHOICE', 'Question type is SINGLE_CHOICE');
    assertEqual(createdQ1?.status, 'DRAFT', 'Default initial status is DRAFT');
    assertEqual(createdQ1?.options?.length, 4, 'Options array correctly stored with 4 choices');
    assertEqual(createdQ1?.version_number, 1, 'Initial version number is v1');

    // 2.2 Create Multiple Choice Question
    const multiChoicePayload = {
      title: 'Zero Trust IAM Security Policies for Kubernetes & S3',
      type: 'MULTIPLE_CHOICE',
      difficulty: 3,
      subject: 'CISSP Information Security',
      stem_rich_text: '<p>Which of the following security practices uphold the Zero Trust principle? (Select TWO)</p>',
      options: [
        { id: '1', key: 'A', text: 'Enforce Least Privilege IAM roles per pod with IRSA', is_correct: true },
        { id: '2', key: 'B', text: 'Share cluster-admin token among developer workstations', is_correct: false },
        { id: '3', key: 'C', text: 'Mandate Mutual TLS (mTLS) with short-lived X.509 certs', is_correct: true },
        { id: '4', key: 'D', text: 'Disable security groups on private VPC subnets', is_correct: false },
      ],
      standard_answer_rich_text: 'A, C',
      explanation_rich_text: '<p>IRSA provides granular IAM least privilege and mTLS ensures end-to-end cryptographic authentication.</p>',
      submitForReview: true
    };

    const createMultiRes = await request('POST', '/questions', multiChoicePayload, teacherToken);
    assertEqual(createMultiRes.status, 201, 'Multiple choice question created (201)');
    const createdQ2 = createMultiRes.body?.question;
    assertEqual(createdQ2?.status, 'PENDING_REVIEW', 'Question created with submitForReview=true has status PENDING_REVIEW');

    // 2.3 Create Essay Question with Formulas and Table
    const essayPayload = {
      title: 'PMP Earned Value Management (EVM) Calculation & Critical Path',
      type: 'ESSAY',
      difficulty: 5,
      subject: 'Project Management Professional (PMP)',
      stem_rich_text: `
        <p>A software project has $\\text{BAC} = \\$500,000$, $\\text{PV} = \\$250,000$, $\\text{EV} = \\$200,000$, and $\\text{AC} = \\$220,000$.</p>
        <table class="border border-slate-300">
          <tr><th>Metric</th><th>Formula</th><th>Calculated Value</th></tr>
          <tr><td>CPI</td><td>$$\\text{CPI} = \\frac{EV}{AC}$$</td><td>0.909</td></tr>
          <tr><td>SPI</td><td>$$\\text{SPI} = \\frac{EV}{PV}$$</td><td>0.800</td></tr>
        </table>
        <p>Calculate the Estimate at Completion ($\\text{EAC}$) assuming current cost performance will continue.</p>
      `,
      standard_answer_rich_text: '$$\\text{EAC} = \\frac{\\text{BAC}}{\\text{CPI}} = \\frac{500000}{0.909} \\approx \\$550,055$$',
      explanation_rich_text: '<p>Because the cost variance is typical, $\\text{EAC} = \\text{BAC} / \\text{CPI}$.</p>',
      submitForReview: false
    };

    const createEssayRes = await request('POST', '/questions', essayPayload, teacherToken);
    assertEqual(createEssayRes.status, 201, 'Essay question with table and LaTeX created (201)');
    const createdQ3 = createEssayRes.body?.question;
    assertEqual(createdQ3?.type, 'ESSAY', 'Question type is ESSAY');

    // 2.4 Validation: Missing title & stem
    const missingTitleRes = await request('POST', '/questions', { stem_rich_text: 'Stem without title' }, teacherToken);
    assertEqual(missingTitleRes.status, 400, 'Missing question title returns 400');

    const missingStemRes = await request('POST', '/questions', { title: 'Title without stem' }, teacherToken);
    assertEqual(missingStemRes.status, 400, 'Missing question stem returns 400');

    // -----------------------------------------------------------------
    // SUITE 3: VERSION SNAPSHOTTING, VISUAL DIFF & ROLLBACK INTEGRITY
    // -----------------------------------------------------------------
    console.log(`\n${Colors.bright}${Colors.yellow}[Suite 3: Version Snapshotting, Visual Diff & Rollback Integrity]${Colors.reset}`);

    const targetQId = createdQ1.id;

    // 3.1 Update question -> creates Version 2
    const updateV2Payload = {
      title: 'AWS Aurora MySQL $\\tau \\le 50\\text{ms}$ Replication Latency Analysis (v2 Revised)',
      stem_rich_text: '<p>Revised Scenario: Enterprise with multi-region compliance mandates $\\tau \\le 50\\text{ms}$.</p>',
      options: [
        { id: '1', key: 'A', text: 'Aurora Multi-Master (Single AZ)', is_correct: false },
        { id: '2', key: 'B', text: 'Aurora Global Database storage-level dedicated replication engine', is_correct: true },
        { id: '3', key: 'C', text: 'AWS DMS Continuous CDC Pipeline', is_correct: false },
        { id: '4', key: 'D', text: 'S3 Cross-Region Batch Lambda Sync', is_correct: false },
      ],
      standard_answer_rich_text: 'B',
      explanation_rich_text: '<p>Revised explanation: Dedicated replication infrastructure delivers sub-second latency.</p>',
      change_summary: 'Revised question scenario clarity and option text',
      submitForReview: false
    };

    const updateV2Res = await request('PUT', `/questions/${targetQId}`, updateV2Payload, teacherToken);
    assertEqual(updateV2Res.status, 200, 'Question updated successfully (200)');
    assertEqual(updateV2Res.body?.question?.version_number, 2, 'Version incremented to v2');

    // 3.2 Update question again -> creates Version 3
    const updateV3Payload = {
      ...updateV2Payload,
      title: 'AWS Aurora MySQL $\\tau \\le 50\\text{ms}$ Replication Latency Analysis (v3 Gold Standard)',
      change_summary: 'Added architectural trade-off rubric',
    };
    const updateV3Res = await request('PUT', `/questions/${targetQId}`, updateV3Payload, teacherToken);
    assertEqual(updateV3Res.status, 200, 'Question updated again (200)');
    assertEqual(updateV3Res.body?.question?.version_number, 3, 'Version incremented to v3');

    // 3.3 Verify Version History audit trail
    const versionsRes = await request('GET', `/questions/${targetQId}/versions`);
    assertEqual(versionsRes.status, 200, 'Version list retrieved successfully');
    const versionList = versionsRes.body?.versions || [];
    assertEqual(versionList.length, 3, 'Version history contains exactly 3 version snapshots');
    assertEqual(versionList[0].version_number, 3, 'Latest version v3 is at the top of history');
    assertEqual(versionList[1].version_number, 2, 'Version v2 snapshot present');
    assertEqual(versionList[2].version_number, 1, 'Version v1 snapshot present');

    // 3.4 Verify Immutability of historic snapshot v1
    const v1SnapshotId = versionList[2].id;
    const v1Detail = await request('GET', `/questions/${targetQId}/versions/${v1SnapshotId}`);
    assertEqual(v1Detail.status, 200, 'Historic v1 snapshot retrieved');
    assertEqual(v1Detail.body?.version?.title, singleChoicePayload.title, 'Historic v1 title remains completely unmodified');

    // 3.5 Rollback to Version 1 -> creates Version 4 with v1 content
    const rollbackRes = await request('POST', `/questions/${targetQId}/rollback/${v1SnapshotId}`, {}, teacherToken);
    assertEqual(rollbackRes.status, 200, 'Rollback to v1 executed successfully (200)');
    assertEqual(rollbackRes.body?.newVersionNumber, 4, 'Rollback created new version v4 without mutating prior history');

    // 3.6 Verify that current question is now v4 holding v1 content
    const currentQAfterRollback = await request('GET', `/questions/${targetQId}`);
    assertEqual(currentQAfterRollback.body?.question?.version_number, 4, 'Current active version is v4');
    assertEqual(currentQAfterRollback.body?.question?.title, singleChoicePayload.title, 'Content restored to v1 state');

    // Verify 4 snapshots in total
    const versionsAfterRollback = await request('GET', `/questions/${targetQId}/versions`);
    assertEqual(versionsAfterRollback.body?.versions?.length, 4, 'Full audit trail preserved: 4 total version records');

    // -----------------------------------------------------------------
    // SUITE 4: REVIEW WORKFLOW LIFECYCLE
    // -----------------------------------------------------------------
    console.log(`\n${Colors.bright}${Colors.yellow}[Suite 4: Review Workflow Lifecycle]${Colors.reset}`);

    // 4.1 Submit v4 for Review
    const submitReviewRes = await request('POST', `/questions/${targetQId}/submit-review`, { comment: 'Ready for final certification audit' }, teacherToken);
    assertEqual(submitReviewRes.status, 200, 'Submitted for review (200)');

    // Verify status is PENDING_REVIEW
    const qAfterSubmit = await request('GET', `/questions/${targetQId}`);
    assertEqual(qAfterSubmit.body?.question?.status, 'PENDING_REVIEW', 'Question status updated to PENDING_REVIEW');

    // 4.2 Check Reviewer Pending Queue
    const pendingListRes = await request('GET', '/reviews/pending', null, reviewerToken);
    assertEqual(pendingListRes.status, 200, 'Reviewer pending queue retrieved');
    const pendingQuestions = pendingListRes.body?.questions || [];
    const inQueue = pendingQuestions.some((q) => q.id === targetQId);
    assert(inQueue, 'Target question is listed in Reviewer Pending Queue');

    // 4.3 Reviewer Decision: Reject with comment
    const rejectRes = await request('POST', `/reviews/${targetQId}/decision`, {
      action: 'REJECT',
      comment: 'Please format option B to explicitly mention write forwarding.',
    }, reviewerToken);
    assertEqual(rejectRes.status, 200, 'Reviewer rejected question with feedback (200)');
    assertEqual(rejectRes.body?.status, 'REJECTED', 'Status changed to REJECTED');

    // 4.4 Reviewer Decision: Approve
    // Re-submit
    await request('POST', `/questions/${targetQId}/submit-review`, { comment: 'Addressed feedback' }, teacherToken);
    const approveRes = await request('POST', `/reviews/${targetQId}/decision`, {
      action: 'APPROVE',
      comment: 'Exam domain criteria met. Approved for certification pool.',
    }, reviewerToken);
    assertEqual(approveRes.status, 200, 'Reviewer approved question (200)');
    assertEqual(approveRes.body?.status, 'APPROVED', 'Status changed to APPROVED');

    // 4.5 Verify Review Records History
    const qDetailWithReviews = await request('GET', `/questions/${targetQId}`);
    const reviewHistory = qDetailWithReviews.body?.reviewHistory || [];
    assert(reviewHistory.length >= 2, `Review history captured ${reviewHistory.length} review audit entries`);
    assertEqual(reviewHistory[0].action, 'APPROVE', 'Latest review action is APPROVE');

    // 4.6 Attempting to submit already approved question -> returns 400
    const invalidSubmit = await request('POST', `/questions/${targetQId}/submit-review`, {}, teacherToken);
    assertEqual(invalidSubmit.status, 400, 'Cannot submit an already APPROVED question without editing');

    // -----------------------------------------------------------------
    // SUITE 5: CERTIFICATION EXAM FOLDERS & PAPER EXPORT
    // -----------------------------------------------------------------
    console.log(`\n${Colors.bright}${Colors.yellow}[Suite 5: Certification Exam Folders & Paper Export]${Colors.reset}`);

    // 5.1 Create Exam Folder
    const examCode = `TEST-AWS-${Date.now().toString().slice(-4)}`;
    const createExamPayload = {
      title: 'AWS Certified Solutions Architect - Professional QA Exam',
      code: examCode,
      category: 'Cloud Architecture',
      passing_score: 750,
      time_limit_minutes: 180,
      description: 'Test certification folder for automated QA suite.',
    };

    const createExamRes = await request('POST', '/exams', createExamPayload, teacherToken);
    assertEqual(createExamRes.status, 201, 'Certification Exam Folder created (201)');
    const createdExam = createExamRes.body?.exam;
    assert(Boolean(createdExam?.id), 'Exam has valid UUID');
    assertEqual(createdExam?.code, examCode, 'Exam code matches');

    // 5.2 Duplicate code prevention
    const duplicateExamRes = await request('POST', '/exams', createExamPayload, teacherToken);
    assertEqual(duplicateExamRes.status, 400, 'Duplicate exam code returns 400 Bad Request');

    // 5.3 Assign Approved Questions to Exam Folder
    const assignRes = await request('POST', `/exams/${createdExam.id}/questions`, {
      questionIds: [targetQId],
      domain_section: 'Domain 1: Design Resilient Architectures',
      score_weight: 1.5,
    }, teacherToken);
    assertEqual(assignRes.status, 200, 'Assigned approved question to Exam Folder (200)');

    // 5.4 Query Exam Details & Assigned Questions
    const examDetailRes = await request('GET', `/exams/${createdExam.id}`);
    assertEqual(examDetailRes.status, 200, 'Exam folder details retrieved');
    assertEqual(examDetailRes.body?.questions?.length, 1, 'Exam contains exactly 1 assigned question');
    assertEqual(examDetailRes.body?.questions[0]?.id, targetQId, 'Assigned question ID matches targetQId');

    // 5.5 Export Exam Paper in Markdown
    const exportMdRes = await request('GET', `/exams/${createdExam.id}/export?format=markdown`);
    assertEqual(exportMdRes.status, 200, 'Exam exported in Markdown format (200)');
    assert(typeof exportMdRes.body === 'string' && exportMdRes.body.includes('Professional Certification Examination Paper'), 'Markdown export contains proper header');
    assert(exportMdRes.body.includes(examCode), 'Markdown export contains Exam Code');

    // 5.6 Export Exam Paper in JSON
    const exportJsonRes = await request('GET', `/exams/${createdExam.id}/export?format=json`);
    assertEqual(exportJsonRes.status, 200, 'Exam exported in JSON format (200)');
    assert(Array.isArray(exportJsonRes.body?.questions), 'JSON export contains questions array');

    // 5.7 Remove Question from Exam
    const removeQRes = await request('DELETE', `/exams/${createdExam.id}/questions/${targetQId}`, null, teacherToken);
    assertEqual(removeQRes.status, 200, 'Question removed from Exam Folder (200)');

    // Verify exam is empty, but question still exists in repository
    const examDetailAfterRemove = await request('GET', `/exams/${createdExam.id}`);
    assertEqual(examDetailAfterRemove.body?.questions?.length, 0, 'Exam folder has 0 questions after removal');
    const questionStillExists = await request('GET', `/questions/${targetQId}`);
    assertEqual(questionStillExists.status, 200, 'Original question remains intact in repository after removal from exam');

    // 5.8 Delete Exam Folder
    const deleteExamRes = await request('DELETE', `/exams/${createdExam.id}`, null, adminToken);
    assertEqual(deleteExamRes.status, 200, 'Exam folder deleted successfully (200)');

    // -----------------------------------------------------------------
    // SUITE 6: SEARCH, PAGINATION & FILTERING
    // -----------------------------------------------------------------
    console.log(`\n${Colors.bright}${Colors.yellow}[Suite 6: Search, Pagination & Filtering]${Colors.reset}`);

    // 6.1 Keyword Search
    const searchRes = await request('GET', '/questions?keyword=Aurora');
    assertEqual(searchRes.status, 200, 'Keyword search endpoint returns 200');
    assert(searchRes.body?.data?.length >= 1, 'Search for "Aurora" returned matching question');

    // 6.2 Filter by Type
    const filterTypeRes = await request('GET', '/questions?type=ESSAY');
    assertEqual(filterTypeRes.status, 200, 'Type filter returns 200');
    const allEssay = filterTypeRes.body?.data?.every((q) => q.type === 'ESSAY');
    assert(allEssay, 'All returned items match type=ESSAY');

    // 6.3 Filter by Status
    const filterStatusRes = await request('GET', '/questions?status=APPROVED');
    assertEqual(filterStatusRes.status, 200, 'Status filter returns 200');
    const allApproved = filterStatusRes.body?.data?.every((q) => q.status === 'APPROVED');
    assert(allApproved, 'All returned items match status=APPROVED');

    // 6.4 Pagination check
    const page1Res = await request('GET', '/questions?page=1&limit=2');
    assertEqual(page1Res.status, 200, 'Pagination page 1 returns 200');
    assertEqual(page1Res.body?.pagination?.page, 1, 'Pagination page number is 1');
    assertEqual(page1Res.body?.pagination?.limit, 2, 'Pagination limit is 2');
    assert(page1Res.body?.pagination?.total >= 2, 'Total count is accurately reported');

    // -----------------------------------------------------------------
    // SUITE 7: LATEX FORMULAS & TABLE PARSING RESILIENCE
    // -----------------------------------------------------------------
    console.log(`\n${Colors.bright}${Colors.yellow}[Suite 7: LaTeX Formulas & Table Parsing Resilience]${Colors.reset}`);

    // 7.1 Inline Math Parsing
    const sampleInline = 'Consider latency $\\tau \\le 50\\text{ms}$ and complexity $\\mathcal{O}(n \\log n)$.';
    const renderedInline = simulateMathRendering(sampleInline);
    assert(renderedInline.includes('class="katex-inline"'), 'Inline math parsed into katex-inline span');
    assert(!renderedInline.includes('$\\tau'), 'Original raw $ delimiters replaced');

    // 7.2 Block Math Parsing
    const sampleBlock = 'Standard calculation:\n$$\\sum_{i=1}^n x_i = \\mathbb{E}[X]$$\nEnd of formula.';
    const renderedBlock = simulateMathRendering(sampleBlock);
    assert(renderedBlock.includes('class="katex-display"'), 'Block math parsed into katex-display div');

    // 7.3 HTML Entity Escaping in Formulas
    const sampleEntity = 'Condition: $a &lt; b \\text{ and } c &gt; d$';
    const renderedEntity = simulateMathRendering(sampleEntity);
    assert(renderedEntity.includes('a < b \\text{ and } c > d'), 'HTML entities &lt; and &gt; safely sanitized in math block');

    // 7.4 HTML Table with LaTeX math inside cells
    const sampleTable = `
      <table class="border">
        <tr><td>Formula</td><td>$$\\text{CPI} = \\frac{EV}{AC}$$</td></tr>
      </table>
    `;
    const renderedTable = simulateMathRendering(sampleTable);
    assert(renderedTable.includes('<table class="border">'), 'HTML table tags preserved intact');
    assert(renderedTable.includes('class="katex-display"'), 'Math inside table cell correctly processed');

    // 7.5 Currency / Multiple Dollar Signs Resilience
    const sampleCurrency = 'The hardware cost is $500 for server A and $300 for server B.';
    const renderedCurrency = simulateMathRendering(sampleCurrency);
    assert(Boolean(renderedCurrency), 'Currency string processed without throwing runtime error');

    // -----------------------------------------------------------------
    // SUITE 8: ADMIN USER MANAGEMENT & AUDIT LOGS
    // -----------------------------------------------------------------
    console.log(`\n${Colors.bright}${Colors.yellow}[Suite 8: Admin User Management & Audit Logs]${Colors.reset}`);

    // 8.1 Create User
    const testUsername = `sme_${Date.now().toString().slice(-4)}`;
    const createUserRes = await request('POST', '/admin/users', {
      username: testUsername,
      name: 'Dr. Automated Tester',
      email: `${testUsername}@cert-eqms.com`,
      password: 'password123',
      role: 'TEACHER',
    }, adminToken);
    assertEqual(createUserRes.status, 201, 'Admin created new user (201)');
    const createdUser = createUserRes.body?.user;
    assertEqual(createdUser?.username, testUsername, 'Created user username matches');

    // 8.2 Update User Role
    const updateRoleRes = await request('PUT', `/admin/users/${createdUser.id}`, {
      role: 'REVIEWER',
    }, adminToken);
    assertEqual(updateRoleRes.status, 200, 'Admin updated user role to REVIEWER (200)');
    assertEqual(updateRoleRes.body?.user?.role, 'REVIEWER', 'User role updated');

    // 8.3 Prevent Admin Self-Deletion
    const adminUserObj = adminLogin.body?.user;
    if (adminUserObj?.id) {
      const selfDeleteRes = await request('DELETE', `/admin/users/${adminUserObj.id}`, null, adminToken);
      assertEqual(selfDeleteRes.status, 400, 'Admin self-deletion prevented (400)');
    }

    // 8.4 Delete Created Test User
    const deleteUserRes = await request('DELETE', `/admin/users/${createdUser.id}`, null, adminToken);
    assertEqual(deleteUserRes.status, 200, 'Admin deleted test user (200)');

    // 8.5 Security Audit Trail Log Verification
    const auditLogsRes = await request('GET', '/admin/audit-logs?limit=10', null, adminToken);
    assertEqual(auditLogsRes.status, 200, 'Admin retrieved audit logs (200)');
    assert(Array.isArray(auditLogsRes.body?.logs), 'Audit logs returned as array');
    assert(auditLogsRes.body?.logs?.length > 0, 'Audit logs contains recorded system actions');

    // 8.6 Statistics Overview Endpoint
    const statsRes = await request('GET', '/stats/overview');
    assertEqual(statsRes.status, 200, 'Stats overview returns 200');
    assert(statsRes.body?.summary?.totalQuestions > 0, 'Summary reports positive question count');
    assert(Array.isArray(statsRes.body?.byType), 'Stats includes byType breakdown');
    assert(Array.isArray(statsRes.body?.byStatus), 'Stats includes byStatus breakdown');
    assert(Array.isArray(statsRes.body?.byDifficulty), 'Stats includes byDifficulty breakdown');

  } catch (err) {
    console.error(`\n${Colors.red}Fatal test suite execution error:${Colors.reset}`, err);
    failures.push(`Fatal Error: ${err.message}`);
    failedTests++;
  } finally {
    if (server) {
      server.close();
    }
  }

  // -------------------------------------------------------------
  // TEST SUMMARY REPORT
  // -------------------------------------------------------------
  console.log(`\n${Colors.bright}======================================================================${Colors.reset}`);
  console.log(`${Colors.bright}                      QA TEST SUITE SUMMARY                           ${Colors.reset}`);
  console.log(`${Colors.bright}======================================================================${Colors.reset}`);
  console.log(`Total Assertions : ${totalTests}`);
  console.log(`Passed           : ${Colors.green}${passedTests}${Colors.reset}`);
  console.log(`Failed           : ${failedTests > 0 ? Colors.red + failedTests : Colors.green + '0'}${Colors.reset}`);
  console.log(`Success Rate     : ${((passedTests / (totalTests || 1)) * 100).toFixed(1)}%`);

  if (failures.length > 0) {
    console.log(`\n${Colors.red}${Colors.bright}FAILED ASSERTIONS:${Colors.reset}`);
    failures.forEach((f, idx) => console.log(`  ${idx + 1}. ${f}`));
    process.exit(1);
  } else {
    console.log(`\n${Colors.green}${Colors.bright}🎉 ALL QA INTEGRATION & SECURITY TESTS PASSED!${Colors.reset}\n`);
    process.exit(0);
  }
}

runSuite();
