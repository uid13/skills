# 装饰元素库

> 小装饰 = 大氛围。本文件收录常用的 SVG 装饰元素，可直接复制使用。

## 🔵 几何图形装饰

### 1. 圆点阵列（背景点缀）

```xml
<defs>
  <!-- 重复圆点图案 -->
  <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
    <circle cx="3" cy="3" r="2" fill="#EDF2F4" opacity="0.5"/>
  </pattern>
</defs>
<rect width="100%" height="100%" fill="url(#dots)"/>
```

**适合**：背景点缀、增加细节

### 2. 网格线（科技感）

```xml
<defs>
  <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
    <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#EDF2F4" stroke-width="1"/>
  </pattern>
</defs>
<rect width="100%" height="100%" fill="url(#grid)"/>
```

### 3. 同心圆（视觉焦点）

```xml
<g opacity="0.2">
  <circle cx="50%" cy="50%" r="30" fill="none" stroke="#FFF" stroke-width="2"/>
  <circle cx="50%" cy="50%" r="60" fill="none" stroke="#FFF" stroke-width="1.5"/>
  <circle cx="50%" cy="50%" r="90" fill="none" stroke="#FFF" stroke-width="1"/>
  <circle cx="50%" cy="50%" r="120" fill="none" stroke="#FFF" stroke-width="0.5"/>
</g>
```

### 4. 对角分割线

```xml
<!-- 从左下到右上 -->
<line x1="0" y1="100%" x2="100%" y2="0"
      stroke="#EDF2F4" stroke-width="2" opacity="0.5"/>

<!-- 双对角线 -->
<line x1="0" y1="100%" x2="100%" y2="0" stroke="#EDF2F4" stroke-width="1.5"/>
<line x1="-10%" y1="100%" x2="90%" y2="0" stroke="#EDF2F4" stroke-width="0.8"/>
```

## ✨ 徽章 / 角标

### 1. 顶部 "NEW" 角标

```xml
<g transform="translate(850, 30)">
  <rect x="0" y="0" width="80" height="28" rx="6"
        fill="#EF233C"/>
  <text x="40" y="19" text-anchor="middle" fill="#FFF"
        font-size="14" font-weight="700">NEW</text>
</g>
```

### 2. 顶部 "HOT" 角标

```xml
<g transform="translate(850, 30)">
  <rect x="0" y="0" width="80" height="28" rx="6"
        fill="#FF9F1C"/>
  <text x="40" y="19" text-anchor="middle" fill="#FFF"
        font-size="14" font-weight="700">🔥 HOT</text>
</g>
```

### 3. 序号徽章（圆形）

```xml
<g transform="translate(50, 50)">
  <circle cx="0" cy="0" r="20" fill="#2B2D42"/>
  <text x="0" y="6" text-anchor="middle" fill="#FFF"
        font-size="20" font-weight="700">1</text>
</g>
```

### 4. "v2.0" 版本徽章

```xml
<g transform="translate(20, 30)">
  <rect x="0" y="0" width="50" height="24" rx="12"
        fill="#667EEA"/>
  <text x="25" y="16" text-anchor="middle" fill="#FFF"
        font-size="12" font-weight="600">v2.0</text>
</g>
```

## 📐 分隔线

### 1. 实线分隔

```xml
<line x1="20%" y1="50%" x2="80%" y2="50%"
      stroke="#EDF2F4" stroke-width="2"/>
```

### 2. 虚线分隔

```xml
<line x1="20%" y1="50%" x2="80%" y2="50%"
      stroke="#EDF2F4" stroke-width="2"
      stroke-dasharray="8,4"/>
```

### 3. 点线分隔

```xml
<line x1="20%" y1="50%" x2="80%" y2="50%"
      stroke="#EDF2F4" stroke-width="3"
      stroke-linecap="round"
      stroke-dasharray="0.1, 8"/>
```

### 4. 波浪分隔

```xml
<path d="M 0,300 Q 150,280 300,300 T 600,300 T 900,300 L 900,383 L 0,383 Z"
      fill="#FFF"/>
```

## 🔷 形状

### 1. 圆角矩形卡片

```xml
<rect x="10%" y="15%" width="80%" height="70%"
      rx="16" fill="#FFF"
      filter="url(#card-shadow)"/>

<!-- 卡片阴影 -->
<defs>
  <filter id="card-shadow" x="-50%" y="-50%" width="200%" height="200%">
    <feDropShadow dx="0" dy="8" stdDeviation="10"
                  flood-color="#000" flood-opacity="0.1"/>
  </filter>
</defs>
```

### 2. 六边形（科技感）

```xml
<polygon points="50,10 90,30 90,70 50,90 10,70 10,30"
         fill="none" stroke="#667EEA" stroke-width="3"/>
```

### 3. 不规则多边形（抽象）

```xml
<polygon points="100,20 400,20 380,80 120,80"
         fill="#F5F5DC" opacity="0.5"/>
```

### 4. 斜切角（现代风）

```xml
<polygon points="0,0 900,0 880,50 0,50"
         fill="#2B2D42"/>
```

## 🌟 图标类装饰

### 1. 星形 ★

```xml
<path d="M 50,10 L 61,35 L 88,35 L 66,52 L 75,78 L 50,62 L 25,78 L 34,52 L 12,35 L 39,35 Z"
      fill="#FFD700"/>
```

### 2. 心形 ❤

```xml
<path d="M 50,30 Q 50,10 30,10 Q 10,10 10,30 Q 10,50 50,80 Q 90,50 90,30 Q 90,10 70,10 Q 50,10 50,30 Z"
      fill="#EF233C"/>
```

### 3. 对话气泡 💬

```xml
<path d="M 20,20 h 60 v 40 h -20 l -10,10 l -5,-10 h -25 z"
      fill="#FFF" stroke="#2B2D42" stroke-width="2"/>
```

### 4. 代码括号 `{ }`

```xml
<text font-size="120" fill="#667EEA" opacity="0.3"
      font-family="monospace">
  { }
</text>
```

## 🎨 滤镜效果

### 1. 模糊（毛玻璃）

```xml
<defs>
  <filter id="blur">
    <feGaussianBlur stdDeviation="5"/>
  </filter>
</defs>
<rect width="100%" height="100%" fill="#FFF" filter="url(#blur)" opacity="0.7"/>
```

### 2. 投影（立体感）

```xml
<defs>
  <filter id="shadow-xl">
    <feDropShadow dx="0" dy="12" stdDeviation="15"
                  flood-color="#000" flood-opacity="0.2"/>
  </filter>
</defs>
<rect width="80%" x="10%" y="10%"
      fill="#FFF" filter="url(#shadow-xl)"/>
```

### 3. 内阴影（凹陷效果）

```xml
<defs>
  <filter id="inset-shadow">
    <feOffset dx="0" dy="4"/>
    <feGaussianBlur stdDeviation="5" result="offset-blur"/>
    <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"/>
    <feFlood flood-color="black" flood-opacity="0.3" result="color"/>
    <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
    <feComposite operator="over" in="shadow" in2="SourceGraphic"/>
  </filter>
</defs>
```

## 💎 高级：SVG 动画（如果渲染为 GIF/WebP）

### 1. 呼吸光晕

```xml
<circle cx="50%" cy="50%" r="100" fill="#667EEA" opacity="0.3">
  <animate attributeName="r" values="100;120;100" dur="3s" repeatCount="indefinite"/>
  <animate attributeName="opacity" values="0.3;0.5;0.3" dur="3s" repeatCount="indefinite"/>
</circle>
```

### 2. 渐变色彩流动

```xml
<linearGradient id="flow-grad">
  <stop offset="0%" stop-color="#667EEA">
    <animate attributeName="stop-color"
             values="#667EEA;#764BA2;#667EEA" dur="5s" repeatCount="indefinite"/>
  </stop>
  <stop offset="100%" stop-color="#764BA2">
    <animate attributeName="stop-color"
             values="#764BA2;#F093FB;#764BA2" dur="5s" repeatCount="indefinite"/>
  </stop>
</linearGradient>
```

> ⚠️ 注意：ImageMagick 渲染时不会播放动画，仅导出第一帧。如需动画，考虑导出为 gif/apng（参考 imagemagick-commands.md）。

## ⚠️ 装饰使用原则

### ❌ 不要过度装饰

```xml
<!-- 推荐：1-3 个装饰元素 -->
<rect .../>
<circle .../>

<!-- 不推荐：> 5 个装饰元素会显得杂乱 -->
<circle .../>
<rect .../>
<polygon .../>
<path .../>
<filter .../>
<defs>...</defs>
<!-- 太乱！ -->
```

### ❌ 不要让装饰抢了文字的戏

```xml
<!-- 推荐：装饰低透明度 -->
<circle fill="#667EEA" opacity="0.2"/>

<!-- 不推荐：装饰过于抢眼 -->
<circle fill="#FF0000" opacity="1.0"/>
```

### ❌ 不要用与内容无关的装饰

```xml
<!-- 推荐：技术博客用几何、代码符号 -->
<text font-family="monospace">{ }</text>

<!-- 不推荐：技术博客用心形装饰 -->
<path id="heart" .../>
```
