# 考题管理系统 (Exam Question Management System - EQMS)

> 基于现代全栈架构（React 18 + Vite + Tailwind CSS + KaTeX + Node.js Express + SQLite）构建的企业级/高校级现代化考题全生命周期管理平台。

---

## 🌟 核心功能特性

### 1. 多角色权限管理 (RBAC)

- 4 种预设角色体系：
  - **系统管理员 (ADMIN)**：全权限管理、用户与角色调配、标签知识库维护、系统全局操作审计日志。
  - **教研审核专家 (REVIEWER)**：进入专属审核大厅，评审待审考题、批注修改建议、执行通过与驳回。
  - **出题教师 (WRITER)**：创建与编辑考题、管理选项、富文本/公式排版、版本追踪、主动提交送审。
  - **题库查看员 (VIEWER)**：只读模式浏览题库、查看解析与统计大盘。
- **一键身份切换器**：导航栏内置即时角色切换组件，无需反复注销即可体验不同角色视角与权限约束。

### 2. 高级富文本编辑器与复杂数学公式/表格排版

- **LaTeX / KaTeX 高性能公式渲染引擎**：
  - 完美支持行内公式（`$E=mc^2$`）与块级居中公式（`$$\int_{a}^{b} f(x)dx$$`）。
  - 可视化公式助手：包含微积分（极限、积分、偏导）、希腊字母、矩阵与分段函数、集合逻辑、物理化学等常用符号库。
- **可视化表格生成器**：
  - 支持自定义行、列数生成结构化表格，单元格内无缝混排富文本与数学公式。
- **实时所见即所得 (WYSIWYG) 渲染**：
  - 支持“纯编辑”、“实时分屏”与“纯预览”三档视图切换。

### 3. 考题多版本控制与可视化差异比对 (Visual Diff)

- 每次编辑保存考题自动生成递增版本快照（`v1`, `v2`, `v3...`），并记录变更理由与操作人。
- **Visual Diff 对比器**：支持任意两个历史版本之间的题干、选项、答案与解析细节的差异比对。
- **一键无损回滚**：支持回滚至任意历史版本，自动产生新版本保留完整审计链路。

### 4. 考题多级审核流转工作流

- 生命周期状态机：`草稿 (DRAFT)` $\rightarrow$ `待审核 (PENDING_REVIEW)` $\rightarrow$ `已通过 (APPROVED) / 已驳回 (REJECTED)`。
- **教研审核大厅**：审核队列实时展示，支持一键查看题干渲染、快捷评语库、驳回批注与通过庆祝特效。

### 5. 多维检索与智能筛选

- 全文字段搜索（题干、选项、解析、知识点）。
- 题型（单选题、多选题、问答题）、审核状态、学科分类、难度等级（1-5星）、标签多重复合过滤与排序。

### 6. 统计分析报表与试卷导出

- 题库大盘可视化：题型构成比例、难度梯度柱状图、审核通过率、学科覆盖度。
- **试卷生成引擎**：支持按学科与入库状态一键组卷，导出标准 Markdown 排版试卷文件、JSON 题库包或浏览器打印预览。

---

## 🚀 本地快速启动指南

### 1. 安装项目依赖

在项目根目录下分别安装后端与前端依赖：

```bash
# 安装根依赖
npm install

# 安装后端依赖
cd server && npm install

# 安装前端依赖
cd ../client && npm install
cd ..
```

### 2. 初始化数据库与预置演示数据

```bash
cd server
npm run seed
cd ..
```

*执行后将自动创建 SQLite 数据库，并填充 4 个预置角色、8 个标准标签分类及 5 道包含微积分、线性代数、物理公式与表格排版的经典考题。*

### 3. 一键启动前后端服务

```bash
# 在项目根目录下执行开发启动脚本
node start-dev.js
```

- **前端页面**：`http://localhost:5173`
- **后端 API**：`http://localhost:3001/api`

---

## 👥 预置测试账号（密码均为 `123456`）

| 角色类型 | 账号 (Username) | 姓名 | 职能范围 |
| :--- | :--- | :--- | :--- |
| **超级管理员** | `admin` | 系统管理员 (Admin) | 全局配置、用户管理、审计日志 |
| **审核专家** | `reviewer` | 张教授 (教研审核专家) | 审核大厅、通过/驳回、批注反馈 |
| **命题教师** | `teacher` | 李老师 (命题骨干教师) | 出题录入、公式排版、版本更新、送审 |
| **只读访客** | `viewer` | 王助教 (题库查看员) | 题库浏览、考题查询、报表查看 |

> 💡 **提示**：登录后，您也可以随时点击顶部导航栏右上角的 **“身份切换”** 下拉框，瞬间在不同角色之间无缝切换。

---

## ☁️ 云端部署方案

### 方式一：容器化 Docker 部署

将前端构建产物作为静态资源托管，或通过 Docker Compose 同时部署 Node.js 后端与 Nginx 前端：

```dockerfile
# 构建前端静态产物
cd client && npm run build
```

### 方式二：云托管（Vercel / Render / Railway / ECS）

- **后端服务**：将 `server/` 部署至 Node.js 运行时环境（设置环境变量 `PORT=3001`），持久化挂载 `server/data/` 目录；生产环境可平滑切换为 PostgreSQL 数据库。
- **前端应用**：将 `client/` 构建产物 `dist/` 托管在 CDN 或静态托管平台。

---

## 📑 架构文档索引 (基于 `grill-me-with-doc` 规范)

- 领域实体与业务上下文：[docs/CONTEXT.md](file:///c:/Users/zsp19/Projects/exam-question-management/docs/CONTEXT.md)
- 架构决策记录 (ADR 0001)：[docs/adr/0001-architecture-and-tech-stack.md](file:///c:/Users/zsp19/Projects/exam-question-management/docs/adr/0001-architecture-and-tech-stack.md)
- 系统接口与功能规格：[docs/SPECIFICATION.md](file:///c:/Users/zsp19/Projects/exam-question-management/docs/SPECIFICATION.md)
