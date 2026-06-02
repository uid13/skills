#!/usr/bin/env node
import { Command } from 'commander'
import { isRunning, killMpv, sendIpc, COMMANDS } from '../lib/mpv.js'

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

// status 命令
program.command('status')
  .description('查询播放状态')
  .action(async () => {
    if (!isRunning()) {
      console.log(JSON.stringify({ status: 'stopped' }))
      process.exit(0)
    }
    const result = await sendIpc(['get_property', 'pause'])
    const state = result.data === true ? 'paused' : 'playing'
    console.log(JSON.stringify({ status: 'ok', state }))
  })

program.parse()
