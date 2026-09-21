export type BookKind = 'pdf' | 'epub' | 'text' | 'other';

export interface TocItem {
  id: string;
  label: string;
  level: number;
  kind?: string;
  page?: number;
  dest?: any;
  index?: number;
  chapterIndex?: number;
  fragment?: string;
  pid?: string;
  hasChildren?: boolean;
}

export interface Annotation {
  id: string;
  color: string;
  text: string;
  note: string;
  at: number;
  locationLabel: string;
  kind: string;
  page?: number;
  index?: number;
  occ?: number;
}

export interface Mark {
  id: string;
  label: string;
  locationLabel: string;
  page?: number;
  index?: number;
  kind: string;
}

export interface Vocab {
  id: string;
  word: string;
  note: string;
  at: number;
  locationLabel: string;
}

export interface BilingualParagraph {
  id: string;
  original: string;
  translation: string;
  status: 'idle' | 'translating' | 'done' | 'error';
}

export interface Book {
  id: string;
  title: string;
  author: string;
  ext: string;
  kind: BookKind;
  size: number;
  file?: File;
  blob?: Blob;
  fileHandle?: any;
  fileData?: ArrayBuffer;
  localPath?: string;
  url?: string | null;
  cover?: string | null;
  toc: TocItem[];
  curTocId?: string;
  curTocRow?: string;
  annotations: Annotation[];
  marks: Mark[];
  vocabs: Vocab[];
  progress: number;
  locationLabel: string;
  addedAt: number;
  lastReadAt: number;
  pageCount?: number;
  chapterCount?: number;
  readPage?: number;
  readIndex?: number;
  rawText?: string;
  chapters?: TocItem[];
  // 论文与PDF文本化“阅读模式”
  textModeActive?: boolean;
  textMarkdown?: string;
  mineruStatus?: 'idle' | 'parsing' | 'done' | 'error';
  mineruError?: string;
  // 双语对照
  bilingualActive?: boolean;
  bilingualParas?: BilingualParagraph[];
  isTranslating?: boolean;
}

export interface TabItem {
  id: string;
  title: string;
  icon: string;
  fixed: boolean;
  book?: Book;
}

export interface AiMessage {
  role: 'user' | 'ai';
  text: string;
  sources?: string[];
  action?: string;
}

export interface AiMemory {
  id: string;
  from: string;
  text: string;
  bookTitle: string;
  at: number;
}

export interface AiAction {
  key: string;
  label: string;
  icon: string;
}

export interface AiModel {
  value: string;
  label: string;
  desc: string;
}

export interface PageTheme {
  key: string;
  label: string;
  bg: string;
  fg: string;
}

export interface FontOption {
  key: string;
  label: string;
  css: string;
}

export interface HlColor {
  key: string;
  label: string;
  css: string;
}

export interface ToastItem {
  id: string;
  text: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface ContextMenuItem {
  label: string;
  icon?: string;
  act?: () => void;
  danger?: boolean;
}

export interface ModalConfig {
  visible: boolean;
  title: string;
  desc?: string;
  input?: { label?: string; placeholder?: string; rows?: number } | null;
  options?: Array<{ label: string; value: any; icon?: string }> | null;
  kv?: Array<{ k: string; v: string }> | null;
  value?: any;
  confirmText?: string;
  cancelText?: string;
  onOk?: ((val: any) => void) | null;
}
