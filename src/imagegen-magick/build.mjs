#!/usr/bin/env node
/**
 * Vite 8 + Rolldown 多入口构建脚本
 *
 * 策略：逐个构建，避免 Rolldown 提取共享模块为独立 chunk。
 * 每个 CLI 工具（info/render/post-process）输出为独立 .mjs，
 * 零外部依赖，可直接运行（符合"零安装分发"需求）。
 *
 * 输出：skills/imagegen-magick/scripts/dist/*.mjs
 */

import { build } from 'vite'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chmodSync, existsSync, rmSync, readdirSync, copyFileSync, cpSync } from 'node:fs'
import { platform } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(__dirname, '../../skills/imagegen-magick/scripts/dist')

const ENTRIES = ['info', 'render', 'post-process']

async function buildEntry(name, isFirst) {
  console.log(`\n▶ 构建: ${name}.mjs`)

  try {
    await build({
      configFile: resolve(__dirname, 'vite.config.ts'),
      build: {
        ssr: true,
        lib: {
          entry: resolve(__dirname, `src/bin/${name}.ts`),
          formats: ['es'],
          fileName: () => `${name}.mjs`,
        },
        outDir: OUT_DIR,
        emptyOutDir: isFirst,
        sourcemap: true,
        minify: false,
      },
      ssr: {
        noExternal: ['commander'],
      },
      rolldownOptions: {
        external: [/^node:/],
      },
      logLevel: 'warn',
    })

    // 类 Unix 设置可执行权限
    const outFile = resolve(OUT_DIR, `${name}.mjs`)
    if (platform() !== 'win32' && existsSync(outFile)) {
      chmodSync(outFile, 0o755)
    }

    return true
  } catch (err) {
    console.error(`✗ 构建失败: ${name}.mjs`, err.message)
    return false
  }
}

async function main() {
  console.log('🔧 imagegen-magick 构建 (Vite 8 + Rolldown)')
  console.log(`   输出: ${OUT_DIR}`)

  const startTime = Date.now()
  const results = []

  // 逐个构建（串行，避免 Vite 内部状态冲突）
  for (let i = 0; i < ENTRIES.length; i++) {
    const name = ENTRIES[i]
    const success = await buildEntry(name, i === 0)
    results.push({ name, success })

    if (!success) {
      console.error(`\n❌ 构建中断: ${name} 失败`)
      process.exit(1)
    }
  }

  // Vite 8 lib 模式输出 .js，需重命名为 .mjs
  console.log('\n✓ 验证产物...')
  for (const name of ENTRIES) {
    const jsFile = resolve(OUT_DIR, `${name}.js`)
    const mjsFile = resolve(OUT_DIR, `${name}.mjs`)

    if (existsSync(jsFile) && !existsSync(mjsFile)) {
      const { rename } = await import('node:fs/promises')
      await rename(jsFile, mjsFile)
      console.log(`  ${name}.js → ${name}.mjs`)

      const jsMap = resolve(OUT_DIR, `${name}.js.map`)
      if (existsSync(jsMap)) {
        await rename(jsMap, resolve(OUT_DIR, `${name}.mjs.map`))
      }
    }

    if (!existsSync(mjsFile)) {
      console.error(`✗ 缺失: ${name}.mjs`)
      process.exit(1)
    }
  }

  // 拷贝 SKILL.md 和 references/
  const skillMdSrc = resolve(__dirname, 'SKILL.md')
  const skillMdDest = resolve(__dirname, '../../skills/imagegen-magick/SKILL.md')
  if (existsSync(skillMdSrc)) {
    copyFileSync(skillMdSrc, skillMdDest)
    console.log('📋 SKILL.md → skills/imagegen-magick/')
  }

  const refsSrc = resolve(__dirname, 'references')
  const refsDest = resolve(__dirname, '../../skills/imagegen-magick/references')
  if (existsSync(refsSrc)) {
    rmSync(refsDest, { recursive: true, force: true })
    cpSync(refsSrc, refsDest, { recursive: true })
    console.log(`📚 references/ (${readdirSync(refsDest).length} 文件) → skills/imagegen-magick/`)
  }

  // 拷贝 README.md
  const readmeSrc = resolve(__dirname, 'README.md')
  const readmeDest = resolve(__dirname, '../../skills/imagegen-magick/README.md')
  if (existsSync(readmeSrc)) {
    copyFileSync(readmeSrc, readmeDest)
    console.log('📖 README.md → skills/imagegen-magick/')
  }

  // 拷贝内置字体文件（Cascadia Next SC NF）
  const fontsSrc = resolve(__dirname, 'fonts')
  const fontsDest = resolve(__dirname, '../../skills/imagegen-magick/fonts')
  if (existsSync(fontsSrc)) {
    rmSync(fontsDest, { recursive: true, force: true })
    cpSync(fontsSrc, fontsDest, { recursive: true })
    console.log(`🔤 fonts/ (${readdirSync(fontsDest).length} 文件) → skills/imagegen-magick/`)
  }

  const elapsed = Date.now() - startTime
  console.log(`\n✅ 构建完成 (${elapsed}ms)`)
  console.log('📦 产物:', results.map(r => `${r.name}.mjs`).join(', '))
}

main().catch(err => {
  console.error('构建失败:', err)
  process.exit(1)
})
