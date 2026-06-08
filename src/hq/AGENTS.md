# HQ 技能开发指南

## 技能类型

**代码型技能** — TypeScript 开发，Vite SSR 编译为 `.mjs`。

CLI 入口 `hq.mjs` 接收行情代码参数，调用新浪接口，输出 Markdown 表格。

参考页面（hf.html、futures_fee.html）通过 Vite dev server 的 proxy 功能解决浏览器 CORS 问题，无需外部依赖。

## 目录结构

```
src/hq/
├── public/                # 技能文档 + 参考页面（构建时复制到 skills/）
│   ├── SKILL.md           # 技能入口文档
│   ├── futures_fee.html   # 期货手续费查询页面
│   ├── hf.html            # 外盘期货行情页面
│   ├── chart-line.svg     # hf.html 图标
│   ├── receipt.svg        # futures_fee.html 图标
│   └── vite.config.mjs    # Vite 开发服务器配置（API 代理）
├── src/
│   ├── bin/               # CLI 入口
│   │   └── hq.ts          # 命令解析（commander）
│   └── lib/               # 工具库
│       ├── parser.ts      # 行情数据解析
│       ├── sina.ts        # 新浪接口请求
│       └── types.ts       # TypeScript 类型定义
├── vite.config.ts         # Vite SSR 编译配置
├── tsconfig.json          # 模块级 TS 配置
└── package.json           # 模块级依赖与构建脚本
```

## 构建说明

与 music 技能相同模式：

```typescript
export default defineConfig({
  build: {
    ssr: true,
    lib: { entry: 'src/bin/hq.ts', formats: ['es'], fileName: 'hq' },
    outDir: '../../skills/hq',
    rollupOptions: {
      external: [/^node:/],
      output: { entryFileNames: 'scripts/dist/[name].mjs' },
    },
  },
  ssr: { noExternal: true },
  publicDir: resolve(__dirname, 'public'),
})
```

`public/` 下的所有文件（SKILL.md、HTML 参考页面、SVG 图标、vite.config.mjs）都会自动复制到 `skills/hq/`。

## 开发流程

1. 安装依赖：`npm install`
2. 开发模式：`npm run dev`（watch 自动编译）
3. 修改代码或 public/ 下的参考页面
4. 重新编译：`npm run build`
5. 验证：`node ../../skills/hq/scripts/dist/hq.mjs 600519`
6. 确保产物已更新后提交

## 参考页面代理

HTML 中的请求使用本地代理路径（`/hq/*`、`/finance/*`），Vite dev server 自动转发到新浪接口并添加 CORS 头：

```bash
# 启动本地开发服务器（端口 5168）
cd skills/hq
npx -y vite@8.0.0 --config vite.config.mjs --port 5168
```

## 注意事项

- 不要手动修改 `skills/hq/` 下的文件，它们都是构建产物
- `public/` 下的 HTML 文件是交互式参考页面，会被复制到 skills/
- SKILL.md 要求 Agent 在行情表格后直接输出 2 个参考页面链接
- 所有代码使用中文注释
- 退出码规范：`0` 成功、`1` 一般错误、`2` 参数错误、`3` 依赖缺失
