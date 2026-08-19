# B站 音源适配

## 元信息

- 语言支持：中文 **极全**（华语流行/OST/翻唱）；英文 少（官方MV/搬运）
- 风控级别：低-中（搜索偶发 412，需 UA + Referer）
- 差异参数：Referer `https://www.bilibili.com/`（经 yt-dlp 拉流）

## search(keyword) 模板

搜索使用 `bilisearch5:` 前缀（**非 flat** 模式直接拿 BV 号），携带随机桌面 UA：

```bash
yt-dlp "bilisearch5:<词>" --skip-download --print "%(id)s ||| %(title)s ||| %(duration_string)s ||| %(view_count)s" --no-warnings --user-agent "<UA>"
```

输出字段：`id`（BV 号）、`title`（标题）、`duration_string`（时长）、`view_count`（播放量）。

## select 要点

- 标题匹配歌曲名/艺人名，时长 120-420s
- 优先原唱/官方版本（标题含"原唱""官方""OST"等标注），区分翻唱/搬运
- 候选相当时优先播放量高的条目

## play(playUrl) 模板

**差异参数**：`--ytdl-raw-options=add-header=Referer:https://www.bilibili.com/` + 播放 URL `https://www.bilibili.com/video/<BV号>`；UA 经 `--ytdl-raw-options=user-agent=<UA>` 传递。

Windows / Linux / macOS (Git Bash)：

```bash
node <skill-dir>/scripts/dist/music.mjs stop
UA="$(node <skill-dir>/scripts/dist/gen-ua.mjs)"
MSYS_NO_PATHCONV=1 mpv --no-video --ytdl --ytdl-format=bestaudio --input-ipc-server='\\\\.\\pipe\\mpv-ipc' "--ytdl-raw-options=user-agent=\"$UA\"" --ytdl-raw-options=add-header=Referer:https://www.bilibili.com/ "https://www.bilibili.com/video/<BV号>" > /dev/null 2>&1 &
sleep 5
node <skill-dir>/scripts/dist/music.mjs status
```

Linux/macOS (Bash, 原生 shell)：

```bash
node <skill-dir>/scripts/dist/music.mjs stop
UA="$(node <skill-dir>/scripts/dist/gen-ua.mjs)"
nohup mpv --no-video --ytdl --ytdl-format=bestaudio --input-ipc-server=/tmp/mpv-ipc "--ytdl-raw-options=user-agent=\"$UA\"" --ytdl-raw-options=add-header=Referer:https://www.bilibili.com/ "https://www.bilibili.com/video/<BV号>" > /dev/null 2>&1 &
sleep 5
node <skill-dir>/scripts/dist/music.mjs status
```

> `--no-video --ytdl-format=bestaudio --input-ipc-server` + 随机 UA 由 SKILL.md 契约统一固定，此处仅列 B站差异化参数（Referer + BV URL）。
> **Windows 注意**：Git Bash 会折叠反斜杠，IPC 路径必须写 **4 个反斜杠** `'\\\\.\\pipe\\mpv-ipc'` 才能让 mpv 收到正确的 `\\.\pipe\mpv-ipc`；UA 值含空格需内嵌双引号 `\"$UA\"`。

## 边界情况

- **412 风控**：必须使用桌面端 UA（gen-ua.mjs 固定生成 `deviceCategory:'desktop'`）；若仍遇 412，换新 UA 重试，仍失败则跳过该源
- **必须用 BV 号**：`--flat-playlist` 只返回数字 av 号，无法播放；必须用非 flat 搜索直接取 BV 号
- **Windows 中文系统输出乱码**：yt-dlp（PyInstaller 版）stdout 按系统代码页（GBK）写入，中文标题在 UTF-8 终端/工具下显示乱码，`PYTHONIOENCODING=utf-8` 无效。搜索输出应经 `iconv -f GBK -t UTF-8` 转码后再解析标题（macOS/Linux 默认 UTF-8，无此问题）
