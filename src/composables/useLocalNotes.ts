import { ref } from 'vue';
import type { Book } from '../types/reader';
import { fmtDate } from '../utils/helpers';
import JSZip from 'jszip';

export function useLocalNotes() {
  const dirHandle = ref<FileSystemDirectoryHandle | null>(null);
  const dirName = ref<string>('');
  const lastSyncTime = ref<number>(0);
  const isSyncing = ref<boolean>(false);

  /**
   * 将书籍批注、划词、生词、AI 讨论格式化为标准的 Markdown 文档
   */
  function buildBookMarkdown(book: Book, aiSummary?: string): string {
    const cleanTitle = (book.title || '无标题').trim();
    const cleanAuthor = (book.author || '未知作者').trim();
    const progressPercent = Math.round((book.progress || 0) * 100);
    const dateStr = fmtDate(book.lastReadAt || Date.now());

    let md = `---
title: "${cleanTitle.replace(/"/g, '\\"')}"
author: "${cleanAuthor.replace(/"/g, '\\"')}"
format: ${book.ext.toUpperCase()}
date_updated: ${dateStr}
progress: "${progressPercent}%"
tags: [ReadingNotes, eBook, ${book.ext}]
---

# 《${cleanTitle}》阅读笔记

- **作者**：${cleanAuthor}
- **格式**：${book.ext.toUpperCase()} · ${book.locationLabel || progressPercent + '%'}
- **最近阅读**：${dateStr}
- **批注数量**：${book.annotations?.length || 0} 条
- **生词收藏**：${book.vocabs?.length || 0} 个

---

## 📌 核心目录提纲
`;

    if (book.toc && book.toc.length > 0) {
      const topToc = book.toc.slice(0, 40);
      topToc.forEach((t) => {
        const indent = '  '.repeat(Math.max(0, (t.level || 1) - 1));
        const pageLabel = t.page ? ` (P.${t.page})` : '';
        md += `${indent}- ${t.label}${pageLabel}\n`;
      });
      if (book.toc.length > 40) {
        md += `- *(余下 ${book.toc.length - 40} 个目录项已折叠)*\n`;
      }
    } else {
      md += `*暂无目录信息*\n`;
    }

    md += `\n---\n\n## ✍️ 划词高亮与思考批注\n\n`;

    if (book.annotations && book.annotations.length > 0) {
      // 按照位置或添加时间排序
      const sortedAnn = [...book.annotations].sort((a, b) => (a.page || 0) - (b.page || 0) || a.at - b.at);
      sortedAnn.forEach((ann, idx) => {
        const loc = ann.locationLabel || (ann.page ? `第 ${ann.page} 页` : '');
        const time = fmtDate(ann.at);
        const colorName = ann.color || 'yellow';
        md += `### ${idx + 1}. ${loc || '摘录'} (${time})\n\n`;
        md += `> ${ann.text.replace(/\n/g, '\n> ')}\n\n`;
        if (ann.note && ann.note.trim()) {
          md += `💭 **我的思考/笔记**：\n${ann.note}\n\n`;
        }
      });
    } else {
      md += `*暂无高亮与批注，阅读时选中文本即可划词或添加思考*\n\n`;
    }

    md += `---\n\n## 🔤 生词与术语积累\n\n`;
    if (book.vocabs && book.vocabs.length > 0) {
      md += `| 生词/术语 | 释义/笔记 | 位置 | 记录时间 |\n`;
      md += `| :--- | :--- | :--- | :--- |\n`;
      book.vocabs.forEach((v) => {
        md += `| **${v.word}** | ${v.note || '—'} | ${v.locationLabel || '—'} | ${fmtDate(v.at)} |\n`;
      });
      md += `\n`;
    } else {
      md += `*暂无生词记录*\n\n`;
    }

    if (aiSummary || (book as any).aiSummary) {
      md += `---\n\n## 🤖 AI 精读提炼与学术总结\n\n`;
      md += `${aiSummary || (book as any).aiSummary}\n\n`;
    }

    return md;
  }

  /**
   * 绑定本地文件夹（File System Access API）
   */
  async function bindNotesDirectory(): Promise<boolean> {
    if (!('showDirectoryPicker' in window)) {
      throw new Error('当前浏览器环境不支持文件夹直接绑定，但支持一键导出 .md 文件。');
    }
    try {
      const handle = await (window as any).showDirectoryPicker({
        mode: 'readwrite'
      });
      dirHandle.value = handle;
      dirName.value = handle.name || '本地笔记文件夹';
      return true;
    } catch (err: any) {
      if (err && err.name === 'AbortError') return false;
      throw err;
    }
  }

  /**
   * 同步/写入单本书的 Markdown 笔记到本地已绑定的文件夹
   */
  async function syncBookNotes(book: Book, aiSummary?: string): Promise<{ success: boolean; path?: string }> {
    const mdContent = buildBookMarkdown(book, aiSummary);
    const safeTitle = (book.title || 'Untitled')
      .replace(/[\\/:*?"<>|]/g, '_')
      .trim()
      .slice(0, 60);
    const filename = `${safeTitle}.notes.md`;

    if (!dirHandle.value) {
      // 未绑定本地目录，返回 false，可触发下载
      return { success: false };
    }

    try {
      isSyncing.value = true;
      const fileHandle = await dirHandle.value.getFileHandle(filename, { create: true });
      const writable = await (fileHandle as any).createWritable();
      await writable.write(mdContent);
      await writable.close();
      lastSyncTime.value = Date.now();
      return { success: true, path: filename };
    } catch (err) {
      console.warn('写入本地 Markdown 失败:', err);
      return { success: false };
    } finally {
      isSyncing.value = false;
    }
  }

  /**
   * 直接下载单本书的 Markdown 笔记文件
   */
  function exportBookNotes(book: Book, aiSummary?: string) {
    const md = buildBookMarkdown(book, aiSummary);
    const safeTitle = (book.title || 'Untitled')
      .replace(/[\\/:*?"<>|]/g, '_')
      .trim()
      .slice(0, 60);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeTitle}.notes.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * 打包下载所有书籍的 Markdown 笔记为 ZIP
   */
  async function exportAllNotesZip(books: Book[]): Promise<void> {
    if (!books.length) return;
    const zip = new JSZip();
    const folder = zip.folder('ReadingNotes');

    books.forEach((b) => {
      const md = buildBookMarkdown(b);
      const safeTitle = (b.title || 'Untitled')
        .replace(/[\\/:*?"<>|]/g, '_')
        .trim()
        .slice(0, 60);
      folder?.file(`${safeTitle}.notes.md`, md);
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ReadingNotes_${fmtDate(Date.now()).replace(/[: ]/g, '-')}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return {
    dirHandle,
    dirName,
    lastSyncTime,
    isSyncing,
    bindNotesDirectory,
    syncBookNotes,
    exportBookNotes,
    exportAllNotesZip,
    buildBookMarkdown
  };
}
