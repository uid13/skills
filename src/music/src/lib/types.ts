/**
 * music 技能类型定义
 * 
 * 描述：
 * - YouTube 视频元数据结构
 * - mpv IPC 命令和响应类型
 * - 播放控制器命令枚举
 * - 歌曲评分相关类型
 */

// ============================================================
// YouTube 视频元数据
// ============================================================

/**
 * YouTube 视频基础信息（从 yt-dlp flat-playlist 获取）
 */
export interface YTVideoFlat {
  id?: string;
  title?: string;
  webpage_url?: string;
  original_url?: string;
  url?: string;
}

/**
 * YouTube 视频完整元数据（从 yt-dlp dump-json 获取）
 */
export interface YTVideoFull {
  id?: string;
  title?: string;
  artist?: string;
  uploader?: string;
  channel?: string;
  channel_is_verified?: boolean;
  uploader_is_verified?: boolean;
  duration?: number;           // 秒数
  duration_string?: string;    // "3:45" 格式
  upload_date?: string;        // "20230101" 格式
  categories?: string[];       // ["Music", "Entertainment"]
  url?: string;                // 实际音频流 URL
  webpage_url?: string;
  original_url?: string;
}

/**
 * YouTube 视频信息（通用类型，可能是 flat-playlist 或 dump-json 的结果）
 */
export type YTVideoInfo = YTVideoFlat & YTVideoFull;

// ============================================================
// mpv IPC 控制
// ============================================================

/**
 * mpv IPC 命令结构（发送给 mpv 的 JSON）
 */
export interface MpvCommandRequest {
  command: (string | number | boolean)[];
}

/**
 * mpv IPC 响应结构（从 mpv 接收的 JSON）
 */
export interface MpvCommandResponse {
  error?: string;              // "success" 或其他错误信息
  data?: unknown;              // 某些命令（如 get_property）会返回数据
}

/**
 * mpv IPC 发送结果（封装 ok/error 状态）
 */
export interface MpvSendResult {
  ok: boolean;
  response?: MpvCommandResponse;
  error?: string;
}

/**
 * 播放控制命令枚举
 */
export type ControlAction =
  | 'pause'
  | 'resume'
  | 'toggle-pause'
  | 'next'
  | 'prev'
  | 'volume-up'
  | 'volume-down'
  | 'mute'
  | 'loop'
  | 'loop-off'
  | 'stop'
  | 'status';

// ============================================================
// 歌曲评分
// ============================================================

/**
 * 歌曲评分结果（用于排序和筛选）
 */
export interface ScoredSong {
  song: YTVideoFull | YTVideoFlat;
  score: number;
}
