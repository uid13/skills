# SoundCloud 音源适配

## 元信息

- 语言支持：中文 **很少**；英文 好（独立音乐人/翻唱/remix）
- 风控级别：中（需完整 URL，偶发 DRM）
- 差异参数：Referer `https://soundcloud.com/`（经 yt-dlp 拉流）

## search(keyword) 模板

搜索使用 `scsearch5:` 前缀，携带随机桌面 UA：

```bash
yt-dlp "scsearch5:<词>" --dump-json --no-warnings --user-agent "<UA>"
```

输出为 JSON lines，取字段：`webpage_url`（**完整 URL**）、`title`、`duration`（秒）。

## select 要点

- 标题匹配歌曲名/艺人名，时长 120-420s
- 标题可能含独立音乐人/翻唱标注，作为匹配参考
- **跳过 DRM 保护条目**（首条偶发 DRM 不可播，尝试下一条可播条目）

## play(playUrl) 模板

**差异参数**：`--ytdl-raw-options=add-header=Referer:https://soundcloud.com/` + 播放 URL **完整 URL** `https://soundcloud.com/<用户>/<曲名>`；UA 经 `--ytdl-raw-options=user-agent=<UA>` 传递。

Windows / Linux / macOS (Git Bash)：

```bash
node <skill-dir>/scripts/dist/music.mjs stop
UA="$(node <skill-dir>/scripts/dist/gen-ua.mjs)"
MSYS_NO_PATHCONV=1 mpv --no-video --ytdl --ytdl-format=bestaudio --input-ipc-server='\\\\.\\pipe\\mpv-ipc' "--ytdl-raw-options=user-agent=\"$UA\"" --ytdl-raw-options=add-header=Referer:https://soundcloud.com/ "https://soundcloud.com/<用户>/<曲名>" > /dev/null 2>&1 &
sleep 5
node <skill-dir>/scripts/dist/music.mjs status
```

Linux/macOS (Bash, 原生 shell)：

```bash
node <skill-dir>/scripts/dist/music.mjs stop
UA="$(node <skill-dir>/scripts/dist/gen-ua.mjs)"
nohup mpv --no-video --ytdl --ytdl-format=bestaudio --input-ipc-server=/tmp/mpv-ipc "--ytdl-raw-options=user-agent=\"$UA\"" --ytdl-raw-options=add-header=Referer:https://soundcloud.com/ "https://soundcloud.com/<用户>/<曲名>" > /dev/null 2>&1 &
sleep 5
node <skill-dir>/scripts/dist/music.mjs status
```

> `--no-video --ytdl-format=bestaudio --input-ipc-server` + 随机 UA 由 SKILL.md 契约统一固定，此处仅列 SoundCloud 差异化参数（Referer + 完整 URL）。
> **Windows 注意**：Git Bash 会折叠反斜杠，IPC 路径必须写 **4 个反斜杠** `'\\\\.\\pipe\\mpv-ipc'`；UA 值含空格需内嵌双引号 `\"$UA\"`。

## 边界情况

- **必须完整 URL**：纯数字 ID 无法播放，必须用 `https://soundcloud.com/<用户>/<曲名>` 完整 URL
- **DRM 曲目**：偶发 DRM 保护条目不可播，需跳过选可播条目
- 以独立音乐/翻唱/remix 为主，中文歌命中率低
