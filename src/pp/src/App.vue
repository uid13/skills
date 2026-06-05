<script setup lang="ts">
/**
 * App 主组件
 *
 * - 随机渐变背景
 * - 加载 pp-data.js 中的 PP_IMAGES
 * - 渲染 Gallery 组件
 */
import { ref, onMounted } from 'vue'
import Gallery from './components/Gallery.vue'
import type { ImageItem } from './types'

const images = ref<ImageItem[]>([])

onMounted(() => {
  // 随机渐变背景
  const gradients = [
    'linear-gradient(135deg, #fda4af, #d8b4fe, #67e8f9)',
    'linear-gradient(135deg, #fb7185, #e879f9, #818cf8)',
    'linear-gradient(135deg, #fde68a, #f9a8d4, #c084fc)',
    'linear-gradient(135deg, #6ee7b7, #67e8f9, #60a5fa)',
  ]
  document.body.style.background = gradients[Math.floor(Math.random() * gradients.length)]
  document.body.style.backgroundAttachment = 'fixed'

  // 加载图片数据
  images.value = window.PP_IMAGES || []
})
</script>

<template>
  <Gallery :images="images" />
</template>
