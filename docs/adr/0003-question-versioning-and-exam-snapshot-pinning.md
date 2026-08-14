# ADR 0003: Question Versioning & Exam Snapshot Pinning

## Status
Accepted

## Context
Q1–Q4 揭示：Question 状态与内容分离（Question.status vs QuestionVersion）、ExamFolder 曾为 live 指针（无 pinned_version）、删除与状态机未定义，导致已批准试卷不可重现、未审草稿可泄露至已发布考试集。

## Decision
1. **APPROVED 编辑重置**：编辑已 APPROVED 题目创建新 QuestionVersion 并将 Question.status 重置为 DRAFT，强制重审；仅 author 或 ADMIN 可触发。
2. **Pinned Snapshot**：`exam_questions.pinned_version_id` 冻结加入时的 APPROVED 版本；展示与导出均基于 pinned_version；re-pin 需目标版本为 APPROVED 的显式操作 + AuditLog。
3. **状态机**：
   ```
   DRAFT ─submit→ PENDING_REVIEW ─approve→ APPROVED
     ▲              │  ▲                    │
     │          reject │                    │ (edit → new DRAFT, reset, only author/ADMIN)
     │              ▼  │                 DRAFT (ADMIN revoke)
     └──── REJECTED ◄──┘
            └──reopen→ DRAFT (new version)
   ```
   - REJECTED → DRAFT 唯一路径；PENDING 不可撤回；APPROVED→DRAFT 仅 ADMIN。
4. **ExamFolder 状态机**：`DRAFT → ACTIVE → ARCHIVED`，允许 `ARCHIVED → ACTIVE`（审计）；仅 ADMIN/REVIEWER 可流转；ARCHIVED 禁止 pin/add。
5. **软删除**：`questions.deleted_at`；QuestionVersion 永不 GC；被 pin 的 Question 禁止软删除；恢复仅 ADMIN。
6. **并发**：基于 `version_number`/`updated_at` 乐观锁，冲突 409；`order_index` 宽松（允许 gaps/duplicates，按 order_index, created_at 排序）；`score_weight` 受 `minimum_total_weight` 与 `passing_score <= SUM` 约束（REVIEWER/ADMIN 设定，pin/add 时校验）。

## Consequences
- 试卷包权威可重现（基于 pinned_version 快照），未审草稿不泄露。
- 编辑已发布题目有摩擦（需重审）但符合认证合规。
- 乐观锁避免静默覆盖；宽松排序降低重排冲突面。

## References
- CONTEXT §2.2–2.4, SPEC §3.1/3.3/3.4
- Grill Q1–Q4, Q8–Q12
