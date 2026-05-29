import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { copyFileSync, existsSync } from 'node:fs';

/**
 * Vite 8 + Rolldown 构建配置（music 技能）
 * 
 * - ssr: true（externalize node: 内置模块）
 * - ssr.noExternal: commander 内联打包
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
  ssr: {
    noExternal: ['commander'],
  },
  plugins: [
    {
      name: 'copy-skill-md',
      writeBundle() {
        const src = resolve(__dirname, 'SKILL.md');
        const dest = resolve(__dirname, '../../skills/music/SKILL.md');
        if (existsSync(src)) {
          copyFileSync(src, dest);
          console.log('📋 已拷贝 SKILL.md → skills/music/SKILL.md');
        }
      },
    },
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
