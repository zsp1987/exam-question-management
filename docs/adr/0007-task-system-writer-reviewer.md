# ADR 0007: Writer↔Reviewer Task System (Structured, Strict, Bulk Submit, Batch Review)

## Status
Accepted — 2025-11-23, grill Q1–Q5 (d/b/a+cap/a–bulk-pending+a–readonly/a–terminal+completed) locked, implements CONTEXT §2.4 + SPEC §3.6 + visibility tightening.

## Context
Need a first-class `Task` that orchestrates Writer question creation under Reviewer/ADMIN assignment, with syllabus guard, cap, deadline, submit read-only, and batch review with REVISE reopen. Must respect existing WRITER own-only Question visibility and not break loose question flow for REVIEWER/ADMIN.

## Decisions

### Q1 — Ownership
**(d) REVIEWER/ADMIN creates for single WRITER** (`assignee_id`, exactly 1 per Task, `created_by` = creator). WRITER cannot self-create. Chosen for top-down management; B/C would allow peer delegation (future).

### Q2 — Task creation payload
**(b) Structured** — `Task { title, description, assignee, required_count (1..N, cap ≤N, less allowed Q3b), deadline (ISO, required), subject/category?, type_breakdown {SINGLE, MULTIPLE, ESSAY}?, difficulty_range [min,max]?, target_exam_folder_id? }`. `POST /api/tasks/:id/questions` validates subject/type/difficulty against Task guards.

### Q3 — Writer creation constraint & count
**(a) Strict Task-only + cap ≤N** — While WRITER has `IN_PROGRESS` Task, loose `POST /api/questions` → 403; must use `POST /api/tasks/:id/questions` (auto `author = assignee`, validated, cap ≤ required_count). `1..N` allowed, `N+1` blocked, Submit enabled in that range.

### Q4 — Submit read-only & bulk PENDING
**(a) Bulk DRAFT→PENDING_REVIEW + (b) read-only (x)** — `POST /api/tasks/:id/submit` by assignee WRITER atomically `Task IN_PROGRESS→IN_REVIEW` + all linked `Question DRAFT→PENDING_REVIEW` (SUBMIT records). Writer `PUT/DELETE` on those questions → 403 while `IN_REVIEW`, `GET` allowed.

### Q5 — Batch verdict & Task close/reopen
**(1a) REJECT terminal + (2) COMPLETED close** — `POST /api/tasks/:id/review` (REVIEWER/ADMIN) body `verdicts[] + newDeadline?`: `ACCEPT → PENDING→APPROVED`, `REJECT → PENDING→REJECTED` terminal (no re-edit), `REVISE → PENDING→DRAFT` re-editable. After batch: All ACCEPT or ACCEPT+REJECT-only → `COMPLETED`; Any REVISE → `IN_PROGRESS` reopened **newDeadline required**, only REVISEd regain edit, ACCEPT/REJECT stay locked.

## Consequences
- Writer workflow is now Task-gated; no shadow loose questions while assigned.
- Syllabus coverage enforced via Task guards before Review.
- Submit is bulk, read-only; review is batch with revisable subset.
- New FK `questions.task_id`, new tables `tasks`, `task_review` audit; legacy loose questions remain (`task_id IS NULL`).

## Consequences (compat)
- Legacy `REVIEWER` who is also WRITER is treated as REVIEWER for visibility (sees all).
- Loose `POST /api/questions` still allowed for non-assigned writers and REVIEWER/ADMIN.

## References
- CONTEXT §2.4 (Task entity), §2.1 visibility tightening, SPEC §3.6 (Task System)
- Grill Q1–Q5 Ledger (1a/2c/3a/4a/5a + Ledger)
