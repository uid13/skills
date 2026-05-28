import { Command } from "commander";
import { existsSync, readdirSync, statSync } from "node:fs";
import { homedir, platform } from "node:os";
import { extname, isAbsolute, join, resolve } from "node:path";
import { spawn } from "node:child_process";
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
//#region src/utils/path.ts
/**
* 路径处理辅助工具
*
* 跨平台路径相关的通用函数，避免在不同模块重复实现。
*/
/**
* 检查文件是否存在且为普通文件
*
* @param path - 文件路径
* @returns true 表示存在且不是目录
*/
function isFile(path) {
	try {
		return existsSync(path) && statSync(path).isFile();
	} catch {
		return false;
	}
}
/**
* 确保路径为绝对路径（相对于 cwd 转换）
*
* @param path - 输入路径
* @param cwd - 基准目录（默认 process.cwd()）
*/
function toAbsolutePath(path, cwd = process.cwd()) {
	return isAbsolute(path) ? path : resolve(cwd, path);
}
/**
* 获取文件扩展名（带点号，小写）
*
* 示例：'image.PNG' → '.png'
*/
function getExt(filePath) {
	return extname(filePath).toLowerCase();
}
/**
* 检查文件扩展名是否在支持列表中
*
* @param filePath - 文件路径
* @param allowed - 允许的扩展名列表（带或不带点号皆可）
*/
function hasAllowedExt(filePath, allowed) {
	const ext = getExt(filePath).replace(/^\./, "");
	return allowed.some((a) => a.replace(/^\./, "").toLowerCase() === ext);
}
//#endregion
//#region src/lib/magick.ts
/**
* ImageMagick 命令封装
*
* 功能：
* 1. 检测 ImageMagick 是否已安装，获取版本信息
* 2. SVG → PNG 高质量渲染（含字体处理）
* 3. 列出 ImageMagick 识别的系统中文字体
*
* 设计说明：
* - ImageMagick 7+ 的所有命令都以 `magick` 开头（旧版 6 用 `convert`，已不考虑）
* - 本模块只封装命令构造与执行，不包含业务逻辑（由 bin/*.ts 决定如何调用）
* - 所有命令失败时返回详细错误信息（包含 stderr），便于诊断
*
* 用法：
*   import { magick } from '../lib/magick'
*
*   // 检测环境
*   const info = await magick.detect()
*
*   // 渲染 SVG
*   await magick.renderSvg('input.svg', 'output.png', { scale: '2x' })
*
*   // 列出字体
*   const fonts = await magick.listFonts('Cascadia')
*/
var MAGICK_CMD = "magick";
/**
* 检测 ImageMagick 是否已安装并获取基本信息
*
* 执行 `magick -version` 解析输出，提取：
* - 版本号 (如 '7.1.2-24')
* - 可执行文件路径
* - 支持的图像格式列表（如 'PNG SVG JPEG ...'）
*
* @returns 检测结果（installed=false 表示未安装）
*
* @example
*   const info = await detectImageMagick()
*   if (!info.installed) {
*     console.error('请先安装 ImageMagick:', info.error)
*   } else {
*     console.log('已安装版本:', info.version)
*   }
*/
async function detectImageMagick() {
	const versionResult = await spawnExec(MAGICK_CMD, {
		args: ["-version"],
		timeoutMs: 5e3
	});
	if (!versionResult.success) return {
		installed: false,
		error: `无法执行 '${MAGICK_CMD} -version'。${versionResult.stderr || "请确保 ImageMagick 已安装并加入 PATH"}`
	};
	const versionMatch = versionResult.stdout.match(/ImageMagick\s+(\S+)/);
	const version = versionMatch ? versionMatch[1] : void 0;
	const formatResult = await spawnExec(MAGICK_CMD, {
		args: [
			"identify",
			"-list",
			"format"
		],
		timeoutMs: 5e3
	});
	let formats;
	if (formatResult.success) formats = formatResult.stdout.split("\n").map((line) => line.trim().split(/\s+/)[0]).filter((fmt) => fmt && /^[A-Z0-9]+$/i.test(fmt)).slice(0, 50);
	return {
		installed: true,
		version,
		executable: MAGICK_CMD,
		formats
	};
}
/**
* 渲染 SVG 为 PNG（核心函数）
*
* 工作流程：
* 1. 验证输入 SVG 文件存在且扩展名正确
* 2. 检查输出文件是否已存在（非 force 模式会拒绝覆盖）
* 3. 构造 magick 命令（带所有渲染参数）
* 4. 执行并捕获 stdout/stderr
*
* 关键参数说明：
* - `-background`：渲染前的背景色（'none' 表示透明）
* - `-density 96`：DPI，用于缩放（96 × 2 = 192 DPI → 2x 质量）
* - `-resize WxH`：缩放输出尺寸
* - `-quality 95`：PNG 质量（影响压缩率，不影响清晰度）
*
* @param options - 渲染选项
* @returns 渲染结果（成功/失败 + 错误信息）
*
* @example
*   const result = await renderSvg({
*     input: './cover.svg',
*     output: './cover.png',
*     scale: '2x',
*     background: 'transparent',
*   })
*   if (!result.success) {
*     console.error('渲染失败:', result.error)
*   }
*/
async function renderSvg(options) {
	const { input, output, quality = 95, background = "transparent", density = "96", force = false } = options;
	const inputPath = toAbsolutePath(input);
	if (!isFile(inputPath)) return {
		success: false,
		error: `输入文件不存在: ${inputPath}`,
		exitCode: 2
	};
	if (!hasAllowedExt(inputPath, ["svg", "svgz"])) return {
		success: false,
		error: `输入文件不是 SVG: ${inputPath}（需要 .svg 或 .svgz 扩展名）`,
		exitCode: 2
	};
	const outputPath = toAbsolutePath(output);
	if (isFile(outputPath) && !force) return {
		success: false,
		error: `输出文件已存在: ${outputPath}（使用 force: true 或换文件名）`,
		exitCode: 2
	};
	const result = await spawnExec(MAGICK_CMD, {
		args: [...[
			inputPath,
			"-background",
			background === "transparent" ? "none" : background,
			"-density",
			density,
			"-quality",
			String(quality)
		], outputPath],
		timeoutMs: 6e4
	});
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
/**
* 列出 ImageMagick 识别的系统字体
*
* 工作原理：
* - 执行 `magick identify -list font`
* - 解析输出，提取字体族名和文件路径
*
* 输出示例：
* ```
* Font: Arial
*   family: Arial
*   style: Normal
*   glyphs: C:/Windows/Fonts/ARIAL.TTF
* ```
*
* @param filter - 可选过滤关键字（不区分大小写，匹配 family 名）
* @returns 字体列表数组，每项含 family+file
*
* @example
*   const fonts = await listFonts('Cascadia')
*   // 返回: [{family: 'Cascadia Code', file: '...'}]
*/
async function listFonts(filter) {
	const result = await spawnExec(MAGICK_CMD, {
		args: [
			"identify",
			"-list",
			"font"
		],
		timeoutMs: 1e4
	});
	if (!result.success) return [];
	const blocks = result.stdout.split(/^Font:\s+/m).slice(1);
	const fonts = [];
	for (const block of blocks) {
		const familyMatch = block.match(/family:\s*(.+)$/m);
		const fileMatch = block.match(/glyphs:\s*(.+)$/m);
		if (familyMatch && fileMatch) {
			const family = familyMatch[1].trim();
			const file = fileMatch[1].trim();
			if (!filter || family.toLowerCase().includes(filter.toLowerCase())) fonts.push({
				family,
				file
			});
		}
	}
	return fonts;
}
/**
* 获取完整 ImageMagick 环境信息（用于 info 命令）
*
* 这是一个便捷的聚合函数，调用内部各个检测流程。
* 被 bin/info.ts 调用，输出完整环境报告。
*/
async function getInfo() {
	return detectImageMagick();
}
var magick = {
	detect: detectImageMagick,
	renderSvg,
	listFonts,
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
* 适合代码 / CLI / 博客封面的西文字体候选（等宽字体优先）
*
* 候选理由：
* - Cascadia Code/Mono/Next：VSCode 默认，支持 Nerd Font 图标
* - Fira Code：流行开发字体，连字优秀
* - JetBrains Mono：IDEA 默认，清晰易读
* - Hack：开源经典等宽字体
* - Consolas：Windows 自带，老一代等宽
* - Courier New：兜底等宽（几乎所有系统都有）
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
*
* Windows：微软雅黑 → 等线 → 仿宋
* macOS：  PingFang SC → STHeiti
* Linux：  Noto Sans CJK SC → WenQuanYi
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
* 西文无衬线字体候选（通用 UI）
*/
var DEFAULT_SANS_FONT_CANDIDATES = [
	"Inter",
	"Roboto",
	"SF Pro Display",
	"SF Pro Text",
	"Segoe UI",
	"Open Sans",
	"Lato",
	"Noto Sans",
	"Arial",
	"Helvetica",
	"Helvetica Neue"
];
/**
* 西文衬线字体候选（长文阅读）
*/
var DEFAULT_SERIF_FONT_CANDIDATES = [
	"Charter",
	"Source Serif Pro",
	"Georgia",
	"Cambria",
	"Times New Roman",
	"Noto Serif"
];
/**
* 在字体列表中查找某个字体族名（不区分大小写，支持别名）
*
* @param fonts - 系统字体列表
* @param targetFamily - 期望字体族名
* @returns 匹配到的字体信息，或 null
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
*
* @param fonts - 系统中可用字体列表
* @param requested - 用户请求的字体（可选；不传则从 candidates 第一项开始）
* @param strategy - 备选策略
* @returns 匹配结果
*
* @example
*   const result = resolveFont(systemFonts, 'Cascadia Code', {
*     candidates: DEFAULT_CODE_FONT_CANDIDATES,
*     allowCJK: true,
*     verbose: true,
*   })
*
*   if (result.source === 'exact') {
*     // 用户请求字体可用
*   } else if (result.source === 'fallback') {
*     // 降级到备选字体
*   } else {
*     // 系统完全无中文字体，警告
*   }
*/
function resolveFont(fonts, requested, strategy = {
	candidates: DEFAULT_CODE_FONT_CANDIDATES,
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
	if (strategy.allowCJK) for (const cjk of DEFAULT_CJK_FONT_CANDIDATES) {
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
//#region src/bin/check-fonts.ts
/**
* 字体检测与推荐工具
*
* 用途：
* - 列出系统中所有可用的字体
* - 按关键字过滤字体
* - 检测推荐字体（代码/中文/衬线/无衬线）的可用性
* - 为 SVG 设计提供字体建议
*
* 调用示例：
*   node check-fonts.mjs                       # 列出所有字体
*   node check-fonts.mjs --filter "Cascadia"   # 过滤关键字
*   node check-fonts.mjs --recommend "code"    # 显示代码字体推荐
*   node check-fonts.mjs --json                # JSON 输出
*/
var RECOMMEND_SCENARIOS = {
	code: DEFAULT_CODE_FONT_CANDIDATES,
	cjk: DEFAULT_CJK_FONT_CANDIDATES,
	chinese: DEFAULT_CJK_FONT_CANDIDATES,
	sans: DEFAULT_SANS_FONT_CANDIDATES,
	serif: DEFAULT_SERIF_FONT_CANDIDATES
};
var opts = new Command().name("check-fonts").description("检测和推荐系统字体").option("--filter <keyword>", "按关键字过滤字体（不区分大小写）").option("--recommend <scenario>", "显示推荐字体（code/cjk/sans/serif）").option("--limit <n>", "最多显示的字体数量", (s) => parseInt(s, 10), 50).option("--json", "JSON 格式输出", false).option("--quiet", "静默模式", false).option("--debug", "调试模式", false).parse().opts();
var log = createLogger({
	json: opts.json,
	quiet: opts.quiet,
	debug: opts.debug
});
async function main() {
	log.info("扫描系统字体...");
	const allFonts = await detectSystemFonts();
	log.debug("扫描完成", { count: allFonts.length });
	if (allFonts.length === 0) {
		log.warn("未检测到任何字体（可能 ImageMagick 和 fc-list 都不可用）");
		if (!opts.json) process.stdout.write("\n" + colors.yellow("⚠ 没有检测到任何字体。请尝试安装 ImageMagick 或 fc-list。\n"));
		process.exit(0);
	}
	if (opts.recommend) {
		const scenario = opts.recommend.toLowerCase();
		const candidates = RECOMMEND_SCENARIOS[scenario];
		if (!candidates) {
			log.error(`未知推荐场景: ${opts.recommend}`, { available: Object.keys(RECOMMEND_SCENARIOS).join(", ") });
			process.exit(2);
		}
		log.info(`评估 "${scenario}" 场景字体推荐...`);
		const results = candidates.map((cand) => ({
			candidate: cand,
			result: resolveFont(allFonts, cand, {
				candidates: [cand],
				allowCJK: false,
				verbose: false
			})
		}));
		const availableCount = results.filter((r) => r.result.matched).length;
		if (opts.json) process.stdout.write(JSON.stringify({
			scenario,
			candidates,
			availableCount,
			results: results.map((r) => ({
				name: r.candidate,
				available: r.result.matched,
				usedName: r.result.usedName,
				source: r.result.source,
				file: r.result.file
			}))
		}, null, 2) + "\n");
		else {
			process.stdout.write("\n");
			process.stdout.write(colors.bold(colors.cyan(`=== ${scenario} 场景字体推荐 ===\n\n`)));
			process.stdout.write(`可用: ${colors.green(String(availableCount))} / ${candidates.length} 个\n\n`);
			for (const { candidate, result } of results) if (result.matched && result.source === "exact") process.stdout.write(`  ${colors.green("✓")} ${colors.green(candidate.padEnd(25))} ${colors.dim(result.file ?? "")}\n`);
			else process.stdout.write(`  ${colors.gray("✗")} ${colors.gray(candidate.padEnd(25))}\n`);
			process.stdout.write("\n");
			const firstAvailable = results.find((r) => r.result.matched);
			if (firstAvailable) process.stdout.write(colors.bold("推荐首选: ") + colors.green(firstAvailable.result.usedName) + "\n\n");
		}
		process.exit(0);
	}
	let fontsToShow;
	if (opts.filter) {
		const keyword = opts.filter.toLowerCase();
		fontsToShow = allFonts.filter((f) => f.family.toLowerCase().includes(keyword) || f.file.toLowerCase().includes(keyword));
		log.info(`按 "${opts.filter}" 过滤`, { count: fontsToShow.length });
	} else fontsToShow = allFonts;
	const limited = fontsToShow.slice(0, opts.limit);
	if (opts.json) process.stdout.write(JSON.stringify({
		total: allFonts.length,
		shown: limited.length,
		fonts: limited.map((f) => ({
			family: f.family,
			file: f.file,
			source: f.source
		}))
	}, null, 2) + "\n");
	else {
		process.stdout.write("\n");
		process.stdout.write(colors.bold(colors.cyan(`=== 系统字体 (${allFonts.length} 个) ===\n\n`)));
		if (opts.filter) process.stdout.write(`过滤: "${opts.filter}" - 匹配 ${fontsToShow.length} 个\n\n`);
		for (const font of limited) process.stdout.write(`  ${colors.bold(font.family.padEnd(30))} ${colors.dim(font.file)}\n`);
		if (fontsToShow.length > opts.limit) process.stdout.write("\n" + colors.dim(`  ... 还有 ${fontsToShow.length - opts.limit} 个未显示，请使用 --limit <n> 调整\n`));
		process.stdout.write("\n");
	}
	process.exit(0);
}
main().catch((err) => {
	log.error("check-fonts 命令执行失败", { error: err.message });
	if (opts.debug) console.error(err);
	process.exit(1);
});
//#endregion
export {};

//# sourceMappingURL=check-fonts.js.map