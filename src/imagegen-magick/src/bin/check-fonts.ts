/**
 * 字体检测与推荐工具
 *
 * 用途：
 * - 列出系统中所有可用的字体
 * - 按关键字过滤字体
 * - 检测推荐字体（代码/中文/衬线/无衬线）的可用性
 * - 为 SVG 设计提供字体建议
 *
 * 调用示例：
 *   node check-fonts.mjs                       # 列出所有字体
 *   node check-fonts.mjs --filter "Cascadia"   # 过滤关键字
 *   node check-fonts.mjs --recommend "code"    # 显示代码字体推荐
 *   node check-fonts.mjs --json                # JSON 输出
 */

import { Command } from 'commander'
import { detectSystemFonts } from '../lib/font-detector.js'
import {
  resolveFont,
  DEFAULT_CODE_FONT_CANDIDATES,
  DEFAULT_CJK_FONT_CANDIDATES,
  DEFAULT_SANS_FONT_CANDIDATES,
  DEFAULT_SERIF_FONT_CANDIDATES,
} from '../lib/font-fallback.js'
import { createLogger } from '../lib/logger.js'
import { colors } from '../lib/colors.js'
import type { FontInfo } from '../types/index.js'

// 推荐场景映射
const RECOMMEND_SCENARIOS: Record<string, string[]> = {
  code: DEFAULT_CODE_FONT_CANDIDATES,
  cjk: DEFAULT_CJK_FONT_CANDIDATES,
  chinese: DEFAULT_CJK_FONT_CANDIDATES,
  sans: DEFAULT_SANS_FONT_CANDIDATES,
  serif: DEFAULT_SERIF_FONT_CANDIDATES,
}

const program = new Command()
  .name('check-fonts')
  .description('检测和推荐系统字体')
  .option('--filter <keyword>', '按关键字过滤字体（不区分大小写）')
  .option('--recommend <scenario>', '显示推荐字体（code/cjk/sans/serif）')
  .option('--limit <n>', '最多显示的字体数量', (s) => parseInt(s, 10), 50)
  .option('--json', 'JSON 格式输出', false)
  .option('--quiet', '静默模式', false)
  .option('--debug', '调试模式', false)
  .parse()

const opts = program.opts<{
  filter?: string
  recommend?: string
  limit: number
  json: boolean
  quiet: boolean
  debug: boolean
}>()

const log = createLogger({ json: opts.json, quiet: opts.quiet, debug: opts.debug })

async function main() {
  // 1. 检测系统字体
  log.info('扫描系统字体...')
  const allFonts = await detectSystemFonts()
  log.debug('扫描完成', { count: allFonts.length })

  if (allFonts.length === 0) {
    log.warn('未检测到任何字体（可能 ImageMagick 和 fc-list 都不可用）')
    if (!opts.json) {
      process.stdout.write(
        '\n' + colors.yellow('⚠ 没有检测到任何字体。请尝试安装 ImageMagick 或 fc-list。\n')
      )
    }
    process.exit(0)
  }

  // 2. 推荐场景
  if (opts.recommend) {
    const scenario = opts.recommend.toLowerCase()
    const candidates = RECOMMEND_SCENARIOS[scenario]
    if (!candidates) {
      log.error(`未知推荐场景: ${opts.recommend}`, {
        available: Object.keys(RECOMMEND_SCENARIOS).join(', '),
      })
      process.exit(2)
    }

    log.info(`评估 "${scenario}" 场景字体推荐...`)
    const results = candidates.map((cand) => ({
      candidate: cand,
      result: resolveFont(allFonts, cand, {
        candidates: [cand],
        allowCJK: false,
        verbose: false,
      }),
    }))

    const availableCount = results.filter((r) => r.result.matched).length

    if (opts.json) {
      process.stdout.write(
        JSON.stringify(
          {
            scenario,
            candidates,
            availableCount,
            results: results.map((r) => ({
              name: r.candidate,
              available: r.result.matched,
              usedName: r.result.usedName,
              source: r.result.source,
              file: r.result.file,
            })),
          },
          null,
          2
        ) + '\n'
      )
    } else {
      process.stdout.write('\n')
      process.stdout.write(
        colors.bold(colors.cyan(`=== ${scenario} 场景字体推荐 ===\n\n`))
      )
      process.stdout.write(
        `可用: ${colors.green(String(availableCount))} / ${candidates.length} 个\n\n`
      )

      for (const { candidate, result } of results) {
        if (result.matched && result.source === 'exact') {
          process.stdout.write(
            `  ${colors.green('✓')} ${colors.green(candidate.padEnd(25))} ${colors.dim(
              result.file ?? ''
            )}\n`
          )
        } else {
          process.stdout.write(`  ${colors.gray('✗')} ${colors.gray(candidate.padEnd(25))}\n`)
        }
      }
      process.stdout.write('\n')

      const firstAvailable = results.find((r) => r.result.matched)
      if (firstAvailable) {
        process.stdout.write(
          colors.bold('推荐首选: ') +
            colors.green(firstAvailable.result.usedName) +
            '\n\n'
        )
      }
    }
    process.exit(0)
  }

  // 3. 普通列表模式
  let fontsToShow: FontInfo[]
  if (opts.filter) {
    const keyword = opts.filter.toLowerCase()
    fontsToShow = allFonts.filter(
      (f) => f.family.toLowerCase().includes(keyword) || f.file.toLowerCase().includes(keyword)
    )
    log.info(`按 "${opts.filter}" 过滤`, { count: fontsToShow.length })
  } else {
    fontsToShow = allFonts
  }

  // 限制显示数量
  const limited = fontsToShow.slice(0, opts.limit)

  if (opts.json) {
    process.stdout.write(
      JSON.stringify(
        {
          total: allFonts.length,
          shown: limited.length,
          fonts: limited.map((f) => ({ family: f.family, file: f.file, source: f.source })),
        },
        null,
        2
      ) + '\n'
    )
  } else {
    process.stdout.write('\n')
    process.stdout.write(
      colors.bold(colors.cyan(`=== 系统字体 (${allFonts.length} 个) ===\n\n`))
    )
    if (opts.filter) {
      process.stdout.write(`过滤: "${opts.filter}" - 匹配 ${fontsToShow.length} 个\n\n`)
    }

    for (const font of limited) {
      process.stdout.write(
        `  ${colors.bold(font.family.padEnd(30))} ${colors.dim(font.file)}\n`
      )
    }

    if (fontsToShow.length > opts.limit) {
      process.stdout.write(
        '\n' +
          colors.dim(
            `  ... 还有 ${fontsToShow.length - opts.limit} 个未显示，请使用 --limit <n> 调整\n`
          )
      )
    }
    process.stdout.write('\n')
  }

  process.exit(0)
}

main().catch((err) => {
  log.error('check-fonts 命令执行失败', { error: err.message })
  if (opts.debug) console.error(err)
  process.exit(1)
})
