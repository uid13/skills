import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import { copyFileSync, existsSync } from 'node:fs'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

/**
 * Vite 构建配置（pp 技能）
 *
 * - 使用 vite-plugin-singlefile 内联 Vue/UnoCSS/Viewer.js 资源到 HTML
 * - pp-data.js 作为外部脚本加载（运行时由模型写入）
 * - 输出单个 index.html 文件（支持 file:// 协议直接打开）
 * - 使用自定义插件复制 SKILL.md
 */
export default defineConfig({
  plugins: [
    UnoCSS(),
    vue(),
    viteSingleFile(),
    {
      name: 'copy-skill-md',
      writeBundle() {
        const src = resolve(__dirname, 'SKILL.md')
        const dest = resolve(__dirname, '../../skills/pp/SKILL.md')
        if (existsSync(src)) {
          copyFileSync(src, dest)
          console.log('📋 已拷贝 SKILL.md → skills/pp/SKILL.md')
        }
      },
    },
  ],
  build: {
    outDir: resolve(__dirname, '../../skills/pp'),
    emptyOutDir: true,
    sourcemap: false,
    minify: true,
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  publicDir: resolve(__dirname, 'public'),
})
