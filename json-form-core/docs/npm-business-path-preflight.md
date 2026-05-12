# npm 业务主消费路径核验

本文档对应 GitHub issue `#9`，目标是验证 README 推荐的业务主消费路径在外部项目里真实成立，而不只是类型层可导入。

## 命令

```bash
npm run publish:preflight:business-path
```

## 这条命令验证什么

该命令会使用 `scripts/publish-preflight.mjs --profile business-path`，覆盖当前对业务接入方最重要的消费链路：

- `@sailornpg/form-kit`
- `@sailornpg/renderer-antdv`

同时会带上它们所需的低层依赖包 tarball，一并组成外部安装环境。

执行步骤：

1. 构建 4 个发布包
2. 为 4 个包生成本地 tarball
3. 生成一个最小外部 Vue/Vite consumer：`.tmp-publish-smoke/consumer-business-path`
4. 在该 consumer 中按 README 推荐方式安装：
   - `@sailornpg/form-kit`
   - `@sailornpg/renderer-antdv`
   - `vue`
   - `ant-design-vue`
5. 用最小 `SchemaForm + antdvPreset` 示例执行：
   - `vue-tsc --noEmit`
   - `vite build`

## 关注点

这条命令验证的是“业务方第一次接入是否闭环”：

- `SchemaForm` 与 `antdvPreset` 能否被正常 import
- peerDependencies 是否足以支撑安装和构建
- README 推荐的最小消费路径是否真的可运行

## 不验证什么

这条命令不覆盖：

- 真实 npm registry 可见性
- 账号 / scope 权限
- 真实 `npm publish`

这些仍属于 `#10` 的范围。

## 验收标准

命令成功时，至少应满足：

- 业务主路径 consumer 安装成功
- `vue-tsc --noEmit` 通过
- `vite build` 通过
- 最小 `SchemaForm + antdvPreset` 示例不需要依赖 monorepo 内部源码路径
