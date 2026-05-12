# npm 发布前核验

本文档对应 GitHub issue `#7`，把当前仓库的 npm 首发前核验步骤收敛为一条可重复执行的仓库内命令。

## 目标

在真正执行 `npm publish` 前，先验证以下链路：

- 根仓库 `npm run build` 通过
- 4 个目标包都能产出可安装 tarball
- tarball 中实际包含 `main`、`types`、`exports` 指向的入口文件
- 外部临时 consumer 能从本地 tarball 安装并通过最小 TypeScript smoke test

## 命令

```bash
npm run publish:preflight
```

## 脚本行为

该命令会执行 `scripts/publish-preflight.mjs`，顺序如下：

1. 使用仓库内本地 cache：`.tmp-publish-smoke/.npm-cache`
2. 执行根级 `npm run build`
3. 对以下 4 个包执行真实 `npm pack`，并把 tarball 输出到 `.tmp-publish-smoke/tarballs/`
4. 校验每个 tarball 至少包含其 `main`、`types`、`exports` 指向的入口文件
5. 生成一个临时外部 consumer：`.tmp-publish-smoke/consumer`
6. 在该 consumer 中从本地 tarball 安装依赖，并执行 `tsc --noEmit`

目标包：

- `@sailornpg/engine-adapter`
- `@sailornpg/form-protocol`
- `@sailornpg/renderer-antdv`
- `@sailornpg/form-kit`

## 为什么不用全局 npm cache

当前机器在沙箱环境下访问默认 `C:\Users\Administrator\AppData\Local\npm-cache` 时出现过 `EPERM`。因此 preflight 脚本显式改用仓库内 cache，避免把发布前核验绑定到用户机器的全局 npm 状态。

## 产物位置

以下目录都是临时产物，已被 `.gitignore` 忽略：

- `.tmp-publish-smoke/.npm-cache`
- `.tmp-publish-smoke/tarballs`
- `.tmp-publish-smoke/consumer`

## 验收标准

preflight 成功时，至少应满足：

- 4 个包都完成 tarball 打包
- tarball 未泄漏 `src/` 源码
- `consumer` 安装成功
- `consumer` 的 `npm run typecheck` 通过

## 使用边界

这个命令只解决“发包前核验”，不负责：

- `npm whoami`
- scope 权限确认
- 真实 `npm publish`
- registry 可见性检查

这些步骤仍属于后续 `#10` 的真实发包范围。
