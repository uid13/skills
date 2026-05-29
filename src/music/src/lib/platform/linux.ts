import { exec } from '../utils.js';
import type { PlatformStrategy } from './types.js';

/**
 * Linux 策略
 * 
 * 使用 pgrep/pkill 管理进程，Unix socket IPC，无后缀
 */
export class LinuxStrategy implements PlatformStrategy {
  readonly name = 'linux';
  readonly exeSuffix = '';
  readonly installHint = 'sudo apt install yt-dlp mpv';

  async checkProcess(name: string): Promise<boolean> {
    const result = await exec('pgrep', ['-x', name], { timeout: 3_000, noShell: true });
    return result.status === 0;
  }

  async killProcess(name: string): Promise<void> {
    await exec('pkill', ['-x', name], { timeout: 5_000, noShell: true });
  }

  getIpcPath(name: string): string {
    return `/tmp/${name}`;
  }

  getTmpPath(file: string): string {
    return `/tmp/${file}`;
  }

  getMiseInstallsDir(): string {
    return `${process.env.HOME || ''}/.mise/data/installs`;
  }

  getLocatorCommand(): [string, string[]] {
    return ['sh', ['-lc', 'command -v']];
  }
}
