/**
 * Utilidades de audio que corren 100% en el navegador.
 *
 * Estrategia de decodificación:
 *  1. Intentar con Web Audio (decodeAudioData): rápido y sin descargas extra.
 *     Funciona con mp3, wav, ogg, flac, m4a/aac, webm y el audio de mp4/mov/webm.
 *  2. Si falla, usar ffmpeg.wasm como respaldo (avi, wmv, flv, mkv, 3gp, etc.).
 */
import { ffmpegToWav } from './ffmpeg.js';

/** Decodifica un ArrayBuffer usando Web Audio. */
async function decodeNative(arrayBuffer) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx();
  try {
    return await ctx.decodeAudioData(arrayBuffer);
  } finally {
    ctx.close();
  }
}

/** Remuestrea y mezcla canales usando OfflineAudioContext. */
export async function resample(buffer, sampleRate, channels) {
  if (buffer.sampleRate === sampleRate && buffer.numberOfChannels === channels) return buffer;
  const length = Math.ceil(buffer.duration * sampleRate);
  const offline = new OfflineAudioContext(channels, length, sampleRate);
  const src = offline.createBufferSource();
  src.buffer = buffer;
  src.connect(offline.destination);
  src.start();
  return offline.startRendering();
}

/**
 * Decodifica un archivo (audio o video) a un AudioBuffer con la frecuencia y
 * cantidad de canales pedidos (null = conservar los del archivo).
 *
 * @param {File} file
 * @param {{sampleRate:number, channels:number, engine?:'auto'|'native'|'ffmpeg', onProgress?:(p:number)=>void, onEngine?:(e:string)=>void}} opts
 */
export async function decodeFile(file, { sampleRate, channels, engine = 'auto', onProgress, onEngine }) {
  let buffer = null;

  if (engine !== 'ffmpeg') {
    try {
      onEngine?.('native');
      buffer = await decodeNative(await file.arrayBuffer());
    } catch (err) {
      if (engine === 'native') {
        throw new Error('El navegador no puede leer este formato. Prueba con el motor FFmpeg.');
      }
    }
  }

  if (!buffer) {
    onEngine?.('ffmpeg');
    // ffmpeg ya entrega la frecuencia y canales finales.
    const wav = await ffmpegToWav(file, { sampleRate, channels, bitDepth: 16, onProgress });
    buffer = await decodeNative(await wav.arrayBuffer());
  }

  // sampleRate/channels nulos = conservar los originales
  return resample(buffer, sampleRate || buffer.sampleRate, channels || buffer.numberOfChannels);
}

/**
 * Codifica un AudioBuffer a WAV (PCM 16/24 bits o float 32).
 * @returns {Blob}
 */
export function encodeWav(buffer, bitDepth = 16) {
  const channels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const frames = buffer.length;
  const isFloat = bitDepth === 32;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = channels * bytesPerSample;
  const dataSize = frames * blockAlign;

  const view = new DataView(new ArrayBuffer(44 + dataSize));
  const writeStr = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, isFloat ? 3 : 1, true); // 1 = PCM, 3 = IEEE float
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  const data = [];
  for (let c = 0; c < channels; c++) data.push(buffer.getChannelData(c));

  let offset = 44;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < channels; c++) {
      const s = Math.max(-1, Math.min(1, data[c][i]));
      if (isFloat) {
        view.setFloat32(offset, s, true);
      } else if (bitDepth === 24) {
        const v = Math.round(s < 0 ? s * 0x800000 : s * 0x7fffff);
        view.setUint8(offset, v & 0xff);
        view.setUint8(offset + 1, (v >> 8) & 0xff);
        view.setUint8(offset + 2, (v >> 16) & 0xff);
      } else {
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      }
      offset += bytesPerSample;
    }
  }
  return new Blob([view], { type: 'audio/wav' });
}

/** Tamaño estimado del WAV resultante, en bytes. */
export function estimateWavSize(durationSec, sampleRate, channels, bitDepth) {
  return 44 + Math.ceil(durationSec * sampleRate) * channels * (bitDepth / 8);
}
