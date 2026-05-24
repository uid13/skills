#!/usr/bin/env node
"use strict";

const { spawn } = require("child_process");
const net = require("net");
const { IS_WINDOWS, run, sleep } = require("./utils");

// mpv IPC 服务名；Windows 会映射为命名管道，类 Unix 系统会映射为 /tmp 下的 socket。
const PIPE_NAME = "mpv-socket";

// mpv IPC 连接地址，后续控制命令都通过该地址发送。
const IPC_PATH = IS_WINDOWS ? "\\\\.\\pipe\\mpv-socket" : `/tmp/${PIPE_NAME}`;

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

// 支持的播放控制动作；同时用于 CLI 快捷命令校验。
const CONTROL_ACTIONS = Object.keys(CONTROL_MAP);

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

module.exports = {
  PIPE_NAME,
  IPC_PATH,
  CONTROL_MAP,
  CONTROL_ACTIONS,
  LABELS,
  mpvIsRunning,
  killMpv,
  sendIpc,
  waitForMpv,
  waitForMpvToStop,
  startMpv,
};
