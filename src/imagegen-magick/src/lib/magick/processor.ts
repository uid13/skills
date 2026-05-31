/**
 * ImageMagick 统一模块 - ImageProcessor
 *
 * 组合注入模式：通过 use() 注入需要的维度，按需组合。
 * 不需要的维度不注入，避免多余依赖。
 *
 * 使用示例：
 *   const p = new ImageProcessor()
 *   p.use(new GeometryOps(), 100)
 *   p.use(new ColorOps(), 200)
 *   p.use(new FilterOps(), 300)
 *   await p.resize(800).blur(0, 3).execute('in.png', 'out.png')
 */

import { execMagick } from './core.js'
import type { Dimension } from './types.js'

/** 已注入的维度记录 */
interface DimensionEntry {
  dimension: Dimension
  order: number
}

export class ImageProcessor {
  private dimensions: DimensionEntry[] = []
  private pendingOps: { command: string; order: number }[] = []

  /**
   * 注入一个处理维度
   *
   * @param dimension - 维度实例（GeometryOps / ColorOps / FilterOps / ...）
   * @param order - 执行优先级（数字小的先执行，建议按 100 递增）
   */
  use<T extends Dimension>(dimension: T, order: number): this {
    this.dimensions.push({ dimension, order })
    return this
  }

  /**
   * 直接添加一个原始 magick 参数（用于未封装的操作）
   */
  raw(command: string, order = 500): this {
    this.pendingOps.push({ command, order })
    return this
  }

  /**
   * 获取所有操作指令（按 order 排序）
   */
  getCommands(): string[] {
    // 收集所有维度的操作
    const allOps = [
      ...this.dimensions.flatMap(d =>
        d.dimension.getCommands().map(cmd => ({ command: cmd, order: d.order }))
      ),
      ...this.pendingOps,
    ]

    // 按 order 排序后返回纯命令列表
    return allOps
      .sort((a, b) => a.order - b.order)
      .map(op => op.command)
  }

  /**
   * 清空所有操作（保留已注入的维度）
   */
  clear(): this {
    for (const d of this.dimensions) {
      d.dimension.clear()
    }
    this.pendingOps = []
    return this
  }

  /**
   * 执行操作：将 input 经过所有操作后输出到 output
   *
   * @param input - 输入文件路径
   * @param output - 输出文件路径
   * @param extraArgs - 额外的 magick 参数（在操作之前）
   */
  async execute(input: string, output: string, extraArgs: string[] = []): Promise<void> {
    const commands = this.getCommands()
    // 拆分带空格的命令字符串（如 "-brightness-contrast 15x0" → ["-brightness-contrast", "15x0"]）
    const splitCommands = commands.flatMap(cmd => cmd.split(/\s+/))
    const args = [...extraArgs, input, ...splitCommands, output]

    const result = await execMagick(args, 120000)

    if (!result.success) {
      throw new Error(`ImageMagick 执行失败: ${result.stderr}`)
    }
  }

  /**
   * 执行操作并返回结果（不抛错）
   */
  async executeSafe(input: string, output: string, extraArgs: string[] = []): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      await this.execute(input, output, extraArgs)
      return { success: true }
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  }
}
