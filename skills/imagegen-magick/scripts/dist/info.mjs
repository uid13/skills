import { Command } from "commander";
import { spawn } from "node:child_process";
import { homedir, platform } from "node:os";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, isAbsolute, join, resolve } from "node:path";
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