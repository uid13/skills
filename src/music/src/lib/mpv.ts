/**
 * mpv 播放器控制模块
 * 
 * 包含：
 * - 进程管理（启动、停止、状态检查）
 * - IPC 通信（通过 Unix socket 或 Windows 命名管道）
 * - 命令映射（控制命令 → mpv JSON-RPC）
 * - 播放验证（检查 time-pos 确认实际播放）
 * 
 * 优化点（相比原 JS 版本）：
 * 1. 类型安全（MpvCommandRequest、MpvCommandResponse 明确定义）
 * 2. IPC 超时机制（默认 5000ms，避免卡死）
 * 3. 进程管理增强（启动等待、停止等待、PID 检查）
 * 4. 错误处理统一（所有 IPC 错误返回 MpvSendResult 结构）
 */

import { spawn, type ChildProcess } from 'node:child_process';
import * as net from 'node:net';
import type {
  MpvCommandRequest,
  MpvCommandResponse,
  MpvSendResult,
  ControlAction,
  ControlCommandMap,
} from './types.js';
import { exec, sleep, getPlatform } from './utils.js';

// ============================================================
// IPC 通信配置
// ============================================================

const PIPE_NAME = 'music-mpv-ipc';
export const IPC_PATH = getPlatform().getIpcPath(PIPE_NAME);

// ============================================================
// 控制命令映射
// ============================================================

/**
 * 控制命令 → mpv JSON-RPC 命令映射表
 */
export const CONTROL_MAP: Record<ControlAction, ControlCommandMap> = {
  'pause': { command: ['set_property', 'pause', true] },
  'resume': { command: ['set_property', 'pause', false] },
  'toggle-pause': { command: ['cycle', 'pause'] },
  'next': { command: ['playlist-next', 'weak'] },
  'prev': { command: ['playlist-prev', 'weak'] },
  'volume-up': { command: ['add', 'volume', 10] },
  'volume-down': { command: ['add', 'volume', -10] },
  'mute': { command: ['cycle', 'mute'] },
  'loop': { command: ['set_property', 'loop', 'inf'] },
  'loop-off': { command: ['set_property', 'loop', 'no'] },
  'stop': { command: ['stop'] },
  'status': { command: ['get_property', 'pause'] },
};

/**
 * 控制命令对应的中文标签（用于输出展示）
 */
export const LABELS: Record<ControlAction, string> = {
  'pause': '已暂停',
  'resume': '已继续播放',
  'toggle-pause': '已切换播放/暂停',
  'next': '已跳转到下一首',
  'prev': '已跳转到上一首',
  'volume-up': '音量 +10',
  'volume-down': '音量 -10',
  'mute': '已切换静音',
  'loop': '已开启单曲循环',
  'loop-off': '已关闭循环',
  'stop': '已停止播放',
  'status': '当前状态',
};

// ============================================================
// 进程管理
// ============================================================

/**
 * 当前 mpv 进程（用于启动后引用）
 */
let mpvProcess: ChildProcess | null = null;

/**
 * 检查 mpv 进程是否正在运行
 */
export async function mpvIsRunning(): Promise<boolean> {
  return getPlatform().checkProcess('mpv');
}

/**
 * 停止所有 mpv 进程（避免多实例竞争 IPC 端口）
 */
export async function killMpv(): Promise<void> {
  await getPlatform().killProcess('mpv');
  mpvProcess = null;
}

/**
 * 启动 mpv 进程并等待其 IPC 服务就绪
 * 
 * 参数说明：
 * - --no-video：只播放音频
 * - --input-ipc-server=<path>：启用 IPC 通信
 * - --keep-open-pause=no：播放列表结束时自动停止进程
 * - --ytdl-format=bestaudio/best：优先选择最佳音质
 * - --ytdl：启用 yt-dlp hook（播放 YouTube URL）
 * 
 * @param args 附加参数（URL 或播放列表）
 * @returns mpv 进程对象
 */
export function startMpv(args: string[] = []): ChildProcess {
  const mpvArgs = [
    '--no-video',
    '--keep-open-pause=no',
    '--ytdl-format=bestaudio/best',
    '--ytdl',
    `--input-ipc-server=${IPC_PATH}`,
    ...args,
  ];

  mpvProcess = spawn('mpv', mpvArgs, {
    stdio: ['ignore', 'ignore', 'ignore'],
    detached: true, // 跨平台都使用 detached，让 mpv 在父进程退出后继续运行
    windowsHide: true,
  });

  // 进程错误处理
  mpvProcess.on('error', (err) => {
    console.error(`mpv 启动失败：${err.message}`);
    mpvProcess = null;
  });

  mpvProcess.on('exit', (code, signal) => {
    mpvProcess = null;
  });

  // unref 让父进程可以退出（跨平台）
  if (mpvProcess.unref) {
    mpvProcess.unref();
  }

  return mpvProcess;
}

/**
 * 等待 mpv 进程停止（轮询检查）
 * - 最多等待 10 轮，每轮间隔 100ms，共 ~1000ms
 * - 用于 stop 命令后确认进程已退出
 */
export async function waitForMpvToStop(): Promise<void> {
  for (let i = 0; i < 10; i++) {
    if (!(await mpvIsRunning())) return;
    await sleep(100);
  }
}

// ============================================================
// IPC 通信
// ============================================================

/**
 * 通过 IPC 向 mpv 发送命令并等待响应
 * 
 * 协议说明：
 * - 请求：JSON 字符串 + \n
 * - 响应：JSON 字符串 + \n（单行）
 * - 超时后关闭连接，返回 ok=false
 * 
 * @param request 命令请求（如 { command: ['get_property', 'pause'] }）
 * @param timeout 超时时间（默认 5000ms）
 * @returns 发送结果（ok、response、error）
 */
export async function sendIpc(
  request: MpvCommandRequest,
  timeout = 5_000
): Promise<MpvSendResult> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let responseBuffer = '';

    // 超时处理
    const timer = setTimeout(() => {
      socket.destroy();
      resolve({ ok: false, error: 'IPC 通信超时' });
    }, timeout);

    // 连接成功，发送命令
    socket.on('connect', () => {
      const data = JSON.stringify(request) + '\n';
      socket.write(data);
    });

    // 接收响应
    socket.on('data', (chunk) => {
      responseBuffer += chunk.toString();

      // 按行分割，解析 JSON-RPC 响应
      const lines = responseBuffer.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line) as MpvCommandResponse;
          clearTimeout(timer);
          socket.destroy();
          resolve({
            ok: parsed.error === 'success',
            response: parsed,
          });
          return;
        } catch (err) {
          // 解析失败，继续接收（可能是多行响应）
        }
      }
    });

    // 连接失败
    socket.on('error', (err) => {
      clearTimeout(timer);
      resolve({ ok: false, error: err.message });
    });

    // 开始连接
    socket.connect(IPC_PATH);
  });
}

/**
 * 获取 mpv 当前播放状态
 * - 调用 get_property pause
 * - 如果 IPC 不可用，返回 null
 * 
 * @returns 'playing' | 'paused' | null
 */
export async function getPlaybackStatus(): Promise<'playing' | 'paused' | null> {
  const result = await sendIpc({ command: ['get_property', 'pause'] });
  if (!result.ok || !result.response) return null;

  const isPaused = result.response.data === true;
  return isPaused ? 'paused' : 'playing';
}

/**
 * 验证 mpv 是否真正开始播放（检查 time-pos）
 * - 连续检查 10 次，每次间隔 500ms
 * - 只要有一次 time-pos > 0 即认为播放成功
 * 
 * 用途：
 * - 播放启动后调用，避免 "mpv 启动但没有声音" 的情况
 * 
 * @returns 是否播放成功
 */
export async function verifyPlayback(timeoutMs = 15_000): Promise<boolean> {
  const maxIterations = Math.ceil(timeoutMs / 500);
  for (let i = 0; i < maxIterations; i++) {
    await sleep(500);

    const result = await sendIpc({ command: ['get_property', 'time-pos'] });
    if (!result.ok || !result.response) continue;

    const pos = result.response.data;
    if (typeof pos === 'number' && pos > 0) {
      return true;
    }
  }
  return false;
}
