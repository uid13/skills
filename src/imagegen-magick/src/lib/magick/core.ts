/**
 * ImageMagick 统一模块 - 底层执行封装
 *
 * 封装 magick CLI 调用，提供跨平台的命令执行能力。
 * 所有上层模块（detection/render/dimensions）都通过此模块调用 magick。
 */

import { spawnExec } from '../spawn.js'

/** magick 可执行文件名 */
const MAGICK_CMD = 'magick'

/** magick 命令执行结果 */
export interface ExecResult {
  success: boolean
  stdout: string
  stderr: string
  exitCode: number | null
}

/**
 * 执行 magick 命令
 *
 * @param args - 命令行参数（不含 magick 本身）
 * @param timeoutMs - 超时时间（默认 30 秒）
 * @returns 执行结果
 */
export async function execMagick(
  args: string[],
  timeoutMs = 30000
): Promise<ExecResult> {
  const result = await spawnExec(MAGICK_CMD, {
    args,
    timeoutMs,
  })

  return {
    success: result.success,
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
  }
}

/**
 * 执行 magick 命令并返回 stdout（失败时抛错）
 */
export async function execMagickOrThrow(
  args: string[],
  timeoutMs = 30000
): Promise<string> {
  const result = await execMagick(args, timeoutMs)
  if (!result.success) {
    throw new Error(`magick ${args[0]} failed: ${result.stderr}`)
  }
  return result.stdout
}

export { MAGICK_CMD }
