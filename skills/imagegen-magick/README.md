# imagegen-magick 技能

[![Skills.sh Compatibility](https://img.shields.io/badge/skills.sh-compatible-blue)](https://skills.sh/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

使用 **SVG + ImageMagick + AI 识图自检** 工作流，程序化生成高质量的矢量风格图像。

## 特点

- ✅ **精确文字渲染**：SVG + 系统字体，不会乱码
- ✅ **完全可控制**：每个像素可定义，可复现
- ✅ **零成本**：纯本地工具，无需 API 费用
- ✅ **跨平台**：Windows / macOS / Linux 都工作
- ✅ **跨 Agent**：兼容 opencode、codex、Claude Code、Cursor、Copilot、Gemini CLI 等
- ✅ **智能字体 Fallback**：无需手动安装 Cascadia，自动降级

## 适合生成

- 博客 / 文章封面图（微信公众号、掘金、Medium）
- 社交媒体封面（抖音、小红书、Twitter/X、YouTube）
- Logo、Icon、徽章
- 信息图表、数据可视化
- UI 组件 Mockup
- PPT / 幻灯片封面
- 代码片段展示图

## 快捷安装

```bash
# 方式 1：标准 Agent Skills 安装器（推荐，跨平台）
npx skills add https://github.com/uid13/skills.git --skill imagegen-magick

# 方式 2：Codex Desktop 专用
$skill-installer uid13/skills --skill imagegen-magick

# 方式 3：Claude Code 专用
/plugin install uid13/skills --skill imagegen-magick
```

## 前置依赖

### ImageMagick 7+（必需）

```bash
# Windows (mise，推荐)
mise install github:ImageMagick/ImageMagick

# Windows (winget)
winget install ImageMagick.ImageMagick

# macOS
brew install imagemagick

# Ubuntu/Debian
sudo apt install imagemagick
```

### Node.js 22+（必需）

所有脚本都是预编译的 `.mjs`，零依赖分发，Node 22+ 即可直接运行。

### 中文字体（可选但推荐）

如需渲染中文内容，确认系统中已有以下任一字体：
- Windows：微软雅黑（自带）
- macOS：PingFang SC（自带）
- Linux：Noto Sans CJK / WenQuanYi（需安装）

**检查是否就绪**：
```bash
node <skill-dir>/scripts/dist/info.mjs
```

## 提供的工具

| 工具 | 用途 |
|------|------|
| `info.mjs` | 环境检查（IM 版本、字体、首选字体） |
| `check-fonts.mjs` | 列出、过滤、推荐系统字体 |
| `render.mjs` | SVG → PNG 渲染（核心） |
| `scaffold.mjs` | 交互式生成 SVG 骨架 |

详细调用方式见 [SKILL.md](./SKILL.md)。

## 快速使用示例

### 1. 生成交互式 SVG 骨架 + 渲染

```bash
# 交互式收集参数
node <skill-dir>/scripts/dist/scaffold.mjs

# 渲染 PNG
node <skill-dir>/scripts/dist/render.mjs scaffold.svg -o cover.png
```

### 2. 一步到位（适合 AI 调用）

```bash
node <skill-dir>/scripts/dist/scaffold.mjs \
  --preset wechat-cover \
  --title "AI Agentic CLI" \
  --subtitle "给 AI 装上手脚" \
  --output cover.svg \
  --no-interactive

node <skill-dir>/scripts/dist/render.mjs cover.svg -o cover.png
```

### 3. JSON 输出（供 AI 解析）

```bash
node <skill-dir>/scripts/dist/info.mjs --json
node <skill-dir>/scripts/dist/render.mjs in.svg -o out.png --json
```

## 目录结构

```
imagegen-magick/
├── SKILL.md                          # 技能入口文档（AI Agent 必读）
├── README.md                         # 本文件（用户视角）
├── references/                       # 按需加载的参考文档
│   ├── color-palettes.md             # 配色配方库
│   ├── typography.md                 # 字体/排版配方
│   ├── layouts.md                    # 布局模式配方
│   ├── decorations.md                # 装饰元素库
│   ├── imagemagick-commands.md       # IM 命令参考
│   └── font-handling.md              # 字体处理与 Fallback 指南
├── examples/                         # 完整场景示例
│   └── wechat-article-cover.md       # 微信公众号封面示例
└── scripts/dist/                     # 预编译的 CLI 工具（零依赖）
    ├── info.mjs
    ├── info.mjs.map
    ├── render.mjs
    ├── render.mjs.map
    ├── check-fonts.mjs
    ├── check-fonts.mjs.map
    ├── scaffold.mjs
    └── scaffold.mjs.map
```

## 许可证

MIT - 详见 [../../LICENSE](../../LICENSE)

## 贡献

欢迎提 Issue 和 PR！开发前请阅读项目根目录的 [AGENTS.md](../../AGENTS.md)。

## 致谢与相关技能

- [OpenAI imagegen skill](https://github.com/openai/skills/tree/main/skills/.system/imagegen) — 工作流设计参考
- [Anthropic skills](https://github.com/anthropics/skills) — 社区最佳实践
- [skills.sh](https://skills.sh/) — Agent Skills 开放目录
