# mail.ru 音源适配

## 元信息

- 语言支持：中文 **几乎无**；英文 有一些（欧美主流歌手）
- 风控级别：低（无需登录，直链即得）
- 差异参数：Referer `https://my.mail.ru/`（直链 mp3 不经 yt-dlp，用 mpv 原生 `--http-header-fields`）

## search(keyword) 模板

无 search 前缀，直接使用搜索 URL（关键词需 URL 编码，空格 → `%20`），携带随机桌面 UA：

```bash
yt-dlp "https://my.mail.ru/music/search/<URL编码词>" --dump-json --no-warnings --playlist-items 1 --user-agent "<UA>"
```

输出 JSON 中取字段：`title`、`duration`（秒）、`url`（mp3 直链）。

## select 要点

- 标题匹配歌曲名/艺人名，时长 120-420s
- 以欧美主流歌手为主，英文歌命中率高
- 只取第一条搜索结果（`--playlist-items 1`）

## play(playUrl) 模板

**差异参数**：`--http-header-fields="Referer: https://my.mail.ru/"` + 播放 URL mp3 直链（**必须 https**）；UA 经 `--http-header-fields="User-Agent: <UA>"` 合并传递。

Windows / Linux / macOS (Git Bash)：

```bash
node <skill-dir>/scripts/dist/music.mjs stop
UA="$(node <skill-dir>/scripts/dist/gen-ua.mjs)"
MSYS_NO_PATHCONV=1 mpv --no-video --input-ipc-server='\\\\.\\pipe\\mpv-ipc' "--http-header-fields=User-Agent: $UA" "--http-header-fields=Referer: https://my.mail.ru/" "https://moosic.my.mail.ru/file/<id>.mp3" > /dev/null 2>&1 &
sleep 5
node <skill-dir>/scripts/dist/music.mjs status
```

Linux/macOS (Bash, 原生 shell)：

```bash
node <skill-dir>/scripts/dist/music.mjs stop
UA="$(node <skill-dir>/scripts/dist/gen-ua.mjs)"
nohup mpv --no-video --input-ipc-server=/tmp/mpv-ipc "--http-header-fields=User-Agent: $UA" "--http-header-fields=Referer: https://my.mail.ru/" "https://moosic.my.mail.ru/file/<id>.mp3" > /dev/null 2>&1 &
sleep 5
node <skill-dir>/scripts/dist/music.mjs status
```

> 直链 mp3 **不经 yt-dlp**，因此**不加** `--ytdl`，契约中的 `--ytdl-format=bestaudio` 自动失效无害。
> **Windows 注意**：Git Bash 会折叠反斜杠，IPC 路径必须写 **4 个反斜杠** `'\\\\.\\pipe\\mpv-ipc'`。

## 边界情况

- **必须 https**：yt-dlp 返回的 `url` 是 http 开头，必须手工转成 https（http 直链返回 404）
- **直链即得**：无需 `--ytdl`，mpv 直接播放 mp3
- 关键词 URL 编码：空格 → `%20`
