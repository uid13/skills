/**
 * ImageMagick 统一模块
 *
 * 所有 ImageMagick 能力通过此模块统一访问。
 *
 * 使用方式：
 *   import { magick, GeometryOps, ColorOps } from '../lib/magick/index.js'
 *
 *   // 检测
 *   const info = await magick.detect()
 *
 *   // 渲染
 *   await magick.render({ input: 'a.svg', output: 'a.png' })
 *
 *   // 后处理（组合注入）
 *   const p = new ImageProcessor()
 *   p.use(new GeometryOps(), 100)
 *   p.use(new ColorOps(), 200)
 *   await p.resize(800).blur(0, 3).execute('in.png', 'out.png')
 */

// 底层
export { execMagick, execMagickOrThrow } from './core.js'

// 检测
export { detectEnvironment, listFormats } from './detection.js'

// 渲染
export { renderSvg } from './render.js'

// 维度
export { GeometryOps } from './dimensions/geometry.js'
export { ColorOps } from './dimensions/color.js'
export { FilterOps } from './dimensions/filter.js'
export { ArtOps } from './dimensions/art.js'
export { FormatOps } from './dimensions/format.js'

// 主类
export { ImageProcessor } from './processor.js'

// 类型
export type { Operation, Dimension, RenderOptions, RenderResult, MagickInfo } from './types.js'

// 便捷 API
export const magick = {
  detect: detectEnvironment,
  listFormats,
  render: renderSvg,
}
