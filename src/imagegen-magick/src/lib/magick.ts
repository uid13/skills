/**
 * ImageMagick 命令封装（兼容层）
 *
 * 本文件保留是为了向后兼容已有的 import { magick } from '../lib/magick.js'。
 * 新代码请直接使用 '../lib/magick/index.js'。
 *
 * 底层实现已迁移到 magick/ 模块：
 * - magick/core.ts      底层 CLI 调用
 * - magick/detection.ts 环境检测、字体、格式
 * - magick/render.ts    SVG 渲染
 * - magick/processor.ts ImageProcessor（组合注入）
 * - magick/dimensions/  处理维度（几何/颜色/滤镜/艺术/格式）
 */

import { detectEnvironment, listFonts as _listFonts, listFormats } from './magick/detection.js'
import { renderSvg } from './magick/render.js'
import type { MagickInfo } from './magick/types.js'

/**
 * 检测 ImageMagick 环境（向后兼容旧 API）
 */
async function detectImageMagick(): Promise<MagickInfo> {
  return detectEnvironment()
}

/**
 * 列出系统字体（向后兼容旧 API）
 */
async function listFonts(
  filter?: string
): Promise<Array<{ family: string; file: string }>> {
  const allFonts = await _listFonts()
  if (!filter) return allFonts
  return allFonts.filter(f =>
    f.family.toLowerCase().includes(filter.toLowerCase())
  )
}

/**
 * 获取环境信息（用于 info 命令）
 */
async function getInfo(): Promise<MagickInfo> {
  return detectImageMagick()
}

// 导出公共 API（作为命名空间 magick.xxx 使用，向后兼容）
export const magick = {
  detect: detectImageMagick,
  renderSvg,
  listFonts,
  listFormats,
  getInfo,
} as const
