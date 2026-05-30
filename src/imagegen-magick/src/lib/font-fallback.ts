/**
 * 字体 Fallback 策略模块
 *
 * 核心功能：
 * - 优先从 references/font-handling.jsonc 读取由 font-chain.mjs 生成的字体链
 * - JSONC 不存在时，使用内置硬编码默认候选列表（兜底）
 * - 支持自定义候选策略
 *
 * 设计目标：
 * - JSONC 中的字体名来自 magick identify -list font，是当前系统真实可用的
 * - 硬编码列表作为 fallback，保证首次使用也能工作
 * - 用户可通过编辑 JSONC 自定义字体优先级
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { FallbackStrategy, FontInfo, FontMatchResult } from '../types/index.js'

// ============================================================
// JSONC 配置加载
// ============================================================

/** JSONC 中定义的字体链结构 */
interface FontChainConfig {
  generatedAt: string
  source: string
  totalFonts: number
  code: { description: string; chain: string[] }
  cjk: { description: string; chain: string[] }
  sans: { description: string; chain: string[] }
  serif: { description: string; chain: string[] }
}

/**
 * 解析 JSONC（去除注释后 JSON.parse）
 *
 * 支持 // 单行注释和 /* ... * / 多行注释，正确处理字符串内的 //
 */
function parseJsonc(text: string): FontChainConfig {
  let result = ''
  let i = 0
  while (i < text.length) {
    // 字符串内原样保留（跳过转义字符）
    if (text[i] === '"') {
      result += text[i++]
      while (i < text.length && text[i] !== '"') {
        if (text[i] === '\\') result += text[i++] // 转义字符
        result += text[i++]
      }
      if (i < text.length) result += text[i++] // 闭合引号
      continue
    }
    // 多行注释
    if (text[i] === '/' && text[i + 1] === '*') {
      i += 2
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++
      i += 2 // 跳过 */
      continue
    }
    // 单行注释
    if (text[i] === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i++
      continue
    }
    result += text[i++]
  }
  return JSON.parse(result)
}

/**
 * 尝试加载 font-handling.jsonc
 *
 * 查找路径：相对于当前脚本位置向上两级，进入 references/font-handling.jsonc
 * 即：scripts/dist/*.mjs → ../../references/font-handling.jsonc
 *
 * @returns 解析后的配置，或 null（文件不存在或解析失败）
 */
function loadFontChainConfig(): FontChainConfig | null {
  try {
    // import.meta.url 在编译后指向实际 .mjs 文件位置
    // info.mjs / render.mjs 等在 scripts/dist/ 下，向上 2 级到 imagegen-magick/
    const scriptDir = dirname(fileURLToPath(import.meta.url))
    const jsoncPath = resolve(scriptDir, '../../references/font-handling.jsonc')

    if (!readFileSync) return null
    const content = readFileSync(jsoncPath, 'utf-8')
    return parseJsonc(content)
  } catch {
    return null
  }
}

// ============================================================
// 默认候选列表（硬编码兜底，JSONC 不存在时使用）
// ============================================================

/**
 * 适合代码 / CLI / 博客封面的西文字体候选（等宽字体优先）
 */
export const DEFAULT_CODE_FONT_CANDIDATES = [
  'Cascadia Code',
  'Cascadia Mono',
  'Cascadia Next SC NF',
  'Cascadia Next',
  'Fira Code',
  'Fira Mono',
  'JetBrains Mono',
  'JetBrains Mono NL',
  'Hack',
  'Source Code Pro',
  'IBM Plex Mono',
  'Consolas',
  'DejaVu Sans Mono',
  'Courier New',
]

/**
 * 中文字体候选（按平台分组）
 */
export const DEFAULT_CJK_FONT_CANDIDATES = [
  // Windows 中文字体
  'Microsoft YaHei',
  'Microsoft YaHei UI',
  'DengXian',
  'SimHei',
  'SimSun',
  // macOS 中文
  'PingFang SC',
  'STHeiti',
  'Hiragino Sans GB',
  // Linux 中文
  'Noto Sans CJK SC',
  'Noto Sans CJK',
  'WenQuanYi Micro Hei',
  'WenQuanYi Zen Hei',
  // 通用中文字体
  'Source Han Sans CN',
  'Source Han Sans SC',
  'Adobe Song Std',
]

/**
 * 西文无衬线字体候选（通用 UI）
 */
export const DEFAULT_SANS_FONT_CANDIDATES = [
  'Inter',
  'Roboto',
  'SF Pro Display',
  'SF Pro Text',
  'Segoe UI',
  'Open Sans',
  'Lato',
  'Noto Sans',
  'Arial',
  'Helvetica',
  'Helvetica Neue',
]

/**
 * 西文衬线字体候选（长文阅读）
 */
export const DEFAULT_SERIF_FONT_CANDIDATES = [
  'Charter',
  'Source Serif Pro',
  'Georgia',
  'Cambria',
  'Times New Roman',
  'Noto Serif',
]

// ============================================================
// 动态加载：JSONC 优先，硬编码兜底
// ============================================================

/**
 * 获取字体候选列表
 *
 * 优先从 font-handling.jsonc 读取（由 font-chain.mjs 生成）
 * JSONC 不存在或解析失败时，使用硬编码默认值
 */
function getCodeCandidates(): string[] {
  const config = loadFontChainConfig()
  if (config?.code?.chain?.length) return config.code.chain
  return DEFAULT_CODE_FONT_CANDIDATES
}

function getCjkCandidates(): string[] {
  const config = loadFontChainConfig()
  if (config?.cjk?.chain?.length) return config.cjk.chain
  return DEFAULT_CJK_FONT_CANDIDATES
}

function getSansCandidates(): string[] {
  const config = loadFontChainConfig()
  if (config?.sans?.chain?.length) return config.sans.chain
  return DEFAULT_SANS_FONT_CANDIDATES
}

// ============================================================
// 匹配逻辑
// ============================================================

/**
 * 在字体列表中查找某个字体族名（不区分大小写，支持别名）
 */
function findFont(
  fonts: FontInfo[],
  targetFamily: string
): FontInfo | null {
  const normalized = targetFamily.toLowerCase().replace(/\s+/g, ' ').trim()

  for (const font of fonts) {
    const fontFam = font.family.toLowerCase().replace(/\s+/g, ' ').trim()
    // 精确匹配 或 前缀匹配（如 'Cascadia Code' 匹配 'Cascadia Code NF'）
    if (fontFam === normalized || fontFam.startsWith(normalized + ' ')) {
      return font
    }
  }
  return null
}

/**
 * 按候选列表查找字体（含 fallback）
 */
export function resolveFont(
  fonts: FontInfo[],
  requested: string | undefined,
  strategy: FallbackStrategy = {
    candidates: getCodeCandidates(),
    allowCJK: true,
    verbose: true,
  }
): FontMatchResult {
  // Case 1: 用户明确请求某个字体
  if (requested) {
    const exact = findFont(fonts, requested)
    if (exact) {
      return {
        matched: true,
        usedName: exact.family,
        source: 'exact',
        requestedName: requested,
        file: exact.file,
      }
    }
  }

  // Case 2: 走 fallback 链
  for (const cand of strategy.candidates) {
    const font = findFont(fonts, cand)
    if (font) {
      return {
        matched: true,
        usedName: font.family,
        source: requested ? 'fallback' : 'exact',
        requestedName: requested ?? cand,
        file: font.file,
        warning: requested && strategy.verbose
          ? `用户请求的字体 "${requested}" 不可用，已降级到 "${font.family}"`
          : undefined,
      }
    }
  }

  // Case 3: 全部候选失败，启用 CJK 兜底
  if (strategy.allowCJK) {
    for (const cjk of getCjkCandidates()) {
      const font = findFont(fonts, cjk)
      if (font) {
        return {
          matched: true,
          usedName: font.family,
          source: 'fallback',
          requestedName: requested ?? strategy.candidates[0] ?? '',
          file: font.file,
          warning: `所有候选字体均不可用，已降级到中文字体 "${font.family}"`,
        }
      }
    }
  }

  // Case 4: 完全失败
  return {
    matched: false,
    usedName: 'system-ui',
    source: 'missing',
    requestedName: requested ?? strategy.candidates[0] ?? '',
    warning: '系统中未检测到任何合适字体，将使用浏览器默认字体',
  }
}

/**
 * 便捷函数：为用户请求的字体生成最终字体族名（可直接写入 SVG 的 font-family）
 *
 * 数据来源优先级：
 * 1. references/font-handling.jsonc（由 font-chain.mjs 生成，基于真实系统字体）
 * 2. 硬编码默认候选列表（兜底）
 */
export function buildFontFamilyChain(
  requested?: string,
  includeSans = true
): string[] {
  const chain: string[] = []

  // 1. 用户请求的字体
  if (requested) chain.push(requested)

  // 2. 代码字体候选
  for (const cand of getCodeCandidates()) {
    if (!chain.includes(cand)) chain.push(cand)
    if (chain.length >= 5) break
  }

  // 3. 中文字体候选（处理中文内容）
  for (const cjk of getCjkCandidates().slice(0, 3)) {
    if (!chain.includes(cjk)) chain.push(cjk)
  }

  // 4. 最终兜底
  if (includeSans) {
    chain.push('system-ui', 'sans-serif')
  }

  return chain
}

/**
 * 序列化字体链为 font-family 字符串（带引号）
 */
export function formatFontFamily(chain: string[]): string {
  return chain
    .map((name) => {
      if (/^(system-ui|sans-serif|serif|monospace|cursive|fantasy)$/i.test(name)) {
        return name
      }
      return `"${name.replace(/"/g, '\\"')}"`
    })
    .join(', ')
}

// 导出公共 API
export const fontFallback = {
  resolveFont,
  buildFontFamilyChain,
  formatFontFamily,
  DEFAULT_CODE_FONT_CANDIDATES,
  DEFAULT_CJK_FONT_CANDIDATES,
  DEFAULT_SANS_FONT_CANDIDATES,
} as const
