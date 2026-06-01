/**
 * imagegen-magick 公共类型定义
 *
 * 本文件集中定义所有共享类型，避免 lib 之间循环依赖。
 * 被 lib/ 下的工具统一引用。
 */

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
// 环境信息类型
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
  /** 内置字体名称 */
  bundledFont: string
  /** 检测到的问题 */
  issues: string[]
}
