import { useEffect, useRef, useState } from 'react';
import FileDrop from '../../components/FileDrop.jsx';
import Progress from '../../components/Progress.jsx';
import { Select, Segmented } from '../../components/Field.jsx';
import { decodeFile, encodeWav } from '../../lib/audio.js';
import { ffmpegToWav } from '../../lib/ffmpeg.js';
import { downloadBlob } from '../../lib/download.js';
import { baseName, formatBytes, formatDuration } from '../../lib/format.js';

const PRESETS = {
  original: { sampleRate: 'original', channels: 'original', bitDepth: '16' },
  cd: { sampleRate: '44100', channels: '2', bitDepth: '16' },
  speech: { sampleRate: '16000', channels: '1', bitDepth: '16' },
  studio: { sampleRate: '48000', channels: '2', bitDepth: '24' },
};

const STATUS_TEXT = {
  pending: 'En cola',
  working: 'Convirtiendo',
  done: 'Listo',
  error: 'Error',
};

let nextId = 1;

export default function Converter({ kind }) {
  const isVideo = kind === 'video';
  const [items, setItems] = useState([]);
  const [preset, setPreset] = useState(isVideo ? 'cd' : 'original');
  const [opts, setOpts] = useState(isVideo ? PRESETS.cd : PRESETS.original);
  const [engine, setEngine] = useState('auto');
  const [running, setRunning] = useState(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Liberar URLs de objetos al salir
  useEffect(() => () => itemsRef.current.forEach((i) => i.url && URL.revokeObjectURL(i.url)), []);

  const update = (id, patch) => setItems((list) => list.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const applyPreset = (p) => {
    setPreset(p);
    if (PRESETS[p]) setOpts(PRESETS[p]);
  };
  const setOpt = (key) => (value) => {
    setPreset('custom');
    setOpts((o) => ({ ...o, [key]: value }));
  };

  const addFiles = (files) => {
    setItems((list) => [
      ...list,
      ...files.map((file) => ({ id: nextId++, file, status: 'pending', progress: 0 })),
    ]);
  };

  const convertOne = async (item) => {
    const sampleRate = opts.sampleRate === 'original' ? null : Number(opts.sampleRate);
    const channels = opts.channels === 'original' ? null : Number(opts.channels);
    const bitDepth = Number(opts.bitDepth);

    update(item.id, { status: 'working', progress: null, error: null });
    let blob = null;
    let duration = null;
    let usedEngine = 'native';

    try {
      if (engine !== 'ffmpeg') {
        try {
          const buffer = await decodeFile(item.file, { sampleRate, channels, engine: 'native' });
          duration = buffer.duration;
          blob = encodeWav(buffer, bitDepth);
        } catch (err) {
          if (engine === 'native') throw err;
        }
      }
      if (!blob) {
        usedEngine = 'ffmpeg';
        update(item.id, { engine: 'ffmpeg', progress: 0 });
        blob = await ffmpegToWav(item.file, {
          sampleRate,
          channels,
          bitDepth,
          onProgress: (p) => update(item.id, { progress: p }),
        });
      }
      update(item.id, {
        status: 'done',
        blob,
        url: URL.createObjectURL(blob),
        duration,
        engine: usedEngine,
        progress: 1,
      });
    } catch (err) {
      update(item.id, { status: 'error', error: err.message || String(err) });
    }
  };

  const convertAll = async () => {
    setRunning(true);
    for (const item of itemsRef.current) {
      if (item.status === 'pending' || item.status === 'error') {
        // eslint-disable-next-line no-await-in-loop
        await convertOne(item);
      }
    }
    setRunning(false);
  };

  const remove = (id) => {
    setItems((list) => {
      const it = list.find((i) => i.id === id);
      if (it?.url) URL.revokeObjectURL(it.url);
      return list.filter((i) => i.id !== id);
    });
  };

  const clearDone = () => {
    items.filter((i) => i.status === 'done').forEach((i) => URL.revokeObjectURL(i.url));
    setItems((list) => list.filter((i) => i.status !== 'done'));
  };

  const downloadAll = async () => {
    for (const it of items.filter((i) => i.status === 'done')) {
      downloadBlob(it.blob, `${baseName(it.file.name)}.wav`);
      // Pequeña pausa: los navegadores bloquean muchas descargas simultáneas.
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 400));
    }
  };

  const pending = items.filter((i) => i.status === 'pending' || i.status === 'error').length;
  const done = items.filter((i) => i.status === 'done').length;

  const accept = isVideo
    ? 'video/*,.mkv,.avi,.wmv,.flv,.mov,.m4v,.3gp,.mpg,.mpeg,.ts,.ogv'
    : 'audio/*,.m4a,.aac,.opus,.flac,.wma,.amr,.aiff,.aif,.caf';

  return (
    <section className="module" aria-labelledby={`${kind}-title`}>
      <header className="module-head">
        <h1 id={`${kind}-title`}>{isVideo ? 'Video a WAV' : 'Audio a WAV'}</h1>
        <p>
          {isVideo
            ? 'Extrae el audio de tus videos como archivo WAV. Puedes convertir varios a la vez.'
            : 'Convierte grabaciones y notas de voz a WAV sin comprimir. Puedes convertir varios a la vez.'}
        </p>
      </header>

      <div className="module-grid">
        <aside className="controls">
          <Select label="Ajuste" value={preset} onChange={applyPreset} disabled={running}
            options={[
              { value: 'original', label: 'Conservar el original' },
              { value: 'cd', label: 'Calidad CD (44,1 kHz, estéreo)' },
              { value: 'speech', label: 'Para transcribir (16 kHz, mono)' },
              { value: 'studio', label: 'Estudio (48 kHz, 24 bits)' },
              { value: 'custom', label: 'Personalizado' },
            ]} />
          <Select label="Frecuencia de muestreo" value={opts.sampleRate} onChange={setOpt('sampleRate')} disabled={running}
            options={[
              { value: 'original', label: 'Igual que el original' },
              { value: '8000', label: '8 kHz (teléfono)' },
              { value: '16000', label: '16 kHz (voz)' },
              { value: '22050', label: '22,05 kHz' },
              { value: '44100', label: '44,1 kHz (CD)' },
              { value: '48000', label: '48 kHz (video)' },
            ]} />
          <Segmented label="Canales" value={opts.channels} onChange={setOpt('channels')} disabled={running}
            options={[
              { value: 'original', label: 'Original' },
              { value: '1', label: 'Mono' },
              { value: '2', label: 'Estéreo' },
            ]} />
          <Segmented label="Profundidad" value={opts.bitDepth} onChange={setOpt('bitDepth')} disabled={running}
            options={[
              { value: '16', label: '16 bits' },
              { value: '24', label: '24 bits' },
              { value: '32', label: '32 float' },
            ]} />
          <details className="advanced">
            <summary>Opciones avanzadas</summary>
            <Select label="Motor de conversión" value={engine} onChange={setEngine} disabled={running}
              options={[
                { value: 'auto', label: 'Automático' },
                { value: 'native', label: 'Solo navegador' },
                { value: 'ffmpeg', label: 'Siempre FFmpeg' },
              ]}
              hint="Automático usa el navegador y recurre a FFmpeg para formatos poco comunes (avi, wmv, flv…). FFmpeg se descarga la primera vez que se necesita (unos 30 MB)." />
          </details>
        </aside>

        <div className="workspace">
          <FileDrop
            accept={accept}
            multiple
            onFiles={addFiles}
            title={isVideo ? 'Suelta aquí tus videos' : 'Suelta aquí tus audios'}
            hint={isVideo
              ? 'mp4, mov, webm, mkv, avi, wmv, flv, 3gp, mpg y más'
              : 'mp3, m4a, aac, ogg, opus, flac, wma, amr, aiff y más'}
          />

          {items.length > 0 && (
            <div className="sheet">
              <div className="result-head">
                <h2>{items.length === 1 ? '1 archivo' : `${items.length} archivos`}</h2>
                <div className="btn-row">
                  {done > 0 && <button type="button" className="btn-link" onClick={clearDone} disabled={running}>Quitar convertidos</button>}
                  {done > 1 && <button type="button" className="btn" onClick={downloadAll}>Descargar todos</button>}
                  <button type="button" className="btn btn-primary" onClick={convertAll} disabled={running || pending === 0}>
                    {running ? 'Convirtiendo…' : pending > 1 ? `Convertir ${pending} archivos` : 'Convertir'}
                  </button>
                </div>
              </div>

              <ul className="queue">
                {items.map((it) => (
                  <li key={it.id} className={`queue-item is-${it.status}`}>
                    <div className="queue-main">
                      <p className="file-name">{it.file.name}</p>
                      <p className="muted">
                        {formatBytes(it.file.size)}
                        {it.status === 'done' && ` → ${formatBytes(it.blob.size)}`}
                        {it.duration ? `, ${formatDuration(it.duration)}` : ''}
                        {it.engine === 'ffmpeg' && ', con FFmpeg'}
                      </p>
                      {it.status === 'working' && (
                        <Progress value={it.progress} label={it.engine === 'ffmpeg' ? 'Convirtiendo con FFmpeg' : 'Decodificando'} />
                      )}
                      {it.status === 'error' && <p className="alert small">{it.error}</p>}
                      {it.status === 'done' && <audio src={it.url} controls className="player" preload="none" />}
                    </div>
                    <div className="queue-side">
                      <span className={`badge is-${it.status}`}>{STATUS_TEXT[it.status]}</span>
                      {it.status === 'done' && (
                        <button type="button" className="btn" onClick={() => downloadBlob(it.blob, `${baseName(it.file.name)}.wav`)}>
                          Descargar
                        </button>
                      )}
                      {it.status !== 'working' && (
                        <button type="button" className="btn-link" onClick={() => remove(it.id)} aria-label={`Quitar ${it.file.name}`}>
                          Quitar
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
