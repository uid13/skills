---
name: imagegen-magick
description: "生成或编辑矢量/程序化图像（博客封面、Logo、图表、徽章、UI 组件、PPT 封面、社交媒体图片等）。当用户需要基于模板/参数生成具有精确排版、字体控制、尺寸约束的设计类图像时使用。使用 SVG 编写 + ImageMagick 渲染，配合当前 AI Agent 模型自带的识图能力进行验证迭代。不适合：照片级写实、复杂纹理、人物肖像等需要生成模型的场景（请改用 imagegen 类技能）。适配 opencode、codex、Claude Code、Cursor、Copilot、Gemini CLI 等 Agent 平台。"
---

# ImageGen Magick 技能

使用 **SVG + ImageMagick + AI 识图自检** 工作流，程序化生成高质量的矢量风格图像。

## 核心工具

本技能提供 6 个命令行工具（位于 `scripts/dist/`），Agent 在任务中按需调用：

### 1. `info.mjs` — 环境检查

```bash
node <skill-dir>/scripts/dist/info.mjs [--json] [--quiet] [--preferred "Cascadia Code"]
```

**用途**：首次使用任务前**必做**，检查 ImageMagick 是否安装、字体是否齐全。

**退出码**：
- `0` 环境就绪
- `1` 一般性问题（如中文字体缺失，仍可工作）
- `3` **严重问题**：ImageMagick 未安装（必须解决）

### 2. `check-fonts.mjs` — 字体检测与推荐

```bash
node <skill-dir>/scripts/dist/check-fonts.mjs [--filter "关键字"] [--recommend code|cjk|sans|serif] [--json]
```

**用途**：列出系统可用字体，按场景推荐（代码字体/中文字体/无衬线/衬线）。

**典型用法**：
- `--filter "Cascadia"` — 查看 Cascadia 系列是否安装
- `--recommend code` — 查看当前代码字体可用情况
- `--recommend cjk` — 查看中文字体可用性

### 3. `render.mjs` — SVG → PNG 渲染（核心）

```bash
node <skill-dir>/scripts/dist/render.mjs <input.svg> [-o <output.png>] [--scale <2x|3x|...>] [--background <transparent|white|#...>] [--quality <1-100>] [--force] [--json]
```

**用途**：将写好的 SVG 代码渲染为实际图片。

**关键参数**：
- `--scale 2x` — 输出分辨率放大 2 倍（默认值，适合高清）
- `--background transparent` — 默认透明背景
- `--force` — 强制覆盖已有文件（不传会自动生成 `xxx-1.png` 避免覆盖）

**退出码**：
- `0` 成功
- `1` ImageMagick 渲染失败
- `2` 参数错误（输入文件不存在、扩展名错误）
- `3` ImageMagick 未安装

### 4. `scaffold.mjs` — 交互式 SVG 骨架生成器

```bash
node <skill-dir>/scripts/dist/scaffold.mjs [--preset wechat-cover|youtube|douyin|...] [--title "文字"] [--subtitle "副标题"] [--font "字体名"] [--output scaffold.svg] [--json] [--no-interactive]
```

**用途**：当用户需求较明确但没想好细节时，用此工具**交互式引导**收集参数，生成完整可用的 SVG 文件。

**预设尺寸**：
- `wechat-cover` (900×383 微信公众号首图)
- `xiaohongshu` (1080×1440 小红书图文)
- `douyin` (1080×1920 抖音封面)
- `youtube` (1280×720 YouTube 缩略图)
- `twitter` (1200×675 X/Twitter 卡片)
- `og-image` (1200×630 Open Graph)
- `square` (1080×1080 正方形)

**非交互模式**（适合 AI 直接调用）：
```bash
node scaffold.mjs --preset wechat-cover \
  --title "AI Agentic CLI" --subtitle "给 AI 装上手脚" \
  --font "Cascadia Code" --output cover.svg --no-interactive
```

### 5. `font-chain.mjs` — 字体链生成工具

```bash
node <skill-dir>/scripts/dist/font-chain.mjs [--json] [--dry-run] [--quiet]
```

**用途**：从 ImageMagick 获取系统真实可用字体，按类别和优先级分类，生成 `references/font-handling.jsonc`。

**执行时机**：Agent 首次使用技能时**必须执行**，后续字体变化时可重新执行。

**输出**：`references/font-handling.jsonc`（JSONC 格式，带注释，机器可读）

### 6. `post-process.mjs` — 图像后期处理

```bash
node <skill-dir>/scripts/dist/post-process.mjs <input> [options] -o <output>
```

**用途**：对已有图片进行后期调整，无需重新渲染 SVG。

**Agent 使用方式**：根据 Phase 4 自检结果，自行判断需要的参数。模型具备 ImageMagick 参数知识，无需映射表。

**支持的操作维度**：
- 几何变换：`--resize`、`--crop`、`--rotate`、`--flip`、`--flop`
- 颜色色调：`--brightness`、`--contrast`、`--saturation`、`--sepia`、`--grayscale`、`--auto-level`
- 滤镜模糊：`--blur`、`--sharpen`、`--unsharp`
- 艺术效果：`--vignette`、`--charcoal`、`--sketch`、`--pixelate`
- 格式输出：`--jpeg <quality>`、`--webp <quality>`、`--png`、`--strip`
- 预设效果：`--preset <name>`（如 blog-cover、vintage、dramatic）

**工作流集成**：Phase 4 自检发现问题 → 判断属于后期处理范畴 → 调用 post-process.mjs → 重新自检。

## 标准工作流（5 个 Phase）

### Phase 1: 环境确认（首次使用必做）

```bash
node <skill-dir>/scripts/dist/info.mjs
```

- 如果 ImageMagick 未安装：告知用户安装（`winget install ImageMagick.ImageMagick` 或 `brew install imagemagick`）
- 记录首选字体（`preferredFont.usedName`），后续 SVG 中使用

### Phase 2: 需求收集

**向用户询问**（用 scaffold.mjs 或对话形式）：

```markdown
[1] 输出尺寸？
    ├── 微信公众号首图 (900×383)
    ├── 小红书图文 (1080×1440)
    ├── 抖音封面 (1080×1920)
    ├── YouTube (1280×720)
    └── 自定义 (例如 1500×800)

[2] 整体风格？
    ├── 简约现代
    ├── 活泼可爱
    ├── 专业商务
    ├── 复古怀旧
    └── 技术感（暗色 + 代码风）

[3] 主标题文字？（必填）

[4] 副标题？（可选）

[5] 字体偏好？
    ├── 自动（按环境检测 fallback，推荐）
    ├── 指定字体（列出可用字体）
    └── 默认 Cascadia Code

[6] 配色偏好？
    ├── 渐变（粉彩 / 深色 / 自定义）
    ├── 纯色
    └── 透明背景
```

**建议**：使用 `scaffold.mjs` 完成大部分参数收集，避免反复对话。

### Phase 3: 设计与生成

根据收集到的参数，**生成完整可用的 SVG 代码**。

**重要原则**：
- 遵循 `references/layouts.md` 的布局规范
- 配色参考 `references/color-palettes.md`
- 字体处理参考 `references/font-handling.jsonc`（首次使用需执行 `font-chain.mjs` 生成）
- 必须使用 `font-family` 链式 fallback（不要单字体名）
- 可通过 Iconify 公共 API 获取图标素材（详见 `references/assets.md`）

```xml
<!-- 示例：字体链式 fallback -->
<text font-family='"Cascadia Next SC NF", "Cascadia Code", "SimHei", sans-serif'>
  中文 + English
</text>
```

**写入 SVG 文件**（推荐命名 `design-v1.svg`），然后用 `render.mjs` 渲染。

### Phase 4: 渲染与验证闭环

```bash
# 渲染
node <skill-dir>/scripts/dist/render.mjs design-v1.svg -o design-v1.png
```

**AI 识图自检**（Phase 4 核心）：

让当前模型调用自身的识图能力查看输出的 PNG，**必须逐个检查**：

```markdown
## 自检清单（必须逐项确认）

[ ] 1. **文字渲染**：是否有乱码 / 豆腐块 / 空白字？
[ ] 2. **主体与构图**：画面主体是否正确？布局是否符合设计意图？
[ ] 3. **元素对齐**：标题是否居中？元素间距是否合理？
[ ] 4. **元素间距**：装饰元素与文字之间是否有足够间距（≥ 20px）？是否有重叠？
[ ] 5. **覆盖检测**：是否有任何文字被图片/元素遮挡？
[ ] 6. **边界检测**：是否有任何元素超出 SVG 画布？
[ ] 7. **颜色和谐**：背景与文字对比是否清晰？
[ ] 8. **字体美观**：文字是否清晰可读？
[ ] 9. **约束验证**：用户指定的约束（尺寸、风格、避免项等）是否满足？
```

**开放式验证**（checklist 之外）：

checklist 是基础保障，但不能覆盖所有情况。完成 checklist 后，**必须额外审视整个画面**：

- 是否有 checklist 未提及的视觉问题？
- 元素之间的空间关系是否舒适？
- 整体视觉层次是否清晰（主次分明）？
- 是否有意外的视觉干扰或噪点？

发现问题时的处理：
- 如果某项未通过，**一次只修一个问题**
- 修复后重新走 Phase 4（重新渲染 + 重新验证）
- 最多 5 轮迭代

### Phase 5: 交付

向用户报告：

```markdown
✓ 图像已生成
   - 文件路径: <absolute-path>
   - 尺寸: <W>×<H> px
   - 文件大小: <KB>
   - 迭代次数: <N>

[下一步]
- 如需微调某处，请告诉我具体位置和问题
- 如需导出其他格式（JPEG, WebP），告知我目标格式
```

## 单次迭代规则（必须遵守）

⚠️ **每次迭代只修复一个最严重的问题**

**错误做法**（一次改多处 → 容易破坏已好的部分）：
```
"修了标题位置 + 副标题字号 + 装饰颜色"  ❌
```

**正确做法**：
```
第 1 次迭代：只修标题位置（Y 坐标从 50% 调到 42%）
第 2 次迭代：只改副标题字号
第 3 次迭代：只优化装饰颜色
```

## 透明背景特殊处理

当用户需要**透明 PNG**（如 Logo、徽章、水印）：

```bash
node <skill-dir>/scripts/dist/render.mjs logo.svg -o logo.png --background transparent
```

SVG 中**不要**写背景层：
```xml
<!-- ✓ 透明背景：不写 rect 背景 -->
<svg ...>
  <text>Logo</text>
</svg>

<!-- ✗ 会破坏透明 -->
<svg>
  <rect width="100%" height="100%" fill="white"/>
  <text>Logo</text>
</svg>
```

## 字体 Fallback

本技能内置字体 fallback 策略，保证用户**无需手动安装 Cascadia**也能渲染。

**Fallback 顺序**（按优先级）：

| 类型 | 候选字体 |
|------|---------|
| 代码/西文 | 见 `references/font-handling.jsonc` → code.chain |
| 中文 | 见 `references/font-handling.jsonc` → cjk.chain |
| 无衬线西文 | 见 `references/font-handling.jsonc` → sans.chain |
| 衬线西文 | 见 `references/font-handling.jsonc` → serif.chain |

**数据来源**：`references/font-handling.jsonc` 由 `font-chain.mjs` 从 `magick identify -list font` 动态生成，反映当前系统真实可用字体。

## 参考文档（按需加载）

以下文档按需阅读，不必一次性全部加载：

- [`references/color-palettes.md`](./references/color-palettes.md) — 配色配方库
- [`references/typography.md`](./references/typography.md) — 字体/排版配方
- [`references/layouts.md`](./references/layouts.md) — 布局模式配方
- [`references/decorations.md`](./references/decorations.md) — 装饰元素库
- [`references/assets.md`](./references/assets.md) — 外部素材获取（Iconify 公共 API 图标）
- [`references/imagemagick-commands.md`](./references/imagemagick-commands.md) — IM 命令参考
- [`references/font-handling.jsonc`](./references/font-handling.jsonc) — 字体链配置（由 `font-chain.mjs` 生成）

## 示例（按需阅读）

- [`examples/wechat-article-cover.md`](./examples/wechat-article-cover.md) — 微信公众号封面完整生成示例
