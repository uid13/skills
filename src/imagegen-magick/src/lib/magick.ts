/**
 * ImageMagick 命令封装
 *
 * 功能：
 * 1. 检测 ImageMagick 是否已安装，获取版本信息
 * 2. SVG → PNG 高质量渲染（含字体处理）
 * 3. 列出 ImageMagick 识别的系统中文字体
 *
 * 设计说明：
 * - ImageMagick 7+ 的所有命令都以 `magick` 开头（旧版 6 用 `convert`，已不考虑）
 * - 本模块只封装命令构造与执行，不包含业务逻辑（由 bin/*.ts 决定如何调用）
 * - 所有命令失败时返回详细错误信息（包含 stderr），便于诊断
 *
 * 用法：
 *   import { magick } from '../lib/magick'
 *
 *   // 检测环境
 *   const info = await magick.detect()
 *
 *   // 渲染 SVG
 *   await magick.renderSvg('input.svg', 'output.png', { scale: '2x' })
 *
 *   // 列出字体
 *   const fonts = await magick.listFonts('Cascadia')
 */

import { spawnExec } from './spawn.js'
import type { ImageMagickInfo, RenderOptions, RenderResult } from '../types/index.js'
import { toAbsolutePath, isFile, hasAllowedExt } from '../utils/path.js'

// ImageMagick 可执行文件名（跨平台一致，macOS/Linux/Windows 都是 magick）
const MAGICK_CMD = 'magick'

/**
 * 检测 ImageMagick 是否已安装并获取基本信息
 *
 * 执行 `magick -version` 解析输出，提取：
 * - 版本号 (如 '7.1.2-24')
 * - 可执行文件路径
 * - 支持的图像格式列表（如 'PNG SVG JPEG ...'）
 *
 * @returns 检测结果（installed=false 表示未安装）
 *
 * @example
 *   const info = await detectImageMagick()
 *   if (!info.installed) {
 *     console.error('请先安装 ImageMagick:', info.error)
 *   } else {
 *     console.log('已安装版本:', info.version)
 *   }
 */
export async function detectImageMagick(): Promise<ImageMagickInfo> {
  // 1. 执行 `magick -version` 获取版本信息
  const versionResult = await spawnExec(MAGICK_CMD, {
    args: ['-version'],
    timeoutMs: 5000,
  })

  if (!versionResult.success) {
    return {
      installed: false,
      error: `无法执行 '${MAGICK_CMD} -version'。${
        versionResult.stderr || '请确保 ImageMagick 已安装并加入 PATH'
      }`,
    }
  }

  // 2. 解析版本号（从 stdout 第一行提取）
  // 示例输出: "Version: ImageMagick 7.1.2-24 Q16-HDRI x64 271b6bc:20260526 ..."
  const versionMatch = versionResult.stdout.match(/ImageMagick\s+(\S+)/)
  const version = versionMatch ? versionMatch[1] : undefined

  // 3. 执行 `magick identify -list format` 获取支持格式（可选，失败时留空）
  const formatResult = await spawnExec(MAGICK_CMD, {
    args: ['identify', '-list', 'format'],
    timeoutMs: 5000,
  })

  let formats: string[] | undefined
  if (formatResult.success) {
    // 解析：每行以 "PNG* PNG rw-" 形式开始，提取第一列
    formats = formatResult.stdout
      .split('\n')
      .map((line) => line.trim().split(/\s+/)[0])
      .filter((fmt) => fmt && /^[A-Z0-9]+$/i.test(fmt))
      .slice(0, 50) // 限制数量，避免过多
  }

  return {
    installed: true,
    version,
    executable: MAGICK_CMD,
    formats,
  }
}

/**
 * 渲染 SVG 为 PNG（核心函数）
 *
 * 工作流程：
 * 1. 验证输入 SVG 文件存在且扩展名正确
 * 2. 检查输出文件是否已存在（非 force 模式会拒绝覆盖）
 * 3. 构造 magick 命令（带所有渲染参数）
 * 4. 执行并捕获 stdout/stderr
 *
 * 关键参数说明：
 * - `-background`：渲染前的背景色（'none' 表示透明）
 * - `-density 96`：DPI，用于缩放（96 × 2 = 192 DPI → 2x 质量）
 * - `-resize WxH`：缩放输出尺寸
 * - `-quality 95`：PNG 质量（影响压缩率，不影响清晰度）
 *
 * @param options - 渲染选项
 * @returns 渲染结果（成功/失败 + 错误信息）
 *
 * @example
 *   const result = await renderSvg({
 *     input: './cover.svg',
 *     output: './cover.png',
 *     scale: '2x',
 *     background: 'transparent',
 *   })
 *   if (!result.success) {
 *     console.error('渲染失败:', result.error)
 *   }
 */
export async function renderSvg(options: RenderOptions): Promise<RenderResult> {
  const {
    input,
    output,
    quality = 95,
    background = 'transparent',
    density = '96',
    force = false,
  } = options

  // 1. 验证输入文件
  const inputPath = toAbsolutePath(input)
  if (!isFile(inputPath)) {
    return {
      success: false,
      error: `输入文件不存在: ${inputPath}`,
      exitCode: 2,
    }
  }
  if (!hasAllowedExt(inputPath, ['svg', 'svgz'])) {
    return {
      success: false,
      error: `输入文件不是 SVG: ${inputPath}（需要 .svg 或 .svgz 扩展名）`,
      exitCode: 2,
    }
  }

  // 2. 验证输出文件冲突
  const outputPath = toAbsolutePath(output)
  if (isFile(outputPath) && !force) {
    return {
      success: false,
      error: `输出文件已存在: ${outputPath}（使用 force: true 或换文件名）`,
      exitCode: 2,
    }
  }

  // 3. 构造 magick 命令参数
  //    magick <input.svg> -background <bg> -density <dpi> -quality <q> <output.png>
  const args: string[] = [
    inputPath,
    '-background',
    background === 'transparent' ? 'none' : background,
    '-density',
    density,
    '-quality',
    String(quality),
  ]

  // 4. 执行渲染
  const result = await spawnExec(MAGICK_CMD, {
    args: [...args, outputPath],
    timeoutMs: 60000, // 渲染可能较慢，给 60s 超时
  })

  if (!result.success) {
    return {
      success: false,
      error: `ImageMagick 渲染失败 (exit ${result.exitCode}): ${result.stderr}`,
      exitCode: result.exitCode ?? 1,
    }
  }

  return {
    success: true,
    outputFile: outputPath,
    exitCode: 0,
  }
}

/**
 * 列出 ImageMagick 识别的系统字体
 *
 * 工作原理：
 * - 执行 `magick identify -list font`
 * - 解析输出，提取字体族名和文件路径
 *
 * 输出示例：
 * ```
 * Font: Arial
 *   family: Arial
 *   style: Normal
 *   glyphs: C:/Windows/Fonts/ARIAL.TTF
 * ```
 *
 * @param filter - 可选过滤关键字（不区分大小写，匹配 family 名）
 * @returns 字体列表数组，每项含 family+file
 *
 * @example
 *   const fonts = await listFonts('Cascadia')
 *   // 返回: [{family: 'Cascadia Code', file: '...'}]
 */
export async function listFonts(
  filter?: string
): Promise<Array<{ family: string; file: string }>> {
  const result = await spawnExec(MAGICK_CMD, {
    args: ['identify', '-list', 'font'],
    timeoutMs: 10000,
  })

  if (!result.success) {
    // 命令失败返回空数组（调用方应处理这种情况）
    return []
  }

  // 解析输出：按 "Font: xxx" 分块（Font: 行可能有前导空格缩进）
  const blocks = result.stdout.split(/^\s*Font:\s+/m).slice(1)
  const fonts: Array<{ family: string; file: string }> = []

  for (const block of blocks) {
    // 提取 family 行
    const familyMatch = block.match(/family:\s*(.+)$/m)
    // 提取 glyphs 行
    const fileMatch = block.match(/glyphs:\s*(.+)$/m)

    if (familyMatch && fileMatch) {
      const family = familyMatch[1]!.trim()
      const file = fileMatch[1]!.trim()

      // 应用过滤
      if (!filter || family.toLowerCase().includes(filter.toLowerCase())) {
        fonts.push({ family, file })
      }
    }
  }

  return fonts
}

/**
 * 获取完整 ImageMagick 环境信息（用于 info 命令）
 *
 * 这是一个便捷的聚合函数，调用内部各个检测流程。
 * 被 bin/info.ts 调用，输出完整环境报告。
 */
async function getInfo(): Promise<ImageMagickInfo> {
  return detectImageMagick()
}

// 导出公共 API（作为命名空间 magick.xxx 使用，便于调用）
export const magick = {
  detect: detectImageMagick,
  renderSvg,
  listFonts,
  getInfo: getInfo,
} as const
