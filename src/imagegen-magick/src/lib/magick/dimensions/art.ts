/**
 * ImageMagick 维度 - 艺术效果
 *
 * 包含：炭笔、素描、浮雕、油画、暗角、像素化、宝丽来
 */

import type { Dimension } from '../types.js'

export class ArtOps implements Dimension {
  private ops: string[] = []

  /** 炭笔素描 */
  charcoal(factor = 1): this {
    this.ops.push(`-charcoal ${factor}`)
    return this
  }

  /** 铅笔素描 */
  sketch(radius = 0, sigma = 20, angle = 45): this {
    this.ops.push(`-sketch ${radius}x${sigma}+${angle}`)
    return this
  }

  /** 浮雕效果 */
  emboss(radius = 0, sigma = 3): this {
    this.ops.push(`-emboss ${radius}x${sigma}`)
    return this
  }

  /** 油画效果 */
  oilPaint(radius = 3): this {
    this.ops.push(`-oil-paint ${radius}`)
    return this
  }

  /** 暗角（照片边缘暗化） */
  vignette(offset = 120): this {
    this.ops.push(`-vignette 0x${offset}`)
    return this
  }

  /** 像素化（马赛克） */
  pixelate(size = 10): this {
    this.ops.push(`-pixelate ${size}`)
    return this
  }

  /** 3D 光影效果 */
  shade(angle = 45, elevation = 45): this {
    this.ops.push(`-shade ${angle}x${elevation}`)
    return this
  }

  /** 像素随机扩散 */
  spread(radius = 3): this {
    this.ops.push(`-spread ${radius}`)
    return this
  }

  /** 旋转扭曲 */
  swirl(degrees = 90): this {
    this.ops.push(`-swirl ${degrees}`)
    return this
  }

  /** 内爆/外爆（球面化） */
  implode(factor = 0.5): this {
    this.ops.push(`-implode ${factor}`)
    return this
  }

  /** 波浪扭曲 */
  wave(amplitude = 20, wavelength = 150): this {
    this.ops.push(`-wave ${amplitude}x${wavelength}`)
    return this
  }

  /** 边缘检测 */
  edge(radius = 1): this {
    this.ops.push(`-edge ${radius}`)
    return this
  }

  /** Canny 边缘检测 */
  canny(radius = 0, sigma = 1, lowerPercent = 10, upperPercent = 30): this {
    this.ops.push(`-canny ${radius}x${sigma}+${lowerPercent}%+${upperPercent}%`)
    return this
  }

  getCommands(): string[] { return this.ops }
  clear(): void { this.ops = [] }
}
