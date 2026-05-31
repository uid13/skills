/**
 * ImageMagick 统一模块 - 类型定义
 *
 * 基础类型（FontInfo、MagickInfo、RenderOptions 等）统一在 types/index.ts 定义。
 * 本文件 re-export 并补充 magick 模块特有的类型。
 */

// 从公共类型 re-export（唯一来源）
export type {
  FontInfo,
  MagickInfo,
  RenderOptions,
  RenderResult,
} from '../../types/index.js'

// ============================================================
// magick 模块特有类型
// ============================================================

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
