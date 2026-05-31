# 配色配方库

> 配色是情绪的表达。本文件收录经过验证的配色方案，供 SVG 背景/文字使用。

## 🎨 渐变配色（Gradient）

### 粉彩渐变 - 温柔女性化

```xml
<defs>
  <linearGradient id="pastel-pink" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" style="stop-color:#FFE5D9"/>
    <stop offset="100%" style="stop-color:#FFCAD4"/>
  </linearGradient>
</defs>
<rect width="100%" height="100%" fill="url(#pastel-pink)"/>
```

**适合场景**：母亲节、美妆、甜点、婚礼

### 现代科技渐变 - 简约专业

```xml
<linearGradient id="modern-tech" x1="0%" y1="0%" x2="100%" y2="0%">
  <stop offset="0%" style="stop-color:#667EEA"/>
  <stop offset="50%" style="stop-color:#764BA2"/>
  <stop offset="100%" style="stop-color:#F093FB"/>
</linearGradient>
```

**适合场景**：技术博客、SaaS 产品、AI/科技主题

### 日落渐变 - 活力温暖

```xml
<linearGradient id="sunset" x1="0%" y1="100%" x2="100%" y2="0%">
  <stop offset="0%" style="stop-color:#FF512F"/>
  <stop offset="100%" style="stop-color:#DD2476"/>
</linearGradient>
```

**适合场景**：旅行、户外、生活方式、活力品牌

### 森林渐变 - 自然沉稳

```xml
<linearGradient id="forest" x1="0%" y1="0%" x2="0%" y2="100%">
  <stop offset="0%" style="stop-color:#134E5E"/>
  <stop offset="100%" style="stop-color:#71B280"/>
</linearGradient>
```

**适合场景**：环保、健康、自然主题

### 深色技术风 - 暗色主题

```xml
<radialGradient id="dark-tech" cx="50%" cy="50%" r="80%">
  <stop offset="0%" style="stop-color:#2C3E50"/>
  <stop offset="100%" style="stop-color:#1A1F2E"/>
</radialGradient>
```

**适合场景**：开发者工具、代码展示、夜间模式、赛博朋克

### 海洋渐变 - 清爽专业

```xml
<linearGradient id="ocean" x1="0%" y1="0%" x2="100%" y2="100%">
  <stop offset="0%" style="stop-color:#2980B9"/>
  <stop offset="100%" style="stop-color:#6DD5FA"/>
</linearGradient>
```

**适合场景**：企业宣传、商务、科技蓝

## 🎨 纯色配色（Solid）

### 单色柔和色板

| 色值 | 名称 | 适合作为 |
|------|------|---------|
| `#F5F5DC` | 米白 | 主背景 |
| `#FFF8DC` | 奶白 | 卡片背景 |
| `#2B2D42` | 深海蓝 | 主标题文字 |
| `#8D99AE` | 雾灰 | 副标题文字 |
| `#EF233C` | 珊瑚红 | 强调色/按钮 |
| `#EDF2F4` | 浅银 | 分隔线/边框 |

### 技术博客色板

| 色值 | 用途 |
|------|------|
| `#1E1E2E` | 代码块背景 |
| `#A6E3A1` | 代码中字符串 |
| `#89B4FA` | 代码中函数 |
| `#F9E2AF` | 代码中关键字 |
| `#CDD6F4` | 代码中文本 |
| `#F38BA8` | 错误/警告 |

### 中文字体友好色板（避免在白色背景上纯白文字）

| 文本颜色 | 适合背景 |
|---------|---------|
| `#2B2D42` | `#F5F5DC`, `#FFF`, `#EDF2F4` |
| `#4A4E69` | `#F0F0F0`, `#EAEAEA` |
| `#8D99AE` | 白色背景（作为次要文字） |
| `#22223B` | 浅色背景（强调文字） |

## ⚠️ 配色陷阱（必须避免）

### ❌ 不要：红色文字 + 绿色背景

红绿色盲用户（约 8% 男性）完全无法识别这种对比。

### ❌ 不要：低对比度组合

```
浅灰 (#AAA) 文字 + 白色背景     ❌ 对比度不足
浅黄文字 + 白色背景             ❌ 几乎看不清
```

**最低对比度要求**：
- 普通文字：4.5:1（WCAG AA）
- 大文字（>= 18px bold）：3:1

### ❌ 不要：纯黑色 (#000) 文字 + 纯白色 (#FFF) 背景

虽然对比度最高，但会刺眼。建议：
- 主文字：`#2B2D42` 或 `#333`
- 背景：`#F5F5DC` 或 `#FEFEFE`

## 🎨 配色工具推荐

生成自定义配色时，可用以下在线工具：
- Coolors: https://coolors.co/
- Adobe Color: https://color.adobe.com/
- Paletton: https://paletton.com/

## 配色最佳实践

```xml
<!-- ✓ 推荐：分层色彩（背景 → 次级 → 主级 → 强调） -->
<rect fill="#F5F5DC"/>                  <!-- 背景 -->
<text fill="#8D99AE">副标题</text>     <!-- 次级 -->
<text fill="#2B2D42">主标题</text>     <!-- 主级 -->
<rect fill="#EF233C" class="badge"/>   <!-- 强调 -->
```

```xml
<!-- ✓ 推荐：单色系多色阶（深浅变化） -->
主色: #667EEA
浅1 (90%): #E4E7FC
浅2 (75%): #C2C8F8
深1 (-30%): #4758A3
深2 (-50%): #2C3A6E
```
