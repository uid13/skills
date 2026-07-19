import { defineConfig } from 'vite'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  publicDir: resolve(__dirname, 'public'),

  build: {
    outDir: resolve(__dirname, '../../skills/wc-jp'),
    emptyOutDir: true,

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
