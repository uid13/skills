/**
 * ImageMagick 维度 - 颜色与色调
 *
 * 包含：亮度/对比度、饱和度、色调、自动调整、着色
 */

import type { Dimension } from '../types.js'

export class ColorOps implements Dimension {
  private ops: string[] = []

  /** 亮度和对比度 */
  brightnessContrast(brightness: number, contrast: number): this {
    this.ops.push(`-brightness-contrast ${brightness}x${contrast}`)
    return this
  }

  /** 色相/饱和度/明度（100=不变） */
  modulate(hue: number, saturation: number, lightness: number): this {
    this.ops.push(`-modulate ${hue},${saturation},${lightness}`)
    return this
  }

  /** 增加饱和度（百分比，100=不变） */
  saturate(percent: number): this {
    this.ops.push(`-modulate 100,${percent},100`)
    return this
  }

  /** 色阶调整 */
  level(blackPoint: string, whitePoint: string): this {
    this.ops.push(`-level ${blackPoint},${whitePoint}`)
    return this
  }

  /** Gamma 校正 */
  gamma(value: number): this {
    this.ops.push(`-gamma ${value}`)
    return this
  }

  /** 自动色阶 */
  autoLevel(): this {
    this.ops.push('-auto-level')
    return this
  }

  /** 自动 Gamma */
  autoGamma(): this {
    this.ops.push('-auto-gamma')
    return this
  }

  /** 标准化（拉伸直方图） */
  normalize(): this {
    this.ops.push('-normalize')
    return this
  }

  /** 棕褐色调 */
  sepia(intensity = 80): this {
    this.ops.push(`-sepia-tone ${intensity}%`)
    return this
  }

  /** 反色 */
  negate(): this {
    this.ops.push('-negate')
    return this
  }

  /** 着色（单色叠加） */
  colorize(percent: number): this {
    this.ops.push(`-colorize ${percent}%`)
    return this
  }

  /** 灰度 */
  grayscale(): this {
    this.ops.push('-colorspace Gray')
    return this
  }

  /** 太阳化效果 */
  solarize(threshold = 50): this {
    this.ops.push(`-solarize ${threshold}%`)
    return this
  }

  /** 对比度拉伸 */
  contrastStretch(black = '5%', white = '5%'): this {
    this.ops.push(`-contrast-stretch ${black}x${white}`)
    return this
  }

  /** Sigmoidal 对比度（更自然的对比度调整） */
  sigmoidalContrast(contrast = 11, midpoint = '50%'): this {
    this.ops.push(`-sigmoidal-contrast ${contrast}x${midpoint}`)
    return this
  }

  getCommands(): string[] { return this.ops }
  clear(): void { this.ops = [] }
}
