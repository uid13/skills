/**
 * ImageMagick 维度 - 滤镜与模糊
 *
 * 包含：模糊、锐化、去噪、卷积
 */

import type { Dimension } from '../types.js'

export class FilterOps implements Dimension {
  private ops: string[] = []

  /** 高斯模糊 */
  blur(radius: number, sigma?: number): this {
    this.ops.push(sigma ? `-blur ${radius}x${sigma}` : `-blur 0x${radius}`)
    return this
  }

  /** 自适应模糊（边缘保留） */
  adaptiveBlur(radius: number, sigma?: number): this {
    this.ops.push(sigma ? `-adaptive-blur ${radius}x${sigma}` : `-adaptive-blur 0x${radius}`)
    return this
  }

  /** 运动模糊 */
  motionBlur(radius: number, sigma: number, angle: number): this {
    this.ops.push(`-motion-blur ${radius}x${sigma}+${angle}`)
    return this
  }

  /** 径向模糊 */
  radialBlur(radius: number): this {
    this.ops.push(`-radial-blur ${radius}`)
    return this
  }

  /** 锐化 */
  sharpen(radius: number, sigma = 1): this {
    this.ops.push(`-sharpen ${radius}x${sigma}`)
    return this
  }

  /** 自适应锐化（边缘保留） */
  adaptiveSharpen(radius: number, sigma?: number): this {
    this.ops.push(sigma ? `-adaptive-sharpen ${radius}x${sigma}` : `-adaptive-sharpen 0x${radius}`)
    return this
  }

  /** USM 锐化（摄影标准） */
  unsharp(radius: number, sigma: number, amount: number, threshold: number): this {
    this.ops.push(`-unsharp ${radius}x${sigma}+${amount}+${threshold}`)
    return this
  }

  /** 中值去噪 */
  median(radius?: number): this {
    this.ops.push(radius ? `-median ${radius}` : '-median')
    return this
  }

  /** 去斑点 */
  despeckle(): this {
    this.ops.push('-despeckle')
    return this
  }

  /** 增强（去噪+对比度） */
  enhance(): this {
    this.ops.push('-enhance')
    return this
  }

  /** 双边滤波（边缘保留平滑） */
  bilateralBlur(width: number, intensitySigma: number, spatialSigma: number): this {
    this.ops.push(`-bilateral-blur ${width}x${intensitySigma}+${spatialSigma}`)
    return this
  }

  /** 自定义卷积核 */
  convolve(kernel: number[]): this {
    const kernelStr = kernel.join(' ')
    this.ops.push(`-convolve "${kernelStr}"`)
    return this
  }

  getCommands(): string[] { return this.ops }
  clear(): void { this.ops = [] }
}
