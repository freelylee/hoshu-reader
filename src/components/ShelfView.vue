<template>
  <div class="flex-1 flex-v bg-canvas overflow-hidden">
    <!-- 工具条 h-10 -->
    <div class="flex-none px-3 py-1 flex-cb h-10 select-none border-b border-line">
      <div class="flex-c gap-1.5">
        <div class="flex-c gap-1 px-2 py-1 rounded-custom-xs bg-box border border-line-1">
          <i class="ri-search-line text-xs text-g-400"></i>
          <input v-model="kw" placeholder="搜索书名 / 作者" class="w-36 text-xs !border-none" />
        </div>
        <button
          class="size-7 i-btn text-g-600"
          :title="grid ? '切换为列表' : '切换为网格'"
          @click="$emit('update:grid', !grid)"
        >
          <i :class="grid ? 'ri-list-check-2' : 'ri-grid-line'"></i>
        </button>
        <div class="relative">
          <button class="btn px-2 py-1 text-xs" @click="sortPop = !sortPop">
            <i class="ri-sort-desc"></i>
            {{ (sortItems.find((s) => s.value === sort) || sortItems[0]).label }}
          </button>
          <transition name="pop">
            <div v-if="sortPop" class="pop left-0 top-full mt-1 w-32 p-1">
              <div
                v-for="s in sortItems"
                :key="s.value"
                class="opt-item"
                :class="s.value === sort ? 'text-theme bg-g-150' : 'text-g-700'"
                @click="sortPop = false; $emit('update:sort', s.value)"
              >
                {{ s.label }}
              </div>
            </div>
          </transition>
        </div>
      </div>
      <div class="flex-c gap-1.5">
        <span class="t-mute mr-1">{{ books.length }} 本</span>
        <div class="v-line h-5"></div>
        <!-- 笔记库状态与操作 -->
        <button
          class="btn px-2 py-1 text-xs"
          :class="notesDirName ? 'text-emerald-700 bg-emerald-500/10 border-emerald-500/30' : 'text-g-600'"
          :title="notesDirName ? `已关联目录：${notesDirName}，划词自动双向保存为独立 .md` : '关联本地目录，每本书笔记保存为独立 .md 文件'"
          @click="$emit('open-notes-modal')"
        >
          <i :class="notesDirName ? 'ri-folder-check-line text-emerald-600' : 'ri-markdown-line'"></i>
          {{ notesDirName ? notesDirName : '本地笔记库' }}
        </button>
        <!-- API 配置 (MinerU / Gemini) -->
        <button
          class="btn px-2 py-1 text-xs text-g-600"
          title="配置 MinerU 免费 API Token 与 Gemini Key"
          @click="$emit('open-api-modal')"
        >
          <i class="ri-settings-4-line"></i>API配置
        </button>
        <button class="btn px-2 py-1 text-xs" @click="$emit('pick-files')">
          <i class="ri-file-add-line"></i>导入文件
        </button>
        <button class="btn px-2 py-1 text-xs" @click="$emit('pick-dir')">
          <i class="ri-folder-add-line"></i>导入文件夹
        </button>
      </div>
    </div>

    <!-- 主体 -->
    <div
      class="flex-1 scroll-y p-5"
      :class="dragOver ? 'ring-2 ring-inset ring-[var(--theme-color)]' : ''"
      @dragover.prevent="dragOver = true"
      @dragleave="dragOver = false"
      @drop.prevent="onDrop"
    >
      <!-- 空态 -->
      <div v-if="!books.length" class="flex-cc py-16">
        <div class="max-w-[520px] w-full card p-8 flex-v items-center gap-4 text-center border-dashed">
          <div class="size-16 flex-cc rounded-full bg-g-100 text-g-400">
            <i class="ri-book-open-line text-3xl"></i>
          </div>
          <div class="t-block text-base">书架是空的</div>
          <div class="text-xs text-g-500 leading-relaxed">
            从本地磁盘选择电子书，或把整个书库文件夹拖进来。<br />
            文件只在本页内存中打开，不会上传，也不会写入磁盘。
          </div>
          <div class="flex-c gap-2 pt-1">
            <button
              class="px-3 py-1.5 text-xs rounded-custom-xs bg-theme text-white hover:opacity-90 cursor-pointer"
              @click="$emit('pick-files')"
            >
              <i class="ri-file-add-line mr-1"></i>选择文件
            </button>
            <button class="btn px-3 py-1.5 text-xs" @click="$emit('pick-dir')">
              <i class="ri-folder-add-line mr-1"></i>选择文件夹
            </button>
          </div>
          <div class="t-mute pt-3 border-t border-line w-full">
            支持 EPUB · PDF · TXT · Markdown · MOBI · AZW3 · FB2 · CBZ
          </div>
        </div>
      </div>

      <!-- 有书 -->
      <template v-else>
        <div v-if="!shown.length" class="h-full flex-cc text-xs text-g-400">
          没有匹配「{{ keyword }}」的书
        </div>

        <!-- 网格 -->
        <div
          v-else-if="grid"
          class="grid gap-4"
          style="grid-template-columns: repeat(auto-fill, minmax(136px, 1fr))"
        >
          <div
            v-for="b in shown"
            :key="b.id"
            class="book-card"
            @click="$emit('open', b)"
            @contextmenu.prevent="$emit('ctx', $event, 'book', b)"
          >
            <div class="book-cover">
              <img v-if="b.cover" :src="b.cover" class="w-full h-full object-cover" />
              <div v-else class="cover-fallback w-full h-full flex-cc flex-v gap-1 px-2">
                <span class="text-xl font-black font-headline text-g-700 text-center leading-tight line-clamp-3">
                  {{ b.title }}
                </span>
              </div>
              <span class="absolute left-1 top-1 px-1 rounded bg-black/55 text-[10px] text-white">
                {{ b.ext.toUpperCase() }}
              </span>
              <span
                v-if="b.annotations.length"
                class="absolute right-1 top-1 size-4 flex-cc rounded-full bg-black/55 text-[9px] text-white"
              >
                {{ b.annotations.length }}
              </span>
              <div v-if="b.progress > 0" class="absolute inset-x-0 bottom-0 h-1 bg-black/15">
                <div class="h-full bg-theme" :style="{ width: b.progress * 100 + '%' }"></div>
              </div>
            </div>
            <div class="text-xs font-bold font-headline truncate" :title="b.title">{{ b.title }}</div>
            <div class="t-mute truncate">{{ b.author || '未知作者' }}</div>
          </div>
        </div>

        <!-- 列表 -->
        <div v-else class="flex-v gap-1">
          <div
            v-for="b in shown"
            :key="b.id"
            class="flex-c gap-3 p-2 rounded-custom-sm border border-transparent hover:bg-g-000 c-p"
            @click="$emit('open', b)"
            @contextmenu.prevent="$emit('ctx', $event, 'book', b)"
          >
            <div class="w-10 h-14 flex-none rounded-custom-xs overflow-hidden bg-g-150 flex-cc">
              <img v-if="b.cover" :src="b.cover" class="w-full h-full object-cover" />
              <i v-else class="ri-book-2-line text-g-400 text-lg"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-bold font-headline truncate">{{ b.title }}</div>
              <div class="t-mute truncate">
                {{ b.author || '未知作者' }} · {{ b.ext.toUpperCase() }} · {{ fmtSize(b.size) }}
              </div>
              <div v-if="b.localPath" class="text-[10px] text-g-400 font-mono truncate" :title="'本地路径：' + b.localPath">
                <i class="ri-hard-drive-2-line mr-0.5"></i>{{ b.localPath }}
              </div>
            </div>
            <div class="w-32 flex-none flex-v gap-1">
              <div class="h-1 rounded bg-g-200 overflow-hidden">
                <div class="h-full bg-theme" :style="{ width: b.progress * 100 + '%' }"></div>
              </div>
              <div class="t-mute text-right">
                {{ Math.round(b.progress * 100) }}% · {{ b.locationLabel || '未开始' }}
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Book } from '../types/reader';
import { fmtSize } from '../utils/helpers';

const props = withDefaults(
  defineProps<{
    books: Book[];
    stats?: any;
    sort?: string;
    keyword?: string;
    grid?: boolean;
    isDark?: boolean;
    notesDirName?: string;
  }>(),
  {
    books: () => [],
    sort: 'recent',
    keyword: '',
    grid: true,
    isDark: false,
    notesDirName: ''
  }
);

const emit = defineEmits<{
  (e: 'update:sort', value: string): void;
  (e: 'update:keyword', value: string): void;
  (e: 'update:grid', value: boolean): void;
  (e: 'pick-files'): void;
  (e: 'pick-dir'): void;
  (e: 'drop-files', files: File[]): void;
  (e: 'open', book: Book): void;
  (e: 'remove', book: Book): void;
  (e: 'ctx', event: MouseEvent, type: string, book: Book): void;
  (e: 'toggle-dark'): void;
  (e: 'open-notes-modal'): void;
  (e: 'open-api-modal'): void;
}>();

const sortPop = ref(false);
const dragOver = ref(false);

const sortItems = [
  { value: 'recent', label: '最近阅读' },
  { value: 'title', label: '书名' },
  { value: 'progress', label: '阅读进度' },
  { value: 'added', label: '加入时间' }
];

const kw = computed({
  get: () => props.keyword,
  set: (v: string) => emit('update:keyword', v)
});

const shown = computed(() => {
  const k = String(props.keyword || '').trim().toLowerCase();
  let list = props.books.filter(
    (b) => !k || (b.title + ' ' + (b.author || '')).toLowerCase().indexOf(k) !== -1
  );
  list = list.slice();
  if (props.sort === 'title') list.sort((a, b) => a.title.localeCompare(b.title, 'zh'));
  else if (props.sort === 'progress') list.sort((a, b) => b.progress - a.progress);
  else if (props.sort === 'added') list.sort((a, b) => b.addedAt - a.addedAt);
  else list.sort((a, b) => (b.lastReadAt || 0) - (a.lastReadAt || 0));
  return list;
});

function onDrop(e: DragEvent) {
  dragOver.value = false;
  emitFiles(e.dataTransfer);
}

function emitFiles(dt: DataTransfer | null) {
  if (!dt) return;
  const files: File[] = [];
  if (dt.items && dt.items.length) {
    for (const it of dt.items) {
      if (it.kind !== 'file') continue;
      const f = it.getAsFile();
      if (f) files.push(f);
    }
  } else if (dt.files) {
    for (const f of Array.from(dt.files)) files.push(f);
  }
  emit('drop-files', files);
}
</script>
