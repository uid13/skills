import { defineConfig } from 'vite'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  build: {
    ssr: true,
    lib: {
      entry: resolve(__dirname, 'src/bin/music.ts'),
      formats: ['es'],
      fileName: 'music',
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
