# Functional Specification: Professional Certification EQMS

## 1. System Architecture & Context (系统定位)
EQMS 是专为**专业资格与IT认证考试**（如 AWS SAP-C02、CISSP、PMP-v7、CKA 等）设计的现代化全生命周期考题管理平台。覆盖**命题 → 送审 → 评审 → 归档入考试集 → 导出**；不含考生作答/考试执行视图。

- **国际化多语言 (i18n)**: 默认采用 **英文界面 (Default: English)**，支持右上角一键无缝切换为 **中文 (Chinese)**。**仅翻译 UI chrome**，题目内容保持作者原文（见 CONTEXT §5）。
- **认证考试体系**: 题目涵盖专业认证考点、复杂数学/统计公式（LaTeX KaTeX 渲染）、架构对比表格。
- **认证考试文件夹 (Exam Folders)**: 支持创建考试科目并将审核通过的考题按考纲章节（Domain Section）归类归档与打包导出（基于 `pinned_version_id` 快照）。
- **可视化表格引擎**: 支持 8×8 矩阵悬停拖拽快速生成表格，并在富文本编辑器中支持动态增删行列（硬上限 20×20，禁止合并/嵌套）。

---

## 2. Role-Based Access Control (RBAC 角色权限)

### 2.1 角色定义
| 角色代码 | 认证职务定位 | 说明 |
|---|---|---|
| **ADMIN** | 认证体系总监 / 系统管理员 | 全局科目/考纲/全量题库/用户权限/安全审计；唯一可撤销 APPROVED→DRAFT、恢复软删除、重激活 ARCHIVED。 |
| **REVIEWER** | 认证评审专家 / 主考官 | 全局评审（不按领域限域）、通过/驳回、设置 `minimum_total_weight` 与难度终审（1-5 主观）。不可撤销 APPROVED。 |
| **TEACHER** | 认证命题专家 (SME) | 创建/编辑（本人 DRAFT/REJECTED→DRAFT）、LaTeX/表格排版、提交送审、归档已批准题目入考试集。 |
| **VIEWER** | 认证稽核员 / 考生助教 | 只读**仅 APPROVED** 浏览、解析查看、试卷导出与报表（KPI 仅 APPROVED）。 |

### 2.2 权限矩阵（Enforceable）
| Action | ADMIN | REVIEWER | TEACHER (author) | TEACHER (non-author) | VIEWER |
|---|---|---|---|---|---|
| Create Question | Y | N | Y | Y | N |
| Edit DRAFT | Y | N | own-only Y | N | N |
| Edit PENDING_REVIEW | N | N | N (force wait for reject) | N | N |
| Edit APPROVED (→ new DRAFT) | Y | N | Y (own) | N | N |
| Delete (soft) | Y | N | N | N | N |
| Submit DRAFT→PENDING | Y (own) | N | Y (own) | N | N |
| Approve/Reject PENDING | Y | Y | N (but self-review allowed if author is REVIEWER/ADMIN) | N | N |
| Revoke APPROVED→DRAFT | Y | N | N | N | N |
| Create/Edit ExamFolder | Y | Y | N | N | N |
| Transition DRAFT↔ACTIVE↔ARCHIVED | Y | Y | N | N | N |
| Add/Pin APPROVED→Folder | Y | Y | Y | Y | N |
| Re-pin (update pinned_version) | Y | Y | Y | Y | N |
| Export (APPROVED only for VIEWER) | Y (all) | Y (all) | Y (own DRAFT + all APPROVED) | Y (own DRAFT + all APPROVED) | Y (APPROVED only) |
| View DRAFT/PENDING/REJECTED | Y | Y | own-only | N | N |
| Manage users/roles | Y | N | N | N | N |

- 自审：允许 `author_id == reviewer_id`（有意为之，见 ADR-0004）。
- REVIEWER 评审范围：全局（不按 category 限域）。
- 并发：所有写操作基于 `version_number`/`updated_at` 乐观锁，冲突 409。

---

## 3. Core Modules (核心功能模块)

### 3.1 认证考试文件夹 (Certification Exam Folders)
- 创建认证考试项目（如 `AWS Certified Solutions Architect - Professional [SAP-C02]`，及格线 750/1000，时长 180 分钟）。
- 状态机：`DRAFT → ACTIVE → ARCHIVED`，允许 `ARCHIVED → ACTIVE`（需审计）；仅 ADMIN/REVIEWER 可流转。
- DRAFT/ACTIVE 允许 pin/add 与导出；ARCHIVED 禁止 pin/add（冻结），允许导出；重激活后恢复可写入。
- 在考试文件夹内查看已收录考题、分章节组织（如 *Domain 1: Design Resilient Architectures*），按 `order_index, created_at` 排序（宽松约束，允许 gaps/duplicates）。
- 从题库中一键批量收录**仅 APPROVED** 认证考题（写入 `pinned_version_id` 快照）。
- 分值：`score_weight` 受 `minimum_total_weight`（REVIEWER/ADMIN 设定）与 `passing_score <= SUM(score_weight)` 强制校验；pin/add 时执行。
- 一键导出标准化考试试卷包（Markdown / JSON，见 §3.5）。

### 3.2 题库大厅与富文本/公式/表格编辑器
- **题型支持**: 单选题 (Single Choice)、多选题 (Multiple Choice)、场景综合/问答题 (Scenario / Essay)。
- **公式排版**: 块级 `$$ ... $$` + 行内 `$ ... $`（仅字母边界触发，见 CONTEXT §3）；内置微积分、PMP EVM、矩阵、希腊字母工具栏；存储保留 `katex_source`。
- **可视化表格生成器**: 8×8 网格悬停拖拽选定尺寸（ADR-0002 已更正），支持 +Row/+Col 动态增删；硬上限 20×20；禁止合并单元格与嵌套表格；单元格可含 LaTeX。
- **所见即所得分屏**: 纯编辑 / 分屏实时预览 / 纯预览。
- **安全**：写入 + 渲染双重 sanitize，allow-list 见 CONTEXT §3；`<script>/<iframe>/<style>` 与 `on*` 一律剥离。
- **图片**：jpg/png/webp，≤5MB，TEACHER/ADMIN/REVIEWER 可上传；磁盘 `uploads/` + URL 引用；SVG 禁止；导出捆绑。

### 3.3 审核工作流 (Review Workflow)
- 状态机（见 CONTEXT §2.4）：
  ```
  DRAFT ─submit→ PENDING_REVIEW ─approve→ APPROVED
    ▲              │  ▲                    │
    │              │  │                    │ (edit → new DRAFT, reset, only author/ADMIN)
    │          reject │                    ▼
    │              ▼  │                 DRAFT (ADMIN revoke)
    └──── REJECTED ◄──┘
           └──reopen→ DRAFT (new version)
  ```
- 约束：
  - `REJECTED → DRAFT` 唯一重开路径（新版本 + version bump）。
  - `PENDING_REVIEW` 不可撤回，须等待 approve/reject。
  - 编辑已 APPROVED → 新版本 + status 重置 DRAFT，强制重审（仅 author/ADMIN）。
  - `APPROVED → DRAFT` 撤销仅 ADMIN。
  - 自审允许；REVIEWER 全局可审。
  - 乐观锁冲突 409。
- 专家审核大厅支持评审批注、一键通过/驳回与评审流转历史追溯（含 ReviewRecord）。

### 3.4 版本控制与 Diff 对比
- 考题每次更新自动保存为不可篡改的版本快照（`v1`, `v2`, ...，永不 GC）。
- 左右双栏 Visual Diff 对比，支持一键回退至历史版本（回退即创建新版本，内容复制自目标版本）。
- ExamFolder 基于 `pinned_version_id` 展示/导出；re-pin 为显式操作 + 审计，要求目标版本 APPROVED。

### 3.5 统计报表与导出
- **KPI**：总题量、待审量、通过率、难度矩阵（1-5）、题型占比、领域分布。
  - VIEWER：仅统计 APPROVED。
  - ADMIN/REVIEWER：统计全量。
  - TEACHER：APPROVED 全量 + 本人 DRAFT/PENDING/REJECTED。
- **实现**：复合索引 `(status, type, difficulty, category)` + `(exam_id, pinned_version_id)` + 夜间物化表 `kpi_daily`。
- **导出**：
  - 产物：Markdown / JSON，**仅含题干**（不含答案/解析，student-facing）；图片以 `uploads/` 同级目录捆绑 + `manifest.json` 清单。
  - JSON：含 `export_schema_version: "1.0"`, `pinned_version_id`, `version_number`, `katex_source`；按 `order_index, created_at` 稳定排序。
  - 重现性：best-effort（不承诺 bit-identical）。
  - 难度：REVIEWER 主观 1-5，仅报表用途，不参与组卷约束。

### 3.6 删除与保留
- 软删除 `questions.deleted_at`；被 pin 的 Question 禁止软删除（须先 unpin）；`QuestionVersion` 永不删除；恢复仅 ADMIN。

### 3.7 国际化
- I18nContext，默认 en，localStorage 持久化；仅 UI chrome 翻译；内容保持原文；可选 `content_locale` 过滤。
