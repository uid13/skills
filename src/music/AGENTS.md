# Music 技能开发指南

## 技能类型

**代码型技能** — TypeScript 开发，Vite SSR 编译为 `.mjs`。

CLI 入口 `music.mjs` 通过 mpv IPC 控制播放 + `search-bili` 子命令走 B站 `/all/v2` 搜索，模型直接调用 `yt-dlp` 和 `mpv` CLI。
多音源（B站 / mail.ru / SoundCloud / YouTube）按固定 fallback 顺序播放。

## 目录结构

```
src/music/
├── public/                # 技能文档目录（publicDir，构建时整体复制）
│   ├── SKILL.md           # 技能入口文档（多态接口契约 + Fallback 链）
│   ├── sources/           # 音源实现层（每音源一个适配文件）
│   │   ├── bilibili.md    # B站 实现
│   │   ├── mailru.md      # mail.ru 实现
│   │   ├── soundcloud.md  # SoundCloud 实现
│   │   └── youtube.md     # YouTube 实现（默认无 cookie）
│   └── reference/         # 通用规范文档
│       └── ua-spec.md     # 随机桌面 UA 生成规范（模型现场生成，无 npm 依赖）
├── src/
│   ├── bin/               # CLI 入口
│   │   └── music.ts       # 命令解析（commander）+ status 结构化 JSON + search-bili
│   └── lib/               # 工具库
│       ├── mpv.ts         # mpv IPC 通信 + 批量属性查询 + 错误码枚举
│       └── bilibili.ts    # B站搜索（/all/v2 免 cookie/免签名，规避 412 风控）
├── vite.config.ts         # Vite SSR 编译配置（单入口 music）
├── tsconfig.json          # 模块级 TS 配置
└── package.json           # 模块级依赖与构建脚本
```

## 构建说明

```typescript
export default defineConfig({
  build: {
    ssr: true,
    lib: {
      entry: 'src/bin/music.ts',
      formats: ['es'],
    },
    outDir: '../../skills/music',
    rollupOptions: {
      external: [/^node:/],
      output: { entryFileNames: 'scripts/dist/[name].mjs' },
    },
  },
  ssr: { noExternal: true },  // 打包所有 npm 依赖（cross-spawn 及其子依赖）
  publicDir: resolve(__dirname, 'public'),
})
```

关键点：
- `ssr: true` — externalize node: 内置模块
- `noExternal: true` — 打包所有 npm 依赖（cross-spawn 子依赖）
- 单入口 `music` — 仅产出 `music.mjs`
- `entryFileNames: 'scripts/dist/[name].mjs'` — `[name]` 对应入口名，输出到 `scripts/dist/` 子目录

## 开发流程

1. 安装依赖：`pnpm install`
2. 开发模式：`pnpm dev`（watch 自动编译）
3. 修改代码（保持中文注释）
4. 重新编译：`pnpm build`
5. 验证：`node ../../skills/music/scripts/dist/music.mjs --help`
6. 同步产物到安装位置（`SKILL.md` + `sources/` + `reference/` + `scripts/` 复制到 `.agents/skills/music`）
7. 确保产物已更新后提交

## 注意事项

- 不要手动修改 `skills/music/scripts/` 下的文件，它们都是构建产物
- 所有代码使用中文注释
- 使用 `cross-spawn` 进行跨平台进程调用，不要直接 `child_process.spawn`
- `status` 命令输出结构化 JSON，单一 `state` 字段（`playing`/`paused`/`stopped`/`error`），所有状态 exit 0
- 退出码规范：`0` 成功、`1` 一般错误、`2` 参数错误、`3` 依赖缺失
