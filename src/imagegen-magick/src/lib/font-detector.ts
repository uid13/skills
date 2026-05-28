/**
 * 跨平台字体检测器
 *
 * 检测系统中可用的字体，支持三种检测后端（按优先级）：
 * 1. ImageMagick `identify -list font`（最通用，跨平台一致）
 * 2. fc-list（类 Unix 系统专用，ImageMagick 不可用时的回退）
 * 3. 直接扫描文件系统（ImageMagick 和 fc-list 都没有时的最后手段）
 *
 * 输出统一的 FontInfo 数组，供 font-fallback.ts 决策。
 */

import { existsSync, readdirSync } from 'node:fs'
import { homedir, platform } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnExec } from './spawn.js'
import { magick } from './magick.js'
import type { FontInfo } from '../types/index.js'

/**
 * 检测系统所有可用字体
 *
 * 按优先级尝试三种后端：
 * 1. ImageMagick（如果可用）
 * 2. fc-list（类 Unix 系统）
 * 3. 文件系统扫描（兜底，Windows 优先尝试）
 *
 * @returns 字体信息数组（可能为空，表示检测失败）
 * @throws 不抛错；失败时返回空数组并通过 console.warn 提示原因
 *
 * @example
 *   const fonts = await detectSystemFonts()
 *   console.log(`检测到 ${fonts.length} 个字体`)
 */
export async function detectSystemFonts(): Promise<FontInfo[]> {
  // 1. 尝试 ImageMagick（最推荐，跨平台统一）
  const imInfo = await magick.detect()
  if (imInfo.installed) {
    const imFonts = await detectViaImageMagick()
    if (imFonts.length > 0) return imFonts
  }

  // 2. 尝试 fc-list（类 Unix）
  if (platform() !== 'win32') {
    const fcFonts = await detectViaFcList()
    if (fcFonts.length > 0) return fcFonts
  }

  // 3. 文件系统扫描（Windows 为主）
  return detectViaFilesystem()
}

/**
 * 通过 ImageMagick 检测字体
 *
 * 命令：`magick identify -list font`
 * 优点：跨平台行为一致，且 ImageMagick 自身就能用这些字体
 */
async function detectViaImageMagick(): Promise<FontInfo[]> {
  const fonts = await magick.listFonts()
  return fonts.map((f) => ({
    family: f.family,
    file: f.file,
    source: platform() === 'win32' ? 'windows' : platform() === 'darwin' ? 'macos' : 'linux',
  }))
}

/**
 * 通过 fc-list 检测字体（仅 macOS / Linux）
 *
 * 命令：`fc-list : family style file`
 * 输出示例：
 *   Arial:style=Regular:file=/usr/share/fonts/truetype/msttcorefonts/Arial.ttf
 *
 * 注意：fc-list 在某些环境下可能不存在（如 Docker 镜像），失败时返回空数组
 */
async function detectViaFcList(): Promise<FontInfo[]> {
  const result = await spawnExec('fc-list', {
    args: [':', 'family', 'style', 'file'],
    timeoutMs: 10000,
  })

  if (!result.success) return []

  const fonts: FontInfo[] = []
  const source = platform() === 'darwin' ? 'macos' : 'linux'

  // 解析 fc-list 输出（每行：family:style=file）
  for (const line of result.stdout.split('\n')) {
    const match = line.match(/^(.+?):(.+?):file=(.+)$/)
    if (match) {
      fonts.push({
        family: match[1]!.trim(),
        style: match[2]!.trim(),
        file: match[3]!.trim(),
        source,
      })
    }
  }
  return fonts
}

/**
 * 通过扫描文件系统检测字体
 *
 * Windows 平台扫描：
 * - C:\Windows\Fonts （系统字体目录）
 * - %LOCALAPPDATA%\Microsoft\Windows\Fonts （用户安装字体）
 *
 * 其他平台：
 * - /usr/share/fonts （Linux 系统字体）
 * - /usr/local/share/fonts （Linux 用户字体）
 * - ~/Library/Fonts （macOS 用户字体）
 * - /Library/Fonts （macOS 系统字体）
 *
 * 此方式是兜底方案，不如 IM 和 fc-list 准确：
 * - 不支持读取字体的 family name（只能从文件名推断）
 * - 可能把同一字体的多个 style 算成多个独立字体
 */
function detectViaFilesystem(): Promise<FontInfo[]> {
  const dirs = getFontDirectories()
  const fonts: FontInfo[] = []
  const source = platform() === 'win32' ? 'windows' : platform() === 'darwin' ? 'macos' : 'linux'

  for (const dir of dirs) {
    if (!existsSync(dir)) continue
    try {
      const files = listFontFiles(dir)
      for (const file of files) {
        fonts.push({
          family: inferFamilyFromFilename(file), // 从文件名推断
          file,
          source,
        })
      }
    } catch {
      // 目录无权限或不是目录，跳过
      continue
    }
  }
  return Promise.resolve(fonts)
}

/**
 * 获取当前平台的字体目录列表
 */
function getFontDirectories(): string[] {
  const home = homedir()
  if (platform() === 'win32') {
    return [
      resolve('C:\\Windows\\Fonts'),
      join(home, 'AppData', 'Local', 'Microsoft', 'Windows', 'Fonts'),
    ]
  }
  if (platform() === 'darwin') {
    return [
      '/Library/Fonts',
      join(home, 'Library', 'Fonts'),
      '/System/Library/Fonts',
    ]
  }
  // Linux / 其他 Unix
  return [
    '/usr/share/fonts',
    '/usr/local/share/fonts',
    join(home, '.fonts'),
    join(home, '.local', 'share', 'fonts'),
  ]
}

// 字体文件支持的扩展名
const FONT_EXTENSIONS = new Set(['.ttf', '.otf', '.ttc', '.otc', '.woff', '.woff2', '.pfb'])

/**
 * 递归列出目录下所有字体文件
 */
function listFontFiles(dir: string, depth = 0): string[] {
  if (depth > 3) return [] // 防止目录太深，最多递归 3 层

  const results: string[] = []
  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        results.push(...listFontFiles(full, depth + 1))
      } else if (entry.isFile()) {
        const ext = entry.name.substring(entry.name.lastIndexOf('.')).toLowerCase()
        if (FONT_EXTENSIONS.has(ext)) {
          results.push(full)
        }
      }
    }
  } catch {
    // 无权限或其他错误，跳过
  }
  return results
}

/**
 * 从文件名推断字体族名
 *
 * 策略：
 * 1. 移除扩展名
 * 2. 转换分隔符（- _）为空格
 * 3. 移除常见的 style 后缀（Regular/Bold/Italic/...）
 * 4. 首字母大写
 *
 * 示例：
 * - 'Arial.ttf'             → 'Arial'
 * - 'arial-bold-italic.otf' → 'Arial'
 * - 'msyh.ttc'              → 'Msyh'（注：中文名无法推断，依赖 IM/fc-list）
 */
function inferFamilyFromFilename(filePath: string): string {
  const fileName = filePath.substring(filePath.lastIndexOf('/') + 1).replace(/\\/g, '/')
  const baseName = fileName.substring(0, fileName.lastIndexOf('.')) || fileName

  // 常见 style 关键字（需要从名字中移除）
  const STYLE_PATTERNS = [
    /[-_](regular|bold|italic|light|medium|semibold|thin|black|heavy|extralight|condensed|book)(-\w+)?$/i,
    /[-_](normal|bolditalic|bolditalic|demibold|extrabold|hairline)(-\w+)?$/i,
  ]

  let name = baseName
  for (const pattern of STYLE_PATTERNS) {
    name = name.replace(pattern, '')
  }

  // 将 - _ 替换为空格，并首字母大写每个词
  return name
    .split(/[-_]/)
    .filter((s) => s.length > 0)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// 导出公共 API
export const fontDetector = {
  detectSystemFonts,
} as const
