# JSON Form Core 最小 npm 可发布改造设计

日期：2026-05-06

## 背景

当前仓库已经具备以下能力：

- workspace 下的核心包都能单独输出 `dist`
- 仓库级 `npm run build` 已通过
- demo 能验证 `SchemaForm`、`rendererPreset`、custom widget、direct renderer override 等关键链路

但“能构建”不等于“能发布到 npm 并被外部消费”。当前 package 元数据仍然主要服务于 monorepo 本地开发，而不是外部安装与运行。

## 目标

把当前仓库整理到“最小 npm 可发布状态”，使外部使用者可以通过 npm 安装并消费核心包。

本设计只关注**最小可发布改造**，不追求一次性把整个产品面、文档面、版本策略和多 UI 方案全部做完。

## 非目标

- 本阶段不引入完整 release pipeline
- 本阶段不接入 changesets、semantic-release 或 GitHub Actions 自动发布
- 本阶段不解决全部长期包分层问题
- 本阶段不强制把 `form-kit` 做到完全 UI 无关
- 本阶段不新增第二套 renderer 包

## 当前阻塞点

### 1. 包被标记为 `private`

当前以下包都包含 `"private": true`：

- `@json-form/form-kit`
- `@json-form/renderer-antdv`
- `@json-form/form-protocol`
- `@json-form/engine-adapter`

这会直接阻止正常发布。

### 2. 内部依赖仍然使用 `file:`

例如 `form-kit` 当前依赖：

```json
"@json-form/engine-adapter": "file:../engine-adapter",
"@json-form/form-protocol": "file:../form-protocol",
"@json-form/renderer-antdv": "file:../renderer-antdv"
```

这适合 monorepo 本地联调，不适合发布后的 npm 消费者。

### 3. 发布入口仍指向 `src`

当前多个包仍使用：

```json
"main": "./src/index.ts",
"types": "./src/index.ts"
```

但 `files` 又限制为：

```json
"files": ["dist"]
```

这会导致包发布后元数据指向不存在于最终 tarball 的路径。

### 4. 缺少 `exports`

当前包没有统一声明 `exports`。在 ESM 包发布场景下，仅依赖 `main` / `types` 不够稳，外部工具链解析体验也不理想。

### 5. `peerDependencies` 策略未定

目前依赖关系更像“仓库内一起开发”的写法，而不是“库给外部使用”的写法。

例如：

- `vue`
- `@jsonforms/core`
- `@jsonforms/vue`
- `ant-design-vue`

哪些应由库自己带，哪些应要求使用者安装，目前还没有明确策略。

### 6. 对外包面还未完全收口

当前有四个潜在发布包：

- `@json-form/engine-adapter`
- `@json-form/form-protocol`
- `@json-form/renderer-antdv`
- `@json-form/form-kit`

但它们的对外定位并不完全对称：

- `engine-adapter` 更像内部 adapter
- `form-protocol` 更像底层协议包
- `renderer-antdv` 是显式对外 renderer 实现
- `form-kit` 是主要 consumer-facing module

如果不先明确“哪些包要正式对外承诺”，发布后会增加维护负担。

## 设计原则

### 1. 先发布真正有对外价值的 module

优先保证 consumer-facing module 可用，而不是把每个内部 module 都当作稳定公共 interface 发布。

### 2. 发布 interface 必须和 tarball 内容一致

`main`、`types`、`exports` 必须全部指向 `dist` 中真实存在的文件。

### 3. 内部 adapter 和公共 module 要分级承诺

“能被 import” 不等于 “应该承诺长期稳定”。对外包面应尽量小。

### 4. 最小改造优先，不在这一步重做整体架构

本设计先解决“发不出去”和“发出去不能正常装/用”的问题，不顺带解决所有长期架构问题。

## 推荐发布策略

### 方案选择

推荐采用**分层发布，但分级承诺**：

正式对外主推：

- `@json-form/form-kit`
- `@json-form/renderer-antdv`

低层可发布但弱承诺：

- `@json-form/form-protocol`
- `@json-form/engine-adapter`

理由：

- `form-kit` 是业务接入主 module，必须可发布
- `renderer-antdv` 是当前唯一一套一等 renderer adapter，必须可发布
- `form-protocol` 目前已承担 preset/widget 协议，技术上需要可安装
- `engine-adapter` 当前更像内部 module，但已被上层依赖，因此短期仍需发布；只是文档上不应把它包装成业务首选入口

## 具体改造

### 1. 所有目标发布包移除 `private: true`

目标包：

- `packages/form-kit/package.json`
- `packages/renderer-antdv/package.json`
- `packages/form-protocol/package.json`
- `packages/engine-adapter/package.json`

### 2. 发布入口统一切到 `dist`

所有目标包统一改为类似：

```json
"main": "./dist/index.js",
"types": "./dist/index.d.ts"
```

并补：

```json
"exports": {
  ".": {
    "types": "./dist/index.d.ts",
    "import": "./dist/index.js"
  }
}
```

### 3. 内部 `file:` 依赖改成真实版本号

例如第一版可以统一使用：

```json
"version": "0.1.0"
```

并把内部依赖改成：

```json
"@json-form/engine-adapter": "^0.1.0"
```

这样发布后外部安装才能解析。

### 4. 明确 `dependencies` 与 `peerDependencies`

推荐第一版策略：

#### `@json-form/form-kit`

`peerDependencies`：

- `vue`

`dependencies`：

- `@json-form/engine-adapter`
- `@json-form/form-protocol`
- `@json-form/renderer-antdv`

说明：

当前 `form-kit` 仍默认依赖 Antdv renderer，因此短期不能把 `renderer-antdv` 放成完全可选 peer。

#### `@json-form/renderer-antdv`

`peerDependencies`：

- `vue`
- `ant-design-vue`

`dependencies`：

- `@json-form/engine-adapter`
- `@json-form/form-protocol`
- `@jsonforms/core`
- `@jsonforms/vue`
- `dayjs`

说明：

`ant-design-vue` 和 `vue` 作为宿主运行时，由使用方安装更合理，可避免重复实例或版本冲突。

#### `@json-form/form-protocol`

`peerDependencies`：

- `vue`

`dependencies`：

- `@json-form/engine-adapter`

#### `@json-form/engine-adapter`

`peerDependencies`：

- `vue`

`dependencies`：

- `@jsonforms/core`
- `@jsonforms/vue`

### 5. README 至少补齐最小发布说明

当前 README 仍过于简短，只适合作为仓库占位。

最小要求：

#### `form-kit`

- 安装方式
- 基础示例
- `rendererPreset` 推荐接法
- 说明当前默认依赖 Antdv renderer

#### `renderer-antdv`

- 安装方式
- `antdvPreset` 用法
- 与 `SchemaForm` 的组合示例

#### `form-protocol`

- 说明它主要是低层协议包
- 不建议普通业务页面直接从这里开始接入

#### `engine-adapter`

- 明确标记为低层 adapter
- 说明普通业务方优先使用 `form-kit`

### 6. 增加发布前自检

最小发布前检查应包括：

- `npm run build`
- 检查每个包 `dist/index.js`、`dist/index.d.ts` 是否存在
- 检查 `package.json` 的 `main/types/exports/files` 是否一致
- 可选：`npm pack --dry-run` 检查 tarball 内容

## 不建议本阶段做的事

### 1. 立即把 `form-kit` 做成完全 UI 无关

这是长期正确方向，但会牵涉：

- `renderer-antdv` 依赖关系调整
- 组合包策略
- 默认 renderer 迁移

这会超出“最小可发布改造”的范围。

### 2. 立即隐藏 `form-protocol` / `engine-adapter`

当前上层已真实依赖这两个 module。短期直接隐藏只会让发布断裂。

### 3. 立即建设全自动 release 系统

当前更紧迫的是先把包面和元数据整理正确。

## 验收标准

完成本设计后，应满足：

- 目标发布包移除 `private: true`
- 目标发布包的 `main/types/exports` 全部正确指向 `dist`
- 内部 `file:` 依赖改成真实 semver 版本
- 至少 `form-kit` 和 `renderer-antdv` 具备可读的对外 README
- `npm run build` 通过
- 每个目标包都能通过 `npm pack --dry-run` 检查内容合理

## 后续建议

最小可发布改造完成后，建议再分两步走：

1. 第二步：补 `npm pack --dry-run` / 安装验证 / README 完整示例
2. 第三步：决定是否推进 `form-kit` 完全 UI 无关化，并引入 `form-antdv` 组合包
