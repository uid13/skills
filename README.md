# uid13 Skills

[![Skills.sh Compatibility](https://img.shields.io/badge/skills.sh-compatible-blue)](https://skills.sh/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node.js >= 22](https://img.shields.io/badge/Node.js-%3E%3D22-339933)](https://nodejs.org/)

我的 AI Agent 技能集合，使用 Monorepo 工程化方式管理。

所有技能遵循 [Agent Skills 开放标准](https://agentskills.io/)，兼容主流 AI 编码助手：
Claude Code、Codex Desktop、OpenCode、Cursor、GitHub Copilot、Gemini CLI、Windsurf 等。

## 📦 包含的技能

| 技能 | 说明 | 状态 |
|------|------|------|
| **imagegen-magick** | 程序化图像生成（SVG + ImageMagick + 字体 fallback） | ✅ 已实现 |
| **music** | 在线音乐播放（基于 mpv + yt-dlp） | ✅ 已 TypeScript 重构 |

## 🚀 安装

使用标准 Agent Skills 安装器：

```bash
# 安装全部技能
npx skills add https://github.com/uid13/skills.git

# 只安装指定技能
npx skills add https://github.com/uid13/skills.git --skill imagegen-magick

# 锁定版本（推荐生产使用）
npx skills add https://github.com/uid13/skills.git --skill imagegen-magick --pin v1.0.0
```

## 📁 项目结构

```
uid13-skills/
├── src/                       # 源码（开发时使用）
│   ├── imagegen-magick/       # TypeScript + Vite 8 (Rolldown) 工程
│   └── music/                 # TypeScript + Vite 8 (Rolldown) 工程
│
├── skills/                    # 编译产物（Agent Skills 规范结构）
│   ├── imagegen-magick/       # ← 用户实际使用的技能
│   │   ├── SKILL.md
│   │   ├── references/
│   │   ├── examples/
│   │   └── scripts/dist/      # 编译后的 .mjs 文件
│   └── music/
│       ├── SKILL.md
│       └── scripts/dist/      # 编译后的 .mjs 文件
│
├── AGENTS.md                  # AI 编码助手协作指南
├── package.json               # Monorepo 根配置
└── tsconfig.json              # TypeScript 根配置
```

**用户视角**：只需关心 `skills/` 目录，其他都是开发辅助。
**开发者视角**：源码在 `src/`，编译输出到 `skills/`。

## 🛠️ 开发环境搭建

### 前置要求

- Node.js >= 22
- npm >= 10
- Git

各技能还有独立要求（见对应 README）：

- **imagegen-magick**：需要安装 [ImageMagick 7+](https://imagemagick.org/script/download.php)
- **music**：需要安装 [mpv](https://mpv.io/) 和 [yt-dlp](https://github.com/yt-dlp/yt-dlp)

### 安装与运行

```bash
# 1. 克隆项目
git clone https://github.com/uid13/skills.git
cd skills

# 2. 安装所有依赖
npm install

# 3. 编译所有技能
npm run build

# 4. 验证 imagegen-magick 可用
node skills/imagegen-magick/scripts/dist/info.mjs
```

### 开发模式

```bash
# 监听所有技能的源码变更（自动重新编译）
npm run dev

# 或仅监听单个技能
npm -w imagegen-magick dev
```

## 📖 各技能文档

- [imagegen-magick](./skills/imagegen-magick/README.md) — 程序化图像生成
- [music](./skills/music/README.md) — 在线音乐播放

## 🤝 贡献

欢迎提 Issue 和 PR！开发前请先阅读 [AGENTS.md](./AGENTS.md) 了解协作规范。

### 核心规范

- ✅ **中文注释**：所有代码（函数、类、常量、关键逻辑）都需中文注释
- ✅ **跨平台**：同时支持 Windows / macOS / Linux
- ✅ **零安装分发**：用户拿到技能后无需 `npm install` 即可使用
- ✅ **ESM only**：所有输出产物为 `.mjs` 格式

### 代码提交流程

```bash
# 1. 类型检查
npm run typecheck

# 2. 编译
npm run build

# 3. 运行测试（如有）
npm run test

# 4. 提交（编译产物一起提交，让用户零安装使用）
git add skills/
git commit -m "feat(imagegen): add new feature"
```

## 📄 许可证

MIT - 详见 [LICENSE](./LICENSE)

## 🙏 致谢

- [Agent Skills 开放标准](https://agentskills.io/)
- [Anthropic skills 仓库](https://github.com/anthropics/skills)
- [OpenAI skills 仓库](https://github.com/openai/skills) - imagegen 技能的灵感来源
- [skills.sh](https://skills.sh/) - 开放的 Agent Skills 目录
