# imagegen-magick

使用 **SVG + ImageMagick** 工作流，程序化生成高质量的矢量风格图像。

适用于博客封面、Logo、图表、徽章、UI 组件、PPT 封面、社交媒体图片等需要精确排版和字体控制的设计类图像。

> 不适合：照片级写实、复杂纹理、人物肖像等需要 AI 生成模型的场景（请改用 imagegen 类技能）。

## 前置要求

- **Node.js** >= 22
- **ImageMagick 7+**：[安装指南](https://imagemagick.org/script/download.php)
  - Windows: `winget install ImageMagick.ImageMagick`
  - macOS: `brew install imagemagick`

## 工具一览

本技能提供 5 个 CLI 工具（位于 `scripts/dist/`）：

| 工具 | 用途 |
|------|------|
| `info.mjs` | 环境检查（ImageMagick 是否安装、字体是否齐全） |
| `check-fonts.mjs` | 字体检测与推荐 |
| `render.mjs` | SVG → PNG 渲染（核心） |
| `font-chain.mjs` | 生成字体链配置（font-handling.jsonc） |
| `post-process.mjs` | 图像后期处理（调色、模糊、格式转换等） |

## 快速开始

```bash
# 1. 检查环境
node scripts/dist/info.mjs

# 2. 生成字体链配置（首次使用必做）
node scripts/dist/font-chain.mjs

# 3. 编写 SVG 并渲染
node scripts/dist/render.mjs design.svg -o output.png --scale 2x
```

## Agent 工作流

本技能为 AI Agent 设计，标准工作流分 5 个 Phase：

1. **环境确认** — 运行 `info.mjs` 检查依赖
2. **需求收集** — 解析自然语言请求，提取设计 spec
3. **设计与生成** — 通过 Iconify 获取图标素材，编写 SVG
4. **渲染与验证** — 渲染 PNG 并自检（文字、布局、重叠、对比度）
5. **交付** — 输出最终产物

完整工作流详见 [SKILL.md](./SKILL.md)。

## 参考文档

按需加载，不必一次性全部阅读：

- [`references/prompting.md`](./references/prompting.md) — SVG 设计思路引导
- [`references/sample-prompts.md`](./references/sample-prompts.md) — 多样化设计示例
- [`references/assets.md`](./references/assets.md) — 外部素材获取（Iconify 图标 API）
- [`references/font-handling.jsonc`](./references/font-handling.jsonc) — 字体链配置（由 `font-chain.mjs` 生成）

## 技术栈（开发者）

- **语言**：TypeScript 5.4+
- **构建**：Vite 8 + Rolldown（Rust 打包器）
- **输出**：ESM (.mjs)，零外部依赖
- **源码**：[src/imagegen-magick/](../../src/imagegen-magick/)

```bash
# 开发命令（在根目录）
npm install           # 安装依赖
npm run build         # 编译所有技能
npm -w imagegen-magick-src dev   # 监听模式
```
