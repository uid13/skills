---
name: pp
description: "从 Pinterest 搜索图片并在浏览器中展示瀑布流画廊。使用 gallery-dl 获取图片链接，生成数据文件，打开浏览器展示。"
---

# Pinterest 图片画廊技能

本技能用于从 Pinterest 搜索图片并展示为瀑布流画廊。Agent 负责调用 gallery-dl 获取图片、生成数据文件、打开浏览器展示。

## 🔄 核心工作流 (Workflow)

### Phase 1: 环境检查

检查 gallery-dl 是否已安装：

```bash
gallery-dl --version
```

如果命令不存在或报错，提示用户安装：
- 下载地址：https://github.com/mikf/gallery-dl/releases
- 安装后将 gallery-dl.exe 添加到系统 PATH

### Phase 2: 搜索图片

使用 gallery-dl 获取 Pinterest 图片链接（不下载）：

```bash
gallery-dl --get-urls --http-timeout 10 --range 1-20 "https://www.pinterest.com/search/pins/?q=<关键词>"
```

**参数说明**：
- `--get-urls`：只获取图片 URL，不下载
- `--http-timeout 10`：HTTP 连接超时 10 秒，防止 Pinterest 无响应时挂起
- `--range 1-20`：限制获取前 20 条，避免无限滚动
- 输出为每行一个图片 URL

**数据清洗**：
- 跳过 `.heic` 格式（浏览器不支持）
- 仅保留 `.jpg`、`.png`、`.jpeg` 格式

**示例**：
```bash
gallery-dl --get-urls --http-timeout 10 --range 1-20 "https://www.pinterest.com/search/pins/?q=风景"
```

### Phase 3: 生成数据文件

将获取到的图片 URL 列表转换为 JavaScript 格式，写入数据文件：

**文件路径**：`<skill-dir>/pp-data.js`

**文件格式**：
```javascript
window.PP_IMAGES = [
  { url: 'https://i.pinimg.com/originals/xxx.jpg', alt: '图片描述1' },
  { url: 'https://i.pinimg.com/originals/yyy.jpg', alt: '图片描述2' },
  // ... 更多图片
];
```

**注意**：
- `alt` 字段可以是图片描述或留空字符串
- 建议生成 10-20 张图片

### Phase 4: 展示画廊

使用系统默认方式在浏览器中打开 `<skill-dir>/index.html`。

根据当前操作系统和 shell 环境选择合适的命令，例如：
- Windows cmd：`start index.html`
- Windows PowerShell：`Invoke-Item index.html`
- macOS：`open index.html`
- Linux：`xdg-open index.html`

---

## 💬 回复规范

打开画廊后，用轻松友好的语气向用户介绍，参考以下风格：

**示例回复**：

> 🖼️ **画廊已为您打开，请您欣赏~**
>
> 已为您准备好 **{主题}** 的精选美图 ✨
>
> 💡 **小贴士**：
> - 点击任意图片可进入全屏查看模式
> - 全屏查看时，点击 ▶️ 播放按钮可开启幻灯片自动播放
> - 支持缩放、旋转、翻页等操作
>
> 祝您观赏愉快 🎨

**常用主题 emoji 参考**：
- 人物/明星：🌟 👤 💫
- 风景/自然：🏞️ 🌄 🌊 🌸 🍃
- 动物/宠物：🐱 🐶 🦊 🐰 🦋
- 美食：🍰 🍜 🍕 ☕ 🍷
- 艺术/设计：🎨 🖌️ ✏️ 📐
- 建筑/城市：🏛️ 🌃 🏙️ 🌉
- 时尚/穿搭：👗 👠 💄 🕶️
- 动漫/游戏：🎮 🎯 ⚔️ 🌸

---

## 📋 技能目录结构

```
skills/pp/
├── index.html           # 画廊页面入口
├── icons/               # 图标文件
├── pp-data.js           # 图片数据文件（运行时生成）
└── SKILL.md             # 本文件
```

---

## 📝 使用示例

**用户输入**：
> 帮我搜索一些猫咪的图片

**Agent 执行步骤**：

1. 检查 gallery-dl 是否安装
2. 执行搜索：
   ```bash
   gallery-dl --get-urls --http-timeout 10 --range 1-20 "https://www.pinterest.com/search/pins/?q=猫咪"
   ```
3. 解析输出，过滤掉 `.heic` 格式，生成 pp-data.js
4. 在浏览器中打开 index.html
5. 回复用户：
   > 🖼️ **画廊已为您打开，请您欣赏~**
   >
   > 已为您准备好 **猫咪** 的精选美图 🐱✨
   >
   > 💡 **小贴士**：
   > - 点击任意图片可进入全屏查看模式
   > - 全屏查看时，点击 ▶️ 播放按钮可开启幻灯片自动播放
   > - 支持缩放、旋转、翻页等操作
   >
   > 祝您观赏愉快 🎨
