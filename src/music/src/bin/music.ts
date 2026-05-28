#!/usr/bin/env node
/**
 * music 技能主入口
 * 
 * 使用 commander 分发子命令：
 * - play <query>       播放歌曲（默认命令）
 * - play --artist <name> 播放艺人歌曲
 * - pause              暂停
 * - resume             恢复
 * - toggle-pause       切换暂停
 * - next               下一首
 * - prev               上一首
 * - volume-up          音量 +10
 * - volume-down        音量 -10
 * - mute               静音切换
 * - loop               单曲循环
 * - loop-off           关闭循环
 * - stop               停止
 * - status             播放状态
 * 
 * 全局选项：
 * - --json             JSON 输出模式（供 Agent 解析）
 * - --verbose          显示详细日志
 * - --help             显示帮助
 */

import { Command } from 'commander';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, sep } from 'node:path';
import { setJsonMode, getJsonMode, outputSuccess, outputError, outputAction, outputInfo, 
         outputSongInfo, outputSongList, outputControlResult } from '../lib/output.js';
import { checkPlaybackDependencies, exitWithError, IS_WINDOWS } from '../lib/utils.js';
import { searchYouTube, getAudioStreamUrl } from '../lib/ytdl.js';
import { scoreAndRank, pickBestSong, isReliableMatch } from '../lib/scoring.js';
import { startMpv, mpvIsRunning, sendIpc, verifyPlayback, getPlaybackStatus, 
         waitForMpvToStop } from '../lib/mpv.js';

/**
 * 规范化文件路径（跨平台 temp 目录映射）
 * 
 * Git Bash 中 `/tmp` 会自动映射到系统 temp 目录，
 * 但 PowerShell / cmd + Node.js 不会自动映射，
 * 需要手动将 `/tmp` 替换为 os.tmpdir()。
 * 
 * @param filePath 原始路径
 * @returns 规范化后的绝对路径
 */
function normalizeOutfile(filePath: string): string {
  if (IS_WINDOWS) {
    // Windows: /tmp/xxx → C:\Users\xxx\AppData\Local\Temp\xxx
    if (filePath.startsWith('/tmp/') || filePath.startsWith('/tmp\\')) {
      return resolve(tmpdir(), filePath.slice(5));
    }
    if (filePath === '/tmp') {
      return tmpdir();
    }
  }
  return filePath;
}

/**
 * 默认超时时间（毫秒）
 */
const DEFAULT_TIMEOUT = 30_000;

/**
 * play 命令：播放歌曲
 * 
 * 流程：
 * 1. 检查 yt-dlp、mpv 依赖
 * 2. 搜索 YouTube（使用 query）
 * 3. 评分 + 排序
 * 4. 选择最佳候选
 * 5. 启动 mpv 播放
 * 6. 立即返回（如果指定 --outfile，后台写入歌曲信息）
 * 7. Agent 稍后轮询 outfile 获取歌曲信息
 */
async function playCommand(query: string, options: { artist?: boolean; count?: number; json?: boolean; timeout?: number; outfile?: string }): Promise<void> {
  if (options.json) setJsonMode(true);

  const timeout = options.timeout || DEFAULT_TIMEOUT;
  const count = options.count || 10;

  try {
    // 1. 检查依赖
    outputAction('检查 yt-dlp 和 mpv 依赖...', '依赖检查');
    await checkPlaybackDependencies();
    outputSuccess('依赖检查通过', '依赖检查');

    // 2. 搜索 YouTube
    outputAction(`搜索 "${query}"...`, '搜索');
    const results = await searchYouTube(query, count);

    if (results.length === 0) {
      outputError(`未找到匹配的歌曲`, [], '搜索');
      process.exit(1);
    }

    outputSuccess(`找到 ${results.length} 个候选`, '搜索');

    // 3. 评分 + 排序
    outputAction('评分候选歌曲...', '评分');
    const scored = scoreAndRank(query, results);

    if (scored.length === 0) {
      outputError('无法找到匹配的歌曲（评分过低）', ['请尝试更具体的搜索词'], '评分');
      process.exit(1);
    }

    // 4. 选择最佳候选
    const bestPick = pickBestSong(scored);
    if (!bestPick) {
      outputError('无法找到匹配的歌曲', [], '评分');
      process.exit(1);
    }
    const best = bestPick.song;

    // 5. 提取直链（避免依赖 mpv 的 ytdl hook）
    outputAction('提取音频流 URL...', '播放');
    const candidateUrl = best.id
      ? `https://www.youtube.com/watch?v=${best.id}`
      : (best.webpage_url || best.url);
    if (!candidateUrl) {
      outputError('无法从搜索结果中获取视频标识', ['请尝试更具体的搜索词'], '播放');
      process.exit(1);
    }
    const directUrl = await getAudioStreamUrl(candidateUrl);
    const playbackUrl = directUrl || candidateUrl;
    if (!directUrl) {
      outputInfo('音频 URL 提取失败，使用 YouTube URL 播放（需要 mpv 支持 yt-dl hook）', '播放');
    }

    // 6. 启动 mpv 播放
    outputAction('正在启动 mpv...', '播放');
    
    // 检查是否已有 mpv 运行
    if (await mpvIsRunning()) {
      outputAction('停止当前播放...', '播放');
      await sendIpc({ command: ['stop'] });
      await waitForMpvToStop();
    }

    // 7. 如果指定了 outfile，立即写入 started 状态并启动播放
    if (options.outfile) {
      const normalizedOutfile = normalizeOutfile(options.outfile);
      const startedInfo = {
        status: 'started',
        title: best.title || query,
        artist: best.artist || best.uploader || '未知艺人',
        duration: best.duration,
        timestamp: new Date().toISOString()
      };
      writeFileSync(normalizedOutfile, JSON.stringify(startedInfo, null, 2));
      outputSuccess('播放已启动（started），歌曲信息将稍后更新', '播放');

      // 启动 mpv
      startMpv([playbackUrl]);

      // 启动 detached 子进程后台验证并更新状态
      const verifyScript = `
        const net = require('node:net');
        const fs = require('node:fs');
        
        const IPC_PATH = process.platform === 'win32' 
          ? '\\\\\\\\.\\\\pipe\\\\music-mpv-ipc' 
          : '/tmp/music-mpv-ipc';
        const OUTFILE = ${JSON.stringify(normalizedOutfile)};
        const SONG_INFO = ${JSON.stringify(startedInfo)};
        
        async function sendIpc(cmd) {
          return new Promise((resolve) => {
            const socket = net.createConnection(IPC_PATH);
            const chunks = [];
            let settled = false;
            
            socket.setTimeout(3000);
            socket.on('connect', () => {
              socket.write(JSON.stringify(cmd) + '\\n');
            });
            socket.on('data', (chunk) => {
              chunks.push(chunk);
              const data = Buffer.concat(chunks).toString('utf8').trim();
              const firstLine = data.split(/\\r?\\n/).find(Boolean);
              if (!firstLine) return;
              try {
                const response = JSON.parse(firstLine);
                finish(response.error === 'success', response, response.error);
              } catch (error) {
                finish(false, null, 'Invalid mpv response: ' + firstLine);
              }
            });
            socket.on('timeout', () => finish(false, null, 'IPC timeout'));
            socket.on('error', (error) => finish(false, null, error.message));
            socket.on('end', () => {
              if (!settled) {
                const data = Buffer.concat(chunks).toString('utf8').trim();
                finish(Boolean(data), null, data ? null : 'No IPC response');
              }
            });
            
            function finish(ok, response, error) {
              if (settled) return;
              settled = true;
              socket.destroy();
              resolve({ ok, response, error });
            }
          });
        }
        
        async function verify() {
          const deadline = Date.now() + 15000;
          while (Date.now() < deadline) {
            const res = await sendIpc({ command: ['get_property', 'time-pos'] });
            if (res.ok) return true;
            await new Promise(r => setTimeout(r, 750));
          }
          return false;
        }
        
        (async () => {
          const ok = await verify();
          const updatedInfo = {
            ...SONG_INFO,
            status: ok ? 'success' : 'failed',
            timestamp: new Date().toISOString()
          };
          try {
            fs.writeFileSync(OUTFILE, JSON.stringify(updatedInfo, null, 2));
          } catch (err) {
            // 写文件失败也忽略
          }
        })();
      `;
      
      // 启动独立子进程（detached: true 让它在父进程退出后继续运行）
      const { spawn } = await import('node:child_process');
      const child = spawn(process.execPath, ['-e', verifyScript], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      });
      child.unref();

      // 主进程立即返回
      process.exit(0);
    }

    // 8. 如果没有 outfile，同步启动并等待验证（旧行为）
    startMpv([playbackUrl]);
    outputAction('等待播放...', '播放');
    const verified = await verifyPlayback(timeout);

    if (!verified) {
      outputError('播放失败（mpv 启动但无声音）', [], '播放');
      process.exit(1);
    }

    // 9. 输出"正在播放"信息
    outputSongInfo({
      title: best.title || query,
      artist: best.artist || best.uploader || '未知艺人',
      duration: best.duration,
    });

    if (!isReliableMatch(best)) {
      outputInfo('当前匹配度较低，可能不是最相关的歌曲', '提示');
    }

    process.exit(0);
  } catch (err: any) {
    outputError(err.message || '未知错误', [], '错误');
    process.exit(1);
  }
}

/**
 * 控制命令处理函数
 * 
 * 流程：
 * 1. 检查 mpv 是否正在运行
 * 2. 通过 IPC 发送控制命令
 * 3. 输出执行结果（成功/失败）
 */
async function controlCommand(action: string, options: { json?: boolean }): Promise<void> {
  if (options.json) setJsonMode(true);

  try {
    // 检查 mpv 运行状态
    const running = await mpvIsRunning();
    if (!running) {
      outputError('mpv 未在运行', ['请先启动播放'], '状态检查');
      process.exit(1);
    }

    // 发送控制命令
    const result = await sendIpc({ command: [action.toLowerCase()] });

    if (result.error) {
      outputError(`IPC 命令失败: ${result.error}`, [], '控制');
      process.exit(1);
    }

    outputControlResult(action as any, 'success');
    process.exit(0);
  } catch (err: any) {
    outputError(err.message || '未知错误', [], '错误');
    process.exit(1);
  }
}

/**
 * status 命令：查询播放状态
 * 
 * 流程：
 * 1. 检查 mpv 是否正在运行
 * 2. 通过 IPC 获取状态（pause、time-pos、duration）
 * 3. 输出状态信息
 */
async function statusCommand(options: { json?: boolean }): Promise<void> {
  if (options.json) setJsonMode(true);

  try {
    const running = await mpvIsRunning();
    if (!running) {
      outputError('mpv 未在运行', ['请先启动播放'], '状态检查');
      process.exit(1);
    }

    // 获取播放状态（'playing' 或 'paused'）
    const state = await getPlaybackStatus();
    
    if (getJsonMode()) {
      console.log(JSON.stringify({
        status: 'ok',
        state: state || 'unknown',
      }, null, 2));
    } else {
      const displayState = state === 'playing' ? '播放中' : (state === 'paused' ? '已暂停' : '未知');
      outputSuccess(`播放状态: ${displayState}`, '状态');
    }

    process.exit(0);
  } catch (err: any) {
    outputError(err.message || '未知错误', [], '错误');
    process.exit(1);
  }
}

// ============================================================
// CLI 定义（使用 commander）
// ============================================================

const program = new Command();

program
  .name('music')
  .description('播放、暂停、控制在线音乐')
  .version('1.0.0');

// play 命令（默认命令）
program
  .command('play [query..]', { isDefault: true })
  .description('播放歌曲（默认命令）')
  .option('--artist', '艺人模式：播放指定艺人的歌曲', false)
  .option('--count <n>', '艺人模式下的歌曲数量', parseInt, 10)
  .option('-j, --json', 'JSON 输出模式（供 Agent 解析）', false)
  .option('--timeout <ms>', '超时时间（毫秒）', parseInt, DEFAULT_TIMEOUT)
  .option('--outfile <path>', '将歌曲信息写入文件（异步模式，不阻塞）')
  .action((query: string[] | string | undefined, options: { artist?: boolean; count?: number; json?: boolean; timeout?: number; outfile?: string }) => {
    // commander 在 isDefault:true + 变长参数 场景下，可能传入 string 或 array，统一处理
    const queryArr = Array.isArray(query) ? query : (query ? [String(query)] : []);
    const queryStr = queryArr.length > 0 ? queryArr.join(' ') : '';
    if (!queryStr) {
      outputError('请提供搜索关键词', ['用法: music play <歌曲名>'], '错误');
      process.exit(1);
    }
    playCommand(queryStr, options);
  });

// 控制命令（直接作为顶级命令）
const controlActions = [
  'pause', 'resume', 'toggle-pause', 'next', 'prev',
  'volume-up', 'volume-down', 'mute', 'loop', 'loop-off', 'stop'
];

controlActions.forEach(action => {
  program
    .command(action)
    .description(`执行 ${action} 控制命令`)
    .option('-j, --json', 'JSON 输出模式', false)
    .action((options: { json?: boolean }) => {
      controlCommand(action, options);
    });
});

// status 命令
program
  .command('status')
  .description('查询播放状态')
  .option('-j, --json', 'JSON 输出模式', false)
  .action((options: { json?: boolean }) => {
    statusCommand(options);
  });

// 兼容旧版 "control" 子命令
program
  .command('control [action]')
  .description('执行控制命令（兼容旧版）')
  .option('-j, --json', 'JSON 输出模式', false)
  .action((action: string | undefined, options: { json?: boolean }) => {
    if (!action) {
      outputError('请指定控制命令', [`可用命令: ${controlActions.join(', ')}`], '错误');
      process.exit(1);
    }
    if (!controlActions.includes(action)) {
      outputError(`未知的控制命令: ${action}`, [`可用命令: ${controlActions.join(', ')}`], '错误');
      process.exit(1);
    }
    controlCommand(action, options);
  });

// 解析参数
program.parse();
