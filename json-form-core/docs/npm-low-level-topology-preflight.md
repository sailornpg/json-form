# npm 低层拓扑核验

本文档对应 GitHub issue `#8`，目标是验证 `@sailornpg/engine-adapter` 与 `@sailornpg/form-protocol` 这两个低层包，在脱离 monorepo 本地联调环境后，是否仍然可以作为外部安装前置独立成立。

## 命令

```bash
npm run publish:preflight:low-level
```

## 这条命令验证什么

该命令会使用 `scripts/publish-preflight.mjs --profile low-level`，只覆盖低层发布拓扑：

- `@sailornpg/engine-adapter`
- `@sailornpg/form-protocol`

执行步骤：

1. 只构建这两个低层包
2. 为这两个包生成本地 tarball，输出到 `.tmp-publish-smoke/tarballs/low-level`
3. 校验 tarball 至少包含 `main`、`types`、`exports` 指向的入口文件
4. 生成一个低层临时 consumer：`.tmp-publish-smoke/consumer-low-level`
5. 在 consumer 中仅安装：
   - `@sailornpg/engine-adapter`
   - `@sailornpg/form-protocol`
   - `vue`
   - `typescript`
6. 对低层 public API 执行最小 import / typecheck smoke test

## 低层 smoke 的关注点

这条链路不是为了验证业务接入体验，而是验证低层依赖拓扑本身成立：

- `engine-adapter` 的 runtime / type exports 可被外部解析
- `form-protocol` 对 `engine-adapter` 的版本依赖可被外部安装正确解析
- `form-protocol` 的 widget / preset / renderer config 协议在外部项目里可被 import 和使用

## 不验证什么

这条命令不覆盖：

- `@sailornpg/renderer-antdv`
- `@sailornpg/form-kit`
- README 里的业务接入路径
- 真实 npm registry 可见性

这些属于 `#9` 或 `#10` 的范围。

## 验收标准

命令成功时，至少应满足：

- 两个低层包都能独立完成 tarball 打包
- 低层 consumer 安装成功
- 低层 consumer 的 `tsc --noEmit` 通过
- `form-protocol -> engine-adapter` 的对外依赖链路在外部环境下没有解析断点
