<template>
  <div class="layout-body h-screen flex overflow-hidden relative">
    <!-- 移动端面板遮罩 -->
    <div
      v-if="isMobile && curBook && (navOpen || aiOpen)"
      class="absolute inset-0 z-30 bg-black/30"
      @click="navOpen = false; aiOpen = false"
    ></div>

    <!-- 1. 未打开任何书：整页 ShelfView -->
    <ShelfView
      v-if="!openBooks.length"
      :books="books"
      :stats="stats"
      :sort="shelfSort"
      :keyword="shelfKeyword"
      :grid="shelfGrid"
      :notes-dir-name="dirName"
      @update:sort="shelfSort = $event"
      @update:keyword="shelfKeyword = $event"
      @update:grid="shelfGrid = $event"
      @pick-files="pickFiles"
      @pick-dir="pickDir"
      @drop-files="onDropFiles"
      @open="openBook"
      @remove="removeBook"
      @ctx="onShelfCtx"
      @open-notes-modal="openNotesModalForCurrent(null)"
      @open-api-modal="apiModalOpen = true"
    />

    <!-- 2. 工作区：打开书后 -->
    <template v-else>
      <div class="flex-1 flex min-w-0 h-full overflow-hidden">
        <!-- 2.1 目录面板（固定左侧） -->
        <div
          v-show="navOpen && curBook"
          class="flex-none flex-v h-full overflow-hidden border-r border-line bg-canvas"
          :style="{ width: navWidth + 'px' }"
        >
          <NavPanel
            v-if="curBook"
            :book="curBook"
            :tab="navTab"
            :thumbs="thumbs"
            :cur-page="pdfPage"
            position="left"
            :menu="navMenu"
            @select-menu="switchBookById"
            @update:tab="navTab = $event"
            @goto="gotoTarget"
            @jump-annot="jumpAnnot"
            @del-annot="delAnnot"
            @edit-annot="editAnnot"
            @resize-start="startResize('nav', $event)"
            @close="navOpen = false"
          />
        </div>

        <!-- 2.2 阅读器（正文列） -->
        <div class="flex-1 min-w-0 flex-v overflow-hidden relative">
          <!-- Tabs -->
          <div class="h-12 flex-none flex items-end">
            <div class="editor-work-tab flex-b w-full select-none pt-1 px-1">
              <div class="flex-1 overflow-hidden">
                <ul class="whitespace-nowrap flex pl-1 items-end">
                  <li
                    v-for="t in tabs"
                    :key="t.id"
                    class="flex-cc ml-1 gap-1 c-p group google-tab relative text-xs"
                    :data-ptheme="pageTheme"
                    :class="t.id === activeTabId ? 'activ-tab reader-surface' : 'text-g-600'"
                    @click="activateTab(t.id)"
                    @contextmenu.prevent="openCtx($event, tabMenu(t))"
                  >
                    <i
                      :class="t.icon"
                      class="size-3.5"
                      :style="t.id === activeTabId ? 'color:var(--theme-color)' : ''"
                    ></i>
                    <span class="truncate max-w-[120px]">{{ t.title }}</span>
                    <span
                      v-if="!t.fixed"
                      class="inline-flex flex-cc relative ml-0.5 p-1 rounded-full tad-200 hover:bg-g-200 w-5 h-5"
                      @click.stop="closeTab(t.id)"
                    >
                      <i class="ri-close-line text-xs text-g-600"></i>
                    </span>
                    <div
                      class="line absolute top-0 bottom-0 left-[-3px] border-l-2 border-g-250 h-4 my-auto transition-opacity duration-150"
                    ></div>
                  </li>
                </ul>
              </div>
              <div class="flex-none ml-2 flex">
                <div
                  class="flex-cc relative size-8 leading-8 text-center c-p tad-200 hover:bg-hover rounded"
                  @click="openCtx($event, tabMenu(null))"
                >
                  <i class="ri-arrow-down-s-line text-lg text-g-700"></i>
                </div>
              </div>
            </div>
          </div>

          <!-- 书架总览 Tab -->
          <ShelfView
            v-if="activeTabId === SHELF_TAB"
            :books="books"
            :stats="stats"
            :sort="shelfSort"
            :keyword="shelfKeyword"
            :grid="shelfGrid"
            :notes-dir-name="dirName"
            @update:sort="shelfSort = $event"
            @update:keyword="shelfKeyword = $event"
            @update:grid="shelfGrid = $event"
            @pick-files="pickFiles"
            @pick-dir="pickDir"
            @drop-files="onDropFiles"
            @open="openBook"
            @remove="removeBook"
            @ctx="onShelfCtx"
            @open-notes-modal="openNotesModalForCurrent(null)"
            @open-api-modal="apiModalOpen = true"
          />

          <template v-else-if="curBook">
            <!-- 阅读工具条 -->
            <div
              class="flex-none px-3 py-1 flex-cb h-10 select-none border-b border-line reader-surface"
              :data-ptheme="pageTheme"
            >
              <div class="flex-c min-w-0 gap-1">
                <button
                  class="size-7 i-btn"
                  :class="navOpen ? 'text-theme' : 'text-g-600'"
                  title="目录"
                  @click="navOpen = !navOpen"
                >
                  <i class="ri-list-unordered"></i>
                </button>

                <!-- PDF 专属：类似 Zotero 的一键文本化阅读模式 -->
                <button
                  v-if="curBook && curBook.kind === 'pdf'"
                  class="btn px-2 py-1 text-xs transition-colors"
                  :class="curBook.textModeActive ? 'bg-theme text-white border-theme' : 'text-g-700 hover:text-theme'"
                  :title="curBook.textModeActive ? '当前为流式阅读模式，点击返回原版 PDF' : '开启类似 Zotero 的文本化阅读模式 (提取 LaTeX 公式与段落)'"
                  @click="togglePdfTextMode(curBook)"
                >
                  <i class="ri-book-read-line mr-0.5"></i>
                  <span>{{ curBook.textModeActive ? '原版 PDF' : '阅读模式' }}</span>
                </button>

                <!-- 一键双语对照 -->
                <button
                  class="btn px-2 py-1 text-xs transition-colors"
                  :class="curBook && curBook.bilingualActive ? 'bg-theme text-white border-theme' : 'text-g-700 hover:text-theme'"
                  title="开启段落级双语对照与学术翻译"
                  @click="toggleBilingual(curBook)"
                >
                  <i class="ri-translate-2 mr-0.5"></i>
                  <span>双语对照</span>
                </button>

                <!-- 独立 Markdown 笔记管理 -->
                <button
                  class="btn px-2 py-1 text-xs"
                  :class="dirName ? 'text-emerald-700 bg-emerald-500/10 border-emerald-500/30' : 'text-g-700 hover:text-theme'"
                  :title="dirName ? `已绑定本地目录：${dirName}，笔记自动双向落盘` : '每本书独立 Markdown 笔记管理'"
                  @click="openNotesModalForCurrent(curBook)"
                >
                  <i :class="dirName ? 'ri-folder-check-line text-emerald-600' : 'ri-markdown-line'"></i>
                  <span class="hidden sm:inline">笔记.md</span>
                </button>
              </div>

              <!-- 进度展示 -->
              <div v-if="!isMobile" class="flex-1 flex-cc overflow-hidden px-4">
                <div class="flex-c gap-1.5 text-xs text-g-400 truncate">
                  <span v-if="chapterTitle" class="text-g-800 font-bold truncate max-w-[220px]">
                    {{ chapterTitle }}
                  </span>
                  <span v-if="chapterTitle" class="text-g-300">·</span>
                  <span class="tabular-nums">{{ progressText }}</span>
                </div>
              </div>

              <div class="flex-c gap-0.5">
                <button
                  class="size-7 i-btn text-g-600"
                  :disabled="!canPrevPage"
                  title="上一页"
                  @click="goPrevPage"
                >
                  <i class="ri-arrow-left-s-line text-lg"></i>
                </button>
                <span class="text-[11px] text-g-500 tabular-nums min-w-[56px] text-center select-none">
                  {{ pageText }}
                </span>
                <button
                  class="size-7 i-btn text-g-600"
                  :disabled="!canNextPage"
                  title="下一页"
                  @click="goNextPage"
                >
                  <i class="ri-arrow-right-s-line text-lg"></i>
                </button>
                <button
                  class="size-7 i-btn"
                  :class="setPop ? 'text-theme' : 'text-g-600'"
                  title="阅读设置"
                  @click.stop="setPop = !setPop"
                >
                  <i class="ri-equalizer-line"></i>
                </button>
                <button
                  class="size-7 i-btn"
                  :class="aiOpen ? 'text-theme' : 'text-g-600'"
                  title="AI 助手"
                  @click="aiOpen = !aiOpen"
                >
                  <i class="ri-chat-ai-line"></i>
                </button>
                <button
                  class="size-7 i-btn text-g-600"
                  title="更多"
                  @click="openCtx($event, readerMenu())"
                >
                  <i class="ri-more-2-fill"></i>
                </button>
              </div>
            </div>

            <!-- 阅读设置浮层 -->
            <transition name="pop">
              <div
                v-if="setPop"
                v-click-outside="() => (setPop = false)"
                class="pop right-2 top-[48px] w-[272px] p-3 flex-v gap-3 z-30"
                @click.stop
              >
                <div class="text-xs font-bold text-g-700">阅读方式</div>
                <div class="flex-c gap-1.5">
                  <button
                    v-for="m in layoutModes"
                    :key="m.key"
                    class="flex-1 h-8 flex-cc gap-1 rounded-custom-xs border text-[11px] tad-200 cursor-pointer"
                    :class="isModeOn(m) ? 'border-theme text-theme' : 'border-line-1 text-g-600'"
                    :title="m.title"
                    @click="pickMode(m)"
                  >
                    <i :class="m.icon"></i>
                    <span>{{ m.label }}</span>
                  </button>
                </div>

                <!-- PDF 缩放设置 -->
                <template v-if="!isTextBook">
                  <div class="border-t border-line"></div>
                  <div class="flex-cb">
                    <span class="text-xs text-g-600">缩放</span>
                    <div class="flex-c gap-1">
                      <button
                        class="px-1.5 h-6 rounded-custom-xs border text-[11px] tad-200 cursor-pointer"
                        :class="pdfFit === 'auto' ? 'border-theme text-theme' : 'border-line-1 text-g-600'"
                        title="自动：滚动时适宽、翻页时适页"
                        @click="setPdfFit('auto')"
                      >
                        自动
                      </button>
                      <button
                        class="px-1.5 h-6 rounded-custom-xs border text-[11px] tad-200 cursor-pointer"
                        :class="pdfFit === 'width' ? 'border-theme text-theme' : 'border-line-1 text-g-600'"
                        title="页宽铺满阅读区"
                        @click="setPdfFit('width')"
                      >
                        适宽
                      </button>
                      <button
                        class="px-1.5 h-6 rounded-custom-xs border text-[11px] tad-200 cursor-pointer"
                        :class="pdfFit === 'page' ? 'border-theme text-theme' : 'border-line-1 text-g-600'"
                        title="整页放得下"
                        @click="setPdfFit('page')"
                      >
                        适页
                      </button>
                    </div>
                  </div>
                  <div>
                    <div class="flex-cb text-xs text-g-600 mb-1">
                      <span>{{ pdfFit === 'auto' ? '跟随阅读方式' : '当前缩放' }}</span>
                      <span>{{ pdfEffPct }}%</span>
                    </div>
                    <input
                      type="range"
                      class="range-sm"
                      min="40"
                      max="260"
                      step="5"
                      :value="Math.min(260, Math.max(40, pdfEffPct))"
                      @input="onPdfZoom($event)"
                    />
                  </div>
                  <div>
                    <div class="flex-cb text-xs text-g-600 mb-1">
                      <span>页面旋转</span>
                      <span>{{ pdfRotate }}°</span>
                    </div>
                    <button
                      class="w-full h-7 rounded-custom-xs border border-line-1 text-[11px] text-g-600 tad-200 cursor-pointer"
                      title="顺时针转 90°"
                      @click="rotatePdf()"
                    >
                      <i class="ri-refresh-line mr-0.5"></i>顺时针转 90°
                    </button>
                  </div>
                </template>

                <!-- 页面主题 -->
                <div class="border-t border-line"></div>
                <div class="text-xs font-bold text-g-700">页面主题</div>
                <div class="flex-c gap-1.5">
                  <button
                    v-for="t in PAGE_THEMES"
                    :key="t.key"
                    class="flex-1 h-8 rounded-custom-xs border text-[11px] tad-200 cursor-pointer"
                    :class="pageTheme === t.key ? 'border-theme text-theme' : 'border-line-1 text-g-600'"
                    :style="{ background: t.bg, color: t.fg }"
                    @click="pageTheme = t.key"
                  >
                    {{ t.label }}
                  </button>
                </div>

                <!-- 字体排版设置 -->
                <template v-if="isTextBook">
                  <div class="text-xs font-bold text-g-700">字体</div>
                  <div class="flex-c gap-1.5">
                    <button
                      v-for="f in FONT_OPTIONS"
                      :key="f.key"
                      class="flex-1 py-1 text-xs rounded-custom-xs border tad-200 cursor-pointer"
                      :class="fontKey === f.key ? 'border-theme text-theme' : 'border-line-1 text-g-600'"
                      :style="{ fontFamily: f.css }"
                      @click="fontKey = f.key"
                    >
                      {{ f.label }}
                    </button>
                  </div>
                  <div>
                    <div class="flex-cb text-xs text-g-600 mb-1"><span>字号</span><span>{{ fontSize }}px</span></div>
                    <input type="range" class="range-sm" min="14" max="26" step="1" v-model.number="fontSize" />
                  </div>
                  <div>
                    <div class="flex-cb text-xs text-g-600 mb-1"><span>行距</span><span>{{ lineHeight.toFixed(1) }}</span></div>
                    <input type="range" class="range-sm" min="1.4" max="2.4" step="0.1" v-model.number="lineHeight" />
                  </div>
                  <div>
                    <div class="flex-cb text-xs text-g-600 mb-1">
                      <span>{{ scrollMode === 'page' ? '单页宽度' : '页宽' }}</span>
                      <span>{{ pageWidth }}px</span>
                    </div>
                    <input type="range" class="range-sm" min="420" max="880" step="20" v-model.number="pageWidth" />
                  </div>
                </template>

                <div class="border-t border-line"></div>
                <div v-if="focusAvailable" class="flex-cb">
                  <span class="text-xs text-g-600">精读</span>
                  <button
                    class="px-2 h-6 rounded-custom-xs border text-[11px] tad-200 cursor-pointer"
                    :class="focusOn ? 'border-theme text-theme' : 'border-line-1 text-g-600'"
                    :title="focusOn ? '关闭精读' : '开启精读（默认逐句）'"
                    @click="toggleFocusOn()"
                  >
                    <i class="ri-focus-3-line mr-0.5"></i>{{ focusOn ? '已开启' : '开启' }}
                  </button>
                </div>
                <div class="flex-cb">
                  <span class="text-xs text-g-600">深色界面</span>
                  <button
                    class="w-9 h-5 rounded-full tad-200 relative cursor-pointer"
                    :class="isDark ? 'bg-theme' : 'bg-g-300'"
                    @click="toggleDark"
                  >
                    <span
                      class="absolute top-0.5 size-4 rounded-full bg-white tad-200"
                      :class="isDark ? 'left-[18px]' : 'left-0.5'"
                    ></span>
                  </button>
                </div>
              </div>
            </transition>

            <!-- 正文区域 -->
            <div class="flex-1 min-h-0 relative overflow-hidden">
              <!-- 0. 双语对照视图（优先） -->
              <BilingualView
                v-if="curBook && curBook.bilingualActive"
                :paragraphs="curBook.bilingualParas || []"
                :is-translating="isTranslating"
                :translate-progress="translateProgress"
                @translate-all="translateCurrentBookAll"
                @translate-one="translateSingleParagraph"
                @export-md="exportCurrentBilingualMd"
                @export-pdf="exportCurrentBilingualPdf"
                @close="curBook.bilingualActive = false"
              />

              <!-- 1. PDF 文本流阅读模式 (Zotero-like 文本化阅读) -->
              <TextModeReader
                v-else-if="curBook && curBook.kind === 'pdf' && curBook.textModeActive"
                :markdown-content="curBook.textMarkdown || ''"
                :loading="textExtractLoading"
                :loading-text="textExtractLoadingText"
                :mineru-status="curBook.mineruStatus"
                :font-size="fontSize"
                :line-height="lineHeight"
                :page-width="pageWidth"
                :font-css="curFontCss"
                @open-bilingual="openBilingualFromTextMode"
                @run-mineru="runMinerUForCurrentBook"
                @re-extract-local="reExtractLocalForCurrentBook"
                @switch-to-canvas="curBook.textModeActive = false"
                @text-selected="onSelect"
              />

              <!-- 2. 原版 PDF 页面 Canvas 容器 -->
              <div
                v-else-if="curBook && curBook.kind === 'pdf'"
                ref="readerScroller"
                class="h-full scroll-y reader-surface"
                :class="{ 'pdf-invert': pdfInvert }"
                :data-ptheme="pageTheme"
                @scroll.passive="onReaderScroll"
                @mouseup="onSelect"
                @click="onReaderClick"
                @wheel="onWheel"
              >
                <div class="py-4 px-4" :class="[spread === 'double' ? 'pdf-row' : '', scrollMode === 'page' ? 'pdf-fit' : '']">
                  <div
                    v-for="p in pdfViewPages"
                    :key="p"
                    :id="'pdf-page-' + p"
                    class="pdf-page"
                    :style="pdfBoxStyle(p)"
                  >
                    <canvas v-if="pdfLive.has(p)" :ref="(el) => setCanvas(p, el as HTMLCanvasElement)"></canvas>
                  </div>
                </div>
                <div v-if="pdfLoading" class="text-center text-xs text-g-400 py-10">
                  <i class="ri-loader-4-line inline-block animate-spin mr-1"></i>正在渲染页面…
                </div>
                <div v-if="pdfError" class="text-center text-xs text-danger py-10">
                  <i class="ri-error-warning-line mr-1"></i>{{ pdfError }}
                </div>
              </div>

              <!-- 文本/EPUB：滚动模式 -->
              <div
                v-else-if="isTextBook && scrollMode === 'scroll'"
                ref="readerScroller"
                class="h-full scroll-y reader-surface"
                :data-ptheme="pageTheme"
                @scroll.passive="onReaderScroll"
                @mouseup="onSelect"
                @click="onReaderClick"
                @wheel="onWheel"
              >
                <div class="px-6 py-8">
                  <div
                    ref="readerBody"
                    :key="'s' + renderKey"
                    id="reader-body"
                    class="prose-page mx-auto"
                    :style="proseStyle"
                    v-html="curChapterHtml"
                  ></div>
                  <div v-if="epubError" class="text-center text-xs text-danger py-8">
                    <i class="ri-error-warning-line mr-1"></i>{{ epubError }}
                  </div>
                  <div v-else-if="!curChapterHtml" class="text-center text-xs text-g-400 py-10">
                    <i class="ri-loader-4-line inline-block animate-spin mr-1"></i>
                    {{ epubLoading ? '正在解析全书…' : '没有可显示的正文' }}
                  </div>
                </div>
              </div>

              <!-- 文本/EPUB：翻页模式 -->
              <div
                v-else-if="isTextBook"
                ref="readerScroller"
                class="h-full reader-surface relative overflow-hidden"
                :data-ptheme="pageTheme"
                @mouseup="onSelect"
                @click="onReaderClick"
                @wheel="onWheel"
              >
                <div ref="pagedStage" class="paged-stage">
                  <div
                    v-if="pagedGhost"
                    class="paged-ghost"
                    :class="{ 'no-anim': pagedNoAnim, fade: pagedGhostFade }"
                    :style="{ transform: 'translateX(' + pagedGhostDX + 'px)' }"
                  >
                    <div class="paged-clip" :style="pagedGhost.clipStyle">
                      <div class="prose-page paged-flow no-anim" :style="pagedGhost.flowStyle" v-html="pagedGhost.html"></div>
                    </div>
                  </div>
                  <div class="paged-clip" :class="{ 'no-anim': pagedNoAnim }" :style="pagedClipStyle">
                    <div
                      ref="readerBody"
                      :key="'p' + renderKey"
                      id="reader-body"
                      class="prose-page paged-flow"
                      :style="pagedStyle"
                      v-html="curChapterHtml"
                    ></div>
                  </div>
                </div>
                <div v-if="epubError" class="absolute inset-x-0 top-6 text-center text-xs text-danger">
                  <i class="ri-error-warning-line mr-1"></i>{{ epubError }}
                </div>
              </div>

              <!-- 不支持预览格式 -->
              <div v-else-if="curBook" class="h-full flex-cc flex-v gap-2 text-g-400 bg-card">
                <i class="ri-file-forbid-line text-3xl"></i>
                <div class="text-xs">浏览器无法直接解析 {{ curBook.ext.toUpperCase() }}，已入库但无法预览</div>
                <div class="t-mute">可导入 EPUB、PDF、TXT、Markdown 等格式查看</div>
              </div>

              <!-- 划词浮动条 -->
              <transition name="pop">
                <div
                  v-if="selPop.show"
                  class="sel-pop"
                  :style="{ left: selPop.x + 'px', top: selPop.y + 'px' }"
                  @mousedown.prevent
                >
                  <button
                    v-for="c in HL_COLORS"
                    :key="c.key"
                    class="size-6 flex-cc rounded-full border border-line-1 cursor-pointer"
                    :style="{ background: c.css }"
                    :title="'高亮：' + c.label"
                    @click="addHighlight(c.key)"
                  ></button>
                  <div class="v-line h-4 mx-0.5"></div>
                  <button class="sel-btn cursor-pointer" @click="addNote">
                    <i class="ri-edit-2-line"></i>笔记
                  </button>
                  <button class="sel-btn cursor-pointer" @click="askSelection">
                    <i class="ri-chat-ai-line"></i>问 AI
                  </button>
                  <button class="sel-btn cursor-pointer" @click="addVocab">
                    <i class="ri-translate-2"></i>生词
                  </button>
                  <button class="sel-btn cursor-pointer" @click="speakSelection">
                    <i class="ri-volume-up-line"></i>朗读
                  </button>
                  <button class="sel-btn cursor-pointer" @click="copySelection">
                    <i class="ri-file-copy-line"></i>复制
                  </button>
                </div>
              </transition>

              <!-- 批注点击浮层 -->
              <transition name="pop">
                <div
                  v-if="hlPop.show && hlPop.ann"
                  class="sel-pop max-w-[420px]"
                  :style="{ left: hlPop.x + 'px', top: hlPop.y + 'px' }"
                  @mousedown.prevent
                >
                  <span class="w-2.5 h-2.5 rounded-sm flex-none" :style="{ background: hlColorCss(hlPop.ann.color) }"></span>
                  <div class="min-w-0 max-w-[220px] px-1">
                    <div class="text-xs text-g-800 truncate">{{ hlPop.ann.text }}</div>
                    <div v-if="hlPop.ann.note" class="t-mute truncate">{{ hlPop.ann.note }}</div>
                  </div>
                  <div class="v-line h-4 mx-0.5"></div>
                  <button class="sel-btn cursor-pointer" @click="askAnnotation(hlPop.ann)">
                    <i class="ri-chat-ai-line"></i>问 AI
                  </button>
                  <button class="sel-btn cursor-pointer" @click="editAnnot(hlPop.ann)">
                    <i class="ri-edit-2-line"></i>{{ hlPop.ann.note ? '改笔记' : '写笔记' }}
                  </button>
                  <button class="sel-btn cursor-pointer" @click="copyAnnotation(hlPop.ann)">
                    <i class="ri-file-copy-line"></i>复制
                  </button>
                  <button class="sel-btn text-danger cursor-pointer" @click="delAnnot(hlPop.ann)">
                    <i class="ri-delete-bin-line"></i>
                  </button>
                </div>
              </transition>

              <!-- 精读浮条 -->
              <transition name="pop">
                <FocusBar
                  v-if="focusMode !== 'off' && focusTotal > 0"
                  :mode="focusMode"
                  :idx="focusIdx"
                  :total="focusTotal"
                  :speaking="speaking"
                  @prev="stepFocus(-1)"
                  @next="stepFocus(1)"
                  @speak="toggleSpeak()"
                  @unit="toggleFocusUnit()"
                  @close="setFocus('off')"
                />
              </transition>
            </div>
          </template>

          <div v-else class="flex-1 flex-cc flex-v gap-2 text-xs text-g-400 bg-card">
            <i class="ri-book-open-line text-2xl"></i>没有正在阅读的书
          </div>
        </div>

        <!-- 2.3 AI 侧面板（固定右侧） -->
        <div
          v-if="aiOpen && curBook"
          class="flex-none flex-v h-full overflow-hidden border-l border-line"
          :style="{ width: aiWidth + 'px' }"
        >
          <AiPanel
            :book="curBook"
            position="right"
            :chapter="chapterTitle"
            :selection="selPop.text"
            :messages="aiMessages"
            :busy="aiBusy"
            :memories="memories"
            :model="aiModel"
            :actions="aiActions"
            :models="aiModels"
            @update:model="aiModel = $event"
            @clear-selection="selPop.text = ''"
            @clear="clearAi"
            @drop="dropAiMsg"
            @ask="askAi($event, curBook, chapterTitle, progressText, selPop.text)"
            @action="runAiAction($event, curBook, chapterTitle, progressText, selPop.text)"
            @close="aiOpen = false"
            @resize-start="startResize('ai', $event)"
          />
        </div>
      </div>
    </template>

    <!-- 右键菜单 -->
    <div
      v-if="ctxMenu.items && ctxMenu.items.length"
      class="fixed z-[70] pop py-1 min-w-[150px]"
      :style="{ left: ctxMenu.x + 'px', top: ctxMenu.y + 'px' }"
      @contextmenu.prevent
    >
      <div
        v-for="(it, i) in ctxMenu.items"
        :key="i"
        class="menu-item"
        :class="it.danger ? 'text-danger' : 'text-g-700'"
        @click="runCtx(it)"
      >
        <i :class="it.icon"></i>{{ it.label }}
      </div>
    </div>

    <!-- 弹窗 -->
    <transition name="fade">
      <div
        v-if="modal.visible"
        class="fixed inset-0 z-[80] flex-cc bg-black/25"
        @click.self="modal.visible = false"
      >
        <div class="card w-[420px] max-w-[92vw] shadow-xl max-h-[86vh] flex-v">
          <div class="sec-head">
            <span class="text-sm">{{ modal.title }}</span>
            <button class="i-btn size-6 text-g-500 cursor-pointer" @click="modal.visible = false">
              <i class="ri-close-line"></i>
            </button>
          </div>
          <div class="p-4 flex-v gap-3 scroll-y">
            <div v-if="modal.desc" class="text-xs text-g-500 leading-relaxed">{{ modal.desc }}</div>
            <div v-if="modal.input" class="flex-v gap-1">
              <label class="text-xs text-g-600">{{ modal.input.label }}</label>
              <textarea
                v-if="modal.input.rows"
                v-model="modal.value"
                :rows="modal.input.rows"
                :placeholder="modal.input.placeholder"
                class="w-full text-sm resize-none"
              ></textarea>
              <input
                v-else
                v-model="modal.value"
                :placeholder="modal.input.placeholder"
                class="w-full text-sm"
              />
            </div>
            <div v-if="modal.kv && modal.kv.length" class="flex-v gap-1.5">
              <div v-for="row in modal.kv" :key="row.k" class="flex-c gap-2 text-xs">
                <span class="w-16 flex-none text-g-500">{{ row.k }}</span>
                <span class="flex-1 text-g-800 break-all">{{ row.v }}</span>
              </div>
            </div>
          </div>
          <div class="flex-none flex-c justify-end gap-2 px-4 py-3 border-t border-line">
            <button class="btn px-3 py-1.5 text-xs" @click="modal.visible = false">
              {{ modal.cancelText || '取消' }}
            </button>
            <button
              class="px-3 py-1.5 text-xs rounded-custom-xs bg-theme text-white hover:opacity-90 cursor-pointer"
              @click="confirmModal"
            >
              {{ modal.confirmText || '确定' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Toast 提示 -->
    <div class="fixed top-4 left-1/2 -translate-x-1/2 z-[90] flex flex-col items-center gap-2 pointer-events-none">
      <transition-group name="toast">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="px-4 py-2 rounded-custom-sm text-sm shadow-lg border flex-c gap-2 pointer-events-auto"
          :class="{
            'bg-box-2 border-line text-g-800': t.type === 'info',
            'bg-[var(--art-success)] text-white border-transparent': t.type === 'success',
            'bg-[var(--art-warning)] text-white border-transparent': t.type === 'warning',
            'bg-[var(--art-danger)] text-white border-transparent': t.type === 'error'
          }"
        >
          <i
            :class="{
              'ri-information-line': t.type === 'info',
              'ri-checkbox-circle-line': t.type === 'success',
              'ri-error-warning-line': t.type === 'warning' || t.type === 'error'
            }"
          ></i>
          {{ t.text }}
        </div>
      </transition-group>
    </div>
    <!-- 独立 Markdown 笔记弹窗 -->
    <NotesModal
      v-if="notesModalOpen && notesModalBook"
      :book="notesModalBook"
      :dir-name="dirName"
      :markdown-text="notesModalMarkdown"
      @close="notesModalOpen = false"
      @bind-dir="bindDirFromModal"
      @export-current="exportCurrentNotesFromModal"
      @export-all="exportAllNotesFromModal"
    />

    <!-- 学术 API 配置弹窗 (MinerU / Gemini) -->
    <ApiSettingsModal
      v-if="apiModalOpen"
      @close="apiModalOpen = false"
      @saved="onApiSettingsSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, reactive, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import type { Annotation, Book, ContextMenuItem, TabItem, TocItem, BilingualParagraph } from './types/reader';
import { BOOK_EXTS, EXT_KIND, HL_COLORS, PAGED_GAP, CHAPTER_SLIDE_MS, ACCEPT } from './utils/constants';
import { clamp, extOf, baseName, fmtSize, fmtDate, uid } from './utils/helpers';
import { getPdfjsLib } from './utils/engines';
import {
  parseTextChapters,
  nestByLevel,
  textBodyHtml,
  applyEpubCss,
  epubCssText,
  assetUrl
} from './utils/bookParsers';
import { parseEpub, buildEpubToc, epubChapterHtml } from './utils/epubReader';
import { vClickOutside } from './directives/clickOutside';
import { useReaderSettings } from './composables/useReaderSettings';
import { useAiChat } from './composables/useAiChat';
import { useModalAndToast } from './composables/useModalAndToast';

import ShelfView from './components/ShelfView.vue';
import NavPanel from './components/NavPanel.vue';
import AiPanel from './components/AiPanel.vue';
import FocusBar from './components/FocusBar.vue';
import BilingualView from './components/BilingualView.vue';
import TextModeReader from './components/TextModeReader.vue';
import NotesModal from './components/NotesModal.vue';
import ApiSettingsModal from './components/ApiSettingsModal.vue';
import { useLocalNotes } from './composables/useLocalNotes';
import { useBilingualTranslate } from './composables/useBilingualTranslate';
import { saveBookToDb, loadAllBooksFromDb, deleteBookFromDb } from './utils/storage';
import { extractPdfToMarkdown, requestMinerUParse } from './utils/pdfTextExtractor';
import { createSampleAcademicPaper } from './utils/sampleData';

const {
  isDark, pageTheme, fontKey, fontSize, lineHeight, pageWidth,
  scrollMode, spread, pageIdx, textPageCount, pagedH, scrollPercent,
  toggleDark, proseStyle, pdfInvert, PAGE_THEMES, FONT_OPTIONS
} = useReaderSettings();

const {
  aiMessages, aiBusy, aiModel, memories, aiActions, aiModels,
  pushMemory, askAi, runAiAction, clearAi, dropAiMsg
} = useAiChat();

const {
  toasts, ctxMenu, modal,
  toast, openModal, confirmModal, openCtx, runCtx, closeCtx
} = useModalAndToast();

const {
  dirName, dirHandle, isSyncing: notesSyncing,
  bindNotesDirectory, syncBookNotes, exportBookNotes, exportAllNotesZip, generateBookMarkdown
} = useLocalNotes();

const {
  isTranslating, translateProgress,
  segmentIntoBilingualParas, translateBookParas, translateSinglePara,
  exportBilingualMarkdown, exportBilingualPdf
} = useBilingualTranslate();

const SHELF_TAB = '#shelf';
const activeTabId = ref(SHELF_TAB);
const books = ref<Book[]>([]);
const openIds = ref<string[]>([]);
const isMobile = ref(false);

const notesModalOpen = ref(false);
const notesModalBook = ref<Book | null>(null);
const notesModalMarkdown = ref('');
const apiModalOpen = ref(false);
const textExtractLoading = ref(false);
const textExtractLoadingText = ref('');

const curFontCss = computed(() => {
  return (FONT_OPTIONS.find((f) => f.key === fontKey.value) || FONT_OPTIONS[0]).css;
});

const shelfSort = ref('recent');
const shelfKeyword = ref('');
const shelfGrid = ref(true);

const navOpen = ref(true);
const navTab = ref('toc');
const navWidth = ref(248);
const aiOpen = ref(true);
const aiWidth = ref(384);
const setPop = ref(false);

const readerScroller = ref<HTMLElement | null>(null);
const readerBody = ref<HTMLElement | null>(null);
const pagedStage = ref<HTMLElement | null>(null);
const pdfStageW = ref(0);
const pdfStageH = ref(0);
const pagedStageW = ref(0);

const selPop = reactive({ show: false, x: 0, y: 0, text: '', rect: null });
const hlPop = reactive<{ show: boolean; x: number; y: number; ann: Annotation | null }>({
  show: false,
  x: 0,
  y: 0,
  ann: null
});
const renderKey = ref(0);
const focusMode = ref<'off' | 'sentence' | 'para'>('off');
const focusIdx = ref(0);
const focusTotal = ref(0);
const focusOn = computed(() => focusMode.value !== 'off');
const speaking = ref(false);
let speakSeq = 0;
const pagedColsCache = new Map<string, number>();

const pdfDoc = shallowRef<any>(null);
const pdfPages = ref<number[]>([]);
const pdfPage = ref(1);
const pdfTotal = ref(0);
const pdfLoading = ref(false);
const pdfError = ref('');
const thumbs = ref<Array<{ page: number; dataUrl: string }>>([]);
const canvasMap: Record<number, HTMLCanvasElement> = {};
const pdfNaturalW = ref(595);
const pdfNaturalH = ref(842);
const pdfRatio = ref(1.414);
const pdfRotate = ref(0);
const pdfLive = ref(new Set<number>());
const pdfFit = ref<'auto' | 'width' | 'page' | 'custom'>('auto');
const pdfZoomPct = ref(100);
const PDF_PAD = 16;
const PDF_GAP = 14;
let pdfWinSig = '';
let pdfWinTimer: any = 0;
const pdfJobs: Record<number, boolean> = {};
const pdfRequeue: Record<number, boolean> = {};
let pdfTextLayers: Record<number, HTMLElement> = {};
const pdfRenderTag = ref(0);

const epubError = ref('');
const epubLoading = ref(false);
const epubStore: Record<string, any> = {};
const epubPending: Record<string, Promise<any>> = {};

const bookSections = ref<Array<{ id: string; label: string; html: string }>>([]);
const decorKey = ref('');
const sectionHtml = ref('');
const sectionsCache: Record<string, Array<{ id: string; label: string; html: string }>> = {};
let pendingPageRatio: number | null = null;
let chBusy = false;
const EDGE_SLOP = 2;
let lastAdvanceAt = 0;
const ADVANCE_COOL = 420;
let landedTop = 0;

const textIdx = ref(0);
const readMinutes = ref(0);
let readTimer: any = null;

const curId = computed(() => (activeTabId.value === SHELF_TAB ? '' : activeTabId.value));
const curBook = computed(() => books.value.find((b) => b.id === curId.value) || null);
const openBooks = computed(() =>
  openIds.value.map((id) => books.value.find((b) => b.id === id)).filter(Boolean) as Book[]
);

const tabs = computed<TabItem[]>(() => [
  { id: SHELF_TAB, title: '书架', icon: 'ri-book-shelf-line', fixed: true },
  ...openBooks.value.map((b) => ({
    id: b.id,
    title: b.title,
    icon: formatIcon(b.ext),
    fixed: false,
    book: b
  }))
]);

const stats = computed(() => {
  const tot = books.value.length;
  const reading = books.value.filter((b) => b.progress > 0 && b.progress < 1).length;
  const done = books.value.filter((b) => b.progress >= 1).length;
  const annotations = books.value.reduce((n, b) => n + b.annotations.length, 0);
  const vocabs = books.value.reduce((n, b) => n + b.vocabs.length, 0);
  return { total: tot, reading, done, annotations, vocabs, todayMinutes: readMinutes.value };
});

const chapterTitle = computed(() => {
  const b = curBook.value;
  if (!b) return '';
  if (b.kind === 'epub' || b.kind === 'text') {
    const list = b.chapters || b.toc;
    return list[textIdx.value] ? list[textIdx.value].label : '';
  }
  return '';
});

const progressText = computed(() => {
  const b = curBook.value;
  if (!b) return '';
  if (b.kind === 'pdf') return `第 ${pdfPage.value} / ${pdfTotal.value || b.pageCount || '?'} 页`;
  if (b.kind === 'epub' || b.kind === 'text') {
    const list = b.chapters || b.toc;
    return `第 ${textIdx.value + 1} / ${Math.max(list.length, 1)} 章`;
  }
  return '无法预览';
});

const navMenu = computed(() => ({
  label: curBook.value ? curBook.value.title : '目录',
  sub: progressText.value,
  head: '切换书籍',
  items: books.value.map((b) => ({
    id: b.id,
    label: `${b.title} · ${Math.round((b.progress || 0) * 100)}%`,
    active: b.id === curId.value
  }))
}));

function switchBookById(id: string) {
  const b = books.value.find((x) => x.id === id);
  if (b) openBook(b);
}

function formatIcon(ext: string): string {
  const map: Record<string, string> = {
    pdf: 'ri-file-pdf-2-line',
    epub: 'ri-book-2-line',
    txt: 'ri-file-text-line',
    md: 'ri-markdown-line',
    mobi: 'ri-book-3-line',
    azw3: 'ri-book-3-line',
    fb2: 'ri-file-code-line',
    cbz: 'ri-image-2-line',
    cbr: 'ri-image-2-line'
  };
  return map[ext] || 'ri-file-line';
}

const isTextBook = computed(() => {
  const b = curBook.value;
  return !!b && (b.kind === 'epub' || b.kind === 'text');
});

const focusAvailable = computed(() => isTextBook.value);

const layoutModes = [
  { key: 'scroll', label: '滚动', title: '章内滚动，滚到章末自动进下一章', icon: 'ri-arrow-up-down-line' },
  { key: 'single', label: '单页', title: '单页翻页', icon: 'ri-checkbox-blank-line' },
  { key: 'double', label: '双页', title: '双页并排', icon: 'ri-layout-2-line' }
];

const isModeOn = (m: any) =>
  m.key === 'scroll' ? scrollMode.value === 'scroll' : scrollMode.value === 'page' && spread.value === m.key;

function pickMode(m: any) {
  if (m.key === 'scroll') {
    setScrollMode('scroll');
  } else {
    setScrollMode('page');
    setSpread(m.key);
  }
}

function setPdfFit(f: 'auto' | 'width' | 'page' | 'custom') {
  if (pdfFit.value === f) return;
  pdfFit.value = f;
  if (f === 'custom') pdfZoomPct.value = clamp(pdfEffPct.value, 40, 260);
  pdfWinSig = '';
}

function onPdfZoom(e: any) {
  const v = clamp(Number(e.target.value) || 100, 40, 260);
  pdfFit.value = 'custom';
  pdfZoomPct.value = v;
  pdfWinSig = '';
}

function rotatePdf() {
  if (!pdfDoc.value) return;
  pdfRotate.value = (pdfRotate.value + 90) % 360;
  pdfRenderTag.value++;
  pdfWinSig = '';
  const anchor = pdfPage.value;
  nextTick(async () => {
    measureStage();
    await renderVisible();
    if (scrollMode.value === 'scroll') await anchorPdfPage(anchor);
  });
}

const chapterCount = computed(() => {
  const b = curBook.value;
  if (!b) return 0;
  if (b.kind === 'epub' || b.kind === 'text') return Math.max((b.chapters || b.toc).length, 1);
  if (b.kind === 'pdf') return b.toc ? b.toc.length : 0;
  return 0;
});

const curChapterIdx = computed(() => {
  const b = curBook.value;
  if (!b) return -1;
  if (b.kind === 'pdf') {
    const toc = b.toc || [];
    let hit = -1;
    for (let i = 0; i < toc.length; i++) {
      const p = toc[i].page || 0;
      if (p && p <= pdfPage.value) hit = i;
    }
    return hit;
  }
  return textIdx.value;
});

const canPrevChapter = computed(() => chapterCount.value > 0 && curChapterIdx.value > 0);
const canNextChapter = computed(() => {
  const n = chapterCount.value;
  return n > 0 && curChapterIdx.value >= 0 && curChapterIdx.value < n - 1;
});

const pdfCols = computed(() => {
  const want = spread.value === 'double' ? 2 : 1;
  const avail = (pdfStageW.value || 900) - 32;
  if (want === 2 && 300 * 2 + 14 > avail) return 1;
  return want;
});

const pdfPerRow = pdfCols;

const pdfViewPages = computed(() => {
  const b = curBook.value;
  if (!b || b.kind !== 'pdf') return [];
  if (scrollMode.value === 'scroll') return pdfPages.value;
  const n = pdfCols.value;
  const start = pageIdx.value * n + 1;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const p = start + i;
    if (p <= pdfTotal.value) out.push(p);
  }
  return out;
});

const pdfFitEff = computed(() => {
  if (pdfFit.value !== 'auto') return pdfFit.value;
  return scrollMode.value === 'page' ? 'page' : 'width';
});

const pdfVisW = computed(() => (pdfRotate.value % 180 === 90 ? pdfNaturalH.value : pdfNaturalW.value) || 595);
const pdfVisRatio = computed(() => {
  if (pdfRotate.value % 180 !== 90) return pdfRatio.value || 1.414;
  return 1 / (pdfRatio.value || 1.414);
});

const pdfPageWidth = computed(() => {
  const stageW = pdfStageW.value || 900;
  const stageH = pdfStageH.value || 800;
  const n = pdfCols.value;
  const availW = Math.max(240, stageW - 32 - PDF_GAP * (n - 1));
  const perW = availW / n;
  const fit = pdfFitEff.value;
  let w: number;
  if (fit === 'page') {
    const availH = Math.max(220, stageH - 32);
    w = Math.min(perW, availH / pdfVisRatio.value);
  } else if (fit === 'custom') {
    w = Math.min(perW, pdfVisW.value * (pdfZoomPct.value / 100));
  } else {
    w = perW;
  }
  return Math.max(120, Math.floor(w));
});

const pdfEffPct = computed(() => clamp(Math.round((pdfPageWidth.value / pdfVisW.value) * 100), 1, 999));
const pdfGhostH = computed(() => Math.max(80, Math.round(pdfPageWidth.value * pdfVisRatio.value)));
const pdfRowH = computed(() => pdfGhostH.value + PDF_GAP);

function pdfOffsetOf(p: number) {
  return PDF_PAD + Math.floor((p - 1) / pdfPerRow.value) * pdfRowH.value;
}

function pdfPageAt(offset?: number): number {
  const sc = readerScroller.value;
  const total = pdfTotal.value || 1;
  if (!sc) return clamp(pdfPage.value || 1, 1, total);
  const target = sc.getBoundingClientRect().top + (offset === undefined ? 8 : offset);
  let lo = 1;
  let hi = total;
  let ans = 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const el = document.getElementById('pdf-page-' + mid);
    if (!el) break;
    if (el.getBoundingClientRect().top <= target) {
      ans = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return clamp(ans, 1, total);
}

function pdfBoxStyle(p: number) {
  const s: Record<string, string> = { width: pdfPageWidth.value + 'px' };
  if (!pdfLive.value.has(p)) s.height = pdfGhostH.value + 'px';
  return s;
}

function pdfWindowRange(): number[] {
  const sc = readerScroller.value;
  const total = pdfTotal.value;
  const per = pdfPerRow.value;
  if (!sc || !total || !per) return [];
  const cur = pdfPageAt();
  const rowsOnScreen = Math.ceil(sc.clientHeight / pdfRowH.value) + 1;
  const firstRow = Math.max(0, Math.floor((cur - 1) / per) - 1);
  const out: number[] = [];
  for (let r = firstRow; r < firstRow + rowsOnScreen + 1; r++) {
    for (let k = 0; k < per; k++) {
      const p = r * per + k + 1;
      if (p >= 1 && p <= total) out.push(p);
    }
  }
  return out;
}

const pageCount = computed(() => {
  const b = curBook.value;
  if (!b) return 1;
  if (b.kind === 'pdf') return Math.max(pdfTotal.value || b.pageCount || 1, 1);
  if (isTextBook.value) return scrollMode.value === 'page' ? Math.max(textPageCount.value, 1) : 1;
  return 1;
});

const curPageNo = computed(() => {
  const b = curBook.value;
  if (!b) return 0;
  return b.kind === 'pdf' ? pdfPage.value : pageIdx.value + 1;
});

const pageText = computed(() => {
  const b = curBook.value;
  if (!b) return '—';
  if (b.kind === 'pdf' || scrollMode.value === 'page') return `${curPageNo.value} / ${pageCount.value}`;
  return `${scrollPercent.value}%`;
});

const canPrevPage = computed(() => curPageNo.value > 1 || canPrevChapter.value);
const canNextPage = computed(() => curPageNo.value < pageCount.value || canNextChapter.value);

const pagedCols = computed(() => {
  const want = spread.value === 'double' ? 2 : 1;
  const stageW = pagedStageW.value || 900;
  if (want === 2 && 300 * 2 + PAGED_GAP > stageW - 48) return 1;
  return want;
});

const pagedPW = computed(() => {
  const n = pagedCols.value;
  const stageW = pagedStageW.value || 900;
  const avail = Math.floor((stageW - 48 - (n - 1) * PAGED_GAP) / n);
  return Math.max(260, Math.floor(Math.min(pageWidth.value, avail)));
});

const pagedClipW = computed(() => pagedCols.value * pagedPW.value + (pagedCols.value - 1) * PAGED_GAP);
const pagedStep = computed(() => pagedCols.value * (pagedPW.value + PAGED_GAP));
const pagedClipDX = ref(0);
let chapterSlideTimer: any = 0;

const pagedGhost = ref<any>(null);
const pagedGhostDX = ref(0);
const pagedGhostFade = ref(false);
const pagedNoAnim = ref(false);

const pagedClipStyle = computed(() => ({
  '--ph': pagedH.value + 'px',
  '--pw': pagedPW.value + 'px',
  '--pg': PAGED_GAP + 'px',
  width: pagedClipW.value + 'px',
  transform: `translateX(${pagedClipDX.value}px)`
}));

const pagedStyle = computed(() => {
  const n = pagedCols.value;
  const pw = pagedPW.value;
  return {
    width: pagedClipW.value + 'px',
    transform: `translateX(${-pageIdx.value * n * (pw + PAGED_GAP)}px)`,
    fontFamily: (FONT_OPTIONS.find((f) => f.key === fontKey.value) || FONT_OPTIONS[0]).css,
    fontSize: fontSize.value + 'px',
    lineHeight: lineHeight.value
  };
});

const curChapterHtml = computed(() => {
  const b = curBook.value;
  if (!b || !(b.kind === 'epub' || b.kind === 'text')) return '';
  return sectionHtml.value;
});

function sectionBlock(sec: any) {
  return `<section class="chap" id="sec-${sec.id}" data-toc="${sec.id}">${sec.html || ''}</section>`;
}

function syncProgress() {
  const b = curBook.value;
  if (!b) return;
  const total = chapterCount.value || 1;
  b.progress = clamp((textIdx.value + 1) / total, 0, 1);
  b.locationLabel = `第 ${textIdx.value + 1} / ${total} 章`;
}

function scrollChapterFraction() {
  const sc = readerScroller.value;
  if (!sc) return 0;
  const max = sc.scrollHeight - sc.clientHeight;
  if (max <= 1) return 1;
  return clamp(sc.scrollTop / max, 0, 1);
}

function markScrollProgress() {
  const b = curBook.value;
  if (!b) return;
  const frac = scrollChapterFraction();
  scrollPercent.value = Math.round(frac * 100);
  const total = Math.max(chapterCount.value, 1);
  b.progress = clamp((textIdx.value + frac) / total, 0, 1);
  b.locationLabel = `第 ${textIdx.value + 1} / ${total} 章`;
  b.readIndex = textIdx.value;
}

function markPageProgress() {
  const b = curBook.value;
  if (!b || b.kind === 'pdf') return;
  const total = Math.max(chapterCount.value, 1);
  const frac = textPageCount.value > 1 ? pageIdx.value / (textPageCount.value - 1) : 0;
  b.progress = clamp((textIdx.value + frac) / total, 0, 1);
  b.locationLabel = `第 ${textIdx.value + 1} / ${total} 章`;
  b.readIndex = textIdx.value;
}

function advanceChapter(d: number, fromWheel?: boolean): boolean {
  if (chBusy || speaking.value || !isTextBook.value) return false;
  const t = Date.now();
  if (fromWheel && t - lastAdvanceAt < ADVANCE_COOL) return false;
  const target = clamp(textIdx.value + d, 0, Math.max(chapterCount.value - 1, 0));
  if (target === textIdx.value) return false;
  lastAdvanceAt = t;
  chBusy = true;
  goChapter(d, { pos: d > 0 ? 'top' : 'bottom' }).finally(() => {
    setTimeout(() => {
      chBusy = false;
    }, 200);
  });
  return true;
}

function scrollEdge(dir: number): boolean {
  const sc = readerScroller.value;
  if (!sc) return false;
  const max = sc.scrollHeight - sc.clientHeight;
  if (dir > 0) return max <= EDGE_SLOP || sc.scrollTop >= max - EDGE_SLOP;
  return sc.scrollTop <= EDGE_SLOP;
}

function warmChapterImages(idx: number) {
  const b = curBook.value;
  if (!b || b.kind !== 'epub') return;
  const data = epubStore[b.id];
  const sec = bookSections.value[idx];
  if (!data || !sec) return;
  const re = /data-epub-src=(?:"([^"]+)"|'([^']+)')/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(String(sec.html || '')))) {
    const p = m[1] || m[2];
    if (p && !data.blobs[p]) assetUrl(data, p);
  }
}

function warmNeighborImages(idx: number) {
  warmChapterImages(idx - 1);
  warmChapterImages(idx + 1);
}

function openBook(b: Book) {
  if (!b) return;
  if (!openIds.value.includes(b.id)) openIds.value.push(b.id);
  b.lastReadAt = Date.now();
  if (activeTabId.value === b.id) {
    nextTick(() => loadBook(b));
  } else {
    activeTabId.value = b.id;
  }
}

function closeTab(id: string) {
  const i = openIds.value.indexOf(id);
  if (i >= 0) openIds.value.splice(i, 1);
  if (activeTabId.value === id) {
    activeTabId.value = openIds.value[Math.max(0, i - 1)] || SHELF_TAB;
  }
}

function activateTab(id: string) {
  if (id === SHELF_TAB) {
    activeTabId.value = SHELF_TAB;
    return;
  }
  const b = books.value.find((x) => x.id === id);
  if (b) openBook(b);
}

function backToShelf() {
  activateTab(SHELF_TAB);
}

function removeBook(b: Book) {
  const data = epubStore[b.id];
  if (data) {
    Object.keys(data.blobs).forEach((k) => URL.revokeObjectURL(data.blobs[k]));
    delete epubStore[b.id];
  }
  delete epubPending[b.id];
  books.value = books.value.filter((x) => x.id !== b.id);
  deleteBookFromDb(b.id);
  closeTab(b.id);
  toast('已从书架移除', 'success');
}

const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.multiple = true;
fileInput.accept = ACCEPT;
fileInput.style.display = 'none';
document.body.appendChild(fileInput);
fileInput.addEventListener('change', () => {
  addFiles(Array.from(fileInput.files || []));
  fileInput.value = '';
});

const dirInput = document.createElement('input');
dirInput.type = 'file';
dirInput.multiple = true;
(dirInput as any).webkitdirectory = true;
dirInput.style.display = 'none';
document.body.appendChild(dirInput);
dirInput.addEventListener('change', () => {
  addFiles(Array.from(dirInput.files || []));
  dirInput.value = '';
});

async function pickFiles() {
  if ((window as any).showOpenFilePicker) {
    try {
      const handles = await (window as any).showOpenFilePicker({
        multiple: true,
        types: [
          {
            description: '电子书',
            accept: BOOK_EXTS.reduce((m: any, e) => {
              m['.' + e] = [];
              return m;
            }, {})
          }
        ]
      });
      const files: File[] = [];
      for (const h of handles) files.push(await h.getFile());
      addFiles(files);
      return;
    } catch (e: any) {
      if (e && e.name === 'AbortError') return;
    }
  }
  fileInput.click();
}

async function pickDir() {
  if ((window as any).showDirectoryPicker) {
    try {
      const dir = await (window as any).showDirectoryPicker();
      const files: File[] = [];
      for await (const [name, h] of (dir as any).entries()) {
        if (h.kind !== 'file') continue;
        if (BOOK_EXTS.indexOf(extOf(name)) === -1) continue;
        files.push(await h.getFile());
      }
      addFiles(files);
      return;
    } catch (e: any) {
      if (e && e.name === 'AbortError') return;
    }
  }
  dirInput.click();
}

function onDropFiles(files: File[]) {
  addFiles(files || []);
}

function makeBook(file: File): Book {
  const ext = extOf(file.name);
  return {
    id: uid(),
    title: baseName(file.name).replace(/[_·—]+/g, ' ').trim() || file.name,
    author: '',
    ext,
    kind: EXT_KIND[ext] || 'other',
    size: file.size,
    file,
    url: null,
    cover: null,
    toc: [],
    curTocId: '',
    annotations: [],
    marks: [],
    vocabs: [],
    progress: 0,
    locationLabel: '',
    addedAt: Date.now(),
    lastReadAt: 0
  };
}

async function addFiles(files: File[]) {
  const list = files.filter((f) => BOOK_EXTS.indexOf(extOf(f.name)) !== -1);
  const skipped = files.length - list.length;
  if (!list.length) {
    toast(skipped ? '这些文件不是电子书格式' : '没有选中文件', 'warning');
    return;
  }
  for (const f of list) {
    if (books.value.some((b) => b.title === baseName(f.name) && b.size === f.size)) continue;
    const b = makeBook(f);
    try {
      b.fileData = await f.arrayBuffer();
    } catch {}
    books.value.push(b);
    saveBookToDb(b);
  }
  toast(`已加入 ${list.length} 本${skipped ? `，跳过 ${skipped} 个非电子书文件` : ''}`, 'success');
  for (const b of books.value) {
    if (b.cover || b.toc.length || b.kind === 'other') continue;
    enrich(b);
  }
}

async function enrich(b: Book) {
  try {
    if (b.kind === 'pdf') {
      const pdfjs = await getPdfjsLib();
      if (!pdfjs || !b.file) return;
      const buf = await b.file.arrayBuffer();
      const doc = await pdfjs.getDocument({ data: buf }).promise;
      b.pageCount = doc.numPages;
      b.cover = await renderPdfCover(doc);
      try {
        const ol = await doc.getOutline();
        if (ol && ol.length) {
          b.toc = flattenOutline(ol).slice(0, 300);
          for (const it of b.toc) {
            if (!it.dest) continue;
            try {
              const d = Array.isArray(it.dest) ? it.dest : await doc.getDestination(it.dest);
              if (!d || d[0] === undefined) continue;
              const pi = typeof d[0] === 'number' ? d[0] : await doc.getPageIndex(d[0]);
              if (pi >= 0) {
                it.page = pi + 1;
                it.kind = 'page';
              }
            } catch {}
          }
        }
      } catch {}
      if (!b.toc.length) {
        b.toc = Array.from({ length: Math.min(doc.numPages, 200) }, (_, i) => ({
          id: 'p' + (i + 1),
          label: '第 ' + (i + 1) + ' 页',
          level: 1,
          kind: 'page',
          page: i + 1
        }));
      }
      doc.destroy();
    } else if (b.kind === 'epub') {
      const data = await readEpub(b);
      if (data.title) b.title = data.title;
      if (data.author) b.author = data.author;
      b.chapterCount = data.chapters.length;
      b.toc = await buildEpubToc(b, data);
      if (data.coverPath) {
        const url = await assetUrl(data, data.coverPath);
        if (url) b.cover = url;
      }
    } else if (b.kind === 'text') {
      if (!b.file) return;
      const txt = await b.file.text();
      b.rawText = txt;
      const heads = parseTextChapters(txt);
      b.toc = nestByLevel(
        heads.map((h, i) => ({
          id: 'h' + i,
          label: h.title,
          level: h.level,
          kind: 'chapter',
          index: i,
          chapterIndex: i,
          fragment: '',
          pid: '',
          hasChildren: false
        }))
      );
      b.chapters = b.toc;
      const m = txt.match(/(?:作者|Author)\s*[:：]\s*([^\n]{1,30})/);
      if (m) b.author = m[1].trim();
    }
  } catch {}
  saveBookToDb(b);
}

function flattenOutline(items: any[], level = 1, out: TocItem[] = [], pid = ''): TocItem[] {
  for (const it of items) {
    const kids = it.items && it.items.length ? it.items : [];
    const id = 'ol-' + out.length;
    out.push({
      id,
      label: it.title || '未命名',
      level: Math.min(level, 3),
      kind: 'dest',
      dest: it.dest,
      pid: pid || '',
      hasChildren: kids.length > 0
    });
    if (kids.length) flattenOutline(kids, level + 1, out, id);
  }
  return out;
}

async function renderPdfCover(doc: any): Promise<string | null> {
  try {
    const page = await doc.getPage(1);
    const vp = page.getViewport({ scale: 1 });
    const scale = Math.min(300 / vp.width, 420 / vp.height);
    const v = page.getViewport({ scale });
    const cv = document.createElement('canvas');
    cv.width = v.width;
    cv.height = v.height;
    await page.render({ canvasContext: cv.getContext('2d'), viewport: v }).promise;
    return cv.toDataURL('image/jpeg', 0.72);
  } catch {
    return null;
  }
}

async function readEpub(b: Book): Promise<any> {
  if (epubStore[b.id]) return epubStore[b.id];
  if (!epubPending[b.id]) {
    epubPending[b.id] = parseEpub(b)
      .then((d) => {
        epubStore[b.id] = d;
        delete epubPending[b.id];
        return d;
      })
      .catch((e) => {
        delete epubPending[b.id];
        throw e;
      });
  }
  return epubPending[b.id];
}

async function loadBook(b: Book) {
  if (!b) return;
  selPop.show = false;
  hlPop.show = false;
  setPop.value = false;
  stopSpeak();
  focusMode.value = 'off';
  focusTotal.value = 0;
  focusIdx.value = 0;
  pageIdx.value = 0;
  textPageCount.value = 1;
  scrollPercent.value = 0;
  applyEpubCss('');
  pdfWinSig = '';
  clearTimeout(pdfWinTimer);
  pdfWinTimer = 0;

  if (b.kind === 'pdf') {
    await loadPdf(b);
    await nextTick();
    measureStage();
    return;
  }
  if (b.kind !== 'epub' && b.kind !== 'text') return;
  epubError.value = '';
  epubLoading.value = true;
  bookSections.value = [];
  sectionHtml.value = '';
  try {
    const secs = await buildSections(b);
    if (curBook.value !== b) return;
    bookSections.value = secs;
    let idx = 0;
    if (b.curTocId) {
      const k = secs.findIndex((x) => x.id === b.curTocId);
      if (k >= 0) idx = k;
    } else idx = clamp(b.readIndex || 0, 0, Math.max(secs.length - 1, 0));
    const total = Math.max(secs.length, 1);
    const ratio = clamp((b.progress || 0) * total - idx, 0, 1);
    await openChapter(idx, { pos: ratio, ratio });
  } catch (e: any) {
    epubError.value = e?.message || '无法解析本书';
  }
  epubLoading.value = false;
}

async function buildSections(b: Book) {
  if (b.kind === 'epub') {
    const data = await readEpub(b);
    applyEpubCss(await epubCssText(data));
  }
  if (sectionsCache[b.id]) return sectionsCache[b.id];
  const list: Array<{ id: string; label: string; html: string }> = [];
  if (b.kind === 'epub') {
    const data = await readEpub(b);
    if (!b.toc.length) b.toc = await buildEpubToc(b, data);
    if (!b.chapters) {
      b.chapters = data.chapters.map((_c: any, i: number) => ({ id: 'c' + i, label: '第 ' + (i + 1) + ' 章', index: i }));
    }
    const chs = data.chapters;
    for (let i = 0; i < chs.length; i++) {
      list.push({
        id: 'c' + i,
        label: (b.chapters[i] && b.chapters[i].label) || '第 ' + (i + 1) + ' 章',
        html: await epubChapterHtml(b, data, i)
      });
      if (i % 4 === 3) await new Promise((r) => setTimeout(r, 0));
    }
  } else {
    applyEpubCss('');
    if (!b.rawText && b.file) {
      try {
        b.rawText = await b.file.text();
      } catch {
        b.rawText = '';
      }
      await enrich(b);
    }
    const chs = parseTextChapters(b.rawText || '');
    const lines = (b.rawText || '').split(/\r?\n/);
    b.toc = nestByLevel(
      chs.map((c, i) => ({
        id: 'c' + i,
        label: c.title,
        level: c.level || 1,
        kind: 'chapter',
        index: i,
        chapterIndex: i,
        fragment: '',
        pid: '',
        hasChildren: false
      }))
    );
    b.chapters = b.toc;
    for (let i = 0; i < chs.length; i++) {
      const next = chs[i + 1];
      const to = next ? next.line : lines.length;
      list.push({ id: 'c' + i, label: chs[i].title, html: textBodyHtml(lines.slice(chs[i].line, to)) });
    }
  }
  sectionsCache[b.id] = list;
  return list;
}

function measureStage() {
  const sc = readerScroller.value;
  if (sc) {
    pdfStageW.value = sc.clientWidth;
    pdfStageH.value = sc.clientHeight;
    pagedStageW.value = sc.clientWidth;
  }
  const st = pagedStage.value;
  if (st) pagedStageW.value = st.clientWidth;
}

async function loadPdf(b: Book) {
  pdfError.value = '';
  pdfLoading.value = true;
  pdfPages.value = [];
  thumbs.value = [];
  pdfTextLayers = {};
  for (const k in canvasMap) delete canvasMap[k];
  try {
    const pdfjs = await getPdfjsLib();
    if (!pdfjs || !b.file) throw new Error('PDF 引擎未加载');
    const doc = await pdfjs.getDocument({ data: await b.file.arrayBuffer() }).promise;
    if (pdfDoc.value && pdfDoc.value !== doc) {
      try {
        pdfDoc.value.destroy();
      } catch {}
    }
    pdfDoc.value = doc;
    pdfTotal.value = doc.numPages;
    b.pageCount = doc.numPages;
    try {
      const pg1 = await doc.getPage(1);
      const vp1 = pg1.getViewport({ scale: 1 });
      pdfNaturalW.value = vp1.width || 595;
      pdfNaturalH.value = vp1.height || 842;
      pdfRatio.value = vp1.height / Math.max(vp1.width, 1);
    } catch {}
    pdfLive.value = new Set();
    const resume = clamp(b.readPage || 1, 1, doc.numPages);
    if (scrollMode.value === 'page') {
      const n = pdfCols.value;
      pageIdx.value = Math.floor((resume - 1) / n);
      pdfPage.value = pageIdx.value * n + 1;
      pdfPages.value = pdfViewPages.value.slice();
    } else {
      pdfPage.value = resume;
      pdfPages.value = Array.from({ length: doc.numPages }, (_, i) => i + 1);
    }
    pdfRenderTag.value++;
    await nextTick();
    measureStage();
    await renderVisible();
    if (scrollMode.value === 'scroll' && resume > 1) await anchorPdfPage(resume);
    makeThumbs(doc);
  } catch (e: any) {
    pdfError.value = e?.message || '无法解析 PDF';
  }
  pdfLoading.value = false;
}

function setCanvas(p: number, el: HTMLCanvasElement | null) {
  if (el) {
    canvasMap[p] = el;
    presizeCanvas(p, el);
  } else {
    const cur = canvasMap[p];
    if (!cur || !cur.isConnected) delete canvasMap[p];
  }
}

function presizeCanvas(_p: number, cv: HTMLCanvasElement) {
  if (cv.dataset.tag) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.max(1, Math.round(pdfPageWidth.value * dpr));
  cv.height = Math.max(1, Math.round(pdfGhostH.value * dpr));
}

async function setPdfLive(list: number[]) {
  const next = new Set(list);
  pdfLive.value = next;
  for (const k of Object.keys(pdfTextLayers)) {
    if (!next.has(Number(k))) delete pdfTextLayers[Number(k)];
  }
  await nextTick();
}

async function syncPdfWindow() {
  const list = pdfWindowRange();
  const sig = list.join(',');
  if (sig === pdfWinSig) return;
  pdfWinSig = sig;
  await setPdfLive(list);
}

function schedulePdfWindow(delay = 70) {
  syncPdfWindow();
  clearTimeout(pdfWinTimer);
  pdfWinTimer = setTimeout(() => {
    pdfWinTimer = 0;
    renderVisible();
  }, delay);
}

async function renderVisible() {
  if (!pdfDoc.value) return;
  if (scrollMode.value === 'scroll') {
    await syncPdfWindow();
    const sc = readerScroller.value;
    const anchor = pdfPage.value;
    const before = sc && document.getElementById('pdf-page-' + anchor);
    const beforeTop = before ? before.getBoundingClientRect().top : null;
    const list = pdfWindowRange();
    for (const p of list) await renderPdfPage(p);
    if (sc && beforeTop !== null) {
      const after = document.getElementById('pdf-page-' + anchor);
      if (after) {
        const d = after.getBoundingClientRect().top - beforeTop;
        if (Math.abs(d) > 0.5) sc.scrollTop += d;
      }
    }
    return;
  }
  const list = pdfViewPages.value;
  if (list.join(',') !== pdfWinSig) {
    pdfWinSig = list.join(',');
    await setPdfLive(list);
  }
  for (const p of list) await renderPdfPage(p);
}

async function renderPdfPage(p: number) {
  if (!pdfDoc.value) return;
  const cv = canvasMap[p];
  if (!cv) return;
  const box = cv.closest('.pdf-page') as HTMLElement;
  if (!box) return;
  const tag = String(pdfRenderTag.value);
  if (cv.dataset.tag === tag) return;
  if (pdfJobs[p]) {
    pdfRequeue[p] = true;
    return;
  }
  pdfJobs[p] = true;
  try {
    const page = await pdfDoc.value.getPage(p);
    const rot = ((page.rotate || 0) + pdfRotate.value) % 360;
    const vp1 = page.getViewport({ scale: 1, rotation: rot });
    const cssW = box.clientWidth || pdfPageWidth.value;
    const cssScale = cssW / vp1.width;
    const pxScale = cssScale * Math.min(2, window.devicePixelRatio || 1);
    const v = page.getViewport({ scale: pxScale, rotation: rot });
    const w = Math.max(1, Math.floor(v.width));
    const h = Math.max(1, Math.floor(v.height));
    if (cv.width !== w) cv.width = w;
    if (cv.height !== h) cv.height = h;
    await page.render({ canvasContext: cv.getContext('2d')!, viewport: v }).promise;
    cv.dataset.tag = tag;
  } catch {
  } finally {
    delete pdfJobs[p];
    if (pdfRequeue[p]) {
      delete pdfRequeue[p];
      renderPdfPage(p);
    }
  }
}

async function makeThumbs(doc: any) {
  const n = Math.min(doc.numPages, 40);
  const out: Array<{ page: number; dataUrl: string }> = [];
  for (let i = 1; i <= n; i++) {
    try {
      const page = await doc.getPage(i);
      const trot = ((page.rotate || 0) + pdfRotate.value) % 360;
      const vp = page.getViewport({ scale: 1, rotation: trot });
      const scale = 110 / vp.width;
      const v = page.getViewport({ scale, rotation: trot });
      const cv = document.createElement('canvas');
      cv.width = Math.floor(v.width);
      cv.height = Math.floor(v.height);
      await page.render({ canvasContext: cv.getContext('2d')!, viewport: v }).promise;
      out.push({ page: i, dataUrl: cv.toDataURL('image/jpeg', 0.6) });
    } catch {}
  }
  thumbs.value = out;
}

function onReaderScroll() {
  const b = curBook.value;
  if (!b) return;
  const sc = readerScroller.value;
  if (!sc) return;
  if (b.kind === 'pdf') {
    if (scrollMode.value === 'page') return;
    const cur = pdfPageAt();
    if (cur !== pdfPage.value) {
      pdfPage.value = cur;
      b.readPage = cur;
      b.progress = pdfTotal.value ? cur / pdfTotal.value : 0;
      b.locationLabel = `第 ${cur} 页`;
    }
    schedulePdfWindow();
  } else {
    if (scrollMode.value !== 'scroll') return;
    markScrollProgress();
  }
}

async function afterChapterChange(opts?: any) {
  pageIdx.value = 0;
  scrollPercent.value = 0;
  hlPop.show = false;
  selPop.show = false;
  if (opts && opts.ratio != null && scrollMode.value === 'page') pendingPageRatio = opts.ratio;
  await decorate();
  if (scrollMode.value === 'scroll') await landScrollChapter(opts);
}

function alignScroll(ratio: number) {
  const sc = readerScroller.value;
  if (!sc) return;
  const max = Math.max(0, sc.scrollHeight - sc.clientHeight);
  sc.scrollTop = Math.round(max * clamp(ratio, 0, 1));
  landedTop = sc.scrollTop;
}

async function landScrollChapter(opts?: any) {
  const sc = readerScroller.value;
  if (!sc) return;
  const pos = opts?.pos;
  await nextTick();
  const ratio = pos === 'bottom' ? 1 : typeof pos === 'number' ? pos : 0;
  alignScroll(ratio);
  markScrollProgress();
  const pin = () => {
    if (readerScroller.value !== sc) return;
    if (Math.abs(sc.scrollTop - landedTop) > 48) return;
    alignScroll(ratio);
    markScrollProgress();
  };
  setTimeout(pin, 150);
  setTimeout(pin, 480);
}

async function anchorPdfPage(p: number) {
  const b = curBook.value;
  if (!b || b.kind !== 'pdf' || scrollMode.value !== 'scroll') return;
  const sc = readerScroller.value;
  if (!sc) return;
  await nextTick();
  sc.scrollTop = Math.max(0, pdfOffsetOf(p) - 8);
  await renderVisible();
  const el = document.getElementById('pdf-page-' + p);
  if (el) sc.scrollTop += el.getBoundingClientRect().top - sc.getBoundingClientRect().top - 8;
  pdfPage.value = p;
  b.readPage = p;
  b.progress = pdfTotal.value ? p / pdfTotal.value : 0;
  b.locationLabel = `第 ${p} 页`;
}

async function scrollToPdfPage(p: number) {
  const b = curBook.value;
  if (!b) return;
  p = clamp(p, 1, Math.max(pdfTotal.value || b.pageCount || 1, 1));
  b.readPage = p;
  if (scrollMode.value === 'page') {
    const n = pdfCols.value;
    pageIdx.value = Math.floor((p - 1) / n);
    pdfPage.value = pageIdx.value * n + 1;
    b.progress = pdfTotal.value ? pdfPage.value / pdfTotal.value : 0;
    b.locationLabel = `第 ${pdfPage.value} 页`;
    nextTick(renderVisible);
    return;
  }
  if (!readerScroller.value) return;
  pdfPage.value = p;
  await anchorPdfPage(p);
}

function scrollToFragment(id: string): boolean {
  if (!id) return false;
  const root = readerBody.value;
  if (!root) return false;
  const el = root.querySelector('#' + id) || root.querySelector(`a[name="${id}"]`);
  if (!el) return false;
  el.scrollIntoView({ block: 'start' });
  return true;
}

function gotoTarget(t: TocItem) {
  const b = curBook.value;
  if (!b || !t) return;
  if (b.kind === 'pdf') {
    if (t.page) {
      scrollToPdfPage(t.page);
      return;
    }
    if (t.dest && pdfDoc.value) {
      const doc = pdfDoc.value;
      const raw = t.dest;
      Promise.resolve(Array.isArray(raw) ? raw : doc.getDestination(raw))
        .then((d) => {
          if (!d || d[0] === undefined) return;
          if (typeof d[0] === 'number') return scrollToPdfPage(d[0] + 1);
          return doc.getPageIndex(d[0]).then((i: number) => scrollToPdfPage(i + 1));
        })
        .catch(() => {});
    }
    return;
  }
  if (t.index !== undefined) {
    openChapter(t.index).then(() => {
      if (t.fragment) scrollToFragment(t.fragment);
    });
  } else if (t.fragment) {
    openChapter(textIdx.value).then(() => scrollToFragment(t.fragment!));
  }
}

function onReaderClick(e: MouseEvent) {
  const t = e.target as HTMLElement | null;
  if (!t || !t.closest) return;
  const a = t.closest('[data-chapter]');
  if (a) {
    const idx = parseInt(a.getAttribute('data-chapter') || '', 10);
    if (!isNaN(idx)) {
      e.preventDefault();
      openChapter(idx);
      return;
    }
  }
  const fg = t.closest('[data-frag]');
  if (fg) {
    e.preventDefault();
    scrollToFragment(fg.getAttribute('data-frag') || '');
    return;
  }
  const mk = t.closest('[data-aid]');
  if (mk && curBook.value) {
    const ann = curBook.value.annotations.find((x) => x.id === mk.getAttribute('data-aid'));
    if (ann) {
      showHlPop(e, ann);
      return;
    }
  }
  hlPop.show = false;
  if (scrollMode.value !== 'page') return;
  const sel = window.getSelection();
  if (sel && String(sel.toString()).trim()) return;
  const sc = readerScroller.value;
  if (!sc) return;
  const r = sc.getBoundingClientRect();
  const x = e.clientX - r.left;
  if (x < r.width * 0.07) goPrevPage();
  else if (x > r.width * 0.93) goNextPage();
}

function showHlPop(e: MouseEvent, ann: Annotation) {
  const sc = readerScroller.value;
  if (!sc) return;
  const box = sc.getBoundingClientRect();
  hlPop.ann = ann;
  hlPop.x = clamp(e.clientX - box.left - 30, 6, Math.max(6, box.width - 430));
  hlPop.y = clamp(e.clientY - box.top + 14, 4, Math.max(4, box.height - 96));
  hlPop.show = true;
}

async function slideChapter(dir: number, apply: () => Promise<void>) {
  if (!isTextBook.value || scrollMode.value !== 'page' || !readerBody.value) {
    await apply();
    return;
  }
  const step = pagedStep.value || 600;
  clearTimeout(chapterSlideTimer);
  pagedGhost.value = {
    html: curChapterHtml.value,
    flowStyle: { ...pagedStyle.value },
    clipStyle: { ...pagedClipStyle.value }
  };
  pagedGhostDX.value = 0;
  pagedGhostFade.value = false;
  pagedNoAnim.value = true;
  await nextTick();
  try {
    await apply();
  } catch {
    resetChapterSlide();
    return;
  }
  await nextTick();
  pagedClipDX.value = dir > 0 ? step : -step;
  await nextTick();
  pagedNoAnim.value = false;
  await nextTick();
  pagedClipDX.value = 0;
  pagedGhostDX.value = dir > 0 ? -step : step;
  pagedGhostFade.value = true;
  chapterSlideTimer = setTimeout(() => {
    chapterSlideTimer = 0;
    pagedGhost.value = null;
    pagedGhostDX.value = 0;
    pagedGhostFade.value = false;
  }, CHAPTER_SLIDE_MS + 80);
}

function resetChapterSlide() {
  clearTimeout(chapterSlideTimer);
  chapterSlideTimer = 0;
  pagedGhost.value = null;
  pagedGhostDX.value = 0;
  pagedGhostFade.value = false;
  pagedClipDX.value = 0;
  pagedNoAnim.value = false;
}

async function openChapter(idx: number, opts?: any) {
  const b = curBook.value;
  if (!b || !(b.kind === 'epub' || b.kind === 'text')) return;
  if (!(opts && opts.keepSpeaking)) stopSpeak();
  const secs = bookSections.value;
  const n = Math.max(secs.length || (b.chapters || b.toc).length, 1);
  idx = clamp(idx, 0, n - 1);
  textIdx.value = idx;
  b.readIndex = idx;
  const sec = secs[idx];
  b.curTocId = sec ? sec.id : 'c' + idx;
  syncProgress();
  hlPop.show = false;
  selPop.show = false;
  decorKey.value = `${b.id}@c:${idx}`;
  pageIdx.value = 0;
  textPageCount.value = 1;
  if (scrollMode.value === 'scroll') warmNeighborImages(idx);
  sectionHtml.value = sec ? sectionBlock(sec) : '';
  await afterChapterChange(opts);
}

async function goChapter(d: number, optsIn?: any) {
  const b = curBook.value;
  if (!b) return;
  if (b.kind === 'pdf') {
    const toc = b.toc || [];
    if (!toc.length) return;
    let idx = curChapterIdx.value;
    if (idx < 0) idx = d > 0 ? -1 : toc.length;
    const target = clamp(idx + d, 0, toc.length - 1);
    const p = toc[target]?.page;
    if (p) scrollToPdfPage(p);
    return;
  }
  const n = chapterCount.value;
  if (!n) return;
  const target = clamp(curChapterIdx.value + d, 0, n - 1);
  if (target === curChapterIdx.value) return;
  const opts = optsIn || (scrollMode.value === 'scroll' ? { pos: d > 0 ? 'top' : 'bottom' } : undefined);
  await slideChapter(d, () => openChapter(target, opts));
}

async function goNextPage() {
  const b = curBook.value;
  if (!b) return;
  if (b.kind === 'pdf') {
    if (scrollMode.value === 'page') {
      const n = pdfCols.value;
      if (pageIdx.value + 1 >= pageCount.value) return goChapter(1);
      pageIdx.value++;
      pdfPage.value = pageIdx.value * n + 1;
      b.readPage = pdfPage.value;
      b.progress = pdfTotal.value ? pdfPage.value / pdfTotal.value : 0;
      b.locationLabel = `第 ${pdfPage.value} 页`;
      await nextTick();
      measureStage();
      renderVisible();
    } else {
      const sc = readerScroller.value;
      if (!sc) return;
      if (sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 6) return goChapter(1);
      sc.scrollBy({ top: sc.clientHeight * 0.9, behavior: 'smooth' });
    }
    return;
  }
  if (scrollMode.value === 'page') {
    if (pageIdx.value + 1 >= textPageCount.value) return goChapter(1);
    pageIdx.value++;
  } else {
    const sc = readerScroller.value;
    if (!sc) return;
    if (scrollEdge(1)) return void advanceChapter(1);
    sc.scrollBy({ top: sc.clientHeight * 0.9, behavior: 'smooth' });
  }
}

async function goPrevPage() {
  const b = curBook.value;
  if (!b) return;
  if (b.kind === 'pdf') {
    if (scrollMode.value === 'page') {
      const n = pdfCols.value;
      if (pageIdx.value <= 0) return goPrevChapterToLastPage();
      pageIdx.value--;
      pdfPage.value = pageIdx.value * n + 1;
      b.readPage = pdfPage.value;
      b.progress = pdfTotal.value ? pdfPage.value / pdfTotal.value : 0;
      b.locationLabel = `第 ${pdfPage.value} 页`;
      await nextTick();
      measureStage();
      renderVisible();
    } else {
      const sc = readerScroller.value;
      if (!sc) return;
      if (sc.scrollTop <= 4) return goChapter(-1);
      sc.scrollBy({ top: -sc.clientHeight * 0.9, behavior: 'smooth' });
    }
    return;
  }
  if (scrollMode.value === 'page') {
    if (pageIdx.value <= 0) return goPrevChapterToLastPage();
    pageIdx.value--;
  } else {
    const sc = readerScroller.value;
    if (!sc) return;
    if (scrollEdge(-1)) return void advanceChapter(-1);
    sc.scrollBy({ top: -sc.clientHeight * 0.9, behavior: 'smooth' });
  }
}

async function goPrevChapterToLastPage() {
  const b = curBook.value;
  if (!b) return;
  if (b.kind === 'pdf') {
    const toc = b.toc || [];
    const cur = curChapterIdx.value;
    if (cur <= 0) return;
    const start = toc[cur]?.page || 0;
    if (!start) return;
    return scrollToPdfPage(Math.max(1, start - 1));
  }
  const cur = curChapterIdx.value;
  if (cur <= 0) return;
  await slideChapter(-1, async () => {
    await openChapter(cur - 1);
    await measurePaged();
    pageIdx.value = Math.max(textPageCount.value - 1, 0);
  });
}

function setScrollMode(m: 'scroll' | 'page') {
  if (scrollMode.value === m) return;
  const b0 = curBook.value;
  const ratio =
    b0 && (b0.kind === 'epub' || b0.kind === 'text')
      ? m === 'page'
        ? scrollPercent.value / 100
        : textPageCount.value > 1
        ? pageIdx.value / (textPageCount.value - 1)
        : 0
      : 0;
  resetChapterSlide();
  scrollMode.value = m;
  pageIdx.value = 0;
  textPageCount.value = 1;
  scrollPercent.value = 0;
  decorKey.value = '';
  if (m === 'page') pagedColsCache.clear();
  const b = curBook.value;
  if (!b) return;
  hlPop.show = false;
  if (b.kind === 'pdf') {
    if (m === 'page') {
      const n = pdfCols.value;
      pageIdx.value = Math.floor(((b.readPage || 1) - 1) / n);
      pdfPage.value = pageIdx.value * n + 1;
      pdfPages.value = pdfViewPages.value.slice();
    } else {
      const resume = b.readPage || 1;
      pdfPage.value = resume;
      pdfPages.value = Array.from({ length: pdfTotal.value }, (_, i) => i + 1);
    }
    pdfRenderTag.value++;
    pdfWinSig = '';
    const anchor = pdfPage.value;
    nextTick(async () => {
      measureStage();
      if (m === 'scroll') await anchorPdfPage(anchor);
      else await renderVisible();
    });
  } else {
    openChapter(textIdx.value, m === 'page' ? { ratio } : { pos: ratio });
  }
}

function setSpread(s: 'single' | 'double') {
  if (spread.value === s) return;
  resetChapterSlide();
  spread.value = s;
  pagedColsCache.clear();
  const b = curBook.value;
  if (!b) return;
  hlPop.show = false;
  if (b.kind === 'pdf') {
    const n = s === 'double' ? 2 : 1;
    const anchor = pdfPage.value || 1;
    if (scrollMode.value === 'page') {
      pageIdx.value = Math.floor(((pdfPage.value || 1) - 1) / n);
    }
    pdfRenderTag.value++;
    pdfWinSig = '';
    nextTick(async () => {
      measureStage();
      if (scrollMode.value === 'scroll') await anchorPdfPage(anchor);
      else await renderVisible();
    });
  } else if (scrollMode.value === 'page') {
    decorate();
  }
}

async function decorate(keepScroll = false) {
  const sc = readerScroller.value;
  const st = keepScroll && sc ? sc.scrollTop : 0;
  renderKey.value++;
  await nextTick();
  const full = readerBody.value;
  if (full) {
    if (scrollMode.value === 'page' && !full.querySelector('.flow-end')) {
      const s = document.createElement('div');
      s.className = 'flow-end';
      full.appendChild(s);
    }
    if (scrollMode.value === 'page') {
      measureStage();
      measurePaged();
    }
  }
  if (keepScroll && st && sc) sc.scrollTop = st;
}

async function measurePaged() {
  const stage = pagedStage.value;
  if (!stage) return;
  pagedStageW.value = stage.clientWidth;
  const h = Math.max(220, stage.clientHeight - 44);
  if (h !== pagedH.value) pagedH.value = h;
  await nextTick();
  const f = readerBody.value;
  if (!f) return;
  const step = pagedPW.value + PAGED_GAP;
  const fr = f.getBoundingClientRect();
  const end = f.querySelector('.flow-end');
  let cols = 1;
  if (end) {
    const x = end.getBoundingClientRect().left - fr.left;
    cols = Math.max(1, Math.round(x / step) + 1);
  } else {
    cols = Math.max(1, Math.round(f.scrollWidth / step));
  }
  const n = pagedCols.value;
  textPageCount.value = Math.max(1, Math.ceil(cols / n));
  pageIdx.value = clamp(pageIdx.value, 0, textPageCount.value - 1);
  if (pendingPageRatio != null) {
    pageIdx.value = clamp(Math.round(pendingPageRatio * (textPageCount.value - 1)), 0, textPageCount.value - 1);
    pendingPageRatio = null;
    markPageProgress();
  }
}

function onSelect() {
  setTimeout(() => {
    const sel = window.getSelection();
    const t = sel && sel.toString().trim();
    const sc = readerScroller.value;
    if (!t || t.length < 2 || !sc || !sel.rangeCount) {
      selPop.show = false;
      selPop.text = '';
      return;
    }
    const range = sel.getRangeAt(0);
    if (!sc.contains(range.commonAncestorContainer)) {
      selPop.show = false;
      selPop.text = '';
      return;
    }
    const r = range.getBoundingClientRect();
    const box = sc.getBoundingClientRect();
    hlPop.show = false;
    selPop.text = t;
    selPop.x = clamp(r.left - box.left + r.width / 2 - 150, 6, Math.max(6, box.width - 320));
    selPop.y = clamp(r.top - box.top - 46, 4, Math.max(4, box.height - 70));
    selPop.show = true;
  }, 10);
}

function hideSel() {
  selPop.show = false;
}

function addHighlight(color: string) {
  const b = curBook.value;
  if (!b || !selPop.text) return;
  const a: Annotation = {
    id: uid(),
    color,
    text: selPop.text.slice(0, 400),
    note: '',
    at: Date.now(),
    locationLabel: progressText.value,
    kind: b.kind,
    page: b.kind === 'pdf' ? pdfPage.value : 0,
    index: textIdx.value
  };
  b.annotations.push(a);
  pushMemory('高亮', `你划下了「${a.text.slice(0, 18)}…」`, b.title);
  toast('已高亮', 'success');
  persistAndSyncBook(b);
  hideSel();
  window.getSelection()?.removeAllRanges();
}

function addNote() {
  const b = curBook.value;
  if (!b || !selPop.text) return;
  const text = selPop.text;
  hideSel();
  window.getSelection()?.removeAllRanges();
  openModal({
    title: '写笔记',
    desc: text.slice(0, 80),
    input: { label: '笔记', rows: 4, placeholder: '你的想法…' },
    onOk: (v: string) => {
      const a: Annotation = {
        id: uid(),
        color: 'yellow',
        text,
        note: v || '',
        at: Date.now(),
        locationLabel: progressText.value,
        kind: b.kind,
        page: b.kind === 'pdf' ? pdfPage.value : 0,
        index: textIdx.value
      };
      b.annotations.push(a);
      if (v) pushMemory('笔记', v.slice(0, 30), b.title);
      toast('笔记已保存', 'success');
      persistAndSyncBook(b);
    }
  });
}

function addVocab() {
  const b = curBook.value;
  if (!b || !selPop.text) return;
  const word = selPop.text.trim().slice(0, 24);
  openModal({
    title: '加入生词',
    desc: '生词会积累下来，之后可用于复习与 AI 解释。',
    input: { label: '释义 / 备注', placeholder: '例如：apriori 先验的' },
    value: '',
    onOk: (v: string) => {
      b.vocabs.push({ id: uid(), word, note: v || '', at: Date.now(), locationLabel: progressText.value });
      toast('已加入生词本', 'success');
      persistAndSyncBook(b);
    }
  });
  hideSel();
}

function askSelection() {
  const t = selPop.text;
  if (!t) return;
  aiOpen.value = true;
  hideSel();
  askAi(`解释一下这段文字：\n${t}`, curBook.value, chapterTitle.value, progressText.value, t);
}

function speakSelection() {
  speak(selPop.text);
  hideSel();
}

function copySelection() {
  const t = selPop.text;
  if (!t) return;
  if (navigator.clipboard) navigator.clipboard.writeText(t);
  toast('已复制', 'success');
  hideSel();
}

function askAnnotation(a: Annotation) {
  hlPop.show = false;
  aiOpen.value = true;
  askAi(`解释一下我划的这段：\n「${a.text}」${a.note ? `\n我的笔记：${a.note}` : ''}`, curBook.value, chapterTitle.value, progressText.value, a.text);
}

function copyAnnotation(a: Annotation) {
  const t = a.note ? `${a.text}\n— ${a.note}` : a.text;
  if (navigator.clipboard) navigator.clipboard.writeText(t);
  toast('已复制', 'success');
  hlPop.show = false;
}

function speak(text: string) {
  if (!text) return;
  if (!window.speechSynthesis) {
    toast('当前环境不支持朗读', 'warning');
    return;
  }
  const u = new SpeechSynthesisUtterance(String(text).slice(0, 400));
  u.rate = 1.3;
  speechSynthesis.speak(u);
}

async function jumpAnnot(a: Annotation) {
  const b = curBook.value;
  if (!b) return;
  hlPop.show = false;
  if (b.kind === 'pdf') {
    if (a.page) scrollToPdfPage(a.page);
    return;
  }
  if (a.index !== undefined && a.index !== textIdx.value) {
    await openChapter(a.index);
  }
  toast(`已定位到章节：${a.locationLabel}`, 'info');
}

function delAnnot(a: Annotation) {
  const b = curBook.value;
  if (!b) return;
  b.annotations = b.annotations.filter((x) => x.id !== a.id);
  hlPop.show = false;
  toast('已删除批注', 'success');
  persistAndSyncBook(b);
}

function editAnnot(a: Annotation) {
  openModal({
    title: '编辑笔记',
    desc: a.text.slice(0, 80),
    input: { label: '笔记', rows: 4, placeholder: '你的想法…' },
    value: a.note || '',
    onOk: (v: string) => {
      a.note = v || '';
      hlPop.show = false;
      toast('已更新', 'success');
      const b = curBook.value;
      if (b) persistAndSyncBook(b);
    }
  });
}

function addMark() {
  const b = curBook.value;
  if (!b) return;
  const label = chapterTitle.value || progressText.value;
  b.marks.push({
    id: uid(),
    label,
    locationLabel: progressText.value,
    page: pdfPage.value,
    index: textIdx.value,
    kind: b.kind
  });
  toast('已添加书签', 'success');
}

function hlColorCss(c: string) {
  return (HL_COLORS.find((x) => x.key === c) || HL_COLORS[0]).css;
}

function setFocus(mode: 'off' | 'sentence' | 'para') {
  if (mode !== 'off' && !focusAvailable.value) {
    toast('PDF 没有可用的文字层，暂不支持逐句 / 逐段精读', 'warning');
    return;
  }
  if (mode === 'off') stopSpeak();
  focusMode.value = mode;
  if (mode === 'off') {
    focusTotal.value = 0;
    focusIdx.value = 0;
  } else {
    focusTotal.value = 10;
    focusIdx.value = 0;
  }
}

function toggleFocusOn() {
  setFocus(focusMode.value === 'off' ? 'sentence' : 'off');
}

function toggleFocusUnit() {
  if (focusMode.value === 'off') return;
  setFocus(focusMode.value === 'para' ? 'sentence' : 'para');
}

function stepFocus(d: number) {
  if (focusMode.value === 'off') return;
  focusIdx.value = clamp(focusIdx.value + d, 0, Math.max(focusTotal.value - 1, 0));
}

function stopSpeak() {
  speaking.value = false;
  speakSeq++;
  if (window.speechSynthesis) speechSynthesis.cancel();
}

function toggleSpeak() {
  if (speaking.value) {
    stopSpeak();
    return;
  }
  if (!window.speechSynthesis) {
    toast('当前环境不支持朗读', 'warning');
    return;
  }
  speaking.value = true;
  toast('已开始朗读', 'info');
}

// --- 笔记与数据库持久化 ---
async function persistAndSyncBook(b: Book) {
  if (!b) return;
  await saveBookToDb(b);
  if (dirHandle.value) {
    const res = await syncBookNotes(b);
    if (res.success) {
      toast(`已自动同步写入本地：${res.path}`, 'info');
    }
  }
}

function openNotesModalForCurrent(target: Book | null) {
  const b = target || curBook.value || books.value[0];
  if (!b) {
    toast('书架暂无书籍，请先添加书籍', 'warning');
    return;
  }
  notesModalBook.value = b;
  notesModalMarkdown.value = generateBookMarkdown(b);
  notesModalOpen.value = true;
}

async function bindDirFromModal() {
  const res = await bindNotesDirectory();
  if (res.success) {
    toast(`已关联本地目录：${res.dirName}`, 'success');
    if (notesModalBook.value) {
      await syncBookNotes(notesModalBook.value);
    }
  } else if (res.error) {
    toast(res.error, 'warning');
  }
}

function exportCurrentNotesFromModal() {
  if (!notesModalBook.value) return;
  exportBookNotes(notesModalBook.value);
  toast('已下载该书的 Markdown 笔记', 'success');
}

async function exportAllNotesFromModal() {
  if (!books.value.length) {
    toast('书架暂无书籍可供导出', 'warning');
    return;
  }
  await exportAllNotesZip(books.value);
  toast(`已打包导出 ${books.value.length} 本书笔记 (.zip)`, 'success');
}

function onApiSettingsSaved(_data: { mineruToken: string; geminiKey: string }) {
  toast('API 配置已安全保存至本地', 'success');
}

// --- PDF 文本流阅读模式 (Zotero 阅读模式) ---
async function togglePdfTextMode(b: Book) {
  if (!b || b.kind !== 'pdf') return;
  if (b.textModeActive) {
    b.textModeActive = false;
    await persistAndSyncBook(b);
    return;
  }

  // 开启文本流模式
  b.bilingualActive = false;
  b.textModeActive = true;

  // 如果已经提取过 Markdown，直接展示
  if (b.textMarkdown) {
    await persistAndSyncBook(b);
    return;
  }

  // 否则自动执行本地流式排版提取
  await reExtractLocalForCurrentBook();
}

async function reExtractLocalForCurrentBook() {
  const b = curBook.value;
  if (!b || b.kind !== 'pdf') return;
  textExtractLoading.value = true;
  textExtractLoadingText.value = '正在解析 PDF 页面并重构双栏流式文本与公式…';
  try {
    const pdfjs = await getPdfjsLib();
    if (!pdfjs) throw new Error('PDF 引擎未就绪');
    let dataBuf: ArrayBuffer | null = b.fileData || null;
    if (!dataBuf && b.file) {
      dataBuf = await b.file.arrayBuffer();
      b.fileData = dataBuf;
    }
    if (!dataBuf) throw new Error('未找到 PDF 文件数据');
    const doc = await pdfjs.getDocument({ data: dataBuf }).promise;
    const md = await extractPdfToMarkdown(doc);
    b.textMarkdown = md;
    toast('本地排版重构完成', 'success');
    await persistAndSyncBook(b);
  } catch (e: any) {
    toast('本地提取失败：' + (e?.message || '未知错误'), 'error');
  } finally {
    textExtractLoading.value = false;
  }
}

async function runMinerUForCurrentBook() {
  const b = curBook.value;
  if (!b || b.kind !== 'pdf') return;
  const token = localStorage.getItem('MINERU_API_TOKEN');
  if (!token) {
    toast('请先在「API 配置」中填写 MinerU Token（免费获取）', 'warning');
    apiModalOpen.value = true;
    return;
  }
  let dataBuf: ArrayBuffer | null = b.fileData || null;
  if (!dataBuf && b.file) {
    dataBuf = await b.file.arrayBuffer();
    b.fileData = dataBuf;
  }
  if (!dataBuf) {
    toast('未能读取到 PDF 文件原始数据', 'error');
    return;
  }

  textExtractLoading.value = true;
  textExtractLoadingText.value = '正在通过 MinerU 云端深度还原 LaTeX 公式与跨页表格…';
  b.mineruStatus = 'parsing';

  try {
    const res = await requestMinerUParse(dataBuf, b.title + '.pdf', token);
    if (res.markdown) {
      b.textMarkdown = res.markdown;
      b.mineruStatus = 'done';
      toast('MinerU 学术解析完成，已还原 LaTeX 公式', 'success');
      await persistAndSyncBook(b);
    } else {
      b.mineruStatus = 'error';
      toast('MinerU 解析返回为空，保持现有排版', 'warning');
    }
  } catch (e: any) {
    b.mineruStatus = 'error';
    toast('MinerU 解析失败：' + (e?.message || '网络请求错误'), 'error');
  } finally {
    textExtractLoading.value = false;
  }
}

// --- 双语对照模式 ---
async function toggleBilingual(b: Book) {
  if (!b) return;
  if (b.bilingualActive) {
    b.bilingualActive = false;
    await persistAndSyncBook(b);
    return;
  }

  // 若尚未提取文本，先提取或切分
  if (!b.bilingualParas || !b.bilingualParas.length) {
    let sourceText = b.textMarkdown || '';
    if (!sourceText && b.kind === 'pdf') {
      textExtractLoading.value = true;
      textExtractLoadingText.value = '正在提取全文用于生成双语段落对照…';
      try {
        const pdfjs = await getPdfjsLib();
        let dataBuf = b.fileData;
        if (!dataBuf && b.file) {
          dataBuf = await b.file.arrayBuffer();
          b.fileData = dataBuf;
        }
        if (dataBuf && pdfjs) {
          const doc = await pdfjs.getDocument({ data: dataBuf }).promise;
          sourceText = await extractPdfToMarkdown(doc);
          b.textMarkdown = sourceText;
        }
      } catch {}
      textExtractLoading.value = false;
    } else if (!sourceText && b.rawText) {
      sourceText = b.rawText;
    }

    if (!sourceText) {
      toast('暂无可供切分的正文内容', 'warning');
      return;
    }

    b.bilingualParas = segmentIntoBilingualParas(sourceText);
  }

  b.textModeActive = false;
  b.bilingualActive = true;
  await persistAndSyncBook(b);
}

function openBilingualFromTextMode() {
  const b = curBook.value;
  if (!b) return;
  toggleBilingual(b);
}

async function translateCurrentBookAll() {
  const b = curBook.value;
  if (!b || !b.bilingualParas || !b.bilingualParas.length) return;
  const geminiKey = localStorage.getItem('GEMINI_API_KEY') || undefined;
  toast('已开始全篇学术翻译，支持断点与重试…', 'info');
  await translateBookParas(b.bilingualParas, geminiKey);
  toast('双语对照翻译已完成！可导出 .md 或双语 PDF', 'success');
  await persistAndSyncBook(b);
}

async function translateSingleParagraph(para: BilingualParagraph) {
  const b = curBook.value;
  const geminiKey = localStorage.getItem('GEMINI_API_KEY') || undefined;
  await translateSinglePara(para, geminiKey);
  if (b) await persistAndSyncBook(b);
}

function exportCurrentBilingualMd() {
  const b = curBook.value;
  if (!b || !b.bilingualParas || !b.bilingualParas.length) {
    toast('暂无可导出的对照段落', 'warning');
    return;
  }
  exportBilingualMarkdown(b.title, b.bilingualParas);
  toast('已下载双语对照 Markdown', 'success');
}

function exportCurrentBilingualPdf() {
  const b = curBook.value;
  if (!b || !b.bilingualParas || !b.bilingualParas.length) {
    toast('暂无可导出的对照段落', 'warning');
    return;
  }
  exportBilingualPdf(b.title, b.bilingualParas);
  toast('已调起双语 PDF 打印生成引擎', 'info');
}

function onShelfCtx(e: MouseEvent, _tag: string, b: Book) {
  openCtx(e, [
    { label: '打开阅读', icon: 'ri-book-open-line', act: () => openBook(b) },
    { label: '独立笔记 (.md)', icon: 'ri-markdown-line', act: () => openNotesModalForCurrent(b) },
    { label: '双语对照', icon: 'ri-translate-2', act: () => { openBook(b); toggleBilingual(b); } },
    { label: '书籍详情', icon: 'ri-information-line', act: () => showDetail(b) },
    { label: '从书架移除', icon: 'ri-delete-bin-line', danger: true, act: () => removeBook(b) }
  ]);
}

function showDetail(b: Book) {
  openModal({
    title: '书籍详情',
    input: null,
    kv: [
      { k: '书名', v: b.title },
      { k: '作者', v: b.author || '未知' },
      { k: '格式', v: `${b.ext.toUpperCase()} · ${b.kind}` },
      { k: '大小', v: fmtSize(b.size) },
      { k: '章节', v: `${(b.chapters || b.toc).length} 项` },
      { k: '批注', v: `${b.annotations.length} 条` },
      { k: '进度', v: `${Math.round(b.progress * 100)}% · ${b.locationLabel || '未开始'}` },
      { k: '加入', v: fmtDate(b.addedAt) }
    ],
    confirmText: '关闭'
  });
}

function readerMenu(): ContextMenuItem[] {
  const b = curBook.value;
  if (!b) return [];
  const items: ContextMenuItem[] = [
    { label: '独立笔记 (.md)', icon: 'ri-markdown-line', act: () => openNotesModalForCurrent(b) },
    { label: '双语对照与翻译', icon: 'ri-translate-2', act: () => toggleBilingual(b) }
  ];
  if (b.kind === 'pdf') {
    items.push({
      label: b.textModeActive ? '返回原版 PDF' : '开启文本阅读模式',
      icon: 'ri-book-read-line',
      act: () => togglePdfTextMode(b)
    });
    items.push({
      label: 'MinerU 学术解析 (提取 LaTeX)',
      icon: 'ri-sparkling-fill',
      act: runMinerUForCurrentBook
    });
  }
  items.push(
    { label: '添加书签', icon: 'ri-bookmark-line', act: addMark },
    { label: '书籍详情', icon: 'ri-information-line', act: () => showDetail(b) },
    { label: '导出批注', icon: 'ri-download-2-line', act: exportAnnots },
    { label: '返回书架', icon: 'ri-book-shelf-line', act: backToShelf },
    { label: '从书架移除', icon: 'ri-delete-bin-line', danger: true, act: () => removeBook(b) }
  );
  return items;
}

function tabMenu(t: TabItem | null): ContextMenuItem[] {
  const out: ContextMenuItem[] = [];
  if (t && !t.fixed) {
    out.push({ label: '关闭', icon: 'ri-close-line', act: () => closeTab(t.id) });
    out.push({
      label: '关闭其他',
      icon: 'ri-close-circle-line',
      act: () => {
        openIds.value = [t.id];
        activeTabId.value = t.id;
      }
    });
  }
  out.push({
    label: '关闭全部',
    icon: 'ri-close-fill',
    act: () => {
      openIds.value = [];
      activeTabId.value = SHELF_TAB;
    }
  });
  if (t && t.book) {
    out.push({ label: '从书架移除', icon: 'ri-delete-bin-line', danger: true, act: () => removeBook(t.book!) });
  }
  return out;
}

function exportAnnots() {
  const b = curBook.value;
  if (!b) return;
  const txt =
    `《${b.title}》批注导出\n\n` +
    b.annotations
      .map((a, i) => `${i + 1}. [${a.locationLabel}] ${a.text}${a.note ? `\n   笔记：${a.note}` : ''}`)
      .join('\n\n');
  const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${b.title}-批注.txt`;
  a.click();
  toast(`已导出 ${b.annotations.length} 条批注`, 'success');
}

function startResize(which: 'nav' | 'ai', e: MouseEvent) {
  const startX = e.clientX;
  const startW = which === 'nav' ? navWidth.value : aiWidth.value;
  const sign = which === 'nav' ? 1 : -1;
  document.body.classList.add('is-resizing');
  const onMove = (ev: MouseEvent) => {
    const dx = (ev.clientX - startX) * sign;
    const w = clamp(startW + dx, 168, Math.min(720, window.innerWidth * 0.55));
    if (which === 'nav') navWidth.value = w;
    else aiWidth.value = w;
    measureStage();
    if (scrollMode.value === 'page' && isTextBook.value) measurePaged();
  };
  const onUp = () => {
    document.body.classList.remove('is-resizing');
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    if (isTextBook.value && scrollMode.value === 'page') measurePaged();
  };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}

function onKeydown(e: KeyboardEvent) {
  const t = (e.target || {}) as HTMLElement;
  const tag = String(t.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || t.isContentEditable) return;
  if (!curBook.value) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === 'ArrowRight' || e.key === 'PageDown') {
    e.preventDefault();
    goNextPage();
  } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
    e.preventDefault();
    goPrevPage();
  } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    if (focusMode.value !== 'off' && focusTotal.value) {
      e.preventDefault();
      stepFocus(e.key === 'ArrowDown' ? 1 : -1);
    }
  } else if (e.key === 'Escape') {
    hlPop.show = false;
    selPop.show = false;
    setPop.value = false;
    closeCtx();
  }
}

let lastWheelAt = 0;
async function onWheel(e: WheelEvent) {
  const b = curBook.value;
  if (!b) return;
  if (scrollMode.value !== 'page') {
    if (!(b.kind === 'epub' || b.kind === 'text') || scrollMode.value !== 'scroll') return;
    const dy0 = e.deltaY;
    if (!dy0 || Math.abs(dy0) < 4) return;
    const d0 = dy0 > 0 ? 1 : -1;
    if (!scrollEdge(d0)) return;
    if (e.cancelable) e.preventDefault();
    advanceChapter(d0, true);
    return;
  }
  const dy = e.deltaY;
  if (!dy || Math.abs(dy) < 4) return;
  const now = Date.now();
  if (now - lastWheelAt < 240) {
    if (e.cancelable) e.preventDefault();
    return;
  }
  lastWheelAt = now;
  if (e.cancelable) e.preventDefault();
  if (dy > 0) goNextPage();
  else goPrevPage();
}

function onOutsideDown(e: MouseEvent) {
  const p = e.target as HTMLElement | null;
  if (!p || !p.closest) return;
  if (selPop.show && !p.closest('.sel-pop')) hideSel();
  if (hlPop.show && !p.closest('.sel-pop')) hlPop.show = false;
}

function onWindowResize() {
  measureStage();
  const b = curBook.value;
  if (b && b.kind === 'pdf') {
    pdfRenderTag.value++;
    pdfWinSig = '';
    if (scrollMode.value === 'scroll') anchorPdfPage(pdfPage.value);
    else nextTick(renderVisible);
  } else if (isTextBook.value && scrollMode.value === 'scroll') {
    nextTick(() => alignScroll(scrollPercent.value / 100));
  } else if (scrollMode.value === 'page') {
    measurePaged();
  }
  const w = window.innerWidth;
  isMobile.value = w < 1024;
  if (w < 1024) {
    navOpen.value = false;
    aiOpen.value = false;
  } else if (w < 1520) {
    navOpen.value = true;
    aiOpen.value = false;
  } else {
    navOpen.value = true;
    aiOpen.value = true;
  }
}

watch(activeTabId, (id) => {
  const b = books.value.find((x) => x.id === id);
  if (b) loadBook(b);
});

watch(pageIdx, () => {
  if (isTextBook.value && scrollMode.value === 'page') markPageProgress();
});

watch([fontSize, lineHeight, pageWidth, fontKey], () => {
  pagedColsCache.clear();
  if (scrollMode.value === 'page' && isTextBook.value) nextTick(measurePaged);
});

watch(pdfPageWidth, () => {
  const b = curBook.value;
  if (!b || b.kind !== 'pdf') return;
  const anchor = pdfPage.value;
  pdfRenderTag.value++;
  pdfWinSig = '';
  if (scrollMode.value === 'scroll') anchorPdfPage(anchor);
  else nextTick(renderVisible);
});

onMounted(async () => {
  onWindowResize();
  readTimer = setInterval(() => {
    if (curBook.value) readMinutes.value++;
  }, 60000);
  document.addEventListener('click', closeCtx);
  document.addEventListener('mousedown', onOutsideDown);
  document.addEventListener('keydown', onKeydown);
  window.addEventListener('resize', onWindowResize);

  // 初始化持久化本地书库
  try {
    const saved = await loadAllBooksFromDb();
    if (saved && saved.length > 0) {
      books.value = saved;
    } else {
      // 预置 Attention Is All You Need 经典学术精读样本（含 LaTeX 公式与双语对照）
      const sample = createSampleAcademicPaper();
      books.value = [sample];
      await saveBookToDb(sample);
    }
  } catch {
    const sample = createSampleAcademicPaper();
    books.value = [sample];
  }
});

onUnmounted(() => {
  clearInterval(readTimer);
  document.removeEventListener('click', closeCtx);
  document.removeEventListener('mousedown', onOutsideDown);
  document.removeEventListener('keydown', onKeydown);
  window.removeEventListener('resize', onWindowResize);
  if (pdfDoc.value) {
    try {
      pdfDoc.value.destroy();
    } catch {}
  }
});
</script>
