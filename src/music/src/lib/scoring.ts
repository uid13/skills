/**
 * 歌曲匹配评分算法
 * 
 * 功能：
 * - 根据用户输入的歌曲名/艺人名，对 YouTube 搜索结果进行打分
 * - 返回最匹配的歌曲候选列表
 * 
 * 评分维度（按优先级排序）：
 * 1. 时长匹配（歌曲通常 60-600 秒）
 * 2. 标题精确匹配（歌名/艺人名出现在标题中）
 * 3. 元数据丰富度（有 title、artist、duration 等字段）
 * 4. 关键词加成（official、album、artist 等）
 * 5. 关键词惩罚（live、cover、remix 等）
 * 
 * 算法流程：
 * 1. 过滤明显不相关的视频（时长过短/过长）
 * 2. 对每个候选视频计算综合得分
 * 3. 按得分降序排列
 * 4. 返回前 N 个候选
 */

import type { YTVideoInfo, ScoredSong } from './types.js';

/**
 * 歌曲时长过滤阈值
 */
const MIN_DURATION = 60;   // 小于 60 秒可能是片段
const MAX_DURATION = 600;  // 超过 10 分钟可能是 MV/演唱会

/**
 * 标题匹配权重配置
 */
const SCORE_WEIGHTS = {
  titleExactMatch: 100_000,     // 标题完全匹配
  titlePartialMatch: 10_000,    // 标题部分匹配
  hasMetadata: 5_000,           // 有完整元数据
  officialBonus: 2_000,         // official 加成
  albumBonus: 1_500,            // album 加成
  durationMatch: 1_000,         // 时长在合理范围
  artistBonus: 800,             // artist 加成
  livePenalty: -5_000,          // live 惩罚
  coverPenalty: -3_000,         // cover 惩罚
  remixPenalty: -2_000,         // remix 惩罚
};

/**
 * 标题精确匹配得分
 * - 完全匹配（query 完全包含在 title 中）：+100_000
 * - 部分匹配（query 的关键词出现在 title 中）：+10_000
 * 
 * @param query 用户输入的搜索词（可能是歌名或艺人名）
 * @param title 视频标题
 * @returns 匹配得分
 */
function titleMatchScore(query: string, title: string): number {
  if (!title) return 0;

  const normalizedQuery = query.toLowerCase().trim();
  const normalizedTitle = title.toLowerCase();

  // 完全匹配（query 完全包含在 title 中）
  if (normalizedTitle.includes(normalizedQuery)) {
    return SCORE_WEIGHTS.titleExactMatch;
  }

  // 部分匹配（query 的每个词都出现在 title 中）
  const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);
  const matchedWords = queryWords.filter(word => normalizedTitle.includes(word));

  if (matchedWords.length === queryWords.length) {
    return SCORE_WEIGHTS.titlePartialMatch;
  }

  // 部分词匹配（按比例得分）
  if (matchedWords.length > 0) {
    return Math.round(
      SCORE_WEIGHTS.titlePartialMatch * (matchedWords.length / queryWords.length)
    );
  }

  return 0;
}

/**
 * 元数据丰富度得分
 * - 有 title：+2_000
 * - 有 artist/uploader：+1_500
 * - 有 duration：+1_500
 * 
 * @param info 视频信息
 * @returns 元数据得分
 */
function metadataRichnessScore(info: YTVideoInfo): number {
  let score = 0;

  if (info.title) score += 2_000;
  if (info.artist || info.uploader || info.channel) score += 1_500;
  if (info.duration) score += 1_500;

  return score;
}

/**
 * 关键词加成/惩罚得分
 * 
 * 加成关键词：
 * - official：+2_000
 * - album：+1_500
 * - artist, singer：+800
 * 
 * 惩罚关键词：
 * - live, concert：-5_000
 * - cover：-3_000
 * - remix, remixes：-2_000
 * 
 * @param title 视频标题
 * @returns 关键词得分（可正可负）
 */
function keywordScore(title: string): number {
  if (!title) return 0;

  const lower = title.toLowerCase();
  let score = 0;

  // 加成关键词
  if (lower.includes('official')) score += SCORE_WEIGHTS.officialBonus;
  if (lower.includes('album')) score += SCORE_WEIGHTS.albumBonus;
  if (lower.includes('artist') || lower.includes('singer')) score += SCORE_WEIGHTS.artistBonus;

  // 惩罚关键词
  if (lower.includes('live') || lower.includes('concert')) score += SCORE_WEIGHTS.livePenalty;
  if (lower.includes('cover')) score += SCORE_WEIGHTS.coverPenalty;
  if (lower.includes('remix') || lower.includes('remixes')) score += SCORE_WEIGHTS.remixPenalty;

  return score;
}

/**
 * 时长匹配得分
 * - 时长在 MIN_DURATION ~ MAX_DURATION 之间：+1_000
 * - 时长过短或过长：0
 * 
 * @param duration 时长（秒），可能不存在
 * @returns 时长得分
 */
function durationScore(duration?: number): number {
  if (duration === undefined || duration === null) return 0;

  if (duration >= MIN_DURATION && duration <= MAX_DURATION) {
    return SCORE_WEIGHTS.durationMatch;
  }

  return 0;
}

/**
 * 计算单个视频的综合得分
 * 
 * @param query 用户输入的搜索词
 * @param info 视频信息
 * @returns 综合得分（可能为负）
 */
function calculateScore(query: string, info: YTVideoInfo): number {
  let score = 0;

  // 1. 标题匹配（最重要）
  score += titleMatchScore(query, info.title || '');

  // 2. 元数据丰富度
  score += metadataRichnessScore(info);

  // 3. 关键词加成/惩罚
  score += keywordScore(info.title || '');

  // 4. 时长匹配
  score += durationScore(info.duration);

  return score;
}

/**
 * 主筛选函数：对搜索结果进行评分和排序
 * 
 * @param query 用户输入的搜索词
 * @param results YouTube 搜索结果（通过 searchYouTube 获取）
 * @param maxResults 返回的最大结果数（默认 10）
 * @returns 按得分降序排列的候选列表
 */
export function scoreAndRank(
  query: string,
  results: YTVideoInfo[],
  maxResults = 10
): ScoredSong[] {
  // 1. 计算每个视频的得分
  const scored = results.map(info => ({
    song: info,
    score: calculateScore(query, info),
  }));

  // 2. 过滤掉明显不相关的（得分过低或时长过短）
  const filtered = scored.filter(item => {
    // 时长过短（< 30 秒）直接过滤
    if (item.song.duration && item.song.duration < 30) return false;

    // 得分过低（可能是完全不相关的视频）
    if (item.score < 1_000) return false;

    return true;
  });

  // 3. 按得分降序排列
  filtered.sort((a, b) => b.score - a.score);

  // 4. 返回前 maxResults 个
  return filtered.slice(0, maxResults);
}

/**
 * 从评分结果中提取最佳歌曲
 * 
 * @param scored 评分后的候选列表
 * @returns 最佳歌曲，如果无候选返回 null
 */
export function pickBestSong(scored: ScoredSong[]): { song: YTVideoInfo; score: number } | null {
  if (scored.length === 0) return null;
  return { song: scored[0]!.song, score: scored[0]!.score };
}

/**
 * 判断评分结果是否可靠（最低得分阈值）
 * 
 * @param best 最佳候选
 * @returns 是否可靠（得分 >= 10_000）
 */
export function isReliableMatch(best: { score: number } | null): boolean {
  if (!best) return false;
  return best.score >= 10_000;
}
