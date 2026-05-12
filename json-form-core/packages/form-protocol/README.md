# @sailornpg/form-protocol

`@sailornpg/form-protocol` 提供低层协议定义，例如：

- `SchemaFormRendererPreset`
- widget 协议
- widget registry
- renderer config 类型

普通业务页面通常不需要直接从这个包开始接入，优先使用：

- `@sailornpg/form-kit`
- `@sailornpg/renderer-antdv`

这个包主要面向：

- renderer adapter 实现者
- 需要共享 preset / widget 协议的低层 module
