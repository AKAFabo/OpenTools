import { useEffect, useState } from 'react';
import { FaGithub, FaLinkedin } from "react-icons/fa";
import Transcriber from './modules/transcriber/Transcriber.jsx';
import Converter from './modules/converter/Converter.jsx';
import MarkdownStudio from './modules/markdown/MarkdownStudio.jsx';

const Icon = ({ d }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);

const TOOLS = [
  {
    id: 'transcriptor',
    label: 'Transcriptor',
    note: 'Audio y video a texto',
    icon: <Icon d={<><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>} />,
  },
  {
    id: 'video',
    label: 'Video a WAV',
    note: 'Extrae el audio',
    icon: <Icon d={<><rect x="3" y="5" width="13" height="14" rx="2" /><path d="m16 10 5-3v10l-5-3" /></>} />,
  },
  {
    id: 'audio',
    label: 'Audio a WAV',
    note: 'Cambia de formato',
    icon: <Icon d={<path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 7v10M21 12h0" />} />,
  },
  {
    id: 'apuntes',
    label: 'Apuntes Markdown',
    note: 'Documentos con estilo',
    icon: <Icon d={<><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5M9 13h7M9 17h5" /></>} />,
  },
];

const fromHash = () => {
  const h = window.location.hash.replace('#', '');
  return TOOLS.some((t) => t.id === h) ? h : 'transcriptor';
};

export default function App() {
  const [active, setActive] = useState(fromHash);
  const [toNotes, setToNotes] = useState(null);

  useEffect(() => {
    const onHash = () => setActive(fromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const t = TOOLS.find((x) => x.id === active);
    document.title = `${t.label} · Estudio Hub`;
    // En móvil la barra se desplaza horizontalmente: mantener visible la pestaña activa
    document.querySelector('.nav a.is-active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [active]);

  const go = (id) => { window.location.hash = id; };

  const sendToNotes = (text) => {
    setToNotes({ id: Date.now(), text });
    go('apuntes');
  };

  return (
    <div className="app">
      <nav className="sidebar" aria-label="Herramientas">
        <a className="brand" href="#transcriptor">
          <span className="brand-mark" aria-hidden="true">OT</span>
          <span>OpenTools</span>
        </a>
        <ul className="nav">
          {TOOLS.map((t) => (
            <li key={t.id}>
              <a
                href={`#${t.id}`}
                className={active === t.id ? 'is-active' : ''}
                aria-current={active === t.id ? 'page' : undefined}
              >
                {t.icon}
                <span className="nav-text">
                  <span className="nav-label">{t.label}</span>
                  <span className="nav-note">{t.note}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
        <p className="privacy">
          Todo se procesa en tu equipo. Tus archivos nunca salen de tu navegador.
        </p>
        <p className="socials">
          <a
            href="https://github.com/AKAFabo"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
          >
            <FaGithub />
          </a>

          <a
            href="https://www.linkedin.com/in/cesar-fabricio-herrera-rodriguez-41258b286/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
          >
            <FaLinkedin />
          </a>
        </p>
      </nav>

      {/* Los módulos quedan montados: puedes transcribir mientras escribes apuntes. */}
      <main className="main">
        <div hidden={active !== 'transcriptor'}><Transcriber onSendToNotes={sendToNotes} /></div>
        <div hidden={active !== 'video'}><Converter kind="video" /></div>
        <div hidden={active !== 'audio'}><Converter kind="audio" /></div>
        <div hidden={active !== 'apuntes'}><MarkdownStudio incoming={toNotes} /></div>
      </main>
    </div>
  );
}


