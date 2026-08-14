# Context: 认证考试考题管理系统 (Certification Exam Question Management System - EQMS)

## 1. System Overview (系统概述)
EQMS 是专为**专业资格与技术认证考试**（如 AWS/GCP 云架构师认证、CISSP 信息安全专家认证、PMP 项目管理专业认证、CFA/FRM 金融风控认证、DevOps & AI 工程师认证等）打造的现代化全生命周期考题管理平台。

系统默认采用 **英文界面 (Default: English)**，同时支持一键无缝切换为 **中文 (Chinese)**。

## 2. Core Domain Entities (领域实体)

### 2.1 User & Role (用户与角色)
- **ADMIN (认证体系总监 / 系统管理员)**: 认证科目创建、考纲管理、全量题库管理、用户权限、安全审计。
- **REVIEWER (认证评审专家 / 主考官)**: 审核待审认证考题、验证考点契合度、批注修改建议、通过或驳回入库。
- **TEACHER / EXAM_CREATOR (认证命题专家)**: 创建与编辑认证考题、LaTeX 公式与表格排版、提交送审、版本迭代。
- **VIEWER (认证稽核员 / 考生助教)**: 只读浏览题库、查看考题解析、试卷导出与报表分析。

### 2.2 ExamFolder / Certification Exam (考试文件夹 / 认证考试集)
- `id`: 唯一标识 (UUID)
- `title`: 认证考试名称 (例: *AWS Certified Solutions Architect - Professional (SAP-C02)*)
- `code`: 认证代号 (例: *SAP-C02*, *CISSP-2026*, *PMP-v7*)
- `category`: 认证领域 (Cloud Computing, Cybersecurity, Project Management, Data & AI, Finance)
- `passing_score`: 及格线 (如 750/1000 或 75%)
- `time_limit_minutes`: 考试时长 (如 180 分钟)
- `description`: 认证考纲说明与适用人群
- `status`: `ACTIVE` (生效中), `DRAFT` (筹备中), `ARCHIVED` (已归档)
- `created_by`, `created_at`, `updated_at`

### 2.3 ExamQuestion (认证考试与考题归属关联)
- `exam_id`: 认证考试 ID
- `question_id`: 考题 ID
- `domain_section`: 考纲模块 (例: *Domain 1: Design Solutions for Organizational Complexity*)
- `order_index`: 试卷排序
- `score_weight`: 分值权重

### 2.4 Question & QuestionVersion (认证考题与版本快照)
- **Question**: `id`, `current_version_id`, `type` (`SINGLE_CHOICE`, `MULTIPLE_CHOICE`, `ESSAY`), `status` (`DRAFT`, `PENDING_REVIEW`, `APPROVED`, `REJECTED`), `difficulty` (1-5), `certification_category`, `author_id`, `reviewer_id`
- **QuestionVersion**: `version_number`, `title`, `stem_rich_text` (含场景图表/表格/LaTeX公式), `options_json`, `standard_answer_rich_text`, `explanation_rich_text` (含考纲对应考点与知识库引用), `change_summary`

### 2.5 Tag & ReviewRecord & AuditLog
- **Tag**: 认证考点标签 (e.g. *High Availability*, *Zero Trust Architecture*, *OAuth 2.0 / OIDC*, *Risk Mitigation*, *Kubernetes CNI*)
- **ReviewRecord**: 专家评审记录 (通过/驳回、评审批注)
- **AuditLog**: 全局操作日志与合规审计
