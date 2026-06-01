# uid13 Skills

[![Release](https://img.shields.io/github/v/release/uid13/skills)](https://github.com/uid13/skills/releases)
[![Skills.sh Compatibility](https://img.shields.io/badge/skills.sh-compatible-blue)](https://skills.sh/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node.js >= 22](https://img.shields.io/badge/Node.js-%3E%3D22-339933)](https://nodejs.org/)

AI Agent 技能集合，使用 Monorepo 工程化方式管理。

所有技能遵循 [Agent Skills 开放标准](https://agentskills.io/)，兼容主流 AI 编码助手：
Claude Code、Codex Desktop、OpenCode、Cursor、GitHub Copilot、Gemini CLI、Windsurf 等。

## 包含的技能

| 技能 | 说明 | 状态 |
|------|------|------|
| **imagegen-magick** | 程序化图像生成（SVG + ImageMagick + Iconify 图标 + 字体 fallback） | v1.4.2 |
| **music** | 在线音乐播放（基于 mpv + yt-dlp） | 已实现 |

## 安装

```bash
# 安装全部技能
npx skills add https://github.com/uid13/skills.git

# 只安装指定技能
npx skills add https://github.com/uid13/skills.git --skill imagegen-magick

# 锁定版本（推荐生产使用）
npx skills add https://github.com/uid13/skills.git --skill imagegen-magick --pin v1.4.2
```

## 项目结构

```
skills-uid13/
├── src/                           # 源码（TypeScript 开发）
│   ├── imagegen-magick/           # Vite 8 + Rolldown 工程
│   │   ├── src/bin/               # CLI 入口
│   │   ├── src/lib/               # 工具库
│   │   ├── build.mjs              # 多入口构建脚本
│   │   ├── vite.config.ts
│   │   └── tsconfig.json
│   └── music/                     # Vite 8 + Rolldown 工程
│       ├── src/bin/
│       ├── src/lib/
│       └── vite.config.ts
│
├── skills/                        # 编译产物（Agent Skills 规范结构）
│   ├── imagegen-magick/
│   │   ├── SKILL.md               # 技能入口（工作流）
│   │   ├── README.md              # 用户文档
│   │   ├── references/            # 按需加载的参考文档
│   │   └── scripts/dist/*.mjs     # 编译后的 CLI 工具
│   └── music/
│       ├── SKILL.md
│       └── scripts/dist/
│
├── AGENTS.md                      # AI 编码助手协作指南
├── package.json                   # Monorepo 根配置
└── tsconfig.json                  # TypeScript 根配置
```

**用户视角**：只需关心 `skills/` 目录。
**开发者视角**：源码在 `src/`，编译输出到 `skills/`。

## 开发环境

### 前置要求

- Node.js >= 22, npm >= 10, Git
- **imagegen-magick**: [ImageMagick 7+](https://imagemagick.org/script/download.php)
- **music**: [mpv](https://mpv.io/) + [yt-dlp](https://github.com/yt-dlp/yt-dlp)

### 安装与运行

```bash
git clone https://github.com/uid13/skills.git
cd skills
npm install
npm run build

# 验证
node skills/imagegen-magick/scripts/dist/info.mjs
```

### 开发模式

```bash
npm run dev                        # 监听所有技能
npm -w imagegen-magick-src dev     # 监听单个技能
```

## 各技能文档

- [imagegen-magick](./skills/imagegen-magick/README.md) — 程序化图像生成
- [music](./skills/music/SKILL.md) — 在线音乐播放

## 贡献

欢迎提 Issue 和 PR。开发前请先阅读 [AGENTS.md](./AGENTS.md) 了解协作规范。

### 核心规范

- **中文注释**：所有代码（函数、类、常量、关键逻辑）都需中文注释
- **跨平台**：同时支持 Windows / macOS / Linux
- **零安装分发**：用户拿到技能后无需 `npm install` 即可使用
- **ESM only**：所有输出产物为 `.mjs` 格式

### 代码提交流程

```bash
npm run typecheck
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
