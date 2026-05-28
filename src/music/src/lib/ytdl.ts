/**
 * yt-dlp 封装模块
 * 
 * 功能：
 * - 搜索 YouTube 歌曲（支持关键词搜索）
 * - 获取视频元数据（标题、时长、上传者等）
 * - 解析 JSON 格式的 yt-dlp 输出
 * 
 * 优化点：
 * 1. async/await 封装 yt-dlp 命令（避免阻塞）
 * 2. 统一错误处理（yt-dlp 失败时返回清晰错误信息）
 * 3. 类型安全（YTVideoInfo 明确定义）
 * 4. 超时配置统一（默认 30 秒）
 */

import type { YTVideoInfo } from './types.js';
import { exec } from './utils.js';

/**
 * 默认超时时间（毫秒）
 */
const YTDLP_TIMEOUT = 30_000;

/**
 * 执行 yt-dlp 命令并返回解析后的输出
 * 
 * @param args yt-dlp 参数列表
 * @param timeout 超时时间（默认 30_000ms）
 * @returns yt-dlp 标准输出（字符串）
 * @throws 命令执行失败时抛出错误
 */
async function runYtdlp(args: string[], timeout = YTDLP_TIMEOUT): Promise<string> {
  const result = await exec('yt-dlp', args, { timeout });

  if (result.status !== 0) {
    // yt-dlp 的错误信息可能在 stdout 或 stderr
    const errorMsg = result.stderr.trim() || result.stdout.trim() || `yt-dlp 退出码 ${result.status}`;
    throw new Error(`yt-dlp 执行失败：${errorMsg}`);
  }

  return result.stdout;
}

/**
 * 解析 yt-dlp 的 JSON 输出（可能是单个对象或多个 JSON lines）
 * 
 * yt-dlp 的 --dump-json 会输出单个 JSON 对象
 * yt-dlp 的 --flat-playlist + --dump-json 会输出多行 JSON（JSON lines 格式）
 * 
 * @param output yt-dlp 标准输出
 * @returns 解析后的 JSON 对象数组
 */
export function parseYtdlpJsonLines(output: string): YTVideoInfo[] {
  if (!output.trim()) return [];

  const lines = output.split('\n').filter(line => line.trim());
  const results: YTVideoInfo[] = [];

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      results.push(parsed);
    } catch (err) {
      // 跳过解析失败的行（可能是非 JSON 输出）
      continue;
    }
  }

  return results;
}

/**
 * 搜索 YouTube 歌曲（使用 yt-dlp 的 ytsearch 功能）
 * 
 * 参数说明：
 * - ytsearch<limit>:<query>：限制返回结果数量
 * - --flat-playlist：快速搜索模式（不获取完整视频信息）
 * - --ignore-errors：跳过无法访问的视频
 * - --no-warnings：抑制警告输出
 * - --dump-json：输出 JSON 格式
 * 
 * @param query 搜索关键词
 * @param limit 最大结果数量（默认 10）
 * @returns 匹配的视频信息数组
 */
export async function searchYouTube(query: string, limit = 10): Promise<YTVideoInfo[]> {
  const args = [
    `ytsearch${limit}:${query}`,
    '--ignore-errors',
    '--no-warnings',
    '--flat-playlist',
    '--skip-download',
    '--playlist-end', String(limit),
    '--dump-json',
  ];

  try {
    const output = await runYtdlp(args);
    return parseYtdlpJsonLines(output);
  } catch (err: any) {
    // 搜索失败时返回空数组（避免阻断整个流程）
    console.error(`YouTube 搜索失败：${err.message}`);
    return [];
  }
}

/**
 * 获取单个视频的完整信息
 * 
 * 参数说明：
 * - --dump-single-json：输出单个视频的完整 JSON 信息
 * - --no-download：仅获取元数据，不下载
 * - --no-warnings --dump-json 组合
 * 
 * @param url 视频 URL
 * @returns 视频完整信息，失败返回 null
 */
export async function getVideoInfo(url: string): Promise<YTVideoInfo | null> {
  const args = [
    url,
    '--dump-json',
    '--no-download',
    '--no-warnings',
  ];

  try {
    const output = await runYtdlp(args);
    if (!output.trim()) return null;

    const parsed = JSON.parse(output);
    return parsed;
  } catch (err: any) {
    // 获取失败时返回 null
    return null;
  }
}

/**
 * 获取视频的实际音频流 URL（用于播放）
 * 
 * 参数说明：
 * - -f bestaudio：选择最佳音质
 * - -g --get-url：只输出下载 URL
 * - --no-download --no-warnings
 * 
 * @param url 视频 URL
 * @returns 音频流 URL，失败返回 null
 */
export async function getAudioStreamUrl(url: string): Promise<string | null> {
  const args = [
    url,
    '-f', 'bestaudio',
    '-g', '--get-url',
    '--no-download',
    '--no-warnings',
  ];

  try {
    const output = await runYtdlp(args, 60_000);
    const audioUrl = output.trim().split('\n')[0];
    return audioUrl || null;
  } catch (err: any) {
    return null;
  }
}
