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

module.exports = {
  formatDuration,
  yearFromUploadDate,
  printSongInfo,
  printPlaylistHeader,
  printControl,
};
