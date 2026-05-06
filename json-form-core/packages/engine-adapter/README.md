# @json-form/engine-adapter

`@json-form/engine-adapter` 是底层 runtime adapter，负责桥接 `@jsonforms/core` 与 `@jsonforms/vue`。

普通业务页面不建议从这个包直接开始接入，优先使用：

- `@json-form/form-kit`
- `@json-form/renderer-antdv`

这个包更适合：

- renderer adapter 实现者
- 低层协议维护者
- 需要直接复用 JSON Forms runtime bridge 的场景
