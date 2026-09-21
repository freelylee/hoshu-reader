import { ref, computed } from 'vue';
import { PAGE_THEMES, FONT_OPTIONS } from '../utils/constants';

export function useReaderSettings() {
  const isDark = ref(false);
  const pageTheme = ref('paper');
  const fontKey = ref('serif');
  const fontSize = ref(17);
  const lineHeight = ref(1.9);
  const pageWidth = ref(680);

  const scrollMode = ref<'scroll' | 'page'>('scroll');
  const spread = ref<'single' | 'double'>('single');
  const pageIdx = ref(0);
  const textPageCount = ref(1);
  const pagedH = ref(600);
  const scrollPercent = ref(0);

  function toggleDark() {
    isDark.value = !isDark.value;
    document.documentElement.classList.toggle('dark', isDark.value);
  }

  const proseStyle = computed(() => ({
    '--page-fs': fontSize.value + 'px',
    '--page-lh': lineHeight.value,
    '--page-w': pageWidth.value + 'px',
    fontFamily: (FONT_OPTIONS.find((f) => f.key === fontKey.value) || FONT_OPTIONS[0]).css
  }));

  const pdfInvert = computed(() => pageTheme.value === 'night' || isDark.value);

  return {
    isDark,
    pageTheme,
    fontKey,
    fontSize,
    lineHeight,
    pageWidth,
    scrollMode,
    spread,
    pageIdx,
    textPageCount,
    pagedH,
    scrollPercent,
    toggleDark,
    proseStyle,
    pdfInvert,
    PAGE_THEMES,
    FONT_OPTIONS
  };
}
