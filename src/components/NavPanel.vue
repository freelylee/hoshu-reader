<template>
  <dynamic-panel
    :position="position"
    :menu="menu"
    @close="$emit('close')"
    @resize-start="$emit('resize-start', $event)"
    @select-menu="$emit('select-menu', $event)"
  >
    <div class="h-full flex-v overflow-hidden">
      <!-- tab 行 -->
      <div class="h-9 flex-none flex-c gap-0.5 px-2 border-b border-line">
        <button
          v-for="t in tabs"
          :key="t.key"
          class="flex-1 h-7 flex-cc gap-1 rounded-custom-xs text-xs tad-200"
          :class="tab === t.key ? 'bg-g-200 text-theme font-bold' : 'text-g-550 hover:bg-hover'"
          :title="t.title + '（' + counts[t.key] + '）'"
          @click="$emit('update:tab', t.key)"
        >
          <i :class="t.icon"></i>
          <span v-if="counts[t.key]" class="text-[10px]">{{ counts[t.key] }}</span>
        </button>
      </div>

      <div class="flex-1 scroll-y p-1.5">
        <!-- 章节 -->
        <template v-if="tab === 'toc'">
          <div v-if="!book.toc.length" class="text-xs text-g-400 p-3 text-center">
            本书没有可识别的目录
          </div>
          <template v-for="c in book.toc" :key="c.id">
            <div
              v-if="!isHidden(c)"
              class="nav-row"
              :class="c.id === (book.curTocRow || book.curTocId) ? 'bg-g-200 text-g-900 font-bold' : 'text-g-700'"
              :style="{ paddingLeft: 6 + (c.level - 1) * 12 + 'px' }"
              :title="c.label"
              @click="$emit('goto', c)"
            >
              <i
                v-if="c.hasChildren"
                class="flex-none text-g-500 hover:text-g-900 cursor-pointer"
                :class="collapsed.has(c.id) ? 'ri-arrow-right-s-line' : 'ri-arrow-down-s-line'"
                @click.stop="toggleNode(c.id)"
              ></i>
              <span v-else class="w-3 flex-none"></span>
              <i class="ri-file-text-line opacity-60 flex-none"></i>
              <span class="truncate">{{ c.label }}</span>
            </div>
          </template>
        </template>

        <!-- 缩略图 -->
        <template v-else-if="tab === 'thumb'">
          <div v-if="!thumbs.length" class="text-xs text-g-400 p-3 text-center">
            {{ book.kind === 'pdf' ? '正在生成缩略图…' : '仅 PDF 提供页面缩略图' }}
          </div>
          <div v-else class="grid grid-cols-2 gap-2">
            <div
              v-for="t in thumbs"
              :key="t.page"
              class="thumb-item rounded-custom-xs overflow-hidden border c-p bg-white"
              :class="t.page === curPage ? 'border-theme ring-1 ring-theme' : 'border-line'"
              @click="$emit('goto', { kind: 'page', page: t.page })"
            >
              <img :src="t.dataUrl" class="w-full block" />
              <div class="text-[10px] text-center py-0.5 bg-box-1 text-g-600">{{ t.page }}</div>
            </div>
          </div>
        </template>

        <!-- 批注 -->
        <template v-else-if="tab === 'annot'">
          <div v-if="!book.annotations.length" class="text-xs text-g-400 p-3 text-center">
            选中正文即可高亮或写笔记
          </div>
          <div
            v-for="a in book.annotations"
            :key="a.id"
            class="group p-2 mb-1 rounded-custom-xs hover:bg-hover c-p"
            title="点击定位到正文中的位置"
            @click="$emit('jump-annot', a)"
          >
            <div class="flex-c gap-1.5">
              <span class="w-2.5 h-2.5 rounded-sm flex-none" :class="hlClass(a.color)"></span>
              <span class="flex-1 text-xs text-g-800 line-clamp-2">{{ a.text }}</span>
              <div class="flex-c gap-0.5 opacity-0 group-hover:opacity-100 flex-none">
                <button
                  class="i-btn size-5 text-g-500"
                  title="编辑笔记"
                  @click.stop="$emit('edit-annot', a)"
                >
                  <i class="ri-edit-2-line text-xs"></i>
                </button>
                <button
                  class="i-btn size-5 text-danger"
                  title="删除"
                  @click.stop="$emit('del-annot', a)"
                >
                  <i class="ri-delete-bin-line text-xs"></i>
                </button>
              </div>
            </div>
            <div v-if="a.note" class="text-[11px] text-g-600 mt-1 pl-4 border-l-2 border-line-1">
              {{ a.note }}
            </div>
            <div class="t-mute mt-1 pl-4">
              <i class="ri-map-pin-line mr-0.5"></i>{{ a.locationLabel }} · {{ fmtDate(a.at) }}
            </div>
          </div>
        </template>

        <!-- 书签 -->
        <template v-else-if="tab === 'mark'">
          <div v-if="!book.marks.length" class="text-xs text-g-400 p-3 text-center">还没有书签</div>
          <div
            v-for="m in book.marks"
            :key="m.id"
            class="nav-row group text-g-700"
            @click="$emit('goto', m)"
          >
            <i class="ri-bookmark-fill text-warning flex-none"></i>
            <span class="flex-1 truncate">{{ m.label }}</span>
            <span class="t-mute flex-none">{{ m.locationLabel }}</span>
          </div>
        </template>

        <!-- 生词 -->
        <template v-else>
          <div v-if="!book.vocabs.length" class="text-xs text-g-400 p-3 text-center">
            选中生词点「生词」即可加入，之后可用于复习
          </div>
          <div v-for="v in book.vocabs" :key="v.id" class="nav-row group text-g-700">
            <i class="ri-translate-2 text-warning flex-none"></i>
            <span class="flex-1 truncate font-bold">{{ v.word }}</span>
            <span class="t-mute flex-none truncate max-w-[90px]">{{ v.note || '—' }}</span>
          </div>
        </template>
      </div>
    </div>
  </dynamic-panel>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Annotation, Book, TocItem } from '../types/reader';
import { fmtDate } from '../utils/helpers';
import DynamicPanel from './DynamicPanel.vue';

const props = withDefaults(
  defineProps<{
    book: Book;
    tab?: string;
    thumbs?: Array<{ page: number; dataUrl: string }>;
    curPage?: number;
    width?: number;
    position?: string;
    menu?: any;
  }>(),
  {
    tab: 'toc',
    thumbs: () => [],
    curPage: 1,
    position: 'left'
  }
);

defineEmits<{
  (e: 'update:tab', tab: string): void;
  (e: 'goto', target: any): void;
  (e: 'jump-annot', annot: Annotation): void;
  (e: 'del-annot', annot: Annotation): void;
  (e: 'edit-annot', annot: Annotation): void;
  (e: 'resize-start', ev: MouseEvent): void;
  (e: 'select-menu', id: string): void;
  (e: 'close'): void;
}>();

const tabs = [
  { key: 'toc', icon: 'ri-list-unordered', title: '章节' },
  { key: 'thumb', icon: 'ri-gallery-line', title: '缩略图' },
  { key: 'annot', icon: 'ri-quill-pen-line', title: '批注' },
  { key: 'mark', icon: 'ri-bookmark-line', title: '书签' },
  { key: 'vocab', icon: 'ri-translate-2', title: '生词' }
];

const counts = computed<Record<string, number>>(() => ({
  toc: props.book.toc ? props.book.toc.length : 0,
  thumb: props.thumbs.length,
  annot: props.book.annotations ? props.book.annotations.length : 0,
  mark: props.book.marks ? props.book.marks.length : 0,
  vocab: props.book.vocabs ? props.book.vocabs.length : 0
}));

const hlClass = (c: string) => 'hl hl-' + c;

const collapsed = ref<Set<string>>(new Set());

const tocById = computed<Record<string, TocItem>>(() => {
  const m: Record<string, TocItem> = {};
  (props.book && props.book.toc ? props.book.toc : []).forEach((r) => {
    m[r.id] = r;
  });
  return m;
});

function isHidden(r: TocItem): boolean {
  let p = r.pid;
  const m = tocById.value;
  while (p) {
    if (collapsed.value.has(p)) return true;
    p = (m[p] && m[p].pid) || '';
  }
  return false;
}

function toggleNode(id: string) {
  const s = collapsed.value;
  if (s.has(id)) s.delete(id);
  else s.add(id);
}
</script>
