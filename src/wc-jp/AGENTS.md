# Word Categories Japanese (wc-jp) 技能开发指南

## 技能类型

**资源型技能** — 纯文档 + 静态页面，无代码逻辑。

Agent 直接读取 SKILL.md 指令工作，无需自定义脚本。

## 目录结构

```
src/wc-jp/
├── public/                # 资源目录（构建时复制到 skills/）
│   ├── SKILL.md           # 技能入口文档
│   ├── wc-jp.html         # 浏览器查看页面（Vue 3 via CDN）
│   └── wc-jp-data.js      # 词汇数据文件（运行时由 Agent 更新）
├── src/                   # Vite 构建入口
│   └── dummy.js           # 占位文件（Vite 需要至少一个入口）
├── vite.config.ts         # Vite 配置（publicDir 机制）
└── package.json           # 模块级配置
```

## 构建说明

使用 Vite `publicDir` 机制，`public/` 下所有内容自动复制到 `outDir`，无需手写复制插件。

```typescript
export default defineConfig({
  publicDir: resolve(__dirname, 'public'),
  build: {
    outDir: resolve(__dirname, '../../skills/wc-jp'),
    emptyOutDir: true,
    lib: { entry: 'src/dummy.js', formats: ['es'] },
    rollupOptions: { output: { entryFileNames: 'scripts/dummy.js' } },
  },
})
```

## 开发流程

1. 修改 `public/` 下的 SKILL.md、wc-jp.html 或 wc-jp-data.js
2. 运行 `pnpm build`（Vite 自动复制 public/ 到 skills/）
3. 验证 `skills/wc-jp/` 下的产物已更新

## 注意事项

- 不要手动修改 `skills/wc-jp/` 下的文件，它们都是构建产物
- `src/dummy.js` 不可删除，Vite 构建需要至少一个入口文件
- `wc-jp-data.js` 初始为占位数据，运行时由 Agent 根据用户输入生成并更新
- `wc-jp.html` 通过 CDN 加载 Vue 3，需要网络连接才能正常显示
