#!/usr/bin/env node
import { i as __require, t as __commonJSMin } from "./chunks/chunk-CNf5ZN-e.mjs";
import { dirname, extname, join } from "node:path";
import { existsSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
//#region ../../node_modules/isexe/windows.js
var require_windows = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = isexe;
	isexe.sync = sync;
	var fs$2 = __require("fs");
	function checkPathExt(path, options) {
		var pathext = options.pathExt !== void 0 ? options.pathExt : process.env.PATHEXT;
		if (!pathext) return true;
		pathext = pathext.split(";");
		if (pathext.indexOf("") !== -1) return true;
		for (var i = 0; i < pathext.length; i++) {
			var p = pathext[i].toLowerCase();
			if (p && path.substr(-p.length).toLowerCase() === p) return true;
		}
		return false;
	}
	function checkStat(stat, path, options) {
		if (!stat.isSymbolicLink() && !stat.isFile()) return false;
		return checkPathExt(path, options);
	}
	function isexe(path, options, cb) {
		fs$2.stat(path, function(er, stat) {
			cb(er, er ? false : checkStat(stat, path, options));
		});
	}
	function sync(path, options) {
		return checkStat(fs$2.statSync(path), path, options);
	}
}));
//#endregion
//#region ../../node_modules/isexe/mode.js
var require_mode = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = isexe;
	isexe.sync = sync;
	var fs$1 = __require("fs");
	function isexe(path, options, cb) {
		fs$1.stat(path, function(er, stat) {
			cb(er, er ? false : checkStat(stat, options));
		});
	}
	function sync(path, options) {
		return checkStat(fs$1.statSync(path), options);
	}
	function checkStat(stat, options) {
		return stat.isFile() && checkMode(stat, options);
	}
	function checkMode(stat, options) {
		var mod = stat.mode;
		var uid = stat.uid;
		var gid = stat.gid;
		var myUid = options.uid !== void 0 ? options.uid : process.getuid && process.getuid();
		var myGid = options.gid !== void 0 ? options.gid : process.getgid && process.getgid();
		var u = parseInt("100", 8);
		var g = parseInt("010", 8);
		var o = parseInt("001", 8);
		var ug = u | g;
		return mod & o || mod & g && gid === myGid || mod & u && uid === myUid || mod & ug && myUid === 0;
	}
}));
//#endregion
//#region ../../node_modules/isexe/index.js
var require_isexe = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	__require("fs");
	var core;
	if (process.platform === "win32" || global.TESTING_WINDOWS) core = require_windows();
	else core = require_mode();
	module.exports = isexe;
	isexe.sync = sync;
	function isexe(path, options, cb) {
		if (typeof options === "function") {
			cb = options;
			options = {};
		}
		if (!cb) {
			if (typeof Promise !== "function") throw new TypeError("callback not provided");
			return new Promise(function(resolve, reject) {
				isexe(path, options || {}, function(er, is) {
					if (er) reject(er);
					else resolve(is);
				});
			});
		}
		core(path, options || {}, function(er, is) {
			if (er) {
				if (er.code === "EACCES" || options && options.ignoreErrors) {
					er = null;
					is = false;
				}
			}
			cb(er, is);
		});
	}
	function sync(path, options) {
		try {
			return core.sync(path, options || {});
		} catch (er) {
			if (options && options.ignoreErrors || er.code === "EACCES") return false;
			else throw er;
		}
	}
}));
//#endregion
//#region ../../node_modules/which/which.js
var require_which = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var isWindows = process.platform === "win32" || process.env.OSTYPE === "cygwin" || process.env.OSTYPE === "msys";
	var path$2 = __require("path");
	var COLON = isWindows ? ";" : ":";
	var isexe = require_isexe();
	var getNotFoundError = (cmd) => Object.assign(/* @__PURE__ */ new Error(`not found: ${cmd}`), { code: "ENOENT" });
	var getPathInfo = (cmd, opt) => {
		const colon = opt.colon || COLON;
		const pathEnv = cmd.match(/\//) || isWindows && cmd.match(/\\/) ? [""] : [...isWindows ? [process.cwd()] : [], ...(opt.path || process.env.PATH || "").split(colon)];
		const pathExtExe = isWindows ? opt.pathExt || process.env.PATHEXT || ".EXE;.CMD;.BAT;.COM" : "";
		const pathExt = isWindows ? pathExtExe.split(colon) : [""];
		if (isWindows) {
			if (cmd.indexOf(".") !== -1 && pathExt[0] !== "") pathExt.unshift("");
		}
		return {
			pathEnv,
			pathExt,
			pathExtExe
		};
	};
	var which = (cmd, opt, cb) => {
		if (typeof opt === "function") {
			cb = opt;
			opt = {};
		}
		if (!opt) opt = {};
		const { pathEnv, pathExt, pathExtExe } = getPathInfo(cmd, opt);
		const found = [];
		const step = (i) => new Promise((resolve, reject) => {
			if (i === pathEnv.length) return opt.all && found.length ? resolve(found) : reject(getNotFoundError(cmd));
			const ppRaw = pathEnv[i];
			const pathPart = /^".*"$/.test(ppRaw) ? ppRaw.slice(1, -1) : ppRaw;
			const pCmd = path$2.join(pathPart, cmd);
			resolve(subStep(!pathPart && /^\.[\\\/]/.test(cmd) ? cmd.slice(0, 2) + pCmd : pCmd, i, 0));
		});
		const subStep = (p, i, ii) => new Promise((resolve, reject) => {
			if (ii === pathExt.length) return resolve(step(i + 1));
			const ext = pathExt[ii];
			isexe(p + ext, { pathExt: pathExtExe }, (er, is) => {
				if (!er && is) if (opt.all) found.push(p + ext);
				else return resolve(p + ext);
				return resolve(subStep(p, i, ii + 1));
			});
		});
		return cb ? step(0).then((res) => cb(null, res), cb) : step(0);
	};
	var whichSync = (cmd, opt) => {
		opt = opt || {};
		const { pathEnv, pathExt, pathExtExe } = getPathInfo(cmd, opt);
		const found = [];
		for (let i = 0; i < pathEnv.length; i++) {
			const ppRaw = pathEnv[i];
			const pathPart = /^".*"$/.test(ppRaw) ? ppRaw.slice(1, -1) : ppRaw;
			const pCmd = path$2.join(pathPart, cmd);
			const p = !pathPart && /^\.[\\\/]/.test(cmd) ? cmd.slice(0, 2) + pCmd : pCmd;
			for (let j = 0; j < pathExt.length; j++) {
				const cur = p + pathExt[j];
				try {
					if (isexe.sync(cur, { pathExt: pathExtExe })) if (opt.all) found.push(cur);
					else return cur;
				} catch (ex) {}
			}
		}
		if (opt.all && found.length) return found;
		if (opt.nothrow) return null;
		throw getNotFoundError(cmd);
	};
	module.exports = which;
	which.sync = whichSync;
}));
//#endregion
//#region ../../node_modules/path-key/index.js
var require_path_key = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var pathKey = (options = {}) => {
		const environment = options.env || process.env;
		if ((options.platform || process.platform) !== "win32") return "PATH";
		return Object.keys(environment).reverse().find((key) => key.toUpperCase() === "PATH") || "Path";
	};
	module.exports = pathKey;
	module.exports.default = pathKey;
}));
//#endregion
//#region ../../node_modules/cross-spawn/lib/util/resolveCommand.js
var require_resolveCommand = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var path$1 = __require("path");
	var which = require_which();
	var getPathKey = require_path_key();
	function resolveCommandAttempt(parsed, withoutPathExt) {
		const env = parsed.options.env || process.env;
		const cwd = process.cwd();
		const hasCustomCwd = parsed.options.cwd != null;
		const shouldSwitchCwd = hasCustomCwd && process.chdir !== void 0 && !process.chdir.disabled;
		if (shouldSwitchCwd) try {
			process.chdir(parsed.options.cwd);
		} catch (err) {}
		let resolved;
		try {
			resolved = which.sync(parsed.command, {
				path: env[getPathKey({ env })],
				pathExt: withoutPathExt ? path$1.delimiter : void 0
			});
		} catch (e) {} finally {
			if (shouldSwitchCwd) process.chdir(cwd);
		}
		if (resolved) resolved = path$1.resolve(hasCustomCwd ? parsed.options.cwd : "", resolved);
		return resolved;
	}
	function resolveCommand(parsed) {
		return resolveCommandAttempt(parsed) || resolveCommandAttempt(parsed, true);
	}
	module.exports = resolveCommand;
}));
//#endregion
//#region ../../node_modules/cross-spawn/lib/util/escape.js
var require_escape = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var metaCharsRegExp = /([()\][%!^"`<>&|;, *?])/g;
	function escapeCommand(arg) {
		arg = arg.replace(metaCharsRegExp, "^$1");
		return arg;
	}
	function escapeArgument(arg, doubleEscapeMetaChars) {
		arg = `${arg}`;
		arg = arg.replace(/(?=(\\+?)?)\1"/g, "$1$1\\\"");
		arg = arg.replace(/(?=(\\+?)?)\1$/, "$1$1");
		arg = `"${arg}"`;
		arg = arg.replace(metaCharsRegExp, "^$1");
		if (doubleEscapeMetaChars) arg = arg.replace(metaCharsRegExp, "^$1");
		return arg;
	}
	module.exports.command = escapeCommand;
	module.exports.argument = escapeArgument;
}));
//#endregion
//#region ../../node_modules/shebang-regex/index.js
var require_shebang_regex = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = /^#!(.*)/;
}));
//#endregion
//#region ../../node_modules/shebang-command/index.js
var require_shebang_command = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var shebangRegex = require_shebang_regex();
	module.exports = (string = "") => {
		const match = string.match(shebangRegex);
		if (!match) return null;
		const [path, argument] = match[0].replace(/#! ?/, "").split(" ");
		const binary = path.split("/").pop();
		if (binary === "env") return argument;
		return argument ? `${binary} ${argument}` : binary;
	};
}));
//#endregion
//#region ../../node_modules/cross-spawn/lib/util/readShebang.js
var require_readShebang = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var fs = __require("fs");
	var shebangCommand = require_shebang_command();
	function readShebang(command) {
		const size = 150;
		const buffer = Buffer.alloc(size);
		let fd;
		try {
			fd = fs.openSync(command, "r");
			fs.readSync(fd, buffer, 0, size, 0);
			fs.closeSync(fd);
		} catch (e) {}
		return shebangCommand(buffer.toString());
	}
	module.exports = readShebang;
}));
//#endregion
//#region ../../node_modules/cross-spawn/lib/parse.js
var require_parse = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var path = __require("path");
	var resolveCommand = require_resolveCommand();
	var escape = require_escape();
	var readShebang = require_readShebang();
	var isWin = process.platform === "win32";
	var isExecutableRegExp = /\.(?:com|exe)$/i;
	var isCmdShimRegExp = /node_modules[\\/].bin[\\/][^\\/]+\.cmd$/i;
	function detectShebang(parsed) {
		parsed.file = resolveCommand(parsed);
		const shebang = parsed.file && readShebang(parsed.file);
		if (shebang) {
			parsed.args.unshift(parsed.file);
			parsed.command = shebang;
			return resolveCommand(parsed);
		}
		return parsed.file;
	}
	function parseNonShell(parsed) {
		if (!isWin) return parsed;
		const commandFile = detectShebang(parsed);
		const needsShell = !isExecutableRegExp.test(commandFile);
		if (parsed.options.forceShell || needsShell) {
			const needsDoubleEscapeMetaChars = isCmdShimRegExp.test(commandFile);
			parsed.command = path.normalize(parsed.command);
			parsed.command = escape.command(parsed.command);
			parsed.args = parsed.args.map((arg) => escape.argument(arg, needsDoubleEscapeMetaChars));
			parsed.args = [
				"/d",
				"/s",
				"/c",
				`"${[parsed.command].concat(parsed.args).join(" ")}"`
			];
			parsed.command = process.env.comspec || "cmd.exe";
			parsed.options.windowsVerbatimArguments = true;
		}
		return parsed;
	}
	function parse(command, args, options) {
		if (args && !Array.isArray(args)) {
			options = args;
			args = null;
		}
		args = args ? args.slice(0) : [];
		options = Object.assign({}, options);
		const parsed = {
			command,
			args,
			options,
			file: void 0,
			original: {
				command,
				args
			}
		};
		return options.shell ? parsed : parseNonShell(parsed);
	}
	module.exports = parse;
}));
//#endregion
//#region ../../node_modules/cross-spawn/lib/enoent.js
var require_enoent = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var isWin = process.platform === "win32";
	function notFoundError(original, syscall) {
		return Object.assign(/* @__PURE__ */ new Error(`${syscall} ${original.command} ENOENT`), {
			code: "ENOENT",
			errno: "ENOENT",
			syscall: `${syscall} ${original.command}`,
			path: original.command,
			spawnargs: original.args
		});
	}
	function hookChildProcess(cp, parsed) {
		if (!isWin) return;
		const originalEmit = cp.emit;
		cp.emit = function(name, arg1) {
			if (name === "exit") {
				const err = verifyENOENT(arg1, parsed);
				if (err) return originalEmit.call(cp, "error", err);
			}
			return originalEmit.apply(cp, arguments);
		};
	}
	function verifyENOENT(status, parsed) {
		if (isWin && status === 1 && !parsed.file) return notFoundError(parsed.original, "spawn");
		return null;
	}
	function verifyENOENTSync(status, parsed) {
		if (isWin && status === 1 && !parsed.file) return notFoundError(parsed.original, "spawnSync");
		return null;
	}
	module.exports = {
		hookChildProcess,
		verifyENOENT,
		verifyENOENTSync,
		notFoundError
	};
}));
//#endregion
//#region src/bin/serve.mjs
var import_cross_spawn = (/* @__PURE__ */ __commonJSMin(((exports, module) => {
	var cp = __require("child_process");
	var parse = require_parse();
	var enoent = require_enoent();
	function spawn(command, args, options) {
		const parsed = parse(command, args, options);
		const spawned = cp.spawn(parsed.command, parsed.args, parsed.options);
		enoent.hookChildProcess(spawned, parsed);
		return spawned;
	}
	function spawnSync(command, args, options) {
		const parsed = parse(command, args, options);
		const result = cp.spawnSync(parsed.command, parsed.args, parsed.options);
		result.error = result.error || enoent.verifyENOENTSync(result.status, parsed);
		return result;
	}
	module.exports = spawn;
	module.exports.spawn = spawn;
	module.exports.sync = spawnSync;
	module.exports._parse = parse;
	module.exports._enoent = enoent;
})))();
var __dirname = dirname(fileURLToPath(import.meta.url));
var DEFAULT_PORT = 3e3;
var PID_FILE = join(__dirname, ".serve.pid");
/** MIME 类型映射 */
var MIME_TYPES = {
	".html": "text/html; charset=utf-8",
	".js": "application/javascript; charset=utf-8",
	".mjs": "application/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".gif": "image/gif",
	".svg": "image/svg+xml",
	".ico": "image/x-icon",
	".webp": "image/webp",
	".woff": "font/woff",
	".woff2": "font/woff2",
	".ttf": "font/ttf"
};
/** 获取 MIME 类型 */
function getMimeType(filePath) {
	return MIME_TYPES[extname(filePath).toLowerCase()] || "application/octet-stream";
}
/** 检查端口是否被占用 */
function isPortInUse(port) {
	return new Promise((resolve) => {
		const server = createServer();
		server.once("error", () => resolve(true));
		server.once("listening", () => {
			server.close();
			resolve(false);
		});
		server.listen(port);
	});
}
/** 读取 PID 文件 */
function readPid() {
	if (!existsSync(PID_FILE)) return null;
	try {
		const pid = parseInt(readFileSync(PID_FILE, "utf-8").trim());
		try {
			process.kill(pid, 0);
			return pid;
		} catch {
			return null;
		}
	} catch {
		return null;
	}
}
/** 写入 PID 文件 */
function writePid(pid) {
	writeFileSync(PID_FILE, String(pid));
}
/** 删除 PID 文件 */
function removePid() {
	try {
		unlinkSync(PID_FILE);
	} catch {}
}
/** 启动静态服务器 */
async function startServer(dir, port) {
	if (await isPortInUse(port)) {
		const pid = readPid();
		if (pid) {
			console.log(`端口 ${port} 已被占用（PID: ${pid}），服务已在运行`);
			return {
				port,
				pid
			};
		}
		console.error(`端口 ${port} 被其他进程占用，请指定其他端口：node serve.mjs start -p 3001`);
		process.exit(1);
	}
	const server = createServer((req, res) => {
		const url = new URL(req.url, `http://localhost:${port}`);
		let filePath = join(dir, url.pathname === "/" ? "index.html" : url.pathname);
		if (!filePath.startsWith(dir)) {
			res.writeHead(403);
			res.end("Forbidden");
			return;
		}
		try {
			if (statSync(filePath).isDirectory()) {
				filePath = join(filePath, "index.html");
				statSync(filePath);
			}
			const mime = getMimeType(filePath);
			const content = readFileSync(filePath);
			res.writeHead(200, { "Content-Type": mime });
			res.end(content);
		} catch {
			res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
			res.end("Not Found");
		}
	});
	server.listen(port, () => {
		writePid(process.pid);
		console.log(`✅ 静态服务器已启动: http://localhost:${port}/`);
		console.log(`   目录: ${dir}`);
		console.log(`   PID: ${process.pid}`);
		console.log(`   停止服务: node serve.mjs stop`);
	});
	process.on("SIGINT", () => {
		removePid();
		server.close();
		process.exit(0);
	});
	process.on("SIGTERM", () => {
		removePid();
		server.close();
		process.exit(0);
	});
}
/** 停止服务器 */
function stopServer() {
	const pid = readPid();
	if (!pid) {
		console.log("服务未运行");
		return;
	}
	try {
		process.kill(pid);
		removePid();
		console.log(`✅ 服务已停止（PID: ${pid}）`);
	} catch {
		removePid();
		console.log("服务进程已不存在，已清理 PID 文件");
	}
}
/** 查看状态 */
function showStatus(port) {
	const pid = readPid();
	if (pid) {
		console.log(`🟢 服务运行中`);
		console.log(`   PID: ${pid}`);
		console.log(`   地址: http://localhost:${port}/`);
	} else console.log(` 服务未运行`);
}
/** 打开浏览器 */
function openBrowser(url) {
	const platform = process.platform;
	let cmd, args;
	if (platform === "win32") {
		cmd = "cmd";
		args = [
			"/c",
			"start",
			url
		];
	} else if (platform === "darwin") {
		cmd = "open";
		args = [url];
	} else {
		cmd = "xdg-open";
		args = [url];
	}
	(0, import_cross_spawn.spawn)(cmd, args, {
		detached: true,
		stdio: "ignore"
	}).unref();
}
/** 解析命令行参数 */
function parseArgs(argv) {
	const args = argv.slice(2);
	const cmd = args[0] || "help";
	const flags = {};
	let dir = null;
	let openPath = null;
	for (let i = 1; i < args.length; i++) if (args[i] === "-p" || args[i] === "--port") flags.port = parseInt(args[++i]);
	else if (args[i] === "-d" || args[i] === "--dir") dir = args[++i];
	else if (args[i] === "-h" || args[i] === "--help") flags.help = true;
	else if (cmd === "open" && !args[i].startsWith("-")) openPath = args[i];
	return {
		cmd,
		flags,
		dir,
		openPath
	};
}
/** 主逻辑 */
async function main() {
	const { cmd, flags, dir, openPath } = parseArgs(process.argv);
	const port = flags.port || DEFAULT_PORT;
	if (flags.help || cmd === "help") {
		console.log(`
hq-serve - 静态文件服务器（零依赖）

用法:
  node serve.mjs start [-p 端口] [-d 目录]   启动服务器
  node serve.mjs stop                        停止服务器
  node serve.mjs status [-p 端口]            查看状态
  node serve.mjs open [-p 端口] [路径]       打开浏览器

选项:
  -p, --port <端口>    指定端口（默认 3000）
  -d, --dir <目录>     指定服务目录（默认当前目录）
  -h, --help           显示帮助
`);
		return;
	}
	const serveDir = dir ? join(process.cwd(), dir) : process.cwd();
	switch (cmd) {
		case "start":
			await startServer(serveDir, port);
			break;
		case "stop":
			stopServer();
			break;
		case "status":
			showStatus(port);
			break;
		case "open": {
			if (!readPid()) {
				console.error("服务未运行，请先执行: node serve.mjs start");
				process.exit(1);
			}
			const url = `http://localhost:${port}/${openPath || ""}`;
			openBrowser(url);
			console.log(` 已打开: ${url}`);
			break;
		}
		default:
			console.error(`未知命令: ${cmd}`);
			console.log("运行 node serve.mjs help 查看帮助");
			process.exit(1);
	}
}
main().catch((err) => {
	console.error("错误:", err.message);
	process.exit(1);
});
//#endregion
export {};

//# sourceMappingURL=serve.mjs.map