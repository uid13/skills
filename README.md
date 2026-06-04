# uid13 Skills

[![Release](https://img.shields.io/github/v/release/uid13/skills)](https://github.com/uid13/skills/releases)
[![Skills.sh Compatibility](https://img.shields.io/badge/skills.sh-compatible-blue)](https://skills.sh/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node.js >= 22](https://img.shields.io/badge/Node.js-%3E%3D22-339933)](https://nodejs.org/)

AI Agent 技能集合，使用 Monorepo 工程化方式管理。

所有技能遵循 [Agent Skills 开放标准](https://agentskills.io/)，兼容主流 AI 编码助手：
Claude Code、Codex Desktop、OpenCode、Cursor、GitHub Copilot、Gemini CLI、Windsurf 等。

## 包含的技能

| 技能 | 类型 | 说明 | 状态 |
|------|------|------|------|
| **imagegen-magick** | 资源型 | 程序化图像生成（文档 + 内置字体 + Iconify 图标） | 纯资源，Vite public 构建 |
| **music** | 代码型 | 在线音乐播放（模型调用 yt-dlp/mpv，music.mjs 仅 IPC 控制） | 已简化 |
| **hq** | 代码型 | 股票/基金/期货/指数实时行情查询（新浪接口，GBK 转码） | 已上线 |

## 安装

```bash
# 安装全部技能
npx skills add https://github.com/uid13/skills.git

# 只安装指定技能
npx skills add https://github.com/uid13/skills.git --skill imagegen-magick
```

## 项目结构

```
skills-uid13/
├── src/                           # 源码
│   ├── imagegen-magick/           # 图像生成技能（资源型）
│   │   ├── public/                # 资源目录（构建时复制到 skills/）
│   │   │   ├── fonts/             # 内置字体
│   │   │   ├── references/        # 参考文档
│   │   │   └── SKILL.md           # 技能入口文档
│   │   ├── src/                   # Vite 构建入口
│   │   │   └── dummy.js           # 占位文件
│   │   ├── vite.config.ts         # Vite 配置（publicDir 机制）
│   │   └── package.json
│   └── music/                     # 音乐播放技能（代码型，TypeScript）
│       ├── src/bin/               # CLI 入口（music.ts - IPC 控制）
│       ├── src/lib/               # 工具库（mpv.ts - IPC 通信）
│       └── vite.config.ts
│   └── hq/                        # 行情查询技能（代码型，TypeScript）
│       ├── src/bin/               # CLI 入口（hq.ts）
│       ├── src/lib/               # 工具库（parser.ts, sina.ts, types.ts）
│       └── vite.config.ts
│
├── skills/                        # 构建产物（Agent Skills 规范结构）
│   ├── imagegen-magick/
│   │   ├── SKILL.md               # 技能入口文档
│   │   ├── references/            # 参考文档
│   │   └── fonts/                 # 内置字体
│   └── music/
│       ├── SKILL.md
│       └── scripts/dist/
│   └── hq/
│       ├── SKILL.md
│       └── scripts/dist/
│
├── AGENTS.md                      # AI 编码助手协作指南
├── package.json                   # Monorepo 根配置
└── tsconfig.json                  # TypeScript 根配置
```

**用户视角**：只需关心 `skills/` 目录。
**开发者视角**：源码在 `src/`，构建输出到 `skills/`。

## 开发环境

### 前置要求

- Node.js >= 22, npm >= 10, Git
- **imagegen-magick**: [ImageMagick 7+](https://imagemagick.org/script/download.php)
- **music**: [mpv](https://mpv.io/) + [yt-dlp](https://github.com/yt-dlp/yt-dlp)
- **hq**: 无额外依赖（Node.js 即可）

### 安装与运行

```bash
git clone https://github.com/uid13/skills.git
cd skills
npm install
npm run build
```

### 开发模式

```bash
npm run dev                        # 监听所有技能
npm -w imagegen-magick-src dev     # 监听资源型技能
npm -w music-src dev               # 监听音乐播放技能
npm -w hq-src dev                  # 监听行情查询技能
```

## 各技能文档

- [imagegen-magick](./skills/imagegen-magick/SKILL.md) — 程序化图像生成（资源型技能）
- [music](./skills/music/SKILL.md) — 在线音乐播放（代码型技能）
- [hq](./skills/hq/SKILL.md) — 实时行情查询（代码型技能）

## 贡献

欢迎提 Issue 和 PR。开发前请先阅读 [AGENTS.md](./AGENTS.md) 了解协作规范。

### 核心规范

- **中文注释**：所有代码（函数、类、常量、关键逻辑）都需中文注释
- **跨平台**：同时支持 Windows / macOS / Linux
- **零安装分发**：用户拿到技能后无需 `npm install` 即可使用
- **ESM only**：代码型技能的输出产物为 `.mjs` 格式

### 代码提交流程

```bash
npm run build
git add skills/
git commit -m "feat(imagegen): add new feature"
```

## 许可证

MIT - 详见 [LICENSE](./LICENSE)

## 致谢

- [Agent Skills 开放标准](https://agentskills.io/)
- [OpenAI skills 仓库](https://github.com/openai/skills) - imagegen 技能的灵感来源
- [skills.sh](https://skills.sh/) - 开放的 Agent Skills 目录
