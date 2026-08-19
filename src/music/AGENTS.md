# Music 技能开发指南

## 技能类型

**代码型技能** — TypeScript 开发，Vite SSR 编译为 `.mjs`。

CLI 入口 `music.mjs` 通过 mpv IPC 控制播放，模型直接调用 `yt-dlp` 和 `mpv` CLI。

## 目录结构

```
src/music/
├── public/                # 技能文档目录
│   └── SKILL.md           # 技能入口文档
├── src/
│   ├── bin/               # CLI 入口
│   │   └── music.ts       # 命令解析（commander）
│   └── lib/               # 工具库
│       └── mpv.ts         # mpv IPC 通信
├── vite.config.ts         # Vite SSR 编译配置
├── tsconfig.json          # 模块级 TS 配置
└── package.json           # 模块级依赖与构建脚本
```

## 构建说明

```typescript
export default defineConfig({
  build: {
    ssr: true,
    lib: { entry: 'src/bin/music.ts', formats: ['es'], fileName: 'music' },
    outDir: '../../skills/music',
    rollupOptions: {
      external: [/^node:/],
      output: { entryFileNames: 'scripts/dist/[name].mjs' },
    },
  },
  ssr: { noExternal: true },  // 打包所有依赖（包括 cross-spawn 的子依赖）
  publicDir: resolve(__dirname, 'public'),
})
```

关键点：
- `ssr: true` — externalize node: 内置模块
- `noExternal: true` — 打包所有 npm 依赖（commander、cross-spawn 等）
- `entryFileNames: 'scripts/dist/[name].mjs'` — 输出到 `scripts/dist/` 子目录

## 开发流程

1. 安装依赖：`pnpm install`
2. 开发模式：`pnpm dev`（watch 自动编译）
3. 修改代码（保持中文注释）
4. 重新编译：`pnpm build`
5. 验证：`node ../../skills/music/scripts/dist/music.mjs --help`
6. 确保产物已更新后提交

## 注意事项

- 不要手动修改 `skills/music/scripts/` 下的文件，它们都是构建产物
- 所有代码使用中文注释
- 使用 `cross-spawn` 进行跨平台进程调用，不要直接 `child_process.spawn`
- 退出码规范：`0` 成功、`1` 一般错误、`2` 参数错误、`3` 依赖缺失
