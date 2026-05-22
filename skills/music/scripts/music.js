#!/usr/bin/env node
"use strict";

const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const net = require("net");
const os = require("os");
const path = require("path");

// mpv IPC 服务名；Windows 会映射为命名管道，类 Unix 系统会映射为 /tmp 下的 socket。
const PIPE_NAME = "mpv-socket";

// 当前运行平台是否为 Windows，用于选择进程检查、停止命令和 IPC 路径。
const IS_WINDOWS = process.platform === "win32";

// mpv IPC 连接地址，后续控制命令都通过该地址发送。
const IPC_PATH = IS_WINDOWS ? "\\\\.\\pipe\\mpv-socket" : `/tmp/${PIPE_NAME}`;

// 支持的播放控制动作；同时用于 CLI 快捷命令校验。
const CONTROL_ACTIONS = [
  "toggle-pause",
  "pause",
  "resume",
  "next",
  "prev",
  "volume-up",
  "volume-down",
  "mute",
  "loop",
  "loop-off",
  "stop",
  "status",
];

// 将用户侧控制动作映射为 mpv IPC 命令。
const CONTROL_MAP = {
  "toggle-pause": { command: ["cycle", "pause"] },
  pause: { command: ["set_property", "pause", true] },
  resume: { command: ["set_property", "pause", false] },
  next: { command: ["playlist-next"] },
  prev: { command: ["playlist-prev"] },
  "volume-up": { command: ["add", "volume", 10] },
  "volume-down": { command: ["add", "volume", -10] },
  mute: { command: ["cycle", "mute"] },
  loop: { command: ["set_property", "loop-file", "inf"] },
  "loop-off": { command: ["set_property", "loop-file", "no"] },
  stop: { command: ["stop"] },
  status: { command: ["get_property", "pause"] },
};

// 控制命令成功后展示给用户的简短文案。
const LABELS = {
  "toggle-pause": "Pause toggled",
  pause: "Paused",
  resume: "Resumed",
  next: "Skipped to next track",
  prev: "Returned to previous track",
  "volume-up": "Volume increased by 10",
  "volume-down": "Volume decreased by 10",
  mute: "Mute toggled",
  loop: "Single-track loop enabled",
  "loop-off": "Loop disabled",
  stop: "Stopped",
  status: "Status",
};

// 不同系统下的依赖安装提示。
const INSTALL_COMMANDS = {
  win32: "winget install yt-dlp mpv",
  darwin: "brew install yt-dlp mpv",
  linux: "sudo apt install yt-dlp mpv",
};

// 单曲搜索时拉取的候选数量；多取候选用于过滤非歌曲结果。
const SINGLE_SEARCH_COUNT = 12;

// 歌曲候选的最长时长，超过该值通常是合集、环境音或长视频。
const MAX_SONG_DURATION_SECONDS = 15 * 60;

// 歌曲候选的最短时长，低于该值通常是片段或短视频。
const MIN_SONG_DURATION_SECONDS = 45;

// 明显不是歌曲的标题、频道或分类关键词，用于搜索结果过滤。
const NON_SONG_PATTERNS = [
  /\ball movie clips?\b/i,
  /\bmovie clips?\b/i,
  /\bfilm\s*&\s*animation\b/i,
  /\btrailer\b/i,
  /\bscene\b/i,
  /\bepisode\b/i,
  /\bfull movie\b/i,
  /\bcartoon\b/i,
  /\bdisney kids\b/i,
  /\bambience\b/i,
  /\bsleep\b/i,
  /\bstudy\b/i,
  /\brelax(?:ation|ing)?\b/i,
  /\bfocus\b/i,
  /\blofi\b/i,
  /\bfan[-\s]?made\b/i,
  /\bvideo musical\b/i,
  /\b\d+\s*hours?\b/i,
  /\bone hour\b/i,
];

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
 * 判断 mpv 进程是否正在运行。
 */
function mpvIsRunning() {
  if (IS_WINDOWS) {
    const result = run("tasklist", ["/FI", "IMAGENAME eq mpv.exe"]);
    return /mpv\.exe/i.test(result.stdout || "");
  }
  const result = run("pgrep", ["-x", "mpv"]);
  return result.status === 0;
}

/**
 * 停止现有 mpv 进程，避免多个播放器争用同一个 IPC 名称。
 */
function killMpv() {
  if (IS_WINDOWS) {
    run("taskkill", ["/F", "/IM", "mpv.exe"]);
    run("taskkill", ["/F", "/IM", "mpv.com"]);
  } else {
    run("pkill", ["-x", "mpv"]);
  }
}

/**
 * 通过 mpv IPC 发送控制命令，并解析 mpv 返回的 JSON 响应。
 */
function sendIpc(command, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const socket = net.createConnection(IPC_PATH);
    const chunks = [];
    let settled = false;

    function finish(ok, response, error) {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({ ok, response, error });
    }

    // mpv IPC 每条命令用一行 JSON 表示，响应也按行返回。
    socket.setTimeout(timeoutMs);
    socket.on("connect", () => {
      socket.write(`${JSON.stringify(command)}\n`);
    });
    socket.on("data", (chunk) => {
      chunks.push(chunk);
      const data = Buffer.concat(chunks).toString("utf8").trim();
      const firstLine = data.split(/\r?\n/).find(Boolean);
      if (!firstLine) return;
      try {
        const response = JSON.parse(firstLine);
        finish(response.error === "success", response, response.error);
      } catch (error) {
        finish(false, null, `Invalid mpv response: ${firstLine}`);
      }
    });
    socket.on("timeout", () => finish(false, null, "IPC timeout"));
    socket.on("error", (error) => finish(false, null, error.message));
    socket.on("end", () => {
      if (!settled) {
        // 部分场景连接结束时才拿到输出，这里兜底读取已缓存内容。
        const data = Buffer.concat(chunks).toString("utf8").trim();
        finish(Boolean(data), null, data ? null : "No IPC response");
      }
    });
  });
}

/**
 * 等待 mpv 启动并确认 IPC 可用。
 */
async function waitForMpv() {
  for (let i = 0; i < 20; i += 1) {
    if (mpvIsRunning()) {
      // 进程出现不代表 IPC 已就绪，所以用一次轻量查询确认可控。
      const result = await sendIpc({ command: ["get_property", "pause"] }, 500);
      if (result.ok || result.response) return true;
    }
    await sleep(300);
  }
  return false;
}

/**
 * 后台启动 mpv 播放音频，并开启 IPC 供后续控制命令使用。
 */
function startMpv(args) {
  const ipcArg = `--input-ipc-server=${IPC_PATH}`;
  const child = spawn("mpv", ["--no-video", "--idle=yes", "--volume=100", "--ytdl-format=bestaudio/best", ipcArg, ...args], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
}

/**
 * 解析 yt-dlp 的逐行 JSON 输出，忽略无法解析的行。
 */
function parseJsonLines(output) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

/**
 * 使用 yt-dlp 在 YouTube 上搜索并返回候选视频元数据。
 */
function ytSearch(query, count = 1) {
  const result = run("yt-dlp", [`ytsearch${count}:${query}`, "--dump-json", "--no-warnings"], {
    timeout: 60000,
  });
  if (result.error) {
    exitWithError(`yt-dlp failed: ${result.error.message}`);
  }
  if (result.status !== 0 && !result.stdout) {
    exitWithError("Could not search YouTube.", [`\`${(result.stderr || "").trim() || "yt-dlp returned no output"}\``]);
  }
  return parseJsonLines(result.stdout || "");
}

/**
 * 使用 flat 搜索快速获取候选列表；不会逐个展开完整视频元数据，适合单曲模式首选。
 */
function ytFlatSearch(query, count = 1) {
  const result = run("yt-dlp", [`ytsearch${count}:${query}`, "--dump-json", "--flat-playlist", "--no-warnings"], {
    timeout: 30000,
  });
  if (result.error) {
    exitWithError(`yt-dlp failed: ${result.error.message}`);
  }
  if (result.status !== 0 && !result.stdout) {
    exitWithError("Could not search YouTube.", [`\`${(result.stderr || "").trim() || "yt-dlp returned no output"}\``]);
  }
  return parseJsonLines(result.stdout || "");
}

/**
 * 从候选项中提取可交给 yt-dlp 解析的视频页 URL。
 */
function videoUrlForItem(item) {
  return item.webpage_url || item.original_url || item.url || (item.id ? `https://www.youtube.com/watch?v=${item.id}` : "");
}

/**
 * 对最终候选做一次完整解析，确认音频可用并获取展示用元数据。
 */
function ytMediaInfoForItem(item) {
  const url = videoUrlForItem(item);
  if (!url) return null;

  const result = run("yt-dlp", [url, "--no-playlist", "-f", "bestaudio", "--dump-json", "--no-warnings"], {
    timeout: 60000,
  });
  if (result.error) {
    exitWithError(`yt-dlp failed: ${result.error.message}`);
  }

  const info = parseJsonLines(result.stdout || "")[0];
  if (!info || !info.url) return null;
  return {
    ...item,
    ...info,
    url: info.url,
    webpage_url: info.webpage_url || url,
  };
}

/**
 * 根据已选中的候选视频获取实际音频流 URL。
 */
function ytAudioUrlForItem(item) {
  // 用候选项自己的 URL 获取音频，避免“元数据是 A、播放 URL 是 B”的错配。
  const url = videoUrlForItem(item);
  if (!url) return "";

  const result = run("yt-dlp", [url, "--no-playlist", "-f", "bestaudio", "-g", "--no-warnings"], {
    timeout: 60000,
  });
  if (result.error) {
    exitWithError(`yt-dlp failed: ${result.error.message}`);
  }
  return ((result.stdout || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)[0] || "");
}

/**
 * 将用户输入扩展成多组更偏音乐的搜索词，降低同名电影或普通视频命中率。
 */
function musicSearchQueries(query) {
  return [`${query} official audio`, `${query} official lyric video`, `${query} song`];
}

/**
 * 合并搜索候选，并按视频 ID 或 URL 去重。
 */
function uniqueItems(items) {
  const seen = new Set();
  const unique = [];

  for (const item of items) {
    const key = item.id || item.webpage_url || item.original_url || item.url || item.title;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }

  return unique;
}

/**
 * 单曲模式使用多组搜索词收集候选，再统一排序。
 */
function ytSongSearch(query) {
  const fallbackItems = [];

  // 先用最快的 flat 搜索逐个尝试；有合格候选就停止，避免默认跑满 3 次搜索。
  for (const searchQuery of musicSearchQueries(query)) {
    const results = ytFlatSearch(searchQuery, SINGLE_SEARCH_COUNT);
    const unique = uniqueItems(results);
    if (selectSongCandidates(query, unique, 1).length > 0) return unique;
    fallbackItems.push(...unique);
  }

  return uniqueItems(fallbackItems).slice(0, SINGLE_SEARCH_COUNT * 2);
}

/**
 * 读取候选视频时长，无法读取时返回 0。
 */
function durationSeconds(item) {
  const duration = Number(item.duration);
  return Number.isFinite(duration) ? duration : 0;
}

/**
 * 将候选视频分类合并成便于匹配的文本。
 */
function categoriesText(item) {
  return Array.isArray(item.categories) ? item.categories.join(" ") : "";
}

/**
 * flat 搜索通常没有 categories 字段；没有分类信息时不应按非音乐分类惩罚。
 */
function hasCategoryInfo(item) {
  return Array.isArray(item.categories) && item.categories.length > 0;
}

/**
 * 判断候选视频是否被 YouTube 标记为音乐分类。
 */
function isMusicCategory(item) {
  return /\bmusic\b/i.test(categoriesText(item));
}

/**
 * 判断候选是否属于弱音乐分类，单曲模式下需要额外官方信号才可靠。
 */
function isWeakMusicCategory(item) {
  return /\b(entertainment|people\s*&\s*blogs)\b/i.test(categoriesText(item));
}

/**
 * 判断候选是否来自官方或接近官方的音乐来源。
 */
function isOfficialSource(item) {
  const title = item.title || "";
  const channel = item.channel || "";
  const uploader = item.uploader || "";
  const text = `${title} ${channel} ${uploader}`;
  if (item.channel_is_verified || item.uploader_is_verified) return true;
  if (/\bvevo\b/i.test(text)) return true;
  if (/\bofficial\b/i.test(text) && /\b(audio|video|music|lyrics?|channel)\b/i.test(text)) return true;
  return false;
}

/**
 * 停止旧播放器后短暂等待进程退出，避免固定等待拖慢每次播放。
 */
async function waitForMpvToStop() {
  for (let i = 0; i < 6; i += 1) {
    if (!mpvIsRunning()) return true;
    await sleep(80);
  }
  return !mpvIsRunning();
}

/**
 * 判断候选视频是否带有明显的非歌曲信号。
 */
function hasNonSongSignals(item) {
  const text = `${item.title || ""} ${item.channel || ""} ${item.uploader || ""} ${categoriesText(item)}`;
  return NON_SONG_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * 转义字符串，供动态正则安全使用。
 */
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 根据歌曲名与标题的匹配程度给出额外分数。
 */
function exactSongTitleScore(query, title) {
  const normalizedQuery = query.trim().toLowerCase();
  const normalizedTitle = String(title || "").toLowerCase();
  if (!normalizedQuery || !normalizedTitle.includes(normalizedQuery)) return 0;
  if (normalizedTitle === normalizedQuery) return 60;

  // 标题里常见的分隔符能说明歌曲名是独立片段，而不是普通描述的一部分。
  const escaped = escapeRegex(normalizedQuery);
  const delimiterPattern = new RegExp(`(^|[-–—:("|\\[]\\s*)${escaped}(\\s*(\\]|\\)|$|\\[|\\(|[-–—|/]))`, "i");
  if (delimiterPattern.test(normalizedTitle)) return 50;
  return 12;
}

/**
 * 标题形如 Artist - Song 或 Song - Artist 时，给出较强歌曲标题信号。
 */
function artistSongTitleScore(query, title) {
  const normalizedQuery = query.trim().toLowerCase();
  const normalizedTitle = String(title || "").toLowerCase();
  if (!normalizedQuery || !normalizedTitle.includes(normalizedQuery)) return 0;

  const escaped = escapeRegex(normalizedQuery);
  const sidePattern = new RegExp(`(^|[-–—|/:]\\s*)${escaped}(\\s*(\\(|\\[|$)|\\s*[-–—|/:])`, "i");
  if (sidePattern.test(normalizedTitle)) return 25;

  const cleanedTitle = normalizedTitle
    .replace(/\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleanedTitle.includes(normalizedQuery)) return 15;

  return 0;
}

/**
 * 查询词后紧跟斜杠通常表示串烧、合作版或混搭版本，短歌名尤其容易误选。
 */
function titleVariantPenalty(query, title) {
  const normalizedQuery = query.trim().toLowerCase();
  const normalizedTitle = String(title || "").toLowerCase();
  if (!normalizedQuery || !normalizedTitle.includes(normalizedQuery)) return 0;

  const escaped = escapeRegex(normalizedQuery);
  const variantPattern = new RegExp(`${escaped}\\s*/\\s*\\S+`, "i");
  if (variantPattern.test(normalizedTitle)) return 30;

  return 0;
}

/**
 * 给候选视频打分；非歌曲或异常时长直接淘汰。
 */
function songScore(query, item, artistMode = false) {
  const duration = durationSeconds(item);
  // 歌曲通常不会过短或过长，过滤掉片段、环境音和超长合集。
  if (duration && (duration < MIN_SONG_DURATION_SECONDS || duration > MAX_SONG_DURATION_SECONDS)) {
    return Number.NEGATIVE_INFINITY;
  }
  if (hasNonSongSignals(item)) {
    return Number.NEGATIVE_INFINITY;
  }

  const title = item.title || "";
  const text = `${title} ${item.channel || ""} ${item.uploader || ""}`;
  const officialSource = isOfficialSource(item);
  const musicCategory = isMusicCategory(item);
  const weakMusicCategory = isWeakMusicCategory(item);
  const hasCategories = hasCategoryInfo(item);
  let score = 0;

  // 分类、标题和官方信号共同决定排序，避免只看第一条搜索结果。
  if (duration) score += 20;
  if (musicCategory) score += 45;
  if (officialSource) score += 35;
  if (!artistMode) {
    score += exactSongTitleScore(query, title);
    score += artistSongTitleScore(query, title);
    score -= titleVariantPenalty(query, title);
  }
  if (/\bofficial\b/i.test(text)) score += 12;
  if (/\b(audio|lyric video|lyrics?|mv)\b/i.test(text)) score += 12;
  if (/\b(cover|karaoke|reaction|tutorial|lesson|remix|reworked)\b/i.test(text)) score -= 20;
  if (hasCategories && weakMusicCategory && !officialSource) score -= 25;
  if (hasCategories && !musicCategory && !officialSource) score -= 18;

  return score;
}

/**
 * 从候选视频中选出最像歌曲的结果。
 */
function selectSongCandidates(query, items, limit, artistMode = false) {
  return items
    .map((item) => ({ item, score: songScore(query, item, artistMode) }))
    .filter(({ score }) => Number.isFinite(score) && score >= (artistMode ? 25 : 45))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item }) => item);
}

/**
 * 将秒数或 yt-dlp 的时长字符串格式化为 mm:ss。
 */
function formatDuration(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  const total = Math.floor(Number(value));
  if (!Number.isFinite(total)) return "";
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

/**
 * 从上传日期中提取年份。
 */
function yearFromUploadDate(value) {
  if (!value || typeof value !== "string" || value.length < 4) return "";
  return value.slice(0, 4);
}

/**
 * 输出单曲播放信息，格式为 Markdown。
 */
function printSongInfo(info) {
  const title = info.title || "Unknown title";
  const uploader = info.uploader || info.channel || "";
  const year = yearFromUploadDate(info.upload_date);
  const duration = formatDuration(info.duration_string || info.duration);

  // 输出保持简短，歌曲简介由智能体根据这些字段补充。
  const lines = ["## Now Playing", "", `**${title}**`, "", "| Field | Value |", "|---|---|"];
  if (uploader) lines.push(`| Artist / Channel | ${escapeTable(uploader)} |`);
  if (year) lines.push(`| Year | ${escapeTable(year)} |`);
  if (duration) lines.push(`| Duration | ${escapeTable(duration)} |`);
  console.log(lines.join("\n"));
}

/**
 * 输出歌手模式的播放列表信息，格式为 Markdown。
 */
function printPlaylistHeader(artist, songs, urlCount) {
  const lines = [
    "## Playlist Started",
    "",
    `**${artist}**`,
    "",
    `Loaded ${urlCount} track${urlCount === 1 ? "" : "s"}.`,
    "",
    "| # | Title |",
    "|---:|---|",
  ];
  songs.forEach((item, index) => {
    lines.push(`| ${index + 1} | ${escapeTable(item.title || "Unknown title")} |`);
  });
  console.log(lines.join("\n"));
}

/**
 * 输出播放控制结果，格式为 Markdown。
 */
function printControl(action, value = "") {
  const label = LABELS[action] || action;
  const lines = ["## Playback Control", "", `**${label}**`];
  if (value) lines.push("", value);
  console.log(lines.join("\n"));
}

/**
 * 转义 Markdown 表格单元格中的特殊字符。
 */
function escapeTable(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

/**
 * 解析 play 子命令参数，支持单曲模式、歌手模式和数量限制。
 */
function parsePlayArgs(args) {
  const options = { query: "", artist: false, count: 10 };
  const queryParts = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--artist") {
      options.artist = true;
    } else if (arg === "--count") {
      // --count 只对歌手模式有意义，但这里统一解析，保持参数处理简单。
      const raw = args[i + 1];
      if (!raw) exitWithError("`--count` requires a number.");
      const parsed = Number.parseInt(raw, 10);
      if (!Number.isFinite(parsed) || parsed < 1) {
        exitWithError("`--count` must be a positive number.");
      }
      options.count = Math.min(parsed, 20);
      i += 1;
    } else {
      queryParts.push(arg);
    }
  }

  options.query = queryParts.join(" ").trim();
  if (!options.query) exitWithError("Missing song or artist name.");
  return options;
}

/**
 * 执行播放逻辑：根据参数选择单曲模式或歌手播放列表模式。
 */
async function play(args) {
  const options = parsePlayArgs(args);
  checkPlaybackDependencies();
  // 新播放前先停止旧播放器，确保 IPC 名称和音频输出只有一个活跃实例。
  killMpv();
  await waitForMpvToStop();

  if (options.artist) {
    // 歌手模式多取一些候选，再通过歌曲筛选挑出指定数量。
    const searchCount = Math.min(options.count * 3, 20);
    const query = `${options.query} popular songs`;
    const results = ytSearch(query, searchCount);
    if (results.length === 0) {
      exitWithError(`No artist results found for \`${options.query}\`.`);
    }

    const playlist = selectSongCandidates(options.query, results, options.count, true);
    if (playlist.length === 0) {
      exitWithError(`No song-like results found for artist \`${options.query}\`.`);
    }

    // 逐个候选获取音频 URL；失败的候选跳过，不影响其他歌曲。
    const tracks = [];
    for (const item of playlist) {
      const url = ytAudioUrlForItem(item);
      if (url) tracks.push({ item, url });
    }
    if (tracks.length === 0) {
      exitWithError(`Could not get audio URLs for songs by \`${options.query}\`.`);
    }

    // mpv 播放列表使用临时文件，避免长 URL 和特殊字符造成命令行解析问题。
    const playlistFile = path.join(os.tmpdir(), `music_playlist_${process.pid}.txt`);
    fs.writeFileSync(playlistFile, `${tracks.map((track) => track.url).join("\n")}\n`, "utf8");
    startMpv([`--playlist=${playlistFile}`]);

    if (!(await waitForMpv())) {
      exitWithError("mpv failed to start.");
    }
    printPlaylistHeader(options.query, tracks.map((track) => track.item), tracks.length);
    return;
  }

  // 单曲模式先搜索多个候选，再从中挑出最像歌曲的一条。
  const results = ytSongSearch(options.query);
  if (results.length === 0) {
    exitWithError(`No song found for \`${options.query}\`.`);
  }

  const songs = selectSongCandidates(options.query, results, 1);
  if (songs.length === 0) {
    exitWithError(`No song-like result found for \`${options.query}\`.`, [
      "Try adding an artist name, for example:",
      "",
      "```bash",
      `node "$skillDir/scripts/music.js" play "${options.query} artist name"`,
      "```",
    ]);
  }

  // 只对最终选中的歌曲做一次完整解析，确认音频可用并获取展示元数据。
  const media = ytMediaInfoForItem(songs[0]);
  if (!media) {
    exitWithError(`Could not get info for \`${options.query}\`.`);
  }

  // 优先使用视频页面 URL，让 mpv 的 ytdl-hook 自行提取音频流，
  // 避免 yt-dlp 提取的临时直链过期导致 HTTP 403。
  const pageUrl = media.webpage_url || videoUrlForItem(songs[0]);
  const playbackUrl = pageUrl || media.url;
  if (!playbackUrl) {
    exitWithError(`Could not get an audio URL for \`${options.query}\`.`);
  }

  startMpv([playbackUrl]);
  if (!(await waitForMpv())) {
    exitWithError("mpv failed to start.");
  }
  printSongInfo(media);
}

/**
 * 执行播放控制命令，例如暂停、继续、下一首、停止和状态查询。
 */
async function control(action) {
  if (!CONTROL_MAP[action]) {
    exitWithError(`Unknown action: \`${action}\`.`, [`Available actions: \`${CONTROL_ACTIONS.join("`, `")}\`.`]);
  }

  if (!mpvIsRunning()) {
    exitWithError("mpv is not running.", ['Start playback first with `node "$skillDir/scripts/music.js" play "Song Name"`']);
  }

  // 控制动作统一通过 mpv IPC 发送，保持跨平台行为一致。
  const result = await sendIpc(CONTROL_MAP[action]);
  if (!result.ok) {
    exitWithError(`Could not send \`${action}\` to mpv.`, [result.error ? `mpv IPC: \`${result.error}\`` : "No IPC response."]);
  }

  if (action === "status") {
    // status 需要把 mpv 的布尔 pause 属性转换成面向用户的状态文本。
    const paused = result.response ? result.response.data : undefined;
    const status = paused === true ? "Paused" : paused === false ? "Playing" : String(paused);
    printControl(action, `Status: **${status}**`);
    return;
  }

  if (action === "stop") {
    // mpv 使用 idle 模式时 stop 只停止当前媒体；这里额外终止进程，避免后台残留。
    killMpv();
  }

  printControl(action);
}

/**
 * 命令行入口，根据第一个参数分发到播放或控制逻辑。
 */
async function main() {
  const [command, ...args] = process.argv.slice(2);
  try {
    if (command === "play") {
      await play(args);
      return;
    }

    if (command === "control") {
      await control(args[0]);
      return;
    }

    if (CONTROL_ACTIONS.includes(command)) {
      // 允许快捷写法：node music.js pause，而不强制 control pause。
      await control(command);
      return;
    }

    console.error(usage());
    process.exit(1);
  } catch (error) {
    exitWithError(error && error.message ? error.message : String(error));
  }
}

main();
