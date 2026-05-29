/**
 * 输出格式化模块
 * 
 * 功能：
 * - 彩色终端输出（ANSI 转义码）
 * - 统一的输出前缀（✓ / ✗ / → / ℹ）
 * - Markdown 错误输出（方便 Agent 转述给用户）
 * 
 * 输出规范：
 * - 成功：绿色 ✓
 * - 失败：红色 ✗
 * - 状态：蓝色 ℹ
 * - 动作：黄色 →
 * - JSON 模式：结构化 JSON（供 Agent 解析）
 */

import type { ControlAction } from './types.js';
import { LABELS } from './mpv.js';

/**
 * 是否为 JSON 输出模式
 * （由主入口 music.ts 设置）
 */
let jsonMode = false;

/**
 * 切换 JSON 输出模式
 * 
 * @param enabled 是否启用 JSON 模式
 */
export function setJsonMode(enabled: boolean): void {
  jsonMode = enabled;
}

/**
 * 获取当前 JSON 输出模式状态
 * 
 * @returns 是否启用 JSON 模式
 */
export function getJsonMode(): boolean {
  return jsonMode;
}

/**
 * ANSI 颜色代码
 */
const ANSI_COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  
  // 前景色
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  
  // 高亮前景色
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
};

/**
 * 检测当前终端是否支持颜色
 * 
 * 规则：
 * 1. 如果 stdout 不是 TTY，禁用颜色
 * 2. 如果 stdout.columns < 80，禁用颜色（窄终端）
 * 3. Windows 10 1809+ 默认支持 ANSI
 * 4. 其他情况启用颜色
 * 
 * @returns 是否支持颜色
 */
function supportsColor(): boolean {
  // 非 TTY 禁用
  if (!process.stdout.isTTY) return false;

  // 窄终端禁用
  if ((process.stdout.columns ?? 0) < 80) return false;

  // Windows 检查（10 1809 = 17763）
  if (process.platform === 'win32') {
    try {
      const ver = process.getSystemVersion?.() || '';
      const build = parseInt(ver.split('.')[2] || '0');
      return build >= 17763;
    } catch {
      return true; // 默认启用
    }
  }

  return true;
}

/**
 * 颜色开关（启动时检测一次）
 */
const colorEnabled = supportsColor();

/**
 * 颜色化文本（如果支持颜色）
 * 
 * @param text 原始文本
 * @param color ANSI 颜色代码
 * @returns 颜色化后的文本（不支持颜色时返回原文本）
 */
function colorize(text: string, color: keyof typeof ANSI_COLORS): string {
  if (!colorEnabled) return text;
  return `${ANSI_COLORS[color]}${text}${ANSI_COLORS.reset}`;
}

/**
 * 格式化时长（秒 → mm:ss）
 * 
 * @param seconds 秒数（可能为小数或 null）
 * @returns 格式化后的字符串（如 "3:45"）
 */
export function formatDuration(seconds?: number | null): string {
  if (seconds === undefined || seconds === null || seconds < 0) return '--:--';

  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);

  return `${min}:${sec.toString().padStart(2, '0')}`;
}

/**
 * 输出成功信息
 * 
 * 终端格式：✓ [前缀] 消息（绿色）
 * JSON 格式：{ "status": "success", "message": "..." }
 * 
 * @param message 消息文本
 * @param prefix 前缀（默认为空）
 */
export function outputSuccess(message: string, prefix = ''): void {
  if (jsonMode) {
    console.log(JSON.stringify({
      status: 'success',
      message,
    }));
  } else {
    const prefixText = prefix ? `[${colorize(prefix, 'cyan')}] ` : '';
    console.log(`${colorize('✓', 'green')} ${prefixText}${message}`);
  }
}

/**
 * 输出错误信息
 * 
 * 终端格式：✗ [前缀] 消息（红色）
 * JSON 格式：{ "status": "error", "message": "...", "details": [...] }
 * 
 * @param message 错误消息
 * @param details 补充详情数组
 * @param prefix 前缀（默认为空）
 */
export function outputError(message: string, details: string[] = [], prefix = ''): void {
  if (jsonMode) {
    console.error(JSON.stringify({
      status: 'error',
      message,
      details,
    }));
  } else {
    const prefixText = prefix ? `[${colorize(prefix, 'cyan')}] ` : '';
    console.error(`${colorize('✗', 'red')} ${prefixText}${message}`);
    if (details.length > 0) {
      details.forEach(detail => {
        console.error(`  ${colorize('→', 'gray')} ${colorize(detail, 'gray')}`);
      });
    }
  }
}

/**
 * 以 Markdown 格式输出错误（方便 Agent 转述给用户）
 * 
 * 输出格式：
 * ```markdown
 * ## 错误
 * 主错误消息
 * 
 * 补充说明 1
 * 补充说明 2
 * ```
 * 
 * @param message 错误消息
 * @param details 补充详情数组
 * @param prefix 前缀（默认为空）
 */
export function outputErrorMarkdown(message: string, details: string[] = [], prefix = ''): void {
  const prefixText = prefix ? `_${prefix}_ ` : '';
  console.error(`## ${prefixText}错误`);
  console.error(message);
  if (details.length > 0) {
    console.error();
    details.forEach(detail => console.error(detail));
  }
  console.error();
}

/**
 * 输出状态信息
 * 
 * 终端格式：ℹ [前缀] 消息（蓝色）
 * JSON 格式：{ "status": "info", "message": "..." }
 * 
 * @param message 消息文本
 * @param prefix 前缀（默认为空）
 */
export function outputInfo(message: string, prefix = ''): void {
  if (jsonMode) {
    console.log(JSON.stringify({
      status: 'info',
      message,
    }));
  } else {
    const prefixText = prefix ? `[${colorize(prefix, 'cyan')}] ` : '';
    console.log(`${colorize('ℹ', 'blue')} ${prefixText}${message}`);
  }
}

/**
 * 输出动作信息（如"正在搜索..."）
 * 
 * 终端格式：→ [前缀] 消息（黄色）
 * JSON 格式：{ "action": "..." }
 * 
 * @param message 消息文本
 * @param prefix 前缀（默认为空）
 */
export function outputAction(message: string, prefix = ''): void {
  if (jsonMode) {
    console.log(JSON.stringify({
      action: message,
    }));
  } else {
    const prefixText = prefix ? `[${colorize(prefix, 'cyan')}] ` : '';
    console.log(`${colorize('→', 'yellow')} ${prefixText}${message}`);
  }
}

/**
 * 输出歌曲信息（播放前调用）
 * 
 * 终端格式（彩色）：
 * ```
 * → 正在播放
 *   🎵 标题（3:45）
 *   👤 艺人名
 * ```
 * 
 * JSON 格式：
 * ```json
 * { "action": "play", "song": { "title": "...", "artist": "..." } }
 * ```
 * 
 * @param info 歌曲信息（从 YTVideoInfo 转换）
 */
export function outputSongInfo(info: { title?: string; artist?: string }): void {
  const title = info.title || '未知标题';
  const artist = info.artist || '未知艺人';

  if (jsonMode) {
    console.log(JSON.stringify({
      action: 'play',
      song: { title, artist },
    }));
  } else {
    console.log(`${colorize('→', 'yellow')} ${colorize('正在播放', 'yellow')}`);
    console.log(`  ${colorize('🎵', 'cyan')} ${colorize(title, 'bold')}`);
    console.log(`  ${colorize('👤', 'cyan')} ${colorize(artist, 'white')}`);
  }
}

/**
 * 输出控制命令执行结果
 * 
 * 终端格式：✓ 标签（如"已暂停"）
 * JSON 格式：{ "action": "pause", "status": "success" }
 * 
 * @param action 控制命令（pause/resume/next 等）
 * @param status 执行状态（"success" 或 "error"）
 * @param label 用户友好的标签（如"已暂停"）
 * @param extraInfo 额外信息（如当前音量百分比）
 */
export function outputControlResult(
  action: ControlAction,
  status: 'success' | 'error',
  label?: string,
  extraInfo?: string
): void {
  const defaultLabel = LABELS[action] || action;
  const displayLabel = label || defaultLabel;

  if (jsonMode) {
    const output: any = {
      action,
      status,
      label: displayLabel,
    };
    if (extraInfo) output.extraInfo = extraInfo;
    console.log(JSON.stringify(output));
  } else {
    if (status === 'success') {
      console.log(`${colorize('✓', 'green')} ${displayLabel}`);
      if (extraInfo) {
        console.log(`  ${colorize(extraInfo, 'gray')}`);
      }
    } else {
      console.log(`${colorize('✗', 'red')} ${displayLabel}`);
    }
  }
}

/**
 * 输出播放列表（多个候选歌曲）
 * 
 * @param scored 评分后的候选列表
 * @param limit 显示的最大数量
 */
export function outputSongList(
  scored: { song: { title?: string; artist?: string; duration?: number }; score: number }[],
  limit = 5
): void {
  const top = scored.slice(0, limit);

  if (jsonMode) {
    console.log(JSON.stringify({
      candidates: top.map((item, i) => ({
        index: i + 1,
        title: item.song.title || '未知标题',
        artist: item.song.artist || '未知艺人',
        duration: formatDuration(item.song.duration),
        score: item.score,
      })),
    }));
  } else {
    console.log(`${colorize('ℹ', 'blue')} 找到 ${scored.length} 个候选（显示前 ${top.length} 个）：`);
    top.forEach((item, i) => {
      const title = item.song.title || '未知标题';
      const artist = item.song.artist || '未知艺人';
      const duration = formatDuration(item.song.duration);
      const score = colorize(`(+${Math.round(item.score)})`, 'gray');

      console.log(`  ${colorize(`${i + 1}.`, 'cyan')} ${colorize(title, 'bold')} ${colorize(`(${duration})`, 'gray')} ${score}`);
      console.log(`     ${colorize(artist, 'white')}`);
    });
  }
}
