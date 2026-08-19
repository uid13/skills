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
| **music** | 代码型 | 在线音乐播放（多音源 B站/mail.ru/SoundCloud/YouTube，yt-dlp+mpv） | 已上线 |
| **hq** | 代码型 | 股票/基金/期货/指数实时行情查询（新浪接口，Vite 代理解决 CORS） | 已上线 |
| **pp** | 网页型 | Pinterest 图片画廊（Vue 3 + UnoCSS + Viewer.js，单文件 HTML） | 已上线 |
| **wc** | 资源型 | 英语单词分类语义学习（LLM 驱动 + 浏览器查看页） | 已上线 |
| **wc-jp** | 资源型 | 日语单词分类语义学习（LLM 驱动 + 浏览器查看页） | 已上线 |

## 安装

```bash
# 安装全部技能
npx skills add https://github.com/uid13/skills.git

# 只安装指定技能
npx skills add https://github.com/uid13/skills.git --skill imagegen-magick
npx skills add https://github.com/uid13/skills.git --skill music
npx skills add https://github.com/uid13/skills.git --skill hq
npx skills add https://github.com/uid13/skills.git --skill pp
npx skills add https://github.com/uid13/skills.git --skill wc
npx skills add https://github.com/uid13/skills.git --skill wc-jp
```

## 项目结构

```
skills-uid13/
── src/                           # 源码（各技能独立开发指南见 src/<skill>/AGENTS.md）
│   ├── imagegen-magick/           # 图像生成技能（资源型）
│   ├── music/                     # 音乐播放技能（代码型）
│   ├── hq/                        # 行情查询技能（代码型）
│   ├── pp/                        # 图片画廊技能（网页型）
│   ├── wc/                        # 英语单词分类语义学习（资源型）
│   └── wc-jp/                     # 日语单词分类语义学习（资源型）
│
├── skills/                        # 构建产物（Agent Skills 规范结构）
│   ├── imagegen-magick/
│   ├── music/
│   ├── hq/
│   ├── pp/
│   ├── wc/
│   └── wc-jp/
│
├── AGENTS.md                      # 项目级 AI 编码指南
├── CONTRIBUTING.md                # 贡献指南
├── llms.txt                       # LLM 项目概览
├── VERSION                        # 版本号
├── package.json                   # Monorepo 根配置
── tsconfig.json                  # TypeScript 根配置
```

**用户视角**：只需关心 `skills/` 目录。
**开发者视角**：源码在 `src/`，构建输出到 `skills/`。各技能开发指南见 `src/<skill>/AGENTS.md`。

## 各技能文档

- [imagegen-magick](./skills/imagegen-magick/SKILL.md) — 程序化图像生成（资源型技能）
- [music](./skills/music/SKILL.md) — 多音源在线音乐播放（代码型技能）
- [hq](./skills/hq/SKILL.md) — 实时行情查询（代码型技能）
- [pp](./skills/pp/SKILL.md) — Pinterest 图片画廊（网页型技能）
- [wc](./skills/wc/SKILL.md) — 英语单词分类语义学习（资源型技能）
- [wc-jp](./skills/wc-jp/SKILL.md) — 日语单词分类语义学习（资源型技能）

## 贡献

欢迎提 Issue 和 PR。参与开发前请先阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 许可证

MIT - 详见 [LICENSE](./LICENSE)

## 致谢

- [Agent Skills 开放标准](https://agentskills.io/)
- [OpenAI skills 仓库](https://github.com/openai/skills) - imagegen 技能的灵感来源
- [skills.sh](https://skills.sh/) - 开放的 Agent Skills 目录
