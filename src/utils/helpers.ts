export const uid = (): string => Math.random().toString(36).slice(2, 10);

export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

export const extOf = (name: string): string => {
  const i = String(name).lastIndexOf('.');
  return i < 0 ? '' : String(name).slice(i + 1).toLowerCase();
};

export const baseName = (name: string): string => {
  const i = String(name).lastIndexOf('.');
  return i < 0 ? name : String(name).slice(0, i);
};

export const fmtSize = (n: number): string => {
  if (!n) return '0 B';
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
  if (n < 1073741824) return (n / 1048576).toFixed(1) + ' MB';
  return (n / 1073741824).toFixed(2) + ' GB';
};

export const fmtDate = (ts: number): string => {
  const d = new Date(ts);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

export const esc = (s: string): string =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] || c);

export const splitSentences = (text: string): string[] =>
  String(text)
    .replace(/\s+/g, ' ')
    .split(/(?<=[。！？；!?;])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
