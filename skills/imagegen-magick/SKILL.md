---
name: imagegen-magick
description: "生成或编辑矢量/程序化图像（博客封面、Logo、图表、徽章、UI 组件、PPT 封面、社交媒体图片等）。当用户需要基于模板/参数生成具有精确排版、字体控制、尺寸约束的设计类图像时使用。使用 SVG 编写 + ImageMagick 渲染。不适合：照片级写实、复杂纹理、人物肖像等需要生成模型的场景（请改用 imagegen 类技能）。适配 opencode、codex、Claude Code、Cursor、Copilot、Gemini CLI 等 Agent 平台。"
---

# ImageGen Magick 技能

使用 **SVG + ImageMagick** 工作流，程序化生成高质量的矢量风格图像。

## 内置字体

本技能内置 **Cascadia Next SC NF** 字体（中英文 2:1 等宽），7 个字重，无需用户安装。
字体文件位于 `fonts/` 目录，ImageMagick 渲染时自动使用。

SVG 中统一使用 `font-family="Cascadia Next SC NF"`。

## 标准工作流（5 个 Phase）

### Phase 1: 环境确认（首次使用必做）

**检查 ImageMagick 是否安装**：
```bash
magick -version
```

- 如果未安装：告知用户安装（`winget install ImageMagick.ImageMagick` 或 `brew install imagemagick`）
- 如果已安装：记录版本号，继续下一步

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
Typography: 固定使用 Cascadia Next SC NF
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

**准备素材**（必做）：
- 根据主题关键词搜索 Iconify 图标（如技术主题搜 `terminal` `code` `server` `cloud`）
- 选取 2-3 个与主题匹配的图标，嵌入 SVG 设计中
- 图标颜色必须与配色方案一致，不要用默认颜色
- 详细用法见 `references/assets.md`（API 地址、推荐图标集、嵌入方式）

**生成 SVG 代码**：
根据 Phase 2 的设计 spec，生成完整可用的 SVG 代码。

**重要原则**：
- 设计思路参考 `references/prompting.md`
- 多样化设计示例参考 `references/sample-prompts.md`

**内置字体**：
本技能内置 Cascadia Next SC NF 字体（中英文 2:1 等宽），所有 SVG 统一使用该字体：

```xml
<text font-family="Cascadia Next SC NF" font-size="32" font-weight="bold">中文 + English</text>
```

- 字体文件位于 `fonts/` 目录，ImageMagick 渲染时自动使用，无需用户安装
- 支持 7 个字重：`font-weight` 可选 `100`(ExtraLight) `200`(Light) `400`(Regular) `500`(Medium) `600`(SemiBold) `700`(Bold) `800`(ExtraBold)
- **不要使用其他字体名**，不要写 fallback 链

**写入 SVG 文件**（推荐命名 `design-v1.svg`），然后用 `magick` 命令渲染。

### Phase 4: 渲染与验证闭环

**渲染**：
```bash
magick design-v1.svg -density 192 -background none -flatten design-v1.png
```

**验证**：
Inspect outputs and validate: 文字渲染（乱码/豆腐块/空白字）、主体与构图、元素对齐与间距、**元素重叠**（文本/图标/装饰元素之间是否互相覆盖）、背景与文字对比、边界溢出、用户指定的约束（尺寸/风格/避免项）。

**后期处理**（如需调整）：
直接使用 `magick` CLI 构造参数：

```bash
# 模糊
magick design.png -blur 0x3 design-blurred.png

# 调整大小
magick design.png -resize 800x design-resized.png

# 调整亮度对比度（亮度 -10，对比度 +5）
magick design.png -brightness-contrast -10x5 design-adjusted.png

# 灰度化
magick design.png -colorspace Gray design-gray.png

# 添加暗角
magick design.png -vignette 0x3 design-vignette.png

# 转换为 JPEG
magick design.png -quality 85 design.jpg
```

**发现问题时的处理**：
Iterate with a single targeted change, then re-check.
- 排版/布局/元素位置问题 → 修改 SVG 代码，重新渲染
- 色调/模糊/格式/尺寸问题 → 使用 `magick` 后期处理

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
magick logo.svg -density 192 -background none logo.png
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

## 参考文档（按需加载）

以下文档按需阅读，不必一次性全部加载：

- [`references/prompting.md`](./references/prompting.md) — SVG 设计思路引导
- [`references/sample-prompts.md`](./references/sample-prompts.md) — 多样化设计示例
- [`references/assets.md`](./references/assets.md) — 外部素材获取（Iconify 公共 API 图标）
