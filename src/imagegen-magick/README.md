# imagegen-magick 源码项目

> 本目录是 `imagegen-magick` 技能的 **TypeScript + Vite 8 (Rolldown) 工程化源码**
> 编译产物在 [../../skills/imagegen-magick/](../../skills/imagegen-magick/)（用户使用的最终产物）

## 📦 技术栈

- **语言**：TypeScript 5.4+
- **构建工具**：Vite 8.0.14（使用 Rolldown，Rust 实现的打包器，替代 Rollup）
- **构建脚本**：`build.mjs`（程序化多入口逐个构建）
- **测试**：Vitest 1.4
- **输出格式**：ESM (.mjs)
- **目标 Node 版本**：22+

## 🏗️ 目录结构

```
src/imagegen-magick/
├── src/
│   ├── bin/                     # CLI 工具入口（每个独立打包）
│   │   ├── info.ts              # 环境信息检查
│   │   ├── render.ts            # SVG → PNG 渲染
│   │   ├── check-fonts.ts       # 字体检测与推荐
│   │   ├── scaffold.ts          # 交互式 SVG 生成器
│   │   ├── font-chain.ts        # 字体链生成（→ JSONC）
│   │   └── post-process.ts      # 图像后期处理
│   │
│   ├── lib/                     # 工具库（被 bin 引用）
│   │   ├── colors.ts            # 终端颜色输出（替代 chalk）
│   │   ├── spawn.ts             # 跨平台子进程封装（替代 cross-spawn）
│   │   ├── magick.ts            # ImageMagick 兼容层（→ magick/index.ts）
│   │   ├── magick/              # ImageMagick 统一模块
│   │   │   ├── index.ts         # 统一导出
│   │   │   ├── types.ts         # 共享类型
│   │   │   ├── core.ts          # 底层 CLI 调用封装
│   │   │   ├── detection.ts     # 环境检测、字体、格式
│   │   │   ├── render.ts        # SVG 渲染
│   │   │   ├── processor.ts     # ImageProcessor（组合注入）
│   │   │   └── dimensions/      # 处理维度（按需注入）
│   │   │       ├── geometry.ts  # 几何变换
│   │   │       ├── color.ts     # 颜色色调
│   │   │       ├── filter.ts    # 滤镜模糊
│   │   │       ├── art.ts       # 艺术效果
│   │   │       └── format.ts    # 格式编码
│   │   ├── font-detector.ts     # 跨平台字体检测
│   │   ├── font-fallback.ts     # 字体 fallback 策略
│   │   ├── logger.ts            # 统一日志工具
│   │   └── types.ts             # 类型定义
│   │
│   └── utils/
│       └── path.ts              # 路径处理辅助
│
├── tests/                       # Vitest 测试
│   ├── font-detector.test.ts
│   └── font-fallback.test.ts
│
├── vite.config.ts               # Vite 8 (Rolldown) 编译配置
├── build.mjs                    # 程序化多入口构建脚本（关键）
├── tsconfig.json                # TypeScript 配置
├── package.json                 # 本目录的依赖（由父级 workspaces 管理）
└── README.md                    # 本文件
```

## 🛠️ 开发命令

```bash
# 安装依赖（在根目录运行）
cd ../..
npm install

# 单次编译（在本目录运行）
npm run build
# 等价于：node build.mjs
# 输出到 ../../skills/imagegen-magick/scripts/dist/
# 每个入口生成独立 .mjs 文件（零 chunk 依赖）
# 构建速度：~270ms（Vite 8 + Rolldown）

# 通过 workspaces 调用（在根目录）
cd ../..
npm -w imagegen-magick-src build

# 类型检查
npm run typecheck

# 运行测试
npm run test
```

> ⚠️ **注意**：当前 `dev` 脚本等同于 `build`，**没有自动监听模式**。每次修改代码后需手动运行 `npm run build`。
> 这是由构建架构决定（程序化逐个构建避免 chunk 拆分，无法用 vite 的 watch 模式）。

## 📦 编译产物

编译后输出到 `../../skills/imagegen-magick/scripts/dist/`：

```
dist/
├── info.mjs              # node info.mjs → 显示环境
├── info.mjs.map
├── render.mjs            # node render.mjs <svg> -o <png> → 渲染
├── render.mjs.map
├── check-fonts.mjs       # node check-fonts.mjs → 列出字体
├── check-fonts.mjs.map
├── scaffold.mjs          # node scaffold.mjs → 交互式生成
├── scaffold.mjs.map
├── font-chain.mjs        # node font-chain.mjs → 生成字体链 JSONC
├── font-chain.mjs.map
├── post-process.mjs      # node post-process.mjs → 后期处理
└── post-process.mjs.map
```

## 🎯 设计原则

### 1. 零安装分发

编译产物打包所有依赖，用户 clone 仓库后无需 `npm install` 即可使用。
通过 `--json` 参数可让 AI 解析输出。

### 2. 跨平台兼容

所有脚本同时工作于 Windows / macOS / Linux：
- Windows：Git Bash
- macOS/Linux：任意 shell
- ImageMagick 命令路径自动适配

### 3. 字体智能 fallback

找不到 Cascadia 字体时自动降级到系统已有字体：
1. Cascadia Code / Mono / Next
2. Fira Code
3. Hack
4. 微软雅黑（Windows）/ PingFang SC（macOS）/ Noto Sans CJK（Linux）
5. Arial Unicode MS

### 4. 全中文注释

所有源码遵循项目规范：
- 函数、类、常量必须有中文字符串注释
- 关键逻辑段落要说明设计意图
- 示例代码用中文说明

## 🔗 相关链接

- 技能入口：[skills/imagegen-magick/](../../skills/imagegen-magick/)
- 技能文档：[skills/imagegen-magick/README.md](../../skills/imagegen-magick/README.md)
- 设计规范：[`references/`](../../skills/imagegen-magick/references/)
- 示例：[`examples/`](../../skills/imagegen-magick/examples/)
- 上级 AGENTS.md：[`../../AGENTS.md`](../../AGENTS.md)
