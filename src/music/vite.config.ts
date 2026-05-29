import { defineConfig } from 'vite';
import { resolve } from 'node:path';

/**
 * Vite 8 + Rolldown 构建配置（music 技能）
 * 
 * - ssr: true（externalize node: 内置模块）
 * - commander 保持外部化（用户环境需有 commander）
 * - 输出到 skills/music/scripts/dist/
 */
export default defineConfig({
  build: {
    ssr: true,
    lib: {
      entry: resolve(__dirname, 'src/bin/music.ts'),
      formats: ['es'],
      fileName: 'music',
    },
    outDir: resolve(__dirname, '../../skills/music/scripts/dist'),
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    rolldownOptions: {
      external: [/^node:/],
      output: {
        entryFileNames: '[name].mjs',
        chunkFileNames: 'chunks/[name]-[hash].mjs',
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
