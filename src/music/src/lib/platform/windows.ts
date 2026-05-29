import { exec } from '../utils.js';
import type { PlatformStrategy } from './types.js';

/**
 * Windows Git Bash 策略
 * 
 * 使用 tasklist/taskkill 管理进程，命名管道 IPC，.exe 后缀
 */
export class WindowsStrategy implements PlatformStrategy {
  readonly name = 'windows';
  readonly exeSuffix = '.exe';
  readonly installHint = 'winget install yt-dlp mpv';

  async checkProcess(name: string): Promise<boolean> {
    const result = await exec('tasklist', ['/FI', `IMAGENAME eq ${name}.exe`], { timeout: 3_000, noShell: true });
    return new RegExp(`${name}\\.exe`, 'i').test(result.stdout);
  }

  async killProcess(name: string): Promise<void> {
    await exec('taskkill', ['/F', '/IM', `${name}.exe`], { timeout: 5_000, noShell: true });
  }

  getIpcPath(name: string): string {
    return `\\\\.\\pipe\\${name}`;
  }

  getTmpPath(file: string): string {
    // Git Bash 中 /tmp 会自动映射，但 Node.js 不会
    // 保持 /tmp 前缀，依赖 Git Bash 的映射
    return `/tmp/${file}`;
  }

  getMiseInstallsDir(): string {
    return process.env.MISE_DATA_DIR
      ? `${process.env.MISE_DATA_DIR}/installs`
      : `${process.env.HOME || ''}/.mise/data/installs`;
  }

  getLocatorCommand(): [string, string[]] {
    return ['where.exe', []];
  }
}
