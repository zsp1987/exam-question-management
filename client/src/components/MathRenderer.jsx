import React, { useMemo } from 'react';
import katex from 'katex';

/**
 * Safely render HTML text containing LaTeX math:
 * - Block math: $$ ... $$
 * - Inline math: $ ... $
 * - Standard HTML elements like tables, paragraphs, lists, formatting
 */
export function renderMathInHtml(content) {
  if (!content) return '';

  let html = String(content);

  // Protect escaped dollar signs e.g. \$500 -> %%ESCAPED_DOLLAR%%
  html = html.replace(/\\\$/g, '%%ESCAPED_DOLLAR%%');

  // 1. Process Block Math: $$...$$
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
    try {
      const cleanMath = math
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/%%ESCAPED_DOLLAR%%/g, '$');
      return katex.renderToString(cleanMath, {
        displayMode: true,
        throwOnError: false,
      });
    } catch (e) {
      return `<div class="p-2 my-2 bg-rose-50 text-rose-600 border border-rose-200 rounded text-xs font-mono">Formula error: ${math}</div>`;
    }
  });

  // 2. Process Inline Math: $...$
  // Matches expressions bounded by $, not surrounded by spaces or isolated currency
  html = html.replace(/\$([^\$\s\n](?:[^\$\n]*?[^\$\s\n])?)\$/g, (_, math) => {
    try {
      const cleanMath = math
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/%%ESCAPED_DOLLAR%%/g, '$');
      return katex.renderToString(cleanMath, {
        displayMode: false,
        throwOnError: false,
      });
    } catch (e) {
      return `<span class="px-1 text-rose-600 font-mono text-xs">${math}</span>`;
    }
  });

  // Restore escaped dollar signs
  html = html.replace(/%%ESCAPED_DOLLAR%%/g, '$');

  return html;
}

export default function MathRenderer({ content, className = '' }) {
  const renderedHtml = useMemo(() => {
    return renderMathInHtml(content);
  }, [content]);

  return (
    <div
      className={`prose-rendered ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
}
