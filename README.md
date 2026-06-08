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
| **pp** | 网页型 | Pinterest 图片画廊（Vue 3 + UnoCSS + Viewer.js，单文件 HTML） | 已上线 |

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
── src/                           # 源码（各技能独立开发指南见 src/<skill>/AGENTS.md）
│   ├── imagegen-magick/           # 图像生成技能（资源型）
│   ├── music/                     # 音乐播放技能（代码型）
│   ├── hq/                        # 行情查询技能（代码型）
│   └── pp/                        # 图片画廊技能（网页型）
│
├── skills/                        # 构建产物（Agent Skills 规范结构）
│   ├── imagegen-magick/
│   ├── music/
│   ├── hq/
│   └── pp/
│
├── AGENTS.md                      # 项目级 AI 编码指南
├── package.json                   # Monorepo 根配置
── tsconfig.json                  # TypeScript 根配置
```

**用户视角**：只需关心 `skills/` 目录。
**开发者视角**：源码在 `src/`，构建输出到 `skills/`。各技能开发指南见 `src/<skill>/AGENTS.md`。

## 开发环境

### 前置要求

- Node.js >= 22, npm >= 10, Git
- **imagegen-magick**: [ImageMagick 7+](https://imagemagick.org/script/download.php)
- **music**: [mpv](https://mpv.io/) + [yt-dlp](https://github.com/yt-dlp/yt-dlp)
- **hq**: 无额外依赖（Node.js 即可）
- **pp**: [gallery-dl](https://github.com/mikf/gallery-dl/releases)（Pinterest 图片 URL 获取）

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
npm -w pp-src dev                  # 监听图片画廊技能
```

## 各技能文档

- [imagegen-magick](./skills/imagegen-magick/SKILL.md) — 程序化图像生成（资源型技能）
- [music](./skills/music/SKILL.md) — 在线音乐播放（代码型技能）
- [hq](./skills/hq/SKILL.md) — 实时行情查询（代码型技能）
- [pp](./skills/pp/SKILL.md) — Pinterest 图片画廊（网页型技能）

## 贡献

欢迎提 Issue 和 PR。开发前请先阅读 [AGENTS.md](./AGENTS.md) 了解协作规范。

## 许可证

MIT - 详见 [LICENSE](./LICENSE)

## 致谢

- [Agent Skills 开放标准](https://agentskills.io/)
- [OpenAI skills 仓库](https://github.com/openai/skills) - imagegen 技能的灵感来源
- [skills.sh](https://skills.sh/) - 开放的 Agent Skills 目录
