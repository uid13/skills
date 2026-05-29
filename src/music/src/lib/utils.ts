/**
 * music 技能工具函数库
 * 
 * 包含：
 * - 跨平台命令执行（统一处理编码、窗口隐藏、输出缓冲区）
 * - 依赖检查（yt-dlp、mpv 是否可用）
 * - 错误输出（Markdown 格式，方便 Agent 转述）
 * - 路径解析（多策略查找可执行文件）
 */

import { spawn, type SpawnOptions } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { getPlatform } from './platform/index.js';

// 重新导出平台策略相关（方便外部使用）
export { getPlatform } from './platform/index.js';
export type { PlatformStrategy } from './platform/types.js';

// ============================================================
// 命令执行
// ============================================================

export interface ExecResult {
  status: number | null;
  stdout: string;
  stderr: string;
  error?: Error;
}

export interface ExecOptions {
  timeout?: number;
  maxBuffer?: number;
  encoding?: BufferEncoding;
  windowsHide?: boolean;
  /** 不使用 shell 包装（直接调用可执行文件） */
  noShell?: boolean;
}

/**
 * 异步执行外部命令
 * 
 * Windows 下默认用 bash -c 包装（支持 mise 激活），
 * Linux/macOS 直接调用。noShell=true 时跳过包装。
 */
export async function exec(
  command: string,
  args: string[],
  options: ExecOptions = {}
): Promise<ExecResult> {
  const {
    timeout = 30_000,
    maxBuffer = 20 * 1024 * 1024,
    encoding = 'utf8',
    windowsHide = true,
    noShell = false,
  } = options;

  return new Promise((resolve) => {
    const spawnOptions: SpawnOptions = {
      encoding: encoding as any,
      windowsHide,
      stdio: ['ignore', 'pipe', 'pipe'],
    };

    let actualCommand = command;
    let actualArgs = args;

    // Windows 下用 bash 包装（Git Bash 支持 mise 激活）
    const platform = getPlatform();
    if (process.platform === 'win32' && !noShell) {
      const cmdString = [command, ...args.map(a => `"${a.replace(/"/g, '\\"')}"`)].join(' ');
      actualCommand = 'bash';
      actualArgs = ['-c', cmdString];
    }

    const child = spawn(actualCommand, actualArgs, spawnOptions);

    let stdout = '';
    let stderr = '';
    let killed = false;
    let timer: NodeJS.Timeout | null = null;

    child.stdout?.on('data', (chunk) => {
      if (typeof chunk === 'string') {
        stdout += chunk;
      } else {
        stdout += chunk.toString(encoding);
      }
      if (stdout.length + stderr.length > maxBuffer) {
        child.kill('SIGKILL');
        killed = true;
        resolve({ status: null, stdout, stderr, error: new Error(`Output exceeded maxBuffer (${maxBuffer} bytes)`) });
      }
    });

    child.stderr?.on('data', (chunk) => {
      if (typeof chunk === 'string') {
        stderr += chunk;
      } else {
        stderr += chunk.toString(encoding);
      }
    });

    if (timeout && timeout > 0) {
      timer = setTimeout(() => {
        child.kill('SIGKILL');
        killed = true;
        resolve({ status: null, stdout, stderr, error: new Error(`Command timed out after ${timeout}ms`) });
      }, timeout);
    }

    child.on('close', (code) => {
      if (timer) clearTimeout(timer);
      resolve({ status: code, stdout, stderr });
    });

    child.on('error', (err) => {
      if (timer) clearTimeout(timer);
      resolve({ status: null, stdout, stderr, error: err });
    });
  });
}

// ============================================================
// 命令可用性检查
// ============================================================

export async function commandVersionWorks(command: string): Promise<boolean> {
  const result = await exec(command, ['--version'], { timeout: 8_000, noShell: true });
  if (result.status !== 0) return false;
  const output = (result.stdout + result.stderr).trim();
  return output.length > 0;
}

/**
 * Windows 下遍历 PATH 中所有可能的可执行文件路径
 */
function windowsPathCandidates(command: string): string[] {
  const pathEnv = process.env.PATH || '';
  const pathExt = process.env.PATHEXT || '.COM;.EXE;.BAT;.CMD';
  const extensions = path.extname(command) ? [''] : pathExt.split(';').filter(Boolean);
  const candidates: string[] = [];

  for (const dir of pathEnv.split(path.delimiter).filter(Boolean)) {
    for (const ext of extensions) {
      candidates.push(path.join(dir, `${command}${ext.toLowerCase()}`));
      candidates.push(path.join(dir, `${command}${ext.toUpperCase()}`));
    }
  }
  return [...new Set(candidates)];
}

/**
 * 查找 mise 安装的真实可执行文件（绕过 shim）
 */
function findMiseRealExecutable(command: string): string {
  const platform = getPlatform();
  const installsDir = platform.getMiseInstallsDir();

  if (!fs.existsSync(installsDir)) return '';

  try {
    for (const entry of fs.readdirSync(installsDir)) {
      if (!entry.toLowerCase().includes(command.toLowerCase())) continue;
      const entryDir = path.join(installsDir, entry);
      if (!fs.statSync(entryDir).isDirectory()) continue;

      for (const ver of fs.readdirSync(entryDir)) {
        const verDir = path.join(entryDir, ver);
        if (!fs.statSync(verDir).isDirectory()) continue;

        const exeName = `${command}${platform.exeSuffix}`;
        const exePath = path.join(verDir, exeName);
        if (fs.existsSync(exePath)) return exePath;
      }
    }
  } catch {}

  return '';
}

/**
 * 使用 where.exe / command -v 查找命令路径
 */
export async function locatorCandidates(command: string): Promise<string[]> {
  const platform = getPlatform();
  const [locator, extraArgs] = platform.getLocatorCommand();
  const result = await exec(locator, [...extraArgs, command], { timeout: 5_000, noShell: true });
  if (result.status !== 0) return [];

  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

// ============================================================
// 进程管理缓存
// ============================================================

const resolveCache = new Map<string, string>();
const CACHE_FILE = path.join(os.tmpdir(), 'music_executable_cache.json');

function loadPersistentCache(): void {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) as Record<string, string>;
      for (const [k, v] of Object.entries(data)) resolveCache.set(k, v);
    }
  } catch {}
}

function savePersistentCache(): void {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(Object.fromEntries(resolveCache)), 'utf8');
  } catch {}
}

loadPersistentCache();

/**
 * 解析命令路径（多策略查找）
 * 
 * 查找顺序：
 * 1. 缓存快速验证
 * 2. mise 安装目录（绕过 shim）
 * 3. 直接执行 --version
 * 4. locator（where.exe / command -v）
 * 5. Windows PATH 遍历
 */
export async function resolveExecutable(command: string): Promise<string> {
  if (resolveCache.has(command)) {
    const cached = resolveCache.get(command)!;
    const result = await exec(cached, ['--version'], { timeout: 3_000, noShell: true });
    if (result.status === 0) return cached;
    resolveCache.delete(command);
  }

  let resolved = '';

  // 策略 1：mise 安装目录
  const misePath = findMiseRealExecutable(command);
  if (misePath && await commandVersionWorks(misePath)) {
    resolved = misePath;
  }

  // 策略 2：直接执行
  if (!resolved && await commandVersionWorks(command)) {
    resolved = command;
  }

  // 策略 3：locator
  if (!resolved) {
    for (const candidate of await locatorCandidates(command)) {
      if (!candidate || (path.isAbsolute(candidate) && !fs.existsSync(candidate))) continue;
      if (await commandVersionWorks(candidate)) { resolved = candidate; break; }
    }
  }

  // 策略 4：Windows PATH 遍历
  if (!resolved && process.platform === 'win32') {
    for (const candidate of windowsPathCandidates(command)) {
      if (!candidate || (path.isAbsolute(candidate) && !fs.existsSync(candidate))) continue;
      if (await commandVersionWorks(candidate)) { resolved = candidate; break; }
    }
  }

  if (resolved) {
    resolveCache.set(command, resolved);
    savePersistentCache();
  }

  return resolved;
}

// ============================================================
// 依赖检查
// ============================================================

export async function checkPlaybackDependencies(): Promise<void> {
  if (process.env.MUSIC_SKIP_DEPS === '1') return;

  const missing: string[] = [];
  if (!(await resolveExecutable('yt-dlp'))) missing.push('yt-dlp');
  if (!(await resolveExecutable('mpv'))) missing.push('mpv');

  if (missing.length > 0) {
    const platform = getPlatform();
    exitWithError(
      `缺失依赖：\`${missing.join('`、`')}\``,
      [
        '已尝试 PATH 查找和 `--version` 检查，但工具不可用。',
        '请安装缺失工具或添加到 PATH，然后重新运行命令。',
        '',
        '```bash',
        platform.installHint,
        '```',
      ]
    );
  }
}

// ============================================================
// 错误输出
// ============================================================

export function exitWithError(message: string, details: string[] = [], code = 1): never {
  const lines = ['## 错误', '', message];
  if (details.length > 0) lines.push('', ...details);
  console.error(lines.join('\n'));
  process.exit(code);
}

// ============================================================
// 工具函数
// ============================================================

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
