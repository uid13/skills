/**
 * imagegen-magick 环境信息检查工具
 *
 * 用途：
 * - 检查 Node.js 版本
 * - 检查 ImageMagick 是否安装
 * - 检查系统中可用的字体
 * - 检查推荐字体（Cascadia Code）是否可用
 * - 输出汇总报告（人类可读或 JSON format）
 *
 * 调用示例：
 *   node info.mjs                       # 人类可读输出
 *   node info.mjs --json                # JSON 输出（供 AI 解析）
 *   node info.mjs --preferred "Cascadia Code" # 检查特定字体
 *
 * 退出码规范：
 * - 0: 所有核心依赖就绪（IM + 至少一个字体）
 * - 1: ImageMagick 缺失（无法渲染 SVG）
 * - 3: 依赖缺失（详见输出）
 */

import { Command } from 'commander'
import { magick } from '../lib/magick.js'
import { detectSystemFonts } from '../lib/font-detector.js'
import { resolveFont, DEFAULT_CODE_FONT_CANDIDATES } from '../lib/font-fallback.js'
import { createLogger } from '../lib/logger.js'
import { colors } from '../lib/colors.js'
import type { EnvironmentInfo } from '../types/index.js'

// 命令行解析
const program = new Command()
  .name('info')
  .description('检查 imagegen-magick 技能的运行环境')
  .option('--json', '以 JSON 格式输出，便于 AI 解析', false)
  .option('--quiet', '完全静默，只输出结构化结果', false)
  .option(
    '--preferred <name>',
    '首选字体名（默认 "Cascadia Code"）',
    'Cascadia Code'
  )
  .option('--debug', '显示调试信息', false)
  .parse()

const opts = program.opts<{
  json: boolean
  quiet: boolean
  preferred: string
  debug: boolean
}>()

// 创建 logger
const log = createLogger({ json: opts.json, quiet: opts.quiet, debug: opts.debug })

/**
 * 主流程：收集环境信息并输出
 */
async function main() {
  log.info('正在收集环境信息...')

  // 1. Node.js 版本
  const nodeVersion = process.version
  log.debug('Node 版本检测完成', { node: nodeVersion })

  // 2. ImageMagick 检测
  log.info('检测 ImageMagick...')
  const imInfo = await magick.detect()

  if (imInfo.installed) {
    log.success(`ImageMagick 已安装`, {
      version: imInfo.version,
      executable: imInfo.executable,
      formatCount: imInfo.formats?.length ?? 0,
    })
  } else {
    log.error('ImageMagick 未检测到', { reason: imInfo.error })
  }

  // 3. 系统字体检测
  log.info('扫描系统字体...')
  const allFonts = await detectSystemFonts()
  log.debug('字体扫描完成', { count: allFonts.length })

  // 4. 检查首选字体
  log.info(`检查首选字体 "${opts.preferred}"...`)
  const preferredMatch = resolveFont(allFonts, opts.preferred, {
    candidates: DEFAULT_CODE_FONT_CANDIDATES,
    allowCJK: true,
    verbose: true,
  })

  if (preferredMatch.source === 'exact') {
    log.success('首选字体可用', { usedName: preferredMatch.usedName })
  } else if (preferredMatch.source === 'fallback') {
    log.warn(preferredMatch.warning ?? '已降级到其他字体', {
      requested: preferredMatch.requestedName,
      used: preferredMatch.usedName,
    })
  } else {
    log.error('未找到合适字体', { reason: preferredMatch.warning })
  }

  // 5. 识别系统中存在的中文字体（用于报告）
  const availableCJKFonts = allFonts
    .filter((f) =>
      // 通过已知中文字体族名前缀匹配
      [
        'Microsoft YaHei',
        'DengXian',
        'SimHei',
        'SimSun',
        'PingFang',
        'Hiragino',
        'Noto Sans CJK',
        'WenQuanYi',
        'Source Han',
      ].some((prefix) => f.family.toLowerCase().includes(prefix.toLowerCase()))
    )
    .map((f) => f.family)
    .slice(0, 10) // 限制报告数量

  // 6. 汇总问题
  const issues: string[] = []
  if (!imInfo.installed) {
    issues.push('ImageMagick 未安装 - 无法渲染 SVG 为 PNG')
  }
  if (allFonts.length === 0) {
    issues.push('未检测到任何系统字体 - SVG 文字可能渲染为默认字体')
  }
  if (availableCJKFonts.length === 0) {
    issues.push('未检测到中文字体 - 中文内容可能显示为方块')
  }
  if (preferredMatch.source === 'missing') {
    issues.push(`首选字体 "${opts.preferred}" 及其所有候选都不可用`)
  }

  // 7. 构造汇总对象
  const envInfo: EnvironmentInfo = {
    node: nodeVersion,
    platform: `${process.platform} ${process.arch}`,
    imagemagick: imInfo,
    preferredFont: preferredMatch,
    totalFonts: allFonts.length,
    availableCJKFonts,
    issues,
  }

  // 8. 输出汇总
  if (opts.json) {
    // JSON 模式：直接输出结构化数据
    process.stdout.write(JSON.stringify(envInfo, null, 2) + '\n')
  } else {
    // 人类可读模式
    process.stdout.write('\n')
    process.stdout.write(colors.bold(colors.cyan('=== imagegen-magick 环境信息 ===\n\n')))

    process.stdout.write(colors.bold('🖥️  Node.js:\n'))
    process.stdout.write(`   版本: ${colors.green(nodeVersion)}\n`)
    process.stdout.write(`   平台: ${process.platform} ${process.arch}\n`)
    process.stdout.write(`   工作目录: ${process.cwd()}\n\n`)

    process.stdout.write(colors.bold('🎨 ImageMagick:\n'))
    if (imInfo.installed) {
      process.stdout.write(`   状态: ${colors.green('✓ 已安装')}\n`)
      process.stdout.write(`   版本: ${colors.green(imInfo.version ?? '未知')}\n`)
      process.stdout.write(`   命令: ${imInfo.executable}\n`)
      process.stdout.write(`   支持格式: ${imInfo.formats?.length ?? 0} 个\n`)
    } else {
      process.stdout.write(`   状态: ${colors.red('✗ 未安装')}\n`)
      process.stdout.write(`   原因: ${colors.yellow(imInfo.error ?? '未知')}\n`)
    }
    process.stdout.write('\n')

    process.stdout.write(colors.bold('🔤 系统字体:\n'))
    process.stdout.write(`   总数: ${colors.blue(String(allFonts.length))} 个\n`)
    process.stdout.write(`   中文字体: ${availableCJKFonts.length} 个\n`)
    if (availableCJKFonts.length > 0) {
      process.stdout.write(
        `   (示例: ${availableCJKFonts.slice(0, 3).join(', ')}${
          availableCJKFonts.length > 3 ? '...' : ''
        })\n`
      )
    }
    process.stdout.write('\n')

    process.stdout.write(colors.bold(`🔍 首选字体 ("${opts.preferred}"):\n`))
    if (preferredMatch.source === 'exact') {
      process.stdout.write(`   状态: ${colors.green('✓ 精确匹配')}\n`)
      process.stdout.write(`   字体: ${colors.green(preferredMatch.usedName)}\n`)
    } else if (preferredMatch.source === 'fallback') {
      process.stdout.write(`   状态: ${colors.yellow('⚠ 降级')}\n`)
      process.stdout.write(`   请求: ${opts.preferred}\n`)
      process.stdout.write(`   实际: ${colors.yellow(preferredMatch.usedName)}\n`)
    } else {
      process.stdout.write(`   状态: ${colors.red('✗ 未匹配')}\n`)
      if (preferredMatch.warning) {
        process.stdout.write(`   原因: ${colors.red(preferredMatch.warning)}\n`)
      }
    }
    process.stdout.write('\n')

    if (issues.length > 0) {
      process.stdout.write(colors.bold('⚠️  发现问题:\n'))
      for (const issue of issues) {
        process.stdout.write(`   ${colors.yellow('⚠')} ${issue}\n`)
      }
      process.stdout.write('\n')
    } else {
      process.stdout.write(colors.bold(colors.green('✓ 环境就绪，可以正常使用 imagegen-magick\n')))
    }
  }

  // 9. 决定退出码
  if (!imInfo.installed) {
    process.exit(3) // IM 缺失是严重问题
  }
  if (issues.filter((i) => !i.includes('中文字体')).length > 0) {
    process.exit(1) // 其他问题一般退出
  }
  process.exit(0)
}

// 执行
main().catch((err) => {
  log.error('info 命令执行失败', { error: err.message })
  if (opts.debug) {
    console.error(err)
  }
  process.exit(1)
})
