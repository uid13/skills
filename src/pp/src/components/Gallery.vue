<script setup lang="ts">
/**
 * Gallery 画廊组件
 *
 * - 瀑布流布局（UnoCSS 多列布局）
 * - 图片卡片（圆角、阴影、hover 效果）
 * - 集成 Viewer.js 图片查看器（通过 npm import）
 */
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import Viewer from 'viewerjs'
import 'viewerjs/dist/viewer.css'
import type { ImageItem } from '../types'

interface Props {
  images: ImageItem[]
}

const props = defineProps<Props>()

const galleryRef = ref<HTMLElement | null>(null)
let viewer: Viewer | null = null

/**
 * 初始化 Viewer.js 图片查看器
 */
const initViewer = async () => {
  if (!galleryRef.value || props.images.length === 0) return

  await nextTick()

  // 销毁旧的 viewer 实例
  if (viewer) {
    viewer.destroy()
    viewer = null
  }

  try {
    viewer = new Viewer(galleryRef.value, {
      navbar: true,
      toolbar: {
        zoomIn: 1,
        zoomOut: 1,
        oneToOne: 1,
        reset: 1,
        prev: 1,
        play: { show: 1, size: 'large' },
        next: 1,
        rotateLeft: 1,
        rotateRight: 1,
        flipHorizontal: 1,
        flipVertical: 1,
      },
      title: false,
      backdrop: true,
      inline: false,
      button: true,
      loop: true,
      keyboard: true,
      transition: true,
      zIndex: 99999,
    })
  } catch (error) {
    console.error('Failed to initialize Viewer:', error)
  }
}

// 监听图片变化，重新初始化 viewer
watch(() => props.images, () => {
  nextTick(() => initViewer())
}, { deep: true })

onMounted(() => {
  nextTick(() => initViewer())
})

onUnmounted(() => {
  if (viewer) {
    viewer.destroy()
    viewer = null
  }
})
</script>

<template>
  <div
    ref="galleryRef"
    class="columns-1 sm:columns-2 md:columns-3 gap-4 max-w-7xl mx-auto"
  >
    <div
      v-for="(img, index) in images"
      :key="index"
      class="break-inside-avoid mb-4"
    >
      <div class="rounded-2xl overflow-hidden shadow-md hover:shadow-xl bg-white transition-transform duration-250 hover:-translate-y-1">
        <img
          :src="img.url"
          :alt="img.alt"
          class="w-full block cursor-pointer"
        />
      </div>
    </div>
  </div>
</template>
