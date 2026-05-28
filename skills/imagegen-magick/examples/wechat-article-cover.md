# 示例：微信公众号文章封面

> 完整演示：如何从需求到交付一张公众号封面图。

## 📋 用户需求

- **尺寸**：900×383 px（微信公众号首图 2.35:1 比例）
- **内容**：博客标题 "AI Agentic CLI —— 给 AI 装上靠谱的手脚"
- **风格**：简约技术风，浅色背景
- **字体**：优先 Cascadia Code，找不到时 fallback
- **文件**：需要高清 PNG（用于发布）+ SVG 源文件（便于后期修改）

## 🎬 完整工作流程

### Phase 1: 环境确认

```bash
# 首次使用前必查
node ~/.agents/skills/imagegen-magick/scripts/dist/info.mjs
```

**示例输出**：
```
=== imagegen-magick 环境信息 ===

🖥️  Node.js:
   版本: v24.16.0
   平台: win32 x64

🎨 ImageMagick:
   状态: ✓ 已安装
   版本: 7.1.2-24
   命令: magick

🔤 系统字体:
   总数: 124 个
   中文字体: 3 个
   (示例: Microsoft YaHei, SimSun, DengXian)

🔍 首选字体 ("Cascadia Code"):
   状态: ⚠ 降级
   请求: Cascadia Code
   实际: Microsoft YaHei

✓ 环境就绪，可以正常使用 imagegen-magick
```

环境就绪，首选字体降级但可用，准备开始。

### Phase 2: 收集参数

使用 `scaffold.mjs --no-interactive` 模式（适合 AI 直接调用）：

```bash
node ~/.agents/skills/imagegen-magick/scripts/dist/scaffold.mjs \
  --preset wechat-cover \
  --title "AI Agentic CLI" \
  --subtitle "给 AI 装上靠谱的手脚" \
  --bg gradient \
  --bg-gradient "#FFE5D9,#FFCAD4" \
  --output wechat-cover-v1.svg \
  --no-interactive
```

**输出**：
```
✓ SVG 骨架已生成
   路径: /d/blog/2026/wechat-cover-v1.svg
   尺寸: 900×383
   字节: 1,532

下一步:
   node render.mjs "/d/blog/2026/wechat-cover-v1.svg" -o "/d/blog/2026/wechat-cover-v1.png"
```

### Phase 3: 渲染初版

```bash
node ~/.agents/skills/imagegen-magick/scripts/dist/render.mjs \
  /d/blog/2026/wechat-cover-v1.svg \
  -o /d/blog/2026/wechat-cover-v1.png
```

**输出**：
```
ℹ 开始渲染:
   输入: /d/blog/2026/wechat-cover-v1.svg
   输出: /d/blog/2026/wechat-cover-v1.png
   缩放: 2x (DPI: 192)
   背景: transparent

✓ 渲染完成: /d/blog/2026/wechat-cover-v1.png
```

### Phase 4: AI 识图自检

调用当前 AI Agent 的识图能力（如 Qwen VL / mimo 等），让它读取 PNG 路径并逐个检查：

```markdown
请检查这张生成的图片 [wechat-cover-v1.png]，并按以下清单逐项确认：

[ ] 1. 文字渲染：是否有乱码 / 豆腐块 / 空白字？
[ ] 2. 元素对齐：标题是否居中？元素间距是否合理？
[ ] 3. 覆盖检测：是否有任何文字被图片/元素遮挡？
[ ] 4. 边界检测：是否有任何元素超出 SVG 画布？
[ ] 5. 颜色和谐：背景与文字对比是否清晰？
[ ] 6. 字体美观：文字是否清晰可读？

如果有问题，请只反馈最关键的一个问题，我将一次只修一处。
```

**AI 反馈示例**：

> ✓ 文字渲染：无乱码
> ⚠ 元素对齐：副标题与主标题间距过近（约 8px），建议增加到 20-30px
> ✓ 覆盖检测：无遮挡
> ✓ 边界检测：全部在画布内
> ⚠ 颜色和谐：副标题 (#8D99AE) 与背景 (#FFE5D9 偏粉) 对比度略低
> ✓ 字体美观：清晰可读
>
> **最关键问题**：副标题与主标题间距过近。

### Phase 4 迭代 (第 1 轮修复)

**修复**：调整副标题 Y 坐标
- 之前：`y="60%"`
- 之后：`y="68%"`

```bash
# 重新渲染
node ~/.agents/skills/imagegen-magick/scripts/dist/render.mjs \
  /d/blog/2026/wechat-cover-v1.svg \
  -o /d/blog/2026/wechat-cover-v2.png
```

> **注意**：使用 `v2` 命名避免覆盖 v1，方便对比。

**再次自检**：

> ✓ 文字渲染：无
> ✓ 元素对齐：明显改善 ✓
> ✓ 覆盖检测：无
> ✓ 边界检测：OK
> ⚠ 颜色和谐：副标题颜色可加深，建议 #4A4E69 而不是 #8D99AE
> ✓ 字体美观：OK
>
> **最关键问题**：副标题颜色加深。

### Phase 4 迭代 (第 2 轮修复)

**修复**：副标题 `fill="#4A4E69"`

```bash
node ~/.agents/skills/imagegen-magick/scripts/dist/render.mjs \
  /d/blog/2026/wechat-cover-v1.svg \
  -o /d/blog/2026/wechat-cover-v3.png
```

**最终自检**：全部通过 ✅

### Phase 5: 交付

```markdown
✓ 图像已生成
   - 文件路径: /d/blog/2026/wechat-cover-v3.png
   - 尺寸: 900×383 px (实际像素 1800×766，因 scale 2x)
   - 文件大小: 42KB
   - 迭代次数: 3 轮

[下一步]
- SVG 源文件保留：wechat-cover-v1.svg（可继续修改）
- 如需微调：请描述具体位置和问题
- 如需导出 JPEG：可执行
  `magick wechat-cover-v3.png -quality 85 wechat-cover-v3.jpg`
- 如需其他尺寸（抖音/小红书）：复用 SVG 重新渲染
  `node render.mjs wechat-cover-v1.svg -o douyin-cover.png --size 1080x1920`
```

## 📝 关键设计技巧

### 1. 字体链式 Fallback

```xml
<text font-family='"Cascadia Code", "Fira Code", "JetBrains Mono",
                  "Microsoft YaHei", "PingFang SC", system-ui'>
  AI Agentic CLI
</text>
```

确保中英文字符都能正确渲染。

### 2. 渐变背景提升氛围

```xml
<defs>
  <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" style="stop-color:#FFE5D9"/>
    <stop offset="100%" style="stop-color:#FFCAD4"/>
  </linearGradient>
</defs>
<rect width="100%" height="100%" fill="url(#bg)"/>
```

### 3. 文字层级分明

```xml
<!-- 主标题：60px，粗体，深色 -->
<text font-size="60" font-weight="700" fill="#2B2D42">
  AI Agentic CLI
</text>

<!-- 副标题：32px，常规，中灰 -->
<text font-size="32" font-weight="400" fill="#4A4E69">
  给 AI 装上手脚
</text>
```

### 4. 标题用 % 坐标（响应式）

```xml
<text x="50%" y="40%" text-anchor="middle" dominant-baseline="middle">
  任意尺寸都能居中
</text>
```

### 5. 2x 渲染（高清）

```bash
render.mjs input.svg -o output.png --scale 2x
```

输出实际像素 900×2=1800 px 宽，确保在高分辨率屏幕上不模糊。

## 🎨 完整 SVG 源码（参考）

```xml
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 900 383" width="900" height="383">

  <!-- 渐变背景 -->
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FFE5D9"/>
      <stop offset="100%" style="stop-color:#FFCAD4"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>

  <!-- 圆点装饰（增加细节） -->
  <defs>
    <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
      <circle cx="3" cy="3" r="2" fill="#FFF" opacity="0.3"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#dots)"/>

  <!-- 主标题 -->
  <text x="50%" y="40%"
        text-anchor="middle"
        dominant-baseline="middle"
        font-family='"Cascadia Code", "Fira Code", "JetBrains Mono",
                     "Microsoft YaHei", "PingFang SC", system-ui'
        font-size="60"
        font-weight="700"
        fill="#2B2D42">
    AI Agentic CLI
  </text>

  <!-- 副标题 -->
  <text x="50%" y="68%"
        text-anchor="middle"
        dominant-baseline="middle"
        font-family='"Cascadia Code", "Fira Code",
                     "Microsoft YaHei", "PingFang SC", system-ui'
        font-size="32"
        font-weight="400"
        fill="#4A4E69">
    给 AI 装上手脚
  </text>

  <!-- 底部 Logo / 作者 -->
  <text x="50%" y="92%"
        text-anchor="middle"
        font-family='"Cascadia Code", monospace'
        font-size="16"
        fill="#8D99AE">
    by uid13
  </text>
</svg>
```

## 🎯 关键经验总结

1. **环境检查必做**：第一行命令一定是 `info.mjs`
2. **字体必须用链**：永远不要写单字体名
3. **AI 自检是闭环的关键**：每次渲染后都让 AI 看一眼
4. **单次迭代只改一处**：避免破坏已好的部分
5. **用版本化文件名**：v1 / v2 / v3 方便对比和回滚
6. **2x 渲染保证清晰**：现代设备都是高分屏
7. **保留 SVG 源文件**：便于后续修改和多尺寸复用

## 🔄 复用同一 SVG 多尺寸

```bash
# 微信首图
render.mjs cover.svg -o wechat-cover.png --scale 2x

# 抖音（重新渲染时裁切）
magick cover.png -gravity center -crop 1080x1920+0+0 +repage douyin-cover.png

# 小红书
magick cover.png -gravity center -crop 1080x1440+0+0 +repage xhs-cover.png
```

或者为每种比例重写 SVG 的 viewBox。
