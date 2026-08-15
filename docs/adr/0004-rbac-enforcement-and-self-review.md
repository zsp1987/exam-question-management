# ADR 0004: RBAC Enforcement, Self-Review & Content Security

## Status
Accepted

## Context
RBAC 曾为叙述性表格，缺少可执行矩阵；自审、评审域、VIEWER 可见性、富文本 XSS、公式定界、表格与图片策略均未定义。

## Decision
1. **权限矩阵**：见 SPEC §2.2 可执行矩阵；VIEWER 仅见 APPROVED（含导出/KPI）；WRITER 仅见本人 DRAFT/PENDING/REJECTED + 全部 APPROVED；ADMIN/REVIEWER 见全部。
2. **自审**：允许 `author_id == reviewer_id`（有意为之，记录为完整性风险，见 Q5 b）。
3. **评审范围**：REVIEWER 全局可审，不按 certification_category 限域（Q6 a）。
4. **内容安全（Defense in Depth）**：写入时 + 渲染/导出时双重 sanitize；allow-list `table/thead/tbody/tr/th/td`, `span.katex`, `code/pre`, `ul/ol/li`, `a[href]`；剥离 `<script>/<iframe>/<style>` 与 `on*`。
5. **公式定界**：`$$...$$` 块级 + `$...$` 行内（字母边界触发）；`$750` 不触发（Q14 c）。
6. **表格**：8×8 网格拾取（更正 ADR-0002），硬上限 20×20，禁止合并/嵌套，单元格可含 LaTeX；导出 Markdown 宽表回退为 HTML-in-Markdown。
7. **图片**：jpg/png/webp，≤5MB，WRITER/ADMIN/REVIEWER 可上传；磁盘 `uploads/<uuid>.*` + URL 引用；禁用 Base64 内嵌与 SVG；导出捆绑 + manifest.json。
8. **i18n**：仅 UI chrome 翻译，内容保持原文；可选 content_locale 过滤。
9. **难度**：1-5 主观分级，WRITER 建议、REVIEWER 终审，仅报表用途。
10. **报表**：复合索引 + 夜间物化表 kpi_daily；VIEWER KPI 仅 APPROVED。
11. **导出**：Markdown/JSON 仅题干（不含答案/解析），JSON 含 export_schema_version/pinned_version_id/katex_source，best-effort 重现。

## Consequences
- 权限可审计、可测试；自审风险显式记录。
- XSS 面收敛，公式与货币共存无歧义。
- 报表与导出在规模化下可控。

## References
- CONTEXT §3–§7, SPEC §2–§3
- Grill Q5–Q7, Q13–Q20, ADR-0001/0002
