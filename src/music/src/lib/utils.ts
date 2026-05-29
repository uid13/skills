/**
 * music 技能工具函数库
 * 
 * 包含：
 * - 跨平台命令执行（统一处理编码、窗口隐藏、输出缓冲区）
 * - 依赖检查（yt-dlp、mpv 是否可用）
 * - 错误输出（Markdown 格式，方便 Agent 转述）
 * - 路径解析（多策略查找可执行文件）
 * 
 * 优化点（相比原 JS 版本）：
 * 1. spawnSync → spawn + Promise（避免阻塞事件循环）
 * 2. 类型安全（SpawnOptions、ExecResult 明确定义）
 * 3. 进程管理缓存（resolveCache 使用 Map<string, string> 类型化）
 * 4. 错误处理统一（exitWithError 支持 Markdown 详情数组）
 */

import { spawn, type SpawnOptions } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { Platform, InstallHint } from './types.js';

// ============================================================
// 平台相关常量
// ============================================================

/**
 * 当前运行平台是否为 Windows
 */
export const IS_WINDOWS = process.platform === 'win32';

/**
 * 不同系统下的依赖安装命令
 */
export const INSTALL_COMMANDS: InstallHint = {
  win32: 'winget install yt-dlp yt-dlp mpv',
  darwin: 'brew install yt-dlp mpv',
  linux: 'sudo apt install yt-dlp mpv',
};

// ============================================================
// 命令执行
// ============================================================

/**
 * 命令执行结果（封装 stdout、stderr、status）
 */
export interface ExecResult {
  status: number | null;
  stdout: string;
  stderr: string;
  error?: Error;
}

/**
 * spawn 的扩展选项（增加 timeout、encoding 等便捷字段）
 */
export interface ExecOptions {
  timeout?: number;            // 超时毫秒数
  maxBuffer?: number;          // 输出缓冲区大小
  encoding?: BufferEncoding;   // 输出编码
  windowsHide?: boolean;       // Windows 下是否隐藏命令行窗口
  noShell?: boolean;           // Windows 下不包装 bash（直接调用可执行文件）
}

/**
 * 异步执行外部命令（统一处理编码、窗口隐藏和输出缓冲区大小）
 * 
 * 设计说明：
 * - 返回 Promise<ExecResult>，避免阻塞事件循环
 * - 默认 encoding: 'utf8'，windowsHide: true
 * - timeout 默认 30_000ms（30 秒），防止 yt-dlp 卡死
 * - maxBuffer 默认 20MB，防止超大输出导致内存溢出
 * 
 * @param command 命令路径（如 'yt-dlp'、'mpv'）
 * @param args 参数列表
 * @param options 扩展选项
 * @returns 执行结果（status、stdout、stderr）
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
    // noShell=true 时直接调用原始命令
    if (IS_WINDOWS && !noShell) {
      const cmdString = [command, ...args.map(a => `"${a.replace(/"/g, '\\"')}"`)].join(' ');
      actualCommand = 'bash';
      actualArgs = ['-c', cmdString];
    }

    const child = spawn(actualCommand, actualArgs, spawnOptions);

    let stdout = '';
    let stderr = '';
    let killed = false;
    let timer: NodeJS.Timeout | null = null;

    // 收集输出
    child.stdout?.on('data', (chunk) => {
      if (typeof chunk === 'string') {
        stdout += chunk;
      } else {
        stdout += chunk.toString(encoding);
      }

      // 检查是否超过 maxBuffer
      if (stdout.length + stderr.length > maxBuffer) {
        child.kill('SIGKILL');
        killed = true;
        resolve({
          status: null,
          stdout,
          stderr,
          error: new Error(`Output exceeded maxBuffer (${maxBuffer} bytes)`),
        });
      }
    });

    child.stderr?.on('data', (chunk) => {
      if (typeof chunk === 'string') {
        stderr += chunk;
      } else {
        stderr += chunk.toString(encoding);
      }
    });

    // 超时处理
    if (timeout && timeout > 0) {
      timer = setTimeout(() => {
        child.kill('SIGKILL');
        killed = true;
        resolve({
          status: null,
          stdout,
          stderr,
          error: new Error(`Command timed out after ${timeout}ms`),
        });
      }, timeout);
    }

    // 进程结束
    child.on('close', (code) => {
      if (timer) clearTimeout(timer);
      resolve({
        status: code,
        stdout,
        stderr,
        error: killed ? undefined : undefined,
      });
    });

    // 启动失败
    child.on('error', (err) => {
      if (timer) clearTimeout(timer);
      resolve({
        status: null,
        stdout,
        stderr,
        error: err,
      });
    });
  });
}

// ============================================================
// 命令可用性检查
// ============================================================

/**
 * 判断外部命令是否能正常执行版本查询
 * - 尝试执行 `command --version`，timeout 8 秒
 * - 如果 status === 0 且有输出（stdout 或 stderr），认为可用
 * 
 * @param command 命令路径
 * @returns 是否可用
 */
export async function commandVersionWorks(command: string): Promise<boolean> {
  const result = await exec(command, ['--version'], { timeout: 8_000, noShell: true });
  if (result.status !== 0) return false;

  const output = (result.stdout + result.stderr).trim();
  return output.length > 0;
}

/**
 * 解析命令在 Windows PATH 中的所有可能路径（含扩展名组合）
 * 
 * 示例：
 * - yt-dlp → 'C:\Program Files\yt-dlp\yt-dlp.exe'、'C:\Program Files\yt-dlp\yt-dlp.bat'
 * 
 * @param command 命令名
 * @returns 候选路径列表（已去重）
 */
export function windowsPathCandidates(command: string): string[] {
  const pathEnv = process.env.PATH || '';
  const pathExt = process.env.PATHEXT || '.COM;.EXE;.BAT;.CMD';
  const extensions = path.extname(command) ? [''] : pathExt.split(';').filter(Boolean);

  const candidates: string[] = [];
  for (const dir of pathEnv.split(path.delimiter).filter(Boolean)) {
    for (const ext of extensions) {
      const lower = path.join(dir, `${command}${ext.toLowerCase()}`);
      const upper = path.join(dir, `${command}${ext.toUpperCase()}`);
      candidates.push(lower, upper);
    }
  }

  return [...new Set(candidates)];
}

/**
 * 查找 mise 安装的真实可执行文件（绕过 shim）
 * mise shim 是 shell 脚本，直接执行会创建窗口
 * 
 * @param command 命令名（如 'yt-dlp'、'mpv'）
 * @returns 真实 exe 路径，找不到返回空字符串
 */
function findMiseRealExecutable(command: string): string {
  const miseInstalls = path.join(os.homedir(), '.mise', 'data', 'installs');
  // 兼容用户自定义 mise 路径
  const miseRoot = process.env.MISE_DATA_DIR || miseInstalls;
  const installsDir = path.join(miseRoot, 'installs');
  
  if (!fs.existsSync(installsDir)) return '';
  
  // 查找匹配的安装目录（如 'yt-dlp/2026.03.17/yt-dlp.exe'）
  try {
    for (const entry of fs.readdirSync(installsDir)) {
      if (!entry.toLowerCase().includes(command.toLowerCase())) continue;
      const entryDir = path.join(installsDir, entry);
      if (!fs.statSync(entryDir).isDirectory()) continue;
      
      // 遍历版本目录
      for (const ver of fs.readdirSync(entryDir)) {
        const verDir = path.join(entryDir, ver);
        if (!fs.statSync(verDir).isDirectory()) continue;
        
        // 查找 exe 文件
        const exeName = IS_WINDOWS ? `${command}.exe` : command;
        const exePath = path.join(verDir, exeName);
        if (fs.existsSync(exePath)) return exePath;
      }
    }
  } catch {}
  
  return '';
}

/**
 * 使用 where.exe / command -v 查找命令路径
 * - Windows：where.exe
 * - Linux/macOS：sh -lc 'command -v <name>'
 * 
 * @param command 命令名
 * @returns 候选路径列表
 */
export async function locatorCandidates(command: string): Promise<string[]> {
  const locator = IS_WINDOWS
    ? ['where.exe', [command]] as [string, string[]]
    : ['sh', ['-lc', `command -v ${command}`]] as [string, string[]];

  const result = await exec(locator[0], locator[1], { timeout: 5_000, noShell: true });
  if (result.status !== 0) return [];

  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

// ============================================================
// 进程管理缓存
// ============================================================

/**
 * 命令解析结果缓存（避免重复查找）
 */
const resolveCache = new Map<string, string>();

/**
 * 缓存文件路径（持久化到 tmpdir）
 */
const CACHE_FILE = path.join(os.tmpdir(), 'music_executable_cache.json');

/**
 * 从文件加载缓存
 */
function loadPersistentCache(): void {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) as Record<string, string>;
      for (const [k, v] of Object.entries(data)) {
        resolveCache.set(k, v);
      }
    }
  } catch {
    // 缓存文件损坏，忽略
  }
}

/**
 * 保存缓存到文件
 */
function savePersistentCache(): void {
  try {
    const data = Object.fromEntries(resolveCache);
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data), 'utf8');
  } catch {
    // 保存失败，忽略
  }
}

// 启动时加载缓存
loadPersistentCache();

/**
 * 解析命令路径（多策略查找）
 * 
 * 查找顺序：
 * 1. 从 resolveCache 快速验证（最多 3 秒超时）
 * 2. 直接执行 `command --version`
 * 3. locatorCandidates（where.exe 或 command -v）
 * 4. windowsPathCandidates（仅限 Windows，遍历 PATH 组合）
 * 
 * 结果会被缓存（内存 + 持久化文件）
 * 
 * @param command 命令名
 * @returns 解析到的完整路径，如果找不到返回空字符串
 */
export async function resolveExecutable(command: string): Promise<string> {
  if (resolveCache.has(command)) {
    const cached = resolveCache.get(command)!;
    const result = await exec(cached, ['--version'], { timeout: 3_000, noShell: true });
    if (result.status === 0) return cached;
    resolveCache.delete(command);
  }

  let resolved = '';

  // 策略 0：mise 安装目录（绕过 shim，避免窗口弹出）
  if (IS_WINDOWS && !resolved) {
    const misePath = findMiseRealExecutable(command);
    if (misePath && await commandVersionWorks(misePath)) {
      resolved = misePath;
    }
  }

  // 策略 1：直接执行
  if (await commandVersionWorks(command)) {
    resolved = command;
  } else {
    // 策略 2：locator 查询
    const locatorList = await locatorCandidates(command);
    for (const candidate of locatorList) {
      if (!candidate || (path.isAbsolute(candidate) && !fs.existsSync(candidate))) continue;
      if (await commandVersionWorks(candidate)) {
        resolved = candidate;
        break;
      }
    }

    // 策略 3：Windows 专用 PATH 遍历
    if (!resolved && IS_WINDOWS) {
      const candidates = windowsPathCandidates(command);
      for (const candidate of candidates) {
        if (!candidate || (path.isAbsolute(candidate) && !fs.existsSync(candidate))) continue;
        if (await commandVersionWorks(candidate)) {
          resolved = candidate;
          break;
        }
      }
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

/**
 * 获取当前平台的依赖安装提示
 * 
 * @returns 安装命令（如 'brew install yt-dlp mpv'）
 */
export function installHint(): string {
  const platform = process.platform as Platform;
  return INSTALL_COMMANDS[platform] || 'Install yt-dlp and mpv with your system package manager.';
}

/**
 * 播放前检查必要依赖（yt-dlp、mpv）
 * 
 * - 控制命令不需要调用此函数，避免无关依赖阻塞控制操作
 * - 环境变量 MUSIC_SKIP_DEPS=1 可跳过检查（适用于已确认依赖正常的场景）
 * - 缺失任一依赖时，以 Markdown 格式输出安装指引
 * 
 * @throws 如果依赖缺失，退出进程（exit code 1）
 */
export async function checkPlaybackDependencies(): Promise<void> {
  if (process.env.MUSIC_SKIP_DEPS === '1') return;

  const missing: string[] = [];
  if (!(await resolveExecutable('yt-dlp'))) missing.push('yt-dlp');
  if (!(await resolveExecutable('mpv'))) missing.push('mpv');

  if (missing.length > 0) {
    exitWithError(
      `缺失依赖：\`${missing.join('`、`')}\``,
      [
        '已尝试 PATH 查找和 `--version` 检查，但工具不可用。',
        '请安装缺失工具或添加到 PATH，然后重新运行命令。',
        '',
        '```bash',
        installHint(),
        '```',
      ]
    );
  }
}

// ============================================================
// 错误输出
// ============================================================

/**
 * 输出用法说明（未知命令时使用）
 * 
 * @returns Markdown 格式的用法文本
 */
export function usage(): string {
  return [
    '## 错误：未知或不完整的命令',
    '',
    '```bash',
    'node "$skillDir/scripts/music.js" play "歌曲名"',
    'node "$skillDir/scripts/music.js" play "艺人名" --artist --count 5',
    'node "$skillDir/scripts/music.js" pause',
    'node "$skillDir/scripts/music.js" control status',
    '```',
  ].join('\n');
}

/**
 * 以 Markdown 格式输出错误，方便智能体直接转述给用户
 * 
 * @param message 错误消息（Markdown 格式）
 * @param details 补充信息数组（可以是提示文本或代码块）
 */
export function markdownError(message: string, details: string[] = []): void {
  const lines = ['## 错误', '', message];
  if (details.length > 0) {
    lines.push('', ...details);
  }
  console.error(lines.join('\n'));
}

/**
 * 输出错误并终止进程
 * 
 * @param message 错误消息
 * @param details 补充信息数组
 * @param code 退出码（默认 1）
 */
export function exitWithError(message: string, details: string[] = [], code = 1): never {
  markdownError(message, details);
  process.exit(code);
}

// ============================================================
// 工具函数
// ============================================================

/**
 * 异步等待指定毫秒数
 * 
 * @param ms 等待时间
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 转义字符串，供动态正则安全使用
 * 
 * @param value 原始字符串
 * @returns 转义后的字符串
 */
export function escapeRegex(value: string): string {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 转义 Markdown 表格单元格中的特殊字符
 * 
 * @param value 原始字符串
 * @returns 转义后的字符串
 */
export function escapeTable(value: string): string {
  return String(value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}
