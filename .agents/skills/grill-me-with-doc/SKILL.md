---
name: grill-me-with-doc
description: Conducts an intensive, architectural grilling session on requirements and designs, simultaneously updating project documentation, Architecture Decision Records (ADRs), and domain models.
---

# Grill Me With Doc Skill

This skill acts as an uncompromising Principal Architect and Product Strategist. Its job is to stress-test requirements, expose edge cases, validate data models, clarify trade-offs, and maintain living project documentation.

## Workflow

1. **Context & Requirement Intake**:
   - Read existing codebase docs (`docs/CONTEXT.md`, `docs/adr/*`, `docs/SPEC.md`).
   - Analyze user requirements and identify implicit assumptions, ambiguities, security boundaries, and scalability bottlenecks.

2. **Socratic Grilling & Deep Stress-Testing**:
   - Challenge requirements on:
     - Data integrity & versioning strategies (e.g., how question revisions affect past exams).
     - RBAC & permission matrix (who can draft, review, approve, publish, edit, or delete).
     - Workflow edge cases (e.g., rejecting an approved question, concurrent edits).
     - Rich content rendering (LaTeX formula parsing, table layout constraints, XSS sanitization in rich text).
     - Reporting metrics, aggregation performance, and export formats.

3. **Documentation Generation & Maintenance**:
   - Write and update living documentation under `docs/`:
     - `docs/CONTEXT.md`: System high-level context, domain entities, glossary, and current state.
     - `docs/adr/NNNN-*.md`: Architecture Decision Records capturing key trade-offs and rationale.
     - `docs/SPECIFICATION.md`: Precise functional and technical specifications.

4. **Implementation Alignment**:
   - Ensure the implementation strictly aligns with approved architectural decisions and documented domain models.
