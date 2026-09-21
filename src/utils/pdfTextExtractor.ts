import { marked } from 'marked';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * 将带有 LaTeX 数学公式的 Markdown 文本渲染为干净的 HTML
 * 支持 $inline$ 与 $$block$$ 公式
 */
export function renderMarkdownWithKatex(mdText: string): string {
  if (!mdText) return '';

  // 1. 保护并渲染行间数学公式 $$...$$
  let processed = mdText.replace(/\$\$([\s\S]+?)\$\$/g, (_match, equation) => {
    try {
      return `<div class="katex-block my-3 overflow-x-auto text-center">${katex.renderToString(equation.trim(), {
        displayMode: true,
        throwOnError: false
      })}</div>`;
    } catch {
      return `<pre class="katex-error">$$${equation}$$</pre>`;
    }
  });

  // 2. 保护并渲染行内数学公式 $...$ (排除货币符号等误伤)
  processed = processed.replace(/(^|[^\\])\$([^\$\n]+?)\$/g, (_match, prefix, equation) => {
    try {
      const rendered = katex.renderToString(equation.trim(), {
        displayMode: false,
        throwOnError: false
      });
      return `${prefix}<span class="katex-inline">${rendered}</span>`;
    } catch {
      return `${prefix}$${equation}$`;
    }
  });

  // 3. 使用 marked 渲染主体排版
  try {
    return marked.parse(processed, { async: false, breaks: true }) as string;
  } catch (err) {
    console.error('Markdown 渲染失败:', err);
    return processed.replace(/\n/g, '<br/>');
  }
}

interface TextSpan {
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fontSize: number;
  fontName: string;
}

/**
 * 纯前端：从 PDF.js 文档中提取结构化文本并重排为流畅 Markdown（Zotero 阅读模式）
 */
export async function extractPdfToMarkdown(
  pdfDoc: any,
  onProgress?: (cur: number, total: number) => void
): Promise<string> {
  const numPages = pdfDoc.numPages;
  const pageMarkdowns: string[] = [];

  for (let p = 1; p <= numPages; p++) {
    if (onProgress) onProgress(p, numPages);

    try {
      const page = await pdfDoc.getPage(p);
      const textContent = await page.getTextContent({
        includeMarkedContent: false,
        disableNormalization: false
      });

      const viewport = page.getViewport({ scale: 1.0 });
      const pageHeight = viewport.height;
      const pageWidth = viewport.width;

      const spans: TextSpan[] = [];
      for (const item of textContent.items) {
        if (!('str' in item) || !item.str.trim()) continue;
        const transform = item.transform; // [scaleX, skewY, skewX, scaleY, tx, ty]
        const fontSize = Math.hypot(transform[0], transform[1]);
        const x = transform[4];
        // 将原点从左下角换算为左上角
        const y = pageHeight - transform[5];

        spans.push({
          text: item.str,
          x,
          y,
          w: item.width || fontSize * item.str.length * 0.5,
          h: item.height || fontSize,
          fontSize,
          fontName: item.fontName || ''
        });
      }

      if (!spans.length) continue;

      // 计算正文字号中位数
      const sizes = spans.map((s) => s.fontSize).sort((a, b) => a - b);
      const medianFontSize = sizes[Math.floor(sizes.length / 2)] || 10;

      // 检测双栏排版：判断是否存在明显的左右栏
      const midX = pageWidth / 2;
      const leftSpans = spans.filter((s) => s.x + s.w < midX + 20);
      const rightSpans = spans.filter((s) => s.x > midX - 20);
      const isTwoColumn = leftSpans.length > 15 && rightSpans.length > 15;

      let orderedSpans: TextSpan[] = [];
      if (isTwoColumn) {
        // 双栏：先排左栏，再排右栏，按 Y 轴升序
        leftSpans.sort((a, b) => a.y - b.y || a.x - b.x);
        rightSpans.sort((a, b) => a.y - b.y || a.x - b.x);
        orderedSpans = [...leftSpans, ...rightSpans];
      } else {
        // 单栏：直接按 Y 轴排列
        orderedSpans = spans.sort((a, b) => a.y - b.y || a.x - b.x);
      }

      // 重构成自然段落与标题
      const paragraphs: string[] = [];
      let curPara = '';
      let lastSpan: TextSpan | null = null;

      for (const span of orderedSpans) {
        const text = span.text.trim();
        if (!text) continue;

        const isHeading = span.fontSize > medianFontSize * 1.25;
        const lineGap = lastSpan ? span.y - lastSpan.y : 0;
        const isNewParagraph = isHeading || lineGap > span.h * 1.5 || Math.abs(span.fontSize - (lastSpan?.fontSize || 0)) > 2;

        if (isNewParagraph && curPara) {
          paragraphs.push(curPara.trim());
          curPara = '';
        }

        if (isHeading) {
          const level = span.fontSize > medianFontSize * 1.6 ? '## ' : '### ';
          paragraphs.push(`${level}${text}`);
          curPara = '';
        } else {
          // 处理英文连字符断词 (e.g. "differ- \n ent" => "different")
          if (curPara.endsWith('-')) {
            curPara = curPara.slice(0, -1) + text;
          } else if (curPara && !curPara.endsWith(' ') && !/[\u4e00-\u9fa5]/.test(curPara.slice(-1))) {
            curPara += ' ' + text;
          } else {
            curPara += text;
          }
        }
        lastSpan = span;
      }

      if (curPara.trim()) {
        paragraphs.push(curPara.trim());
      }

      if (paragraphs.length) {
        pageMarkdowns.push(`<!-- Page ${p} -->\n\n` + paragraphs.join('\n\n'));
      }
    } catch (e) {
      console.warn(`解析第 ${p} 页出错:`, e);
    }
  }

  return pageMarkdowns.join('\n\n---\n\n');
}

/**
 * 调用 MinerU 官方开放 API 进行高保真 LaTeX/公式/表格提取
 */
export async function requestMinerUParse(
  file: File,
  apiToken: string,
  onStatus?: (msg: string) => void
): Promise<string> {
  if (!apiToken) {
    throw new Error('未配置 MinerU API Token。请在设置中填入 Token，或使用本地极速文本化模式。');
  }

  if (onStatus) onStatus('正在上传文档至 MinerU 解析服务…');

  const formData = new FormData();
  formData.append('file', file);
  formData.append('model', 'layout');

  // MinerU 开放接口 (https://mineru.net/api/v4/extract/task)
  const uploadRes = await fetch('https://mineru.net/api/v4/extract/task', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`
    },
    body: formData
  });

  if (!uploadRes.ok) {
    const errData = await uploadRes.json().catch(() => ({}));
    throw new Error(errData.msg || errData.message || `上传失败: HTTP ${uploadRes.status}`);
  }

  const uploadJson = await uploadRes.json();
  const taskId = uploadJson.data?.task_id || uploadJson.task_id;
  if (!taskId) throw new Error('未能从 MinerU 响应中获取任务 ID');

  if (onStatus) onStatus('任务已提交，MinerU 正在识别排版与数学公式…');

  // 轮询任务状态
  let attempts = 0;
  while (attempts < 60) {
    await new Promise((r) => setTimeout(r, 3000));
    attempts++;

    const pollRes = await fetch(`https://mineru.net/api/v4/extract/task/${taskId}`, {
      headers: {
        Authorization: `Bearer ${apiToken}`
      }
    });

    if (!pollRes.ok) continue;

    const pollJson = await pollRes.json();
    const status = pollJson.data?.state || pollJson.state;

    if (status === 'done') {
      if (onStatus) onStatus('解析完成，正在下载结构化 Markdown…');
      const mdUrl = pollJson.data?.full_zip_url || pollJson.data?.markdown_url;
      if (mdUrl) {
        const mdFetch = await fetch(mdUrl);
        return await mdFetch.text();
      }
      return pollJson.data?.content || pollJson.content || '# 解析成功\n\n*未返回具体正文*';
    } else if (status === 'failed') {
      throw new Error(pollJson.data?.err_msg || 'MinerU 解析失败');
    } else {
      if (onStatus) onStatus(`MinerU 正在进行排版与公式还原 (第 ${attempts * 3} 秒)…`);
    }
  }

  throw new Error('MinerU 解析超时，请检查网络或稍后重试');
}
