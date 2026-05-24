#!/usr/bin/env node
"use strict";

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// 当前运行平台是否为 Windows，用于选择进程检查、停止命令和 IPC 路径。
const IS_WINDOWS = process.platform === "win32";

// 不同系统下的依赖安装提示。
const INSTALL_COMMANDS = {
  win32: "winget install yt-dlp mpv",
  darwin: "brew install yt-dlp mpv",
  linux: "sudo apt install yt-dlp mpv",
};

/**
 * 返回命令行用法说明，供未知命令或参数不足时展示。
 */
function usage() {
  return [
    "## Music Error",
    "",
    "Unknown or incomplete command.",
    "",
    "```bash",
    'node "$skillDir/scripts/music.js" play "Song Name"',
    'node "$skillDir/scripts/music.js" play "Artist Name" --artist --count 5',
    'node "$skillDir/scripts/music.js" pause',
    'node "$skillDir/scripts/music.js" control status',
    "```",
  ].join("\n");
}

/**
 * 以 Markdown 格式输出错误，方便智能体直接转述给用户。
 */
function markdownError(message, details = []) {
  const lines = ["## Music Error", "", message];
  if (details.length > 0) {
    lines.push("", ...details);
  }
  console.error(lines.join("\n"));
}

/**
 * 输出错误并终止进程。
 */
function exitWithError(message, details = [], code = 1) {
  markdownError(message, details);
  process.exit(code);
}

/**
 * 同步执行外部命令，统一处理编码、窗口隐藏和输出缓冲区大小。
 */
function run(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 20 * 1024 * 1024,
    ...options,
  });
}

/**
 * 判断外部命令是否能正常执行版本查询。
 */
function commandVersionWorks(command) {
  const result = run(command, ["--version"], { timeout: 10000 });
  return result.status === 0 && Boolean(`${result.stdout || ""}${result.stderr || ""}`.trim());
}

/**
 * 返回 Windows PATH 中可能匹配指定命令的完整路径。
 */
function windowsPathCandidates(command) {
  const pathEnv = process.env.PATH || "";
  const pathExt = process.env.PATHEXT || ".COM;.EXE;.BAT;.CMD";
  const extensions = path.extname(command) ? [""] : pathExt.split(";").filter(Boolean);
  const candidates = [];

  for (const dir of pathEnv.split(path.delimiter).filter(Boolean)) {
    for (const ext of extensions) {
      candidates.push(path.join(dir, `${command}${ext.toLowerCase()}`));
      candidates.push(path.join(dir, `${command}${ext.toUpperCase()}`));
    }
  }

  return [...new Set(candidates)];
}

/**
 * 从 where.exe / command -v 输出中提取可执行候选。
 */
function locatorCandidates(command) {
  const locator = IS_WINDOWS ? ["where.exe", [command]] : ["sh", ["-lc", `command -v ${command}`]];
  const result = run(locator[0], locator[1], { timeout: 10000 });
  if (result.status !== 0) return [];
  return (result.stdout || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * 多策略解析命令，避免不同 shell 的 PATH 检测差异导致误判缺失。
 */
function resolveExecutable(command) {
  if (commandVersionWorks(command)) return command;

  const candidates = IS_WINDOWS ? [...windowsPathCandidates(command), ...locatorCandidates(command)] : locatorCandidates(command);
  for (const candidate of candidates) {
    if (!candidate || (path.isAbsolute(candidate) && !fs.existsSync(candidate))) continue;
    if (commandVersionWorks(candidate)) return candidate;
  }

  return "";
}

/**
 * 根据当前系统返回最短安装提示。
 */
function installHint() {
  return INSTALL_COMMANDS[process.platform] || "Install yt-dlp and mpv with your system package manager.";
}

/**
 * 播放前检查必要依赖；控制命令不调用此函数，避免无关依赖阻塞控制操作。
 */
function checkPlaybackDependencies() {
  const missing = [];
  if (!resolveExecutable("yt-dlp")) missing.push("yt-dlp");
  if (!resolveExecutable("mpv")) missing.push("mpv");

  if (missing.length > 0) {
    exitWithError(`Missing dependency: \`${missing.join("`, `")}\`.`, [
      "Tried PATH lookup and `--version` checks, but the tools could not be run.",
      "Install the missing tools or add them to PATH, then run the command again.",
      "",
      "```bash",
      installHint(),
      "```",
    ]);
  }
}

/**
 * 等待指定毫秒数。
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 转义字符串，供动态正则安全使用。
 */
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 转义 Markdown 表格单元格中的特殊字符。
 */
function escapeTable(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

module.exports = {
  IS_WINDOWS,
  usage,
  markdownError,
  exitWithError,
  run,
  commandVersionWorks,
  windowsPathCandidates,
  locatorCandidates,
  resolveExecutable,
  installHint,
  checkPlaybackDependencies,
  sleep,
  escapeRegex,
  escapeTable,
};
