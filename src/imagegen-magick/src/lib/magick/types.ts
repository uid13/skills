/**
 * ImageMagick 统一模块 - 类型定义
 */

/** 单个操作指令 */
export interface Operation {
  /** 操作类别（用于调试和日志） */
  category: string
  /** magick 命令参数 */
  command: string
  /** 执行优先级（数字小的先执行） */
  order: number
}

/** 维度接口（每个处理维度必须实现） */
export interface Dimension {
  /** 获取该维度累积的所有操作指令 */
  getCommands(): string[]
  /** 清空操作指令 */
  clear(): void
}

/** 渲染选项 */
export interface RenderOptions {
  input: string
  output: string
  quality?: number
  background?: string
  density?: string
  force?: boolean
}

/** 渲染结果 */
export interface RenderResult {
  success: boolean
  outputFile?: string
  error?: string
  exitCode: number
}

/** ImageMagick 环境信息 */
export interface MagickInfo {
  installed: boolean
  version?: string
  executable?: string
  formats?: string[]
  error?: string
}

/** 字体信息 */
export interface FontInfo {
  family: string
  file: string
}
