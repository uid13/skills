#!/usr/bin/env node
/**
 * 图像后期处理工具
 *
 * 用途：
 * - 对已有图片进行后期调整（亮度/对比度/模糊/锐化/暗角等）
 * - 格式转换（PNG→JPEG/WebP）
 * - 裁剪、缩放、旋转
 *
 * 调用示例：
 *   node post-process.mjs input.png --brightness 15 --contrast 5 -o output.png
 *   node post-process.mjs input.png --blur 0 --blur-sigma 3 -o output.png
 *   node post-process.mjs input.png --vignette 120 -o output.png
 *   node post-process.mjs input.png --resize 800 -o output.png
 *   node post-process.mjs input.png --jpeg 85 -o output.jpg
 *   node post-process.mjs input.png --preset blog-cover -o output.png
 *   node post-process.mjs input.png --list-presets
 *
 * 退出码：
 * - 0: 成功
 * - 1: 执行失败
 * - 2: 参数错误
 * - 3: ImageMagick 未安装
 */

import { Command } from 'commander'
import { existsSync } from 'node:fs'
import { resolve, extname, basename, dirname, join } from 'node:path'
import { ImageProcessor } from '../lib/magick/processor.js'
import { GeometryOps } from '../lib/magick/dimensions/geometry.js'
import { ColorOps } from '../lib/magick/dimensions/color.js'
import { FilterOps } from '../lib/magick/dimensions/filter.js'
import { ArtOps } from '../lib/magick/dimensions/art.js'
import { FormatOps } from '../lib/magick/dimensions/format.js'
import { detectEnvironment } from '../lib/magick/detection.js'
import { createLogger } from '../lib/logger.js'
import { colors } from '../lib/colors.js'

// ============================================================
// 预设效果
// ============================================================

const PRESETS: Record<string, Record<string, unknown[]>> = {
  'blog-cover': {
    brightnessContrast: [10, 5],
    blur: [0, 2],
    vignette: [120],
  },
  'thumbnail': {
    resize: [400],
    quality: [80],
  },
  'sharpen': {
    unsharp: [0, 1, 1, 0],
  },
  'soft-glow': {
    blur: [0, 3],
    brightnessContrast: [5, -5],
  },
  'vintage': {
    sepia: [60],
    vignette: [150],
    contrastStretch: ['5%', '5%'],
  },
  'dramatic': {
    contrastStretch: ['2%', '2%'],
    sigmoidalContrast: [11, '50%'],
  },
  'grayscale-vignette': {
    grayscale: [],
    vignette: [120],
  },
  'web-optimize': {
    resize: [1200],
    quality: [80],
    strip: [],
  },
}

// ============================================================
// CLI 定义
// ============================================================

const program = new Command()
  .name('post-process')
  .description('图像后期处理工具（基于 ImageMagick）')
  .argument('[input]', '输入图片路径')
  .option('-o, --output <path>', '输出文件路径')
  .option('-q, --quiet', '静默模式', false)
  .option('--debug', '调试模式', false)

  // 预设
  .option('--preset <name>', '使用预设效果')
  .option('--list-presets', '列出所有预设效果')

  // 几何变换
  .option('--resize <width>', '缩放到指定宽度（高度等比）', parseInt)
  .option('--resize-xy <width,height>', '缩放到指定宽高')
  .option('--crop <width,height,x,y>', '裁剪区域')
  .option('--rotate <degrees>', '旋转角度', parseInt)
  .option('--flip', '垂直翻转')
  .option('--flop', '水平镜像')

  // 颜色色调
  .option('--brightness <n>', '亮度调整（正数提亮，负数变暗）', parseInt)
  .option('--contrast <n>', '对比度调整', parseInt)
  .option('--brightness-contrast <brightness,contrast>', '同时调整亮度和对比度')
  .option('--saturation <n>', '饱和度百分比（100=不变）', parseInt)
  .option('--sepia <intensity>', '棕褐色调（0-100）', parseInt)
  .option('--grayscale', '转灰度')
  .option('--negate', '反色')
  .option('--auto-level', '自动色阶')
  .option('--contrast-stretch <black,white>', '对比度拉伸')

  // 滤镜模糊
  .option('--blur <radius>', '高斯模糊半径', parseFloat)
  .option('--blur-sigma <sigma>', '模糊 sigma（配合 --blur 使用）', parseFloat)
  .option('--sharpen <radius>', '锐化半径', parseFloat)
  .option('--sharpen-sigma <sigma>', '锐化 sigma（默认 1）', parseFloat)
  .option('--unsharp <radius,sigma,amount,threshold>', 'USM 锐化')

  // 艺术效果
  .option('--vignette <offset>', '暗角效果（推荐 80-150）', parseInt)
  .option('--charcoal <factor>', '炭笔素描', parseFloat)
  .option('--sketch <radius,sigma,angle>', '铅笔素描')
  .option('--pixelate <size>', '像素化（马赛克）', parseInt)

  // 格式输出
  .option('--jpeg <quality>', '输出 JPEG（质量 1-100）', parseInt)
  .option('--webp <quality>', '输出 WebP（质量 1-100）', parseInt)
  .option('--png', '输出 PNG')
  .option('--strip', '去除元数据')

  .parse()

const opts = program.opts()
const inputPath = program.args[0]

// ============================================================
// 主逻辑
// ============================================================

const log = createLogger({ json: false, quiet: opts.quiet, debug: opts.debug })

async function main() {
  // 列出预设
  if (opts.listPresets) {
    process.stdout.write('\n')
    process.stdout.write(colors.bold(colors.cyan('=== 可用预设效果 ===\n\n')))
    for (const [name, ops] of Object.entries(PRESETS)) {
      const desc = Object.keys(ops).join(' → ')
      process.stdout.write(`  ${colors.green(name.padEnd(22))} ${colors.dim(desc)}\n`)
    }
    process.stdout.write('\n')
    process.exit(0)
  }

  // 验证输入
  if (!inputPath) {
    log.error('请指定输入文件')
    process.exit(2)
  }

  const absInput = resolve(inputPath)
  if (!existsSync(absInput)) {
    log.error(`输入文件不存在: ${absInput}`)
    process.exit(2)
  }

  // 检测 ImageMagick
  const info = await detectEnvironment()
  if (!info.installed) {
    log.error('ImageMagick 未安装', { error: info.error })
    process.exit(3)
  }

  // 确定输出路径
  const ext = extname(absInput).toLowerCase()
  const outExt = opts.jpeg ? '.jpg' : opts.webp ? '.webp' : ext
  const absOutput = opts.output
    ? resolve(opts.output)
    : join(dirname(absInput), `processed-${basename(absInput, ext)}${outExt}`)

  // 构建 ImageProcessor
  const processor = new ImageProcessor()
  const geo = new GeometryOps()
  const color = new ColorOps()
  const filter = new FilterOps()
  const art = new ArtOps()
  const fmt = new FormatOps()

  let hasGeo = false, hasColor = false, hasFilter = false, hasArt = false, hasFmt = false

  // 预设
  if (opts.preset) {
    const preset = PRESETS[opts.preset]
    if (!preset) {
      log.error(`未知预设: ${opts.preset}`, { available: Object.keys(PRESETS).join(', ') })
      process.exit(2)
    }
    log.info(`使用预设: ${opts.preset}`)
    applyPreset(processor, geo, color, filter, art, fmt, preset)
  } else {
    // 几何变换
    if (opts.resize) { geo.resize(opts.resize); hasGeo = true }
    if (opts.resizeXY) {
      const [w, h] = opts.resizeXY.split(',').map(Number)
      geo.resize(w, h); hasGeo = true
    }
    if (opts.crop) {
      const [w, h, x, y] = opts.crop.split(',').map(Number)
      geo.crop(w, h, x, y); hasGeo = true
    }
    if (opts.rotate) { geo.rotate(opts.rotate); hasGeo = true }
    if (opts.flip) { geo.flip(); hasGeo = true }
    if (opts.flop) { geo.flop(); hasGeo = true }

    // 颜色色调
    if (opts.brightnessContrast) {
      const [b, c] = opts.brightnessContrast.split(',').map(Number)
      color.brightnessContrast(b, c); hasColor = true
    } else if (opts.brightness != null || opts.contrast != null) {
      color.brightnessContrast(opts.brightness ?? 0, opts.contrast ?? 0); hasColor = true
    }
    if (opts.saturation != null) { color.saturate(opts.saturation); hasColor = true }
    if (opts.sepia != null) { color.sepia(opts.sepia); hasColor = true }
    if (opts.grayscale) { color.grayscale(); hasColor = true }
    if (opts.negate) { color.negate(); hasColor = true }
    if (opts.autoLevel) { color.autoLevel(); hasColor = true }
    if (opts.contrastStretch) {
      const [b, w] = opts.contrastStretch.split(',')
      color.contrastStretch(b, w); hasColor = true
    }

    // 滤镜模糊
    if (opts.blur != null) { filter.blur(opts.blur, opts.blurSigma); hasFilter = true }
    if (opts.sharpen != null) { filter.sharpen(opts.sharpen, opts.sharpenSigma); hasFilter = true }
    if (opts.unsharp) {
      const [r, s, a, t] = opts.unsharp.split(',').map(Number)
      filter.unsharp(r, s, a, t); hasFilter = true
    }

    // 艺术效果
    if (opts.vignette != null) { art.vignette(opts.vignette); hasArt = true }
    if (opts.charcoal != null) { art.charcoal(opts.charcoal); hasArt = true }
    if (opts.sketch) {
      const [r, s, a] = opts.sketch.split(',').map(Number)
      art.sketch(r, s, a); hasArt = true
    }
    if (opts.pixelate != null) { art.pixelate(opts.pixelate); hasArt = true }

    // 格式输出
    if (opts.jpeg != null) { fmt.jpeg(opts.jpeg); hasFmt = true }
    if (opts.webp != null) { fmt.webp(opts.webp); hasFmt = true }
    if (opts.png) { fmt.png(); hasFmt = true }
    if (opts.strip) { fmt.strip(); hasFmt = true }
  }

  // 注入有使用的维度
  if (hasGeo) processor.use(geo, 100)
  if (hasColor) processor.use(color, 200)
  if (hasFilter) processor.use(filter, 300)
  if (hasArt) processor.use(art, 400)
  if (hasFmt) processor.use(fmt, 900)

  // 执行
  const commands = processor.getCommands()
  if (commands.length === 0) {
    log.warn('未指定任何处理操作')
    process.exit(0)
  }

  log.info(`执行 ${commands.length} 个操作`)
  if (opts.debug) {
    log.debug('操作列表', { commands })
  }

  await processor.execute(absInput, absOutput)

  // 输出结果
  process.stdout.write('\n')
  process.stdout.write(colors.bold(colors.green('✓ 处理完成')) + '\n')
  process.stdout.write(`  输入: ${colors.dim(absInput)}\n`)
  process.stdout.write(`  输出: ${colors.green(absOutput)}\n`)
  process.stdout.write('\n')
}

/**
 * 应用预设到各维度
 */
function applyPreset(
  processor: ImageProcessor,
  geo: GeometryOps,
  color: ColorOps,
  filter: FilterOps,
  art: ArtOps,
  fmt: FormatOps,
  preset: Record<string, unknown[]>
): void {
  for (const [method, args] of Object.entries(preset)) {
    // 按方法名前缀判断维度
    if (method in geo) {
      ;(geo as any)[method](...args as any[]); processor.use(geo, 100)
    } else if (method in color) {
      ;(color as any)[method](...args as any[]); processor.use(color, 200)
    } else if (method in filter) {
      ;(filter as any)[method](...args as any[]); processor.use(filter, 300)
    } else if (method in art) {
      ;(art as any)[method](...args as any[]); processor.use(art, 400)
    } else if (method in fmt) {
      ;(fmt as any)[method](...args as any[]); processor.use(fmt, 900)
    }
  }
}

main().catch((err) => {
  log.error('post-process 执行失败', { error: err.message })
  if (opts.debug) console.error(err)
  process.exit(1)
})
