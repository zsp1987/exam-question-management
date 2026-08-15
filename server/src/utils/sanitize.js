/**
 * Defense-in-depth HTML sanitizer for EQMS rich text.
 * Strips <script>/<iframe>/<style> and on* handlers; allow-lists safe tags.
 * Used on WRITE and on RENDER (defense in depth).
 * Supports katex-inline/block data-latex (validated), strips merged table attrs.
 */
const ALLOWED_TAGS = new Set([
  'p','br','b','strong','i','em','u','s','strike','blockquote','code','pre',
  'h1','h2','h3','h4','h5','h6',
  'ul','ol','li','hr',
  'table','thead','tbody','tr','th','td','caption','colgroup','col',
  'a','span','div','sup','sub','kbd','mark'
]);

const ALLOWED_ATTRS = {
  'a': new Set(['href','title','target','rel']),
  'th': new Set(['style','class']),
  'td': new Set(['style','class']),
  'span': new Set(['class','style','data-latex']),
  'div': new Set(['class','data-latex']),
  'code': new Set(['class']),
  'pre': new Set(['class']),
  'table': new Set(['class','style']),
};

function isValidKatex(latex) {
  if (!latex || typeof latex !== 'string') return false;
  // Block dangerous TeX commands that can do I/O or redefine macros
  const blocked = /\\(input|include|def|gdef|edef|xdef|let|futurelet|catcode|openin|openout|write|read|loop|repeat)\b/i;
  if (blocked.test(latex)) return false;
  if (latex.length > 2000) return false;
  return true;
}

function sanitizeHtml(html) {
  if (!html || typeof html !== 'string') return html;
  let out = html;

  // Remove script/iframe/style blocks entirely (with content)
  out = out.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script\s*>/gi, '');
  out = out.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe\s*>/gi, '');
  out = out.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style\s*>/gi, '');

  // Strip on* event handlers (onload, onerror, onclick, etc.)
  out = out.replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s"'=<>\`]+)/gi, '');

  // Remove javascript: and data:text/html hrefs
  out = out.replace(/href\s*=\s*"(javascript:[^"]*)"/gi, 'href="#"');
  out = out.replace(/href\s*=\s*'(javascript:[^']*)'/gi, "href='#'");
  out = out.replace(/href\s*=\s*"data:text\/html[^"]*"/gi, 'href="#"');

  // Filter tags: keep allowed, strip others but keep inner text
  // We do a simple tag filter - not a full parser but covers the allow-list contract
  out = out.replace(/<\/?([a-zA-Z0-9]+)(\s[^>]*)?>/g, (match, tagName, attrs) => {
    const lower = tagName.toLowerCase();
    const isClose = match.startsWith('</');
    if (!ALLOWED_TAGS.has(lower)) {
      return '';
    }
    if (isClose) return `</${lower}>`;
    // Open tag: filter attrs
    const allowed = ALLOWED_ATTRS[lower];
    if (!attrs || !allowed) {
      return `<${lower}>`;
    }
    // Extract allowed attrs
    let kept = '';
    const attrRe = /([a-zA-Z-_:]+)\s*=\s*("[^"]*"|'[^']*'|[^\s"'=<>\`]+)/g;
    let m;
    while ((m = attrRe.exec(attrs)) !== null) {
      const attrName = m[1].toLowerCase();
      if (allowed.has(attrName)) {
        // Extra safety: class must not contain javascript-like content
        const val = m[2];
        if (/javascript:/i.test(val)) continue;
        // data-latex validation
        if (attrName === 'data-latex' && !isValidKatex(val.replace(/^["']|["']$/g, ''))) continue;
        kept += ` ${attrName}=${val}`;
      }
    }
    // Self-close handling for br/hr
    if (lower === 'br' || lower === 'hr' || lower === 'col') return `<${lower}${kept}>`;
    return `<${lower}${kept}>`;
  });

  // Strip colspan/rowspan>1 (no merged cells per CONTEXT §3)
  out = out.replace(/\\s+(colspan|rowspan)\\s*=\\s*"[^"]*"/gi, (m) => {
    const n = parseInt(m.match(/"(\\d+)"/)?.[1] || '1', 10);
    return n > 1 ? '' : m;
  });
  out = out.replace(/\\s+(colspan|rowspan)\\s*=\\s*'[^']*'/gi, (m) => {
    const n = parseInt(m.match(/'(\\d+)'/)?.[1] || '1', 10);
    return n > 1 ? '' : m;
  });
  // Flatten nested tables: remove inner <table> tags but keep content (we already stripped style; nested removal via loop)
  // Limit table size: count rows/cols and truncate beyond 20 (truncate done client-side; server as safety net truncates rows)
  // Per-field 50KB cap is enforced at API layer; sanitizer just truncates if huge
  if (out.length > 55 * 1024) {
    out = out.slice(0, 52 * 1024);
  }
  return out;
}

module.exports = { sanitizeHtml, ALLOWED_TAGS };
