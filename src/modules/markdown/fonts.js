// Fuentes empaquetadas localmente (funcionan sin conexión dentro de la app).
import '@fontsource/source-serif-4/400.css';
import '@fontsource/source-serif-4/400-italic.css';
import '@fontsource/source-serif-4/600.css';
import '@fontsource/source-serif-4/700.css';
import '@fontsource/lora/400.css';
import '@fontsource/lora/400-italic.css';
import '@fontsource/lora/600.css';
import '@fontsource/lora/700.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/400-italic.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans/700.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/600.css';
import '@fontsource/caveat/400.css';
import '@fontsource/caveat/700.css';

/**
 * `google` se usa solo al exportar HTML/PDF, para que el archivo exportado
 * cargue la misma fuente fuera de la app.
 */
export const FONTS = {
  'source-serif': {
    label: 'Source Serif (clásica)',
    css: "'Source Serif 4', Georgia, 'Times New Roman', serif",
    google: 'Source+Serif+4:ital,wght@0,400;0,600;0,700;1,400',
  },
  lora: {
    label: 'Lora (elegante)',
    css: "Lora, Georgia, serif",
    google: 'Lora:ital,wght@0,400;0,600;0,700;1,400',
  },
  atkinson: {
    label: 'Atkinson Hyperlegible (muy legible)',
    css: "'Atkinson Hyperlegible', system-ui, sans-serif",
    google: 'Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400',
  },
  'plex-sans': {
    label: 'IBM Plex Sans (moderna)',
    css: "'IBM Plex Sans', system-ui, sans-serif",
    google: 'IBM+Plex+Sans:ital,wght@0,400;0,600;0,700;1,400',
  },
  'plex-mono': {
    label: 'IBM Plex Mono (técnica)',
    css: "'IBM Plex Mono', ui-monospace, Menlo, monospace",
    google: 'IBM+Plex+Mono:wght@400;600',
  },
  'young-serif': {
    label: 'Young Serif (títulos con carácter)',
    css: "'Young Serif', Georgia, serif",
    google: 'Young+Serif',
  },
  caveat: {
    label: 'Caveat (a mano)',
    css: "Caveat, 'Comic Sans MS', cursive",
    google: 'Caveat:wght@400;700',
  },
};

export const BODY_FONTS = ['source-serif', 'lora', 'atkinson', 'plex-sans', 'plex-mono'];
export const HEAD_FONTS = ['source-serif', 'lora', 'young-serif', 'atkinson', 'plex-sans', 'plex-mono', 'caveat'];
