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

### Phase 2: 搜索图片（智能双搜索策略）

**步骤 2.1：理解用户意图并构造搜索词**

模型需要理解用户输入的主题/意图，构造 2 个不同角度的 Pinterest 友好搜索词：

**搜索词构造规则**：
- 优先使用英文（Pinterest 国际内容更丰富）
- 中国明星/中国特色主题可保留中文
- 搜索词应简洁、具体，避免过长或过于抽象
- 2 个搜索词应从不同角度描述同一主题

**示例**：
- "成都美食" → `["Chengdu food", "Sichuan street food"]`
- "绚丽星空" → `["starry night sky", "milky way photography"]`
- "鞠婧祎" → `["Ju Jingyi", "鞠婧祎"]`
- "深圳美景" → `["Shenzhen skyline", "Shenzhen city view"]`
- "猫咪" → `["cute cat", "kitten portrait"]`

**步骤 2.2：执行 2 次搜索**

依次执行 2 次 `gallery-dl` 命令，每次使用不同的搜索词：

```bash
# 第一次搜索
gallery-dl --get-urls --http-timeout 10 --range 1-15 "https://www.pinterest.com/search/pins/?q=<关键词1>"

# 第二次搜索
gallery-dl --get-urls --http-timeout 10 --range 1-15 "https://www.pinterest.com/search/pins/?q=<关键词2>"
```

**参数说明**：
- `--get-urls`：只获取图片 URL，不下载
- `--http-timeout 10`：HTTP 连接超时 10 秒
- `--range 1-15`：每次获取 15 条，2 次共约 30 条

**步骤 2.3：汇总去重**

- 合并 2 次搜索的 URL 列表
- 按 URL 去重
- 过滤 `.heic` 格式（浏览器不支持）
- 仅保留 `.jpg`、`.png`、`.jpeg` 格式
- 最终保留 15-20 张图片

### Phase 3: 生成数据文件

将汇总去重后的图片 URL 列表转换为 JavaScript 格式，写入数据文件：

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
- 最终生成 15-20 张图片

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
> 帮我搜索一些成都美食的图片

**Agent 执行步骤**：

1. 检查 gallery-dl 是否安装

2. 理解意图并构造搜索词：
   - 用户想要：成都美食
   - 构造搜索词：`["Chengdu food", "Sichuan street food"]`

3. 执行第一次搜索：
   ```bash
   gallery-dl --get-urls --http-timeout 10 --range 1-15 "https://www.pinterest.com/search/pins/?q=Chengdu food"
   ```

4. 执行第二次搜索：
   ```bash
   gallery-dl --get-urls --http-timeout 10 --range 1-15 "https://www.pinterest.com/search/pins/?q=Sichuan street food"
   ```

5. 汇总去重：
   - 合并 2 次搜索的 URL
   - 去重、过滤 .heic 格式
   - 保留 15-20 张图片

6. 生成 pp-data.js

7. 在浏览器中打开 index.html

8. 回复用户：
   > 🖼️ **画廊已为您打开，请您欣赏~**
   >
   > 已为您准备好 **成都美食** 的精选美图 🍜✨
   >
   > 💡 **小贴士**：
   > - 点击任意图片可进入全屏查看模式
   > - 全屏查看时，点击 ▶️ 播放按钮可开启幻灯片自动播放
   > - 支持缩放、旋转、翻页等操作
   >
   > 祝您观赏愉快 🎨
