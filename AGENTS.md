# AGENTS.md

> 本文档面向 AI 编码助手（Claude Code、Codex、OpenCode、Cursor、Copilot 等）
> 目的是让 AI 在贡献本项目代码时保持风格一致、遵循项目规范。

## 项目简介

这是一个 **AI Agent Skills 的 Monorepo** 工程，使用前端工程化方式（Vite 8 + Rolldown + TypeScript）开发多个 Agent 技能，
编译产物符合 [Agent Skills 开放标准](https://agentskills.io/) 和 [skills.sh](https://skills.sh/) 规范。

**技术栈**：
- **构建工具**：Vite 8.0.14（使用 Rolldown，Rust 实现的打包器，替代 Rollup）
- **语言**：TypeScript 5.4+（music、hq 技能使用）；Vue 3 + UnoCSS（pp 技能使用）
- **运行环境**：Node.js 22+

技能类型：
- **代码型技能**（如 music、hq）：使用 TypeScript 开发，通过 Vite 编译为 .mjs 文件
- **资源型技能**（如 imagegen-magick）：纯文档 + 内置字体，通过 Vite public 目录机制复制资源
- **网页型技能**（如 pp）：使用 Vue 3 + UnoCSS 开发，通过 vite-plugin-singlefile 编译为单个 HTML 文件

每个技能独立可用，跨平台（Windows / macOS / Linux），零 npm 安装即可运行。

## 目录结构（重要）

```
skills-uid13/
├── src/                           # 源码目录
│   ├── imagegen-magick/           # 图像生成技能（纯资源型）
│   │   ├── public/                # 资源目录（构建时复制到 skills/）
│   │   │   ├── fonts/             # 内置字体（Cascadia Next SC NF）
│   │   │   ├── references/        # 参考文档
│   │   │   └── SKILL.md           # 技能入口文档
│   │   ├── src/                   # Vite 构建入口
│   │   │   └── dummy.js           # 占位文件
│   │   ├── vite.config.ts         # Vite 配置（publicDir 机制）
│   │   └── package.json           # 模块级配置
│   ├── music/                     # 音乐播放技能（代码型，TypeScript）
│   │   ├── src/bin/               # CLI 入口（music）
│   │   ├── src/lib/               # 工具库（mpv IPC 控制）
│   │   ├── vite.config.ts         # Vite 8 (Rolldown) 编译配置
│   │   ├── tsconfig.json          # 模块级 TS 配置
│   │   └── package.json           # 模块级依赖与构建脚本
│   ├── hq/                        # 行情查询技能（代码型，TypeScript）
│   │   ├── src/bin/               # CLI 入口（hq）
│   │   ├── src/lib/               # 工具库（行情解析、HTTP 请求）
│   │   ├── vite.config.ts         # Vite 8 (Rolldown) 编译配置
│   │   ├── tsconfig.json          # 模块级 TS 配置
│   │   └── package.json           # 模块级依赖与构建脚本
│   └── pp/                        # 图片画廊技能（网页型，Vue 3 + UnoCSS）
│       ├── src/                   # Vue 源码
│       │   ├── App.vue            # 主组件（随机渐变背景）
│       │   ├── components/        # 组件目录
│       │   │   └── Gallery.vue    # 画廊组件（瀑布流 + Viewer.js）
│       │   ├── types/             # TypeScript 类型定义
│       │   ├── main.ts            # Vue 应用入口
│       │   └── env.d.ts           # 环境类型声明
│       ├── public/                # 运行时资源（构建时复制到 skills/）
│       │   ├── icons/             # SVG 图标
│       │   └── pp-data.js         # 图片数据（运行时由 Agent 写入）
│       ├── index.html             # HTML 入口
│       ├── vite.config.ts         # Vite + singlefile 配置
│       ├── uno.config.ts          # UnoCSS 配置
│       ├── tsconfig.json          # 模块级 TS 配置
│       └── package.json           # 模块级依赖与构建脚本
│
├── skills/                        # 输出产物（Agent Skills 规范结构）
│   ├── imagegen-magick/
│   │   ├── SKILL.md               # 技能入口文档
│   │   ├── references/            # 按需加载的参考文档
│   │   ├── fonts/                 # 内置字体文件
│   │   └── scripts/dummy.js       # 占位文件（Vite 构建产物）
│   ├── music/
│   │   ├── SKILL.md
│   │   └── scripts/dist/          # 编译后的 .mjs 文件
│   ├── hq/
│   │   ├── SKILL.md
│   │   └── scripts/dist/          # 编译后的 .mjs 文件
│   └── pp/
│       ├── SKILL.md               # 技能入口文档
│       ├── index.html             # 单文件构建产物（JS/CSS 全部内联）
│       ├── icons/                 # SVG 图标
│       └── pp-data.js             # 图片数据（运行时由 Agent 写入）
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

- 代码型技能：所有运行时依赖在 src 内部，通过 Vite 8 (Rolldown) 打包进 dist
- 资源型技能：无代码依赖，仅文档和资源文件
- 网页型技能：所有依赖（Vue、UnoCSS、Viewer.js）通过 vite-plugin-singlefile 内联到 HTML
- 用户克隆仓库或安装技能后**不需要** `npm install` 即可使用
- 仅开发时才需要 `npm install`

### 3. 跨平台兼容

- 所有脚本必须同时工作于 Windows / macOS / Linux
- 使用 cross-spawn 进行跨平台进程调用，不要直接 `child_process.spawn`
- 文件路径统一使用 `node:path` 的 posix 或自动识别
- Windows 上使用 Git Bash（不支持 PowerShell）

### 4. 输出 ESM

- 所有编译产物统一为 `.mjs`（ESM 格式）
- Node.js 版本要求 >= 22
- 保留 source map（.mjs.map）便于调试

### 5. 单一职责

每个工具只负责一件事：
- `music.mjs`：mpv 播放控制（IPC 透传，模型直接调用 yt-dlp 和 mpv CLI）
- `hq.mjs`：行情查询（接收代码参数，调用新浪接口，输出格式化表格）
- `pp/index.html`：图片画廊展示（Agent 负责生成 pp-data.js，HTML 负责渲染）

对于资源型技能（如 imagegen-magick），AI Agent 直接调用外部工具（如 `magick` CLI），无需自定义脚本。

### 6. 错误处理

- 所有工具失败时必须输出**可读的错误信息**（中英对照）
- 包含可能的修复建议
- 不要静默失败（no silent failures）
- 退出码规范：
  - `0`：成功
  - `1`：一般性错误
  - `2`：参数错误
  - `3`：依赖缺失

### 7. 输出格式

- music.mjs 默认输出 JSON 格式（便于 AI 解析）
- 所有控制命令返回统一结构：`{ status, action, ... }`
- hq.mjs 输出 Markdown 表格格式（便于 AI 直接展示）
- pp 技能输出单个 HTML 文件（浏览器直接打开）

## 开发流程

### 修改代码型技能（如 music、hq）

1. 进入 `src/<skill-name>/`：
   ```bash
   cd src/music
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
    node ../../skills/music/scripts/dist/music.mjs --help
    ```

7. 确保产物已更新后提交

### 修改资源型技能（如 imagegen-magick）

1. 进入 `src/<skill-name>/public/` 目录
2. 修改 SKILL.md 或 references/ 下的文档
3. 如需添加字体或其他资源，放入 public/ 对应子目录
4. 运行 `npm run build` 构建（会复制 public/ 内容到 skills/）
5. 验证 `skills/<skill-name>/` 下的产物已更新

### 修改网页型技能（如 pp）

1. 进入 `src/pp/`：
   ```bash
   cd src/pp
   ```

2. 安装依赖（首次或依赖变更）：
   ```bash
   npm install
   ```

3. 开发模式（热更新）：
   ```bash
   npm run dev
   ```

4. 修改 Vue 组件或样式

5. 重新编译：
   ```bash
   npm run build
   ```

6. 验证编译产物：
   - 检查 `skills/pp/index.html` 是否已更新
   - 用浏览器打开 `skills/pp/index.html` 测试功能

7. 确保产物已更新后提交

### 新增技能

**代码型技能**：

1. 在 `src/<new-skill>/` 创建项目：
   ```bash
   mkdir src/<new-skill>
   cd src/<new-skill>
   npm init -y
   # ... 配置 vite.config.ts、tsconfig.json
   ```

2. 在 `skills/<new-skill>/` 准备 SKILL.md 和 references

3. 根 package.json 的 workspaces 会自动识别

**资源型技能**：

1. 在 `src/<new-skill>/` 创建目录结构：
   ```bash
   mkdir -p src/<new-skill>/public
   mkdir -p src/<new-skill>/src
   ```

2. 创建 `package.json`（极简配置）：
   ```json
   {
     "name": "<new-skill>-src",
     "version": "1.0.0",
     "private": true,
     "type": "module",
     "scripts": {
       "build": "vite build",
       "dev": "vite build --watch"
     },
     "devDependencies": {
       "vite": "^8.0.0"
     }
   }
   ```

3. 创建 `vite.config.ts`（使用 publicDir 机制）：
   ```typescript
   import { defineConfig } from 'vite'
   import { resolve, dirname } from 'node:path'
   import { fileURLToPath } from 'node:url'

   const __dirname = dirname(fileURLToPath(import.meta.url))

   export default defineConfig({
     publicDir: resolve(__dirname, 'public'),
     build: {
       outDir: resolve(__dirname, '../../skills/<new-skill>'),
       emptyOutDir: true,
       lib: {
         entry: resolve(__dirname, 'src/dummy.js'),
         formats: ['es'],
       },
       rollupOptions: {
         output: {
           entryFileNames: 'scripts/dummy.js',
         },
       },
     },
   })
   ```

4. 在 `public/` 下放置 SKILL.md、fonts/、references/ 等资源

5. 创建 `src/dummy.js` 占位文件：
   ```javascript
   // Vite 构建占位文件
   export {}
   ```

**网页型技能**：

1. 在 `src/<new-skill>/` 创建 Vue 3 项目：
   ```bash
   mkdir -p src/<new-skill>/src/components
   mkdir -p src/<new-skill>/public
   cd src/<new-skill>
   npm init -y
   ```

2. 安装依赖：
   ```bash
   npm install vue
   npm install -D vite @vitejs/plugin-vue unocss vite-plugin-singlefile typescript
   ```

3. 创建 `vite.config.ts`（使用 singlefile 插件）：
   ```typescript
   import { defineConfig } from 'vite'
   import { resolve } from 'node:path'
   import vue from '@vitejs/plugin-vue'
   import UnoCSS from 'unocss/vite'
   import { viteSingleFile } from 'vite-plugin-singlefile'

   export default defineConfig({
     plugins: [UnoCSS(), vue(), viteSingleFile()],
     build: {
       outDir: resolve(__dirname, '../../skills/<new-skill>'),
       emptyOutDir: true,
       rollupOptions: {
         input: resolve(__dirname, 'index.html'),
       },
     },
     publicDir: resolve(__dirname, 'public'),
   })
   ```

4. 创建 `index.html`、`src/main.ts`、`src/App.vue` 等 Vue 文件

5. 在 `public/` 下放置运行时资源（如数据文件、图标等）

### 提交前检查

```bash
# 类型检查（仅代码型技能）
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
| `src/*/vite.config.ts` | 各技能的 Vite 配置 |
| `src/*/public/` | 资源型/网页型技能的资源目录（构建时复制到 skills/） |
| `skills/*/SKILL.md` | 技能入口文档（符合 Agent Skills 规范） |
| `skills/*/references/` | 按需加载的参考文档（由构建从 src 复制） |
| `skills/*/fonts/` | 内置字体文件（由构建从 src 复制） |
| `skills/pp/index.html` | 网页型技能的单文件构建产物 |

## 重要警告

⚠️ **不要**手动修改 `skills/*/scripts/` 目录下的文件，它们都是构建产物
⚠️ **不要**在 `skills/*/SKILL.md` 里堆砌代码和配方，那是按职责分层后由 AI 动态加载的
⚠️ **不要**把 npm 包作为运行时依赖添加到资源型技能中
⚠️ **不要**删除 `src/dummy.js`，Vite 构建需要至少一个入口文件
⚠️ **不要**手动修改 `skills/pp/index.html`，它是 Vite 构建产物

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
npm run typecheck      # 类型检查（仅代码型技能）

# 单个技能命令（需要 cd 到对应 src 目录）
npm -w imagegen-magick-src build   # 编译资源型技能（复制 public/ 到 skills/）
npm -w imagegen-magick-src dev     # 监听资源型技能

npm -w music-src build             # 编译音乐播放技能
npm -w music-src dev               # 监听音乐播放技能

npm -w hq-src build                # 编译行情查询技能
npm -w hq-src dev                  # 监听行情查询技能

npm -w pp-src build                # 编译图片画廊技能（输出单文件 HTML）
npm -w pp-src dev                  # 监听图片画廊技能（热更新开发）
```

## 参考资源

- Agent Skills 规范：https://agentskills.io/
- skills.sh 目录：https://skills.sh/
- OpenAI imagegen 参考：https://github.com/openai/skills/tree/main/skills/.system/imagegen
- Vite 8 官方文档：https://vite.dev/
- Vite public 目录：https://vitejs.dev/guide/assets.html#the-public-directory
- Rolldown 文档：https://rolldown.rs/
- TypeScript 官方：https://www.typescriptlang.org/
- Vue 3 官方文档：https://vuejs.org/
- UnoCSS 官方文档：https://unocss.dev/
- vite-plugin-singlefile：https://github.com/nicbarker/vite-plugin-singlefile
