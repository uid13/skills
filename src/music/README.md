# music 技能源码项目

> 本目录是 `music` 技能的 **TypeScript + Vite 8 (Rolldown) 工程化源码**
> 编译产物在 [../../skills/music/](../../skills/music/)（用户使用的最终产物）

**支持平台**：Git Bash (Windows)、Linux、macOS。不支持 PowerShell。

## 📦 技术栈

- **语言**：TypeScript 5.x
- **构建工具**：Vite 8 (Rolldown)
- **单入口模式**：所有子命令（play/pause/next 等）通过 commander 在主入口 music.ts 内分发
- **输出格式**：ESM (.mjs)
- **目标 Node 版本**：22+

## 🏗️ 目录结构

```
src/music/
├── src/
│   ├── bin/
│   │   └── music.ts             # 主入口，用 commander 分发子命令
│   │
│   └── lib/
│       ├── types.ts             # 类型定义（YouTube 视频元数据、mpv IPC 等）
│       ├── utils.ts             # 工具函数（进程管理、依赖检查、错误输出）
│       ├── mpv.ts               # mpv 播放器控制（进程生命周期、IPC 通信）
│       ├── ytdl.ts              # yt-dlp 封装（YouTube 搜索、元数据获取）
│       ├── scoring.ts           # 歌曲评分算法（筛选最佳候选）
│       └── output.ts            # 输出格式化（带颜色的终端输出）
│
├── vite.config.ts               # Vite 8 配置（单入口 lib 模式）
├── tsconfig.json                # TypeScript 配置
├── package.json                 # 本目录的依赖（由父级 workspaces 管理）
└── README.md                    # 本文件
```

## 🛠️ 开发命令

```bash
# 安装依赖（在根目录运行）
cd ../..
npm install

# 单次编译
npm run build

# 监听模式开发
npm run dev
```

**输出**：
- 编译产物：`../../skills/music/scripts/dist/music.mjs`
- Source map：`../../skills/music/scripts/dist/music.mjs.map`

## 🎯 设计特点

### 1. 单入口多命令

所有子命令（play、pause、next、prev、stop、volume 等）都在 `src/bin/music.ts` 通过 commander 分发，保持单一可执行文件。

### 2. 异步优先

相比原 JS 版本的 `spawnSync`，TS 版本改用 `child_process.spawn` 的 Promise 封装，避免阻塞事件循环，提升并发性能。

### 3. 类型安全

所有外部数据（YouTube 视频元数据、mpv IPC 响应、用户参数）都有明确的 TS 接口定义，编译期捕获错误。

### 4. 彩色输出

成功/失败/状态信息使用 ANSI 转义码着色（通过 `src/lib/output.ts`），提升终端体验。

### 5. 依赖检查

首次播放时检查 yt-dlp 和 mpv 是否可用，不可用时输出 Markdown 格式的安装指引（方便 Agent 转述给用户）。

## 📚 关键模块说明

### scoring.ts（歌曲评分算法）

**目的**：从 YouTube 搜索结果中筛选出最可能是"歌曲"的视频，过滤掉电影片段、合集、ASMR 等。

**打分维度**：
- 时长（45s ~ 15min）
- 标题匹配度（是否包含精确歌名）
- 官方信号（VEVO、Official Audio 等关键词）
- 音乐分类（YouTube 的 Music category）
- 非歌曲降权（trailer、scene、ambience 等）

### mpv.ts（IPC 控制）

**通信方式**：通过 Unix socket（Linux/macOS）或命名管道（Windows）与 mpv 进程通信。

**控制命令**：pause、resume、next、prev、volume-up、volume-down、mute、loop、loop-off、stop、status

### ytdl.ts（yt-dlp 封装）

**搜索策略**：多查询组合（official audio、lyric video、song）+ 去重 + 排序

## 🔗 相关链接

- 技能入口：[skills/music/](../../skills/music/)
- 技能文档：[skills/music/SKILL.md](../../skills/music/SKILL.md)
- 上级 AGENTS.md：[`../../AGENTS.md`](../../AGENTS.md)
