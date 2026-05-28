#!/usr/bin/env node
import { createRequire } from "node:module";
import { Command } from "commander";
import * as fs from "node:fs";
import { writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import * as net from "node:net";
import * as os from "node:os";
import * as path from "node:path";
//#region \0rolldown/runtime.js
var __require = /* @__PURE__ */ createRequire(import.meta.url);
//#endregion
//#region src/lib/utils.ts
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
/**
* 当前运行平台是否为 Windows
*/
var IS_WINDOWS = process.platform === "win32";
var detectedWindowsShell;
/**
* 检测 Windows 系统下可用的 shell（优先 pwsh，其次 bash）
* 用于避免使用 cmd（cmd 没有 mise 激活，找不到 yt-dlp/mpv）
* 
* @returns shell 路径或名称（'pwsh' | 'bash' | 'cmd.exe）
*/
function detectWindowsShell() {
	if (detectedWindowsShell !== void 0) return detectedWindowsShell;
	if (process.env.PSModulePath?.includes("PowerShell\\7") || process.env.PSModulePath?.includes("PowerShell/7")) {
		detectedWindowsShell = "pwsh";
		return detectedWindowsShell;
	}
	if (process.env.GIT_BASH_PATH) {
		detectedWindowsShell = process.env.GIT_BASH_PATH;
		return detectedWindowsShell;
	}
	try {
		const result = __require("child_process").spawnSync("where", ["pwsh"], {
			encoding: "utf8",
			windowsHide: true,
			timeout: 2e3
		});
		if (result.status === 0 && result.stdout.includes("pwsh")) {
			detectedWindowsShell = "pwsh";
			return detectedWindowsShell;
		}
	} catch {}
	try {
		const result = __require("child_process").spawnSync("where", ["bash"], {
			encoding: "utf8",
			windowsHide: true,
			timeout: 2e3
		});
		if (result.status === 0 && result.stdout.includes("bash")) {
			detectedWindowsShell = "bash";
			return detectedWindowsShell;
		}
	} catch {}
	detectedWindowsShell = "pwsh";
	return detectedWindowsShell;
}
/**
* 不同系统下的依赖安装命令
*/
var INSTALL_COMMANDS = {
	win32: "winget install yt-dlp yt-dlp mpv",
	darwin: "brew install yt-dlp mpv",
	linux: "sudo apt install yt-dlp mpv"
};
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
async function exec(command, args, options = {}) {
	const { timeout = 3e4, maxBuffer = 20 * 1024 * 1024, encoding = "utf8", windowsHide = true } = options;
	return new Promise((resolve) => {
		const spawnOptions = {
			encoding,
			windowsHide,
			stdio: [
				"ignore",
				"pipe",
				"pipe"
			]
		};
		let actualCommand = command;
		let actualArgs = args;
		if (IS_WINDOWS) {
			const shell = detectWindowsShell();
			if (shell === "pwsh") {
				const cmdString = `& "${command}" ${args.map((a) => `"${a.replace(/"/g, "`\"")}"`).join(" ")}`;
				actualCommand = "pwsh";
				actualArgs = [
					"-NoProfile",
					"-Command",
					cmdString
				];
			} else if (shell === "bash") {
				const cmdString = [command, ...args.map((a) => `"${a.replace(/"/g, "\\\"")}"`)].join(" ");
				actualCommand = "bash";
				actualArgs = ["-c", cmdString];
			}
		}
		const child = spawn(actualCommand, actualArgs, spawnOptions);
		let stdout = "";
		let stderr = "";
		let killed = false;
		let timer = null;
		child.stdout?.on("data", (chunk) => {
			if (typeof chunk === "string") stdout += chunk;
			else stdout += chunk.toString(encoding);
			if (stdout.length + stderr.length > maxBuffer) {
				child.kill("SIGKILL");
				killed = true;
				resolve({
					status: null,
					stdout,
					stderr,
					error: /* @__PURE__ */ new Error(`Output exceeded maxBuffer (${maxBuffer} bytes)`)
				});
			}
		});
		child.stderr?.on("data", (chunk) => {
			if (typeof chunk === "string") stderr += chunk;
			else stderr += chunk.toString(encoding);
		});
		if (timeout && timeout > 0) timer = setTimeout(() => {
			child.kill("SIGKILL");
			killed = true;
			resolve({
				status: null,
				stdout,
				stderr,
				error: /* @__PURE__ */ new Error(`Command timed out after ${timeout}ms`)
			});
		}, timeout);
		child.on("close", (code) => {
			if (timer) clearTimeout(timer);
			resolve({
				status: code,
				stdout,
				stderr,
				error: killed ? void 0 : void 0
			});
		});
		child.on("error", (err) => {
			if (timer) clearTimeout(timer);
			resolve({
				status: null,
				stdout,
				stderr,
				error: err
			});
		});
	});
}
/**
* 判断外部命令是否能正常执行版本查询
* - 尝试执行 `command --version`，timeout 8 秒
* - 如果 status === 0 且有输出（stdout 或 stderr），认为可用
* 
* @param command 命令路径
* @returns 是否可用
*/
async function commandVersionWorks(command) {
	const result = await exec(command, ["--version"], { timeout: 8e3 });
	if (result.status !== 0) return false;
	return (result.stdout + result.stderr).trim().length > 0;
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
function windowsPathCandidates(command) {
	const pathEnv = process.env.PATH || "";
	const pathExt = process.env.PATHEXT || ".COM;.EXE;.BAT;.CMD";
	const extensions = path.extname(command) ? [""] : pathExt.split(";").filter(Boolean);
	const candidates = [];
	for (const dir of pathEnv.split(path.delimiter).filter(Boolean)) for (const ext of extensions) {
		const lower = path.join(dir, `${command}${ext.toLowerCase()}`);
		const upper = path.join(dir, `${command}${ext.toUpperCase()}`);
		candidates.push(lower, upper);
	}
	return [...new Set(candidates)];
}
/**
* 使用 where.exe / command -v 查找命令路径
* - Windows：where.exe
* - Linux/macOS：sh -lc 'command -v <name>'
* 
* @param command 命令名
* @returns 候选路径列表
*/
async function locatorCandidates(command) {
	const locator = IS_WINDOWS ? ["where.exe", [command]] : ["sh", ["-lc", `command -v ${command}`]];
	const result = await exec(locator[0], locator[1], { timeout: 5e3 });
	if (result.status !== 0) return [];
	return result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}
/**
* 命令解析结果缓存（避免重复查找）
*/
var resolveCache = /* @__PURE__ */ new Map();
/**
* 缓存文件路径（持久化到 tmpdir）
*/
var CACHE_FILE = path.join(os.tmpdir(), "music_executable_cache.json");
/**
* 从文件加载缓存
*/
function loadPersistentCache() {
	try {
		if (fs.existsSync(CACHE_FILE)) {
			const data = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
			for (const [k, v] of Object.entries(data)) resolveCache.set(k, v);
		}
	} catch {}
}
/**
* 保存缓存到文件
*/
function savePersistentCache() {
	try {
		const data = Object.fromEntries(resolveCache);
		fs.writeFileSync(CACHE_FILE, JSON.stringify(data), "utf8");
	} catch {}
}
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
async function resolveExecutable(command) {
	if (resolveCache.has(command)) {
		const cached = resolveCache.get(command);
		if ((await exec(cached, ["--version"], { timeout: 3e3 })).status === 0) return cached;
		resolveCache.delete(command);
	}
	let resolved = "";
	if (await commandVersionWorks(command)) resolved = command;
	else {
		const locatorList = await locatorCandidates(command);
		for (const candidate of locatorList) {
			if (!candidate || path.isAbsolute(candidate) && !fs.existsSync(candidate)) continue;
			if (await commandVersionWorks(candidate)) {
				resolved = candidate;
				break;
			}
		}
		if (!resolved && IS_WINDOWS) {
			const candidates = windowsPathCandidates(command);
			for (const candidate of candidates) {
				if (!candidate || path.isAbsolute(candidate) && !fs.existsSync(candidate)) continue;
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
/**
* 获取当前平台的依赖安装提示
* 
* @returns 安装命令（如 'brew install yt-dlp mpv'）
*/
function installHint() {
	return INSTALL_COMMANDS[process.platform] || "Install yt-dlp and mpv with your system package manager.";
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
async function checkPlaybackDependencies() {
	if (process.env.MUSIC_SKIP_DEPS === "1") return;
	const missing = [];
	if (!await resolveExecutable("yt-dlp")) missing.push("yt-dlp");
	if (!await resolveExecutable("mpv")) missing.push("mpv");
	if (missing.length > 0) exitWithError(`缺失依赖：\`${missing.join("`、`")}\``, [
		"已尝试 PATH 查找和 `--version` 检查，但工具不可用。",
		"请安装缺失工具或添加到 PATH，然后重新运行命令。",
		"",
		"```bash",
		installHint(),
		"```"
	]);
}
/**
* 以 Markdown 格式输出错误，方便智能体直接转述给用户
* 
* @param message 错误消息（Markdown 格式）
* @param details 补充信息数组（可以是提示文本或代码块）
*/
function markdownError(message, details = []) {
	const lines = [
		"## 错误",
		"",
		message
	];
	if (details.length > 0) lines.push("", ...details);
	console.error(lines.join("\n"));
}
/**
* 输出错误并终止进程
* 
* @param message 错误消息
* @param details 补充信息数组
* @param code 退出码（默认 1）
*/
function exitWithError(message, details = [], code = 1) {
	markdownError(message, details);
	process.exit(code);
}
/**
* 异步等待指定毫秒数
* 
* @param ms 等待时间
*/
async function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
//#endregion
//#region src/lib/mpv.ts
/**
* mpv 播放器控制模块
* 
* 包含：
* - 进程管理（启动、停止、状态检查）
* - IPC 通信（通过 Unix socket 或 Windows 命名管道）
* - 命令映射（控制命令 → mpv JSON-RPC）
* - 播放验证（检查 time-pos 确认实际播放）
* 
* 优化点（相比原 JS 版本）：
* 1. 类型安全（MpvCommandRequest、MpvCommandResponse 明确定义）
* 2. IPC 超时机制（默认 5000ms，避免卡死）
* 3. 进程管理增强（启动等待、停止等待、PID 检查）
* 4. 错误处理统一（所有 IPC 错误返回 MpvSendResult 结构）
*/
/**
* mpv IPC 服务名（Unix socket 或命名管道的标识符）
*/
var PIPE_NAME = "music-mpv-ipc";
/**
* mpv IPC 连接路径
* - Windows: \\.\pipe\<name>
* - Linux/macOS: /tmp/<name>
*/
var IPC_PATH = IS_WINDOWS ? `\\\\.\\pipe\\${PIPE_NAME}` : `/tmp/${PIPE_NAME}`;
/**
* 控制命令对应的中文标签（用于输出展示）
*/
var LABELS = {
	"pause": "已暂停",
	"resume": "已继续播放",
	"toggle-pause": "已切换播放/暂停",
	"next": "已跳转到下一首",
	"prev": "已跳转到上一首",
	"volume-up": "音量 +10",
	"volume-down": "音量 -10",
	"mute": "已切换静音",
	"loop": "已开启单曲循环",
	"loop-off": "已关闭循环",
	"stop": "已停止播放",
	"status": "当前状态"
};
/**
* 当前 mpv 进程（用于启动后引用）
*/
var mpvProcess = null;
/**
* 检查 mpv 进程是否正在运行
* - Windows：tasklist 查找 mpv.exe
* - Linux/macOS：pgrep -x mpv
* 
* @returns 是否运行
*/
async function mpvIsRunning() {
	const result = IS_WINDOWS ? await exec("tasklist", ["/FI", "IMAGENAME eq mpv.exe"], { timeout: 3e3 }) : await exec("pgrep", ["-x", "mpv"], { timeout: 3e3 });
	if (IS_WINDOWS) return /mpv\.exe/i.test(result.stdout);
	return result.status === 0;
}
/**
* 启动 mpv 进程并等待其 IPC 服务就绪
* 
* 参数说明：
* - --no-video：只播放音频
* - --input-ipc-server=<path>：启用 IPC 通信
* - --keep-open-pause=no：播放列表结束时自动停止进程
* - --ytdl-format=bestaudio/best：优先选择最佳音质
* - --ytdl：启用 yt-dlp hook（播放 YouTube URL）
* 
* @param args 附加参数（URL 或播放列表）
* @returns mpv 进程对象
*/
function startMpv(args = []) {
	mpvProcess = spawn("mpv", [
		"--no-video",
		"--keep-open-pause=no",
		"--ytdl-format=bestaudio/best",
		"--ytdl",
		`--input-ipc-server=${IPC_PATH}`,
		...args
	], {
		stdio: [
			"ignore",
			"ignore",
			"ignore"
		],
		detached: true,
		windowsHide: true
	});
	mpvProcess.on("error", (err) => {
		console.error(`mpv 启动失败：${err.message}`);
		mpvProcess = null;
	});
	mpvProcess.on("exit", (code, signal) => {
		mpvProcess = null;
	});
	if (mpvProcess.unref) mpvProcess.unref();
	return mpvProcess;
}
/**
* 等待 mpv 进程停止（轮询检查）
* - 最多等待 10 轮，每轮间隔 100ms，共 ~1000ms
* - 用于 stop 命令后确认进程已退出
*/
async function waitForMpvToStop() {
	for (let i = 0; i < 10; i++) {
		if (!await mpvIsRunning()) return;
		await sleep(100);
	}
}
/**
* 通过 IPC 向 mpv 发送命令并等待响应
* 
* 协议说明：
* - 请求：JSON 字符串 + \n
* - 响应：JSON 字符串 + \n（单行）
* - 超时后关闭连接，返回 ok=false
* 
* @param request 命令请求（如 { command: ['get_property', 'pause'] }）
* @param timeout 超时时间（默认 5000ms）
* @returns 发送结果（ok、response、error）
*/
async function sendIpc(request, timeout = 5e3) {
	return new Promise((resolve) => {
		const socket = new net.Socket();
		let responseBuffer = "";
		const timer = setTimeout(() => {
			socket.destroy();
			resolve({
				ok: false,
				error: "IPC 通信超时"
			});
		}, timeout);
		socket.on("connect", () => {
			const data = JSON.stringify(request) + "\n";
			socket.write(data);
		});
		socket.on("data", (chunk) => {
			responseBuffer += chunk.toString();
			const lines = responseBuffer.split("\n");
			for (const line of lines) {
				if (!line.trim()) continue;
				try {
					const parsed = JSON.parse(line);
					clearTimeout(timer);
					socket.destroy();
					resolve({
						ok: parsed.error === "success",
						response: parsed
					});
					return;
				} catch (err) {}
			}
		});
		socket.on("error", (err) => {
			clearTimeout(timer);
			resolve({
				ok: false,
				error: err.message
			});
		});
		socket.connect(IPC_PATH);
	});
}
/**
* 获取 mpv 当前播放状态
* - 调用 get_property pause
* - 如果 IPC 不可用，返回 null
* 
* @returns 'playing' | 'paused' | null
*/
async function getPlaybackStatus() {
	const result = await sendIpc({ command: ["get_property", "pause"] });
	if (!result.ok || !result.response) return null;
	return result.response.data === true ? "paused" : "playing";
}
/**
* 验证 mpv 是否真正开始播放（检查 time-pos）
* - 连续检查 10 次，每次间隔 500ms
* - 只要有一次 time-pos > 0 即认为播放成功
* 
* 用途：
* - 播放启动后调用，避免 "mpv 启动但没有声音" 的情况
* 
* @returns 是否播放成功
*/
async function verifyPlayback() {
	for (let i = 0; i < 10; i++) {
		await sleep(500);
		const result = await sendIpc({ command: ["get_property", "time-pos"] });
		if (!result.ok || !result.response) continue;
		const pos = result.response.data;
		if (typeof pos === "number" && pos > 0) return true;
	}
	return false;
}
//#endregion
//#region src/lib/output.ts
/**
* 是否为 JSON 输出模式
* （由主入口 music.ts 设置）
*/
var jsonMode = false;
/**
* 切换 JSON 输出模式
* 
* @param enabled 是否启用 JSON 模式
*/
function setJsonMode(enabled) {
	jsonMode = enabled;
}
/**
* 获取当前 JSON 输出模式状态
* 
* @returns 是否启用 JSON 模式
*/
function getJsonMode() {
	return jsonMode;
}
/**
* ANSI 颜色代码
*/
var ANSI_COLORS = {
	reset: "\x1B[0m",
	bold: "\x1B[1m",
	dim: "\x1B[2m",
	red: "\x1B[31m",
	green: "\x1B[32m",
	yellow: "\x1B[33m",
	blue: "\x1B[34m",
	magenta: "\x1B[35m",
	cyan: "\x1B[36m",
	white: "\x1B[37m",
	gray: "\x1B[90m",
	brightRed: "\x1B[91m",
	brightGreen: "\x1B[92m",
	brightYellow: "\x1B[93m",
	brightBlue: "\x1B[94m",
	brightMagenta: "\x1B[95m",
	brightCyan: "\x1B[96m"
};
/**
* 检测当前终端是否支持颜色
* 
* 规则：
* 1. 如果 stdout 不是 TTY，禁用颜色
* 2. 如果 stdout.columns < 80，禁用颜色（窄终端）
* 3. Windows 10 1809+ 默认支持 ANSI
* 4. 其他情况启用颜色
* 
* @returns 是否支持颜色
*/
function supportsColor() {
	if (!process.stdout.isTTY) return false;
	if ((process.stdout.columns ?? 0) < 80) return false;
	if (process.platform === "win32") try {
		const ver = process.getSystemVersion?.() || "";
		return parseInt(ver.split(".")[2] || "0") >= 17763;
	} catch {
		return true;
	}
	return true;
}
/**
* 颜色开关（启动时检测一次）
*/
var colorEnabled = supportsColor();
/**
* 颜色化文本（如果支持颜色）
* 
* @param text 原始文本
* @param color ANSI 颜色代码
* @returns 颜色化后的文本（不支持颜色时返回原文本）
*/
function colorize(text, color) {
	if (!colorEnabled) return text;
	return `${ANSI_COLORS[color]}${text}${ANSI_COLORS.reset}`;
}
/**
* 格式化时长（秒 → mm:ss）
* 
* @param seconds 秒数（可能为小数或 null）
* @returns 格式化后的字符串（如 "3:45"）
*/
function formatDuration(seconds) {
	if (seconds === void 0 || seconds === null || seconds < 0) return "--:--";
	return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
}
/**
* 输出成功信息
* 
* 终端格式：✓ [前缀] 消息（绿色）
* JSON 格式：{ "status": "success", "message": "..." }
* 
* @param message 消息文本
* @param prefix 前缀（默认为空）
*/
function outputSuccess(message, prefix = "") {
	if (jsonMode) console.log(JSON.stringify({
		status: "success",
		message
	}));
	else {
		const prefixText = prefix ? `[${colorize(prefix, "cyan")}] ` : "";
		console.log(`${colorize("✓", "green")} ${prefixText}${message}`);
	}
}
/**
* 输出错误信息
* 
* 终端格式：✗ [前缀] 消息（红色）
* JSON 格式：{ "status": "error", "message": "...", "details": [...] }
* 
* @param message 错误消息
* @param details 补充详情数组
* @param prefix 前缀（默认为空）
*/
function outputError(message, details = [], prefix = "") {
	if (jsonMode) console.error(JSON.stringify({
		status: "error",
		message,
		details
	}));
	else {
		const prefixText = prefix ? `[${colorize(prefix, "cyan")}] ` : "";
		console.error(`${colorize("✗", "red")} ${prefixText}${message}`);
		if (details.length > 0) details.forEach((detail) => {
			console.error(`  ${colorize("→", "gray")} ${colorize(detail, "gray")}`);
		});
	}
}
/**
* 输出状态信息
* 
* 终端格式：ℹ [前缀] 消息（蓝色）
* JSON 格式：{ "status": "info", "message": "..." }
* 
* @param message 消息文本
* @param prefix 前缀（默认为空）
*/
function outputInfo(message, prefix = "") {
	if (jsonMode) console.log(JSON.stringify({
		status: "info",
		message
	}));
	else {
		const prefixText = prefix ? `[${colorize(prefix, "cyan")}] ` : "";
		console.log(`${colorize("ℹ", "blue")} ${prefixText}${message}`);
	}
}
/**
* 输出动作信息（如"正在搜索..."）
* 
* 终端格式：→ [前缀] 消息（黄色）
* JSON 格式：{ "action": "..." }
* 
* @param message 消息文本
* @param prefix 前缀（默认为空）
*/
function outputAction(message, prefix = "") {
	if (jsonMode) console.log(JSON.stringify({ action: message }));
	else {
		const prefixText = prefix ? `[${colorize(prefix, "cyan")}] ` : "";
		console.log(`${colorize("→", "yellow")} ${prefixText}${message}`);
	}
}
/**
* 输出歌曲信息（播放前调用）
* 
* 终端格式（彩色）：
* ```
* → 正在播放
*   🎵 标题（3:45）
*   👤 艺人名
* ```
* 
* JSON 格式：
* ```json
* { "action": "play", "song": { "title": "...", "artist": "...", "duration": "3:45" } }
* ```
* 
* @param info 歌曲信息（从 YTVideoInfo 转换）
*/
function outputSongInfo(info) {
	const title = info.title || "未知标题";
	const artist = info.artist || "未知艺人";
	const duration = info.duration ? typeof info.duration === "string" ? info.duration : formatDuration(info.duration) : "--:--";
	if (jsonMode) console.log(JSON.stringify({
		action: "play",
		song: {
			title,
			artist,
			duration
		}
	}));
	else {
		console.log(`${colorize("→", "yellow")} ${colorize("正在播放", "yellow")}`);
		console.log(`  ${colorize("🎵", "cyan")} ${colorize(title, "bold")} ${colorize(`(${duration})`, "gray")}`);
		console.log(`  ${colorize("👤", "cyan")} ${colorize(artist, "white")}`);
	}
}
/**
* 输出控制命令执行结果
* 
* 终端格式：✓ 标签（如"已暂停"）
* JSON 格式：{ "action": "pause", "status": "success" }
* 
* @param action 控制命令（pause/resume/next 等）
* @param status 执行状态（"success" 或 "error"）
* @param label 用户友好的标签（如"已暂停"）
* @param extraInfo 额外信息（如当前音量百分比）
*/
function outputControlResult(action, status, label, extraInfo) {
	const defaultLabel = LABELS[action] || action;
	const displayLabel = label || defaultLabel;
	if (jsonMode) {
		const output = {
			action,
			status,
			label: displayLabel
		};
		if (extraInfo) output.extraInfo = extraInfo;
		console.log(JSON.stringify(output));
	} else if (status === "success") {
		console.log(`${colorize("✓", "green")} ${displayLabel}`);
		if (extraInfo) console.log(`  ${colorize(extraInfo, "gray")}`);
	} else console.log(`${colorize("✗", "red")} ${displayLabel}`);
}
//#endregion
//#region src/lib/ytdl.ts
/**
* 默认超时时间（毫秒）
*/
var YTDLP_TIMEOUT = 3e4;
/**
* 执行 yt-dlp 命令并返回解析后的输出
* 
* @param args yt-dlp 参数列表
* @param timeout 超时时间（默认 30_000ms）
* @returns yt-dlp 标准输出（字符串）
* @throws 命令执行失败时抛出错误
*/
async function runYtdlp(args, timeout = YTDLP_TIMEOUT) {
	const result = await exec("yt-dlp", args, { timeout });
	if (result.status !== 0) {
		const errorMsg = result.stderr.trim() || result.stdout.trim() || `yt-dlp 退出码 ${result.status}`;
		throw new Error(`yt-dlp 执行失败：${errorMsg}`);
	}
	return result.stdout;
}
/**
* 解析 yt-dlp 的 JSON 输出（可能是单个对象或多个 JSON lines）
* 
* yt-dlp 的 --dump-json 会输出单个 JSON 对象
* yt-dlp 的 --flat-playlist + --dump-json 会输出多行 JSON（JSON lines 格式）
* 
* @param output yt-dlp 标准输出
* @returns 解析后的 JSON 对象数组
*/
function parseYtdlpJsonLines(output) {
	if (!output.trim()) return [];
	const lines = output.split("\n").filter((line) => line.trim());
	const results = [];
	for (const line of lines) try {
		const parsed = JSON.parse(line);
		results.push(parsed);
	} catch (err) {
		continue;
	}
	return results;
}
/**
* 搜索 YouTube 歌曲（使用 yt-dlp 的 ytsearch 功能）
* 
* 参数说明：
* - ytsearch<limit>:<query>：限制返回结果数量
* - --flat-playlist：快速搜索模式（不获取完整视频信息）
* - --ignore-errors：跳过无法访问的视频
* - --no-warnings：抑制警告输出
* - --dump-json：输出 JSON 格式
* 
* @param query 搜索关键词
* @param limit 最大结果数量（默认 10）
* @returns 匹配的视频信息数组
*/
async function searchYouTube(query, limit = 10) {
	const args = [
		`ytsearch${limit}:${query}`,
		"--ignore-errors",
		"--no-warnings",
		"--flat-playlist",
		"--skip-download",
		"--playlist-end",
		String(limit),
		"--dump-json"
	];
	try {
		return parseYtdlpJsonLines(await runYtdlp(args));
	} catch (err) {
		console.error(`YouTube 搜索失败：${err.message}`);
		return [];
	}
}
/**
* 获取视频的实际音频流 URL（用于播放）
* 
* 参数说明：
* - -f bestaudio：选择最佳音质
* - -g --get-url：只输出下载 URL
* - --no-download --no-warnings
* 
* @param url 视频 URL
* @returns 音频流 URL，失败返回 null
*/
async function getAudioStreamUrl(url) {
	const args = [
		url,
		"-f",
		"bestaudio",
		"-g",
		"--get-url",
		"--no-download",
		"--no-warnings"
	];
	try {
		return (await runYtdlp(args, 6e4)).trim().split("\n")[0] || null;
	} catch (err) {
		return null;
	}
}
//#endregion
//#region src/lib/scoring.ts
/**
* 歌曲时长过滤阈值
*/
var MIN_DURATION = 60;
var MAX_DURATION = 600;
/**
* 标题匹配权重配置
*/
var SCORE_WEIGHTS = {
	titleExactMatch: 1e5,
	titlePartialMatch: 1e4,
	hasMetadata: 5e3,
	officialBonus: 2e3,
	albumBonus: 1500,
	durationMatch: 1e3,
	artistBonus: 800,
	livePenalty: -5e3,
	coverPenalty: -3e3,
	remixPenalty: -2e3
};
/**
* 标题精确匹配得分
* - 完全匹配（query 完全包含在 title 中）：+100_000
* - 部分匹配（query 的关键词出现在 title 中）：+10_000
* 
* @param query 用户输入的搜索词（可能是歌名或艺人名）
* @param title 视频标题
* @returns 匹配得分
*/
function titleMatchScore(query, title) {
	if (!title) return 0;
	const normalizedQuery = query.toLowerCase().trim();
	const normalizedTitle = title.toLowerCase();
	if (normalizedTitle.includes(normalizedQuery)) return SCORE_WEIGHTS.titleExactMatch;
	const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);
	const matchedWords = queryWords.filter((word) => normalizedTitle.includes(word));
	if (matchedWords.length === queryWords.length) return SCORE_WEIGHTS.titlePartialMatch;
	if (matchedWords.length > 0) return Math.round(SCORE_WEIGHTS.titlePartialMatch * (matchedWords.length / queryWords.length));
	return 0;
}
/**
* 元数据丰富度得分
* - 有 title：+2_000
* - 有 artist/uploader：+1_500
* - 有 duration：+1_500
* 
* @param info 视频信息
* @returns 元数据得分
*/
function metadataRichnessScore(info) {
	let score = 0;
	if (info.title) score += 2e3;
	if (info.artist || info.uploader || info.channel) score += 1500;
	if (info.duration) score += 1500;
	return score;
}
/**
* 关键词加成/惩罚得分
* 
* 加成关键词：
* - official：+2_000
* - album：+1_500
* - artist, singer：+800
* 
* 惩罚关键词：
* - live, concert：-5_000
* - cover：-3_000
* - remix, remixes：-2_000
* 
* @param title 视频标题
* @returns 关键词得分（可正可负）
*/
function keywordScore(title) {
	if (!title) return 0;
	const lower = title.toLowerCase();
	let score = 0;
	if (lower.includes("official")) score += SCORE_WEIGHTS.officialBonus;
	if (lower.includes("album")) score += SCORE_WEIGHTS.albumBonus;
	if (lower.includes("artist") || lower.includes("singer")) score += SCORE_WEIGHTS.artistBonus;
	if (lower.includes("live") || lower.includes("concert")) score += SCORE_WEIGHTS.livePenalty;
	if (lower.includes("cover")) score += SCORE_WEIGHTS.coverPenalty;
	if (lower.includes("remix") || lower.includes("remixes")) score += SCORE_WEIGHTS.remixPenalty;
	return score;
}
/**
* 时长匹配得分
* - 时长在 MIN_DURATION ~ MAX_DURATION 之间：+1_000
* - 时长过短或过长：0
* 
* @param duration 时长（秒），可能不存在
* @returns 时长得分
*/
function durationScore(duration) {
	if (duration === void 0 || duration === null) return 0;
	if (duration >= MIN_DURATION && duration <= MAX_DURATION) return SCORE_WEIGHTS.durationMatch;
	return 0;
}
/**
* 计算单个视频的综合得分
* 
* @param query 用户输入的搜索词
* @param info 视频信息
* @returns 综合得分（可能为负）
*/
function calculateScore(query, info) {
	let score = 0;
	score += titleMatchScore(query, info.title || "");
	score += metadataRichnessScore(info);
	score += keywordScore(info.title || "");
	score += durationScore(info.duration);
	return score;
}
/**
* 主筛选函数：对搜索结果进行评分和排序
* 
* @param query 用户输入的搜索词
* @param results YouTube 搜索结果（通过 searchYouTube 获取）
* @param maxResults 返回的最大结果数（默认 10）
* @returns 按得分降序排列的候选列表
*/
function scoreAndRank(query, results, maxResults = 10) {
	const filtered = results.map((info) => ({
		song: info,
		score: calculateScore(query, info)
	})).filter((item) => {
		if (item.song.duration && item.song.duration < 30) return false;
		if (item.score < 1e3) return false;
		return true;
	});
	filtered.sort((a, b) => b.score - a.score);
	return filtered.slice(0, maxResults);
}
/**
* 从评分结果中提取最佳歌曲
* 
* @param scored 评分后的候选列表
* @returns 最佳歌曲，如果无候选返回 null
*/
function pickBestSong(scored) {
	if (scored.length === 0) return null;
	return {
		song: scored[0].song,
		score: scored[0].score
	};
}
/**
* 判断评分结果是否可靠（最低得分阈值）
* 
* @param best 最佳候选
* @returns 是否可靠（得分 >= 10_000）
*/
function isReliableMatch(best) {
	if (!best) return false;
	return best.score >= 1e4;
}
//#endregion
//#region src/bin/music.ts
/**
* music 技能主入口
* 
* 使用 commander 分发子命令：
* - play <query>       播放歌曲（默认命令）
* - play --artist <name> 播放艺人歌曲
* - pause              暂停
* - resume             恢复
* - toggle-pause       切换暂停
* - next               下一首
* - prev               上一首
* - volume-up          音量 +10
* - volume-down        音量 -10
* - mute               静音切换
* - loop               单曲循环
* - loop-off           关闭循环
* - stop               停止
* - status             播放状态
* 
* 全局选项：
* - --json             JSON 输出模式（供 Agent 解析）
* - --verbose          显示详细日志
* - --help             显示帮助
*/
/**
* 默认超时时间（毫秒）
*/
var DEFAULT_TIMEOUT = 3e4;
/**
* play 命令：播放歌曲
* 
* 流程：
* 1. 检查 yt-dlp、mpv 依赖
* 2. 搜索 YouTube（使用 query）
* 3. 评分 + 排序
* 4. 选择最佳候选
* 5. 启动 mpv 播放
* 6. 立即返回（如果指定 --outfile，后台写入歌曲信息）
* 7. Agent 稍后轮询 outfile 获取歌曲信息
*/
async function playCommand(query, options) {
	if (options.json) setJsonMode(true);
	const timeout = options.timeout || DEFAULT_TIMEOUT;
	const count = options.count || 10;
	try {
		outputAction("检查 yt-dlp 和 mpv 依赖...", "依赖检查");
		await checkPlaybackDependencies();
		outputSuccess("依赖检查通过", "依赖检查");
		outputAction(`搜索 "${query}"...`, "搜索");
		const results = await searchYouTube(query, count);
		if (results.length === 0) {
			outputError(`未找到匹配的歌曲`, [], "搜索");
			process.exit(1);
		}
		outputSuccess(`找到 ${results.length} 个候选`, "搜索");
		outputAction("评分候选歌曲...", "评分");
		const scored = scoreAndRank(query, results);
		if (scored.length === 0) {
			outputError("无法找到匹配的歌曲（评分过低）", ["请尝试更具体的搜索词"], "评分");
			process.exit(1);
		}
		const bestPick = pickBestSong(scored);
		if (!bestPick) {
			outputError("无法找到匹配的歌曲", [], "评分");
			process.exit(1);
		}
		const best = bestPick.song;
		outputAction("提取音频流 URL...", "播放");
		const candidateUrl = best.id ? `https://www.youtube.com/watch?v=${best.id}` : best.webpage_url || best.url;
		if (!candidateUrl) {
			outputError("无法从搜索结果中获取视频标识", ["请尝试更具体的搜索词"], "播放");
			process.exit(1);
		}
		const directUrl = await getAudioStreamUrl(candidateUrl);
		const playbackUrl = directUrl || candidateUrl;
		if (!directUrl) outputInfo("音频 URL 提取失败，使用 YouTube URL 播放（需要 mpv 支持 yt-dl hook）", "播放");
		outputAction("正在启动 mpv...", "播放");
		if (await mpvIsRunning()) {
			outputAction("停止当前播放...", "播放");
			await sendIpc({ command: ["stop"] });
			await waitForMpvToStop();
		}
		if (options.outfile) {
			const startedInfo = {
				status: "started",
				title: best.title || query,
				artist: best.artist || best.uploader || "未知艺人",
				duration: best.duration,
				timestamp: (/* @__PURE__ */ new Date()).toISOString()
			};
			writeFileSync(options.outfile, JSON.stringify(startedInfo, null, 2));
			outputSuccess("播放已启动（started），歌曲信息将稍后更新", "播放");
			startMpv([playbackUrl]);
			const verifyScript = `
        const net = require('node:net');
        const fs = require('node:fs');
        
        const IPC_PATH = process.platform === 'win32' 
          ? '\\\\\\\\.\\\\pipe\\\\music-mpv-ipc' 
          : '/tmp/music-mpv-ipc';
        const OUTFILE = ${JSON.stringify(options.outfile)};
        const SONG_INFO = ${JSON.stringify(startedInfo)};
        
        async function sendIpc(cmd) {
          return new Promise((resolve) => {
            const socket = net.createConnection(IPC_PATH);
            const chunks = [];
            let settled = false;
            
            socket.setTimeout(3000);
            socket.on('connect', () => {
              socket.write(JSON.stringify(cmd) + '\\n');
            });
            socket.on('data', (chunk) => {
              chunks.push(chunk);
              const data = Buffer.concat(chunks).toString('utf8').trim();
              const firstLine = data.split(/\\r?\\n/).find(Boolean);
              if (!firstLine) return;
              try {
                const response = JSON.parse(firstLine);
                finish(response.error === 'success', response, response.error);
              } catch (error) {
                finish(false, null, 'Invalid mpv response: ' + firstLine);
              }
            });
            socket.on('timeout', () => finish(false, null, 'IPC timeout'));
            socket.on('error', (error) => finish(false, null, error.message));
            socket.on('end', () => {
              if (!settled) {
                const data = Buffer.concat(chunks).toString('utf8').trim();
                finish(Boolean(data), null, data ? null : 'No IPC response');
              }
            });
            
            function finish(ok, response, error) {
              if (settled) return;
              settled = true;
              socket.destroy();
              resolve({ ok, response, error });
            }
          });
        }
        
        async function verify() {
          const deadline = Date.now() + 15000;
          while (Date.now() < deadline) {
            const res = await sendIpc({ command: ['get_property', 'time-pos'] });
            if (res.ok) return true;
            await new Promise(r => setTimeout(r, 750));
          }
          return false;
        }
        
        (async () => {
          const ok = await verify();
          const updatedInfo = {
            ...SONG_INFO,
            status: ok ? 'success' : 'failed',
            timestamp: new Date().toISOString()
          };
          try {
            fs.writeFileSync(OUTFILE, JSON.stringify(updatedInfo, null, 2));
          } catch (err) {
            // 写文件失败也忽略
          }
        })();
      `;
			const { spawn } = await import("node:child_process");
			spawn(process.execPath, ["-e", verifyScript], {
				detached: true,
				stdio: "ignore",
				windowsHide: true
			}).unref();
			process.exit(0);
		}
		startMpv([playbackUrl]);
		outputAction("等待播放...", "播放");
		if (!await verifyPlayback(timeout)) {
			outputError("播放失败（mpv 启动但无声音）", [], "播放");
			process.exit(1);
		}
		outputSongInfo({
			title: best.title || query,
			artist: best.artist || best.uploader || "未知艺人",
			duration: best.duration
		});
		if (!isReliableMatch(best)) outputInfo("当前匹配度较低，可能不是最相关的歌曲", "提示");
		process.exit(0);
	} catch (err) {
		outputError(err.message || "未知错误", [], "错误");
		process.exit(1);
	}
}
/**
* 控制命令处理函数
* 
* 流程：
* 1. 检查 mpv 是否正在运行
* 2. 通过 IPC 发送控制命令
* 3. 输出执行结果（成功/失败）
*/
async function controlCommand(action, options) {
	if (options.json) setJsonMode(true);
	try {
		if (!await mpvIsRunning()) {
			outputError("mpv 未在运行", ["请先启动播放"], "状态检查");
			process.exit(1);
		}
		const result = await sendIpc({ command: [action.toLowerCase()] });
		if (result.error) {
			outputError(`IPC 命令失败: ${result.error}`, [], "控制");
			process.exit(1);
		}
		outputControlResult(action, "success");
		process.exit(0);
	} catch (err) {
		outputError(err.message || "未知错误", [], "错误");
		process.exit(1);
	}
}
/**
* status 命令：查询播放状态
* 
* 流程：
* 1. 检查 mpv 是否正在运行
* 2. 通过 IPC 获取状态（pause、time-pos、duration）
* 3. 输出状态信息
*/
async function statusCommand(options) {
	if (options.json) setJsonMode(true);
	try {
		if (!await mpvIsRunning()) {
			outputError("mpv 未在运行", ["请先启动播放"], "状态检查");
			process.exit(1);
		}
		const state = await getPlaybackStatus();
		if (getJsonMode()) console.log(JSON.stringify({
			status: "ok",
			state: state || "unknown"
		}, null, 2));
		else outputSuccess(`播放状态: ${state === "playing" ? "播放中" : state === "paused" ? "已暂停" : "未知"}`, "状态");
		process.exit(0);
	} catch (err) {
		outputError(err.message || "未知错误", [], "错误");
		process.exit(1);
	}
}
var program = new Command();
program.name("music").description("播放、暂停、控制在线音乐").version("1.0.0");
program.command("play [query..]", { isDefault: true }).description("播放歌曲（默认命令）").option("--artist", "艺人模式：播放指定艺人的歌曲", false).option("--count <n>", "艺人模式下的歌曲数量", parseInt, 10).option("-j, --json", "JSON 输出模式（供 Agent 解析）", false).option("--timeout <ms>", "超时时间（毫秒）", parseInt, DEFAULT_TIMEOUT).option("--outfile <path>", "将歌曲信息写入文件（异步模式，不阻塞）").action((query, options) => {
	const queryArr = Array.isArray(query) ? query : query ? [String(query)] : [];
	const queryStr = queryArr.length > 0 ? queryArr.join(" ") : "";
	if (!queryStr) {
		outputError("请提供搜索关键词", ["用法: music play <歌曲名>"], "错误");
		process.exit(1);
	}
	playCommand(queryStr, options);
});
var controlActions = [
	"pause",
	"resume",
	"toggle-pause",
	"next",
	"prev",
	"volume-up",
	"volume-down",
	"mute",
	"loop",
	"loop-off",
	"stop"
];
controlActions.forEach((action) => {
	program.command(action).description(`执行 ${action} 控制命令`).option("-j, --json", "JSON 输出模式", false).action((options) => {
		controlCommand(action, options);
	});
});
program.command("status").description("查询播放状态").option("-j, --json", "JSON 输出模式", false).action((options) => {
	statusCommand(options);
});
program.command("control [action]").description("执行控制命令（兼容旧版）").option("-j, --json", "JSON 输出模式", false).action((action, options) => {
	if (!action) {
		outputError("请指定控制命令", [`可用命令: ${controlActions.join(", ")}`], "错误");
		process.exit(1);
	}
	if (!controlActions.includes(action)) {
		outputError(`未知的控制命令: ${action}`, [`可用命令: ${controlActions.join(", ")}`], "错误");
		process.exit(1);
	}
	controlCommand(action, options);
});
program.parse();
//#endregion
export {};

//# sourceMappingURL=music.mjs.map