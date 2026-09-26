# OpenTools

Herramientas gratuitas y open source para el día a día de un estudiante universitario.
Todo corre **dentro de tu navegador**: no hay servidor, no hay APIs de pago, no hay
límites de uso y tus archivos nunca salen de tu computadora.

| Módulo | Qué hace |
|---|---|
| **Transcriptor** | Convierte audio o video en texto con Whisper. Varios modelos, 16 idiomas, traducción al inglés, grabación con micrófono y exportación a TXT, SRT, VTT y Markdown. |
| **Video a WAV** | Extrae el audio de mp4, mov, webm, mkv, avi, wmv, flv, 3gp, mpg… Conversión por lotes. |
| **Audio a WAV** | Convierte mp3, m4a, aac, ogg, opus, flac, wma, amr, aiff… Conversión por lotes. |
| **Apuntes Markdown** | Editor con vista previa en hoja real, 5 estilos de documento, 7 fuentes, fórmulas LaTeX, tablas, código resaltado y exportación a PDF, HTML y .md. |

## Requisitos

- [Node.js](https://nodejs.org) 18 o superior.
- Un navegador moderno (Chrome, Edge, Firefox o Safari recientes). Para transcribir
  rápido se recomienda Chrome o Edge, que soportan **WebGPU**.

## Instalación y uso

```bash
npm install
npm run dev
```

Abre la dirección que aparece en la terminal (normalmente http://localhost:5173).

## Cómo funciona cada módulo

### Transcriptor

Usa [transformers.js](https://github.com/huggingface/transformers.js) para ejecutar
Whisper en un Web Worker, con la GPU (WebGPU) si está disponible o con la CPU
(WebAssembly) si no.

- **Primera vez:** el modelo se descarga desde Hugging Face y queda guardado en la
  caché del navegador. Las siguientes veces funciona sin conexión.
- **Sin límite de duración:** el audio se divide en tramos (cortando en los silencios
  para no partir palabras) y el texto aparece a medida que avanza.
- **Modelos:** Tiny, Base, Small, Large v3 Turbo, Base solo inglés, o cualquier
  modelo Whisper en formato ONNX de Hugging Face.
- Haz clic en una marca de tiempo para escuchar el audio desde ese punto.
- «Abrir en Apuntes» envía la transcripción al editor Markdown.

| Modelo | Descarga aprox. | Recomendado para |
|---|---|---|
| Tiny | ~40 MB | Pruebas rápidas |
| Base | ~80 MB | Clases con buen audio (predeterminado) |
| Small | ~250 MB | Ruido, acentos, vocabulario técnico |
| Large v3 Turbo | ~800 MB o más | Máxima precisión, con GPU |

### Conversores a WAV

1. Primero intenta decodificar con la Web Audio API del navegador (instantáneo).
2. Si el formato no es compatible, usa [ffmpeg.wasm](https://ffmpegwasm.netlify.app)
   automáticamente. FFmpeg se carga solo la primera vez que hace falta.

Puedes elegir frecuencia (8 a 48 kHz), canales (mono o estéreo) y profundidad
(16 bits, 24 bits o 32 bits float), o usar un ajuste predefinido. El ajuste
«Para transcribir» (16 kHz mono) genera archivos más livianos, ideales para Whisper.

### Apuntes Markdown

- Markdown con GFM: tablas, listas de tareas, tachado.
- Fórmulas con `$...$` en línea y `$$...$$` en bloque (KaTeX).
- Código con resaltado de sintaxis.
- `<!-- pagebreak -->` inserta un salto de página en el PDF.
- Atajos: `Ctrl/Cmd + B` negrita, `Ctrl/Cmd + I` cursiva, `Tab` sangría.
- El contenido y el estilo se guardan automáticamente en el navegador.
- **PDF:** abre la ventana de impresión; elige «Guardar como PDF».

## Estructura del proyecto

```
src/
├── App.jsx                     Navegación y estructura general
├── main.jsx
├── styles/global.css           Estilos de la interfaz
├── components/                 Piezas reutilizables (zona de archivos, progreso, campos)
├── lib/
│   ├── audio.js                Decodificación, remuestreo y codificador WAV
│   ├── ffmpeg.js               Carga perezosa de ffmpeg.wasm
│   ├── format.js               SRT, VTT, tiempos y tamaños
│   └── download.js
└── modules/
    ├── transcriber/            Transcriptor + worker de Whisper
    ├── converter/              Conversor a WAV (video y audio)
    └── markdown/               Editor, estilos de documento, fuentes y render
```

### Agregar una herramienta nueva

1. Crea una carpeta en `src/modules/tu-herramienta/` con su componente.
2. Agrégala a la lista `TOOLS` de `src/App.jsx` (id, nombre, descripción e ícono).
3. Añade su `<div hidden={...}>` dentro de `<main>`.

## Limitaciones conocidas

- Los archivos se cargan completos en memoria. En equipos con poca RAM, videos de
  varios GB pueden fallar; en ese caso conviértelos primero a WAV «Para transcribir»,
  que ocupa mucho menos.
- ffmpeg.wasm tiene un límite práctico de unos 2 GB por archivo.
- Sin WebGPU la transcripción es notablemente más lenta; con la CPU conviene usar
  los modelos Tiny o Base.

## Licencia

MIT. Úsalo, modifícalo y compártelo libremente.
Los componentes de terceros (Whisper, transformers.js, FFmpeg, KaTeX, marked,
highlight.js y las fuentes) mantienen sus propias licencias.


## Contacto

Contacta al creador de OpenTools a través del siguiente correo electrónico: **ceherrera@estudiantec.cr**
