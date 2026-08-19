# AGENTS.md

> 本文档面向 AI 编码助手（Claude Code、Codex、OpenCode、Cursor、Copilot 等）
> 目的是让 AI 在贡献本项目代码时保持风格一致、遵循项目规范。

## 项目简介

这是一个 **AI Agent Skills 的 Monorepo** 工程，使用前端工程化方式（Vite 8 + Rolldown + TypeScript）开发多个 Agent 技能，
编译产物符合 [Agent Skills 开放标准](https://agentskills.io/) 和 [skills.sh](https://skills.sh/) 规范。

**技术栈**：
- **构建工具**：Vite 8（使用 Rolldown，Rust 实现的打包器）
- **语言**：TypeScript 5.4+；Vue 3 + UnoCSS（pp 技能使用）
- **运行环境**：Node.js 22+

技能类型：
- **代码型技能**（music、hq）：TypeScript 开发，Vite SSR 编译为 `.mjs`
- **资源型技能**（imagegen-magick、wc、wc-jp）：纯文档 + 静态页面，Vite publicDir 机制复制
- **网页型技能**（pp）：Vue 3 + UnoCSS，vite-plugin-singlefile 编译为单文件 HTML

每个技能独立可用，跨平台（Windows / macOS / Linux），零 pnpm install 即可运行。

各技能专属的开发指南见 `src/<skill>/AGENTS.md`。

## 核心原则

### 1. 零依赖分发

- 代码型技能：所有运行时依赖通过 Vite 打包进 dist
- 资源型技能：无代码依赖，仅文档和资源文件
- 网页型技能：所有依赖通过 vite-plugin-singlefile 内联到 HTML
- 用户拿到技能后**不需要** `pnpm install` 即可使用
- 仅开发时才需要 `pnpm install`

### 2. 跨平台兼容

- 所有脚本必须同时工作于 Windows / macOS / Linux
- 使用 cross-spawn 进行跨平台进程调用，不要直接 `child_process.spawn`
- 文件路径统一使用 `node:path`

### 3. 输出 ESM

- 所有编译产物统一为 `.mjs`（ESM 格式）
- Node.js 版本要求 >= 22
- 保留 source map（.mjs.map）便于调试

## 编码风格

- 使用 2 空格缩进（不要 Tab）
- 使用 LF 换行（不要 CRLF）
- 单引号字符串
- 结尾无分号
- 使用 ESM（`import/export`，不要 `require`）

## 构建命令速查

```bash
# 全局命令（根目录执行，pnpm -r 递归到全部 workspace）
pnpm build          # 编译所有技能
pnpm dev            # 监听所有技能的改动
pnpm typecheck      # 类型检查（含 TS 源码的技能：hq / music / pp）

# 单个技能命令（--filter 指定 workspace 包名）
pnpm --filter imagegen-magick-src build   # 编译图像生成技能（资源型）
pnpm --filter wc-src build                # 编译英语词汇学习技能（资源型）
pnpm --filter wc-jp-src build             # 编译日语词汇学习技能（资源型）
pnpm --filter music-src build             # 编译音乐播放技能
pnpm --filter hq-src build                # 编译行情查询技能
pnpm --filter pp-src build                # 编译图片画廊技能
```

workspace 定义见 `pnpm-workspace.yaml`，锁文件为 `pnpm-lock.yaml`（提交到 git）。

## 参考资源

- Agent Skills 规范：https://agentskills.io/
- skills.sh 目录：https://skills.sh/
- Vite 8 官方文档：https://vite.dev/
- Vite public 目录：https://vitejs.dev/guide/assets.html#the-public-directory
- Rolldown 文档：https://rolldown.rs/
