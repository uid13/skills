---
name: music
description: "播放音乐、控制播放。当用户想听歌、播放歌曲、暂停/继续/切歌、调节音量、单曲循环等音乐相关操作时触发。支持搜索 YouTube 音乐并用 mpv 播放。适配 opencode、codex、OpenClaw、Cursor、Gemini 等智能体编码助手。"
license: MIT
---

# Music Player Skill

在线音乐播放和播放控制技能。模型直接调用 yt-dlp 和 mpv CLI，music.mjs 仅用于播放控制。

**支持平台**：Git Bash (Windows)、Linux、macOS。不支持 PowerShell。

## 依赖检查（首次使用）

在首次使用前，在终端尝试运行以下命令。如果提示"找不到命令"，则说明未安装：

```bash
yt-dlp --version
mpv --version
```

如果缺少依赖，提示用户安装：
- **yt-dlp**: https://github.com/yt-dlp/yt-dlp#installation
- **mpv**: https://mpv.io/installation/

## 意图识别与处理

| 意图 | 判断依据 | 处理流程 |
|-----|---------|---------|
| 明确搜索 | 含歌曲名、艺人、心情、场景、曲风等 | 清洗输入 → 搜索 → 选择 → 播放 |
| 需要澄清 | 只说"放点歌""来首音乐"，没有具体偏好 | 先问 1-2 个问题 |
| 播放控制 | 暂停、继续、下一首、音量等 | 调用 music.mjs |

**澄清优先级**：先问心情或场景 → 再问偏中文还是英文 → 不问播放器、脚本等技术细节。

推荐澄清句：`想听什么心情或场景的？偏中文还是英文？`

## 输入清洗

搜索前，模型先将用户输入清洗并构造为干净的搜索词：去除命令词（播放/play/来点等）、标点和多余空格，必要时补全艺人信息。

## 搜索策略

| 场景 | 策略 | 示例 |
|------|------|------|
| 歌曲名明确 | 直接用清洗后的歌曲名 + 艺人名 | `yt-dlp "ytsearch5:泡沫 邓紫棋"` |
| 心情/场景明确 | 转成自然搜索词 | `yt-dlp "ytsearch5:适合写代码的轻快中文歌"` |
| 曲风明确 | 曲风 + 语言/节奏偏好 | `yt-dlp "ytsearch5:city pop Japanese song"` |
| 片名/作品名明确 | 搜索主题曲、插曲或 OST | `yt-dlp "ytsearch5:双城之战 主题曲"` |

**注意**：所有搜索词都必须先经过"输入清洗"步骤，不能直接使用用户原始输入。

## 播放流程

### 步骤 1：搜索 YouTube

```bash
yt-dlp "ytsearch5:泡沫 邓紫棋" --dump-json --flat-playlist --no-warnings
```

输出为 JSON lines 格式（每行一个视频），包含字段：
- `id`: YouTube 视频 ID
- `title`: 视频标题
- `duration`: 时长（秒）
- `uploader`: 上传者
- `url`: YouTube URL

### 步骤 2：选择最佳匹配

模型根据以下标准选择最佳视频：
1. **标题匹配**：标题包含歌曲名和艺人名
2. **时长合理**：120-420 秒（2-7 分钟）
3. **优先选择**：official、album、artist 版本
4. **兜底播放**：如果没有官方版本，live、cover、remix 版本也可以播放（总比没声音好）

### 步骤 3：停止旧播放并启动 mpv

**重要**：在启动新播放前，必须先停止当前正在运行的 mpv 进程，避免多实例冲突。

**注意**：`stop` 命令会强制关闭当前所有 mpv 进程。如果您正在使用 mpv 播放本地文件，可能会被意外关闭。

**Windows (PowerShell)**：
```powershell
node <skill-dir>/scripts/dist/music.mjs stop
Start-Process mpv -ArgumentList "--no-video","--ytdl","--ytdl-format=bestaudio","--input-ipc-server=\\.\pipe\mpv-ipc","https://www.youtube.com/watch?v=VIDEO_ID" -WindowStyle Hidden
```

**Linux/macOS (Bash)**：
```bash
node <skill-dir>/scripts/dist/music.mjs stop
nohup mpv --no-video --ytdl --ytdl-format=bestaudio --input-ipc-server=/tmp/mpv-ipc "https://www.youtube.com/watch?v=VIDEO_ID" > /dev/null 2>&1 &
```

**参数说明**：
- `--no-video`: 只播放音频，不显示视频
- `--ytdl`: 启用 yt-dlp 支持（mpv 内部自动调用 yt-dlp 提取音频流）
- `--ytdl-format=bestaudio`: 优先选择最佳音质
- `--input-ipc-server`: 指定 IPC 路径（必须加，否则 music.mjs 无法控制）
- 后台运行，脱离终端

### 步骤 4：确认播放

立即响应用户："正在播放：[歌曲名] - [艺人名]"

## 播放控制

所有控制命令通过 `music.mjs` 调用：

```bash
node <skill-dir>/scripts/dist/music.mjs <command>
```

| 用户输入 | 命令 | 说明 |
|---------|------|------|
| `播放 歌曲名`、`play 歌曲名`、`我想听 歌曲名` | - | 清洗 → 搜索 → 选择 → 播放 |
| `暂停`、`pause` | `pause` | 暂停播放 |
| `继续播放`、`resume` | `resume` | 恢复播放 |
| `下一首`、`next` | `next` | 下一首 |
| `上一首`、`prev` | `prev` | 上一首 |
| `声音大一点`、`volume up` | `volume-up` | 音量 +10 |
| `声音小一点`、`volume down` | `volume-down` | 音量 -10 |
| `静音`、`mute` | `mute` | 切换静音 |
| `单曲循环`、`loop` | `loop` | 开启单曲循环 |
| `关闭循环`、`loop-off` | `loop-off` | 关闭单曲循环 |
| `退出音乐`、`停止播放`、`stop` | `stop` | 停止播放并退出 |
| `播放状态`、`status` | `status` | 查看播放状态 |

**输出格式**：所有命令输出 JSON 格式。

```json
{ "status": "success", "action": "pause" }
{ "status": "ok", "state": "playing" }
{ "error": "mpv not running" }
```

## 回复要求

1. **播放成功**：转述歌曲信息（`正在播放：Numb - Linkin Park`）+ 1 段 2-4 句歌曲简介
2. **播放失败**：告知 `未找到匹配的歌曲`，建议 `可以尝试更具体的歌曲名或艺人名`
3. **控制命令**：简洁确认（`已暂停`、`已继续播放`、`已切换到下一首`）


