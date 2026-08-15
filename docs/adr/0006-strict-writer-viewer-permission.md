# ADR 0006: Strict Writer/Viewer Permission (Question Repo & Exam Library)

## Status
Accepted — 2025-11-22, decisions 1a/2c/3a/4a/5a locked, implements CONTEXT §2.1 + SPEC §2.2 nav + visibility tightening.

## Context
Need to reduce WRITER to own questions only via Question Repository and restrict VIEWER to Exam Library + Question Repository (read-only), with backend enforcement, not UI-only hiding.

## Decisions
1. **1a — Writer nav**: Sidebar shows only `Question Repository` + `Draft New Question`. No `Exam Library`, `Reports`, `Review`, `Admin`. Enforced in `Sidebar.jsx` (`!isPureWriter` for exam-folders, `!isPureWriter && !isViewer` for reports) + `App.jsx` route guards (`handleNavigate` block + `useEffect` redirect + default tab per role).

2. **2c — Writer data (strict own-only, 2c variant)**: Backend `visibilityClause` for WRITER (non-REVIEWER/ADMIN) returns `q.deleted_at IS NULL AND q.author_id = ?` (any status, own only). `GET /api/questions?authorId=other` → 403. REVIEWER/ADMIN still see all (branch above writer). `stats/overview` for WRITER scoped to own (`author_id = self`) and `stats/overview` itself 403 for writer/viewer (reports hidden).

3. **3a — Writer creation**: WRITER keeps `POST /api/questions` (create own), creation entry via `Question Repository` button / `Draft New Question` page. No read-only downgrade.

4. **4a — Viewer nav**: Sidebar shows only `Exam Library` (read-only, `GET /api/exams` allowed) + `Question Repository` (APPROVED read-only). `Reports` hidden (`!isPureWriter && !isViewer` in Sidebar). Exam Library create remains ADMIN/REVIEWER only.

5. **5a — Backend enforced**: Not UI-only. WRITER: `/api/exams` 403, `authorId != self` 403. VIEWER: exam library readable, question list APPROVED-only. Reports (`/api/stats/overview`) 403 for WRITER/VIEWER. Review hall already ADMIN/REVIEWER gated.

## Consequences
- Writer cannot leak others' APPROVED; cannot access exams/reports.
- Viewer cannot create/approve/report.
- Navigation and API are consistent; legacy TEACHER role kept compat via `TEACHER || WRITER` branches.

## References
- CONTEXT §2.1, SPEC §2.2, Sidebar.jsx, App.jsx, routes/questions.js, routes/exams.js, routes/stats.js
