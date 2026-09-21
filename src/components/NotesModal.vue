<template>
  <div class="modal-mask fixed inset-0 z-50 flex-cc bg-black/40 p-4">
    <div class="card w-full max-w-3xl max-h-[85vh] flex-v overflow-hidden shadow-xl animate-scale-up">
      <!-- 弹窗标题栏 -->
      <div class="flex-none px-4 py-3 flex-cb border-b border-line bg-box">
        <div class="flex-c gap-2">
          <i class="ri-markdown-line text-lg text-theme"></i>
          <div>
            <div class="font-bold text-sm text-g-800">独立 Markdown 笔记管理</div>
            <div class="text-[11px] text-g-400">单书单文件 · 摆脱数据库束缚 · 与 Obsidian / Logseq 无缝联动</div>
          </div>
        </div>
        <button class="i-btn size-7 text-g-500 hover:text-g-700" @click="$emit('close')">
          <i class="ri-close-line text-lg"></i>
        </button>
      </div>

      <!-- 状态与操作栏 -->
      <div class="flex-none p-4 bg-canvas border-b border-line space-y-3">
        <!-- 目录绑定状态 -->
        <div class="flex-cb p-3 rounded-custom-xs border" :class="dirName ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-line bg-box'">
          <div class="flex-c gap-2.5">
            <div
              class="size-8 rounded-full flex-cc"
              :class="dirName ? 'bg-emerald-100 text-emerald-600' : 'bg-g-200 text-g-500'"
            >
              <i :class="dirName ? 'ri-folder-check-line' : 'ri-folder-add-line'" class="text-base"></i>
            </div>
            <div>
              <div class="text-xs font-bold text-g-800">
                {{ dirName ? `已关联本地目录：${dirName}` : '未关联本地文件夹' }}
              </div>
              <div class="text-[11px] text-g-500">
                {{ dirName ? '每次划词、写批注或 AI 总结，系统将自动刷写入该目录的对应 .md 文件' : '关联本地目录后，阅读划词与思考将实时双向落盘' }}
              </div>
            </div>
          </div>

          <button
            class="btn px-3 py-1.5 text-xs text-theme border-theme/40 bg-theme/5 hover:bg-theme/10 font-medium"
            @click="$emit('bind-dir')"
          >
            <i class="ri-folder-open-line mr-1"></i>{{ dirName ? '更换文件夹' : '绑定本地笔记目录' }}
          </button>
        </div>

        <!-- 快捷导出操作 -->
        <div class="flex-cb text-xs">
          <div class="text-g-500">
            当前书对应文件：<span class="font-mono text-g-800 font-bold">{{ fileName }}</span>
          </div>
          <div class="flex-c gap-2">
            <button
              class="btn px-2.5 py-1 text-xs text-g-700 hover:text-g-900"
              title="下载此书的 Markdown 文件"
              @click="$emit('export-current')"
            >
              <i class="ri-download-line mr-1 text-theme"></i>下载此书 .md
            </button>
            <button
              class="btn px-2.5 py-1 text-xs text-g-700 hover:text-g-900"
              title="打包所有书籍笔记"
              @click="$emit('export-all')"
            >
              <i class="ri-file-zip-line mr-1 text-amber-500"></i>打包全部笔记 (.zip)
            </button>
          </div>
        </div>
      </div>

      <!-- Markdown 实时预览区 -->
      <div class="flex-1 scroll-y p-4 bg-box">
        <div class="text-[11px] uppercase tracking-wider font-bold text-g-400 mb-2">
          实时生成的 MARKDOWN 文件内容预览
        </div>
        <pre class="p-4 rounded bg-canvas border border-line-1 text-xs font-mono text-g-800 leading-relaxed overflow-x-auto whitespace-pre-wrap select-text">{{ markdownText }}</pre>
      </div>

      <!-- 底部关闭按钮 -->
      <div class="flex-none px-4 py-2.5 border-t border-line flex-cb bg-box text-xs">
        <span class="text-g-400">所有数据保存在客户端与用户本地，100% 隐私安全</span>
        <button class="btn px-4 py-1.5 bg-theme text-white text-xs hover:opacity-90 cursor-pointer" @click="$emit('close')">
          完成
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Book } from '../types/reader';

const props = defineProps<{
  book: Book;
  dirName: string;
  markdownText: string;
}>();

defineEmits<{
  (e: 'close'): void;
  (e: 'bind-dir'): void;
  (e: 'export-current'): void;
  (e: 'export-all'): void;
}>();

const fileName = computed(() => {
  const safe = (props.book.title || 'Untitled')
    .replace(/[\\/:*?"<>|]/g, '_')
    .trim()
    .slice(0, 50);
  return `${safe}.notes.md`;
});
</script>
