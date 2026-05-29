import type { PlatformStrategy } from './types.js';
import { WindowsStrategy } from './windows.js';
import { LinuxStrategy } from './linux.js';
import { MacStrategy } from './macos.js';

export type { PlatformStrategy } from './types.js';

/**
 * 根据当前平台返回对应的策略实例
 * 
 * 不做 PowerShell 显式检测（PSModulePath 会被继承导致误判），
 * 如果在 PowerShell 中运行，bash 命令自然报错。
 */
export function createPlatformStrategy(): PlatformStrategy {
  switch (process.platform) {
    case 'win32':
      return new WindowsStrategy();
    case 'linux':
      return new LinuxStrategy();
    case 'darwin':
      return new MacStrategy();
    default:
      return new LinuxStrategy();
  }
}

// 全局单例
let _platform: PlatformStrategy | null = null;

/** 获取当前平台策略（单例） */
export function getPlatform(): PlatformStrategy {
  if (!_platform) {
    _platform = createPlatformStrategy();
  }
  return _platform;
}
