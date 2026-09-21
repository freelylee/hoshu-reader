import { ref } from 'vue';
import type { AiMemory, AiMessage, Book } from '../types/reader';
import { uid } from '../utils/helpers';
import { AI_ACTIONS, AI_MODELS } from '../utils/constants';

export function useAiChat() {
  const aiMessages = ref<AiMessage[]>([]);
  const aiBusy = ref(false);
  const aiModel = ref('balanced');
  const memories = ref<AiMemory[]>([]);

  function pushMemory(from: string, text: string, bookTitle: string) {
    memories.value.unshift({ id: uid(), from, text, bookTitle, at: Date.now() });
    if (memories.value.length > 40) memories.value = memories.value.slice(0, 40);
  }

  function aiAnswer(question: string, action: string, curBook: Book | null, chapterTitle: string, progressText: string, selText: string) {
    const head = `（${curBook ? `《${curBook.title}》` : '未打开书'}${chapterTitle ? ` · ${chapterTitle}` : ''} · ${progressText}）\n\n`;
    const q = String(question || '').trim();

    if (action === 'summary') {
      return {
        text: head + '本章要点：\n\n1. ' + (chapterTitle || '当前章节') + '围绕的核心主张是——作者先把问题摆到台面上，再给出限定条件。\n2. 论据有三层：经验观察、对照案例、以及一处反例。\n3. 结尾把结论收回到「边界条件」上，为下一章留了口子。\n\n如果要记住一句，我会留这句：作者真正关心的不是结论本身，而是结论成立的边界。',
        sources: [chapterTitle || '当前章节', curBook ? curBook.title : '']
      };
    }
    if (action === 'glossary') {
      return {
        text: head + '这一章值得单独拎出来的概念：\n\n· 核心概念 A —— 出现在开头，后面反复被引用，是本章的骨架。\n· 核心概念 B —— 用来限定 A 的适用范围，容易被略读。\n· 反例 C —— 作者用它说明 A 的失效条件。\n\n建议：把 B 和 C 一起记，单独记 A 很容易记成一句口号。',
        sources: [chapterTitle || '当前章节']
      };
    }
    if (action === 'notes') {
      return {
        text: head + '读书笔记草稿：\n\n【一句话概括】' + (chapterTitle || '本章') + '在讨论一个关于边界的问题。\n【作者怎么论证的】先立论，再给条件，最后用反例收口。\n【我同意的部分】反例选得克制，没有为了说服力夸张。\n【我想追问的】如果把这个结论换到另一个场景，条件还成立吗？\n【可以带走的】记结论不如记条件。',
        sources: [curBook ? curBook.title : '', '你的 ' + (curBook ? curBook.annotations.length : 0) + ' 条批注']
      };
    }
    if (action === 'vocab') {
      const words = curBook && curBook.vocabs.length
        ? curBook.vocabs.map((v) => v.word + '：' + (v.note || '待补充')).join('\n')
        : '（这一本还没有收录生词）';
      return { text: head + '生词卡：\n\n' + words + '\n\n复习建议：先看原文句子，再看释义，最后自己造一句。', sources: ['生词本'] };
    }
    if (action === 'further') {
      return {
        text: head + '顺着这一章往下读，有三条路：\n\n· 同一作者的前作——看他是怎么一步步走到这个论点的。\n· 本书引用过但没展开的那本——作者默认你读过，值得一补。\n· 与你书架上另一本书的交叉处——两本书在同一个概念上给出了不同边界，对照读收益最大。\n\n要我按其中一条展开吗？',
        sources: ['书架', curBook ? curBook.title : '']
      };
    }
    if (action === 'explain' || selText) {
      const ref = selText ? '你选中的这段：\n「' + selText.slice(0, 120) + '」\n\n' : '';
      return {
        text: head + ref + '放到这一章里看，这段话的作用不是给出结论，而是先把前提钉住——作者后面所有的推论都建立在这个限定上。\n\n拆开看有两层：前半句陈述事实，后半句划边界。很多人只读前半句，就会把后面的结论用得太宽。\n\n如果你想要更细的解释，可以告诉我你卡在哪一个词上。',
        sources: [chapterTitle || '当前章节']
      };
    }
    return {
      text: head + '关于「' + q.slice(0, 40) + '」：\n\n就你正在读的这一本来看，直接相关的线索有两条——一条来自本章的论证结构，一条来自你之前划过的内容。\n\n我的理解是：这里作者并不是在下判断，而是在说明判断成立需要什么条件。差别很重要，前者是结论，后者是方法。\n\n如果你想要更具体的答案，把选中的段落发给我，或者告诉我你关心的角度（论证 / 概念 / 应用）。',
      sources: [curBook ? curBook.title : '', chapterTitle || '当前位置']
    };
  }

  function askAi(
    question: string,
    curBook: Book | null,
    chapterTitle: string,
    progressText: string,
    selText: string
  ) {
    const q = String(question || '').trim();
    if (!q) return;
    aiMessages.value.push({ role: 'user', text: q });
    aiBusy.value = true;
    setTimeout(() => {
      const r = aiAnswer(q, '', curBook, chapterTitle, progressText, selText);
      aiMessages.value.push({ role: 'ai', text: r.text, sources: r.sources, action: '就这段回答' });
      aiBusy.value = false;
      pushMemory('提问', q.slice(0, 34), curBook ? curBook.title : '');
    }, 900);
  }

  function runAiAction(
    key: string,
    curBook: Book | null,
    chapterTitle: string,
    progressText: string,
    selText: string
  ) {
    if (!curBook) return;
    const label = (AI_ACTIONS.find((a) => a.key === key) || {}).label || '处理';
    aiMessages.value.push({ role: 'user', text: label });
    aiBusy.value = true;
    setTimeout(() => {
      const r = aiAnswer(label, key, curBook, chapterTitle, progressText, selText);
      aiMessages.value.push({ role: 'ai', text: r.text, sources: r.sources, action: label });
      aiBusy.value = false;
      pushMemory('动作', label, curBook.title);
    }, 1100);
  }

  function clearAi() {
    aiMessages.value = [];
  }

  function dropAiMsg(i: number) {
    aiMessages.value = aiMessages.value.filter((_, k) => k !== i);
  }

  return {
    aiMessages,
    aiBusy,
    aiModel,
    memories,
    aiActions: AI_ACTIONS,
    aiModels: AI_MODELS,
    pushMemory,
    askAi,
    runAiAction,
    clearAi,
    dropAiMsg
  };
}
