<template>
  <div class="flex-1 flex-v h-full overflow-hidden bg-canvas relative select-text">
    <!-- 文本化阅读模式顶栏 -->
    <div class="flex-none px-4 py-2 flex-cb border-b border-line bg-box select-none text-xs">
      <div class="flex-c gap-2 min-w-0">
        <span class="font-bold flex-c gap-1 text-theme">
          <i class="ri-book-read-line text-sm"></i>
          PDF 阅读模式 (文本流)
        </span>
        <span class="text-g-400 hidden sm:inline">· 双栏流式重排与排版还原</span>
        <span v-if="mineruStatus === 'parsing'" class="text-amber-600 flex-c gap-1 text-[11px]">
          <i class="ri-loader-4-line animate-spin"></i>
          MinerU 正在识别 LaTeX 与版面…
        </span>
      </div>

      <div class="flex-c gap-1.5 flex-none">
        <!-- 切换为双语对照 -->
        <button
          class="btn px-2.5 py-1 text-xs text-theme border-theme/40 bg-theme/5 hover:bg-theme/10"
          title="开启段落级双语对照"
          @click="$emit('open-bilingual')"
        >
          <i class="ri-translate-2 mr-1"></i>双语对照
        </button>

        <!-- MinerU 学术解析 / 重新提取 -->
        <button
          class="btn px-2 py-1 text-xs text-g-600 hover:text-g-800"
          title="使用 MinerU 免费官方 API 提取高保真 LaTeX 公式与表格"
          @click="$emit('run-mineru')"
        >
          <i class="ri-sparkling-fill mr-1 text-amber-500"></i>MinerU 学术解析
        </button>

        <!-- 本地极速提取 -->
        <button
          class="btn px-2 py-1 text-xs text-g-600 hover:text-g-800"
          title="纯本地快速双栏文本重排"
          @click="$emit('re-extract-local')"
        >
          <i class="ri-refresh-line mr-1"></i>重新排版
        </button>

        <div class="v-line h-4 mx-1"></div>

        <!-- 切回原版 PDF 页面 -->
        <button
          class="btn px-2 py-1 text-xs text-g-500 hover:text-g-700"
          title="切回 PDF 页面浏览模式"
          @click="$emit('switch-to-canvas')"
        >
          <i class="ri-file-pdf-line mr-1"></i>返回原版 PDF
        </button>
      </div>
    </div>

    <!-- 正文滚动容器 -->
    <div
      ref="scroller"
      class="flex-1 scroll-y p-4 md:p-8 lg:p-12 reader-surface"
      @mouseup="$emit('text-selected', $event)"
    >
      <div
        class="mx-auto transition-all"
        :style="{
          maxWidth: pageWidth + 'px',
          fontSize: fontSize + 'px',
          lineHeight: lineHeight,
          fontFamily: fontCss
        }"
      >
        <!-- 提取加载态 -->
        <div v-if="loading" class="flex-cc flex-v py-20 text-xs text-g-500 gap-2">
          <i class="ri-loader-4-line text-2xl text-theme animate-spin"></i>
          <div>{{ loadingText || '正在对 PDF 页面进行排版与双栏流式重构…' }}</div>
        </div>

        <!-- 渲染正文 -->
        <div
          v-else-if="markdownContent"
          class="prose-content text-g-800"
          v-html="renderedHtml"
        ></div>

        <!-- 空态 -->
        <div v-else class="text-center py-20 text-xs text-g-400">
          <i class="ri-file-text-line text-3xl mb-2 inline-block"></i>
          <div>未能提取出有效文本，可能是纯图片扫描件，请尝试 MinerU 解析</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { renderMarkdownWithKatex } from '../utils/pdfTextExtractor';

const props = defineProps<{
  markdownContent: string;
  loading: boolean;
  loadingText?: string;
  mineruStatus?: 'idle' | 'parsing' | 'done' | 'error';
  fontSize: number;
  lineHeight: number;
  pageWidth: number;
  fontCss: string;
}>();

defineEmits<{
  (e: 'open-bilingual'): void;
  (e: 'run-mineru'): void;
  (e: 're-extract-local'): void;
  (e: 'switch-to-canvas'): void;
  (e: 'text-selected', ev: MouseEvent): void;
}>();

const scroller = ref<HTMLElement | null>(null);

const renderedHtml = computed(() => {
  return renderMarkdownWithKatex(props.markdownContent);
});
</script>

<style scoped>
.prose-content :deep(h1) {
  font-size: 1.6em;
  font-weight: 700;
  margin-top: 1.6em;
  margin-bottom: 0.6em;
  color: var(--theme-color, #2563eb);
}
.prose-content :deep(h2) {
  font-size: 1.35em;
  font-weight: 700;
  margin-top: 1.4em;
  margin-bottom: 0.5em;
  border-bottom: 1px solid var(--line-color, #e2e8f0);
  padding-bottom: 0.3em;
}
.prose-content :deep(h3) {
  font-size: 1.15em;
  font-weight: 600;
  margin-top: 1.2em;
  margin-bottom: 0.4em;
}
.prose-content :deep(p) {
  margin-bottom: 1em;
  text-align: justify;
}
.prose-content :deep(blockquote) {
  border-left: 3px solid var(--theme-color, #2563eb);
  padding-left: 1rem;
  margin: 1rem 0;
  color: #64748b;
  background: rgba(37, 99, 235, 0.03);
}
.prose-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 1.2em 0;
  font-size: 0.9em;
}
.prose-content :deep(th),
.prose-content :deep(td) {
  border: 1px solid #cbd5e1;
  padding: 6px 10px;
}
.prose-content :deep(th) {
  background: #f8fafc;
  font-weight: 600;
}
</style>
