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
4. 播放成功后，最终回复必须包含播放状态和 1 段歌曲简介。

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

播放单曲：

```bash
node "$skillDir/scripts/music.js" play "歌曲名或搜索词"
```

播放某个歌手的多首歌：

```bash
node "$skillDir/scripts/music.js" play "歌手名" --artist
node "$skillDir/scripts/music.js" play "歌手名" --artist --count 5
```

示例：
- `play Numb` → `node "$skillDir/scripts/music.js" play "Numb"`
- `播放周杰伦的歌` → `node "$skillDir/scripts/music.js" play "周杰伦" --artist`
- `来点适合写代码的英文歌` → `node "$skillDir/scripts/music.js" play "适合写代码的英文歌"`
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

播放成功后，不要只转述脚本输出。最终回复应包含：
- “已开始播放”或“正在播放”的状态。
- 歌名、艺人/频道、年份或时长等关键信息。
- 1 段 2-4 句的歌曲简介，说明主题、情绪、风格或背景。

控制命令成功后，简短确认即可，例如 `已暂停。`、`已停止播放。`

## 注意事项

- 脚本会在缺少必要播放工具时输出安装提示；按提示处理即可。
- 部分歌曲可能因版权、地区或网络原因无法播放。
- 本技能不要求 Python；发布时保留 `SKILL.md` 和 `scripts/music.js`。
