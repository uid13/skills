import { defineConfig } from 'vite'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  // public 目录内容会复制到 outDir
  publicDir: resolve(__dirname, 'public'),
  
  build: {
    // 输出到 skills/imagegen-magick
    outDir: resolve(__dirname, '../../skills/imagegen-magick'),
    emptyOutDir: true,
    
    // 占位入口（只生成一个空文件）
    lib: {
      entry: resolve(__dirname, 'src/dummy.js'),
      formats: ['es'],
    },
    rollupOptions: {
      output: {
        entryFileNames: 'scripts/dummy.js',
      },
    },
  },
})
