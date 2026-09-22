import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import markedKatex from 'marked-katex-extension';
import hljs from 'highlight.js/lib/common';
import DOMPurify from 'dompurify';

const marked = new Marked(
  // breaks: un salto de línea en el editor = un salto en el documento
  { gfm: true, breaks: true },
  markedHighlight({
    emptyLangClass: 'hljs',
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    },
  }),
  markedKatex({ throwOnError: false, nonStandard: true }),
);

/**
 * Markdown -> HTML seguro.
 * Soporta: GFM (tablas, listas de tareas, tachado), código con resaltado,
 * fórmulas con $...$ y $$...$$, y saltos de página con <!-- pagebreak -->.
 */
export function renderMarkdown(src) {
  const withBreaks = src.replace(/<!--\s*pagebreak\s*-->/gi, '<div class="page-break"></div>');
  const html = marked.parse(withBreaks);
  return DOMPurify.sanitize(html, { ADD_ATTR: ['target'] });
}

export function titleFrom(src) {
  const m = src.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : 'documento';
}

export function slug(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'documento';
}
