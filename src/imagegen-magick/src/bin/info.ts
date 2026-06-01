/**
 * imagegen-magick 环境信息检查工具
 *
 * 用途：
 * - 检查 Node.js 版本
 * - 检查 ImageMagick 是否安装
 * - 报告内置字体信息
 *
 * 调用示例：
 *   node info.mjs           # 人类可读输出
 *   node info.mjs --json    # JSON 输出（供 AI 解析）
 *
 * 退出码规范：
 * - 0: 所有核心依赖就绪
 * - 1: 一般性问题
 * - 3: ImageMagick 缺失（严重问题）
 */

import { Command } from 'commander'
import { magick } from '../lib/magick.js'
import { createLogger } from '../lib/logger.js'
import { colors } from '../lib/colors.js'

/** 内置字体名称 */
const BUNDLED_FONT = 'Cascadia Next SC NF'

// 命令行解析
const program = new Command()
  .name('info')
  .description('检查 imagegen-magick 技能的运行环境')
  .option('--json', '以 JSON 格式输出，便于 AI 解析', false)
  .option('--quiet', '完全静默，只输出结构化结果', false)
  .option('--debug', '显示调试信息', false)
  .parse()

const opts = program.opts<{
  json: boolean
  quiet: boolean
  debug: boolean
}>()

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
    log.success('ImageMagick 已安装', {
      version: imInfo.version,
      executable: imInfo.executable,
      formatCount: imInfo.formats?.length ?? 0,
    })
  } else {
    log.error('ImageMagick 未检测到', { reason: imInfo.error })
  }

  // 3. 汇总问题
  const issues: string[] = []
  if (!imInfo.installed) {
    issues.push('ImageMagick 未安装 - 无法渲染 SVG 为 PNG')
  }

  // 4. 构造汇总对象
  const envInfo = {
    node: nodeVersion,
    platform: `${process.platform} ${process.arch}`,
    imagemagick: imInfo,
    bundledFont: BUNDLED_FONT,
    issues,
  }

  // 5. 输出
  if (opts.json) {
    process.stdout.write(JSON.stringify(envInfo, null, 2) + '\n')
  } else {
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

    process.stdout.write(colors.bold('🔤 内置字体:\n'))
    process.stdout.write(`   ${colors.green(BUNDLED_FONT)}\n`)
    process.stdout.write(`   字重: Regular, Bold, Light, Medium, SemiBold, ExtraLight, ExtraBold\n`)
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

  // 6. 决定退出码
  if (!imInfo.installed) {
    process.exit(3)
  }
  if (issues.length > 0) {
    process.exit(1)
  }
  process.exit(0)
}

main().catch((err) => {
  log.error('info 命令执行失败', { error: err.message })
  if (opts.debug) {
    console.error(err)
  }
  process.exit(1)
})
