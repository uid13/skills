/**
 * 路径处理辅助工具
 *
 * 跨平台路径相关的通用函数，避免在不同模块重复实现。
 */

import { existsSync, statSync } from 'node:fs'
import { basename, extname, isAbsolute, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

/**
 * 支持的图像文件格式映射（扩展名 → MIME 类型）
 *
 * 注：ImageMagick 实际支持更多格式，此处仅列出常用。
 */
export const SUPPORTED_IMAGE_FORMATS = {
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  ico: 'image/x-icon',
  bmp: 'image/bmp',
  tiff: 'image/tiff',
  pdf: 'application/pdf',
} as const

/**
 * 检查文件是否存在且为普通文件
 *
 * @param path - 文件路径
 * @returns true 表示存在且不是目录
 */
export function isFile(path: string): boolean {
  try {
    return existsSync(path) && statSync(path).isFile()
  } catch {
    return false
  }
}

/**
 * 检查路径是否为绝对路径
 *
 * @param path - 待检查的路径
 */
export function isAbsolutePath(path: string): boolean {
  return isAbsolute(path)
}

/**
 * 确保路径为绝对路径（相对于 cwd 转换）
 *
 * @param path - 输入路径
 * @param cwd - 基准目录（默认 process.cwd()）
 */
export function toAbsolutePath(path: string, cwd: string = process.cwd()): string {
  return isAbsolute(path) ? path : resolve(cwd, path)
}

/**
 * 获取文件扩展名（带点号，小写）
 *
 * 示例：'image.PNG' → '.png'
 */
export function getExt(filePath: string): string {
  return extname(filePath).toLowerCase()
}

/**
 * 检查文件扩展名是否在支持列表中
 *
 * @param filePath - 文件路径
 * @param allowed - 允许的扩展名列表（带或不带点号皆可）
 */
export function hasAllowedExt(filePath: string, allowed: readonly string[]): boolean {
  const ext = getExt(filePath).replace(/^\./, '')
  return allowed.some((a) => a.replace(/^\./, '').toLowerCase() === ext)
}

/**
 * 将文件路径转为 file:// URL 字符串
 *
 * 用途：在 Windows 上路径含空格或特殊字符时，
 * 某些工具需要 file:// 协议而非裸路径。
 */
export function toFileURL(filePath: string): string {
  return pathToFileURL(resolve(filePath)).href
}

/**
 * 生成唯一输出文件名（避免覆盖已有文件）
 *
 * 示例：
 * - cover.png 不存在 → cover.png
 * - cover.png 已存在 → cover-1.png
 * - cover-1.png 已存在 → cover-2.png
 *
 * @param targetPath - 期望的输出路径
 * @param force - 强制使用原路径（不检查覆盖）
 */
export function uniquePath(targetPath: string, force = false): string {
  if (force || !existsSync(targetPath)) return targetPath

  const dir = targetPath.substring(0, targetPath.lastIndexOf(basename(targetPath)))
  const ext = extname(targetPath)
  const base = basename(targetPath, ext)

  let counter = 1
  while (existsSync(`${dir}${base}-${counter}${ext}`)) {
    counter++
    if (counter > 1000) {
      // 防止死循环
      throw new Error(`无法找到唯一路径，已尝试 ${counter} 次：${targetPath}`)
    }
  }
  return `${dir}${base}-${counter}${ext}`
}
