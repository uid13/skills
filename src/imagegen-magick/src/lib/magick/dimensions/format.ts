/**
 * ImageMagick 维度 - 格式与编码
 *
 * 包含：输出格式、质量、压缩、透明通道
 */

import type { Dimension } from '../types.js'

export class FormatOps implements Dimension {
  private ops: string[] = []

  /** 输出为 JPEG */
  jpeg(quality = 85): this {
    this.ops.push(`-quality ${quality}`)
    this.ops.push('-format jpeg')
    return this
  }

  /** 输出为 PNG */
  png(compression = 6): this {
    this.ops.push(`-define png:compression-level=${compression}`)
    this.ops.push('-format png')
    return this
  }

  /** 输出为 WebP */
  webp(quality = 80): this {
    this.ops.push(`-quality ${quality}`)
    this.ops.push('-format webp')
    return this
  }

  /** 输出为 TIFF */
  tiff(compress = 'LZW'): this {
    this.ops.push(`-compress ${compress}`)
    this.ops.push('-format tiff')
    return this
  }

  /** 设置质量（适用于所有格式） */
  quality(value: number): this {
    this.ops.push(`-quality ${value}`)
    return this
  }

  /** 设置压缩方式 */
  compress(method: 'LZW' | 'Zip' | 'JPEG' | 'WebP' | 'ZSTD' | 'None'): this {
    this.ops.push(`-compress ${method}`)
    return this
  }

  /** 去除元数据（减小文件体积） */
  strip(): this {
    this.ops.push('-strip')
    return this
  }

  /** 设置透明通道 */
  alpha(type: 'set' | 'off' | 'remove' | 'extract' | 'shape' | 'transparent' | 'opaque'): this {
    this.ops.push(`-alpha ${type}`)
    return this
  }

  /** 设置色彩空间 */
  colorspace(space: 'sRGB' | 'RGB' | 'CMYK' | 'Gray' | 'Lab' | 'HSL'): this {
    this.ops.push(`-colorspace ${space}`)
    return this
  }

  /** 渐进式 JPEG（交错） */
  interlace(type: 'Plane' | 'None' | 'Line'): this {
    this.ops.push(`-interlace ${type}`)
    return this
  }

  /** 设置深度（位深） */
  depth(bits: 8 | 16 | 32): this {
    this.ops.push(`-depth ${bits}`)
    return this
  }

  getCommands(): string[] { return this.ops }
  clear(): void { this.ops = [] }
}
