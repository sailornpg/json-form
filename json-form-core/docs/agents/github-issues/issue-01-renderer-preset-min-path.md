## What to build

为 `SchemaForm` 增加最小可用的 `rendererPreset` 接入路径。

这张票的目标不是只补类型，而是让调用方已经能够把一个 preset 传给 `SchemaForm`，并在未显式传入 `renderers/cells` 时使用 preset 提供的默认值。实现需要同时打通共享协议层、`SchemaForm` 入口以及 demo 的实际消费路径。

## Acceptance criteria

- [ ] `@json-form/form-protocol` 暴露 `SchemaFormRendererPreset` 所需最小类型
- [ ] `SchemaForm` 新增 `rendererPreset` 接口
- [ ] 当未传 `renderers/cells` 时，`SchemaForm` 能使用 `rendererPreset` 中的 `renderers/cells`
- [ ] demo 改为显式传入一个 preset，并保持现有页面可正常构建和渲染
- [ ] `npm run build` 通过

## Blocked by

None - can start immediately
