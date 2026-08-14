# ADR 0001: Architecture & Technology Stack Selection

## Context
考题管理系统（EQMS）需要满足现代化的出题、审题、版本迭代、标签分类、报表统计以及复杂的题干排版（包含数学/物理/化学 LaTeX 公式和表格）需求。系统要求既能方便地在本地一键运行预览，又具备直接部署到云端服务器或容器化平台（Docker/Node/Cloud）的能力。

## Decision
我们选定以下技术栈与架构设计：

### 1. 前端架构
- **框架**: React 18 + Vite (极致构建速度、现代化 SPA 开发体验)
- **UI 体系**: Tailwind CSS + 精选现代设计系统设计变量 (HSL 色彩、圆角、层次卡片、动态微交互)
- **图标库**: Lucide React (现代化、高质感线性图标)
- **富文本 & 公式 & 表格**:
  - 富文本核心：集成 TipTap / 增强富文本编辑器，支持标准 HTML 格式排版、表格插入与修改、代码块、列表。
  - 数学公式：集成 **KaTeX** 高性能公式渲染引擎（支持行内公式 `$E=mc^2$` 与块级公式 `$$\int_0^\infty e^{-x^2} dx$$`，配套可视化公式插入工具栏与实时渲染面板）。
  - 表格编辑：支持插入自定义行/列的表格、表头样式与单元格内富文本。
- **图表与报表**: Chart.js / Recharts (实现题型分布、难度矩阵、审核状态流转、出题人贡献度的现代化可视化报表与导出功能)。

### 2. 后端架构
- **运行环境**: Node.js + Express
- **API 风格**: RESTful JSON API
- **认证与鉴权**: JWT (JSON Web Token) + RBAC 中间件 (`requireAuth`, `requireRole(['ADMIN', 'REVIEWER'])`)
- **数据持久化**: Better-SQLite3 / SQLite 驱动的轻量级嵌入式关系数据库，无需安装繁琐的第三方 DB 服务即可本地即开即用；同时通过统一 Repository 层设计，未来可无缝平迁至 PostgreSQL/MySQL 云数据库。
- **安全性**: 密码哈希 (bcryptjs)、XSS 输入净化 (DOMPurify/sanitize-html)、请求校验与统一错误处理中间件。

### 3. 数据版本控制与审核设计
- 每次编辑考题均生成递增的 `QuestionVersion` 快照记录。
- 提供版本对比（Diff View）功能，直观展示题干、选项、解析在版本迭代中的具体差异。
- 审核流转遵循状态机：`DRAFT -> PENDING_REVIEW -> (APPROVED | REJECTED)`，并记录所有审核评语与历史流转记录。

## Consequences
- **优点**: 
  - 本地零门槛启动：前后端代码高度解耦，一键命令即可启动完整服务并自动初始化预置数据（管理员账号、审核员账号、示例考题与标签）。
  - 极佳的用户体验：公式实时渲染、表格可视化编辑、版本差异高亮、多条件秒级过滤。
  - 云端部署友好：天然支持 Docker 化打包或分离部署至 Vercel/Render/Railway/阿里云/腾讯云。
