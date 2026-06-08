# ImageGen Magick 技能开发指南

## 技能类型

**资源型技能** — 纯文档 + 内置字体，无代码逻辑。

Agent 直接调用外部工具（`magick` CLI），无需自定义脚本。

## 目录结构

```
src/imagegen-magick/
├── public/                # 资源目录（构建时复制到 skills/）
│   ├── fonts/             # 内置字体（Cascadia Next SC NF，7 个字重）
│   ├── references/        # 参考文档（按需加载）
│   └── SKILL.md           # 技能入口文档
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
    outDir: resolve(__dirname, '../../skills/imagegen-magick'),
    emptyOutDir: true,
    lib: { entry: 'src/dummy.js', formats: ['es'] },
    rollupOptions: { output: { entryFileNames: 'scripts/dummy.js' } },
  },
})
```

## 开发流程

1. 修改 `public/` 下的 SKILL.md、references/ 或 fonts/
2. 运行 `npm run build`（Vite 自动复制 public/ 到 skills/）
3. 验证 `skills/imagegen-magick/` 下的产物已更新

## 注意事项

- 不要手动修改 `skills/imagegen-magick/` 下的文件，它们都是构建产物
- `src/dummy.js` 不可删除，Vite 构建需要至少一个入口文件
- 新增字体放入 `public/fonts/`，新增参考文档放入 `public/references/`
