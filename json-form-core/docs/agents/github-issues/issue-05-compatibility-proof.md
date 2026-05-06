## What to build

在 demo 或可验证示例中补一条最小兼容链路，证明下面三件事可以同时成立：

- 通过 `rendererPreset` 提供默认 renderer
- 通过 direct `renderers/cells` 做局部覆盖
- 通过 `widgets + uischema.options.widget` 使用自定义 widget

这张票的价值是把“兼容性承诺”变成可观察事实，而不是停留在口头约定。

## Acceptance criteria

- [ ] 至少有一个示例同时覆盖 preset、direct override、custom widget
- [ ] 示例不依赖仓库内部隐式状态
- [ ] 维护者可以通过 demo 或构建产物确认兼容链路成立

## Blocked by

- #<Issue2>
- #<Issue3>
- #<Issue4>
