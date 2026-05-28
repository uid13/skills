/**
 * 字体 Fallback 策略模块
 *
 * 核心功能：
 * - 当用户指定的字体在系统中不存在时，按照预定义策略选择替代字体
 * - 内置针对英文、中文、代码场景的默认候选列表
 * - 支持自定义候选策略
 *
 * 设计目标：
 * - 让用户无需手动安装 Cascadia，skill 仍然能渲染出可读的内容
 * - 同时不强制使用固定字体（保留用户自由）
 */

import type { FallbackStrategy, FontInfo, FontMatchResult } from '../types/index.js'

// ============================================================
// 默认候选列表（按优先级排序，从前向后尝试）
// ============================================================

/**
 * 适合代码 / CLI / 博客封面的西文字体候选（等宽字体优先）
 *
 * 候选理由：
 * - Cascadia Code/Mono/Next：VSCode 默认，支持 Nerd Font 图标
 * - Fira Code：流行开发字体，连字优秀
 * - JetBrains Mono：IDEA 默认，清晰易读
 * - Hack：开源经典等宽字体
 * - Consolas：Windows 自带，老一代等宽
 * - Courier New：兜底等宽（几乎所有系统都有）
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
 *
 * Windows：微软雅黑 → 等线 → 仿宋
 * macOS：  PingFang SC → STHeiti
 * Linux：  Noto Sans CJK SC → WenQuanYi
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
// 匹配逻辑
// ============================================================

/**
 * 在字体列表中查找某个字体族名（不区分大小写，支持别名）
 *
 * @param fonts - 系统字体列表
 * @param targetFamily - 期望字体族名
 * @returns 匹配到的字体信息，或 null
 */
function findFont(
  fonts: FontInfo[],
  targetFamily: string
): FontInfo | null {
  // 标准化目标（小写 + 去除 -SC / -Regular 等变体后缀）
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
 *
 * @param fonts - 系统中可用字体列表
 * @param requested - 用户请求的字体（可选；不传则从 candidates 第一项开始）
 * @param strategy - 备选策略
 * @returns 匹配结果
 *
 * @example
 *   const result = resolveFont(systemFonts, 'Cascadia Code', {
 *     candidates: DEFAULT_CODE_FONT_CANDIDATES,
 *     allowCJK: true,
 *     verbose: true,
 *   })
 *
 *   if (result.source === 'exact') {
 *     // 用户请求字体可用
 *   } else if (result.source === 'fallback') {
 *     // 降级到备选字体
 *   } else {
 *     // 系统完全无中文字体，警告
 *   }
 */
export function resolveFont(
  fonts: FontInfo[],
  requested: string | undefined,
  strategy: FallbackStrategy = {
    candidates: DEFAULT_CODE_FONT_CANDIDATES,
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
    // 如果没有明确请求，第一项算 exact（默认首选）
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
    for (const cjk of DEFAULT_CJK_FONT_CANDIDATES) {
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
 * 用途：
 * - SVG 的 font-family 推荐写成 `'Cascadia Code', 'Microsoft YaHei', system-ui`
 *   这种多字体兜底链
 * - 本函数生成这个链
 *
 * @param requested - 用户请求字体（可省略）
 * @param includeSans - 是否在末尾追加无衬线字体作为最终兜底
 */
export function buildFontFamilyChain(
  requested?: string,
  includeSans = true
): string[] {
  const chain: string[] = []

  // 1. 用户请求的字体
  if (requested) chain.push(requested)

  // 2. 代码字体候选
  for (const cand of DEFAULT_CODE_FONT_CANDIDATES) {
    if (!chain.includes(cand)) chain.push(cand)
    if (chain.length >= 5) break // 控制长度
  }

  // 3. 中文字体候选（处理中文内容）
  for (const cjk of DEFAULT_CJK_FONT_CANDIDATES.slice(0, 3)) {
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
 *
 * @example
 *   formatFontFamily(['Cascadia Code', 'Microsoft YaHei', 'system-ui'])
 *   // 返回: '"Cascadia Code", "Microsoft YaHei", system-ui'
 */
export function formatFontFamily(chain: string[]): string {
  return chain
    .map((name) => {
      // 系统关键字（无引号）
      if (/^(system-ui|sans-serif|serif|monospace|cursive|fantasy)$/i.test(name)) {
        return name
      }
      // 其他字体名（含空格必须引号，不含也可引号）
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
