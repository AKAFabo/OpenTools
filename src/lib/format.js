export function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) { bytes /= 1024; i++; }
  return `${bytes.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatDuration(sec) {
  if (!Number.isFinite(sec)) return '—';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** 3725.5 -> "01:02:05,500" (SRT) o "01:02:05.500" (VTT) */
export function timecode(sec, sep = ',') {
  const ms = Math.round((sec % 1) * 1000);
  const t = Math.floor(sec);
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  return `${pad(Math.floor(t / 3600))}:${pad(Math.floor((t % 3600) / 60))}:${pad(t % 60)}${sep}${pad(ms, 3)}`;
}

export function toSrt(segments) {
  return segments
    .map((s, i) => `${i + 1}\n${timecode(s.start)} --> ${timecode(s.end)}\n${s.text.trim()}\n`)
    .join('\n');
}

export function toVtt(segments) {
  return 'WEBVTT\n\n' + segments
    .map((s) => `${timecode(s.start, '.')} --> ${timecode(s.end, '.')}\n${s.text.trim()}\n`)
    .join('\n');
}

export function toPlainText(segments) {
  return segments.map((s) => s.text.trim()).join(' ').replace(/\s+/g, ' ').trim();
}

export function toMarkdown(segments, title, withTimes) {
  const body = withTimes
    ? segments.map((s) => `**[${formatDuration(s.start)}]** ${s.text.trim()}`).join('\n\n')
    : toPlainText(segments);
  return `# ${title}\n\n${body}\n`;
}

export function baseName(name) {
  return name.replace(/\.[^.]+$/, '');
}
