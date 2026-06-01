/**
 * imagegen-magick 公共类型定义
 *
 * 本文件集中定义所有共享类型，避免 lib 之间循环依赖。
 * 被 lib/ 下的工具统一引用。
 *
 * 注意：FontInfo、MagickInfo 等基础类型由此文件统一定义。
 * magick/types.ts 从此文件 re-export，不要在那里重复定义。
 */

// ============================================================
// 字体相关类型
// ============================================================

/**
 * 检测到的系统字体信息
 */
export interface FontInfo {
  /** 字体族名（用于 font-family） */
  family: string
  /** 字体样式（如 Regular / Bold / Italic） */
  style?: string
  /** 字体文件绝对路径 */
  file: string
  /** 字体来源系统（用于调试） */
  source?: 'windows' | 'macos' | 'linux'
}

/**
 * 字体匹配结果（含 fallback 信息）
 */
export interface FontMatchResult {
  /** 是否精确匹配到候选字体 */
  matched: boolean
  /** 实际使用的字体族名 */
  usedName: string
  /** 匹配来源：'exact' 精确 / 'fallback' 降级 / 'missing' 缺失 */
  source: 'exact' | 'fallback' | 'missing'
  /** 原始请求的字体族名 */
  requestedName: string
  /** 匹配到的字体文件路径（如果找到） */
  file?: string
  /** 警告信息（如果走 fallback 或 missing） */
  warning?: string
}

/**
 * 字体候选策略配置
 */
export interface FallbackStrategy {
  /** 优先级列表（按顺序尝试） */
  candidates: string[]
  /** 是否允许使用系统中文字体降级 */
  allowCJK: boolean
  /** 是否在未匹配时输出警告 */
  verbose: boolean
}

// ============================================================
// ImageMagick 相关类型
// ============================================================

/**
 * ImageMagick 环境信息
 */
export interface MagickInfo {
  /** 是否已安装 */
  installed: boolean
  /** 版本号（如 '7.1.2-24'） */
  version?: string
  /** 可执行文件路径 */
  executable?: string
  /** 支持的图像格式列表 */
  formats?: string[]
  /** 失败时的错误信息 */
  error?: string
}

/**
 * 渲染参数
 */
export interface RenderOptions {
  /** 输入 SVG 路径 */
  input: string
  /** 输出 PNG 路径 */
  output: string
  /** 输出质量（1-100，PNG 下主要影响压缩速度） */
  quality?: number
  /** 背景（默认 transparent，可指定颜色或 'white'） */
  background?: string | 'transparent'
  /** DPI / 缩放（如 '2x', '3x' 或直接像素 '1920x1080'） */
  density?: string
  /** 是否强制覆盖已有文件 */
  force?: boolean
}

/**
 * 渲染结果
 */
export interface RenderResult {
  /** 是否成功 */
  success: boolean
  /** 输出文件路径 */
  outputFile?: string
  /** 错误信息（失败时） */
  error?: string
  /** 退出码 */
  exitCode: number
}

// ============================================================
// 环境信息汇总类型
// ============================================================

/**
 * 完整环境信息（info.mjs 输出）
 */
export interface EnvironmentInfo {
  /** Node.js 版本 */
  node: string
  /** 操作系统 */
  platform: string
  /** ImageMagick 状态 */
  imagemagick: MagickInfo
  /** 首选字体结果 */
  preferredFont: FontMatchResult | null
  /** 系统字体总数 */
  totalFonts: number
  /** 推荐使用的字体候选列表 */
  availableCJKFonts: string[]
  /** 检测到的问题（如 ImageMagick 缺失） */
  issues: string[]
}


