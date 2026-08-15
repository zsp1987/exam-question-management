# Context: 认证考试考题管理系统 (Certification Exam Question Management System - EQMS)

## 1. System Overview (系统概述)
EQMS 是专为**专业资格与技术认证考试**（如 AWS/GCP 云架构师认证、CISSP 信息安全专家认证、PMP 项目管理专业认证、CFA/FRM 金融风控认证、DevOps & AI 工程师认证等）打造的现代化全生命周期考题管理平台。系统覆盖**命题 → 送审 → 评审 → 归档入考试集 → 导出**全链路；不含考生作答/考试执行视图。

系统默认采用 **英文界面 (Default: English)**，同时支持一键无缝切换为 **中文 (Chinese)** — i18n 仅作用于 UI chrome（导航、状态、表单、提示），题干/选项/解析内容保持作者原文（见 §5）。

## 2. Core Domain Entities (领域实体)

### 2.1 User & Role (用户与角色)
- **ADMIN (认证体系总监 / 系统管理员)**: 认证科目创建/激活/归档、考纲管理、全量题库管理、用户权限、安全审计、唯一可撤销已批准题目（APPROVED → DRAFT）与恢复软删除。
- **REVIEWER (认证评审专家 / 主考官)**: 全局评审（不按专业领域限域）、审核待审认证考题、验证考点契合度、批注修改建议、通过或驳回入库、设置 `score_weight` 最小总量门槛与题目难度（1-5 主观判定）。不可撤销已批准题目。
- **WRITER / EXAM_CREATOR (认证命题专家)**: 创建与编辑认证考题（仅可编辑本人 DRAFT/REJECTED → DRAFT 新版本；PENDING 不可撤回）、LaTeX 公式与表格排版、提交送审、版本迭代、将已批准题目归档入考试集。
- **VIEWER (认证稽核员 / 考生助教)**: 只读浏览**仅 APPROVED** 题库、查看考题解析、试卷导出与报表分析（KPI 亦仅统计 APPROVED）。

**可见性规则（Visibility）与导航约束（2025 Q4 收紧）**
- ADMIN：可见全部状态；导航全部。
- REVIEWER：可见全部状态；导航全部除 Admin。
- WRITER（纯 Writer，非 REVIEWER/ADMIN）：**仅可见本人**创建的题目（任意状态，`author_id = self`，含本人 APPROVED，不可见他人任何题目）；导航仅 `Question Repository` + `Draft New Question`（经 `Sidebar` + `App.jsx` 路由守卫 + 后端 `visibilityClause` 强制，`/api/exams` 403，`/api/stats/overview` 403）；创建经仓库内按钮（3a）。
- VIEWER：仅可见 `APPROVED`；导航仅 `Exam Library`（只读，`/api/exams` 可读）与 `Question Repository`（APPROVED 只读），`Reports` / `Review` / `Admin` / `Create` 均屏蔽（4a/5a）。

**自审策略**：允许 `author_id == reviewer_id`（自审不被禁止），有意为之（见 ADR-0004）。

### 2.2 ExamFolder / Certification Exam (考试文件夹 / 认证考试集)
- `id`: 唯一标识 (UUID)
- `title`: 认证考试名称 (例: *AWS Certified Solutions Architect - Professional (SAP-C02)*)
- `code`: 认证代号 (例: *SAP-C02*, *CISSP-2026*, *PMP-v7*)
- `category`: 认证领域 (Cloud Computing, Cybersecurity, Project Management, Data & AI, Finance)
- `passing_score`: 及格线 (如 750/1000 或 75%)；约束 `passing_score <= SUM(exam_questions.score_weight)`
- `minimum_total_weight`: 试卷总分下限，由 REVIEWER/ADMIN 设定；`SUM(score_weight) >= minimum_total_weight` 强制校验（pin/add 时执行）
- `time_limit_minutes`: 考试时长 (如 180 分钟)
- `description`: 认证考纲说明与适用人群
- `status`: `DRAFT` (筹备中) → `ACTIVE` (生效中) → `ARCHIVED` (已归档)；允许 `ARCHIVED → ACTIVE`（需审计日志）。仅 ADMIN/REVIEWER 可创建/激活/归档/重激活。
- `created_by`, `created_at`, `updated_at`

**状态机**
```
DRAFT ──► ACTIVE ──► ARCHIVED
  ▲         │          │
  └─────────┴──────────┘  (ARCHIVED → ACTIVE 允许，需审计)
```
- DRAFT/ACTIVE：允许 pin/add 题目与导出（DRAFT 导出为预览）。
- ARCHIVED：禁止 pin/add（冻结态），允许导出（展示 pin 时的版本）；重激活后恢复可写入。

### 2.3 ExamQuestion (认证考试与考题归属关联)
- `exam_id`: 认证考试 ID
- `question_id`: 考题 ID
- `pinned_version_id`: 冻结的 `QuestionVersion.id`（仅可 pin APPROVED 版本；加入文件夹时快照冻结，显式 re-pin 需审计）
- `domain_section`: 考纲模块 (例: *Domain 1: Design Solutions for Organizational Complexity*)
- `order_index`: 试卷排序（宽松约束：允许 gaps/duplicates，按 `order_index, created_at` 排序；不做强制 gapless 重排）
- `score_weight`: 分值权重（受 `minimum_total_weight` 与 `passing_score` 约束）

> 关键不变量：ExamFolder 展示与导出均基于 `pinned_version_id`，不受后续 DRAFT 编辑影响；re-pin 需目标版本为 APPROVED 的显式操作 + AuditLog。

### 2.4 Task — Writer↔Reviewer Assignment (Q1–Q5, ADR-0007)

Structured top-down assignment created by **REVIEWER/ADMIN** (Q1 d) for a **single WRITER** target. Sanest defaults per grill Ledger:

- **Task**: `id`, `title`, `description`, `created_by` (REVIEWER/ADMIN `id`), `assignee_id` (WRITER `id`, exactly 1 per Task, Q1 d), `status` (`IN_PROGRESS` | `IN_REVIEW` | `COMPLETED`), `required_count` (1..N, cap ≤N, can be less but no more, Q3), `current_count` (derived), `subject`/`category` (optional), `type_breakdown` (`{ SINGLE_CHOICE, MULTIPLE_CHOICE, ESSAY }` counts, validated on task question create, Q2 b), `difficulty_range` (`[min,max]` 1-5, validated, Q2 b), `target_exam_folder_id` (optional, for curation), `deadline` (ISO date, required on create & on reopen), `revision_deadline` (deadline for REVISE resubmission, set on review completion), `created_at`, `updated_at`
- **Task status machine:**

```
  REVIEWER/ADMIN creates → IN_PROGRESS (writer creates Questions via Task)
           │  (writer POST /api/tasks/:id/questions, validates type/difficulty/subject, exact cap ≤ required_count)
           │  writer POST /api/tasks/:id/submit — bulk DRAFT→PENDING_REVIEW + Task IN_PROGRESS→IN_REVIEW, writer read-only on task questions (PUT/DELETE 403, GET allowed)
           ▼
       IN_REVIEW (reviewer batch review: per-question ACCEPT/REJECT/REVISE)
           │  reviewer POST /api/tasks/:id/review { verdicts[], newDeadline? }
           ├─ All ACCEPT ────────────→ COMPLETED (terminal, read-only both, REJECT terminal too)
           ├─ Any REVISE (≥1) ───────→ IN_PROGRESS reopened + **newDeadline required** (REVISEd questions → DRAFT re-editable, ACCEPT/REJECT stay locked)
           └─ REJECT-only (no REVISE) → COMPLETED (REJECT is terminal REJECTED, no reopen, §Q5 1a/2 close)
```

- **Invariants (sanest defaults):**
  - **Strict Task-only for WRITER while assigned** (Q3 a): any WRITER with an `IN_PROGRESS` Task has loose `POST /api/questions` blocked (403); creation must be `POST /api/tasks/:id/questions` (auto `author_id = assignee_id`, type/difficulty/subject breakdown validated, cap ≤ `required_count`).
  - **Cap ≤ required_count** (Q3 b less but not more): writer may create `1..required_count`, `required_count+1` → `403 count exceeded`. Submit enabled when `1 ≤ current_count ≤ required_count`.
  - **Submit read-only** (Q4 a/b): bulk `DRAFT→PENDING_REVIEW` + `IN_REVIEW`; writer `PUT/DELETE` on task's questions → 403, `GET` allowed.
  - **Batch review guards:** reviewer batch verdicts per Task question; `REJECT` terminal `PENDING→REJECTED` (no re-edit); `REVISE` terminal but → `DRAFT` re-editable (§Q5 1a); mixed batches: `ACCEPT/REJECT` stay locked after reopen.

- **Deadline:** initial `deadline` required; on REVISE reopen `newDeadline` required; overdue shown as `isOverdue` derived (`deadline < now && status IN_PROGRESS|IN_REVIEW`).

- **Visibility (matches §2.1 tightening):** WRITER sees only own Tasks + own Questions; REVIEWER/ADMIN see all Tasks; VIEWER sees none.

### 2.5 Question & QuestionVersion (认证考题与版本快照)
- **Question**: `id`, `current_version_id`, `type` (`SINGLE_CHOICE`, `MULTIPLE_CHOICE`, `ESSAY`), `status` (`DRAFT`, `PENDING_REVIEW`, `APPROVED`, `REJECTED`), `difficulty` (1-5，WRITER 建议、REVIEWER 主观终审，见 §6), `certification_category`, `author_id`, `reviewer_id`, `deleted_at` (软删除，见 §7), `updated_at` (乐观锁)
- **QuestionVersion**: `id`, `question_id`, `version_number` (单调递增，乐观锁), `title`, `stem_rich_text` (含场景图表/表格/LaTeX 公式， sanitized HTML), `options_json`, `standard_answer_rich_text`, `explanation_rich_text` (含考纲对应考点与知识库引用), `change_summary`, `katex_source` (原始 LaTeX，便于导出与重渲染)
- **不变量**：
  - 每次编辑生成新 `QuestionVersion`（不可篡改，永不 GC；即使 Question 软删除也保留）。
  - 编辑已 APPROVED 题目 → 创建新版本并 `Question.status` 重置为 DRAFT，强制重新评审（仅 author 或 ADMIN 可触发）。
  - `REJECTED → DRAFT` 唯一路径（重开为新 DRAFT 版本 + version bump），不允许 `REJECTED → PENDING` 直连。
  - `PENDING_REVIEW` 不可由作者撤回（force wait for reject/approve）。
  - `APPROVED → DRAFT` 撤销仅 ADMIN 可执行（重开编辑 + 重新分配评审）；REVIEWER 不可撤销。

**题目状态机**
```
DRAFT ──submit──► PENDING_REVIEW ──approve──► APPROVED
  ▲                  │  ▲                      │
  │                  │  │                      │ (edit → new version, reset to DRAFT, only author/ADMIN)
  │              reject │                      ▼
  │                  ▼  │                   DRAFT (ADMIN revoke: APPROVED → DRAFT)
  └──── REJECTED ◄──────┘
         │
         └──reopen──► DRAFT (new version)
```
- 并发：基于 `version_number`/`updated_at` 乐观锁，冲突返回 409 Conflict。

### 2.6 Tag & ReviewRecord & AuditLog
- **Tag**: 认证考点标签 (e.g. *High Availability*, *Zero Trust Architecture*, *OAuth 2.0 / OIDC*, *Risk Mitigation*, *Kubernetes CNI*)
- **ReviewRecord**: 专家评审记录（含 `status`: APPROVED/REJECTED/CANCELLED — 暂无 CANCELLED 实际产生，因 PENDING 不可撤回；保留字段以备未来）、评审批注、`reviewer_id`（允许自审）
- **AuditLog**: 全局操作日志与合规审计（记录：pin/re-pin、软删除/恢复、ARCHIVED↔ACTIVE、APPROVED→DRAFT 撤销、状态流转）

## 3. Rich Content & Security (富文本与安全)
- **WYSIWYG 编辑器（TipTap 真所见即所得）**：基于 TipTap (ProseMirror) `contentEditable`，所见即所得 — 加粗/表格/公式在输入时即渲染。覆盖全部 4 处富文本字段：`stem_rich_text`、`options_json[].text`、`standard_answer_rich_text`、`explanation_rich_text`（Q2 a）。存储为 sanitized HTML（`editor.getHTML()` → `sanitizeHtml()`，无 schema 迁移），兼容存量数据；每字段 sanitized HTML 上限 50KB，超限拒绝并 toast。
  - **固定工具栏（每编辑器一行，4 处完全一致）**：`B I | Table ▾ | fx Formula | H2 | List | Code`，位于编辑区正上方；表格气泡菜单补充行列操作（Q5 a 相同 toolbar）。
  - **表格（Grid + Bubble，Q3 a）**：Add Table 为 8×8 悬停网格 → 插入 TipTap 真实 `table` 节点；光标位于表格内时浮动气泡出现 `+Row / −Row / +Col / −Col / Toggle Header / Delete Table`；硬上限 20×20（达限禁用 +Row/+Col），禁止合并/嵌套（见粘贴）。
  - **公式（Modal + Atom Node，Q4 a）**：Add Formula 打开弹窗 — LaTeX 输入 + 实时 KaTeX 预览 + Inline/Block 切换 + 复用 FormulaToolbar 符号面板；确认后插入 atom 节点：`inlineMath` → `<span class="katex-inline" data-latex="...">`，`blockMath` → `<div class="katex-block" data-latex="...">`；`katex_source` 由所有 `data-latex` 汇总填充。
- **公式定界**：`$...$` 块级 + `$...# Context: 认证考试考题管理系统 (Certification Exam Question Management System - EQMS)

## 1. System Overview (系统概述)
EQMS 是专为**专业资格与技术认证考试**（如 AWS/GCP 云架构师认证、CISSP 信息安全专家认证、PMP 项目管理专业认证、CFA/FRM 金融风控认证、DevOps & AI 工程师认证等）打造的现代化全生命周期考题管理平台。系统覆盖**命题 → 送审 → 评审 → 归档入考试集 → 导出**全链路；不含考生作答/考试执行视图。

系统默认采用 **英文界面 (Default: English)**，同时支持一键无缝切换为 **中文 (Chinese)** — i18n 仅作用于 UI chrome（导航、状态、表单、提示），题干/选项/解析内容保持作者原文（见 §5）。

## 2. Core Domain Entities (领域实体)

### 2.1 User & Role (用户与角色)
- **ADMIN (认证体系总监 / 系统管理员)**: 认证科目创建/激活/归档、考纲管理、全量题库管理、用户权限、安全审计、唯一可撤销已批准题目（APPROVED → DRAFT）与恢复软删除。
- **REVIEWER (认证评审专家 / 主考官)**: 全局评审（不按专业领域限域）、审核待审认证考题、验证考点契合度、批注修改建议、通过或驳回入库、设置 `score_weight` 最小总量门槛与题目难度（1-5 主观判定）。不可撤销已批准题目。
- **WRITER / EXAM_CREATOR (认证命题专家)**: 创建与编辑认证考题（仅可编辑本人 DRAFT/REJECTED → DRAFT 新版本；PENDING 不可撤回）、LaTeX 公式与表格排版、提交送审、版本迭代、将已批准题目归档入考试集。
- **VIEWER (认证稽核员 / 考生助教)**: 只读浏览**仅 APPROVED** 题库、查看考题解析、试卷导出与报表分析（KPI 亦仅统计 APPROVED）。

**可见性规则（Visibility）**
- ADMIN/REVIEWER：可见全部状态。
- WRITER：可见全部 APPROVED + 本人创建的 DRAFT/PENDING_REVIEW/REJECTED；不可见他人 DRAFT/PENDING/REJECTED。
- VIEWER：仅可见 APPROVED（含导出与报表）。

**自审策略**：允许 `author_id == reviewer_id`（自审不被禁止），有意为之（见 ADR-0004）。

### 2.2 ExamFolder / Certification Exam (考试文件夹 / 认证考试集)
- `id`: 唯一标识 (UUID)
- `title`: 认证考试名称 (例: *AWS Certified Solutions Architect - Professional (SAP-C02)*)
- `code`: 认证代号 (例: *SAP-C02*, *CISSP-2026*, *PMP-v7*)
- `category`: 认证领域 (Cloud Computing, Cybersecurity, Project Management, Data & AI, Finance)
- `passing_score`: 及格线 (如 750/1000 或 75%)；约束 `passing_score <= SUM(exam_questions.score_weight)`
- `minimum_total_weight`: 试卷总分下限，由 REVIEWER/ADMIN 设定；`SUM(score_weight) >= minimum_total_weight` 强制校验（pin/add 时执行）
- `time_limit_minutes`: 考试时长 (如 180 分钟)
- `description`: 认证考纲说明与适用人群
- `status`: `DRAFT` (筹备中) → `ACTIVE` (生效中) → `ARCHIVED` (已归档)；允许 `ARCHIVED → ACTIVE`（需审计日志）。仅 ADMIN/REVIEWER 可创建/激活/归档/重激活。
- `created_by`, `created_at`, `updated_at`

**状态机**
```
DRAFT ──► ACTIVE ──► ARCHIVED
  ▲         │          │
  └─────────┴──────────┘  (ARCHIVED → ACTIVE 允许，需审计)
```
- DRAFT/ACTIVE：允许 pin/add 题目与导出（DRAFT 导出为预览）。
- ARCHIVED：禁止 pin/add（冻结态），允许导出（展示 pin 时的版本）；重激活后恢复可写入。

### 2.3 ExamQuestion (认证考试与考题归属关联)
- `exam_id`: 认证考试 ID
- `question_id`: 考题 ID
- `pinned_version_id`: 冻结的 `QuestionVersion.id`（仅可 pin APPROVED 版本；加入文件夹时快照冻结，显式 re-pin 需审计）
- `domain_section`: 考纲模块 (例: *Domain 1: Design Solutions for Organizational Complexity*)
- `order_index`: 试卷排序（宽松约束：允许 gaps/duplicates，按 `order_index, created_at` 排序；不做强制 gapless 重排）
- `score_weight`: 分值权重（受 `minimum_total_weight` 与 `passing_score` 约束）

> 关键不变量：ExamFolder 展示与导出均基于 `pinned_version_id`，不受后续 DRAFT 编辑影响；re-pin 需目标版本为 APPROVED 的显式操作 + AuditLog。

### 2.4 Task — Writer↔Reviewer Assignment (Q1–Q5, ADR-0007)

Structured top-down assignment created by **REVIEWER/ADMIN** (Q1 d) for a **single WRITER** target. Sanest defaults per grill Ledger:

- **Task**: `id`, `title`, `description`, `created_by` (REVIEWER/ADMIN `id`), `assignee_id` (WRITER `id`, exactly 1 per Task, Q1 d), `status` (`IN_PROGRESS` | `IN_REVIEW` | `COMPLETED`), `required_count` (1..N, cap ≤N, can be less but no more, Q3), `current_count` (derived), `subject`/`category` (optional), `type_breakdown` (`{ SINGLE_CHOICE, MULTIPLE_CHOICE, ESSAY }` counts, validated on task question create, Q2 b), `difficulty_range` (`[min,max]` 1-5, validated, Q2 b), `target_exam_folder_id` (optional, for curation), `deadline` (ISO date, required on create & on reopen), `revision_deadline` (deadline for REVISE resubmission, set on review completion), `created_at`, `updated_at`
- **Task status machine:**

```
  REVIEWER/ADMIN creates → IN_PROGRESS (writer creates Questions via Task)
           │  (writer POST /api/tasks/:id/questions, validates type/difficulty/subject, exact cap ≤ required_count)
           │  writer POST /api/tasks/:id/submit — bulk DRAFT→PENDING_REVIEW + Task IN_PROGRESS→IN_REVIEW, writer read-only on task questions (PUT/DELETE 403, GET allowed)
           ▼
       IN_REVIEW (reviewer batch review: per-question ACCEPT/REJECT/REVISE)
           │  reviewer POST /api/tasks/:id/review { verdicts[], newDeadline? }
           ├─ All ACCEPT ────────────→ COMPLETED (terminal, read-only both, REJECT terminal too)
           ├─ Any REVISE (≥1) ───────→ IN_PROGRESS reopened + **newDeadline required** (REVISEd questions → DRAFT re-editable, ACCEPT/REJECT stay locked)
           └─ REJECT-only (no REVISE) → COMPLETED (REJECT is terminal REJECTED, no reopen, §Q5 1a/2 close)
```

- **Invariants (sanest defaults):**
  - **Strict Task-only for WRITER while assigned** (Q3 a): any WRITER with an `IN_PROGRESS` Task has loose `POST /api/questions` blocked (403); creation must be `POST /api/tasks/:id/questions` (auto `author_id = assignee_id`, type/difficulty/subject breakdown validated, cap ≤ `required_count`).
  - **Cap ≤ required_count** (Q3 b less but not more): writer may create `1..required_count`, `required_count+1` → `403 count exceeded`. Submit enabled when `1 ≤ current_count ≤ required_count`.
  - **Submit read-only** (Q4 a/b): bulk `DRAFT→PENDING_REVIEW` + `IN_REVIEW`; writer `PUT/DELETE` on task's questions → 403, `GET` allowed.
  - **Batch review guards:** reviewer batch verdicts per Task question; `REJECT` terminal `PENDING→REJECTED` (no re-edit); `REVISE` terminal but → `DRAFT` re-editable (§Q5 1a); mixed batches: `ACCEPT/REJECT` stay locked after reopen.

- **Deadline:** initial `deadline` required; on REVISE reopen `newDeadline` required; overdue shown as `isOverdue` derived (`deadline < now && status IN_PROGRESS|IN_REVIEW`).

- **Visibility (matches §2.1 tightening):** WRITER sees only own Tasks + own Questions; REVIEWER/ADMIN see all Tasks; VIEWER sees none.

### 2.5 Question & QuestionVersion (认证考题与版本快照)
- **Question**: `id`, `current_version_id`, `type` (`SINGLE_CHOICE`, `MULTIPLE_CHOICE`, `ESSAY`), `status` (`DRAFT`, `PENDING_REVIEW`, `APPROVED`, `REJECTED`), `difficulty` (1-5，WRITER 建议、REVIEWER 主观终审，见 §6), `certification_category`, `author_id`, `reviewer_id`, `deleted_at` (软删除，见 §7), `updated_at` (乐观锁)
- **QuestionVersion**: `id`, `question_id`, `version_number` (单调递增，乐观锁), `title`, `stem_rich_text` (含场景图表/表格/LaTeX 公式， sanitized HTML), `options_json`, `standard_answer_rich_text`, `explanation_rich_text` (含考纲对应考点与知识库引用), `change_summary`, `katex_source` (原始 LaTeX，便于导出与重渲染)
- **不变量**：
  - 每次编辑生成新 `QuestionVersion`（不可篡改，永不 GC；即使 Question 软删除也保留）。
  - 编辑已 APPROVED 题目 → 创建新版本并 `Question.status` 重置为 DRAFT，强制重新评审（仅 author 或 ADMIN 可触发）。
  - `REJECTED → DRAFT` 唯一路径（重开为新 DRAFT 版本 + version bump），不允许 `REJECTED → PENDING` 直连。
  - `PENDING_REVIEW` 不可由作者撤回（force wait for reject/approve）。
  - `APPROVED → DRAFT` 撤销仅 ADMIN 可执行（重开编辑 + 重新分配评审）；REVIEWER 不可撤销。

**题目状态机**
```
DRAFT ──submit──► PENDING_REVIEW ──approve──► APPROVED
  ▲                  │  ▲                      │
  │                  │  │                      │ (edit → new version, reset to DRAFT, only author/ADMIN)
  │              reject │                      ▼
  │                  ▼  │                   DRAFT (ADMIN revoke: APPROVED → DRAFT)
  └──── REJECTED ◄──────┘
         │
         └──reopen──► DRAFT (new version)
```
- 并发：基于 `version_number`/`updated_at` 乐观锁，冲突返回 409 Conflict。

### 2.6 Tag & ReviewRecord & AuditLog
- **Tag**: 认证考点标签 (e.g. *High Availability*, *Zero Trust Architecture*, *OAuth 2.0 / OIDC*, *Risk Mitigation*, *Kubernetes CNI*)
- **ReviewRecord**: 专家评审记录（含 `status`: APPROVED/REJECTED/CANCELLED — 暂无 CANCELLED 实际产生，因 PENDING 不可撤回；保留字段以备未来）、评审批注、`reviewer_id`（允许自审）
- **AuditLog**: 全局操作日志与合规审计（记录：pin/re-pin、软删除/恢复、ARCHIVED↔ACTIVE、APPROVED→DRAFT 撤销、状态流转）

 行内（仅字母边界触发），`$750` 等货币文本不触发；`$R×C# Context: 认证考试考题管理系统 (Certification Exam Question Management System - EQMS)

## 1. System Overview (系统概述)
EQMS 是专为**专业资格与技术认证考试**（如 AWS/GCP 云架构师认证、CISSP 信息安全专家认证、PMP 项目管理专业认证、CFA/FRM 金融风控认证、DevOps & AI 工程师认证等）打造的现代化全生命周期考题管理平台。系统覆盖**命题 → 送审 → 评审 → 归档入考试集 → 导出**全链路；不含考生作答/考试执行视图。

系统默认采用 **英文界面 (Default: English)**，同时支持一键无缝切换为 **中文 (Chinese)** — i18n 仅作用于 UI chrome（导航、状态、表单、提示），题干/选项/解析内容保持作者原文（见 §5）。

## 2. Core Domain Entities (领域实体)

### 2.1 User & Role (用户与角色)
- **ADMIN (认证体系总监 / 系统管理员)**: 认证科目创建/激活/归档、考纲管理、全量题库管理、用户权限、安全审计、唯一可撤销已批准题目（APPROVED → DRAFT）与恢复软删除。
- **REVIEWER (认证评审专家 / 主考官)**: 全局评审（不按专业领域限域）、审核待审认证考题、验证考点契合度、批注修改建议、通过或驳回入库、设置 `score_weight` 最小总量门槛与题目难度（1-5 主观判定）。不可撤销已批准题目。
- **WRITER / EXAM_CREATOR (认证命题专家)**: 创建与编辑认证考题（仅可编辑本人 DRAFT/REJECTED → DRAFT 新版本；PENDING 不可撤回）、LaTeX 公式与表格排版、提交送审、版本迭代、将已批准题目归档入考试集。
- **VIEWER (认证稽核员 / 考生助教)**: 只读浏览**仅 APPROVED** 题库、查看考题解析、试卷导出与报表分析（KPI 亦仅统计 APPROVED）。

**可见性规则（Visibility）**
- ADMIN/REVIEWER：可见全部状态。
- WRITER：可见全部 APPROVED + 本人创建的 DRAFT/PENDING_REVIEW/REJECTED；不可见他人 DRAFT/PENDING/REJECTED。
- VIEWER：仅可见 APPROVED（含导出与报表）。

**自审策略**：允许 `author_id == reviewer_id`（自审不被禁止），有意为之（见 ADR-0004）。

### 2.2 ExamFolder / Certification Exam (考试文件夹 / 认证考试集)
- `id`: 唯一标识 (UUID)
- `title`: 认证考试名称 (例: *AWS Certified Solutions Architect - Professional (SAP-C02)*)
- `code`: 认证代号 (例: *SAP-C02*, *CISSP-2026*, *PMP-v7*)
- `category`: 认证领域 (Cloud Computing, Cybersecurity, Project Management, Data & AI, Finance)
- `passing_score`: 及格线 (如 750/1000 或 75%)；约束 `passing_score <= SUM(exam_questions.score_weight)`
- `minimum_total_weight`: 试卷总分下限，由 REVIEWER/ADMIN 设定；`SUM(score_weight) >= minimum_total_weight` 强制校验（pin/add 时执行）
- `time_limit_minutes`: 考试时长 (如 180 分钟)
- `description`: 认证考纲说明与适用人群
- `status`: `DRAFT` (筹备中) → `ACTIVE` (生效中) → `ARCHIVED` (已归档)；允许 `ARCHIVED → ACTIVE`（需审计日志）。仅 ADMIN/REVIEWER 可创建/激活/归档/重激活。
- `created_by`, `created_at`, `updated_at`

**状态机**
```
DRAFT ──► ACTIVE ──► ARCHIVED
  ▲         │          │
  └─────────┴──────────┘  (ARCHIVED → ACTIVE 允许，需审计)
```
- DRAFT/ACTIVE：允许 pin/add 题目与导出（DRAFT 导出为预览）。
- ARCHIVED：禁止 pin/add（冻结态），允许导出（展示 pin 时的版本）；重激活后恢复可写入。

### 2.3 ExamQuestion (认证考试与考题归属关联)
- `exam_id`: 认证考试 ID
- `question_id`: 考题 ID
- `pinned_version_id`: 冻结的 `QuestionVersion.id`（仅可 pin APPROVED 版本；加入文件夹时快照冻结，显式 re-pin 需审计）
- `domain_section`: 考纲模块 (例: *Domain 1: Design Solutions for Organizational Complexity*)
- `order_index`: 试卷排序（宽松约束：允许 gaps/duplicates，按 `order_index, created_at` 排序；不做强制 gapless 重排）
- `score_weight`: 分值权重（受 `minimum_total_weight` 与 `passing_score` 约束）

> 关键不变量：ExamFolder 展示与导出均基于 `pinned_version_id`，不受后续 DRAFT 编辑影响；re-pin 需目标版本为 APPROVED 的显式操作 + AuditLog。

### 2.4 Task — Writer↔Reviewer Assignment (Q1–Q5, ADR-0007)

Structured top-down assignment created by **REVIEWER/ADMIN** (Q1 d) for a **single WRITER** target. Sanest defaults per grill Ledger:

- **Task**: `id`, `title`, `description`, `created_by` (REVIEWER/ADMIN `id`), `assignee_id` (WRITER `id`, exactly 1 per Task, Q1 d), `status` (`IN_PROGRESS` | `IN_REVIEW` | `COMPLETED`), `required_count` (1..N, cap ≤N, can be less but no more, Q3), `current_count` (derived), `subject`/`category` (optional), `type_breakdown` (`{ SINGLE_CHOICE, MULTIPLE_CHOICE, ESSAY }` counts, validated on task question create, Q2 b), `difficulty_range` (`[min,max]` 1-5, validated, Q2 b), `target_exam_folder_id` (optional, for curation), `deadline` (ISO date, required on create & on reopen), `revision_deadline` (deadline for REVISE resubmission, set on review completion), `created_at`, `updated_at`
- **Task status machine:**

```
  REVIEWER/ADMIN creates → IN_PROGRESS (writer creates Questions via Task)
           │  (writer POST /api/tasks/:id/questions, validates type/difficulty/subject, exact cap ≤ required_count)
           │  writer POST /api/tasks/:id/submit — bulk DRAFT→PENDING_REVIEW + Task IN_PROGRESS→IN_REVIEW, writer read-only on task questions (PUT/DELETE 403, GET allowed)
           ▼
       IN_REVIEW (reviewer batch review: per-question ACCEPT/REJECT/REVISE)
           │  reviewer POST /api/tasks/:id/review { verdicts[], newDeadline? }
           ├─ All ACCEPT ────────────→ COMPLETED (terminal, read-only both, REJECT terminal too)
           ├─ Any REVISE (≥1) ───────→ IN_PROGRESS reopened + **newDeadline required** (REVISEd questions → DRAFT re-editable, ACCEPT/REJECT stay locked)
           └─ REJECT-only (no REVISE) → COMPLETED (REJECT is terminal REJECTED, no reopen, §Q5 1a/2 close)
```

- **Invariants (sanest defaults):**
  - **Strict Task-only for WRITER while assigned** (Q3 a): any WRITER with an `IN_PROGRESS` Task has loose `POST /api/questions` blocked (403); creation must be `POST /api/tasks/:id/questions` (auto `author_id = assignee_id`, type/difficulty/subject breakdown validated, cap ≤ `required_count`).
  - **Cap ≤ required_count** (Q3 b less but not more): writer may create `1..required_count`, `required_count+1` → `403 count exceeded`. Submit enabled when `1 ≤ current_count ≤ required_count`.
  - **Submit read-only** (Q4 a/b): bulk `DRAFT→PENDING_REVIEW` + `IN_REVIEW`; writer `PUT/DELETE` on task's questions → 403, `GET` allowed.
  - **Batch review guards:** reviewer batch verdicts per Task question; `REJECT` terminal `PENDING→REJECTED` (no re-edit); `REVISE` terminal but → `DRAFT` re-editable (§Q5 1a); mixed batches: `ACCEPT/REJECT` stay locked after reopen.

- **Deadline:** initial `deadline` required; on REVISE reopen `newDeadline` required; overdue shown as `isOverdue` derived (`deadline < now && status IN_PROGRESS|IN_REVIEW`).

- **Visibility (matches §2.1 tightening):** WRITER sees only own Tasks + own Questions; REVIEWER/ADMIN see all Tasks; VIEWER sees none.

### 2.5 Question & QuestionVersion (认证考题与版本快照)
- **Question**: `id`, `current_version_id`, `type` (`SINGLE_CHOICE`, `MULTIPLE_CHOICE`, `ESSAY`), `status` (`DRAFT`, `PENDING_REVIEW`, `APPROVED`, `REJECTED`), `difficulty` (1-5，WRITER 建议、REVIEWER 主观终审，见 §6), `certification_category`, `author_id`, `reviewer_id`, `deleted_at` (软删除，见 §7), `updated_at` (乐观锁)
- **QuestionVersion**: `id`, `question_id`, `version_number` (单调递增，乐观锁), `title`, `stem_rich_text` (含场景图表/表格/LaTeX 公式， sanitized HTML), `options_json`, `standard_answer_rich_text`, `explanation_rich_text` (含考纲对应考点与知识库引用), `change_summary`, `katex_source` (原始 LaTeX，便于导出与重渲染)
- **不变量**：
  - 每次编辑生成新 `QuestionVersion`（不可篡改，永不 GC；即使 Question 软删除也保留）。
  - 编辑已 APPROVED 题目 → 创建新版本并 `Question.status` 重置为 DRAFT，强制重新评审（仅 author 或 ADMIN 可触发）。
  - `REJECTED → DRAFT` 唯一路径（重开为新 DRAFT 版本 + version bump），不允许 `REJECTED → PENDING` 直连。
  - `PENDING_REVIEW` 不可由作者撤回（force wait for reject/approve）。
  - `APPROVED → DRAFT` 撤销仅 ADMIN 可执行（重开编辑 + 重新分配评审）；REVIEWER 不可撤销。

**题目状态机**
```
DRAFT ──submit──► PENDING_REVIEW ──approve──► APPROVED
  ▲                  │  ▲                      │
  │                  │  │                      │ (edit → new version, reset to DRAFT, only author/ADMIN)
  │              reject │                      ▼
  │                  ▼  │                   DRAFT (ADMIN revoke: APPROVED → DRAFT)
  └──── REJECTED ◄──────┘
         │
         └──reopen──► DRAFT (new version)
```
- 并发：基于 `version_number`/`updated_at` 乐观锁，冲突返回 409 Conflict。

### 2.6 Tag & ReviewRecord & AuditLog
- **Tag**: 认证考点标签 (e.g. *High Availability*, *Zero Trust Architecture*, *OAuth 2.0 / OIDC*, *Risk Mitigation*, *Kubernetes CNI*)
- **ReviewRecord**: 专家评审记录（含 `status`: APPROVED/REJECTED/CANCELLED — 暂无 CANCELLED 实际产生，因 PENDING 不可撤回；保留字段以备未来）、评审批注、`reviewer_id`（允许自审）
- **AuditLog**: 全局操作日志与合规审计（记录：pin/re-pin、软删除/恢复、ARCHIVED↔ACTIVE、APPROVED→DRAFT 撤销、状态流转）

 类建议用 `$...$`。
- **净化（Defense in Depth）**：写入时 + 渲染/导出时双重 sanitize；allow-list：`table/thead/tbody/tr/th/td`, `span.katex` / `span.katex-inline`(`class,data-latex`), `div.katex-block`(`class,data-latex`), `code/pre`, `ul/ol/li`, `a[href]`；`data-latex` 需 KaTeX 合法性校验（拒绝 \\input, \\def 等）；一律剥离 `<script>/<iframe>/<style>` 与 `on*`。
- **粘贴/拖拽（Strict, Q7 a）**：粘贴时剥离所有 `style/class`（除 allow-list），扁平化嵌套 `<table>` 为文本，剥离 `colspan/rowspan>1`（拆为普通 td），超 20×20 截断至 20×20 并 toast，超 50KB 拒绝，非法 `data-latex` 拒绝；Word/Google Docs 12×15 合并表等均按此规则处理，无静默丢数据（必 toast）。
- **图片**：仅 `jpg/png/webp`，单文件 ≤5MB，上传权限 WRITER/ADMIN/REVIEWER；存储为 `uploads/<uuid>.*` 磁盘文件 + HTML 中 URL 引用；Base64 内嵌禁用；SVG 禁止（XSS 向量）。导出时以 `uploads/` 同级目录捆绑 + `manifest.json` 清单（见 SPEC §3.5）。

## 4. Reporting & Export (报表与导出)
- KPI：总题量/待审量/通过率/难度矩阵/题型占比/领域分布；VIEWER 仅统计 APPROVED，ADMIN/REVIEWER 统计全量。
- 实现：复合索引 `(status, type, difficulty, category)` + `(exam_id, pinned_version_id)` + 夜间物化表 `kpi_daily`（rollup）。
- 导出：Markdown/JSON，仅含题干（不含答案/解析，student-facing）；JSON 含 `export_schema_version`, `pinned_version_id`, `version_number`, `katex_source`；图片捆绑；重现性 best-effort（按 `order_index, created_at` 稳定排序，不承诺 bit-identical）。

## 5. i18n (国际化)
- `I18nContext`，默认 `en`，`localStorage` 持久化；仅翻译 UI chrome；题目内容保持作者原文，不做内容翻译；可选 `content_locale` 标签用于过滤。

## 6. Difficulty (难度)
- 1-5 主观分级，由 REVIEWER 终审（WRITER 可建议）；仅用于报表难度矩阵，不参与自动组卷约束。

## 7. Deletion & Retention (删除与保留)
- 软删除：`questions.deleted_at`；从列表/搜索隐藏，pin 的版本仍可导出，历史可追溯。
- `QuestionVersion` 永不 GC（不可篡改）。
- 被任何 ExamFolder pin 的 Question 禁止软删除，须先 unpin。
- 恢复仅 ADMIN 可执行。

## 8. Glossary (术语表)
- **ExamFolder**：认证考试文件夹/科目归档容器。
- **Pinned Version**：加入文件夹时冻结的 QuestionVersion 快照。
- **REJECTED → DRAFT**：驳回后唯一重开路径。
- **Soft Delete**：逻辑删除 via `deleted_at`。
