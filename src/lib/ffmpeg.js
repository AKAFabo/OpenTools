/**
 * Carga perezosa de ffmpeg.wasm. Solo se descarga/inicializa la primera vez
 * que un archivo no puede decodificarse con las APIs nativas del navegador
 * (por ejemplo .avi, .wmv, .flv o .mkv en algunos navegadores).
 */
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import coreURL from '@ffmpeg/core?url';
import wasmURL from '@ffmpeg/core/wasm?url';

let loading = null;

export function getFFmpeg() {
  if (!loading) {
    const ffmpeg = new FFmpeg();
    loading = ffmpeg
      .load({ coreURL, wasmURL })
      .then(() => ffmpeg)
      .catch((err) => {
        loading = null;
        throw err;
      });
  }
  return loading;
}

const CODECS = { 16: 'pcm_s16le', 24: 'pcm_s24le', 32: 'pcm_f32le' };

/**
 * Convierte cualquier archivo que ffmpeg entienda a WAV.
 * @returns {Promise<Blob>}
 */
export async function ffmpegToWav(file, { sampleRate, channels, bitDepth = 16, onProgress } = {}) {
  const ffmpeg = await getFFmpeg();
  const ext = (file.name.match(/\.[a-z0-9]+$/i) || [''])[0];
  const id = Math.random().toString(36).slice(2, 8);
  const input = `in_${id}${ext}`;
  const output = `out_${id}.wav`;

  const handler = ({ progress }) => onProgress?.(Math.min(1, Math.max(0, progress)));
  ffmpeg.on('progress', handler);

  try {
    await ffmpeg.writeFile(input, await fetchFile(file));
    const args = ['-i', input, '-vn'];
    if (sampleRate) args.push('-ar', String(sampleRate));
    if (channels) args.push('-ac', String(channels));
    args.push('-c:a', CODECS[bitDepth] || CODECS[16], output);

    const code = await ffmpeg.exec(args);
    if (code !== 0) throw new Error('FFmpeg no pudo leer el archivo. Puede que no tenga pista de audio.');

    const data = await ffmpeg.readFile(output);
    return new Blob([data], { type: 'audio/wav' });
  } finally {
    ffmpeg.off('progress', handler);
    await ffmpeg.deleteFile(input).catch(() => {});
    await ffmpeg.deleteFile(output).catch(() => {});
  }
}
