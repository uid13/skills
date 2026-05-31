/**
 * ImageMagick 维度 - 几何变换
 *
 * 包含：缩放、裁剪、旋转、翻转、扭曲
 */

import type { Dimension } from '../types.js'

export class GeometryOps implements Dimension {
  private ops: string[] = []

  /** 缩放 */
  resize(width: number, height?: number): this {
    const geo = height ? `${width}x${height}` : `${width}x`
    this.ops.push(`-resize ${geo}`)
    return this
  }

  /** 按百分比缩放 */
  resizePercent(percent: number): this {
    this.ops.push(`-resize ${percent}%`)
    return this
  }

  /** 裁剪 */
  crop(width: number, height: number, x = 0, y = 0): this {
    this.ops.push(`-crop ${width}x${height}+${x}+${y} +repage`)
    return this
  }

  /** 自动裁剪空白边缘 */
  trim(): this {
    this.ops.push('-trim +repage')
    return this
  }

  /** 旋转（度数） */
  rotate(degrees: number): this {
    this.ops.push(`-rotate ${degrees}`)
    return this
  }

  /** 垂直翻转 */
  flip(): this {
    this.ops.push('-flip')
    return this
  }

  /** 水平镜像 */
  flop(): this {
    this.ops.push('-flop')
    return this
  }

  /** 调整画布大小（居中填充） */
  extent(width: number, height: number): this {
    this.ops.push(`-extent ${width}x${height} -gravity center`)
    return this
  }

  /** 液态缩放（内容感知） */
  liquidRescale(width: number, height?: number): this {
    const geo = height ? `${width}x${height}` : `${width}x`
    this.ops.push(`-liquid-rescale ${geo}`)
    return this
  }

  getCommands(): string[] { return this.ops }
  clear(): void { this.ops = [] }
}
