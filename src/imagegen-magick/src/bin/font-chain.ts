#!/usr/bin/env node
/**
 * 字体链生成工具
 *
 * 用途：
 * - 执行 magick identify -list font 获取当前系统真实可用字体
 * - 按类别分类（代码/中文/无衬线/衬线）
 * - 按 curated 优先级列表排序
 * - 生成 references/font-handling.jsonc 供 agent 和 font-fallback.ts 使用
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Command } from 'commander'
import { magick } from '../lib/magick.js'
import { createLogger } from '../lib/logger.js'
import { colors } from '../lib/colors.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// 输出路径：skills/imagegen-magick/references/font-handling.jsonc
// font-chain.mjs 在 scripts/dist/ 下，向上 2 级到 imagegen-magick/
const JSONC_PATH = resolve(__dirname, '../../references/font-handling.jsonc')

const program = new Command()
  .name('font-chain')
  .description('从 ImageMagick 生成字体 fallback 链配置')
  .option('--json', '仅输出 JSON 到 stdout（不写入文件）', false)
  .option('--dry-run', '预览生成内容但不写入文件', false)
  .option('--quiet', '静默模式', false)
  .option('--debug', '调试模式', false)
  .parse()

const opts = program.opts<{
  json: boolean
  dryRun: boolean
  quiet: boolean
  debug: boolean
}>()

const log = createLogger({ json: false, quiet: opts.quiet, debug: opts.debug })

// 优先级列表（curated，按推荐顺序排列）
// 分类后的字体按此列表排序，不在列表中的追加到末尾
// ============================================================

/** 代码/等宽字体优先级（高 → 低） */
const CODE_PRIORITY = [
  'Cascadia Next SC NF',
  'Cascadia Next',
  'Cascadia Code',
  'Cascadia Mono',
  'Fira Code',
  'Fira Mono',
  'JetBrains Mono',
  'JetBrains Mono NL',
  'Hack',
  'Source Code Pro',
  'IBM Plex Mono',
  'Consolas',
  'DejaVu Sans Mono',
  'Courier New',
]

/** 中文字体优先级 */
const CJK_PRIORITY = [
  'Microsoft YaHei',
  'Microsoft YaHei UI',
  'DengXian',
  'SimHei',
  'SimSun',
  'PingFang SC',
  'STHeiti',
  'Noto Sans CJK SC',
  'Noto Sans SC',
  'WenQuanYi Micro Hei',
]

/** 无衬线字体优先级 */
const SANS_PRIORITY = [
  'Inter',
  'Roboto',
  'SF Pro Display',
  'SF Pro Text',
  'Segoe UI',
  'Open Sans',
  'Lato',
  'Noto Sans',
  'Arial',
  'Helvetica',
]

/** 衬线字体优先级 */
const SERIF_PRIORITY = [
  'Charter',
  'Source Serif Pro',
  'Georgia',
  'Cambria',
  'Times New Roman',
  'Noto Serif',
]

/**
 * 按优先级列表排序字体
 * 在优先级列表中的按列表顺序排，不在的追加到末尾
 */
function sortByPriority(fonts: string[], priority: string[]): string[] {
  const priorityMap = new Map(priority.map((name, i) => [name.toLowerCase(), i]))
  return [...fonts].sort((a, b) => {
    const ai = priorityMap.get(a.toLowerCase()) ?? Infinity
    const bi = priorityMap.get(b.toLowerCase()) ?? Infinity
    return ai - bi
  })
}

// ============================================================
// 分类关键字（用于将字体分到 code/cjk/sans/serif 四个类别）
// ============================================================

/** 代码/等宽字体关键字 */
const CODE_KEYWORDS = [
  'mono', 'code', 'consol', 'courier', 'hack', 'plex mono',
  'firacode', 'fira mono', 'cascadia', 'jetbrains',
]

/** 中文字体关键字 */
const CJK_KEYWORDS = [
  'yahei', 'dengxian', 'simhei', 'simsun', 'fangsong', 'simkai',
  'pingfang', 'stheiti', 'hiragino', 'noto sans cjk', 'noto sans sc',
  'wenquanyi', 'source han', 'adobe song', 'microsoft yahei',
  'droid sans fallback', 'ar pl',
]

/** 无衬线字体关键字 */
const SANS_KEYWORDS = [
  'sans', 'inter', 'roboto', 'segoe', 'open sans', 'lato',
  'helvetica', 'arial', 'sf pro',
]

/** 衬线字体关键字 */
const SERIF_KEYWORDS = [
  'serif', 'georgia', 'cambria', 'times', 'charter', 'garamond',
  'palatino', 'baskerville',
]

/**
 * 字体分类匹配（不区分大小写）
 */
function matchesAny(name: string, keywords: string[]): boolean {
  const lower = name.toLowerCase()
  return keywords.some(k => lower.includes(k))
}

/**
 * 对字体去重（同一 family 只保留第一个）
 */
function deduplicate(fonts: Array<{ family: string; file: string }>): Array<{ family: string; file: string }> {
  const seen = new Set<string>()
  return fonts.filter(f => {
    const key = f.family.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * 按关键词分类字体到四个类别
 */
function classifyFonts(
  fonts: Array<{ family: string; file: string }>
): { code: string[]; cjk: string[]; sans: string[]; serif: string[] } {
  const codeSet = new Set<string>()
  const cjkSet = new Set<string>()
  const sansSet = new Set<string>()
  const serifSet = new Set<string>()

  for (const font of fonts) {
    const family = font.family

    if (matchesAny(family, CODE_KEYWORDS)) {
      codeSet.add(family)
    }
    if (matchesAny(family, CJK_KEYWORDS)) {
      cjkSet.add(family)
    }
    if (matchesAny(family, SANS_KEYWORDS)) {
      sansSet.add(family)
    }
    if (matchesAny(family, SERIF_KEYWORDS)) {
      serifSet.add(family)
    }
  }

  return {
    code: sortByPriority([...codeSet], CODE_PRIORITY),
    cjk: sortByPriority([...cjkSet], CJK_PRIORITY),
    sans: sortByPriority([...sansSet], SANS_PRIORITY),
    serif: sortByPriority([...serifSet], SERIF_PRIORITY),
  }
}

/**
 * 构建 JSONC 输出内容（带格式化注释）
 */
function buildJsonc(
  chains: { code: string[]; cjk: string[]; sans: string[]; serif: string[] },
  totalCount: number
): string {
  const now = new Date().toISOString()
  const lines: string[] = []

  lines.push('{')
  lines.push(`  // 由 font-chain.mjs 自动生成，请勿手动编辑`)
  lines.push(`  // 数据源: magick identify -list font`)
  lines.push(`  // 生成时间: ${now}`)
  lines.push(`  // 系统字体总数: ${totalCount}`)
  lines.push('')
  lines.push('  "generatedAt": "' + now + '",')
  lines.push('  "source": "magick identify -list font",')
  lines.push('  "totalFonts": ' + totalCount + ',')
  lines.push('')

  // 代码字体
  lines.push('  // 代码/西文等宽字体（按优先级排序）')
  lines.push('  "code": {')
  lines.push('    "description": "代码、CLI、博客封面等场景的等宽字体",')
  lines.push('    "chain": [')
  for (let i = 0; i < chains.code.length; i++) {
    const comma = i < chains.code.length - 1 ? ',' : ''
    lines.push(`      "${chains.code[i]}"${comma}`)
  }
  lines.push('    ]')
  lines.push('  },')
  lines.push('')

  // 中文字体
  lines.push('  // 中文字体（按平台优先级排序）')
  lines.push('  "cjk": {')
  lines.push('    "description": "中文字符渲染，与代码字体配合使用",')
  lines.push('    "chain": [')
  for (let i = 0; i < chains.cjk.length; i++) {
    const comma = i < chains.cjk.length - 1 ? ',' : ''
    lines.push(`      "${chains.cjk[i]}"${comma}`)
  }
  lines.push('    ]')
  lines.push('  },')
  lines.push('')

  // 无衬线字体
  lines.push('  // 西文无衬线字体（UI、标题）')
  lines.push('  "sans": {')
  lines.push('    "description": "西文无衬线字体，适合 UI 和标题",')
  lines.push('    "chain": [')
  for (let i = 0; i < chains.sans.length; i++) {
    const comma = i < chains.sans.length - 1 ? ',' : ''
    lines.push(`      "${chains.sans[i]}"${comma}`)
  }
  lines.push('    ]')
  lines.push('  },')
  lines.push('')

  // 衬线字体
  lines.push('  // 西文衬线字体（长文阅读）')
  lines.push('  "serif": {')
  lines.push('    "description": "西文衬线字体，适合长文阅读",')
  lines.push('    "chain": [')
  for (let i = 0; i < chains.serif.length; i++) {
    const comma = i < chains.serif.length - 1 ? ',' : ''
    lines.push(`      "${chains.serif[i]}"${comma}`)
  }
  lines.push('    ]')
  lines.push('  }')

  lines.push('}')
  return lines.join('\n')
}

// ============================================================
// 主流程
// ============================================================

async function main() {
  // 1. 检查 ImageMagick
  log.info('检查 ImageMagick...')
  const imInfo = await magick.detect()
  if (!imInfo.installed) {
    log.error('ImageMagick 未安装，无法生成字体链', { error: imInfo.error })
    process.exit(3)
  }
  log.info(`ImageMagick ${imInfo.version} 已安装`)

  // 2. 获取所有字体
  log.info('执行 magick identify -list font ...')
  const allFonts = await magick.listFonts()

  if (allFonts.length === 0) {
    log.warn('未检测到任何字体')
    process.exit(1)
  }
  log.info(`检测到 ${allFonts.length} 个字体`)

  // 3. 去重
  const uniqueFonts = deduplicate(allFonts)
  log.info(`去重后 ${uniqueFonts.length} 个字体`)

  // 4. 分类
  const chains = classifyFonts(uniqueFonts)
  log.info('分类结果', {
    code: chains.code.length,
    cjk: chains.cjk.length,
    sans: chains.sans.length,
    serif: chains.serif.length,
  })

  // 5. 生成 JSONC
  const jsonc = buildJsonc(chains, allFonts.length)

  // 6. 输出
  if (opts.json) {
    process.stdout.write(jsonc + '\n')
    process.exit(0)
  }

  if (opts.dryRun) {
    process.stdout.write('\n' + colors.bold(colors.cyan('=== 预览 font-handling.jsonc ===\n\n')))
    process.stdout.write(jsonc + '\n')
    process.exit(0)
  }

  // 7. 写入文件
  // 确保目录存在
  const dir = dirname(JSONC_PATH)
  if (!existsSync(dir)) {
    const { mkdirSync } = await import('node:fs')
    mkdirSync(dir, { recursive: true })
  }

  writeFileSync(JSONC_PATH, jsonc + '\n', 'utf-8')
  log.info(`已写入: ${JSONC_PATH}`)

  // 8. 汇总
  process.stdout.write('\n')
  process.stdout.write(colors.bold(colors.cyan('=== 字体链生成完成 ===\n\n')))
  process.stdout.write(`  输出文件: ${colors.green(JSONC_PATH)}\n`)
  process.stdout.write(`  系统字体: ${colors.green(String(allFonts.length))} 个\n`)
  process.stdout.write(`  去重后:   ${colors.green(String(uniqueFonts.length))} 个\n\n`)
  process.stdout.write('  分类结果:\n')
  process.stdout.write(`    代码字体: ${colors.green(String(chains.code.length))} 个`)
  if (chains.code.length > 0) {
    process.stdout.write(`  (${chains.code.slice(0, 3).join(', ')}${chains.code.length > 3 ? '...' : ''})`)
  }
  process.stdout.write('\n')
  process.stdout.write(`    中文字体: ${colors.green(String(chains.cjk.length))} 个`)
  if (chains.cjk.length > 0) {
    process.stdout.write(`  (${chains.cjk.slice(0, 3).join(', ')}${chains.cjk.length > 3 ? '...' : ''})`)
  }
  process.stdout.write('\n')
  process.stdout.write(`    无衬线:   ${colors.green(String(chains.sans.length))} 个`)
  if (chains.sans.length > 0) {
    process.stdout.write(`  (${chains.sans.slice(0, 3).join(', ')}${chains.sans.length > 3 ? '...' : ''})`)
  }
  process.stdout.write('\n')
  process.stdout.write(`    衬线:     ${colors.green(String(chains.serif.length))} 个`)
  if (chains.serif.length > 0) {
    process.stdout.write(`  (${chains.serif.slice(0, 3).join(', ')}${chains.serif.length > 3 ? '...' : ''})`)
  }
  process.stdout.write('\n\n')
  process.stdout.write(colors.dim('  提示: agent 首次使用时应执行此工具生成配置\n\n'))

  process.exit(0)
}

main().catch((err) => {
  log.error('font-chain 命令执行失败', { error: err.message })
  if (opts.debug) console.error(err)
  process.exit(1)
})
