/**
 * 跨平台子进程封装（替代 cross-spawn 依赖）
 *
 * 为什么需要这个封装：
 * - Node.js 原生 spawn 在 Windows 上对 .cmd/.bat/.ps1 文件需要特殊处理
 * - Windows 路径和 POSIX 路径的差异
 * - 异步 API 和错误处理统一
 *
 * 主要改进：
 * - 自动检测 Windows 上需要 shell 模式的命令
 * - 统一的 Promise API
 * - 支持 stdout/stderr 捕获
 * - 支持超时控制
 * - 详细的错误信息
 */

import { spawn as nodeSpawn } from 'node:child_process'
import { platform } from 'node:os'
import type { SpawnOptions } from 'node:child_process'

/**
 * 子进程执行选项
 */
export interface SpawnExecOptions {
  /** 命令行参数数组 */
  args?: string[]
  /** 工作目录（不传使用当前目录） */
  cwd?: string
  /** 环境变量（会与 process.env 合并） */
  env?: Record<string, string | undefined>
  /** 是否捕获 stdout/stderr（默认 true） */
  capture?: boolean
  /** 超时毫秒数（不传表示无限等待） */
  timeoutMs?: number
  /** 是否打印输出到父进程（默认 true，与 capture 互斥） */
  inherit?: boolean
  /** stdin 数据（会作为字符串写入子进程 stdin） */
  stdin?: string
}

/**
 * 子进程执行结果
 */
export interface SpawnResult {
  /** 命令成功执行（exitCode === 0） */
  success: boolean
  /** 进程退出码（0 表示成功，null 表示被信号杀死） */
  exitCode: number | null
  /** 接收到的标准输出（trim 后） */
  stdout: string
  /** 接收到的错误输出（trim 后） */
  stderr: string
  /** 是否由超时终止 */
  timedOut: boolean
  /** 信号名（如果被信号杀死，否则 undefined） */
  signal?: NodeJS.Signals
}

/**
 * 在 Windows 上是否需要 shell 模式
 *
 * Windows 下的 .cmd、.bat、.ps1 文件不能直接被 spawn 调用，
 * 必须通过 shell（cmd.exe）才能执行。
 *
 * @param cmd - 命令字符串
 * @returns 是否需要 shell:true
 */
function needsShell(cmd: string): boolean {
  if (platform() !== 'win32') return false
  // Windows 上这些扩展名需要 shell 模式
  return /\.(cmd|bat|ps1|com)$/i.test(cmd)
}

/**
 * 执行命令行命令（Promise API）
 *
 * 默认行为：
 * - 捕获 stdout/stderr 到字符串
 * - 不打印到父进程（capture 模式）
 * - 退出码非 0 不抛错，但 success=false
 *
 * @param cmd - 命令路径或名称
 * @param options - 执行选项
 * @returns 执行结果
 *
 * @example
 *   const result = await spawnExec('magick', {
 *     args: ['input.svg', 'output.png'],
 *     timeoutMs: 30000,
 *   })
 *   if (!result.success) {
 *     console.error('渲染失败:', result.stderr)
 *   }
 */
export async function spawnExec(
  cmd: string,
  options: SpawnExecOptions = {}
): Promise<SpawnResult> {
  const {
    args = [],
    cwd,
    env,
    capture = true,
    inherit = false,
    timeoutMs,
    stdin,
  } = options

  // 决定 stdio 配置
  const stdio: SpawnOptions['stdio'] = inherit && !capture
    ? 'inherit'
    : capture
    ? ['pipe', 'pipe', 'pipe']
    : ['pipe', 'inherit', 'inherit']

  return new Promise<SpawnResult>((resolve) => {
    // 启动子进程
    const child = nodeSpawn(cmd, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio,
      shell: needsShell(cmd),
      // Windows 上隐藏控制台窗口
      windowsHide: true,
    })

    // stdout/stderr 收集缓冲
    let stdout = ''
    let stderr = ''
    let timedOut = false

    if (capture && child.stdout) {
      child.stdout.on('data', (data) => {
        stdout += data.toString()
      })
    }
    if (capture && child.stderr) {
      child.stderr.on('data', (data) => {
        stderr += data.toString()
      })
    }

    // 写入 stdin（如果有）
    if (stdin !== undefined && child.stdin) {
      child.stdin.write(stdin)
      child.stdin.end()
    }

    // 超时控制
    let timeoutHandle: NodeJS.Timeout | undefined
    if (timeoutMs !== undefined) {
      timeoutHandle = setTimeout(() => {
        timedOut = true
        child.kill('SIGTERM')
        // 兜底：如果 SIGTERM 没生效，3 秒后用 SIGKILL
        setTimeout(() => {
          if (!child.killed) child.kill('SIGKILL')
        }, 3000)
      }, timeoutMs)
    }

    // 错误事件（如 ENOENT 找不到命令）
    child.on('error', (err) => {
      if (timeoutHandle) clearTimeout(timeoutHandle)
      resolve({
        success: false,
        exitCode: null,
        stdout: stdout.trim(),
        stderr: (stderr + '\n' + err.message).trim(),
        timedOut: false,
      })
    })

    // 退出事件（正常结束）
    child.on('close', (code, signal) => {
      if (timeoutHandle) clearTimeout(timeoutHandle)
      resolve({
        success: code === 0 && !timedOut,
        exitCode: code,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        timedOut,
        signal: signal ?? undefined,
      })
    })
  })
}

/**
 * 执行命令并在失败时抛出错误（严格模式）
 *
 * 与 spawnExec 区别：
 * - 失败时直接抛异常（包含 stderr）
 * - 适合在脚本中串联使用
 *
 * @throws Error 包含 stderr 信息和退出码
 */
export async function spawnExecStrict(
  cmd: string,
  options: SpawnExecOptions = {}
): Promise<SpawnResult> {
  const result = await spawnExec(cmd, options)
  if (!result.success) {
    const errMsg = [
      `命令执行失败: ${cmd} ${options.args?.join(' ') ?? ''}`,
      result.stderr ? `stderr: ${result.stderr}` : '',
      result.timedOut ? `超时: ${options.timeoutMs}ms` : '',
      result.signal ? `信号: ${result.signal}` : '',
      `退出码: ${result.exitCode}`,
    ]
      .filter(Boolean)
      .join('\n')
    const error = new Error(errMsg)
    ;(error as any).result = result
    throw error
  }
  return result
}
