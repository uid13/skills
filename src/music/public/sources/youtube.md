# YouTube 音源适配

## 元信息

- 语言支持：中文 好；英文 **极全**
- 风控级别：中-高（搜索无需 cookie；播放偶发 bot 检测，需 cookies 备选）
- 差异参数：Referer `https://www.youtube.com/`（经 yt-dlp 拉流）
- 默认：**不携带 cookie**，先以无 cookie 方式尝试；遇 bot 检测再加 cookies 备选

## search(keyword) 模板

搜索使用 `ytsearch5:` 前缀，**无需 cookie**（实测可用），携带随机桌面 UA：

```bash
yt-dlp "ytsearch5:<词>" --dump-json --flat-playlist --no-warnings --user-agent "<UA>"
```

输出字段：`id`、`title`、`duration`、`uploader`、`url`（`https://www.youtube.com/watch?v=<ID>`）。

> 搜索用 `--flat-playlist` 即可；播放时由 mpv 内部调用 yt-dlp 解析视频详情。

## select 要点

- 标题匹配歌曲名/艺人名，时长 120-420s
- 优先 official / album / artist 版本；`channel_is_verified: true` 的官方频道优先
- 兜底：live / cover / remix 版本也可播放（总比没声音好）

## play(playUrl) 模板

**默认无 cookie**（不携带 `--cookies` 参数）：差异参数 = `--ytdl-raw-options=add-header=Referer:https://www.youtube.com/` + 播放 URL `https://www.youtube.com/watch?v=<ID>`；UA 经 `--ytdl-raw-options=user-agent=<UA>` 传递。

Windows / Linux / macOS (Git Bash)：

```bash
node <skill-dir>/scripts/dist/music.mjs stop
UA="$(node <skill-dir>/scripts/dist/gen-ua.mjs)"
MSYS_NO_PATHCONV=1 mpv --no-video --ytdl --ytdl-format=bestaudio --input-ipc-server='\\\\.\\pipe\\mpv-ipc' "--ytdl-raw-options=user-agent=\"$UA\"" --ytdl-raw-options=add-header=Referer:https://www.youtube.com/ "https://www.youtube.com/watch?v=<ID>" > /dev/null 2>&1 &
sleep 5
node <skill-dir>/scripts/dist/music.mjs status
```

Linux/macOS (Bash, 原生 shell)：

```bash
node <skill-dir>/scripts/dist/music.mjs stop
UA="$(node <skill-dir>/scripts/dist/gen-ua.mjs)"
nohup mpv --no-video --ytdl --ytdl-format=bestaudio --input-ipc-server=/tmp/mpv-ipc "--ytdl-raw-options=user-agent=\"$UA\"" --ytdl-raw-options=add-header=Referer:https://www.youtube.com/ "https://www.youtube.com/watch?v=<ID>" > /dev/null 2>&1 &
sleep 5
node <skill-dir>/scripts/dist/music.mjs status
```

> `--no-video --ytdl-format=bestaudio --input-ipc-server` + 随机 UA 由 SKILL.md 契约统一固定，此处仅列 YouTube 差异化参数（Referer + 视频 URL）。
> **Windows 注意**：Git Bash 会折叠反斜杠，IPC 路径必须写 **4 个反斜杠** `'\\\\.\\pipe\\mpv-ipc'`；UA 值含空格需内嵌双引号 `\"$UA\"`。

## 边界情况

- **默认无 cookie**：搜索完全可用（实测通过）；播放解析偶发 bot 检测（`Sign in to confirm you're not a bot`）
- **bot 检测备选**：若播放后 status 失败，追加 cookies 重试 1 次：
  - mpv `--ytdl-raw-options=cookies-from-browser=<chrome|edge|firefox>`（读取浏览器登录态）
  - 或 `--ytdl-raw-options=cookiefile=<文件>`（用 `yt-dlp` 导出的 cookies.txt）
- 年龄限制 / 地区限制曲目无法播放
- fallback 链中 YouTube 放最后（英文曲极全，但播放偶发需 cookies）
