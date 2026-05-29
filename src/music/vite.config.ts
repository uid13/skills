import { defineConfig } from 'vite';
import { resolve } from 'node:path';

/**
 * Vite 8 + Rolldown 构建配置（music 技能）
 * 
 * 单入口模式：所有子命令通过 commander 在 music.ts 内分发
 * 
 * 关键配置：
 * - ssr: true（避免 node: 模块被外部化警告）
 * - lib 模式，ESM 格式输出
 * - rolldownOptions 外部化所有 node: 内置模块
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
