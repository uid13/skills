import { defineConfig } from 'vite'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  build: {
    ssr: true,
    lib: {
      // 多入口：music 主控制脚本 + gen-ua 随机 UA 生成脚本
      entry: {
        music: resolve(__dirname, 'src/bin/music.ts'),
        'gen-ua': resolve(__dirname, 'src/bin/gen-ua.ts'),
      },
      formats: ['es'],
    },
    outDir: resolve(__dirname, '../../skills/music'),
    emptyOutDir: true,
    sourcemap: true,
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
