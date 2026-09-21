<template>
  <div class="flex-1 flex-v h-full overflow-hidden bg-canvas relative">
    <!-- 双语对照工具顶栏 -->
    <div class="flex-none px-4 py-2 flex-cb border-b border-line bg-box select-none text-xs">
      <div class="flex-c gap-2">
        <span class="font-bold flex-c gap-1 text-g-800">
          <i class="ri-translate-2 text-theme text-sm"></i>
          双语对照模式
        </span>
        <span class="text-g-400">· 共 {{ paragraphs.length }} 个段落</span>
        <span v-if="translatedCount > 0" class="text-emerald-600 font-medium">
          (已译 {{ translatedCount }}/{{ paragraphs.length }})
        </span>
      </div>

      <div class="flex-c gap-1.5">
        <!-- 翻译全部按钮 -->
        <button
          class="btn px-2.5 py-1 text-xs text-theme border-theme/40 bg-theme/5 hover:bg-theme/10"
          :disabled="isTranslating"
          @click="$emit('translate-all')"
        >
          <i v-if="isTranslating" class="ri-loader-4-line animate-spin mr-1"></i>
          <i v-else class="ri-sparkling-fill mr-1 text-amber-500"></i>
          {{ isTranslating ? `正在翻译 (${translateProgress.cur}/${translateProgress.total})…` : '一键全篇翻译' }}
        </button>

        <!-- 导出双语 Markdown -->
        <button
          class="btn px-2 py-1 text-xs text-g-600 hover:text-g-800"
          title="下载双语对照 Markdown 文件 (.md)"
          @click="$emit('export-md')"
        >
          <i class="ri-markdown-line mr-1 text-sky-600"></i>导出 .md
        </button>

        <!-- 生成双语 PDF (类似 zotero-pdf2zh) -->
        <button
          class="btn px-2 py-1 text-xs text-g-600 hover:text-g-800"
          title="生成排版高保真的双语对照 PDF"
          @click="$emit('export-pdf')"
        >
          <i class="ri-file-pdf-2-line mr-1 text-rose-500"></i>生成双语 PDF
        </button>

        <div class="v-line h-4 mx-1"></div>

        <!-- 返回正常阅读 -->
        <button
          class="btn px-2 py-1 text-xs text-g-500 hover:text-g-700"
          title="退出双语对照"
          @click="$emit('close')"
        >
          <i class="ri-close-line"></i>退出
        </button>
      </div>
    </div>

    <!-- 主对照滚动流 -->
    <div class="flex-1 scroll-y p-4 md:p-6 lg:p-8 space-y-4">
      <div v-if="!paragraphs.length" class="text-center text-g-400 py-16 text-xs">
        <i class="ri-file-warning-line text-3xl mb-2 inline-block"></i>
        <div>暂无可供对照的段落，请先开启「阅读模式（文本化）」提取文本</div>
      </div>

      <div
        v-for="(para, idx) in paragraphs"
        :key="para.id"
        class="card p-4 transition-all hover:border-theme/30 relative group"
        :class="{ 'ring-1 ring-amber-400/50 bg-amber-500/5': para.status === 'translating' }"
      >
        <!-- 序号标签与单段翻译操作 -->
        <div class="flex-cb mb-2 text-[11px] text-g-400 border-b border-line-1 pb-1.5">
          <span class="font-mono font-bold text-g-500">§ {{ idx + 1 }}</span>
          <div class="flex-c gap-2 opacity-80 group-hover:opacity-100">
            <button
              class="hover:text-theme flex-c gap-1 cursor-pointer"
              :disabled="para.status === 'translating'"
              @click="$emit('translate-one', para)"
            >
              <i
                :class="para.status === 'translating' ? 'ri-loader-4-line animate-spin' : 'ri-refresh-line'"
              ></i>
              <span>{{ para.translation ? '重新翻译' : '翻译此段' }}</span>
            </button>
            <button
              class="hover:text-g-700 flex-c gap-0.5 cursor-pointer"
              title="复制原文与译文"
              @click="copyPara(para)"
            >
              <i class="ri-file-copy-line"></i>
            </button>
          </div>
        </div>

        <!-- 双语内容排布（大屏并排，窄屏上下） -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- 左：原文 -->
          <div class="bilingual-col pr-0 md:pr-3 md:border-r border-line-1 text-g-800 leading-relaxed text-sm">
            <div class="text-[10px] uppercase font-bold text-theme/80 tracking-wider mb-1">ORIGINAL</div>
            <div class="prose max-w-none" v-html="renderKatex(para.original)"></div>
          </div>

          <!-- 右：译文 -->
          <div class="bilingual-col pl-0 md:pl-1 text-g-900 leading-relaxed text-sm">
            <div class="text-[10px] uppercase font-bold text-emerald-600 tracking-wider mb-1">中文对照</div>
            <div v-if="para.status === 'translating'" class="text-xs text-amber-600 py-3 flex-c gap-1.5">
              <i class="ri-loader-4-line animate-spin"></i>
              <span>AI 正在翻译当前学术段落及公式…</span>
            </div>
            <div
              v-else-if="para.translation"
              class="prose max-w-none text-g-800"
              v-html="renderKatex(para.translation)"
            ></div>
            <div
              v-else
              class="text-xs text-g-400 italic py-2 cursor-pointer hover:text-theme"
              @click="$emit('translate-one', para)"
            >
              点击此处一键翻译此段…
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { BilingualParagraph } from '../types/reader';
import { renderMarkdownWithKatex } from '../utils/pdfTextExtractor';

const props = defineProps<{
  paragraphs: BilingualParagraph[];
  isTranslating: boolean;
  translateProgress: { cur: number; total: number };
}>();

const emit = defineEmits<{
  (e: 'translate-all'): void;
  (e: 'translate-one', para: BilingualParagraph): void;
  (e: 'export-md'): void;
  (e: 'export-pdf'): void;
  (e: 'close'): void;
}>();

const translatedCount = computed(() => {
  return props.paragraphs.filter((p) => !!p.translation).length;
});

function renderKatex(text: string): string {
  return renderMarkdownWithKatex(text);
}

function copyPara(para: BilingualParagraph) {
  const content = `[原文]\n${para.original}\n\n[译文]\n${para.translation || '（未翻译）'}`;
  navigator.clipboard.writeText(content);
}
</script>

<style scoped>
.bilingual-col :deep(p) {
  margin-bottom: 0.5rem;
}
.bilingual-col :deep(p:last-child) {
  margin-bottom: 0;
}
.bilingual-col :deep(h1),
.bilingual-col :deep(h2),
.bilingual-col :deep(h3) {
  font-weight: 700;
  margin-top: 0.25rem;
  margin-bottom: 0.5rem;
}
</style>
