/**
 * 终端颜色输出工具（替代 chalk 依赖，减小打包体积）
 *
 * 工作原理：
 * - 使用 ANSI 转义码实现颜色
 * - 自动检测 TTY 环境，非 TTY 时禁用颜色（CI 友好）
 * - 支持 NO_COLOR 环境变量（现代约定）
 * - 支持 FORCE_COLOR 强制启用
 *
 * 用法：
 *   import { colors } from '../lib/colors'
 *   console.log(colors.green('✓ 成功'))
 *   console.log(colors.bold(colors.red('✗ 失败')))
 */

// ANSI 转义码定义（[启用码, 关闭码]）
// 详见：https://en.wikipedia.org/wiki/ANSI_escape_code
const ANSI_CODES = {
  reset: [0, 0],
  bold: [1, 22],
  dim: [2, 22],
  italic: [3, 23],
  underline: [4, 24],
  inverse: [7, 27],
  strikethrough: [9, 29],

  // 前景色（文本颜色）
  black: [30, 39],
  red: [31, 39],
  green: [32, 39],
  yellow: [33, 39],
  blue: [34, 39],
  magenta: [35, 39],
  cyan: [36, 39],
  white: [37, 39],
  gray: [90, 39],

  // 高亮前景色（更亮）
  redBright: [91, 39],
  greenBright: [92, 39],
  yellowBright: [93, 39],
  blueBright: [94, 39],
  magentaBright: [95, 39],
  cyanBright: [96, 39],

  // 背景色
  bgRed: [41, 49],
  bgGreen: [42, 49],
  bgYellow: [43, 49],
  bgBlue: [44, 49],
} as const

/**
 * 检测颜色是否应启用
 *
 * 启用规则：
 * 1. FORCE_COLOR env 存在 → 强制启用
 * 2. NO_COLOR env 存在 → 强制禁用（约定：https://no-color.org/）
 * 3. stdout 不是 TTY → 禁用（通常是管道/CI 环境）
 * 4. 其他情况启用
 */
function shouldEnableColors(): boolean {
  // 强制启用
  if (process.env['FORCE_COLOR'] !== undefined) {
    return true
  }
  // 强制禁用
  if (process.env['NO_COLOR'] !== undefined) {
    return false
  }
  // 自动检测：只有 TTY 才启用
  return Boolean(process.stdout.isTTY)
}

// 全局启用状态（初始化时一次性检测）
const ENABLED = shouldEnableColors()

/**
 * 构造颜色函数（内部工具）
 *
 * @param openCode - 启用 ANSI 码
 * @param closeCode - 关闭 ANSI 码
 * @returns 字符串染色函数
 */
function makeColorFn(openCode: number, closeCode: number) {
  return (text: string): string => {
    if (!ENABLED) return text
    return `\x1b[${openCode}m${text}\x1b[${closeCode}m`
  }
}

/**
 * 公共颜色 API
 *
 * 支持的颜色与样式：
 * - 样式：bold, dim, italic, underline, inverse, strikethrough
 * - 前景色：black, red, green, yellow, blue, magenta, cyan, white, gray
 * - 高亮色：redBright, greenBright, yellowBright, blueBright, magentaBright, cyanBright
 * - 背景色：bgRed, bgGreen, bgYellow, bgBlue
 */
export const colors = {
  // 样式
  reset: makeColorFn(...ANSI_CODES.reset),
  bold: makeColorFn(...ANSI_CODES.bold),
  dim: makeColorFn(...ANSI_CODES.dim),
  italic: makeColorFn(...ANSI_CODES.italic),
  underline: makeColorFn(...ANSI_CODES.underline),
  inverse: makeColorFn(...ANSI_CODES.inverse),
  strikethrough: makeColorFn(...ANSI_CODES.strikethrough),

  // 标准前景色
  black: makeColorFn(...ANSI_CODES.black),
  red: makeColorFn(...ANSI_CODES.red),
  green: makeColorFn(...ANSI_CODES.green),
  yellow: makeColorFn(...ANSI_CODES.yellow),
  blue: makeColorFn(...ANSI_CODES.blue),
  magenta: makeColorFn(...ANSI_CODES.magenta),
  cyan: makeColorFn(...ANSI_CODES.cyan),
  white: makeColorFn(...ANSI_CODES.white),
  gray: makeColorFn(...ANSI_CODES.gray),

  // 高亮前景色
  redBright: makeColorFn(...ANSI_CODES.redBright),
  greenBright: makeColorFn(...ANSI_CODES.greenBright),
  yellowBright: makeColorFn(...ANSI_CODES.yellowBright),
  blueBright: makeColorFn(...ANSI_CODES.blueBright),
  magentaBright: makeColorFn(...ANSI_CODES.magentaBright),
  cyanBright: makeColorFn(...ANSI_CODES.cyanBright),

  // 背景色
  bgRed: makeColorFn(...ANSI_CODES.bgRed),
  bgGreen: makeColorFn(...ANSI_CODES.bgGreen),
  bgYellow: makeColorFn(...ANSI_CODES.bgYellow),
  bgBlue: makeColorFn(...ANSI_CODES.bgBlue),
} as const

/**
 * 检测当前环境是否启用颜色
 *
 * @returns true 表示颜色已启用
 */
export function isColorEnabled(): boolean {
  return ENABLED
}

/**
 * 移除字符串中的所有 ANSI 转义码
 *
 * 用途：
 * - 计算不含颜色的实际字符长度（用于对齐）
 * - 生成纯文本日志
 *
 * @param text - 含 ANSI 码的字符串
 * @returns 清洗后的纯文本
 */
export function stripAnsi(text: string): string {
  // 匹配所有形如 \x1b[...m 的序列
  return text.replace(/\x1b\[[0-9;]*m/g, '')
}
