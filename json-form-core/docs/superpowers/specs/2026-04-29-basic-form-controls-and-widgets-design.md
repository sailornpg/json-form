# 基础表单控件与自定义 Widget 扩展设计

日期：2026-04-29

## 摘要

当前 `json-form-core` 已经具备 `SchemaForm` 公共入口、JSON Forms 运行时适配、Ant Design Vue 默认渲染器、动态字段状态、异步选项、effects 和 validators 等基础能力。现有 `renderer-antdv` 仍是 MVP：主要支持 `Input`、`Textarea`、`InputNumber`、`Switch` 和 `Select`，还不能覆盖常见基础表单项，例如日期、时间、单选按钮、多选框组、密码输入等。

本设计的目标是在不破坏现有架构边界的前提下，扩展一组稳定的内置基础控件，并提供轻量级自定义 widget 扩展机制。业务方可以用 `uischema.options.widget` 显式指定控件，也可以通过 `SchemaForm` 传入自定义 widget 映射来处理项目特有表单项。复杂高级场景继续保留现有 JSON Forms renderer registry 覆盖能力。

## 目标

- 内置支持一组高频基础表单项：文本、多行文本、密码、数字、布尔开关、布尔勾选、下拉单选、单选按钮、下拉多选、多选框组、日期、时间、日期时间。
- 支持通过 `uischema.options.widget` 显式选择内置控件。
- 支持通过 `SchemaForm` 传入 `widgets` 映射，自定义 `widget` 名称对应的 Vue 组件。
- 保留并兼容现有 `renderers` prop，让高级用户继续使用 JSON Forms renderer registry 深度覆盖默认行为。
- 保持 `form-kit`、`renderer-antdv`、`engine-adapter` 的职责边界清晰。
- 将控件选择、值解析和值规范化抽出为独立逻辑，避免 `AntdvControlRenderer.ts` 继续膨胀为大分支文件。

## 非目标

- 本轮不覆盖 Ant Design Vue 的全部输入控件，例如 `Slider`、`Rate`、`Cascader`、`TreeSelect`、`Upload`、`ColorPicker`、`Mentions`、`AutoComplete`。
- 本轮不设计可视化表单搭建器。
- 本轮不引入新的表达式 DSL。
- 本轮不让 renderer 直接处理跨字段联动、远程选项编排或业务请求。
- 本轮不替代现有 JSON Forms renderer registry 扩展模型。

## 方案选择

本次采用“单一 ControlRenderer 入口 + 内置控件解析器 + 轻量 widget 映射”的方案。

备选方案包括：

1. 继续在现有 `AntdvControlRenderer` 中追加分支。改动最少，但控件变多后文件会快速变复杂，后续维护和扩展成本高。
2. 保留单一 JSON Forms control renderer 入口，在内部抽出控件类型解析和值处理，并支持 `widget` 与 `widgets` 映射。该方案兼容现有架构，业务接入成本低。
3. 每种控件注册独立 JSON Forms renderer。该方案更贴近 JSON Forms 原生扩展模型，但业务方学习成本更高，也会让默认 renderer registry 变重。

最终选择方案 2。原因是当前项目已经通过 `SchemaForm` 屏蔽底层 JSON Forms 细节，轻量 widget 机制更符合业务方使用习惯，同时高级用户仍可通过现有 `renderers` prop 深度覆盖。

## 分层职责

### `packages/form-kit`

新增或补充职责：

- 在公共类型中暴露 widget 相关类型。
- 在 `SchemaForm` 上增加可选 `widgets` prop。
- 将 `widgets` 透传给默认 renderer 可读取的运行时配置。
- 保持现有 `renderers`、`fieldResolvers`、`effects`、`validators` 行为不变。

限制：

- 不直接依赖 Ant Design Vue。
- 不在 `form-kit` 中实现具体 UI 控件。

### `packages/renderer-antdv`

新增或补充职责：

- 根据 JSON Schema、UI Schema 和 runtime state 选择内置控件。
- 渲染本轮支持的 Ant Design Vue 基础控件。
- 渲染通过 `widgets` 注册的自定义 widget。
- 统一处理 touched 标记、`handleChange(path, value)` 调用和值规范化。
- 展示校验错误、description、options loading/error 等状态。

限制：

- 不直接请求远程业务数据。
- 不执行跨字段 effects。
- 不持有最终校验模型。

### `packages/engine-adapter`

本轮不需要修改。它继续作为 JSON Forms Vue runtime bridge，不感知 Ant Design Vue 或项目级 widget 语义。

## 内置控件矩阵

| 场景 | 触发条件 | Ant Design Vue 控件 | 数据写回 |
|---|---|---|---|
| 普通文本 | `type: string` | `Input` | `string` |
| 多行文本 | `uischema.options.multi === true` 或 `widget: 'textarea'` | `Input.TextArea` | `string` |
| 密码 | `widget: 'password'` | `Input.Password` | `string` |
| 数字 | `type: number` 或 `type: integer` | `InputNumber` | `number` 或 `undefined` |
| 布尔开关 | `type: boolean` 默认 | `Switch` | `boolean` |
| 布尔勾选 | `type: boolean` 且 `widget: 'checkbox'` | `Checkbox` | `boolean` |
| 下拉单选 | `enum` 或 runtime options 默认 | `Select` | 选项 value |
| 单选按钮 | `enum/options` 且 `widget: 'radio'` | `Radio.Group` | 选项 value |
| 下拉多选 | `type: array` 且 `items.enum` 默认，或 `widget: 'multiSelect'` | `Select mode="multiple"` | 数组 |
| 多选框组 | `type: array` 且 `items.enum` 且 `widget: 'checkboxGroup'` | `Checkbox.Group` | 数组 |
| 日期 | `format: date` 或 `widget: 'date'` | `DatePicker` | `YYYY-MM-DD` |
| 时间 | `format: time` 或 `widget: 'time'` | `TimePicker` | `HH:mm:ss` |
| 日期时间 | `format: date-time` 或 `widget: 'dateTime'` | `DatePicker showTime` | `YYYY-MM-DDTHH:mm:ss` |

## 控件选择规则

控件选择顺序如下：

1. 如果 `uischema.options.widget` 存在，并且命中 `widgets` 自定义映射，则渲染自定义 widget。
2. 如果 `uischema.options.widget` 存在，并且命中内置 widget 名称，则渲染对应内置控件。
3. 如果没有显式 `widget`，根据 schema 自动推断控件。
4. 如果无法识别控件，则显示受控 unsupported 提示。

内置 widget 名称第一版固定为：

- `input`
- `textarea`
- `password`
- `number`
- `switch`
- `checkbox`
- `select`
- `radio`
- `multiSelect`
- `checkboxGroup`
- `date`
- `time`
- `dateTime`

名称使用 camelCase，避免后续与组件名、JSON Schema `format` 或 Ant Design Vue 组件名强绑定。

## 自定义 Widget API

`SchemaForm` 增加可选 `widgets` prop：

```ts
type SchemaFormWidgetMap = Record<string, SchemaFormWidgetComponent>
```

业务方使用方式：

```vue
<SchemaForm
  :data="data"
  :schema="schema"
  :uischema="uischema"
  :widgets="{
    userPicker: UserPicker,
    moneyInput: MoneyInput,
  }"
/>
```

UI Schema 中通过 `widget` 指定：

```ts
{
  type: 'Control',
  scope: '#/properties/ownerId',
  options: {
    widget: 'userPicker',
  },
}
```

### Widget Props 协议

自定义 widget 接收一组稳定 props：

```ts
type SchemaFormWidgetProps = {
  value: unknown
  path: string
  label?: string
  disabled: boolean
  required: boolean
  placeholder?: string
  description?: string
  options?: SchemaFormOption[]
  loading?: boolean
  error?: string
  schema: JsonSchema
  uischema: UISchemaElement
}
```

其中：

- `value` 是当前字段值。
- `path` 是 JSON Forms 数据路径。
- `disabled` 合并 JSON Forms enabled 状态、readonly 状态和 runtime disabled。
- `required` 使用 runtime required 覆盖 schema required 展示状态。
- `placeholder`、`description`、`options`、`loading`、`error` 来自现有 runtime field state。
- `schema` 和 `uischema` 只读传入，供高级 widget 判断字段元数据。

### Widget 事件协议

自定义 widget 通过标准事件回传：

```ts
emit('update:value', nextValue)
emit('blur')
```

renderer 收到 `update:value` 后统一执行：

1. 调用 `validation.onFieldInput(path)` 标记 touched 和最近变更字段。
2. 调用 JSON Forms `handleChange(path, nextValue)`。

`blur` 事件第一版只用于触发 touched，不改变值。

### 扩展层级

本设计保留两层扩展：

- 简单自定义：使用 `widgets + uischema.options.widget`，适合用户选择器、金额输入、业务枚举选择等场景。
- 深度自定义：继续使用 `renderers` prop 注册 JSON Forms renderer，适合复杂数组、对象、组合布局或需要完全接管 JSON Forms 渲染状态的场景。

## 值规范化

内置控件写回前需要统一值形态：

- `Input`、`Textarea`、`Password`：空字符串按原样保留。
- `InputNumber`：`null` 转为 `undefined`。
- `Switch`、`Checkbox`：转为 `boolean`。
- `Select`、`Radio.Group`：直接写回选项 value。
- `Select mode="multiple"`、`Checkbox.Group`：写回数组；空值写回空数组。
- `DatePicker` 日期：写回 `YYYY-MM-DD`。
- `TimePicker` 时间：写回 `HH:mm:ss`。
- `DatePicker showTime` 日期时间：写回 `YYYY-MM-DDTHH:mm:ss`。

日期时间控件对外不写入 Dayjs 对象，避免业务数据中出现不可序列化或难以持久化的值。

读入现有值时：

- 合法字符串转为 Ant Design Vue 日期时间控件可消费的 Dayjs 值。
- 无效日期时间值不崩溃，控件显示空值。
- 原始无效值不由 renderer 自动删除，交给 schema validation 或 custom validators 处理。

## 运行时数据流

整体数据流保持现有主链路不变：

1. Consumer 传入 `data/schema/uischema/widgets/renderers`。
2. `SchemaForm` 生成 runtime config，并将 `widgets` 放入 `config.__schemaForm.widgets`。
3. JSON Forms 根据 registry 分发到 `AntdvControlRenderer`。
4. `AntdvControlRenderer` 读取 control state、runtime field state 和 widgets。
5. renderer 调用控件解析器得到 control kind。
6. renderer 渲染内置控件或自定义 widget。
7. 控件变更时 renderer 标记 touched，并调用 `handleChange(path, value)`。
8. JSON Forms 更新数据和 schema errors。
9. `SchemaForm` 继续执行现有 effects、validators、`update:data`、`change`、`submit`、`invalid` 流程。

## 错误处理

- schema/custom 校验错误继续通过 `Form.Item` 的 `help` 和 `validateStatus` 展示。
- `runtime.optionsError` 继续作为帮助文本展示。
- 同时存在校验错误和 `optionsError` 时，校验错误优先。
- 未识别 widget 显示 `Unsupported widget: <name>`。
- 未支持 schema 类型显示 `Unsupported control type: <type>`。
- 自定义 widget 内部抛错不在 renderer 中吞掉，由 Vue 错误处理机制或应用错误边界处理。
- 日期时间解析失败不导致渲染崩溃。

## 与现有能力的关系

### 与 `runtime.options`

内置 `Select`、`Radio.Group`、`Checkbox.Group`、`multiSelect` 都复用现有 `runtime.options` 和 async options 状态。renderer 只消费 `options/loading/optionsError`，不直接调用远程服务。

### 与 `effects`

控件变更仍走统一 `handleChange`，因此现有全局 effects 和字段级 effects 继续可用。自定义 widget 不直接执行跨字段联动。

### 与 `validators`

校验结果仍由 `SchemaForm` 聚合 schema errors 和 custom errors。renderer 只负责展示字段层错误。

### 与 `renderers`

默认 renderer 增强不影响高级用户传入 `renderers`。如果业务方需要完全替换某类字段渲染，仍可以通过 JSON Forms renderer registry 提供更高 rank 的 renderer。

## 代码组织建议

为避免 `AntdvControlRenderer.ts` 继续增长，建议在 `renderer-antdv` 中拆分：

- `controlKinds.ts`：定义内置 control kind、widget 名称、控件解析函数。
- `controlValues.ts`：处理内置控件的 parse/format/normalize。
- `AntdvControlRenderer.ts`：保留 JSON Forms renderer 入口、Form.Item 包装和分发。
- `widgets.ts` 或共享类型文件：定义 renderer 侧需要的 widget 类型。

`form-kit` 中只补公共类型和 `SchemaForm` prop，不引入 AntDV 控件实现。

## Demo 验证

`apps/demo` 增加或调整一个“基础控件矩阵”场景，覆盖：

- 普通文本、多行文本、密码、数字。
- Switch 和 Checkbox 两种布尔展示。
- Select 和 Radio 两种单选展示。
- MultiSelect 和 CheckboxGroup 两种多选展示。
- Date、Time、DateTime。
- 一个自定义 widget 示例，例如 `userPicker` 或 `moneyInput`。
- 至少一个动态 options 示例继续验证 Select/Radio/CheckboxGroup 与现有 async options 能力兼容。

Demo 不应承载可复用逻辑，只作为验收和使用示例。

## 验证策略

当前仓库没有测试脚本，最低验证仍为：

- `npm run build`
- 手动运行 demo 检查基础控件矩阵

如果后续引入测试框架，优先覆盖：

- `resolveControlKind()` 的推断优先级。
- 内置 widget 名称到控件类型的映射。
- 多选字段数组值写回。
- 日期、时间、日期时间的读写转换。
- 自定义 widget `update:value` 能触发 touched 和 `handleChange`。
- 未识别 widget 的 fallback。

## 验收标准

实现完成后应满足：

- `SchemaForm` 支持传入 `widgets`。
- `uischema.options.widget` 可以指定内置控件。
- `uischema.options.widget` 可以命中业务自定义 widget。
- 内置 A 组基础控件全部可渲染、可编辑、可写回数据。
- 日期、时间、日期时间对外写回字符串，不写回 Dayjs 对象。
- enum/options 字段可以在 Select 与 Radio 之间切换。
- array enum 字段可以在 MultiSelect 与 CheckboxGroup 之间切换。
- 现有 runtime options、async options、effects、validators 行为不回归。
- 高级用户仍可使用 `renderers` prop 覆盖默认 renderer。
- `npm run build` 通过。

## 风险与缓解

### Widget 协议过度膨胀

风险：如果第一版把所有 Ant Design Vue 组件 props 都透传给自定义 widget，协议会变得不稳定。

缓解：第一版只提供表单框架通用 props。组件特有配置可暂时放在 `uischema.options` 中，由自定义 widget 自行读取 `uischema`。

### 日期时间格式争议

风险：不同业务可能希望日期时间写回 ISO 字符串、时间戳或 Dayjs 对象。

缓解：默认写回稳定字符串。需要不同格式的业务可通过自定义 widget 或后续新增格式化配置处理。

### 单一 renderer 入口继续变大

风险：即使抽出解析和值处理，所有 UI 渲染仍在同一文件内会变重。

缓解：第一轮先抽出非 UI 逻辑；如果 renderer 文件仍明显膨胀，再按内置控件类别拆出局部渲染函数文件。

### 自定义 widget 与 JSON Forms renderer 边界不清

风险：业务方可能把复杂布局或数组对象编辑器塞进轻量 widget。

缓解：文档明确简单字段用 `widgets`，复杂结构和深度接管用 `renderers`。

## 实施顺序建议

1. 在 `form-kit` 增加 widget 类型和 `SchemaForm.widgets` prop。
2. 将 `widgets` 注入 `config.__schemaForm.widgets`。
3. 在 `renderer-antdv` 增加控件解析和值规范化模块。
4. 补齐内置 A 组控件渲染。
5. 实现自定义 widget 分发和事件桥接。
6. 更新 demo 基础控件矩阵。
7. 运行 `npm run build`，并手动检查 demo。

下一步应先由用户审核本 spec，再进入具体实施计划。
