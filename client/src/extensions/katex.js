import { Node, mergeAttributes } from '@tiptap/core';
import katex from 'katex';

function isValidLatex(latex) {
  if (!latex || typeof latex !== 'string') return false;
  if (/\\(input|include|def|gdef|edef|xdef|let|futurelet|catcode|openin|openout|write|read)\b/i.test(latex)) return false;
  if (latex.length > 2000) return false;
  return true;
}

export const InlineMath = Node.create({
  name: 'inlineMath',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,
  addAttributes() {
    return {
      latex: { default: '', parseHTML: el => el.getAttribute('data-latex') || '', renderHTML: attrs => ({ 'data-latex': attrs.latex }) },
    };
  },
  parseHTML() { return [{ tag: 'span.katex-inline[data-latex]' }]; },
  renderHTML({ HTMLAttributes }) {
    const latex = HTMLAttributes['data-latex'] || '';
    let rendered = '';
    try { rendered = katex.renderToString(latex, { displayMode: false, throwOnError: false }); } catch(e){ rendered = latex; }
    return ['span', mergeAttributes(HTMLAttributes, { class: 'katex-inline', 'data-latex': latex }), rendered];
  },
  addNodeView() {
    return ({ node }) => {
      const span = document.createElement('span');
      span.className = 'katex-inline';
      span.setAttribute('data-latex', node.attrs.latex);
      span.contentEditable = 'false';
      try { span.innerHTML = katex.renderToString(node.attrs.latex, { displayMode: false, throwOnError: false }); } catch(e){ span.textContent = node.attrs.latex; }
      span.title = node.attrs.latex;
      return { dom: span };
    };
  },
});

export const BlockMath = Node.create({
  name: 'blockMath',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,
  addAttributes() {
    return {
      latex: { default: '', parseHTML: el => el.getAttribute('data-latex') || '', renderHTML: attrs => ({ 'data-latex': attrs.latex }) },
    };
  },
  parseHTML() { return [{ tag: 'div.katex-block[data-latex]' }]; },
  renderHTML({ HTMLAttributes }) {
    const latex = HTMLAttributes['data-latex'] || '';
    let rendered = '';
    try { rendered = katex.renderToString(latex, { displayMode: true, throwOnError: false }); } catch(e){ rendered = latex; }
    return ['div', mergeAttributes(HTMLAttributes, { class: 'katex-block', 'data-latex': latex }), rendered];
  },
  addNodeView() {
    return ({ node }) => {
      const div = document.createElement('div');
      div.className = 'katex-block katex-display';
      div.setAttribute('data-latex', node.attrs.latex);
      div.contentEditable = 'false';
      try { div.innerHTML = katex.renderToString(node.attrs.latex, { displayMode: true, throwOnError: false }); } catch(e){ div.textContent = node.attrs.latex; }
      div.title = node.attrs.latex;
      return { dom: div };
    };
  },
});

export { isValidLatex };
