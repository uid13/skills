import spawn from 'cross-spawn'
import * as net from 'node:net'

// 平台配置（集中管理，使用 Windows 原生命令，避免 PowerShell 对象输出格式问题）
const PLATFORM_CONFIG = {
  win32: {
    ipcPath: '\\\\.\\pipe\\mpv-ipc',
    // 用通配符 mpv* 同时匹配 mpv.exe 和 mpv.com
    checkProcess: { cmd: 'tasklist', args: ['/FI', 'IMAGENAME eq mpv*', '/NH'] },
    killProcess: { cmd: 'taskkill', args: ['/F', '/FI', 'IMAGENAME eq mpv*'] },
    isMatch: (output: string) => /mpv/i.test(output),
  },
  default: {
    ipcPath: '/tmp/mpv-ipc',
    checkProcess: { cmd: 'pgrep', args: ['mpv'] },
    killProcess: { cmd: 'pkill', args: ['mpv'] },
    isMatch: () => true, // pgrep 返回 0 即匹配
  },
} as const

const config = PLATFORM_CONFIG[process.platform as keyof typeof PLATFORM_CONFIG]
  || PLATFORM_CONFIG.default

// IPC 路径
const IPC_PATH = config.ipcPath

// 控制命令映射
const COMMANDS: Record<string, (string | number | boolean)[]> = {
  pause: ['set_property', 'pause', true],
  resume: ['set_property', 'pause', false],
  toggle: ['cycle', 'pause'],
  next: ['playlist-next', 'weak'],
  prev: ['playlist-prev', 'weak'],
  'volume-up': ['add', 'volume', 10],
  'volume-down': ['add', 'volume', -10],
  mute: ['cycle', 'mute'],
  loop: ['set_property', 'loop-file', 'inf'],
  'loop-off': ['set_property', 'loop-file', 'no'],
  stop: ['stop'],
}

// 检查 mpv 是否运行
function isRunning(): boolean {
  const result = spawn.sync(config.checkProcess.cmd, config.checkProcess.args, { encoding: 'utf8' })
  return result.status === 0 && config.isMatch(result.stdout)
}

// 杀掉 mpv 进程
function killMpv(): void {
  spawn.sync(config.killProcess.cmd, config.killProcess.args)
}

// IPC 发送命令
async function sendIpc(command: (string | number | boolean)[]): Promise<any> {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    const timer = setTimeout(() => { socket.destroy(); resolve({ error: 'timeout' }) }, 5000)
    socket.connect(IPC_PATH)
    socket.write(JSON.stringify({ command }) + '\n')
    socket.on('data', (data) => {
      clearTimeout(timer)
      try { resolve(JSON.parse(data.toString().split('\n')[0])) }
      catch { resolve({ error: 'parse failed' }) }
      socket.destroy()
    })
    socket.on('error', () => { clearTimeout(timer); resolve({ error: 'connection failed' }) })
  })
}

export { IPC_PATH, COMMANDS, isRunning, killMpv, sendIpc }
