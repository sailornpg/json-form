## What to build

把 widget 相关协议与 registry 能力沉到共享协议层，确保 `SchemaForm` 的 `widgets` 注册、`renderer-antdv` 的 widget 查找，以及 `uischema.options.widget` 的运行时解析在 `rendererPreset` 路径下依然可以串通。

这张票的重点是保持现有 custom widget 使用方式的兼容性，而不是只做文件迁移。

## Acceptance criteria

- [ ] 共享协议包提供 widget 定义与 registry 能力
- [ ] `SchemaForm` 仍能按现有方式接收并注册 `widgets`
- [ ] `renderer-antdv` 通过共享协议解析 widget，而不是依赖 `form-kit` 私有实现
- [ ] demo 里的自定义 widget 示例继续可用
- [ ] `npm run build` 通过

## Blocked by

- #<Issue1>
