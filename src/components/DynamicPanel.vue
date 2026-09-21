<template>
  <div class="dynamic-panel h-full flex-v">
    <div class="h-12 flex-none flex-cb border-b border-line select-none px-1">
      <div class="flex-c">
        <div
          v-if="isRight"
          class="flex-c cursor-ew-resize group mr-2 px-1 py-1.5"
          title="调整宽度"
          @mousedown.prevent="$emit('resize-start', $event)"
        >
          <i class="ri-draggable text-[15px] text-g-400 group-hover:text-g-700 transition-colors"></i>
        </div>
      </div>
      <div class="flex-1 min-w-0 flex-c px-1.5">
        <div v-if="menu" class="relative min-w-0" @click.stop>
          <div class="pop-trigger" @click="pop = !pop">
            <div class="min-w-0 flex-v leading-[1.25]">
              <span class="truncate max-w-[132px] text-xs font-bold text-g-800">{{ menu.label }}</span>
              <span v-if="menu.sub" class="t-mute truncate">{{ menu.sub }}</span>
            </div>
            <i class="ri-arrow-down-s-line text-xs text-g-500 flex-none"></i>
          </div>
          <transition name="pop">
            <div v-if="pop" class="pop left-0 top-full mt-1 w-[240px]">
              <div class="sec-head">{{ menu.head }}</div>
              <div class="max-h-[40vh] scroll-y p-1">
                <div
                  v-for="it in menu.items"
                  :key="it.id"
                  class="opt-item"
                  :class="it.active ? 'text-theme bg-g-150' : 'text-g-700'"
                  @click="pop = false; $emit('select-menu', it.id)"
                >
                  {{ it.label }}
                </div>
                <div v-if="!menu.items.length" class="t-mute px-2 py-3 text-center">没有可切换的项</div>
              </div>
            </div>
          </transition>
        </div>
        <span v-else class="font-semibold text-sm truncate">{{ title }}</span>
      </div>
      <div class="flex-c gap-1 flex-none">
        <slot name="actions"></slot>
        <button class="size-7 i-btn text-g-600" title="关闭" @click="$emit('close')">
          <i class="ri-close-line text-lg"></i>
        </button>
        <div
          v-if="!isRight"
          class="flex-c cursor-ew-resize group px-1 py-1.5"
          title="调整宽度"
          @mousedown.prevent="$emit('resize-start', $event)"
        >
          <i class="ri-draggable text-[15px] text-g-400 group-hover:text-g-700 transition-colors"></i>
        </div>
      </div>
    </div>
    <div class="flex-1 overflow-hidden relative">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  position?: string;
  title?: string;
  menu?: {
    label: string;
    sub?: string;
    head: string;
    items: Array<{ id: string; label: string; active: boolean }>;
  } | null;
}>();

defineEmits<{
  (e: 'close'): void;
  (e: 'resize-start', event: MouseEvent): void;
  (e: 'select-menu', id: string): void;
}>();

const pop = ref(false);
const isRight = computed(() => props.position === 'right');
</script>
