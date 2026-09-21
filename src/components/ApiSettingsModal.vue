<template>
  <div class="modal-mask fixed inset-0 z-50 flex-cc bg-black/40 p-4">
    <div class="card w-full max-w-lg flex-v overflow-hidden shadow-xl animate-scale-up">
      <div class="flex-none px-4 py-3 flex-cb border-b border-line bg-box">
        <div class="flex-c gap-2">
          <i class="ri-settings-4-line text-lg text-theme"></i>
          <div>
            <div class="font-bold text-sm text-g-800">学术引擎与 API 配置</div>
            <div class="text-[11px] text-g-400">纯前端存储 · 仅保存在浏览器本地，不经过任何第三方服务器</div>
          </div>
        </div>
        <button class="i-btn size-7 text-g-500 hover:text-g-700" @click="$emit('close')">
          <i class="ri-close-line text-lg"></i>
        </button>
      </div>

      <div class="p-5 space-y-4 text-xs bg-canvas">
        <!-- MinerU Token -->
        <div class="space-y-1.5">
          <div class="flex-cb">
            <label class="font-bold text-g-800 flex-c gap-1">
              <span>MinerU 官方 API Token</span>
              <span class="text-[10px] text-amber-600 bg-amber-50 px-1 py-0.5 rounded">官方免费</span>
            </label>
            <a
              href="https://mineru.net"
              target="_blank"
              class="text-theme text-[11px] hover:underline flex-c gap-0.5"
            >
              <span>前往 mineru.net 免费申请</span>
              <i class="ri-external-link-line"></i>
            </a>
          </div>
          <input
            v-model="mineruToken"
            type="password"
            placeholder="在 mineru.net 用户中心复制 Token 粘贴于此"
            class="w-full px-3 py-2 rounded-custom-xs border border-line bg-box text-xs focus:border-theme outline-none"
          />
          <div class="text-[11px] text-g-500 leading-relaxed">
            用于学术论文中的数学公式全自动提取（LaTeX）、复杂跨页表格还原及智能消除双栏页眉页脚。未配置时仍可使用内置的本地极速重排引擎。
          </div>
        </div>

        <div class="border-t border-line"></div>

        <!-- Gemini API Key -->
        <div class="space-y-1.5">
          <div class="flex-cb">
            <label class="font-bold text-g-800 flex-c gap-1">
              <span>Gemini API Key (学术翻译与问答)</span>
            </label>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              class="text-theme text-[11px] hover:underline flex-c gap-0.5"
            >
              <span>获取 Google AI Studio Key</span>
              <i class="ri-external-link-line"></i>
            </a>
          </div>
          <input
            v-model="geminiKey"
            type="password"
            placeholder="AI Studio API Key (选填，支持一键段落学术翻译)"
            class="w-full px-3 py-2 rounded-custom-xs border border-line bg-box text-xs focus:border-theme outline-none"
          />
          <div class="text-[11px] text-g-500 leading-relaxed">
            配置后将使用 Gemini 2.5 Flash 进行高保真专业双语学术翻译与长上下文跨章论文精审。未填写时使用客户端免费翻译接口。
          </div>
        </div>
      </div>

      <div class="px-4 py-3 border-t border-line flex-cb bg-box text-xs">
        <span class="text-g-400">密钥保存在 LocalStorage 中</span>
        <div class="flex-c gap-2">
          <button class="btn px-3 py-1.5 text-g-600" @click="$emit('close')">取消</button>
          <button class="btn px-4 py-1.5 bg-theme text-white hover:opacity-90 cursor-pointer" @click="save">
            保存配置
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'saved', data: { mineruToken: string; geminiKey: string }): void;
}>();

const mineruToken = ref(localStorage.getItem('MINERU_API_TOKEN') || '');
const geminiKey = ref(localStorage.getItem('GEMINI_API_KEY') || '');

function save() {
  localStorage.setItem('MINERU_API_TOKEN', mineruToken.value.trim());
  localStorage.setItem('GEMINI_API_KEY', geminiKey.value.trim());
  emit('saved', { mineruToken: mineruToken.value.trim(), geminiKey: geminiKey.value.trim() });
  emit('close');
}
</script>
