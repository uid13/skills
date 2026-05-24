#!/usr/bin/env node
"use strict";

const { escapeRegex } = require("./utils");

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
 * 读取候选视频时长，无法读取时返回 0。
 */
function durationSeconds(item) {
  const duration = Number(item.duration);
  return Number.isFinite(duration) ? duration : 0;
}

/**
 * 将候选视频分类类别合并成便于匹配的文本。
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
 * 判断候选视频是否带有明显的非歌曲信号。
 */
function hasNonSongSignals(item) {
  const text = `${item.title || ""} ${item.channel || ""} ${item.uploader || ""} ${categoriesText(item)}`;
  return NON_SONG_PATTERNS.some((pattern) => pattern.test(text));
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

module.exports = {
  MAX_SONG_DURATION_SECONDS,
  MIN_SONG_DURATION_SECONDS,
  NON_SONG_PATTERNS,
  durationSeconds,
  categoriesText,
  hasCategoryInfo,
  isMusicCategory,
  isWeakMusicCategory,
  isOfficialSource,
  hasNonSongSignals,
  exactSongTitleScore,
  artistSongTitleScore,
  titleVariantPenalty,
  songScore,
  selectSongCandidates,
};
