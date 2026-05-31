/**
 * ImageMagick 统一模块 - SVG 渲染
 *
 * 功能：
 * - SVG → PNG/JPEG/WebP 渲染
 */

import { existsSync } from 'node:fs'
import { resolve, extname } from 'node:path'
import { execMagick } from './core.js'
import type { RenderOptions, RenderResult } from './types.js'

/**
 * 将 SVG 渲染为 PNG
 *
 * @param options - 渲染选项
 * @returns 渲染结果
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
  const inputPath = resolve(input)
  if (!existsSync(inputPath)) {
    return { success: false, error: `输入文件不存在: ${inputPath}`, exitCode: 2 }
  }

  const ext = extname(inputPath).toLowerCase()
  if (ext !== '.svg' && ext !== '.svgz') {
    return { success: false, error: `输入文件不是 SVG: ${inputPath}`, exitCode: 2 }
  }

  // 2. 验证输出文件冲突
  const outputPath = resolve(output)
  if (existsSync(outputPath) && !force) {
    return { success: false, error: `输出文件已存在: ${outputPath}（使用 force: true 或换文件名）`, exitCode: 2 }
  }

  // 3. 构造 magick 命令
  const args = [
    inputPath,
    '-background', background === 'transparent' ? 'none' : background,
    '-density', density,
    '-quality', String(quality),
    outputPath,
  ]

  // 4. 执行渲染
  const result = await execMagick(args, 60000)

  if (!result.success) {
    return {
      success: false,
      error: `ImageMagick 渲染失败 (exit ${result.exitCode}): ${result.stderr}`,
      exitCode: result.exitCode ?? 1,
    }
  }

  return { success: true, outputFile: outputPath, exitCode: 0 }
}
