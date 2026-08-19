# 贡献指南

欢迎为 uid13 Skills 贡献代码、文档或想法。请先阅读本指南以确保协作顺畅。

## 前置要求

- Node.js >= 22，pnpm >= 11，Git
- 各技能额外依赖项见 [README](./README.md#开发环境)

## 开发流程

```bash
git clone https://github.com/uid13/skills.git
cd skills
pnpm install
pnpm build
```

### 项目结构

```
src/            # 源码（各技能独立开发指南见 src/<skill>/AGENTS.md）
skills/         # 构建产物（用户视角，零安装即可使用）
├── hq/         # 行情查询技能
├── imagegen-magick/  # 图像生成技能
├── music/      # 音乐播放技能
├── pp/         # 图片画廊技能
├── wc/         # 英语词汇学习技能
└── wc-jp/      # 日语词汇学习技能
```

### 开发模式

```bash
pnpm dev          # 监听所有技能改动
pnpm build        # 编译所有技能
pnpm typecheck    # 类型检查（含 TS 源码的技能：hq / music / pp）
```

按技能独立开发：

```bash
pnpm --filter hq-src dev
pnpm --filter music-src dev
pnpm --filter pp-src dev
pnpm --filter imagegen-magick-src dev
pnpm --filter wc-src dev
pnpm --filter wc-jp-src dev
```

## 编码规范

- **注释**：所有代码必须使用中文注释（函数说明、类型定义、关键逻辑等）
- **缩进**：2 空格，不要 Tab
- **换行**：LF，不要 CRLF
- **引号**：单引号
- **结尾**：无分号
- **模块**：ESM（`import/export`），不要 `require`
- **跨平台**：使用 `cross-spawn` 进行进程调用，文件路径使用 `node:path`
- 详细规范见 [AGENTS.md](./AGENTS.md)

## 技能开发

各技能有独立的开发指南，包含目录结构、构建配置、注意事项：

- 行情查询：`src/hq/AGENTS.md`
- 图像生成：`src/imagegen-magick/AGENTS.md`
- 音乐播放：`src/music/AGENTS.md`
- 图片画廊：`src/pp/AGENTS.md`
- 英语词汇学习：`src/wc/AGENTS.md`
- 日语词汇学习：`src/wc-jp/AGENTS.md`

### 关键原则

1. **不要手动修改 `skills/` 下的文件** — 它们都是构建产物，源码在 `src/` 中修改后通过 `pnpm build` 编译
2. **零依赖分发** — 所有运行时依赖通过 Vite 打包进产物，用户无需 `pnpm install`
3. **不发布 source map** — 减小安装体积（`sourcemap: false`）
4. **退出码规范**（代码型技能）：`0` 成功、`1` 一般错误、`2` 参数错误、`3` 依赖缺失

## 构建产物验证

代码型技能：

```bash
# 行情查询
node skills/hq/scripts/dist/hq.mjs 600519

# 音乐播放
node skills/music/scripts/dist/music.mjs --help
```

网页型技能：用浏览器打开 `skills/pp/index.html`（支持 `file://` 协议）。

## PR 流程

1. Fork 仓库并创建特性分支
2. 确保通过 `pnpm build` 编译
3. 提交前确认 `skills/` 下构建产物已同步更新
4. 创建 Pull Request，描述变更内容和动机

## 许可证

本项目采用 [MIT 许可证](./LICENSE)。贡献即表示你同意你的贡献将在相同许可证下分发。
