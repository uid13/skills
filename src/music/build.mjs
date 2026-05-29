#!/usr/bin/env node
/**
 * music 技能构建脚本
 * 
 * 策略：esbuild 打包为 CJS（commander 等依赖内联），
 * 再生成 ESM 包装文件（.mjs）供 Node.js ESM 模式使用。
 * node: 内置模块外部化（不打包）。
 */

import { build } from 'esbuild';
import { writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '../../skills/music/scripts/dist');

console.log('🔧 构建 music 技能 (esbuild)...');

// 1. esbuild 打包为 CJS（commander 内联，node: 外部化）
await build({
  entryPoints: [resolve(__dirname, 'src/bin/music.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: resolve(OUT_DIR, 'music.cjs'),
  external: ['node:*'],
  sourcemap: true,
  minify: false,
});

// 2. 生成 ESM 包装文件
const wrapper = `#!/usr/bin/env node
import "./music.cjs";
`;
writeFileSync(resolve(OUT_DIR, 'music.mjs'), wrapper);

// 3. 拷贝 SKILL.md
const skillMdSrc = resolve(__dirname, 'SKILL.md');
const skillMdDest = resolve(__dirname, '../../skills/music/SKILL.md');
if (existsSync(skillMdSrc)) {
  copyFileSync(skillMdSrc, skillMdDest);
  console.log('📋 已拷贝 SKILL.md → skills/music/SKILL.md');
}

console.log('✅ 构建完成');
