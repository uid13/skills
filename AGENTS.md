# AGENTS.md

> 本文档面向 AI 编码助手（Claude Code、Codex、OpenCode、Cursor、Copilot 等）
> 目的是让 AI 在贡献本项目代码时保持风格一致、遵循项目规范。

## 项目简介

这是一个 **AI Agent Skills 的 Monorepo** 工程，使用前端工程化方式（Vite 8 + Rolldown + TypeScript）开发多个 Agent 技能，
编译产物符合 [Agent Skills 开放标准](https://agentskills.io/) 和 [skills.sh](https://skills.sh/) 规范。

**技术栈**：
- **构建工具**：Vite 8.0.14（使用 Rolldown，Rust 实现的打包器，替代 Rollup）
- **构建脚本**：自定义 `build.mjs`，程序化逐个构建（避免多 chunk 问题）
- **语言**：TypeScript 5.4+
- **运行环境**：Node.js 22+

每个技能独立可用，跨平台（Windows / macOS / Linux），零 npm 安装即可运行（所有依赖已编译打包到 dist）。

## 目录结构（重要）

```
uid13-skills/
├── src/                           # 源码目录（TypeScript 开发时）
│   ├── imagegen-magick/           # 图像生成技能（当前实现）
│   │   ├── src/bin/               # CLI 入口（render/check-fonts/info/scaffold）
│   │   ├── src/lib/               # 工具库（font/magick/colors/spawn）
│   │   ├── vite.config.ts         # Vite 8 (Rolldown) 编译配置
│   │   ├── build.mjs              # 程序化多入口构建脚本
│   │   ├── tsconfig.json          # 模块级 TS 配置
│   │   └── package.json           # 模块级依赖与构建脚本
│   └── music/                     # 音乐播放技能（TypeScript + Vite 8）
│       ├── src/bin/               # CLI 入口（music）
│       ├── src/lib/               # 工具库（ytdl/scoring/mpv/output）
│       ├── vite.config.ts         # Vite 8 (Rolldown) 编译配置
│       ├── tsconfig.json          # 模块级 TS 配置
│       └── package.json           # 模块级依赖与构建脚本
│
├── skills/                        # 输出产物（Agent Skills 规范结构）
│   ├── imagegen-magick/
│   │   ├── SKILL.md               # 技能入口文件（方法论）
│   │   ├── references/            # 按需加载的参考文档
│   │   ├── examples/              # 场景示例
│   │   ├── scripts/dist/*.mjs     # 编译后的 CLI 工具
│   │   └── README.md              # 用户视角的文档
│   └── music/
│       ├── SKILL.md
│       └── scripts/dist/          # 编译后的 .mjs 文件
│
├── package.json                   # Monorepo 根配置（workspaces）
├── tsconfig.json                  # 根 TypeScript 配置
├── README.md                      # 项目总说明
└── AGENTS.md                      # 本文件（AI 编码助手协作指南）
```

## 核心原则

### 1. 中文注释

**所有代码必须使用中文注释**，包括：
- 函数/方法说明（JSDoc 的 description）
- 类/类型定义说明
- 关键逻辑段落
- 常量、配置项说明
- 示例用法

```typescript
/**
 * 检测系统中可用的字体
 *
 * 工作原理：
 * - Windows：列出 C:\Windows\Fonts 和用户字体目录下的所有 TTF/OTF 文件
 * - macOS/Linux：调用 fc-list 命令解析输出
 *
 * @returns 可用字体列表，每项包含 family, style, file 字段
 *
 * @example
 * const fonts = await detectFonts()
 * fonts.forEach(f => console.log(f.family))
 */
export async function detectFonts(): Promise<FontInfo[]> {
  // ...
}
```

### 2. 零依赖分发

- 所有运行时依赖在 src 内部，通过 Vite 8 (Rolldown) 打包进 dist
- 用户克隆仓库或安装技能后**不需要** `npm install` 即可使用
- 仅开发时才需要 `npm install`

### 3. 跨平台兼容

- 所有脚本必须同时工作于 Windows / macOS / Linux
- 使用项目内的 `lib/spawn.ts` 封装，不要直接 `child_process.spawn`
- 文件路径统一使用 `node:path` 的 posix 或自动识别
- Windows 上使用 Git Bash（不支持 PowerShell）

### 4. 输出 ESM

- 所有编译产物统一为 `.mjs`（ESM 格式）
- Node.js 版本要求 >= 22
- 保留 source map（.mjs.map）便于调试

### 5. 单一职责

每个工具只负责一件事：
- `render.mjs`：SVG → PNG 渲染
- `info.mjs`：环境信息检查
- `check-fonts.mjs`：字体列表与推荐
- `scaffold.mjs`：交互式生成 SVG 骨架
- `music.mjs`：音乐播放控制（单入口，内部通过 commander 分发子命令）

方法识别（SKILL.md 文档）决定调用哪个工具。

### 6. 错误处理

- 所有工具失败时必须输出**可读的错误信息**（中英对照）
- 包含可能的修复建议
- 不要静默失败（no silent failures）
- 退出码规范：
  - `0`：成功
  - `1`：一般性错误
  - `2`：参数错误
  - `3`：依赖缺失（如 ImageMagick 未安装）

### 7. 输出格式

- 默认输出人类可读的彩色文本（通过 lib/colors.ts）
- 加 `--json` 参数可切换为 JSON 输出（供 AI 解析）
- 加 `--quiet` 可禁用所有彩色输出（CI 环境自动禁用）

## 开发流程

### 新增/修改技能代码

1. 进入 `src/<skill-name>/`：
   ```bash
   cd src/imagegen-magick
   ```

2. 安装依赖（首次或依赖变更）：
   ```bash
   npm install
   ```

3. 开发模式（watch 自动编译）：
   ```bash
   npm run dev
   ```

4. 修改代码（保持中文注释）

5. 重新编译（每次修改后需手动运行）：
   ```bash
   npm run build
   ```

6. 验证编译产物：
    ```bash
    # imagegen-magick 示例
    node ../../skills/imagegen-magick/scripts/dist/info.mjs
    
    # music 示例
    node ../../skills/music/scripts/dist/music.mjs --help
    ```

7. 确保产物已更新后提交

### 新增技能

1. 在 `src/<new-skill>/` 创建项目：
   ```bash
   mkdir src/<new-skill>
   cd src/<new-skill>
   npm init -y
   # ... 配置 vite.config.ts、tsconfig.json
   ```

2. 在 `skills/<new-skill>/` 准备 SKILL.md 和 references

3. 根 package.json 的 workspaces 会自动识别

### 提交前检查

```bash
# 类型检查
npm run typecheck

# 编译所有技能
npm run build

# 运行测试（如果有）
npm run test
```

## 关键文件说明

| 文件 | 用途 |
|------|------|
| `AGENTS.md` | 本文件，AI 编码指南 |
| `README.md` | 项目使用说明 |
| `package.json` | Monorepo 根配置 |
| `tsconfig.json` | TypeScript 根配置（noEmit=true，仅用于类型检查） |
| `src/*/vite.config.ts` | 各技能的 Vite 8 (Rolldown) 编译配置 |
| `src/*/build.mjs` | 各技能的程序化多入口构建脚本（避免 chunk 拆分） |
| `skills/*/SKILL.md` | 技能入口文档（符合 Agent Skills 规范） |

## 重要警告

⚠️ **不要**手动修改 `skills/*/scripts/dist/` 目录下的文件，它们都是编译产物
⚠️ **不要**在 `skills/*/SKILL.md` 里堆砌代码和配方，那是按职责分层后由 AI 动态加载的
⚠️ **不要**把 npm 包作为运行时依赖添加到 `skills/*/scripts/dist/` 之外

## 编码风格

- 使用 2 空格缩进（不要 Tab）
- 使用 LF 换行（不要 CRLF）
- 单引号字符串
- 结尾无分号（ESLint 配置）
- 使用 ESM（`import/export`，不要 `require`）

## 构建命令速查

```bash
# 全局命令
npm run build          # 编译所有技能
npm run dev            # 监听所有技能的改动
npm run test           # 运行所有测试
npm run typecheck      # 类型检查

# 单个技能命令（需要 cd 到对应 src 目录）
npm -w imagegen-magick build   # 编译指定技能
npm -w imagegen-magick dev     # 监听指定技能
npm -w music build             # 编译音乐技能
npm -w music dev               # 监听音乐技能
```

## 参考资源

- Agent Skills 规范：https://agentskills.io/
- skills.sh 目录：https://skills.sh/
- OpenAI imagegen 参考：https://github.com/openai/skills/tree/main/skills/.system/imagegen
- Vite 8 官方文档：https://vite.dev/
- Rolldown 文档：https://rolldown.rs/
- TypeScript 官方：https://www.typescriptlang.org/
