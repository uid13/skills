---
name: imagegen-magick
description: "生成或编辑矢量/程序化图像（博客封面、Logo、图表、徽章、UI 组件、PPT 封面、社交媒体图片等）。当用户需要基于模板/参数生成具有精确排版、字体控制、尺寸约束的设计类图像时使用。使用 SVG 编写 + ImageMagick 渲染。不适合：照片级写实、复杂纹理、人物肖像等需要生成模型的场景（请改用 imagegen 类技能）。适配 opencode、codex、Claude Code、Cursor、Copilot、Gemini CLI 等 Agent 平台。"
---

# ImageGen Magick 技能

使用 **SVG + ImageMagick** 工作流，程序化生成高质量的矢量风格图像。

## 核心工具

本技能提供 5 个命令行工具（位于 `scripts/dist/`），Agent 在任务中按需调用：

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

### 4. `font-chain.mjs` — 字体链生成工具

```bash
node <skill-dir>/scripts/dist/font-chain.mjs [--json] [--dry-run] [--quiet]
```

**用途**：从 ImageMagick 获取系统真实可用字体，按类别和优先级分类，生成 `references/font-handling.jsonc`。

**执行时机**：Agent 首次使用技能时**必须执行**，后续字体变化时可重新执行。

**输出**：`references/font-handling.jsonc`（JSONC 格式，带注释，机器可读）

### 5. `post-process.mjs` — 图像后期处理

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

## When to use
- 生成新的 SVG 设计图（博客封面、社交媒体图片、Logo、徽章、UI 组件、信息图、演示文稿封面）
- 需要精确排版、字体控制、尺寸约束的设计类图像
- 编辑已有 SVG 设计（更新文字、布局、颜色、组件）
- 为同一任务生成多个设计变体

## When not to use
- 照片级写实、复杂纹理、人物肖像等需要生成模型的场景 → 改用 imagegen 类技能
- 扩展或匹配仓库内已有的 SVG/矢量图标集或插画库 → 直接编辑已有文件
- 简单形状、图表、图标，直接用 HTML/CSS/canvas 更合适 → 不需要 ImageMagick 渲染管线
- 用户明确需要 AI 生成的位图而非代码原生的 SVG → 改用 imagegen 类技能

## 标准工作流（5 个 Phase）

### Phase 1: 环境确认（首次使用必做）

```bash
node <skill-dir>/scripts/dist/info.mjs
```

- 如果 ImageMagick 未安装：告知用户安装（`winget install ImageMagick.ImageMagick` 或 `brew install imagemagick`）
- 记录首选字体（`preferredFont.usedName`），后续 SVG 中使用

```bash
# 首次使用：生成字体链配置
node <skill-dir>/scripts/dist/font-chain.mjs
```

- 生成 `references/font-handling.jsonc`，供 Phase 3 字体 fallback 使用

### Phase 2: 需求收集

解析用户的自然语言请求，从中提取意图并构建结构化的设计 spec。

**Decision tree**：

Intent（意图判断）：
- 用户要求修改已有 SVG 并保留部分内容 → **edit**
- 用户提供参考图片仅用于风格/构图/情绪引导 → **generate**
- 用户未提供参考图片 → **generate**

Execution strategy（执行策略）：
- 单张设计 → 单次 generate/edit 流程
- 多张设计或变体 → 每个独立任务单独走完整流程（不要用 batch 替代独立 prompt）

**Edit semantics**：
- 对已有 SVG 的编辑要激进地保护不变量（preserve invariants aggressively）
- 在 Constraints 中显式列出不变量：`change only X; keep Y unchanged`
- 每次迭代都重复不变量以减少漂移

**Specificity policy（与 prompting.md 一致）**：
- 用户 prompt 已经很具体：保留原意，只做结构化整理，不额外添加创意需求
- 用户 prompt 比较泛泛：在能实质性改善输出的前提下，补充合理的细节
- 不要凭空添加用户没有提及的角色、品牌、叙事等元素


**Use case slugs（适用分类）**：
- `blog-cover` — 博客/文章封面图
- `social-media` — 社交媒体图片（公众号首图、小红书、Twitter header 等）
- `logo-brand` — Logo / 品牌标识
- `badge-icon` — 徽章 / 图标 / 水印
- `ui-component` — UI 组件 / 按钮 / 卡片 / 导航栏
- `infographic-diagram` — 信息图 / 流程图 / 架构图
- `product-mockup` — 产品包装 / 展示图
- `presentation` — PPT / 演示文稿封面
- `decorative` — 装饰性图形 / 分隔线 / 背景纹理

**Shared prompt schema（设计 spec 结构）**：
```text
Use case: <slug，从上方分类中选择>
Asset type: <封面 / Logo / 徽章 / 社交媒体图片 / UI 组件 / ...>
Primary request: <用户的核心需求>
Dimensions: <输出尺寸，用户未指定时根据用途推断>
Style: <视觉风格>
Text (verbatim): "<精确文字内容>"
Typography: <字体链，参考 font-handling.jsonc>
Color palette: <配色方案>
Composition/framing: <构图与布局>
Constraints: <必须保留 / 必须避免>
```

设计 spec 参考 `references/prompting.md`（塑形原则）和 `references/sample-prompts.md`（场景模板）。

**何时追问用户**：仅在缺少以下关键信息且无法合理推断时才追问，每次最多 1-2 个问题：
- 精确文字内容（用户只说"帮我做个封面"但没说标题写什么）
- 输出尺寸（用户未指定用途，也无法从上下文推断）

**输出意图**：判断产物是 preview-only 还是 project-bound，这决定 Phase 5 的交付方式。

### Phase 3: 设计与生成

根据 Phase 2 的设计 spec，**生成完整可用的 SVG 代码**。

**重要原则**：
- 设计思路参考 `references/prompting.md`
- 多样化设计示例参考 `references/sample-prompts.md`
- 字体处理参考 `references/font-handling.jsonc`（Phase 1 已生成）
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

Inspect outputs and validate: 文字渲染（乱码/豆腐块/空白字）、主体与构图、元素对齐与间距、背景与文字对比、边界溢出、用户指定的约束（尺寸/风格/避免项）。

发现问题时的处理：
Iterate with a single targeted change, then re-check.
- 排版/布局/元素位置问题 → 修改 SVG 代码，重新渲染
- 色调/模糊/格式/尺寸问题 → 使用 `post-process.mjs` 后期处理

### Phase 5: 交付

根据输出意图决定交付方式：
- **Preview-only**：仅展示预览，SVG 和 PNG 保留在工作目录即可，inline 渲染给用户查看
- **Project-bound**：将最终产物复制或移动到项目目标位置，更新所有引用路径，确保产物不滞留在临时工作目录

**Overwrite policy**：不要覆盖已有产物，除非用户明确要求替换。否则创建版本化的文件名（如 `hero-v2.png`）。

交付报告：
- 文件路径（absolute path）
- 尺寸（W×H px）
- 文件大小
- 迭代次数
- 下一步建议（微调、导出其他格式等）

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

- [`references/prompting.md`](./references/prompting.md) — SVG 设计思路引导
- [`references/sample-prompts.md`](./references/sample-prompts.md) — 多样化设计示例
- [`references/assets.md`](./references/assets.md) — 外部素材获取（Iconify 公共 API 图标）
- [`references/font-handling.jsonc`](./references/font-handling.jsonc) — 字体链配置（由 `font-chain.mjs` 生成）
