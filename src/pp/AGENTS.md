# PP 技能开发指南

## 技能类型

**网页型技能** — Vue 3 + UnoCSS + Viewer.js，通过 `vite-plugin-singlefile` 编译为单个 HTML 文件。

Agent 负责用 `gallery-dl` 获取图片 URL、生成 `pp-data.js`、打开浏览器展示。

## 目录结构

```
src/pp/
├── public/                # 运行时资源（构建时复制到 skills/）
│   ├── SKILL.md           # 技能入口文档
│   ├── icons/             # SVG 图标
│   │   ├── icon-camera-flash.svg
│   │   └── icon-camera-openmoji.svg
│   └── pp-data.js         # 图片数据（运行时由 Agent 写入，构建时会被重置为示例数据）
├── src/                   # Vue 源码
│   ├── App.vue            # 主组件（随机渐变背景）
│   ├── components/
│   │   └── Gallery.vue    # 画廊组件（瀑布流 + Viewer.js）
│   ├── types/
│   │   └── index.ts       # TypeScript 类型定义
│   ├── main.ts            # Vue 应用入口
│   └── env.d.ts           # 环境类型声明
├── index.html             # HTML 入口
├── vite.config.ts         # Vite + singlefile 配置
── uno.config.ts          # UnoCSS 配置
├── tsconfig.json          # 模块级 TS 配置
└── package.json           # 模块级依赖与构建脚本
```

## 构建说明

```typescript
export default defineConfig({
  plugins: [UnoCSS(), vue(), viteSingleFile()],
  build: {
    outDir: '../../skills/pp',
    emptyOutDir: true,
    rollupOptions: { input: 'index.html' },
  },
  publicDir: resolve(__dirname, 'public'),
})
```

关键点：
- `vite-plugin-singlefile` 将 Vue、UnoCSS、Viewer.js 全部内联到 HTML
- `public/` 下的文件（SKILL.md、icons/、pp-data.js）自动复制到 `skills/pp/`
- 产物是单个 `index.html`，支持 `file://` 协议直接打开

## 开发流程

1. 安装依赖：`npm install`
2. 开发模式：`npm run dev`（Vite 热更新）
3. 修改 Vue 组件或样式
4. 重新编译：`npm run build`
5. 验证：用浏览器打开 `skills/pp/index.html` 测试功能
6. 确保产物已更新后提交

## 注意事项

- 不要手动修改 `skills/pp/index.html`，它是 Vite 构建产物
- `public/pp-data.js` 是运行时数据文件，每次 `npm run build` 会被重置为示例数据
- Viewer.js 通过 npm import 引入（`import Viewer from 'viewerjs'`），由 singlefile 内联
- SKILL.md 中的搜索策略要求 Agent 执行 2 次不同关键词的搜索，汇总去重后生成数据
- Phase 3 强调必须先写入 pp-data.js 再打开浏览器，顺序错误会导致加载旧数据
