import { defineConfig } from 'vite'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    UnoCSS(),
    vue(),
    viteSingleFile(),
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
