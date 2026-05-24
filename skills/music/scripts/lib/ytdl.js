#!/usr/bin/env node
"use strict";

const { run, exitWithError } = require("./utils");

// 单曲搜索时拉取的候选数量；多取候选用于过滤非歌曲结果。
const SINGLE_SEARCH_COUNT = 12;

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
  // 用候选项自己的 URL 获取音频，避免"元数据是 A、播放 URL 是 B"的错配。
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
function ytSongSearch(query, selectSongCandidates) {
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

module.exports = {
  SINGLE_SEARCH_COUNT,
  parseJsonLines,
  ytSearch,
  ytFlatSearch,
  videoUrlForItem,
  ytMediaInfoForItem,
  ytAudioUrlForItem,
  musicSearchQueries,
  uniqueItems,
  ytSongSearch,
};
