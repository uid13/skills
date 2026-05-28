import { defineConfig, type UserConfig } from 'vite'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Vite 8 配置（使用 Rolldown）
 * 
 * 关键变化：
 * - rollupOptions → rolldownOptions
 * - Vite 8 原生集成 Rolldown（Rust 实现的打包器）
 */
export default defineConfig({
  build: {
    // 设置为 SSR 模式（CLI 工具是 Node.js 环境）
    ssr: true,
    // 不生成 source map（减小体积）
    sourcemap: false,
    // 不压缩（保持可读性）
    minify: false,
    // 输出目录
    outDir: 'dist',
    // 清理输出目录
    emptyOutDir: true,
    // 报告压缩后体积
    reportCompressedSize: false,
    // Chunk 体积警告限制
    chunkSizeWarningLimit: 1000,
  },
  // Vite 8 使用 Rolldown（替代 Rollup）
  rolldownOptions: {
    // 外部化 node: 模块（不打包进 bundle）
    external: [/^node:/],
    output: {
      // 文件命名模式
      entryFileNames: '[name].mjs',
      chunkFileNames: 'chunks/[name]-[hash].mjs',
      format: 'esm',
    },
  },
}) satisfies UserConfig
