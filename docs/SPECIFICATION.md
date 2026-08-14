# Functional Specification: Professional Certification EQMS

## 1. System Architecture & Context (系统定位)
EQMS 是专为**专业资格与IT认证考试**（如 AWS SAP-C02、CISSP、PMP-v7、CKA 等）设计的现代化全生命周期考题管理平台。

- **国际化多语言 (i18n)**: 默认采用 **英文界面 (Default: English)**，支持右上角一键无缝切换为 **中文 (Chinese)**。
- **认证考试体系**: 题目涵盖专业认证考点、复杂数学/统计公式（LaTeX KaTeX 渲染）、架构对比表格。
- **认证考试文件夹 (Exam Folders)**: 支持创建考试科目并将审核通过的考题按考纲章节（Domain Section）归类归档与打包导出。
- **可视化表格引擎**: 支持矩阵悬停拖拽快速生成 $R \times C$ 表格，并在富文本编辑器中支持动态增删行列。

---

## 2. Role-Based Access Control (RBAC 角色权限)

| 角色代码 | 认证职务定位 | 权限范围 |
|---|---|---|
| **ADMIN** | 认证体系总监 / 系统管理员 | 全局认证科目创建、考纲管理、全量题库管理、用户权限、安全审计日志。 |
| **REVIEWER** | 认证评审专家 / 主考官 | 审核待审认证考题、验证考点契合度、批注修改建议、通过或驳回入库。 |
| **TEACHER** | 认证命题专家 (SME) | 创建与编辑认证考题、LaTeX 公式与表格排版、提交送审、版本迭代、归档入考试集。 |
| **VIEWER** | 认证稽核员 / 考生助教 | 只读浏览题库、查看考题解析、试卷导出与报表大盘分析。 |

---

## 3. Core Modules (核心功能模块)

### 3.1 认证考试文件夹 (Certification Exam Folders)
- 创建认证考试项目（如 `AWS Certified Solutions Architect - Professional [SAP-C02]`，及格线 750/1000，时长 180 分钟）。
- 在考试文件夹内查看已收录考题、分章节组织（如 *Domain 1: Design Resilient Architectures*）。
- 从题库中一键批量收录审核通过的认证考题。
- 一键导出标准化考试试卷包（Markdown / JSON 格式）。

### 3.2 题库大厅与富文本/公式/表格编辑器
- **题型支持**: 单选题 (Single Choice)、多选题 (Multiple Choice)、场景综合/问答题 (Scenario / Essay)。
- **公式排版**: 支持行内 `$ ... $` 与独立块 `$$ ... $$` KaTeX 渲染，内置微积分、PMP EVM 计算公式、矩阵、希腊字母符号工具栏。
- **可视化表格生成器**: $8 \times 8$ 网格悬停拖拽选定尺寸，支持一键追加表格行 (`+ Row`)。
- **所见即所得分屏**: 支持纯编辑、分屏实时预览与纯预览三种视图。

### 3.3 审核工作流 (Review Workflow)
- `DRAFT` $\rightarrow$ `PENDING_REVIEW` $\rightarrow$ (`APPROVED` | `REJECTED`)。
- 专家审核大厅支持评审批注、一键通过/驳回、烟花动画激励与评审流转历史追溯。

### 3.4 版本控制与 Diff 对比
- 考题每次更新自动保存为不可篡改的版本快照（`v1`, `v2`, ...）。
- 左右双栏 Visual Diff 对比，支持一键安全回退至历史版本。

### 3.5 统计报表与导出
- 题库大盘 KPI（总题量、待审量、通过率、难度矩阵、题型占比）。
- 认证试卷组装与 Markdown / JSON / 打印导出。
