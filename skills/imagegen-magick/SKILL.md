---
name: imagegen-magick
description: "生成或编辑矢量/程序化图像（博客封面、Logo、图表、徽章、UI 组件、PPT 封面、社交媒体图片等）。当用户需要基于模板/参数生成具有精确排版、字体控制、尺寸约束的设计类图像时使用。使用 SVG 编写 + ImageMagick 渲染，配合当前 AI Agent 模型自带的识图能力进行验证迭代。不适合：照片级写实、复杂纹理、人物肖像等需要生成模型的场景（请改用 imagegen 类技能）。适配 opencode、codex、Claude Code、Cursor、Copilot、Gemini CLI 等 Agent 平台。"
---

# ImageGen Magick 技能

使用 **SVG + ImageMagick + AI 识图自检** 工作流，程序化生成高质量的矢量风格图像。

## 何时使用此技能

✅ **适合**：
- 博客封面图（微信公众号、掘金、Medium、知乎）
- 社交媒体封面（抖音、小红书、Twitter/X、YouTube 缩略图）
- Logo、Icon、徽章（徽章、角标）
- 信息图表、数据可视化图
- UI 组件 Mockup
- PPT / 幻灯片封面
- 代码片段展示图
- 带精确文字排版的任何设计

❌ **不适合**（请改用其他生图技能）：
- 照片级写实图像（人像、风景、产品实拍）
- 复杂纹理（毛皮、水面、烟雾、光线）
- 艺术插画（油画、水彩、素描风格）
- 人物肖像、卡通形象

## 技术栈

| 组件 | 角色 | 说明 |
|------|------|------|
| SVG | 设计描述 | 用矢量代码描述图形布局 |
| ImageMagick | 渲染引擎 | SVG → PNG/JPEG/...，跨平台可用 |
| 系统字体 | 文字渲染 | 优先 Cascadia Code，自动 fallback |
| AI Agent（当前模型） | 创意 + 验证 | 写代码、验证输出、迭代修复 |

**核心理念**：让 AI 写代码而不是生成图像，所有视觉元素都可精确控制、可复现、可协作。

## 四个核心工具

本技能提供 4 个命令行工具（位于 `scripts/dist/`），Agent 在任务中按需调用：

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

## 标准工作流（5 个 Phase）

### Phase 1: 环境确认（首次使用必做）

```bash
node <skill-dir>/scripts/dist/info.mjs
```

- 如果 ImageMagick 未安装：告知用户安装指引（见 FAQ）
- 记录首选字体（`preferredFont.usedName`），后续 SVG 中使用

### Phase 2: 需求收集（关键）

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
- 字体处理参考 `references/font-handling.md`
- 必须使用 `font-family` 链式 fallback（不要单字体名）

```xml
<!-- 示例：字体链式 fallback -->
<text font-family='"Cascadia Code", "Fira Code", "JetBrains Mono",
                  "Microsoft YaHei", "PingFang SC", system-ui, sans-serif'>
  中文 + English
</text>
```

**写入 SVG 文件**（推荐命名 `design-v1.svg`），然后用 `render.mjs` 渲染。

### Phase 4: 渲染与验证闭环（关键！）

```bash
# 渲染
node <skill-dir>/scripts/dist/render.mjs design-v1.svg -o design-v1.png
```

**AI 识图自检**（Phase 4 核心）：

让当前模型调用自身的识图能力查看输出的 PNG，**必须逐个检查**：

```markdown
## 自检清单（必须逐项确认）

[ ] 1. **文字渲染**：是否有乱码 / 豆腐块 / 空白字？
[ ] 2. **元素对齐**：标题是否居中？元素间距是否合理？
[ ] 3. **覆盖检测**：是否有任何文字被图片/元素遮挡？
[ ] 4. **边界检测**：是否有任何元素超出 SVG 画布？
[ ] 5. **颜色和谐**：背景与文字对比是否清晰？
[ ] 6. **字体美观**：文字是否清晰可读？
```

**发现问题时的处理**：
- 如果某项未通过，**一次只修一个问题**（参考单次迭代规则）
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

**好处**：
- 容易定位问题（如果改坏了知道是哪一步）
- 用户容易反馈（"上一步很好，但新改的部分不好"）
- 减少意外破坏

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

## 字体智能 Fallback

本技能内置字体 fallback 策略，保证用户**无需手动安装 Cascadia**也能渲染。

**Fallback 顺序**（按优先级）：

| 类型 | 候选字体 |
|------|---------|
| 代码/西文 | Cascadia Code → Fira Code → JetBrains Mono → Source Code Pro → Consolas → Courier New |
| 中文 | 微软雅黑 → PingFang SC → Noto Sans CJK SC → WenQuanYi |
| 无衬线西文 | Inter → Roboto → SF Pro → Segoe UI → Arial |
| 衬线西文 | Charter → Georgia → Cambria → Times New Roman |

**实现细节**：参考 `references/font-handling.md`

## 何时不使用此技能

以下情况**应该告诉用户**不适合，并建议其他方案：

| 用户需求 | imagegen-magick 是否合适 | 建议替代方案 |
|---------|-------------------------|-------------|
| "帮我画一张卡通插画" | ❌ | 使用图像生成 API（gpt-image / Wanx 等） |
| "生成一张产品实拍图" | ❌ | 使用图像生成 API |
| "做一张科技感封面图" | ✅ | 可以，用代码渲染几何图案 |
| "做微信公号文章封面" | ✅ | 非常适合 |
| "画一个可爱猫咪" | ❌ | 需要生成模型 |
| "给 README 做徽章" | ✅ | SVG badge + ImageMagick 完美适配 |

## 错误诊断

如果任务执行异常，先运行 info 工具：

```bash
node <skill-dir>/scripts/dist/info.mjs
```

常见错误与解决方案：

| 错误现象 | 可能原因 | 解决 |
|---------|---------|------|
| "magick 未找到" | ImageMagick 未安装 | 参见 FAQ |
| "未检测到任何字体" | IM 与 fc-list 都失败 | 检查 IM 安装；安装 fontconfig |
| "中文字符显示为方块" | 无中文字体 | `check-fonts --recommend cjk` 查看可用字体 |
| "渲染后文字模糊" | density/scale 不够 | 使用 `--scale 3x` 提高分辨率 |
| "输出文件覆盖" | 未传 --force | 默认已保护（自动 -1 -2 命名），可用 --force 强制覆盖 |

## 参考文档（按需加载）

以下文档按需阅读，不必一次性全部加载：

- [`references/color-palettes.md`](./references/color-palettes.md) — 配色配方库
- [`references/typography.md`](./references/typography.md) — 字体/排版配方
- [`references/layouts.md`](./references/layouts.md) — 布局模式配方
- [`references/decorations.md`](./references/decorations.md) — 装饰元素库
- [`references/imagemagick-commands.md`](./references/imagemagick-commands.md) — IM 命令参考
- [`references/font-handling.md`](./references/font-handling.md) — 字体处理与 Fallback 指南

## 示例（按需阅读）

- [`examples/wechat-article-cover.md`](./examples/wechat-article-cover.md) — 微信公众号封面完整生成示例

## 常见问题（FAQ）

### Q: 怎么安装 ImageMagick？

**Windows（推荐用 mise）**：
```bash
# 用 mise 安装
mise install github:ImageMagick/ImageMagick

# 或 winget
winget install ImageMagick.ImageMagick
```

**macOS**：
```bash
brew install imagemagick
```

**Linux (Ubuntu/Debian)**：
```bash
sudo apt install imagemagick
```

### Q: 中文渲染乱码，怎么办？

1. 先确认系统中文字体可用：
   ```bash
   node <skill-dir>/scripts/dist/check-fonts.mjs --recommend cjk
   ```
2. 如无中文字体，安装微软雅黑（Windows 自带）/ PingFang SC（macOS 自带）/ Noto Sans CJK（Linux）
3. SVG 中使用字体链式 fallback（不要单字体名）：
   ```xml
   <text font-family='"Cascadia Code", "Microsoft YaHei", system-ui'>
   ```

### Q: 渲染 PNG 太大（几 MB），怎么优化？

- 降低 `--quality 80`（默认 95）
- 减小 `--scale 1x`（默认 2x）
- 用 ImageMagick 后处理压缩（详见 `references/imagemagick-commands.md`）

### Q: 我可以让 AI 直接生图，为什么还要走程序化路线？

| 路线 | 适用场景 |
|------|---------|
| **图像生成 API**（gpt-image、Wanx、SDXL） | 照片、艺术插画、复杂纹理 |
| **程序化生成（本技能）** | 设计类、文字排版、UI 组件、Logo |

**程序化的优势**：
- 文字精确（不会乱码）
- 完全可控制（像素级）
- 可复现（同一 SVG 永远输出一致）
- 可协作（SVG 是代码，可以 diff/review）
- 零成本（无需 API 费用）

## 致谢

本技能设计参考：
- [OpenAI imagegen skill](https://github.com/openai/skills/tree/main/skills/.system/imagegen) — 工作流设计
- [Agent Skills 开放标准](https://agentskills.io/) — 规范遵循
- [Anthropic skills](https://github.com/anthropics/skills) — 社区最佳实践
