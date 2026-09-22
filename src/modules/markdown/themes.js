import { FONTS } from './fonts.js';

export const PRESETS = {
  academico: {
    label: 'Académico',
    body: 'source-serif', head: 'source-serif', size: 11.5, leading: 1.6,
    align: 'justify', accent: '#1f3a8a', numbered: true, page: 'a4', margin: 25,
  },
  moderno: {
    label: 'Moderno',
    body: 'plex-sans', head: 'plex-sans', size: 11, leading: 1.55,
    align: 'left', accent: '#0f766e', numbered: false, page: 'a4', margin: 22,
  },
  tecnico: {
    label: 'Técnico',
    body: 'plex-sans', head: 'plex-mono', size: 10.5, leading: 1.5,
    align: 'left', accent: '#7c2d12', numbered: true, page: 'a4', margin: 20,
  },
  apuntes: {
    label: 'Apuntes',
    body: 'atkinson', head: 'caveat', size: 12, leading: 1.7,
    align: 'left', accent: '#9d174d', numbered: false, page: 'letter', margin: 20,
  },
  elegante: {
    label: 'Ensayo',
    body: 'lora', head: 'young-serif', size: 12, leading: 1.7,
    align: 'justify', accent: '#374151', numbered: false, page: 'letter', margin: 28,
  },
};

export const PAGES = {
  a4: { label: 'A4', width: '210mm', css: 'A4' },
  letter: { label: 'Carta', width: '215.9mm', css: 'letter' },
  legal: { label: 'Oficio', width: '215.9mm', css: 'legal' },
};

/**
 * CSS del documento. Se usa igual en la vista previa y en la exportación,
 * así lo que ves es lo que obtienes.
 * @param {string} scope selector que envuelve el documento
 */
export function docCss(s, scope = '.doc') {
  const body = FONTS[s.body].css;
  const head = FONTS[s.head].css;
  const headScale = s.head === 'caveat' ? 1.35 : 1;
  return `
${scope} {
  font-family: ${body};
  font-size: ${s.size}pt;
  line-height: ${s.leading};
  color: #1b1b1f;
  text-align: ${s.align};
  hyphens: ${s.align === 'justify' ? 'auto' : 'manual'};
  counter-reset: h2;
  overflow-wrap: break-word;
}
${scope} h1, ${scope} h2, ${scope} h3, ${scope} h4 {
  font-family: ${head};
  color: ${s.accent};
  line-height: 1.2;
  text-align: left;
  margin: 1.6em 0 0.5em;
  break-after: avoid;
  font-weight: ${s.head === 'young-serif' ? 400 : 700};
}
${scope} h1 { font-size: ${2.1 * headScale}em; margin-top: 0; }
${scope} h2 { font-size: ${1.5 * headScale}em; }
${scope} h3 { font-size: ${1.2 * headScale}em; }
${scope} h4 { font-size: ${1.05 * headScale}em; }
${s.numbered ? `
${scope} h1 { counter-reset: h2; }
${scope} h2 { counter-increment: h2; counter-reset: h3; }
${scope} h2::before { content: counter(h2) ". "; }
${scope} h3 { counter-increment: h3; }
${scope} h3::before { content: counter(h2) "." counter(h3) " "; }` : ''}
${scope} p, ${scope} ul, ${scope} ol, ${scope} blockquote, ${scope} table, ${scope} pre { margin: 0 0 0.9em; }
${scope} ul, ${scope} ol { padding-left: 1.5em; }
${scope} li { margin: 0.2em 0; }
${scope} li > input[type="checkbox"] { margin: 0 0.5em 0 0; }
${scope} li:has(> input[type="checkbox"]) { list-style: none; margin-left: -1.3em; }
${scope} a { color: ${s.accent}; }
${scope} strong { font-weight: 700; }
${scope} blockquote {
  border-left: 3px solid ${s.accent};
  padding: 0.1em 0 0.1em 1em;
  color: #4b4b55;
  font-style: italic;
}
${scope} code {
  font-family: 'IBM Plex Mono', ui-monospace, Menlo, monospace;
  font-size: 0.88em;
  background: #f3f3f6;
  padding: 0.1em 0.35em;
  border-radius: 3px;
}
${scope} pre {
  background: #f6f7f9;
  border: 1px solid #e4e6eb;
  border-radius: 4px;
  padding: 0.8em 1em;
  overflow-x: auto;
  text-align: left;
  break-inside: avoid;
}
${scope} pre code { background: none; padding: 0; font-size: 0.85em; line-height: 1.5; }
${scope} table { border-collapse: collapse; width: 100%; font-size: 0.95em; text-align: left; break-inside: avoid; }
${scope} th, ${scope} td { border: 1px solid #d8dbe2; padding: 0.4em 0.6em; vertical-align: top; }
${scope} th { background: #f3f4f7; font-weight: 700; }
${scope} img { max-width: 100%; height: auto; }
${scope} hr { border: none; border-top: 1px solid #d8dbe2; margin: 2em 0; }
${scope} .katex-display { overflow-x: auto; overflow-y: hidden; padding: 0.2em 0; }
${scope} .page-break { break-after: page; height: 0; }
`;
}
