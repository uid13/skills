/**
 * SVG → PNG 渲染工具
 *
 * 用途：
 * - 将 SVG 文件渲染为高质量 PNG
 * - 支持透明背景、自定义 DPI、缩放因子
 * - 自动处理文件扩展名校验和冲突检测
 *
 * 调用示例：
 *   node render.mjs cover.svg                      # 输出 cover.png
 *   node render.mjs cover.svg -o output.png        # 指定输出
 *   node render.mjs cover.svg --scale 2x           # 2x 分辨率
 *   node render.mjs cover.svg --background white   # 白色背景（默认透明）
 *   node render.mjs cover.svg --force              # 强制覆盖
 *
 * 退出码：
 * - 0: 渲染成功
 * - 1: 渲染失败（详见 stderr）
 * - 2: 参数错误（输入文件不存在、扩展名错误等）
 * - 3: 依赖缺失（ImageMagick 未安装）
 */

import { Command } from 'commander'
import { existsSync } from 'node:fs'
import { magick } from '../lib/magick.js'
import { createLogger } from '../lib/logger.js'
import { colors } from '../lib/colors.js'
import { toAbsolutePath, getExt, uniquePath } from '../utils/path.js'

const program = new Command()
  .name('render')
  .description('将 SVG 渲染为 PNG 图像')
  .argument('<input>', '输入 SVG 文件路径')
  .option('-o, --output <path>', '输出 PNG 路径（默认与输入同名，扩展名为 .png）')
  .option(
    '-s, --scale <factor>',
    '缩放因子（如 "2x" "3x" "0.5x" 或直接 DPI 数值如 "192"）',
    '2x'
  )
  .option(
    '--background <color>',
    '背景色（"transparent" 默认，或颜色名如 "white" "#FFFFFF"）',
    'transparent'
  )
  .option('--quality <n>', 'PNG 质量 1-100', (s) => parseInt(s, 10), 95)
  .option('-f, --force', '强制覆盖已存在的输出文件', false)
  .option('--json', 'JSON 输出', false)
  .option('--quiet', '静默模式', false)
  .option('--debug', '调试模式', false)
  .parse()

const input = program.args[0] as string
const opts = program.opts<{
  output?: string
  scale: string
  background: string
  quality: number
  force: boolean
  json: boolean
  quiet: boolean
  debug: boolean
}>()

const log = createLogger({ json: opts.json, quiet: opts.quiet, debug: opts.debug })

/**
 * 解析缩放因子 → 实际 DPI 数值
 *
 * 支持的格式：
 * - "2x" "3x" → 乘以 96 DPI
 * - "192" → 直接作为 DPI
 * - "192dpi" → 去掉单位
 */
function parseScale(scale: string): string {
  const trimmed = scale.trim().toLowerCase()
  if (trimmed.endsWith('x')) {
    const factor = parseFloat(trimmed)
    if (isNaN(factor) || factor <= 0) {
      throw new Error(`无效的缩放因子: ${scale}（应为数字 + "x"，如 "2x"）`)
    }
    return String(Math.round(factor * 96))
  }
  if (trimmed.endsWith('dpi')) {
    return trimmed.slice(0, -3)
  }
  return trimmed
}

/**
 * 验证输入文件
 */
function validateInput(path: string): string | null {
  if (!existsSync(path)) {
    return `输入文件不存在: ${path}`
  }
  const ext = getExt(path)
  if (ext !== '.svg' && ext !== '.svgz') {
    return `输入文件不是 SVG（扩展名为 ${ext}，需要 .svg 或 .svgz）`
  }
  return null
}

async function main() {
  if (!input) {
    log.error('缺少输入参数')
    process.exit(2)
  }

  const inputPath = toAbsolutePath(input)
  const inputError = validateInput(inputPath)
  if (inputError) {
    log.error('输入验证失败', { reason: inputError })
    if (!opts.json) {
      process.stdout.write('\n' + colors.red(`✗ ${inputError}\n\n`))
    }
    process.exit(2)
  }

  // 默认输出路径：同目录 + 同名 .png
  let outputPath = opts.output
    ? toAbsolutePath(opts.output)
    : inputPath.replace(/\.(svg|svgz)$/i, '.png')

  // 如果不强制覆盖且文件已存在，生成唯一文件名
  if (!opts.force && existsSync(outputPath)) {
    outputPath = uniquePath(outputPath, opts.force)
    log.info(`输出文件已存在，使用替代路径: ${outputPath}`)
  }

  // 检测 ImageMagick
  const imInfo = await magick.detect()
  if (!imInfo.installed) {
    log.error('ImageMagick 未安装，无法渲染 SVG', { reason: imInfo.error })
    if (!opts.json) {
      process.stdout.write(
        '\n' +
          colors.red('✗ ImageMagick 未安装\n') +
          colors.dim(
            '请参考: https://imagemagick.org/script/download.php\n' +
              '或使用 mise: mise install imagemagick\n\n'
          )
      )
    }
    process.exit(3)
  }

  // 解析 scale
  let density: string
  try {
    density = parseScale(opts.scale)
  } catch (err: any) {
    log.error('缩放参数错误', { reason: err.message })
    process.exit(2)
  }

  // 开始渲染
  log.info('开始渲染', {
    input: inputPath,
    output: outputPath,
    scale: opts.scale,
    background: opts.background,
    density,
  })
  if (!opts.json) {
    process.stdout.write(`\n${colors.blue('ℹ')} 开始渲染:\n`)
    process.stdout.write(`   输入: ${inputPath}\n`)
    process.stdout.write(`   输出: ${outputPath}\n`)
    process.stdout.write(`   缩放: ${opts.scale} (DPI: ${density})\n`)
    process.stdout.write(`   背景: ${opts.background}\n\n`)
  }

  // 执行渲染
  const result = await magick.renderSvg({
    input: inputPath,
    output: outputPath,
    quality: opts.quality,
    background: opts.background,
    density,
    force: opts.force,
  })

  if (result.success) {
    log.success('渲染完成', {
      outputFile: result.outputFile,
    })
    if (!opts.json) {
      process.stdout.write(
        colors.green(`✓ 渲染完成: ${result.outputFile}\n\n`)
      )
    }
    process.exit(0)
  } else {
    log.error('渲染失败', {
      reason: result.error,
      exitCode: result.exitCode,
    })
    if (!opts.json) {
      process.stdout.write('\n' + colors.red(`✗ 渲染失败:\n   ${result.error}\n\n`))
    }
    process.exit(1)
  }
}

main().catch((err) => {
  log.error('render 命令执行失败', { error: err.message })
  if (opts.debug) console.error(err)
  process.exit(1)
})
