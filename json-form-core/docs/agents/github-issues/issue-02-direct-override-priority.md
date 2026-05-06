## What to build

在 `SchemaForm` 内明确并固化优先级规则：直接传入的 `renderers/cells` 高于 `rendererPreset` 中的值。

这张票的重点不是“允许同时传入”，而是要保证优先级语义稳定、可验证，避免 API 后续产生歧义。需要补一条最小验证路径来证明运行时优先级确实生效。

## Acceptance criteria

- [ ] `SchemaForm` 明确实现 direct props override preset 的合并规则
- [ ] 至少有一个可运行示例或验证路径证明优先级生效
- [ ] 没有传 direct props 时，preset 默认行为不变
- [ ] `npm run build` 通过

## Blocked by

- #<Issue1>
