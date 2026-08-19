import { defineConfig } from 'vite'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  build: {
    ssr: true,
    lib: {
      // 单入口：music 主控制脚本（随机 UA 改由模型按 reference/ua-spec.md 现场生成）
      entry: resolve(__dirname, 'src/bin/music.ts'),
      formats: ['es'],
    },
    outDir: resolve(__dirname, '../../skills/music'),
    emptyOutDir: true,
    sourcemap: false,
    minify: false,
    rollupOptions: {
      external: [/^node:/],
      output: {
        entryFileNames: 'scripts/dist/[name].mjs',
        chunkFileNames: 'scripts/dist/chunks/[name]-[hash].mjs',
      },
    },
  },
  ssr: {
    noExternal: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  publicDir: resolve(__dirname, 'public'),
})
