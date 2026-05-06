# `rendererPreset` 兼容性证明链路设计

日期：2026-05-06

## 背景

当前仓库已经具备以下能力：

- `@json-form/form-protocol` 暴露 `SchemaFormRendererPreset`
- `SchemaForm` 支持 `rendererPreset`
- `@json-form/renderer-antdv` 导出 `antdvPreset`
- demo 已显式通过 `rendererPreset` 接入
- 自定义 `widgets + uischema.options.widget` 已可用

但当前还缺一条最小且可观察的证明链路，能够在同一个示例里同时说明：

1. `rendererPreset` 仍提供默认 renderer
2. direct `renderers` 可以局部覆盖 preset
3. custom widget 在该路径下继续可用

这正是 GitHub issue `#5` 的目标。

## 问题

当前 `SchemaForm` 对 `renderers/cells` 与 `rendererPreset` 的处理是二选一回退：

- 如果传入 `renderers`，直接使用 `renderers`
- 否则才使用 `rendererPreset.renderers`

这意味着“preset 默认 renderer + direct override 局部覆盖”的语义并没有真正成立。即使 demo 页面补出第二个表单实例，如果不先修正这里，示例也只能证明几种能力分别存在，不能证明它们在同一条链路里共存。

## 目标

- 让 `SchemaForm` 在同时收到 `rendererPreset` 和 direct `renderers/cells` 时，采用“direct override 优先，但保留 preset 作为默认回退”的组合策略
- 在 demo 页面新增一个独立的 `Compatibility Proof` 区块
- 在该区块中使用第二个最小 `SchemaForm` 实例，同时展示：
  - 一个 direct override renderer 字段
  - 一个继续走 preset 默认 renderer 的字段
  - 一个继续走 custom widget 的字段
- 保持现有主示例不被替换

## 非目标

- 不引入新的 UI 库
- 不重写现有 Antdv preset
- 不调整主示例的业务逻辑、validators、effects 或异步 options
- 不在本 issue 中补完整人工验收文档，那是 `#6` 的范围

## 方案

### 1. 调整 `SchemaForm` 的 renderer 合并规则

当同时传入 `rendererPreset` 与 direct `renderers/cells` 时：

- direct `renderers` 放在前面
- preset `renderers` 追加在后面，作为默认回退
- `cells` 采用相同策略

这样可以保证：

- direct override 对目标字段优先生效
- 其余未被覆盖字段仍由 preset 负责

如果没有传 `rendererPreset`，保持当前兼容行为：

- 只有 direct `renderers` 时，仍按 direct 输入运行
- 两者都没有时，仍回退到当前默认 Antdv renderer

### 2. 在 demo 页面增加 `Compatibility Proof` 区块

在现有 demo 页面中新增一个独立 panel，不替换已有主表单。

该区块包含一个最小表单实例：

- `proofTitle`
  - 使用 direct override renderer
  - 呈现出与默认 Antdv 控件明显不同的视觉样式
- `proofRole`
  - 普通 enum 字段
  - 继续走 preset 默认 select 渲染
- `proofBudget`
  - 使用现有 `moneyInput` custom widget

这样页面上能同时看到三种路径共存。

### 3. 直接覆盖 renderer 的实现方式

新增一个仅供 demo 使用的最小 custom renderer 组件：

- 只命中特定 `uischema.options.proofOverride === true` 的 `Control`
- 使用明显不同于 Antdv 默认表单项的原生输入样式
- 在 UI 上显示 `Direct override renderer` 标记

它的作用不是作为通用 renderer，而是作为“override 生效”的可视化证据。

## 验证方式

最低验证要求：

- `npm run build` 通过
- `Compatibility Proof` 区块中：
  - override 字段显示 `Direct override renderer` 标记
  - 普通 enum 字段仍以 preset 默认控件渲染
  - `moneyInput` custom widget 仍可编辑

## 验收标准

- `SchemaForm` 在 `rendererPreset + renderers/cells` 同时传入时支持组合语义
- demo 新增 `Compatibility Proof` 区块
- 同一表单实例中可以观察到 preset 默认 renderer、direct override renderer、custom widget 三者共存
- `npm run build` 通过

## 风险与缓解

### 风险：改变 direct `renderers` 的既有含义

如果无条件把 direct `renderers` 与默认 renderer 合并，可能影响原本期望“完全自定义 renderer 集”的调用方式。

缓解：

- 仅在同时传入 `rendererPreset` 时启用合并
- direct-only 场景保持原行为

### 风险：demo 证明链路和真实消费路径脱节

如果 proof renderer 走内部特判或隐藏注入，会削弱示例价值。

缓解：

- 证明区块继续使用公开的 `SchemaForm` API：`rendererPreset`、`renderers`、`widgets`
- 不引入 demo 私有旁路
