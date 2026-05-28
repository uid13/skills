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
import { setJsonMode, outputSuccess, outputError, outputAction, 
         outputSongInfo, outputSongList, outputControlResult } from '../lib/output.js';
import { checkPlaybackDependencies, exitWithError } from '../lib/utils.js';
import { searchYouTube } from '../lib/ytdl.js';
import { scoreAndRank, pickBestSong, isReliableMatch } from '../lib/scoring.js';
import { startMpv, mpvIsRunning, sendIpc, verifyPlayback, getPlaybackStatus, 
         waitForMpvToStop } from '../lib/mpv.js';

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
 * 6. 等待播放验证（最多 10 秒）
 * 7. 输出"正在播放"信息
 */
async function playCommand(query: string, options: { artist?: boolean; count?: number; json?: boolean; timeout?: number }): Promise<void> {
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
    const best = pickBestSong(scored);
    if (!best) {
      outputError('无法找到匹配的歌曲', [], '评分');
      process.exit(1);
    }

    // 5. 启动 mpv 播放
    outputAction('正在启动 mpv...', '播放');
    
    // 检查是否已有 mpv 运行
    if (await mpvIsRunning()) {
      outputAction('停止当前播放...', '播放');
      await sendIpc({ command: ['stop'] });
      await waitForMpvToStop();
    }

    startMpv([best.url]);
    
    // 6. 等待播放验证（最多 10 秒）
    outputAction('等待播放...', '播放');
    const verified = await verifyPlayback(timeout);

    if (!verified) {
      outputError('播放失败（mpv 启动但无声音）', [], '播放');
      process.exit(1);
    }

    // 7. 输出"正在播放"信息
    outputSongInfo({
      title: best.title || query,
      artist: best.artist || best.uploader || '未知艺人',
      duration: best.duration,
    });

    // 非 best match 时（即 best 是 fallback），给出警告
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

    // 获取状态
    const status = await getPlaybackStatus();
    
    if (jsonMode) {
      console.log(JSON.stringify({
        status: 'ok',
        ...status,
      }));
    } else {
      outputSuccess(`播放状态: ${status.state === 'playing' ? '播放中' : '已暂停'}`, '状态');
      if (status.current && status.duration) {
        console.log(`  进度: ${status.current} / ${status.duration}`);
      }
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
  .action((query: string[] | undefined, options: { artist?: boolean; count?: number; json?: boolean; timeout?: number }) => {
    const queryStr = query && query.length > 0 ? query.join(' ') : '';
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
