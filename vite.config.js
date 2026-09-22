import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // ffmpeg.wasm y transformers.js traen sus propios workers/wasm:
  // no deben ser pre-empaquetados por Vite.
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util', '@huggingface/transformers'],
  },
  worker: {
    format: 'es',
  },
});
