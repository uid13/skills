# 随机桌面 UA 生成规范

> music 技能 UA 生成的唯一权威来源。每次搜索（B站走 `music.mjs search-bili`，其余走 yt-dlp）/ mpv 播放前，模型按本规范现场生成随机桌面 UA。

## 份额权重表

按桌面浏览器真实份额（Statcounter 2026-07）随机决定本次生成的浏览器，生成 0-99 随机整数落入档位：

| 浏览器 | 份额 | 档位 |
|-------|------|------|
| Chrome | ~70% | 0-69 |
| Edge | ~11% | 70-80 |
| Firefox | ~6.5% | 81-87 |
| Safari | ~5.7% | 88-93 |
| Opera | ~2% | 94-95 |

## UA 模板

版本号取「当前主流版本范围」内整数，**只取范围内，禁止编造超新/超旧版本**。

| 浏览器 | 模板（`<v>` = 主版本，Chrome/Edge/Opera 填 `主.0.0.0`，Firefox 填 `主.0`） |
|-------|------|
| Chrome | `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/<v>.0.0.0 Safari/537.36` |
| Edge | 同 Chrome 末尾加 ` Edg/<v>.0.0.0` |
| Firefox | `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:<v>.0) Gecko/20100101 Firefox/<v>.0` |
| Safari | `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/<主>.<次> Safari/605.1.15` |
| Opera | 同 Chrome 末尾加 ` OPR/<v>.0.0.0` |

## 当前主流版本范围（2026-08）

| 浏览器 | 主版本范围 |
|-------|-----------|
| Chrome / Edge | 130 - 152 |
| Firefox | 125 - 145 |
| Safari | 17 - 27 |
| Opera | 115 - 132 |

## 约束（必须遵守）

1. **只生成桌面端**：禁止含 `Mobile` / `iPhone` / `Android` 的移动端 UA（触发 B 站 412）
2. **平台字段匹配**：Safari 配 macOS，其余配 `Windows NT 10.0; Win64; x64`
3. **固定常量不改**：`AppleWebKit/537.36`、`Safari/537.36`、`Gecko/20100101`、`AppleWebKit/605.1.15` 等历史固定值
4. **同流程复用**：同一首歌的搜索与播放用同一 UA
5. **不用硬编码池**：每次按模板随机拼装
