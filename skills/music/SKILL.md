---
name: music
description: "播放、暂停、控制在线音乐。使用 Node 脚本搜索并播放歌曲，支持播放、暂停/继续、下一首/上一首、音量调节、静音、循环、停止、查看状态等指令。适配 opencode、codex、OpenClaw、Cursor、Gemini 等智能体编码助手。"
license: MIT
---

# Music Player Skill（TypeScript 版）

这是一个歌曲播放和播放控制技能，基于 TypeScript 重构，使用 Vite 8 + Rolldown 构建。

## 核心特性

- **单命令接口**：所有功能通过 `scripts/dist/music.mjs` 调用
- **命令式播放**：播放命令会启动 mpv 进程，然后快速返回（< 5秒），mpv 在后台继续播放
- **JSON 输出模式**：`--json` 参数可输出结构化数据，方便 Agent 解析
- **依赖自动检查**：播放前自动检查 yt-dlp 和 mpv 是否可用
- **彩色终端输出**：成功/失败/状态信息带颜色和图标，提升可读性

## 处理流程

1. **判断用户意图**
   - 明确搜索（歌曲名、艺人、心情、场景）：直接播放
   - 需要澄清（"放点歌"、"随便听听"）：先问 1-2 个问题
   - 播放控制（暂停、继续、下一首等）：直接执行

2. **执行播放或控制命令**
   - 播放：`node <skill-dir>/scripts/dist/music.mjs play <query>`
   - 控制：`node <skill-dir>/scripts/dist/music.mjs <action>`
   - 命令快速返回（< 5秒），mpv 在后台持续播放

3. **解析输出**
   - 转述给用户（如 "正在播放：Numb - Linkin Park"）
   - 补充歌曲简介（基于歌名、艺人、你的知识）

## 意图识别

| 意图 | 判断依据 | 处理 |
|---|---|---|
| 明确搜索 | 含歌曲名、艺人、心情、场景、曲风、片名/作品名、语言偏好或节奏快慢 | 直接搜索并播放 |
| 需要澄清 | 只说"放点歌""来首音乐""随便听听""推荐一首"等，没有可用偏好 | 先问 1-2 个问题 |
| 播放控制 | 暂停、继续、下一首、上一首、音量、静音、循环、停止、状态 | 直接执行控制命令 |

澄清优先级：
- 先问心情或场景
- 再问偏中文还是英文
- 不问播放器、脚本、平台、安装方式等用户不关心的问题

推荐澄清句：
```
想听什么心情或场景的？偏中文还是英文？
```

## 搜索策略

- **歌曲名明确**：直接用歌曲名；如果有艺人名，一起加入搜索词
- **艺人明确但未指定歌曲**：使用歌手模式（`--artist` 参数）
- **心情/场景明确**：转成自然搜索词，例如 `适合夜晚开车的英文歌`、`适合写代码的轻快中文歌`
- **曲风明确**：把曲风和语言/节奏偏好加入搜索词，例如 `city pop Japanese song`、`中文摇滚歌曲`
- **片名/作品名明确**：搜索主题曲、插曲或 OST，例如 `电影名 主题曲`、`作品名 OST song`

## 播放命令

播放命令会快速返回（< 5秒），mpv 进程在后台持续播放。命令输出包含歌曲信息（标题、艺人、时长）。

### 基本用法

```bash
# 播放歌曲（默认命令，可省略 play）
node <skill-dir>/scripts/dist/music.mjs play "歌曲名或搜索词"
node <skill-dir>/scripts/dist/music.mjs "歌曲名或搜索词"

# 播放艺人的歌曲（多首）
node <skill-dir>/scripts/dist/music.mjs play "歌手名" --artist --count 5
```

### 全局选项

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `--json` | JSON 输出模式（供 Agent 解析） | 关闭 |
| `--timeout <ms>` | 超时时间（毫秒） | 30000 |
| `--count <n>` | 艺人模式下的歌曲数量 | 10 |
| `--artist` | 艺人模式（播放指定艺人的多首歌曲） | 关闭 |
| `--help` | 显示帮助信息 | - |
| `--version` | 显示版本号 | - |

### 示例

```bash
# 播放单曲
node <skill-dir>/scripts/dist/music.mjs play "Numb"
node <skill-dir>/scripts/dist/music.mjs play "周杰伦 晴天"
node <skill-dir>/scripts/dist/music.mjs play "适合写代码的英文歌"

# 播放艺人歌曲（默认 10 首）
node <skill-dir>/scripts/dist/music.mjs play "Linkin Park" --artist
node <skill-dir>/scripts/dist/music.mjs play "周杰伦" --artist --count 5

# JSON 输出模式
node <skill-dir>/scripts/dist/music.mjs play "Numb" --json
```

### 输出格式

**正常模式**（彩色终端）：
```
→ 正在播放
  🎵 Numb (3:45)
  👤 Linkin Park
```

**JSON 模式**（`--json`）：
```json
{"action":"play","song":{"title":"Numb","artist":"Linkin Park","duration":"3:45"}}
```

**错误**：
```
✗ [错误] 未找到匹配的歌曲
```

## 控制命令

所有控制命令都是顶级命令，直接调用即可。

### 可用命令

| 命令 | 说明 | 示例 |
|------|------|------|
| `pause` | 暂停播放 | `node music.mjs pause` |
| `resume` | 恢复播放 | `node music.mjs resume` |
| `toggle-pause` | 切换暂停/播放 | `node music.mjs toggle-pause` |
| `next` | 下一首 | `node music.mjs next` |
| `prev` | 上一首 | `node music.mjs prev` |
| `volume-up` | 音量 +10 | `node music.mjs volume-up` |
| `volume-down` | 音量 -10 | `node music.mjs volume-down` |
| `mute` | 切换静音 | `node music.mjs mute` |
| `loop` | 开启单曲循环 | `node music.mjs loop` |
| `loop-off` | 关闭单曲循环 | `node music.mjs loop-off` |
| `stop` | 停止播放并退出 | `node music.mjs stop` |
| `status` | 查看播放状态 | `node music.mjs status` |

### 控制命令输出

**正常模式**：
```
✓ 已暂停
✓ 已继续播放
✓ [状态] 正在播放
```

**JSON 模式**：
```json
{"action":"pause","status":"success","message":"已暂停"}
```

### 兼容旧版

为了兼容旧版 JS 脚本，也支持 `control` 子命令：
```bash
node <skill-dir>/scripts/dist/music.mjs control pause
node <skill-dir>/scripts/dist/music.mjs control status
```

## 依赖要求

- **Node.js** >= 22（运行时）
- **yt-dlp**：YouTube 视频搜索和下载（必须）
- **mpv**：媒体播放器（必须）

如果缺少依赖，播放命令会输出：
```
✗ [错误] 缺少依赖：yt-dlp 或 mpv
  → 已尝试 PATH 查找和 --version 检查，但工具不可用
  → 请安装缺失工具或添加到 PATH，然后重新运行命令
```

可通过环境变量 `MUSIC_SKIP_DEPS=1` 跳过依赖检查（仅用于调试）。

## Windows PowerShell 兼容性

在 Windows PowerShell 中，直接调用 Node.js 脚本可能会因为 PowerShell 的管道处理而卡住。推荐使用：

### 方法 1：后台启动（推荐）

```powershell
Start-Process node -ArgumentList "<skill-dir>\scripts\dist\music.mjs","play","歌曲名" -WindowStyle Hidden
```

`Start-Process` 会在后台启动 Node 进程，PowerShell 立即返回，不会卡住。

### 方法 2：使用 cmd.exe 包装

```powershell
cmd /c node <skill-dir>\scripts\dist\music.mjs play "歌曲名"
```

通过 cmd.exe 调用可以规避 PowerShell 的某些问题。

## 用户指令映射

| 用户输入 | 动作 |
|---|---|
| `播放 歌曲名`、`play 歌曲名`、`放一首 歌曲名` | 播放单曲 |
| `我想听 歌曲名`、`给我放 歌曲名`、`来一首 歌曲名` | 播放单曲 |
| `播放 歌手名`、`听 歌手名 的歌`、`歌手名 歌单` | 歌手模式（`--artist`） |
| `暂停`、`pause` | `music.mjs pause` |
| `继续播放`、`resume` | `music.mjs resume` |
| `下一首`、`next` | `music.mjs next` |
| `上一首`、`prev` | `music.mjs prev` |
| `声音大一点`、`volume up`、`volume-up` | `music.mjs volume-up` |
| `声音小一点`、`volume down`、`volume-down` | `music.mjs volume-down` |
| `静音`、`mute` | `music.mjs mute` |
| `单曲循环`、`loop` | `music.mjs loop` |
| `关闭循环`、`loop-off` | `music.mjs loop-off` |
| `退出音乐`、`停止播放`、`quit`、`stop` | `music.mjs stop` |
| `播放状态`、`status` | `music.mjs status` |

## 回复要求

1. **播放成功后**：
   - 转述歌曲信息：`正在播放：Numb - Linkin Park`
   - 补充 1 段歌曲简介（2-4 句）：基于歌名、艺人、你的知识
   - 例如：*Numb 是 Linkin Park 第三张专辑《Meteora》的主打单曲，歌词表达了青少年在父母期待和自我认同之间的迷茫与压抑，被广泛认为是 2000 年代最具影响力的摇滚歌曲之一。*

2. **播放失败或搜索无结果**：
   - 直接告知用户：`未找到匹配的歌曲`
   - 提供建议：`可以尝试更具体的歌曲名或艺人名`

3. **控制命令**：
   - 简洁确认：`已暂停`、`已继续播放`、`已切换到下一首`

## 技术架构

- **构建工具**：Vite 8 + Rolldown（替代 Rollup，Rust 实现）
- **构建脚本**：`src/music/build.mjs`（程序化多入口，避免 chunk 拆分）
- **输出格式**：ESM（.mjs）
- **入口**：单入口 `src/music/src/bin/music.ts`，通过 commander 分发子命令
- **依赖**：commander（CLI 框架）

## 注意事项

- **播放验证**：播放命令会启动 mpv 进程并等待其启动（约 500ms-2s），然后返回。mpv 在后台持续播放
- **多实例冲突**：如果已有 mpv 进程运行，新的播放命令会先停止旧进程
- **IPC 通信**：控制命令通过 mpv 的 IPC 协议（Unix socket 或 Windows 命名管道）发送指令
- **JSON 模式**：推荐 Agent 使用 `--json` 参数获取结构化输出
- **版权和地区限制**：部分歌曲可能因版权、地区或网络原因无法播放
- **Node.js 要求**：最低 Node.js 22，推荐使用 24+
