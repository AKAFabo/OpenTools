import { useEffect, useMemo, useRef, useState } from 'react';
import FileDrop from '../../components/FileDrop.jsx';
import Progress from '../../components/Progress.jsx';
import { Select, Segmented, Toggle } from '../../components/Field.jsx';
import { decodeFile } from '../../lib/audio.js';
import { downloadText } from '../../lib/download.js';
import {
  baseName, formatBytes, formatDuration, toMarkdown, toPlainText, toSrt, toVtt,
} from '../../lib/format.js';

const MODELS = [
  { value: 'onnx-community/whisper-tiny', label: 'Tiny', hint: 'Muy rápido, precisión básica. Descarga pequeña.' },
  { value: 'onnx-community/whisper-base', label: 'Base', hint: 'Rápido y bueno para clases con audio claro.' },
  { value: 'onnx-community/whisper-small', label: 'Small', hint: 'Más preciso con ruido y acentos. Más lento.' },
  { value: 'onnx-community/whisper-large-v3-turbo', label: 'Large v3 Turbo', hint: 'El más preciso. Descarga grande; ideal con GPU. (Recomendado)' },
  { value: 'onnx-community/whisper-base.en', label: 'Base (solo inglés)', hint: 'Más rápido y preciso si todo el audio está en inglés.' },
  { value: 'custom', label: 'Otro de Hugging Face…', hint: 'Cualquier modelo Whisper en formato ONNX.' },
];

const LANGUAGES = [
  ['auto', 'Detectar automáticamente'], ['es', 'Español'], ['en', 'Inglés'], ['pt', 'Portugués'],
  ['fr', 'Francés'], ['de', 'Alemán'], ['it', 'Italiano'], ['ca', 'Catalán'], ['gl', 'Gallego'],
  ['eu', 'Euskera'], ['nl', 'Neerlandés'], ['ru', 'Ruso'], ['ja', 'Japonés'], ['zh', 'Chino'],
  ['ko', 'Coreano'], ['ar', 'Árabe'],
].map(([value, label]) => ({ value, label }));

const ACCEPT = 'audio/*,video/*,.mkv,.avi,.wmv,.flv,.m4a,.opus';

function useGpu() {
  const [gpu, setGpu] = useState({ checked: false, available: false, fp16: false });
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const adapter = await navigator.gpu?.requestAdapter();
        if (alive) setGpu({ checked: true, available: !!adapter, fp16: !!adapter?.features.has('shader-f16') });
      } catch {
        if (alive) setGpu({ checked: true, available: false, fp16: false });
      }
    })();
    return () => { alive = false; };
  }, []);
  return gpu;
}

export default function Transcriber({ onSendToNotes }) {
  const gpu = useGpu();
  const workerRef = useRef(null);
  const audioRef = useRef(null);
  const recorderRef = useRef(null);

  const [model, setModel] = useState('onnx-community/whisper-base');
  const [customModel, setCustomModel] = useState('');
  const [language, setLanguage] = useState('es');
  const [task, setTask] = useState('transcribe');
  const [device, setDevice] = useState('auto');
  const [segmentSeconds, setSegmentSeconds] = useState('120');
  const [showTimes, setShowTimes] = useState(true);

  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [duration, setDuration] = useState(null);
  const [status, setStatus] = useState('idle');
  const [downloads, setDownloads] = useState({});
  const [progress, setProgress] = useState({ index: 0, total: 0 });
  const [segments, setSegments] = useState([]);
  const [error, setError] = useState('');
  const [startedAt, setStartedAt] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [recording, setRecording] = useState(false);
  const [copied, setCopied] = useState(false);

  const modelId = model === 'custom' ? customModel.trim() : model;
  const englishOnly = /\.en$/.test(modelId);
  const resolvedDevice = device === 'auto' ? (gpu.available ? 'webgpu' : 'wasm') : device;
  const busy = ['decoding', 'loading', 'transcribing'].includes(status);

  // Cronómetro
  useEffect(() => {
    if (!busy || !startedAt) return;
    const t = setInterval(() => setElapsed((Date.now() - startedAt) / 1000), 500);
    return () => clearInterval(t);
  }, [busy, startedAt]);

  // URL para el reproductor
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setFileUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => () => workerRef.current?.terminate(), []);

  const getWorker = () => {
    if (!workerRef.current) {
      workerRef.current = new Worker(new URL('./whisper.worker.js', import.meta.url), { type: 'module' });
    }
    return workerRef.current;
  };

  const pickFile = (f) => {
    setFile(f);
    setSegments([]);
    setStatus('idle');
    setError('');
    setDuration(null);
  };

  const start = async () => {
    if (!file || !modelId) return;
    setError('');
    setSegments([]);
    setDownloads({});
    setProgress({ index: 0, total: 0 });
    setStartedAt(Date.now());
    setElapsed(0);
    setStatus('decoding');

    let audio;
    try {
      const buffer = await decodeFile(file, { sampleRate: 16000, channels: 1 });
      setDuration(buffer.duration);
      audio = new Float32Array(buffer.getChannelData(0));
    } catch (err) {
      setStatus('error');
      setError(`No se pudo leer el audio: ${err.message}`);
      return;
    }

    setStatus('loading');
    const worker = getWorker();
    worker.onmessage = ({ data }) => {
      switch (data.type) {
        case 'loading':
          setDownloads((d) => ({ ...d, [data.file]: { loaded: data.loaded, total: data.total } }));
          break;
        case 'ready':
          setStatus('transcribing');
          break;
        case 'segment':
          setProgress({ index: data.index + 1, total: data.total });
          setSegments((s) => [...s, ...data.segments]);
          break;
        case 'done':
          setStatus('done');
          break;
        case 'error':
          setStatus('error');
          setError(data.message);
          break;
        default:
      }
    };
    worker.postMessage(
      {
        type: 'transcribe',
        audio,
        options: {
          model: modelId,
          device: resolvedDevice,
          fp16: gpu.fp16,
          language,
          task,
          englishOnly,
          segmentSeconds: Number(segmentSeconds),
        },
      },
      [audio.buffer],
    );
  };

  const cancel = () => {
    workerRef.current?.terminate();
    workerRef.current = null;
    setStatus(segments.length ? 'done' : 'idle');
  };

  // Grabación desde el micrófono
  const toggleRecording = async () => {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const parts = [];
      rec.ondataavailable = (e) => e.data.size && parts.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const type = rec.mimeType || 'audio/webm';
        const ext = type.includes('ogg') ? 'ogg' : type.includes('mp4') ? 'm4a' : 'webm';
        const stamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-');
        pickFile(new File(parts, `grabacion_${stamp}.${ext}`, { type }));
      };
      rec.start(1000);
      recorderRef.current = rec;
      setRecording(true);
    } catch {
      setError('No hay acceso al micrófono. Revisa los permisos del navegador.');
    }
  };

  const dl = useMemo(() => {
    const files = Object.values(downloads);
    const loaded = files.reduce((a, f) => a + (f.loaded || 0), 0);
    const total = files.reduce((a, f) => a + (f.total || 0), 0);
    return { loaded, total, ratio: total ? loaded / total : null };
  }, [downloads]);

  const name = file ? baseName(file.name) : 'transcripcion';
  const plain = toPlainText(segments);

  const copy = async () => {
    await navigator.clipboard.writeText(plain);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const seek = (t) => {
    if (audioRef.current) {
      audioRef.current.currentTime = t;
      audioRef.current.play();
    }
  };

  return (
    <section className="module" aria-labelledby="t-title">
      <header className="module-head">
        <h1 id="t-title">Transcriptor</h1>
        <p>Convierte grabaciones de clases, entrevistas o videos en texto. Sin límite de duración.</p>
      </header>

      <div className="module-grid">
        <aside className="controls">
          <Select label="Modelo" value={model} onChange={setModel} options={MODELS} disabled={busy}
            hint={`${MODELS.find((m) => m.value === model)?.hint} Se descarga una sola vez.`} />
          {model === 'custom' && (
            <label className="field">
              <span className="field-label">ID del modelo</span>
              <input type="text" placeholder="onnx-community/whisper-medium" value={customModel}
                onChange={(e) => setCustomModel(e.target.value)} disabled={busy} />
            </label>
          )}
          <Select label="Idioma del audio" value={englishOnly ? 'en' : language} onChange={setLanguage}
            options={LANGUAGES} disabled={busy || englishOnly} />
          <Segmented label="Resultado" value={englishOnly ? 'transcribe' : task} onChange={setTask} disabled={busy || englishOnly}
            options={[{ value: 'transcribe', label: 'Mismo idioma' }, { value: 'translate', label: 'Traducir al inglés' }]} />

          <details className="advanced">
            <summary>Opciones avanzadas</summary>
            <Select label="Procesador" value={device} onChange={setDevice} disabled={busy}
              options={[
                { value: 'auto', label: `Automático (${gpu.available ? 'GPU' : 'CPU'})` },
                { value: 'webgpu', label: 'GPU (WebGPU)' },
                { value: 'wasm', label: 'CPU (WebAssembly)' },
              ]}
              hint={gpu.checked && !gpu.available ? 'Tu navegador no expone WebGPU; se usará la CPU.' : undefined} />
            <Select label="Tamaño de cada tramo" value={segmentSeconds} onChange={setSegmentSeconds} disabled={busy}
              options={[
                { value: '60', label: '1 minuto' }, { value: '120', label: '2 minutos' },
                { value: '300', label: '5 minutos' }, { value: '600', label: '10 minutos' },
              ]}
              hint="Tramos más cortos muestran avances más seguido." />
          </details>

          <Toggle label="Mostrar marcas de tiempo" checked={showTimes} onChange={setShowTimes} />
        </aside>

        <div className="workspace">
          {!file && (
            <>
              <FileDrop accept={ACCEPT} onFiles={([f]) => pickFile(f)} disabled={recording}
                title="Suelta aquí un audio o video"
                hint="mp3, wav, m4a, ogg, flac, mp4, mov, webm, mkv, avi y más" />
              <div className="or-record">
                <span>o</span>
                <button type="button" className={`btn ${recording ? 'btn-danger' : ''}`} onClick={toggleRecording}>
                  {recording ? 'Detener grabación' : 'Grabar con el micrófono'}
                </button>
              </div>
            </>
          )}

          {file && (
            <div className="sheet">
              <div className="file-row">
                <div>
                  <p className="file-name">{file.name}</p>
                  <p className="muted">
                    {formatBytes(file.size)}
                    {duration ? `, ${formatDuration(duration)}` : ''}
                  </p>
                </div>
                <button type="button" className="btn-link" onClick={() => { cancel(); setFile(null); setSegments([]); }} disabled={busy}>
                  Cambiar archivo
                </button>
              </div>
              {fileUrl && <audio ref={audioRef} src={fileUrl} controls className="player" />}

              <div className="actions">
                {!busy ? (
                  <button type="button" className="btn btn-primary" onClick={start} disabled={!modelId}>
                    {segments.length ? 'Transcribir de nuevo' : 'Transcribir'}
                  </button>
                ) : (
                  <button type="button" className="btn" onClick={cancel}>Detener</button>
                )}
                {busy && <span className="muted">{formatDuration(elapsed)}</span>}
              </div>

              {status === 'decoding' && <Progress label="Preparando el audio…" />}
              {status === 'loading' && (
                <Progress
                  value={dl.ratio}
                  label={dl.total ? `Descargando modelo (${formatBytes(dl.loaded)} de ${formatBytes(dl.total)})` : 'Cargando modelo…'}
                />
              )}
              {status === 'transcribing' && (
                <Progress
                  value={progress.total ? progress.index / progress.total : null}
                  label={progress.total ? `Transcribiendo tramo ${Math.min(progress.index + 1, progress.total)} de ${progress.total}` : 'Transcribiendo…'}
                />
              )}
            </div>
          )}

          {error && <p className="alert" role="alert">{error}</p>}

          {segments.length > 0 && (
            <div className="sheet result">
              <div className="result-head">
                <h2>Texto</h2>
                <div className="btn-row">
                  <button type="button" className="btn" onClick={copy}>{copied ? 'Copiado' : 'Copiar'}</button>
                  <button type="button" className="btn" onClick={() => downloadText(plain, `${name}.txt`)}>.txt</button>
                  <button type="button" className="btn" onClick={() => downloadText(toSrt(segments), `${name}.srt`)}>.srt</button>
                  <button type="button" className="btn" onClick={() => downloadText(toVtt(segments), `${name}.vtt`, 'text/vtt')}>.vtt</button>
                  <button type="button" className="btn" onClick={() => downloadText(toMarkdown(segments, name, showTimes), `${name}.md`, 'text/markdown')}>.md</button>
                  <button type="button" className="btn btn-primary" onClick={() => onSendToNotes(toMarkdown(segments, name, showTimes))}>
                    Abrir en Apuntes
                  </button>
                </div>
              </div>

              {showTimes ? (
                <ol className="segments">
                  {segments.map((s, i) => (
                    <li key={i}>
                      <button type="button" className="stamp" onClick={() => seek(s.start)} title="Escuchar desde aquí">
                        {formatDuration(s.start)}
                      </button>
                      <span>{s.text.trim()}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="plain">{plain}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
