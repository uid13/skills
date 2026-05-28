/**
 * 统一日志输出工具
 *
 * 用途：
 * - 在终端输出彩色日志（自动适配 TTY/非 TTY）
 * - 支持 --json 模式输出 JSON（供 AI 解析）
 * - 支持 --quiet 模式完全静默
 * - 前缀图标（✓ ✗ ⚠ ℹ）便于识别
 *
 * 用法：
 *   const log = createLogger({ json: false, quiet: false })
 *   log.info('开始处理')
 *   log.success('渲染完成', { output: 'a.png' })
 *   log.error('失败', { reason: '找不到 ImageMagick' })
 */

import { colors, isColorEnabled } from './colors.js'

/**
 * 日志级别枚举
 */
type LogLevel = 'info' | 'success' | 'warn' | 'error' | 'debug'

/**
 * 日志配置
 */
export interface LoggerOptions {
  /** 是否输出 JSON 格式（供 AI 解析） */
  json?: boolean
  /** 是否完全静默 */
  quiet?: boolean
  /** 是否显示调试级别日志 */
  debug?: boolean
  /** 模块名前缀（可选） */
  prefix?: string
}

/**
 * 日志记录器
 */
export interface Logger {
  /** 普通信息（蓝色图标） */
  info: (message: string, data?: Record<string, unknown>) => void
  /** 成功信息（绿色 ✓） */
  success: (message: string, data?: Record<string, unknown>) => void
  /** 警告信息（黄色 ⚠） */
  warn: (message: string, data?: Record<string, unknown>) => void
  /** 错误信息（红色 ✗） */
  error: (message: string, data?: Record<string, unknown>) => void
  /** 调试信息（灰色，仅 debug 模式显示） */
  debug: (message: string, data?: Record<string, unknown>) => void
  /** 直接写入 stdout（无格式） */
  raw: (text: string) => void
}

/**
 * 日志级别配置表（图标 + 颜色 + stderr/stdout 选择）
 */
const LEVEL_CONFIG: Record<
  LogLevel,
  { icon: string; color: (text: string) => string; useStderr: boolean }
> = {
  info: { icon: 'ℹ', color: colors.blue, useStderr: false },
  success: { icon: '✓', color: colors.green, useStderr: false },
  warn: { icon: '⚠', color: colors.yellow, useStderr: true },
  error: { icon: '✗', color: colors.red, useStderr: true },
  debug: { icon: '·', color: colors.gray, useStderr: true },
}

/**
 * 创建日志记录器
 *
 * @param options - 日志配置
 * @returns 日志记录器对象
 *
 * @example
 *   const log = createLogger({ prefix: 'render' })
 *   log.info('开始', { input: 'a.svg' })
 *   // 输出: ℹ [render] 开始 { input: 'a.svg' }
 */
export function createLogger(options: LoggerOptions = {}): Logger {
  const { json = false, quiet = false, debug = false, prefix } = options

  /**
   * 通用日志写入（内部函数）
   *
   * @param level - 日志级别
   * @param message - 文本消息
   * @param data - 附加数据（可选）
   */
  function write(level: LogLevel, message: string, data?: Record<string, unknown>) {
    if (quiet) return

    const config = LEVEL_CONFIG[level]
    const stream = config.useStderr ? process.stderr : process.stdout

    // JSON 模式：输出结构化数据
    if (json) {
      const payload = {
        level,
        prefix,
        message,
        ...(data ? { data } : {}),
        timestamp: new Date().toISOString(),
      }
      stream.write(JSON.stringify(payload) + '\n')
      return
    }

    // 普通文本模式：彩色输出
    const iconPart = isColorEnabled() ? config.color(config.icon) : config.icon
    const prefixPart = prefix ? colors.dim(`[${prefix}] `) : ''

    let line = `${iconPart} ${prefixPart}${message}`
    if (data && Object.keys(data).length > 0) {
      line += ' ' + colors.dim(JSON.stringify(data))
    }

    stream.write(line + '\n')
  }

  return {
    info: (message, data) => write('info', message, data),
    success: (message, data) => write('success', message, data),
    warn: (message, data) => write('warn', message, data),
    error: (message, data) => write('error', message, data),
    debug: (message, data) => {
      // debug 模式才显示
      if (debug) write('debug', message, data)
    },
    raw: (text) => {
      if (!quiet) process.stdout.write(text)
    },
  }
}

/**
 * 默认全局日志记录器（无配置，方便直接调用）
 */
export const log = createLogger()
