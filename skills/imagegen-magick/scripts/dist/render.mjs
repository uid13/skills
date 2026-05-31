import { Command } from "commander";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { platform } from "node:os";
import { basename, extname, isAbsolute, resolve } from "node:path";
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
	const version = versionResult.stdout.match(/ImageMagick\s+(\S+)/)?.[1];
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
//#region src/utils/path.ts
/**
* 路径处理辅助工具
*
* 跨平台路径相关的通用函数，避免在不同模块重复实现。
*/
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
* 生成唯一输出文件名（避免覆盖已有文件）
*
* 示例：
* - cover.png 不存在 → cover.png
* - cover.png 已存在 → cover-1.png
* - cover-1.png 已存在 → cover-2.png
*
* @param targetPath - 期望的输出路径
* @param force - 强制使用原路径（不检查覆盖）
*/
function uniquePath(targetPath, force = false) {
	if (force || !existsSync(targetPath)) return targetPath;
	const dir = targetPath.substring(0, targetPath.lastIndexOf(basename(targetPath)));
	const ext = extname(targetPath);
	const base = basename(targetPath, ext);
	let counter = 1;
	while (existsSync(`${dir}${base}-${counter}${ext}`)) {
		counter++;
		if (counter > 1e3) throw new Error(`无法找到唯一路径，已尝试 ${counter} 次：${targetPath}`);
	}
	return `${dir}${base}-${counter}${ext}`;
}
//#endregion
//#region src/bin/render.ts
/**
* SVG → PNG 渲染工具
*
* 用途：
* - 将 SVG 文件渲染为高质量 PNG
* - 支持透明背景、自定义 DPI、缩放因子
* - 自动处理文件扩展名校验和冲突检测
*
* 调用示例：
*   node render.mjs cover.svg                      # 输出 cover.png
*   node render.mjs cover.svg -o output.png        # 指定输出
*   node render.mjs cover.svg --scale 2x           # 2x 分辨率
*   node render.mjs cover.svg --background white   # 白色背景（默认透明）
*   node render.mjs cover.svg --force              # 强制覆盖
*
* 退出码：
* - 0: 渲染成功
* - 1: 渲染失败（详见 stderr）
* - 2: 参数错误（输入文件不存在、扩展名错误等）
* - 3: 依赖缺失（ImageMagick 未安装）
*/
var program = new Command().name("render").description("将 SVG 渲染为 PNG 图像").argument("<input>", "输入 SVG 文件路径").option("-o, --output <path>", "输出 PNG 路径（默认与输入同名，扩展名为 .png）").option("-s, --scale <factor>", "缩放因子（如 \"2x\" \"3x\" \"0.5x\" 或直接 DPI 数值如 \"192\"）", "2x").option("--background <color>", "背景色（\"transparent\" 默认，或颜色名如 \"white\" \"#FFFFFF\"）", "transparent").option("--quality <n>", "PNG 质量 1-100", (s) => parseInt(s, 10), 95).option("-f, --force", "强制覆盖已存在的输出文件", false).option("--json", "JSON 输出", false).option("--quiet", "静默模式", false).option("--debug", "调试模式", false).parse();
var input = program.args[0];
var opts = program.opts();
var log = createLogger({
	json: opts.json,
	quiet: opts.quiet,
	debug: opts.debug
});
/**
* 解析缩放因子 → 实际 DPI 数值
*
* 支持的格式：
* - "2x" "3x" → 乘以 96 DPI
* - "192" → 直接作为 DPI
* - "192dpi" → 去掉单位
*/
function parseScale(scale) {
	const trimmed = scale.trim().toLowerCase();
	if (trimmed.endsWith("x")) {
		const factor = parseFloat(trimmed);
		if (isNaN(factor) || factor <= 0) throw new Error(`无效的缩放因子: ${scale}（应为数字 + "x"，如 "2x"）`);
		return String(Math.round(factor * 96));
	}
	if (trimmed.endsWith("dpi")) return trimmed.slice(0, -3);
	return trimmed;
}
/**
* 验证输入文件
*/
function validateInput(path) {
	if (!existsSync(path)) return `输入文件不存在: ${path}`;
	const ext = getExt(path);
	if (ext !== ".svg" && ext !== ".svgz") return `输入文件不是 SVG（扩展名为 ${ext}，需要 .svg 或 .svgz）`;
	return null;
}
async function main() {
	if (!input) {
		log.error("缺少输入参数");
		process.exit(2);
	}
	const inputPath = toAbsolutePath(input);
	const inputError = validateInput(inputPath);
	if (inputError) {
		log.error("输入验证失败", { reason: inputError });
		if (!opts.json) process.stdout.write("\n" + colors.red(`✗ ${inputError}\n\n`));
		process.exit(2);
	}
	let outputPath = opts.output ? toAbsolutePath(opts.output) : inputPath.replace(/\.(svg|svgz)$/i, ".png");
	if (!opts.force && existsSync(outputPath)) {
		outputPath = uniquePath(outputPath, opts.force);
		log.info(`输出文件已存在，使用替代路径: ${outputPath}`);
	}
	const imInfo = await magick.detect();
	if (!imInfo.installed) {
		log.error("ImageMagick 未安装，无法渲染 SVG", { reason: imInfo.error });
		if (!opts.json) process.stdout.write("\n" + colors.red("✗ ImageMagick 未安装\n") + colors.dim("请参考: https://imagemagick.org/script/download.php\n或使用 mise: mise install imagemagick\n\n"));
		process.exit(3);
	}
	let density;
	try {
		density = parseScale(opts.scale);
	} catch (err) {
		log.error("缩放参数错误", { reason: err.message });
		process.exit(2);
	}
	log.info("开始渲染", {
		input: inputPath,
		output: outputPath,
		scale: opts.scale,
		background: opts.background,
		density
	});
	if (!opts.json) {
		process.stdout.write(`\n${colors.blue("ℹ")} 开始渲染:\n`);
		process.stdout.write(`   输入: ${inputPath}\n`);
		process.stdout.write(`   输出: ${outputPath}\n`);
		process.stdout.write(`   缩放: ${opts.scale} (DPI: ${density})\n`);
		process.stdout.write(`   背景: ${opts.background}\n\n`);
	}
	const result = await magick.renderSvg({
		input: inputPath,
		output: outputPath,
		quality: opts.quality,
		background: opts.background,
		density,
		force: opts.force
	});
	if (result.success) {
		log.success("渲染完成", { outputFile: result.outputFile });
		if (!opts.json) process.stdout.write(colors.green(`✓ 渲染完成: ${result.outputFile}\n\n`));
		process.exit(0);
	} else {
		log.error("渲染失败", {
			reason: result.error,
			exitCode: result.exitCode
		});
		if (!opts.json) process.stdout.write("\n" + colors.red(`✗ 渲染失败:\n   ${result.error}\n\n`));
		process.exit(1);
	}
}
main().catch((err) => {
	log.error("render 命令执行失败", { error: err.message });
	if (opts.debug) console.error(err);
	process.exit(1);
});
//#endregion
export {};

//# sourceMappingURL=render.js.map