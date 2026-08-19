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

// IPC 错误码枚举（sendIpc 返回 error 字段的固定取值，供 status 结构化输出）
const IPC_ERROR_CODES = {
  timeout: 'IPC_TIMEOUT',
  'connection failed': 'IPC_CONN_FAILED',
  'parse failed': 'PARSE_FAILED',
} as const

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
    const timer = setTimeout(() => { socket.destroy(); resolve({ error: IPC_ERROR_CODES.timeout }) }, 5000)
    socket.connect(IPC_PATH)
    socket.write(JSON.stringify({ command }) + '\n')
    socket.on('data', (data) => {
      clearTimeout(timer)
      try { resolve(JSON.parse(data.toString().split('\n')[0])) }
      catch { resolve({ error: IPC_ERROR_CODES['parse failed'] }) }
      socket.destroy()
    })
    socket.on('error', () => { clearTimeout(timer); resolve({ error: IPC_ERROR_CODES['connection failed'] }) })
  })
}

// 批量查询 mpv 属性（pause/media-title/duration/time-pos/volume/pid），聚合为一次返回
// 仅连接级错误（IPC_TIMEOUT/CONN_FAILED/PARSE_FAILED）返回 { error: 错误码 }；
// 属性级错误（如 property unavailable，播放初期属性未就绪）返回 undefined 值，不判定为异常
async function getStatusInfo(): Promise<Record<string, unknown>> {
  const props = ['pause', 'media-title', 'duration', 'time-pos', 'volume', 'pid']
  const results = await Promise.all(
    props.map(async (prop) => {
      const res = await sendIpc(['get_property', prop])
      return { prop, res }
    })
  )
  const failed = results.find((r) =>
    r.res.error === IPC_ERROR_CODES.timeout
    || r.res.error === IPC_ERROR_CODES['connection failed']
    || r.res.error === IPC_ERROR_CODES['parse failed']
  )
  if (failed) return { error: failed.res.error }
  return Object.fromEntries(results.map((r) => [r.prop, r.res.error === 'success' ? r.res.data : undefined]))
}

export { IPC_PATH, COMMANDS, isRunning, killMpv, sendIpc, getStatusInfo }
