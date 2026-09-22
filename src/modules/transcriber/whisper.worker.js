/**
 * Web Worker de transcripción.
 * Corre Whisper con transformers.js (ONNX Runtime) en WebGPU o WASM,
 * fuera del hilo principal para que la interfaz no se congele.
 *
 * Mensajes de entrada:
 *   { type: 'transcribe', audio: Float32Array (16 kHz mono), options }
 *
 * Mensajes de salida:
 *   { type: 'loading', file, loaded, total }   descarga del modelo
 *   { type: 'ready' }                          modelo listo
 *   { type: 'segment', index, total, segments } un tramo transcrito
 *   { type: 'done' }
 *   { type: 'error', message }
 */
import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false; // los modelos vienen del Hub y quedan en caché del navegador

const SAMPLE_RATE = 16000;
let current = { key: null, pipe: null };

function dtypeFor(device, fp16) {
  if (device === 'webgpu') {
    return { encoder_model: fp16 ? 'fp16' : 'fp32', decoder_model_merged: 'q4' };
  }
  return 'q8';
}

async function getPipeline(model, device, fp16) {
  const key = `${model}|${device}|${fp16}`;
  if (current.key === key) return current.pipe;

  if (current.pipe) {
    await current.pipe.dispose?.();
    current = { key: null, pipe: null };
  }

  const pipe = await pipeline('automatic-speech-recognition', model, {
    device,
    dtype: dtypeFor(device, fp16),
    progress_callback: (p) => {
      if (p.status === 'progress') {
        self.postMessage({ type: 'loading', file: p.file, loaded: p.loaded, total: p.total });
      }
    },
  });

  current = { key, pipe };
  return pipe;
}

/**
 * Busca el punto más silencioso cerca del corte para no partir palabras
 * entre dos tramos. Revisa los últimos `lookback` segundos antes del objetivo.
 */
function findCut(audio, target, lookback = 5) {
  if (target >= audio.length) return audio.length;
  const win = Math.floor(SAMPLE_RATE * 0.1);
  const from = Math.max(0, target - lookback * SAMPLE_RATE);
  let best = target;
  let bestEnergy = Infinity;
  for (let start = from; start + win <= target; start += win) {
    let sum = 0;
    for (let i = start; i < start + win; i++) sum += audio[i] * audio[i];
    if (sum < bestEnergy) {
      bestEnergy = sum;
      best = start + Math.floor(win / 2);
    }
  }
  return best;
}

async function transcribe(audio, options) {
  const { model, device, fp16, language, task, segmentSeconds, englishOnly } = options;

  const pipe = await getPipeline(model, device, fp16);
  self.postMessage({ type: 'ready' });

  // Plan de tramos
  const cuts = [0];
  const step = segmentSeconds * SAMPLE_RATE;
  while (cuts[cuts.length - 1] + step < audio.length) {
    cuts.push(findCut(audio, cuts[cuts.length - 1] + step));
  }
  cuts.push(audio.length);
  const total = cuts.length - 1;

  for (let i = 0; i < total; i++) {
    const start = cuts[i];
    const slice = audio.subarray(start, cuts[i + 1]);
    const offset = start / SAMPLE_RATE;
    const sliceDuration = slice.length / SAMPLE_RATE;

    const args = {
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: true,
    };
    if (!englishOnly) {
      args.task = task;
      if (language && language !== 'auto') args.language = language;
    }

    const out = await pipe(slice, args);

    const chunks = out.chunks?.length ? out.chunks : [{ timestamp: [0, sliceDuration], text: out.text }];
    const segments = chunks
      .filter((c) => c.text && c.text.trim())
      .map((c) => {
        const [s, e] = c.timestamp;
        return {
          start: offset + (s ?? 0),
          end: offset + (e ?? sliceDuration),
          text: c.text,
        };
      });

    self.postMessage({ type: 'segment', index: i, total, segments });
  }

  self.postMessage({ type: 'done' });
}

self.addEventListener('message', async (e) => {
  const { type, audio, options } = e.data;
  if (type !== 'transcribe') return;
  try {
    await transcribe(audio, options);
  } catch (err) {
    self.postMessage({ type: 'error', message: err?.message || String(err) });
  }
});
