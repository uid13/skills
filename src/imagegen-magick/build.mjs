#!/usr/bin/env node
/**
 * 程序化多入口构建脚本（Vite 8 + Rolldown）
 *
 * 为什么需要这个脚本？
 * ─────────────────────
 * Vite v8 + Rolldown 在多 entry 模式下（lib.entry 为对象）会：
 *   ✓ 为每个 entry 生成独立文件
 *   ✗ 但同时提取共享模块（logger.ts、font-fallback.ts 等）为 chunk-[hash].mjs
 * 即使 rolldownOptions.output.manualChunks 设为 undefined 也无效（vite 8 行为）。
 *
 * 后果：输出多个文件（info.mjs + logger-xxx.mjs + font-fallback-xxx.mjs）
 * 这与"零安装分发"的需求冲突（用户必须复制整个 dist 目录）。
 *
 * 解决方案：程序化逐个构建
 * ─────────────────────
 * 1. 对每个 entry 单独调用 vite.build()
 * 2. 第一次构建时 emptyOutDir: true（清空产物）
 * 3. 后续构建 emptyOutDir: false（保留已有产物）
 * 4. 每次 build 只有一个 entry → 不会触发共享模块提取
 * 5. 最终每个入口生成独立的单文件 .mjs（无任何 chunk 依赖）
 *
 * 构建流程：
 *   $ node build.mjs
 *   → info.mjs       (单文件，包含所有依赖 inline)
 *   → render.mjs     (单文件，包含所有依赖 inline)
 *   → check-fonts.mjs (...)
 *   → scaffold.mjs   (...)
 *   → font-chain.mjs (...)
 *   → post-process.mjs (...)
 */

import { build } from 'vite'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chmodSync, existsSync, mkdirSync, rmSync, readdirSync, copyFileSync, cpSync } from 'node:fs'
import { platform } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(__dirname, '../../skills/imagegen-magick/scripts/dist')

/**
 * 要构建的 CLI 工具列表
 *
 * 顺序：按重要性排序（info 放最前方便验证环境）
 */
const ENTRIES = [
  'info',
  'render',
  'check-fonts',
  'scaffold',
  'font-chain',
  'post-process',
]

/**
 * 构建单个入口
 *
 * @param name - 入口名（src/bin/<name>.ts）
 * @param isFirst - 是否第一次构建（是否清空 outDir）
 */
async function buildEntry(name, isFirst) {
  const entryFile = resolve(__dirname, `src/bin/${name}.ts`)

  console.log(`\n▶ 构建入口: ${name}.mjs`)

  try {
    await build({
      configFile: resolve(__dirname, 'vite.config.ts'),
      build: {
        ssr: true,
        lib: {
          entry: entryFile,
          formats: ['es'],
          // 关键：直接控制文件名（不被 entry 的 key 影响）
          fileName: (_format) => `${name}.mjs`,
        },
        outDir: OUT_DIR,
        emptyOutDir: isFirst, // 仅第一次构建清空目录
        sourcemap: true,
        minify: false,
        chunkSizeWarningLimit: 1000,
        reportCompressedSize: false,
      },
      // Vite 8 使用 Rolldown（替代 Rollup）
      rolldownOptions: {
        external: [/^node:/],
        output: {
          entryFileNames: '[name].mjs',
          // 即使 Rolldown 仍想切 chunk，也会被 inlineDynamicImports 抑制
          // （单 entry 模式下 Rolldown 不会触发 chunk 提取）
        },
      },
      logLevel: 'warn',
    })

    // 类 Unix 系统设置可执行权限
    const outFile = resolve(OUT_DIR, `${name}.mjs`)
    if (platform() !== 'win32' && existsSync(outFile)) {
      chmodSync(outFile, 0o755)
    }

    return true
  } catch (err) {
    console.error(`✗ 构建 ${name}.mjs 失败:`, err.message)
    return false
  }
}

/**
 * 主流程
 */
async function main() {
  console.log('🔧 开始构建 imagegen-magick 技能 (Vite 8 + Rolldown + 程序化多入口)...')
  console.log(`   输出目录: ${OUT_DIR}`)
  console.log(`   入口数量: ${ENTRIES.length}`)

  const startTime = Date.now()
  const results = []

  // 逐个构建（串行而不是并行，避免 vite 内部状态冲突）
  for (let i = 0; i < ENTRIES.length; i++) {
    const name = ENTRIES[i]
    const success = await buildEntry(name, i === 0)
    results.push({ name, success })

    if (!success) {
      console.error(`\n❌ 构建中断：${name} 失败`)
      process.exit(1)
    }
  }

  // 验证产物完整性并重命名
  console.log('\n✓ 构建完成，验证产物...')
  for (const name of ENTRIES) {
    const outFileJs = resolve(OUT_DIR, `${name}.js`)
    const outFileMjs = resolve(OUT_DIR, `${name}.mjs`)
    
    // Vite 8 lib 模式可能输出 .js 文件，需要重命名为 .mjs
    if (existsSync(outFileJs) && !existsSync(outFileMjs)) {
      console.log(`  重命名: ${name}.js → ${name}.mjs`)
      await import('node:fs/promises').then(({ rename }) =>
        rename(outFileJs, outFileMjs)
      )
      // 同时重命名 source map
      const mapJs = resolve(OUT_DIR, `${name}.js.map`)
      const mapMjs = resolve(OUT_DIR, `${name}.mjs.map`)
      if (existsSync(mapJs)) {
        await import('node:fs/promises').then(({ rename }) =>
          rename(mapJs, mapMjs)
        )
      }
    }
    
    if (!existsSync(outFileMjs)) {
      console.error(`✗ 缺失产物: ${name}.mjs`)
      process.exit(1)
    }
  }

  // 清理 chunks 子目录（如果有）
  // 理论上单 entry 模式不会产生 chunks，但保险起见过滤一下
  const chunksDir = resolve(OUT_DIR, 'chunks')
  if (existsSync(chunksDir)) {
    const chunks = readdirSync(chunksDir)
    if (chunks.length > 0) {
      console.warn(`⚠ 警告: 仍生成了 ${chunks.length} 个 chunk 文件，尝试清理...`)
      rmSync(chunksDir, { recursive: true, force: true })
    }
  }

  // 拷贝 SKILL.md 到输出目录
  const skillMdSrc = resolve(__dirname, 'SKILL.md')
  const skillMdDest = resolve(__dirname, '../../skills/imagegen-magick/SKILL.md')
  if (existsSync(skillMdSrc)) {
    copyFileSync(skillMdSrc, skillMdDest)
    console.log('📋 已拷贝 SKILL.md → skills/imagegen-magick/SKILL.md')
  }

  // 拷贝 references/ 到输出目录
  const refsSrc = resolve(__dirname, 'references')
  const refsDest = resolve(__dirname, '../../skills/imagegen-magick/references')
  if (existsSync(refsSrc)) {
    rmSync(refsDest, { recursive: true, force: true })
    cpSync(refsSrc, refsDest, { recursive: true })
    const refsCount = readdirSync(refsDest).length
    console.log(`📚 已拷贝 references/ (${refsCount} 个文件) → skills/imagegen-magick/references/`)
  }

  // 拷贝 examples/ 到输出目录
  const examplesSrc = resolve(__dirname, 'examples')
  const examplesDest = resolve(__dirname, '../../skills/imagegen-magick/examples')
  if (existsSync(examplesSrc)) {
    rmSync(examplesDest, { recursive: true, force: true })
    cpSync(examplesSrc, examplesDest, { recursive: true })
    const examplesCount = readdirSync(examplesDest).length
    console.log(`📝 已拷贝 examples/ (${examplesCount} 个文件) → skills/imagegen-magick/examples/`)
  }

  // 统计结果
  // 统计结果
  const elapsed = Date.now() - startTime
  console.log(`\n✅ 全部构建成功 (${elapsed}ms)`)
  console.log('\n📦 产物列表:')
  for (const { name } of results) {
    console.log(`   - ${name}.mjs`)
  }
  console.log('\n💡 提示：每个文件都是独立单文件，可直接运行（零 chunk 依赖）')
}

// 执行
main().catch((err) => {
  console.error('构建脚本执行失败:', err)
  process.exit(1)
})
