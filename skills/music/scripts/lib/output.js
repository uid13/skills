#!/usr/bin/env node
"use strict";

const { escapeTable } = require("./utils");
const { LABELS } = require("./mpv");

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
 * 输出单曲播放确认，仅显示歌名。
 */
function printSongInfo(info) {
  const title = info.title || "Unknown title";
  console.log(`**Now Playing: ${title}**`);
}

/**
 * 输出歌手模式的播放列表确认。
 */
function printPlaylistHeader(artist, songs, urlCount) {
  const lines = [
    `**Playing: ${artist}** (${urlCount} track${urlCount === 1 ? "" : "s"})`,
    "",
    songs.map((item, index) => `${index + 1}. ${item.title || "Unknown title"}`).join("\n"),
  ];
  console.log(lines.join("\n"));
}

/**
 * 输出播放控制结果。
 */
function printControl(action, value = "") {
  const label = LABELS[action] || action;
  if (value) {
    console.log(`${label}: ${value}`);
  } else {
    console.log(`${label}`);
  }
}

module.exports = {
  formatDuration,
  yearFromUploadDate,
  printSongInfo,
  printPlaylistHeader,
  printControl,
};
