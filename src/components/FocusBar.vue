<template>
  <div class="focus-bar card px-2.5 py-1 flex-c gap-1 shadow-lg">
    <span class="text-xs text-g-700 tabular-nums mr-0.5">{{ idx + 1 }} / {{ total }}</span>
    <button class="size-7 i-btn text-g-600" title="上一个" @click="$emit('prev')">
      <i class="ri-arrow-up-s-line"></i>
    </button>
    <button class="size-7 i-btn text-g-600" title="下一个" @click="$emit('next')">
      <i class="ri-arrow-down-s-line"></i>
    </button>
    <div class="v-line h-4 mx-0.5"></div>
    <button
      class="size-7 i-btn"
      :class="speaking ? 'text-theme' : 'text-g-600'"
      :title="speaking ? '停止朗读' : '开始朗读（会自动往下读）'"
      @click="$emit('speak')"
    >
      <i :class="speaking ? 'ri-pause-line' : 'ri-volume-up-line'"></i>
    </button>
    <div class="v-line h-4 mx-0.5"></div>
    <button
      class="flex-c gap-1 h-7 px-1.5 rounded-custom-xs text-[11px] tad-200"
      :class="mode === 'para' ? 'text-theme' : 'text-g-600'"
      :title="mode === 'para' ? '当前逐段，点一下改逐句' : '当前逐句，点一下改逐段'"
      @click="$emit('unit')"
    >
      <span class="w-7 h-4 rounded-full relative tad-200" :class="mode === 'para' ? 'bg-theme' : 'bg-g-300'">
        <span
          class="absolute top-0.5 size-3 rounded-full bg-white tad-200"
          :class="mode === 'para' ? 'left-[16px]' : 'left-0.5'"
        ></span>
      </span>
      <span>{{ mode === 'para' ? '逐段' : '逐句' }}</span>
    </button>
    <div class="v-line h-4 mx-0.5"></div>
    <button class="size-7 i-btn text-g-500" title="退出精读" @click="$emit('close')">
      <i class="ri-close-line"></i>
    </button>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    mode?: string;
    idx?: number;
    total?: number;
    speaking?: boolean;
  }>(),
  {
    mode: 'sentence',
    idx: 0,
    total: 0,
    speaking: false
  }
);

defineEmits<{
  (e: 'prev'): void;
  (e: 'next'): void;
  (e: 'speak'): void;
  (e: 'unit'): void;
  (e: 'close'): void;
}>();
</script>
