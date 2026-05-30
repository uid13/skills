#!/usr/bin/env node
import { existsSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { spawn } from "node:child_process";
import { platform } from "node:os";
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
	const blocks = result.stdout.split(/^\s*Font:\s+/m).slice(1);
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
//#region src/bin/font-chain.ts
/**
* 字体链生成工具
*
* 用途：
* - 执行 magick identify -list font 获取当前系统真实可用字体
* - 按类别分类（代码/中文/无衬线/衬线）
* - 按 curated 优先级列表排序
* - 生成 references/font-handling.jsonc 供 agent 和 font-fallback.ts 使用
*/
var JSONC_PATH = resolve(dirname(fileURLToPath(import.meta.url)), "../../references/font-handling.jsonc");
var opts = new Command().name("font-chain").description("从 ImageMagick 生成字体 fallback 链配置").option("--json", "仅输出 JSON 到 stdout（不写入文件）", false).option("--dry-run", "预览生成内容但不写入文件", false).option("--quiet", "静默模式", false).option("--debug", "调试模式", false).parse().opts();
var log = createLogger({
	json: false,
	quiet: opts.quiet,
	debug: opts.debug
});
/** 代码/等宽字体优先级（高 → 低） */
var CODE_PRIORITY = [
	"Cascadia Next SC NF",
	"Cascadia Next",
	"Cascadia Code",
	"Cascadia Mono",
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
/** 中文字体优先级 */
var CJK_PRIORITY = [
	"Microsoft YaHei",
	"Microsoft YaHei UI",
	"DengXian",
	"SimHei",
	"SimSun",
	"PingFang SC",
	"STHeiti",
	"Noto Sans CJK SC",
	"Noto Sans SC",
	"WenQuanYi Micro Hei"
];
/** 无衬线字体优先级 */
var SANS_PRIORITY = [
	"Inter",
	"Roboto",
	"SF Pro Display",
	"SF Pro Text",
	"Segoe UI",
	"Open Sans",
	"Lato",
	"Noto Sans",
	"Arial",
	"Helvetica"
];
/** 衬线字体优先级 */
var SERIF_PRIORITY = [
	"Charter",
	"Source Serif Pro",
	"Georgia",
	"Cambria",
	"Times New Roman",
	"Noto Serif"
];
/**
* 按优先级列表排序字体
* 在优先级列表中的按列表顺序排，不在的追加到末尾
*/
function sortByPriority(fonts, priority) {
	const priorityMap = new Map(priority.map((name, i) => [name.toLowerCase(), i]));
	return [...fonts].sort((a, b) => {
		return (priorityMap.get(a.toLowerCase()) ?? Infinity) - (priorityMap.get(b.toLowerCase()) ?? Infinity);
	});
}
/** 代码/等宽字体关键字 */
var CODE_KEYWORDS = [
	"mono",
	"code",
	"consol",
	"courier",
	"hack",
	"plex mono",
	"firacode",
	"fira mono",
	"cascadia",
	"jetbrains"
];
/** 中文字体关键字 */
var CJK_KEYWORDS = [
	"yahei",
	"dengxian",
	"simhei",
	"simsun",
	"fangsong",
	"simkai",
	"pingfang",
	"stheiti",
	"hiragino",
	"noto sans cjk",
	"noto sans sc",
	"wenquanyi",
	"source han",
	"adobe song",
	"microsoft yahei",
	"droid sans fallback",
	"ar pl"
];
/** 无衬线字体关键字 */
var SANS_KEYWORDS = [
	"sans",
	"inter",
	"roboto",
	"segoe",
	"open sans",
	"lato",
	"helvetica",
	"arial",
	"sf pro"
];
/** 衬线字体关键字 */
var SERIF_KEYWORDS = [
	"serif",
	"georgia",
	"cambria",
	"times",
	"charter",
	"garamond",
	"palatino",
	"baskerville"
];
/**
* 字体分类匹配（不区分大小写）
*/
function matchesAny(name, keywords) {
	const lower = name.toLowerCase();
	return keywords.some((k) => lower.includes(k));
}
/**
* 对字体去重（同一 family 只保留第一个）
*/
function deduplicate(fonts) {
	const seen = /* @__PURE__ */ new Set();
	return fonts.filter((f) => {
		const key = f.family.toLowerCase();
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}
/**
* 按关键词分类字体到四个类别
*/
function classifyFonts(fonts) {
	const codeSet = /* @__PURE__ */ new Set();
	const cjkSet = /* @__PURE__ */ new Set();
	const sansSet = /* @__PURE__ */ new Set();
	const serifSet = /* @__PURE__ */ new Set();
	for (const font of fonts) {
		const family = font.family;
		if (matchesAny(family, CODE_KEYWORDS)) codeSet.add(family);
		if (matchesAny(family, CJK_KEYWORDS)) cjkSet.add(family);
		if (matchesAny(family, SANS_KEYWORDS)) sansSet.add(family);
		if (matchesAny(family, SERIF_KEYWORDS)) serifSet.add(family);
	}
	return {
		code: sortByPriority([...codeSet], CODE_PRIORITY),
		cjk: sortByPriority([...cjkSet], CJK_PRIORITY),
		sans: sortByPriority([...sansSet], SANS_PRIORITY),
		serif: sortByPriority([...serifSet], SERIF_PRIORITY)
	};
}
/**
* 构建 JSONC 输出内容（带格式化注释）
*/
function buildJsonc(chains, totalCount) {
	const now = (/* @__PURE__ */ new Date()).toISOString();
	const lines = [];
	lines.push("{");
	lines.push(`  // 由 font-chain.mjs 自动生成，请勿手动编辑`);
	lines.push(`  // 数据源: magick identify -list font`);
	lines.push(`  // 生成时间: ${now}`);
	lines.push(`  // 系统字体总数: ${totalCount}`);
	lines.push("");
	lines.push("  \"generatedAt\": \"" + now + "\",");
	lines.push("  \"source\": \"magick identify -list font\",");
	lines.push("  \"totalFonts\": " + totalCount + ",");
	lines.push("");
	lines.push("  // 代码/西文等宽字体（按优先级排序）");
	lines.push("  \"code\": {");
	lines.push("    \"description\": \"代码、CLI、博客封面等场景的等宽字体\",");
	lines.push("    \"chain\": [");
	for (let i = 0; i < chains.code.length; i++) {
		const comma = i < chains.code.length - 1 ? "," : "";
		lines.push(`      "${chains.code[i]}"${comma}`);
	}
	lines.push("    ]");
	lines.push("  },");
	lines.push("");
	lines.push("  // 中文字体（按平台优先级排序）");
	lines.push("  \"cjk\": {");
	lines.push("    \"description\": \"中文字符渲染，与代码字体配合使用\",");
	lines.push("    \"chain\": [");
	for (let i = 0; i < chains.cjk.length; i++) {
		const comma = i < chains.cjk.length - 1 ? "," : "";
		lines.push(`      "${chains.cjk[i]}"${comma}`);
	}
	lines.push("    ]");
	lines.push("  },");
	lines.push("");
	lines.push("  // 西文无衬线字体（UI、标题）");
	lines.push("  \"sans\": {");
	lines.push("    \"description\": \"西文无衬线字体，适合 UI 和标题\",");
	lines.push("    \"chain\": [");
	for (let i = 0; i < chains.sans.length; i++) {
		const comma = i < chains.sans.length - 1 ? "," : "";
		lines.push(`      "${chains.sans[i]}"${comma}`);
	}
	lines.push("    ]");
	lines.push("  },");
	lines.push("");
	lines.push("  // 西文衬线字体（长文阅读）");
	lines.push("  \"serif\": {");
	lines.push("    \"description\": \"西文衬线字体，适合长文阅读\",");
	lines.push("    \"chain\": [");
	for (let i = 0; i < chains.serif.length; i++) {
		const comma = i < chains.serif.length - 1 ? "," : "";
		lines.push(`      "${chains.serif[i]}"${comma}`);
	}
	lines.push("    ]");
	lines.push("  }");
	lines.push("}");
	return lines.join("\n");
}
async function main() {
	log.info("检查 ImageMagick...");
	const imInfo = await magick.detect();
	if (!imInfo.installed) {
		log.error("ImageMagick 未安装，无法生成字体链", { error: imInfo.error });
		process.exit(3);
	}
	log.info(`ImageMagick ${imInfo.version} 已安装`);
	log.info("执行 magick identify -list font ...");
	const allFonts = await magick.listFonts();
	if (allFonts.length === 0) {
		log.warn("未检测到任何字体");
		process.exit(1);
	}
	log.info(`检测到 ${allFonts.length} 个字体`);
	const uniqueFonts = deduplicate(allFonts);
	log.info(`去重后 ${uniqueFonts.length} 个字体`);
	const chains = classifyFonts(uniqueFonts);
	log.info("分类结果", {
		code: chains.code.length,
		cjk: chains.cjk.length,
		sans: chains.sans.length,
		serif: chains.serif.length
	});
	const jsonc = buildJsonc(chains, allFonts.length);
	if (opts.json) {
		process.stdout.write(jsonc + "\n");
		process.exit(0);
	}
	if (opts.dryRun) {
		process.stdout.write("\n" + colors.bold(colors.cyan("=== 预览 font-handling.jsonc ===\n\n")));
		process.stdout.write(jsonc + "\n");
		process.exit(0);
	}
	const dir = dirname(JSONC_PATH);
	if (!existsSync(dir)) {
		const { mkdirSync } = await import("node:fs");
		mkdirSync(dir, { recursive: true });
	}
	writeFileSync(JSONC_PATH, jsonc + "\n", "utf-8");
	log.info(`已写入: ${JSONC_PATH}`);
	process.stdout.write("\n");
	process.stdout.write(colors.bold(colors.cyan("=== 字体链生成完成 ===\n\n")));
	process.stdout.write(`  输出文件: ${colors.green(JSONC_PATH)}\n`);
	process.stdout.write(`  系统字体: ${colors.green(String(allFonts.length))} 个\n`);
	process.stdout.write(`  去重后:   ${colors.green(String(uniqueFonts.length))} 个\n\n`);
	process.stdout.write("  分类结果:\n");
	process.stdout.write(`    代码字体: ${colors.green(String(chains.code.length))} 个`);
	if (chains.code.length > 0) process.stdout.write(`  (${chains.code.slice(0, 3).join(", ")}${chains.code.length > 3 ? "..." : ""})`);
	process.stdout.write("\n");
	process.stdout.write(`    中文字体: ${colors.green(String(chains.cjk.length))} 个`);
	if (chains.cjk.length > 0) process.stdout.write(`  (${chains.cjk.slice(0, 3).join(", ")}${chains.cjk.length > 3 ? "..." : ""})`);
	process.stdout.write("\n");
	process.stdout.write(`    无衬线:   ${colors.green(String(chains.sans.length))} 个`);
	if (chains.sans.length > 0) process.stdout.write(`  (${chains.sans.slice(0, 3).join(", ")}${chains.sans.length > 3 ? "..." : ""})`);
	process.stdout.write("\n");
	process.stdout.write(`    衬线:     ${colors.green(String(chains.serif.length))} 个`);
	if (chains.serif.length > 0) process.stdout.write(`  (${chains.serif.slice(0, 3).join(", ")}${chains.serif.length > 3 ? "..." : ""})`);
	process.stdout.write("\n\n");
	process.stdout.write(colors.dim("  提示: agent 首次使用时应执行此工具生成配置\n\n"));
	process.exit(0);
}
main().catch((err) => {
	log.error("font-chain 命令执行失败", { error: err.message });
	if (opts.debug) console.error(err);
	process.exit(1);
});
//#endregion
export {};

//# sourceMappingURL=font-chain.js.map