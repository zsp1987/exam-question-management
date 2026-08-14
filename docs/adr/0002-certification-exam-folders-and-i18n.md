# ADR 0002: Certification Exam Folders, i18n System & Visual Grid Table Editor

## Context
根据业务演进，系统定位明确为**专业认证考试 (Professional Certification Exams)** 考题全生命周期管理平台。系统需要：
1. **国际化与多语言切换**：默认采用英文 (English) 界面，同时支持一键切换中文 (Chinese)。
2. **考试文件夹 / 认证科目归档 (Exam Folders)**：将已审核通过或特定考点的考题归入指定认证考试（如 AWS Solutions Architect, CISSP, PMP 等），支持考纲章节组织与试卷一键打包。
3. **可视化矩阵拖拽选定表格 & 动态增删行列**：富文本编辑器升级支持矩阵悬停拖拽快速生成任意 $R \times C$ 行列表格，并支持行、列的动态追加与移除。

## Decisions

### 1. 国际化 (i18n) 方案
- 前端建立 `I18nContext`，内置全面的中英双语词典，涵盖所有导航、题型、状态、表单、提示、模态框及报表。
- 默认语言设置为 `'en'` (English)，持久化存储于 `localStorage`。

### 2. 考试文件夹 (Exam Folders) 架构设计
- 数据库新建 `exams` 表与 `exam_questions` 多对多关联表。
- 业务流转：题目通过审核后，可通过考题详情页或考试文件夹管理面板，将题目批量或单个归档进特定认证考试。
- 导出引擎升级：支持直接针对某场认证考试导出符合考纲标准的完整试卷包与考点覆盖率报告。

### 3. 可视化表格生成与动态修改工具
- `FormulaToolbar` 与 `RichEditor` 集成类似 Word/Typora 的 $10 \times 10$ 动态网格选择器，鼠标移动直接实时选定表格行列数。
- 增加快速表格操作工具栏（增加行、删除行、增加列、删除列、表头切换）。

## Consequences
- 认证专业性大幅提升：从高校传统考试转变为适应全球化专业技术认证标准的命题体系。
- 易用性跨越式升级：表格与数学公式排版效率提高，多语言支持满足国际化团队协作。
