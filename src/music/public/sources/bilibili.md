# B站 音源适配

## 元信息

- 语言支持：中文 **极全**（华语流行/OST/翻唱）；英文 少（官方MV/搬运）
- 风控级别：低（搜索走 `music.mjs search-bili` 子命令 → `/all/v2` 免 cookie/免签名端点，不受 412 频控影响）
- 差异参数：Referer `https://www.bilibili.com/`（经 yt-dlp 拉流）

## search(keyword) 模板

**调用 `music.mjs search-bili` 子命令**（Node 22 内置 fetch 直连 `/all/v2` 端点，免 cookie/免签名，不受搜索接口 412 风控影响；输出 UTF-8 JSON，无乱码问题）：

```bash
node <skill-dir>/scripts/dist/music.mjs search-bili --keyword "<词>" --ua "<UA>"
```

输出结构化 JSON，`candidates` 数组每项字段：

| 字段 | 说明 |
|------|------|
| `bvid` | BV 号（直接用于播放） |
| `duration` | 时长（秒，已从 "分:秒" 转换） |
| `play` | 播放量 |
| `danmaku` | 弹幕数 |
| `title` | 标题（已去除 HTML 高亮标签） |

> 关键词传中文原文即可，子命令内部自动 URL 编码。`<UA>` 为模型按 `reference/ua-spec.md` 生成的随机桌面 UA。

## select 要点

- 标题匹配歌曲名/艺人名，时长 120-420s
- 优先原唱/官方版本（标题含"原唱""官方""OST"等标注），区分翻唱/搬运
- 候选相当时优先播放量（`play`）高的条目

## play(playUrl) 模板

**差异参数**：`--ytdl-raw-options=add-header=Referer:https://www.bilibili.com/` + 播放 URL `https://www.bilibili.com/video/<BV号>`；UA 经 `--ytdl-raw-options=user-agent=<UA>` 传递（`<UA>` 为模型按 `reference/ua-spec.md` 生成的随机桌面 UA）。**播放仍走 yt-dlp 拉流**，仅搜索改用 `music.mjs search-bili`。

Windows / Linux / macOS (Git Bash)：

```bash
node <skill-dir>/scripts/dist/music.mjs stop
UA="<按 ua-spec.md 生成的桌面 UA>"
MSYS_NO_PATHCONV=1 mpv --no-video --ytdl --ytdl-format=bestaudio --input-ipc-server='\\\\.\\pipe\\mpv-ipc' "--ytdl-raw-options=user-agent=\"$UA\"" --ytdl-raw-options=add-header=Referer:https://www.bilibili.com/ "https://www.bilibili.com/video/<BV号>" > /dev/null 2>&1 &
sleep 5
node <skill-dir>/scripts/dist/music.mjs status
```

Linux/macOS (Bash, 原生 shell)：

```bash
node <skill-dir>/scripts/dist/music.mjs stop
UA="<按 ua-spec.md 生成的桌面 UA>"
nohup mpv --no-video --ytdl --ytdl-format=bestaudio --input-ipc-server=/tmp/mpv-ipc "--ytdl-raw-options=user-agent=\"$UA\"" --ytdl-raw-options=add-header=Referer:https://www.bilibili.com/ "https://www.bilibili.com/video/<BV号>" > /dev/null 2>&1 &
sleep 5
node <skill-dir>/scripts/dist/music.mjs status
```

> `--no-video --ytdl-format=bestaudio --input-ipc-server` + 随机 UA 由 SKILL.md 契约统一固定，此处仅列 B站差异化参数（Referer + BV URL）；`<UA>` 由模型按 `reference/ua-spec.md` 生成。
> **Windows 注意**：Git Bash 会折叠反斜杠，IPC 路径必须写 **4 个反斜杠** `'\\\\.\\pipe\\mpv-ipc'` 才能让 mpv 收到正确的 `\\.\pipe\mpv-ipc`；UA 值含空格需内嵌双引号 `\"$UA\"`。

## 边界情况

- **搜索免 412**：`/all/v2` 端点免 cookie/免 WBI 签名，即使搜索接口（`/x/web-interface/wbi/search/type`）被 412 限流也正常返回。若偶发异常，换新 UA 重试 1 次，仍失败则跳过该源
- **必须用 BV 号**：play 模板只认 BV 号；`search-bili` 返回的 `bvid` 字段即为 BV 号，可直接用于播放
- **duration 已转秒**：`/all/v2` 的 `duration` 是 `分:秒` 字符串，`search-bili` 内部已转成秒用于 select 时长判断
- **title 已去 HTML 标签**：搜索高亮的 `<em class="keyword">` 标签已在 `search-bili` 内部去除，直接用于标题匹配
