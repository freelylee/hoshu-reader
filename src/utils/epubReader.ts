import { JSZip } from './engines';
import { dirOf, joinPath, els, assetUrl, scopeCss } from './bookParsers';
import type { Book, TocItem } from '../types/reader';

export async function parseEpub(b: Book) {
  let buf: ArrayBuffer | null = null;
  if (!b.file && b.fileHandle) {
    try {
      b.file = await b.fileHandle.getFile();
    } catch {}
  }
  if (b.file) {
    buf = await b.file.arrayBuffer();
  } else if (b.blob) {
    buf = await b.blob.arrayBuffer();
  } else if (b.fileData) {
    buf = b.fileData.slice(0);
  }
  if (!buf) throw new Error('文件未加载，请选择此本地电子书文件');
  const zip = await JSZip.loadAsync(buf);
  const contFile = zip.file('META-INF/container.xml');
  if (!contFile) throw new Error('不是有效的 EPUB：缺少 META-INF/container.xml');
  const cdoc = new DOMParser().parseFromString(await contFile.async('string'), 'application/xml');
  const root = els(cdoc, 'rootfile')[0];
  const opfPath = (root ? root.getAttribute('full-path') : '') || '';
  const opfFile = opfPath ? zip.file(opfPath) : null;
  if (!opfFile) throw new Error('不是有效的 EPUB：找不到 OPF 清单');
  const opf = new DOMParser().parseFromString(await opfFile.async('string'), 'application/xml');
  const opfDir = dirOf(opfPath);
  const manifest: Record<string, { href: string; type: string; props: string }> = {};
  els(opf, 'item').forEach((it) => {
    manifest[it.getAttribute('id') || ''] = {
      href: it.getAttribute('href') || '',
      type: it.getAttribute('media-type') || '',
      props: it.getAttribute('properties') || ''
    };
  });
  const spine = els(opf, 'itemref')
    .map((ir) => ir.getAttribute('idref') || '')
    .filter((id) => manifest[id]);

  let coverPath = '';
  const cid = Object.keys(manifest).find((k) => /cover-image/.test(manifest[k].props));
  if (cid) coverPath = joinPath(opfDir, manifest[cid].href);
  else {
    const mc = els(opf, 'meta').find((m) => String(m.getAttribute('name')).toLowerCase() === 'cover');
    const mid = mc ? mc.getAttribute('content') || '' : '';
    if (mid && manifest[mid]) coverPath = joinPath(opfDir, manifest[mid].href);
  }

  const t = els(opf, 'title')[0];
  const cr = els(opf, 'creator')[0];

  return {
    zip,
    opfDir,
    manifest,
    spine,
    coverPath,
    title: t ? (t.textContent || '').trim() : '',
    author: cr ? (cr.textContent || '').trim() : '',
    chapters: spine.map((id, i) => ({ index: i, path: joinPath(opfDir, manifest[id].href) })),
    cssHrefs: Object.keys(manifest)
      .filter((k) => /text\/css/i.test(manifest[k].type) || /\.css(\?|$)/i.test(manifest[k].href))
      .map((k) => joinPath(opfDir, manifest[k].href)),
    cssText: null as string | null,
    blobs: {} as Record<string, string>,
    cache: {} as Record<number, string>
  };
}

function directChild(node: Element | null, name: string) {
  const kids = node && node.children ? Array.from(node.children) : [];
  return kids.find((c) => c.localName === name) || null;
}

function readNavList(list: Element): any[] {
  const out = [];
  for (const li of Array.from(list.children || [])) {
    if (li.localName !== 'li') continue;
    const a = directChild(li, 'a') || directChild(li, 'span') || li.querySelector('a');
    const sub = directChild(li, 'ol') || directChild(li, 'ul');
    const label = ((a ? a.textContent : li.textContent) || '').replace(/\s+/g, ' ').trim();
    const href = a ? a.getAttribute('href') || '' : '';
    if (!href && !label && !(sub && sub.children.length)) continue;
    out.push({ label: label || href, href, children: sub ? readNavList(sub) : [] });
  }
  return out;
}

function readNcxPoints(parent: Element): any[] {
  const out = [];
  for (const np of Array.from(parent.children || [])) {
    if (np.localName !== 'navPoint') continue;
    const c = directChild(np, 'content');
    const lb = directChild(np, 'navLabel');
    const tx = lb ? directChild(lb, 'text') : null;
    const src = c ? c.getAttribute('src') || '' : '';
    const label = tx && tx.textContent?.trim() ? tx.textContent.trim() : src;
    if (!src && !label) continue;
    out.push({ label: label || src, href: src, children: readNcxPoints(np) });
  }
  return out;
}

export async function epubNavTree(data: any): Promise<any[]> {
  const navId = Object.keys(data.manifest).find((k) => /(^|\s)nav(\s|$)/.test(data.manifest[k].props));
  if (navId) {
    const f = data.zip.file(joinPath(data.opfDir, data.manifest[navId].href));
    if (f) {
      const doc = new DOMParser().parseFromString(await f.async('string'), 'text/html');
      const navs = Array.from(doc.getElementsByTagName('nav'));
      const nav =
        navs.find((n) => /toc/i.test(n.getAttribute('epub:type') || n.getAttribute('type') || '')) || navs[0];
      const list = nav ? nav.querySelector('ol') || nav.querySelector('ul') : null;
      if (list) {
        const tree = readNavList(list);
        if (tree.length) return tree;
      }
    }
  }
  const ncxId = Object.keys(data.manifest).find((k) => /ncx/i.test(data.manifest[k].type));
  if (ncxId) {
    const f = data.zip.file(joinPath(data.opfDir, data.manifest[ncxId].href));
    if (f) {
      const doc = new DOMParser().parseFromString(await f.async('string'), 'application/xml');
      const top = els(doc, 'navMap')[0];
      if (top) return readNcxPoints(top);
    }
  }
  return [];
}

export async function buildEpubToc(b: Book, data: any): Promise<TocItem[]> {
  const chapters: TocItem[] = data.chapters.map((_c: any, i: number) => ({
    id: 'c' + i,
    label: '第 ' + (i + 1) + ' 章',
    level: 1,
    kind: 'chapter',
    index: i
  }));
  const tree = await epubNavTree(data);
  const rows: TocItem[] = [];

  const walk = (nodes: any[], level: number, pid: string) => {
    for (const n of nodes) {
      const full = String(n.href || '');
      const target = joinPath(data.opfDir, full.split('#')[0]);
      const rawFrag = full.split('#')[1] || '';
      const ci = data.chapters.findIndex((c: any) => c.path === target);
      const id = 't' + rows.length;
      const kids = n.children && n.children.length ? n.children : [];
      let frag = '';
      if (rawFrag && ci >= 0) {
        try {
          frag = 'epb' + ci + '-' + decodeURIComponent(rawFrag);
        } catch {
          frag = 'epb' + ci + '-' + rawFrag;
        }
      }
      rows.push({
        id,
        label: n.label || (ci >= 0 ? chapters[ci].label : ''),
        level: Math.min(level, 4),
        kind: 'chapter',
        index: ci >= 0 ? ci : 0,
        chapterIndex: ci,
        fragment: frag,
        pid,
        hasChildren: kids.length > 0
      });
      if (ci >= 0 && !rawFrag && chapters[ci].label === '第 ' + (ci + 1) + ' 章') {
        chapters[ci].label = n.label || chapters[ci].label;
      }
      if (kids.length) walk(kids, level + 1, id);
    }
  };

  walk(tree, 1, '');
  b.chapters = chapters;
  if (!rows.length) {
    return chapters.map((c) => ({
      id: c.id,
      label: c.label,
      level: 1,
      kind: 'chapter',
      index: c.index,
      chapterIndex: c.index,
      fragment: '',
      pid: '',
      hasChildren: false
    }));
  }
  return rows;
}

export async function cleanEpubHtml(raw: string, path: string, data: any): Promise<string> {
  let doc: Document | null = null;
  try {
    doc = new DOMParser().parseFromString(raw, 'application/xhtml+xml');
    if (!doc.body || doc.getElementsByTagName('parsererror').length) doc = null;
  } catch {
    doc = null;
  }
  if (!doc) doc = new DOMParser().parseFromString(raw, 'text/html');
  const body = doc.body;
  if (!body) return '';

  // 提取章节内联 <style>，避免被过滤后丢失排版细节
  let chapterInlineStyles = '';
  Array.from(doc.querySelectorAll('style')).forEach((st) => {
    const txt = st.textContent || '';
    if (txt.trim()) {
      chapterInlineStyles += '\n' + scopeCss(txt, '#reader-body');
    }
  });

  Array.from(body.querySelectorAll('script,style,link,iframe,object,embed,noscript,meta,base')).forEach((n) =>
    n.remove()
  );

  const base = dirOf(path);
  const chIdx = data.chapters.findIndex((c: any) => c.path === path);
  const prefix = 'epb' + (chIdx < 0 ? 0 : chIdx) + '-';

  Array.from(body.querySelectorAll('[id]')).forEach((n) => {
    const old = n.getAttribute('id');
    if (old) n.setAttribute('id', prefix + old);
  });

  const imageTasks: Promise<void>[] = [];

  for (const n of Array.from(body.querySelectorAll('*'))) {
    for (const at of Array.from(n.attributes)) {
      if (/^on/i.test(at.name)) n.removeAttribute(at.name);
    }
    const ln = (n.localName || '').toLowerCase();
    if (ln === 'img' || ln === 'image') {
      const src = n.getAttribute('src') || n.getAttribute('xlink:href') || n.getAttribute('href') || '';
      n.removeAttribute('srcset');
      if (!src) continue;
      if (/^(data:|blob:)/i.test(src)) continue;
      const cleanSrc = src.split('#')[0].split('?')[0];
      const fullPath = joinPath(base, cleanSrc);
      n.setAttribute('data-epub-src', fullPath);

      // 实时异步加载 zip 内嵌图片资源并赋予有效 blob 链接
      imageTasks.push(
        assetUrl(data, fullPath)
          .then((url) => {
            if (url) {
              if (ln === 'img') {
                n.setAttribute('src', url);
              } else {
                n.setAttribute('href', url);
                n.setAttribute('xlink:href', url);
              }
            }
          })
          .catch((e) => {
            console.warn('加载 EPUB 内嵌插图失败:', fullPath, e);
          })
      );
    } else if (ln === 'a') {
      const href = n.getAttribute('href') || '';
      if (!href) continue;
      if (href.charAt(0) === '#') {
        let frag = href.slice(1);
        try {
          frag = decodeURIComponent(frag);
        } catch {}
        n.removeAttribute('href');
        n.setAttribute('data-frag', prefix + frag);
        continue;
      }
      if (/^[a-z][a-z0-9+.-]*:/i.test(href)) {
        if (/^https?:/i.test(href)) {
          n.setAttribute('target', '_blank');
          n.setAttribute('rel', 'noopener');
        }
        continue;
      }
      const ci = data.chapters.findIndex((c: any) => c.path === joinPath(base, href.split('#')[0]));
      n.removeAttribute('href');
      if (ci >= 0) n.setAttribute('data-chapter', String(ci));
    }
  }

  if (imageTasks.length) {
    await Promise.all(imageTasks);
  }

  const stylePrefix = chapterInlineStyles.trim() ? `<style>${chapterInlineStyles}</style>` : '';
  return stylePrefix + body.innerHTML;
}

export async function epubChapterHtml(b: Book, data: any, idx: number): Promise<string> {
  if (data.cache[idx] != null) return data.cache[idx];
  const ch = data.chapters[idx];
  let html = '';
  if (ch) {
    const f = data.zip.file(ch.path);
    if (f) html = await cleanEpubHtml(await f.async('string'), ch.path, data);
  }
  data.cache[idx] = html;
  return html;
}
