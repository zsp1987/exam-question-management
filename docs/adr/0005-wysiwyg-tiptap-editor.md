# ADR 0005: WYSIWYG TipTap Editor for Exam Questions

## Status
Accepted — grill-me (Q1–Q7) 7/7 locked, CONTEXT §3 + SPEC §3.2 updated.

## Context
RichEditor was a `<textarea>` inserting raw HTML (`<b>`, `<table>`, `$...$`) with KaTeX only in split preview. Tables were HTML strings at cursor, not editable nodes. Requirements: true WYSIWYG where bold/table/formula render while typing, with Add Table and Add LaTeX buttons, across 4 fields. Prior ADRs assumed TipTap but implementation never delivered it. Word/Google Docs paste (merged, styled, nested tables) is the dominant bug vector.

## Decisions

### Q1 — Engine
**(a) True WYSIWYG TipTap (ProseMirror `contentEditable`)** — live bold/table/KaTeX rendering. Stored as sanitized HTML via `editor.getHTML()` → `sanitizeHtml()` for backward compat (Q6 a).

### Q2 — Scope
**(a) All 4 fields** — `stem_rich_text`, `options_json[].text`, `standard_answer_rich_text`, `explanation_rich_text` all become TipTap WYSIWYG (identical toolbar). No reduced toolbar for options.

### Q3 — Table
**(a) Grid picker + bubble menu** — 8×8 hover grid → real TipTap `table` node; bubble `+Row/−Row/+Col/−Col/Toggle Header/Delete` when caret inside table; hard 20×20 cap (disable at limit); strip `colspan/rowspan`, block nested tables.

### Q4 — LaTeX
**(a) Single Add Formula modal + atom node** — modal: LaTeX input + live KaTeX preview + Inline/Block toggle + reuse FormulaToolbar symbol palette; inserts `inlineMath` (`span.katex-inline[data-latex]`) / `blockMath` (`div.katex-block[data-latex]`); `katex_source` auto-collected; letter-boundary rule enforced on paste; legacy `$...$` fallback via MathRenderer.

### Q5 — Toolbar
**(a) Per-editor fixed toolbar + bubble** — each editor has compact fixed row `B I | Table ▾ | fx Formula | H2 | List | Code` above contentEditable; table bubble supplements; no slash commands; i18n via I18nContext; identical across 4 fields.

### Q6 — Storage & Sanitization
**(a) Sanitized HTML, no migration** — `editor.getHTML()` → `sanitizeHtml()` → existing `*_rich_text` columns; allow-list extended with `span.katex-inline[data-latex]` / `div.katex-block[data-latex]`; `data-latex` KaTeX-validated (reject \\input, \\def); per-field 50KB cap (reject + toast); legacy rows remain valid.

### Q7 — Paste / Drag-Drop
**(a) Strict sanitize + cap + toast** — strip style/class except allow-list, flatten nested `<table>`, strip `colspan/rowspan>1`, truncate >20×20 to 20×20 + toast, reject >50KB + toast, validate `data-latex` KaTeX, no silent loss.

## Consequences
- Users see tables/formulas live while typing; no split-preview required for editing.
- 8×8 → TipTap table nodes; Word paste no longer creates spec-violating merged/nested tables.
- Zero DB migration; export/search/sanitize remain HTML-based.
- Bundle grows ~150–200KB for TipTap; 4 editors per page — focus and performance must be tested.
- Implementation must: implement TipTap extensions (table/inlineMath/blockMath), bubble menu, grid picker, formula modal, paste handler, allow-list + KaTeX validation, 50KB guard, toasts.

## References
- CONTEXT §3, SPEC §3.2 (updated this session)
- ADR-0001 (TipTap intent), ADR-0002 (8×8 grid), ADR-0004 §3 (sanitize allow-list, 20×20 cap)
- Grill Q1–Q7, Formulas: `$$...$$` block + `$...$` inline letter-boundary
