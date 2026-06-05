/**
 * 图片数据类型定义
 */
export interface ImageItem {
  /** 图片 URL */
  url: string
  /** 图片描述/替代文本 */
  alt: string
}

/**
 * 全局 PP_IMAGES 类型声明
 */
declare global {
  interface Window {
    PP_IMAGES?: ImageItem[]
  }
}
