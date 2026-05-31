# 外部素材获取指南

> Agent 在生成 SVG 时，可通过公共 API 获取图标、插图等素材，融合到设计中。

## Iconify 公共 API

Iconify 提供 275k+ 开源图标，覆盖 200+ 图标集。免费使用，无需 API Key。

**公共 API 地址**：`https://api.iconify.design`

**备用地址**（主站不可用时）：
- `https://api.simplesvg.com`
- `https://api.unisvg.com`

---

### 核心 API

#### 1. 搜索图标

```
GET https://api.iconify.design/search?query={关键词}&limit={数量}
```

**参数**：
- `query`（必填）：搜索关键词，如 `terminal`、`code`、`cloud`
- `limit`（可选）：返回数量，默认 30
- `prefix`（可选）：限定图标集，如 `mdi`、`lucide`

**返回示例**：
```json
{
  "icons": ["mdi:terminal", "mdi:console", "codicon:terminal", ...],
  "total": 156
}
```

**用法**：Agent 根据用户需求的场景搜索关键词，获取图标名列表。

#### 2. 获取 SVG

```
GET https://api.iconify.design/{prefix}/{name}.svg
```

**参数**：
- `prefix`：图标集前缀（如 `mdi`、`lucide`）
- `name`：图标名（如 `terminal`、`cloud`）
- `width`（可选）：SVG 宽度
- `height`（可选）：SVG 高度
- `color`（可选）：图标颜色（如 `%23FF0000` 表示 #FF0000）

**返回**：纯 SVG 字符串，可直接嵌入到生成的 SVG 中。

**示例**：
```
https://api.iconify.design/mdi/terminal.svg?width=48&color=%2358A6FF
```

#### 3. 获取图标 JSON 数据

```
GET https://api.iconify.design/{prefix}.json?icons={name1},{name2}
```

**用途**：需要对图标做二次加工（改颜色、缩放、组合）时，获取 SVG 路径数据。

**返回**：JSON 格式的图标数据（body、width、height 等）。

#### 4. 列出图标集

```
GET https://api.iconify.design/collections
```

**返回**：所有可用图标集的列表（名称、图标数量、作者等）。

#### 5. 列出图标集中的图标

```
GET https://api.iconify.design/{prefix}
```

**返回**：指定图标集中的所有图标名。

---

### 推荐图标集（按优先级）

| 优先级 | 图标集 | prefix | 数量 | 风格 | 适用场景 |
|--------|--------|--------|------|------|---------|
| 1 | Material Design Icons | `mdi` | ~7000+ | Google Material | 通用，最全 |
| 2 | Lucide | `lucide` | ~1500+ | 简洁现代 | 封面、社交媒体 |
| 3 | Codicons | `codicon` | ~400+ | VS Code 风格 | 技术、CLI、开发工具 |
| 4 | Phosphor | `ph` | ~7000+ | 6 种粗细 | 设计感强 |
| 5 | Heroicons | `heroicons` | ~300+ | Tailwind 官方 | 简约 UI |
| 6 | Bootstrap Icons | `bi` | ~2000+ | Bootstrap 风格 | Web 相关 |
| 7 | Ant Design Icons | `ant-design` | ~3000+ | 蚂蚁设计 | 中文场景 |

---

### 风格一致性原则

**关键**：图标风格必须与整体设计协调，否则融合会显得突兀。

| 设计风格 | 推荐图标集 | 原因 |
|---------|-----------|------|
| 技术/CLI 封面 | `codicon` + `mdi` | VS Code 风格，程序员熟悉 |
| 简约现代 | `lucide` + `heroicons` | 线条简洁，不喧宾夺主 |
| 商务/专业 | `carbon` + `fluent` | IBM/微软设计系统，稳重 |
| 活泼/社交 | `mdi` + `ph` | 色彩丰富，辨识度高 |
| 暗色主题 | `lucide`（浅色图标） | 线条图标在暗背景上更清晰 |

**融合规则**：
1. 图标颜色必须与配色方案一致（不使用图标默认颜色）
2. 图标尺寸与文字协调（通常 24-48px）
3. 图标位置不遮挡文字
4. 同一设计中使用同一图标集的图标（不混搭）

---

### Agent 使用示例

**场景**：为 CLI 工具博客生成封面，需要终端图标作为装饰。

**步骤**：

```
1. 搜索图标
   GET https://api.iconify.design/search?query=terminal&prefix=mdi&limit=5

2. 获取 SVG
   GET https://api.iconify.design/mdi/terminal.svg?width=48&color=%2358A6FF

3. 将 SVG 路径嵌入生成的封面 SVG 中
```

**嵌入方式**：
```xml
<!-- 将获取的 SVG 内容作为 <g> 嵌入 -->
<g transform="translate(100, 50)">
  <!-- Iconify 返回的 SVG path 数据 -->
  <path d="M20,11V13H8L13.5,18.5L12.08,19.92L6,14L12.08,8.08L13.5,9.5L8,15H20Z" fill="#58A6FF"/>
</g>
```

**注意**：Agent 需要解析 Iconify 返回的 SVG，提取 `<path>` 等元素，调整尺寸和颜色后嵌入。不要直接粘贴完整 SVG 标签（会与外层 SVG 冲突）。
