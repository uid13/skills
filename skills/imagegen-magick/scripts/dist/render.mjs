import { Command } from "commander";
import { existsSync, statSync } from "node:fs";
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