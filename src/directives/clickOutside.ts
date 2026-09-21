import type { Directive } from 'vue';

interface ClickOutsideElement extends HTMLElement {
  __clickOutsideHandler?: (e: MouseEvent) => void;
}

export const vClickOutside: Directive<ClickOutsideElement, (e: MouseEvent) => void> = {
  mounted(el, binding) {
    el.__clickOutsideHandler = (e: MouseEvent) => {
      if (!el.contains(e.target as Node)) {
        binding.value(e);
      }
    };
    setTimeout(() => {
      if (el.__clickOutsideHandler) {
        document.addEventListener('click', el.__clickOutsideHandler);
      }
    }, 0);
  },
  unmounted(el) {
    if (el.__clickOutsideHandler) {
      document.removeEventListener('click', el.__clickOutsideHandler);
      delete el.__clickOutsideHandler;
    }
  }
};
