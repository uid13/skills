#!/usr/bin/env node
import { Command } from "commander";
import { existsSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
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
//#region src/lib/magick/processor.ts
/**
* ImageMagick 统一模块 - ImageProcessor
*
* 组合注入模式：通过 use() 注入需要的维度，按需组合。
* 不需要的维度不注入，避免多余依赖。
*
* 使用示例：
*   const p = new ImageProcessor()
*   p.use(new GeometryOps(), 100)
*   p.use(new ColorOps(), 200)
*   p.use(new FilterOps(), 300)
*   await p.resize(800).blur(0, 3).execute('in.png', 'out.png')
*/
var ImageProcessor = class {
	dimensions = [];
	pendingOps = [];
	/**
	* 注入一个处理维度
	*
	* @param dimension - 维度实例（GeometryOps / ColorOps / FilterOps / ...）
	* @param order - 执行优先级（数字小的先执行，建议按 100 递增）
	*/
	use(dimension, order) {
		this.dimensions.push({
			dimension,
			order
		});
		return this;
	}
	/**
	* 直接添加一个原始 magick 参数（用于未封装的操作）
	*/
	raw(command, order = 500) {
		this.pendingOps.push({
			command,
			order
		});
		return this;
	}
	/**
	* 获取所有操作指令（按 order 排序）
	*/
	getCommands() {
		return [...this.dimensions.flatMap((d) => d.dimension.getCommands().map((cmd) => ({
			command: cmd,
			order: d.order
		}))), ...this.pendingOps].sort((a, b) => a.order - b.order).map((op) => op.command);
	}
	/**
	* 清空所有操作（保留已注入的维度）
	*/
	clear() {
		for (const d of this.dimensions) d.dimension.clear();
		this.pendingOps = [];
		return this;
	}
	/**
	* 执行操作：将 input 经过所有操作后输出到 output
	*
	* @param input - 输入文件路径
	* @param output - 输出文件路径
	* @param extraArgs - 额外的 magick 参数（在操作之前）
	*/
	async execute(input, output, extraArgs = []) {
		const splitCommands = this.getCommands().flatMap((cmd) => cmd.split(/\s+/));
		const result = await execMagick([
			...extraArgs,
			input,
			...splitCommands,
			output
		], 12e4);
		if (!result.success) throw new Error(`ImageMagick 执行失败: ${result.stderr}`);
	}
	/**
	* 执行操作并返回结果（不抛错）
	*/
	async executeSafe(input, output, extraArgs = []) {
		try {
			await this.execute(input, output, extraArgs);
			return { success: true };
		} catch (e) {
			return {
				success: false,
				error: e.message
			};
		}
	}
};
//#endregion
//#region src/lib/magick/dimensions/geometry.ts
var GeometryOps = class {
	ops = [];
	/** 缩放 */
	resize(width, height) {
		const geo = height ? `${width}x${height}` : `${width}x`;
		this.ops.push(`-resize ${geo}`);
		return this;
	}
	/** 按百分比缩放 */
	resizePercent(percent) {
		this.ops.push(`-resize ${percent}%`);
		return this;
	}
	/** 裁剪 */
	crop(width, height, x = 0, y = 0) {
		this.ops.push(`-crop ${width}x${height}+${x}+${y} +repage`);
		return this;
	}
	/** 自动裁剪空白边缘 */
	trim() {
		this.ops.push("-trim +repage");
		return this;
	}
	/** 旋转（度数） */
	rotate(degrees) {
		this.ops.push(`-rotate ${degrees}`);
		return this;
	}
	/** 垂直翻转 */
	flip() {
		this.ops.push("-flip");
		return this;
	}
	/** 水平镜像 */
	flop() {
		this.ops.push("-flop");
		return this;
	}
	/** 调整画布大小（居中填充） */
	extent(width, height) {
		this.ops.push(`-extent ${width}x${height} -gravity center`);
		return this;
	}
	/** 液态缩放（内容感知） */
	liquidRescale(width, height) {
		const geo = height ? `${width}x${height}` : `${width}x`;
		this.ops.push(`-liquid-rescale ${geo}`);
		return this;
	}
	getCommands() {
		return this.ops;
	}
	clear() {
		this.ops = [];
	}
};
//#endregion
//#region src/lib/magick/dimensions/color.ts
var ColorOps = class {
	ops = [];
	/** 亮度和对比度 */
	brightnessContrast(brightness, contrast) {
		this.ops.push(`-brightness-contrast ${brightness}x${contrast}`);
		return this;
	}
	/** 色相/饱和度/明度（100=不变） */
	modulate(hue, saturation, lightness) {
		this.ops.push(`-modulate ${hue},${saturation},${lightness}`);
		return this;
	}
	/** 增加饱和度（百分比，100=不变） */
	saturate(percent) {
		this.ops.push(`-modulate 100,${percent},100`);
		return this;
	}
	/** 色阶调整 */
	level(blackPoint, whitePoint) {
		this.ops.push(`-level ${blackPoint},${whitePoint}`);
		return this;
	}
	/** Gamma 校正 */
	gamma(value) {
		this.ops.push(`-gamma ${value}`);
		return this;
	}
	/** 自动色阶 */
	autoLevel() {
		this.ops.push("-auto-level");
		return this;
	}
	/** 自动 Gamma */
	autoGamma() {
		this.ops.push("-auto-gamma");
		return this;
	}
	/** 标准化（拉伸直方图） */
	normalize() {
		this.ops.push("-normalize");
		return this;
	}
	/** 棕褐色调 */
	sepia(intensity = 80) {
		this.ops.push(`-sepia-tone ${intensity}%`);
		return this;
	}
	/** 反色 */
	negate() {
		this.ops.push("-negate");
		return this;
	}
	/** 着色（单色叠加） */
	colorize(percent) {
		this.ops.push(`-colorize ${percent}%`);
		return this;
	}
	/** 灰度 */
	grayscale() {
		this.ops.push("-colorspace Gray");
		return this;
	}
	/** 太阳化效果 */
	solarize(threshold = 50) {
		this.ops.push(`-solarize ${threshold}%`);
		return this;
	}
	/** 对比度拉伸 */
	contrastStretch(black = "5%", white = "5%") {
		this.ops.push(`-contrast-stretch ${black}x${white}`);
		return this;
	}
	/** Sigmoidal 对比度（更自然的对比度调整） */
	sigmoidalContrast(contrast = 11, midpoint = "50%") {
		this.ops.push(`-sigmoidal-contrast ${contrast}x${midpoint}`);
		return this;
	}
	getCommands() {
		return this.ops;
	}
	clear() {
		this.ops = [];
	}
};
//#endregion
//#region src/lib/magick/dimensions/filter.ts
var FilterOps = class {
	ops = [];
	/** 高斯模糊 */
	blur(radius, sigma) {
		this.ops.push(sigma ? `-blur ${radius}x${sigma}` : `-blur 0x${radius}`);
		return this;
	}
	/** 自适应模糊（边缘保留） */
	adaptiveBlur(radius, sigma) {
		this.ops.push(sigma ? `-adaptive-blur ${radius}x${sigma}` : `-adaptive-blur 0x${radius}`);
		return this;
	}
	/** 运动模糊 */
	motionBlur(radius, sigma, angle) {
		this.ops.push(`-motion-blur ${radius}x${sigma}+${angle}`);
		return this;
	}
	/** 径向模糊 */
	radialBlur(radius) {
		this.ops.push(`-radial-blur ${radius}`);
		return this;
	}
	/** 锐化 */
	sharpen(radius, sigma = 1) {
		this.ops.push(`-sharpen ${radius}x${sigma}`);
		return this;
	}
	/** 自适应锐化（边缘保留） */
	adaptiveSharpen(radius, sigma) {
		this.ops.push(sigma ? `-adaptive-sharpen ${radius}x${sigma}` : `-adaptive-sharpen 0x${radius}`);
		return this;
	}
	/** USM 锐化（摄影标准） */
	unsharp(radius, sigma, amount, threshold) {
		this.ops.push(`-unsharp ${radius}x${sigma}+${amount}+${threshold}`);
		return this;
	}
	/** 中值去噪 */
	median(radius) {
		this.ops.push(radius ? `-median ${radius}` : "-median");
		return this;
	}
	/** 去斑点 */
	despeckle() {
		this.ops.push("-despeckle");
		return this;
	}
	/** 增强（去噪+对比度） */
	enhance() {
		this.ops.push("-enhance");
		return this;
	}
	/** 双边滤波（边缘保留平滑） */
	bilateralBlur(width, intensitySigma, spatialSigma) {
		this.ops.push(`-bilateral-blur ${width}x${intensitySigma}+${spatialSigma}`);
		return this;
	}
	/** 自定义卷积核 */
	convolve(kernel) {
		const kernelStr = kernel.join(" ");
		this.ops.push(`-convolve "${kernelStr}"`);
		return this;
	}
	getCommands() {
		return this.ops;
	}
	clear() {
		this.ops = [];
	}
};
//#endregion
//#region src/lib/magick/dimensions/art.ts
var ArtOps = class {
	ops = [];
	/** 炭笔素描 */
	charcoal(factor = 1) {
		this.ops.push(`-charcoal ${factor}`);
		return this;
	}
	/** 铅笔素描 */
	sketch(radius = 0, sigma = 20, angle = 45) {
		this.ops.push(`-sketch ${radius}x${sigma}+${angle}`);
		return this;
	}
	/** 浮雕效果 */
	emboss(radius = 0, sigma = 3) {
		this.ops.push(`-emboss ${radius}x${sigma}`);
		return this;
	}
	/** 油画效果 */
	oilPaint(radius = 3) {
		this.ops.push(`-oil-paint ${radius}`);
		return this;
	}
	/** 暗角（照片边缘暗化） */
	vignette(offset = 120) {
		this.ops.push(`-vignette 0x${offset}`);
		return this;
	}
	/** 像素化（马赛克） */
	pixelate(size = 10) {
		this.ops.push(`-pixelate ${size}`);
		return this;
	}
	/** 3D 光影效果 */
	shade(angle = 45, elevation = 45) {
		this.ops.push(`-shade ${angle}x${elevation}`);
		return this;
	}
	/** 像素随机扩散 */
	spread(radius = 3) {
		this.ops.push(`-spread ${radius}`);
		return this;
	}
	/** 旋转扭曲 */
	swirl(degrees = 90) {
		this.ops.push(`-swirl ${degrees}`);
		return this;
	}
	/** 内爆/外爆（球面化） */
	implode(factor = .5) {
		this.ops.push(`-implode ${factor}`);
		return this;
	}
	/** 波浪扭曲 */
	wave(amplitude = 20, wavelength = 150) {
		this.ops.push(`-wave ${amplitude}x${wavelength}`);
		return this;
	}
	/** 边缘检测 */
	edge(radius = 1) {
		this.ops.push(`-edge ${radius}`);
		return this;
	}
	/** Canny 边缘检测 */
	canny(radius = 0, sigma = 1, lowerPercent = 10, upperPercent = 30) {
		this.ops.push(`-canny ${radius}x${sigma}+${lowerPercent}%+${upperPercent}%`);
		return this;
	}
	getCommands() {
		return this.ops;
	}
	clear() {
		this.ops = [];
	}
};
//#endregion
//#region src/lib/magick/dimensions/format.ts
var FormatOps = class {
	ops = [];
	/** 输出为 JPEG */
	jpeg(quality = 85) {
		this.ops.push(`-quality ${quality}`);
		this.ops.push("-format jpeg");
		return this;
	}
	/** 输出为 PNG */
	png(compression = 6) {
		this.ops.push(`-define png:compression-level=${compression}`);
		this.ops.push("-format png");
		return this;
	}
	/** 输出为 WebP */
	webp(quality = 80) {
		this.ops.push(`-quality ${quality}`);
		this.ops.push("-format webp");
		return this;
	}
	/** 输出为 TIFF */
	tiff(compress = "LZW") {
		this.ops.push(`-compress ${compress}`);
		this.ops.push("-format tiff");
		return this;
	}
	/** 设置质量（适用于所有格式） */
	quality(value) {
		this.ops.push(`-quality ${value}`);
		return this;
	}
	/** 设置压缩方式 */
	compress(method) {
		this.ops.push(`-compress ${method}`);
		return this;
	}
	/** 去除元数据（减小文件体积） */
	strip() {
		this.ops.push("-strip");
		return this;
	}
	/** 设置透明通道 */
	alpha(type) {
		this.ops.push(`-alpha ${type}`);
		return this;
	}
	/** 设置色彩空间 */
	colorspace(space) {
		this.ops.push(`-colorspace ${space}`);
		return this;
	}
	/** 渐进式 JPEG（交错） */
	interlace(type) {
		this.ops.push(`-interlace ${type}`);
		return this;
	}
	/** 设置深度（位深） */
	depth(bits) {
		this.ops.push(`-depth ${bits}`);
		return this;
	}
	getCommands() {
		return this.ops;
	}
	clear() {
		this.ops = [];
	}
};
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
//#region src/bin/post-process.ts
/**
* 图像后期处理工具
*
* 用途：
* - 对已有图片进行后期调整（亮度/对比度/模糊/锐化/暗角等）
* - 格式转换（PNG→JPEG/WebP）
* - 裁剪、缩放、旋转
*
* 调用示例：
*   node post-process.mjs input.png --brightness 15 --contrast 5 -o output.png
*   node post-process.mjs input.png --blur 0 --blur-radius 3 -o output.png
*   node post-process.mjs input.png --vignette 120 -o output.png
*   node post-process.mjs input.png --resize 800 -o output.png
*   node post-process.mjs input.png --jpeg 85 -o output.jpg
*   node post-process.mjs input.png --preset blog-cover -o output.png
*   node post-process.mjs input.png --list-presets
*
* 退出码：
* - 0: 成功
* - 1: 执行失败
* - 2: 参数错误
* - 3: ImageMagick 未安装
*/
var PRESETS = {
	"blog-cover": {
		brightnessContrast: [10, 5],
		blur: [0, 2],
		vignette: [120]
	},
	"thumbnail": {
		resize: [400],
		quality: [80]
	},
	"sharpen": { unsharp: [
		0,
		1,
		1,
		0
	] },
	"soft-glow": {
		blur: [0, 3],
		brightnessContrast: [5, -5]
	},
	"vintage": {
		sepia: [60],
		vignette: [150],
		contrastStretch: ["5%", "5%"]
	},
	"dramatic": {
		contrastStretch: ["2%", "2%"],
		sigmoidalContrast: [11, "50%"]
	},
	"grayscale-vignette": {
		grayscale: [],
		vignette: [120]
	},
	"web-optimize": {
		resize: [1200],
		quality: [80],
		strip: []
	}
};
var program = new Command().name("post-process").description("图像后期处理工具（基于 ImageMagick）").argument("[input]", "输入图片路径").option("-o, --output <path>", "输出文件路径").option("-q, --quiet", "静默模式", false).option("--debug", "调试模式", false).option("--preset <name>", "使用预设效果").option("--list-presets", "列出所有预设效果").option("--resize <width>", "缩放到指定宽度（高度等比）", parseInt).option("--resize-xy <width,height>", "缩放到指定宽高").option("--crop <width,height,x,y>", "裁剪区域").option("--rotate <degrees>", "旋转角度", parseInt).option("--flip", "垂直翻转").option("--flop", "水平镜像").option("--brightness <n>", "亮度调整（正数提亮，负数变暗）", parseInt).option("--contrast <n>", "对比度调整", parseInt).option("--brightness-contrast <brightness,contrast>", "同时调整亮度和对比度").option("--saturation <n>", "饱和度百分比（100=不变）", parseInt).option("--sepia <intensity>", "棕褐色调（0-100）", parseInt).option("--grayscale", "转灰度").option("--negate", "反色").option("--auto-level", "自动色阶").option("--contrast-stretch <black,white>", "对比度拉伸").option("--blur <radius>", "高斯模糊半径", parseFloat).option("--blur-sigma <sigma>", "模糊 sigma（配合 --blur 使用）", parseFloat).option("--sharpen <radius>", "锐化半径", parseFloat).option("--sharpen-sigma <sigma>", "锐化 sigma（默认 1）", parseFloat).option("--unsharp <radius,sigma,amount,threshold>", "USM 锐化").option("--vignette <offset>", "暗角效果（推荐 80-150）", parseInt).option("--charcoal <factor>", "炭笔素描", parseFloat).option("--sketch <radius,sigma,angle>", "铅笔素描").option("--pixelate <size>", "像素化（马赛克）", parseInt).option("--jpeg <quality>", "输出 JPEG（质量 1-100）", parseInt).option("--webp <quality>", "输出 WebP（质量 1-100）", parseInt).option("--png", "输出 PNG").option("--strip", "去除元数据").parse();
var opts = program.opts();
var inputPath = program.args[0];
var log = createLogger({
	json: false,
	quiet: opts.quiet,
	debug: opts.debug
});
async function main() {
	if (opts.listPresets) {
		process.stdout.write("\n");
		process.stdout.write(colors.bold(colors.cyan("=== 可用预设效果 ===\n\n")));
		for (const [name, ops] of Object.entries(PRESETS)) {
			const desc = Object.keys(ops).join(" → ");
			process.stdout.write(`  ${colors.green(name.padEnd(22))} ${colors.dim(desc)}\n`);
		}
		process.stdout.write("\n");
		process.exit(0);
	}
	if (!inputPath) {
		log.error("请指定输入文件");
		process.exit(2);
	}
	const absInput = resolve(inputPath);
	if (!existsSync(absInput)) {
		log.error(`输入文件不存在: ${absInput}`);
		process.exit(2);
	}
	const info = await detectEnvironment();
	if (!info.installed) {
		log.error("ImageMagick 未安装", { error: info.error });
		process.exit(3);
	}
	const ext = extname(absInput).toLowerCase();
	const outExt = opts.jpeg ? ".jpg" : opts.webp ? ".webp" : ext;
	const absOutput = opts.output ? resolve(opts.output) : join(dirname(absInput), `processed-${basename(absInput, ext)}${outExt}`);
	const processor = new ImageProcessor();
	const geo = new GeometryOps();
	const color = new ColorOps();
	const filter = new FilterOps();
	const art = new ArtOps();
	const fmt = new FormatOps();
	let hasGeo = false, hasColor = false, hasFilter = false, hasArt = false, hasFmt = false;
	if (opts.preset) {
		const preset = PRESETS[opts.preset];
		if (!preset) {
			log.error(`未知预设: ${opts.preset}`, { available: Object.keys(PRESETS).join(", ") });
			process.exit(2);
		}
		log.info(`使用预设: ${opts.preset}`);
		applyPreset(processor, geo, color, filter, art, fmt, preset);
	} else {
		if (opts.resize) {
			geo.resize(opts.resize);
			hasGeo = true;
		}
		if (opts.resizeXY) {
			const [w, h] = opts.resizeXY.split(",").map(Number);
			geo.resize(w, h);
			hasGeo = true;
		}
		if (opts.crop) {
			const [w, h, x, y] = opts.crop.split(",").map(Number);
			geo.crop(w, h, x, y);
			hasGeo = true;
		}
		if (opts.rotate) {
			geo.rotate(opts.rotate);
			hasGeo = true;
		}
		if (opts.flip) {
			geo.flip();
			hasGeo = true;
		}
		if (opts.flop) {
			geo.flop();
			hasGeo = true;
		}
		if (opts.brightnessContrast) {
			const [b, c] = opts.brightnessContrast.split(",").map(Number);
			color.brightnessContrast(b, c);
			hasColor = true;
		} else if (opts.brightness != null || opts.contrast != null) {
			color.brightnessContrast(opts.brightness ?? 0, opts.contrast ?? 0);
			hasColor = true;
		}
		if (opts.saturation != null) {
			color.saturate(opts.saturation);
			hasColor = true;
		}
		if (opts.sepia != null) {
			color.sepia(opts.sepia);
			hasColor = true;
		}
		if (opts.grayscale) {
			color.grayscale();
			hasColor = true;
		}
		if (opts.negate) {
			color.negate();
			hasColor = true;
		}
		if (opts.autoLevel) {
			color.autoLevel();
			hasColor = true;
		}
		if (opts.contrastStretch) {
			const [b, w] = opts.contrastStretch.split(",");
			color.contrastStretch(b, w);
			hasColor = true;
		}
		if (opts.blur != null) {
			filter.blur(opts.blur, opts.blurSigma);
			hasFilter = true;
		}
		if (opts.sharpen != null) {
			filter.sharpen(opts.sharpen, opts.sharpenSigma);
			hasFilter = true;
		}
		if (opts.unsharp) {
			const [r, s, a, t] = opts.unsharp.split(",").map(Number);
			filter.unsharp(r, s, a, t);
			hasFilter = true;
		}
		if (opts.vignette != null) {
			art.vignette(opts.vignette);
			hasArt = true;
		}
		if (opts.charcoal != null) {
			art.charcoal(opts.charcoal);
			hasArt = true;
		}
		if (opts.sketch) {
			const [r, s, a] = opts.sketch.split(",").map(Number);
			art.sketch(r, s, a);
			hasArt = true;
		}
		if (opts.pixelate != null) {
			art.pixelate(opts.pixelate);
			hasArt = true;
		}
		if (opts.jpeg != null) {
			fmt.jpeg(opts.jpeg);
			hasFmt = true;
		}
		if (opts.webp != null) {
			fmt.webp(opts.webp);
			hasFmt = true;
		}
		if (opts.png) {
			fmt.png();
			hasFmt = true;
		}
		if (opts.strip) {
			fmt.strip();
			hasFmt = true;
		}
	}
	if (hasGeo) processor.use(geo, 100);
	if (hasColor) processor.use(color, 200);
	if (hasFilter) processor.use(filter, 300);
	if (hasArt) processor.use(art, 400);
	if (hasFmt) processor.use(fmt, 900);
	const commands = processor.getCommands();
	if (commands.length === 0) {
		log.warn("未指定任何处理操作");
		process.exit(0);
	}
	log.info(`执行 ${commands.length} 个操作`);
	if (opts.debug) log.debug("操作列表", { commands });
	await processor.execute(absInput, absOutput);
	process.stdout.write("\n");
	process.stdout.write(colors.bold(colors.green("✓ 处理完成")) + "\n");
	process.stdout.write(`  输入: ${colors.dim(absInput)}\n`);
	process.stdout.write(`  输出: ${colors.green(absOutput)}\n`);
	process.stdout.write("\n");
}
/**
* 应用预设到各维度
*/
function applyPreset(processor, geo, color, filter, art, fmt, preset) {
	for (const [method, args] of Object.entries(preset)) if (method in geo) {
		geo[method](...args);
		processor.use(geo, 100);
	} else if (method in color) {
		color[method](...args);
		processor.use(color, 200);
	} else if (method in filter) {
		filter[method](...args);
		processor.use(filter, 300);
	} else if (method in art) {
		art[method](...args);
		processor.use(art, 400);
	} else if (method in fmt) {
		fmt[method](...args);
		processor.use(fmt, 900);
	}
}
main().catch((err) => {
	log.error("post-process 执行失败", { error: err.message });
	if (opts.debug) console.error(err);
	process.exit(1);
});
//#endregion
export {};

//# sourceMappingURL=post-process.js.map