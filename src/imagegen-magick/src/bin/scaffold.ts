/**
 * SVG 骨架交互式生成工具
 *
 * 用途：
 * - 引导用户选择设计参数（尺寸、风格、标题、字体、配色、装饰元素）
 * - 根据选择生成完整的 SVG 代码
 * - 输出到指定文件，可直接用 render.mjs 渲染
 *
 * 调用示例：
 *   node scaffold.mjs                             # 完全交互
 *   node scaffold.mjs --preset wechat-cover       # 使用预设
 *   node scaffold.mjs --size 900x383              # 部分参数
 *   node scaffold.mjs --no-interactive            # 非交互模式（需要所有参数）
 *
 * 设计理念：
 * - 非交互模式下必须通过参数提供所有必要选项（供 AI 直接调用）
 * - 交互模式下逐步询问，每步都有默认建议值
 * - 输出符合 references/ 设计规范的 SVG
 */

import { Command } from 'commander'
import { createInterface } from 'node:readline'
import { writeFileSync } from 'node:fs'
import { createLogger } from '../lib/logger.js'
import { colors } from '../lib/colors.js'
import { detectSystemFonts } from '../lib/font-detector.js'
import {
  resolveFont,
  buildFontFamilyChain,
  formatFontFamily,
  DEFAULT_CODE_FONT_CANDIDATES,
} from '../lib/font-fallback.js'
import { toAbsolutePath } from '../utils/path.js'

// ============================================================
// 预设配置（常见尺寸）
// ============================================================

/**
 * 常用尺寸预设
 *
 * 数据参考：
 * - 微信公众号首图: 900x383 (2.35:1)
 * - 微信公众号次图: 200x200 (1:1)
 * - 小红书图文: 1080x1440 (3:4)
 * - 抖音封面: 1080x1920 (9:16)
 * - YouTube 缩略图: 1280x720 (16:9)
 * - Twitter 卡片: 1200x675
 */
const SIZE_PRESETS: Record<string, { width: number; height: number; name: string }> = {
  'wechat-cover': { width: 900, height: 383, name: '微信公众号首图' },
  'wechat-thumb': { width: 200, height: 200, name: '微信公众号次图' },
  xiaohongshu: { width: 1080, height: 1440, name: '小红书图文' },
  douyin: { width: 1080, height: 1920, name: '抖音封面' },
  youtube: { width: 1280, height: 720, name: 'YouTube 缩略图' },
  twitter: { width: 1200, height: 675, name: 'Twitter/X 卡片' },
  'og-image': { width: 1200, height: 630, name: 'Open Graph 图' },
  square: { width: 1080, height: 1080, name: '正方形' },
}

// ============================================================
// 命令行
// ============================================================

const program = new Command()
  .name('scaffold')
  .description('交互式生成 SVG 图像骨架')
  .option('--preset <name>', '使用预置尺寸（wechat-cover/youtube/douyin/...）')
  .option('--size <WxH>', '自定义宽x高（如 "900x383"）')
  .option('--title <text>', '主标题文字')
  .option('--subtitle <text>', '副标题文字')
  .option('--font <name>', '字体名（默认检测 Cascadia Code 并 fallback）')
  .option('--bg <type>', '背景类型：gradient / solid / transparent', 'gradient')
  .option('--bg-color <hex>', '背景颜色（solid 模式用，如 "#F5F5DC"）')
  .option('--bg-gradient <c1,c2>', '渐变起止色（如 "#FFE5D9,#FFCAD4"）')
  .option('--output <path>', '输出 SVG 路径', 'scaffold.svg')
  .option('--no-interactive', '禁用交互模式（必须提供所有必要参数）')
  .option('--json', 'JSON 输出', false)
  .option('--quiet', '静默模式', false)
  .option('--debug', '调试模式', false)
  .parse()

const opts = program.opts<{
  preset?: string
  size?: string
  title?: string
  subtitle?: string
  font?: string
  bg: string
  bgColor?: string
  bgGradient?: string
  output: string
  interactive: boolean
  json: boolean
  quiet: boolean
  debug: boolean
}>()

const log = createLogger({ json: opts.json, quiet: opts.quiet, debug: opts.debug })

// ============================================================
// 交互工具
// ============================================================

/**
 * 简单交互式提问（带默认值）
 */
async function ask(rl: ReturnType<typeof createInterface>, question: string, defaultVal = ''): Promise<string> {
  const hint = defaultVal ? colors.dim(` (默认: ${defaultVal})`) : ''
  return new Promise((resolve) => {
    rl.question(`${colors.blue('?')} ${question}${hint} `, (answer) => {
      resolve(answer.trim() || defaultVal)
    })
  })
}

/**
 * 单选交互
 */
async function choose(
  rl: ReturnType<typeof createInterface>,
  question: string,
  options: Array<{ label: string; value: string; hint?: string }>
): Promise<string> {
  process.stdout.write(`\n${colors.blue('?')} ${question}\n`)
  options.forEach((opt, i) => {
    const hint = opt.hint ? colors.dim(` (${opt.hint})`) : ''
    process.stdout.write(`  ${colors.cyan(`[${i + 1}]`)} ${opt.label}${hint}\n`)
  })
  return new Promise((resolve) => {
    rl.question(`${colors.blue('→')} 请输入数字: `, (answer) => {
      const idx = parseInt(answer.trim(), 10) - 1
      if (idx >= 0 && idx < options.length) {
        resolve(options[idx]!.value)
      } else {
        process.stdout.write(colors.yellow('⚠ 无效输入，使用第一个选项\n'))
        resolve(options[0]!.value)
      }
    })
  })
}

// ============================================================
// 尺寸解析
// ============================================================

/**
 * 解析尺寸字符串 "WxH"
 */
function parseSize(size: string): { width: number; height: number } | null {
  const match = size.toLowerCase().match(/^(\d+)[x×](\d+)$/)
  if (!match) return null
  return {
    width: parseInt(match[1]!, 10),
    height: parseInt(match[2]!, 10),
  }
}

// ============================================================
// SVG 代码生成
// ============================================================

/**
 * 生成完整 SVG 骨架代码
 */
function generateSvgCode(config: {
  width: number
  height: number
  title: string
  subtitle?: string
  fontFamily: string
  bgType: 'gradient' | 'solid' | 'transparent'
  bgColor?: string
  bgGradient?: { start: string; end: string; direction: 'horizontal' | 'vertical' | 'diagonal' }
}): string {
  const { width, height, title, subtitle, fontFamily, bgType, bgColor, bgGradient } = config

  // 1. 背景层
  const bgDefs =
    bgType === 'gradient' && bgGradient
      ? `  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="${
      bgGradient.direction === 'horizontal' ? '100%' : '0%'
    }" y2="${bgGradient.direction === 'vertical' ? '100%' : '100%'}">
      <stop offset="0%" style="stop-color:${bgGradient.start}" />
      <stop offset="100%" style="stop-color:${bgGradient.end}" />
    </linearGradient>
  </defs>`
      : ''

  const bgRect =
    bgType === 'transparent'
      ? '  <!-- 透明背景，不绘制背景层 -->'
      : `  <rect width="100%" height="100%" fill="${
          bgType === 'gradient' ? 'url(#bg)' : bgColor ?? '#F5F5DC'
        }" />`

  // 2. 文字层（垂直居中）
  const hasSubtitle = subtitle && subtitle.trim().length > 0
  const titleY = hasSubtitle ? '42%' : '50%'
  const titleSize = Math.max(24, Math.min(width / 15, 72))
  const subtitleSize = Math.max(18, titleSize * 0.55)

  const texts = `  <!-- 主标题 -->
  <text x="50%" y="${titleY}" text-anchor="middle" dominant-baseline="middle"
        font-family='${fontFamily.replace(/'/g, '"')}'
        font-size="${titleSize}" font-weight="700" fill="#2B2D42">
    <tspan>${escapeXml(title)}</tspan>
  </text>${
    hasSubtitle
      ? `
  <!-- 副标题 -->
  <text x="50%" y="62%" text-anchor="middle" dominant-baseline="middle"
        font-family='${fontFamily.replace(/'/g, '"')}'
        font-size="${subtitleSize}" font-weight="400" fill="#8D99AE">
    <tspan>${escapeXml(subtitle!)}</tspan>
  </text>`
      : ''
  }`

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
${bgDefs}
  ${bgRect}
${texts}
  <!-- 调试信息（可选，生产环境可删除） -->
  <text x="8" y="${height - 8}" font-family="monospace" font-size="10" fill="#CCC" text-anchor="start">
    scaffold@${width}x${height}
  </text>
</svg>
`
}

/**
 * XML 转义（避免特殊字符破坏结构）
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// ============================================================
// 主流程
// ============================================================

async function main() {
  // 1. 检测系统字体（为 fallback 准备）
  log.info('扫描系统字体...')
  const systemFonts = await detectSystemFonts()
  log.debug('字体检测完成', { count: systemFonts.length })

  let rl: ReturnType<typeof createInterface> | null = null
  const interactive = opts.interactive && process.stdin.isTTY && !opts.json

  if (interactive) {
    rl = createInterface({ input: process.stdin, output: process.stdout })
    process.stdout.write(colors.bold(colors.cyan('\n=== SVG 骨架生成器 ===\n\n')))
  }

  // 2. 收集尺寸
  let size: { width: number; height: number } | null = null

  if (opts.preset) {
    const preset = SIZE_PRESETS[opts.preset]
    if (preset) {
      size = { width: preset.width, height: preset.height }
      log.info('使用预设', { preset: opts.preset, name: preset.name, ...size })
    } else {
      log.error(`未知预设: ${opts.preset}`, {
        available: Object.keys(SIZE_PRESETS).join(', '),
      })
      rl?.close()
      process.exit(2)
    }
  } else if (opts.size) {
    size = parseSize(opts.size)
    if (!size) {
      log.error('尺寸格式错误', { example: '900x383' })
      rl?.close()
      process.exit(2)
    }
  } else if (rl) {
    // 交互模式
    const presetChoice = await choose(rl, '选择尺寸预设:', [
      { label: '微信公众号首图', value: 'wechat-cover', hint: '900x383' },
      { label: '小红书图文', value: 'xiaohongshu', hint: '1080x1440' },
      { label: '抖音封面', value: 'douyin', hint: '1080x1920' },
      { label: 'YouTube 缩略图', value: 'youtube', hint: '1280x720' },
      { label: 'Twitter/X 卡片', value: 'twitter', hint: '1200x675' },
      { label: '正方形', value: 'square', hint: '1080x1080' },
      { label: '自定义尺寸', value: 'custom' },
    ])

    if (presetChoice === 'custom') {
      const sizeStr = await ask(rl, '请输入尺寸 (宽x高):', '1200x630')
      size = parseSize(sizeStr)
      if (!size) {
        log.error('尺寸格式错误')
        rl.close()
        process.exit(2)
      }
    } else {
      const preset = SIZE_PRESETS[presetChoice]!
      size = { width: preset.width, height: preset.height }
    }
  } else {
    log.error('非交互模式下必须提供 --preset 或 --size')
    process.exit(2)
  }

  // 3. 收集标题
  let title = opts.title
  let subtitle = opts.subtitle

  if (rl) {
    if (!title) {
      title = await ask(rl, '主标题:', 'AI Agentic CLI')
    }
    if (subtitle === undefined) {
      subtitle = await ask(rl, '副标题 (可留空):', '给 AI 装上靠谱的手脚')
    }
  } else {
    if (!title) title = '未命名'
  }

  // 4. 字体选择
  let fontName = opts.font
  if (!fontName) {
    const resolved = resolveFont(systemFonts, 'Cascadia Code', {
      candidates: DEFAULT_CODE_FONT_CANDIDATES,
      allowCJK: true,
      verbose: true,
    })
    fontName = resolved.usedName
    if (resolved.source === 'fallback') {
      log.warn(resolved.warning ?? '字体降级', { used: fontName })
      if (rl) {
        process.stdout.write(
          `\n${colors.yellow('⚠')} ${resolved.warning ?? `已降级到 ${fontName}`}\n\n`
        )
        const change = await ask(rl, '是否换一个字体? (Y/n):', 'n')
        if (change.toLowerCase() === 'y') {
          fontName = await ask(rl, '输入字体名:', fontName)
        }
      }
    }
  }

  // 5. 构造字体链
  const fontChain = buildFontFamilyChain(fontName)
  const fontFamily = formatFontFamily(fontChain)
  log.debug('字体链生成完成', { family: fontFamily })

  // 6. 背景
  const bgType = opts.bg as 'gradient' | 'solid' | 'transparent'
  let bgColor: string | undefined = opts.bgColor
  let bgGradient:
    | { start: string; end: string; direction: 'horizontal' | 'vertical' | 'diagonal' }
    | undefined

  if (bgType === 'gradient') {
    if (opts.bgGradient) {
      const [start, end] = opts.bgGradient.split(',')
      bgGradient = { start: start!, end: end!, direction: 'diagonal' }
    } else {
      bgGradient = { start: '#FFE5D9', end: '#FFCAD4', direction: 'diagonal' }
    }
  } else if (bgType === 'solid') {
    if (!bgColor) bgColor = '#F5F5DC'
  }

  // 7. 生成 SVG
  const svgCode = generateSvgCode({
    width: size!.width,
    height: size!.height,
    title,
    subtitle,
    fontFamily,
    bgType,
    bgColor,
    bgGradient,
  })

  const outputPath = toAbsolutePath(opts.output)

  try {
    writeFileSync(outputPath, svgCode, 'utf-8')
    log.success('SVG 骨架已生成', { path: outputPath, size: svgCode.length })

    if (opts.json) {
      process.stdout.write(
        JSON.stringify(
          {
            success: true,
            outputFile: outputPath,
            width: size!.width,
            height: size!.height,
            title,
            subtitle,
            fontFamily,
            bgType,
            byteSize: svgCode.length,
            nextStep: `node render.mjs "${outputPath}" -o "${outputPath.replace(/\.svg$/i, '.png')}"`,
          },
          null,
          2
        ) + '\n'
      )
    } else {
      process.stdout.write(`\n${colors.green('✓ SVG 骨架已生成')}\n`)
      process.stdout.write(`   路径: ${outputPath}\n`)
      process.stdout.write(`   尺寸: ${size!.width}×${size!.height}\n`)
      process.stdout.write(`   字节: ${svgCode.length}\n\n`)
      process.stdout.write(`${colors.bold('下一步:')}\n`)
      process.stdout.write(
        `   ${colors.cyan(
          `node render.mjs "${outputPath}" -o "${outputPath.replace(/\.svg$/i, '.png')}"`
        )}\n\n`
      )
    }
  } catch (err: any) {
    log.error('写入文件失败', { reason: err.message })
    process.exit(1)
  }

  rl?.close()
  process.exit(0)
}

main().catch((err) => {
  log.error('scaffold 命令执行失败', { error: err.message })
  if (opts.debug) console.error(err)
  process.exit(1)
})
