---
name: music
description: "播放、暂停、控制在线音乐。使用 Node 脚本搜索并播放歌曲，支持 /music、$music、!music、播放、play、放一首、我想听、给我放、来一首、播放歌手、听歌手的歌、暂停/pause、继续/resume、下一首/next、上一首/prev、音量调节、静音、循环、停止等指令。适配 opencode、codex、OpenClaw、Cursor、Gemini 等智能体编码助手。"
license: MIT
---

# Music Player Skill

这是一个歌曲播放和播放控制技能。收到用户请求后，先判断意图是否足够明确；明确时直接播放，模糊时先澄清。不要用本技能播放电影片段、预告片、播客、教程、环境音、白噪音、超长合集或普通视频。

## 处理流程

1. 判断用户意图。
2. 如果请求明确，构造搜索词并调用 `scripts/music.js`。
3. 如果请求模糊，先问 1-2 个简短问题，不要播放。
4. 播放成功后，转述 `Now Playing: ...` 并补充歌曲简介。

## 意图识别

| 意图 | 判断依据 | 处理 |
|---|---|---|
| 明确搜索 | 含歌曲名、艺人、心情、场景、曲风、片名/作品名、语言偏好或节奏快慢 | 直接搜索并播放 |
| 需要澄清 | 只说“放点歌”“来首音乐”“随便听听”“推荐一首”等，没有可用偏好 | 先问 1-2 个问题 |
| 播放控制 | 暂停、继续、下一首、上一首、音量、静音、循环、停止、状态 | 直接执行控制命令 |

澄清优先级：
- 先问心情或场景。
- 再问偏中文还是英文。
- 不问播放器、脚本、平台、安装方式等用户不关心的问题。

推荐澄清句：

```text
想听什么心情或场景的？偏中文还是英文？
```

## 搜索策略

- 歌曲名明确：直接用歌曲名；如果有艺人名，一起加入搜索词。
- 艺人明确但未指定歌曲：使用歌手模式。
- 心情/场景明确：转成自然搜索词，例如 `适合夜晚开车的英文歌`、`适合写代码的轻快中文歌`。
- 曲风明确：把曲风和语言/节奏偏好加入搜索词，例如 `city pop Japanese song`、`中文摇滚歌曲`。
- 片名/作品名明确：搜索主题曲、插曲或 OST，例如 `电影名 主题曲`、`作品名 OST song`。
- 搜索结果必须是歌曲；如果脚本提示没有歌曲结果，向用户索要更明确的歌曲名或艺人名。

## 播放命令

播放命令必须让 bash 工具**快速返回**（< 5 秒），否则会被 shell 超时中断并触发 `ChildProcess.kill`。通过 `--outfile` 把完整输出写到文件，命令本身只是启动搜索+播放。

### Windows（pwsh）

```bash
Start-Process node -ArgumentList "$skillDir/scripts/music.js","play","歌曲名或搜索词","--outfile","$TMPDIR/music_out.json" -WindowStyle Hidden
```

关键：不加 `-Wait`，PowerShell 会立即退出，node 在后台继续搜索和播放。

歌手多首歌：

```bash
Start-Process node -ArgumentList "$skillDir/scripts/music.js","play","歌手名","--artist","--outfile","$TMPDIR/music_out.json" -WindowStyle Hidden
```

### Linux / macOS

```bash
node "$skillDir/scripts/music.js" play "歌曲名或搜索词" --outfile "$TMPDIR/music_out.json" &
```

加 `&` 让 node 在后台运行，shell 立即退出。设置 `timeout: 180000`。

### 播放后读取结果

无论哪个平台，命令立即返回后，**等待 8-15 秒**（搜索+mpv 启动时间），然后读取输出文件：

```bash
# Windows
Get-Content "$TMPDIR\music_out.json"

# Linux / macOS
cat "$TMPDIR/music_out.json"
```

文件内容：
- 成功：`**Now Playing: [歌名]**`
- 失败：`## Music Error\n\n[错误信息]`

### 示例
- `play Numb` → `Start-Process node -ArgumentList "$skillDir/scripts/music.js","play","Numb","--outfile","$TMPDIR/music_out.json" -WindowStyle Hidden`（然后等 10 秒读文件）
- `播放周杰伦的歌` → `Start-Process node -ArgumentList "$skillDir/scripts/music.js","play","周杰伦","--artist","--outfile","$TMPDIR/music_out.json" -WindowStyle Hidden`
- `来点适合写代码的英文歌` → `Start-Process node -ArgumentList "$skillDir/scripts/music.js","play","适合写代码的英文歌","--outfile","$TMPDIR/music_out.json" -WindowStyle Hidden`
- `放点歌` → 先问：`想听什么心情或场景的？偏中文还是英文？`

## 控制命令

可用动作：`pause` | `resume` | `toggle-pause` | `next` | `prev` | `volume-up` | `volume-down` | `mute` | `loop` | `loop-off` | `stop` | `status`

```bash
node "$skillDir/scripts/music.js" pause
node "$skillDir/scripts/music.js" resume
node "$skillDir/scripts/music.js" next
node "$skillDir/scripts/music.js" stop
node "$skillDir/scripts/music.js" status
```

也可以使用兼容写法：

```bash
node "$skillDir/scripts/music.js" control pause
```

## 用户指令映射

| 用户输入 | 动作 |
|---|---|
| `/music 歌曲名`、`$music 歌曲名`、`!music 歌曲名` | 播放单曲 |
| `播放 歌曲名`、`play 歌曲名`、`放一首 歌曲名` | 播放单曲 |
| `我想听 歌曲名`、`给我放 歌曲名`、`来一首 歌曲名` | 播放单曲 |
| `播放 歌手名`、`听 歌手名 的歌`、`歌手名 歌单` | 歌手模式 |
| `暂停`、`pause` | 暂停 |
| `继续播放`、`resume` | 恢复 |
| `下一首`、`next` | 下一首 |
| `上一首`、`prev` | 上一首 |
| `声音大一点`、`volume up`、`volume-up` | 音量 +10 |
| `声音小一点`、`volume down`、`volume-down` | 音量 -10 |
| `静音`、`mute` | 静音切换 |
| `单曲循环`、`loop` | 开启单曲循环 |
| `关闭循环`、`loop-off` | 关闭循环 |
| `退出音乐`、`停止播放`、`quit`、`stop` | 停止播放 |
| `播放状态`、`status` | 查看播放状态 |

## 回复要求

播放成功后：
1. **先转述脚本输出**：`Now Playing: [歌名]` — 告知用户正在播放什么。
2. **补充 1 段歌曲简介**（2-4 句）：基于歌名/艺人/你的知识，说明歌曲的主题、情绪、风格或背景。

控制命令（pause/resume/next/stop/status）：
- 脚本输出简短状态词（如 `Paused`、`Stopped`）。
- 转述给用户即可，例如：`已暂停。`、`切换到下一首。`

## 注意事项

- 脚本会在缺少必要播放工具时输出安装提示；按提示处理即可。
- 部分歌曲可能因版权、地区或网络原因无法播放。
- 发布时保留 `SKILL.md` 和 `scripts/music.js`。
- **Windows 播放命令必须用 `Start-Process -WindowStyle=Hidden`（不加 `-Wait`）**，让 PowerShell 立即退出，node 在后台独立运行。
- **Linux/macOS 播放命令末尾加 `&`** 让 node 后台运行。
- 播放命令返回后，agent 必须等待 8-15 秒再读取输出文件。
- 控制命令无需特殊处理，任何平台直接调用即可。
