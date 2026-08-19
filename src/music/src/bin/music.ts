#!/usr/bin/env node
import { Command } from 'commander'
import { isRunning, killMpv, sendIpc, getStatusInfo, COMMANDS } from '../lib/mpv.js'

const program = new Command()
  .name('music')
  .description('mpv 播放控制（IPC）')

// 控制命令
for (const [name, cmd] of Object.entries(COMMANDS)) {
  program.command(name)
    .description(`发送 ${name} 命令`)
    .action(async () => {
      if (!isRunning()) {
        console.log(JSON.stringify({ error: 'mpv not running' }))
        process.exit(1)
      }
      if (name === 'stop') {
        killMpv()
        console.log(JSON.stringify({ status: 'success', action: 'stop' }))
        process.exit(0)
      }
      const result = await sendIpc(cmd)
      console.log(JSON.stringify({ status: result.error === 'success' ? 'success' : 'error', action: name, ...result }))
      process.exit(result.error === 'success' ? 0 : 1)
    })
}

// status 命令：输出结构化 JSON，单一 state 字段（playing/paused/stopped/error），供多音源 fallback 判定
program.command('status')
  .description('查询播放状态')
  .action(async () => {
    // mpv 未运行 → stopped
    if (!isRunning()) {
      console.log(JSON.stringify({ state: 'stopped' }))
      process.exit(0)
    }
    // 批量查询 mpv 属性聚合返回；IPC 异常 → error
    const info = await getStatusInfo()
    if (info.error) {
      console.log(JSON.stringify({ state: 'error', code: info.error, message: 'mpv IPC 查询失败' }))
      process.exit(0)
    }
    // pause 属性为 true → paused，否则 playing；附加曲目与播放进度信息
    const state = info.pause === true ? 'paused' : 'playing'
    console.log(JSON.stringify({
      state,
      pid: info.pid,
      title: info['media-title'],
      duration: info.duration,
      position: info['time-pos'],
      volume: info.volume,
    }))
    process.exit(0)
  })

program.parse()
