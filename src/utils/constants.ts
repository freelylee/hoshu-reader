import type { AiAction, AiModel, FontOption, HlColor, PageTheme } from '../types/reader';

export const EXT_KIND: Record<string, 'pdf' | 'epub' | 'text' | 'other'> = {
  pdf: 'pdf',
  epub: 'epub',
  txt: 'text',
  md: 'text',
  markdown: 'text',
  mobi: 'other',
  azw3: 'other',
  fb2: 'other',
  cbz: 'other',
  cbr: 'other',
  html: 'text',
  htm: 'text'
};

export const ACCEPT = '.pdf,.epub,.txt,.md,.markdown,.mobi,.azw3,.fb2,.cbz,.cbr,.html,.htm';
export const BOOK_EXTS = Object.keys(EXT_KIND);

export const HL_COLORS: HlColor[] = [
  { key: 'yellow', label: '黄', css: 'rgba(240,200,90,.55)' },
  { key: 'green', label: '绿', css: 'rgba(120,190,130,.5)' },
  { key: 'blue', label: '蓝', css: 'rgba(120,175,225,.5)' },
  { key: 'pink', label: '粉', css: 'rgba(230,140,160,.5)' }
];

export const PAGE_THEMES: PageTheme[] = [
  { key: 'paper', label: '纸白', bg: '#ffffff', fg: '#1f1e1c' },
  { key: 'cream', label: '米黄', bg: '#f4ecd8', fg: '#43382b' },
  { key: 'green', label: '墨绿', bg: '#e9f0e6', fg: '#2c3a2e' },
  { key: 'night', label: '夜间', bg: '#1b1a18', fg: '#d6d3cb' }
];

export const FONT_OPTIONS: FontOption[] = [
  { key: 'serif', label: '衬线', css: 'var(--font-serif)' },
  { key: 'sans', label: '黑体', css: 'var(--font-body)' },
  { key: 'mono', label: '等宽', css: 'var(--font-mono)' }
];

export const AI_MODELS: AiModel[] = [
  { value: 'fast', label: '快速模型', desc: '适合解释词义、短问答' },
  { value: 'balanced', label: '均衡模型', desc: '默认，适合总结与讨论' },
  { value: 'deep', label: '深度模型', desc: '适合跨书检索与长文整理' }
];

export const PAGED_GAP = 64;
export const CHAPTER_SLIDE_MS = 300;

export const AI_ACTIONS: AiAction[] = [
  { key: 'explain', label: '解释这段', icon: 'ri-question-answer-line' },
  { key: 'summary', label: '总结本章', icon: 'ri-file-list-3-line' },
  { key: 'glossary', label: '梳理概念', icon: 'ri-bookmark-3-line' },
  { key: 'notes', label: '生成读书笔记', icon: 'ri-quill-pen-line' },
  { key: 'vocab', label: '整理生词卡', icon: 'ri-translate-2' },
  { key: 'further', label: '延展阅读', icon: 'ri-compass-3-line' }
];
