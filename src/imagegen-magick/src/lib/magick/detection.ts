/**
 * ImageMagick 统一模块 - 检测与信息
 *
 * 功能：
 * - 检测 ImageMagick 是否安装
 * - 列出系统字体
 * - 列出支持的图像格式
 */

import { execMagick } from './core.js'
import type { MagickInfo } from './types.js'

/**
 * 检测 ImageMagick 环境
 *
 * 执行 `magick -version` 获取版本信息和支持格式
 */
export async function detectEnvironment(): Promise<MagickInfo> {
  // 1. 检测版本
  const versionResult = await execMagick(['-version'], 5000)
  if (!versionResult.success) {
    return {
      installed: false,
      error: `无法执行 'magick -version'。${versionResult.stderr || '请确保 ImageMagick 已安装并加入 PATH'}`,
    }
  }

  const versionMatch = versionResult.stdout.match(/ImageMagick\s+(\S+)/)
  const version = versionMatch?.[1]

  // 2. 获取支持格式（可选，失败不影响）
  const formatResult = await execMagick(['identify', '-list', 'format'], 5000)
  let formats: string[] | undefined
  if (formatResult.success) {
    formats = formatResult.stdout
      .split('\n')
      .map(line => line.trim().split(/\s+/)[0])
      .filter(fmt => fmt && /^[A-Z0-9]+$/i.test(fmt))
      .slice(0, 50)
  }

  return {
    installed: true,
    version,
    executable: 'magick',
    formats,
  }
}

/**
 * 列出支持的图像格式
 */
export async function listFormats(): Promise<string[]> {
  const result = await execMagick(['identify', '-list', 'format'], 5000)
  if (!result.success) return []

  return result.stdout
    .split('\n')
    .map(line => line.trim().split(/\s+/)[0])
    .filter(fmt => fmt && /^[A-Z0-9]+$/i.test(fmt))
    .slice(0, 100)
}
