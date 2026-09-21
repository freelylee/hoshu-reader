<template>
  <dynamic-panel
    :position="position"
    title="AI 阅读助手"
    @close="$emit('close')"
    @resize-start="$emit('resize-start', $event)"
  >
    <template #actions>
      <button class="size-7 i-btn text-g-600" title="清空对话" @click="clearChat">
        <i class="ri-delete-bin-6-line text-lg"></i>
      </button>
    </template>
    <div class="h-full flex-v">
      <!-- 上下文 -->
      <div class="flex-none px-2 pb-1.5 pt-1 border-b border-line">
        <div class="max-h-13 overflow-y-auto flex flex-wrap items-center gap-1">
          <span class="chip text-g-700" :title="'在读 - ' + book.title">
            <i class="ri-book-2-line text-sm"></i>
            <span class="truncate max-w-[130px]">{{ book.title }}</span>
          </span>
          <span v-if="chapter" class="chip text-theme" title="当前章节">
            <i class="ri-bookmark-3-line text-sm"></i>
            <span class="truncate max-w-[110px]">{{ chapter }}</span>
          </span>
          <span v-if="selection" class="chip text-warning" title="选中的正文">
            <i class="ri-text text-sm"></i>
            <span class="truncate max-w-[130px]">
              {{ selection.slice(0, 40) }}{{ selection.length > 40 ? '…' : '' }}
            </span>
            <i
              class="ri-close-line t-mute hover:text-danger cursor-pointer ml-0.5"
              @click.stop="$emit('clear-selection')"
            ></i>
          </span>
        </div>
        <div v-if="memories && memories.length" class="mt-1.5">
          <div class="flex-c gap-1 text-[11px] text-g-500 c-p" @click="showMem = !showMem">
            <i class="ri-brain-line"></i>
            <span>相关记忆 {{ memories.length }} 条</span>
            <i :class="showMem ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'"></i>
          </div>
          <div v-if="showMem" class="mt-1 flex-v gap-1 max-h-[132px] scroll-y">
            <div
              v-for="m in memories.slice(0, 6)"
              :key="m.id"
              class="text-[11px] px-2 py-1 rounded bg-g-100 text-g-700"
            >
              <span class="text-g-400">[{{ m.from }}]</span> {{ m.text }}
              <span class="text-g-400">· {{ m.bookTitle }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 消息区 -->
      <div ref="scroller" class="flex-1 scroll-y py-6 px-3">
        <div class="flex-v gap-4 max-w-4xl mx-auto">
          <div v-if="!messages.length" class="text-xs text-g-400 text-center py-6 leading-relaxed">
            选中正文提问，或从下面选一个动作。<br />不打扰的时候，它不会主动出现。
          </div>
          <div
            v-for="(m, i) in messages"
            :key="i"
            class="flex w-full"
            :class="m.role === 'user' ? 'justify-end' : 'justify-start'"
          >
            <div
              class="group/item flex-v relative"
              :class="m.role === 'user' ? 'items-end max-w-[100%]' : 'items-start w-full'"
            >
              <div
                class="relative text-sm leading-relaxed break-words"
                :class="
                  m.role === 'user'
                    ? 'bg-theme border border-g-200 rounded-md px-3 py-1 rounded-tr-xs self-end max-w-lg text-white'
                    : 'text-g-800 w-full'
                "
              >
                <div v-if="m.role === 'ai'" class="flex-c gap-1.5 mb-1">
                  <i class="ri-chat-ai-line text-theme"></i>
                  <span class="text-[11px] font-bold text-g-500">{{ m.action || 'AI 阅读助手' }}</span>
                </div>
                <div class="whitespace-pre-wrap">{{ m.text }}</div>
                <div
                  v-if="m.sources && m.sources.length"
                  class="mt-2 pt-1.5 border-t border-line flex-v gap-0.5"
                >
                  <div
                    v-for="(s, si) in m.sources"
                    :key="si"
                    class="text-[11px] text-g-500 flex-c gap-1"
                  >
                    <i class="ri-link"></i>{{ s }}
                  </div>
                </div>
              </div>
              <div
                class="flex-c gap-3 mt-1.5 text-xs text-g-500 opacity-0 group-hover/item:opacity-100 transition-opacity duration-200"
              >
                <button class="hover:text-g-900 cursor-pointer" title="复制" @click="copyMsg(m)">
                  <i class="ri-file-copy-line"></i>
                </button>
                <button
                  class="hover:text-g-900 cursor-pointer"
                  title="删除这条对话"
                  @click="$emit('drop', i)"
                >
                  <i class="ri-delete-bin-6-line"></i>
                </button>
                <span v-if="m.role === 'ai'">刚刚 · 18.4 tok/s</span>
              </div>
            </div>
          </div>
          <div v-if="busy" class="flex-c gap-1 px-1 py-2 text-xs text-g-500">
            <span class="typing-dot">·</span>
            <span class="typing-dot">·</span>
            <span class="typing-dot">·</span>
            <span class="ml-1">正在结合本书上下文思考</span>
          </div>
        </div>
      </div>

      <!-- 输入区 -->
      <div class="mx-2 mb-2">
        <div class="bg-g-100 border border-line rounded-custom-sm">
          <div class="px-3 py-2 relative">
            <textarea
              v-model="draft"
              rows="1"
              placeholder="就这一段问点什么… Enter 发送，Shift + Enter 换行"
              class="w-full bg-transparent text-[14px] outline-none resize-none min-h-[40px] max-h-[100px] text-g-800 placeholder:text-g-400 !border-none"
              @keydown="onKey"
            ></textarea>
          </div>
          <div class="flex-cb gap-3 px-3 pb-2">
            <div class="flex gap-1 items-center">
              <button
                v-for="a in actions"
                :key="a.key"
                class="size-7 flex-cc rounded text-g-600 hover:bg-g-150 transition-colors cursor-pointer"
                :title="a.label"
                @click="$emit('action', a.key)"
              >
                <i :class="a.icon" class="text-base"></i>
              </button>
            </div>
            <div class="flex gap-3 items-center">
              <div class="relative">
                <button
                  class="w-[120px] h-7 px-2 flex-cb text-xs text-g-700 rounded border border-line-1 hover:border-theme transition-colors cursor-pointer"
                  @click="modelPop = !modelPop"
                >
                  <span class="truncate">{{ modelLabel }}</span>
                  <i class="ri-arrow-down-s-line text-g-500"></i>
                </button>
                <transition name="pop">
                  <div v-if="modelPop" class="pop right-0 bottom-full mb-1 w-44 p-1">
                    <div
                      v-for="m in models"
                      :key="m.value"
                      class="p-1.5 rounded c-p hover:bg-hover"
                      @click="
                        modelPop = false;
                        $emit('update:model', m.value);
                      "
                    >
                      <div
                        class="text-xs"
                        :class="m.value === model ? 'text-theme font-bold' : 'text-g-700'"
                      >
                        {{ m.label }}
                      </div>
                      <div class="t-mute">{{ m.desc }}</div>
                    </div>
                  </div>
                </transition>
              </div>

              <div
                class="flex-c gap-1.5 c-p select-none"
                title="上下文用量（含本书正文与本轮选中）"
              >
                <svg class="size-4" viewBox="-2 -2 40 40">
                  <path
                    class="text-g-300 stroke-current"
                    stroke-width="5"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    class="transition-all duration-300 stroke-current"
                    :class="ringColor"
                    stroke-width="5"
                    :stroke-dasharray="usage * 100 + ', 100'"
                    stroke-linecap="round"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span class="text-[11px] text-g-400">{{ usageText }}</span>
              </div>

              <button
                class="size-7 flex-cc rounded-custom-xs bg-theme text-white hover:opacity-90 cursor-pointer"
                @click="send"
              >
                <i class="ri-send-plane-2-line text-sm"></i>
              </button>
            </div>
          </div>
        </div>
        <div class="t-mute text-center mt-1">内容由 AI 生成，请结合原文判断</div>
      </div>
    </div>
  </dynamic-panel>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import type { AiAction, AiMemory, AiMessage, AiModel, Book } from '../types/reader';
import { clamp } from '../utils/helpers';
import { AI_ACTIONS, AI_MODELS } from '../utils/constants';
import DynamicPanel from './DynamicPanel.vue';

const props = withDefaults(
  defineProps<{
    book: Book;
    position?: string;
    chapter?: string;
    selection?: string;
    messages?: AiMessage[];
    busy?: boolean;
    memories?: AiMemory[];
    model?: string;
    actions?: AiAction[];
    models?: AiModel[];
  }>(),
  {
    position: 'right',
    chapter: '',
    selection: '',
    messages: () => [],
    busy: false,
    memories: () => [],
    model: 'balanced',
    actions: () => AI_ACTIONS,
    models: () => AI_MODELS
  }
);

const emit = defineEmits<{
  (e: 'update:model', model: string): void;
  (e: 'ask', text: string): void;
  (e: 'action', key: string): void;
  (e: 'close'): void;
  (e: 'resize-start', ev: MouseEvent): void;
  (e: 'clear'): void;
  (e: 'clear-selection'): void;
  (e: 'drop', idx: number): void;
}>();

const draft = ref('');
const modelPop = ref(false);
const showMem = ref(false);
const scroller = ref<HTMLElement | null>(null);

const modelLabel = computed(() => {
  const m = props.models.find((x) => x.value === props.model);
  return m ? m.label : '均衡模型';
});

function clearChat() {
  emit('clear');
}

function copyMsg(m: AiMessage) {
  try {
    navigator.clipboard.writeText(m.text || '');
  } catch (e) {}
}

const usage = computed(() => {
  const base = 12800;
  const sel = props.selection ? props.selection.length * 1.6 : 0;
  const hist = props.messages.reduce((n, m) => n + m.text.length * 1.6, 0);
  const draftN = draft.value.length * 1.6;
  return clamp((base + sel + hist + draftN) / 200000, 0, 1);
});

const usageText = computed(() => (usage.value * 200).toFixed(1) + 'K tokens');

const ringColor = computed(() =>
  usage.value > 0.95 ? 'text-danger' : usage.value > 0.8 ? 'text-warning' : 'text-theme'
);

function send() {
  const t = draft.value.trim();
  if (!t) return;
  emit('ask', t);
  draft.value = '';
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    send();
  }
}

watch(
  () => props.messages.length,
  () =>
    nextTick(() => {
      if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight;
    })
);
</script>
