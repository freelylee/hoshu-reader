import { JSZip } from './engines';
import { extOf, baseName, esc } from './helpers';
import type { Book, TocItem } from '../types/reader';

export const EPUB_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  avif: 'image/avif'
};

export const els = (doc: Document, local: string) =>
  Array.from(doc.getElementsByTagName('*')).filter((el) => el.localName === local);

export function dirOf(p: string) {
  const s = String(p);
  const i = s.lastIndexOf('/');
  return i < 0 ? '' : s.slice(0, i);
}

export function joinPath(dir: string, href: string) {
  const parts = (dir ? dir.split('/') : []).concat(String(href).split('/'));
  const out: string[] = [];
  for (const p of parts) {
    if (!p || p === '.') continue;
    if (p === '..') out.pop();
    else out.push(p);
  }
  return out.join('/');
}

export async function assetUrl(data: any, path: string): Promise<string> {
  if (!path) return '';
  if (data.blobs[path]) return data.blobs[path];
  const f = data.zip.file(path);
  if (!f) return '';
  const ext = (path.split('.').pop() || '').toLowerCase();
  const blob = await f.async('blob');
  const url = URL.createObjectURL(EPUB_MIME[ext] ? blob.slice(0, blob.size, EPUB_MIME[ext]) : blob);
  data.blobs[path] = url;
  return url;
}

export function cssScope(sel: string, scope: string): string {
  const s = String(sel).trim();
  if (!s) return '';
  const m = s.match(/^(?::root|html|body)\b([\s\S]*)$/i);
  if (m) {
    const rest = m[1];
    if (!rest) return scope;
    if (/^[\s>+~]/.test(rest)) return (scope + rest).replace(/\s+/g, ' ').trim();
    return scope + rest;
  }
  if (s === '*') return scope + ' *';
  return scope + ' ' + s;
}

export function scopeCss(css: string, scope: string): string {
  css = String(css || '').replace(/\/\*[\s\S]*?\*\//g, '');
  let out = '';
  let i = 0;
  const readBlock = (start: number) => {
    let depth = 1;
    let j = start + 1;
    while (j < css.length && depth) {
      const ch = css.charAt(j);
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      j++;
    }
    return { body: css.slice(start + 1, j - 1), end: j };
  };
  while (i < css.length) {
    const ob = css.indexOf('{', i);
    if (ob < 0) break;
    const head = css.slice(i, ob).trim();
    const blk = readBlock(ob);
    i = blk.end;
    if (!head) continue;
    if (head.charAt(0) === '@') {
      const at = head.split(/[\s{]/)[0].toLowerCase();
      if (/^@(media|supports|layer|container|document)/.test(at)) {
        out += head + '{' + scopeCss(blk.body, scope) + '}';
      } else if (
        /^@(font-face|keyframes|-webkit-keyframes|-moz-keyframes|page|counter-style|property|viewport)/.test(at)
      ) {
        out += head + '{' + blk.body + '}';
      }
      continue;
    }
    const sels = head
      .split(',')
      .map((s) => cssScope(s, scope))
      .filter(Boolean);
    if (sels.length) out += sels.join(',') + '{' + blk.body + '}';
  }
  return out;
}

export async function epubCssText(data: any): Promise<string> {
  if (data.cssText != null) return data.cssText;
  let css = '';
  for (const p of data.cssHrefs || []) {
    const f = data.zip.file(p);
    if (!f) continue;
    let t = '';
    try {
      t = await f.async('string');
    } catch {
      continue;
    }
    const hits = Array.from(new Set(t.match(/url\(\s*['"]?[^'")]+['"]?\s*\)/gi) || []));
    for (const u of hits) {
      const raw = ((u.match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/i) || [])[1] || '').trim();
      if (!raw || /^(data:|blob:|https?:|\/\/|#)/i.test(raw)) continue;
      const url = await assetUrl(data, joinPath(dirOf(p), raw.split('#')[0].split('?')[0]));
      if (url) t = t.split(u).join('url("' + url + '")');
    }
    css += '\n' + t;
  }
  data.cssText = css.trim() ? scopeCss(css, '#reader-body') : '';
  return data.cssText;
}

export function applyEpubCss(text: string) {
  const old = document.getElementById('epub-book-css');
  if (old) old.remove();
  if (!text) return;
  const el = document.createElement('style');
  el.id = 'epub-book-css';
  el.textContent = text;
  document.head.appendChild(el);
}

export function cnUnitLevel(s: string) {
  const m = s.match(/^第\s*[0-9一二三四五六七八九十百千零两]+\s*([章节回卷篇部])\s*/);
  if (!m) return 0;
  const u = m[1];
  if ('卷篇部'.indexOf(u) !== -1) return 1;
  if ('章回'.indexOf(u) !== -1) return 2;
  return 3;
}

export function normalizeLevels(rows: Array<{ id: string; title: string; level: number; line: number }>) {
  const used = Array.from(new Set(rows.map((r) => r.level || 1))).sort((a, b) => a - b);
  const map: Record<number, number> = {};
  used.forEach((lv, i) => {
    map[lv] = i + 1;
  });
  rows.forEach((r) => {
    r.level = map[r.level || 1] || 1;
  });
  return rows;
}

export function parseTextChapters(txt: string) {
  const lines = txt.split(/\r?\n/);
  const out: Array<{ id: string; title: string; level: number; line: number }> = [];
  for (let i = 0; i < lines.length; i++) {
    const s = lines[i].trim();
    const id = 'h' + out.length;
    if (/^#{1,3}\s+\S/.test(s)) {
      out.push({
        id,
        title: s.replace(/^#+\s*/, ''),
        level: (s.match(/^#+/) || ['#'])[0].length,
        line: i
      });
    } else if (/^第\s*[0-9一二三四五六七八九十百千零两]+\s*[章节回卷篇部]\s*\S{0,40}/.test(s) && s.length < 60) {
      out.push({ id, title: s, level: cnUnitLevel(s) || 1, line: i });
    }
  }
  if (!out.length) out.push({ id: 'h0', title: '全文', level: 1, line: 0 });
  return normalizeLevels(out);
}

export function nestByLevel(rows: TocItem[]) {
  const stack: string[] = [];
  for (const r of rows) {
    const lv = Math.max(1, Math.min(Number(r.level) || 1, 4));
    r.level = lv;
    while (stack.length >= lv) stack.pop();
    r.pid = stack.length ? stack[stack.length - 1] : '';
    if (r.pid) {
      const p = rows.find((x) => x.id === r.pid);
      if (p) p.hasChildren = true;
    }
    stack.push(r.id);
  }
  return rows;
}

export function isHeadingLine(raw: string | null | undefined): boolean {
  const s = String(raw == null ? '' : raw).trim();
  if (!s) return false;
  return (
    /^#{1,3}\s+\S/.test(s) ||
    (/^第\s*[0-9一二三四五六七八九十百千]+\s*[章节回卷篇]\s*\S{0,40}/.test(s) && s.length < 60)
  );
}

export function textBodyHtml(lines: string[]) {
  return lines
    .map((l) => {
      const t = l.trim();
      if (!t) return '';
      if (isHeadingLine(t)) {
        const lv = /^#{1,3}/.test(t) ? (t.match(/^#+/) || ['#'])[0].length : 1;
        const tag = lv >= 3 ? 3 : 2;
        return '<h' + tag + '>' + esc(t.replace(/^#+\s*/, '')) + '</h' + tag + '>';
      }
      if (/^>\s?/.test(t)) return '<blockquote>' + esc(t.replace(/^>\s?/, '')) + '</blockquote>';
      return '<p>' + esc(t) + '</p>';
    })
    .join('');
}
