const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');

function seedDatabase() {
  console.log('Seeding Professional Certification EQMS database...');

  // 1. Clear existing data
  db.exec(`
    DELETE FROM audit_logs;
    DELETE FROM review_records;
    DELETE FROM exam_questions;
    DELETE FROM question_tags;
    DELETE FROM question_versions;
    DELETE FROM questions;
    DELETE FROM exams;
    DELETE FROM tags;
    DELETE FROM users;
  `);

  const passwordHash = bcrypt.hashSync('123456', 10);

  // 2. Insert Users (Certification Domain)
  const users = [
    { id: 'usr_admin', username: 'admin', email: 'admin@cert-eqms.com', role: 'ADMIN', name: 'Director Alex Chen (Certification Director)' },
    { id: 'usr_reviewer', username: 'reviewer', email: 'reviewer@cert-eqms.com', role: 'REVIEWER', name: 'Dr. Sarah Jenkins (Chief Exam Reviewer)' },
    { id: 'usr_teacher', username: 'teacher', email: 'teacher@cert-eqms.com', role: 'TEACHER', name: 'Marcus Vance (Lead Subject Matter Expert)' },
    { id: 'usr_viewer', username: 'viewer', email: 'viewer@cert-eqms.com', role: 'VIEWER', name: 'Elena Rostova (Compliance Auditor)' },
  ];

  const userStmt = db.prepare(`
    INSERT INTO users (id, username, email, password_hash, role, name)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  users.forEach(u => userStmt.run(u.id, u.username, u.email, passwordHash, u.role, u.name));

  // 3. Insert Certification Exam Folders
  const exams = [
    {
      id: 'exam_aws_sap',
      title: 'AWS Certified Solutions Architect - Professional',
      code: 'SAP-C02',
      category: 'Cloud Architecture',
      passing_score: 750,
      time_limit_minutes: 180,
      description: 'Validates advanced technical skills and experience in designing distributed applications and systems on the AWS platform.'
    },
    {
      id: 'exam_cissp',
      title: 'CISSP - Certified Information Systems Security Professional',
      code: 'CISSP-2026',
      category: 'Cybersecurity',
      passing_score: 700,
      time_limit_minutes: 240,
      description: 'Globally recognized standard of achievement confirming deep technical and managerial competence across all 8 security domains.'
    },
    {
      id: 'exam_pmp',
      title: 'PMP - Project Management Professional Certification',
      code: 'PMP-v7',
      category: 'Project Management',
      passing_score: 800,
      time_limit_minutes: 230,
      description: 'Evaluates proficiency in predictive, agile, and hybrid project management approaches based on PMBOK 7th Edition.'
    },
    {
      id: 'exam_cka',
      title: 'CKA - Certified Kubernetes Administrator',
      code: 'CKA-2026',
      category: 'DevOps & Containers',
      passing_score: 660,
      time_limit_minutes: 120,
      description: 'Hands-on performance certification proving capability to design, configure, manage, and troubleshoot production Kubernetes clusters.'
    }
  ];

  const examStmt = db.prepare(`
    INSERT INTO exams (id, title, code, description, category, passing_score, time_limit_minutes, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 'usr_admin')
  `);
  exams.forEach(e => examStmt.run(e.id, e.title, e.code, e.description, e.category, e.passing_score, e.time_limit_minutes));

  // 4. Insert Certification Tags
  const tags = [
    { id: 'tag_1', name: 'High Availability & Fault Tolerance', category: 'Architecture', color: '#3b82f6' },
    { id: 'tag_2', name: 'Zero Trust & IAM', category: 'Security', color: '#10b981' },
    { id: 'tag_3', name: 'Earned Value Management (EVM)', category: 'PMP Formulas', color: '#8b5cf6' },
    { id: 'tag_4', name: 'Cryptographic Protocols', category: 'Security', color: '#f59e0b' },
    { id: 'tag_5', name: 'Container Networking & CNI', category: 'DevOps', color: '#06b6d4' },
    { id: 'tag_6', name: 'Disaster Recovery (RTO/RPO)', category: 'Compliance', color: '#ef4444' },
    { id: 'tag_7', name: 'CAP Theorem & Distributed Data', category: 'Data Engineering', color: '#ec4899' },
    { id: 'tag_8', name: 'Critical Path Method (CPM)', category: 'PMP Formulas', color: '#6366f1' },
  ];

  const tagStmt = db.prepare('INSERT INTO tags (id, name, category, color) VALUES (?, ?, ?, ?)');
  tags.forEach(t => tagStmt.run(t.id, t.name, t.category, t.color));

  // 5. Certification Exam Questions

  // --- Question 1: Single Choice (AWS Solutions Architect) - APPROVED with 2 versions
  const q1Id = uuidv4();
  const q1v1Id = uuidv4();
  const q1v2Id = uuidv4();

  db.prepare(`
    INSERT INTO questions (id, current_version_id, type, status, difficulty, subject, author_id, reviewer_id)
    VALUES (?, ?, 'SINGLE_CHOICE', 'APPROVED', 4, 'AWS Certified Solutions Architect', 'usr_teacher', 'usr_reviewer')
  `).run(q1Id, q1v2Id);

  // Version 1 of Q1
  db.prepare(`
    INSERT INTO question_versions (id, question_id, version_number, title, stem_rich_text, options_json, standard_answer_rich_text, explanation_rich_text, change_summary, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-3 days'))
  `).run(
    q1v1Id, q1Id, 1,
    'Multi-Region Active-Active DynamoDB Global Tables Latency Optimization',
    '<p>A global financial trading platform requires active-active multi-region deployment across <code>us-east-1</code> and <code>eu-west-1</code> with replication latency bounded by $\\tau_{\\text{repl}} \\le 50\\text{ms}$.</p><p>Which architecture best satisfies the Recovery Time Objective (RTO $\\approx 0$) and zero data loss requirement?</p>',
    JSON.stringify([
      { id: '1', key: 'A', text: 'Amazon Aurora PostgreSQL with Cross-Region Read Replicas', is_correct: false },
      { id: '2', key: 'B', text: 'Amazon DynamoDB Global Tables with strongly consistent local reads and write conflict resolution', is_correct: true },
      { id: '3', key: 'C', text: 'Amazon RDS Multi-AZ with synchronous cross-region standby', is_correct: false },
      { id: '4', key: 'D', text: 'Amazon S3 Cross-Region Replication with SQS FIFO buffer', is_correct: false }
    ]),
    'B',
    '<p>DynamoDB Global Tables provides fully managed active-active replication with local write response times in single-digit milliseconds.</p>',
    'Initial Item Draft',
    'usr_teacher'
  );

  // Version 2 of Q1
  db.prepare(`
    INSERT INTO question_versions (id, question_id, version_number, title, stem_rich_text, options_json, standard_answer_rich_text, explanation_rich_text, change_summary, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-1 day'))
  `).run(
    q1v2Id, q1Id, 2,
    'Multi-Region Active-Active DynamoDB Global Tables Latency Optimization (Enhanced)',
    '<p><strong>[Scenario Question - SAP-C02 Domain 1: Design Resilient Architectures]</strong></p><p>A global enterprise deploying microservices across three AWS regions (<code>us-east-1</code>, <code>eu-central-1</code>, <code>ap-northeast-1</code>) requires global read/write data access where replication convergence satisfies:</p><p>$$\\mathbb{E}[\\Delta t_{\\text{convergence}}] = \\max_{i,j} \\left( \\text{RTT}_{ij} + \\frac{\\text{Payload}}{\\text{Bandwidth}} \\right) \\le 45\\text{ms}$$</p><p>Evaluate the trade-offs in the table below and select the optimal database architectural pattern:</p>',
    JSON.stringify([
      { id: '1', key: 'A', text: 'Amazon Aurora Multi-Master with asynchronous binlog replication', is_correct: false },
      { id: '2', key: 'B', text: 'Amazon DynamoDB Global Tables with local read/write endpoints and concurrent version control', is_correct: true },
      { id: '3', key: 'C', text: 'Self-managed CockroachDB cluster across AWS Transit Gateways', is_correct: false },
      { id: '4', key: 'D', text: 'Amazon S3 Multi-Region Access Points with DynamoDB metadata lock table', is_correct: false }
    ]),
    'B',
    '<p><strong>【Architectural Rationale & Domain Analysis】</strong></p><table class="min-w-full border border-slate-300 text-sm my-2"><thead><tr class="bg-slate-100"><th class="border p-2">Architecture Option</th><th class="border p-2">Replication Latency</th><th class="border p-2">RTO / RPO Profile</th><th class="border p-2">Compliance Verdict</th></tr></thead><tbody><tr><td class="border p-2">Aurora Read Replicas</td><td class="border p-2">$\\sim 100-200\\text{ms}$</td><td class="border p-2">RTO &lt; 5m, RPO &lt; 1s</td><td class="border p-2">Cross-region writes not supported directly</td></tr><tr><td class="border p-2 font-bold text-emerald-700">DynamoDB Global Tables</td><td class="border p-2 font-bold text-emerald-700">$\\le 40\\text{ms}$</td><td class="border p-2 font-bold text-emerald-700">RTO $\\approx 0$, RPO $\\approx 0$</td><td class="border p-2 font-bold text-emerald-700">Optimal Active-Active Pattern (SAP-C02 Recommended)</td></tr></tbody></table>',
    'Review feedback: added detailed architectural trade-off table and domain convergence latency formula',
    'usr_teacher'
  );

  db.prepare('INSERT INTO question_tags VALUES (?, ?)').run(q1Id, 'tag_1');
  db.prepare('INSERT INTO question_tags VALUES (?, ?)').run(q1Id, 'tag_6');
  db.prepare('INSERT INTO exam_questions (exam_id, question_id, domain_section, order_index, score_weight) VALUES (?, ?, ?, ?, ?)').run('exam_aws_sap', q1Id, 'Domain 1: Design Solutions for Organizational Complexity', 1, 1.0);

  // Review record for Q1
  db.prepare(`
    INSERT INTO review_records (id, question_id, version_id, reviewer_id, action, comment)
    VALUES (?, ?, ?, 'usr_reviewer', 'APPROVE', 'Excellent scenario-based item compliant with AWS SAP-C02 Domain 1 specification. Rationale table is exhaustive.')
  `).run(uuidv4(), q1Id, q1v2Id);


  // --- Question 2: Multiple Choice (PMP EVM Formulas & Schedule Variance) - APPROVED
  const q2Id = uuidv4();
  const q2v1Id = uuidv4();

  db.prepare(`
    INSERT INTO questions (id, current_version_id, type, status, difficulty, subject, author_id, reviewer_id)
    VALUES (?, ?, 'MULTIPLE_CHOICE', 'APPROVED', 4, 'Project Management Professional (PMP)', 'usr_teacher', 'usr_reviewer')
  `).run(q2Id, q2v1Id);

  db.prepare(`
    INSERT INTO question_versions (id, question_id, version_number, title, stem_rich_text, options_json, standard_answer_rich_text, explanation_rich_text, change_summary, created_by)
    VALUES (?, ?, 1, ?, ?, ?, ?, ?, 'PMP EVM Calculation Item', 'usr_teacher')
  `).run(
    q2v1Id, q2Id,
    'Earned Value Management (EVM) Performance Indices Interpretation (CPI & SPI)',
    '<p><strong>[PMP Exam - Process Domain: Project Financial & Schedule Governance]</strong></p><p>A project manager is auditing a software modernization project at Month 6. The financial metrics report is summarized as follows:</p><table class="min-w-full border border-slate-300 text-sm my-2"><thead><tr class="bg-slate-100"><th class="border p-2">Metric</th><th class="border p-2">Value</th><th class="border p-2">Formula Description</th></tr></thead><tbody><tr><td class="border p-2">Planned Value ($PV$)</td><td class="border p-2">\\$500,000</td><td class="border p-2">Authorized budget for scheduled work</td></tr><tr><td class="border p-2">Earned Value ($EV$)</td><td class="border p-2">\\$450,000</td><td class="border p-2">Value of work performed</td></tr><tr><td class="border p-2">Actual Cost ($AC$)</td><td class="border p-2">\\$600,000</td><td class="border p-2">Actual cost incurred for work performed</td></tr><tr><td class="border p-2">Budget at Completion ($BAC$)</td><td class="border p-2">\\$1,000,000</td><td class="border p-2">Total approved budget</td></tr></tbody></table><p>Which of the following conclusions are <strong>mathematically and procedurally correct</strong>? (Select ALL that apply):</p>',
    JSON.stringify([
      { id: '1', key: 'A', text: 'Cost Performance Index $\\text{CPI} = \\frac{EV}{AC} = 0.75$, indicating the project is over budget.', is_correct: true },
      { id: '2', key: 'B', text: 'Schedule Performance Index $\\text{SPI} = \\frac{EV}{PV} = 0.90$, indicating the project is behind schedule.', is_correct: true },
      { id: '3', key: 'C', text: 'Assuming future work will be performed at the current cost performance rate, $\\text{EAC} = \\frac{BAC}{\\text{CPI}} \\approx \\$1,333,333$.', is_correct: true },
      { id: '4', key: 'D', text: 'Cost Variance $\\text{CV} = EV - AC = +\\$150,000$, indicating cost savings.', is_correct: false }
    ]),
    'A, B, C',
    '<p><strong>【EVM Formula Derivations】</strong></p><p>1. $\\text{CPI} = \\frac{EV}{AC} = \\frac{450,000}{600,000} = 0.75 < 1.0$ (Over budget by 25%).</p><p>2. $\\text{SPI} = \\frac{EV}{PV} = \\frac{450,000}{500,000} = 0.90 < 1.0$ (Progressing at 90% of planned rate, behind schedule).</p><p>3. $\\text{Estimate At Completion (EAC)} = \\frac{BAC}{\\text{CPI}} = \\frac{1,000,000}{0.75} = \\$1,333,333.33$.</p><p>4. $\\text{Cost Variance (CV)} = EV - AC = 450,000 - 600,000 = -\\$150,000$ (Negative indicates cost overrun).</p>'
  );

  db.prepare('INSERT INTO question_tags VALUES (?, ?)').run(q2Id, 'tag_3');
  db.prepare('INSERT INTO question_tags VALUES (?, ?)').run(q2Id, 'tag_8');
  db.prepare('INSERT INTO exam_questions (exam_id, question_id, domain_section, order_index, score_weight) VALUES (?, ?, ?, ?, ?)').run('exam_pmp', q2Id, 'Domain 2: Process - Execute and Monitor', 1, 1.0);

  db.prepare(`
    INSERT INTO review_records (id, question_id, version_id, reviewer_id, action, comment)
    VALUES (?, ?, ?, 'usr_reviewer', 'APPROVE', 'Standard PMP EVM calculation question with perfect formula alignment. Approved.')
  `).run(uuidv4(), q2Id, q2v1Id);


  // --- Question 3: Essay / Scenario Solution (CISSP Cryptographic Key Exchange & Zero Trust) - PENDING_REVIEW
  const q3Id = uuidv4();
  const q3v1Id = uuidv4();

  db.prepare(`
    INSERT INTO questions (id, current_version_id, type, status, difficulty, subject, author_id)
    VALUES (?, ?, 'ESSAY', 'PENDING_REVIEW', 5, 'CISSP Information Security', 'usr_teacher')
  `).run(q3Id, q3v1Id);

  db.prepare(`
    INSERT INTO question_versions (id, question_id, version_number, title, stem_rich_text, options_json, standard_answer_rich_text, explanation_rich_text, change_summary, created_by)
    VALUES (?, ?, 1, ?, ?, '[]', ?, ?, 'CISSP Security Architecture Essay Item', 'usr_teacher')
  `).run(
    q3v1Id, q3Id,
    'Enterprise Zero Trust Cryptographic Architecture & Post-Quantum Key Exchange',
    '<p><strong>[CISSP Domain 3: Security Architecture and Engineering - Scenario Assessment (20 Points)]</strong></p><p>An international financial consortium is redesigning its inter-bank settlement network to transition from legacy TLS 1.2 RSA to a Zero Trust architecture incorporating Ephemeral Elliptic Curve Diffie-Hellman with Post-Quantum Hybrid encryption (ML-KEM / Kyber).</p><p>（1）Analyze why standard Diffie-Hellman Key Exchange $g^{ab} \\pmod p$ without Ephemeral keys ($\\text{ECDHE}$) fails to provide <strong>Perfect Forward Secrecy (PFS)</strong>.</p><p>（2）Construct an architecture compliance table comparing RSA, ECDSA, and Hybrid Quantum-Resistant signatures against NIST SP 800-207 Zero Trust guidelines.</p>',
    '<p><strong>【Model Answer & Grading Rubric】</strong></p><table class="min-w-full border border-slate-300 text-sm my-2"><thead><tr class="bg-slate-100"><th class="border p-2">Evaluation Criteria</th><th class="border p-2">Key Technical Points</th><th class="border p-2">Allocated Points</th></tr></thead><tbody><tr><td class="border p-2">Perfect Forward Secrecy</td><td class="border p-2">Static private key compromise allows retrospective decryption of past recorded sessions. Ephemeral keys ($K_{\\text{session}} = \\text{HKDF}(g^{xy})$) discard session parameters immediately after key negotiation.</td><td class="border p-2">10 Points</td></tr><tr><td class="border p-2">Zero Trust Architecture (NIST SP 800-207)</td><td class="border p-2">Mutual TLS (mTLS) with short-lived X.509 certs, continuous session re-authentication, and post-quantum hybrid encapsulation mechanism.</td><td class="border p-2">10 Points</td></tr></tbody></table>',
    '<p>【Examiner Reference】Aligned with CISSP CBK Domain 3 and NIST Special Publication 800-207 guidelines.</p>'
  );

  db.prepare('INSERT INTO question_tags VALUES (?, ?)').run(q3Id, 'tag_2');
  db.prepare('INSERT INTO question_tags VALUES (?, ?)').run(q3Id, 'tag_4');
  db.prepare('INSERT INTO exam_questions (exam_id, question_id, domain_section, order_index, score_weight) VALUES (?, ?, ?, ?, ?)').run('exam_cissp', q3Id, 'Domain 3: Security Architecture and Engineering', 1, 2.0);

  db.prepare(`
    INSERT INTO review_records (id, question_id, version_id, reviewer_id, action, comment)
    VALUES (?, ?, ?, 'usr_teacher', 'SUBMIT', 'Submitted comprehensive cryptography & zero trust scenario essay for CISSP 2026 pool.')
  `).run(uuidv4(), q3Id, q3v1Id);


  // --- Question 4: Single Choice (CKA - Kubernetes CNI & IPAM) - DRAFT
  const q4Id = uuidv4();
  const q4v1Id = uuidv4();

  db.prepare(`
    INSERT INTO questions (id, current_version_id, type, status, difficulty, subject, author_id)
    VALUES (?, ?, 'SINGLE_CHOICE', 'DRAFT', 3, 'Certified Kubernetes Administrator (CKA)', 'usr_teacher')
  `).run(q4Id, q4v1Id);

  db.prepare(`
    INSERT INTO question_versions (id, question_id, version_number, title, stem_rich_text, options_json, standard_answer_rich_text, explanation_rich_text, change_summary, created_by)
    VALUES (?, ?, 1, ?, ?, ?, ?, ?, 'Kubernetes CNI Question Draft', 'usr_teacher')
  `).run(
    q4v1Id, q4Id,
    'Kubernetes Cluster Pod CIDR Subnet Calculation and NetworkPolicy Ingress Isolation',
    '<p>A cluster administrator creates a Kubernetes cluster with a Node subnet of <code>10.240.0.0/16</code> and a Pod CIDR of <code>10.244.0.0/16</code>. If each node is allocated a <code>/24</code> subnet mask for Pod IPs, what is the maximum theoretical node capacity $N_{\\text{max}}$, and what default <code>NetworkPolicy</code> enforces default-deny ingress?</p>',
    JSON.stringify([
      { id: '1', key: 'A', text: '$N_{\\text{max}} = 256$ nodes; NetworkPolicy with <code>podSelector: {}</code> and empty <code>ingress: []</code>', is_correct: true },
      { id: '2', key: 'B', text: '$N_{\\text{max}} = 512$ nodes; CoreDNS IPAM plugin with iptables forward drop', is_correct: false },
      { id: '3', key: 'C', text: '$N_{\\text{max}} = 65536$ nodes; Flannel host-gw mode', is_correct: false },
      { id: '4', key: 'D', text: '$N_{\\text{max}} = 128$ nodes; Calico BGP peering drop rule', is_correct: false }
    ]),
    'A',
    '<p>A <code>/16</code> network ($2^{16} = 65,536$ addresses) divided into <code>/24</code> subnets ($2^8 = 256$ addresses per node) yields $2^{16-8} = 256$ maximum worker nodes.</p>'
  );

  db.prepare('INSERT INTO question_tags VALUES (?, ?)').run(q4Id, 'tag_5');
  db.prepare('INSERT INTO exam_questions (exam_id, question_id, domain_section, order_index, score_weight) VALUES (?, ?, ?, ?, ?)').run('exam_cka', q4Id, 'Cluster Networking & Troubleshooting', 1, 1.0);


  // --- Question 5: Multiple Choice (Distributed Data - CAP Theorem & Paxos Consensus) - REJECTED (With Review Notes)
  const q5Id = uuidv4();
  const q5v1Id = uuidv4();

  db.prepare(`
    INSERT INTO questions (id, current_version_id, type, status, difficulty, subject, author_id, reviewer_id)
    VALUES (?, ?, 'MULTIPLE_CHOICE', 'REJECTED', 3, 'Google Cloud Professional Cloud Architect', 'usr_teacher', 'usr_reviewer')
  `).run(q5Id, q5v1Id);

  db.prepare(`
    INSERT INTO question_versions (id, question_id, version_number, title, stem_rich_text, options_json, standard_answer_rich_text, explanation_rich_text, change_summary, created_by)
    VALUES (?, ?, 1, ?, ?, ?, ?, ?, 'Draft Item for Review', 'usr_teacher')
  `).run(
    q5v1Id, q5Id,
    'Google Cloud Spanner TrueTime API and Synchronous Replication Guarantees',
    '<p>Under Google Cloud Spanner architecture utilizing atomic clocks and GPS receivers, TrueTime API exposes $\\text{now}() \\to [t_{\\text{earliest}}, t_{\\text{latest}}]$ with uncertainty $\\epsilon \\le 7\\text{ms}$.</p><p>Which consistency guarantees are satisfied?</p>',
    JSON.stringify([
      { id: '1', key: 'A', text: 'External Consistency (Linearizability) without cross-region locks', is_correct: true },
      { id: '2', key: 'B', text: 'Strict Serializable multi-region ACID transactions', is_correct: true },
      { id: '3', key: 'C', text: 'Eventual consistency without Paxos leader consensus', is_correct: false },
      { id: '4', key: 'D', text: 'Optimistic concurrency control without commit wait delay', is_correct: false }
    ]),
    'A, B',
    '<p>Spanner uses Paxos groups and TrueTime commit-wait mechanism to guarantee external consistency globally.</p>'
  );

  db.prepare('INSERT INTO question_tags VALUES (?, ?)').run(q5Id, 'tag_7');

  db.prepare(`
    INSERT INTO review_records (id, question_id, version_id, reviewer_id, action, comment)
    VALUES (?, ?, ?, 'usr_reviewer', 'REJECT', 'Please elaborate on the commit-wait formula $t_{\\text{commit}} > 2\\epsilon$ in the explanation and add a Spanner vs Bigtable trade-off table before publishing to the PCA exam pool.')
  `).run(uuidv4(), q5Id, q5v1Id);

  // 6. System Audit Logs
  const logStmt = db.prepare(`
    INSERT INTO audit_logs (id, user_id, username, action, resource_type, resource_id, details)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  logStmt.run(uuidv4(), 'usr_admin', 'admin', 'SYSTEM_INIT', 'SYSTEM', null, 'Initialized Professional Certification EQMS schema & exam folders');
  logStmt.run(uuidv4(), 'usr_teacher', 'teacher', 'CREATE_QUESTION', 'QUESTION', q1Id, 'Created AWS SAP-C02 Multi-Region scenario item');
  logStmt.run(uuidv4(), 'usr_reviewer', 'reviewer', 'REVIEW_QUESTION', 'QUESTION', q1Id, 'Approved AWS SAP-C02 item into official certification exam pool');
  logStmt.run(uuidv4(), 'usr_teacher', 'teacher', 'CREATE_QUESTION', 'QUESTION', q2Id, 'Created PMP EVM calculation question');
  logStmt.run(uuidv4(), 'usr_admin', 'admin', 'ADD_TO_EXAM', 'EXAM', 'exam_aws_sap', 'Assigned approved questions to AWS Certified Solutions Architect exam folder');

  console.log('Database seeded successfully with 4 demo users, 4 certification exam folders, 8 tags, and 5 professional exam items!');
}

seedDatabase();
