#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

const { usage, exitWithError, checkPlaybackDependencies } = require("./lib/utils");
const { CONTROL_ACTIONS, CONTROL_MAP, mpvIsRunning, killMpv, sendIpc, waitForMpv, waitForMpvToStop, startMpv } = require("./lib/mpv");
const { ytSearch, ytFlatSearch, videoUrlForItem, ytMediaInfoForItem, ytSongSearch } = require("./lib/ytdl");
const { selectSongCandidates } = require("./lib/scoring");
const { printSongInfo, printPlaylistHeader, printControl } = require("./lib/output");

/**
 * 解析 play 子命令参数，支持单曲模式、歌手模式和数量限制。
 */
function parsePlayArgs(args) {
  const options = { query: "", artist: false, count: 10, outfile: "" };
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
    } else if (arg === "--outfile") {
      options.outfile = args[i + 1] || "";
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
    const results = ytFlatSearch(query, searchCount);
    if (results.length === 0) {
      exitWithError(`No artist results found for \`${options.query}\`.`);
    }

    const playlist = selectSongCandidates(options.query, results, options.count, true);
    if (playlist.length === 0) {
      exitWithError(`No song-like results found for artist \`${options.query}\`.`);
    }

    // 使用视频页面 URL，让 mpv 的 ytdl-hook 自行提取音频流，
    // 避免 yt-dlp 提取的临时直链过期导致 HTTP 403。
    const tracks = [];
    for (const item of playlist) {
      const url = videoUrlForItem(item);
      if (url) tracks.push({ item, url });
    }
    if (tracks.length === 0) {
      exitWithError(`Could not get URLs for songs by \`${options.query}\`.`);
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
  const results = ytSongSearch(options.query, selectSongCandidates);
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

  // 直接用 flat 搜索结果的页面 URL 交给 mpv 播放：
  // mpv 内置 ytdl-hook 会自行提取音频流，省掉了 yt-dlp 完整解析（容易被 YouTube bot 检测拦截）。
  const playbackUrl = videoUrlForItem(songs[0]);
  if (!playbackUrl) {
    exitWithError(`Could not get an audio URL for \`${options.query}\`.`);
  }

  startMpv([playbackUrl]);
  if (!(await waitForMpv())) {
    exitWithError("mpv failed to start.");
  }
  printSongInfo({
    title: songs[0].title || options.query,
    uploader: songs[0].uploader || songs[0].channel || "",
    channel: songs[0].channel || songs[0].uploader || "",
    duration: songs[0].duration,
    duration_string: songs[0].duration_string || null,
    upload_date: songs[0].upload_date || "",
  });
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
 * --outfile <path>：将 stdout/stderr 重定向到文件，供调用方轮询读取（配合 Start-Process 使用）。
 */
async function main() {
  const rawArgs = process.argv.slice(2);

  const cleanArgs = [];
  let outputFile = "";
  for (let i = 0; i < rawArgs.length; i += 1) {
    if (rawArgs[i] === "--outfile" && i + 1 < rawArgs.length) {
      outputFile = rawArgs[i + 1];
      i += 1;
    } else {
      cleanArgs.push(rawArgs[i]);
    }
  }

  // --outfile 模式：将 console.log / console.error 重定向到文件
  let outfileFd = null;
  if (outputFile) {
    outfileFd = fs.openSync(outputFile, "w");
    console.log = (...args) => {
      try { fs.writeSync(outfileFd, args.join(" ") + "\n"); } catch {}
    };
    console.error = (...args) => {
      try { fs.writeSync(outfileFd, args.join(" ") + "\n"); } catch {}
    };
    console.log(JSON.stringify({ status: "searching", time: new Date().toISOString() }));
    process.on("exit", () => {
      try { fs.closeSync(outfileFd); } catch {}
    });
    process.on("uncaughtException", (err) => {
      try {
        fs.writeSync(outfileFd, JSON.stringify({ status: "error", message: err.message }) + "\n");
      } catch {}
      process.exit(1);
    });
  }

  const [command, ...args] = cleanArgs;
  try {
    if (command === "play") {
      await play(args);
      if (outfileFd !== null) {
        fs.writeSync(outfileFd, JSON.stringify({ status: "done" }) + "\n");
      }
      return;
    }

    if (command === "control") {
      await control(args[0]);
      return;
    }

    if (CONTROL_ACTIONS.includes(command)) {
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
