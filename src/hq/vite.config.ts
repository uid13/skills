import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { copyFileSync, existsSync } from 'node:fs';

export default defineConfig({
  plugins: [
    {
      name: 'copy-skill-md',
      writeBundle() {
        const src = resolve(__dirname, 'SKILL.md');
        const dest = resolve(__dirname, '../../skills/hq/SKILL.md');
        if (existsSync(src)) {
          copyFileSync(src, dest);
          console.log('📋 已拷贝 SKILL.md → skills/hq/SKILL.md');
        }
      },
    },
  ],
  build: {
    ssr: true,
    lib: {
      entry: resolve(__dirname, 'src/bin/hq.ts'),
      formats: ['es'],
      fileName: 'hq',
    },
    outDir: resolve(__dirname, '../../skills/hq/scripts/dist'),
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    rollupOptions: {
      external: [/^node:/],
      output: {
        entryFileNames: '[name].mjs',
        chunkFileNames: 'chunks/[name]-[hash].mjs',
      },
    },
  },
  ssr: {
    noExternal: true,
  },
});
