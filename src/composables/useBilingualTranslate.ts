import { ref } from 'vue';
import type { Book, BilingualParagraph } from '../types/reader';
import { uid, fmtDate } from '../utils/helpers';
import { renderMarkdownWithKatex } from '../utils/pdfTextExtractor';

export function useBilingualTranslate() {
  const isTranslating = ref<boolean>(false);
  const translateProgress = ref<{ cur: number; total: number }>({ cur: 0, total: 0 });

  /**
   * 将 Markdown 或正文拆解为段落单元
   */
  function splitIntoParagraphs(text: string): BilingualParagraph[] {
    if (!text) return [];
    // 按连续空行拆分段落
    const rawBlocks = text.split(/\n\s*\n/);
    const result: BilingualParagraph[] = [];

    for (const block of rawBlocks) {
      const trimmed = block.trim();
      if (!trimmed) continue;
      // 忽略单独的 HTML 注释或分隔符
      if (trimmed.startsWith('<!--') && trimmed.endsWith('-->')) continue;
      if (trimmed === '---') continue;

      result.push({
        id: uid(),
        original: trimmed,
        translation: '',
        status: 'idle'
      });
    }

    return result;
  }

  /**
   * 纯前端智能翻译单一文本块
   * 优先尝试用户配置的 Gemini API，备用使用免费客户端接口
   */
  async function translateText(text: string, apiKey?: string): Promise<string> {
    const trimmed = text.trim();
    if (!trimmed) return '';

    // 如果本身就是纯中文（中文字符占比 > 60%），直接返回或提示
    const chineseChars = (trimmed.match(/[\u4e00-\u9fa5]/g) || []).length;
    if (chineseChars > trimmed.length * 0.6) {
      return trimmed;
    }

    // 1. 若配置了 Gemini Key，调用 Gemini 翻译学术论文
    if (apiKey) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `你是一位严谨的学术论文与专业书籍翻译专家。请将以下文本精准、流畅地翻译为中文。保持 LaTeX 公式（如 $...$ 或 $$...$$）、专业术语及代码原样不变，仅返回翻译后的中文正文，不要有任何开场白或解释：\n\n${trimmed}`
                  }
                ]
              }
            ]
          })
        });

        if (res.ok) {
          const data = await res.json();
          const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidate) return candidate.trim();
        }
      } catch (err) {
        console.warn('Gemini 翻译失败，降级至备用接口:', err);
      }
    }

    // 2. 免费客户端跨域即时翻译接口
    try {
      const encoded = encodeURIComponent(trimmed.slice(0, 1500));
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encoded}&langpair=en|zh-CN`);
      if (res.ok) {
        const json = await res.json();
        if (json.responseData?.translatedText) {
          return json.responseData.translatedText;
        }
      }
    } catch {
      // ignore
    }

    return `[未能自动翻译] ${trimmed}`;
  }

  /**
   * 批量翻译书籍的段落列表
   */
  async function translateBookParas(
    book: Book,
    apiKey?: string,
    onProgress?: (cur: number, total: number) => void
  ) {
    if (!book.bilingualParas || !book.bilingualParas.length) return;

    isTranslating.value = true;
    const paras = book.bilingualParas;
    const total = paras.length;
    translateProgress.value = { cur: 0, total };

    // 并发 3 个批次进行翻译以提高速度
    const BATCH_SIZE = 3;
    for (let i = 0; i < total; i += BATCH_SIZE) {
      const chunk = paras.slice(i, i + BATCH_SIZE);
      await Promise.all(
        chunk.map(async (p) => {
          if (p.translation) return; // 已翻译过则跳过
          p.status = 'translating';
          try {
            p.translation = await translateText(p.original, apiKey);
            p.status = 'done';
          } catch (e) {
            p.status = 'error';
            p.translation = '翻译失败，请点击重试';
          }
        })
      );
      translateProgress.value.cur = Math.min(i + BATCH_SIZE, total);
      if (onProgress) onProgress(translateProgress.value.cur, total);
    }

    isTranslating.value = false;
  }

  /**
   * 导出双语对照 Markdown 文档
   */
  function exportBilingualMarkdown(book: Book) {
    if (!book.bilingualParas?.length) return;
    const cleanTitle = book.title || 'Untitled';

    let md = `---
title: "${cleanTitle} (双语对照版)"
date: "${fmtDate(Date.now())}"
format: BILINGUAL
---

# ${cleanTitle}（中英双语对照）

`;

    book.bilingualParas.forEach((p, idx) => {
      md += `### § ${idx + 1}\n\n`;
      md += `**原文**：\n${p.original}\n\n`;
      if (p.translation) {
        md += `**译文**：\n${p.translation}\n\n`;
      }
      md += `---\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cleanTitle}_bilingual.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * 导出/打印双语学术对照 PDF（类似 zotero-pdf2zh 效果）
   * 在纯前端利用浏览器高保真打印引擎输出矢量学术 PDF
   */
  function exportBilingualPdf(book: Book) {
    if (!book.bilingualParas?.length) return;
    const cleanTitle = book.title || 'Untitled';

    const printWin = window.open('', '_blank');
    if (!printWin) {
      alert('请允许弹出窗口以生成双语 PDF');
      return;
    }

    let parasHtml = '';
    book.bilingualParas.forEach((p, idx) => {
      const origHtml = renderMarkdownWithKatex(p.original);
      const transHtml = p.translation ? renderMarkdownWithKatex(p.translation) : '<p class="text-gray-400 italic">未翻译</p>';

      parasHtml += `
        <div class="para-card" id="p-${idx}">
          <div class="para-index">${idx + 1}</div>
          <div class="para-grid">
            <div class="col col-orig">
              <div class="col-tag">ORIGINAL</div>
              <div class="content">${origHtml}</div>
            </div>
            <div class="col col-trans">
              <div class="col-tag">中文对照</div>
              <div class="content">${transHtml}</div>
            </div>
          </div>
        </div>
      `;
    });

    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${cleanTitle} - 双语对照</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
  <style>
    @page {
      size: A4;
      margin: 15mm 12mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
      line-height: 1.65;
      color: #1a1a1a;
      background: #fff;
      padding: 0;
      margin: 0;
    }
    .header {
      border-bottom: 2px solid #2563eb;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .header h1 {
      font-size: 22px;
      margin: 0 0 6px 0;
      color: #0f172a;
    }
    .header .meta {
      font-size: 12px;
      color: #64748b;
    }
    .para-card {
      margin-bottom: 16px;
      page-break-inside: avoid;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      background: #fafafa;
      position: relative;
    }
    .para-index {
      position: absolute;
      top: 6px;
      left: 6px;
      font-size: 10px;
      color: #94a3b8;
      font-weight: bold;
    }
    .para-grid {
      display: flex;
      gap: 12px;
      padding: 12px 14px;
    }
    .col {
      flex: 1;
      min-width: 0;
    }
    .col-orig {
      border-right: 1px dashed #cbd5e1;
      padding-right: 12px;
    }
    .col-trans {
      background: #f8fafc;
      padding: 4px 8px;
      border-radius: 4px;
    }
    .col-tag {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: #3b82f6;
      margin-bottom: 4px;
      text-transform: uppercase;
    }
    .content p {
      margin: 0 0 8px 0;
      font-size: 13px;
    }
    .content p:last-child {
      margin-bottom: 0;
    }
    .katex-block {
      text-align: center;
      margin: 8px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${cleanTitle}</h1>
    <div class="meta">双语对照排版生成 · 生成日期：${fmtDate(Date.now())} · 共 ${book.bilingualParas.length} 个段落</div>
  </div>
  ${parasHtml}
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>`;

    printWin.document.open();
    printWin.document.write(fullHtml);
    printWin.document.close();
  }

  return {
    isTranslating,
    translateProgress,
    splitIntoParagraphs,
    translateText,
    translateBookParas,
    exportBilingualMarkdown,
    exportBilingualPdf
  };
}
