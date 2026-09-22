import { useRef, useState } from 'react';

/**
 * Zona para soltar archivos o elegirlos con el explorador.
 */
export default function FileDrop({ accept, multiple = false, onFiles, title, hint, disabled }) {
  const input = useRef(null);
  const [over, setOver] = useState(false);

  const handle = (list) => {
    const files = Array.from(list || []);
    if (files.length) onFiles(multiple ? files : [files[0]]);
  };

  return (
    <div
      className={`drop ${over ? 'is-over' : ''} ${disabled ? 'is-disabled' : ''}`}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (!disabled) handle(e.dataTransfer.files);
      }}
    >
      <p className="drop-title">{title}</p>
      {hint && <p className="drop-hint">{hint}</p>}
      <button type="button" className="btn" disabled={disabled} onClick={() => input.current?.click()}>
        {multiple ? 'Elegir archivos' : 'Elegir archivo'}
      </button>
      <input
        ref={input}
        type="file"
        hidden
        accept={accept}
        multiple={multiple}
        onChange={(e) => { handle(e.target.files); e.target.value = ''; }}
      />
    </div>
  );
}
