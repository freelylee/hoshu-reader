import { reactive, ref } from 'vue';
import type { ContextMenuItem, ModalConfig, ToastItem } from '../types/reader';
import { uid, clamp } from '../utils/helpers';

export function useModalAndToast() {
  const toasts = ref<ToastItem[]>([]);
  const ctxMenu = reactive<{ x: number; y: number; items: ContextMenuItem[] }>({ x: 0, y: 0, items: [] });
  const modal = reactive<ModalConfig>({
    visible: false,
    title: '',
    desc: '',
    input: null,
    options: null,
    kv: null,
    value: null,
    confirmText: '确定',
    cancelText: '取消',
    onOk: null
  });

  function toast(text: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
    const t: ToastItem = { id: uid(), text, type };
    toasts.value.push(t);
    setTimeout(() => {
      toasts.value = toasts.value.filter((x) => x.id !== t.id);
    }, 2400);
  }

  function openModal(cfg: Partial<ModalConfig>) {
    Object.assign(modal, {
      visible: true,
      title: '提示',
      desc: '',
      input: null,
      options: null,
      kv: null,
      value: null,
      confirmText: '确定',
      cancelText: '取消',
      onOk: null,
      ...cfg
    });
  }

  function confirmModal() {
    if (modal.onOk) modal.onOk(modal.value);
    modal.visible = false;
  }

  function openCtx(e: MouseEvent, items: ContextMenuItem[]) {
    ctxMenu.x = clamp(e.clientX, 8, window.innerWidth - 180);
    ctxMenu.y = clamp(e.clientY, 8, window.innerHeight - 40 - items.length * 30);
    ctxMenu.items = items;
  }

  function runCtx(it: ContextMenuItem) {
    ctxMenu.items = [];
    if (it.act) it.act();
  }

  function closeCtx() {
    ctxMenu.items = [];
  }

  return {
    toasts,
    ctxMenu,
    modal,
    toast,
    openModal,
    confirmModal,
    openCtx,
    runCtx,
    closeCtx
  };
}
