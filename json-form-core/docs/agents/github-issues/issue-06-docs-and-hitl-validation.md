## What to build

补一份简短文档，说明 `rendererPreset` 的推荐接法、direct `renderers/cells` 的优先级规则以及 custom widget 的兼容方式；同时做一次人工验收，记录至少以下检查项：

- demo 能打开
- preset 路径能渲染
- direct override 生效
- 自定义 widget 可交互

由于当前仓库还没有完整自动化测试体系，这张票需要人工参与，因此是 HITL 型 issue。

## Acceptance criteria

- [ ] 文档说明 `rendererPreset` 的推荐接法
- [ ] 文档说明 direct `renderers/cells` 的优先级规则
- [ ] 文档说明 custom widget 兼容方式
- [ ] 完成一次人工验收并记录结果
- [ ] 至少包含 build 验证与浏览器交互验证

## Blocked by

- #<Issue5>
