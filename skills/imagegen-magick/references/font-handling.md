# 字体处理与 Fallback 指南

> 字体问题 90% 来自"直接用了单字体名"。本文件说明如何让字体在所有用户机器上都能渲染成功。

## 🎯 核心原则：永远用字体链

### ❌ 错误：单字体名

```xml
<!-- 如果用户没装 Cascadia Code，整个文字会 fallback 到浏览器默认字体，可能乱码 -->
<text font-family="Cascadia Code">AI CLI</text>
```

### ✅ 正确：字体链

```xml
<!-- 优先尝试 Cascadia Code，找不到依次尝试 Fira Code、微软雅黑、系统默认 -->
<text font-family='"Cascadia Code", "Fira Code", "Microsoft YaHei", sans-serif'>
  AI CLI
</text>
```

## 🔗 内置字体链

`font-fallback.ts` 提供了 `buildFontFamilyChain()` 函数，直接生成合适的字体链：

```javascript
import { buildFontFamilyChain, formatFontFamily } from '../lib/font-fallback.js'

// 用户指定了 Cascadia Code
const chain = buildFontFamilyChain('Cascadia Code')

const svg = `<text font-family="${formatFontFamily(chain)}">
  中文 + English
</text>`
```

生成的 `font-family` 字符串类似：
```
"Cascadia Code", "Fira Code", "JetBrains Mono", ..., "Microsoft YaHei", ..., system-ui, sans-serif
```

## 🔄 Fallback 策略

### 1. 默认代码字体候选（按优先级）

| 优先级 | 字体 | 来源 |
|-------|------|------|
| 1 | Cascadia Code / Mono / Next | VSCode 默认 / Nerd Font |
| 2 | Fira Code | 流行开发者字体 |
| 3 | JetBrains Mono | IDEA 默认 |
| 4 | Hack | 开源经典 |
| 5 | Source Code Pro | Adobe 出品 |
| 6 | IBM Plex Mono | IBM 出品 |
| 7 | Consolas | Windows 自带 |
| 8 | DejaVu Sans Mono | Linux 通用 |
| 9 | Courier New | 兜底等宽 |

### 2. 中文字体候选（按平台）

**Windows**：
1. Microsoft YaHei（微软雅黑，自带）
2. Microsoft YaHei UI
3. DengXian（等线）
4. SimHei（黑体）
5. SimSun（宋体）

**macOS**：
1. PingFang SC（苹方，自带）
2. STHeiti（华文黑体）
3. Hiragino Sans GB

**Linux**：
1. Noto Sans CJK SC
2. Noto Sans CJK
3. WenQuanYi Micro Hei
4. WenQuanYi Zen Hei

**通用（开源）**：
1. Source Han Sans CN
2. Source Han Sans SC

### 3. 西文无衬线字体候选

| 优先级 | 字体 | 平台 |
|-------|------|------|
| 1 | Inter | 现代网页字体 |
| 2 | Roboto | Android 默认 |
| 3 | SF Pro Display | macOS 系统字体 |
| 4 | Segoe UI | Windows 系统字体 |
| 5 | Open Sans | Google 出品 |
| 6 | Arial | 通用 |
| 7 | Helvetica | macOS/Linux 常见 |

## 🛠️ 诊断字体问题

### Step 1: 检查 ImageMagick 识别的字体

```bash
node <skill-dir>/scripts/dist/check-fonts.mjs --filter "Cascadia"
```

### Step 2: 列出中文字体

```bash
node <skill-dir>/scripts/dist/check-fonts.mjs --recommend cjk
```

### Step 3: 列出所有系统字体

```bash
node <skill-dir>/scripts/dist/check-fonts.mjs
```

### Step 4: 检查首选字体可用性

```bash
node <skill-dir>/scripts/dist/info.mjs --preferred "Cascadia Code"
```

## 🎨 中英文混排技巧

### ❌ 错误：字体链只包含英文字体

```xml
<text font-family="'Cascadia Code', monospace">
  Hello 你好
</text>
<!-- "你好"会 fallback 到浏览器默认中文字体，可能与英文字体风格完全不匹配 -->
```

### ✅ 正确：字体链同时包含中英文字体

```xml
<text font-family="'Cascadia Code', 'Microsoft YaHei', sans-serif">
  Hello 你好
</text>
<!-- 英文字符用 Cascadia Code，中文字符自动 fallback 到微软雅黑 -->
```

> **原理**：SVG 渲染器对每个字符独立选择字体。`font-family` 列表中第一个**包含该字符字形**的字体被使用。所以中文字符自动会用中文字体。

### 字号配合建议

中英文同时出现时，建议：
- 中文字号略小于英文（视觉上更协调）
- 或统一字号（现代设计趋势）

```xml
<text font-size="48">
  AI <tspan font-size="40">中文</tspan> CLI
</text>
```

## 🎯 字体渲染验证

渲染后用 AI Agent 的识图能力自检：

```markdown
## 字体渲染自检清单

[ ] 文字是否清晰可读？
[ ] 中文字符是否有乱码 / 豆腐块？
[ ] 英文字母是否使用等宽字体？
[ ] 字体层级（主标题 vs 副标题）是否明显？
[ ] 字号是否在所有距离下都舒适阅读？
[ ] 中英文混排是否协调？
```

## 💡 最佳实践

### 1. 首选字体放最前

```xml
<text font-family="'用户指定字体', '系统候选1', '系统候选2', ...">
```

### 2. 通用字体关键字放最后

```xml
<text font-family='"Cascadia Code", "Fira Code", ..., monospace'>
```

`monospace` / `sans-serif` / `serif` 是浏览器/渲染器内置的通用关键字，作为最后兜底。

### 3. 字体名有空格必须加引号

```xml
<!-- ✗ 错误：空格会断字体名 -->
<text font-family="Cascadia Code">

<!-- ✓ 正确：引号包裹 -->
<text font-family="'Cascadia Code'">
<text font-family='"Cascadia Code"'>
```

### 4. 不要用不存在的字体名

```xml
<!-- ✗ 错误：拼写错误导致 fallback -->
<text font-family="'CascadiaCod'">

<!-- ✓ 正确：完整字体名 -->
<text font-family="'Cascadia Code'">
```

### 5. 用检测工具验证

每次用新字体前，先用 `check-fonts.mjs --filter "字体名"` 验证是否可用。

## ❓ 常见问题

### Q: 渲染后所有文字都用了默认字体，指定的字体没生效？

A: 常见原因：
1. 字体名拼写错误（用 `check-fonts.mjs` 查看实际字体名）
2. 字体未安装（参考 FAQ 安装字体）
3. SVG 中字体名没加引号且含有空格

### Q: ImageMagick 渲染 SVG 时提示 "unable to open image"?

A: SVG 引用了外部文件（如字体文件），ImageMagick 找不到路径。建议：
- 字体用 font-family 名称而非 file:// URL
- 字体必须安装到系统中

### Q: 为什么字体 fallback 链这么长？

A: 不同用户系统字体差异大。长链能保证几乎所有用户都能正确渲染。
SVG 渲染器会在找到第一个包含字形的字体后立即停止，不会真的加载全部。

### Q: 字体链会影响渲染性能吗？

A: 不会明显影响。渲染器只在渲染时检查每个字符是否在当前字体中，不匹配时尝试下一个，整个过程是内存操作，不涉及 IO。

## 📚 参考

- SVG font-family 规范：https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/font-family
- CSS 字体 fallback：https://developer.mozilla.org/en-US/docs/Web/CSS/font-family
- ImageMagick 字体支持：https://imagemagick.org/script/type.php
