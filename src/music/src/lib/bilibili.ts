// B站搜索模块：走 /x/web-interface/search/all/v2 免 cookie/免签名端点，规避搜索接口 412 风控
// 使用 Node 22 内置 fetch，零新增依赖；返回规范化候选列表供 select 使用

// /all/v2 端点地址（免 cookie、免 WBI 签名，即使搜索接口被 412 限流也正常返回）
const SEARCH_API = 'https://api.bilibili.com/x/web-interface/search/all/v2'

// B站搜索单条候选的结构化定义
export interface BiliCandidate {
  bvid: string        // BV 号，可直接用于 mpv 播放
  duration: number    // 时长（秒），已从 "分:秒" 字符串转换
  play: number        // 播放量
  danmaku: number     // 弹幕数
  title: string       // 标题，已去除 <em class="keyword"> 高亮标签
}

// 去除搜索高亮标签（B站用 <em class="keyword"> 包裹命中词）
function cleanTitle(title: string): string {
  return title.replace(/<[^>]+>/g, '')
}

// 将 "/all/v2" 的 "分:秒" 时长字符串转为秒数（如 "3:32" → 212）
function toSeconds(duration: string): number {
  const [min, sec] = duration.split(':').map(Number)
  return min * 60 + (sec || 0)
}

// B站搜索主函数：按关键词请求 /all/v2 并规范化候选列表
// @param keyword 搜索关键词（中文原文，内部自动 URL 编码）
// @param ua 随机桌面 UA（按 reference/ua-spec.md 生成），可选
// @returns 规范化候选列表（bvid/duration/play/danmaku/title）
export async function searchBilibili(keyword: string, ua?: string): Promise<BiliCandidate[]> {
  // 用 URLSearchParams 自动做 UTF-8 百分号编码（空格 → %20、中文自动编码）
  const params = new URLSearchParams({ search_type: 'video', keyword })
  const headers: Record<string, string> = ua ? { 'User-Agent': ua } : {}
  const res = await fetch(`${SEARCH_API}?${params.toString()}`, { headers })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }
  const body = await res.json() as {
    code: number
    data: {
      result: Array<{
        result_type: string
        data: Array<{
          bvid: string
          duration: string
          play: number
          danmaku: number
          title: string
        }>
      }>
    }
  }
  // code 非 0 表示被拦截/异常
  if (body.code !== 0) {
    throw new Error(`B站搜索失败 code=${body.code}`)
  }
  const candidates: BiliCandidate[] = []
  // /all/v2 返回按 result_type 分组的多种结果，只需 video 类型
  for (const item of body.data.result) {
    if (item.result_type !== 'video') continue
    for (const v of item.data) {
      candidates.push({
        bvid: v.bvid,
        duration: toSeconds(v.duration),
        play: v.play,
        danmaku: v.danmaku,
        title: cleanTitle(v.title),
      })
    }
  }
  return candidates
}
