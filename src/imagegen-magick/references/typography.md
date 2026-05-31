# 字体 / 排版配方

> 字体是阅读体验的灵魂。本文件收录字体组合和排版规范。

## 🎯 字体链式 Fallback 模板

> **核心原则**：永远不要直接写单字体名，必须用逗号分隔的字体链。

### 代码 / CLI 风格文字

```xml
<text font-family='"Cascadia Code",
                  "Fira Code",
                  "JetBrains Mono",
                  "Source Code Pro",
                  "IBM Plex Mono",
                  "Consolas",
                  "DejaVu Sans Mono",
                  "Courier New",
                  monospace'>
```

**适合场景**：
- 命令行演示图
- 代码片段展示
- Terminal 风格的封面
- README 中嵌入代码

### 中文技术文档文字

```xml
<text font-family='"Cascadia Code",
                  "Microsoft YaHei",
                  "PingFang SC",
                  "Noto Sans CJK SC",
                  "Source Han Sans CN",
                  "WenQuanYi Micro Hei",
                  sans-serif'>
```

### 西文无衬线（通用 UI）

```xml
<text font-family='"Inter",
                  "Roboto",
                  "SF Pro Display",
                  "Segoe UI",
                  "Open Sans",
                  "Arial",
                  "Helvetica",
                  sans-serif'>
```

### 西文衬线（长文阅读）

```xml
<text font-family='"Charter",
                  "Source Serif Pro",
                  "Georgia",
                  "Cambria",
                  "Times New Roman",
                  serif'>
```

## 📏 字号规范

| 元素 | 推荐字号 | 说明 |
|------|---------|------|
| **主标题** | 宽度 / 15 ~ 72 px | 例如 900px 宽 → 48-72 px |
| **副标题** | 主标题字号 × 0.55 | 视觉层级分明 |
| **正文** | 16-20 px | 移动端友好 |
| **小字** | 12-14 px | 注释类文字 |

### 字号计算公式

```javascript
// 给定画布宽度，计算主标题字号
const titleSize = Math.max(24, Math.min(canvasWidth / 15, 72))

// 副标题字号
const subtitleSize = Math.max(18, titleSize * 0.55)
```

## 🎯 字号示例

### 微信公众号首图 (900×383)

```xml
<text font-size="60">AI Agentic CLI</text>
<text font-size="32">给 AI 装上手脚</text>
```

### YouTube 缩略图 (1280×720)

```xml
<text font-size="72">主标题文字</text>
<text font-size="40">副标题文字</text>
```

### 小红书图文 (1080×1440)

```xml
<text font-size="80">大标题</text>
<text font-size="44">描述文字</text>
<text font-size="28">补充信息</text>
```

## 🔤 字体粗细（font-weight）

| 值 | 名字 | 适合 |
|----|------|------|
| `300` | light | 大段说明文字 |
| `400` | normal | 正文、副标题 |
| `500` | medium | 强调、按钮 |
| `600` | semibold | 副标题、标题 |
| `700` | bold | 主标题 |
| `800` | extrabold | 超大标题 |
| `900` | black | 极粗标题 |

**常见组合**：
```xml
<!-- 主标题粗 + 副标题常规 -->
<text font-weight="700">主标题</text>
<text font-weight="400">副标题文字较长需要细一些</text>
```

## 📐 字间距（letter-spacing）

```xml
<!-- 主标题适度加宽（增强气势） -->
<text letter-spacing="2">大标题</text>

<!-- 英文大写字母建议间距更宽 -->
<text letter-spacing="4" text-transform="uppercase">BIG TITLE</text>

<!-- 正文不加间距（影响阅读） -->
<text>正文不加 letter-spacing</text>
```

## 🎨 文字装饰

### 阴影（drop-shadow）

```xml
<defs>
  <filter id="text-shadow">
    <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.3"/>
  </filter>
</defs>
<text filter="url(#text-shadow)">带阴影的文字</text>
```

### 描边（stroke）

```xml
<text stroke="#2B2D42" stroke-width="2" fill="#FFF">
  空心描边文字
</text>
```

### 渐变文字

```xml
<defs>
  <linearGradient id="text-grad" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" style="stop-color:#667EEA"/>
    <stop offset="100%" style="stop-color:#764BA2"/>
  </linearGradient>
</defs>
<text fill="url(#text-grad)">渐变字</text>
```

## ⚠️ 文字渲染陷阱

### ❌ 不要用像素以下字号 < 12px

ImageMagick 渲染时小号字体会模糊。最小字号建议 12px。

### ❌ 不要让文字贴边

```xml
<!-- 推荐：保留 5%-10% 的侧边距 -->
<text x="8%" y="50%">左对齐文字</text>

<!-- 不推荐：贴边 -->
<text x="0" y="50%">贴边文字</text>
```

### ❌ 长文本不要单行

超过 20 个汉字，考虑换行：

```xml
<text>
  <tspan x="50%" dy="0">第一行文字比较长需要</tspan>
  <tspan x="50%" dy="1.5em">换行显示</tspan>
</text>
```

### ❌ 不要用纯黑 (#000) 文字

刺眼。推荐 `#2B2D42` 或 `#333333`。

## 📊 字体对比效果测试方法

渲染后用 AI Agent 的识图能力检查：
- 文字是否清晰可读？
- 字号层级是否明显？
- 是否有乱码？
- 中英文混排是否协调？
