# Exam Question Management System (EQMS)

> An enterprise/education-grade full-lifecycle exam question management platform built on a modern full-stack architecture (React 18 + Vite + Tailwind CSS + KaTeX + Node.js Express + SQLite).

> 中文文档: [README_cn.md](README_cn.md)

---

## 🌟 Core Features

### 1. Role-Based Access Control (RBAC)

- 4 built-in roles:
  - **Admin (ADMIN)**: Full access — user & role management, tag knowledge base, system-wide audit logs.
  - **Reviewer (REVIEWER)**: Dedicated Review Hall — review pending questions, add revision comments, approve or reject.
  - **Teacher (TEACHER)**: Create & edit questions, manage options, rich-text / formula layout, version tracking, submit for review.
  - **Viewer (VIEWER)**: Read-only question bank browsing, solution viewing, and statistics dashboards.
- **Instant Role Switcher**: Built into the navbar — switch personas without logging out to verify permission boundaries.

### 2. Advanced Rich-Text Editor with Math & Table Support

- **LaTeX / KaTeX High-Performance Rendering**:
  - Inline formulas (`$E=mc^2$`) and centered block formulas (`$$\int_{a}^{b} f(x)dx$$`) fully supported.
  - Visual formula assistant: calculus (limits, integrals, partial derivatives), Greek letters, matrices, piecewise functions, set theory, physics/chemistry symbols.
- **Visual Table Builder**:
  - Generate structured tables with custom row/column counts; mix rich text and math formulas inside any cell.
- **Live WYSIWYG Rendering**:
  - Three view modes: edit-only, live split, and preview-only.

### 3. Question Version Control & Visual Diff

- Every save creates an incremental version snapshot (`v1`, `v2`, `v3...`) with change reason and operator.
- **Visual Diff**: Side-by-side comparison of stem, options, answer, and explanation across any two historical versions.
- **One-Click Lossless Rollback**: Roll back to any historical version — a new version is created so the full audit chain is preserved.

### 4. Multi-Stage Review Workflow

- Lifecycle state machine: `DRAFT` &rarr; `PENDING_REVIEW` &rarr; `APPROVED` / `REJECTED`.
- **Review Hall**: Live review queue with one-click rendered stem preview, quick-comment templates, rejection notes, and approval celebration effects.

### 5. Multi-Dimensional Search & Smart Filtering

- Full-text search across stem, options, explanation, and knowledge tags.
- Composite filtering by question type (single-choice / multiple-choice / essay), review status, subject category, difficulty (1-5 stars), tags, and sorting.

### 6. Analytics Dashboard & Exam Export

- Dashboard visualizations: question-type distribution, difficulty histogram, approval rate, subject coverage.
- **Exam Builder Engine**: Assemble exams by subject and approval status; export as well-formatted Markdown papers, JSON question packs, or browser print preview.

---

## 🚀 Quick Start (Local)

### 1. Install Dependencies

```bash
# Root dependencies
npm install

# Backend
cd server && npm install

# Frontend
cd ../client && npm install
cd ..
```

### 2. Initialize Database & Seed Demo Data

```bash
cd server
npm run seed
cd ..
```

*Creates the SQLite database with 4 built-in roles, 8 standard tag categories, and 5 classic questions covering calculus, linear algebra, physics formulas, and table layouts.*

### 3. Start Frontend & Backend

```bash
# From the project root
node start-dev.js
```

- **Frontend**: `http://localhost:5173`
- **Backend API**: `http://localhost:3001/api`

---

## 👥 Demo Accounts (all passwords: `123456`)

| Role | Username | Name | Scope |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | Admin | Global config, user management, audit logs |
| **Reviewer** | `reviewer` | Prof. Zhang (Reviewer) | Review hall, approve/reject, feedback |
| **Teacher** | `teacher` | Ms. Li (Question Author) | Authoring, formula layout, versioning, submission |
| **Viewer** | `viewer` | Assistant Wang (Viewer) | Question browsing, search, reports |

> 💡 **Tip**: After logging in, use the **role-switch** dropdown in the top-right navbar to instantly switch personas.

---

## ☁️ Deployment

### Option 1: Docker

Serve the frontend build output as static assets, or deploy both the Node.js backend and Nginx frontend via Docker Compose:

```dockerfile
# Build frontend static assets
cd client && npm run build
```

### Option 2: Cloud Hosting (Vercel / Render / Railway / ECS)

- **Backend**: Deploy `server/` to a Node.js runtime (set `PORT=3001`), persist `server/data/`; can be switched to PostgreSQL in production.
- **Frontend**: Deploy the `client/dist/` build output to a CDN or static hosting provider.

---

## 📑 Architecture Docs (per `grill-me-with-doc`)

- Domain entities & business context: [docs/CONTEXT.md](docs/CONTEXT.md)
- Architecture Decision Record (ADR 0001): [docs/adr/0001-architecture-and-tech-stack.md](docs/adr/0001-architecture-and-tech-stack.md)
- System interfaces & functional spec: [docs/SPECIFICATION.md](docs/SPECIFICATION.md)
