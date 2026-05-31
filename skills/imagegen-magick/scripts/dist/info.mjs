import { Command } from "commander";
import { spawn } from "node:child_process";
import { homedir, platform } from "node:os";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
//#region src/lib/spawn.ts
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
/**
* 在 Windows 上是否需要 shell 模式
*
* Windows 下的 .cmd、.bat、.ps1 文件不能直接被 spawn 调用，
* 必须通过 shell（cmd.exe）才能执行。
*
* @param cmd - 命令字符串
* @returns 是否需要 shell:true
*/
function needsShell(cmd) {
	if (platform() !== "win32") return false;
	return /\.(cmd|bat|ps1|com)$/i.test(cmd);
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
async function spawnExec(cmd, options = {}) {
	const { args = [], cwd, env, capture = true, inherit = false, timeoutMs, stdin } = options;
	const stdio = inherit && !capture ? "inherit" : capture ? [
		"pipe",
		"pipe",
		"pipe"
	] : [
		"pipe",
		"inherit",
		"inherit"
	];
	return new Promise((resolve) => {
		const child = spawn(cmd, args, {
			cwd,
			env: {
				...process.env,
				...env
			},
			stdio,
			shell: needsShell(cmd),
			windowsHide: true
		});
		let stdout = "";
		let stderr = "";
		let timedOut = false;
		if (capture && child.stdout) child.stdout.on("data", (data) => {
			stdout += data.toString();
		});
		if (capture && child.stderr) child.stderr.on("data", (data) => {
			stderr += data.toString();
		});
		if (stdin !== void 0 && child.stdin) {
			child.stdin.write(stdin);
			child.stdin.end();
		}
		let timeoutHandle;
		if (timeoutMs !== void 0) timeoutHandle = setTimeout(() => {
			timedOut = true;
			child.kill("SIGTERM");
			setTimeout(() => {
				if (!child.killed) child.kill("SIGKILL");
			}, 3e3);
		}, timeoutMs);
		child.on("error", (err) => {
			if (timeoutHandle) clearTimeout(timeoutHandle);
			resolve({
				success: false,
				exitCode: null,
				stdout: stdout.trim(),
				stderr: (stderr + "\n" + err.message).trim(),
				timedOut: false
			});
		});
		child.on("close", (code, signal) => {
			if (timeoutHandle) clearTimeout(timeoutHandle);
			resolve({
				success: code === 0 && !timedOut,
				exitCode: code,
				stdout: stdout.trim(),
				stderr: stderr.trim(),
				timedOut,
				signal: signal ?? void 0
			});
		});
	});
}
//#endregion
//#region src/lib/magick/core.ts
/**
* ImageMagick 统一模块 - 底层执行封装
*
* 封装 magick CLI 调用，提供跨平台的命令执行能力。
* 所有上层模块（detection/render/dimensions）都通过此模块调用 magick。
*/
/** magick 可执行文件名 */
var MAGICK_CMD = "magick";
/**
* 执行 magick 命令
*
* @param args - 命令行参数（不含 magick 本身）
* @param timeoutMs - 超时时间（默认 30 秒）
* @returns 执行结果
*/
async function execMagick(args, timeoutMs = 3e4) {
	const result = await spawnExec(MAGICK_CMD, {
		args,
		timeoutMs
	});
	return {
		success: result.success,
		stdout: result.stdout,
		stderr: result.stderr,
		exitCode: result.exitCode
	};
}
//#endregion
//#region src/lib/magick/detection.ts
/**
* ImageMagick 统一模块 - 检测与信息
*
* 功能：
* - 检测 ImageMagick 是否安装
* - 列出系统字体
* - 列出支持的图像格式
*/
/**
* 检测 ImageMagick 环境
*
* 执行 `magick -version` 获取版本信息和支持格式
*/
async function detectEnvironment() {
	const versionResult = await execMagick(["-version"], 5e3);
	if (!versionResult.success) return {
		installed: false,
		error: `无法执行 'magick -version'。${versionResult.stderr || "请确保 ImageMagick 已安装并加入 PATH"}`
	};
	const version = versionResult.stdout.match(/ImageMagick\s+(\S+)/) ? versionResult.stdout.match(/ImageMagick\s+(\S+)/)?.[1] : void 0;
	const formatResult = await execMagick([
		"identify",
		"-list",
		"format"
	], 5e3);
	let formats;
	if (formatResult.success) formats = formatResult.stdout.split("\n").map((line) => line.trim().split(/\s+/)[0]).filter((fmt) => fmt && /^[A-Z0-9]+$/i.test(fmt)).slice(0, 50);
	return {
		installed: true,
		version,
		executable: "magick",
		formats
	};
}
/**
* 列出系统所有字体
*
* 执行 `magick identify -list font` 解析字体族名和文件路径
*/
async function listFonts$1() {
	const result = await execMagick([
		"identify",
		"-list",
		"font"
	], 1e4);
	if (!result.success) return [];
	const blocks = result.stdout.split(/^\s*Font:\s+/m).slice(1);
	const fonts = [];
	for (const block of blocks) {
		const familyMatch = block.match(/family:\s*(.+)$/m);
		const fileMatch = block.match(/glyphs:\s*(.+)$/m);
		if (familyMatch && fileMatch) fonts.push({
			family: familyMatch[1].trim(),
			file: fileMatch[1].trim()
		});
	}
	return fonts;
}
/**
* 列出支持的图像格式
*/
async function listFormats() {
	const result = await execMagick([
		"identify",
		"-list",
		"format"
	], 5e3);
	if (!result.success) return [];
	return result.stdout.split("\n").map((line) => line.trim().split(/\s+/)[0]).filter((fmt) => fmt && /^[A-Z0-9]+$/i.test(fmt)).slice(0, 100);
}
//#endregion
//#region src/lib/magick/render.ts
/**
* ImageMagick 统一模块 - SVG 渲染
*
* 功能：
* - SVG → PNG/JPEG/WebP 渲染
*/
/**
* 将 SVG 渲染为 PNG
*
* @param options - 渲染选项
* @returns 渲染结果
*/
async function renderSvg(options) {
	const { input, output, quality = 95, background = "transparent", density = "96", force = false } = options;
	const inputPath = resolve(input);
	if (!existsSync(inputPath)) return {
		success: false,
		error: `输入文件不存在: ${inputPath}`,
		exitCode: 2
	};
	const ext = extname(inputPath).toLowerCase();
	if (ext !== ".svg" && ext !== ".svgz") return {
		success: false,
		error: `输入文件不是 SVG: ${inputPath}`,
		exitCode: 2
	};
	const outputPath = resolve(output);
	if (existsSync(outputPath) && !force) return {
		success: false,
		error: `输出文件已存在: ${outputPath}（使用 force: true 或换文件名）`,
		exitCode: 2
	};
	const result = await execMagick([
		inputPath,
		"-background",
		background === "transparent" ? "none" : background,
		"-density",
		density,
		"-quality",
		String(quality),
		outputPath
	], 6e4);
	if (!result.success) return {
		success: false,
		error: `ImageMagick 渲染失败 (exit ${result.exitCode}): ${result.stderr}`,
		exitCode: result.exitCode ?? 1
	};
	return {
		success: true,
		outputFile: outputPath,
		exitCode: 0
	};
}
//#endregion
//#region src/lib/magick.ts
/**
* ImageMagick 命令封装（兼容层）
*
* 本文件保留是为了向后兼容已有的 import { magick } from '../lib/magick.js'。
* 新代码请直接使用 '../lib/magick/index.js'。
*
* 底层实现已迁移到 magick/ 模块：
* - magick/core.ts      底层 CLI 调用
* - magick/detection.ts 环境检测、字体、格式
* - magick/render.ts    SVG 渲染
* - magick/processor.ts ImageProcessor（组合注入）
* - magick/dimensions/  处理维度（几何/颜色/滤镜/艺术/格式）
*/
/**
* 检测 ImageMagick 环境（向后兼容旧 API）
*/
async function detectImageMagick() {
	return detectEnvironment();
}
/**
* 列出系统字体（向后兼容旧 API）
*/
async function listFonts(filter) {
	const allFonts = await listFonts$1();
	if (!filter) return allFonts;
	return allFonts.filter((f) => f.family.toLowerCase().includes(filter.toLowerCase()));
}
/**
* 获取环境信息（用于 info 命令）
*/
async function getInfo() {
	return detectImageMagick();
}
var magick = {
	detect: detectImageMagick,
	renderSvg,
	listFonts,
	listFormats,
	getInfo
};
//#endregion
//#region src/lib/font-detector.ts
/**
* 跨平台字体检测器
*
* 检测系统中可用的字体，支持三种检测后端（按优先级）：
* 1. ImageMagick `identify -list font`（最通用，跨平台一致）
* 2. fc-list（类 Unix 系统专用，ImageMagick 不可用时的回退）
* 3. 直接扫描文件系统（ImageMagick 和 fc-list 都没有时的最后手段）
*
* 输出统一的 FontInfo 数组，供 font-fallback.ts 决策。
*/
/**
* 检测系统所有可用字体
*
* 按优先级尝试三种后端：
* 1. ImageMagick（如果可用）
* 2. fc-list（类 Unix 系统）
* 3. 文件系统扫描（兜底，Windows 优先尝试）
*
* @returns 字体信息数组（可能为空，表示检测失败）
* @throws 不抛错；失败时返回空数组并通过 console.warn 提示原因
*
* @example
*   const fonts = await detectSystemFonts()
*   console.log(`检测到 ${fonts.length} 个字体`)
*/
async function detectSystemFonts() {
	if ((await magick.detect()).installed) {
		const imFonts = await detectViaImageMagick();
		if (imFonts.length > 0) return imFonts;
	}
	if (platform() !== "win32") {
		const fcFonts = await detectViaFcList();
		if (fcFonts.length > 0) return fcFonts;
	}
	return detectViaFilesystem();
}
/**
* 通过 ImageMagick 检测字体
*
* 命令：`magick identify -list font`
* 优点：跨平台行为一致，且 ImageMagick 自身就能用这些字体
*/
async function detectViaImageMagick() {
	return (await magick.listFonts()).map((f) => ({
		family: f.family,
		file: f.file,
		source: platform() === "win32" ? "windows" : platform() === "darwin" ? "macos" : "linux"
	}));
}
/**
* 通过 fc-list 检测字体（仅 macOS / Linux）
*
* 命令：`fc-list : family style file`
* 输出示例：
*   Arial:style=Regular:file=/usr/share/fonts/truetype/msttcorefonts/Arial.ttf
*
* 注意：fc-list 在某些环境下可能不存在（如 Docker 镜像），失败时返回空数组
*/
async function detectViaFcList() {
	const result = await spawnExec("fc-list", {
		args: [
			":",
			"family",
			"style",
			"file"
		],
		timeoutMs: 1e4
	});
	if (!result.success) return [];
	const fonts = [];
	const source = platform() === "darwin" ? "macos" : "linux";
	for (const line of result.stdout.split("\n")) {
		const match = line.match(/^(.+?):(.+?):file=(.+)$/);
		if (match) fonts.push({
			family: match[1].trim(),
			style: match[2].trim(),
			file: match[3].trim(),
			source
		});
	}
	return fonts;
}
/**
* 通过扫描文件系统检测字体
*
* Windows 平台扫描：
* - C:\Windows\Fonts （系统字体目录）
* - %LOCALAPPDATA%\Microsoft\Windows\Fonts （用户安装字体）
*
* 其他平台：
* - /usr/share/fonts （Linux 系统字体）
* - /usr/local/share/fonts （Linux 用户字体）
* - ~/Library/Fonts （macOS 用户字体）
* - /Library/Fonts （macOS 系统字体）
*
* 此方式是兜底方案，不如 IM 和 fc-list 准确：
* - 不支持读取字体的 family name（只能从文件名推断）
* - 可能把同一字体的多个 style 算成多个独立字体
*/
function detectViaFilesystem() {
	const dirs = getFontDirectories();
	const fonts = [];
	const source = platform() === "win32" ? "windows" : platform() === "darwin" ? "macos" : "linux";
	for (const dir of dirs) {
		if (!existsSync(dir)) continue;
		try {
			const files = listFontFiles(dir);
			for (const file of files) fonts.push({
				family: inferFamilyFromFilename(file),
				file,
				source
			});
		} catch {
			continue;
		}
	}
	return Promise.resolve(fonts);
}
/**
* 获取当前平台的字体目录列表
*/
function getFontDirectories() {
	const home = homedir();
	if (platform() === "win32") return [resolve("C:\\Windows\\Fonts"), join(home, "AppData", "Local", "Microsoft", "Windows", "Fonts")];
	if (platform() === "darwin") return [
		"/Library/Fonts",
		join(home, "Library", "Fonts"),
		"/System/Library/Fonts"
	];
	return [
		"/usr/share/fonts",
		"/usr/local/share/fonts",
		join(home, ".fonts"),
		join(home, ".local", "share", "fonts")
	];
}
var FONT_EXTENSIONS = new Set([
	".ttf",
	".otf",
	".ttc",
	".otc",
	".woff",
	".woff2",
	".pfb"
]);
/**
* 递归列出目录下所有字体文件
*/
function listFontFiles(dir, depth = 0) {
	if (depth > 3) return [];
	const results = [];
	try {
		const entries = readdirSync(dir, { withFileTypes: true });
		for (const entry of entries) {
			const full = join(dir, entry.name);
			if (entry.isDirectory()) results.push(...listFontFiles(full, depth + 1));
			else if (entry.isFile()) {
				const ext = entry.name.substring(entry.name.lastIndexOf(".")).toLowerCase();
				if (FONT_EXTENSIONS.has(ext)) results.push(full);
			}
		}
	} catch {}
	return results;
}
/**
* 从文件名推断字体族名
*
* 策略：
* 1. 移除扩展名
* 2. 转换分隔符（- _）为空格
* 3. 移除常见的 style 后缀（Regular/Bold/Italic/...）
* 4. 首字母大写
*
* 示例：
* - 'Arial.ttf'             → 'Arial'
* - 'arial-bold-italic.otf' → 'Arial'
* - 'msyh.ttc'              → 'Msyh'（注：中文名无法推断，依赖 IM/fc-list）
*/
function inferFamilyFromFilename(filePath) {
	const fileName = filePath.substring(filePath.lastIndexOf("/") + 1).replace(/\\/g, "/");
	const baseName = fileName.substring(0, fileName.lastIndexOf(".")) || fileName;
	const STYLE_PATTERNS = [/[-_](regular|bold|italic|light|medium|semibold|thin|black|heavy|extralight|condensed|book)(-\w+)?$/i, /[-_](normal|bolditalic|bolditalic|demibold|extrabold|hairline)(-\w+)?$/i];
	let name = baseName;
	for (const pattern of STYLE_PATTERNS) name = name.replace(pattern, "");
	return name.split(/[-_]/).filter((s) => s.length > 0).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}
//#endregion
//#region src/lib/font-fallback.ts
/**
* 字体 Fallback 策略模块
*
* 核心功能：
* - 优先从 references/font-handling.jsonc 读取由 font-chain.mjs 生成的字体链
* - JSONC 不存在时，使用内置硬编码默认候选列表（兜底）
* - 支持自定义候选策略
*
* 设计目标：
* - JSONC 中的字体名来自 magick identify -list font，是当前系统真实可用的
* - 硬编码列表作为 fallback，保证首次使用也能工作
* - 用户可通过编辑 JSONC 自定义字体优先级
*/
/**
* 解析 JSONC（去除注释后 JSON.parse）
*
* 支持 // 单行注释和 /* ... * / 多行注释，正确处理字符串内的 //
*/
function parseJsonc(text) {
	let result = "";
	let i = 0;
	while (i < text.length) {
		if (text[i] === "\"") {
			result += text[i++];
			while (i < text.length && text[i] !== "\"") {
				if (text[i] === "\\") result += text[i++];
				result += text[i++];
			}
			if (i < text.length) result += text[i++];
			continue;
		}
		if (text[i] === "/" && text[i + 1] === "*") {
			i += 2;
			while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i++;
			i += 2;
			continue;
		}
		if (text[i] === "/" && text[i + 1] === "/") {
			while (i < text.length && text[i] !== "\n") i++;
			continue;
		}
		result += text[i++];
	}
	return JSON.parse(result);
}
/**
* 尝试加载 font-handling.jsonc
*
* 查找路径：相对于当前脚本位置向上两级，进入 references/font-handling.jsonc
* 即：scripts/dist/*.mjs → ../../references/font-handling.jsonc
*
* @returns 解析后的配置，或 null（文件不存在或解析失败）
*/
function loadFontChainConfig() {
	try {
		const jsoncPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../references/font-handling.jsonc");
		if (!readFileSync) return null;
		return parseJsonc(readFileSync(jsoncPath, "utf-8"));
	} catch {
		return null;
	}
}
/**
* 适合代码 / CLI / 博客封面的西文字体候选（等宽字体优先）
*/
var DEFAULT_CODE_FONT_CANDIDATES = [
	"Cascadia Code",
	"Cascadia Mono",
	"Cascadia Next SC NF",
	"Cascadia Next",
	"Fira Code",
	"Fira Mono",
	"JetBrains Mono",
	"JetBrains Mono NL",
	"Hack",
	"Source Code Pro",
	"IBM Plex Mono",
	"Consolas",
	"DejaVu Sans Mono",
	"Courier New"
];
/**
* 中文字体候选（按平台分组）
*/
var DEFAULT_CJK_FONT_CANDIDATES = [
	"Microsoft YaHei",
	"Microsoft YaHei UI",
	"DengXian",
	"SimHei",
	"SimSun",
	"PingFang SC",
	"STHeiti",
	"Hiragino Sans GB",
	"Noto Sans CJK SC",
	"Noto Sans CJK",
	"WenQuanYi Micro Hei",
	"WenQuanYi Zen Hei",
	"Source Han Sans CN",
	"Source Han Sans SC",
	"Adobe Song Std"
];
/**
* 获取字体候选列表
*
* 优先从 font-handling.jsonc 读取（由 font-chain.mjs 生成）
* JSONC 不存在或解析失败时，使用硬编码默认值
*/
function getCodeCandidates() {
	const config = loadFontChainConfig();
	if (config?.code?.chain?.length) return config.code.chain;
	return DEFAULT_CODE_FONT_CANDIDATES;
}
function getCjkCandidates() {
	const config = loadFontChainConfig();
	if (config?.cjk?.chain?.length) return config.cjk.chain;
	return DEFAULT_CJK_FONT_CANDIDATES;
}
/**
* 在字体列表中查找某个字体族名（不区分大小写，支持别名）
*/
function findFont(fonts, targetFamily) {
	const normalized = targetFamily.toLowerCase().replace(/\s+/g, " ").trim();
	for (const font of fonts) {
		const fontFam = font.family.toLowerCase().replace(/\s+/g, " ").trim();
		if (fontFam === normalized || fontFam.startsWith(normalized + " ")) return font;
	}
	return null;
}
/**
* 按候选列表查找字体（含 fallback）
*/
function resolveFont(fonts, requested, strategy = {
	candidates: getCodeCandidates(),
	allowCJK: true,
	verbose: true
}) {
	if (requested) {
		const exact = findFont(fonts, requested);
		if (exact) return {
			matched: true,
			usedName: exact.family,
			source: "exact",
			requestedName: requested,
			file: exact.file
		};
	}
	for (const cand of strategy.candidates) {
		const font = findFont(fonts, cand);
		if (font) return {
			matched: true,
			usedName: font.family,
			source: requested ? "fallback" : "exact",
			requestedName: requested ?? cand,
			file: font.file,
			warning: requested && strategy.verbose ? `用户请求的字体 "${requested}" 不可用，已降级到 "${font.family}"` : void 0
		};
	}
	if (strategy.allowCJK) for (const cjk of getCjkCandidates()) {
		const font = findFont(fonts, cjk);
		if (font) return {
			matched: true,
			usedName: font.family,
			source: "fallback",
			requestedName: requested ?? strategy.candidates[0] ?? "",
			file: font.file,
			warning: `所有候选字体均不可用，已降级到中文字体 "${font.family}"`
		};
	}
	return {
		matched: false,
		usedName: "system-ui",
		source: "missing",
		requestedName: requested ?? strategy.candidates[0] ?? "",
		warning: "系统中未检测到任何合适字体，将使用浏览器默认字体"
	};
}
//#endregion
//#region src/lib/colors.ts
/**
* 终端颜色输出工具（替代 chalk 依赖，减小打包体积）
*
* 工作原理：
* - 使用 ANSI 转义码实现颜色
* - 自动检测 TTY 环境，非 TTY 时禁用颜色（CI 友好）
* - 支持 NO_COLOR 环境变量（现代约定）
* - 支持 FORCE_COLOR 强制启用
*
* 用法：
*   import { colors } from '../lib/colors'
*   console.log(colors.green('✓ 成功'))
*   console.log(colors.bold(colors.red('✗ 失败')))
*/
var ANSI_CODES = {
	reset: [0, 0],
	bold: [1, 22],
	dim: [2, 22],
	italic: [3, 23],
	underline: [4, 24],
	inverse: [7, 27],
	strikethrough: [9, 29],
	black: [30, 39],
	red: [31, 39],
	green: [32, 39],
	yellow: [33, 39],
	blue: [34, 39],
	magenta: [35, 39],
	cyan: [36, 39],
	white: [37, 39],
	gray: [90, 39],
	redBright: [91, 39],
	greenBright: [92, 39],
	yellowBright: [93, 39],
	blueBright: [94, 39],
	magentaBright: [95, 39],
	cyanBright: [96, 39],
	bgRed: [41, 49],
	bgGreen: [42, 49],
	bgYellow: [43, 49],
	bgBlue: [44, 49]
};
/**
* 检测颜色是否应启用
*
* 启用规则：
* 1. FORCE_COLOR env 存在 → 强制启用
* 2. NO_COLOR env 存在 → 强制禁用（约定：https://no-color.org/）
* 3. stdout 不是 TTY → 禁用（通常是管道/CI 环境）
* 4. 其他情况启用
*/
function shouldEnableColors() {
	if (process.env["FORCE_COLOR"] !== void 0) return true;
	if (process.env["NO_COLOR"] !== void 0) return false;
	return Boolean(process.stdout.isTTY);
}
var ENABLED = shouldEnableColors();
/**
* 构造颜色函数（内部工具）
*
* @param openCode - 启用 ANSI 码
* @param closeCode - 关闭 ANSI 码
* @returns 字符串染色函数
*/
function makeColorFn(openCode, closeCode) {
	return (text) => {
		if (!ENABLED) return text;
		return `\x1b[${openCode}m${text}\x1b[${closeCode}m`;
	};
}
/**
* 公共颜色 API
*
* 支持的颜色与样式：
* - 样式：bold, dim, italic, underline, inverse, strikethrough
* - 前景色：black, red, green, yellow, blue, magenta, cyan, white, gray
* - 高亮色：redBright, greenBright, yellowBright, blueBright, magentaBright, cyanBright
* - 背景色：bgRed, bgGreen, bgYellow, bgBlue
*/
var colors = {
	reset: makeColorFn(...ANSI_CODES.reset),
	bold: makeColorFn(...ANSI_CODES.bold),
	dim: makeColorFn(...ANSI_CODES.dim),
	italic: makeColorFn(...ANSI_CODES.italic),
	underline: makeColorFn(...ANSI_CODES.underline),
	inverse: makeColorFn(...ANSI_CODES.inverse),
	strikethrough: makeColorFn(...ANSI_CODES.strikethrough),
	black: makeColorFn(...ANSI_CODES.black),
	red: makeColorFn(...ANSI_CODES.red),
	green: makeColorFn(...ANSI_CODES.green),
	yellow: makeColorFn(...ANSI_CODES.yellow),
	blue: makeColorFn(...ANSI_CODES.blue),
	magenta: makeColorFn(...ANSI_CODES.magenta),
	cyan: makeColorFn(...ANSI_CODES.cyan),
	white: makeColorFn(...ANSI_CODES.white),
	gray: makeColorFn(...ANSI_CODES.gray),
	redBright: makeColorFn(...ANSI_CODES.redBright),
	greenBright: makeColorFn(...ANSI_CODES.greenBright),
	yellowBright: makeColorFn(...ANSI_CODES.yellowBright),
	blueBright: makeColorFn(...ANSI_CODES.blueBright),
	magentaBright: makeColorFn(...ANSI_CODES.magentaBright),
	cyanBright: makeColorFn(...ANSI_CODES.cyanBright),
	bgRed: makeColorFn(...ANSI_CODES.bgRed),
	bgGreen: makeColorFn(...ANSI_CODES.bgGreen),
	bgYellow: makeColorFn(...ANSI_CODES.bgYellow),
	bgBlue: makeColorFn(...ANSI_CODES.bgBlue)
};
/**
* 检测当前环境是否启用颜色
*
* @returns true 表示颜色已启用
*/
function isColorEnabled() {
	return ENABLED;
}
//#endregion
//#region src/lib/logger.ts
/**
* 统一日志输出工具
*
* 用途：
* - 在终端输出彩色日志（自动适配 TTY/非 TTY）
* - 支持 --json 模式输出 JSON（供 AI 解析）
* - 支持 --quiet 模式完全静默
* - 前缀图标（✓ ✗ ⚠ ℹ）便于识别
*
* 用法：
*   const log = createLogger({ json: false, quiet: false })
*   log.info('开始处理')
*   log.success('渲染完成', { output: 'a.png' })
*   log.error('失败', { reason: '找不到 ImageMagick' })
*/
/**
* 日志级别配置表（图标 + 颜色 + stderr/stdout 选择）
*/
var LEVEL_CONFIG = {
	info: {
		icon: "ℹ",
		color: colors.blue,
		useStderr: false
	},
	success: {
		icon: "✓",
		color: colors.green,
		useStderr: false
	},
	warn: {
		icon: "⚠",
		color: colors.yellow,
		useStderr: true
	},
	error: {
		icon: "✗",
		color: colors.red,
		useStderr: true
	},
	debug: {
		icon: "·",
		color: colors.gray,
		useStderr: true
	}
};
/**
* 创建日志记录器
*
* @param options - 日志配置
* @returns 日志记录器对象
*
* @example
*   const log = createLogger({ prefix: 'render' })
*   log.info('开始', { input: 'a.svg' })
*   // 输出: ℹ [render] 开始 { input: 'a.svg' }
*/
function createLogger(options = {}) {
	const { json = false, quiet = false, debug = false, prefix } = options;
	/**
	* 通用日志写入（内部函数）
	*
	* @param level - 日志级别
	* @param message - 文本消息
	* @param data - 附加数据（可选）
	*/
	function write(level, message, data) {
		if (quiet) return;
		const config = LEVEL_CONFIG[level];
		const stream = config.useStderr ? process.stderr : process.stdout;
		if (json) {
			const payload = {
				level,
				prefix,
				message,
				...data ? { data } : {},
				timestamp: (/* @__PURE__ */ new Date()).toISOString()
			};
			stream.write(JSON.stringify(payload) + "\n");
			return;
		}
		let line = `${isColorEnabled() ? config.color(config.icon) : config.icon} ${prefix ? colors.dim(`[${prefix}] `) : ""}${message}`;
		if (data && Object.keys(data).length > 0) line += " " + colors.dim(JSON.stringify(data));
		stream.write(line + "\n");
	}
	return {
		info: (message, data) => write("info", message, data),
		success: (message, data) => write("success", message, data),
		warn: (message, data) => write("warn", message, data),
		error: (message, data) => write("error", message, data),
		debug: (message, data) => {
			if (debug) write("debug", message, data);
		},
		raw: (text) => {
			if (!quiet) process.stdout.write(text);
		}
	};
}
createLogger();
//#endregion
//#region src/bin/info.ts
/**
* imagegen-magick 环境信息检查工具
*
* 用途：
* - 检查 Node.js 版本
* - 检查 ImageMagick 是否安装
* - 检查系统中可用的字体
* - 检查推荐字体（Cascadia Code）是否可用
* - 输出汇总报告（人类可读或 JSON format）
*
* 调用示例：
*   node info.mjs                       # 人类可读输出
*   node info.mjs --json                # JSON 输出（供 AI 解析）
*   node info.mjs --preferred "Cascadia Code" # 检查特定字体
*
* 退出码规范：
* - 0: 所有核心依赖就绪（IM + 至少一个字体）
* - 1: ImageMagick 缺失（无法渲染 SVG）
* - 3: 依赖缺失（详见输出）
*/
var opts = new Command().name("info").description("检查 imagegen-magick 技能的运行环境").option("--json", "以 JSON 格式输出，便于 AI 解析", false).option("--quiet", "完全静默，只输出结构化结果", false).option("--preferred <name>", "首选字体名（默认 \"Cascadia Code\"）", "Cascadia Code").option("--debug", "显示调试信息", false).parse().opts();
var log = createLogger({
	json: opts.json,
	quiet: opts.quiet,
	debug: opts.debug
});
/**
* 主流程：收集环境信息并输出
*/
async function main() {
	log.info("正在收集环境信息...");
	const nodeVersion = process.version;
	log.debug("Node 版本检测完成", { node: nodeVersion });
	log.info("检测 ImageMagick...");
	const imInfo = await magick.detect();
	if (imInfo.installed) log.success(`ImageMagick 已安装`, {
		version: imInfo.version,
		executable: imInfo.executable,
		formatCount: imInfo.formats?.length ?? 0
	});
	else log.error("ImageMagick 未检测到", { reason: imInfo.error });
	log.info("扫描系统字体...");
	const allFonts = await detectSystemFonts();
	log.debug("字体扫描完成", { count: allFonts.length });
	log.info(`检查首选字体 "${opts.preferred}"...`);
	const preferredMatch = resolveFont(allFonts, opts.preferred, {
		candidates: DEFAULT_CODE_FONT_CANDIDATES,
		allowCJK: true,
		verbose: true
	});
	if (preferredMatch.source === "exact") log.success("首选字体可用", { usedName: preferredMatch.usedName });
	else if (preferredMatch.source === "fallback") log.warn(preferredMatch.warning ?? "已降级到其他字体", {
		requested: preferredMatch.requestedName,
		used: preferredMatch.usedName
	});
	else log.error("未找到合适字体", { reason: preferredMatch.warning });
	const availableCJKFonts = allFonts.filter((f) => [
		"Microsoft YaHei",
		"DengXian",
		"SimHei",
		"SimSun",
		"PingFang",
		"Hiragino",
		"Noto Sans CJK",
		"WenQuanYi",
		"Source Han"
	].some((prefix) => f.family.toLowerCase().includes(prefix.toLowerCase()))).map((f) => f.family).slice(0, 10);
	const issues = [];
	if (!imInfo.installed) issues.push("ImageMagick 未安装 - 无法渲染 SVG 为 PNG");
	if (allFonts.length === 0) issues.push("未检测到任何系统字体 - SVG 文字可能渲染为默认字体");
	if (availableCJKFonts.length === 0) issues.push("未检测到中文字体 - 中文内容可能显示为方块");
	if (preferredMatch.source === "missing") issues.push(`首选字体 "${opts.preferred}" 及其所有候选都不可用`);
	const envInfo = {
		node: nodeVersion,
		platform: `${process.platform} ${process.arch}`,
		imagemagick: imInfo,
		preferredFont: preferredMatch,
		totalFonts: allFonts.length,
		availableCJKFonts,
		issues
	};
	if (opts.json) process.stdout.write(JSON.stringify(envInfo, null, 2) + "\n");
	else {
		process.stdout.write("\n");
		process.stdout.write(colors.bold(colors.cyan("=== imagegen-magick 环境信息 ===\n\n")));
		process.stdout.write(colors.bold("🖥️  Node.js:\n"));
		process.stdout.write(`   版本: ${colors.green(nodeVersion)}\n`);
		process.stdout.write(`   平台: ${process.platform} ${process.arch}\n`);
		process.stdout.write(`   工作目录: ${process.cwd()}\n\n`);
		process.stdout.write(colors.bold("🎨 ImageMagick:\n"));
		if (imInfo.installed) {
			process.stdout.write(`   状态: ${colors.green("✓ 已安装")}\n`);
			process.stdout.write(`   版本: ${colors.green(imInfo.version ?? "未知")}\n`);
			process.stdout.write(`   命令: ${imInfo.executable}\n`);
			process.stdout.write(`   支持格式: ${imInfo.formats?.length ?? 0} 个\n`);
		} else {
			process.stdout.write(`   状态: ${colors.red("✗ 未安装")}\n`);
			process.stdout.write(`   原因: ${colors.yellow(imInfo.error ?? "未知")}\n`);
		}
		process.stdout.write("\n");
		process.stdout.write(colors.bold("🔤 系统字体:\n"));
		process.stdout.write(`   总数: ${colors.blue(String(allFonts.length))} 个\n`);
		process.stdout.write(`   中文字体: ${availableCJKFonts.length} 个\n`);
		if (availableCJKFonts.length > 0) process.stdout.write(`   (示例: ${availableCJKFonts.slice(0, 3).join(", ")}${availableCJKFonts.length > 3 ? "..." : ""})\n`);
		process.stdout.write("\n");
		process.stdout.write(colors.bold(`🔍 首选字体 ("${opts.preferred}"):\n`));
		if (preferredMatch.source === "exact") {
			process.stdout.write(`   状态: ${colors.green("✓ 精确匹配")}\n`);
			process.stdout.write(`   字体: ${colors.green(preferredMatch.usedName)}\n`);
		} else if (preferredMatch.source === "fallback") {
			process.stdout.write(`   状态: ${colors.yellow("⚠ 降级")}\n`);
			process.stdout.write(`   请求: ${opts.preferred}\n`);
			process.stdout.write(`   实际: ${colors.yellow(preferredMatch.usedName)}\n`);
		} else {
			process.stdout.write(`   状态: ${colors.red("✗ 未匹配")}\n`);
			if (preferredMatch.warning) process.stdout.write(`   原因: ${colors.red(preferredMatch.warning)}\n`);
		}
		process.stdout.write("\n");
		if (issues.length > 0) {
			process.stdout.write(colors.bold("⚠️  发现问题:\n"));
			for (const issue of issues) process.stdout.write(`   ${colors.yellow("⚠")} ${issue}\n`);
			process.stdout.write("\n");
		} else process.stdout.write(colors.bold(colors.green("✓ 环境就绪，可以正常使用 imagegen-magick\n")));
	}
	if (!imInfo.installed) process.exit(3);
	if (issues.filter((i) => !i.includes("中文字体")).length > 0) process.exit(1);
	process.exit(0);
}
main().catch((err) => {
	log.error("info 命令执行失败", { error: err.message });
	if (opts.debug) console.error(err);
	process.exit(1);
});
//#endregion
export {};

//# sourceMappingURL=info.js.map