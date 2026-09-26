import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import hljsCss from 'highlight.js/styles/github.css?raw';
import { Select, Segmented, Toggle } from '../../components/Field.jsx';
import { downloadText } from '../../lib/download.js';
import { BODY_FONTS, FONTS, HEAD_FONTS } from './fonts.js';
import { PAGES, PRESETS, docCss } from './themes.js';
import { renderMarkdown, slug, titleFrom } from './render.js';
import { SAMPLE } from './sample.js';

const SRC_KEY = 'estudio-hub.md.src';
const STYLE_KEY = 'estudio-hub.md.style';

function load(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* almacenamiento lleno o bloqueado */ }
}

const TOOLS = [
  { label: 'Negrita', short: 'B', wrap: ['**', '**'], ph: 'texto' },
  { label: 'Cursiva', short: 'I', wrap: ['*', '*'], ph: 'texto' },
  { label: 'Título', short: 'H', line: '## ', ph: 'Título' },
  { label: 'Lista', short: '•', line: '- ', ph: 'elemento' },
  { label: 'Tarea', short: '☐', line: '- [ ] ', ph: 'pendiente' },
  { label: 'Cita', short: '❝', line: '> ', ph: 'cita' },
  { label: 'Enlace', short: '🔗', wrap: ['[', '](https://)'], ph: 'texto' },
  { label: 'Código', short: '</>', wrap: ['\n```\n', '\n```\n'], ph: 'código' },
  { label: 'Fórmula', short: '∑', wrap: ['$', '$'], ph: 'x^2' },
  { label: 'Tabla', short: '▦', insert: '\n| Columna A | Columna B |\n|-----------|-----------|\n| dato      | dato      |\n' },
  { label: 'Salto de página', short: '⤓', insert: '\n<!-- pagebreak -->\n' },
];

function buildHtml(title, bodyHtml, s) {
  const families = [...new Set([s.body, s.head, 'plex-mono'])].map((f) => `family=${FONTS[f].google}`).join('&');
  const page = PAGES[s.page];
  const esc = (t) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${families}&display=swap">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@${katex.version}/dist/katex.min.css">
<style>
${hljsCss}
/* Margen de página 0: el navegador no tiene espacio para imprimir sus
   encabezados/pies (título, fecha, hora, URL). El margen real va como
   padding de .doc, repetido en cada página con box-decoration-break. */
@page { size: ${page.css}; margin: 0; }
html { background: #fff; }
body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.doc { max-width: ${page.width}; margin: 0 auto; padding: ${s.margin}mm; box-sizing: border-box; }
@media print { .doc { max-width: none; -webkit-box-decoration-break: clone; box-decoration-break: clone; } }
${docCss(s, '.doc')}
</style>
</head>
<body>
<article class="doc">
${bodyHtml}
</article>
</body>
</html>`;
}

function printHtml(html) {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
  document.body.appendChild(frame);
  frame.onload = async () => {
    const win = frame.contentWindow;
    try { await win.document.fonts.ready; } catch { /* sin API de fuentes */ }
    // Pequeña espera para que KaTeX y las fuentes terminen de pintar
    setTimeout(() => {
      win.focus();
      win.print();
      setTimeout(() => frame.remove(), 1000);
    }, 300);
  };
  frame.srcdoc = html;
}

export default function MarkdownStudio({ incoming }) {
  const [src, setSrc] = useState(() => load(SRC_KEY, SAMPLE));
  const [style, setStyle] = useState(() => ({ ...PRESETS.academico, preset: 'academico', ...load(STYLE_KEY, {}) }));
  const [view, setView] = useState('split');
  const editor = useRef(null);
  const fileInput = useRef(null);
  const lastIncoming = useRef(null);

  const scroller = useRef(null);
  const [zoom, setZoom] = useState(1);

  const deferred = useDeferredValue(src);
  const html = useMemo(() => renderMarkdown(deferred), [deferred]);
  const css = useMemo(() => docCss(style, '.doc'), [style]);
  const title = titleFrom(src);

  useEffect(() => { save(SRC_KEY, src); }, [src]);

  // La hoja se dibuja a su tamaño real (A4, Carta…) y se escala para caber en el panel.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const mm = 96 / 25.4;
    const pageWidth = parseFloat(PAGES[style.page].width) * mm;
    const fit = () => {
      const avail = el.clientWidth - 48;
      setZoom(avail > 0 ? Math.min(1, avail / pageWidth) : 1);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [style.page]);
  useEffect(() => { save(STYLE_KEY, style); }, [style]);

  // Texto enviado desde el Transcriptor
  useEffect(() => {
    if (!incoming || incoming.id === lastIncoming.current) return;
    lastIncoming.current = incoming.id;
    setSrc((cur) => (!cur.trim() || cur === SAMPLE ? incoming.text : `${cur.trimEnd()}\n\n---\n\n${incoming.text}`));
  }, [incoming]);

  const set = (key) => (value) => setStyle((s) => ({ ...s, [key]: value, preset: 'custom' }));
  const applyPreset = (p) => {
    if (PRESETS[p]) setStyle({ ...PRESETS[p], preset: p });
  };

  const applyTool = (tool) => {
    const ta = editor.current;
    if (!ta) return;
    const { selectionStart: a, selectionEnd: b, value } = ta;
    const sel = value.slice(a, b);
    let text;
    let caretA;
    let caretB;

    if (tool.insert) {
      text = tool.insert;
      caretA = caretB = a + text.length;
    } else if (tool.wrap) {
      const inner = sel || tool.ph;
      text = tool.wrap[0] + inner + tool.wrap[1];
      caretA = a + tool.wrap[0].length;
      caretB = caretA + inner.length;
    } else {
      const lineStart = value.lastIndexOf('\n', a - 1) + 1;
      const block = value.slice(lineStart, b) || tool.ph;
      text = block.split('\n').map((l) => tool.line + l).join('\n');
      const next = value.slice(0, lineStart) + text + value.slice(b);
      setSrc(next);
      requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(lineStart, lineStart + text.length); });
      return;
    }
    setSrc(value.slice(0, a) + text + value.slice(b));
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(caretA, caretB); });
  };

  const onKeyDown = (e) => {
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      const ta = e.currentTarget;
      const { selectionStart: a, selectionEnd: b, value } = ta;
      setSrc(`${value.slice(0, a)}  ${value.slice(b)}`);
      requestAnimationFrame(() => ta.setSelectionRange(a + 2, a + 2));
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') { e.preventDefault(); applyTool(TOOLS[0]); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') { e.preventDefault(); applyTool(TOOLS[1]); }
  };

  const openFile = async (file) => {
    if (!file) return;
    setSrc(await file.text());
  };

  const words = (deferred.replace(/[#*_>`$|-]/g, ' ').match(/\S+/g) || []).length; //Utilizan el titulo del Markdown (#)
  const exportHtml = () => downloadText(buildHtml(title, html, style), `${slug(title)}.html`, 'text/html');
  const exportPdf = () => printHtml(buildHtml(title, html, style));
  const exportMd = () => downloadText(src, `${slug(title)}.md`, 'text/markdown');

  return (
    <section className="module module-wide" aria-labelledby="md-title">
      <header className="module-head">
        <h1 id="md-title">Apuntes Markdown</h1>
        <p>Escribe en Markdown y obtén un documento listo para entregar, con fórmulas, tablas y código.</p>
      </header>

      <div className="module-grid">
        <aside className="controls">
          <Select label="Estilo" value={style.preset} onChange={applyPreset}
            options={[
              ...Object.entries(PRESETS).map(([value, p]) => ({ value, label: p.label })),
              { value: 'custom', label: 'Personalizado' },
            ]} />
          <Select label="Fuente del texto" value={style.body} onChange={set('body')}
            options={BODY_FONTS.map((f) => ({ value: f, label: FONTS[f].label }))} />
          <Select label="Fuente de los títulos" value={style.head} onChange={set('head')}
            options={HEAD_FONTS.map((f) => ({ value: f, label: FONTS[f].label }))} />

          <label className="field">
            <span className="field-label">Tamaño: {style.size} pt</span>
            <input type="range" min="9" max="16" step="0.5" value={style.size} onChange={(e) => set('size')(Number(e.target.value))} />
          </label>
          <label className="field">
            <span className="field-label">Interlineado: {style.leading}</span>
            <input type="range" min="1.2" max="2.2" step="0.05" value={style.leading} onChange={(e) => set('leading')(Number(e.target.value))} />
          </label>

          <Segmented label="Alineación" value={style.align} onChange={set('align')}
            options={[{ value: 'left', label: 'Izquierda' }, { value: 'justify', label: 'Justificada' }]} />

          <label className="field">
            <span className="field-label">Color de títulos</span>
            <input type="color" value={style.accent} onChange={(e) => set('accent')(e.target.value)} />
          </label>

          <Toggle label="Numerar secciones" checked={style.numbered} onChange={set('numbered')} hint="1., 1.1, 1.2…" />

          <details className="advanced">
            <summary>Página</summary>
            <Segmented label="Tamaño de hoja" value={style.page} onChange={set('page')}
              options={Object.entries(PAGES).map(([value, p]) => ({ value, label: p.label }))} />
            <label className="field">
              <span className="field-label">Márgenes: {style.margin} mm</span>
              <input type="range" min="10" max="35" step="1" value={style.margin} onChange={(e) => set('margin')(Number(e.target.value))} />
            </label>
          </details>
        </aside>

        <div className="workspace">
          <div className="md-bar">
            <div className="toolbar" role="toolbar" aria-label="Formato">
              {TOOLS.map((t) => (
                <button key={t.label} type="button" className="tool" title={t.label} aria-label={t.label} onClick={() => applyTool(t)}>
                  {t.short}
                </button>
              ))}
            </div>
            <Segmented label="Vista" value={view} onChange={setView}
              options={[{ value: 'edit', label: 'Editor' }, { value: 'split', label: 'Ambos' }, { value: 'preview', label: 'Documento' }]} />
          </div>

          <div className={`md-split view-${view}`}>
            <div className="md-editor">
              <textarea
                ref={editor}
                value={src}
                onChange={(e) => setSrc(e.target.value)}
                onKeyDown={onKeyDown}
                spellCheck
                aria-label="Editor Markdown"
                placeholder="# Título de tus apuntes"
              />
              <div className="md-foot">
                <span className="muted">{words} palabras, {Math.max(1, Math.round(words / 200))} min de lectura. Se guarda automáticamente.</span>
                <span className="btn-row">
                  <button type="button" className="btn-link" onClick={() => fileInput.current?.click()}>Abrir .md</button>
                  <button type="button" className="btn-link" onClick={() => { if (confirm('¿Borrar todo el contenido del editor?')) setSrc(''); }}>Vaciar</button>
                  <input ref={fileInput} type="file" hidden accept=".md,.markdown,.txt,text/markdown,text/plain"
                    onChange={(e) => { openFile(e.target.files?.[0]); e.target.value = ''; }} />
                </span>
              </div>
            </div>

            <div className="md-preview">
              <style>{hljsCss + css}</style>
              <div className="paper-scroll" ref={scroller}>
                <article
                  className="doc paper"
                  style={{ width: PAGES[style.page].width, padding: `${style.margin}mm`, zoom }}
                  // El HTML ya pasó por DOMPurify en renderMarkdown
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              </div>
            </div>
          </div>

          <div className="actions export">
            <button type="button" className="btn btn-primary" onClick={exportPdf}>Exportar PDF</button>
            <button type="button" className="btn" onClick={exportHtml}>Descargar HTML</button>
            <button type="button" className="btn" onClick={exportMd}>Descargar .md</button>
            <span className="muted">Para el PDF, elige «Guardar como PDF» en la ventana de impresión.</span>
          </div>
        </div>
      </div>
    </section>
  );
}
