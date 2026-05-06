# JSON Form Core npm 真实发包 Checklist / Release Spec

日期：2026-05-06

## 背景

仓库当前已经完成“最小可发布改造”：

- 4 个目标包已移除 `private: true`
- `main` / `types` / `exports` 已切到 `dist`
- workspace 内部 `file:` 依赖已改成 `^0.1.0`
- `npm run build` 已通过
- 4 个包 `npm pack --dry-run` 已通过
- 外部临时 consumer 安装 tarball 并执行 `tsc --noEmit` 已通过

这意味着仓库已经接近“可以真实发布到 npm”的状态，但还缺一份可执行、可复盘的真实发包清单。

本文档定义本仓库当前版本的 npm 首次发布流程。

## 目标

给 `json-form-core` 当前 4 个包提供一份可直接执行的 release checklist，使首次真实发包具备：

- 明确的发布顺序
- 明确的发包前检查
- 明确的发包命令
- 明确的发后验收方式
- 明确的失败止损策略

## 本次发布范围

本次 release 只覆盖以下包的首次公开发布：

- `@json-form/engine-adapter`
- `@json-form/form-protocol`
- `@json-form/renderer-antdv`
- `@json-form/form-kit`

版本基线：

- `0.1.0`

## 包角色与发布顺序

这 4 个包存在明确依赖关系，因此必须按依赖拓扑顺序发布。

推荐发布顺序：

1. `@json-form/engine-adapter`
2. `@json-form/form-protocol`
3. `@json-form/renderer-antdv`
4. `@json-form/form-kit`

原因：

- `form-protocol` 依赖 `engine-adapter`
- `renderer-antdv` 依赖 `engine-adapter` 与 `form-protocol`
- `form-kit` 依赖前三者中的后两层

如果顺序错误，后续包在 npm 解析依赖时可能拉不到对应版本。

## 发包前 Checklist

### 1. 账号与权限检查

发布前必须确认：

- 当前机器已完成 `npm login`
- 当前账号拥有 `@json-form` scope 的发布权限
- 4 个包名未被其他人占用，或者当前账号已具备对应 scope ownership

建议执行：

```bash
npm whoami
```

如果是 scope 首次使用，还应确认组织或 scope 权限已经配置完成。

### 2. 工作树检查

发布前工作树必须干净，避免把未验证改动带入 release：

```bash
git status --short
```

预期结果：

- 无未提交改动

### 3. 版本一致性检查

发布前确认：

- 4 个包的 `version` 都是目标版本
- 包间依赖使用的都是同一轮目标版本

当前首次发布基线为：

- `0.1.0`

### 4. 构建检查

执行：

```bash
npm run build
```

预期结果：

- 根构建成功
- 4 个包都产出 `dist/index.js`
- 4 个包都产出 `dist/index.d.ts`

### 5. Tarball 检查

对每个包执行：

```bash
npm pack --dry-run --workspace @json-form/engine-adapter
npm pack --dry-run --workspace @json-form/form-protocol
npm pack --dry-run --workspace @json-form/renderer-antdv
npm pack --dry-run --workspace @json-form/form-kit
```

检查点：

- tarball 中包含 `dist`
- 不应把源码树、临时目录、无关 demo 文件一起发出去
- `package.json` 中的入口字段与 tarball 内容一致

### 6. 外部消费检查

发布前至少完成一次外部消费 smoke test：

- 从本地 tarball 安装 4 个包
- 补齐 `vue`、`ant-design-vue` 等 peerDependencies
- 执行 `tsc --noEmit`

当前仓库已经完成过一次这类验证，但正式发布前如果再有元数据变化，仍建议重跑。

## 推荐发布命令

首次发布推荐逐包串行执行，不要并发发布。

```bash
npm publish --workspace @json-form/engine-adapter --access public
npm publish --workspace @json-form/form-protocol --access public
npm publish --workspace @json-form/renderer-antdv --access public
npm publish --workspace @json-form/form-kit --access public
```

说明：

- 当前各包已设置 `publishConfig.access = public`
- 显式带上 `--access public` 更不容易在首次 scoped publish 时出错
- 必须等前一个包发布成功后，再继续下一个包

## 发包执行流程

推荐按以下顺序执行：

1. 拉取并确认当前本地分支就是目标提交
2. 执行 `git status --short`，确认工作树干净
3. 执行 `npm whoami`
4. 执行 `npm run build`
5. 执行 4 个 `npm pack --dry-run`
6. 如有需要，重跑外部 consumer smoke test
7. 串行发布 4 个包
8. 每发布完一个包，立即到 npm registry 验证版本是否可见
9. 全部发布完成后，做一次真实安装验证

## 发后验收

发布完成后，至少做两类验收。

### 1. Registry 可见性验收

确认以下包都已经出现目标版本：

- `@json-form/engine-adapter@0.1.0`
- `@json-form/form-protocol@0.1.0`
- `@json-form/renderer-antdv@0.1.0`
- `@json-form/form-kit@0.1.0`

### 2. 真实安装验收

新建一个干净项目，执行类似安装：

```bash
npm install @json-form/form-kit @json-form/renderer-antdv vue ant-design-vue
```

至少验证：

- install 成功
- TypeScript 可以解析类型
- `SchemaForm + antdvPreset` 能正常 import
- 最小示例可通过构建

## 失败止损策略

### 1. 某个包尚未发布成功

如果链路中途失败，且失败包还未成功 publish：

- 先停止继续发布
- 修复问题
- 重新从失败包开始发布后续链路

### 2. 某个包已经发布成功，但后续包失败

如果前面的低层包已成功发布，而上层包失败：

- 不要强行撤回已发布版本
- 记录当前已发布状态
- 修复后继续补发缺失包

原因：

- npm 已发布版本通常不应依赖撤销作为常规修复手段
- 首次发布更应该以“补齐链路”为主，而不是回滚 registry 状态

### 3. 发布后发现 README 或元数据问题

如果发现的是文档、描述、关键字、仓库链接等非代码问题：

- 直接修复仓库
- bump patch 版本
- 再发一个小版本修正

不建议修改已发布 tarball 的预期行为说明后，继续把旧版本当作最终结果。

## 当前已知风险

### 1. 还没有自动化 release pipeline

当前发包仍是人工流程，风险点包括：

- 漏发某个包
- 发包顺序错误
- 版本号未同步

### 2. `form-kit` 仍然绑定当前 Antdv 消费路径

虽然这不阻塞首次发布，但它意味着：

- `form-kit` 还不是完全 UI 无关的公共 facade
- 后续如果引入第二套 renderer，包策略可能还要调整

### 3. 首次 scoped publish 依赖 npm 权限配置正确

代码已经准备好，但是否能真实发出去，还取决于：

- npm 账号权限
- scope ownership
- 包名可用性

这些需要在真实发布当场确认。

## 建议的下一阶段

首次发布完成后，建议继续做两件事：

1. 引入版本管理与 release 自动化，例如 changesets
2. 明确长期包面策略，决定是否把 `form-kit` 与 renderer 进一步解耦

## 验收标准

本文档完成后，应满足：

- 团队成员可以按本文直接执行首次 npm 发布
- 可以明确知道 4 个包的发布顺序
- 可以明确知道发前检查、发后验收、失败处理方式
- 文档内容与当前仓库真实包结构一致
